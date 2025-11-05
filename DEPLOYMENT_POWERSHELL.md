# Azure PowerShell Deployment Guide for AME Tenant

## Prerequisites
- Azure PowerShell module installed
- Access to AME tenant
- Contributor role on target subscription

## Step 1: Install Azure PowerShell (if not already installed)

```powershell
# Check if installed
Get-Module -ListAvailable -Name Az

# Install if needed (run as Administrator)
Install-Module -Name Az -Repository PSGallery -Force
```

## Step 2: Connect to AME Tenant

```powershell
# Connect to Azure with AME tenant
Connect-AzAccount -Tenant ame.gbl

# Verify connection
Get-AzContext

# List available subscriptions
Get-AzSubscription | Format-Table

# Set the subscription you want to use
Set-AzContext -SubscriptionId "YOUR_SUBSCRIPTION_ID"
# OR
Set-AzContext -SubscriptionName "YOUR_SUBSCRIPTION_NAME"
```

## Step 3: Set Variables

```powershell
# Define deployment variables
$resourceGroupName = "rg-seeingai-prod"
$location = "eastus2"
$environmentName = "seeingai"
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$deploymentName = "seeingai-deployment-$timestamp"
```

## Step 4: Create Resource Group

```powershell
# Create resource group
New-AzResourceGroup -Name $resourceGroupName -Location $location

# Verify creation
Get-AzResourceGroup -Name $resourceGroupName
```

## Step 5: Deploy Bicep Infrastructure

```powershell
# Deploy the Bicep template
New-AzResourceGroupDeployment `
    -Name $deploymentName `
    -ResourceGroupName $resourceGroupName `
    -TemplateFile ".\infra\main.bicep" `
    -environmentName $environmentName `
    -location $location `
    -Verbose

# Check deployment status
Get-AzResourceGroupDeployment -ResourceGroupName $resourceGroupName -Name $deploymentName

# Get deployment outputs
$deployment = Get-AzResourceGroupDeployment -ResourceGroupName $resourceGroupName -Name $deploymentName
$webAppName = $deployment.Outputs.WEB_APP_NAME.Value
$appInsightsConnectionString = $deployment.Outputs.APPLICATIONINSIGHTS_CONNECTION_STRING.Value
$webAppUri = $deployment.Outputs.WEB_APP_URI.Value

Write-Host "Web App Name: $webAppName" -ForegroundColor Green
Write-Host "Web App URL: $webAppUri" -ForegroundColor Green
Write-Host "App Insights Connection String: $appInsightsConnectionString" -ForegroundColor Yellow
```

## Step 6: Build the Application Locally

```powershell
# Set environment variables for build
$env:VITE_APPINSIGHTS_CONNECTION_STRING = $appInsightsConnectionString
$env:VITE_ENVIRONMENT = "production"

# Build the application
npm run build

# Verify build output
Get-ChildItem -Path ".\dist" -Recurse
```

## Step 7: Deploy Application to Production Slot

```powershell
# Create deployment package
$zipPath = ".\dist.zip"
Compress-Archive -Path ".\dist\*" -DestinationPath $zipPath -Force

# Deploy to production slot using Publish-AzWebApp
Publish-AzWebApp `
    -ResourceGroupName $resourceGroupName `
    -Name $webAppName `
    -ArchivePath $zipPath `
    -Force

Write-Host "Deployed to production: https://$webAppName.azurewebsites.net" -ForegroundColor Green

# Clean up zip file
Remove-Item $zipPath
```

## Step 8: Deploy Application to Staging Slot

```powershell
# Update environment variable for staging
$env:VITE_ENVIRONMENT = "staging"

# Rebuild for staging
npm run build

# Create staging deployment package
$zipPathStaging = ".\dist-staging.zip"
Compress-Archive -Path ".\dist\*" -DestinationPath $zipPathStaging -Force

# Deploy to staging slot
Publish-AzWebApp `
    -ResourceGroupName $resourceGroupName `
    -Name $webAppName `
    -ArchivePath $zipPathStaging `
    -Slot "staging" `
    -Force

Write-Host "Deployed to staging: https://$webAppName-staging.azurewebsites.net" -ForegroundColor Green

# Clean up zip file
Remove-Item $zipPathStaging
```

## Alternative: Deploy using Kudu Zip API

```powershell
# Get publishing credentials
$publishProfile = [xml](Get-AzWebAppPublishingProfile `
    -ResourceGroupName $resourceGroupName `
    -Name $webAppName)

$username = $publishProfile.publishData.publishProfile[0].userName
$password = $publishProfile.publishData.publishProfile[0].userPWD
$base64AuthInfo = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${username}:${password}"))

# Deploy zip via Kudu API
$zipPath = ".\dist.zip"
Compress-Archive -Path ".\dist\*" -DestinationPath $zipPath -Force

$apiUrl = "https://$webAppName.scm.azurewebsites.net/api/zipdeploy"
Invoke-RestMethod -Uri $apiUrl `
    -Headers @{Authorization=("Basic {0}" -f $base64AuthInfo)} `
    -Method POST `
    -InFile $zipPath `
    -ContentType "application/zip"

Write-Host "Deployment initiated via Kudu API" -ForegroundColor Green
Remove-Item $zipPath
```

## Management Commands

### Get Web App Information

```powershell
# Get web app details
$webApp = Get-AzWebApp -ResourceGroupName $resourceGroupName -Name $webAppName
$webApp | Select-Object Name, State, DefaultHostName, RepositorySiteName

# Get all slots
Get-AzWebAppSlot -ResourceGroupName $resourceGroupName -Name $webAppName | Format-Table

# Get app settings
$settings = Get-AzWebApp -ResourceGroupName $resourceGroupName -Name $webAppName
$settings.SiteConfig.AppSettings
```

### Update App Settings

```powershell
# Get current web app
$webApp = Get-AzWebApp -ResourceGroupName $resourceGroupName -Name $webAppName

# Add or update app settings
$appSettings = @{
    "VITE_APPINSIGHTS_CONNECTION_STRING" = $appInsightsConnectionString
    "VITE_ENVIRONMENT" = "production"
    "WEBSITE_NODE_DEFAULT_VERSION" = "~20"
}

Set-AzWebApp `
    -ResourceGroupName $resourceGroupName `
    -Name $webAppName `
    -AppSettings $appSettings

Write-Host "App settings updated" -ForegroundColor Green
```

### Slot Management

```powershell
# Swap staging to production
Switch-AzWebAppSlot `
    -ResourceGroupName $resourceGroupName `
    -Name $webAppName `
    -SourceSlotName "staging" `
    -DestinationSlotName "production"

Write-Host "Slots swapped: staging -> production" -ForegroundColor Green

# Swap with preview (test before committing)
Switch-AzWebAppSlot `
    -ResourceGroupName $resourceGroupName `
    -Name $webAppName `
    -SourceSlotName "staging" `
    -DestinationSlotName "production" `
    -PreserveVnet `
    -SwapWithPreviewAction ApplySlotConfig
```

### Restart Web App

```powershell
# Restart production
Restart-AzWebApp -ResourceGroupName $resourceGroupName -Name $webAppName

# Restart staging slot
Restart-AzWebAppSlot -ResourceGroupName $resourceGroupName -Name $webAppName -Slot "staging"

Write-Host "Web app restarted" -ForegroundColor Green
```

### View Logs

```powershell
# Enable logging
$webApp = Get-AzWebApp -ResourceGroupName $resourceGroupName -Name $webAppName
$webApp.SiteConfig.HttpLoggingEnabled = $true
$webApp.SiteConfig.DetailedErrorLoggingEnabled = $true
$webApp.SiteConfig.RequestTracingEnabled = $true
Set-AzWebApp -WebApp $webApp

# Get log stream (requires additional setup)
# Note: Real-time log streaming is better done through Azure Portal or az CLI
Write-Host "View logs at: https://portal.azure.com" -ForegroundColor Yellow
```

## Application Insights Commands

### Get Application Insights Details

```powershell
# Get Application Insights resource
$appInsightsName = ($deployment.Outputs.APPLICATIONINSIGHTS_NAME.Value)
$appInsights = Get-AzApplicationInsights -ResourceGroupName $resourceGroupName -Name $appInsightsName

# Display connection details
Write-Host "Instrumentation Key: $($appInsights.InstrumentationKey)" -ForegroundColor Yellow
Write-Host "Connection String: $($appInsights.ConnectionString)" -ForegroundColor Yellow

# Get Application Insights resource ID
$appInsights.Id
```

### Query Application Insights

```powershell
# Query recent exceptions
$query = @"
exceptions
| where timestamp > ago(1h)
| project timestamp, type, outerMessage, customDimensions
| order by timestamp desc
| take 20
"@

$queryResults = Invoke-AzOperationalInsightsQuery `
    -WorkspaceId $appInsights.WorkspaceResourceId `
    -Query $query

$queryResults.Results | Format-Table
```

## Scaling Commands

### Scale Up (Vertical Scaling)

```powershell
# Get current App Service Plan
$appServicePlanName = $webApp.ServerFarmId.Split('/')[-1]
$appServicePlan = Get-AzAppServicePlan -ResourceGroupName $resourceGroupName -Name $appServicePlanName

# Scale up to Premium V2
Set-AzAppServicePlan `
    -ResourceGroupName $resourceGroupName `
    -Name $appServicePlanName `
    -Tier "PremiumV2" `
    -WorkerSize "Small"

Write-Host "Scaled up to Premium V2" -ForegroundColor Green
```

### Scale Out (Horizontal Scaling)

```powershell
# Scale to 3 instances
Set-AzAppServicePlan `
    -ResourceGroupName $resourceGroupName `
    -Name $appServicePlanName `
    -NumberofWorkers 3

Write-Host "Scaled out to 3 instances" -ForegroundColor Green
```

### Enable Auto-Scaling

```powershell
# Create autoscale setting
$rule = New-AzAutoscaleRule `
    -MetricName "CpuPercentage" `
    -MetricResourceId $appServicePlan.Id `
    -Operator GreaterThan `
    -MetricStatistic Average `
    -Threshold 70 `
    -TimeGrain 00:01:00 `
    -TimeWindow 00:05:00 `
    -ScaleActionDirection Increase `
    -ScaleActionValue 1

$profile = New-AzAutoscaleProfile `
    -DefaultCapacity 1 `
    -MaximumCapacity 10 `
    -MinimumCapacity 1 `
    -Rule $rule `
    -Name "Auto scale profile"

Add-AzAutoscaleSetting `
    -ResourceGroupName $resourceGroupName `
    -Name "AppServicePlanAutoscale" `
    -Location $location `
    -TargetResourceId $appServicePlan.Id `
    -AutoscaleProfile $profile

Write-Host "Auto-scaling configured" -ForegroundColor Green
```

## Service Principal for GitHub Actions

```powershell
# Get subscription info
$subscriptionId = (Get-AzContext).Subscription.Id

# Create service principal
$sp = New-AzADServicePrincipal -DisplayName "github-seeingai-sim" -Role "Contributor" `
    -Scope "/subscriptions/$subscriptionId/resourceGroups/$resourceGroupName"

# Get the details you need for GitHub secrets
Write-Host "`nGitHub Secrets:" -ForegroundColor Cyan
Write-Host "AZURE_CLIENT_ID: $($sp.AppId)" -ForegroundColor Yellow
Write-Host "AZURE_TENANT_ID: $((Get-AzContext).Tenant.Id)" -ForegroundColor Yellow
Write-Host "AZURE_SUBSCRIPTION_ID: $subscriptionId" -ForegroundColor Yellow

# Create federated credential for GitHub Actions
$params = @{
    ApplicationObjectId = (Get-AzADApplication -ApplicationId $sp.AppId).Id
    Audience = @("api://AzureADTokenExchange")
    Issuer = "https://token.actions.githubusercontent.com"
    Name = "github-main"
    Subject = "repo:meetshamir/seeingai-sim:ref:refs/heads/main"
}
New-AzADAppFederatedCredential @params

# Create federated credential for pull requests
$params.Name = "github-pr"
$params.Subject = "repo:meetshamir/seeingai-sim:pull_request"
New-AzADAppFederatedCredential @params

Write-Host "`nFederated credentials created for GitHub Actions" -ForegroundColor Green
```

## Monitoring and Diagnostics

```powershell
# Get all resources in the resource group
Get-AzResource -ResourceGroupName $resourceGroupName | Format-Table

# Check web app health
$webApp = Get-AzWebApp -ResourceGroupName $resourceGroupName -Name $webAppName
Write-Host "State: $($webApp.State)" -ForegroundColor $(if($webApp.State -eq "Running"){"Green"}else{"Red"})
Write-Host "Availability State: $($webApp.AvailabilityState)" -ForegroundColor Green

# Get metrics (last hour)
$endTime = Get-Date
$startTime = $endTime.AddHours(-1)
$metrics = Get-AzMetric `
    -ResourceId $webApp.Id `
    -MetricName "Requests","Http5xx","ResponseTime" `
    -StartTime $startTime `
    -EndTime $endTime `
    -TimeGrain 00:05:00

$metrics | ForEach-Object {
    Write-Host "`n$($_.Name.Value):" -ForegroundColor Cyan
    $_.Data | Select-Object TimeStamp, Average, Maximum | Format-Table
}
```

## Cleanup

```powershell
# Remove entire resource group (WARNING: Deletes everything!)
Remove-AzResourceGroup -Name $resourceGroupName -Force

Write-Host "Resource group deleted" -ForegroundColor Red
```

## Complete Deployment Script

```powershell
# Complete deployment from SAW machine (no npm required on SAW)

# 1. Connect to AME tenant
Connect-AzAccount -Tenant ame.gbl
Set-AzContext -SubscriptionName "YOUR_SUBSCRIPTION"

# 2. Set variables
$resourceGroupName = "rg-seeingai-prod"
$location = "eastus"
$environmentName = "seeingai"

# 3. Create and deploy infrastructure
New-AzResourceGroup -Name $resourceGroupName -Location $location
$deployment = New-AzResourceGroupDeployment `
    -Name "seeingai-$(Get-Date -Format 'yyyyMMddHHmmss')" `
    -ResourceGroupName $resourceGroupName `
    -TemplateFile ".\infra\main.bicep" `
    -environmentName $environmentName `
    -location $location

# 4. Get outputs
$webAppName = $deployment.Outputs.WEB_APP_NAME.Value
$appInsightsConnectionString = $deployment.Outputs.APPLICATIONINSIGHTS_CONNECTION_STRING.Value

Write-Host "`nDeployment Complete!" -ForegroundColor Green
Write-Host "Web App: https://$webAppName.azurewebsites.net" -ForegroundColor Cyan
Write-Host "Staging: https://$webAppName-staging.azurewebsites.net" -ForegroundColor Cyan
Write-Host "`nBuild the app on your dev machine and deploy using Publish-AzWebApp" -ForegroundColor Yellow
```

## Notes

- All PowerShell commands use the Az module (not AzureRM)
- App deployment requires building on a machine with Node.js
- Infrastructure deployment can be done entirely from SAW
- Use GitHub Actions for automated builds if SAW doesn't have Node.js
- Connection strings and secrets are stored in Azure App Settings
- Windows App Service is configured by default

## Troubleshooting

### Check if Azure PowerShell is connected

```powershell
Get-AzContext
```

### Reconnect if session expired

```powershell
Connect-AzAccount -Tenant ame.gbl
```

### View deployment errors

```powershell
$deployment = Get-AzResourceGroupDeployment -ResourceGroupName $resourceGroupName -Name $deploymentName
$deployment.Properties.Error
```

### Test web app connectivity

```powershell
$response = Invoke-WebRequest -Uri "https://$webAppName.azurewebsites.net" -UseBasicParsing
$response.StatusCode
```
