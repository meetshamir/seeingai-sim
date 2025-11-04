# Deployment Guide

## Quick Start

### Prerequisites
1. Azure subscription
2. Azure CLI installed
3. Azure Developer CLI (azd) installed
4. GitHub account
5. Node.js 20.x

## Deployment Steps

### 1. Deploy Infrastructure with Azure Developer CLI

```bash
# Login
azd auth login

# Initialize (first time only)
azd init

# When prompted:
# - Environment name: seeingai-prod (or your choice)
# - Azure location: eastus (or your choice)

# Deploy everything
azd up
```

This single command will:
- ✅ Create resource group
- ✅ Provision Application Insights
- ✅ Create Log Analytics workspace
- ✅ Set up App Service Plan
- ✅ Create Web App with staging & production slots
- ✅ Deploy the application
- ✅ Configure environment variables

### 2. Get Your Application Insights Connection String

```bash
# From azd output, or query manually:
az resource show \
  --resource-group rg-seeingai-prod \
  --name appi-XXXXX \
  --resource-type "Microsoft.Insights/components" \
  --query properties.ConnectionString -o tsv
```

### 3. Configure GitHub Repository

1. **Create GitHub repository**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/seeing-ai-simulation.git
   git push -u origin main
   ```

2. **Create Service Principal**
   ```bash
   az ad sp create-for-rbac \
     --name "github-seeing-ai" \
     --role contributor \
     --scopes /subscriptions/YOUR_SUBSCRIPTION_ID/resourceGroups/rg-seeingai-prod \
     --sdk-auth
   ```

3. **Add GitHub Secrets**
   
   Go to: Repository → Settings → Secrets and variables → Actions → New repository secret
   
   Add these secrets:
   - `AZURE_CLIENT_ID` - From service principal output
   - `AZURE_TENANT_ID` - From service principal output
   - `AZURE_SUBSCRIPTION_ID` - Your subscription ID
   - `AZURE_WEB_APP_NAME` - From azd output (e.g., app-web-xxxxx)
   - `AZURE_RESOURCE_GROUP` - From azd output (e.g., rg-seeingai-prod)
   - `APPINSIGHTS_CONNECTION_STRING` - From step 2

4. **Configure Federated Credentials**
   ```bash
   # Get the Application (Client) ID
   APP_ID=$(az ad sp list --display-name "github-seeing-ai" --query "[0].appId" -o tsv)
   
   # Create federated credential for main branch
   az ad app federated-credential create \
     --id $APP_ID \
     --parameters '{
       "name": "github-main",
       "issuer": "https://token.actions.githubusercontent.com",
       "subject": "repo:YOUR_USERNAME/seeing-ai-simulation:ref:refs/heads/main",
       "audiences": ["api://AzureADTokenExchange"]
     }'
   
   # Create federated credential for pull requests
   az ad app federated-credential create \
     --id $APP_ID \
     --parameters '{
       "name": "github-pr",
       "issuer": "https://token.actions.githubusercontent.com",
       "subject": "repo:YOUR_USERNAME/seeing-ai-simulation:pull_request",
       "audiences": ["api://AzureADTokenExchange"]
     }'
   ```

### 4. Test the Deployment

1. **Push to trigger deployment**
   ```bash
   git push origin main
   ```

2. **Check GitHub Actions**
   - Go to Actions tab in GitHub
   - Watch the deployment workflow

3. **Access your app**
   ```bash
   # Get URLs
   azd show
   
   # Or manually:
   az webapp show --name YOUR_APP_NAME --resource-group YOUR_RG --query defaultHostName -o tsv
   ```

## Deployment Slots

### Production Slot
- URL: `https://app-web-xxxxx.azurewebsites.net`
- Deployed on: Push to main branch
- Environment: `VITE_ENVIRONMENT=production`

### Staging Slot
- URL: `https://app-web-xxxxx-staging.azurewebsites.net`
- Deployed on: Pull requests
- Environment: `VITE_ENVIRONMENT=staging`

### Manual Slot Swap

```bash
az webapp deployment slot swap \
  --name YOUR_APP_NAME \
  --resource-group YOUR_RG \
  --slot staging \
  --target-slot production
```

## Monitoring Setup

### View Application Insights

```bash
# Open in browser
az monitor app-insights component show \
  --app YOUR_APPINSIGHTS_NAME \
  --resource-group YOUR_RG \
  --query id -o tsv | \
  xargs -I {} echo "https://portal.azure.com/#@/resource{}/overview"
```

### Useful KQL Queries

**Recent Errors:**
```kql
exceptions
| where timestamp > ago(1h)
| project timestamp, type, outerMessage, customDimensions.fileName, customDimensions.lineNumber
| order by timestamp desc
```

**Feature Usage:**
```kql
customEvents
| where name == "AI_Analysis_Started"
| summarize count() by tostring(customDimensions.feature)
| render piechart
```

**Error Rate:**
```kql
requests
| summarize 
    Total = count(),
    Failures = countif(success == false)
| extend FailureRate = (Failures * 100.0) / Total
```

## Manual Infrastructure Deployment

If you prefer not to use `azd`:

```bash
# 1. Create resource group
az group create --name rg-seeing-ai --location eastus

# 2. Deploy Bicep template
az deployment group create \
  --resource-group rg-seeing-ai \
  --template-file infra/main.bicep \
  --parameters environmentName=seeingai location=eastus

# 3. Get outputs
az deployment group show \
  --resource-group rg-seeing-ai \
  --name main \
  --query properties.outputs

# 4. Build and deploy manually
npm run build
cd dist
zip -r ../dist.zip .
cd ..

az webapp deployment source config-zip \
  --resource-group rg-seeing-ai \
  --name YOUR_APP_NAME \
  --src dist.zip
```

## Updating the Application

### Deploy New Version

```bash
# Option 1: Through GitHub
git add .
git commit -m "Update feature"
git push origin main

# Option 2: Using azd
azd deploy

# Option 3: Manual
npm run build
az webapp deployment source config-zip \
  --resource-group YOUR_RG \
  --name YOUR_APP_NAME \
  --src dist.zip
```

### Update Environment Variables

```bash
az webapp config appsettings set \
  --resource-group YOUR_RG \
  --name YOUR_APP_NAME \
  --settings VITE_NEW_SETTING=value
```

## Troubleshooting

### Check App Service Logs

```bash
# Enable logging
az webapp log config \
  --resource-group YOUR_RG \
  --name YOUR_APP_NAME \
  --application-logging filesystem \
  --detailed-error-messages true \
  --failed-request-tracing true \
  --web-server-logging filesystem

# Stream logs
az webapp log tail \
  --resource-group YOUR_RG \
  --name YOUR_APP_NAME
```

### Verify Deployment

```bash
# Check deployment status
az webapp deployment list-publishing-profiles \
  --resource-group YOUR_RG \
  --name YOUR_APP_NAME

# Test the app
curl https://YOUR_APP_NAME.azurewebsites.net
```

### Common Issues

**Issue**: App not starting
- **Solution**: Check Node.js version in App Service configuration
  ```bash
  az webapp config show --resource-group YOUR_RG --name YOUR_APP_NAME
  ```

**Issue**: Application Insights not receiving data
- **Solution**: Verify connection string is set
  ```bash
  az webapp config appsettings list \
    --resource-group YOUR_RG \
    --name YOUR_APP_NAME \
    --query "[?name=='VITE_APPINSIGHTS_CONNECTION_STRING']"
  ```

**Issue**: GitHub Actions failing
- **Solution**: Verify all secrets are set correctly and federated credentials are configured

## Cleanup

To delete all resources:

```bash
# Using azd
azd down --force --purge

# Or manually
az group delete --name rg-seeing-ai --yes --no-wait
```

## Next Steps

1. ✅ Configure custom domain
2. ✅ Set up alerts in Azure Monitor
3. ✅ Configure auto-scaling
4. ✅ Add Azure Front Door for CDN
5. ✅ Implement authentication with Azure AD
