'use client'

import { useState, useRef, useEffect } from 'react'
import { MdSmartToy, MdDoneAll, MdChevronRight, MdApartment, MdCheck } from 'react-icons/md'
import { SERVICE_LABELS, SERVICE_CONFIG, SERVICE_SPECS, SERVICE_SPEC_LABELS, UF_LIST } from '@/lib/mockData'
import { calcularItem, calcularTotais } from '@/lib/calculos'
import { formatCurrency } from '@/lib/formatters'
import ResultadoOrcamento from './ResultadoOrcamento'
import type { OrcamentoItem, ServiceType, Orcamento } from '@/types'

interface ChatMsg {
  id: string
  from: 'bot' | 'user'
  text: string
  timestamp: string
}

type Phase =
  | 'START'
  | 'UF'
  | 'PRAZO'
  | 'SERVICOS'
  | 'SERVICO_CONFIG'
  | 'RESUMO'
  | 'RESULTADO'

interface WizardData {
  uf: string
  prazo: number
  servicos: ServiceType[]
  itens: OrcamentoItem[]
  servicoIndex: number
}

interface Props {
  clienteId: string
  onSaved: (orc: Orcamento) => void
}

function now() {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function botMsg(text: string): ChatMsg {
  return { id: `b-${Date.now()}-${Math.random()}`, from: 'bot', text, timestamp: now() }
}

function userMsg(text: string): ChatMsg {
  return { id: `u-${Date.now()}-${Math.random()}`, from: 'user', text, timestamp: now() }
}

function Bubble({ msg }: { msg: ChatMsg }) {
  const isUser = msg.from === 'user'
  return (
    <div className={`chat ${isUser ? 'chat-end' : 'chat-start'} mb-1`}>
      {!isUser && (
        <div className="chat-image">
          <div className="w-7 h-7 rounded-full bg-info flex items-center justify-center text-white">
            <MdSmartToy size={14} />
          </div>
        </div>
      )}
      <div
        className={`chat-bubble text-sm leading-relaxed shadow-sm ${isUser ? 'bg-primary text-primary-content' : 'bg-base-300 text-base-content'}`}
        style={{ maxWidth: '65%' }}
      >
        {!isUser && (
          <div className="text-xs font-semibold mb-1 text-accent">Ana - ConstruBot</div>
        )}
        <div className="flex items-end gap-2 min-w-0">
          <span className="flex-1 break-words whitespace-pre-line">{msg.text}</span>
          <div className="flex items-center gap-0.5 flex-shrink-0 pb-0.5">
            <span className="text-[11px] whitespace-nowrap opacity-60">{msg.timestamp}</span>
            {isUser && <MdDoneAll size={14} className="text-accent" />}
          </div>
        </div>
      </div>
    </div>
  )
}

function UfInput({ onSelect }: { onSelect: (v: string) => void }) {
  const [selected, setSelected] = useState('SP')
  const popular = ['SP', 'RJ', 'MG', 'BA', 'PR', 'RS', 'GO', 'DF']
  return (
    <div className="p-4 bg-base-300 flex-shrink-0">
      <p className="text-base-content/50 text-xs mb-3">Estado de referência (UF):</p>
      <div className="flex flex-wrap gap-2 mb-3">
        {popular.map(uf => (
          <button key={uf} onClick={() => setSelected(uf)}
            className={`btn btn-sm rounded-full ${selected === uf ? 'btn-primary' : 'btn-secondary'}`}>
            {uf}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <select value={selected} onChange={e => setSelected(e.target.value)} className="select select-sm flex-1 bg-base-100">
          {UF_LIST.map(uf => <option key={uf} value={uf}>{uf}</option>)}
        </select>
        <button onClick={() => onSelect(selected)} className="btn btn-primary btn-sm btn-circle">
          <MdChevronRight size={18} />
        </button>
      </div>
    </div>
  )
}


function PrazoInput({ onSubmit }: { onSubmit: (v: number) => void }) {
  const [idx, setIdx] = useState(2)
  const options = [7, 14, 30, 45, 60, 90]
  const [custom, setCustom] = useState('')
  const [useCustom, setUseCustom] = useState(false)
  return (
    <div className="p-4 bg-base-300 flex-shrink-0">
      <p className="text-base-content/50 text-xs mb-3">Prazo global da obra (dias corridos):</p>
      <div className="flex flex-wrap gap-2 mb-3">
        {options.map((d, i) => (
          <button key={d} onClick={() => { setIdx(i); setUseCustom(false) }}
            className={`btn btn-sm rounded-full ${!useCustom && idx === i ? 'btn-primary' : 'btn-secondary'}`}>
            {d}d
          </button>
        ))}
        <button onClick={() => setUseCustom(true)}
          className={`btn btn-sm rounded-full ${useCustom ? 'btn-accent' : 'btn-ghost border border-base-content/20'}`}>
          Outro
        </button>
      </div>
      {useCustom && (
        <fieldset className="fieldset mb-2">
          <legend className="fieldset-legend">Dias</legend>
          <input type="number" min={1} value={custom} onChange={e => setCustom(e.target.value)} className="input w-full" placeholder="Ex: 120" />
        </fieldset>
      )}
      <button
        onClick={() => { const v = useCustom ? parseInt(custom) || options[idx] : options[idx]; onSubmit(v) }}
        className="btn btn-primary w-full"
      >
        Confirmar <MdChevronRight size={18} />
      </button>
    </div>
  )
}

function ServicosInput({ onSubmit }: { onSubmit: (v: ServiceType[]) => void }) {
  const [selected, setSelected] = useState<ServiceType[]>([])
  const all = Object.keys(SERVICE_LABELS) as ServiceType[]
  return (
    <div className="p-4 bg-base-300 flex-shrink-0">
      <p className="text-base-content/50 text-xs mb-3">{selected.length} serviço(s) selecionado(s):</p>
      <div className="grid grid-cols-2 gap-1.5 mb-3 max-h-56 overflow-y-auto">
        {all.map(st => (
          <button
            key={st}
            onClick={() => setSelected(prev => prev.includes(st) ? prev.filter(s => s !== st) : [...prev, st])}
            className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-colors text-xs ${selected.includes(st) ? 'border-primary bg-primary/15 text-primary' : 'border-secondary hover:bg-base-200 text-base-content/70'}`}
          >
            {selected.includes(st) && <MdCheck size={14} className="flex-shrink-0" />}
            <span className="leading-tight">{SERVICE_LABELS[st]}</span>
          </button>
        ))}
      </div>
      <button disabled={!selected.length} onClick={() => onSubmit(selected)} className="btn btn-primary w-full">
        Configurar {selected.length > 0 ? `${selected.length} serviço(s)` : ''} <MdChevronRight size={18} />
      </button>
    </div>
  )
}

interface ServicoRicoProps {
  st: ServiceType
  index: number
  total: number
  prazoDefault: number
  onConfirm: (item: Partial<OrcamentoItem>) => void
}

function ServicoRicoInput({ st, index, total, prazoDefault, onConfirm }: ServicoRicoProps) {
  const cfg = SERVICE_CONFIG[st]
  const specs = SERVICE_SPECS[st]
  const specLabels = SERVICE_SPEC_LABELS[st]
  const [qty, setQty] = useState('')
  const [esp1, setEsp1] = useState('')
  const [esp2, setEsp2] = useState('')
  const [esp3, setEsp3] = useState('')
  const [prazo, setPrazo] = useState(prazoDefault)
  const prazoQuick = [7, 14, 30, 45, 60]

  const isValid = parseFloat(qty) > 0

  const estimativa = isValid
    ? calcularItem({
        id: 'preview', serviceType: st, subTipo: esp1, especificacao1: esp1,
        especificacao2: esp2, especificacao3: esp3, unidade: cfg.unidade,
        quantidade: parseFloat(qty), prazoRequerido: prazo, modalidade: 'MEI',
      })
    : null

  return (
    <div className="p-4 bg-base-300 flex-shrink-0 overflow-y-auto max-h-[420px]">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs text-base-content/40">Serviço {index + 1} de {total}</p>
          <p className="text-base-content font-semibold text-sm">{SERVICE_LABELS[st]}</p>
        </div>
        <div className="radial-progress text-primary text-xs" style={{ '--value': Math.round(((index + 1) / total) * 100), '--size': '2.5rem', '--thickness': '3px' } as React.CSSProperties}>
          {index + 1}/{total}
        </div>
      </div>

      <fieldset className="fieldset mb-3">
        <legend className="fieldset-legend">Quantidade</legend>
        <div className="flex items-center border border-base-content/20 rounded-lg overflow-hidden bg-base-100">
          <input type="number" min={0.01} step={0.01} value={qty} onChange={e => setQty(e.target.value)}
            placeholder="0.00" className="input flex-1 border-none bg-transparent" autoFocus />
          <span className="px-3 text-base-content/40 text-sm font-mono border-l border-base-content/20 select-none self-stretch flex items-center">{cfg.unidade}</span>
        </div>
      </fieldset>

      {specs?.esp1 && specs.esp1.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-base-content/40 mb-1.5">{specLabels?.esp1 ?? 'Especificação'}:</p>
          <div className="flex flex-wrap gap-1.5">
            {specs.esp1.map(o => (
              <button key={o} onClick={() => setEsp1(o)}
                className={`btn btn-xs rounded-full ${esp1 === o ? 'btn-primary' : 'btn-secondary'}`}>{o}</button>
            ))}
          </div>
        </div>
      )}

      {specs?.esp2 && specs.esp2.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-base-content/40 mb-1.5">{specLabels?.esp2 ?? 'Especificação'}:</p>
          <div className="flex flex-wrap gap-1.5">
            {specs.esp2.map(o => (
              <button key={o} onClick={() => setEsp2(o)}
                className={`btn btn-xs rounded-full ${esp2 === o ? 'btn-primary' : 'btn-secondary'}`}>{o}</button>
            ))}
          </div>
        </div>
      )}

      {specs?.esp3 && specs.esp3.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-base-content/40 mb-1.5">{specLabels?.esp3 ?? 'Especificação'}:</p>
          <div className="flex flex-wrap gap-1.5">
            {specs.esp3.map(o => (
              <button key={o} onClick={() => setEsp3(o)}
                className={`btn btn-xs rounded-full ${esp3 === o ? 'btn-primary' : 'btn-secondary'}`}>{o}</button>
            ))}
          </div>
        </div>
      )}

      <div className="mb-3">
        <p className="text-xs text-base-content/40 mb-1.5">Prazo para este serviço (dias):</p>
        <div className="flex flex-wrap gap-1.5">
          {prazoQuick.map(d => (
            <button key={d} onClick={() => setPrazo(d)}
              className={`btn btn-xs rounded-full ${prazo === d ? 'btn-accent' : 'btn-secondary'}`}>{d}d</button>
          ))}
          <input type="number" min={1} value={prazoQuick.includes(prazo) ? '' : prazo}
            onChange={e => setPrazo(parseInt(e.target.value) || 1)}
            placeholder="Outro"
            className="input input-xs w-16 rounded-full text-center" />
        </div>
      </div>

      {estimativa && (
        <div className="bg-base-100 rounded-lg p-2.5 mb-3 flex gap-3 text-xs">
          <div className="flex-1">
            <p className="text-base-content/50">Custo estimado</p>
            <p className="font-bold text-success">{formatCurrency(estimativa.precoFinalMEI)} <span className="font-normal text-base-content/40">MEI</span></p>
          </div>
          <div className="flex-1">
            <p className="text-base-content/50">Prazo efetivo</p>
            <p className="font-bold">{estimativa.prazo.prazoEfetivoDias.toFixed(0)}d com {estimativa.prazo.profissionaisNecessarios} prof.</p>
          </div>
        </div>
      )}

      <button disabled={!isValid} onClick={() => onConfirm({ serviceType: st, subTipo: esp1 || SERVICE_LABELS[st], especificacao1: esp1, especificacao2: esp2, especificacao3: esp3, unidade: cfg.unidade, quantidade: parseFloat(qty), prazoRequerido: prazo })}
        className="btn btn-primary w-full">
        Confirmar <MdCheck size={18} />
      </button>
    </div>
  )
}

function ResumoInput({ data, onConfirm }: { data: WizardData; onConfirm: () => void }) {
  return (
    <div className="p-4 bg-base-300 flex-shrink-0">
      <p className="text-base-content/50 text-xs mb-3">Resumo antes de calcular:</p>
      <div className="overflow-x-auto mb-3">
        <table className="table table-xs">
          <thead><tr><th>Serviço</th><th>Qtd</th><th>Prazo</th></tr></thead>
          <tbody>
            {data.itens.map(i => (
              <tr key={i.id}>
                <td className="text-xs">{SERVICE_LABELS[i.serviceType]}</td>
                <td className="text-xs">{i.quantidade} {i.unidade}</td>
                <td className="text-xs">{i.prazoRequerido}d</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={onConfirm} className="btn btn-primary w-full">
        <MdApartment size={18} /> Calcular Orçamento
      </button>
    </div>
  )
}

export default function OrcamentoChatFlow({ clienteId, onSaved }: Props) {
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [phase, setPhase] = useState<Phase>('START')
  const [data, setData] = useState<WizardData>({
    uf: 'SP', prazo: 30, servicos: [], itens: [], servicoIndex: 0,
  })
  const [orcamento, setOrcamento] = useState<Orcamento | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, phase])

  function addBotMsg(text: string) {
    setMessages(prev => [...prev, botMsg(text)])
  }

  function addUserMsg(text: string) {
    setMessages(prev => [...prev, userMsg(text)])
  }

  function handleStart() {
    setMessages([botMsg('Olá! Sou a Ana, assistente da ConstruBot.\n\nVou te ajudar a criar um orçamento detalhado com cálculos SINAPI de mão de obra e materiais.\n\nPrimeiro: qual é o estado de referência para os preços?')])
    setPhase('UF')
  }

  function handleUf(uf: string) {
    addUserMsg(uf)
    setData(d => ({ ...d, uf }))
    setTimeout(() => {
      addBotMsg(`Perfeito, vou usar preços de ${uf} como referência.\n\nQual o prazo global previsto para a obra?`)
      setPhase('PRAZO')
    }, 400)
  }

  function handlePrazo(prazo: number) {
    addUserMsg(`${prazo} dias corridos`)
    setData(d => ({ ...d, prazo }))
    setTimeout(() => {
      addBotMsg('Agora selecione os serviços que deseja incluir no orçamento. Você pode escolher quantos quiser:')
      setPhase('SERVICOS')
    }, 400)
  }

  function handleServicos(servicos: ServiceType[]) {
    const nomes = servicos.map(s => SERVICE_LABELS[s]).join(', ')
    addUserMsg(`Selecionei: ${nomes}`)
    setData(d => ({ ...d, servicos, itens: [], servicoIndex: 0 }))
    setTimeout(() => {
      addBotMsg(`Selecionados ${servicos.length} serviço(s). Vamos configurar cada um.\n\nComeçando pelo primeiro: ${SERVICE_LABELS[servicos[0]]}`)
      setPhase('SERVICO_CONFIG')
    }, 400)
  }

  function handleServicoConfirm(partial: Partial<OrcamentoItem>) {
    const st = data.servicos[data.servicoIndex]
    const item: OrcamentoItem = {
      id: `item-${Date.now()}-${st}`,
      serviceType: st,
      subTipo: partial.subTipo || SERVICE_LABELS[st],
      especificacao1: partial.especificacao1 || '',
      especificacao2: partial.especificacao2 || '',
      especificacao3: partial.especificacao3 || '',
      unidade: partial.unidade || SERVICE_CONFIG[st].unidade,
      quantidade: partial.quantidade || 0,
      prazoRequerido: partial.prazoRequerido || data.prazo,
      modalidade: 'MEI',
    }
    const summary = [
      `${item.quantidade} ${item.unidade}`,
      item.especificacao1,
      item.especificacao2,
      item.especificacao3,
      `${item.prazoRequerido}d`,
      item.modalidade,
    ].filter(Boolean).join(' · ')
    addUserMsg(`${SERVICE_LABELS[st]}: ${summary}`)
    const nextIndex = data.servicoIndex + 1
    const newItens = [...data.itens, item]
    setData(d => ({ ...d, itens: newItens, servicoIndex: nextIndex }))
    setTimeout(() => {
      if (nextIndex < data.servicos.length) {
        addBotMsg(`Anotado! Próximo — ${SERVICE_LABELS[data.servicos[nextIndex]]}:`)
        setPhase('START')
        setTimeout(() => setPhase('SERVICO_CONFIG'), 50)
      } else {
        addBotMsg(`Todos os serviços configurados! Aqui está o resumo completo antes de calcular:`)
        setPhase('RESUMO')
      }
    }, 400)
  }

  function handleCalcular() {
    addUserMsg('Calcular Orçamento')
    const itensCalculados = data.itens.map(item => ({ ...item, resultado: calcularItem(item) }))
    const orc: Orcamento = {
      id: `orc-${Date.now()}`,
      clienteId,
      dataCriacao: new Date().toISOString().slice(0, 10),
      status: 'calculado',
      uf: data.uf,
      itens: itensCalculados,
    }
    orc.totais = calcularTotais(orc)
    setOrcamento(orc)
    setTimeout(() => {
      addBotMsg('Orçamento calculado! Confira os resultados detalhados abaixo:')
      setPhase('RESULTADO')
    }, 500)
  }

  const currentPhase = phase
  const currentServico = currentPhase === 'SERVICO_CONFIG' ? data.servicos[data.servicoIndex] : null

  function renderInput() {
    switch (currentPhase) {
      case 'UF': return <UfInput onSelect={handleUf} />
      case 'PRAZO': return <PrazoInput onSubmit={handlePrazo} />
      case 'SERVICOS': return <ServicosInput onSubmit={handleServicos} />
      case 'SERVICO_CONFIG':
        return currentServico ? (
          <ServicoRicoInput
            key={currentServico + data.servicoIndex}
            st={currentServico}
            index={data.servicoIndex}
            total={data.servicos.length}
            prazoDefault={data.prazo}
            onConfirm={handleServicoConfirm}
          />
        ) : null
      case 'RESUMO':
        return <ResumoInput data={data} onConfirm={handleCalcular} />
      default: return null
    }
  }

  if (phase === 'START' && messages.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8">
          <div className="avatar placeholder">
            <div className="w-20 rounded-full bg-base-300 text-info">
              <MdSmartToy size={40} />
            </div>
          </div>
          <div className="text-center">
            <h2 className="text-base-content text-lg font-semibold mb-2">Ana — ConstruBot</h2>
            <p className="text-base-content/50 text-sm leading-relaxed max-w-sm">
              Sua assistente para orçamentos de mão de obra com base SINAPI. Clique para iniciar.
            </p>
          </div>
          <button onClick={handleStart} className="btn btn-primary btn-wide rounded-full">
            Iniciar cotação
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-[6%] py-4">
        <div className="flex justify-center mb-3">
          <span className="badge badge-ghost text-base-content/40 text-xs">
            {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </span>
        </div>
        {messages.map(m => <Bubble key={m.id} msg={m} />)}
        {phase === 'RESULTADO' && orcamento && (
          <div className="mt-4">
            <ResultadoOrcamento
              orcamento={orcamento}
              onSave={() => onSaved(orcamento)}
              onBack={() => { setMessages([]); setPhase('START'); setOrcamento(null); setData({ uf: 'SP', prazo: 30, servicos: [], itens: [], servicoIndex: 0 }) }}
            />
          </div>
        )}
        <div ref={endRef} />
      </div>

      {phase !== 'RESULTADO' && currentPhase !== 'START' && (
        <div className="flex-shrink-0 border-t border-secondary">
          {renderInput()}
        </div>
      )}
    </div>
  )
}
