import type { UserRole } from '@/types'

const ROLE_KEY = 'construbot_role'

export function loadRole(): UserRole {
  if (typeof window === 'undefined') return 'cliente'
  return (localStorage.getItem(ROLE_KEY) as UserRole) ?? 'cliente'
}

export function saveRole(role: UserRole): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(ROLE_KEY, role)
}
