targetScope = 'subscription'

@minLength(1)
@maxLength(64)
@description('Name of the environment which is used to generate a short unique hash used in all resources.')
param environmentName string

@minLength(1)
@description('Primary location for all resources')
param location string

@description('Id of the user or app to assign application roles')
param principalId string = ''

// Optional parameters
@description('App Service Plan SKU')
param appServicePlanSku string = 'B1'

@description('Application Insights location')
param appInsightsLocation string = location

var abbrs = loadJsonContent('./abbreviations.json')
var resourceToken = toLower(uniqueString(subscription().id, environmentName, location))
var tags = { 'azd-env-name': environmentName }

// Organize resources in a resource group
resource rg 'Microsoft.Resources/resourceGroups@2021-04-01' = {
  name: '${abbrs.resourcesResourceGroups}${environmentName}'
  location: location
  tags: tags
}

// Application Insights and Log Analytics
module monitoring './monitoring.bicep' = {
  name: 'monitoring'
  scope: rg
  params: {
    location: appInsightsLocation
    tags: tags
    logAnalyticsName: '${abbrs.operationalInsightsWorkspaces}${resourceToken}'
    applicationInsightsName: '${abbrs.insightsComponents}${resourceToken}'
  }
}

// App Service Plan
module appServicePlan './appserviceplan.bicep' = {
  name: 'appserviceplan'
  scope: rg
  params: {
    name: '${abbrs.webServerFarms}${resourceToken}'
    location: location
    tags: tags
    sku: {
      name: appServicePlanSku
    }
  }
}

// Web App with deployment slots
module web './appservice.bicep' = {
  name: 'web'
  scope: rg
  params: {
    name: '${abbrs.webSitesAppService}web-${resourceToken}'
    location: location
    tags: union(tags, { 'azd-service-name': 'web' })
    appServicePlanId: appServicePlan.outputs.id
    runtimeName: 'node'
    runtimeVersion: '20-lts'
    applicationInsightsName: monitoring.outputs.applicationInsightsName
    appSettings: {
      VITE_APPINSIGHTS_CONNECTION_STRING: monitoring.outputs.applicationInsightsConnectionString
      VITE_ENVIRONMENT: 'production'
    }
    enableSlots: true
  }
}

// Outputs
output AZURE_LOCATION string = location
output AZURE_TENANT_ID string = tenant().tenantId
output AZURE_RESOURCE_GROUP string = rg.name

output APPLICATIONINSIGHTS_CONNECTION_STRING string = monitoring.outputs.applicationInsightsConnectionString
output APPLICATIONINSIGHTS_NAME string = monitoring.outputs.applicationInsightsName

output WEB_APP_NAME string = web.outputs.name
output WEB_APP_URI string = web.outputs.uri
output WEB_APP_STAGING_URI string = web.outputs.stagingUri
