param name string
param location string
param tags object = {}

param appServicePlanId string
param runtimeName string
param runtimeVersion string
param applicationInsightsName string = ''
param appSettings object = {}
param enableSlots bool = true

resource appService 'Microsoft.Web/sites@2022-09-01' = {
  name: name
  location: location
  tags: tags
  kind: 'app'
  properties: {
    serverFarmId: appServicePlanId
    siteConfig: {
      nodeVersion: '~${runtimeVersion}'
      alwaysOn: true
      ftpsState: 'FTPSOnly'
      minTlsVersion: '1.2'
      appSettings: [
        for setting in items(appSettings): {
          name: setting.key
          value: setting.value
        }
      ]
    }
    httpsOnly: true
  }
}

// Staging slot
resource stagingSlot 'Microsoft.Web/sites/slots@2022-09-01' = if (enableSlots) {
  parent: appService
  name: 'staging'
  location: location
  tags: tags
  kind: 'app'
  properties: {
    serverFarmId: appServicePlanId
    siteConfig: {
      nodeVersion: '~${runtimeVersion}'
      alwaysOn: true
      ftpsState: 'FTPSOnly'
      minTlsVersion: '1.2'
      appSettings: [
        {
          name: 'VITE_APPINSIGHTS_CONNECTION_STRING'
          value: appSettings.VITE_APPINSIGHTS_CONNECTION_STRING
        }
        {
          name: 'VITE_ENVIRONMENT'
          value: 'staging'
        }
      ]
    }
    httpsOnly: true
  }
}

output id string = appService.id
output name string = appService.name
output uri string = 'https://${appService.properties.defaultHostName}'
output stagingUri string = enableSlots ? 'https://${stagingSlot.properties.defaultHostName}' : ''
