'use client'

import { useState, useEffect } from 'react'
import { fetchWithAuth } from '@/lib/api'
import { loadStorage, saveStorage, clearStorage, loadRole, saveRole } from '@/lib/storage'
import { SEED_CLIENTE, SEED_ORCAMENTO } from '@/lib/mockData'
import LoginPage from '@/components/LoginPage'
import OnboardingForm from '@/components/OnboardingForm'
import Sidebar from '@/components/Sidebar'
import OrcamentoChatFlow from '@/components/OrcamentoChatFlow'
import ResultadoOrcamento from '@/components/ResultadoOrcamento'
import EngineerApp from '@/components/engenheiro/EngineerApp'
import { MdSmartToy, MdApartment, MdHistory } from 'react-icons/md'
import { formatDate } from '@/lib/formatters'
import type { AppSession, Cliente, Orcamento, UserRole } from '@/types'

export default function Home() {
  const [session, setSession] = useState<AppSession | null>(null)
  const [role, setRole] = useState<UserRole>('cliente')
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [selectedId, setSelectedId] = useState<string>('novo')
  const [apiStatus, setApiStatus] = useState<'loading' | 'ok' | 'error'>('loading')

  useEffect(() => {
    const r = loadRole()
    setRole(r)
    const stored = loadStorage()
    const isDemo = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo') === '1'
    if (isDemo && !stored.cliente) {
      const demo: AppSession = { cliente: SEED_CLIENTE, orcamentos: [SEED_ORCAMENTO], orcamentoAtivo: null }
      saveStorage(demo)
      setSession(demo)
    } else {
      setSession(stored)
    }
    fetchWithAuth('/api/health')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((d: { status: string }) => setApiStatus(d.status === 'ok' ? 'ok' : 'error'))
      .catch(() => setApiStatus('error'))
  }, [])

  function handleOnboarding(cliente: Cliente) {
    const updated: AppSession = { ...loadStorage(), cliente }
    saveStorage(updated)
    setSession(updated)
  }

  function handleOrcamentoSaved(orc: Orcamento) {
    if (!session) return
    const exists = session.orcamentos.find(o => o.id === orc.id)
    const orcamentos = exists
      ? session.orcamentos.map(o => o.id === orc.id ? orc : o)
      : [...session.orcamentos, orc]
    const updated: AppSession = { ...session, orcamentos }
    saveStorage(updated)
    setSession(updated)
    setSelectedId(orc.id)
  }

  function handleDeleteOrcamento(id: string) {
    if (!session) return
    const updated: AppSession = { ...session, orcamentos: session.orcamentos.filter(o => o.id !== id) }
    saveStorage(updated)
    setSession(updated)
    if (selectedId === id) setSelectedId('novo')
  }

  function handleLogout() {
    clearStorage()
    setSession({ cliente: null, orcamentos: [], orcamentoAtivo: null })
    setShowOnboarding(false)
  }

  if (!session) return null

  if (role === 'engenheiro') {
    return <EngineerApp onLogout={() => { saveRole('cliente'); setRole('cliente') }} />
  }

  if (!session.cliente && !showOnboarding) {
    return <LoginPage onLogin={() => setShowOnboarding(true)} onEngineerLogin={() => { saveRole('engenheiro'); setRole('engenheiro') }} />
  }

  if (!session.cliente) return <OnboardingForm onSubmit={handleOnboarding} />

  const selectedOrcamento = selectedId !== 'novo' && selectedId !== 'historico'
    ? session.orcamentos.find(o => o.id === selectedId)
    : null

  const chatHeader = selectedOrcamento
    ? { name: `Cotação — ${selectedOrcamento.uf}`, sub: `${selectedOrcamento.itens.length} serviço(s)`, icon: <MdApartment size={22} />, bg: 'bg-accent' }
    : selectedId === 'historico'
      ? { name: 'Meus Orçamentos', sub: `${session.orcamentos.length} salvo(s)`, icon: <MdHistory size={22} />, bg: 'bg-warning' }
      : { name: 'Ana — ConstruBot', sub: 'online', icon: <MdSmartToy size={22} />, bg: 'bg-info' }

  return (
    <div className="flex h-screen overflow-hidden">
      <span className={`fixed top-2 left-[370px] z-50 w-2 h-2 rounded-full ${apiStatus === 'ok' ? 'bg-success' : apiStatus === 'error' ? 'bg-error' : 'bg-base-300 animate-pulse'}`} />

      <Sidebar
        orcamentos={session.orcamentos}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onLogout={handleLogout}
        userName={session.cliente.nome}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden bg-base-200">
        <div className="flex items-center gap-3 px-4 py-2.5 bg-base-300 border-b border-secondary flex-shrink-0">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0 ${chatHeader.bg}`}>
            {chatHeader.icon}
          </div>
          <div>
            <p className="text-base-content font-semibold text-sm">{chatHeader.name}</p>
            <p className="text-base-content/50 text-xs">{chatHeader.sub}</p>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {selectedOrcamento ? (
            <div className="h-full overflow-y-auto">
              <ResultadoOrcamento
                orcamento={selectedOrcamento}
                onBack={() => setSelectedId('historico')}
                isSaved
              />
            </div>
          ) : selectedId === 'historico' ? (
            <div className="h-full overflow-y-auto p-6">
              <div className="max-w-2xl mx-auto">
                <p className="text-base-content/50 text-xs uppercase tracking-wide mb-4">
                  {session.orcamentos.length} orçamento(s) salvo(s)
                </p>
                <div className="flex flex-col gap-2">
                  {session.orcamentos.map(orc => (
                    <button key={orc.id} onClick={() => setSelectedId(orc.id)}
                      className="card bg-base-100 hover:bg-base-300 transition-colors w-full text-left">
                      <div className="card-body p-4 flex-row items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                          <MdApartment size={22} className="text-accent-content" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">Cotação — {orc.uf}</p>
                          <p className="text-base-content/50 text-xs">{orc.itens.length} serviço(s) · {formatDate(orc.dataCriacao)}</p>
                        </div>
                        <span className={`badge badge-sm flex-shrink-0 ${orc.status === 'calculado' ? 'badge-success' : 'badge-ghost'}`}>{orc.status}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <OrcamentoChatFlow
              key={`chat-${session.orcamentos.length}`}
              clienteId={session.cliente.id}
              onSaved={handleOrcamentoSaved}
            />
          )}
        </div>
      </div>
    </div>
  )
}

