'use client'

import { useState } from 'react'
import { COMPOSICOES_ANALITICAS, INSUMOS_SINAPI, UF_LIST } from '@/lib/mockData'
import type { ItemComposicao } from '@/types'

interface Props { uf: string }

interface ResultItem extends ItemComposicao {
  custoUnitario: number
  custoTotal: number
  percentualAS: number
}

export default function ConsultaComposicao({ uf: defaultUf }: Props) {
  const [encargos, setEncargos] = useState<'SEM' | 'COM'>('COM')
  const [ufSel, setUfSel] = useState(defaultUf)
  const [codigo, setCodigo] = useState('')
  const [resultado, setResultado] = useState<{ composicao: typeof COMPOSICOES_ANALITICAS[0]; itens: ResultItem[]; subtotal: number } | null>(null)
  const [erro, setErro] = useState('')

  const VH_COM = 2664.75 * 2.6013 / (22 * 8)
  const VH_SEM = 2664.75 / (22 * 8)

  function getPrecoInsumo(cod: string, fallbackSP: { val: number | null; isFallback: boolean }): { val: number | null; isFallback: boolean } {
    const insumo = INSUMOS_SINAPI.find(i => i.codigo === cod || i.codigo === cod.padStart(8, '0'))
    if (!insumo) return fallbackSP
    const v = insumo.precos[ufSel]
    if (v !== null && v !== undefined) return { val: v, isFallback: false }
    const sp = insumo.precos['SP']
    return { val: sp ?? null, isFallback: true }
  }

  function consultar() {
    setErro('')
    const comp = COMPOSICOES_ANALITICAS.find(c => c.codigoComposicao === codigo.trim())
    if (!comp) { setErro(`Composição "${codigo}" não encontrada na base de dados.`); setResultado(null); return }

    const itens: ResultItem[] = comp.itens.map(item => {
      let custoUnit = 0
      let pAS = 0
      if (item.tipoItem === 'INSUMO') {
        const { val, isFallback } = getPrecoInsumo(item.codigo, { val: null, isFallback: false })
        custoUnit = val ?? 0
        pAS = isFallback ? 100 : 0
      } else {
        custoUnit = encargos === 'COM' ? VH_COM : VH_SEM
        pAS = 0
      }
      return { ...item, custoUnitario: custoUnit, custoTotal: item.coeficiente * custoUnit, percentualAS: pAS }
    })

    const subtotal = itens.reduce((s, i) => s + i.custoTotal, 0)
    setResultado({ composicao: comp, itens, subtotal })
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Consulta de Composição com Custo</h1>
        <p className="text-base-content/50 text-sm">Seção 3.3 — Consulta interativa com %AS</p>
      </div>

      <div className="card bg-base-100 shadow">
        <div className="card-body p-4 gap-4">
          <div className="flex flex-wrap gap-4">
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
            <fieldset className="fieldset flex-1">
              <legend className="fieldset-legend text-xs">Código da Composição</legend>
              <div className="flex gap-2">
                <input type="text" value={codigo} onChange={e => setCodigo(e.target.value)} onKeyDown={e => e.key === 'Enter' && consultar()} placeholder="Ex: 87888, 87251..." className="input input-sm flex-1" />
                <button onClick={consultar} className="btn btn-primary btn-sm">Consultar</button>
              </div>
            </fieldset>
          </div>
        </div>
      </div>

      {erro && <div className="alert alert-warning text-sm">{erro}</div>}

      {resultado && (
        <div className="card bg-base-100 shadow">
          <div className="card-body p-4">
            <div className="mb-3">
              <p className="font-bold text-base">{resultado.composicao.codigoComposicao} — {resultado.composicao.descricao}</p>
              <p className="text-xs text-base-content/50">Grupo: {resultado.composicao.grupo} · Unidade: {resultado.composicao.unidade}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Tipo</th><th>Código</th><th>Descrição</th><th>UN</th>
                    <th className="text-right">Coef.</th><th className="text-right">Custo Unit.</th>
                    <th className="text-right">Custo Total</th><th className="text-right">%AS</th><th>Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.itens.map((item, idx) => (
                    <tr key={idx} className={item.tipoItem === 'COMPOSICAO' ? 'bg-base-200/50' : ''}>
                      <td><span className={`badge badge-xs ${item.tipoItem === 'INSUMO' ? 'badge-info' : 'badge-ghost'}`}>{item.tipoItem}</span></td>
                      <td className="font-mono text-xs">{item.codigo}</td>
                      <td className="text-xs">{item.descricao}</td>
                      <td className="text-xs">{item.unidade}</td>
                      <td className="text-right font-mono text-xs">{item.coeficiente}</td>
                      <td className="text-right font-mono text-xs">
                        R$ {item.custoUnitario.toFixed(2)}
                        {item.percentualAS === 100 && <span className="badge badge-xs badge-warning ml-1">SP</span>}
                      </td>
                      <td className="text-right font-mono text-xs font-semibold">R$ {item.custoTotal.toFixed(2)}</td>
                      <td className="text-right text-xs">{item.percentualAS}%</td>
                      <td><span className="badge badge-xs badge-ghost text-xs">{item.situacao}</span></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-bold">
                    <td colSpan={6} className="text-right">Subtotal (Nível 0):</td>
                    <td className="text-right font-mono">R$ {resultado.subtotal.toFixed(2)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
