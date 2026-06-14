targetScope = 'subscription'

@minLength(1)
@maxLength(64)
@description('Name of the environment (used to generate resource names)')
param environmentName string

@minLength(1)
@description('Azure region for all resources')
param location string

@description('Foundry IQ retrieval endpoint URL')
param foundryIqEndpoint string

@description('Entra client ID for the MCP server app registration')
param entraClientId string

@description('Entra tenant ID')
param entraTenantId string

@description('Microsoft Planner plan ID for SME task assignment')
param plannerPlanId string = ''

// ── Resource group ────────────────────────────────────────────────────────────

resource rg 'Microsoft.Resources/resourceGroups@2022-09-01' = {
  name: 'rg-${environmentName}'
  location: location
  tags: { 'azd-env-name': environmentName }
}

// ── Container Registry ───────────────────────────────────────────────────────

module acr 'br/public:avm/res/container-registry/registry:0.1.1' = {
  scope: rg
  name: 'acr'
  params: {
    name: 'acr${uniqueString(rg.id)}'
    location: location
    acrSku: 'Basic'
    acrAdminUserEnabled: false
    tags: { 'azd-env-name': environmentName }
  }
}

// ── Key Vault ────────────────────────────────────────────────────────────────

module kv 'br/public:avm/res/key-vault/vault:0.3.4' = {
  scope: rg
  name: 'kv'
  params: {
    name: 'kv-${uniqueString(rg.id)}'
    location: location
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
    tags: { 'azd-env-name': environmentName }
  }
}

// ── Container Apps Environment ───────────────────────────────────────────────

module acaEnv 'br/public:avm/res/app/managed-environment:0.4.5' = {
  scope: rg
  name: 'acaEnv'
  params: {
    name: 'aca-env-${environmentName}'
    location: location
    logAnalyticsWorkspaceResourceId: logAnalytics.outputs.resourceId
    tags: { 'azd-env-name': environmentName }
  }
}

module logAnalytics 'br/public:avm/res/operational-insights/workspace:0.3.4' = {
  scope: rg
  name: 'logAnalytics'
  params: {
    name: 'log-${environmentName}'
    location: location
    tags: { 'azd-env-name': environmentName }
  }
}

// ── Container App (MCP Server) ───────────────────────────────────────────────

module mcpServer 'br/public:avm/res/app/container-app:0.4.1' = {
  scope: rg
  name: 'mcpServer'
  params: {
    name: 'rfp-respond-mcp'
    location: location
    environmentResourceId: acaEnv.outputs.resourceId
    ingressExternal: true
    ingressTargetPort: 3978
    ingressTransport: 'http'
    containers: [
      {
        name: 'mcp-server'
        image: '${acr.outputs.loginServer}/rfp-respond-mcp:latest'
        resources: {
          cpu: '0.25'
          memory: '0.5Gi'
        }
        env: [
          { name: 'PORT', value: '3978' }
          { name: 'NODE_ENV', value: 'production' }
          { name: 'FOUNDRY_IQ_ENDPOINT', value: foundryIqEndpoint }
          { name: 'ENTRA_CLIENT_ID', value: entraClientId }
          { name: 'ENTRA_TENANT_ID', value: entraTenantId }
          { name: 'PLANNER_PLAN_ID', value: plannerPlanId }
          {
            name: 'FOUNDRY_IQ_KEY'
            secretRef: 'foundry-iq-key'
          }
          {
            name: 'ENTRA_CLIENT_SECRET'
            secretRef: 'entra-client-secret'
          }
        ]
      }
    ]
    secrets: [
      {
        name: 'foundry-iq-key'
        keyVaultUrl: '${kv.outputs.uri}secrets/foundry-iq-key'
        identity: 'system'
      }
      {
        name: 'entra-client-secret'
        keyVaultUrl: '${kv.outputs.uri}secrets/entra-client-secret'
        identity: 'system'
      }
    ]
    scaleMinReplicas: 0
    scaleMaxReplicas: 5
    tags: { 'azd-env-name': environmentName, 'azd-service-name': 'mcp-server' }
  }
}

// ── Outputs ──────────────────────────────────────────────────────────────────

output AZURE_CONTAINER_REGISTRY_ENDPOINT string = acr.outputs.loginServer
output KEY_VAULT_URI string = kv.outputs.uri
output MCP_SERVER_URL string = 'https://${mcpServer.outputs.fqdn}'
output RESOURCE_GROUP_NAME string = rg.name
