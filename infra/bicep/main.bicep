@description('Location for deployment')
param location string = resourceGroup().location

@description('Backend container image')
param backendImage string

@description('Frontend container image')
param frontendImage string

@description('Base DNS label prefix')
param dnsLabelPrefix string = 'planning-assistant'

@description('Tags to apply to resources')
param tags object = {}

@description('Backend environment variables')
param backendEnv array = []

@description('Frontend environment variables')
param frontendEnv array = []

module containerInstances './container-instances.bicep' = {
  name: 'planningAssistantContainerInstances'
  params: {
    location: location
    backendImage: backendImage
    frontendImage: frontendImage
    dnsLabelPrefix: dnsLabelPrefix
    tags: tags
    backendEnv: backendEnv
    frontendEnv: frontendEnv
  }
}

output backendIp string = containerInstances.outputs.backendIp
output frontendIp string = containerInstances.outputs.frontendIp
