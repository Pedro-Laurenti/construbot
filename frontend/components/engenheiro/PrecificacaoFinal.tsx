'use client'

import { useEffect, useState } from 'react'
import { PLANTAS_PADRAO, CONDICOES_FINANCIAMENTO, FASES_OBRA_PADRAO } from '@/lib/mockData'
import { calcularFluxoCaixaINCC, calcularParcelaPrice, calcularAporteMinimo, calcularTabelaAportes, calcularMatEngenheiro } from '@/lib/calculos'
import { formatCurrency, formatPercentual } from '@/lib/formatters'
import { MdSend, MdAttachMoney, MdAccountBalance, MdCheckCircle, MdInsertChart, MdInfo } from 'react-icons/md'
import type { AppSession, EngineerData, Orcamento, SaidaCliente, OrcamentoEngenheiro, FaseObra } from '@/types'

interface Props {
  data: EngineerData
  onUpdate: (p: Partial<EngineerData>) => void
  orcamentos: Orcamento[]
  orcamentoId?: string
  engData?: OrcamentoEngenheiro
  onUpdateEng?: (patch: Partial<OrcamentoEngenheiro>) => void
  onUpdateSession?: (updater: (prev: AppSession) => AppSession) => void
  onEntregar?: () => void
  actionToken?: number
  actionType?: 'salvar' | 'entregar' | null
  onWizardStateChange?: (state: { prontoParaEntrega: boolean; jaEntregue: boolean }) => void
}

function BarChart({ parcelas }: { parcelas: { mes: number; custoParcela: number; custoParcelaCorrigido: number }[] }) {
  const maxVal = Math.max(...parcelas.map(p => p.custoParcelaCorrigido), 1)
  const W = 48
  const GAP = 6
  const HEIGHT = 80
  const AXIS_LEFT = 22
  const total = parcelas.length
  const svgWidth = total * (W + GAP) + GAP + AXIS_LEFT
  const yTicks = [0, maxVal / 2, maxVal]

  return (
    <div className="overflow-x-auto">
      <svg width={svgWidth} height={HEIGHT + 28} className="block">
        <line x1={AXIS_LEFT} y1={0} x2={AXIS_LEFT} y2={HEIGHT} className="stroke-base-content/20" strokeWidth="1" />
        {yTicks.map((tick, idx) => {
          const y = HEIGHT - Math.round((tick / maxVal) * HEIGHT)
          return (
            <g key={idx}>
              <line x1={AXIS_LEFT - 3} y1={y} x2={svgWidth} y2={y} className="stroke-base-content/10" strokeWidth="1" />
              <text x={AXIS_LEFT - 5} y={y + 3} fontSize={8} textAnchor="end" className="fill-base-content/40">{Math.round(tick / 1000)}k</text>
            </g>
          )
        })}
        {parcelas.map((p, i) => {
          const x = AXIS_LEFT + GAP + i * (W + GAP)
          const hNom = Math.round((p.custoParcela / maxVal) * HEIGHT)
          const hCorr = Math.round((p.custoParcelaCorrigido / maxVal) * HEIGHT)
          return (
            <g key={p.mes}>
              <rect x={x} y={HEIGHT - hNom} width={W * 0.45} height={hNom} className="fill-primary/40" rx="2">
                <title>{`Mês ${p.mes} · Nominal ${formatCurrency(p.custoParcela)}`}</title>
              </rect>
              <rect x={x + W * 0.5} y={HEIGHT - hCorr} width={W * 0.45} height={hCorr} className="fill-primary" rx="2">
                <title>{`Mês ${p.mes} · Corrigido ${formatCurrency(p.custoParcelaCorrigido)}`}</title>
              </rect>
              <text x={x + W / 2} y={HEIGHT + 14} fontSize={9} textAnchor="middle" className="fill-base-content/60">{p.mes}</text>
            </g>
          )
        })}
      </svg>
      <div className="flex items-center gap-3 text-xs text-base-content/60 mt-1">
        <span className="inline-flex items-center gap-1"><span className="w-3 h-2 rounded bg-primary/40" /> Nominal</span>
        <span className="inline-flex items-center gap-1"><span className="w-3 h-2 rounded bg-primary" /> Corrigido</span>
      </div>
    </div>
  )
}

export default function PrecificacaoFinal({ data, onUpdate, orcamentos, orcamentoId: orcamentoIdProp, engData: engDataProp, onUpdateEng, onUpdateSession, onEntregar, actionToken, actionType, onWizardStateChange }: Props) {
  const modoWizard = !!orcamentoIdProp && !!engDataProp

  const [selectedOrcId, setSelectedOrcId] = useState(orcamentoIdProp ?? '')
  const [showInfo, setShowInfo] = useState(false)
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
  const somaFases = fasesObra.reduce((sum, fase) => sum + fase.percentualCusto, 0)
  const fasesValidadas = Math.abs(somaFases - 1) <= 0.001

  function getDistribuicaoMensal(): number[] {
    const meses = Math.max(1, tempoMeses)
    const distribuicao = Array.from({ length: meses }, () => 0)
    fasesObra.forEach(fase => {
      const inicio = Math.max(1, fase.mesInicio)
      const fim = Math.min(meses, fase.mesFim)
      const duracao = Math.max(1, fim - inicio + 1)
      const parcelaMes = fase.percentualCusto / duracao
      for (let m = inicio; m <= fim; m++) distribuicao[m - 1] += parcelaMes
    })
    const soma = distribuicao.reduce((s, v) => s + v, 0)
    if (soma <= 0) return Array.from({ length: meses }, () => 1 / meses)
    return distribuicao.map(v => v / soma)
  }

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
  const distribuicaoMensal = getDistribuicaoMensal()
  const fluxoMEI = calcularFluxoCaixaINCC(custoDiretoMEI, tempoMeses, incc, distribuicaoMensal)
  const fluxoCLT = calcularFluxoCaixaINCC(custoDiretoCLT, tempoMeses, incc, distribuicaoMensal)
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
    const detalheEntrega = { etapa: 'E6' as const, data: new Date().toISOString(), usuario: 'engenheiro_local', motivo: 'entrega_cliente' }
    const saida: SaidaCliente = {
      valorMinimoEntrada: aaMEI,
      parcelaMensalPrice: parcelaMEI,
      tabelaAportes,
      prazoTotalObraMeses: tempoMeses,
      precoFinalObra: precoFinalMEI,
      sinapiRef: engData.sinapiRef ?? data.mesReferenciaSINAPI,
    }
    if (onUpdateSession) {
      onUpdateSession(prev => ({
        ...prev,
        orcamentos: prev.orcamentos.map(o =>
          o.id === orcamento.id ? { ...o, status: 'entregue' as const, saida } : o
        ),
      }))
    }
    const now = new Date().toISOString()
    const updatedEng = {
      ...data.orcamentosEngenheiro,
      [orcamento.id]: {
        ...engData,
        etapaAtual: 'ENTREGUE' as const,
        sinapiRef: engData.sinapiRef ?? data.mesReferenciaSINAPI,
        logEtapas: [...(engData.logEtapas ?? []), { etapa: 'E6', concluidaEm: now }],
        logEtapasDetalhado: [...(engData.logEtapasDetalhado ?? []), detalheEntrega],
      },
    }
    onUpdate({ orcamentosEngenheiro: updatedEng })
    if (onUpdateEng) onUpdateEng({ etapaAtual: 'ENTREGUE' })
    setConfirmModal(false)
    if (onEntregar) onEntregar()
  }

  const jaEntregue = engData?.etapaAtual === 'ENTREGUE'
  const showContent = (modoWizard || !!selectedOrcId) && rows.length > 0
  const checklistEntrega = {
    custosConsolidados: rows.length > 0,
    materiaisSalvos: rows.every(r => r.custoMat > 0),
    maoObraSalva: rows.every(r => r.custoMoMEI > 0 || r.custoMoCLT > 0),
    cronogramaValido: fasesObra.length > 0 && fasesObra.every(f => f.percentualCusto > 0) && fasesValidadas,
    saidaClienteValida: aaMEI > 0 && parcelaMEI > 0 && (tabelaAportes?.length ?? 0) > 0,
  }
  const prontoParaEntrega = Object.values(checklistEntrega).every(Boolean)

  useEffect(() => {
    if (!modoWizard || !onWizardStateChange) return
    onWizardStateChange({ prontoParaEntrega, jaEntregue })
  }, [jaEntregue, modoWizard, onWizardStateChange, prontoParaEntrega])

  useEffect(() => {
    if (!modoWizard || !actionToken || !actionType) return
    if (actionType === 'salvar') salvarFases()
    if (actionType === 'entregar' && !jaEntregue && prontoParaEntrega) setConfirmModal(true)
  }, [actionToken, actionType, jaEntregue, modoWizard, prontoParaEntrega])

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <h2 className="text-xl font-bold flex items-center gap-1">E6 — Precificação Final <button onClick={() => setShowInfo(true)} className="btn btn-ghost btn-xs btn-circle"><MdInfo size={16} /></button></h2>

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
          <details className="collapse collapse-arrow bg-base-100 shadow rounded-2xl">
            <summary className="collapse-title font-semibold py-3 px-4 min-h-0">
              Bloco 1 — Consolidação de Custos Diretos
              <span className="text-xs text-base-content/50 ml-2 font-normal">MEI {formatCurrency(custoDiretoMEI)} · CLT {formatCurrency(custoDiretoCLT)}</span>
            </summary>
            <div className="collapse-content overflow-x-auto">
              <p className="text-xs text-base-content/50 mb-3">Soma de mão de obra (MEI e CLT) e materiais por serviço antes de índices e margens.</p>
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
          </details>

          <details className="collapse collapse-arrow bg-base-100 shadow rounded-2xl">
            <summary className="collapse-title font-semibold py-3 px-4 min-h-0">
              <span className="flex items-center justify-between w-full pr-2">
                <span>
                  Bloco 2 — Cronograma e Correção INCC
                  <span className="text-xs text-base-content/50 ml-2 font-normal">+{formatCurrency(custoDiretoComInccMEI - custoDiretoMEI)} INCC</span>
                </span>
                <button onClick={e => { e.preventDefault(); salvarFases() }} className={`btn btn-ghost btn-xs gap-1 z-10 ${modoWizard ? 'hidden' : ''}`} title="Salvar fases">
                  {rascunhoSalvo ? <MdCheckCircle size={14} className="text-success" /> : <MdInsertChart size={14} />}
                  Salvar fases
                </button>
              </span>
            </summary>
            <div className="collapse-content">
              <p className="text-xs text-base-content/50 mb-2">Distribua os custos por fase para calcular o impacto do INCC ao longo da obra.</p>
              <p className="text-xs text-base-content/50 mb-4">INCC Mensal: {formatPercentual(incc)} | Prazo: {tempoMeses} meses</p>
              <div className={`badge ${fasesValidadas ? 'badge-success' : 'badge-error'} mb-2`}>Soma das fases: {(somaFases * 100).toFixed(1)}%</div>

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
          </details>

          <div className="card bg-base-100 shadow">
            <div className="card-body p-4">
              <p className="font-semibold mb-1">Bloco 3 — Preço Final com BDI (MEI × CLT)</p>
              <p className="text-xs text-base-content/50 mb-4">BDI ({formatPercentual(bdi)}) inclui: administração central, tributos sobre faturamento, riscos e imprevistos, lucro. Editável em E1. Área: {areaConstruida} m².</p>
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
              <p className="font-semibold mb-1">Bloco 4 — Entrega ao Cliente</p>
              <p className="text-xs text-base-content/50 mb-4">
                Modalidade: {clienteModalidade} | Taxa: {formatPercentual(cond.taxaJurosAnual)} a.a. | Prazo: {cond.prazoMaximoMeses}m | Financiável: {formatPercentual(cond.percentualMaximoFinanciavel)}
              </p>
              <div className="grid grid-cols-3 gap-4 mb-4">
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
                    <p className="text-xs text-base-content/50">Parcela Mensal (Price)</p>
                    <p className="text-xl font-bold font-mono">{formatCurrency(parcelaMEI)}</p>
                    <p className="text-xs text-base-content/40">{cond.prazoMaximoMeses} meses — {clienteModalidade}</p>
                  </div>
                </div>
                <div className="card bg-base-200">
                  <div className="card-body p-4 text-center">
                    <MdInsertChart className="mx-auto mb-2 text-info" size={28} />
                    <p className="text-xs text-base-content/50">Prazo da Obra</p>
                    <p className="text-xl font-bold font-mono">{tempoMeses} meses</p>
                    <p className="text-xs text-base-content/40">{planta?.nome ?? 'planta padrão'}</p>
                  </div>
                </div>
              </div>
              <div className="mb-6">
                <div className="card bg-base-200">
                  <div className="card-body p-4">
                    <p className="text-xs font-semibold mb-2">Tabela de Aportes</p>
                    <div className="overflow-y-auto max-h-32">
                      <table className="table table-xs">
                        <thead><tr><th>Parcela</th><th className="text-right">Valor</th></tr></thead>
                        <tbody>
                          {(tabelaAportes ?? []).slice(0, 6).map((p, i) => (
                            <tr key={i}><td className="text-xs">Mês {p.mes}</td><td className="text-right font-mono text-xs">{formatCurrency(p.desembolsoTotal)}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`flex gap-3 justify-end ${modoWizard ? 'hidden' : ''}`}>
                <button onClick={salvarFases} className="btn btn-ghost btn-sm">Salvar rascunho</button>
                <button
                  onClick={() => setConfirmModal(true)}
                  disabled={jaEntregue || !prontoParaEntrega}
                  className="btn btn-primary btn-sm gap-2"
                >
                  <MdSend size={16} />
                  {jaEntregue ? 'Entregue' : 'Entregar ao cliente'}
                </button>
              </div>
              {!prontoParaEntrega && (
                <p className="text-xs text-warning text-right mt-1">
                  Checklist pendente para entrega: {!checklistEntrega.custosConsolidados ? 'consolidação' : ''}{!checklistEntrega.materiaisSalvos ? ' materiais' : ''}{!checklistEntrega.maoObraSalva ? ' mão de obra' : ''}{!checklistEntrega.cronogramaValido ? ' cronograma' : ''}{!checklistEntrega.saidaClienteValida ? ' saída cliente' : ''}
                </p>
              )}
              {jaEntregue && <p className="text-xs text-success text-right mt-1">Orçamento já entregue ao cliente.</p>}
            </div>
          </div>
        </>
      )}

      {confirmModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <p className="font-bold text-lg mb-2">Confirmar entrega ao cliente</p>
            <p className="text-sm text-base-content/70 mb-4">
              O orçamento será marcado como <span className="font-semibold">Entregue</span> e os valores abaixo serão disponibilizados ao cliente.
            </p>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-base-200 rounded p-3 text-center">
                <p className="text-xs text-base-content/50">Aporte Mínimo (AA)</p>
                <p className="font-mono font-bold">{formatCurrency(aaMEI)}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <div className="bg-base-200 rounded p-3 text-center">
                  <p className="text-xs text-base-content/50">Desconto Cliente (MEI)</p>
                  <p className="font-mono font-bold">{formatCurrency(rows.reduce((sum, r) => sum + (engData?.calculosMO[r.id]?.resultado.descontoCliente ?? 0), 0))}</p>
                </div>
                <div className="bg-base-200 rounded p-3 text-center">
                  <p className="text-xs text-base-content/50">Desconto Cliente (%)</p>
                  <p className="font-mono font-bold">22% MEI / 30% CLT</p>
                </div>
                <div className="bg-base-200 rounded p-3 text-center">
                  <p className="text-xs text-base-content/50">Distribuição fases</p>
                  <p className={`font-mono font-bold ${fasesValidadas ? 'text-success' : 'text-error'}`}>{fasesValidadas ? '100% OK' : 'Ajustar para 100%'}</p>
                </div>
              </div>
              <div className="bg-base-200 rounded p-3 text-center">
                <p className="text-xs text-base-content/50">Parcela Mensal</p>
                <p className="font-mono font-bold">{formatCurrency(parcelaMEI)}</p>
              </div>
              <div className="bg-base-200 rounded p-3 text-center">
                <p className="text-xs text-base-content/50">Prazo da Obra</p>
                <p className="font-mono font-bold">{tempoMeses} meses</p>
              </div>
            </div>
            <div className="modal-action">
              <button onClick={() => setConfirmModal(false)} className="btn btn-ghost btn-sm">Cancelar</button>
              <button onClick={entregarOrcamento} className="btn btn-primary btn-sm gap-1"><MdCheckCircle size={14} /> Confirmar entrega</button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setConfirmModal(false)} />
        </div>
      )}

      {showInfo && (
        <div className="modal modal-open">
          <div className="modal-box max-w-sm">
            <h3 className="font-bold mb-2">E6 — Precificação Final</h3>
            <p className="text-sm text-base-content/70">Consolidação dos custos de mão de obra (E4) e materiais (E5), aplicação do INCC e BDI e geração dos valores finais para entrega ao cliente.</p>
            <div className="modal-action"><button onClick={() => setShowInfo(false)} className="btn btn-sm btn-ghost">Fechar</button></div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowInfo(false)} />
        </div>
      )}
    </div>
  )
}
