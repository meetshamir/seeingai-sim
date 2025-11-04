# Deployment to AME Tenant

## Prerequisites
- Azure CLI (`az`)
- Azure Developer CLI (`azd`)
- Access to AME tenant
- Contributor role on target subscription

## Step 1: Login to AME Tenant

```powershell
# Login to Azure CLI with AME tenant
az login --tenant ame.gbl

# Verify you're in the correct tenant
az account show

# List available subscriptions
az account list --output table

# Set the subscription you want to use
az account set --subscription "YOUR_SUBSCRIPTION_NAME_OR_ID"
```

## Step 2: Login Azure Developer CLI to AME Tenant

```powershell
# Login azd to AME tenant
azd auth login --tenant-id ame.gbl

# Or if you need to specify the tenant ID explicitly
azd auth login --tenant-id <AME_TENANT_ID>
```

## Step 3: Initialize the Environment

```powershell
# Initialize azd environment
azd init

# When prompted:
# - Environment name: seeingai-prod (or your choice)
# - Azure location: eastus (or your preferred region)
```

## Step 4: Set Environment Variables (Optional)

```powershell
# Set the subscription if needed
azd env set AZURE_SUBSCRIPTION_ID "YOUR_SUBSCRIPTION_ID"

# Set the location
azd env set AZURE_LOCATION "eastus"

# Set custom environment name if needed
azd env set AZURE_ENV_NAME "seeingai-prod"
```

## Step 5: Deploy to Azure

```powershell
# Deploy everything (infrastructure + app)
azd up

# This will:
# - Create resource group: rg-seeingai-prod
# - Create Application Insights
# - Create Log Analytics workspace
# - Create App Service Plan
# - Create Web App with staging & production slots
# - Deploy the application
# - Configure environment variables
```

## Step 6: Verify Deployment

```powershell
# Show deployed resources and URLs
azd show

# Get the web app URL
az webapp show --name <APP_NAME> --resource-group <RG_NAME> --query defaultHostName -o tsv

# Open the app in browser
start https://<APP_NAME>.azurewebsites.net
```

## Step 7: Get Application Insights Connection String

```powershell
# Get the Application Insights resource name
az resource list --resource-group <RG_NAME> --resource-type "Microsoft.Insights/components" --query "[0].name" -o tsv

# Get the connection string
az resource show \
  --resource-group <RG_NAME> \
  --name <APPINSIGHTS_NAME> \
  --resource-type "Microsoft.Insights/components" \
  --query properties.ConnectionString -o tsv
```

## Manual Deployment (Alternative)

If you prefer not to use `azd`:

### 1. Create Resource Group

```powershell
az group create \
  --name rg-seeingai-prod \
  --location eastus
```

### 2. Deploy Infrastructure

```powershell
az deployment group create \
  --resource-group rg-seeingai-prod \
  --template-file infra/main.bicep \
  --parameters environmentName=seeingai location=eastus
```

### 3. Get Deployment Outputs

```powershell
# Get all outputs
az deployment group show \
  --resource-group rg-seeingai-prod \
  --name main \
  --query properties.outputs

# Save important values
$webAppName = az deployment group show --resource-group rg-seeingai-prod --name main --query properties.outputs.WEB_APP_NAME.value -o tsv
$appInsightsConnString = az deployment group show --resource-group rg-seeingai-prod --name main --query properties.outputs.APPLICATIONINSIGHTS_CONNECTION_STRING.value -o tsv
```

### 4. Build the Application

```powershell
# Build with production settings
$env:VITE_APPINSIGHTS_CONNECTION_STRING = $appInsightsConnString
$env:VITE_ENVIRONMENT = "production"
npm run build
```

### 5. Deploy to App Service

```powershell
# Create a zip file
Compress-Archive -Path dist\* -DestinationPath dist.zip -Force

# Deploy to production slot
az webapp deployment source config-zip \
  --resource-group rg-seeingai-prod \
  --name $webAppName \
  --src dist.zip

# Deploy to staging slot
az webapp deployment source config-zip \
  --resource-group rg-seeingai-prod \
  --name $webAppName \
  --slot staging \
  --src dist.zip
```

## GitHub Actions Setup for AME Tenant

### 1. Create Service Principal

```powershell
# Get subscription ID
$subscriptionId = az account show --query id -o tsv

# Create service principal
az ad sp create-for-rbac \
  --name "github-seeingai-sim" \
  --role contributor \
  --scopes /subscriptions/$subscriptionId/resourceGroups/rg-seeingai-prod \
  --json-auth

# Save the output - you'll need these values for GitHub secrets
```

### 2. Configure Federated Credentials

```powershell
# Get the application ID
$appId = az ad sp list --display-name "github-seeingai-sim" --query "[0].appId" -o tsv

# Create federated credential for main branch
az ad app federated-credential create \
  --id $appId \
  --parameters '{
    "name": "github-main",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:meetshamir/seeingai-sim:ref:refs/heads/main",
    "audiences": ["api://AzureADTokenExchange"]
  }'

# Create federated credential for pull requests
az ad app federated-credential create \
  --id $appId \
  --parameters '{
    "name": "github-pr",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:meetshamir/seeingai-sim:pull_request",
    "audiences": ["api://AzureADTokenExchange"]
  }'
```

### 3. Add GitHub Secrets

Go to https://github.com/meetshamir/seeingai-sim/settings/secrets/actions

Add these secrets:

| Secret Name | Value | How to Get |
|------------|-------|------------|
| `AZURE_CLIENT_ID` | Service Principal Client ID | From step 1 output or `az ad sp list --display-name "github-seeingai-sim" --query "[0].appId" -o tsv` |
| `AZURE_TENANT_ID` | AME Tenant ID | `az account show --query tenantId -o tsv` |
| `AZURE_SUBSCRIPTION_ID` | Subscription ID | `az account show --query id -o tsv` |
| `AZURE_WEB_APP_NAME` | Web App Name | From deployment output or `azd show` |
| `AZURE_RESOURCE_GROUP` | Resource Group Name | `rg-seeingai-prod` |
| `APPINSIGHTS_CONNECTION_STRING` | App Insights Connection | From step 7 above |

## Monitoring in AME Tenant

### Access Application Insights

```powershell
# Get Application Insights resource ID
$appInsightsId = az resource show \
  --resource-group rg-seeingai-prod \
  --name <APPINSIGHTS_NAME> \
  --resource-type "Microsoft.Insights/components" \
  --query id -o tsv

# Open in Azure Portal
start "https://portal.azure.com/#@ame.gbl/resource$appInsightsId/overview"
```

### View Logs

```powershell
# Stream web app logs
az webapp log tail \
  --resource-group rg-seeingai-prod \
  --name <WEB_APP_NAME>

# View deployment logs
az webapp log deployment show \
  --resource-group rg-seeingai-prod \
  --name <WEB_APP_NAME>
```

## Useful Commands

### Check Deployment Status

```powershell
# List all resources in the resource group
az resource list --resource-group rg-seeingai-prod --output table

# Check web app status
az webapp show \
  --resource-group rg-seeingai-prod \
  --name <WEB_APP_NAME> \
  --query state -o tsv
```

### Update App Settings

```powershell
# Update environment variable
az webapp config appsettings set \
  --resource-group rg-seeingai-prod \
  --name <WEB_APP_NAME> \
  --settings VITE_ENVIRONMENT=production
```

### Slot Management

```powershell
# List slots
az webapp deployment slot list \
  --resource-group rg-seeingai-prod \
  --name <WEB_APP_NAME> \
  --output table

# Swap staging to production
az webapp deployment slot swap \
  --resource-group rg-seeingai-prod \
  --name <WEB_APP_NAME> \
  --slot staging \
  --target-slot production
```

### Scale the App

```powershell
# Scale out (more instances)
az appservice plan update \
  --resource-group rg-seeingai-prod \
  --name <PLAN_NAME> \
  --number-of-workers 3

# Scale up (bigger VM size)
az appservice plan update \
  --resource-group rg-seeingai-prod \
  --name <PLAN_NAME> \
  --sku P1V2
```

## Troubleshooting

### Issue: Cannot login to AME tenant

```powershell
# Clear cached credentials
az account clear
azd auth logout

# Login with specific tenant
az login --tenant ame.gbl
azd auth login --tenant-id ame.gbl
```

### Issue: Deployment fails with permission error

```powershell
# Verify you have contributor role
az role assignment list --assignee <YOUR_USER_ID> --resource-group rg-seeingai-prod
```

### Issue: App not loading after deployment

```powershell
# Check app service logs
az webapp log tail --resource-group rg-seeingai-prod --name <WEB_APP_NAME>

# Restart the app
az webapp restart --resource-group rg-seeingai-prod --name <WEB_APP_NAME>
```

## Cleanup

To delete all resources:

```powershell
# Using azd
azd down --force --purge

# Or manually
az group delete --name rg-seeingai-prod --yes --no-wait
```

## Support & Resources

- AME Tenant Portal: https://portal.azure.com
- Azure CLI Docs: https://learn.microsoft.com/cli/azure/
- Application Insights: Check Azure Portal → Application Insights → Logs

## Notes

- All resources will be created in the AME tenant
- Ensure you have proper permissions in the subscription
- Application Insights data is retained for 30 days by default
- Staging slot allows testing before production deployment
- Use Azure Monitor alerts for production monitoring
