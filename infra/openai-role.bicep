param principalId string
param openAIAccountName string

// Cognitive Services OpenAI User role
var roleId = '5e0bd9bd-7b93-4f28-af87-19fc36ad61bd'

resource openAIAccount 'Microsoft.CognitiveServices/accounts@2023-05-01' existing = {
  name: openAIAccountName
}

resource roleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(openAIAccount.id, principalId, roleId)
  scope: openAIAccount
  properties: {
    principalId: principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roleId)
  }
}
