'use client'

import { useState, useEffect } from 'react'
import { INSUMOS_SINAPI, UF_LIST } from '@/lib/mockData'
import { calcularMatEngenheiro } from '@/lib/calculos'
import { formatCurrency } from '@/lib/formatters'
import { MdWarning, MdCheckCircle, MdInfo } from 'react-icons/md'
import type { EngineerData, CalculoMatConfig, InsumoCalculo, OrcamentoEngenheiro } from '@/types'

interface Props {
  data: EngineerData
  onUpdate: (p: Partial<EngineerData>) => void
  orcamentoId?: string
  engData?: OrcamentoEngenheiro
  onUpdateEng?: (patch: Partial<OrcamentoEngenheiro>) => void
}

function emptyInsumo(): InsumoCalculo {
  return { codigoSINAPI: '', descricao: '', unidade: '', coeficiente: 0, valorUnitario: 0, total: 0 }
}

function defaultMatConfig(id: string, servico: string, unidade: string, quantidade: number, comp: string): CalculoMatConfig {
  return { servicoId: id, servico, unidade, quantidade, composicaoBasica: comp, insumos: [emptyInsumo()] }
}

export default function CalculadoraMateriais({ data, onUpdate, orcamentoId, engData, onUpdateEng }: Props) {
  const modoWizard = !!orcamentoId && !!engData

  const itensLista = modoWizard
    ? (engData!.quantitativos ?? []).map(q => ({ id: q.id, servico: q.serviceType, unidade: q.unidade, quantidade: q.quantidade, composicaoBasica: q.composicaoBasica }))
    : data.precificadorItens.map(i => ({ id: i.id, servico: i.servico, unidade: i.unidade, quantidade: i.quantidade, composicaoBasica: i.composicaoBasica }))

  const [showInfo, setShowInfo] = useState(false)
  const [configs, setConfigs] = useState<Record<string, CalculoMatConfig>>(() => {
    const base: Record<string, CalculoMatConfig> = {}
    itensLista.forEach(item => {
      const saved = modoWizard ? engData!.calculosMat[item.id] : data.calculoMatConfigs[item.id]
      if (saved) { base[item.id] = saved; return }
      const consultaSINAPI = modoWizard ? engData!.consultasSINAPI[item.id] : undefined
      const insumos: InsumoCalculo[] = consultaSINAPI
        ? consultaSINAPI.insumos.filter(i => i.total > 0 || i.valorUnitario > 0).map(i => ({
            codigoSINAPI: i.codigo, descricao: i.descricao, unidade: i.unidade,
            coeficiente: i.coeficiente, valorUnitario: i.valorUnitario,
            total: i.coeficiente * i.valorUnitario * item.quantidade,
          }))
        : [emptyInsumo()]
      base[item.id] = { ...defaultMatConfig(item.id, item.servico, item.unidade, item.quantidade, item.composicaoBasica), insumos }
    })
    return base
  })

  const [selected, setSelected] = useState<string | null>(() => {
    if (modoWizard) return engData?.uiState?.servicoSelecionadoE5 ?? itensLista[0]?.id ?? null
    return itensLista[0]?.id ?? null
  })
  const [uf, setUf] = useState(data.uf)

  useEffect(() => {
    if (!modoWizard || !onUpdateEng || !selected) return
    onUpdateEng({ uiState: { ...(engData?.uiState ?? { etapaVisivel: 'E5' }), servicoSelecionadoE5: selected } })
  }, [selected])

  function getPrecoByUF(codigo: string): { valor: number; fallback: boolean } {
    const ins = INSUMOS_SINAPI.find(i => i.codigo === codigo || i.codigo === codigo.padStart(8, '0'))
    if (!ins) return { valor: 0, fallback: false }
    const v = ins.precos[uf]
    if (v !== null && v !== undefined) return { valor: v, fallback: false }
    return { valor: ins.precos['SP'] ?? 0, fallback: true }
  }

  function isFallbackSP(codigoSINAPI: string): boolean {
    if (!modoWizard || !selected) return getPrecoByUF(codigoSINAPI).fallback
    const consulta = engData!.consultasSINAPI[selected]
    if (!consulta) return getPrecoByUF(codigoSINAPI).fallback
    return consulta.insumos.find(i => i.codigo === codigoSINAPI)?.isFallbackSP ?? false
  }

  function updateInsumo(servicoId: string, idx: number, field: keyof InsumoCalculo, value: string | number) {
    setConfigs(prev => {
      const cfg = { ...prev[servicoId] }
      const insumos = cfg.insumos.map((ins, i) => {
        if (i !== idx) return ins
        const updated = { ...ins, [field]: value }
        if (field === 'codigoSINAPI') {
          const ins2 = INSUMOS_SINAPI.find(s => s.codigo === (value as string) || s.codigo === (value as string).padStart(8, '0'))
          if (ins2) {
            updated.descricao = ins2.descricao
            updated.unidade = ins2.unidade
            const { valor } = getPrecoByUF(value as string)
            updated.valorUnitario = valor
          }
        }
        updated.total = (updated.coeficiente ?? 0) * (updated.valorUnitario ?? 0) * cfg.quantidade
        return updated
      })
      return { ...prev, [servicoId]: { ...cfg, insumos } }
    })
  }

  function addInsumo(servicoId: string) {
    setConfigs(prev => {
      const cfg = prev[servicoId]
      if (cfg.insumos.length >= 5) return prev
      return { ...prev, [servicoId]: { ...cfg, insumos: [...cfg.insumos, emptyInsumo()] } }
    })
  }

  function removeInsumo(servicoId: string, idx: number) {
    setConfigs(prev => {
      const cfg = prev[servicoId]
      return { ...prev, [servicoId]: { ...cfg, insumos: cfg.insumos.filter((_, i) => i !== idx) } }
    })
  }

  function salvar(servicoId: string) {
    const cfg = configs[servicoId]
    if (modoWizard && onUpdateEng) {
      const updatedMat = { ...engData!.calculosMat, [servicoId]: cfg }
      onUpdateEng({ calculosMat: updatedMat })
      const nextPendingId = itensLista.find(item => item.id !== servicoId && !updatedMat[item.id])?.id ?? null
      if (nextPendingId) setSelected(nextPendingId)
    } else {
      onUpdate({ calculoMatConfigs: { ...data.calculoMatConfigs, [servicoId]: cfg } })
    }
  }

  const cfg = selected ? configs[selected] : null
  const totalServico = cfg ? calcularMatEngenheiro(cfg) : 0
  const totalGeral = Object.values(configs).reduce((s, c) => s + calcularMatEngenheiro(c), 0)
  const impactoFallbackServico = cfg
    ? cfg.insumos.reduce((sum, ins) => {
        if (!isFallbackSP(ins.codigoSINAPI)) return sum
        return sum + ins.coeficiente * ins.valorUnitario * cfg.quantidade
      }, 0)
    : 0
  const impactoFallbackGeral = Object.values(configs).reduce((sum, c) => {
    return sum + c.insumos.reduce((local, ins) => {
      const fallback = modoWizard
        ? !!engData?.consultasSINAPI[c.servicoId]?.insumos.find(i => i.codigo === ins.codigoSINAPI && i.isFallbackSP)
        : isFallbackSP(ins.codigoSINAPI)
      if (!fallback) return local
      return local + ins.coeficiente * ins.valorUnitario * c.quantidade
    }, 0)
  }, 0)
  const percFallbackGeral = totalGeral > 0 ? (impactoFallbackGeral / totalGeral) * 100 : 0

  const salvos = modoWizard ? itensLista.filter(i => !!engData!.calculosMat[i.id]).length : 0

  if (itensLista.length === 0) {
    return (
      <div className="flex flex-col gap-4 max-w-5xl">
        <h2 className="text-xl font-bold">{modoWizard ? 'E5 — Custo de Materiais' : 'Calculadora — Materiais'}</h2>
        <div className="card bg-base-100 shadow"><div className="card-body items-center py-12"><p className="text-base-content/40 text-sm">Configure serviços {modoWizard ? 'nos quantitativos (E2)' : 'no Precificador'} primeiro.</p></div></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 max-w-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-1">{modoWizard ? 'E5 — Custo de Materiais' : 'Calculadora — Materiais'} <button onClick={() => setShowInfo(true)} className="btn btn-ghost btn-xs btn-circle"><MdInfo size={16} /></button></h2>
        </div>
        <fieldset className="fieldset">
          <legend className="fieldset-legend text-xs">UF</legend>
          <select value={uf} onChange={e => setUf(e.target.value)} className="select select-sm">
            {UF_LIST.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </fieldset>
      </div>

      {modoWizard && (
        <div>
          <p className="text-xs text-base-content/50">{salvos} de {itensLista.length} serviços com materiais salvos</p>
          <progress className="progress progress-primary w-full" value={salvos} max={itensLista.length || 1} />
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {itensLista.map(item => {
          const salvo = modoWizard ? !!engData!.calculosMat[item.id] : !!data.calculoMatConfigs[item.id]
          return (
            <button key={item.id} onClick={() => setSelected(item.id)} className={`btn btn-sm gap-1 ${selected === item.id ? 'btn-primary' : 'btn-ghost'}`}>
              {salvo && <MdCheckCircle size={14} className={selected === item.id ? 'text-primary-content' : 'text-success'} />}
              {item.servico.replace(/_/g, ' ')}
            </button>
          )
        })}
      </div>

      {cfg && selected && (
        <div className="card bg-base-100 shadow overflow-x-auto">
          <div className="card-body p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold">{cfg.servico.replace(/_/g, ' ')} — Qtd: {cfg.quantidade} {cfg.unidade}</p>
              <button onClick={() => salvar(selected)} className="btn btn-primary btn-sm gap-1"><MdCheckCircle size={14} /> Salvar</button>
            </div>
            <table className="table table-sm">
              <thead>
                  <tr><th>Cód. SINAPI</th><th>Descrição</th><th>UN</th><th className="text-right">Coef./UN</th><th className="text-right">Valor Unit.</th><th className="text-right">Custo/UN</th><th className="text-right">Total</th><th></th></tr>
              </thead>
              <tbody>
                {cfg.insumos.map((ins, idx) => {
                  const fallback = isFallbackSP(ins.codigoSINAPI)
                  const total = ins.coeficiente * ins.valorUnitario * cfg.quantidade
                  return (
                    <tr key={idx} className={fallback ? 'bg-warning/10' : ''}>
                      <td>
                        {modoWizard && ins.codigoSINAPI ? (
                          <span className="font-mono text-xs">{ins.codigoSINAPI}<span className="badge badge-info badge-xs ml-1">E3</span></span>
                        ) : (
                          <input type="text" value={ins.codigoSINAPI} onChange={e => updateInsumo(selected, idx, 'codigoSINAPI', e.target.value)} className="input input-xs w-24" placeholder="código" />
                        )}
                      </td>
                      <td className="text-xs max-w-[200px] truncate">
                        {ins.descricao || '—'}
                        {fallback && (
                          <span className="badge badge-xs badge-warning ml-1 gap-1">
                            <MdWarning size={10} /> SP
                          </span>
                        )}
                      </td>
                      <td className="text-xs">{ins.unidade}</td>
                      <td className="text-right">
                        <input type="number" step="0.001" value={ins.coeficiente} onChange={e => updateInsumo(selected, idx, 'coeficiente', parseFloat(e.target.value) || 0)} className="input input-xs w-20 text-right" />
                      </td>
                      <td className="text-right">
                        <input type="number" step="0.01" value={ins.valorUnitario} onChange={e => updateInsumo(selected, idx, 'valorUnitario', parseFloat(e.target.value) || 0)} className={`input input-xs w-24 text-right ${fallback ? 'border-warning' : ''}`} />
                      </td>
                      <td className="text-right font-mono text-xs">{formatCurrency(ins.coeficiente * ins.valorUnitario)}</td>
                      <td className="text-right font-mono text-xs">{formatCurrency(total)}</td>
                      <td><button onClick={() => removeInsumo(selected, idx)} className="btn btn-ghost btn-xs text-error">×</button></td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={6} className="text-right text-xs text-base-content/50">Subtotal de insumos:</td>
                  <td className="text-right font-mono text-xs">{formatCurrency(totalServico)}</td>
                  <td />
                </tr>
                <tr className="font-bold">
                  <td colSpan={6} className="text-right">Custo unitário ({cfg.unidade}):</td>
                  <td className="text-right font-mono">{formatCurrency(cfg.quantidade > 0 ? totalServico / cfg.quantidade : 0)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
            {cfg.insumos.length < 5 && (
              <button onClick={() => addInsumo(selected)} className="btn btn-ghost btn-xs mt-2">+ Adicionar insumo</button>
            )}
            {impactoFallbackServico > 0 && (
              <div className="mt-3 alert alert-warning text-xs py-2">
                Impacto de fallback SP neste serviço: {formatCurrency(impactoFallbackServico)}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="card bg-base-100 shadow">
        <div className="card-body p-4">
          {impactoFallbackGeral > 0 && (
            <div className="alert alert-warning text-xs mb-3 py-2">
              Exposição total a fallback SP em materiais: {formatCurrency(impactoFallbackGeral)} ({percFallbackGeral.toFixed(1)}% do custo de materiais)
            </div>
          )}
          <div className="flex gap-4 text-xs text-base-content/50 mb-3 flex-wrap">
            {itensLista.map(item => {
              const c = configs[item.id]
              const t = c ? calcularMatEngenheiro(c) : 0
              return (
                <span key={item.id}>
                  {item.servico.replace(/_/g, ' ')}: <span className="font-mono text-base-content/70">{formatCurrency(t)}</span>
                </span>
              )
            })}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-base-200 rounded p-3 text-center">
              <p className="text-xs text-base-content/50">Total Materiais</p>
              <p className="font-mono font-bold">{formatCurrency(totalGeral)}</p>
            </div>
            <div className="bg-base-200 rounded p-3 text-center">
              <p className="text-xs text-base-content/50">BDI 20%</p>
              <p className="font-mono font-bold">{formatCurrency(totalGeral * 0.2)}</p>
            </div>
            <div className="bg-base-200 rounded p-3 text-center">
              <p className="text-xs text-base-content/50">Preço Final Mat.</p>
              <p className="font-mono font-bold">{formatCurrency(totalGeral * 1.2)}</p>
            </div>
          </div>
        </div>
      </div>
      {showInfo && (
        <div className="modal modal-open">
          <div className="modal-box max-w-sm">
            <h3 className="font-bold mb-2">{modoWizard ? 'E5 — Custo de Materiais' : 'Calculadora — Materiais'}</h3>
            <p className="text-sm text-base-content/70">Os insumos abaixo foram importados dos preços confirmados na etapa E3. Revise os coeficientes e ajuste valores caso necessário antes de salvar.</p>
            <div className="modal-action"><button onClick={() => setShowInfo(false)} className="btn btn-sm btn-ghost">Fechar</button></div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowInfo(false)} />
        </div>
      )}
    </div>
  )
}

