'use client'

import { useMemo, useState } from 'react'
import { appendAuditEvent, getModuleUiState, getStatusBadge, setModuleUiState } from '@/lib/engineerDashboard'
import { formatDate } from '@/lib/formatters'
import { PLANTAS_PADRAO } from '@/lib/mockData'
import { seedOrcamentoMock } from '@/lib/seedMock'
import type { AppSession, EngineerData, Orcamento, OrcamentoReviewStatus, OrcamentoStatus } from '@/types'
import { MdCheckCircle, MdCancel, MdPlayArrow, MdArrowForward, MdLockOpen } from 'react-icons/md'

interface Props {
  data: EngineerData
  onUpdate: (p: Partial<EngineerData>) => void
  orcamentos: Orcamento[]
  onUpdateSession: (updater: (prev: AppSession) => AppSession) => void
  onRefreshSession: () => void
  onEnterWizard: (orc: Orcamento) => void
}

export default function GestaoOrcamentos({ data, onUpdate, orcamentos, onUpdateSession, onRefreshSession, onEnterWizard }: Props) {
  const { orcamentoReviews } = data
  const ui = getModuleUiState(data, 'orcamentos')
  const [selected, setSelected] = useState<Orcamento | null>(null)
  const [reabrirSelecionado, setReabrirSelecionado] = useState<Orcamento | null>(null)
  const [motivoReabertura, setMotivoReabertura] = useState('')
  const [motivoErro, setMotivoErro] = useState('')
  const [obs, setObs] = useState('')
  const [fStatus, setFStatus] = useState(ui.filtros?.status ?? '')
  const [fEtapa, setFEtapa] = useState(ui.filtros?.etapa ?? '')
  const [fUf, setFUf] = useState(ui.filtros?.uf ?? '')
  const [fRisco, setFRisco] = useState(ui.filtros?.risco ?? '')

  function persistFiltros(status: string, etapa: string, uf: string, risco: string) {
    onUpdate({ moduleUIState: setModuleUiState(data, 'orcamentos', { filtros: { status, etapa, uf, risco } }) })
  }

  function getReview(id: string): OrcamentoReviewStatus {
    return orcamentoReviews[id] ?? { status: 'pendente', observacoes: '' }
  }

  function updateReview(orcId: string, status: OrcamentoReviewStatus['status']) {
    const updated = { ...orcamentoReviews, [orcId]: { status, observacoes: obs } }
    onUpdate({
      orcamentoReviews: updated,
      auditTrail: appendAuditEvent(data, {
        usuario: 'engenheiro_local',
        modulo: 'gestao-orcamentos',
        acao: `revisao_${status}`,
        motivo: obs || undefined,
        impacto: `orcamento:${orcId}`,
      }),
    })
    if (selected?.id === orcId) setSelected(null)
  }

  function reabrirOrcamento(orc: Orcamento) {
    if (!motivoReabertura.trim()) {
      setMotivoErro('Motivo obrigatório')
      return
    }
    onUpdateSession(prev => ({
      ...prev,
      orcamentos: prev.orcamentos.map(o =>
        o.id === orc.id ? { ...o, status: 'em_calculo' as const, motivoReabertura: motivoReabertura.trim() } : o
      ),
    }))
    const eng = data.orcamentosEngenheiro[orc.id]
    if (eng) {
      onUpdate({
        orcamentosEngenheiro: {
          ...data.orcamentosEngenheiro,
          [orc.id]: {
            ...eng,
            etapaAtual: eng.etapaAtual === 'ENTREGUE' ? 'E6' : eng.etapaAtual,
            logEtapasDetalhado: [
              ...(eng.logEtapasDetalhado ?? []),
              { etapa: 'E6', data: new Date().toISOString(), usuario: 'engenheiro_local', motivo: `reabertura:${motivoReabertura.trim()}` },
            ],
          },
        },
        auditTrail: appendAuditEvent(data, {
          usuario: 'engenheiro_local',
          modulo: 'gestao-orcamentos',
          acao: 'reabertura_orcamento',
          motivo: motivoReabertura.trim(),
          impacto: `orcamento:${orc.id}`,
        }),
      })
    }
    setMotivoReabertura('')
    setMotivoErro('')
    setReabrirSelecionado(null)
    onEnterWizard({ ...orc, status: 'em_calculo' })
  }

  const filtrados = useMemo(() => {
    return orcamentos.filter(orc => {
      const engOrc = data.orcamentosEngenheiro[orc.id]
      const etapa = engOrc?.etapaAtual ?? '-'
      const risco = engOrc?.statusValidacaoEtapa ? Object.values(engOrc.statusValidacaoEtapa).some(v => v?.status === 'erro') ? 'alto' : Object.values(engOrc.statusValidacaoEtapa).some(v => v?.status === 'aviso') ? 'medio' : 'baixo' : 'baixo'
      const okStatus = !fStatus || orc.status === fStatus
      const okEtapa = !fEtapa || etapa === fEtapa
      const okUf = !fUf || orc.uf === fUf
      const okRisco = !fRisco || risco === fRisco
      return okStatus && okEtapa && okUf && okRisco
    })
  }, [orcamentos, data.orcamentosEngenheiro, fStatus, fEtapa, fUf, fRisco])

  return (
    <div className="flex flex-col gap-4 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Orçamentos</h1>
          <p className="text-base-content/50 text-sm">{orcamentos.length} orçamento(s) de clientes</p>
        </div>
        <button onClick={() => { seedOrcamentoMock(); onRefreshSession(); onUpdate({ moduleUIState: { ...data.moduleUIState } }) }} className="btn btn-outline btn-sm">Mockar orçamento</button>
      </div>

      <div className="card bg-base-100 shadow">
        <div className="card-body p-3 grid grid-cols-2 md:grid-cols-4 gap-3">
          <fieldset className="fieldset">
            <legend className="fieldset-legend text-xs">Status</legend>
            <select value={fStatus} onChange={e => { const v = e.target.value; setFStatus(v); persistFiltros(v, fEtapa, fUf, fRisco) }} className="select select-sm">
              <option value="">Todos</option>
              <option value="aguardando_engenheiro">Aguardando</option>
              <option value="em_calculo">Em cálculo</option>
              <option value="entregue">Entregue</option>
            </select>
          </fieldset>
          <fieldset className="fieldset">
            <legend className="fieldset-legend text-xs">Etapa</legend>
            <select value={fEtapa} onChange={e => { const v = e.target.value; setFEtapa(v); persistFiltros(fStatus, v, fUf, fRisco) }} className="select select-sm">
              <option value="">Todas</option>
              <option value="E2">E2</option><option value="E3">E3</option><option value="E4">E4</option><option value="E5">E5</option><option value="E6">E6</option><option value="ENTREGUE">Entregue</option>
            </select>
          </fieldset>
          <fieldset className="fieldset">
            <legend className="fieldset-legend text-xs">UF</legend>
            <input value={fUf} onChange={e => { const v = e.target.value.toUpperCase(); setFUf(v); persistFiltros(fStatus, fEtapa, v, fRisco) }} className="input input-sm" placeholder="SP" />
          </fieldset>
          <fieldset className="fieldset">
            <legend className="fieldset-legend text-xs">Risco</legend>
            <select value={fRisco} onChange={e => { const v = e.target.value; setFRisco(v); persistFiltros(fStatus, fEtapa, fUf, v) }} className="select select-sm">
              <option value="">Todos</option>
              <option value="alto">Alto</option>
              <option value="medio">Médio</option>
              <option value="baixo">Baixo</option>
            </select>
          </fieldset>
        </div>
      </div>

      <div className="card bg-base-100 shadow overflow-x-auto">
        <table className="table table-sm">
          <thead>
            <tr><th>ID</th><th>Data</th><th>UF</th><th>Planta</th><th>Status</th><th>Etapa</th><th>Progresso</th><th>Ações</th></tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-base-content/40 py-8">
                  <p>Nenhum orçamento encontrado para os filtros aplicados.</p>
                  <p className="text-xs mt-1">Ajuste filtros ou clique em Mockar orçamento para gerar um exemplo.</p>
                </td>
              </tr>
            )}
            {orcamentos.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-base-content/40 py-8">
                  <p>Sem orçamentos cadastrados.</p>
                  <p className="text-xs mt-1">Use o botão Mockar orçamento para iniciar o fluxo.</p>
                </td>
              </tr>
            )}
            {filtrados.map(orc => {
              const engOrc = data.orcamentosEngenheiro[orc.id]
              const badge = getStatusBadge(orc.status, engOrc?.etapaAtual)
              const etapa: string = engOrc?.etapaAtual ?? '-'
              const progressoEtapas = `${engOrc?.etapasConcluidas?.filter(e => ['E1', 'E2', 'E3', 'E4', 'E5', 'E6'].includes(e)).length ?? 0}/6`
              const planta = PLANTAS_PADRAO.find(p => p.id === orc.parametros?.plantaId)
              return (
                <tr key={orc.id} className="hover">
                  <td className="font-mono text-xs">{orc.id.slice(0, 14)}…</td>
                  <td className="text-xs">{formatDate(orc.dataCriacao)}</td>
                  <td className="text-xs font-mono">{orc.uf}</td>
                  <td className="text-xs">{planta?.nome ?? '-'}</td>
                  <td>
                    <span className={`badge badge-xs ${badge.className}`}>
                      {orc.status === 'em_calculo' && engOrc?.etapaAtual ? `Em análise · ${etapa}` : badge.label}
                    </span>
                  </td>
                  <td className="text-xs font-mono">{etapa}</td>
                  <td className="text-xs font-mono">{progressoEtapas}</td>
                  <td>
                    <div className="flex gap-1 items-center flex-wrap">
                      {(orc.status === 'aguardando_engenheiro' || orc.status === 'em_calculo') && (
                        <button onClick={() => onEnterWizard(orc)} className="btn btn-primary btn-xs gap-1">
                          {orc.status === 'aguardando_engenheiro' ? <><MdPlayArrow size={14} /> Iniciar</> : <><MdArrowForward size={14} /> Continuar</>}
                        </button>
                      )}
                      {orc.status === 'entregue' && (
                        <button onClick={() => setReabrirSelecionado(orc)} className="btn btn-ghost btn-xs text-warning gap-1">
                          <MdLockOpen size={14} /> Reabrir
                        </button>
                      )}
                      <button onClick={() => { setSelected(orc); setObs(getReview(orc.id).observacoes) }} className="btn btn-ghost btn-xs text-success gap-1">
                        <MdCheckCircle size={14} /> Revisar
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="card bg-base-100 shadow">
          <div className="card-body p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold">Revisão — {selected.id.slice(0, 16)}…</p>
              <button onClick={() => setSelected(null)} className="btn btn-ghost btn-xs">Fechar</button>
            </div>
            <fieldset className="fieldset mb-3">
              <legend className="fieldset-legend text-xs">Observações do Engenheiro</legend>
              <textarea value={obs} onChange={e => setObs(e.target.value)} className="textarea w-full" rows={3} placeholder="Adicione observações..." />
            </fieldset>
            <div className="flex gap-2 justify-end">
              <button onClick={() => updateReview(selected.id, 'rejeitado')} className="btn btn-error btn-sm gap-1"><MdCancel size={16} /> Rejeitar</button>
              <button onClick={() => updateReview(selected.id, 'aprovado')} className="btn btn-success btn-sm gap-1"><MdCheckCircle size={16} /> Aprovar</button>
            </div>
          </div>
        </div>
      )}

      {reabrirSelecionado && (
        <div className="card bg-base-100 shadow">
          <div className="card-body p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold">Reabrir orçamento — {reabrirSelecionado.id.slice(0, 16)}…</p>
              <button onClick={() => setReabrirSelecionado(null)} className="btn btn-ghost btn-xs">Fechar</button>
            </div>
            <fieldset className="fieldset mb-3">
              <legend className="fieldset-legend text-xs">Motivo da reabertura</legend>
              <textarea value={motivoReabertura} onChange={e => { setMotivoReabertura(e.target.value); if (motivoErro) setMotivoErro('') }} className="textarea w-full" rows={3} placeholder="Explique por que o orçamento está sendo reaberto" />
              {motivoErro && <p className="text-xs text-error mt-1">{motivoErro}</p>}
            </fieldset>
            <div className="flex justify-end">
              <button onClick={() => reabrirOrcamento(reabrirSelecionado)} className="btn btn-warning btn-sm" disabled={!motivoReabertura.trim()}>
                Confirmar reabertura
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

