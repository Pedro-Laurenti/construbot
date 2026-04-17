'use client'

import { useState } from 'react'
import { loadEngineerData, saveEngineerData, loadStorage } from '@/lib/storage'
import SidebarEngenheiro, { EngineerModule } from './SidebarEngenheiro'
import PainelGeral from './PainelGeral'
import ParametrosGlobais from './ParametrosGlobais'
import TabelaSINAPI from './TabelaSINAPI'
import ConsultaComposicao from './ConsultaComposicao'
import ComposicoesAnaliticas from './ComposicoesAnaliticas'
import ComposicoesProfissionais from './ComposicoesProfissionais'
import Precificador from './Precificador'
import CalculadoraMO from './CalculadoraMO'
import CalculadoraMateriais from './CalculadoraMateriais'
import ConsolidacaoOrcamento from './ConsolidacaoOrcamento'
import GestaoOrcamentos from './GestaoOrcamentos'
import QuantitativosServico from './QuantitativosServico'
import PrecificacaoFinal from './PrecificacaoFinal'
import GestaoPlantasModule from './GestaoPlantasModule'
import type { EngineerData } from '@/types'

export default function EngineerApp({ onLogout }: { onLogout: () => void }) {
  const [activeModule, setActiveModule] = useState<EngineerModule>('painel')
  const [data, setData] = useState<EngineerData>(() => loadEngineerData())

  function update(partial: Partial<EngineerData>) {
    setData(prev => {
      const next = { ...prev, ...partial }
      saveEngineerData(next)
      return next
    })
  }

  function renderModule() {
    const clientSession = loadStorage()
    switch (activeModule) {
      case 'painel': return <PainelGeral engineerData={data} orcamentos={clientSession.orcamentos} />
      case 'parametros': return <ParametrosGlobais data={data} onUpdate={update} />
      case 'sinapi': return <TabelaSINAPI uf={data.uf} onUfChange={uf => update({ uf })} />
      case 'consulta': return <ConsultaComposicao uf={data.uf} />
      case 'composicoes-analiticas': return <ComposicoesAnaliticas />
      case 'composicoes-profissionais': return <ComposicoesProfissionais data={data} onUpdate={update} />
      case 'precificador': return <Precificador data={data} onUpdate={update} />
      case 'calculadora-mo': return <CalculadoraMO data={data} onUpdate={update} />
      case 'calculadora-mat': return <CalculadoraMateriais data={data} onUpdate={update} />
      case 'precificacao-final': return <PrecificacaoFinal data={data} onUpdate={update} orcamentos={clientSession.orcamentos} />
      case 'quantitativos': return <QuantitativosServico data={data} onUpdate={update} orcamentos={clientSession.orcamentos} />
      case 'consolidacao': return <ConsolidacaoOrcamento data={data} orcamentos={clientSession.orcamentos} />
      case 'gestao-plantas': return <GestaoPlantasModule data={data} onUpdate={update} />
      case 'orcamentos': return <GestaoOrcamentos data={data} onUpdate={update} orcamentos={clientSession.orcamentos} />
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarEngenheiro activeModule={activeModule} onNavigate={setActiveModule} onLogout={onLogout} />
      <main className="flex-1 overflow-y-auto bg-base-200 p-6">
        {renderModule()}
      </main>
    </div>
  )
}
