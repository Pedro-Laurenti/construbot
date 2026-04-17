'use client'

import { useState } from 'react'
import { loadStorage, saveStorage } from '@/lib/storage'
import { PLANTAS_PADRAO, CONDICOES_FINANCIAMENTO } from '@/lib/mockData'
import { calcularFluxoCaixaINCC, calcularParcelaPrice, calcularAporteMinimo, calcularTabelaAportes, calcularMatEngenheiro } from '@/lib/calculos'
import { formatCurrency, formatPercentual } from '@/lib/formatters'
import { MdSend, MdAttachMoney, MdAccountBalance } from 'react-icons/md'
import type { EngineerData, Orcamento, SaidaCliente } from '@/types'

interface Props {
  data: EngineerData
  onUpdate: (p: Partial<EngineerData>) => void
  orcamentos: Orcamento[]
}

export default function PrecificacaoFinal({ data, onUpdate, orcamentos }: Props) {
  const [selectedOrcId, setSelectedOrcId] = useState('')

  const orcamentosComEngenheiro = orcamentos.filter(o => data.orcamentosEngenheiro[o.id])
  const orcamento = orcamentosComEngenheiro.find(o => o.id === selectedOrcId)
  const engData = selectedOrcId ? data.orcamentosEngenheiro[selectedOrcId] : null
  const parametros = orcamento?.parametros
  const planta = parametros ? PLANTAS_PADRAO.find(p => p.id === parametros.plantaId) : null
  const clienteModalidade = parametros?.modalidadeFinanciamento ?? 'SBPE'

  const servicoIds = engData?.quantitativos.map(q => q.id) ?? []
  const rows = servicoIds.map(sid => {
    const mo = data.calculoMOResults[sid]
    const matCfg = data.calculoMatConfigs[sid]
    const qtv = engData?.quantitativos.find(q => q.id === sid)
    const custoMat = matCfg ? calcularMatEngenheiro(matCfg) : 0
    return {
      id: sid,
      servico: qtv?.descricao ?? sid,
      unidade: qtv?.unidade ?? '',
      quantidade: qtv?.quantidade ?? 0,
      custoMoMEI: mo?.custoFinalMEI ?? 0,
      custoMoCLT: mo?.custoFinalCLT ?? 0,
      custoMat,
      totalMEI: (mo?.custoFinalMEI ?? 0) + custoMat,
      totalCLT: (mo?.custoFinalCLT ?? 0) + custoMat,
    }
  })

  const custoMoTotalMEI = rows.reduce((s, r) => s + r.custoMoMEI, 0)
  const custoMoTotalCLT = rows.reduce((s, r) => s + r.custoMoCLT, 0)
  const custoMatTotal = rows.reduce((s, r) => s + r.custoMat, 0)
  const custoDiretoMEI = custoMoTotalMEI + custoMatTotal
  const custoDiretoCLT = custoMoTotalCLT + custoMatTotal
  const areaConstruida = planta?.areaConstruidaM2 ?? 1
  const custoDiretoPorM2MEI = custoDiretoMEI / areaConstruida
  const custoDiretoPorM2CLT = custoDiretoCLT / areaConstruida

  const incc = data.inccMensal
  const tempoMeses = planta?.tempoObraMeses ?? 8
  const fluxoMEI = calcularFluxoCaixaINCC(custoDiretoMEI, tempoMeses, incc)
  const fluxoCLT = calcularFluxoCaixaINCC(custoDiretoCLT, tempoMeses, incc)
  const custoDiretoComInccMEI = fluxoMEI.totalCorrigido
  const custoDiretoComInccCLT = fluxoCLT.totalCorrigido

  const bdi = data.globalParams.bdi
  const precoFinalMEI = custoDiretoComInccMEI * (1 + bdi)
  const precoFinalCLT = custoDiretoComInccCLT * (1 + bdi)

  const cond = CONDICOES_FINANCIAMENTO.find(c => c.modalidade === clienteModalidade) ?? CONDICOES_FINANCIAMENTO[0]
  const valorFinanciadoMEI = precoFinalMEI * cond.percentualMaximoFinanciavel
  const valorFinanciadoCLT = precoFinalCLT * cond.percentualMaximoFinanciavel
  const parcelaMEI = calcularParcelaPrice(valorFinanciadoMEI, cond.taxaJurosAnual, cond.prazoMaximoMeses)
  const parcelaCLT = calcularParcelaPrice(valorFinanciadoCLT, cond.taxaJurosAnual, cond.prazoMaximoMeses)
  const aaMEI = calcularAporteMinimo(precoFinalMEI, cond.percentualMaximoFinanciavel)
  const aaCLT = calcularAporteMinimo(precoFinalCLT, cond.percentualMaximoFinanciavel)

  function entregarOrcamento() {
    if (!orcamento || !engData) return
    const saida: SaidaCliente = {
      valorMinimoEntrada: aaMEI,
      parcelaMensalPrice: parcelaMEI,
      tabelaAportes: calcularTabelaAportes(precoFinalMEI, cond.percentualMaximoFinanciavel, tempoMeses, clienteModalidade),
      prazoTotalObraMeses: tempoMeses,
      precoFinalObra: precoFinalMEI,
    }
    const session = loadStorage()
    const updatedOrcamentos = session.orcamentos.map(o =>
      o.id === orcamento.id ? { ...o, status: 'entregue' as const, saida } : o
    )
    saveStorage({ ...session, orcamentos: updatedOrcamentos })
    const updatedEng = {
      ...data.orcamentosEngenheiro,
      [orcamento.id]: { ...engData, etapaAtual: 'ENTREGUE' as const },
    }
    onUpdate({ orcamentosEngenheiro: updatedEng })
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">E6 — Precificação Final</h1>
        <p className="text-base-content/50 text-sm">INCC + BDI + Price + Aporte + Entrega</p>
      </div>

      <fieldset className="fieldset">
        <legend className="fieldset-legend text-xs">Selecionar Orçamento</legend>
        <select
          value={selectedOrcId}
          onChange={e => setSelectedOrcId(e.target.value)}
          className="select select-bordered w-full"
        >
          <option value="">Selecione...</option>
          {orcamentosComEngenheiro.map(o => (
            <option key={o.id} value={o.id}>
              {o.id.slice(0, 16)} — {o.uf} — {o.parametros?.plantaId ?? 'sem planta'}
            </option>
          ))}
        </select>
      </fieldset>

      {!selectedOrcId && (
        <div className="card bg-base-100 shadow">
          <div className="card-body items-center py-12">
            <p className="text-base-content/40">Selecione um orçamento com dados de engenharia para prosseguir.</p>
          </div>
        </div>
      )}

      {selectedOrcId && rows.length === 0 && (
        <div className="card bg-base-100 shadow">
          <div className="card-body items-center py-12">
            <p className="text-base-content/40">Nenhum serviço calculado para este orçamento.</p>
          </div>
        </div>
      )}

      {selectedOrcId && rows.length > 0 && (
        <>
          <div className="card bg-base-100 shadow overflow-x-auto">
            <div className="card-body p-4">
              <p className="font-semibold mb-3">Consolidação de Custos Diretos</p>
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Serviço</th>
                    <th className="text-right">Qtd</th>
                    <th className="text-right">MO MEI</th>
                    <th className="text-right">MO CLT</th>
                    <th className="text-right">Mat</th>
                    <th className="text-right">Total MEI</th>
                    <th className="text-right">Total CLT</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.id} className="hover">
                      <td className="text-xs font-semibold">{r.servico}</td>
                      <td className="text-right font-mono text-xs">{r.quantidade} {r.unidade}</td>
                      <td className="text-right font-mono text-xs">{formatCurrency(r.custoMoMEI)}</td>
                      <td className="text-right font-mono text-xs">{formatCurrency(r.custoMoCLT)}</td>
                      <td className="text-right font-mono text-xs">{formatCurrency(r.custoMat)}</td>
                      <td className="text-right font-mono text-xs font-semibold">{formatCurrency(r.totalMEI)}</td>
                      <td className="text-right font-mono text-xs font-semibold">{formatCurrency(r.totalCLT)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                {[
                  { l: 'MO Total MEI', v: custoMoTotalMEI },
                  { l: 'MO Total CLT', v: custoMoTotalCLT },
                  { l: 'Materiais Total', v: custoMatTotal },
                  { l: 'Custo Direto MEI', v: custoDiretoMEI },
                  { l: 'Custo Direto CLT', v: custoDiretoCLT },
                  { l: `Custo/m2 MEI (${areaConstruida}m2)`, v: custoDiretoPorM2MEI },
                  { l: `Custo/m2 CLT (${areaConstruida}m2)`, v: custoDiretoPorM2CLT },
                ].map(({ l, v }) => (
                  <div key={l} className="bg-base-200 rounded-lg p-3">
                    <p className="text-xs text-base-content/50">{l}</p>
                    <p className="font-mono font-bold text-sm">{formatCurrency(v)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card bg-base-100 shadow overflow-x-auto">
            <div className="card-body p-4">
              <p className="font-semibold mb-1">Fluxo de Caixa com INCC</p>
              <p className="text-xs text-base-content/50 mb-3">
                INCC Mensal: {formatPercentual(incc)} | Prazo: {tempoMeses} meses
              </p>
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Mês</th>
                    <th className="text-right">Custo Parcela</th>
                    <th className="text-right">INCC Acum.</th>
                    <th className="text-right">Custo Corrigido</th>
                  </tr>
                </thead>
                <tbody>
                  {fluxoMEI.parcelas.map(p => (
                    <tr key={p.mes} className="hover">
                      <td className="font-mono text-xs">{p.mes}</td>
                      <td className="text-right font-mono text-xs">{formatCurrency(p.custoParcela)}</td>
                      <td className="text-right font-mono text-xs">{formatPercentual(p.inccAcumulado)}</td>
                      <td className="text-right font-mono text-xs">{formatCurrency(p.custoParcelaCorrigido)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                <div className="bg-base-200 rounded-lg p-3">
                  <p className="text-xs text-base-content/50">Custo Direto c/ INCC MEI</p>
                  <p className="font-mono font-bold text-sm">{formatCurrency(custoDiretoComInccMEI)}</p>
                </div>
                <div className="bg-base-200 rounded-lg p-3">
                  <p className="text-xs text-base-content/50">Custo Direto c/ INCC CLT</p>
                  <p className="font-mono font-bold text-sm">{formatCurrency(custoDiretoComInccCLT)}</p>
                </div>
                <div className="bg-base-200 rounded-lg p-3">
                  <p className="text-xs text-base-content/50">Diferença INCC MEI</p>
                  <p className="font-mono font-bold text-sm">{formatCurrency(custoDiretoComInccMEI - custoDiretoMEI)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-base-100 shadow">
            <div className="card-body p-4">
              <p className="font-semibold mb-3">BDI + Preço Final</p>
              <p className="text-xs text-base-content/50 mb-4">BDI aplicado: {formatPercentual(bdi)}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-primary/10 border border-primary rounded-xl p-5 text-center">
                  <MdAttachMoney className="mx-auto mb-2 text-primary" size={32} />
                  <p className="text-xs text-base-content/60 mb-1">Preço Final MEI</p>
                  <p className="text-2xl font-bold font-mono text-primary">{formatCurrency(precoFinalMEI)}</p>
                  <p className="text-xs text-base-content/50 mt-1">{formatCurrency(precoFinalMEI / areaConstruida)}/m2</p>
                </div>
                <div className="bg-secondary/10 border border-secondary rounded-xl p-5 text-center">
                  <MdAttachMoney className="mx-auto mb-2 text-secondary" size={32} />
                  <p className="text-xs text-base-content/60 mb-1">Preço Final CLT</p>
                  <p className="text-2xl font-bold font-mono text-secondary">{formatCurrency(precoFinalCLT)}</p>
                  <p className="text-xs text-base-content/50 mt-1">{formatCurrency(precoFinalCLT / areaConstruida)}/m2</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-base-100 shadow">
            <div className="card-body p-4">
              <p className="font-semibold mb-1">Price + Aporte Antecipado</p>
              <p className="text-xs text-base-content/50 mb-4">
                Modalidade: {clienteModalidade} | Taxa: {formatPercentual(cond.taxaJurosAnual)} a.a. | Prazo: {cond.prazoMaximoMeses} meses | Financiável: {formatPercentual(cond.percentualMaximoFinanciavel)}
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-base-200 rounded-lg p-3">
                  <MdAccountBalance className="mb-1 text-primary" size={20} />
                  <p className="text-xs text-base-content/50">Parcela Price MEI</p>
                  <p className="font-mono font-bold text-sm">{formatCurrency(parcelaMEI)}</p>
                </div>
                <div className="bg-base-200 rounded-lg p-3">
                  <MdAccountBalance className="mb-1 text-secondary" size={20} />
                  <p className="text-xs text-base-content/50">Parcela Price CLT</p>
                  <p className="font-mono font-bold text-sm">{formatCurrency(parcelaCLT)}</p>
                </div>
                <div className="bg-base-200 rounded-lg p-3">
                  <p className="text-xs text-base-content/50">Aporte Mínimo MEI</p>
                  <p className="font-mono font-bold text-sm">{formatCurrency(aaMEI)}</p>
                </div>
                <div className="bg-base-200 rounded-lg p-3">
                  <p className="text-xs text-base-content/50">Aporte Mínimo CLT</p>
                  <p className="font-mono font-bold text-sm">{formatCurrency(aaCLT)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-base-100 shadow">
            <div className="card-body p-4 items-center">
              <p className="font-semibold mb-2">Entrega ao Cliente</p>
              <p className="text-xs text-base-content/50 mb-4 text-center">
                Será utilizado o cenário MEI como padrão. O orçamento do cliente será atualizado com status &quot;entregue&quot;.
              </p>
              <button
                onClick={entregarOrcamento}
                disabled={engData?.etapaAtual === 'ENTREGUE'}
                className="btn btn-primary gap-2"
              >
                <MdSend size={20} />
                {engData?.etapaAtual === 'ENTREGUE' ? 'Orçamento Entregue' : 'Entregar Orçamento ao Cliente'}
              </button>
              {engData?.etapaAtual === 'ENTREGUE' && (
                <p className="text-xs text-success mt-2">Este orçamento já foi entregue ao cliente.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
