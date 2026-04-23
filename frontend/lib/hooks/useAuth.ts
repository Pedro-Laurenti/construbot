import { useEffect, useState } from 'react'
import { msalInstance, loginRequest } from '@/lib/msal-config'
import { AuthenticationResult } from '@azure/msal-browser'

export interface User {
  id: string
  nome: string
  email: string
  role: 'cliente' | 'engenheiro' | 'admin'
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const accounts = msalInstance.getAllAccounts()
    if (accounts.length > 0) {
      msalInstance.setActiveAccount(accounts[0])
      fetchUserInfo()
    } else {
      setLoading(false)
    }
  }, [])

  async function fetchUserInfo() {
    try {
      const token = await getAccessToken()
      const response = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await response.json()
      if (data.status === 'success') {
        setUser(data.data)
      }
    } catch (error) {
      console.error('Erro ao buscar usuário:', error)
    } finally {
      setLoading(false)
    }
  }

  async function login() {
    try {
      const result: AuthenticationResult = await msalInstance.loginPopup(loginRequest)
      msalInstance.setActiveAccount(result.account)
      await fetchUserInfo()
    } catch (error) {
      console.error('Erro no login:', error)
      throw error
    }
  }

  async function logout() {
    await msalInstance.logoutPopup()
    setUser(null)
  }

  async function getAccessToken(): Promise<string> {
    const account = msalInstance.getActiveAccount()
    if (!account) throw new Error('Usuário não autenticado')

    try {
      const response = await msalInstance.acquireTokenSilent({
        ...loginRequest,
        account,
      })
      return response.accessToken
    } catch (error) {
      const response = await msalInstance.acquireTokenPopup(loginRequest)
      return response.accessToken
    }
  }

  return {
    user,
    loading,
    login,
    logout,
    getAccessToken,
    isAuthenticated: !!user,
  }
}
