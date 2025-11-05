# Azure PowerShell Deployment Script for Seeing AI Simulation
# This script deploys the infrastructure and application to Azure in AME tenant

param(
    [Parameter(Mandatory=$false)]
    [string]$SubscriptionName,
    
    [Parameter(Mandatory=$false)]
    [string]$SubscriptionId,
    
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroupName = "rg-seeingai-prod",
    
    [Parameter(Mandatory=$false)]
    [string]$Location = "westus2",
    
    [Parameter(Mandatory=$false)]
    [string]$EnvironmentName = "seeingai"
)

# Color output functions
function Write-Success { param($Message) Write-Host $Message -ForegroundColor Green }
function Write-Info { param($Message) Write-Host $Message -ForegroundColor Cyan }
function Write-Warning { param($Message) Write-Host $Message -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host $Message -ForegroundColor Red }

Write-Info "=== Seeing AI Simulation - Azure Deployment ==="
Write-Info ""

# Step 1: Check Azure PowerShell module
Write-Info "Checking Azure PowerShell module..."
if (-not (Get-Module -ListAvailable -Name Az)) {
    Write-Error "Azure PowerShell module not found. Install it with: Install-Module -Name Az -Repository PSGallery -Force"
    exit 1
}
Write-Success "Azure PowerShell module found"

# Step 2: Connect to Azure
Write-Info "`nConnecting to Azure (AME tenant)..."
try {
    $context = Get-AzContext -ErrorAction SilentlyContinue
    if (-not $context) {
        Connect-AzAccount -Tenant ame.gbl
    } else {
        Write-Success "Already connected as: $($context.Account.Id)"
    }
} catch {
    Write-Error "Failed to connect to Azure: $_"
    exit 1
}

# Step 3: Select subscription
if ($SubscriptionId) {
    Write-Info "`nSetting subscription by ID: $SubscriptionId"
    Set-AzContext -SubscriptionId $SubscriptionId
} elseif ($SubscriptionName) {
    Write-Info "`nSetting subscription by name: $SubscriptionName"
    Set-AzContext -SubscriptionName $SubscriptionName
} else {
    Write-Info "`nAvailable subscriptions:"
    Get-AzSubscription | Format-Table -Property Name, Id, State
    $selectedSub = Read-Host "`nEnter subscription name or ID"
    Set-AzContext -Subscription $selectedSub
}

$currentContext = Get-AzContext
Write-Success "Using subscription: $($currentContext.Subscription.Name)"

# Step 4: Deploy Bicep infrastructure (subscription-level deployment)
Write-Info "`nDeploying infrastructure..."
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$deploymentName = "seeingai-deployment-$timestamp"

# Get script directory and construct path to main.bicep
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$bicepPath = Join-Path $scriptDir "main.bicep"

if (-not (Test-Path $bicepPath)) {
    Write-Error "Cannot find main.bicep at: $bicepPath"
    Write-Error "Please ensure main.bicep is in the same directory as this script"
    exit 1
}

Write-Info "Note: This is a subscription-level deployment that will create the resource group"

try {
    # Create hashtable for template parameters
    $templateParams = @{
        environmentName = $EnvironmentName
        location = $Location
        appServicePlanSku = 'P1V2'  # Use Premium V2 tier
    }
    
    $deployment = New-AzDeployment `
        -Name $deploymentName `
        -Location $Location `
        -TemplateFile $bicepPath `
        -TemplateParameterObject $templateParams `
        -Verbose
    
    if ($deployment.ProvisioningState -eq 'Succeeded') {
        Write-Success "Infrastructure deployed successfully"
    } else {
        Write-Error "Deployment failed with state: $($deployment.ProvisioningState)"
        exit 1
    }
} catch {
    Write-Error "Deployment failed: $_"
    Write-Error $_.Exception.Message
    if ($_.Exception.InnerException) {
        Write-Error "Inner exception: $($_.Exception.InnerException.Message)"
    }
    exit 1
}

# Step 6: Get deployment outputs
Write-Info "`nRetrieving deployment outputs..."
$webAppName = $deployment.Outputs.WEB_APP_NAME.Value
$appInsightsConnectionString = $deployment.Outputs.APPLICATIONINSIGHTS_CONNECTION_STRING.Value
$webAppUri = $deployment.Outputs.WEB_APP_URI.Value

Write-Success "`nDeployment Complete!"
Write-Info "======================================"
Write-Info "Web App Name: $webAppName"
Write-Info "Production URL: $webAppUri"
Write-Info "Staging URL: https://$webAppName-staging.azurewebsites.net"
Write-Info "======================================"
Write-Warning "`nApp Insights Connection String:"
Write-Host $appInsightsConnectionString -ForegroundColor Yellow
Write-Info "======================================"

# Step 7: Check if we should build and deploy the app
Write-Info "`nDo you want to build and deploy the application now?"
Write-Warning "Note: This requires Node.js and npm on this machine"
$buildChoice = Read-Host "Build and deploy? (y/n)"

if ($buildChoice -eq 'y' -or $buildChoice -eq 'Y') {
    # Check if npm is available
    try {
        $npmVersion = npm --version 2>&1
        Write-Success "npm found: v$npmVersion"
    } catch {
        Write-Error "npm not found. Please install Node.js or deploy from another machine."
        Write-Info "`nYou can deploy later using:"
        Write-Info "  npm run build"
        Write-Info "  Compress-Archive -Path .\dist\* -DestinationPath .\dist.zip -Force"
        Write-Info "  Publish-AzWebApp -ResourceGroupName $ResourceGroupName -Name $webAppName -ArchivePath .\dist.zip -Force"
        exit 0
    }

    # Build production
    Write-Info "`nBuilding application for production..."
    $env:VITE_APPINSIGHTS_CONNECTION_STRING = $appInsightsConnectionString
    $env:VITE_ENVIRONMENT = "production"
    
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Build failed"
        exit 1
    }
    Write-Success "Build completed"

    # Get actual resource group name from deployment output
    $actualRgName = $deployment.Outputs.AZURE_RESOURCE_GROUP.Value

    # Deploy to production
    Write-Info "`nDeploying to production slot..."
    $zipPath = ".\dist.zip"
    Compress-Archive -Path ".\dist\*" -DestinationPath $zipPath -Force
    
    Publish-AzWebApp `
        -ResourceGroupName $actualRgName `
        -Name $webAppName `
        -ArchivePath $zipPath `
        -Force
    
    Remove-Item $zipPath
    Write-Success "Deployed to production: $webAppUri"

    # Ask about staging
    $stagingChoice = Read-Host "`nDeploy to staging slot as well? (y/n)"
    if ($stagingChoice -eq 'y' -or $stagingChoice -eq 'Y') {
        Write-Info "`nBuilding for staging..."
        $env:VITE_ENVIRONMENT = "staging"
        npm run build
        
        Write-Info "Deploying to staging slot..."
        $zipPathStaging = ".\dist-staging.zip"
        Compress-Archive -Path ".\dist\*" -DestinationPath $zipPathStaging -Force
        
        Publish-AzWebApp `
            -ResourceGroupName $actualRgName `
            -Name $webAppName `
            -ArchivePath $zipPathStaging `
            -Slot "staging" `
            -Force
        
        Remove-Item $zipPathStaging
        Write-Success "Deployed to staging: https://$webAppName-staging.azurewebsites.net"
    }
} else {
    $actualRgName = $deployment.Outputs.AZURE_RESOURCE_GROUP.Value
    Write-Info "`nSkipping application build and deployment"
    Write-Info "To deploy later from a machine with Node.js:"
    Write-Info "  1. Set environment variable: `$env:VITE_APPINSIGHTS_CONNECTION_STRING = '$appInsightsConnectionString'"
    Write-Info "  2. Build: npm run build"
    Write-Info "  3. Deploy: Publish-AzWebApp -ResourceGroupName $actualRgName -Name $webAppName -ArchivePath .\dist.zip -Force"
}

Write-Success "`n=== Deployment Script Complete ==="
