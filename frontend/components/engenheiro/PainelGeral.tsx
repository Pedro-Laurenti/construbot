'use client'

import { formatCurrency, formatDate } from '@/lib/formatters'
import type { EngineerData, Orcamento } from '@/types'

interface Props { engineerData: EngineerData; orcamentos: Orcamento[] }

export default function PainelGeral({ engineerData, orcamentos }: Props) {
  const { globalParams, calculoMOResults, calculoMatConfigs } = engineerData
  const calculados = orcamentos.filter(o => o.status === 'calculado')
  const totalMOResults = Object.values(calculoMOResults)
  const totalMatConfigs = Object.values(calculoMatConfigs)
  const custosDiretosMEI = totalMOResults.reduce((s, r) => s + r.custoFinalMEI, 0)
  const custosDiretosCLT = totalMOResults.reduce((s, r) => s + r.custoFinalCLT, 0)
  const areaTotal = engineerData.precificadorItens.reduce((s, i) => s + i.quantidade, 0)
  const porM2MEI = areaTotal > 0 ? custosDiretosMEI / areaTotal : 0
  const porM2CLT = areaTotal > 0 ? custosDiretosCLT / areaTotal : 0
  const ultimo = [...orcamentos].sort((a, b) => b.dataCriacao.localeCompare(a.dataCriacao))[0]
  const recentes = [...orcamentos].sort((a, b) => b.dataCriacao.localeCompare(a.dataCriacao)).slice(0, 5)

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Painel Geral</h1>
        <p className="text-base-content/50 text-sm">Visão geral do sistema</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card bg-base-100 shadow">
          <div className="card-body p-4">
            <p className="text-base-content/50 text-xs uppercase tracking-wide">Orçamentos</p>
            <p className="text-3xl font-bold">{orcamentos.length}</p>
            <p className="text-base-content/50 text-xs">{calculados.length} calculados</p>
          </div>
        </div>
        <div className="card bg-base-100 shadow">
          <div className="card-body p-4">
            <p className="text-base-content/50 text-xs uppercase tracking-wide">Custo/m² MEI</p>
            <p className="text-xl font-bold">{formatCurrency(porM2MEI)}</p>
            <p className="text-base-content/50 text-xs">referência atual</p>
          </div>
        </div>
        <div className="card bg-base-100 shadow">
          <div className="card-body p-4">
            <p className="text-base-content/50 text-xs uppercase tracking-wide">Custo/m² CLT</p>
            <p className="text-xl font-bold">{formatCurrency(porM2CLT)}</p>
            <p className="text-base-content/50 text-xs">referência atual</p>
          </div>
        </div>
        <div className="card bg-base-100 shadow">
          <div className="card-body p-4">
            <p className="text-base-content/50 text-xs uppercase tracking-wide">BDI Atual</p>
            <p className="text-3xl font-bold">{(globalParams.bdi * 100).toFixed(0)}%</p>
            <p className="text-base-content/50 text-xs">encargos {(globalParams.encargosPercentual * 100).toFixed(2)}%</p>
          </div>
        </div>
      </div>

      {ultimo && (
        <div className="card bg-base-100 shadow">
          <div className="card-body p-4">
            <p className="text-base-content/50 text-xs uppercase tracking-wide mb-1">Último orçamento</p>
            <p className="font-semibold">ID: {ultimo.id}</p>
            <p className="text-base-content/50 text-sm">{formatDate(ultimo.dataCriacao)} · UF: {ultimo.uf} · {ultimo.itens.length} serviço(s) · <span className={`badge badge-sm ${ultimo.status === 'calculado' ? 'badge-success' : 'badge-ghost'}`}>{ultimo.status}</span></p>
          </div>
        </div>
      )}

      {recentes.length > 0 && (
        <div className="card bg-base-100 shadow">
          <div className="card-body p-4">
            <p className="font-semibold mb-3">Orçamentos Recentes</p>
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr><th>ID</th><th>Data</th><th>UF</th><th>Serviços</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {recentes.map(o => (
                    <tr key={o.id}>
                      <td className="font-mono text-xs">{o.id.slice(0, 12)}...</td>
                      <td>{formatDate(o.dataCriacao)}</td>
                      <td>{o.uf}</td>
                      <td>{o.itens.length}</td>
                      <td><span className={`badge badge-sm ${o.status === 'calculado' ? 'badge-success' : 'badge-ghost'}`}>{o.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {recentes.length === 0 && (
        <div className="card bg-base-100 shadow">
          <div className="card-body items-center py-8">
            <p className="text-base-content/40 text-sm">Nenhum orçamento recebido ainda.</p>
          </div>
        </div>
      )}

    </div>
  )
}
