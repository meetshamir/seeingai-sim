param name string
param location string
param tags object = {}

param sku object

resource appServicePlan 'Microsoft.Web/serverfarms@2022-09-01' = {
  name: name
  location: location
  tags: tags
  sku: sku
  properties: {
    reserved: true
  }
  kind: 'linux'
}

output id string = appServicePlan.id
output name string = appServicePlan.name
