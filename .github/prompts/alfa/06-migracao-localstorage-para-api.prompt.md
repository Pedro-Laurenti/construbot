---
agent: agent
---
# Frontend — Remover localStorage, consumir API

## Contexto

O projeto ConstruBot possui atualmente:
- **Etapa 01 concluída**: Storage Account provisionado, Managed Identity configurada
- **Etapa 02 concluída**: Schemas documentados para 12 tabelas
- **Etapa 03 concluída**: 12 repositórios implementados no backend
- **Etapa 04 concluída**: Autenticação Azure AD com JWT, decorators de autorização
- **Etapa 05 concluída**: 6 routers CRUD expostos (`/api/clientes`, `/api/orcamentos`, `/api/orcamentos-engenheiro`, `/api/parametros-globais`, `/api/grupos-encargos`, `/api/auditoria`)
- **Frontend atual**: dados persistidos em `localStorage` via `loadStorage()`, `saveStorage()`, `loadEngineerData()`, `saveEngineerData()` em `frontend/lib/storage.ts`

**Arquivos que usam localStorage atualmente (30 referências):**
- `frontend/app/page.tsx` — orquestra cliente/orcamentos com 15 chamadas a `loadStorage()`/`saveStorage()`
- `frontend/components/engenheiro/EngineerApp.tsx` — carrega/salva `EngineerData` com 4 chamadas
- `frontend/components/OrcamentoChatFlow.tsx` — lê plantas e parâmetros com 3 chamadas a `loadEngineerData()`
- `frontend/lib/storage.ts` — define as 8 funções de storage

**Arquivos que serão modificados:**
- `frontend/lib/api.ts` — expandir de 30 linhas para ~300 linhas com funções CRUD completas
- `frontend/app/page.tsx` — substituir todas as 15 chamadas `loadStorage()`/`saveStorage()` por chamadas assíncronas à API
- `frontend/components/engenheiro/EngineerApp.tsx` — substituir storage local por API calls
- `frontend/components/OrcamentoChatFlow.tsx` — substituir `loadEngineerData()` por hooks de cache
- `frontend/lib/storage.ts` — deprecar funções de storage, manter apenas `loadRole()`/`saveRole()` para cache de UI

**Arquivos que serão criados:**
- `frontend/lib/hooks/useClientes.ts` — hook para CRUD de clientes com SWR
- `frontend/lib/hooks/useOrcamentos.ts` — hook para CRUD de orçamentos com SWR
- `frontend/lib/hooks/useEngineerData.ts` — hook para dados do engenheiro com SWR
- `frontend/lib/migration.ts` — script de migração do localStorage para API
- `frontend/components/MigrationModal.tsx` — UI de migração com progresso

Esta etapa remove completamente a dependência de `localStorage` para persistência de dados, substituindo-a por chamadas HTTP à API REST com cache otimista via SWR.

## Pré-requisitos

- Etapa alfa-01 concluída (Storage Account)
- Etapa alfa-02 concluída (schemas)
- Etapa alfa-03 concluída (repositórios)
- Etapa alfa-04 concluída (autenticação Azure AD)
- Etapa alfa-05 concluída (endpoints CRUD expostos)

## Entregáveis

Ao final desta etapa, devem existir:

1. **Camada de API completa em `lib/api.ts`**:
   - Funções CRUD para clientes: `createCliente()`, `listClientes()`, `getCliente()`, `updateCliente()`, `deleteCliente()`
   - Funções CRUD para orçamentos: `createOrcamento()`, `listOrcamentos()`, `getOrcamento()`, `updateOrcamento()`, `deleteOrcamento()`
   - Funções para dados engenheiro: `getParametrosGlobais()`, `updateParametrosGlobais()`, `getGruposEncargos()`, `updateGruposEncargos()`
   - Retry automático em caso de falha (máx 3 tentativas)
   - Tratamento de erros HTTP com mensagens amigáveis

2. **Hooks de cache com SWR**:
   - `useClientes()` — lista clientes com revalidação automática
   - `useCliente(id)` — busca cliente por ID com cache
   - `useOrcamentos(filtros?)` — lista orçamentos com filtros opcionais
   - `useOrcamento(id)` — busca orçamento por ID com cache
   - `useEngineerData()` — carrega parâmetros globais + grupos encargos
   - Revalidação otimista após mutações (POST/PUT/DELETE)

3. **Script de migração**:
   - `frontend/lib/migration.ts` com função `migrateLocalStorageToAPI()`
   - Detecta dados em `localStorage` (keys `construbot_v2`, `construbot_engineer`)
   - Cria cliente via `POST /api/clientes` se não existir
   - Cria orçamentos via `POST /api/orcamentos` em batch
   - Limpa `localStorage` após migração bem-sucedida
   - Retorna relatório de migração (sucesso/erros)

4. **UI de migração**:
   - `frontend/components/MigrationModal.tsx` — modal exibido automaticamente na primeira carga
   - Barra de progresso (0-100%)
   - Mensagem "Migrando dados para a nuvem..."
   - Botão "Pular migração" (mantém dados em localStorage até próximo login)
   - Bloqueio de interação durante migração

5. **Refatoração completa do frontend**:
   - `app/page.tsx` — todos os `loadStorage()`/`saveStorage()` substituídos por `useClientes()`, `useOrcamentos()`
   - `components/engenheiro/EngineerApp.tsx` — `loadEngineerData()`/`saveEngineerData()` substituídos por `useEngineerData()`
   - `components/OrcamentoChatFlow.tsx` — `loadEngineerData()` substituído por `useEngineerData()`
   - Remoção de 30 referências a storage local, substituídas por 8 hooks SWR

6. **Atualização de dependências**:
   - `frontend/package.json` — adicionar `swr@^2.2.5`

7. **Documentação**:
   - README.md atualizado com seção "Migração de Dados"

## Implementação

### 1. Instalar SWR

```bash
cd frontend
npm install swr@2.2.5
```

### 2. Expandir `lib/api.ts` com funções CRUD

Adicionar ao arquivo `frontend/lib/api.ts`:

```typescript
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
```

### 3. Criar hooks SWR

**Arquivo `frontend/lib/hooks/useClientes.ts`:**

```typescript
import useSWR from 'swr'
import { listClientes, createCliente, updateCliente, deleteCliente } from '@/lib/api'
import type { Cliente } from '@/types'

export function useClientes(email?: string) {
  const { data, error, mutate } = useSWR(
    email ? `/api/clientes?email=${email}` : '/api/clientes',
    () => listClientes({ email })
  )
  
  return {
    clientes: data?.data ?? [],
    total: data?.total ?? 0,
    loading: !data && !error,
    error,
    mutate,
    async create(payload: { nome: string; telefone: string; email: string }) {
      const created = await createCliente(payload)
      mutate()
      return created
    },
    async update(id: string, payload: Partial<{ nome: string; telefone: string; email: string }>) {
      const updated = await updateCliente(id, payload)
      mutate()
      return updated
    },
    async remove(id: string) {
      await deleteCliente(id)
      mutate()
    },
  }
}
```

**Arquivo `frontend/lib/hooks/useOrcamentos.ts`:**

```typescript
import useSWR from 'swr'
import { listOrcamentos, createOrcamento, updateOrcamento, deleteOrcamento } from '@/lib/api'
import type { Orcamento } from '@/types'

export function useOrcamentos(clienteId?: string, status?: string) {
  const { data, error, mutate } = useSWR(
    clienteId ? `/api/orcamentos?cliente_id=${clienteId}` : '/api/orcamentos',
    () => listOrcamentos({ cliente_id: clienteId, status })
  )
  
  return {
    orcamentos: data?.data ?? [],
    total: data?.total ?? 0,
    loading: !data && !error,
    error,
    mutate,
    async create(payload: { nome: string; uf: string; itensJson: string }) {
      const created = await createOrcamento(payload)
      mutate()
      return created
    },
    async update(id: string, payload: Partial<{ nome: string; status: string; itensJson: string; totaisJson: string; parametrosJson: string; saidaJson: string }>) {
      const updated = await updateOrcamento(id, payload)
      mutate()
      return updated
    },
    async remove(id: string) {
      await deleteOrcamento(id)
      mutate()
    },
  }
}
```

**Arquivo `frontend/lib/hooks/useEngineerData.ts`:**

```typescript
import useSWR from 'swr'
import { getParametrosGlobais, updateParametrosGlobais, getGruposEncargos, updateGruposEncargos } from '@/lib/api'
import type { GlobalParams, GruposEncargos } from '@/types'

export function useParametrosGlobais() {
  const { data, error, mutate } = useSWR('/api/parametros-globais', getParametrosGlobais)
  
  return {
    parametros: data,
    loading: !data && !error,
    error,
    mutate,
    async update(payload: Partial<GlobalParams>) {
      const updated = await updateParametrosGlobais(payload)
      mutate(updated)
      return updated
    },
  }
}

export function useGruposEncargos() {
  const { data, error, mutate } = useSWR('/api/grupos-encargos', getGruposEncargos)
  
  return {
    grupos: data,
    loading: !data && !error,
    error,
    mutate,
    async update(payload: Partial<GruposEncargos>) {
      const updated = await updateGruposEncargos(payload)
      mutate(updated)
      return updated
    },
  }
}
```

### 4. Criar script de migração

**Arquivo `frontend/lib/migration.ts`:**

```typescript
import { createCliente, createOrcamento } from './api'
import type { AppSession, Cliente, Orcamento, EngineerData } from '@/types'

const STORAGE_KEY = 'construbot_v2'
const ENGINEER_KEY = 'construbot_engineer'
const MIGRATION_FLAG = 'construbot_migrated'

export interface MigrationReport {
  success: boolean
  clienteCriado: boolean
  orcamentosCriados: number
  erros: string[]
}

export function needsMigration(): boolean {
  if (typeof window === 'undefined') return false
  if (localStorage.getItem(MIGRATION_FLAG)) return false
  
  const hasClientData = !!localStorage.getItem(STORAGE_KEY)
  const hasEngineerData = !!localStorage.getItem(ENGINEER_KEY)
  
  return hasClientData || hasEngineerData
}

export async function migrateLocalStorageToAPI(): Promise<MigrationReport> {
  const report: MigrationReport = {
    success: false,
    clienteCriado: false,
    orcamentosCriados: 0,
    erros: [],
  }
  
  if (typeof window === 'undefined') {
    report.erros.push('Migração disponível apenas no navegador')
    return report
  }
  
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      report.success = true
      localStorage.setItem(MIGRATION_FLAG, 'true')
      return report
    }
    
    const session: AppSession = JSON.parse(raw)
    
    if (session.cliente) {
      try {
        await createCliente({
          nome: session.cliente.nome,
          telefone: session.cliente.telefone,
          email: session.cliente.email,
        })
        report.clienteCriado = true
      } catch (error) {
        report.erros.push(`Cliente: ${String(error)}`)
      }
    }
    
    if (session.orcamentos && session.orcamentos.length > 0) {
      for (const orc of session.orcamentos) {
        try {
          await createOrcamento({
            nome: orc.nome,
            uf: orc.uf,
            itensJson: JSON.stringify(orc.itens ?? []),
          })
          report.orcamentosCriados++
        } catch (error) {
          report.erros.push(`Orçamento "${orc.nome}": ${String(error)}`)
        }
      }
    }
    
    report.success = report.erros.length === 0
    
    if (report.success) {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(ENGINEER_KEY)
      localStorage.setItem(MIGRATION_FLAG, 'true')
    }
    
    return report
  } catch (error) {
    report.erros.push(`Erro geral: ${String(error)}`)
    return report
  }
}

export function skipMigration(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(MIGRATION_FLAG, 'skipped')
}

export function resetMigrationFlag(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(MIGRATION_FLAG)
}
```

### 5. Criar UI de migração

**Arquivo `frontend/components/MigrationModal.tsx`:**

```typescript
'use client'

import { useState, useEffect } from 'react'
import { MdCloudUpload, MdCheckCircle, MdError } from 'react-icons/md'
import { needsMigration, migrateLocalStorageToAPI, skipMigration, type MigrationReport } from '@/lib/migration'

export default function MigrationModal() {
  const [show, setShow] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [report, setReport] = useState<MigrationReport | null>(null)

  useEffect(() => {
    if (needsMigration()) {
      setShow(true)
    }
  }, [])

  async function handleMigrate() {
    setMigrating(true)
    setProgress(10)

    const interval = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 90))
    }, 300)

    try {
      const result = await migrateLocalStorageToAPI()
      setReport(result)
      setProgress(100)
      clearInterval(interval)

      setTimeout(() => {
        setShow(false)
        window.location.reload()
      }, 2000)
    } catch (error) {
      clearInterval(interval)
      setReport({
        success: false,
        clienteCriado: false,
        orcamentosCriados: 0,
        erros: [String(error)],
      })
      setProgress(0)
      setMigrating(false)
    }
  }

  function handleSkip() {
    skipMigration()
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="card bg-base-100 shadow-xl max-w-md w-full mx-4">
        <div className="card-body gap-4">
          <div className="flex items-center gap-3">
            <MdCloudUpload className="text-4xl text-primary" />
            <h2 className="card-title text-xl">Migração de Dados</h2>
          </div>

          {!migrating && !report && (
            <>
              <p className="text-sm">
                Detectamos dados armazenados localmente. Deseja migrar seus dados para a nuvem?
              </p>
              <div className="card-actions justify-end gap-2">
                <button className="btn btn-ghost btn-sm" onClick={handleSkip}>
                  Pular
                </button>
                <button className="btn btn-primary btn-sm" onClick={handleMigrate}>
                  Migrar agora
                </button>
              </div>
            </>
          )}

          {migrating && (
            <>
              <p className="text-sm">Migrando dados para a nuvem...</p>
              <progress className="progress progress-primary w-full" value={progress} max="100" />
              <p className="text-xs text-center">{progress}%</p>
            </>
          )}

          {report && (
            <>
              {report.success ? (
                <div className="flex items-center gap-2 text-success">
                  <MdCheckCircle className="text-2xl" />
                  <p className="text-sm font-semibold">Migração concluída!</p>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-error">
                  <MdError className="text-2xl" />
                  <p className="text-sm font-semibold">Erros na migração</p>
                </div>
              )}

              <div className="text-xs space-y-1">
                {report.clienteCriado && <p>✓ Cliente criado</p>}
                {report.orcamentosCriados > 0 && (
                  <p>✓ {report.orcamentosCriados} orçamento(s) criado(s)</p>
                )}
                {report.erros.map((erro, i) => (
                  <p key={i} className="text-error">
                    ✗ {erro}
                  </p>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
```

### 6. Refatorar `app/page.tsx`

Substituir todas as chamadas `loadStorage()`/`saveStorage()` por hooks SWR:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useClientes } from '@/lib/hooks/useClientes'
import { useOrcamentos } from '@/lib/hooks/useOrcamentos'
import MigrationModal from '@/components/MigrationModal'
// ... demais imports

export default function Home() {
  const [role, setRole] = useState<UserRole>('cliente')
  const [selectedId, setSelectedId] = useState<string>('novo')
  
  const { clientes, create: createCliente, update: updateCliente } = useClientes()
  const { orcamentos, create: createOrcamento, update: updateOrcamento, remove: deleteOrcamento } = useOrcamentos()
  
  const cliente = clientes[0] ?? null

  async function handleOnboarding(clienteData: Cliente) {
    await createCliente(clienteData)
  }

  async function handleOrcamentoSaved(orc: Orcamento) {
    const exists = orcamentos.find(o => o.id === orc.id)
    if (exists) {
      await updateOrcamento(orc.id, orc)
    } else {
      await createOrcamento(orc)
    }
    setSelectedId(orc.id)
  }

  return (
    <>
      <MigrationModal />
      {/* ... resto do JSX */}
    </>
  )
}
```

### 7. Refatorar `components/engenheiro/EngineerApp.tsx`

Substituir `loadEngineerData()`/`saveEngineerData()` por hooks:

```typescript
'use client'

import { useState } from 'react'
import { useParametrosGlobais, useGruposEncargos } from '@/lib/hooks/useEngineerData'
import { useOrcamentos } from '@/lib/hooks/useOrcamentos'
// ... demais imports

export default function EngineerApp({ onLogout }: { onLogout: () => void }) {
  const { parametros, update: updateParametros } = useParametrosGlobais()
  const { grupos, update: updateGrupos } = useGruposEncargos()
  const { orcamentos } = useOrcamentos()
  
  const [activeModule, setActiveModule] = useState<EngineerModuleId>('orcamentos')

  // ... resto do componente usa parametros, grupos, orcamentos dos hooks
}
```

### 8. Refatorar `components/OrcamentoChatFlow.tsx`

Substituir `loadEngineerData()` por hooks:

```typescript
'use client'

import { useParametrosGlobais } from '@/lib/hooks/useEngineerData'
// ... demais imports

export default function OrcamentoChatFlow({ ... }) {
  const { parametros } = useParametrosGlobais()
  
  // usar parametros.plantas, parametros.globalParams conforme necessário
}
```

### 9. Deprecar funções de storage em `lib/storage.ts`

Manter apenas `loadRole()`/`saveRole()` para cache de UI, deprecar demais funções:

```typescript
// Remover: loadStorage, saveStorage, clearStorage, loadEngineerData, saveEngineerData
// Manter: loadRole, saveRole (apenas para cache de UI local)

export function loadRole(): UserRole {
  if (typeof window === 'undefined') return 'cliente'
  return (localStorage.getItem('construbot_role') as UserRole) ?? 'cliente'
}

export function saveRole(role: UserRole): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('construbot_role', role)
}
```

### 10. Atualizar `package.json`

```json
{
  "dependencies": {
    "swr": "^2.2.5"
  }
}
```

### 11. Atualizar README.md

Adicionar seção:

```markdown
## 🔄 Migração de Dados

Na primeira vez que você acessar o ConstruBot após a atualização para a versão com persistência em nuvem, uma modal será exibida automaticamente oferecendo a migração dos dados armazenados localmente para o Azure Table Storage.

A migração:
- Cria seu perfil de cliente na nuvem
- Migra todos os orçamentos salvos localmente
- Limpa o localStorage após sucesso
- Exibe relatório de sucesso/erros

Você pode pular a migração clicando em "Pular" — neste caso, os dados permanecerão em localStorage até o próximo login.

Para forçar uma nova migração (caso tenha pulado), limpe o flag no console do navegador:

```javascript
localStorage.removeItem('construbot_migrated')
```
```

## Restrições

- NÃO usar `os.getenv()` fora de `utils/config.py`
- NÃO adicionar comentários no código
- NÃO usar emojis
- NÃO usar `localStorage` para dados de negócio (apenas UI cache como `loadRole`)
- SEMPRE usar hooks SWR para cache de dados da API
- SEMPRE usar `fetchWithRetry` em vez de `fetch` direto
- Variáveis de ambiente seguem padrão `CM_[DOMINIO]_[NOME]` no backend
- Variáveis de ambiente seguem padrão `NEXT_PUBLIC_[NOME]` no frontend
- Todas as funções assíncronas devem ter tratamento de erro com try/catch
- Modal de migração deve bloquear interação durante processamento
- Migração deve ser idempotente (pode ser executada múltiplas vezes sem duplicar dados)

## Verificação

Após concluir a implementação, executar os seguintes testes:

1. **Backend rodando:**
   ```bash
   cd backend
   uvicorn app.main:app --reload --port 8000
   ```

2. **Frontend rodando:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Testar migração:**
   - Criar dados em localStorage manualmente via console:
     ```javascript
     localStorage.setItem('construbot_v2', JSON.stringify({
       cliente: { nome: 'Teste', telefone: '11999999999', email: 'teste@example.com' },
       orcamentos: [{ id: '1', nome: 'Obra Teste', uf: 'SP', itens: [] }],
       orcamentoAtivo: null
     }))
     ```
   - Recarregar página e verificar que modal de migração aparece
   - Clicar em "Migrar agora" e verificar barra de progresso
   - Verificar no backend que cliente e orçamento foram criados:
     ```bash
     curl -H "Authorization: Bearer <token>" http://localhost:8000/api/clientes
     curl -H "Authorization: Bearer <token>" http://localhost:8000/api/orcamentos
     ```

4. **Testar hooks SWR:**
   - Abrir DevTools > Network e verificar requisições à API
   - Criar novo orçamento e verificar que lista atualiza automaticamente (revalidação otimista)
   - Editar cliente e verificar atualização em tempo real

5. **Testar erro de rede:**
   - Parar o backend
   - Tentar criar orçamento no frontend
   - Verificar que retry automático acontece 3 vezes
   - Verificar mensagem de erro amigável exibida ao usuário

6. **Verificar ausência de `localStorage` para dados:**
   - Buscar por `loadStorage`, `saveStorage`, `loadEngineerData`, `saveEngineerData` no código
   - Confirmar que apenas `loadRole`/`saveRole` permanecem

7. **Verificar dependências:**
   ```bash
   cd frontend
   npm list swr
   # Deve exibir swr@2.2.5
   ```

8. **Limpar console de erros:**
   - Abrir DevTools > Console
   - Verificar ausência de erros de TypeScript ou warnings de SWR
