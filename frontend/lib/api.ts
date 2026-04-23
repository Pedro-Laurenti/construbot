import { msalInstance, loginRequest } from './msal-config'
import type { Cliente, Orcamento, GlobalParams, GruposEncargos } from '@/types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function getAccessToken(): Promise<string> {
  const account = msalInstance.getActiveAccount()
  if (!account) return ''
  
  try {
    const response = await msalInstance.acquireTokenSilent({
      ...loginRequest,
      account,
    })
    return response.accessToken
  } catch (error) {
    console.error('Erro ao obter token:', error)
    return ''
  }
}

async function fetchWithRetry(url: string, options?: RequestInit, maxRetries = 3): Promise<Response> {
  let lastError: Error | null = null
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const token = await getAccessToken()
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options?.headers
        },
      })
      
      if (response.status === 401) {
        await msalInstance.acquireTokenPopup(loginRequest)
        continue
      }
      
      if (response.status >= 500 && attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
        continue
      }
      
      return response
    } catch (error) {
      lastError = error as Error
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
        continue
      }
    }
  }
  
  throw lastError ?? new Error('Falha na requisição')
}

export async function fetchWithAuth(url: string, options?: RequestInit): Promise<Response> {
  return fetchWithRetry(url, options)
}

export async function createCliente(data: { nome: string; telefone: string; email: string }): Promise<Cliente> {
  const response = await fetchWithRetry(`${API_BASE_URL}/api/clientes`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error ?? 'Erro ao criar cliente')
  }
  
  const result = await response.json()
  return result.data
}

export async function listClientes(params?: { skip?: number; limit?: number; email?: string }): Promise<{ data: Cliente[]; total: number }> {
  const query = new URLSearchParams()
  if (params?.skip !== undefined) query.set('skip', String(params.skip))
  if (params?.limit !== undefined) query.set('limit', String(params.limit))
  if (params?.email) query.set('email', params.email)
  
  const response = await fetchWithRetry(`${API_BASE_URL}/api/clientes?${query}`)
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error ?? 'Erro ao listar clientes')
  }
  
  return await response.json()
}

export async function getCliente(id: string): Promise<Cliente> {
  const response = await fetchWithRetry(`${API_BASE_URL}/api/clientes/${id}`)
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error ?? 'Cliente não encontrado')
  }
  
  const result = await response.json()
  return result.data
}

export async function updateCliente(id: string, data: Partial<{ nome: string; telefone: string; email: string }>): Promise<Cliente> {
  const response = await fetchWithRetry(`${API_BASE_URL}/api/clientes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error ?? 'Erro ao atualizar cliente')
  }
  
  const result = await response.json()
  return result.data
}

export async function deleteCliente(id: string): Promise<void> {
  const response = await fetchWithRetry(`${API_BASE_URL}/api/clientes/${id}`, {
    method: 'DELETE',
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error ?? 'Erro ao deletar cliente')
  }
}

export async function createOrcamento(data: { nome: string; uf: string; itensJson: string }): Promise<Orcamento> {
  const response = await fetchWithRetry(`${API_BASE_URL}/api/orcamentos`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error ?? 'Erro ao criar orçamento')
  }
  
  const result = await response.json()
  return result.data
}

export async function listOrcamentos(params?: { skip?: number; limit?: number; cliente_id?: string; status?: string }): Promise<{ data: Orcamento[]; total: number }> {
  const query = new URLSearchParams()
  if (params?.skip !== undefined) query.set('skip', String(params.skip))
  if (params?.limit !== undefined) query.set('limit', String(params.limit))
  if (params?.cliente_id) query.set('cliente_id', params.cliente_id)
  if (params?.status) query.set('status', params.status)
  
  const response = await fetchWithRetry(`${API_BASE_URL}/api/orcamentos?${query}`)
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error ?? 'Erro ao listar orçamentos')
  }
  
  return await response.json()
}

export async function getOrcamento(id: string): Promise<Orcamento> {
  const response = await fetchWithRetry(`${API_BASE_URL}/api/orcamentos/${id}`)
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error ?? 'Orçamento não encontrado')
  }
  
  const result = await response.json()
  return result.data
}

export async function updateOrcamento(id: string, data: Partial<{ nome: string; status: string; itensJson: string; totaisJson: string; parametrosJson: string; saidaJson: string }>): Promise<Orcamento> {
  const response = await fetchWithRetry(`${API_BASE_URL}/api/orcamentos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error ?? 'Erro ao atualizar orçamento')
  }
  
  const result = await response.json()
  return result.data
}

export async function deleteOrcamento(id: string): Promise<void> {
  const response = await fetchWithRetry(`${API_BASE_URL}/api/orcamentos/${id}`, {
    method: 'DELETE',
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error ?? 'Erro ao deletar orçamento')
  }
}

export async function getParametrosGlobais(): Promise<GlobalParams> {
  const response = await fetchWithRetry(`${API_BASE_URL}/api/parametros-globais`)
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error ?? 'Erro ao obter parâmetros globais')
  }
  
  const result = await response.json()
  return result.data
}

export async function updateParametrosGlobais(data: Partial<GlobalParams>): Promise<GlobalParams> {
  const response = await fetchWithRetry(`${API_BASE_URL}/api/parametros-globais`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error ?? 'Erro ao atualizar parâmetros globais')
  }
  
  const result = await response.json()
  return result.data
}

export async function getGruposEncargos(): Promise<GruposEncargos> {
  const response = await fetchWithRetry(`${API_BASE_URL}/api/grupos-encargos`)
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error ?? 'Erro ao obter grupos de encargos')
  }
  
  const result = await response.json()
  return result.data
}

export async function updateGruposEncargos(data: Partial<GruposEncargos>): Promise<GruposEncargos> {
  const response = await fetchWithRetry(`${API_BASE_URL}/api/grupos-encargos`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error ?? 'Erro ao atualizar grupos de encargos')
  }
  
  const result = await response.json()
  return result.data
}
