'use client'

import { useState, useEffect } from 'react'
import { COMPOSICOES_ANALITICAS, INSUMOS_SINAPI, UF_LIST } from '@/lib/mockData'
import { MdWarning, MdCheckCircle } from 'react-icons/md'
import type { ItemComposicao, OrcamentoEngenheiro, ConsultaSINAPIServico, InsumoResolvido } from '@/types'

interface ResultItem extends ItemComposicao {
  custoUnitario: number
  custoTotal: number
  isFallbackSP: boolean
  valorEditado?: number
}

interface Props {
  uf: string
  orcamentoId?: string
  engData?: OrcamentoEngenheiro
  onUpdateEng?: (patch: Partial<OrcamentoEngenheiro>) => void
}

export default function ConsultaComposicao({ uf: defaultUf, orcamentoId, engData, onUpdateEng }: Props) {
  const modoWizard = !!orcamentoId && !!engData
  const [encargos, setEncargos] = useState<'SEM' | 'COM'>('COM')
  const [ufSel, setUfSel] = useState(defaultUf)
  const [codigo, setCodigo] = useState('')
  const [resultado, setResultado] = useState<{ composicao: typeof COMPOSICOES_ANALITICAS[0]; itens: ResultItem[]; subtotal: number } | null>(null)
  const [erro, setErro] = useState('')
  const [servicoIdx, setServicoIdx] = useState(0)

  const VH_COM = 2664.75 * 2.6013 / (22 * 8)
  const VH_SEM = 2664.75 / (22 * 8)

  const servicos = modoWizard ? engData!.quantitativos : []
  const servicoAtual = modoWizard && servicos.length > 0 ? servicos[servicoIdx] : null

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
    onUpdateEng({ consultasSINAPI: { ...engData.consultasSINAPI, [servicoAtual.id]: consultaSINAPI } })
  }

  const hasFallback = resultado?.itens.some(i => i.isFallbackSP)
  const semPreco = resultado?.itens.filter(i => i.tipoItem === 'INSUMO' && i.custoUnitario <= 0) ?? []

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold">{modoWizard ? 'E3 — Composições SINAPI' : 'Consulta de Composição com Custo'}</h2>
        {modoWizard && servicos.length > 0 && (
          <p className="text-base-content/50 text-sm">{servicoIdx + 1} de {servicos.length} serviços</p>
        )}
      </div>

      {modoWizard && servicos.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {servicos.map((s, idx) => {
            const consultado = !!engData!.consultasSINAPI[s.id]
            return (
              <button
                key={s.id}
                onClick={() => setServicoIdx(idx)}
                className={`btn btn-sm gap-1 ${servicoIdx === idx ? 'btn-primary' : 'btn-ghost'}`}
              >
                {consultado && <MdCheckCircle size={14} className="text-success" />}
                {s.descricao}
              </button>
            )
          })}
        </div>
      )}

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
                <input type="text" value={codigo} onChange={e => setCodigo(e.target.value)} onKeyDown={e => e.key === 'Enter' && consultar()} placeholder="Ex: 87888, 87251…" className="input input-sm flex-1" />
                <button onClick={consultar} className="btn btn-primary btn-sm">Consultar</button>
              </div>
            </fieldset>
          </div>
        </div>
      </div>

      {erro && <div className="alert alert-warning text-sm">{erro}</div>}

      {hasFallback && (
        <div className="alert alert-warning text-sm flex gap-2 items-center">
          <MdWarning size={16} />
          <span>Insumos com preço de SP (fallback %AS) marcados em laranja. Edite o preço se necessário.</span>
        </div>
      )}

      {semPreco.length > 0 && (
        <div className="alert alert-error text-sm">
          {semPreco.length} insumo(s) SEM PREÇO: {semPreco.map(i => i.descricao).join(', ')}. Defina um preço antes de avançar.
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
                <button onClick={salvarConsulta} className="btn btn-success btn-sm gap-1">
                  <MdCheckCircle size={14} /> Salvar para este serviço
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Tipo</th><th>Código</th><th>Descrição</th><th>UN</th>
                    <th className="text-right">Coef.</th><th className="text-right">Custo Unit.</th>
                    <th className="text-right">Custo Total</th><th>Estado</th>
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
                        {item.tipoItem === 'INSUMO' ? (
                          <div className="flex items-center gap-1 justify-end">
                            <input
                              type="number"
                              step="0.01"
                              value={item.custoUnitario}
                              onChange={e => updatePrecoItem(idx, parseFloat(e.target.value) || 0)}
                              className={`input input-xs w-24 text-right ${item.isFallbackSP ? 'border-warning' : ''}`}
                            />
                            {item.isFallbackSP && <span className="badge badge-xs badge-warning">%AS SP</span>}
                          </div>
                        ) : (
                          <span>R$ {item.custoUnitario.toFixed(2)}</span>
                        )}
                      </td>
                      <td className="text-right font-mono text-xs font-semibold">R$ {item.custoTotal.toFixed(2)}</td>
                      <td>
                        {item.tipoItem === 'INSUMO' && item.custoUnitario <= 0 && <span className="badge badge-xs badge-error">SEM PREÇO</span>}
                        {item.tipoItem === 'INSUMO' && item.custoUnitario > 0 && !item.isFallbackSP && <span className="badge badge-xs badge-success">COM PREÇO</span>}
                        {item.tipoItem === 'INSUMO' && item.isFallbackSP && <span className="badge badge-xs badge-warning">%AS SP</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-bold">
                    <td colSpan={6} className="text-right">Subtotal:</td>
                    <td className="text-right font-mono">R$ {resultado.subtotal.toFixed(2)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
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
    </div>
  )
}
