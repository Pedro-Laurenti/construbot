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

export type OrcamentoStatus = 'rascunho' | 'calculado' | 'enviado' | 'aguardando_engenheiro' | 'em_calculo' | 'entregue'

export interface FaixaCotacao {
  minimo: number
  maximo: number
  areaConstruidaM2: number
  tempoObraMeses: number
}

export interface Orcamento {
  id: string
  nome: string
  clienteId: string
  dataCriacao: string
  status: OrcamentoStatus
  uf: string
  itens: OrcamentoItem[]
  totais?: OrcamentoTotais
  parametros?: ParametrosCliente
  saida?: SaidaCliente
  faixaCotacao?: FaixaCotacao
  logEtapas?: Array<{ etapa: string; concluidaEm: string }>
}

export interface Cliente {
  id: string
  nome: string
  telefone: string
  email: string
  dataCadastro: string
  senha?: string
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

export type UserRole = 'cliente' | 'engenheiro'

export interface InsumoSINAPI {
  codigo: string
  descricao: string
  unidade: string
  classificacao: 'MATERIAL' | 'SERVICOS' | 'EQUIPAMENTO'
  origemPreco: 'C' | 'CR'
  precos: Record<string, number | null>
}

export interface ItemComposicao {
  tipoItem: 'COMPOSICAO' | 'INSUMO'
  codigo: string
  descricao: string
  unidade: string
  coeficiente: number
  situacao: 'COM PRECO' | 'SEM PRECO' | 'COM CUSTO' | 'SEM CUSTO' | 'EM ESTUDO'
}

export interface ComposicaoAnalitica {
  codigoComposicao: string
  grupo: string
  descricao: string
  unidade: string
  itens: ItemComposicao[]
}

export type CategoriaProfissional =
  | 'ACABAMENTO_PAREDE_EXTERNA'
  | 'ACABAMENTO_PAREDE_INTERNA'
  | 'ACABAMENTO_PISO_INTERNO'
  | 'ALVENARIA'
  | 'ESTRUTURA_CONCRETO_ARMADO'
  | 'ESTRUTURA_LAJE_PRE_MOLDADA'
  | 'FUNDACAO'
  | 'REGULARIZACAO_PAREDES_TETOS'
  | 'REGULARIZACAO_PISO'

export interface ComposicaoProfissional {
  id: number
  categoria: CategoriaProfissional
  profissional: string
  descricao: string
  servico: string
  refSINAPI: string
  medicao: string
  unidade: string
  producaoMensalSINAPI: number
  valorRefMetaDiaria: number
  produtividadeUNh: number
  produtividadeUNdia: number
  metaProducaoMes: number
  metaProducaoSemana: number
  metaEstipulada?: number
}

export interface PrecificadorItem {
  id: string
  servico: string
  quantidade: number
  especificacao1: string
  especificacao2: string
  especificacao3: string
  composicaoBasica: string
  composicaoProfissionalId: number
  modalidade: 'MEI' | 'CLT'
  unidade: string
  custoTotal?: number
  custoUnitario?: number
}

export interface CalculoMOConfig {
  servicoId: string
  servico: string
  unidade: string
  quantidade: number
  especificacao1: string
  especificacao2: string
  composicaoBasica: string
  produtividadeBasica: number
  adicionalProdutividade: number
  proporcaoAjudante: number
  rsUN: number
  prazoRequerido: number
}

export interface CenarioDetalhadoMO {
  cenario: 'Mensalista' | 'Ótima' | 'Prazo'
  produtividade: number
  hhProfissional: number
  hhAjudante: number
  profissionaisNecessarios: number
  ajudantesNecessarios: number
  prazoEfetivoDias: number
  custoBase: number
  bonusCenario: number
}

export interface CalculoMOResultado {
  configId: string
  mensalista: CenarioDetalhadoMO
  otima: CenarioDetalhadoMO
  prazo: CenarioDetalhadoMO
  cSINAPI: number
  economia: number
  bonusMEI: number
  bonusCLT: number
  bonusConstrutora: number
  cltFixoMaisBônus: number
  meiValorProducao: number
  salarioEsperadoMEI: number
  salarioEsperadoCLT: number
  valorBonusProducaoMEI: number
  valorBonusProducaoCLT: number
  valorEquivalenteTotalUNMEI: number
  valorEquivalenteTotalUNCLT: number
  valorMensalEsperadoMEI: number
  valorMensalEsperadoCLT: number
  custoFinalMEI: number
  custoFinalCLT: number
  precoFinalMEI: number
  precoFinalCLT: number
}

export interface PecaHidraulica {
  descricao: string
  unidade: string
  quantidade: number
}

export interface PontoHidraulico {
  tipo: 'BANHEIRO' | 'COZINHA_LAVANDERIA'
  descricaoPonto: string
  pecas: PecaHidraulica[]
  tempoExecucaoHoras: number
}

export interface InsumoCalculo {
  codigoSINAPI: string
  descricao: string
  unidade: string
  coeficiente: number
  valorUnitario: number
  total: number
}

export interface CalculoMatConfig {
  servicoId: string
  servico: string
  unidade: string
  quantidade: number
  composicaoBasica: string
  insumos: InsumoCalculo[]
}

export interface OrcamentoConsolidado {
  orcamentoId: string
  clienteId: string
  custoMOTotalMEI: number
  custoMOTotalCLT: number
  custoMatTotal: number
  custosDiretosMEI: number
  custosDiretosCLT: number
  custosDiretosPorM2MEI: number
  custosDiretosPorM2CLT: number
  precoFinalMEI: number
  precoFinalCLT: number
  precoPorM2MEI: number
  precoPorM2CLT: number
  status: 'pendente' | 'aprovado' | 'rejeitado'
  observacoes: string
}

export interface ItemGrupoEncargo {
  label: string
  valor: number
}

export interface GruposEncargos {
  grupoA: ItemGrupoEncargo[]
  grupoB: ItemGrupoEncargo[]
  grupoD: ItemGrupoEncargo[]
  grupoE: ItemGrupoEncargo[]
}

export interface OrcamentoReviewStatus {
  status: 'pendente' | 'aprovado' | 'rejeitado'
  observacoes: string
}

export type ModalidadeFinanciamento = 'MCMV' | 'SBPE'
export type TopografiaTerreno = 'PLANO' | 'ACLIVE' | 'DECLIVE'
export type SituacaoTerreno = 'PROPRIO_QUITADO' | 'FINANCIADO_EM_CURSO' | 'A_ADQUIRIR'

export interface Terreno {
  municipio: string
  bairro: string
  endereco: string
  frenteMetros: number
  fundoMetros: number
  areaTotalM2: number
  topografia: TopografiaTerreno
  situacao: SituacaoTerreno
  valorAvaliacao: number
}

export interface ServicoPlanta {
  serviceType: ServiceType
  descricao: string
  unidade: string
  quantidade: number
  especificacao1: string
  especificacao2: string
  especificacao3: string
  composicaoBasica: string
  composicaoProfissionalId: number
}

export interface PlantaPadrao {
  id: string
  nome: string
  quartos: number
  areaConstruidaM2: number
  tempoObraMeses: number
  descricao: string
  descricaoDetalhada?: string
  caracteristicas?: string[]
  imagens?: string[]
  compatibilidadeTerreno: { areaMinima: number; frenteMinima: number }
  servicos: ServicoPlanta[]
}

export interface ImpactoOpcional {
  tipo: 'INCREMENTO' | 'NOVO_SERVICO'
  serviceType: ServiceType
  incrementoQuantidade?: number
  novoServico?: ServicoPlanta
}

export interface OpcionalItem {
  id: string
  nome: string
  descricao: string
  vantagensCliente: string
  desvantagensCliente: string
  selecionado: boolean
  impactoServicos: ImpactoOpcional[]
}

export interface Personalizacao {
  id: string
  descricao: string
  impacto: string
  custoEstimadoAdicional: number
}

export interface ParametrosCliente {
  terreno: Terreno
  quartos: number
  plantaId: string
  opcionais: OpcionalItem[]
  personalizacoes: Personalizacao[]
  modalidadeFinanciamento: ModalidadeFinanciamento
}

export interface AporteMensal {
  mes: number
  aporteRecursosProprios: number
  repasseFinanciamento: number
  desembolsoTotal: number
}

export interface SaidaCliente {
  valorMinimoEntrada: number
  parcelaMensalPrice: number
  tabelaAportes: AporteMensal[]
  prazoTotalObraMeses: number
  precoFinalObra: number
}

export interface CondicoesFinanciamento {
  modalidade: ModalidadeFinanciamento
  taxaJurosAnual: number
  prazoMaximoMeses: number
  percentualMaximoFinanciavel: number
  valorMaximo: number
}

export interface ParametrosINCC {
  inccProjetadoMensal: number
  mesReferencia: string
}

export interface FaseObra {
  nome: string
  mesInicio: number
  mesFim: number
  percentualCusto: number
  servicosRelacionados: ServiceType[]
}

export interface FluxoCaixaMensal {
  mes: number
  custoParcela: number
  custoParcelaCorrigido: number
  inccAcumulado: number
}

export interface SINAPIMapping {
  esp1: string
  esp2?: string
  esp3?: string
  composicaoBasica: string
  cpIds: number[]
  prazoRequeridoPadrao: number
}

export interface QuantitativoServico {
  id: string
  serviceType: ServiceType
  descricao: string
  unidade: string
  quantidade: number
  especificacao1: string
  especificacao2: string
  especificacao3: string
  composicaoBasica: string
  composicaoProfissionalId: number
  modalidade: ContratoModalidade
  origem: 'PLANTA_BASE' | 'OPCIONAL' | 'PERSONALIZACAO'
  prazoRequerido: number
}

export interface PrecificacaoFinalResult {
  custoDiretoMEI: number
  custoDiretoCLT: number
  custoDiretoPorM2MEI: number
  custoDiretoPorM2CLT: number
  custoDiretoComInccMEI: number
  custoDiretoComInccCLT: number
  precoFinalMEI: number
  precoFinalCLT: number
  precoPorM2MEI: number
  precoPorM2CLT: number
  parcelaPriceMEI: number
  parcelaPriceCLT: number
  aporteMinMEI: number
  aporteMinCLT: number
  fluxoCaixaMEI: FluxoCaixaMensal[]
  fluxoCaixaCLT: FluxoCaixaMensal[]
  tabelaAportesMEI: AporteMensal[]
  tabelaAportesCLT: AporteMensal[]
}

export interface InsumoResolvido {
  codigo: string
  descricao: string
  unidade: string
  coeficiente: number
  valorUnitario: number
  total: number
  isFallbackSP: boolean
}

export interface ConsultaSINAPIServico {
  codigoComposicao: string
  insumos: InsumoResolvido[]
  subtotal: number
}

export interface CenarioMOServico {
  config: CalculoMOConfig
  resultado: CalculoMOResultado
  cenarioEscolhido: 'Mensalista' | 'Ótima' | 'Prazo'
  modalidade: ContratoModalidade
}

export interface OrcamentoEngenheiro {
  orcamentoClienteId: string
  etapaAtual: 'E1' | 'E2' | 'E3' | 'E4' | 'E5' | 'E6' | 'ENTREGUE'
  etapasConcluidas: Array<'E1' | 'E2' | 'E3' | 'E4' | 'E5' | 'E6'>
  logEtapas?: Array<{ etapa: string; concluidaEm: string }>
  quantitativos: QuantitativoServico[]
  consultasSINAPI: Record<string, ConsultaSINAPIServico>
  calculosMO: Record<string, CenarioMOServico>
  calculosMat: Record<string, CalculoMatConfig>
  fasesObra?: FaseObra[]
  precificacao?: PrecificacaoFinalResult
}

export interface EngineerData {
  globalParams: GlobalParams
  gruposEncargos: GruposEncargos
  precificadorItens: PrecificadorItem[]
  calculoMOConfigs: Record<string, CalculoMOConfig>
  calculoMOResults: Record<string, CalculoMOResultado>
  calculoMatConfigs: Record<string, CalculoMatConfig>
  orcamentoReviews: Record<string, OrcamentoReviewStatus>
  uf: string
  inccMensal: number
  mesReferenciaSINAPI: string
  orcamentosEngenheiro: Record<string, OrcamentoEngenheiro>
  plantas: PlantaPadrao[]
}
