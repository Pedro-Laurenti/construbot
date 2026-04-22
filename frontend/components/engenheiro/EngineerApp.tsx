'use client'

import { useRef, useState } from 'react'
import { loadEngineerData, saveEngineerData, loadStorage, saveStorage } from '@/lib/storage'
import { setModuleUiState, type EngineerModuleId } from '@/lib/engineerDashboard'
import SidebarEngenheiro from './SidebarEngenheiro'
import OperationalModuleShell from './OperationalModuleShell'
import PainelGeral from './PainelGeral'
import ParametrosGlobais from './ParametrosGlobais'
import AuditoriaModule from './AuditoriaModule'
import TabelaSINAPI from './TabelaSINAPI'
import ConsultaComposicao from './ConsultaComposicao'
import ComposicoesAnaliticas from './ComposicoesAnaliticas'
import ComposicoesProfissionais from './ComposicoesProfissionais'
import CalculadoraMO from './CalculadoraMO'
import CalculadoraMateriais from './CalculadoraMateriais'
import GestaoOrcamentos from './GestaoOrcamentos'
import GestaoPlantasModule from './GestaoPlantasModule'
import OrcamentoWizard from './OrcamentoWizard'
import Precificador from './Precificador'
import ConsolidacaoOrcamento from './ConsolidacaoOrcamento'
import type { AppSession, EngineerData, Orcamento } from '@/types'

export default function EngineerApp({ onLogout }: { onLogout: () => void }) {
  const [data, setData] = useState<EngineerData>(() => loadEngineerData())
  const [clientSession, setClientSession] = useState<AppSession>(() => loadStorage())
  const [activeModule, setActiveModule] = useState<EngineerModuleId>(() => (loadEngineerData().moduleUIState.app?.abaAtiva as EngineerModuleId) ?? 'orcamentos')
  const [wizardOrcamento, setWizardOrcamento] = useState<Orcamento | null>(null)
  const [wizardLoading, setWizardLoading] = useState(false)
  const [savedAt, setSavedAt] = useState('')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function update(partial: Partial<EngineerData>) {
    setData(prev => {
      const next = { ...prev, ...partial }
      saveEngineerData(next)
      const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      setSavedAt(now)
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => setSavedAt(''), 2000)
      return next
    })
  }

  function navigate(moduleId: EngineerModuleId) {
    setActiveModule(moduleId)
    update({ moduleUIState: { ...data.moduleUIState, app: { ...(data.moduleUIState.app ?? {}), abaAtiva: moduleId, ultimoPonto: moduleId } } })
  }

  function setModoFoco(enabled: boolean) {
    update({ moduleUIState: setModuleUiState(data, activeModule, { densidade: enabled ? 'foco' : 'padrao' }) })
  }

  function updateClientSession(updater: AppSession | ((prev: AppSession) => AppSession)) {
    setClientSession(prev => {
      const next = typeof updater === 'function' ? (updater as (value: AppSession) => AppSession)(prev) : updater
      saveStorage(next)
      return next
    })
  }

  function refreshClientSession() {
    setClientSession(loadStorage())
  }

  const focoAtivo = data.moduleUIState[activeModule]?.densidade === 'foco'

  function renderModule() {
    switch (activeModule) {
      case 'painel': return <PainelGeral engineerData={data} orcamentos={clientSession.orcamentos} />
      case 'parametros': return <ParametrosGlobais data={data} onUpdate={update} />
      case 'auditoria': return <AuditoriaModule data={data} />
      case 'sinapi': return <TabelaSINAPI uf={data.uf} onUfChange={uf => update({ uf })} data={data} onUpdate={update} />
      case 'consulta': return <ConsultaComposicao uf={data.uf} globalParams={data.globalParams} />
      case 'composicoes-analiticas': return <ComposicoesAnaliticas data={data} onUpdate={update} />
      case 'composicoes-profissionais': return <ComposicoesProfissionais data={data} onUpdate={update} />
      case 'calculadora-mo': return <CalculadoraMO data={data} onUpdate={update} />
      case 'calculadora-mat': return <CalculadoraMateriais data={data} onUpdate={update} />
      case 'gestao-plantas': return <GestaoPlantasModule data={data} onUpdate={update} />
      case 'precificador': return <Precificador data={data} onUpdate={update} />
      case 'consolidacao': return <ConsolidacaoOrcamento data={data} orcamentos={clientSession.orcamentos} />
      case 'orcamentos':
        return (
          <GestaoOrcamentos
            data={data}
            onUpdate={update}
            orcamentos={clientSession.orcamentos}
            onUpdateSession={next => {
              updateClientSession(prev => {
                const resolved = next(prev)
                return resolved
              })
            }}
            onRefreshSession={refreshClientSession}
            onEnterWizard={orc => {
              setWizardLoading(true)
              setWizardOrcamento(orc)
              setTimeout(() => setWizardLoading(false), 120)
            }}
          />
        )
      default:
        return null
    }
  }

  if (wizardOrcamento) {
    const orcAtual = clientSession.orcamentos.find(o => o.id === wizardOrcamento.id) ?? wizardOrcamento
    if (wizardLoading) {
      return (
        <div className="h-screen overflow-hidden flex items-center justify-center bg-base-200">
          <div className="card bg-base-100 shadow">
            <div className="card-body"><p className="text-sm">Carregando wizard...</p></div>
          </div>
        </div>
      )
    }
    return (
      <div className="h-screen overflow-hidden flex flex-col">
        <OrcamentoWizard
          orcamento={orcAtual}
          data={data}
          session={clientSession}
          onUpdate={update}
          onUpdateSession={next => updateClientSession(next)}
          onVoltar={() => setWizardOrcamento(null)}
        />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarEngenheiro activeModule={activeModule} onNavigate={navigate} onLogout={onLogout} data={data} orcamentos={clientSession.orcamentos} />
      <main className={`flex-1 overflow-y-auto bg-base-200 ${focoAtivo ? 'p-3' : 'p-6'}`}>
        <OperationalModuleShell moduleId={activeModule} data={data} orcamentos={clientSession.orcamentos} onToggleFoco={setModoFoco} hideHeader={focoAtivo}>
          {renderModule()}
        </OperationalModuleShell>
      </main>
      {savedAt && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="badge badge-success p-3">Salvo às {savedAt}</div>
        </div>
      )}
    </div>
  )
}

