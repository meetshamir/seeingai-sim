# Files to Upload for Azure Portal Deployment

Upload these 5 files to Azure Cloud Shell or the portal's "Manage Files" option:

1. **main.bicep** - Main infrastructure template
2. **appservice.bicep** - Web app configuration
3. **appserviceplan.bicep** - App Service Plan configuration
4. **monitoring.bicep** - Application Insights and Log Analytics
5. **abbreviations.json** - Azure resource naming abbreviations

## PowerShell Deployment Script

Also included: **deploy-to-azure.ps1** - Automated deployment script

## Manual Deployment Commands (if not using the script)

After uploading the files, run these commands in Azure Cloud Shell:

```powershell
# Connect to AME tenant (if not already connected)
Connect-AzAccount -Tenant ame.gbl

# Set your subscription
Set-AzContext -SubscriptionName "YOUR_SUBSCRIPTION_NAME"

# Create resource group
$rg = "rg-seeingai-prod"
$location = "eastus"
New-AzResourceGroup -Name $rg -Location $location

# Deploy infrastructure
New-AzResourceGroupDeployment `
    -Name "seeingai-$(Get-Date -Format 'yyyyMMddHHmmss')" `
    -ResourceGroupName $rg `
    -TemplateFile ./main.bicep `
    -environmentName "seeingai" `
    -location $location `
    -Verbose
```

## Using the PowerShell Script

```powershell
# Run the automated script
./deploy-to-azure.ps1

# Or with parameters
./deploy-to-azure.ps1 -SubscriptionName "Your Subscription" -ResourceGroupName "rg-seeingai-prod" -Location "eastus"
```

The script will:
1. Connect to AME tenant
2. Create the resource group
3. Deploy all infrastructure
4. Output the web app URLs and connection strings
5. Optionally build and deploy the application (if npm is available)

## All Files in Root Directory

All Bicep files are now in the root directory and reference each other correctly. This makes it easy to upload to Azure Portal's file manager or Cloud Shell.
