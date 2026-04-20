'use client'

import { useState, useRef, useEffect } from 'react'
import { MdSmartToy, MdCheck, MdChevronRight, MdEngineering, MdApartment, MdArrowBack } from 'react-icons/md'
import { formatNationalPhone } from '@/lib/formatters'
import { ENGINEER_PASSWORD, GOOGLE_MOCK_USER } from '@/lib/mockData'
import { findConta } from '@/lib/storage'
import { Bubble, botMsg, userMsg, TypingBubble, useBotTyping, type ChatMsg } from './OrcamentoChatFlow'
import type { AppSession, Cliente } from '@/types'

type Phase = 'START' | 'NOME' | 'TELEFONE' | 'EMAIL' | 'SENHA' | 'CONFIRMAR' | 'ENGENHEIRO_SENHA' | 'LOGIN_EMAIL' | 'LOGIN_SENHA' | 'LOGIN_NAO_ENCONTRADO' | 'CONCLUIDO'

interface Props {
  mode: 'cadastro' | 'edicao'
  existing?: Cliente
  onSubmit: (cliente: Cliente) => void
  onLoginExisting?: (session: AppSession) => void
  onEngineerLogin?: () => void
  onCancel?: () => void
}

function digitsOf(telefone: string): string {
  return telefone.replace(/\D/g, '').slice(0, 11)
}

function NomeInput({ initial, onConfirm, labelBotao }: { initial: string; onConfirm: (v: string) => void; labelBotao: string }) {
  const [valor, setValor] = useState(initial)
  const valido = valor.trim().length >= 2
  return (
    <div className="p-4 bg-base-300 flex-shrink-0">
      <fieldset className="fieldset">
        <legend className="fieldset-legend">Seu nome completo</legend>
        <input
          type="text"
          className="input w-full"
          value={valor}
          onChange={e => setValor(e.target.value)}
          placeholder="Como você gostaria de ser chamado"
          autoFocus
          onKeyDown={e => { if (e.key === 'Enter' && valido) onConfirm(valor.trim()) }}
        />
      </fieldset>
      <button disabled={!valido} onClick={() => onConfirm(valor.trim())} className="btn btn-primary w-full mt-2">
        {labelBotao} <MdChevronRight size={18} />
      </button>
    </div>
  )
}

function TelefoneInput({ initial, onConfirm, labelBotao }: { initial: string; onConfirm: (digitos: string) => void; labelBotao: string }) {
  const [digitos, setDigitos] = useState(initial)
  const valido = digitos.length >= 10
  return (
    <div className="p-4 bg-base-300 flex-shrink-0">
      <fieldset className="fieldset">
        <legend className="fieldset-legend">Telefone de contato</legend>
        <div className="flex items-center border border-base-content/20 rounded-lg overflow-hidden bg-base-100">
          <span className="text-base-content/40 text-sm px-3 font-mono border-r border-base-content/20 select-none self-stretch flex items-center">+55</span>
          <input
            type="tel"
            inputMode="numeric"
            value={formatNationalPhone(digitos)}
            onChange={e => setDigitos(e.target.value.replace(/\D/g, '').slice(0, 11))}
            placeholder="(11) 98765-4321"
            className="input flex-1 border-none bg-transparent font-mono text-sm"
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter' && valido) onConfirm(digitos) }}
          />
        </div>
        {digitos.length > 0 && !valido && (
          <p className="label text-error text-xs">Faltam {10 - digitos.length} dígito(s)</p>
        )}
      </fieldset>
      <button disabled={!valido} onClick={() => onConfirm(digitos)} className="btn btn-primary w-full mt-2">
        {labelBotao} <MdChevronRight size={18} />
      </button>
    </div>
  )
}

function EmailInput({ initial, onConfirm, labelBotao, legenda }: { initial: string; onConfirm: (v: string) => void; labelBotao: string; legenda?: string }) {
  const [valor, setValor] = useState(initial)
  const valido = /\S+@\S+\.\S+/.test(valor.trim())
  return (
    <div className="p-4 bg-base-300 flex-shrink-0">
      <fieldset className="fieldset">
        <legend className="fieldset-legend">{legenda ?? 'E-mail de contato'}</legend>
        <input
          type="email"
          className="input w-full"
          value={valor}
          onChange={e => setValor(e.target.value)}
          placeholder="voce@email.com"
          autoFocus
          onKeyDown={e => { if (e.key === 'Enter' && valido) onConfirm(valor.trim()) }}
        />
        {valor.trim() && !valido && (
          <p className="label text-error text-xs">Formato de e-mail inválido</p>
        )}
      </fieldset>
      <button disabled={!valido} onClick={() => onConfirm(valor.trim())} className="btn btn-primary w-full mt-2">
        {labelBotao} <MdChevronRight size={18} />
      </button>
    </div>
  )
}

function SenhaInput({ initial, onConfirm, labelBotao, legenda, ajuda, erro, minLen = 0 }: { initial: string; onConfirm: (v: string) => void; labelBotao: string; legenda: string; ajuda?: string; erro?: string; minLen?: number }) {
  const [valor, setValor] = useState(initial)
  const valido = valor.length >= minLen && valor.length > 0
  return (
    <div className="p-4 bg-base-300 flex-shrink-0">
      <fieldset className="fieldset">
        <legend className="fieldset-legend">{legenda}</legend>
        <input
          type="password"
          className={`input w-full ${erro ? 'input-error' : ''}`}
          value={valor}
          onChange={e => setValor(e.target.value)}
          placeholder="Digite sua senha"
          autoFocus
          onKeyDown={e => { if (e.key === 'Enter' && valido) onConfirm(valor) }}
        />
        {ajuda && !erro && <p className="label text-xs text-base-content/50">{ajuda}</p>}
        {erro && <p className="label text-error text-xs">{erro}</p>}
      </fieldset>
      <button disabled={!valido} onClick={() => onConfirm(valor)} className="btn btn-primary w-full mt-2">
        {labelBotao} <MdChevronRight size={18} />
      </button>
    </div>
  )
}

function LoginNaoEncontradoInput({ email, onCriarConta, onTentarOutro }: { email: string; onCriarConta: () => void; onTentarOutro: () => void }) {
  return (
    <div className="p-4 bg-base-300 flex-shrink-0 flex flex-col gap-2">
      <button onClick={onCriarConta} className="btn btn-primary w-full">
        <MdCheck size={18} /> Criar nova conta com {email}
      </button>
      <button onClick={onTentarOutro} className="btn btn-ghost w-full">
        <MdArrowBack size={16} /> Tentar outro e-mail
      </button>
    </div>
  )
}

function ConfirmarInput({ onConfirm, labelAcao }: { onConfirm: () => void; labelAcao: string }) {
  return (
    <div className="p-4 bg-base-300 flex-shrink-0">
      <button onClick={onConfirm} className="btn btn-primary w-full">
        <MdCheck size={18} /> {labelAcao}
      </button>
    </div>
  )
}

function SenhaEngenheiroInput({ onConfirm, onVoltar }: { onConfirm: (senha: string) => void; onVoltar: () => void }) {
  const [senha, setSenha] = useState('')
  return (
    <div className="p-4 bg-base-300 flex-shrink-0 flex flex-col gap-2">
      <fieldset className="fieldset">
        <legend className="fieldset-legend">Senha de acesso</legend>
        <input
          type="password"
          className="input w-full"
          value={senha}
          onChange={e => setSenha(e.target.value)}
          placeholder="Digite a senha"
          autoFocus
          onKeyDown={e => { if (e.key === 'Enter' && senha.trim()) onConfirm(senha) }}
        />
      </fieldset>
      <div className="flex gap-2">
        <button onClick={onVoltar} className="btn btn-ghost flex-1">
          <MdArrowBack size={16} /> Voltar
        </button>
        <button disabled={!senha.trim()} onClick={() => onConfirm(senha)} className="btn btn-primary flex-1">
          <MdEngineering size={18} /> Entrar
        </button>
      </div>
    </div>
  )
}

export default function OnboardingChatFlow({ mode, existing, onSubmit, onLoginExisting, onEngineerLogin, onCancel }: Props) {
  const ehEdicao = mode === 'edicao' && !!existing
  const [phase, setPhase] = useState<Phase>(() => ehEdicao ? 'CONFIRMAR' : 'START')
  const [nome, setNome] = useState(existing?.nome ?? '')
  const [telefoneDigitos, setTelefoneDigitos] = useState(existing ? digitsOf(existing.telefone) : '')
  const [email, setEmail] = useState(existing?.email ?? '')
  const [emailLoginTentado, setEmailLoginTentado] = useState('')
  const [viaGoogle, setViaGoogle] = useState(false)
  const [senha, setSenha] = useState('')
  const [sessaoPendenteLogin, setSessaoPendenteLogin] = useState<AppSession | null>(null)
  const [erroLoginSenha, setErroLoginSenha] = useState('')
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [erroSenha, setErroSenha] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  function addBot(texto: string) {
    setMessages(prev => [...prev, botMsg(texto)])
  }

  function addUser(texto: string, editKey?: string) {
    setMessages(prev => [...prev, userMsg(texto, editKey)])
  }

  const { digitando, enviar: enviarBot } = useBotTyping(addBot)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, phase, digitando])

  useEffect(() => {
    if (!ehEdicao || !existing) return
    enviarBot(
      `Olá ${existing.nome.split(' ')[0]}! Estes são os dados que tenho em cadastro. Clique em "editar" em qualquer informação para atualizar.`,
      undefined,
      () => {
        setMessages(prev => [
          ...prev,
          userMsg(`Meu nome é ${existing.nome}`, 'nome'),
          userMsg(`Telefone: ${existing.telefone}`, 'telefone'),
          userMsg(`E-mail: ${existing.email}`, 'email'),
        ])
        enviarBot('Quando estiver tudo certo, confirme para salvar as alterações.')
      }
    )
  }, [])

  function iniciarCadastro() {
    setMessages([])
    enviarBot('Olá! Eu sou a Ana, da ConstruBot. Vou te ajudar a criar seu cadastro em poucos passos — nada de formulários longos.')
    enviarBot('Para começar, qual é o seu nome completo?', undefined, () => setPhase('NOME'))
  }

  function iniciarLogin() {
    setMessages([])
    enviarBot('Que bom te ver de volta! Me diga qual e-mail você usou no cadastro para eu recuperar sua conta.', undefined, () => setPhase('LOGIN_EMAIL'))
  }

  function entrarComGoogle() {
    const { nome: nomeGoogle, email: emailGoogle } = GOOGLE_MOCK_USER
    const sessao = findConta(emailGoogle)
    // Se a conta ja existir para o e-mail retornado pelo Google, pulamos o onboarding e restauramos direto.
    if (sessao && sessao.cliente && onLoginExisting) {
      setMessages([])
      enviarBot(`Encontrei sua conta Google! Bem-vindo de volta, ${sessao.cliente.nome.split(' ')[0]}.`, undefined, () => {
        setPhase('CONCLUIDO')
        onLoginExisting(sessao)
      })
      return
    }
    setNome(nomeGoogle)
    setEmail(emailGoogle)
    setViaGoogle(true)
    setMessages([
      userMsg(`Meu nome é ${nomeGoogle}`, 'nome'),
      userMsg(`E-mail: ${emailGoogle}`, 'email'),
    ])
    enviarBot(`Oi, ${nomeGoogle.split(' ')[0]}! Peguei seu nome e e-mail do Google. Só falta o seu telefone para finalizar.`)
    enviarBot('Qual é o seu telefone de contato?', undefined, () => setPhase('TELEFONE'))
  }

  function iniciarEngenheiro() {
    setMessages([])
    enviarBot('Entendi, você é engenheiro. Me diga a senha de acesso para entrar na área administrativa.', undefined, () => {
      setErroSenha('')
      setPhase('ENGENHEIRO_SENHA')
    })
  }

  function voltarParaInicio() {
    setMessages([])
    setErroSenha('')
    setEmailLoginTentado('')
    setPhase('START')
  }

  function confirmarLoginEmail(valor: string) {
    setEmailLoginTentado(valor)
    addUser(`E-mail: ${valor}`)
    const sessao = findConta(valor)
    if (sessao && sessao.cliente && onLoginExisting) {
      setSessaoPendenteLogin(sessao)
      setErroLoginSenha('')
      enviarBot(
        `Encontrei sua conta, ${sessao.cliente.nome.split(' ')[0]}! Agora me diga sua senha para entrar.`,
        undefined,
        () => setPhase('LOGIN_SENHA')
      )
      return
    }
    enviarBot(
      `Não encontrei nenhuma conta com o e-mail ${valor} neste dispositivo. Deseja criar uma nova conta com esse e-mail ou tentar outro?`,
      undefined,
      () => setPhase('LOGIN_NAO_ENCONTRADO')
    )
  }

  function confirmarLoginSenha(valor: string) {
    if (!sessaoPendenteLogin || !sessaoPendenteLogin.cliente) return
    if (sessaoPendenteLogin.cliente.senha !== valor) {
      setErroLoginSenha('Senha incorreta. Tente novamente.')
      return
    }
    setErroLoginSenha('')
    addUser(`Senha: ${'•'.repeat(Math.min(valor.length, 10))}`)
    const sessao = sessaoPendenteLogin
    enviarBot(`Tudo certo! Bem-vindo de volta, ${sessao.cliente!.nome.split(' ')[0]}.`, undefined, () => {
      setPhase('CONCLUIDO')
      if (onLoginExisting) onLoginExisting(sessao)
    })
  }

  function voltarDoLoginSenha() {
    setSessaoPendenteLogin(null)
    setErroLoginSenha('')
    enviarBot('Sem problema. Me diga qual outro e-mail você quer usar.', undefined, () => setPhase('LOGIN_EMAIL'))
  }

  function converterLoginEmCadastro() {
    setEmail(emailLoginTentado)
    addUser('Criar nova conta')
    enviarBot(
      `Perfeito! Vamos criar sua conta com o e-mail ${emailLoginTentado}. Para começar, qual é o seu nome completo?`,
      undefined,
      () => setPhase('NOME')
    )
  }

  function tentarOutroEmail() {
    setEmailLoginTentado('')
    enviarBot('Sem problema. Me diga qual outro e-mail você quer usar.', undefined, () => setPhase('LOGIN_EMAIL'))
  }

  function confirmarNome(valor: string) {
    setNome(valor)
    const jaExiste = messages.some(m => m.editKey === 'nome')
    if (jaExiste) {
      setMessages(prev => prev.map(m => m.editKey === 'nome' ? { ...m, text: `Meu nome é ${valor}` } : m))
      setPhase('CONFIRMAR')
      return
    }
    addUser(`Meu nome é ${valor}`, 'nome')
    enviarBot(`Prazer em te conhecer, ${valor.split(' ')[0]}! Qual é o seu telefone de contato?`, undefined, () => setPhase('TELEFONE'))
  }

  function confirmarTelefone(digitos: string) {
    setTelefoneDigitos(digitos)
    const formatado = formatNationalPhone(digitos)
    const jaExiste = messages.some(m => m.editKey === 'telefone')
    if (jaExiste) {
      setMessages(prev => prev.map(m => m.editKey === 'telefone' ? { ...m, text: `Telefone: ${formatado}` } : m))
      setPhase('CONFIRMAR')
      return
    }
    addUser(`Telefone: ${formatado}`, 'telefone')
    if (viaGoogle) {
      enviarBot('Prontinho! Confira se está tudo certo e confirme para continuar.', undefined, () => setPhase('CONFIRMAR'))
      return
    }
    enviarBot('Perfeito. E um e-mail para manter contato sobre seus orçamentos?', undefined, () => setPhase('EMAIL'))
  }

  function confirmarEmail(valor: string) {
    setEmail(valor)
    const jaExiste = messages.some(m => m.editKey === 'email')
    if (jaExiste) {
      setMessages(prev => prev.map(m => m.editKey === 'email' ? { ...m, text: `E-mail: ${valor}` } : m))
      setPhase('CONFIRMAR')
      return
    }
    addUser(`E-mail: ${valor}`, 'email')
    enviarBot('Agora escolha uma senha para proteger sua conta. Use pelo menos 6 caracteres.', undefined, () => setPhase('SENHA'))
  }

  function confirmarSenha(valor: string) {
    setSenha(valor)
    const jaExiste = messages.some(m => m.editKey === 'senha')
    const mascarada = '•'.repeat(Math.min(valor.length, 10))
    if (jaExiste) {
      setMessages(prev => prev.map(m => m.editKey === 'senha' ? { ...m, text: `Senha: ${mascarada}` } : m))
      setPhase('CONFIRMAR')
      return
    }
    addUser(`Senha: ${mascarada}`, 'senha')
    enviarBot('Prontinho! Confira se está tudo certo e confirme para criar sua conta.', undefined, () => setPhase('CONFIRMAR'))
  }

  function finalizar() {
    const telefoneFmt = formatNationalPhone(telefoneDigitos)
    const cliente: Cliente = ehEdicao && existing
      ? { ...existing, nome, telefone: telefoneFmt, email }
      : {
          id: `cli-${Date.now()}`,
          nome,
          telefone: telefoneFmt,
          email,
          dataCadastro: new Date().toISOString().slice(0, 10),
          senha: senha || undefined,
        }
    addUser(ehEdicao ? 'Salvar alterações' : 'Confirmar cadastro')
    const texto = ehEdicao
      ? 'Suas informações foram atualizadas com sucesso!'
      : `Cadastro concluído, ${nome.split(' ')[0]}! Pode começar a usar a ConstruBot.`
    enviarBot(texto, undefined, () => {
      setPhase('CONCLUIDO')
      onSubmit(cliente)
    })
  }

  function validarSenhaEngenheiro(senha: string) {
    if (senha === ENGINEER_PASSWORD) {
      onEngineerLogin?.()
    } else {
      setErroSenha('Senha incorreta. Tente novamente.')
    }
  }

  function tratarEdicao(chave: string) {
    if (chave === 'nome') setPhase('NOME')
    else if (chave === 'telefone') setPhase('TELEFONE')
    else if (chave === 'email') setPhase('EMAIL')
    else if (chave === 'senha') setPhase('SENHA')
  }

  function renderInput() {
    const jaPassouSenha = messages.some(m => m.editKey === 'senha')
    const labelContinuar = jaPassouSenha ? 'Salvar' : 'Continuar'
    if (phase === 'NOME') return <NomeInput initial={nome} onConfirm={confirmarNome} labelBotao={labelContinuar} />
    if (phase === 'TELEFONE') return <TelefoneInput initial={telefoneDigitos} onConfirm={confirmarTelefone} labelBotao={labelContinuar} />
    if (phase === 'EMAIL') return <EmailInput initial={email} onConfirm={confirmarEmail} labelBotao={labelContinuar} />
    if (phase === 'SENHA') return <SenhaInput initial={senha} onConfirm={confirmarSenha} labelBotao={labelContinuar} legenda="Crie uma senha" ajuda="Mínimo de 6 caracteres" minLen={6} />
    if (phase === 'CONFIRMAR') return <ConfirmarInput onConfirm={finalizar} labelAcao={ehEdicao ? 'Salvar alterações' : 'Confirmar cadastro'} />
    if (phase === 'ENGENHEIRO_SENHA') return <SenhaEngenheiroInput onConfirm={validarSenhaEngenheiro} onVoltar={voltarParaInicio} />
    if (phase === 'LOGIN_EMAIL') return <EmailInput initial={emailLoginTentado} onConfirm={confirmarLoginEmail} labelBotao="Continuar" legenda="E-mail do seu cadastro" />
    if (phase === 'LOGIN_SENHA') return (
      <div className="flex flex-col gap-2">
        <SenhaInput initial="" onConfirm={confirmarLoginSenha} labelBotao="Entrar" legenda="Sua senha" erro={erroLoginSenha} minLen={1} />
        <button onClick={voltarDoLoginSenha} className="btn btn-ghost btn-sm mx-4 mb-3 text-base-content/50">
          <MdArrowBack size={14} /> Usar outro e-mail
        </button>
      </div>
    )
    if (phase === 'LOGIN_NAO_ENCONTRADO') return <LoginNaoEncontradoInput email={emailLoginTentado} onCriarConta={converterLoginEmCadastro} onTentarOutro={tentarOutroEmail} />
    return null
  }

  if (!ehEdicao && phase === 'START') {
    return (
      <div className="min-h-screen flex flex-col bg-base-200">
        <div className="flex-1 flex flex-col items-center justify-center px-8 gap-8">
          <div className="flex items-center gap-3">
            <div className="avatar placeholder">
              <div className="w-12 rounded-xl bg-primary text-primary-content flex items-center justify-center">
                <MdApartment size={26} />
              </div>
            </div>
            <span className="text-base-content text-2xl font-bold tracking-tight">ConstruBot</span>
          </div>
          <div className="avatar placeholder">
            <div className="w-20 rounded-full bg-base-300 text-info">
              <MdSmartToy size={44} />
            </div>
          </div>
          <div className="text-center max-w-md">
            <h2 className="text-base-content text-xl font-semibold mb-2">Oi! Eu sou a Ana</h2>
            <p className="text-base-content/60 text-sm leading-relaxed">
              Sua assistente para projetos de construção. Sem tela de login, sem formulários longos — vamos conversar e já criar seu cadastro por aqui mesmo.
            </p>
          </div>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button onClick={iniciarCadastro} className="btn btn-primary w-full">
              Criar minha conta
            </button>

            {onLoginExisting && (
              <>
                <div className="flex items-center gap-3 py-1">
                  <span className="h-px bg-base-content/10 flex-1" />
                  <span className="text-[10px] tracking-widest uppercase text-base-content/40">ou</span>
                  <span className="h-px bg-base-content/10 flex-1" />
                </div>
                <div className="flex gap-2">
                  <button onClick={iniciarLogin} className="btn btn-outline flex-1">
                    Entrar
                  </button>
                  <button
                    onClick={entrarComGoogle}
                    aria-label="Continuar com Google"
                    title="Continuar com Google"
                    className="btn btn-outline btn-square bg-base-100 hover:bg-base-200 border-base-content/20"
                  >
                    <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">
                      <path fill="#4285F4" d="M47.5 24.6c0-1.6-.1-3.1-.4-4.6H24v8.7h13.1c-.6 3-2.3 5.5-4.9 7.2v6h7.9c4.6-4.3 7.4-10.6 7.4-17.3z" />
                      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.9-6c-2.1 1.4-4.8 2.3-8 2.3-6.1 0-11.3-4.1-13.2-9.7H2.7v6.2C6.7 42.7 14.8 48 24 48z" />
                      <path fill="#FBBC05" d="M10.8 28.8c-.5-1.4-.7-2.9-.7-4.4s.3-3 .7-4.4v-6.2H2.7C1 17.1 0 20.4 0 24s1 6.9 2.7 10.2l8.1-5.4z" />
                      <path fill="#EA4335" d="M24 9.5c3.4 0 6.5 1.2 8.9 3.5l6.7-6.7C35.9 2.4 30.5 0 24 0 14.8 0 6.7 5.3 2.7 13.8l8.1 5.4C12.7 13.6 17.9 9.5 24 9.5z" />
                    </svg>
                  </button>
                </div>
              </>
            )}

            {onEngineerLogin && (
              <button onClick={iniciarEngenheiro} className="btn btn-ghost btn-sm gap-2 text-base-content/40 hover:text-base-content mt-6">
                <MdEngineering size={16} /> Sou engenheiro
              </button>
            )}
          </div>
        </div>
        <p className="text-base-content/30 text-xs text-center py-4">© 2026 ConstruBot</p>
      </div>
    )
  }

  const subtitulo = phase === 'ENGENHEIRO_SENHA' ? 'Acesso do engenheiro' : 'Criando sua conta'

  return (
    <div className={`${ehEdicao ? 'h-full' : 'min-h-screen'} flex flex-col bg-base-200`}>
      {!ehEdicao && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-base-300 border-b border-secondary flex-shrink-0">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0 bg-info">
            <MdSmartToy size={22} />
          </div>
          <div>
            <p className="text-base-content font-semibold text-sm">Ana — ConstruBot</p>
            <p className="text-base-content/50 text-xs">{subtitulo}</p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-[6%] py-4">
        <div className="flex justify-center mb-3">
          <span className="badge badge-ghost text-base-content/40 text-xs">
            {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </span>
        </div>
        {messages.map(m => (
          <Bubble key={m.id} msg={m} onEdit={phase !== 'CONCLUIDO' ? tratarEdicao : undefined} />
        ))}
        {digitando && <TypingBubble />}
        {erroSenha && phase === 'ENGENHEIRO_SENHA' && (
          <div className="alert alert-error text-sm py-2 mt-2">{erroSenha}</div>
        )}
        <div ref={endRef} />
      </div>

      {phase !== 'CONCLUIDO' && (
        <div className="flex-shrink-0 border-t border-secondary">
          {renderInput()}
        </div>
      )}
    </div>
  )
}
