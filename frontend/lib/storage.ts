import type { AppSession, UserRole, EngineerData } from '@/types'
import { GLOBAL_PARAMS, DEFAULT_GRUPOS_ENCARGOS, PLANTAS_PADRAO, SEED_CONTA_MOCK } from './mockData'

const STORAGE_KEY = 'construbot_v2'
const CONTAS_KEY = 'construbot_contas'

const defaultSession = (): AppSession => ({
  cliente: null,
  orcamentos: [],
  orcamentoAtivo: null,
})

export function loadStorage(): AppSession {
  if (typeof window === 'undefined') return defaultSession()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultSession()
    return JSON.parse(raw) as AppSession
  } catch {
    return defaultSession()
  }
}

export function saveStorage(session: AppSession): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  if (session.cliente) saveConta(session)
}

export function clearStorage(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

function loadContas(): Record<string, AppSession> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(CONTAS_KEY)
    return raw ? JSON.parse(raw) as Record<string, AppSession> : {}
  } catch {
    return {}
  }
}

export function saveConta(session: AppSession): void {
  if (typeof window === 'undefined' || !session.cliente) return
  const email = session.cliente.email.trim().toLowerCase()
  if (!email) return
  const contas = loadContas()
  contas[email] = session
  localStorage.setItem(CONTAS_KEY, JSON.stringify(contas))
}

export function findConta(email: string): AppSession | null {
  const chave = email.trim().toLowerCase()
  if (!chave) return null
  const salva = loadContas()[chave]
  const ehMock = SEED_CONTA_MOCK.email.toLowerCase() === chave
  if (ehMock) {
    const base = salva ?? { cliente: SEED_CONTA_MOCK, orcamentos: [], orcamentoAtivo: null }
    const clienteBase = base.cliente ?? SEED_CONTA_MOCK
    return { ...base, cliente: { ...clienteBase, senha: SEED_CONTA_MOCK.senha } }
  }
  return salva ?? null
}

const ROLE_KEY = 'construbot_role'
const ENGINEER_KEY = 'construbot_engineer'

export function loadRole(): UserRole {
  if (typeof window === 'undefined') return 'cliente'
  return (localStorage.getItem(ROLE_KEY) as UserRole) ?? 'cliente'
}

export function saveRole(role: UserRole): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(ROLE_KEY, role)
}

function defaultEngineerData(): EngineerData {
  return {
    globalParams: GLOBAL_PARAMS,
    gruposEncargos: DEFAULT_GRUPOS_ENCARGOS,
    precificadorItens: [],
    calculoMOConfigs: {},
    calculoMOResults: {},
    calculoMatConfigs: {},
    orcamentoReviews: {},
    uf: 'SP',
    inccMensal: 0.005,
    mesReferenciaSINAPI: 'Janeiro/2026',
    orcamentosEngenheiro: {},
    plantas: PLANTAS_PADRAO,
  }
}

export function loadEngineerData(): EngineerData {
  if (typeof window === 'undefined') return defaultEngineerData()
  try {
    const raw = localStorage.getItem(ENGINEER_KEY)
    if (!raw) return defaultEngineerData()
    return { ...defaultEngineerData(), ...JSON.parse(raw) } as EngineerData
  } catch {
    return defaultEngineerData()
  }
}

export function saveEngineerData(data: EngineerData): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(ENGINEER_KEY, JSON.stringify(data))
}
