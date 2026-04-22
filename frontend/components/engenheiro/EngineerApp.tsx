'use client'

import { useMemo, useState } from 'react'
import { loadEngineerData, saveEngineerData, loadStorage } from '@/lib/storage'
import { setModuleUiState, type EngineerModuleId } from '@/lib/engineerDashboard'
import SidebarEngenheiro from './SidebarEngenheiro'
import OperationalModuleShell from './OperationalModuleShell'
import PainelGeral from './PainelGeral'
import ParametrosGlobais from './ParametrosGlobais'
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
import type { EngineerData, Orcamento } from '@/types'

export default function EngineerApp({ onLogout }: { onLogout: () => void }) {
  const [data, setData] = useState<EngineerData>(() => loadEngineerData())
  const [activeModule, setActiveModule] = useState<EngineerModuleId>(() => (loadEngineerData().moduleUIState.app?.abaAtiva as EngineerModuleId) ?? 'orcamentos')
  const [wizardOrcamento, setWizardOrcamento] = useState<Orcamento | null>(null)

  function update(partial: Partial<EngineerData>) {
    setData(prev => {
      const next = { ...prev, ...partial }
      saveEngineerData(next)
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

  const clientSession = useMemo(() => loadStorage(), [data])
  const focoAtivo = data.moduleUIState[activeModule]?.densidade === 'foco'

  function renderModule() {
    switch (activeModule) {
      case 'painel': return <PainelGeral engineerData={data} orcamentos={clientSession.orcamentos} />
      case 'parametros': return <ParametrosGlobais data={data} onUpdate={update} />
      case 'sinapi': return <TabelaSINAPI uf={data.uf} onUfChange={uf => update({ uf })} data={data} onUpdate={update} />
      case 'consulta': return <ConsultaComposicao uf={data.uf} />
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
            onEnterWizard={orc => setWizardOrcamento(orc)}
          />
        )
      default:
        return null
    }
  }

  if (wizardOrcamento) {
    const session = loadStorage()
    const orcAtual = session.orcamentos.find(o => o.id === wizardOrcamento.id) ?? wizardOrcamento
    return (
      <div className="h-screen overflow-hidden flex flex-col">
        <OrcamentoWizard
          orcamento={orcAtual}
          data={data}
          onUpdate={update}
          onVoltar={() => setWizardOrcamento(null)}
        />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarEngenheiro activeModule={activeModule} onNavigate={navigate} onLogout={onLogout} data={data} orcamentos={clientSession.orcamentos} />
      <main className={`flex-1 overflow-y-auto bg-base-200 ${focoAtivo ? 'p-3' : 'p-6'}`}>
        <OperationalModuleShell moduleId={activeModule} data={data} orcamentos={clientSession.orcamentos} onToggleFoco={setModoFoco}>
          {renderModule()}
        </OperationalModuleShell>
      </main>
    </div>
  )
}

