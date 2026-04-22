'use client'

import { useState } from 'react'
import { INSUMOS_SINAPI, UF_LIST } from '@/lib/mockData'
import { getModuleUiState, setModuleUiState } from '@/lib/engineerDashboard'
import type { InsumoSINAPI, EngineerData } from '@/types'

interface Props {
  uf: string
  onUfChange: (uf: string) => void
  data?: EngineerData
  onUpdate?: (p: Partial<EngineerData>) => void
}

const CLASSIFICACOES = ['MATERIAL', 'SERVICOS', 'EQUIPAMENTO'] as const

export default function TabelaSINAPI({ uf, onUfChange, data, onUpdate }: Props) {
  const ui = data ? getModuleUiState(data, 'sinapi') : {}
  const [busca, setBusca] = useState(ui.filtros?.busca ?? '')
  const [filtroClass, setFiltroClass] = useState(ui.filtros?.filtroClass ?? '')

  function persist(nextBusca: string, nextClass: string) {
    if (!data || !onUpdate) return
    onUpdate({ moduleUIState: setModuleUiState(data, 'sinapi', { filtros: { busca: nextBusca, filtroClass: nextClass } }) })
  }

  function getPreco(insumo: InsumoSINAPI): { valor: number | null; fallback: boolean } {
    const v = insumo.precos[uf]
    if (v !== null && v !== undefined) return { valor: v, fallback: false }
    const sp = insumo.precos['SP']
    return { valor: sp ?? null, fallback: true }
  }

  const filtrados = INSUMOS_SINAPI.filter(i => {
    const matchBusca = !busca || i.codigo.includes(busca) || i.descricao.toLowerCase().includes(busca.toLowerCase())
    const matchClass = !filtroClass || i.classificacao === filtroClass
    return matchBusca && matchClass
  })

  return (
    <div className="flex flex-col gap-4 max-w-full">
      <div>
        <h1 className="text-2xl font-bold">SINAPI — Insumos (ISE)</h1>
        <p className="text-base-content/50 text-sm">Referência SINAPI Janeiro/2026 — 4.861 insumos (amostra: insumos mais usados no fluxo do dashboard)</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <fieldset className="fieldset">
          <legend className="fieldset-legend text-xs">Pesquisar</legend>
          <input type="text" value={busca} onChange={e => { const v = e.target.value; setBusca(v); persist(v, filtroClass) }} placeholder="Código ou descrição..." className="input input-sm w-64" />
        </fieldset>
        <fieldset className="fieldset">
          <legend className="fieldset-legend text-xs">Classificação</legend>
          <select value={filtroClass} onChange={e => { const v = e.target.value; setFiltroClass(v); persist(busca, v) }} className="select select-sm">
            <option value="">Todas</option>
            {CLASSIFICACOES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </fieldset>
        <fieldset className="fieldset">
          <legend className="fieldset-legend text-xs">UF</legend>
          <select value={uf} onChange={e => onUfChange(e.target.value)} className="select select-sm">
            {UF_LIST.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </fieldset>
      </div>

      <div className="card bg-base-100 shadow overflow-x-auto">
        <div className="px-4 pt-3 pb-1 text-xs text-base-content/50">
          {filtrados.length} resultado(s) encontrado(s)
        </div>
        <table className="table table-sm">
          <thead>
            <tr>
              <th>Código</th>
              <th>Descrição</th>
              <th>UN</th>
              <th>Classificação</th>
              <th>Origem</th>
              <th>Preço ({uf})</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map(insumo => {
              const { valor, fallback } = getPreco(insumo)
              return (
                <tr key={insumo.codigo} className="hover">
                  <td className="font-mono text-xs">{insumo.codigo}</td>
                  <td className="text-xs max-w-[300px]">{insumo.descricao}</td>
                  <td className="text-xs">{insumo.unidade}</td>
                  <td><span className="badge badge-xs badge-ghost">{insumo.classificacao}</span></td>
                  <td>
                    <span className={`badge badge-xs ${insumo.origemPreco === 'CR' ? 'badge-warning' : 'badge-success'}`}>
                      {insumo.origemPreco}
                    </span>
                  </td>
                  <td className="text-xs font-mono">
                    {valor !== null ? (
                      <span className="flex items-center gap-1">
                        R$ {valor.toFixed(2)}
                        {fallback && <span className="badge badge-xs badge-warning" title="Preço de SP usado como fallback">SP</span>}
                      </span>
                    ) : (
                      <span className="text-base-content/30">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtrados.length === 0 && <p className="text-center text-base-content/40 py-8 text-sm">Nenhum insumo encontrado.</p>}
      </div>
      <p className="text-xs text-base-content/40">
        Origem C = Preço coletado diretamente · Origem CR = Coeficiente de representatividade · Badge SP = valor de SP como fallback
      </p>
    </div>
  )
}
