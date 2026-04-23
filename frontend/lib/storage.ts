import type { AppSession, UserRole, EngineerData } from '@/types'
import { GLOBAL_PARAMS, DEFAULT_GRUPOS_ENCARGOS, PLANTAS_PADRAO, COMPOSICOES_PROFISSIONAIS } from './mockData'

const STORAGE_KEY = 'construbot_v2'

const defaultSession = (): AppSession => ({
  cliente: null,
  orcamentos: [],
  orcamentoAtivo: null,
})

export function loadStorage(): AppSession {
  if (typeof window === 'undefined') return defaultSession()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultSession()
    return JSON.parse(raw) as AppSession
  } catch {
    return defaultSession()
  }
}

export function saveStorage(session: AppSession): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export function clearStorage(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

const ROLE_KEY = 'construbot_role'
const ENGINEER_KEY = 'construbot_engineer'

export function loadRole(): UserRole {
  if (typeof window === 'undefined') return 'cliente'
  return (localStorage.getItem(ROLE_KEY) as UserRole) ?? 'cliente'
}

export function saveRole(role: UserRole): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(ROLE_KEY, role)
}

function defaultEngineerData(): EngineerData {
  return {
    globalParams: GLOBAL_PARAMS,
    gruposEncargos: DEFAULT_GRUPOS_ENCARGOS,
    precificadorItens: [],
    calculoMOConfigs: {},
    calculoMOResults: {},
    calculoMatConfigs: {},
    orcamentoReviews: {},
    uf: 'SP',
    inccMensal: 0.005,
    mesReferenciaSINAPI: 'Janeiro/2026',
    orcamentosEngenheiro: {},
    plantas: PLANTAS_PADRAO,
    moduleUIState: {},
    auditTrail: [],
    composicoesProfissionais: COMPOSICOES_PROFISSIONAIS,
  }
}

function buildChecksum(value: unknown): string {
  const raw = JSON.stringify(value ?? null)
  let hash = 0
  for (let i = 0; i < raw.length; i++) {
    hash = (hash * 31 + raw.charCodeAt(i)) >>> 0
  }
  return `v1-${hash.toString(16)}`
}

function normalizeEngineerBudget(raw: any, orcamentoId: string, defaults: EngineerData) {
  const quantitativos = Array.isArray(raw?.quantitativos) ? raw.quantitativos : []
  const consultasSINAPI = raw?.consultasSINAPI && typeof raw.consultasSINAPI === 'object' ? raw.consultasSINAPI : {}
  const calculosMO = raw?.calculosMO && typeof raw.calculosMO === 'object' ? raw.calculosMO : {}
  const calculosMat = raw?.calculosMat && typeof raw.calculosMat === 'object' ? raw.calculosMat : {}
  const etapaAtual = raw?.etapaAtual ?? 'E2'
  const etapasConcluidas = Array.isArray(raw?.etapasConcluidas) ? raw.etapasConcluidas : []
  const snapshotParametros = raw?.snapshotParametrosGlobais ?? defaults.globalParams

  return {
    orcamentoClienteId: orcamentoId,
    etapaAtual,
    etapasConcluidas,
    logEtapas: Array.isArray(raw?.logEtapas) ? raw.logEtapas : [],
    logEtapasDetalhado: Array.isArray(raw?.logEtapasDetalhado) ? raw.logEtapasDetalhado : [],
    quantitativos,
    consultasSINAPI,
    calculosMO,
    calculosMat,
    fasesObra: Array.isArray(raw?.fasesObra) ? raw.fasesObra : undefined,
    precificacao: raw?.precificacao,
    statusValidacaoEtapa: raw?.statusValidacaoEtapa ?? {},
    checksumsEtapas: raw?.checksumsEtapas ?? {
      E2: buildChecksum(quantitativos),
      E3: buildChecksum(consultasSINAPI),
      E4: buildChecksum(calculosMO),
      E5: buildChecksum(calculosMat),
    },
    snapshotParametrosGlobais: snapshotParametros,
    versaoParametrosE2: raw?.versaoParametrosE2 ?? new Date(0).toISOString(),
    versaoParametrosE4: raw?.versaoParametrosE4,
    versaoParametrosE6: raw?.versaoParametrosE6,
    uiState: {
      etapaVisivel: raw?.uiState?.etapaVisivel ?? (etapaAtual === 'ENTREGUE' ? 'E6' : etapaAtual),
      servicoSelecionadoE3: raw?.uiState?.servicoSelecionadoE3,
      servicoSelecionadoE4: raw?.uiState?.servicoSelecionadoE4,
      servicoSelecionadoE5: raw?.uiState?.servicoSelecionadoE5,
    },
  }
}

function migrateEngineerData(raw: any): EngineerData {
  const base = defaultEngineerData()
  const merged = {
    ...base,
    ...(raw ?? {}),
    gruposEncargos: {
      ...base.gruposEncargos,
      ...(raw?.gruposEncargos ?? {}),
      grupoC: raw?.gruposEncargos?.grupoC ?? base.gruposEncargos.grupoC,
      grupoDLinha: raw?.gruposEncargos?.grupoDLinha ?? base.gruposEncargos.grupoDLinha,
    },
    composicoesProfissionais: raw?.composicoesProfissionais ?? base.composicoesProfissionais,
  } as EngineerData
  const normalizedByBudget: Record<string, any> = {}

  const existing = merged.orcamentosEngenheiro ?? {}
  Object.keys(existing).forEach((orcamentoId) => {
    normalizedByBudget[orcamentoId] = normalizeEngineerBudget(existing[orcamentoId], orcamentoId, merged)
  })

  const legacyCalcMO = merged.calculoMOResults ?? {}
  const legacyCalcMat = merged.calculoMatConfigs ?? {}
  if (Object.keys(normalizedByBudget).length === 0 && (Object.keys(legacyCalcMO).length > 0 || Object.keys(legacyCalcMat).length > 0)) {
    normalizedByBudget.legado_sem_orcamento = normalizeEngineerBudget({
      etapaAtual: 'E4',
      etapasConcluidas: ['E2', 'E3'],
      calculosMO: Object.fromEntries(Object.entries(legacyCalcMO).map(([id, resultado]) => [id, {
        config: merged.calculoMOConfigs[id],
        resultado,
        cenarioEscolhido: 'Ótima',
        modalidade: 'MEI',
      }])),
      calculosMat: legacyCalcMat,
      uiState: { etapaVisivel: 'E4' },
    }, 'legado_sem_orcamento', merged)
  }

  return {
    ...merged,
    orcamentosEngenheiro: normalizedByBudget,
    moduleUIState: merged.moduleUIState ?? {},
    auditTrail: Array.isArray(merged.auditTrail) ? merged.auditTrail : [],
  }
}

export function loadEngineerData(): EngineerData {
  if (typeof window === 'undefined') return defaultEngineerData()
  try {
    const raw = localStorage.getItem(ENGINEER_KEY)
    if (!raw) return defaultEngineerData()
    return migrateEngineerData(JSON.parse(raw))
  } catch {
    return defaultEngineerData()
  }
}

export function saveEngineerData(data: EngineerData): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(ENGINEER_KEY, JSON.stringify(data))
}
