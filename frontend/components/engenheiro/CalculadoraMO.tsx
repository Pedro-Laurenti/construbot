'use client'

import { useState } from 'react'
import { calcularMOEngenheiro } from '@/lib/calculos'
import { formatCurrency } from '@/lib/formatters'
import type { EngineerData, CalculoMOConfig, CalculoMOResultado, CenarioDetalhadoMO } from '@/types'

interface Props { data: EngineerData; onUpdate: (p: Partial<EngineerData>) => void }

function defaultConfig(item: EngineerData['precificadorItens'][0]): CalculoMOConfig {
  return {
    servicoId: item.id,
    servico: item.servico,
    unidade: item.unidade,
    quantidade: item.quantidade,
    especificacao1: item.especificacao1,
    especificacao2: item.especificacao2,
    composicaoBasica: item.composicaoBasica,
    produtividadeBasica: 1.0,
    adicionalProdutividade: 0,
    proporcaoAjudante: 0.5,
    rsUN: 0,
    prazoRequerido: 30,
  }
}

function CenarioRow({ c }: { c: CenarioDetalhadoMO }) {
  return (
    <tr>
      <td><span className="badge badge-sm badge-ghost">{c.cenario}</span></td>
      <td className="text-right font-mono text-xs">{c.produtividade.toFixed(3)}</td>
      <td className="text-right font-mono text-xs">{(c.produtividade * 8).toFixed(2)}</td>
      <td className="text-right font-mono text-xs">{c.hhProfissional.toFixed(2)}</td>
      <td className="text-right font-mono text-xs">{c.hhAjudante.toFixed(2)}</td>
      <td className="text-right font-mono text-xs">{c.profissionaisNecessarios}</td>
      <td className="text-right font-mono text-xs">{c.ajudantesNecessarios}</td>
      <td className="text-right font-mono text-xs">{c.prazoEfetivoDias.toFixed(1)}</td>
      <td className="text-right font-mono text-xs">{formatCurrency(c.custoBase)}</td>
      <td className="text-right font-mono text-xs">{c.bonusCenario > 0 ? formatCurrency(c.bonusCenario) : <span className="text-base-content/30">R$ 0,00</span>}</td>
    </tr>
  )
}

export default function CalculadoraMO({ data, onUpdate }: Props) {
  const { precificadorItens, calculoMOConfigs, calculoMOResults } = data
  const [configs, setConfigs] = useState<Record<string, CalculoMOConfig>>(() => {
    const base: Record<string, CalculoMOConfig> = {}
    precificadorItens.forEach(item => {
      base[item.id] = calculoMOConfigs[item.id] ?? defaultConfig(item)
    })
    return base
  })
  const [selected, setSelected] = useState<string | null>(precificadorItens[0]?.id ?? null)

  function updateConfig(id: string, partial: Partial<CalculoMOConfig>) {
    setConfigs(prev => ({ ...prev, [id]: { ...prev[id], ...partial } }))
  }

  function calcular(id: string) {
    const cfg = configs[id]
    if (!cfg || cfg.quantidade <= 0 || cfg.produtividadeBasica <= 0) return
    const resultado = calcularMOEngenheiro(cfg)
    const newConfigs = { ...calculoMOConfigs, [id]: cfg }
    const newResults = { ...calculoMOResults, [id]: resultado }
    onUpdate({ calculoMOConfigs: newConfigs, calculoMOResults: newResults })
  }

  function calcularTodos() {
    const newConfigs = { ...calculoMOConfigs }
    const newResults = { ...calculoMOResults }
    precificadorItens.forEach(item => {
      const cfg = configs[item.id]
      if (cfg && cfg.quantidade > 0 && cfg.produtividadeBasica > 0) {
        newConfigs[item.id] = cfg
        newResults[item.id] = calcularMOEngenheiro(cfg)
      }
    })
    onUpdate({ calculoMOConfigs: newConfigs, calculoMOResults: newResults })
  }

  const config = selected ? configs[selected] : null
  const resultado: CalculoMOResultado | undefined = selected ? calculoMOResults[selected] : undefined
  const prodRequerida = config ? config.produtividadeBasica * (1 + config.adicionalProdutividade / 100) : 0

  if (precificadorItens.length === 0) {
    return (
      <div className="flex flex-col gap-4 max-w-5xl">
        <h1 className="text-2xl font-bold">Calculadora — Mão de Obra</h1>
        <div className="card bg-base-100 shadow"><div className="card-body items-center py-12"><p className="text-base-content/40">Configure serviços no Precificador primeiro.</p></div></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 max-w-full">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Calculadora — Mão de Obra</h1><p className="text-base-content/50 text-sm">Seções 6.2 a 6.8 — 3 cenários + bônus</p></div>
        <button onClick={calcularTodos} className="btn btn-primary btn-sm">Calcular Todos</button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {precificadorItens.map(item => (
          <button key={item.id} onClick={() => setSelected(item.id)} className={`btn btn-sm ${selected === item.id ? 'btn-primary' : 'btn-ghost'}`}>
            {item.servico.replace(/_/g, ' ')}
            {calculoMOResults[item.id] && <span className="badge badge-xs badge-success ml-1">calc</span>}
          </button>
        ))}
      </div>

      {config && selected && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card bg-base-100 shadow">
            <div className="card-body p-4 gap-3">
              <p className="font-semibold">Parâmetros — {config.servico.replace(/_/g, ' ')}</p>
              <p className="text-xs text-base-content/50">Qtd: {config.quantidade} {config.unidade}</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Prod. Básica SINAPI (UN/h)', key: 'produtividadeBasica' as const, step: '0.001' },
                  { label: 'Adicional Produtividade (%)', key: 'adicionalProdutividade' as const, step: '0.1' },
                  { label: 'Proporção Ajudante', key: 'proporcaoAjudante' as const, step: '0.1' },
                  { label: 'R$/UN SINAPI', key: 'rsUN' as const, step: '0.01' },
                  { label: 'Prazo Requerido (dias)', key: 'prazoRequerido' as const, step: '1' },
                ].map(({ label, key, step }) => (
                  <fieldset key={key} className="fieldset">
                    <legend className="fieldset-legend text-xs">{label}</legend>
                    <input type="number" step={step} value={config[key]} onChange={e => updateConfig(selected, { [key]: parseFloat(e.target.value) || 0 })} className="input input-sm w-full" />
                  </fieldset>
                ))}
                <div className="flex items-center gap-2 col-span-2">
                  <span className="text-xs text-base-content/50">Prod. Requerida:</span>
                  <span className="font-mono font-semibold text-sm">{prodRequerida.toFixed(3)} UN/h</span>
                </div>
              </div>
              <button onClick={() => calcular(selected)} className="btn btn-primary btn-sm w-full mt-1">Calcular</button>
            </div>
          </div>

          {resultado && (
            <div className="card bg-base-100 shadow">
              <div className="card-body p-4">
                <p className="font-semibold mb-2">Bônus de Performance</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { l: 'C SINAPI (ref.)', v: formatCurrency(resultado.cSINAPI) },
                    { l: 'Economia', v: formatCurrency(resultado.economia) },
                    { l: '56% → Profissional', v: formatCurrency(resultado.valorBonusProducaoCLT) },
                    { l: '14% → Construtora', v: formatCurrency(resultado.bonusConstrutora) },
                    { l: '30% → Cliente', v: formatCurrency(resultado.economia * 0.30) },
                  ].map(({ l, v }) => (
                    <div key={l} className="bg-base-200 rounded p-2"><p className="text-base-content/50">{l}</p><p className="font-mono font-semibold">{v}</p></div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {resultado && (
        <div className="flex flex-col gap-4">
          <div className="card bg-base-100 shadow overflow-x-auto">
            <div className="card-body p-4">
              <p className="font-semibold mb-2">Cenários de Execução</p>
              <table className="table table-xs">
                <thead>
                  <tr>
                    <th>Cenário</th><th className="text-right">UN/h</th><th className="text-right">UN/dia</th>
                    <th className="text-right">HH Prof.</th><th className="text-right">HH Ajud.</th>
                    <th className="text-right">N° Prof.</th><th className="text-right">N° Ajud.</th>
                    <th className="text-right">Prazo (dias)</th><th className="text-right">Custo Base</th><th className="text-right">Bônus</th>
                  </tr>
                </thead>
                <tbody>
                  <CenarioRow c={resultado.mensalista} />
                  <CenarioRow c={resultado.otima} />
                  <CenarioRow c={resultado.prazo} />
                </tbody>
              </table>
            </div>
          </div>

          <div className="card bg-base-100 shadow overflow-x-auto">
            <div className="card-body p-4">
              <p className="font-semibold mb-3">Contratação — Seções 6.6 e 6.8</p>
              <table className="table table-sm">
                <thead><tr><th>Campo</th><th className="text-right">MEI</th><th className="text-right">CLT</th></tr></thead>
                <tbody>
                  {[
                    { l: 'Valor de Produção / Fixo + Bônus', mei: resultado.meiValorProducao, clt: resultado.cltFixoMaisBônus },
                    { l: 'Salário Esperado', mei: resultado.salarioEsperadoMEI, clt: resultado.salarioEsperadoCLT },
                    { l: 'Valor Bônus de Produção', mei: resultado.valorBonusProducaoMEI, clt: resultado.valorBonusProducaoCLT },
                    { l: 'Valor Equivalente Total/UN (c/ Bônus)', mei: resultado.valorEquivalenteTotalUNMEI, clt: resultado.valorEquivalenteTotalUNCLT },
                    { l: 'Valor Mensal Esperado', mei: resultado.valorMensalEsperadoMEI, clt: resultado.valorMensalEsperadoCLT },
                    { l: 'Custo Final', mei: resultado.custoFinalMEI, clt: resultado.custoFinalCLT },
                    { l: 'Preço Final (BDI 20%)', mei: resultado.precoFinalMEI, clt: resultado.precoFinalCLT },
                  ].map(({ l, mei, clt }) => (
                    <tr key={l}>
                      <td className="text-xs">{l}</td>
                      <td className="text-right font-mono text-xs">{formatCurrency(mei)}</td>
                      <td className="text-right font-mono text-xs">{formatCurrency(clt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
