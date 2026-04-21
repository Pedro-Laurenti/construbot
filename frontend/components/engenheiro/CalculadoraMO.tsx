'use client'

import { useState, useEffect, useRef } from 'react'
import { calcularMOEngenheiro } from '@/lib/calculos'
import { formatCurrency } from '@/lib/formatters'
import { COMPOSICOES_PROFISSIONAIS } from '@/lib/mockData'
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

function CenarioCard({ c, isSelected, onSelect, prazoRequerido }: { c: CenarioDetalhadoMO; isSelected: boolean; onSelect: () => void; prazoRequerido?: number }) {
  const COLOR: Record<string, string> = { Mensalista: 'badge-ghost', 'Ótima': 'badge-success', Prazo: 'badge-info' }
  const SUBTEXTO: Record<string, string> = {
    Mensalista: '80% do SINAPI — ritmo conservador. Base de comparação.',
    'Ótima': '125% do SINAPI — menor custo por unidade. Recomendado para empreita.',
    Prazo: `Equipe dimensionada para cumprir ${prazoRequerido ?? 30} dias.`,
  }
  return (
    <div onClick={onSelect} className={`card cursor-pointer border-2 transition-all ${isSelected ? 'border-primary bg-primary/5' : 'border-base-300 bg-base-100 hover:border-primary/40'}`}>
      <div className="card-body p-4 gap-3">
        <div className="flex items-center justify-between">
          <span className={`badge ${COLOR[c.cenario] ?? 'badge-ghost'}`}>{c.cenario}</span>
          {isSelected && <MdCheckCircle size={16} className="text-primary" />}
        </div>
        <p className="text-xs text-base-content/40">{SUBTEXTO[c.cenario]}</p>
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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
      if (saved) { base[item.id] = saved; return }
      const qt = modoWizard ? engData!.quantitativos.find(q => q.id === item.id) : null
      const cpId = qt?.composicaoProfissionalId ?? 0
      const cp = cpId ? COMPOSICOES_PROFISSIONAIS.find(c => c.id === cpId) : null
      base[item.id] = {
        ...defaultConfig(item.id, item.servico, item.unidade, item.quantidade, [item.especificacao1, item.especificacao2], item.composicaoBasica),
        produtividadeBasica: cp?.produtividadeUNh ?? 1.0,
        rsUN: cp?.valorRefMetaDiaria ?? 0,
        prazoRequerido: qt?.prazoRequerido ?? 30,
      }
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

  useEffect(() => {
    if (!selected) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => calcular(selected), 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [selected, configs])

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
  const salvos = modoWizard ? itensLista.filter(i => !!engData!.calculosMO[i.id]).length : 0

  if (itensLista.length === 0) {
    return (
      <div className="flex flex-col gap-4 max-w-5xl">
        <h2 className="text-xl font-bold">{modoWizard ? 'E4 — Custo de Mão de Obra' : 'Calculadora — Mão de Obra'}</h2>
        <div className="card bg-base-100 shadow"><div className="card-body items-center py-12"><p className="text-base-content/40 text-sm">Configure serviços {modoWizard ? 'nos quantitativos (E2)' : 'no Precificador'} primeiro.</p></div></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 max-w-full">
      <h2 className="text-xl font-bold">{modoWizard ? 'E4 — Custo de Mão de Obra' : 'Calculadora — Mão de Obra'}</h2>

      {modoWizard && (
        <div className="card bg-base-200 p-4 text-sm text-base-content/70">
          Para cada serviço, o sistema calcula três cenários de equipe com base na
          produtividade SINAPI. Selecione o cenário que melhor equilibra custo e prazo.
          O cenário Ótimo minimiza o custo de mão de obra por unidade.
        </div>
      )}

      {modoWizard && (
        <div>
          <p className="text-xs text-base-content/50">{salvos} de {itensLista.length} serviços com cenário salvo</p>
          <progress className="progress progress-primary w-full" value={salvos} max={itensLista.length || 1} />
        </div>
      )}

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
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
          <div className="flex flex-col gap-3">
            <div>
              <p className="font-semibold text-sm">{config.servico.replace(/_/g, ' ')}</p>
              <p className="text-xs text-base-content/50">Qtd: {config.quantidade} {config.unidade}</p>
            </div>

            <details className="collapse collapse-arrow bg-base-200 rounded">
              <summary className="collapse-title text-sm font-medium py-2 px-3 min-h-0">
                Parâmetros SINAPI
                {config && <span className="text-xs text-base-content/40 ml-2">prod. {config.produtividadeBasica} UN/h</span>}
              </summary>
              <div className="collapse-content">
                <div className="grid grid-cols-2 gap-2 pt-2">
                  {([
                    { label: 'Prod. SINAPI (UN/h)', key: 'produtividadeBasica', step: '0.001', sub: 'Velocidade de referência oficial do SINAPI para este serviço' },
                    { label: 'Adicional Prod. (%)', key: 'adicionalProdutividade', step: '0.1', sub: '0% = ritmo SINAPI. 30% = 30% acima do SINAPI (cenário Ótimo).' },
                    { label: 'Proporção Ajudante', key: 'proporcaoAjudante', step: '0.1', sub: 'Número de ajudantes por profissional qualificado. Ex: 0,5 = 1 ajudante para 2 profissionais.' },
                    { label: 'R$/UN SINAPI', key: 'rsUN', step: '0.01', sub: 'Custo por unidade segundo o SINAPI — base para calcular a economia e o bônus.' },
                    { label: 'Prazo Requerido (d)', key: 'prazoRequerido', step: '1', sub: 'Prazo máximo disponível para executar este serviço (dias corridos).' },
                  ] as const).map(({ label, key, step, sub }) => (
                    <fieldset key={key} className="fieldset">
                      <legend className="fieldset-legend text-xs">{label}</legend>
                      <input type="number" step={step} value={config[key]} onChange={e => updateConfig(selected, { [key]: parseFloat(e.target.value) || 0 })} className="input input-sm w-full" />
                      <p className="label">{sub}</p>
                    </fieldset>
                  ))}
                  <div className="flex items-center gap-2 col-span-2">
                    <span className="text-xs text-base-content/50">Prod. Requerida:</span>
                    <span className="font-mono font-semibold text-sm">{prodRequerida.toFixed(3)} UN/h</span>
                  </div>
                </div>
                <button onClick={() => calcular(selected)} className="btn btn-ghost btn-sm w-full mt-1">Recalcular</button>
              </div>
            </details>

            {resultado && (
              <details className="collapse collapse-arrow bg-base-200 rounded">
                <summary className="collapse-title text-sm font-medium py-2 px-3 min-h-0">
                  Bônus e Modalidade de Contrato
                  {cenAtual && cenAtual.bonusCenario > 0 && <span className="badge badge-success badge-xs ml-2">{formatCurrency(cenAtual.bonusCenario)}</span>}
                </summary>
                <div className="collapse-content">
                  {cenAtual && cenAtual.bonusCenario > 0 ? (
                    <div className="flex flex-col gap-3 pt-2">
                      <p className="text-xs text-base-content/50">Total de bônus: <span className="font-mono font-bold text-success">{formatCurrency(cenAtual.bonusCenario)}</span></p>
                      <BonusBar label="Cliente 30%" percent={30} value={cenAtual.bonusCenario * 0.30} color="bg-primary" />
                      <p className="text-xs text-base-content/40 -mt-2">Desconto no preço final — repasse ao contratante</p>
                      <BonusBar label="Profissional 56%" percent={56} value={cenAtual.bonusCenario * 0.56} color="bg-success" />
                      <p className="text-xs text-base-content/40 -mt-2">0,80 × 0,70 × Economia</p>
                      <BonusBar label="Construtora 14%" percent={14} value={cenAtual.bonusCenario * 0.14} color="bg-accent" />
                      <p className="text-xs text-base-content/40 -mt-2">0,20 × 0,70 × Economia</p>
                    </div>
                  ) : (
                    <p className="text-xs text-base-content/40 pt-2">Sem bônus no cenário selecionado.</p>
                  )}
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-xs">Contratação MEI vs CLT</p>
                      <select className="select select-xs" value={modalidades[selected] ?? 'MEI'} onChange={e => setModalidades(prev => ({ ...prev, [selected]: e.target.value as ContratoModalidade }))}>
                        <option value="MEI">MEI</option>
                        <option value="CLT">CLT</option>
                      </select>
                    </div>
                    <p className="text-xs text-base-content/40 mb-2">MEI: Salário × 1,3 + 0,64 × Economia | CLT: Custo fixo pelo prazo + participação na economia</p>
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
                  </div>
                </div>
              </details>
            )}
          </div>

          {resultado && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-2">
                {(['Mensalista', 'Ótima', 'Prazo'] as const).map(nome => {
                  const c = nome === 'Mensalista' ? resultado.mensalista : nome === 'Ótima' ? resultado.otima : resultado.prazo
                  return <CenarioCard key={nome} c={c} isSelected={(cenarioSel[selected] ?? 'Ótima') === nome} onSelect={() => setCenarioSel(prev => ({ ...prev, [selected]: nome }))} prazoRequerido={config?.prazoRequerido} />
                })}
              </div>
              <div className="card bg-base-100 shadow">
                <div className="card-body p-3 gap-2">
                  <table className="table table-xs">
                    <tbody>
                      <tr><td className="text-xs">Custo/UN MEI</td><td className="text-right font-mono text-xs">{formatCurrency(config.quantidade > 0 ? resultado.custoFinalMEI / config.quantidade : 0)}</td></tr>
                      <tr><td className="text-xs">Custo/UN CLT</td><td className="text-right font-mono text-xs">{formatCurrency(config.quantidade > 0 ? resultado.custoFinalCLT / config.quantidade : 0)}</td></tr>
                      {cenAtual && (
                        <>
                          <tr><td className="text-xs">Equipe</td><td className="text-right font-mono text-xs">{cenAtual.profissionaisNecessarios} prof. + {cenAtual.ajudantesNecessarios} ajud.</td></tr>
                          <tr><td className="text-xs">Prazo</td><td className="text-right font-mono text-xs">{cenAtual.prazoEfetivoDias.toFixed(1)} d</td></tr>
                        </>
                      )}
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
          )}
        </div>
      )}
    </div>
  )
}