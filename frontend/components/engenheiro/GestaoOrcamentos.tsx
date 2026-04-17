'use client'

import { useState } from 'react'
import { saveStorage, loadStorage } from '@/lib/storage'
import { formatDate } from '@/lib/formatters'
import { PLANTAS_PADRAO } from '@/lib/mockData'
import type { EngineerData, Orcamento, OrcamentoReviewStatus, OrcamentoStatus } from '@/types'
import { MdCheckCircle, MdCancel, MdOpenInNew, MdPlayArrow, MdArrowForward } from 'react-icons/md'

interface Props { data: EngineerData; onUpdate: (p: Partial<EngineerData>) => void; orcamentos: Orcamento[] }

export default function GestaoOrcamentos({ data, onUpdate, orcamentos }: Props) {
  const { orcamentoReviews } = data
  const [selected, setSelected] = useState<Orcamento | null>(null)
  const [obs, setObs] = useState('')

  function getReview(id: string): OrcamentoReviewStatus {
    return orcamentoReviews[id] ?? { status: 'pendente', observacoes: '' }
  }

  function updateReview(orcId: string, status: OrcamentoReviewStatus['status']) {
    const updated = { ...orcamentoReviews, [orcId]: { status, observacoes: obs } }
    onUpdate({ orcamentoReviews: updated })
    if (selected?.id === orcId) setSelected(null)
  }

  const ORC_STATUS_BADGE: Record<OrcamentoStatus, { className: string; label: string }> = {
    aguardando_engenheiro: { className: 'badge-warning', label: 'Aguardando' },
    em_calculo: { className: 'badge-info', label: 'Em análise' },
    calculado: { className: 'badge-success', label: 'Calculado' },
    entregue: { className: 'badge-accent', label: 'Entregue' },
    rascunho: { className: 'badge-ghost', label: 'Rascunho' },
    enviado: { className: 'badge-info', label: 'Enviado' },
  }

  return (
    <div className="flex flex-col gap-4 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Orçamentos — Gestão</h1>
        <p className="text-base-content/50 text-sm">{orcamentos.length} orçamento(s) de clientes</p>
      </div>

      <div className="card bg-base-100 shadow overflow-x-auto">
        <table className="table table-sm">
          <thead>
            <tr><th>ID</th><th>Data</th><th>UF</th><th>Serviços</th><th>Status</th><th>Etapa</th><th>Ações</th></tr>
          </thead>
          <tbody>
            {orcamentos.length === 0 && (
              <tr><td colSpan={7} className="text-center text-base-content/40 py-8">Nenhum orçamento de clientes encontrado.</td></tr>
            )}
            {orcamentos.map(orc => {
              const badge = ORC_STATUS_BADGE[orc.status]
              const etapa = data.orcamentosEngenheiro[orc.id]?.etapaAtual ?? '-'
              return (
                <tr key={orc.id} className="hover">
                  <td className="font-mono text-xs">{orc.id.slice(0, 14)}...</td>
                  <td className="text-xs">{formatDate(orc.dataCriacao)}</td>
                  <td className="text-xs">{orc.uf}</td>
                  <td className="text-xs">{orc.itens.length}</td>
                  <td><span className={`badge badge-xs ${badge.className}`}>{badge.label}</span></td>
                  <td className="text-xs font-mono">{etapa}</td>
                  <td>
                    <div className="flex gap-1">
                      {orc.status === 'aguardando_engenheiro' && (
                        <button className="btn btn-ghost btn-xs text-info" title="Iniciar"><MdPlayArrow size={14} /></button>
                      )}
                      {orc.status === 'em_calculo' && (
                        <button className="btn btn-ghost btn-xs text-info" title="Continuar"><MdArrowForward size={14} /></button>
                      )}
                      {orc.status === 'entregue' && (
                        <button onClick={() => { setSelected(orc); setObs(getReview(orc.id).observacoes) }} className="btn btn-ghost btn-xs" title="Ver"><MdOpenInNew size={14} /></button>
                      )}
                      <button onClick={() => { setObs(getReview(orc.id).observacoes); updateReview(orc.id, 'aprovado') }} className="btn btn-ghost btn-xs text-success" title="Aprovar"><MdCheckCircle size={14} /></button>
                      <button onClick={() => { setObs(getReview(orc.id).observacoes); updateReview(orc.id, 'rejeitado') }} className="btn btn-ghost btn-xs text-error" title="Rejeitar"><MdCancel size={14} /></button>
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
              <p className="font-semibold">Detalhes — {selected.id}</p>
              <button onClick={() => setSelected(null)} className="btn btn-ghost btn-xs">Fechar</button>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
              <div><p className="text-xs text-base-content/50">UF</p><p className="font-semibold">{selected.uf}</p></div>
              <div><p className="text-xs text-base-content/50">Data</p><p className="font-semibold">{formatDate(selected.dataCriacao)}</p></div>
              <div><p className="text-xs text-base-content/50">Status</p><p className="font-semibold">{ORC_STATUS_BADGE[selected.status].label}</p></div>
            </div>
            {selected.parametros && (
              <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
                <div>
                  <p className="text-xs text-base-content/50">Planta</p>
                  <p className="font-semibold">{PLANTAS_PADRAO.find(p => p.id === selected.parametros!.plantaId)?.nome ?? selected.parametros.plantaId}</p>
                </div>
                <div>
                  <p className="text-xs text-base-content/50">Quartos</p>
                  <p className="font-semibold">{selected.parametros.quartos}</p>
                </div>
                <div>
                  <p className="text-xs text-base-content/50">Terreno</p>
                  <p className="font-semibold">{selected.parametros.terreno.municipio} — {selected.parametros.terreno.areaTotalM2} m2</p>
                </div>
                <div>
                  <p className="text-xs text-base-content/50">Opcionais</p>
                  <p className="font-semibold">{selected.parametros.opcionais.filter(o => o.selecionado).length}</p>
                </div>
                <div>
                  <p className="text-xs text-base-content/50">Personalizações</p>
                  <p className="font-semibold">{selected.parametros.personalizacoes.length}</p>
                </div>
              </div>
            )}
            <table className="table table-xs mb-4">
              <thead><tr><th>Serviço</th><th>Sub-tipo</th><th className="text-right">Qtd.</th><th>UN</th><th>Modalidade</th></tr></thead>
              <tbody>
                {selected.itens.map(item => (
                  <tr key={item.id}><td className="text-xs">{item.serviceType.replace(/_/g, ' ')}</td><td className="text-xs">{item.subTipo}</td><td className="text-right font-mono text-xs">{item.quantidade}</td><td className="text-xs">{item.unidade}</td><td><span className={`badge badge-xs ${item.modalidade === 'MEI' ? 'badge-info' : 'badge-warning'}`}>{item.modalidade}</span></td></tr>
                ))}
              </tbody>
            </table>
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
    </div>
  )
}
