# 👁️ Seeing AI Simulation

A web-based simulation of Microsoft's Seeing AI app, demonstrating AI-powered visual recognition features with comprehensive Azure monitoring and telemetry.

## 🌟 Features

### AI Capabilities (Simulated)
- **Short Text Recognition** - Read signs and labels
- **Document Reading** - Process documents and multi-line text
- **Product Recognition** - Scan barcodes and identify products
- **Person Detection** - Recognize people and faces
- **Scene Description** - Describe surroundings and environments
- **Color Identification** - Identify colors in images
- **Currency Recognition** - Recognize currency notes
- **Handwriting Recognition** - Read handwritten text

### Monitoring & Telemetry
- ✅ **Azure Application Insights** integration
- ✅ **Error tracking** with file names and line numbers
- ✅ **Custom event tracking** for all user interactions
- ✅ **Performance metrics** and analytics
- ✅ **Real-time monitoring** with Azure Monitor
- ✅ **Error simulation** for testing telemetry

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     GitHub Repository                    │
│                  (Source Code & CI/CD)                   │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ GitHub Actions
                     ↓
┌─────────────────────────────────────────────────────────┐
│              Azure App Service (Linux)                   │
│  ┌───────────────────┐      ┌───────────────────┐      │
│  │  Production Slot  │      │   Staging Slot    │      │
│  │   (Main Branch)   │      │  (Pull Requests)  │      │
│  └───────────────────┘      └───────────────────┘      │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ Telemetry & Logs
                     ↓
┌─────────────────────────────────────────────────────────┐
│          Azure Application Insights                      │
│                                                          │
│  • Error Tracking (with stack traces)                   │
│  • Custom Events                                         │
│  • Performance Metrics                                   │
│  • User Analytics                                        │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│            Log Analytics Workspace                       │
│                                                          │
│  • 30-day retention                                      │
│  • Advanced querying with KQL                            │
│  • Dashboards and alerts                                 │
└─────────────────────────────────────────────────────────┘
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20.x or later
- **Azure CLI** (`az`) - [Install](https://docs.microsoft.com/cli/azure/install-azure-cli)
- **Azure Developer CLI** (`azd`) - [Install](https://learn.microsoft.com/azure/developer/azure-developer-cli/install-azd)
- **Azure Subscription**
- **GitHub Account**

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/seeing-ai-simulation.git
   cd seeing-ai-simulation
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file:
   ```env
   VITE_APPINSIGHTS_CONNECTION_STRING=your_connection_string_here
   VITE_ENVIRONMENT=development
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to `http://localhost:3000`

### Building for Production

```bash
npm run build
```

The build output will be in the `dist` folder.

## ☁️ Azure Deployment

### Option 1: Deploy with Azure Developer CLI (Recommended)

1. **Login to Azure**
   ```bash
   azd auth login
   ```

2. **Initialize the environment**
   ```bash
   azd init
   ```

3. **Provision and deploy**
   ```bash
   azd up
   ```

This will:
- Create a resource group
- Provision Application Insights and Log Analytics
- Create an App Service Plan and Web App
- Configure staging and production slots
- Deploy your application

### Option 2: Manual Deployment

1. **Login to Azure**
   ```bash
   az login
   ```

2. **Create a resource group**
   ```bash
   az group create --name rg-seeing-ai --location eastus
   ```

3. **Deploy infrastructure with Bicep**
   ```bash
   az deployment group create \
     --resource-group rg-seeing-ai \
     --template-file infra/main.bicep \
     --parameters environmentName=seeingai location=eastus
   ```

4. **Build the application**
   ```bash
   npm run build
   ```

5. **Deploy to App Service**
   ```bash
   az webapp deployment source config-zip \
     --resource-group rg-seeing-ai \
     --name YOUR_APP_NAME \
     --src dist.zip
   ```

## 🔧 GitHub Actions CI/CD

### Setup

1. **Create GitHub Secrets** (Settings → Secrets and variables → Actions):
   - `AZURE_CLIENT_ID` - Azure Service Principal Client ID
   - `AZURE_TENANT_ID` - Azure Tenant ID
   - `AZURE_SUBSCRIPTION_ID` - Azure Subscription ID
   - `AZURE_WEB_APP_NAME` - Azure Web App name
   - `AZURE_RESOURCE_GROUP` - Resource group name
   - `APPINSIGHTS_CONNECTION_STRING` - Application Insights connection string

2. **Configure Azure Federated Credentials**

   ```bash
   az ad app federated-credential create \
     --id <APPLICATION_ID> \
     --parameters '{
       "name": "github-federated",
       "issuer": "https://token.actions.githubusercontent.com",
       "subject": "repo:YOUR_USERNAME/seeing-ai-simulation:ref:refs/heads/main",
       "audiences": ["api://AzureADTokenExchange"]
     }'
   ```

### Workflow Behavior

- **Pull Requests** → Deploy to **staging slot**
- **Main Branch** → Deploy to **production slot**
- Automatic slot swapping after successful production deployment

## 📊 Monitoring & Telemetry

### Application Insights Features

1. **Error Tracking**
   - All errors are automatically captured
   - Stack traces include file names and line numbers
   - Severity levels: Information, Warning, Error, Critical

2. **Custom Events**
   - `App_Initialized` - App startup
   - `AI_Analysis_Started` - Feature usage start
   - `AI_Analysis_Completed` - Feature usage completion
   - `System_Warning` - System warnings

3. **Performance Metrics**
   - `AnalysisDuration` - Time taken for analysis
   - Custom metrics for each feature

### Viewing Telemetry

**Azure Portal:**
1. Navigate to your Application Insights resource
2. Go to **Logs** and use KQL queries:

```kql
// View all errors
exceptions
| where timestamp > ago(24h)
| project timestamp, type, outerMessage, customDimensions

// View custom events
customEvents
| where timestamp > ago(24h)
| project timestamp, name, customDimensions

// View performance metrics
customMetrics
| where timestamp > ago(24h)
| project timestamp, name, value
```

3. **Live Metrics** - Real-time monitoring
4. **Failures** - Error analysis and trends
5. **Performance** - Response times and dependencies

### Error Simulation

The app includes built-in error simulation:
- **Critical Error Button** - Triggers a critical system error
- **Warning Button** - Logs a warning message
- **Random Errors** - 20% chance when using AI features

All errors are tracked with:
- Error message and type
- File name and line number
- Timestamp
- Custom properties (feature, context, etc.)

## 🗂️ Project Structure

```
seeing-ai-simulation/
├── .github/
│   └── workflows/
│       └── azure-deploy.yml       # CI/CD pipeline
├── infra/                          # Azure infrastructure
│   ├── core/
│   │   ├── host/
│   │   │   ├── appservice.bicep
│   │   │   └── appserviceplan.bicep
│   │   └── monitor/
│   │       └── monitoring.bicep
│   ├── abbreviations.json
│   └── main.bicep                 # Main infrastructure template
├── src/
│   ├── components/
│   │   ├── ErrorSimulator.tsx    # Error testing UI
│   │   └── FeatureCard.tsx       # AI feature card
│   ├── services/
│   │   ├── seeingAIService.ts    # AI simulation logic
│   │   └── telemetryService.ts   # Application Insights SDK
│   ├── App.css
│   ├── App.tsx                    # Main app component
│   ├── main.tsx                   # Entry point
│   └── vite-env.d.ts
├── .gitignore
├── azure.yaml                      # Azure Developer CLI config
├── index.html
├── package.json
├── README.md
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

## 🛠️ Technologies Used

- **Frontend**: React 18, TypeScript
- **Build Tool**: Vite
- **Hosting**: Azure App Service (Linux)
- **Monitoring**: Azure Application Insights
- **Logging**: Azure Log Analytics
- **Infrastructure**: Bicep (IaC)
- **CI/CD**: GitHub Actions
- **Deployment**: Azure Developer CLI

## 🔐 Security Best Practices

- ✅ HTTPS only (enforced)
- ✅ TLS 1.2 minimum
- ✅ FTPS only for deployments
- ✅ Connection strings stored in Azure configuration
- ✅ Federated credentials for GitHub Actions (no secrets)

## 📝 Development Notes

### Environment Variables

**Development** (`.env.local`):
```env
VITE_APPINSIGHTS_CONNECTION_STRING=InstrumentationKey=xxx;...
VITE_ENVIRONMENT=development
```

**Production** (Azure App Settings):
- `VITE_APPINSIGHTS_CONNECTION_STRING` - Set automatically by Bicep
- `VITE_ENVIRONMENT` - Set to `production` or `staging`

### Adding New Features

1. Add feature to `aiFeatures` array in `src/services/seeingAIService.ts`
2. Update `generateMockResult()` method with sample data
3. Test locally with error simulation
4. Verify telemetry in Application Insights

## 🐛 Troubleshooting

### Application Insights not receiving data

1. Check connection string is set correctly
2. Verify initialization in browser console
3. Check Azure Portal → Application Insights → Live Metrics

### Deployment fails

1. Verify Azure credentials in GitHub Secrets
2. Check deployment logs in GitHub Actions
3. Review App Service logs in Azure Portal

### Slot swap issues

1. Ensure both slots are running
2. Check app settings are configured correctly
3. Verify deployment succeeded on staging slot

## 📚 Resources

- [Azure App Service Documentation](https://docs.microsoft.com/azure/app-service/)
- [Application Insights Documentation](https://docs.microsoft.com/azure/azure-monitor/app/app-insights-overview)
- [Azure Developer CLI](https://learn.microsoft.com/azure/developer/azure-developer-cli/)
- [GitHub Actions for Azure](https://github.com/Azure/actions)

## 📄 License

MIT License - See LICENSE file for details

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

---

**Built with ❤️ using Azure, React, and TypeScript**
