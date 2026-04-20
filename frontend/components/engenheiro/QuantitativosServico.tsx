'use client'

import { useState, useEffect } from 'react'
import { loadStorage, saveStorage } from '@/lib/storage'
import { PLANTAS_PADRAO, COMPOSICOES_PROFISSIONAIS } from '@/lib/mockData'
import { gerarQuantitativosFromParametros } from '@/lib/calculos'
import { SERVICE_LABELS } from '@/lib/mockData'
import { MdAdd, MdCheck } from 'react-icons/md'
import type { EngineerData, Orcamento, QuantitativoServico, ContratoModalidade, OrcamentoEngenheiro } from '@/types'

interface Props {
  data: EngineerData
  onUpdate: (p: Partial<EngineerData>) => void
  orcamentos: Orcamento[]
  orcamentoId?: string
}

export default function QuantitativosServico({ data, onUpdate, orcamentos, orcamentoId }: Props) {
  const orc = orcamentos.find(o => o.id === orcamentoId) ?? null
  const engExistente = orcamentoId ? data.orcamentosEngenheiro[orcamentoId] : null

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

  function updateRow(idx: number, patch: Partial<QuantitativoServico>) {
    setQtRows(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r))
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
      composicaoProfissionalId: 0,
      modalidade: 'MEI',
      origem: 'PERSONALIZACAO',
    }
    setQtRows(prev => [...prev, novo])
  }

  function confirmar() {
    if (!orcamentoId) return
    const atual: OrcamentoEngenheiro = data.orcamentosEngenheiro[orcamentoId] ?? {
      orcamentoClienteId: orcamentoId,
      etapaAtual: 'E2',
      etapasConcluidas: [],
      quantitativos: [],
      consultasSINAPI: {},
      calculosMO: {},
      calculosMat: {},
    }
    const eng = { ...data.orcamentosEngenheiro, [orcamentoId]: { ...atual, quantitativos: qtRows } }
    onUpdate({ orcamentosEngenheiro: eng })
    if (orc?.status === 'aguardando_engenheiro') {
      const session = loadStorage()
      const orcs = session.orcamentos.map(o =>
        o.id === orcamentoId ? { ...o, status: 'em_calculo' as const } : o
      )
      saveStorage({ ...session, orcamentos: orcs })
    }
  }

  const planta = orc?.parametros ? PLANTAS_PADRAO.find(p => p.id === orc.parametros!.plantaId) : null
  const pendentes = qtRows.filter(q => !q.composicaoBasica || !q.composicaoProfissionalId).map(q => q.descricao)
  const origemLabel = { PLANTA_BASE: 'Planta base', OPCIONAL: 'Opcional', PERSONALIZACAO: 'Personalização' }

  return (
    <div className="flex flex-col gap-4 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">E2 — Levantamento de Quantitativos</h2>
          {planta && <p className="text-sm text-base-content/50">{planta.nome} · {planta.areaConstruidaM2} m² · {qtRows.length} serviço(s)</p>}
        </div>
        <div className="flex gap-2">
          <button onClick={addServico} className="btn btn-ghost btn-sm gap-1"><MdAdd size={16} /> Serviço manual</button>
          <button onClick={confirmar} className="btn btn-primary btn-sm gap-1" disabled={qtRows.length === 0}><MdCheck size={16} /> Salvar quantitativos</button>
        </div>
      </div>

      {pendentes.length > 0 && (
        <div className="alert alert-warning text-xs">
          {pendentes.length} serviço(s) sem composição definida: {pendentes.slice(0, 4).join(', ')}{pendentes.length > 4 ? ` +${pendentes.length - 4}` : ''}
        </div>
      )}

      {!orc?.parametros && (
        <div className="alert alert-warning text-sm">Orçamento sem parâmetros de cliente. Quantitativos precisam ser inseridos manualmente.</div>
      )}

      {qtRows.length > 0 && (
        <div className="card bg-base-100 shadow overflow-x-auto">
          <table className="table table-xs">
            <thead>
              <tr>
                <th>Serviço</th>
                <th>UN</th>
                <th>Quantidade</th>
                <th>Esp. 1</th>
                <th>Esp. 2</th>
                <th>Esp. 3</th>
                <th>Composição SINAPI</th>
                <th>CP</th>
                <th>Modalidade</th>
                <th>Origem</th>
              </tr>
            </thead>
            <tbody>
              {qtRows.map((row, idx) => (
                <tr key={row.id}>
                  <td className="text-xs whitespace-nowrap">{SERVICE_LABELS[row.serviceType] ?? row.serviceType}</td>
                  <td className="text-xs">{row.unidade}</td>
                  <td>
                    <input type="number" className="input input-xs w-20 font-mono" value={row.quantidade}
                      onChange={e => updateRow(idx, { quantidade: parseFloat(e.target.value) || 0 })} />
                  </td>
                  <td><input type="text" className="input input-xs w-28" value={row.especificacao1} onChange={e => updateRow(idx, { especificacao1: e.target.value })} /></td>
                  <td><input type="text" className="input input-xs w-28" value={row.especificacao2} onChange={e => updateRow(idx, { especificacao2: e.target.value })} /></td>
                  <td><input type="text" className="input input-xs w-28" value={row.especificacao3} onChange={e => updateRow(idx, { especificacao3: e.target.value })} /></td>
                  <td>
                    <input type="text" className={`input input-xs w-24 font-mono ${!row.composicaoBasica ? 'input-error' : ''}`}
                      value={row.composicaoBasica} onChange={e => updateRow(idx, { composicaoBasica: e.target.value })} />
                  </td>
                  <td>
                    <select className={`select select-xs w-32 ${!row.composicaoProfissionalId ? 'select-error' : ''}`}
                      value={row.composicaoProfissionalId}
                      onChange={e => updateRow(idx, { composicaoProfissionalId: parseInt(e.target.value) || 0 })}>
                      <option value={0}>Selecione...</option>
                      {COMPOSICOES_PROFISSIONAIS.map(cp => (
                        <option key={cp.id} value={cp.id}>{cp.id} — {cp.servico}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select className="select select-xs w-20" value={row.modalidade}
                      onChange={e => updateRow(idx, { modalidade: e.target.value as ContratoModalidade })}>
                      <option value="MEI">MEI</option>
                      <option value="CLT">CLT</option>
                    </select>
                  </td>
                  <td>
                    <span className={`badge badge-xs ${row.origem === 'PLANTA_BASE' ? 'badge-info' : row.origem === 'OPCIONAL' ? 'badge-warning' : 'badge-ghost'}`}>
                      {origemLabel[row.origem]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {qtRows.length === 0 && (
        <div className="card bg-base-100 shadow">
          <div className="card-body items-center py-12">
            <p className="text-base-content/40 text-sm">Nenhum serviço. Selecione um orçamento com parâmetros ou adicione manualmente.</p>
          </div>
        </div>
      )}
    </div>
  )
}


interface Props {
  data: EngineerData
  onUpdate: (p: Partial<EngineerData>) => void
  orcamentos: Orcamento[]
}
