import { Configuration, PublicClientApplication } from '@azure/msal-browser'

const clientId = process.env.NEXT_PUBLIC_AZURE_AD_CLIENT_ID || ''
const tenantId = process.env.NEXT_PUBLIC_AZURE_AD_TENANT_ID || ''
const redirectUri = process.env.NEXT_PUBLIC_AZURE_AD_REDIRECT_URI || 'http://localhost:3000'

export const msalConfig: Configuration = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri,
    postLogoutRedirectUri: redirectUri,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
}

export const loginRequest = {
  scopes: ['openid', 'profile', 'email', `api://${clientId}/access_as_user`],
}

export const msalInstance = new PublicClientApplication(msalConfig)

await msalInstance.initialize()
