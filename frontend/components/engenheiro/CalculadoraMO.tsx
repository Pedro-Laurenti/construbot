'use client'

import { useState } from 'react'
import { calcularMOEngenheiro } from '@/lib/calculos'
import { formatCurrency } from '@/lib/formatters'
import { MdCheckCircle } from 'react-icons/md'
import type { EngineerData, CalculoMOConfig, CalculoMOResultado, CenarioDetalhadoMO, OrcamentoEngenheiro, CenarioMOServico, ContratoModalidade } from '@/types'

interface Props {
  data: EngineerData
  onUpdate: (p: Partial<EngineerData>) => void
  orcamentoId?: string
  engData?: OrcamentoEngenheiro
  onUpdateEng?: (patch: Partial<OrcamentoEngenheiro>) => void
}

function defaultConfig(id: string, servico: string, unidade: string, quantidade: number, specs: string[], comp: string): CalculoMOConfig {
  return {
    servicoId: id, servico, unidade, quantidade,
    especificacao1: specs[0] ?? '', especificacao2: specs[1] ?? '',
    composicaoBasica: comp,
    produtividadeBasica: 1.0, adicionalProdutividade: 0, proporcaoAjudante: 0.5,
    rsUN: 0, prazoRequerido: 30,
  }
}

function BonusBar({ label, percent, value, color }: { label: string; percent: number; value: number; color: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs">
        <span className="text-base-content/70">{label} ({percent}%)</span>
        <span className="font-mono font-semibold">{formatCurrency(value)}</span>
      </div>
      <div className="w-full bg-base-200 rounded h-3 overflow-hidden">
        <div className={`h-3 rounded ${color}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

function CenarioCard({ c, isSelected, onSelect }: { c: CenarioDetalhadoMO; isSelected: boolean; onSelect: () => void }) {
  const COLOR: Record<string, string> = { Mensalista: 'badge-ghost', 'Ótima': 'badge-success', Prazo: 'badge-info' }
  return (
    <div onClick={onSelect} className={`card cursor-pointer border-2 transition-all ${isSelected ? 'border-primary bg-primary/5' : 'border-base-300 bg-base-100 hover:border-primary/40'}`}>
      <div className="card-body p-4 gap-3">
        <div className="flex items-center justify-between">
          <span className={`badge ${COLOR[c.cenario] ?? 'badge-ghost'}`}>{c.cenario}</span>
          {isSelected && <MdCheckCircle size={16} className="text-primary" />}
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div><p className="text-base-content/50">UN/h</p><p className="font-mono font-semibold">{c.produtividade.toFixed(3)}</p></div>
          <div><p className="text-base-content/50">Prazo</p><p className="font-mono font-semibold">{c.prazoEfetivoDias.toFixed(1)} d</p></div>
          <div><p className="text-base-content/50">Profissionais</p><p className="font-mono font-semibold">{c.profissionaisNecessarios}</p></div>
          <div><p className="text-base-content/50">Ajudantes</p><p className="font-mono font-semibold">{c.ajudantesNecessarios}</p></div>
          <div><p className="text-base-content/50">HH Prof.</p><p className="font-mono font-semibold">{c.hhProfissional.toFixed(1)}</p></div>
          <div><p className="text-base-content/50">Custo Base</p><p className="font-mono font-semibold">{formatCurrency(c.custoBase)}</p></div>
        </div>
        {c.bonusCenario > 0 && (
          <div className="text-xs text-success font-mono">+ Bônus: {formatCurrency(c.bonusCenario)}</div>
        )}
      </div>
    </div>
  )
}

export default function CalculadoraMO({ data, onUpdate, orcamentoId, engData, onUpdateEng }: Props) {
  const modoWizard = !!orcamentoId && !!engData

  const itensLista = modoWizard
    ? (engData!.quantitativos ?? []).map(q => ({
        id: q.id, servico: q.serviceType, unidade: q.unidade, quantidade: q.quantidade,
        especificacao1: q.especificacao1, especificacao2: q.especificacao2,
        composicaoBasica: q.composicaoBasica,
      }))
    : data.precificadorItens.map(item => ({
        id: item.id, servico: item.servico, unidade: item.unidade, quantidade: item.quantidade,
        especificacao1: item.especificacao1, especificacao2: item.especificacao2,
        composicaoBasica: item.composicaoBasica,
      }))

  const [configs, setConfigs] = useState<Record<string, CalculoMOConfig>>(() => {
    const base: Record<string, CalculoMOConfig> = {}
    itensLista.forEach(item => {
      const saved = modoWizard ? engData!.calculosMO[item.id]?.config : data.calculoMOConfigs[item.id]
      base[item.id] = saved ?? defaultConfig(item.id, item.servico, item.unidade, item.quantidade, [item.especificacao1, item.especificacao2], item.composicaoBasica)
    })
    return base
  })

  const [resultados, setResultados] = useState<Record<string, CalculoMOResultado>>(() => {
    const base: Record<string, CalculoMOResultado> = {}
    itensLista.forEach(item => {
      const saved = modoWizard ? engData!.calculosMO[item.id]?.resultado : data.calculoMOResults[item.id]
      if (saved) base[item.id] = saved
    })
    return base
  })

  const [cenarioSel, setCenarioSel] = useState<Record<string, 'Mensalista' | 'Ótima' | 'Prazo'>>(() => {
    const base: Record<string, 'Mensalista' | 'Ótima' | 'Prazo'> = {}
    if (modoWizard) {
      itensLista.forEach(item => {
        const saved = engData!.calculosMO[item.id]?.cenarioEscolhido
        if (saved) base[item.id] = saved
      })
    }
    return base
  })

  const [modalidades, setModalidades] = useState<Record<string, ContratoModalidade>>(() => {
    const base: Record<string, ContratoModalidade> = {}
    itensLista.forEach(item => {
      const saved = modoWizard ? engData!.calculosMO[item.id]?.modalidade : undefined
      base[item.id] = saved ?? 'MEI'
    })
    return base
  })

  const [selected, setSelected] = useState<string | null>(itensLista[0]?.id ?? null)

  function updateConfig(id: string, partial: Partial<CalculoMOConfig>) {
    setConfigs(prev => ({ ...prev, [id]: { ...prev[id], ...partial } }))
  }

  function calcular(id: string) {
    const cfg = configs[id]
    if (!cfg || cfg.quantidade <= 0 || cfg.produtividadeBasica <= 0) return
    const resultado = calcularMOEngenheiro(cfg)
    setResultados(prev => ({ ...prev, [id]: resultado }))
    if (modoWizard && onUpdateEng) {
      const cenario: CenarioMOServico = {
        config: cfg,
        resultado,
        cenarioEscolhido: cenarioSel[id] ?? 'Ótima',
        modalidade: modalidades[id] ?? 'MEI',
      }
      onUpdateEng({ calculosMO: { ...engData!.calculosMO, [id]: cenario } })
    } else {
      onUpdate({ calculoMOConfigs: { ...data.calculoMOConfigs, [id]: cfg }, calculoMOResults: { ...data.calculoMOResults, [id]: resultado } })
    }
  }

  function salvarEscolha(id: string) {
    if (!modoWizard || !onUpdateEng) return
    const res = resultados[id]
    if (!res) return
    const cenario: CenarioMOServico = {
      config: configs[id],
      resultado: res,
      cenarioEscolhido: cenarioSel[id] ?? 'Ótima',
      modalidade: modalidades[id] ?? 'MEI',
    }
    onUpdateEng({ calculosMO: { ...engData!.calculosMO, [id]: cenario } })
  }

  const config = selected ? configs[selected] : null
  const resultado = selected ? resultados[selected] : undefined
  const prodRequerida = config ? config.produtividadeBasica * (1 + config.adicionalProdutividade / 100) : 0
  const cenAtual = (selected && resultado) ? (cenarioSel[selected] === 'Mensalista' ? resultado.mensalista : cenarioSel[selected] === 'Prazo' ? resultado.prazo : resultado.otima) : null

  if (itensLista.length === 0) {
    return (
      <div className="flex flex-col gap-4 max-w-5xl">
        <h2 className="text-xl font-bold">{modoWizard ? 'E4 — Mão de Obra' : 'Calculadora — Mão de Obra'}</h2>
        <div className="card bg-base-100 shadow"><div className="card-body items-center py-12"><p className="text-base-content/40 text-sm">Configure serviços {modoWizard ? 'nos quantitativos (E2)' : 'no Precificador'} primeiro.</p></div></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 max-w-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">{modoWizard ? 'E4 — Mão de Obra' : 'Calculadora — Mão de Obra'}</h2>
          <p className="text-base-content/50 text-sm">{itensLista.length} serviço(s) · Seções 6.2 a 6.8</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {itensLista.map(item => {
          const calc = !!resultados[item.id]
          const salvo = modoWizard ? !!engData!.calculosMO[item.id] : calc
          return (
            <button key={item.id} onClick={() => setSelected(item.id)} className={`btn btn-sm gap-1 ${selected === item.id ? 'btn-primary' : 'btn-ghost'}`}>
              {salvo && <MdCheckCircle size={14} className="text-success" />}
              {item.servico.replace(/_/g, ' ')}
            </button>
          )
        })}
      </div>

      {config && selected && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="card bg-base-100 shadow">
            <div className="card-body p-4 gap-3">
              <p className="font-semibold text-sm">{config.servico.replace(/_/g, ' ')}</p>
              <p className="text-xs text-base-content/50">Qtd: {config.quantidade} {config.unidade}</p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { label: 'Prod. SINAPI (UN/h)', key: 'produtividadeBasica', step: '0.001' },
                  { label: 'Adicional Prod. (%)', key: 'adicionalProdutividade', step: '0.1' },
                  { label: 'Proporção Ajudante', key: 'proporcaoAjudante', step: '0.1' },
                  { label: 'R$/UN SINAPI', key: 'rsUN', step: '0.01' },
                  { label: 'Prazo Requerido (d)', key: 'prazoRequerido', step: '1' },
                ] as const).map(({ label, key, step }) => (
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
            <>
              <div className="card bg-base-100 shadow">
                <div className="card-body p-4 gap-3">
                  <p className="font-semibold text-sm">Cenários de Execução</p>
                  <p className="text-xs text-base-content/50">Clique para selecionar o cenário</p>
                  <div className="flex flex-col gap-2">
                    {(['Mensalista', 'Ótima', 'Prazo'] as const).map(nome => {
                      const c = nome === 'Mensalista' ? resultado.mensalista : nome === 'Ótima' ? resultado.otima : resultado.prazo
                      return <CenarioCard key={nome} c={c} isSelected={(cenarioSel[selected] ?? 'Ótima') === nome} onSelect={() => setCenarioSel(prev => ({ ...prev, [selected]: nome }))} />
                    })}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="card bg-base-100 shadow">
                  <div className="card-body p-4 gap-3">
                    <p className="font-semibold text-sm">Bônus de Performance</p>
                    {cenAtual && cenAtual.bonusCenario > 0 ? (
                      <div className="flex flex-col gap-3">
                        <div className="text-xs text-base-content/50">Total de bônus: <span className="font-mono font-bold text-success">{formatCurrency(cenAtual.bonusCenario)}</span></div>
                        <BonusBar label="Cliente" percent={30} value={cenAtual.bonusCenario * 0.30} color="bg-primary" />
                        <BonusBar label="Profissional" percent={56} value={cenAtual.bonusCenario * 0.56} color="bg-success" />
                        <BonusBar label="Construtora" percent={14} value={cenAtual.bonusCenario * 0.14} color="bg-accent" />
                      </div>
                    ) : (
                      <p className="text-xs text-base-content/40">Sem bônus no cenário selecionado.</p>
                    )}
                  </div>
                </div>

                <div className="card bg-base-100 shadow">
                  <div className="card-body p-4 gap-3">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm">Contratação MEI vs CLT</p>
                      <select className="select select-xs" value={modalidades[selected] ?? 'MEI'} onChange={e => setModalidades(prev => ({ ...prev, [selected]: e.target.value as ContratoModalidade }))}>
                        <option value="MEI">MEI</option>
                        <option value="CLT">CLT</option>
                      </select>
                    </div>
                    <table className="table table-xs">
                      <thead><tr><th>Campo</th><th className="text-right">MEI</th><th className="text-right">CLT</th></tr></thead>
                      <tbody>
                        {[
                          { l: 'Valor de Produção', mei: resultado.meiValorProducao, clt: resultado.cltFixoMaisBônus },
                          { l: 'Salário Esperado', mei: resultado.salarioEsperadoMEI, clt: resultado.salarioEsperadoCLT },
                          { l: 'Bônus Produção', mei: resultado.valorBonusProducaoMEI, clt: resultado.valorBonusProducaoCLT },
                          { l: 'Custo Final', mei: resultado.custoFinalMEI, clt: resultado.custoFinalCLT },
                        ].map(({ l, mei, clt }) => (
                          <tr key={l}>
                            <td className="text-xs">{l}</td>
                            <td className={`text-right font-mono text-xs ${modalidades[selected] === 'MEI' ? 'font-bold text-primary' : ''}`}>{formatCurrency(mei)}</td>
                            <td className={`text-right font-mono text-xs ${modalidades[selected] === 'CLT' ? 'font-bold text-primary' : ''}`}>{formatCurrency(clt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {modoWizard && (
                      <button onClick={() => salvarEscolha(selected)} className="btn btn-success btn-sm gap-1 mt-1">
                        <MdCheckCircle size={14} /> Salvar escolha
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}