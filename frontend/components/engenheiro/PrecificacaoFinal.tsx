'use client'

import { useState } from 'react'
import { loadStorage, saveStorage } from '@/lib/storage'
import { PLANTAS_PADRAO, CONDICOES_FINANCIAMENTO, FASES_OBRA_PADRAO } from '@/lib/mockData'
import { calcularFluxoCaixaINCC, calcularParcelaPrice, calcularAporteMinimo, calcularTabelaAportes, calcularMatEngenheiro } from '@/lib/calculos'
import { formatCurrency, formatPercentual } from '@/lib/formatters'
import { MdSend, MdAttachMoney, MdAccountBalance, MdCheckCircle, MdInsertChart } from 'react-icons/md'
import type { EngineerData, Orcamento, SaidaCliente, OrcamentoEngenheiro, FaseObra } from '@/types'

interface Props {
  data: EngineerData
  onUpdate: (p: Partial<EngineerData>) => void
  orcamentos: Orcamento[]
  orcamentoId?: string
  engData?: OrcamentoEngenheiro
  onUpdateEng?: (patch: Partial<OrcamentoEngenheiro>) => void
  onEntregar?: () => void
}

function BarChart({ parcelas }: { parcelas: { mes: number; custoParcela: number; custoParcelaCorrigido: number }[] }) {
  const maxVal = Math.max(...parcelas.map(p => p.custoParcelaCorrigido), 1)
  const W = 48
  const GAP = 6
  const HEIGHT = 80
  const total = parcelas.length
  const svgWidth = total * (W + GAP) + GAP

  return (
    <div className="overflow-x-auto">
      <svg width={svgWidth} height={HEIGHT + 28} className="block">
        {parcelas.map((p, i) => {
          const x = GAP + i * (W + GAP)
          const hNom = Math.round((p.custoParcela / maxVal) * HEIGHT)
          const hCorr = Math.round((p.custoParcelaCorrigido / maxVal) * HEIGHT)
          return (
            <g key={p.mes}>
              <rect x={x} y={HEIGHT - hNom} width={W * 0.45} height={hNom} className="fill-primary/40" rx="2" />
              <rect x={x + W * 0.5} y={HEIGHT - hCorr} width={W * 0.45} height={hCorr} className="fill-primary" rx="2" />
              <text x={x + W / 2} y={HEIGHT + 14} fontSize={9} textAnchor="middle" className="fill-base-content/60">{p.mes}</text>
            </g>
          )
        })}
        <text x={0} y={10} fontSize={8} className="fill-base-content/40">nominal</text>
      </svg>
    </div>
  )
}

export default function PrecificacaoFinal({ data, onUpdate, orcamentos, orcamentoId: orcamentoIdProp, engData: engDataProp, onUpdateEng, onEntregar }: Props) {
  const modoWizard = !!orcamentoIdProp && !!engDataProp

  const [selectedOrcId, setSelectedOrcId] = useState(orcamentoIdProp ?? '')
  const [confirmModal, setConfirmModal] = useState(false)
  const [rascunhoSalvo, setRascunhoSalvo] = useState(false)

  const orcamentosComEngenheiro = orcamentos.filter(o => data.orcamentosEngenheiro[o.id])
  const orcamento = modoWizard
    ? orcamentos.find(o => o.id === orcamentoIdProp)
    : orcamentosComEngenheiro.find(o => o.id === selectedOrcId)
  const engData = modoWizard ? engDataProp : (selectedOrcId ? data.orcamentosEngenheiro[selectedOrcId] : null)
  const parametros = orcamento?.parametros
  const planta = parametros ? PLANTAS_PADRAO.find(p => p.id === parametros.plantaId) : null
  const clienteModalidade = parametros?.modalidadeFinanciamento ?? 'SBPE'
  const areaConstruida = planta?.areaConstruidaM2 ?? 1
  const tempoMeses = planta?.tempoObraMeses ?? 8

  const [fasesObra, setFasesObra] = useState<FaseObra[]>(engData?.fasesObra ?? FASES_OBRA_PADRAO)

  const servicoIds = engData?.quantitativos.map(q => q.id) ?? []
  const rows = servicoIds.map(sid => {
    const mo = modoWizard ? engData!.calculosMO[sid]?.resultado : data.calculoMOResults[sid]
    const matCfg = modoWizard ? engData!.calculosMat[sid] : data.calculoMatConfigs[sid]
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
  const custoDiretoPorM2MEI = custoDiretoMEI / areaConstruida
  const custoDiretoPorM2CLT = custoDiretoCLT / areaConstruida

  const incc = data.inccMensal
  const fluxoMEI = calcularFluxoCaixaINCC(custoDiretoMEI, tempoMeses, incc)
  const fluxoCLT = calcularFluxoCaixaINCC(custoDiretoCLT, tempoMeses, incc)
  const custoDiretoComInccMEI = fluxoMEI.totalCorrigido
  const custoDiretoComInccCLT = fluxoCLT.totalCorrigido

  const bdi = data.globalParams.bdi
  const precoFinalMEI = custoDiretoComInccMEI * (1 + bdi)
  const precoFinalCLT = custoDiretoComInccCLT * (1 + bdi)

  const cond = CONDICOES_FINANCIAMENTO.find(c => c.modalidade === clienteModalidade) ?? CONDICOES_FINANCIAMENTO[0]
  const valorFinanciadoMEI = precoFinalMEI * cond.percentualMaximoFinanciavel
  const parcelaMEI = calcularParcelaPrice(valorFinanciadoMEI, cond.taxaJurosAnual, cond.prazoMaximoMeses)
  const aaMEI = calcularAporteMinimo(precoFinalMEI, cond.percentualMaximoFinanciavel)
  const tabelaAportes = calcularTabelaAportes(precoFinalMEI, cond.percentualMaximoFinanciavel, tempoMeses, clienteModalidade)

  function salvarFases() {
    if (!engData || !onUpdateEng) return
    onUpdateEng({ fasesObra })
    setRascunhoSalvo(true)
    setTimeout(() => setRascunhoSalvo(false), 2000)
  }

  function updateFase(idx: number, patch: Partial<FaseObra>) {
    setFasesObra(prev => prev.map((f, i) => i === idx ? { ...f, ...patch } : f))
  }

  function entregarOrcamento() {
    if (!orcamento || !engData) return
    const saida: SaidaCliente = {
      valorMinimoEntrada: aaMEI,
      parcelaMensalPrice: parcelaMEI,
      tabelaAportes,
      prazoTotalObraMeses: tempoMeses,
      precoFinalObra: precoFinalMEI,
    }
    const session = loadStorage()
    const updatedOrcamentos = session.orcamentos.map(o =>
      o.id === orcamento.id ? { ...o, status: 'entregue' as const, saida } : o
    )
    saveStorage({ ...session, orcamentos: updatedOrcamentos })
    const updatedEng = { ...data.orcamentosEngenheiro, [orcamento.id]: { ...engData, etapaAtual: 'ENTREGUE' as const } }
    onUpdate({ orcamentosEngenheiro: updatedEng })
    if (onUpdateEng) onUpdateEng({ etapaAtual: 'ENTREGUE' })
    setConfirmModal(false)
    if (onEntregar) onEntregar()
  }

  const jaEntregue = engData?.etapaAtual === 'ENTREGUE'
  const showContent = (modoWizard || !!selectedOrcId) && rows.length > 0

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div>
        <h2 className="text-xl font-bold">E6 — Precificação Final</h2>
        <p className="text-base-content/50 text-sm">INCC + BDI + Price + Aporte + Entrega</p>
      </div>

      {!modoWizard && (
        <fieldset className="fieldset">
          <legend className="fieldset-legend text-xs">Selecionar Orçamento</legend>
          <select value={selectedOrcId} onChange={e => setSelectedOrcId(e.target.value)} className="select w-full">
            <option value="">Selecione...</option>
            {orcamentosComEngenheiro.map(o => (
              <option key={o.id} value={o.id}>{o.id.slice(0, 16)} — {o.uf} — {o.parametros?.plantaId ?? 'sem planta'}</option>
            ))}
          </select>
        </fieldset>
      )}

      {!showContent && (
        <div className="card bg-base-100 shadow">
          <div className="card-body items-center py-12">
            <p className="text-base-content/40 text-sm">
              {modoWizard ? 'Complete E4 e E5 para ver a precificação.' : 'Selecione um orçamento com dados de engenharia para prosseguir.'}
            </p>
          </div>
        </div>
      )}

      {showContent && (
        <>
          <div className="card bg-base-100 shadow overflow-x-auto">
            <div className="card-body p-4">
              <p className="font-semibold mb-3">Bloco 1 — Consolidação de Custos Diretos</p>
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Serviço</th><th className="text-right">Qtd</th>
                    <th className="text-right">MO MEI</th><th className="text-right">MO CLT</th>
                    <th className="text-right">Mat</th><th className="text-right">Total MEI</th><th className="text-right">Total CLT</th>
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
                  { l: `MEI/m² (${areaConstruida}m²)`, v: custoDiretoPorM2MEI },
                  { l: `CLT/m² (${areaConstruida}m²)`, v: custoDiretoPorM2CLT },
                ].map(({ l, v }) => (
                  <div key={l} className="bg-base-200 rounded-lg p-3">
                    <p className="text-xs text-base-content/50">{l}</p>
                    <p className="font-mono font-bold text-sm">{formatCurrency(v)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card bg-base-100 shadow">
            <div className="card-body p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold">Bloco 2 — Fluxo de Caixa + INCC</p>
                <button onClick={salvarFases} className="btn btn-ghost btn-xs gap-1">
                  {rascunhoSalvo ? <MdCheckCircle size={14} className="text-success" /> : <MdInsertChart size={14} />}
                  Salvar fases
                </button>
              </div>
              <p className="text-xs text-base-content/50 mb-4">INCC Mensal: {formatPercentual(incc)} | Prazo: {tempoMeses} meses</p>

              <div className="overflow-x-auto mb-4">
                <table className="table table-xs">
                  <thead><tr><th>Fase</th><th>Início</th><th>Fim</th><th>% Custo</th></tr></thead>
                  <tbody>
                    {fasesObra.map((f, idx) => (
                      <tr key={idx}>
                        <td className="text-xs">{f.nome}</td>
                        <td><input type="number" min={1} max={tempoMeses} value={f.mesInicio} onChange={e => updateFase(idx, { mesInicio: parseInt(e.target.value) || 1 })} className="input input-xs w-16" /></td>
                        <td><input type="number" min={1} max={tempoMeses} value={f.mesFim} onChange={e => updateFase(idx, { mesFim: parseInt(e.target.value) || 1 })} className="input input-xs w-16" /></td>
                        <td><input type="number" min={0} max={1} step={0.01} value={f.percentualCusto} onChange={e => updateFase(idx, { percentualCusto: parseFloat(e.target.value) || 0 })} className="input input-xs w-20" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-2 items-center mb-3">
                <div className="w-4 h-3 bg-primary/40 rounded" />
                <span className="text-xs text-base-content/50">Nominal</span>
                <div className="w-4 h-3 bg-primary rounded ml-3" />
                <span className="text-xs text-base-content/50">Corrigido (INCC)</span>
              </div>
              <BarChart parcelas={fluxoMEI.parcelas} />

              <div className="overflow-x-auto mt-3">
                <table className="table table-xs">
                  <thead><tr><th>Mês</th><th className="text-right">Nominal</th><th className="text-right">INCC Acum.</th><th className="text-right">Corrigido</th></tr></thead>
                  <tbody>
                    {fluxoMEI.parcelas.map(p => (
                      <tr key={p.mes}>
                        <td className="font-mono text-xs">{p.mes}</td>
                        <td className="text-right font-mono text-xs">{formatCurrency(p.custoParcela)}</td>
                        <td className="text-right font-mono text-xs">{formatPercentual(p.inccAcumulado)}</td>
                        <td className="text-right font-mono text-xs">{formatCurrency(p.custoParcelaCorrigido)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="bg-base-200 rounded p-3 text-center">
                  <p className="text-xs text-base-content/50">c/ INCC MEI</p>
                  <p className="font-mono font-bold">{formatCurrency(custoDiretoComInccMEI)}</p>
                </div>
                <div className="bg-base-200 rounded p-3 text-center">
                  <p className="text-xs text-base-content/50">c/ INCC CLT</p>
                  <p className="font-mono font-bold">{formatCurrency(custoDiretoComInccCLT)}</p>
                </div>
                <div className="bg-base-200 rounded p-3 text-center">
                  <p className="text-xs text-base-content/50">Delta INCC MEI</p>
                  <p className="font-mono font-bold text-warning">{formatCurrency(custoDiretoComInccMEI - custoDiretoMEI)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-base-100 shadow">
            <div className="card-body p-4">
              <p className="font-semibold mb-1">Bloco 3 — BDI e Preço Final</p>
              <p className="text-xs text-base-content/50 mb-4">BDI: {formatPercentual(bdi)} | {areaConstruida} m²</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-primary/10 border border-primary rounded-xl p-5 text-center">
                  <MdAttachMoney className="mx-auto mb-2 text-primary" size={32} />
                  <p className="text-xs text-base-content/60 mb-1">Preço Final MEI</p>
                  <p className="text-2xl font-bold font-mono text-primary">{formatCurrency(precoFinalMEI)}</p>
                  <p className="text-xs text-base-content/50 mt-1">{formatCurrency(precoFinalMEI / areaConstruida)}/m²</p>
                </div>
                <div className="bg-secondary/10 border border-secondary rounded-xl p-5 text-center">
                  <MdAttachMoney className="mx-auto mb-2 text-secondary" size={32} />
                  <p className="text-xs text-base-content/60 mb-1">Preço Final CLT</p>
                  <p className="text-2xl font-bold font-mono text-secondary">{formatCurrency(precoFinalCLT)}</p>
                  <p className="text-xs text-base-content/50 mt-1">{formatCurrency(precoFinalCLT / areaConstruida)}/m²</p>
                  {precoFinalCLT > precoFinalMEI && (
                    <p className="text-xs text-error mt-1">+ {formatCurrency(precoFinalCLT - precoFinalMEI)} vs MEI</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-base-100 shadow">
            <div className="card-body p-4">
              <p className="font-semibold mb-1">Bloco 4 — Saídas para o Cliente</p>
              <p className="text-xs text-base-content/50 mb-4">
                Modalidade: {clienteModalidade} | Taxa: {formatPercentual(cond.taxaJurosAnual)} a.a. | Prazo: {cond.prazoMaximoMeses}m | Financiável: {formatPercentual(cond.percentualMaximoFinanciavel)}
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                <div className="card bg-base-200">
                  <div className="card-body p-4 text-center">
                    <MdAccountBalance className="mx-auto mb-2 text-primary" size={28} />
                    <p className="text-xs text-base-content/50">Aporte Mínimo (AA)</p>
                    <p className="text-xl font-bold font-mono">{formatCurrency(aaMEI)}</p>
                    <p className="text-xs text-base-content/40">{formatPercentual(1 - cond.percentualMaximoFinanciavel)} do valor total</p>
                  </div>
                </div>
                <div className="card bg-base-200">
                  <div className="card-body p-4 text-center">
                    <MdAttachMoney className="mx-auto mb-2 text-success" size={28} />
                    <p className="text-xs text-base-content/50">Parcela Price</p>
                    <p className="text-xl font-bold font-mono">{formatCurrency(parcelaMEI)}</p>
                    <p className="text-xs text-base-content/40">{cond.prazoMaximoMeses} meses</p>
                  </div>
                </div>
                <div className="card bg-base-200">
                  <div className="card-body p-4">
                    <p className="text-xs font-semibold mb-2">Tabela de Aportes</p>
                    <div className="overflow-y-auto max-h-32">
                      <table className="table table-xs">
                        <thead><tr><th>Parcela</th><th className="text-right">Valor</th></tr></thead>
                        <tbody>
                          {tabelaAportes.parcelas.slice(0, 6).map((p, i) => (
                            <tr key={i}><td className="text-xs">{p.tipo}</td><td className="text-right font-mono text-xs">{formatCurrency(p.valor)}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button onClick={salvarFases} className="btn btn-ghost btn-sm">Salvar rascunho</button>
                <button
                  onClick={() => setConfirmModal(true)}
                  disabled={jaEntregue}
                  className="btn btn-primary btn-sm gap-2"
                >
                  <MdSend size={16} />
                  {jaEntregue ? 'Entregue' : 'Entregar ao cliente'}
                </button>
              </div>
              {jaEntregue && <p className="text-xs text-success text-right mt-1">Orçamento já entregue ao cliente.</p>}
            </div>
          </div>
        </>
      )}

      {confirmModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <p className="font-bold text-lg mb-2">Confirmar entrega</p>
            <p className="text-sm text-base-content/70 mb-4">
              Ao entregar, o orçamento será marcado como <span className="font-semibold">Entregue</span> e o cliente verá os valores calculados. Esta ação não pode ser desfeita sem reabrir o orçamento.
            </p>
            <div className="bg-base-200 rounded p-3 mb-4 text-sm space-y-1">
              <p>Preço Final MEI: <span className="font-mono font-bold">{formatCurrency(precoFinalMEI)}</span></p>
              <p>Aporte Mínimo: <span className="font-mono font-bold">{formatCurrency(aaMEI)}</span></p>
              <p>Parcela Price: <span className="font-mono font-bold">{formatCurrency(parcelaMEI)}/mês</span></p>
            </div>
            <div className="modal-action">
              <button onClick={() => setConfirmModal(false)} className="btn btn-ghost btn-sm">Cancelar</button>
              <button onClick={entregarOrcamento} className="btn btn-primary btn-sm gap-1"><MdCheckCircle size={14} /> Confirmar entrega</button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setConfirmModal(false)} />
        </div>
      )}
    </div>
  )
}
