targetScope = 'subscription'

@description('Location for all resources')
param location string = 'southeastasia'

@description('Environment name (dev, staging, prod)')
param environmentName string

@secure()
@description('PostgreSQL administrator password')
param pgAdminPassword string

@description('Azure OpenAI endpoint URL')
param openAIEndpoint string

@description('Resource group containing the Azure OpenAI resource')
param openAIResourceGroupName string

@description('Azure OpenAI account name')
param openAIAccountName string

var resourceToken = toLower(uniqueString(subscription().id, environmentName, location))
var tags = { 'azd-env-name': environmentName, app: 'seatrium-ai-planner' }
var rgName = 'rg-seatrium-planner-${environmentName}'

resource rg 'Microsoft.Resources/resourceGroups@2021-04-01' = {
  name: rgName
  location: location
  tags: tags
}

module resources 'resources.bicep' = {
  name: 'resources'
  scope: rg
  params: {
    location: location
    environmentName: environmentName
    resourceToken: resourceToken
    tags: tags
    openAIEndpoint: openAIEndpoint
    openAIResourceGroupName: openAIResourceGroupName
    openAIAccountName: openAIAccountName
    pgAdminPassword: pgAdminPassword
  }
}

output AZURE_CONTAINER_REGISTRY_ENDPOINT string = resources.outputs.containerRegistryEndpoint
output AZURE_CONTAINER_REGISTRY_NAME string = resources.outputs.containerRegistryName
output AZURE_CONTAINER_ENVIRONMENT_NAME string = resources.outputs.containerEnvironmentName
output AZURE_RESOURCE_GROUP string = rg.name
output DATABASE_URL string = resources.outputs.databaseUrl
output BACKEND_URL string = resources.outputs.backendUrl
output FRONTEND_URL string = resources.outputs.frontendUrl
