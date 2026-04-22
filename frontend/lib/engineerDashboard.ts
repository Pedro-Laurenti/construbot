import type { EngineerData, Orcamento, OrcamentoStatus, AuditEventEngenharia, ModuleUIState } from '@/types'

export type EngineerModuleId =
  | 'painel'
  | 'parametros'
  | 'consulta'
  | 'calculadora-mo'
  | 'calculadora-mat'
  | 'sinapi'
  | 'composicoes-analiticas'
  | 'composicoes-profissionais'
  | 'orcamentos'
  | 'gestao-plantas'
  | 'precificador'
  | 'consolidacao'

export interface ModuleOperationalMeta {
  nome: string
  acaoPrimaria: string
}

export interface ModuleOperationalValidation {
  status: 'ok' | 'alerta' | 'erro'
  scoreProntidao: number
  decisoes: string[]
  riscos: Array<{ nivel: 'erro' | 'alerta' | 'info'; texto: string }>
  pendencias: string[]
  proximaAcao: string
}

export const MODULE_META: Record<EngineerModuleId, ModuleOperationalMeta> = {
  painel: { nome: 'Painel Geral', acaoPrimaria: 'Priorizar itens críticos' },
  parametros: { nome: 'Parâmetros Globais', acaoPrimaria: 'Validar impacto e salvar' },
  orcamentos: { nome: 'Gestão de Orçamentos', acaoPrimaria: 'Triar e iniciar orçamento' },
  sinapi: { nome: 'SINAPI Insumos', acaoPrimaria: 'Confirmar referências por UF' },
  consulta: { nome: 'Consulta de Composição', acaoPrimaria: 'Confirmar preços de insumos' },
  'composicoes-analiticas': { nome: 'Composições Analíticas', acaoPrimaria: 'Consolidar visão técnica' },
  'composicoes-profissionais': { nome: 'Composições Profissionais', acaoPrimaria: 'Revisar produtividade e custo' },
  'calculadora-mo': { nome: 'Calculadora MO', acaoPrimaria: 'Salvar cenário por serviço' },
  'calculadora-mat': { nome: 'Calculadora Materiais', acaoPrimaria: 'Salvar materiais por serviço' },
  'gestao-plantas': { nome: 'Gestão de Plantas', acaoPrimaria: 'Versionar e publicar alterações' },
  precificador: { nome: 'Precificador', acaoPrimaria: 'Estruturar serviços de laboratório' },
  consolidacao: { nome: 'Consolidação', acaoPrimaria: 'Validar totais e handoff' },
}

export function getStatusBadge(status: OrcamentoStatus, etapaAtual?: string) {
  if (status === 'aguardando_engenheiro') return { className: 'badge-warning', label: 'Aguardando' }
  if (status === 'em_calculo') return { className: 'badge-info', label: `Em análise${etapaAtual ? ` · ${etapaAtual}` : ''}` }
  if (status === 'entregue') return { className: 'badge-success', label: 'Entregue' }
  if (status === 'calculado') return { className: 'badge-ghost', label: 'Calculado' }
  if (status === 'enviado') return { className: 'badge-ghost', label: 'Enviado' }
  return { className: 'badge-ghost', label: 'Rascunho' }
}

export function getContextoAtivo(data: EngineerData, orcamentos: Orcamento[]) {
  const ativo = orcamentos.find(o => o.status === 'em_calculo') ?? orcamentos.find(o => o.status === 'aguardando_engenheiro') ?? null
  const eng = ativo ? data.orcamentosEngenheiro[ativo.id] : null
  return {
    orcamentoId: ativo?.id ?? null,
    clienteId: ativo?.clienteId ?? null,
    uf: ativo?.uf ?? data.uf,
    referencia: data.mesReferenciaSINAPI,
    dataRef: new Date().toISOString(),
    etapaAtual: eng?.etapaAtual ?? null,
    status: ativo?.status ?? null,
  }
}

export function getModuleUiState(data: EngineerData, moduleId: EngineerModuleId): ModuleUIState {
  return data.moduleUIState[moduleId] ?? {}
}

export function setModuleUiState(data: EngineerData, moduleId: EngineerModuleId, patch: ModuleUIState): Record<string, ModuleUIState> {
  const current = data.moduleUIState[moduleId] ?? {}
  return {
    ...data.moduleUIState,
    [moduleId]: { ...current, ...patch },
  }
}

export function appendAuditEvent(data: EngineerData, evento: Omit<AuditEventEngenharia, 'data'>): AuditEventEngenharia[] {
  const next: AuditEventEngenharia = { ...evento, data: new Date().toISOString() }
  return [...data.auditTrail, next]
}

export function getModuleValidation(moduleId: EngineerModuleId, data: EngineerData, orcamentos: Orcamento[]): ModuleOperationalValidation {
  const pendencias: string[] = []
  const decisoes: string[] = []
  const riscos: Array<{ nivel: 'erro' | 'alerta' | 'info'; texto: string }> = []

  const ativos = orcamentos.filter(o => o.status === 'em_calculo' || o.status === 'aguardando_engenheiro')
  const entregues = orcamentos.filter(o => o.status === 'entregue')

  if (moduleId === 'painel') {
    decisoes.push(`${ativos.length} orçamento(s) em operação`)
    decisoes.push(`${entregues.length} orçamento(s) entregue(s)`)
    if (ativos.length === 0 && orcamentos.length > 0) riscos.push({ nivel: 'info', texto: 'Todos os orçamentos foram entregues.' })
  }

  if (moduleId === 'parametros') {
    const hasUF = !!data.uf
    const hasIncc = data.inccMensal > 0
    if (!hasUF) pendencias.push('UF de referência não definida')
    if (!hasIncc) pendencias.push('INCC mensal deve ser maior que zero')
    decisoes.push(`BDI atual ${Math.round(data.globalParams.bdi * 100)}%`)
    decisoes.push(`Fator encargos ${data.globalParams.fatorEncargos.toFixed(4)}`)
  }

  if (moduleId === 'orcamentos') {
    const aguardando = orcamentos.filter(o => o.status === 'aguardando_engenheiro').length
    const emCalculo = orcamentos.filter(o => o.status === 'em_calculo').length
    decisoes.push(`${aguardando} aguardando triagem`)
    decisoes.push(`${emCalculo} em cálculo`)
    if (aguardando > 0) riscos.push({ nivel: 'alerta', texto: `${aguardando} orçamento(s) sem início de análise.` })
  }

  if (moduleId === 'sinapi' || moduleId === 'consulta') {
    if (!data.uf) pendencias.push('Selecione uma UF operacional')
    decisoes.push(`Referência ativa ${data.mesReferenciaSINAPI}`)
  }

  if (moduleId === 'calculadora-mo') {
    const total = Object.keys(data.calculoMOResults).length
    decisoes.push(`${total} cálculo(s) de MO em modo laboratório`)
    if (total === 0) pendencias.push('Nenhum cálculo de MO salvo no laboratório')
  }

  if (moduleId === 'calculadora-mat') {
    const total = Object.keys(data.calculoMatConfigs).length
    decisoes.push(`${total} cálculo(s) de materiais em modo laboratório`)
    if (total === 0) pendencias.push('Nenhum cálculo de materiais salvo no laboratório')
  }

  if (moduleId === 'consolidacao') {
    const totalMO = Object.keys(data.calculoMOResults).length
    const totalMat = Object.keys(data.calculoMatConfigs).length
    decisoes.push(`${totalMO} serviço(s) com MO`) 
    decisoes.push(`${totalMat} serviço(s) com materiais`)
    if (totalMO === 0 || totalMat === 0) pendencias.push('Consolidação incompleta para handoff')
  }

  if (moduleId === 'gestao-plantas') {
    const qtd = data.plantas.length
    decisoes.push(`${qtd} planta(s) cadastrada(s)`)
    if (qtd === 0) pendencias.push('Cadastro de plantas está vazio')
  }

  if (moduleId === 'precificador') {
    const qtd = data.precificadorItens.length
    decisoes.push(`${qtd} serviço(s) no laboratório técnico`)
    if (qtd === 0) pendencias.push('Adicionar ao menos um serviço no precificador')
  }

  if (moduleId === 'composicoes-analiticas' || moduleId === 'composicoes-profissionais') {
    decisoes.push('Módulo de referência técnica ativo')
  }

  if (pendencias.length === 0 && riscos.length === 0) riscos.push({ nivel: 'info', texto: 'Sem riscos operacionais críticos no módulo.' })
  if (pendencias.length > 0 && riscos.filter(r => r.nivel === 'alerta').length === 0) riscos.push({ nivel: 'alerta', texto: `Há ${pendencias.length} pendência(s) operacional(is).` })

  const scoreProntidao = Math.max(0, Math.min(100, 100 - pendencias.length * 20 - riscos.filter(r => r.nivel === 'erro').length * 30 - riscos.filter(r => r.nivel === 'alerta').length * 10))
  const status: 'ok' | 'alerta' | 'erro' = riscos.some(r => r.nivel === 'erro') ? 'erro' : (pendencias.length > 0 || riscos.some(r => r.nivel === 'alerta')) ? 'alerta' : 'ok'

  return {
    status,
    scoreProntidao,
    decisoes: decisoes.slice(0, 3),
    riscos: riscos.slice(0, 4),
    pendencias: pendencias.slice(0, 3),
    proximaAcao: pendencias[0] ?? MODULE_META[moduleId].acaoPrimaria,
  }
}
