@description('Location for resources')
param location string = resourceGroup().location

@description('Container image for backend API')
param backendImage string

@description('Container image for frontend UI')
param frontendImage string

@description('Base DNS label prefix for public IPs')
param dnsLabelPrefix string = 'planning-assistant'

@description('Backend container port')
param backendPort int = 8000

@description('Frontend container port')
param frontendPort int = 80

@description('Tags to apply to container groups')
param tags object = {}

@description('Backend environment variables')
param backendEnv array = []

@description('Frontend environment variables')
param frontendEnv array = []

module backendContainerGroup 'br/public:avm/res/container-instance/container-group:0.6.0' = {
  name: 'planningAssistantBackend'
  params: {
    availabilityZone: -1
    name: '${dnsLabelPrefix}-backend'
    location: location
    containers: [
      {
        name: 'backend-api'
        properties: {
          image: backendImage
          ports: [
            {
              port: backendPort
              protocol: 'Tcp'
            }
          ]
          environmentVariables: backendEnv
          resources: {
            requests: {
              cpu: 1
              memoryInGB: '1.5'
            }
          }
        }
      }
    ]
    ipAddress: {
      ports: [
        {
          port: backendPort
          protocol: 'Tcp'
        }
      ]
      dnsNameLabel: '${dnsLabelPrefix}-api'
    }
    tags: tags
  }
}

module frontendContainerGroup 'br/public:avm/res/container-instance/container-group:0.6.0' = {
  name: 'planningAssistantFrontend'
  params: {
    availabilityZone: -1
    name: '${dnsLabelPrefix}-frontend'
    location: location
    containers: [
      {
        name: 'frontend-ui'
        properties: {
          image: frontendImage
          ports: [
            {
              port: frontendPort
              protocol: 'Tcp'
            }
          ]
          environmentVariables: frontendEnv
          resources: {
            requests: {
              cpu: 1
              memoryInGB: '1.5'
            }
          }
        }
      }
    ]
    ipAddress: {
      ports: [
        {
          port: frontendPort
          protocol: 'Tcp'
        }
      ]
      dnsNameLabel: '${dnsLabelPrefix}-web'
    }
    tags: tags
  }
}

output backendIp string = backendContainerGroup.outputs.iPv4Address
output frontendIp string = frontendContainerGroup.outputs.iPv4Address
output backendName string = backendContainerGroup.outputs.name
output frontendName string = frontendContainerGroup.outputs.name
