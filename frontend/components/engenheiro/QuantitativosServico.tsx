'use client'

import { useState, useEffect } from 'react'
import { PLANTAS_PADRAO, SERVICE_LABELS, SERVICE_SPECS, SERVICE_SPEC_LABELS, SERVICE_HELP, resolverSINAPI } from '@/lib/mockData'
import { gerarQuantitativosFromParametros } from '@/lib/calculos'
import { MdAdd, MdDelete, MdInfo } from 'react-icons/md'
import type { EngineerData, Orcamento, QuantitativoServico, ContratoModalidade, ServiceType } from '@/types'

interface Props {
  data: EngineerData
  onUpdate: (p: Partial<EngineerData>) => void
  orcamentos: Orcamento[]
  orcamentoId?: string
  onChangeQuantitativos?: (quantitativos: QuantitativoServico[]) => void
}

const GRUPOS_SECAO: { label: string; tipos: ServiceType[] }[] = [
  { label: 'Fundação e Estrutura',    tipos: ['FUNDACAO', 'ESTRUTURA_CONCRETO'] },
  { label: 'Alvenaria e Reforço',     tipos: ['ALVENARIA', 'GRAUTE', 'ARMACAO_VERTICAL_HORIZONTAL'] },
  { label: 'Pisos',                   tipos: ['CONTRAPISO', 'REVESTIMENTO_CERAMICO'] },
  { label: 'Revestimentos',           tipos: ['REVESTIMENTO_ARGAMASSA_PAREDE', 'REVESTIMENTO_ARGAMASSA_TETO'] },
  { label: 'Pintura e Limpeza',       tipos: ['PINTURA_INTERNA', 'PINTURA_EXTERNA', 'LIMPEZA_INTERNA'] },
]

const ORIGEM_BADGE: Record<string, string> = {
  PLANTA_BASE: 'badge-info',
  OPCIONAL: 'badge-warning',
  PERSONALIZACAO: 'badge-ghost',
}

const ORIGEM_LABEL: Record<string, string> = {
  PLANTA_BASE: 'Planta base',
  OPCIONAL: 'Opcional',
  PERSONALIZACAO: 'Personalização',
}

export default function QuantitativosServico({ data, onUpdate, orcamentos, orcamentoId, onChangeQuantitativos }: Props) {
  const orc = orcamentos.find(o => o.id === orcamentoId) ?? null
  const engExistente = orcamentoId ? data.orcamentosEngenheiro[orcamentoId] : null

  const [showInfo, setShowInfo] = useState(false)
  const [qtRows, setQtRows] = useState<QuantitativoServico[]>(() => {
    if (engExistente?.quantitativos?.length) return engExistente.quantitativos
    if (orc?.parametros) {
      const planta = PLANTAS_PADRAO.find(p => p.id === orc.parametros!.plantaId)
      if (planta) return gerarQuantitativosFromParametros(planta, orc.parametros!.opcionais)
    }
    return []
  })

  useEffect(() => {
    if (!orcamentoId || qtRows.length > 0) return
    if (orc?.parametros) {
      const planta = PLANTAS_PADRAO.find(p => p.id === orc.parametros!.plantaId)
      if (planta) setQtRows(gerarQuantitativosFromParametros(planta, orc.parametros!.opcionais))
    }
  }, [orcamentoId])

  useEffect(() => {
    onChangeQuantitativos?.(qtRows)
  }, [qtRows, onChangeQuantitativos])

  useEffect(() => {
    if (!orcamentoId || !engExistente) return
    if (engExistente.quantitativos === qtRows) return
    onUpdate({
      orcamentosEngenheiro: {
        ...data.orcamentosEngenheiro,
        [orcamentoId]: {
          ...engExistente,
          quantitativos: qtRows,
        },
      },
    })
  }, [data.orcamentosEngenheiro, engExistente, onUpdate, orcamentoId, qtRows])

  function updateRow(idx: number, patch: Partial<QuantitativoServico>) {
    setQtRows(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r))
  }

  function updateEsp(idx: number, field: 'especificacao1' | 'especificacao2' | 'especificacao3', value: string) {
    setQtRows(prev => prev.map((r, i) => {
      if (i !== idx) return r
      const next = { ...r, [field]: value }
      const mapeado = resolverSINAPI(
        r.serviceType,
        field === 'especificacao1' ? value : r.especificacao1,
        field === 'especificacao2' ? value : r.especificacao2,
        field === 'especificacao3' ? value : r.especificacao3,
      )
      const podeSobrescrever = r.origem === 'PLANTA_BASE' && !r.composicaoManual
      if (mapeado && podeSobrescrever) {
        next.composicaoBasica = mapeado.composicaoBasica
        next.composicaoProfissionalId = mapeado.cpIds[0] ?? r.composicaoProfissionalId
        next.prazoRequerido = mapeado.prazoRequeridoPadrao
      } else if (!mapeado && podeSobrescrever) {
        next.composicaoBasica = ''
        next.composicaoProfissionalId = 0
      }
      return next
    }))
  }

  function addServico() {
    const novo: QuantitativoServico = {
      id: `manual-${Date.now()}`,
      serviceType: 'ALVENARIA',
      descricao: 'Serviço Manual',
      unidade: 'M²',
      quantidade: 0,
      especificacao1: '',
      especificacao2: '',
      especificacao3: '',
      composicaoBasica: '',
      composicaoManual: true,
      composicaoProfissionalId: 0,
      modalidade: 'MEI',
      modalidadeAjudante: 'CLT',
      adicionalProdutividade: 1.3,
      origem: 'PERSONALIZACAO',
      prazoRequerido: 1,
    }
    setQtRows(prev => [...prev, novo])
  }

  function removeRow(idx: number) {
    setQtRows(prev => prev.filter((_, i) => i !== idx))
  }

  const planta = orc?.parametros ? PLANTAS_PADRAO.find(p => p.id === orc.parametros!.plantaId) : null
  const pendentes = qtRows.filter(q => !q.composicaoBasica)
  const confirmados = qtRows.length - pendentes.length
  const todosServicosIds = GRUPOS_SECAO.flatMap(g => g.tipos)

  return (
    <div className="flex flex-col gap-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-1">E2 — Serviços da Obra <button onClick={() => setShowInfo(true)} className="btn btn-ghost btn-xs btn-circle"><MdInfo size={16} /></button></h2>
        <div className="flex items-center gap-2">
          {pendentes.length > 0 && (
            <span className="text-xs text-warning font-medium">{pendentes.length} serviço(s) sem composição</span>
          )}
          <button onClick={addServico} className="btn btn-ghost btn-sm gap-1"><MdAdd size={16} /> Serviço manual</button>
        </div>
      </div>

      <div>
        <p className="text-xs text-base-content/50">{confirmados} de {qtRows.length} serviços com composição definida</p>
        <progress className="progress progress-primary w-full" value={confirmados} max={qtRows.length || 1} />
      </div>

      {GRUPOS_SECAO.map(grupo => {
        const rows = qtRows.map((r, i) => ({ r, i })).filter(({ r }) => grupo.tipos.includes(r.serviceType))
        if (rows.length === 0) return null
        return (
          <div key={grupo.label}>
            <p className="text-xs font-semibold text-base-content/50 uppercase tracking-wide mt-2 mb-2">{grupo.label}</p>
            <div className="flex flex-col gap-3">
              {rows.map(({ r: row, i: idx }) => {
                const specs = SERVICE_SPECS[row.serviceType]
                const labels = SERVICE_SPEC_LABELS[row.serviceType]
                const ajuda = SERVICE_HELP[row.serviceType]
                const mapeado = !!(row.composicaoBasica && row.composicaoProfissionalId)
                return (
                  <div key={row.id} className="card bg-base-100 shadow p-3">
                    <div className="flex items-center flex-wrap gap-3">
                      <span className="font-semibold text-sm">{SERVICE_LABELS[row.serviceType]}</span>
                      <span className={`badge badge-xs ${ORIGEM_BADGE[row.origem]}`}>{ORIGEM_LABEL[row.origem]}</span>
                      <div className="flex items-center gap-1">
                        <input type="number" className="input input-xs w-20 font-mono" value={row.quantidade}
                          onChange={e => updateRow(idx, { quantidade: parseFloat(e.target.value) || 0 })} />
                        <span className="text-xs text-base-content/50">{row.unidade}</span>
                      </div>
                      {specs?.esp1 && specs.esp1.length > 0 && (
                        <select className="select select-xs" value={row.especificacao1}
                          onChange={e => updateEsp(idx, 'especificacao1', e.target.value)}>
                          <option value="">{labels?.esp1 ?? 'Esp. 1'}…</option>
                          {specs.esp1.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      )}
                      {specs?.esp2 && specs.esp2.length > 0 && (
                        <select className="select select-xs" value={row.especificacao2}
                          onChange={e => updateEsp(idx, 'especificacao2', e.target.value)}>
                          <option value="">{labels?.esp2 ?? 'Esp. 2'}…</option>
                          {specs.esp2.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      )}
                      {mapeado ? (
                        <>
                          <span className="badge badge-info badge-xs font-mono">{row.composicaoBasica}</span>
                          <span className="badge badge-ghost badge-xs">auto</span>
                        </>
                      ) : (
                        <span className="badge badge-warning badge-xs">pendente</span>
                      )}
                      <button onClick={() => removeRow(idx)} className="btn btn-ghost btn-xs text-error ml-auto">
                        <MdDelete size={14} />
                      </button>
                    </div>
                    <details className="collapse collapse-arrow bg-base-200 rounded mt-2">
                      <summary className="collapse-title text-xs py-1 px-3 min-h-0">Detalhes</summary>
                      <div className="collapse-content pt-2">
                        {ajuda && <p className="text-xs text-base-content/50 mb-2">{ajuda}</p>}
                        <div className="flex flex-wrap gap-3">
                          <fieldset className="fieldset">
                            <legend className="fieldset-legend">Modalidade</legend>
                            <select className="select select-xs" value={row.modalidade}
                              onChange={e => updateRow(idx, { modalidade: e.target.value as ContratoModalidade })}>
                              <option value="MEI">MEI</option>
                              <option value="CLT">CLT</option>
                            </select>
                          </fieldset>
                          {specs?.esp3 && specs.esp3.length > 0 && (
                            <fieldset className="fieldset">
                              <legend className="fieldset-legend">{labels?.esp3 ?? 'Especificação 3'}</legend>
                              <select className="select select-xs" value={row.especificacao3}
                                onChange={e => updateEsp(idx, 'especificacao3', e.target.value)}>
                                <option value="">Selecione...</option>
                                {specs.esp3.map(o => <option key={o} value={o}>{o}</option>)}
                              </select>
                            </fieldset>
                          )}
                          <fieldset className="fieldset">
                            <legend className="fieldset-legend">Prazo (dias)</legend>
                            <input type="number" className="input input-xs w-20" value={row.prazoRequerido ?? 0}
                              onChange={e => updateRow(idx, { prazoRequerido: parseInt(e.target.value) || 0 })} />
                          </fieldset>
                          {!mapeado && (
                            <fieldset className="fieldset">
                              <legend className="fieldset-legend">Composição SINAPI</legend>
                              <input type="text" className="input input-xs w-28 font-mono border-warning"
                                placeholder="ex: 87557" value={row.composicaoBasica}
                                onChange={e => updateRow(idx, { composicaoBasica: e.target.value, composicaoManual: true })} />
                            </fieldset>
                          )}
                        </div>
                      </div>
                    </details>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {qtRows.filter(r => !todosServicosIds.includes(r.serviceType)).map((row) => {
        const realIdx = qtRows.indexOf(row)
        return (
          <div key={row.id} className="card bg-base-100 shadow p-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm">{SERVICE_LABELS[row.serviceType] ?? row.serviceType}</span>
              <button onClick={() => removeRow(realIdx)} className="btn btn-ghost btn-xs text-error gap-1">
                <MdDelete size={14} /> Remover
              </button>
            </div>
          </div>
        )
      })}

      {qtRows.length === 0 && (
        <div className="card bg-base-100 shadow">
          <div className="card-body items-center py-12">
            <p className="text-base-content/40 text-sm">Nenhum serviço. Selecione um orçamento com parâmetros ou adicione manualmente.</p>
          </div>
        </div>
      )}
      {showInfo && (
        <div className="modal modal-open">
          <div className="modal-box max-w-sm">
            <h3 className="font-bold mb-2">E2 — Serviços da Obra</h3>
            <p className="text-sm text-base-content/70">
              {planta
                ? <>A planta <strong>{planta.nome}</strong> gerou <strong>{qtRows.length}</strong> serviços. Confirme as quantidades, selecione as especificações de cada serviço e o código SINAPI será identificado automaticamente. Todos os serviços precisam estar configurados para avançar.</>
                : 'Orçamento sem parâmetros de cliente. Adicione serviços manualmente.'}
            </p>
            <div className="modal-action"><button onClick={() => setShowInfo(false)} className="btn btn-sm btn-ghost">Fechar</button></div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowInfo(false)} />
        </div>
      )}
    </div>
  )
}
