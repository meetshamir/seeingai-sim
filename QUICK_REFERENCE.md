# Quick Reference Guide

## 🚀 Common Commands

### Local Development
```powershell
# Setup project
.\setup.ps1

# Install dependencies
npm install

# Start dev server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Azure Deployment
```powershell
# Login to Azure
azd auth login
az login

# Deploy everything (first time)
azd up

# Deploy code changes only
azd deploy

# View deployed resources
azd show

# Get environment variables
azd env get-values

# Clean up resources
azd down --force --purge
```

### GitHub Setup
```powershell
# Initialize git
git init
git add .
git commit -m "Initial commit"

# Add remote and push
git remote add origin https://github.com/YOUR_USERNAME/seeing-ai-simulation.git
git push -u origin main
```

## 🔑 Required Secrets

### GitHub Repository Secrets
| Secret Name | Description | How to Get |
|------------|-------------|------------|
| `AZURE_CLIENT_ID` | Service Principal Client ID | `az ad sp create-for-rbac` output |
| `AZURE_TENANT_ID` | Azure Tenant ID | `az account show --query tenantId` |
| `AZURE_SUBSCRIPTION_ID` | Subscription ID | `az account show --query id` |
| `AZURE_WEB_APP_NAME` | Web App Name | From `azd up` output |
| `AZURE_RESOURCE_GROUP` | Resource Group Name | From `azd up` output |
| `APPINSIGHTS_CONNECTION_STRING` | App Insights Connection | Azure Portal → App Insights |

## 📊 Monitoring Queries

### View Recent Errors
```kql
exceptions
| where timestamp > ago(1h)
| project timestamp, type, outerMessage, 
    fileName = tostring(customDimensions.fileName),
    lineNumber = tostring(customDimensions.lineNumber)
| order by timestamp desc
```

### Feature Usage Stats
```kql
customEvents
| where name == "AI_Analysis_Started"
| summarize count() by tostring(customDimensions.feature)
| render barchart
```

### Error Rate
```kql
requests
| summarize Total = count(), Failures = countif(success == false)
| extend ErrorRate = (Failures * 100.0) / Total
```

### Performance Metrics
```kql
customMetrics
| where name == "AnalysisDuration"
| summarize avg(value) by tostring(customDimensions.feature)
| render barchart
```

## 🌐 URLs

### Local Development
- **Dev Server**: http://localhost:3000

### Azure (after deployment)
- **Production**: `https://app-web-xxxxx.azurewebsites.net`
- **Staging**: `https://app-web-xxxxx-staging.azurewebsites.net`
- **App Insights**: Azure Portal → Application Insights
- **Logs**: Azure Portal → App Service → Log stream

## 🛠️ Troubleshooting

### App not starting
```powershell
# Check logs
az webapp log tail --name YOUR_APP --resource-group YOUR_RG

# Check configuration
az webapp config show --name YOUR_APP --resource-group YOUR_RG
```

### Deployment failed
```powershell
# Check deployment logs
az webapp deployment list-publishing-credentials --name YOUR_APP --resource-group YOUR_RG

# Redeploy
azd deploy --force
```

### No telemetry in App Insights
```powershell
# Verify connection string
az webapp config appsettings list \
  --name YOUR_APP \
  --resource-group YOUR_RG \
  --query "[?name=='VITE_APPINSIGHTS_CONNECTION_STRING']"

# Check Live Metrics in Azure Portal
```

## 🔄 Common Tasks

### Update App Settings
```powershell
az webapp config appsettings set \
  --name YOUR_APP \
  --resource-group YOUR_RG \
  --settings KEY=VALUE
```

### Swap Slots
```powershell
az webapp deployment slot swap \
  --name YOUR_APP \
  --resource-group YOUR_RG \
  --slot staging \
  --target-slot production
```

### Restart App
```powershell
az webapp restart \
  --name YOUR_APP \
  --resource-group YOUR_RG
```

### Scale App
```powershell
# Scale out (more instances)
az appservice plan update \
  --name YOUR_PLAN \
  --resource-group YOUR_RG \
  --number-of-workers 3

# Scale up (bigger instance)
az appservice plan update \
  --name YOUR_PLAN \
  --resource-group YOUR_RG \
  --sku P1V2
```

## 📁 Important Files

| File | Purpose |
|------|---------|
| `src/services/telemetryService.ts` | Application Insights SDK integration |
| `src/services/seeingAIService.ts` | AI simulation + error generation |
| `infra/main.bicep` | Main infrastructure template |
| `.github/workflows/azure-deploy.yml` | CI/CD pipeline |
| `azure.yaml` | Azure Developer CLI configuration |

## 🎯 Testing Checklist

- [ ] Run `npm run dev` - app starts locally
- [ ] Click each AI feature - simulations work
- [ ] Click "Trigger Critical Error" - error appears
- [ ] Check browser console - App Insights initialized
- [ ] Deploy to Azure - `azd up` succeeds
- [ ] Visit production URL - app loads
- [ ] Trigger errors - appear in App Insights (wait 2-3 minutes)
- [ ] Run KQL queries - see telemetry data
- [ ] Push to GitHub - Actions workflow runs
- [ ] PR created - deploys to staging

## 💡 Pro Tips

1. **Local testing without App Insights**: The app works even without a connection string (warnings in console only)

2. **Quick rebuild**: `npm run build` is fast with Vite

3. **View all resources**: `azd show` gives you all URLs and names

4. **Cost saving**: Use `azd down` when not using resources (can redeploy anytime)

5. **Live debugging**: Use Application Insights Live Metrics for real-time data

6. **Query shortcuts**: Save frequently used KQL queries in App Insights

## 📞 Quick Links

- [Azure Portal](https://portal.azure.com)
- [Application Insights Query Language (KQL)](https://learn.microsoft.com/azure/data-explorer/kusto/query/)
- [Azure CLI Reference](https://learn.microsoft.com/cli/azure/)
- [Azure Developer CLI Docs](https://learn.microsoft.com/azure/developer/azure-developer-cli/)
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
