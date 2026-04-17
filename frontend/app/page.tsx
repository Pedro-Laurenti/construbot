'use client'

import { useState, useEffect } from 'react'
import { fetchWithAuth } from '@/lib/api'
import { loadStorage, saveStorage, clearStorage, loadRole, saveRole } from '@/lib/storage'
import { SEED_CLIENTE, SEED_ORCAMENTO } from '@/lib/mockData'
import OnboardingForm from '@/components/OnboardingForm'
import Sidebar from '@/components/Sidebar'
import OrcamentoChatFlow from '@/components/OrcamentoChatFlow'
import ResultadoOrcamento from '@/components/ResultadoOrcamento'
import EngineerApp from '@/components/engenheiro/EngineerApp'
import { MdSmartToy, MdApartment, MdHistory } from 'react-icons/md'
import { formatDate, formatCurrency } from '@/lib/formatters'
import EntregaResultado from '@/components/EntregaResultado'
import type { AppSession, Cliente, Orcamento, UserRole, ModalidadeFinanciamento } from '@/types'

export default function Home() {
  const [session, setSession] = useState<AppSession | null>(null)
  const [role, setRole] = useState<UserRole>('cliente')
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
  }

  if (!session) return null

  if (role === 'engenheiro') {
    return <EngineerApp onLogout={() => { saveRole('cliente'); setRole('cliente') }} />
  }

  if (!session.cliente) {
    return (
      <OnboardingForm
        onSubmit={handleOnboarding}
        onEngineerLogin={() => { saveRole('engenheiro'); setRole('engenheiro') }}
      />
    )
  }

  const selectedOrcamento = selectedId !== 'novo' && selectedId !== 'historico'
    ? session.orcamentos.find(o => o.id === selectedId)
    : null

  const chatHeader = selectedOrcamento
    ? { name: selectedOrcamento.nome || `Orçamento — ${selectedOrcamento.uf}`, sub: `${selectedOrcamento.uf} · ${selectedOrcamento.status}`, icon: <MdApartment size={22} />, bg: 'bg-accent' }
    : selectedId === 'historico'
      ? { name: 'Meus Orçamentos', sub: `${session.orcamentos.length} salvo(s)`, icon: <MdHistory size={22} />, bg: 'bg-warning' }
      : { name: 'Ana - ConstruBot', sub: 'Assistente de projetos', icon: <MdSmartToy size={22} />, bg: 'bg-info' }

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
              {selectedOrcamento.status === 'entregue' && selectedOrcamento.saida ? (
                <EntregaResultado
                  saida={selectedOrcamento.saida}
                  modalidade={selectedOrcamento.parametros?.modalidadeFinanciamento ?? 'SBPE'}
                  onBack={() => setSelectedId('historico')}
                />
              ) : selectedOrcamento.status === 'aguardando_engenheiro' ? (
                <div className="flex flex-col items-center justify-center h-full gap-6 px-6">
                  {selectedOrcamento.faixaCotacao ? (
                    <div className="max-w-lg w-full flex flex-col items-center gap-5">
                      <div className="card bg-primary/10 border border-primary/30 w-full">
                        <div className="card-body items-center text-center gap-2 p-6">
                          <p className="text-sm text-base-content/60 font-medium">Faixa Estimada do Projeto</p>
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-success">{formatCurrency(selectedOrcamento.faixaCotacao.minimo)}</span>
                            <span className="text-base-content/40 text-sm">a</span>
                            <span className="text-2xl font-bold text-error">{formatCurrency(selectedOrcamento.faixaCotacao.maximo)}</span>
                          </div>
                          <p className="text-xs text-base-content/40 mt-1">
                            {selectedOrcamento.faixaCotacao.areaConstruidaM2 > 0 &&
                              `${selectedOrcamento.faixaCotacao.areaConstruidaM2} m² · `}
                            {selectedOrcamento.faixaCotacao.tempoObraMeses} meses de obra · BDI 20% incluso
                          </p>
                        </div>
                      </div>
                      <div className="card bg-base-100 border border-base-300 w-full">
                        <div className="card-body p-4 text-sm text-base-content/60 leading-relaxed">
                          <p className="font-semibold text-base-content text-sm">Por que uma faixa de preço?</p>
                          <p>O valor final depende de decisões técnicas que o engenheiro fará para otimizar o custo da sua obra:</p>
                          <ul className="list-disc list-inside space-y-1 text-xs">
                            <li>Estratégia de contratação (MEI ou CLT)</li>
                            <li>Dimensionamento e produtividade das equipes</li>
                            <li>Negociação de materiais por região</li>
                            <li>Distribuição do fluxo de caixa ao longo da obra</li>
                          </ul>
                          <p className="text-xs mt-1">O engenheiro busca a melhor economia para você — e a construtora também sai ganhando com equipes mais produtivas.</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-base-content/40">
                        <div className="loading loading-dots loading-sm" />
                        <p className="text-xs">Aguardando análise detalhada do engenheiro</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="loading loading-dots loading-lg text-primary" />
                      <p className="text-base-content/50 text-sm">Aguardando análise do engenheiro</p>
                      <p className="text-base-content/30 text-xs">Você será notificado quando o resultado estiver pronto</p>
                    </>
                  )}
                </div>
              ) : (
                <ResultadoOrcamento
                  orcamento={selectedOrcamento}
                  onBack={() => setSelectedId('historico')}
                  isSaved
                />
              )}
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
                          <p className="font-semibold text-sm">{orc.nome || `Orçamento — ${orc.uf}`}</p>
                          <p className="text-base-content/50 text-xs">{orc.uf} · {formatDate(orc.dataCriacao)}</p>
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

