import { createCliente, createOrcamento } from './api'
import type { AppSession } from '@/types'

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
