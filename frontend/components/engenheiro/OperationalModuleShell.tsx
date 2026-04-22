'use client'

import type { ReactNode } from 'react'
import type { EngineerData, Orcamento } from '@/types'
import { MODULE_META, getContextoAtivo, getModuleUiState, getModuleValidation, type EngineerModuleId } from '@/lib/engineerDashboard'

interface Props {
  moduleId: EngineerModuleId
  data: EngineerData
  orcamentos: Orcamento[]
  onToggleFoco?: (enabled: boolean) => void
  children: ReactNode
}

export default function OperationalModuleShell({ moduleId, data, orcamentos, onToggleFoco, children }: Props) {
  const meta = MODULE_META[moduleId]
  const contexto = getContextoAtivo(data, orcamentos)
  const validacao = getModuleValidation(moduleId, data, orcamentos)
  const ui = getModuleUiState(data, moduleId)

  return (
    <div className="flex flex-col gap-4">
      <div className="card bg-base-100 shadow">
        <div className="card-body p-4 gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-base-content/50">Módulo operacional</p>
              <h2 className="text-xl font-bold">{meta.nome}</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className={`badge ${validacao.status === 'ok' ? 'badge-success' : validacao.status === 'alerta' ? 'badge-warning' : 'badge-error'}`}>
                {validacao.status === 'ok' ? 'Operacional' : validacao.status === 'alerta' ? 'Atenção' : 'Crítico'}
              </span>
              <span className="badge badge-ghost">Prontidão {validacao.scoreProntidao}%</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-2 text-xs">
            <div className="bg-base-200 rounded p-2">
              <p className="text-base-content/50">Orçamento ativo</p>
              <p className="font-mono">{contexto.orcamentoId ? contexto.orcamentoId.slice(0, 16) : 'Sem orçamento ativo'}</p>
            </div>
            <div className="bg-base-200 rounded p-2">
              <p className="text-base-content/50">UF e referência</p>
              <p className="font-mono">{contexto.uf} · {contexto.referencia}</p>
            </div>
            <div className="bg-base-200 rounded p-2">
              <p className="text-base-content/50">Status operacional</p>
              <p className="font-semibold">{contexto.status ?? 'Laboratório técnico'}</p>
            </div>
            <div className="bg-base-200 rounded p-2">
              <p className="text-base-content/50">Próxima ação</p>
              <p className="font-semibold">{validacao.proximaAcao}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-start gap-3 text-xs">
            <div className="flex-1 min-w-[220px] bg-base-200 rounded p-2">
              <p className="font-semibold mb-1">Decisões desta tela</p>
              {validacao.decisoes.map(item => <p key={item} className="text-base-content/70">{item}</p>)}
            </div>
            <div className="flex-1 min-w-[220px] bg-base-200 rounded p-2">
              <p className="font-semibold mb-1">Riscos detectados</p>
              {validacao.riscos.map(item => <p key={item.texto} className={item.nivel === 'erro' ? 'text-error' : item.nivel === 'alerta' ? 'text-warning' : 'text-info'}>{item.texto}</p>)}
            </div>
            <div className="flex-1 min-w-[220px] bg-base-200 rounded p-2">
              <div className="flex items-center justify-between mb-1">
                <p className="font-semibold">Pendências</p>
                <button
                  onClick={() => onToggleFoco?.(ui.densidade !== 'foco')}
                  className="btn btn-ghost btn-xs"
                >
                  {ui.densidade === 'foco' ? 'Modo padrão' : 'Modo foco'}
                </button>
              </div>
              {validacao.pendencias.length === 0 && <p className="text-base-content/70">Sem pendências bloqueantes.</p>}
              {validacao.pendencias.map(item => <p key={item} className="text-base-content/70">{item}</p>)}
            </div>
          </div>
        </div>
      </div>
      {children}
    </div>
  )
}
