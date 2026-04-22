'use client'

import { useState } from 'react'
import { saveStorage, loadStorage } from '@/lib/storage'
import { formatDate } from '@/lib/formatters'
import { PLANTAS_PADRAO } from '@/lib/mockData'
import type { EngineerData, Orcamento, OrcamentoReviewStatus, OrcamentoStatus } from '@/types'
import { MdCheckCircle, MdCancel, MdPlayArrow, MdArrowForward, MdLockOpen } from 'react-icons/md'

interface Props {
  data: EngineerData
  onUpdate: (p: Partial<EngineerData>) => void
  orcamentos: Orcamento[]
  onEnterWizard: (orc: Orcamento) => void
}

export default function GestaoOrcamentos({ data, onUpdate, orcamentos, onEnterWizard }: Props) {
  const { orcamentoReviews } = data
  const [selected, setSelected] = useState<Orcamento | null>(null)
  const [reabrirSelecionado, setReabrirSelecionado] = useState<Orcamento | null>(null)
  const [motivoReabertura, setMotivoReabertura] = useState('')
  const [obs, setObs] = useState('')

  function getReview(id: string): OrcamentoReviewStatus {
    return orcamentoReviews[id] ?? { status: 'pendente', observacoes: '' }
  }

  function updateReview(orcId: string, status: OrcamentoReviewStatus['status']) {
    const updated = { ...orcamentoReviews, [orcId]: { status, observacoes: obs } }
    onUpdate({ orcamentoReviews: updated })
    if (selected?.id === orcId) setSelected(null)
  }

  function reabrirOrcamento(orc: Orcamento) {
    if (!motivoReabertura.trim()) return
    const session = loadStorage()
    const orcs = session.orcamentos.map(o =>
      o.id === orc.id ? { ...o, status: 'em_calculo' as const, motivoReabertura: motivoReabertura.trim() } : o
    )
    saveStorage({ ...session, orcamentos: orcs })
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
      })
    }
    setMotivoReabertura('')
    setReabrirSelecionado(null)
    onEnterWizard({ ...orc, status: 'em_calculo' })
  }

  const ORC_STATUS_BADGE: Record<OrcamentoStatus, { className: string; label: string }> = {
    aguardando_engenheiro: { className: 'badge-warning', label: 'Aguardando' },
    em_calculo: { className: 'badge-info', label: 'Em cálculo' },
    entregue: { className: 'badge-success', label: 'Entregue' },
    calculado: { className: 'badge-ghost', label: 'Fora do fluxo' },
    rascunho: { className: 'badge-ghost', label: 'Fora do fluxo' },
    enviado: { className: 'badge-ghost', label: 'Fora do fluxo' },
  }

  return (
    <div className="flex flex-col gap-4 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Orçamentos</h1>
        <p className="text-base-content/50 text-sm">{orcamentos.length} orçamento(s) de clientes</p>
      </div>

      <div className="card bg-base-100 shadow overflow-x-auto">
        <table className="table table-sm">
          <thead>
            <tr><th>ID</th><th>Data</th><th>UF</th><th>Planta</th><th>Status</th><th>Etapa</th><th>Ações</th></tr>
          </thead>
          <tbody>
            {orcamentos.length === 0 && (
              <tr><td colSpan={7} className="text-center text-base-content/40 py-8">Nenhum orçamento encontrado.</td></tr>
            )}
            {orcamentos.map(orc => {
              const badge = ORC_STATUS_BADGE[orc.status]
              const engOrc = data.orcamentosEngenheiro[orc.id]
              const etapa: string = engOrc?.etapaAtual ?? '-'
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
                  <td>
                    <div className="flex gap-1 items-center flex-wrap">
                      {(orc.status === 'aguardando_engenheiro' || orc.status === 'em_calculo') && (
                        <button
                          onClick={() => onEnterWizard(orc)}
                          className="btn btn-primary btn-xs gap-1"
                        >
                          {orc.status === 'aguardando_engenheiro' ? <><MdPlayArrow size={14} /> Iniciar</> : <><MdArrowForward size={14} /> Continuar</>}
                        </button>
                      )}
                      {orc.status === 'entregue' && (
                        <button
                          onClick={() => setReabrirSelecionado(orc)}
                          className="btn btn-ghost btn-xs text-warning gap-1"
                        >
                          <MdLockOpen size={14} /> Reabrir
                        </button>
                      )}
                      <button
                        onClick={() => { setSelected(orc); setObs(getReview(orc.id).observacoes) }}
                        className="btn btn-ghost btn-xs text-success gap-1"
                        title="Aprovar / Rejeitar"
                      >
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
              <textarea value={motivoReabertura} onChange={e => setMotivoReabertura(e.target.value)} className="textarea w-full" rows={3} placeholder="Explique por que o orçamento está sendo reaberto" />
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
