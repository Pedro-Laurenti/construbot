export interface GlobalParams {
  bdi: number
  encargosPercentual: number
  fatorEncargos: number
  salarioQualificado: number
  salarioMeioOficial: number
  salarioServente: number
  diariaSemEncargos: number
  diariaComEncargos: number
  valorMetaDiario: number
  premioMaximoMensal: number
}

export type ServiceType =
  | 'FUNDACAO'
  | 'ESTRUTURA_CONCRETO'
  | 'ALVENARIA'
  | 'GRAUTE'
  | 'ARMACAO_VERTICAL_HORIZONTAL'
  | 'CONTRAPISO'
  | 'REVESTIMENTO_ARGAMASSA_PAREDE'
  | 'REVESTIMENTO_ARGAMASSA_TETO'
  | 'REVESTIMENTO_CERAMICO'
  | 'PINTURA_INTERNA'
  | 'PINTURA_EXTERNA'
  | 'LIMPEZA_INTERNA'

export type ContratoModalidade = 'MEI' | 'CLT'

export interface InsumoItem {
  descricao: string
  unidade: string
  coeficiente: number
  valorUnitario: number
  total: number
}

export interface CenarioEquipe {
  produtividade: number
  hhProfissional: number
  hhAjudante: number
  profissionaisNecessarios: number
  ajudantesNecessarios: number
  prazoEfetivoDias: number
  custoBase: number
  bonusCenario: number
}

export interface ItemResultado {
  produtividadeBasicaUNh: number
  produtividadeRequerida: number
  hhProfissional: number
  hhAjudante: number
  proporcaoAjudante: number
  rsUN: number
  mensalista: CenarioEquipe
  otima: CenarioEquipe
  prazo: CenarioEquipe
  economia: number
  bonusMEI: number
  bonusCLT: number
  bonusConstrutora: number
  salarioEsperadoMEI: number
  salarioEsperadoCLT: number
  valorEquivalenteTotalUNMEI: number
  valorEquivalenteTotalUNCLT: number
  valorMensalEsperadoMEI: number
  valorMensalEsperadoCLT: number
  custoMaterialServico: number
  insumos: InsumoItem[]
  custoFinalMEI: number
  custoFinalCLT: number
  custoUnitarioMEI: number
  custoUnitarioCLT: number
  bonusConstrutoraMEI: number
  bonusConstrutoralCLT: number
  precoFinalMEI: number
  precoFinalCLT: number
}

export interface OrcamentoItem {
  id: string
  serviceType: ServiceType
  subTipo: string
  especificacao1: string
  especificacao2: string
  especificacao3: string
  unidade: string
  quantidade: number
  prazoRequerido: number
  modalidade: ContratoModalidade
  resultado?: ItemResultado
}

export interface OrcamentoTotais {
  custoMOTotalMEI: number
  custoMOTotalCLT: number
  custoMatTotal: number
  custosDiretosMEI: number
  custosDiretosCLT: number
  custosDiretosPorM2MEI: number
  custosDiretosPorM2CLT: number
  precoFinalMEI: number
  precoFinalCLT: number
  areaTotal: number
  precoPorM2MEI: number
  precoPorM2CLT: number
}

export interface Orcamento {
  id: string
  clienteId: string
  dataCriacao: string
  status: 'rascunho' | 'calculado' | 'enviado'
  uf: string
  itens: OrcamentoItem[]
  totais?: OrcamentoTotais
}

export interface Cliente {
  id: string
  nome: string
  telefone: string
  email: string
  dataCadastro: string
}

export interface AppSession {
  cliente: Cliente | null
  orcamentos: Orcamento[]
  orcamentoAtivo: string | null
}

export interface HealthResponse {
  status: string
  message: string
}

export type ConversationId = 'inicial' | 'cotacao' | 'engenheiro'
export interface UserProfile { name: string; phone: string; email: string }
export interface ChatMessage { id: string; sender: string; text: string; timestamp: string }
export interface ConversationState { messages: ChatMessage[]; cotacaoStep: number; cotacaoComplete: boolean }
