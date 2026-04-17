'use client'

import { useState, useRef, useEffect } from 'react'
import { MdSmartToy, MdDoneAll, MdChevronRight, MdCheck, MdHourglassTop, MdAdd, MdClose, MdImage, MdInfoOutline } from 'react-icons/md'
import { OPCIONAIS_PADRAO, UF_LIST } from '@/lib/mockData'
import { loadEngineerData } from '@/lib/storage'
import { gerarQuantitativosFromParametros, calcularFaixaCotacao } from '@/lib/calculos'
import { formatCurrency } from '@/lib/formatters'
import CarrinhoFlutuante, { type CartEditResult } from './CarrinhoFlutuante'
import type {
  Orcamento,
  ModalidadeFinanciamento,
  TopografiaTerreno,
  SituacaoTerreno,
  Terreno,
  PlantaPadrao,
  OpcionalItem,
  Personalizacao,
  FaixaCotacao,
} from '@/types'

interface OpcionalRich {
  nome: string
  descricao: string
  vantagensCliente: string
  desvantagensCliente: string
}

interface ChatMsg {
  id: string
  from: 'bot' | 'user'
  text: string
  timestamp: string
  opcional?: OpcionalRich
}

type Phase =
  | 'START'
  | 'MODALIDADE'
  | 'TERRENO'
  | 'QUARTOS'
  | 'PLANTA'
  | 'OPCIONAIS'
  | 'PERSONALIZACOES'
  | 'NOME_PROJETO'
  | 'AGUARDANDO'

interface Props {
  clienteId: string
  onSaved: (orc: Orcamento) => void
}

function now() {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function botMsg(text: string, opcional?: OpcionalRich): ChatMsg {
  return { id: `b-${Date.now()}-${Math.random()}`, from: 'bot', text, timestamp: now(), opcional }
}

function userMsg(text: string): ChatMsg {
  return { id: `u-${Date.now()}-${Math.random()}`, from: 'user', text, timestamp: now() }
}

function OpcionalDetailModal({ item, onClose }: { item: OpcionalRich; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="card bg-base-100 shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="card-body p-5 gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg">{item.nome}</h3>
            <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle"><MdClose size={18} /></button>
          </div>
          <div className="w-full h-40 bg-base-200 rounded-lg flex items-center justify-center">
            <MdImage size={48} className="text-base-content/20" />
          </div>
          <p className="text-sm text-base-content/70">{item.descricao}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-success/10 border border-success/30 rounded-lg p-3">
              <p className="text-xs font-bold text-success mb-1">Vantagens</p>
              <ul className="list-disc list-inside text-xs text-base-content/70 space-y-0.5">
                {item.vantagensCliente.split(',').map((v, i) => <li key={i}>{v.trim()}</li>)}
              </ul>
            </div>
            <div className="bg-error/10 border border-error/30 rounded-lg p-3">
              <p className="text-xs font-bold text-error mb-1">Desvantagens</p>
              <ul className="list-disc list-inside text-xs text-base-content/70 space-y-0.5">
                {item.desvantagensCliente.split(',').map((d, i) => <li key={i}>{d.trim()}</li>)}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Bubble({ msg }: { msg: ChatMsg }) {
  const isUser = msg.from === 'user'
  const [showDetail, setShowDetail] = useState(false)
  return (
    <>
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
          style={{ maxWidth: '70%' }}
        >
          {!isUser && (
            <div className="text-xs font-semibold mb-1 text-accent">Ana - ConstruBot</div>
          )}
          {msg.opcional && !isUser && (
            <div className="mb-2">
              <div className="w-full h-28 bg-base-200 rounded-lg flex items-center justify-center mb-2">
                <MdImage size={36} className="text-base-content/15" />
              </div>
              <p className="font-semibold text-sm mb-1">{msg.opcional.nome}</p>
              <p className="text-xs text-base-content/60 mb-2">{msg.opcional.descricao}</p>
              <button onClick={() => setShowDetail(true)} className="btn btn-ghost btn-xs gap-1 text-info">
                <MdInfoOutline size={14} /> Saiba mais
              </button>
            </div>
          )}
          {msg.text && (
            <div className="flex items-end gap-2 min-w-0">
              <span className="flex-1 break-words whitespace-pre-line">{msg.text}</span>
              <div className="flex items-center gap-0.5 flex-shrink-0 pb-0.5">
                <span className="text-[11px] whitespace-nowrap opacity-60">{msg.timestamp}</span>
                {isUser && <MdDoneAll size={14} className="text-accent" />}
              </div>
            </div>
          )}
          {!msg.text && (
            <div className="flex justify-end">
              <span className="text-[11px] opacity-60">{msg.timestamp}</span>
            </div>
          )}
        </div>
      </div>
      {showDetail && msg.opcional && <OpcionalDetailModal item={msg.opcional} onClose={() => setShowDetail(false)} />}
    </>
  )
}

const TOPOGRAFIA_LABELS: Record<TopografiaTerreno, string> = {
  PLANO: 'Plano',
  ACLIVE: 'Em aclive',
  DECLIVE: 'Em declive',
}

const SITUACAO_LABELS: Record<SituacaoTerreno, string> = {
  PROPRIO_QUITADO: 'Próprio quitado',
  FINANCIADO_EM_CURSO: 'Financiado em curso',
  A_ADQUIRIR: 'A adquirir',
}

interface TerrenoFormState {
  municipio: string
  bairro: string
  endereco: string
  frenteMetros: string
  fundoMetros: string
  topografia: TopografiaTerreno
  situacao: SituacaoTerreno
  valorAvaliacao: string
}

function TerrenoInput({ onConfirm }: { onConfirm: (t: Terreno, uf: string) => void }) {
  const [ufSelecionada, setUfSelecionada] = useState('')
  const [municipios, setMunicipios] = useState<string[]>([])
  const [loadingMunicipios, setLoadingMunicipios] = useState(false)
  const [form, setForm] = useState<TerrenoFormState>({
    municipio: '',
    bairro: '',
    endereco: '',
    frenteMetros: '',
    fundoMetros: '',
    topografia: 'PLANO',
    situacao: 'PROPRIO_QUITADO',
    valorAvaliacao: '',
  })

  useEffect(() => {
    if (!ufSelecionada) { setMunicipios([]); return }
    setLoadingMunicipios(true)
    fetch(`/api/localidades/municipios/${ufSelecionada}`)
      .then(r => r.json())
      .then(data => setMunicipios(data.municipios ?? []))
      .catch(() => setMunicipios([]))
      .finally(() => setLoadingMunicipios(false))
  }, [ufSelecionada])

  const isAdquirir = form.situacao === 'A_ADQUIRIR'
  const frente = isAdquirir ? 10 : (parseFloat(form.frenteMetros) || 0)
  const fundo = isAdquirir ? 15 : (parseFloat(form.fundoMetros) || 0)
  const area = frente * fundo

  const isValid = isAdquirir
    ? form.municipio.trim() !== ''
    : form.municipio.trim() !== '' &&
      frente > 0 &&
      fundo > 0 &&
      (form.situacao === 'PROPRIO_QUITADO' || parseFloat(form.valorAvaliacao) > 0)

  function handleConfirm() {
    if (!isValid) return
    onConfirm({
      municipio: form.municipio.trim(),
      bairro: isAdquirir ? '' : form.bairro.trim(),
      endereco: isAdquirir ? '' : form.endereco.trim(),
      frenteMetros: frente,
      fundoMetros: fundo,
      areaTotalM2: isAdquirir ? 150 : area,
      topografia: isAdquirir ? 'PLANO' : form.topografia,
      situacao: form.situacao,
      valorAvaliacao: isAdquirir ? 0 : (parseFloat(form.valorAvaliacao) || 0),
    }, ufSelecionada)
  }

  return (
    <div className="p-4 bg-base-300 flex-shrink-0 overflow-y-auto max-h-[480px]">
      <div className="grid grid-cols-2 gap-3 mb-3">
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Estado (UF)</legend>
          <select
            value={ufSelecionada}
            onChange={e => { setUfSelecionada(e.target.value); setForm(f => ({ ...f, municipio: '' })) }}
            className="select w-full"
          >
            <option value="">Selecione...</option>
            {UF_LIST.map(uf => <option key={uf} value={uf}>{uf}</option>)}
          </select>
        </fieldset>
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Município</legend>
          {loadingMunicipios ? (
            <div className="flex items-center gap-2 h-10"><span className="loading loading-spinner loading-xs" /> Carregando...</div>
          ) : (
            <select
              value={form.municipio}
              onChange={e => setForm(f => ({ ...f, municipio: e.target.value }))}
              className="select w-full"
              disabled={municipios.length === 0}
            >
              <option value="">{municipios.length === 0 ? 'Selecione a UF primeiro' : 'Selecione...'}</option>
              {municipios.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          )}
        </fieldset>
      </div>

      <div className="mb-3">
        <p className="text-xs text-base-content/40 mb-1.5">Situação do terreno:</p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(SITUACAO_LABELS) as SituacaoTerreno[]).map(key => (
            <button
              key={key}
              onClick={() => setForm(f => ({ ...f, situacao: key }))}
              className={`btn btn-sm rounded-full ${form.situacao === key ? 'btn-primary' : 'btn-secondary'}`}
            >
              {SITUACAO_LABELS[key]}
            </button>
          ))}
        </div>
      </div>

      {!isAdquirir && (
        <>
          <fieldset className="fieldset mb-3">
            <legend className="fieldset-legend">Bairro</legend>
            <input
              type="text"
              value={form.bairro}
              onChange={e => setForm(f => ({ ...f, bairro: e.target.value }))}
              className="input w-full"
              placeholder="Ex: Vila Mariana"
            />
          </fieldset>

          <fieldset className="fieldset mb-3">
            <legend className="fieldset-legend">Endereço</legend>
            <input
              type="text"
              value={form.endereco}
              onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))}
              className="input w-full"
              placeholder="Ex: Rua das Flores, 123"
            />
          </fieldset>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Frente (m)</legend>
              <input
                type="number"
                min={0.1}
                step={0.1}
                value={form.frenteMetros}
                onChange={e => setForm(f => ({ ...f, frenteMetros: e.target.value }))}
                className="input w-full"
                placeholder="0.0"
              />
            </fieldset>
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Fundo (m)</legend>
              <input
                type="number"
                min={0.1}
                step={0.1}
                value={form.fundoMetros}
                onChange={e => setForm(f => ({ ...f, fundoMetros: e.target.value }))}
                className="input w-full"
                placeholder="0.0"
              />
            </fieldset>
          </div>

          {area > 0 && (
            <div className="bg-base-100 rounded-lg p-2 mb-3 text-center text-sm">
              Área total: <span className="font-bold">{area.toFixed(1)} m²</span>
            </div>
          )}

          <div className="mb-3">
            <p className="text-xs text-base-content/40 mb-1.5">Topografia:</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(TOPOGRAFIA_LABELS) as TopografiaTerreno[]).map(key => (
                <button
                  key={key}
                  onClick={() => setForm(f => ({ ...f, topografia: key }))}
                  className={`btn btn-sm rounded-full ${form.topografia === key ? 'btn-primary' : 'btn-secondary'}`}
                >
                  {TOPOGRAFIA_LABELS[key]}
                </button>
              ))}
            </div>
          </div>

          <fieldset className="fieldset mb-3">
            <legend className="fieldset-legend">
              Valor de avaliação (R$){form.situacao === 'PROPRIO_QUITADO' ? ' (opcional)' : ''}
            </legend>
            <input
              type="number"
              min={0}
              step={1000}
              value={form.valorAvaliacao}
              onChange={e => setForm(f => ({ ...f, valorAvaliacao: e.target.value }))}
              className="input w-full"
              placeholder="0"
            />
          </fieldset>
        </>
      )}

      <button disabled={!isValid} onClick={handleConfirm} className="btn btn-primary w-full">
        {isAdquirir ? 'Continuar sem terreno definido' : 'Confirmar'} <MdChevronRight size={18} />
      </button>
    </div>
  )
}

function QuartosInput({ onSelect }: { onSelect: (q: number) => void }) {
  return (
    <div className="p-4 bg-base-300 flex-shrink-0">
      <p className="text-base-content/50 text-xs mb-3">Quantos quartos deseja?</p>
      <div className="grid grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(q => (
          <button key={q} onClick={() => onSelect(q)} className="btn btn-lg btn-secondary rounded-xl">
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}

function PlantaInput({ plantas, onSelect, onChangeQuartos }: { plantas: PlantaPadrao[]; onSelect: (p: PlantaPadrao) => void; onChangeQuartos: () => void }) {
  return (
    <div className="p-4 bg-base-300 flex-shrink-0 overflow-y-auto max-h-[400px]">
      <button onClick={onChangeQuartos} className="btn btn-ghost btn-sm w-full mb-3">
        Alterar número de quartos
      </button>
      <div className="flex flex-col gap-3">
        {plantas.map(p => (
          <div key={p.id} className="bg-base-100 rounded-lg p-3">
            <div className="w-full h-32 bg-base-200 rounded-lg flex items-center justify-center mb-2">
              <MdImage size={40} className="text-base-content/20" />
            </div>
            <p className="font-semibold text-sm text-base-content">{p.nome}</p>
            <p className="text-xs text-base-content/60 mt-1">{p.descricao}</p>
            <div className="flex gap-4 mt-2 text-xs text-base-content/50">
              <span>{p.areaConstruidaM2} m²</span>
              <span>{p.tempoObraMeses} meses</span>
              <span>{p.quartos} quartos</span>
            </div>
            <button onClick={() => onSelect(p)} className="btn btn-primary btn-sm w-full mt-2">
              Selecionar <MdCheck size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function OpcionalInput({ item, onAnswer }: { item: Omit<OpcionalItem, 'selecionado'>; onAnswer: (sim: boolean) => void }) {
  const [showDetail, setShowDetail] = useState(false)

  return (
    <>
      <div className="p-4 bg-base-300 flex-shrink-0">
        <p className="text-xs text-base-content/50 mb-3">Deseja incluir <strong>{item.nome}</strong> no seu projeto?</p>
        <div className="flex gap-3">
          <button onClick={() => onAnswer(true)} className="btn btn-primary flex-1 h-auto py-3 flex-col gap-0">
            <MdCheck size={18} />
            <span className="text-sm font-bold">Sim, quero</span>
            <span className="text-[10px] opacity-70">{item.nome}</span>
          </button>
          <button onClick={() => onAnswer(false)} className="btn btn-secondary flex-1 h-auto py-3 flex-col gap-0">
            <MdClose size={18} />
            <span className="text-sm font-bold">Não, obrigado</span>
          </button>
        </div>
        <div className="flex justify-center mt-2">
          <button onClick={() => setShowDetail(true)} className="btn btn-ghost btn-xs gap-1 text-info">
            <MdInfoOutline size={14} /> O que é {item.nome.toLowerCase()}?
          </button>
        </div>
      </div>
      {showDetail && (
        <OpcionalDetailModal
          item={{ nome: item.nome, descricao: item.descricao, vantagensCliente: item.vantagensCliente, desvantagensCliente: item.desvantagensCliente }}
          onClose={() => setShowDetail(false)}
        />
      )}
    </>
  )
}

function PersonalizacoesInput({ onConfirm }: { onConfirm: (items: Personalizacao[]) => void }) {
  const [items, setItems] = useState<Personalizacao[]>([])
  const [text, setText] = useState('')

  function handleAdd() {
    if (text.trim() === '') return
    setItems(prev => [
      ...prev,
      {
        id: `pers-${Date.now()}-${Math.random()}`,
        descricao: text.trim(),
        impacto: 'A ser avaliado pelo engenheiro',
        custoEstimadoAdicional: 0,
      },
    ])
    setText('')
  }

  function handleRemove(id: string) {
    setItems(prev => prev.filter(p => p.id !== id))
  }

  return (
    <div className="p-4 bg-base-300 flex-shrink-0 overflow-y-auto max-h-[400px]">
      {items.length > 0 && (
        <div className="mb-3 flex flex-col gap-1.5">
          {items.map(p => (
            <div key={p.id} className="flex items-center gap-2 bg-base-100 rounded-lg px-3 py-2 text-sm">
              <span className="flex-1 text-base-content">{p.descricao}</span>
              <button onClick={() => handleRemove(p.id)} className="btn btn-ghost btn-xs btn-circle">
                <MdClose size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <fieldset className="fieldset mb-3">
        <legend className="fieldset-legend">Descreva a personalização</legend>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          className="textarea w-full"
          rows={3}
          placeholder="Ex: Quero bancada de granito na cozinha"
        />
      </fieldset>

      <div className="flex gap-2">
        <button onClick={handleAdd} disabled={text.trim() === ''} className="btn btn-secondary flex-1">
          <MdAdd size={18} /> Adicionar
        </button>
      </div>

      <div className="flex gap-2 mt-2">
        {items.length === 0 && (
          <button onClick={() => onConfirm([])} className="btn btn-ghost flex-1">
            Nenhuma personalização
          </button>
        )}
        <button onClick={() => onConfirm(items)} className="btn btn-primary flex-1" disabled={items.length === 0}>
          Concluir <MdChevronRight size={18} />
        </button>
      </div>
    </div>
  )
}

function NomeProjetoInput({ plantaNome, onConfirm }: { plantaNome: string; onConfirm: (nome: string) => void }) {
  const sugestao = `Minha Casa — ${plantaNome}`
  const [nome, setNome] = useState(sugestao)
  return (
    <div className="p-4 bg-base-300 flex-shrink-0">
      <fieldset className="fieldset mb-3">
        <legend className="fieldset-legend">Nome do projeto</legend>
        <input type="text" value={nome} onChange={e => setNome(e.target.value)} className="input w-full" placeholder="Ex: Casa da praia" autoFocus />
        <p className="label text-xs text-base-content/40">Esse nome aparecerá em "Meus Orçamentos"</p>
      </fieldset>
      <button disabled={!nome.trim()} onClick={() => onConfirm(nome.trim())} className="btn btn-primary w-full">
        Finalizar consulta <MdCheck size={18} />
      </button>
    </div>
  )
}

function ModalidadeInput({ onSelect }: { onSelect: (m: ModalidadeFinanciamento) => void }) {
  return (
    <div className="p-4 bg-base-300 flex-shrink-0">
      <p className="text-xs text-base-content/40 mb-3">Modalidade de financiamento:</p>
      <div className="flex flex-col gap-2">
        <button onClick={() => onSelect('MCMV')} className="btn btn-outline btn-lg h-auto py-3 rounded-xl flex-col gap-0 text-left items-start">
          <span className="font-bold text-sm">MCMV — Minha Casa Minha Vida</span>
          <span className="text-xs font-normal opacity-60">Até R$ 600.000 — Subsídios federais, juros reduzidos</span>
        </button>
        <button onClick={() => onSelect('SBPE')} className="btn btn-outline btn-lg h-auto py-3 rounded-xl flex-col gap-0 text-left items-start">
          <span className="font-bold text-sm">SBPE — Poupança e Empréstimo</span>
          <span className="text-xs font-normal opacity-60">Acima de R$ 600.000 — Taxas de mercado</span>
        </button>
      </div>
    </div>
  )
}

export default function OrcamentoChatFlow({ clienteId, onSaved }: Props) {
  const plantas = loadEngineerData().plantas

  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [phase, setPhase] = useState<Phase>('START')
  const [nomeOrcamento, setNomeOrcamento] = useState('')
  const [modalidade, setModalidade] = useState<ModalidadeFinanciamento>('MCMV')
  const [terreno, setTerreno] = useState<Terreno | null>(null)
  const [quartos, setQuartos] = useState(0)
  const [selectedPlanta, setSelectedPlanta] = useState<PlantaPadrao | null>(null)
  const [opcionais, setOpcionais] = useState<OpcionalItem[]>([])
  const [opcionalIndex, setOpcionalIndex] = useState(0)
  const [personalizacoes, setPersonalizacoes] = useState<Personalizacao[]>([])
  const [selectedUf, setSelectedUf] = useState('')
  const [faixaAtual, setFaixaAtual] = useState<{ minimo: number; maximo: number } | undefined>()
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, phase])

  useEffect(() => {
    if (!selectedPlanta) { setFaixaAtual(undefined); return }
    const engData = loadEngineerData()
    const qtv = gerarQuantitativosFromParametros(selectedPlanta, opcionais)
    const faixa = calcularFaixaCotacao(qtv, engData.globalParams, engData.inccMensal, selectedPlanta.tempoObraMeses)
    setFaixaAtual({ minimo: faixa.minimo, maximo: faixa.maximo })
  }, [selectedPlanta, opcionais])

  function addBotMsg(text: string, opcional?: OpcionalRich) {
    setMessages(prev => [...prev, botMsg(text, opcional)])
  }

  function addUserMsg(text: string) {
    setMessages(prev => [...prev, userMsg(text)])
  }

  function handleStart() {
    setMessages([
      botMsg(
        'Olá! Sou a Ana, assistente da ConstruBot.\n\nVou te ajudar a planejar o seu projeto de construção. Primeiro, qual a modalidade de financiamento?'
      ),
    ])
    setPhase('MODALIDADE')
  }

  function handleModalidade(m: ModalidadeFinanciamento) {
    setModalidade(m)
    addUserMsg(m === 'MCMV' ? 'MCMV — Minha Casa Minha Vida' : 'SBPE — Sistema Brasileiro de Poupança')
    setTimeout(() => {
      addBotMsg('Vamos começar pelo terreno. Preencha os dados abaixo:')
      setPhase('TERRENO')
    }, 400)
  }

  function handleTerreno(t: Terreno, uf: string) {
    setTerreno(t)
    setSelectedUf(uf)
    const valor = formatCurrency(t.valorAvaliacao)
    addUserMsg(`Terreno: ${t.municipio}, ${t.frenteMetros}x${t.fundoMetros}m, ${TOPOGRAFIA_LABELS[t.topografia]}, ${valor}`)
    setTimeout(() => {
      addBotMsg('Ótimo! Agora me diga: quantos quartos você deseja na sua casa?')
      setPhase('QUARTOS')
    }, 400)
  }

  function handleQuartos(q: number) {
    setQuartos(q)
    addUserMsg(`${q} quartos`)
    setTimeout(() => {
      if (!terreno) return
      const compatveis = plantas.filter(
        p =>
          p.quartos === q &&
          p.compatibilidadeTerreno.areaMinima <= terreno.areaTotalM2 &&
          p.compatibilidadeTerreno.frenteMinima <= terreno.frenteMetros
      )
      if (compatveis.length === 0) {
        addBotMsg(
          'Nenhuma planta compatível com o terreno informado e a quantidade de quartos selecionada.\n\nSugestão: verifique as dimensões do terreno ou considere ajustar o número de quartos.'
        )
        setPhase('QUARTOS')
      } else {
        addBotMsg(
          `Com base no seu terreno e na quantidade de quartos, encontrei ${compatveis.length} planta(s) compatível(is). Escolha uma:`
        )
        setPhase('PLANTA')
      }
    }, 400)
  }

  function handleChangeQuartos() {
    addBotMsg('Sem problemas! Vamos alterar o número de quartos. Quantos quartos você deseja?')
    setPhase('QUARTOS')
  }

  function getCompatiblePlantas(): PlantaPadrao[] {
    if (!terreno) return []
    return plantas.filter(
      p =>
        p.quartos === quartos &&
        p.compatibilidadeTerreno.areaMinima <= terreno.areaTotalM2 &&
        p.compatibilidadeTerreno.frenteMinima <= terreno.frenteMetros
    )
  }

  function handlePlanta(p: PlantaPadrao) {
    setSelectedPlanta(p)
    addUserMsg(p.nome)
    setTimeout(() => {
      setOpcionalIndex(0)
      setOpcionais([])
      const first = OPCIONAIS_PADRAO[0]
      addBotMsg(
        'Planta selecionada! Agora vou perguntar sobre opcionais para o seu projeto.\n\nDeseja incluir este item?',
        { nome: first.nome, descricao: first.descricao, vantagensCliente: first.vantagensCliente, desvantagensCliente: first.desvantagensCliente }
      )
      setPhase('OPCIONAIS')
    }, 400)
  }

  function handleOpcional(sim: boolean) {
    const item = OPCIONAIS_PADRAO[opcionalIndex]
    const opcionalCompleto: OpcionalItem = { ...item, selecionado: sim }
    const novosOpcionais = [...opcionais, opcionalCompleto]
    setOpcionais(novosOpcionais)
    addUserMsg(sim ? `Sim - ${item.nome}` : `Não - ${item.nome}`)

    const nextIdx = opcionalIndex + 1
    setOpcionalIndex(nextIdx)

    setTimeout(() => {
      if (nextIdx < OPCIONAIS_PADRAO.length) {
        const next = OPCIONAIS_PADRAO[nextIdx]
        addBotMsg(
          'Deseja incluir este item?',
          { nome: next.nome, descricao: next.descricao, vantagensCliente: next.vantagensCliente, desvantagensCliente: next.desvantagensCliente }
        )
      } else {
        const selecionados = novosOpcionais.filter(o => o.selecionado)
        const resumo =
          selecionados.length > 0
            ? `Opcionais selecionados: ${selecionados.map(o => o.nome).join(', ')}`
            : 'Nenhum opcional selecionado'
        addBotMsg(`${resumo}\n\nAgora, deseja adicionar alguma personalização ao projeto? Descreva abaixo ou clique em "Nenhuma personalização".`)
        setPhase('PERSONALIZACOES')
      }
    }, 400)
  }

  function handlePersonalizacoes(items: Personalizacao[]) {
    setPersonalizacoes(items)
    if (items.length > 0) {
      addUserMsg(`Personalizações: ${items.map(p => p.descricao).join('; ')}`)
    } else {
      addUserMsg('Sem personalizações')
    }
    setTimeout(() => {
      addBotMsg('Quase pronto! Escolha um nome para o seu projeto. Ele aparecerá em "Meus Orçamentos" para você identificar facilmente.')
      setPhase('NOME_PROJETO')
    }, 400)
  }

  function handleNomeProjeto(nome: string) {
    setNomeOrcamento(nome)
    addUserMsg(nome)

    setTimeout(() => {
      if (!terreno || !selectedPlanta) return

      const engData = loadEngineerData()
      const qtv = gerarQuantitativosFromParametros(selectedPlanta, opcionais)
      const faixa = calcularFaixaCotacao(qtv, engData.globalParams, engData.inccMensal, selectedPlanta.tempoObraMeses)

      const orc: Orcamento = {
        id: `orc-${Date.now()}`,
        nome,
        clienteId,
        dataCriacao: new Date().toISOString().slice(0, 10),
        status: 'aguardando_engenheiro',
        uf: selectedUf || 'SP',
        itens: [],
        parametros: {
          terreno,
          quartos,
          plantaId: selectedPlanta.id,
          opcionais,
          personalizacoes,
          modalidadeFinanciamento: modalidade,
        },
        faixaCotacao: faixa,
      }

      addBotMsg(
        `Projeto "${nome}" registrado com sucesso!\n\nCom base nas informações, estimamos que o valor ficará entre ${formatCurrency(faixa.minimo)} e ${formatCurrency(faixa.maximo)}.\n\nEssa é uma faixa estimada — o valor final depende de decisões técnicas que nosso engenheiro fará para buscar a melhor economia para você e para a construtora.\n\nNosso engenheiro já foi notificado e entrará em contato com o orçamento detalhado.`
      )
      setPhase('AGUARDANDO')
      onSaved(orc)
    }, 400)
  }

  function handleCartEdit(edited: CartEditResult) {
    if (edited.modalidade) setModalidade(edited.modalidade)
    if (edited.terreno) setTerreno(edited.terreno)
    if (edited.uf) setSelectedUf(edited.uf)
    if (edited.quartos) setQuartos(edited.quartos)
    if (edited.planta) setSelectedPlanta(edited.planta)

    if (edited.invalidated) {
      setSelectedPlanta(null)
      setOpcionais([])
      setPersonalizacoes([])
      setOpcionalIndex(0)
      const resetPhase = (edited.resetToPhase as Phase) ?? 'PLANTA'
      addBotMsg('As configurações foram alteradas pelo carrinho. Algumas escolhas anteriores foram redefinidas. Vamos continuar a partir daqui:')
      if (resetPhase === 'PLANTA') {
        addBotMsg('Escolha uma nova planta compatível com o terreno e quartos atualizados:')
      }
      setPhase(resetPhase)
      return
    }

    if (edited.planta === undefined && selectedPlanta) {
      setSelectedPlanta(null)
      setOpcionais([])
      setPersonalizacoes([])
    }
    if (edited.opcionais) setOpcionais(edited.opcionais)
    if (edited.personalizacoes !== undefined) setPersonalizacoes(edited.personalizacoes ?? [])
  }

  function renderInput() {
    switch (phase) {
      case 'MODALIDADE':
        return <ModalidadeInput onSelect={handleModalidade} />
      case 'TERRENO':
        return <TerrenoInput onConfirm={handleTerreno} />
      case 'QUARTOS':
        return <QuartosInput onSelect={handleQuartos} />
      case 'PLANTA':
        return <PlantaInput plantas={getCompatiblePlantas()} onSelect={handlePlanta} onChangeQuartos={handleChangeQuartos} />
      case 'OPCIONAIS':
        return opcionalIndex < OPCIONAIS_PADRAO.length ? (
          <OpcionalInput key={opcionalIndex} item={OPCIONAIS_PADRAO[opcionalIndex]} onAnswer={handleOpcional} />
        ) : null
      case 'PERSONALIZACOES':
        return <PersonalizacoesInput onConfirm={handlePersonalizacoes} />
      case 'NOME_PROJETO':
        return <NomeProjetoInput plantaNome={selectedPlanta?.nome ?? 'Projeto'} onConfirm={handleNomeProjeto} />
      default:
        return null
    }
  }

  const cartData = {
    modalidade: phase !== 'START' && phase !== 'MODALIDADE' ? modalidade : undefined,
    terreno: terreno ?? undefined,
    uf: selectedUf || undefined,
    quartos: quartos > 0 ? quartos : undefined,
    planta: selectedPlanta ?? undefined,
    opcionais: opcionais.length > 0 ? opcionais : undefined,
    personalizacoes: personalizacoes.length > 0 ? personalizacoes : undefined,
    faixaAtual,
  }
  const cartVisible = phase !== 'START' && phase !== 'AGUARDANDO'

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
            <h2 className="text-base-content text-lg font-semibold mb-2">Ana -- ConstruBot</h2>
            <p className="text-base-content/50 text-sm leading-relaxed max-w-sm">
              Sua assistente para projetos de construção. Vou coletar as informações do seu terreno, planta e preferências para que nosso engenheiro elabore seu orçamento.
            </p>
          </div>
          <button onClick={handleStart} className="btn btn-primary btn-wide rounded-full">
            Iniciar consulta
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
        {messages.map(m => (
          <Bubble key={m.id} msg={m} />
        ))}
        {phase === 'AGUARDANDO' && (
          <div className="flex flex-col items-center gap-3 mt-6 p-6 bg-base-200 rounded-xl">
            <MdHourglassTop size={40} className="text-warning animate-pulse" />
            <p className="text-base-content font-semibold text-sm">Aguardando análise do engenheiro</p>
            <p className="text-base-content/50 text-xs text-center max-w-xs">
              Seu projeto foi registrado. O engenheiro irá analisar os dados e calcular o orçamento detalhado.
            </p>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {phase !== 'START' && phase !== 'AGUARDANDO' && (
        <div className="flex-shrink-0 border-t border-secondary">
          {renderInput()}
        </div>
      )}
      <CarrinhoFlutuante
        data={cartData}
        onEdit={handleCartEdit}
        plantas={plantas}
        visible={cartVisible}
      />
    </div>
  )
}
