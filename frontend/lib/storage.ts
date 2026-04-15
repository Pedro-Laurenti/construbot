import type { AppSession } from '@/types'

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
