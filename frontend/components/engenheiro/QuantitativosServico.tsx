'use client'

import { useState } from 'react'
import { loadStorage, saveStorage } from '@/lib/storage'
import { PLANTAS_PADRAO } from '@/lib/mockData'
import { gerarQuantitativosFromParametros } from '@/lib/calculos'
import { formatCurrency } from '@/lib/formatters'
import { SERVICE_LABELS } from '@/lib/mockData'
import { MdPlayArrow, MdCheck, MdExpandMore, MdExpandLess } from 'react-icons/md'
import type { EngineerData, Orcamento, QuantitativoServico, ContratoModalidade } from '@/types'

interface Props {
  data: EngineerData
  onUpdate: (p: Partial<EngineerData>) => void
  orcamentos: Orcamento[]
}

export default function QuantitativosServico({ data, onUpdate, orcamentos }: Props) {
  const aguardando = orcamentos.filter(o => o.status === 'aguardando_engenheiro')
  const [selectedId, setSelectedId] = useState<string>('')
  const [expanded, setExpanded] = useState(false)
  const [qtRows, setQtRows] = useState<QuantitativoServico[]>([])
  const [generated, setGenerated] = useState(false)

  const orc = aguardando.find(o => o.id === selectedId) ?? null

  function handleSelect(id: string) {
    setSelectedId(id)
    setGenerated(false)
    setQtRows([])
    setExpanded(false)
    const target = aguardando.find(o => o.id === id)
    if (!target?.parametros) return
    const planta = PLANTAS_PADRAO.find(p => p.id === target.parametros!.plantaId)
    if (!planta) return
    const rows = gerarQuantitativosFromParametros(planta, target.parametros!.opcionais)
    setQtRows(rows)
    setGenerated(true)
  }

  function updateRow(idx: number, patch: Partial<QuantitativoServico>) {
    setQtRows(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r))
  }

  function confirmar() {
    if (!orc) return
    const engOrc = {
      ...data.orcamentosEngenheiro,
      [orc.id]: { orcamentoClienteId: orc.id, etapaAtual: 'E2' as const, quantitativos: qtRows },
    }
    onUpdate({ orcamentosEngenheiro: engOrc })
    const session = loadStorage()
    const updated = session.orcamentos.map(o =>
      o.id === orc.id ? { ...o, status: 'em_calculo' as const } : o
    )
    saveStorage({ ...session, orcamentos: updated })
    setSelectedId('')
    setGenerated(false)
    setQtRows([])
  }

  const planta = orc?.parametros ? PLANTAS_PADRAO.find(p => p.id === orc.parametros!.plantaId) : null
  const params = orc?.parametros

  return (
    <div className="flex flex-col gap-4 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold">E2 - Levantamento de Quantitativos</h1>
        <p className="text-base-content/50 text-sm">Transforme os parâmetros do cliente em serviços quantificados</p>
      </div>

      <fieldset className="fieldset">
        <legend className="fieldset-legend text-xs">Selecionar Orçamento</legend>
        {aguardando.length === 0 ? (
          <p className="text-sm text-base-content/40 py-4">Nenhum orçamento aguardando análise.</p>
        ) : (
          <select
            className="select select-bordered w-full max-w-md"
            value={selectedId}
            onChange={e => handleSelect(e.target.value)}
          >
            <option value="">Selecione...</option>
            {aguardando.map(o => (
              <option key={o.id} value={o.id}>
                {o.id.slice(0, 14)} - {o.clienteId} ({o.dataCriacao})
              </option>
            ))}
          </select>
        )}
      </fieldset>

      {orc && params && (
        <div className="card bg-base-100 shadow">
          <div className="card-body p-4">
            <button
              className="flex items-center gap-2 font-semibold text-sm"
              onClick={() => setExpanded(v => !v)}
            >
              {expanded ? <MdExpandLess size={18} /> : <MdExpandMore size={18} />}
              Parâmetros do Cliente
            </button>
            {expanded && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 text-sm">
                <div>
                  <p className="font-semibold text-xs text-base-content/50">Terreno</p>
                  <p>{params.terreno.municipio} - {params.terreno.areaTotalM2} m2</p>
                  <p>Topografia: {params.terreno.topografia} | Situação: {params.terreno.situacao}</p>
                  <p>Valor: {formatCurrency(params.terreno.valorAvaliacao)}</p>
                </div>
                <div>
                  <p className="font-semibold text-xs text-base-content/50">Quartos</p>
                  <p>{params.quartos}</p>
                </div>
                <div>
                  <p className="font-semibold text-xs text-base-content/50">Planta</p>
                  <p>{planta ? `${planta.nome} (${planta.areaConstruidaM2} m2)` : params.plantaId}</p>
                </div>
                <div>
                  <p className="font-semibold text-xs text-base-content/50">Opcionais</p>
                  {params.opcionais.length === 0 ? (
                    <p className="text-base-content/40">Nenhum</p>
                  ) : (
                    <ul className="list-disc list-inside">
                      {params.opcionais.map(op => (
                        <li key={op.id}>{op.nome}: {op.selecionado ? 'S' : 'N'}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="md:col-span-2">
                  <p className="font-semibold text-xs text-base-content/50">Personalizações</p>
                  {params.personalizacoes.length === 0 ? (
                    <p className="text-base-content/40">Nenhuma</p>
                  ) : (
                    <ul className="list-disc list-inside">
                      {params.personalizacoes.map(p => (
                        <li key={p.id}>{p.descricao}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {generated && qtRows.length > 0 && (
        <>
          <div className="card bg-base-100 shadow overflow-x-auto">
            <table className="table table-xs">
              <thead>
                <tr>
                  <th>Serviço</th>
                  <th>Unidade</th>
                  <th>Quantidade</th>
                  <th>Esp.1</th>
                  <th>Esp.2</th>
                  <th>Esp.3</th>
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
                      <input
                        type="number"
                        className="input input-xs input-bordered w-20 font-mono"
                        value={row.quantidade}
                        onChange={e => updateRow(idx, { quantidade: parseFloat(e.target.value) || 0 })}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="input input-xs input-bordered w-28"
                        value={row.especificacao1}
                        onChange={e => updateRow(idx, { especificacao1: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="input input-xs input-bordered w-28"
                        value={row.especificacao2}
                        onChange={e => updateRow(idx, { especificacao2: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="input input-xs input-bordered w-28"
                        value={row.especificacao3}
                        onChange={e => updateRow(idx, { especificacao3: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="input input-xs input-bordered w-24 font-mono"
                        value={row.composicaoBasica}
                        onChange={e => updateRow(idx, { composicaoBasica: e.target.value })}
                      />
                    </td>
                    <td className="text-xs font-mono">{row.composicaoProfissionalId}</td>
                    <td>
                      <select
                        className="select select-xs select-bordered w-20"
                        value={row.modalidade}
                        onChange={e => updateRow(idx, { modalidade: e.target.value as ContratoModalidade })}
                      >
                        <option value="MEI">MEI</option>
                        <option value="CLT">CLT</option>
                      </select>
                    </td>
                    <td>
                      <span className={`badge badge-xs ${row.origem === 'PLANTA_BASE' ? 'badge-info' : row.origem === 'OPCIONAL' ? 'badge-warning' : 'badge-ghost'}`}>
                        {row.origem}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <button className="btn btn-primary btn-sm gap-2" onClick={confirmar}>
              <MdCheck size={16} />
              Confirmar Quantitativos
            </button>
          </div>
        </>
      )}

      {orc && !orc.parametros && (
        <div className="alert alert-warning text-sm">
          Este orçamento não possui parâmetros (versão antiga). Não é possível gerar quantitativos automaticamente.
        </div>
      )}
    </div>
  )
}
