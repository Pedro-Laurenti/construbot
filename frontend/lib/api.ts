import { msalInstance, loginRequest } from './msal-config'

export async function fetchWithAuth(url: string, options?: RequestInit) {
  const account = msalInstance.getActiveAccount()
  
  let token = ''
  if (account) {
    try {
      const response = await msalInstance.acquireTokenSilent({
        ...loginRequest,
        account,
      })
      token = response.accessToken
    } catch (error) {
      console.error('Erro ao obter token:', error)
    }
  }

  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers
    },
  });
}
