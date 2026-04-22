'use client'

import { useState, useEffect } from 'react'
import type { GlobalParams } from '@/types'
import { COMPOSICOES_ANALITICAS, INSUMOS_SINAPI, UF_LIST } from '@/lib/mockData'
import { GLOBAL_PARAMS } from '@/lib/mockData'
import { MdCheckCircle, MdWarning, MdInfo } from 'react-icons/md'
import { formatCurrency } from '@/lib/formatters'
import type { ItemComposicao, OrcamentoEngenheiro, ConsultaSINAPIServico, InsumoResolvido } from '@/types'

interface ResultItem extends ItemComposicao {
  custoUnitario: number
  custoTotal: number
  isFallbackSP: boolean
  valorEditado?: number
}

interface Props {
  uf: string
  globalParams?: GlobalParams
  orcamentoId?: string
  engData?: OrcamentoEngenheiro
  onUpdateEng?: (patch: Partial<OrcamentoEngenheiro>) => void
}

export default function ConsultaComposicao({ uf: defaultUf, globalParams, orcamentoId, engData, onUpdateEng }: Props) {
  const modoWizard = !!orcamentoId && !!engData
  const [showInfo, setShowInfo] = useState(false)
  const [encargos, setEncargos] = useState<'SEM' | 'COM'>('COM')
  const [ufSel, setUfSel] = useState(defaultUf)
  const [codigo, setCodigo] = useState('')
  const [resultado, setResultado] = useState<{ composicao: typeof COMPOSICOES_ANALITICAS[0]; itens: ResultItem[]; subtotal: number } | null>(null)
  const [erro, setErro] = useState('')
  const [servicoIdx, setServicoIdx] = useState(() => {
    if (!modoWizard || !engData?.uiState?.servicoSelecionadoE3) return 0
    const idx = engData.quantitativos.findIndex(s => s.id === engData.uiState?.servicoSelecionadoE3)
    return idx >= 0 ? idx : 0
  })

  const params = globalParams ?? GLOBAL_PARAMS
  const VH_COM = params.salarioQualificado * params.fatorEncargos / (22 * 8)
  const VH_SEM = params.salarioQualificado / (22 * 8)

  const servicos = modoWizard ? engData!.quantitativos : []
  const servicoAtual = modoWizard && servicos.length > 0 ? servicos[servicoIdx] : null

  useEffect(() => {
    if (!modoWizard || servicos.length === 0) return
    const fromUi = engData!.uiState?.servicoSelecionadoE3
    if (fromUi) {
      const idxFromUi = servicos.findIndex(s => s.id === fromUi)
      if (idxFromUi >= 0) {
        setServicoIdx(idxFromUi)
        return
      }
    }
    const primeiroPendente = servicos.findIndex(s => !engData!.consultasSINAPI[s.id])
    const idx = primeiroPendente >= 0 ? primeiroPendente : 0
    setServicoIdx(idx)
  }, [])

  useEffect(() => {
    if (!modoWizard || !onUpdateEng || !servicoAtual) return
    onUpdateEng({ uiState: { ...(engData?.uiState ?? { etapaVisivel: 'E3' }), servicoSelecionadoE3: servicoAtual.id } })
  }, [servicoAtual?.id])

  useEffect(() => {
    if (servicoAtual?.composicaoBasica) {
      setCodigo(servicoAtual.composicaoBasica)
      consultarCodigo(servicoAtual.composicaoBasica)
    }
  }, [servicoIdx, servicoAtual?.composicaoBasica])

  function getPrecoInsumo(cod: string): { val: number | null; isFallback: boolean } {
    const insumo = INSUMOS_SINAPI.find(i => i.codigo === cod || i.codigo === cod.padStart(8, '0'))
    if (!insumo) return { val: null, isFallback: false }
    const v = insumo.precos[ufSel]
    if (v !== null && v !== undefined) return { val: v, isFallback: false }
    const sp = insumo.precos['SP']
    return { val: sp ?? null, isFallback: true }
  }

  function consultarCodigo(cod: string) {
    setErro('')
    const comp = COMPOSICOES_ANALITICAS.find(c => c.codigoComposicao === cod.trim())
    if (!comp) { setErro(`Composição "${cod}" não encontrada.`); setResultado(null); return }
    const VH = encargos === 'COM' ? VH_COM : VH_SEM
    const itens: ResultItem[] = comp.itens.map(item => {
      let custoUnit = 0
      let fallback = false
      if (item.tipoItem === 'INSUMO') {
        const { val, isFallback } = getPrecoInsumo(item.codigo)
        custoUnit = val ?? 0
        fallback = isFallback
      } else {
        custoUnit = VH
      }
      return { ...item, custoUnitario: custoUnit, custoTotal: item.coeficiente * custoUnit, isFallbackSP: fallback }
    })
    const subtotal = itens.reduce((s, i) => s + i.custoTotal, 0)
    setResultado({ composicao: comp, itens, subtotal })
  }

  function consultar() { consultarCodigo(codigo) }

  function updatePrecoItem(idx: number, valor: number) {
    if (!resultado) return
    const itens = resultado.itens.map((it, i) => {
      if (i !== idx) return it
      return { ...it, custoUnitario: valor, custoTotal: it.coeficiente * valor, valorEditado: valor }
    })
    const subtotal = itens.reduce((s, i) => s + i.custoTotal, 0)
    setResultado({ ...resultado, itens, subtotal })
  }

  function salvarConsulta() {
    if (!resultado || !servicoAtual || !onUpdateEng || !engData) return
    if (semPreco.length > 0) {
      setErro(`Insumos pendentes: ${semPreco.map(i => i.descricao).join(', ')}`)
      return
    }
    if (percFallbackServico > 40) {
      setErro(`Impacto fallback acima do limite (40%): ${percFallbackServico.toFixed(1)}% no serviço atual.`)
      return
    }
    const insumos: InsumoResolvido[] = resultado.itens.map(it => ({
      codigo: it.codigo,
      descricao: it.descricao,
      unidade: it.unidade,
      coeficiente: it.coeficiente,
      valorUnitario: it.custoUnitario,
      total: it.custoTotal,
      isFallbackSP: it.isFallbackSP,
    }))
    const consultaSINAPI: ConsultaSINAPIServico = {
      codigoComposicao: resultado.composicao.codigoComposicao,
      insumos,
      subtotal: resultado.subtotal,
    }
    const updatedConsultas = { ...engData.consultasSINAPI, [servicoAtual.id]: consultaSINAPI }
    onUpdateEng({ consultasSINAPI: updatedConsultas })
    const nextIdx = servicos.findIndex((s, i) => i !== servicoIdx && !updatedConsultas[s.id])
    if (nextIdx >= 0) setServicoIdx(nextIdx)
  }

  const hasFallback = resultado?.itens.some(i => i.isFallbackSP)
  const semPreco = resultado?.itens.filter(i => i.tipoItem === 'INSUMO' && i.custoUnitario <= 0) ?? []
  const confirmados = modoWizard ? servicos.filter(s => !!engData!.consultasSINAPI[s.id]).length : 0

  const servicoAtualQtd = servicoAtual?.quantidade ?? 1
  const servicoAtualUN = servicoAtual?.unidade ?? ''
  const subtotalUnitario = resultado ? resultado.subtotal / servicoAtualQtd : 0
  const fallbackItensAtual = resultado?.itens.filter(i => i.isFallbackSP && i.tipoItem === 'INSUMO') ?? []
  const impactoFallbackServico = fallbackItensAtual.reduce((sum, i) => sum + i.coeficiente * i.custoUnitario * servicoAtualQtd, 0)
  const totalServicoAtual = (resultado?.subtotal ?? 0) * servicoAtualQtd
  const percFallbackServico = totalServicoAtual > 0 ? (impactoFallbackServico / totalServicoAtual) * 100 : 0
  const impactoFallbackOrcamento = modoWizard
    ? Object.values(engData!.consultasSINAPI).reduce((sum, consulta) => sum + consulta.insumos.filter(i => i.isFallbackSP).reduce((s, i) => s + i.total, 0), 0)
    : 0
  const totalInsumosOrcamento = modoWizard
    ? Object.values(engData!.consultasSINAPI).reduce((sum, consulta) => sum + consulta.subtotal, 0)
    : 0
  const percFallbackOrcamento = totalInsumosOrcamento > 0 ? (impactoFallbackOrcamento / totalInsumosOrcamento) * 100 : 0

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <h2 className="text-xl font-bold flex items-center gap-1">{modoWizard ? 'E3 — Preços dos Insumos' : 'Consulta de Composição com Custo'} <button onClick={() => setShowInfo(true)} className="btn btn-ghost btn-xs btn-circle"><MdInfo size={16} /></button></h2>

      {modoWizard && percFallbackOrcamento > 0 && (
        <div className={`badge ${percFallbackOrcamento > 40 ? 'badge-error' : 'badge-warning'}`}>
          IMPACTO FALLBACK: {percFallbackOrcamento.toFixed(1)}%
        </div>
      )}

      {modoWizard && (
        <div>
          <p className="text-xs text-base-content/50">{confirmados} de {servicos.length} serviços com preços confirmados</p>
          <progress className="progress progress-success w-full" value={confirmados} max={servicos.length || 1} />
        </div>
      )}

      {modoWizard && servicos.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {servicos.map((s, idx) => {
            const consultado = !!engData!.consultasSINAPI[s.id]
            const semComposicao = !s.composicaoBasica
            return (
              <button
                key={s.id}
                onClick={() => setServicoIdx(idx)}
                className={`btn btn-xs gap-1 ${servicoIdx === idx ? 'btn-primary' : 'btn-ghost'}`}
              >
                {semComposicao ? <MdWarning size={12} className="text-error" /> : consultado && <MdCheckCircle size={12} className={servicoIdx === idx ? 'text-primary-content' : 'text-success'} />}
                {s.descricao}
              </button>
            )
          })}
        </div>
      )}

      <div className="flex items-center gap-4 flex-wrap mb-3">
        <fieldset className="fieldset">
          <legend className="fieldset-legend text-xs">Encargos Sociais</legend>
          <div className="flex gap-2">
            {(['SEM', 'COM'] as const).map(v => (
              <label key={v} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="encargos" value={v} checked={encargos === v} onChange={() => setEncargos(v)} className="radio radio-sm radio-primary" />
                <span className="text-sm">{v} ENCARGOS SOCIAIS</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="fieldset">
          <legend className="fieldset-legend text-xs">UF</legend>
          <select value={ufSel} onChange={e => setUfSel(e.target.value)} className="select select-sm">
            {UF_LIST.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </fieldset>
        {!modoWizard && (
          <fieldset className="fieldset flex-1">
            <legend className="fieldset-legend text-xs">Código da Composição</legend>
            <div className="flex gap-2">
              <input type="text" value={codigo} onChange={e => setCodigo(e.target.value)} onKeyDown={e => e.key === 'Enter' && consultar()} placeholder="Ex: 87888, 87251…" className="input input-sm flex-1" />
              <button onClick={consultar} className="btn btn-primary btn-sm">Consultar</button>
            </div>
          </fieldset>
        )}
      </div>

      {erro && <div className="alert alert-warning text-sm">{erro}</div>}

      {semPreco.length > 0 && (
        <div className="alert alert-error text-sm">
          {semPreco.length} insumo(s) SEM PREÇO: {semPreco.map(i => i.descricao).join(', ')}. Defina um preço antes de avançar.
        </div>
      )}

      {hasFallback && (
        <div className="card bg-warning/10 border border-warning/40">
          <div className="card-body p-3 text-xs">
            <p className="font-semibold text-warning">Impacto financeiro do fallback SP</p>
            <p>Serviço atual com fallback: {formatCurrency(impactoFallbackServico)} ({percFallbackServico.toFixed(1)}% do custo de insumos do serviço)</p>
            {modoWizard && <p>Acumulado no orçamento já confirmado em E3: {formatCurrency(impactoFallbackOrcamento)} ({percFallbackOrcamento.toFixed(1)}%)</p>}
          </div>
        </div>
      )}

      {resultado && (
        <div className="card bg-base-100 shadow">
          <div className="card-body p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-bold">{resultado.composicao.codigoComposicao} — {resultado.composicao.descricao}</p>
                <p className="text-xs text-base-content/50">Grupo: {resultado.composicao.grupo} · Unidade: {resultado.composicao.unidade}</p>
              </div>
              {modoWizard && (
                <button onClick={salvarConsulta} disabled={semPreco.length > 0} className="btn btn-success btn-sm gap-1">
                  <MdCheckCircle size={14} /> Confirmar preços
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Código</th><th>Descrição</th><th>UN</th>
                    <th className="text-right">Coef.</th>
                    <th className="text-right">Custo Unit.</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.itens.map((item, idx) => {
                    const total = item.coeficiente * item.custoUnitario * servicoAtualQtd
                    return (
                      <tr key={idx} className={item.isFallbackSP ? 'bg-warning/10' : item.tipoItem === 'COMPOSICAO' ? 'bg-base-200/50' : ''}>
                        <td><span className="font-mono text-xs">{item.codigo}</span><span className={`badge badge-xs ml-1 ${item.tipoItem === 'INSUMO' ? 'badge-info' : 'badge-ghost'}`}>{item.tipoItem}</span></td>
                        <td className="text-xs">{item.descricao}</td>
                        <td className="text-xs">{item.unidade}</td>
                        <td className="text-right font-mono text-xs">{item.coeficiente}</td>
                        <td className="text-right font-mono text-xs">
                          {item.tipoItem === 'INSUMO' ? (
                            <div className="flex flex-col items-end gap-0.5">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={item.custoUnitario}
                                  onChange={e => updatePrecoItem(idx, parseFloat(e.target.value) || 0)}
                                  className={`input input-xs w-24 text-right ${item.isFallbackSP ? 'border-warning' : ''}`}
                                />
                                {item.isFallbackSP && <span className="badge badge-xs badge-warning">SP</span>}
                                {item.custoUnitario <= 0 && !item.valorEditado && !item.isFallbackSP && <span className="badge badge-xs badge-error">Nunca teve</span>}
                                {item.custoUnitario <= 0 && item.valorEditado === 0 && <span className="badge badge-xs badge-error">Editado p/0</span>}
                                {item.custoUnitario <= 0 && item.isFallbackSP && <span className="badge badge-xs badge-error">Fallback falhou</span>}
                              </div>
                              {item.isFallbackSP && (
                                <p className="label text-xs text-warning">Sem pesquisa em {ufSel} neste período — usando SP como referência</p>
                              )}
                            </div>
                          ) : (
                            <span className="font-mono text-xs">{formatCurrency(item.custoUnitario)}</span>
                          )}
                        </td>
                        <td className="text-right font-mono text-xs font-semibold">{formatCurrency(total)}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="font-bold">
                    <td colSpan={5} className="text-right">Subtotal:</td>
                    <td className="text-right font-mono">{formatCurrency(resultado.subtotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="mt-2 space-y-0.5">
              <p className="text-xs text-base-content/50 font-mono">
                Custo total: {servicoAtualQtd} {servicoAtualUN} × Σ(coef × preço) = {formatCurrency(resultado.subtotal)}
              </p>
              <p className="text-xs text-base-content/50">
                Custo unitário: {formatCurrency(subtotalUnitario)} / {servicoAtualUN}
              </p>
            </div>
          </div>
        </div>
      )}

      {modoWizard && servicos.length > 1 && (
        <div className="flex justify-between">
          <button onClick={() => setServicoIdx(i => Math.max(0, i - 1))} disabled={servicoIdx === 0} className="btn btn-ghost btn-sm">Serviço anterior</button>
          <button onClick={() => setServicoIdx(i => Math.min(servicos.length - 1, i + 1))} disabled={servicoIdx === servicos.length - 1} className="btn btn-ghost btn-sm">Próximo serviço</button>
        </div>
      )}
      {showInfo && (
        <div className="modal modal-open">
          <div className="modal-box max-w-sm">
            <h3 className="font-bold mb-2">{modoWizard ? 'E3 — Preços dos Insumos' : 'Consulta de Composição'}</h3>
            <p className="text-sm text-base-content/70">Os insumos de cada serviço são carregados automaticamente da base SINAPI ({ufSel}). Verifique se os preços refletem a realidade da sua região e edite quando necessário. Estes preços alimentam o cálculo de materiais na etapa E5. Fórmula: Custo = Quantidade × Σ (coeficiente × preço)</p>
            <div className="modal-action"><button onClick={() => setShowInfo(false)} className="btn btn-sm btn-ghost">Fechar</button></div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowInfo(false)} />
        </div>
      )}
    </div>
  )
}
