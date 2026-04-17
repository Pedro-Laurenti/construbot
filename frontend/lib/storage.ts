import type { AppSession, UserRole, EngineerData } from '@/types'
import { GLOBAL_PARAMS, DEFAULT_GRUPOS_ENCARGOS, PLANTAS_PADRAO } from './mockData'

const STORAGE_KEY = 'construbot_v2'

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
}

export function clearStorage(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
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
