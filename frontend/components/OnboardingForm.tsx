'use client'

import { useState } from 'react'
import { MdApartment, MdHandyman, MdDescription, MdCalculate, MdArrowForward, MdEngineering } from 'react-icons/md'
import { formatNationalPhone } from '@/lib/formatters'
import { ENGINEER_PASSWORD } from '@/lib/mockData'
import type { Cliente } from '@/types'

interface Props {
  onSubmit: (cliente: Cliente) => void
  onEngineerLogin?: () => void
}

const FEATURES = [
  { icon: <MdCalculate size={20} />, title: 'Orçamento Preciso', desc: 'Estimativas detalhadas por serviço com fórmulas SINAPI.' },
  { icon: <MdHandyman size={20} />, title: 'MEI ou CLT', desc: 'Compare contratos e encontre a melhor modalidade.' },
  { icon: <MdDescription size={20} />, title: 'Histórico Completo', desc: 'Salve e consulte todos os orçamentos gerados.' },
]

export default function OnboardingForm({ onSubmit, onEngineerLogin }: Props) {
  const [tab, setTab] = useState<'manual' | 'google'>('manual')
  const [nome, setNome] = useState('')
  const [phoneDigits, setPhoneDigits] = useState('')
  const [email, setEmail] = useState('')
  const [googlePrefill, setGooglePrefill] = useState<{ nome: string; email: string } | null>(null)
  const [googlePhone, setGooglePhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showEngineerForm, setShowEngineerForm] = useState(false)
  const [engPassword, setEngPassword] = useState('')
  const [engError, setEngError] = useState('')

  function handleEngineerAccess(e: React.FormEvent) {
    e.preventDefault()
    if (engPassword === ENGINEER_PASSWORD) {
      onEngineerLogin?.()
    } else {
      setEngError('Senha incorreta.')
    }
  }

  const phoneValid = phoneDigits.length >= 10

  function handlePhone(e: React.ChangeEvent<HTMLInputElement>) {
    setPhoneDigits(e.target.value.replace(/\D/g, '').slice(0, 11))
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim() || !phoneValid || !email.trim()) {
      setError('Preencha todos os campos corretamente.')
      return
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('E-mail inválido.')
      return
    }
    setError('')
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      onSubmit({
        id: `cli-${Date.now()}`,
        nome: nome.trim(),
        telefone: formatNationalPhone(phoneDigits),
        email: email.trim(),
        dataCadastro: new Date().toISOString().slice(0, 10),
      })
    }, 600)
  }

  function handleGoogleLogin() {
    setGooglePrefill({ nome: 'Usuário Google', email: 'usuario@gmail.com' })
  }

  const googlePhoneValid = googlePhone.length >= 10

  function handleGooglePhone(e: React.ChangeEvent<HTMLInputElement>) {
    setGooglePhone(e.target.value.replace(/\D/g, '').slice(0, 11))
  }

  function handleGoogleComplete(e: React.FormEvent) {
    e.preventDefault()
    if (!googlePrefill) return
    if (!googlePhoneValid) {
      setError('Preencha todos os campos corretamente.')
      return
    }
    setError('')
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      onSubmit({
        id: `cli-google-${Date.now()}`,
        nome: googlePrefill.nome,
        telefone: formatNationalPhone(googlePhone),
        email: googlePrefill.email,
        dataCadastro: new Date().toISOString().slice(0, 10),
      })
    }, 600)
  }

  return (
    <div className="min-h-screen flex bg-base-200">
      <div className="hidden lg:flex flex-col justify-between w-[440px] bg-primary px-12 py-14 flex-shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-16">
            <div className="avatar placeholder">
              <div className="w-10 rounded-xl bg-primary-content/20 text-primary-content flex items-center justify-center">
                <MdApartment size={22} />
              </div>
            </div>
            <span className="text-primary-content text-xl font-bold tracking-tight">ConstruBot</span>
          </div>
          <h1 className="text-primary-content text-4xl font-bold leading-tight mb-4">Orçamento de obras com precisão SINAPI.</h1>
          <p className="text-primary-content/80 text-base leading-relaxed">Cadastre-se e calcule custos reais de mão de obra e materiais para qualquer serviço de construção civil.</p>
        </div>
        <div className="flex flex-col gap-5">
          {FEATURES.map(f => (
            <div key={f.title} className="flex items-start gap-4">
              <div className="avatar placeholder flex-shrink-0">
                <div className="w-10 rounded-xl bg-primary-content/20 text-primary-content flex items-center justify-center">{f.icon}</div>
              </div>
              <div>
                <p className="text-primary-content font-semibold text-sm">{f.title}</p>
                <p className="text-primary-content/70 text-sm">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-primary-content/50 text-xs">© 2026 ConstruBot</p>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="card bg-base-100 shadow-xl w-full max-w-sm">
          <div className="card-body gap-4">
            <h2 className="card-title text-xl">Bem-vindo ao ConstruBot</h2>

            <div role="tablist" className="tabs tabs-boxed">
              <button role="tab" onClick={() => { setTab('manual'); setError('') }} className={`tab flex-1 ${tab === 'manual' ? 'tab-active' : ''}`}>
                Cadastro
              </button>
              <button role="tab" onClick={() => { setTab('google'); setError('') }} className={`tab flex-1 ${tab === 'google' ? 'tab-active' : ''}`}>
                Google
              </button>
            </div>

            {tab === 'manual' ? (
              <form onSubmit={handleManualSubmit} className="flex flex-col gap-4">
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Nome completo</legend>
                  <input value={nome} onChange={e => setNome(e.target.value)} type="text" className="input w-full" placeholder="Seu nome completo" />
                </fieldset>

                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Telefone</legend>
                  <div className="flex items-center border border-base-content/20 rounded-lg overflow-hidden bg-base-100">
                    <span className="text-base-content/40 text-sm px-3 font-mono border-r border-base-content/20 select-none self-stretch flex items-center">+55</span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={formatNationalPhone(phoneDigits)}
                      onChange={handlePhone}
                      placeholder="(11) 98765-4321"
                      className="input flex-1 border-none bg-transparent font-mono text-sm"
                    />
                  </div>
                  {phoneDigits.length > 0 && !phoneValid && (
                    <p className="label text-error text-xs">Faltam {10 - phoneDigits.length} dígito(s)</p>
                  )}
                </fieldset>

                <fieldset className="fieldset">
                  <legend className="fieldset-legend">E-mail</legend>
                  <input value={email} onChange={e => setEmail(e.target.value)} type="email" className="input w-full" placeholder="seu@email.com" />
                </fieldset>

                {error && <div className="alert alert-error text-sm py-2">{error}</div>}

                <button type="submit" disabled={loading} className="btn btn-primary w-full">
                  {loading ? <span className="loading loading-spinner loading-sm" /> : <><MdArrowForward size={18} /> Começar</>}
                </button>
              </form>
            ) : googlePrefill ? (
              <form onSubmit={handleGoogleComplete} className="flex flex-col gap-4">
                <div className="alert alert-info text-sm py-2">
                  Conectado como <strong>{googlePrefill.nome}</strong> ({googlePrefill.email}). Complete seus dados.
                </div>

                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Telefone</legend>
                  <div className="flex items-center border border-base-content/20 rounded-lg overflow-hidden bg-base-100">
                    <span className="text-base-content/40 text-sm px-3 font-mono border-r border-base-content/20 select-none self-stretch flex items-center">+55</span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={formatNationalPhone(googlePhone)}
                      onChange={handleGooglePhone}
                      placeholder="(11) 98765-4321"
                      className="input flex-1 border-none bg-transparent font-mono text-sm"
                    />
                  </div>
                  {googlePhone.length > 0 && !googlePhoneValid && (
                    <p className="label text-error text-xs">Faltam {10 - googlePhone.length} dígito(s)</p>
                  )}
                </fieldset>

                {error && <div className="alert alert-error text-sm py-2">{error}</div>}

                <button type="submit" disabled={loading} className="btn btn-primary w-full">
                  {loading ? <span className="loading loading-spinner loading-sm" /> : <><MdArrowForward size={18} /> Começar</>}
                </button>
              </form>
            ) : (
              <div className="flex flex-col gap-4">
                <p className="text-base-content/60 text-sm text-center leading-relaxed">
                  Use sua conta Google para acessar a plataforma de forma rápida e segura.
                </p>
                <button onClick={handleGoogleLogin} disabled={loading} className="btn btn-outline w-full gap-3">
                  {loading ? <span className="loading loading-spinner loading-sm" /> : (
                    <svg viewBox="0 0 48 48" width="18" height="18">
                      <path fill="#4285F4" d="M47.5 24.6c0-1.6-.1-3.1-.4-4.6H24v8.7h13.1c-.6 3-2.3 5.5-4.9 7.2v6h7.9c4.6-4.3 7.4-10.6 7.4-17.3z" />
                      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.9-6c-2.1 1.4-4.8 2.3-8 2.3-6.1 0-11.3-4.1-13.2-9.7H2.7v6.2C6.7 42.7 14.8 48 24 48z" />
                      <path fill="#FBBC05" d="M10.8 28.8c-.5-1.4-.7-2.9-.7-4.4s.3-3 .7-4.4v-6.2H2.7C1 17.1 0 20.4 0 24s1 6.9 2.7 10.2l8.1-5.4z" />
                      <path fill="#EA4335" d="M24 9.5c3.4 0 6.5 1.2 8.9 3.5l6.7-6.7C35.9 2.4 30.5 0 24 0 14.8 0 6.7 5.3 2.7 13.8l8.1 5.4C12.7 13.6 17.9 9.5 24 9.5z" />
                    </svg>
                  )}
                  Entrar com Google
                </button>
                <p className="text-base-content/30 text-xs text-center">Demonstração — sem OAuth real</p>
              </div>
            )}

            {onEngineerLogin && (
              <>
                <div className="divider my-0" />
                {showEngineerForm ? (
                  <form onSubmit={handleEngineerAccess} className="flex flex-col gap-3">
                    <fieldset className="fieldset">
                      <legend className="fieldset-legend">Senha de acesso</legend>
                      <input
                        type="password"
                        value={engPassword}
                        onChange={e => { setEngPassword(e.target.value); setEngError('') }}
                        placeholder="Senha do engenheiro"
                        className={`input w-full ${engError ? 'input-error' : ''}`}
                        autoFocus
                      />
                    </fieldset>
                    {engError && <div className="alert alert-error py-2"><span className="text-xs">{engError}</span></div>}
                    <button type="submit" className="btn btn-primary btn-sm w-full">
                      <MdEngineering size={16} /> Entrar como Engenheiro
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowEngineerForm(false); setEngError(''); setEngPassword('') }}
                      className="link link-primary text-xs text-center"
                    >
                      Voltar ao cadastro
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowEngineerForm(true)}
                    className="btn btn-ghost btn-sm gap-2 text-base-content/50 hover:text-base-content"
                  >
                    <MdEngineering size={16} /> Acesso Engenheiro
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
