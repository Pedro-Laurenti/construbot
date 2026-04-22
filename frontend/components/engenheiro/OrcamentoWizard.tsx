'use client'

import { useState, useEffect } from 'react'
import { MdArrowBack, MdArrowForward, MdArrowBack as MdBack, MdWarning } from 'react-icons/md'
import { PLANTAS_PADRAO } from '@/lib/mockData'
import { formatDate } from '@/lib/formatters'
import StepperEtapas from './StepperEtapas'
import ResumoParametrosCliente from './ResumoParametrosCliente'
import QuantitativosServico from './QuantitativosServico'
import ConsultaComposicao from './ConsultaComposicao'
import CalculadoraMO from './CalculadoraMO'
import CalculadoraMateriais from './CalculadoraMateriais'
import PrecificacaoFinal from './PrecificacaoFinal'
import type { AppSession, EngineerData, Orcamento, OrcamentoEngenheiro, QuantitativoServico, EtapaWizard, StatusValidacaoEtapa } from '@/types'

type EtapaComEntrega = EtapaWizard | 'ENTREGUE'

const ETAPA_ORDEM: EtapaWizard[] = ['E2', 'E3', 'E4', 'E5', 'E6']

interface Props {
  orcamento: Orcamento
  data: EngineerData
  session: AppSession
  onUpdate: (p: Partial<EngineerData>) => void
  onUpdateSession: (updater: (prev: AppSession) => AppSession) => void
  onVoltar: () => void
}

function isParametrosCompletos(data: EngineerData): boolean {
  return data.inccMensal > 0 && !!data.uf && data.globalParams.bdi > 0 && data.globalParams.fatorEncargos > 0
}

function getStatusBadge(status: Orcamento['status'], etapaAtual: string) {
  if (status === 'aguardando_engenheiro') return { cls: 'badge-warning', label: 'Aguardando' }
  if (status === 'em_calculo') return { cls: 'badge-info', label: `Em cálculo · ${etapaAtual}` }
  if (status === 'entregue') return { cls: 'badge-success', label: 'Entregue' }
  return { cls: 'badge-ghost', label: status }
}

function checksum(value: unknown): string {
  function sortValue(v: unknown): unknown {
    if (Array.isArray(v)) return v.map(sortValue)
    if (v && typeof v === 'object') {
      return Object.keys(v as Record<string, unknown>)
        .sort()
        .reduce<Record<string, unknown>>((acc, key) => {
          acc[key] = sortValue((v as Record<string, unknown>)[key])
          return acc
        }, {})
    }
    return v
  }
  const raw = JSON.stringify(sortValue(value ?? null))
  let hash = 0
  for (let i = 0; i < raw.length; i++) hash = (hash * 31 + raw.charCodeAt(i)) >>> 0
  return `v1-${hash.toString(16)}`
}

function validarEtapa(etapa: EtapaWizard, eng: OrcamentoEngenheiro): StatusValidacaoEtapa {
  if (etapa === 'E2') {
    if (eng.quantitativos.length === 0) return { status: 'erro', erros: ['Nenhum serviço configurado em E2.'], avisos: [] }
    const semComposicao = eng.quantitativos.filter(q => !q.composicaoBasica).map(q => q.descricao)
    const semCp = eng.quantitativos.filter(q => !q.composicaoProfissionalId).map(q => q.descricao)
    const erros = [
      ...semComposicao.map(s => `${s}: composição SINAPI pendente`),
      ...semCp.map(s => `${s}: composição profissional pendente`),
    ]
    return { status: erros.length ? 'erro' : 'ok', erros, avisos: [] }
  }

  if (etapa === 'E3') {
    const semConsulta = eng.quantitativos.filter(q => !eng.consultasSINAPI[q.id]).map(q => q.descricao)
    const semPreco = eng.quantitativos
      .filter(q => (eng.consultasSINAPI[q.id]?.insumos ?? []).some(i => i.valorUnitario <= 0))
      .map(q => q.descricao)
    const fallback = eng.quantitativos
      .filter(q => {
        const ins = eng.consultasSINAPI[q.id]?.insumos ?? []
        return ins.length > 0 && ins.filter(i => i.isFallbackSP).length / ins.length >= 0.4
      })
      .map(q => `${q.descricao}: alto uso de fallback SP`)

    const erros = [
      ...semConsulta.map(s => `${s}: consulta SINAPI não confirmada`),
      ...semPreco.map(s => `${s}: há insumo sem preço`),
    ]
    return { status: erros.length ? 'erro' : fallback.length ? 'aviso' : 'ok', erros, avisos: fallback }
  }

  if (etapa === 'E4') {
    const pendentes = eng.quantitativos.filter(q => !eng.calculosMO[q.id]?.cenarioEscolhido).map(q => q.descricao)
    const erros = pendentes.map(s => `${s}: cenário e modalidade não salvos`)
    return { status: erros.length ? 'erro' : 'ok', erros, avisos: [] }
  }

  if (etapa === 'E5') {
    const pendentes = eng.quantitativos.filter(q => !eng.calculosMat[q.id]).map(q => q.descricao)
    const semCusto = eng.quantitativos
      .filter(q => {
        const mat = eng.calculosMat[q.id]
        if (!mat) return false
        const total = mat.insumos.reduce((sum, ins) => sum + ins.coeficiente * ins.valorUnitario * mat.quantidade, 0)
        return total <= 0
      })
      .map(q => q.descricao)
    const erros = [
      ...pendentes.map(s => `${s}: materiais não salvos`),
      ...semCusto.map(s => `${s}: custo de materiais zerado`),
    ]
    return { status: erros.length ? 'erro' : 'ok', erros, avisos: [] }
  }

  return { status: 'ok', erros: [], avisos: [] }
}

function checksumEtapa(etapa: EtapaWizard, eng: OrcamentoEngenheiro): string {
  if (etapa === 'E2') return checksum(eng.quantitativos)
  if (etapa === 'E3') return checksum(eng.consultasSINAPI)
  if (etapa === 'E4') return checksum(eng.calculosMO)
  if (etapa === 'E5') return checksum(eng.calculosMat)
  return checksum({ fases: eng.fasesObra, precificacao: eng.precificacao })
}

function getDecisoesEtapa(etapa: EtapaWizard, eng: OrcamentoEngenheiro): string[] {
  if (etapa === 'E2') {
    const total = eng.quantitativos.length
    const comComp = eng.quantitativos.filter(q => !!q.composicaoBasica).length
    const comCp = eng.quantitativos.filter(q => !!q.composicaoProfissionalId).length
    return [
      `${total} serviço(s) no orçamento`,
      `${comComp} com composição SINAPI definida`,
      `${comCp} com composição profissional definida`,
    ]
  }
  if (etapa === 'E3') {
    const consultas = Object.keys(eng.consultasSINAPI).length
    const fallback = Object.values(eng.consultasSINAPI).reduce((sum, c) => sum + c.insumos.filter(i => i.isFallbackSP).length, 0)
    return [
      `${consultas} serviço(s) com consulta SINAPI confirmada`,
      `${fallback} insumo(s) com fallback SP`,
      'Preços manuais são persistidos no artefato da etapa',
    ]
  }
  if (etapa === 'E4') {
    const escolhas = Object.values(eng.calculosMO)
    const cenarios = escolhas.reduce((acc, c) => ({ ...acc, [c.cenarioEscolhido]: (acc[c.cenarioEscolhido] ?? 0) + 1 }), {} as Record<string, number>)
    return [
      `${escolhas.length} serviço(s) com cenário de MO salvo`,
      `Mensalista: ${cenarios['Mensalista'] ?? 0} · Ótima: ${cenarios['Ótima'] ?? 0} · Prazo: ${cenarios['Prazo'] ?? 0}`,
      `${escolhas.filter(c => c.modalidade === 'MEI').length} em MEI e ${escolhas.filter(c => c.modalidade === 'CLT').length} em CLT`,
    ]
  }
  if (etapa === 'E5') {
    const mat = Object.values(eng.calculosMat)
    const total = mat.reduce((sum, c) => sum + c.insumos.reduce((s, i) => s + i.coeficiente * i.valorUnitario * c.quantidade, 0), 0)
    return [
      `${mat.length} serviço(s) com materiais salvos`,
      `Custo total de materiais: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}`,
      'Insumos herdados de E3 mantêm rastreio de origem',
    ]
  }
  return [
    'Consolidação de custos preparada para entrega',
    'Cronograma, INCC e BDI ativos no cálculo final',
    'Checklist final controla liberação da entrega',
  ]
}

function getRiscosEtapa(etapa: EtapaWizard, validacao: StatusValidacaoEtapa): Array<{ nivel: 'erro' | 'alerta' | 'info'; texto: string }> {
  const riscos: Array<{ nivel: 'erro' | 'alerta' | 'info'; texto: string }> = []
  validacao.erros.forEach(e => riscos.push({ nivel: 'erro', texto: e }))
  validacao.avisos.forEach(a => riscos.push({ nivel: 'alerta', texto: a }))
  if (riscos.length === 0) riscos.push({ nivel: 'info', texto: `Sem riscos críticos detectados na etapa ${etapa}.` })
  return riscos.slice(0, 4)
}

export default function OrcamentoWizard({ orcamento, data, session, onUpdate, onUpdateSession, onVoltar }: Props) {
  const engData = data.orcamentosEngenheiro[orcamento.id]
  const etapaAtual = (engData?.etapaAtual ?? 'E2') as EtapaComEntrega
  const etapasConcluidas = engData?.etapasConcluidas ?? []
  const parametrosOk = isParametrosCompletos(data)
  const [etapaVisivel, setEtapaVisivel] = useState<EtapaWizard>(engData?.uiState?.etapaVisivel ?? (etapaAtual === 'ENTREGUE' ? 'E6' : etapaAtual))
  const [impactoModal, setImpactoModal] = useState<{ etapa: EtapaWizard; dependentes: EtapaWizard[]; checksumAtual: string } | null>(null)
  const [draftQuantitativos, setDraftQuantitativos] = useState<QuantitativoServico[]>(engData?.quantitativos ?? [])
  const [e6ActionToken, setE6ActionToken] = useState(0)
  const [e6ActionType, setE6ActionType] = useState<'salvar' | 'entregar' | null>(null)
  const [e6WizardState, setE6WizardState] = useState({ prontoParaEntrega: false, jaEntregue: false })

  const plantaId = orcamento.parametros?.plantaId
  const planta = plantaId ? PLANTAS_PADRAO.find(p => p.id === plantaId) : null
  const badge = getStatusBadge(orcamento.status, engData?.etapaAtual ?? '-')

  function persistUI(nextEtapa: EtapaWizard) {
    const atual = data.orcamentosEngenheiro[orcamento.id]
    if (!atual) return
    const updated = {
      ...data.orcamentosEngenheiro,
      [orcamento.id]: {
        ...atual,
        uiState: { ...(atual.uiState ?? { etapaVisivel: nextEtapa }), etapaVisivel: nextEtapa },
      },
    }
    onUpdate({ orcamentosEngenheiro: updated })
  }

  function marcarEmCalculo() {
    if (!engData) {
      const now = new Date().toISOString()
      const novoEng: OrcamentoEngenheiro = {
        orcamentoClienteId: orcamento.id,
        etapaAtual: 'E2',
        etapasConcluidas: [],
        logEtapas: [],
        logEtapasDetalhado: [{ etapa: 'E2', data: now, usuario: 'engenheiro_local', motivo: 'inicio_orcamento' }],
        quantitativos: [],
        consultasSINAPI: {},
        calculosMO: {},
        calculosMat: {},
        statusValidacaoEtapa: {},
        checksumsEtapas: {},
        snapshotParametrosGlobais: data.globalParams,
        versaoParametrosE2: now,
        sinapiRef: data.mesReferenciaSINAPI,
        uiState: { etapaVisivel: 'E2' },
      }
      onUpdate({ orcamentosEngenheiro: { ...data.orcamentosEngenheiro, [orcamento.id]: novoEng } })
    }

    if (orcamento.status === 'aguardando_engenheiro') {
      onUpdateSession(prev => ({
        ...prev,
        orcamentos: prev.orcamentos.map(o => (o.id === orcamento.id ? { ...o, status: 'em_calculo' as const } : o)),
      }))
    }
  }

  function atualizarEng(patch: Partial<OrcamentoEngenheiro>) {
    const now = new Date().toISOString()
    const atual = data.orcamentosEngenheiro[orcamento.id] ?? {
      orcamentoClienteId: orcamento.id,
      etapaAtual: 'E2',
      etapasConcluidas: [],
      quantitativos: [],
      consultasSINAPI: {},
      calculosMO: {},
      calculosMat: {},
      statusValidacaoEtapa: {},
      checksumsEtapas: {},
      snapshotParametrosGlobais: data.globalParams,
      versaoParametrosE2: now,
      sinapiRef: data.mesReferenciaSINAPI,
      uiState: { etapaVisivel: 'E2' as EtapaWizard },
    }
    const merged = { ...atual, ...patch }
    onUpdate({ orcamentosEngenheiro: { ...data.orcamentosEngenheiro, [orcamento.id]: merged } })
  }

  function invalidarDependentes(atual: OrcamentoEngenheiro, etapaBase: EtapaWizard): OrcamentoEngenheiro {
    const idxBase = ETAPA_ORDEM.indexOf(etapaBase)
    const dependentes = ETAPA_ORDEM.slice(idxBase + 1)
    const concluidas = atual.etapasConcluidas.filter(e => !dependentes.includes(e as EtapaWizard)) as Array<'E1' | 'E2' | 'E3' | 'E4' | 'E5' | 'E6'>
    const statusValidacaoEtapa = { ...(atual.statusValidacaoEtapa ?? {}) }
    const checksumsEtapas = { ...(atual.checksumsEtapas ?? {}) }

    dependentes.forEach(dep => {
      delete statusValidacaoEtapa[dep]
      delete checksumsEtapas[dep]
    })

    const logDetalhado = [...(atual.logEtapasDetalhado ?? [])]
    dependentes.forEach(dep => logDetalhado.push({ etapa: dep, data: new Date().toISOString(), usuario: 'engenheiro_local', motivo: `invalidacao_por_${etapaBase}` }))

    return {
      ...atual,
      etapaAtual: etapaBase,
      etapasConcluidas: concluidas,
      statusValidacaoEtapa,
      checksumsEtapas,
      logEtapasDetalhado: logDetalhado,
    }
  }

  function concluirE2(quantitativos: QuantitativoServico[]) {
    const atual = data.orcamentosEngenheiro[orcamento.id]
    if (!atual) return

    const baseAtualizado: OrcamentoEngenheiro = { ...atual, quantitativos }
    const validacao = validarEtapa('E2', baseAtualizado)
    if (validacao.status === 'erro') return

    const novo = invalidarDependentes(baseAtualizado, 'E2')
    const concluidas = Array.from(new Set([...(novo.etapasConcluidas ?? []), 'E2'])) as Array<'E1' | 'E2' | 'E3' | 'E4' | 'E5' | 'E6'>
    const now = new Date().toISOString()

    atualizarEng({
      ...novo,
      etapaAtual: 'E3',
      etapasConcluidas: concluidas,
      logEtapas: [...(novo.logEtapas ?? []), { etapa: 'E2', concluidaEm: now }],
      logEtapasDetalhado: [...(novo.logEtapasDetalhado ?? []), { etapa: 'E2', data: now, usuario: 'engenheiro_local', motivo: 'validar_e_avancar' }],
      statusValidacaoEtapa: { ...(novo.statusValidacaoEtapa ?? {}), E2: validacao },
      checksumsEtapas: { ...(novo.checksumsEtapas ?? {}), E2: checksumEtapa('E2', baseAtualizado) },
      versaoParametrosE2: now,
    })

    setEtapaVisivel('E3')
    persistUI('E3')
  }

  function podeNavegarLivre(etapa: EtapaWizard) {
    return etapa === (engData?.etapaAtual === 'ENTREGUE' ? 'E6' : engData?.etapaAtual) || etapasConcluidas.includes(etapa)
  }

  function navegarParaEtapa(etapa: EtapaWizard) {
    if (!podeNavegarLivre(etapa)) return
    setEtapaVisivel(etapa)
    persistUI(etapa)
  }

  function prepararConclusao(etapa: EtapaWizard) {
    const atual = data.orcamentosEngenheiro[orcamento.id]
    if (!atual) return
    const validacao = validarEtapa(etapa, atual)
    atualizarEng({ statusValidacaoEtapa: { ...(atual.statusValidacaoEtapa ?? {}), [etapa]: validacao } })
    if (validacao.status === 'erro') return

    const hashAtual = checksumEtapa(etapa, atual)
    const hashAntigo = atual.checksumsEtapas?.[etapa]
    const dependentes = ETAPA_ORDEM.slice(ETAPA_ORDEM.indexOf(etapa) + 1).filter(dep => atual.etapasConcluidas.includes(dep))

    if (hashAntigo && hashAntigo !== hashAtual && dependentes.length > 0) {
      setImpactoModal({ etapa, dependentes, checksumAtual: hashAtual })
      return
    }

    concluirEtapa(etapa, hashAtual)
  }

  function concluirEtapa(etapa: EtapaWizard, hashAtual?: string) {
    const atual = data.orcamentosEngenheiro[orcamento.id]
    if (!atual) return

    const idxAtual = ETAPA_ORDEM.indexOf(etapa)
    const proxima = ETAPA_ORDEM[idxAtual + 1] as EtapaWizard | undefined
    const concluidas = Array.from(new Set([...(atual.etapasConcluidas ?? []), etapa])) as Array<'E1' | 'E2' | 'E3' | 'E4' | 'E5' | 'E6'>
    const now = new Date().toISOString()

    atualizarEng({
      etapaAtual: proxima ?? 'ENTREGUE',
      etapasConcluidas: concluidas,
      logEtapas: [...(atual.logEtapas ?? []), { etapa, concluidaEm: now }],
      logEtapasDetalhado: [...(atual.logEtapasDetalhado ?? []), { etapa, data: now, usuario: 'engenheiro_local', motivo: 'validar_e_avancar' }],
      checksumsEtapas: { ...(atual.checksumsEtapas ?? {}), [etapa]: hashAtual ?? checksumEtapa(etapa, atual) },
      versaoParametrosE4: etapa === 'E4' ? now : atual.versaoParametrosE4,
      versaoParametrosE6: etapa === 'E6' ? now : atual.versaoParametrosE6,
      parametrosObsoletos: etapa === 'E4' ? false : atual.parametrosObsoletos,
    })

    if (proxima) {
      setEtapaVisivel(proxima)
      persistUI(proxima)
    }
  }

  function confirmarInvalidacao() {
    if (!impactoModal) return
    const atual = data.orcamentosEngenheiro[orcamento.id]
    if (!atual) return
    const invalidado = invalidarDependentes(atual, impactoModal.etapa)
    atualizarEng(invalidado)
    concluirEtapa(impactoModal.etapa, impactoModal.checksumAtual)
    setImpactoModal(null)
  }

  useEffect(() => {
    if (!engData || orcamento.status === 'aguardando_engenheiro') marcarEmCalculo()
  }, [orcamento.id])

  useEffect(() => {
    if (engData?.uiState?.etapaVisivel) setEtapaVisivel(engData.uiState.etapaVisivel)
  }, [engData?.uiState?.etapaVisivel])

  useEffect(() => {
    setDraftQuantitativos(engData?.quantitativos ?? [])
  }, [orcamento.id, engData?.quantitativos])

  const eng = engData ?? {
    orcamentoClienteId: orcamento.id,
    etapaAtual: 'E2' as const,
    etapasConcluidas: [],
    quantitativos: [],
    consultasSINAPI: {},
    calculosMO: {},
    calculosMat: {},
    statusValidacaoEtapa: {},
    checksumsEtapas: {},
    snapshotParametrosGlobais: data.globalParams,
    versaoParametrosE2: new Date().toISOString(),
    uiState: { etapaVisivel: 'E2' as EtapaWizard },
  }

  const resumoCompacto = orcamento.parametros ? (
    <p className="text-xs text-base-content/40 mb-2">
      {orcamento.clienteId} · {orcamento.uf}{planta ? ` · ${planta.nome}` : ''} · SINAPI {eng.sinapiRef ?? data.mesReferenciaSINAPI} · Etapa {etapaVisivel}
    </p>
  ) : null

  const engVisivel = etapaVisivel === 'E2' ? { ...eng, quantitativos: draftQuantitativos } : eng
  const validacaoAtual = validarEtapa(etapaVisivel, engVisivel)
  const decisoesEtapa = getDecisoesEtapa(etapaVisivel, engVisivel)
  const riscosEtapa = getRiscosEtapa(etapaVisivel, validacaoAtual)
  const progresso = Math.round((etapasConcluidas.filter(e => ETAPA_ORDEM.includes(e as EtapaWizard)).length / ETAPA_ORDEM.length) * 100)
  const idxAtual = ETAPA_ORDEM.indexOf(etapaVisivel)
  const podeVoltar = idxAtual > 0

  function renderEtapa() {
    if (etapaVisivel === 'E2') {
      return (
        <>
          {orcamento.parametros && (
            <details className="collapse collapse-arrow bg-base-200 rounded mb-4">
              <summary className="collapse-title text-sm font-medium py-2 px-3 min-h-0">Resumo do cliente</summary>
              <div className="collapse-content">
                <ResumoParametrosCliente parametros={orcamento.parametros} nomeCliente={orcamento.clienteId} />
              </div>
            </details>
          )}
          <QuantitativosServico
            data={data}
            onUpdate={onUpdate}
            orcamentos={[orcamento]}
            orcamentoId={orcamento.id}
            onChangeQuantitativos={setDraftQuantitativos}
          />
        </>
      )
    }

    if (etapaVisivel === 'E3') return <>{resumoCompacto}<ConsultaComposicao uf={orcamento.uf || data.uf} globalParams={data.globalParams} orcamentoId={orcamento.id} engData={eng} onUpdateEng={atualizarEng} /></>
    if (etapaVisivel === 'E4') return <>{resumoCompacto}<CalculadoraMO data={data} onUpdate={onUpdate} orcamentoId={orcamento.id} engData={eng} onUpdateEng={atualizarEng} /></>
    if (etapaVisivel === 'E5') return <>{resumoCompacto}<CalculadoraMateriais data={data} onUpdate={onUpdate} orcamentoId={orcamento.id} engData={eng} onUpdateEng={atualizarEng} /></>
    return (
      <>
        {resumoCompacto}
        <PrecificacaoFinal
          data={data}
          onUpdate={onUpdate}
          orcamentos={session.orcamentos.filter(item => item.id === orcamento.id)}
          orcamentoId={orcamento.id}
          engData={eng}
          onUpdateEng={atualizarEng}
          onUpdateSession={onUpdateSession}
          onEntregar={() => {}}
          actionToken={e6ActionToken}
          actionType={e6ActionType}
          onWizardStateChange={setE6WizardState}
        />
      </>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="bg-base-100 border-b border-base-300 px-6 py-3 flex-shrink-0">
        <p className="text-xs text-base-content/50 mb-1">Engenheiro &gt; Orçamentos &gt; {orcamento.clienteId} &gt; Wizard</p>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <button onClick={onVoltar} className="btn btn-ghost btn-sm gap-1">
              <MdBack size={16} /> Voltar à lista
            </button>
            <div className="divider divider-horizontal my-0 h-6" />
            <div>
              <span className="font-semibold text-sm">{orcamento.clienteId}</span>
              <span className="text-base-content/40 text-sm mx-1">·</span>
              <span className="text-sm text-base-content/60">{orcamento.uf}</span>
              {planta && <span className="text-sm text-base-content/60"> · {planta.nome}</span>}
            </div>
            <span className={`badge badge-sm ${badge.cls}`}>{badge.label}</span>
          </div>
          <span className="text-xs text-base-content/40">{formatDate(orcamento.dataCriacao)}</span>
        </div>
        <div className="max-w-5xl mx-auto w-full">
          <StepperEtapas
            etapaAtual={engData?.etapaAtual ?? 'E2'}
            etapasConcluidas={etapasConcluidas as Array<'E1' | 'E2' | 'E3' | 'E4' | 'E5' | 'E6'>}
            onClickEtapa={navegarParaEtapa}
            parametrosCompletos={parametrosOk}
            etapaVisivel={etapaVisivel}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto flex flex-col gap-4">
          {eng.parametrosObsoletos && (
            <div className="alert alert-warning text-sm">
              Parâmetros globais foram alterados após os cálculos. Recalcule a etapa E4 para atualizar os resultados.
            </div>
          )}
          <div className="card bg-base-100 shadow">
            <div className="card-body p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-base-content/60">Progresso da jornada: {progresso}%</p>
                <p className="text-xs font-semibold">Próxima ação: Validar e avançar</p>
              </div>
              <progress className="progress progress-primary w-full" value={progresso} max={100} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs mt-2">
                <div className="bg-base-200 rounded p-2">
                  <p className="font-semibold mb-1">Decisões desta etapa</p>
                  <div className="flex flex-col gap-1">
                    {decisoesEtapa.map(item => <p key={item} className="text-base-content/70">• {item}</p>)}
                  </div>
                </div>
                <div className="bg-base-200 rounded p-2">
                  <p className="font-semibold mb-1">Riscos detectados</p>
                  <div className="flex flex-col gap-1">
                    {riscosEtapa.map(r => (
                      <p key={r.texto} className={r.nivel === 'erro' ? 'text-error' : r.nivel === 'alerta' ? 'text-warning' : 'text-info'}>
                        {r.nivel === 'erro' ? '[ERRO]' : r.nivel === 'alerta' ? '[ALERTA]' : '[INFO]'} {r.texto}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {renderEtapa()}
        </div>
      </div>

      <div className="bg-base-100 border-t border-base-300 px-6 py-3 flex-shrink-0 flex items-center justify-between">
        <button
          onClick={() => podeVoltar && navegarParaEtapa(ETAPA_ORDEM[idxAtual - 1])}
          disabled={!podeVoltar}
          className="btn btn-ghost btn-sm gap-1"
        >
          <MdArrowBack size={16} /> Etapa anterior
        </button>

        {etapaVisivel !== 'E6' && validacaoAtual.erros.length > 0 && (
          <div className="flex items-center gap-2 text-warning text-xs">
            <MdWarning size={14} />
            <span>{validacaoAtual.erros[0]}</span>
          </div>
        )}

        {etapaVisivel === 'E6' ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setE6ActionType('salvar'); setE6ActionToken(prev => prev + 1) }}
              className="btn btn-ghost btn-sm"
            >
              Salvar rascunho
            </button>
            <button
              onClick={() => { setE6ActionType('entregar'); setE6ActionToken(prev => prev + 1) }}
              disabled={e6WizardState.jaEntregue || !e6WizardState.prontoParaEntrega}
              className="btn btn-primary btn-sm gap-1"
            >
              Entregar ao cliente <MdArrowForward size={16} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => etapaVisivel === 'E2' ? concluirE2(draftQuantitativos) : prepararConclusao(etapaVisivel)}
            disabled={validacaoAtual.status === 'erro'}
            className="btn btn-primary btn-sm gap-1"
          >
            Validar e avançar <MdArrowForward size={16} />
          </button>
        )}
      </div>

      {impactoModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold mb-2">Impacto da alteração na etapa {impactoModal.etapa}</h3>
            <p className="text-sm text-base-content/70 mb-3">As etapas seguintes serão invalidadas para manter consistência dos artefatos do orçamento.</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {impactoModal.dependentes.map(dep => <span key={dep} className="badge badge-warning badge-sm">{dep}</span>)}
            </div>
            <div className="modal-action">
              <button onClick={() => setImpactoModal(null)} className="btn btn-ghost btn-sm">Cancelar</button>
              <button onClick={confirmarInvalidacao} className="btn btn-warning btn-sm">Invalidar e avançar</button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setImpactoModal(null)} />
        </div>
      )}
    </div>
  )
}
