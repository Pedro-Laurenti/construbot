'use client'

import { useState } from 'react'
import { COMPOSICOES_ANALITICAS } from '@/lib/mockData'
import type { ComposicaoAnalitica } from '@/types'
import { MdExpandMore, MdExpandLess } from 'react-icons/md'

export default function ComposicoesAnaliticas() {
  const [busca, setBusca] = useState('')
  const [filtroGrupo, setFiltroGrupo] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const grupos = [...new Set(COMPOSICOES_ANALITICAS.map(c => c.grupo))]

  const filtrados = COMPOSICOES_ANALITICAS.filter(c => {
    const matchBusca = !busca || c.codigoComposicao.includes(busca) || c.descricao.toLowerCase().includes(busca.toLowerCase())
    const matchGrupo = !filtroGrupo || c.grupo === filtroGrupo
    return matchBusca && matchGrupo
  })

  function toggle(cod: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(cod) ? next.delete(cod) : next.add(cod)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-4 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Composições Analíticas</h1>
        <p className="text-base-content/50 text-sm">Referência SINAPI Janeiro/2026 — 64.943 registros (exibindo amostra representativa)</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <fieldset className="fieldset">
          <legend className="fieldset-legend text-xs">Pesquisar</legend>
          <input type="text" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Código ou descrição..." className="input input-sm w-64" />
        </fieldset>
        <fieldset className="fieldset">
          <legend className="fieldset-legend text-xs">Grupo</legend>
          <select value={filtroGrupo} onChange={e => setFiltroGrupo(e.target.value)} className="select select-sm">
            <option value="">Todos</option>
            {grupos.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </fieldset>
      </div>

      <div className="flex flex-col gap-2">
        {filtrados.map(comp => (
          <div key={comp.codigoComposicao} className="card bg-base-100 shadow">
            <button onClick={() => toggle(comp.codigoComposicao)} className="w-full text-left">
              <div className="card-body p-4 flex-row items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="badge badge-sm badge-ghost font-mono">{comp.codigoComposicao}</span>
                    <span className="badge badge-sm badge-outline">{comp.grupo}</span>
                    <span className="badge badge-sm">{comp.unidade}</span>
                  </div>
                  <p className="font-semibold text-sm mt-1">{comp.descricao}</p>
                </div>
                {expanded.has(comp.codigoComposicao) ? <MdExpandLess size={20} /> : <MdExpandMore size={20} />}
              </div>
            </button>

            {expanded.has(comp.codigoComposicao) && (
              <div className="px-4 pb-4 overflow-x-auto">
                <table className="table table-xs">
                  <thead>
                    <tr><th>Nível</th><th>Tipo</th><th>Código</th><th>Descrição</th><th>UN</th><th className="text-right">Coef.</th><th>Situação</th></tr>
                  </thead>
                  <tbody>
                    {comp.itens.map((item, idx) => {
                      const nivel = item.tipoItem === 'INSUMO' ? 2 : 1
                      return (
                        <tr key={idx} className={nivel === 1 ? 'bg-base-200/40' : nivel === 2 ? 'bg-base-300/20' : ''}>
                          <td className="text-xs text-base-content/50">Nível {nivel}</td>
                          <td><span className={`badge badge-xs ${item.tipoItem === 'INSUMO' ? 'badge-info' : 'badge-accent'}`}>{item.tipoItem}</span></td>
                          <td className={`font-mono text-xs ${nivel === 2 ? 'pl-4' : ''}`}>{item.codigo}</td>
                          <td className={`text-xs ${nivel === 2 ? 'pl-4' : ''}`}>{item.descricao}</td>
                          <td className="text-xs">{item.unidade}</td>
                          <td className="text-right font-mono text-xs">{item.coeficiente}</td>
                          <td><span className="badge badge-xs badge-ghost">{item.situacao}</span></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
        {filtrados.length === 0 && <p className="text-center text-base-content/40 py-8 text-sm">Nenhuma composição encontrada.</p>}
      </div>
    </div>
  )
}
