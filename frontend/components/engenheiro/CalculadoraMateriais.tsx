'use client'

import { useState } from 'react'
import { INSUMOS_SINAPI, UF_LIST } from '@/lib/mockData'
import { calcularMatEngenheiro } from '@/lib/calculos'
import { formatCurrency } from '@/lib/formatters'
import type { EngineerData, CalculoMatConfig, InsumoCalculo } from '@/types'

interface Props { data: EngineerData; onUpdate: (p: Partial<EngineerData>) => void }

function emptyInsumo(): InsumoCalculo {
  return { codigoSINAPI: '', descricao: '', unidade: '', coeficiente: 0, valorUnitario: 0, total: 0 }
}

function defaultMatConfig(item: EngineerData['precificadorItens'][0]): CalculoMatConfig {
  return {
    servicoId: item.id,
    servico: item.servico,
    unidade: item.unidade,
    quantidade: item.quantidade,
    composicaoBasica: item.composicaoBasica,
    insumos: [emptyInsumo()],
  }
}

export default function CalculadoraMateriais({ data, onUpdate }: Props) {
  const { precificadorItens, calculoMatConfigs } = data
  const [configs, setConfigs] = useState<Record<string, CalculoMatConfig>>(() => {
    const base: Record<string, CalculoMatConfig> = {}
    precificadorItens.forEach(item => { base[item.id] = calculoMatConfigs[item.id] ?? defaultMatConfig(item) })
    return base
  })
  const [selected, setSelected] = useState<string | null>(precificadorItens[0]?.id ?? null)
  const [uf, setUf] = useState(data.uf)

  function getPrecoByUF(codigo: string): { valor: number; fallback: boolean } {
    const ins = INSUMOS_SINAPI.find(i => i.codigo === codigo || i.codigo === codigo.padStart(8, '0'))
    if (!ins) return { valor: 0, fallback: false }
    const v = ins.precos[uf]
    if (v !== null && v !== undefined) return { valor: v, fallback: false }
    return { valor: ins.precos['SP'] ?? 0, fallback: true }
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
    onUpdate({ calculoMatConfigs: { ...calculoMatConfigs, [servicoId]: cfg } })
  }

  const cfg = selected ? configs[selected] : null
  const totalServico = cfg ? calcularMatEngenheiro(cfg) : 0
  const totalGeral = Object.values(configs).reduce((s, c) => s + calcularMatEngenheiro(c), 0)

  if (precificadorItens.length === 0) {
    return (
      <div className="flex flex-col gap-4 max-w-5xl">
        <h1 className="text-2xl font-bold">Calculadora — Materiais</h1>
        <div className="card bg-base-100 shadow"><div className="card-body items-center py-12"><p className="text-base-content/40">Configure serviços no Precificador primeiro.</p></div></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 max-w-full">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Calculadora — Materiais</h1><p className="text-base-content/50 text-sm">Seção 7 — Insumos por serviço</p></div>
        <fieldset className="fieldset">
          <legend className="fieldset-legend text-xs">UF</legend>
          <select value={uf} onChange={e => setUf(e.target.value)} className="select select-sm">
            {UF_LIST.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </fieldset>
      </div>

      <div className="flex gap-2 flex-wrap">
        {precificadorItens.map(item => (
          <button key={item.id} onClick={() => setSelected(item.id)} className={`btn btn-sm ${selected === item.id ? 'btn-primary' : 'btn-ghost'}`}>
            {item.servico.replace(/_/g, ' ')}
            {calculoMatConfigs[item.id] && <span className="badge badge-xs badge-success ml-1">salvo</span>}
          </button>
        ))}
      </div>

      {cfg && selected && (
        <div className="card bg-base-100 shadow overflow-x-auto">
          <div className="card-body p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold">{cfg.servico.replace(/_/g, ' ')} — Qtd: {cfg.quantidade} {cfg.unidade}</p>
              <button onClick={() => salvar(selected)} className="btn btn-primary btn-sm">Salvar</button>
            </div>
            <table className="table table-sm">
              <thead>
                <tr><th>Cód. SINAPI</th><th>Descrição</th><th>UN</th><th className="text-right">Coef./UN</th><th className="text-right">Valor Unit.</th><th className="text-right">Total</th><th></th></tr>
              </thead>
              <tbody>
                {cfg.insumos.map((ins, idx) => {
                  const { fallback } = getPrecoByUF(ins.codigoSINAPI)
                  const total = ins.coeficiente * ins.valorUnitario * cfg.quantidade
                  return (
                    <tr key={idx}>
                      <td>
                        <input type="text" value={ins.codigoSINAPI} onChange={e => updateInsumo(selected, idx, 'codigoSINAPI', e.target.value)} className="input input-xs w-24" placeholder="código" />
                      </td>
                      <td className="text-xs max-w-[200px] truncate">
                        {ins.descricao || '—'}
                        {fallback && <span className="badge badge-xs badge-warning ml-1">SP</span>}
                      </td>
                      <td className="text-xs">{ins.unidade}</td>
                      <td className="text-right">
                        <input type="number" step="0.001" value={ins.coeficiente} onChange={e => updateInsumo(selected, idx, 'coeficiente', parseFloat(e.target.value) || 0)} className="input input-xs w-20 text-right" />
                      </td>
                      <td className="text-right">
                        <input type="number" step="0.01" value={ins.valorUnitario} onChange={e => updateInsumo(selected, idx, 'valorUnitario', parseFloat(e.target.value) || 0)} className="input input-xs w-24 text-right" />
                      </td>
                      <td className="text-right font-mono text-xs">{formatCurrency(total)}</td>
                      <td><button onClick={() => removeInsumo(selected, idx)} className="btn btn-ghost btn-xs text-error">×</button></td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="font-bold">
                  <td colSpan={5} className="text-right">Total do serviço:</td>
                  <td className="text-right font-mono">{formatCurrency(totalServico)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
            {cfg.insumos.length < 5 && (
              <button onClick={() => addInsumo(selected)} className="btn btn-ghost btn-xs mt-2">+ Adicionar insumo</button>
            )}
          </div>
        </div>
      )}

      <div className="card bg-base-100 shadow">
        <div className="card-body p-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold">Resumo de Materiais</p>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-2">
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
    </div>
  )
}
