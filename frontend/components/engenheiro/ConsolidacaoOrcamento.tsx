'use client'

import { consolidarEngenheiro, calcularMatEngenheiro } from '@/lib/calculos'
import { formatCurrency } from '@/lib/formatters'
import type { EngineerData, Orcamento } from '@/types'
import { useState } from 'react'

interface Props { data: EngineerData; orcamentos: Orcamento[] }

export default function ConsolidacaoOrcamento({ data, orcamentos }: Props) {
  const { precificadorItens, calculoMOResults, calculoMatConfigs, globalParams } = data
  const [vinculadoId, setVinculadoId] = useState('')

  const itensComResultado = precificadorItens.filter(i => calculoMOResults[i.id])
  const areaTotal = precificadorItens.reduce((s, i) => s + i.quantidade, 0)
  const consolidado = itensComResultado.length > 0
    ? consolidarEngenheiro('local', 'local', calculoMOResults, calculoMatConfigs, areaTotal, globalParams.bdi)
    : null

  function exportarJSON() {
    const payload = { consolidado, precificadorItens, calculoMOResults, calculoMatConfigs, globalParams, exportadoEm: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `orcamento-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Consolidação</h1>
          <p className="text-base-content/50 text-sm">Seção 6.9 — Totais + BDI + exportar</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportarJSON} disabled={!consolidado} className="btn btn-outline btn-sm">Exportar JSON</button>
        </div>
      </div>

      {itensComResultado.length === 0 ? (
        <div className="card bg-base-100 shadow"><div className="card-body items-center py-12"><p className="text-base-content/40">Calcule a MO de pelo menos um serviço para ver a consolidação.</p></div></div>
      ) : (
        <>
          <div className="card bg-base-100 shadow overflow-x-auto">
            <div className="card-body p-4">
              <p className="font-semibold mb-3">Por Serviço</p>
              <table className="table table-sm">
                <thead>
                  <tr><th>Serviço</th><th className="text-right">Qtd.</th><th>UN</th><th className="text-right">MO MEI</th><th className="text-right">MO CLT</th><th className="text-right">Materiais</th><th className="text-right">Total MEI</th><th className="text-right">Total CLT</th></tr>
                </thead>
                <tbody>
                  {itensComResultado.map(item => {
                    const mo = calculoMOResults[item.id]
                    const mat = calculoMatConfigs[item.id] ? calcularMatEngenheiro(calculoMatConfigs[item.id]) : 0
                    return (
                      <tr key={item.id} className="hover">
                        <td className="text-xs font-semibold">{item.servico.replace(/_/g, ' ')}</td>
                        <td className="text-right font-mono text-xs">{item.quantidade}</td>
                        <td className="text-xs">{item.unidade}</td>
                        <td className="text-right font-mono text-xs">{formatCurrency(mo.custoFinalMEI)}</td>
                        <td className="text-right font-mono text-xs">{formatCurrency(mo.custoFinalCLT)}</td>
                        <td className="text-right font-mono text-xs">{formatCurrency(mat)}</td>
                        <td className="text-right font-mono text-xs font-semibold">{formatCurrency(mo.custoFinalMEI + mat)}</td>
                        <td className="text-right font-mono text-xs font-semibold">{formatCurrency(mo.custoFinalCLT + mat)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {consolidado && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { l: 'Custos Diretos MEI', v: consolidado.custosDiretosMEI },
                  { l: 'Custos Diretos CLT', v: consolidado.custosDiretosCLT },
                  { l: 'Preço Final MEI (BDI 20%)', v: consolidado.precoFinalMEI },
                  { l: 'Preço Final CLT (BDI 20%)', v: consolidado.precoFinalCLT },
                  { l: 'Custo/m² MEI', v: consolidado.custosDiretosPorM2MEI },
                  { l: 'Custo/m² CLT', v: consolidado.custosDiretosPorM2CLT },
                  { l: 'Preço/m² MEI', v: consolidado.precoPorM2MEI },
                  { l: 'Preço/m² CLT', v: consolidado.precoPorM2CLT },
                ].map(({ l, v }) => (
                  <div key={l} className="card bg-base-100 shadow">
                    <div className="card-body p-3">
                      <p className="text-xs text-base-content/50">{l}</p>
                      <p className="font-mono font-bold">{formatCurrency(v)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="card bg-base-100 shadow">
                <div className="card-body p-4">
                  <p className="font-semibold mb-3">Proporção de Custos — MEI</p>
                  {[
                    { l: 'Mão de Obra', v: consolidado.custoMOTotalMEI, total: consolidado.custosDiretosMEI, cls: 'progress-primary' },
                    { l: 'Materiais', v: consolidado.custoMatTotal, total: consolidado.custosDiretosMEI, cls: 'progress-secondary' },
                    { l: 'BDI (20%)', v: consolidado.precoFinalMEI - consolidado.custosDiretosMEI, total: consolidado.precoFinalMEI, cls: 'progress-accent' },
                  ].map(({ l, v, total, cls }) => (
                    <div key={l} className="mb-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span>{l}</span>
                        <span className="font-mono">{formatCurrency(v)} ({total > 0 ? ((v / total) * 100).toFixed(1) : 0}%)</span>
                      </div>
                      <progress className={`progress ${cls} w-full`} value={total > 0 ? (v / total) * 100 : 0} max={100} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="card bg-base-100 shadow">
                <div className="card-body p-4">
                  <p className="font-semibold mb-3">Vincular a Orçamento de Cliente</p>
                  <div className="flex gap-2">
                    <select value={vinculadoId} onChange={e => setVinculadoId(e.target.value)} className="select select-sm flex-1">
                      <option value="">Selecione um orçamento...</option>
                      {orcamentos.map(o => <option key={o.id} value={o.id}>{o.id.slice(0, 16)}... — {o.uf} — {o.dataCriacao}</option>)}
                    </select>
                    <button disabled={!vinculadoId} className="btn btn-primary btn-sm">Vincular</button>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
