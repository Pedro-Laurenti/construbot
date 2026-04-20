import type { GlobalParams, ServiceType, Cliente, Orcamento, GruposEncargos, InsumoSINAPI, ComposicaoAnalitica, ComposicaoProfissional, PontoHidraulico, PlantaPadrao, OpcionalItem, ImpactoOpcional, CondicoesFinanciamento, ModalidadeFinanciamento, FaseObra } from '@/types'

export const GLOBAL_PARAMS: GlobalParams = {
  bdi: 0.20,
  encargosPercentual: 1.6013,
  fatorEncargos: 2.6013,
  salarioQualificado: 2664.75,
  salarioMeioOficial: 2427.36,
  salarioServente: 2189.97,
  diariaSemEncargos: 121.125,
  diariaComEncargos: 193.96,
  valorMetaDiario: 220.00,
  premioMaximoMensal: 2175.25,
}

export interface ServiceConfig {
  unidade: string
  prodBasica: number
  propAjudante: number
  materialUnitario: number
}

export const SERVICE_CONFIG: Record<ServiceType, ServiceConfig> = {
  FUNDACAO:                      { unidade: 'M³', prodBasica: 0.12, propAjudante: 1.0, materialUnitario: 380 },
  ESTRUTURA_CONCRETO:            { unidade: 'M³', prodBasica: 0.08, propAjudante: 1.0, materialUnitario: 850 },
  ALVENARIA:                     { unidade: 'M²', prodBasica: 1.00, propAjudante: 0.5, materialUnitario: 45  },
  GRAUTE:                        { unidade: 'M³', prodBasica: 0.20, propAjudante: 1.0, materialUnitario: 420 },
  ARMACAO_VERTICAL_HORIZONTAL:   { unidade: 'KG', prodBasica: 8.00, propAjudante: 0.5, materialUnitario: 9   },
  CONTRAPISO:                    { unidade: 'M²', prodBasica: 1.50, propAjudante: 0.5, materialUnitario: 28  },
  REVESTIMENTO_ARGAMASSA_PAREDE: { unidade: 'M²', prodBasica: 1.20, propAjudante: 0.5, materialUnitario: 18  },
  REVESTIMENTO_ARGAMASSA_TETO:   { unidade: 'M²', prodBasica: 0.80, propAjudante: 0.5, materialUnitario: 22  },
  REVESTIMENTO_CERAMICO:         { unidade: 'M²', prodBasica: 1.10, propAjudante: 0.5, materialUnitario: 75  },
  PINTURA_INTERNA:               { unidade: 'M²', prodBasica: 3.00, propAjudante: 0.3, materialUnitario: 12  },
  PINTURA_EXTERNA:               { unidade: 'M²', prodBasica: 2.50, propAjudante: 0.3, materialUnitario: 18  },
  LIMPEZA_INTERNA:               { unidade: 'M²', prodBasica: 8.00, propAjudante: 0.5, materialUnitario: 4   },
}

export interface ServiceSpecs {
  esp1: string[]
  esp2: string[]
  esp3: string[]
}

export const SERVICE_SPECS: Partial<Record<ServiceType, ServiceSpecs>> = {
  FUNDACAO: {
    esp1: ['Sapata Corrida', 'Radier', 'Sapata Isolada', 'Estaca', 'Tubulão'],
    esp2: [], esp3: [],
  },
  ESTRUTURA_CONCRETO: {
    esp1: ['Pilar', 'Viga', 'Laje', 'Parede de Concreto'],
    esp2: ['Armação', 'Forma', 'Concretagem'],
    esp3: [],
  },
  ALVENARIA: {
    esp1: ['Alvenaria de Vedação', 'Alvenaria Estrutural'],
    esp2: ['Módulo 20 - Vertical/Horizontal', 'Módulo 15 - Vertical', 'Módulo 15 - Vertical/Horizontal', 'Módulo 20 - Horizontal', 'Módulo 15 - Horizontal'],
    esp3: ['Concreto', 'ESP 19', 'Cerâmico'],
  },
  GRAUTE: {
    esp1: ['Vertical', 'Horizontal'],
    esp2: [], esp3: [],
  },
  ARMACAO_VERTICAL_HORIZONTAL: {
    esp1: ['Vertical', 'Horizontal', 'Vertical e Horizontal'],
    esp2: ['CA-50', 'CA-60'],
    esp3: [],
  },
  REVESTIMENTO_ARGAMASSA_PAREDE: {
    esp1: ['Gesso Liso', 'Massa Pronta', 'Emboço'],
    esp2: ['1,0 cm', '1,5 cm', '2,0 cm'],
    esp3: [],
  },
  REVESTIMENTO_ARGAMASSA_TETO: {
    esp1: ['Gesso Liso', 'Massa Pronta'],
    esp2: ['1,0 cm', '1,5 cm'],
    esp3: [],
  },
  REVESTIMENTO_CERAMICO: {
    esp1: ['Piso Interno', 'Parede Interna', 'Fachada', 'Área Externa', 'Piscina'],
    esp2: ['Cerâmica até 45x45', 'Porcelanato até 60x60', 'Porcelanato até 90x90'],
    esp3: [],
  },
  PINTURA_INTERNA: {
    esp1: ['Selador Acrílico', 'Massa Corrida PVA', 'Tinta Acrílica'],
    esp2: [], esp3: [],
  },
  PINTURA_EXTERNA: {
    esp1: ['Selador Acrílico', 'Textura Acrílica'],
    esp2: [], esp3: [],
  },
}

export const SERVICE_SPEC_LABELS: Partial<Record<ServiceType, { esp1?: string; esp2?: string; esp3?: string }>> = {
  FUNDACAO:                      { esp1: 'Tipo de fundação' },
  ESTRUTURA_CONCRETO:            { esp1: 'Elemento estrutural', esp2: 'Etapa da estrutura' },
  ALVENARIA:                     { esp1: 'Função da alvenaria', esp2: 'Módulo do bloco', esp3: 'Material do bloco' },
  GRAUTE:                        { esp1: 'Direção do graute' },
  ARMACAO_VERTICAL_HORIZONTAL:   { esp1: 'Posição da armação', esp2: 'Bitola do aço' },
  REVESTIMENTO_ARGAMASSA_PAREDE: { esp1: 'Tipo de acabamento', esp2: 'Espessura da camada' },
  REVESTIMENTO_ARGAMASSA_TETO:   { esp1: 'Tipo de acabamento', esp2: 'Espessura da camada' },
  REVESTIMENTO_CERAMICO:         { esp1: 'Local de aplicação', esp2: 'Formato do revestimento' },
  PINTURA_INTERNA:               { esp1: 'Tipo de produto' },
  PINTURA_EXTERNA:               { esp1: 'Tipo de produto' },
}

export const SERVICE_LABELS: Record<ServiceType, string> = {
  FUNDACAO:                      'Fundação',
  ESTRUTURA_CONCRETO:            'Estrutura Concreto Armado',
  ALVENARIA:                     'Alvenaria',
  GRAUTE:                        'Graute',
  ARMACAO_VERTICAL_HORIZONTAL:   'Armação Vertical/Horizontal',
  CONTRAPISO:                    'Contrapiso',
  REVESTIMENTO_ARGAMASSA_PAREDE: 'Revestimento Argamassa - Paredes',
  REVESTIMENTO_ARGAMASSA_TETO:   'Revestimento Argamassa - Teto',
  REVESTIMENTO_CERAMICO:         'Revestimento Cerâmico',
  PINTURA_INTERNA:               'Pintura Interna',
  PINTURA_EXTERNA:               'Pintura Externa',
  LIMPEZA_INTERNA:               'Limpeza Interna',
}

export const UF_LIST = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

export const SEED_CLIENTE: Cliente = {
  id: 'demo-001',
  nome: 'João Silva',
  telefone: '(11) 98765-4321',
  email: 'joao@email.com',
  dataCadastro: '2026-01-15',
}

export const SEED_ORCAMENTO: Orcamento = {
  id: 'demo-orc-001',
  nome: 'Casa Demo',
  clienteId: 'demo-001',
  dataCriacao: '2026-01-15',
  status: 'rascunho',
  uf: 'SP',
  itens: [
    {
      id: 'demo-item-001',
      serviceType: 'ALVENARIA',
      subTipo: 'Alvenaria de Vedação',
      especificacao1: 'Alvenaria de Vedação',
      especificacao2: 'Módulo 20 - Vertical/Horizontal',
      especificacao3: 'Concreto',
      unidade: 'M²',
      quantidade: 120,
      prazoRequerido: 30,
      modalidade: 'MEI',
    },
    {
      id: 'demo-item-002',
      serviceType: 'CONTRAPISO',
      subTipo: 'Contrapiso',
      especificacao1: '',
      especificacao2: '',
      especificacao3: '',
      unidade: 'M²',
      quantidade: 120,
      prazoRequerido: 20,
      modalidade: 'MEI',
    },
    {
      id: 'demo-item-003',
      serviceType: 'PINTURA_INTERNA',
      subTipo: 'Pintura Interna',
      especificacao1: 'Tinta Acrílica',
      especificacao2: '',
      especificacao3: '',
      unidade: 'M²',
      quantidade: 240,
      prazoRequerido: 25,
      modalidade: 'CLT',
    },
  ],
}

export const ENGINEER_PASSWORD = 'construbot2026'

export const SEED_CONTA_MOCK: Cliente = {
  id: 'cli-demo-maria',
  nome: 'Maria Silva',
  telefone: '(11) 98765-4321',
  email: 'maria@construbot.com',
  dataCadastro: '2026-01-10',
  senha: 'demo1234',
}

export const GOOGLE_MOCK_USER = {
  nome: 'Pedro Laurenti',
  email: 'pedro.laurenti@gmail.com',
}

export const DEFAULT_GRUPOS_ENCARGOS: GruposEncargos = {
  grupoA: [
    { label: 'INSS', valor: 10.00 },
    { label: 'FGTS', valor: 8.00 },
    { label: 'Sal. Educação', valor: 2.50 },
    { label: 'SESI', valor: 1.50 },
    { label: 'SENAI/SEBRAE', valor: 1.60 },
    { label: 'INCRA', valor: 0.20 },
    { label: 'Seg. Riscos/Acidentes', valor: 3.00 },
    { label: 'SECONCI', valor: 1.00 },
  ],
  grupoB: [
    { label: 'DSR', valor: 18.13 },
    { label: 'Feriados', valor: 8.00 },
    { label: 'Férias + 1/3 Constitucional', valor: 15.10 },
    { label: 'Aux. Enfermidade/Acidentes', valor: 2.58 },
    { label: '13° Salário', valor: 11.33 },
    { label: 'Lic. Paternidade', valor: 0.13 },
    { label: 'Faltas Justificadas', valor: 0.76 },
  ],
  grupoD: [
    { label: 'Aviso Prévio', valor: 11.56 },
    { label: 'Depósito Despedida Injusta', valor: 3.08 },
    { label: 'Indenização Adicional', valor: 0.78 },
    { label: 'LC 110/01', valor: 0.77 },
  ],
  grupoE: [
    { label: 'Dias de chuva', valor: 1.50 },
    { label: 'Almoço', valor: 21.34 },
    { label: 'Jantar', valor: 3.87 },
    { label: 'Café da manhã', valor: 8.47 },
    { label: 'EPI', valor: 6.14 },
    { label: 'Vale-transporte', valor: 4.57 },
    { label: 'Seguro de vida', valor: 0.44 },
  ],
}

export const INSUMOS_SINAPI: InsumoSINAPI[] = [
  { codigo: '00001379', descricao: 'CIMENTO PORTLAND COMPOSTO CP II-E-32, SACO 50KG', unidade: 'SC', classificacao: 'MATERIAL', origemPreco: 'C', precos: { SP: 32.50, RJ: 34.00, MG: 31.00, RS: 30.50, PR: 31.50, SC: 30.00, BA: 33.00, PE: 34.50 } },
  { codigo: '00004727', descricao: 'AREIA MEDIA LAVADA', unidade: 'M3', classificacao: 'MATERIAL', origemPreco: 'C', precos: { SP: 120.00, RJ: 135.00, MG: 110.00, RS: 115.00, PR: 112.00, SC: 118.00, BA: 125.00, PE: 130.00 } },
  { codigo: '00000364', descricao: 'BRITA 1', unidade: 'M3', classificacao: 'MATERIAL', origemPreco: 'C', precos: { SP: 150.00, RJ: 165.00, MG: 140.00, RS: 145.00, PR: 142.00, SC: 148.00, BA: 155.00, PE: 160.00 } },
  { codigo: '00034034', descricao: 'BLOCO CERAMICO (TIJOLO FURADO) 9X19X19 CM', unidade: 'UN', classificacao: 'MATERIAL', origemPreco: 'C', precos: { SP: 1.20, RJ: 1.35, MG: 1.10, RS: 1.15, PR: 1.12, SC: 1.18, BA: 1.25, PE: 1.30 } },
  { codigo: '00008020', descricao: 'BLOCO DE CONCRETO ESTRUTURAL 14X19X39 CM', unidade: 'UN', classificacao: 'MATERIAL', origemPreco: 'C', precos: { SP: 4.50, RJ: 4.80, MG: 4.30, RS: 4.40, PR: 4.35, SC: 4.50, BA: 4.60, PE: 4.75 } },
  { codigo: '00006162', descricao: 'ARGAMASSA COLANTE AC-II, SACO 20KG', unidade: 'SC', classificacao: 'MATERIAL', origemPreco: 'C', precos: { SP: 25.00, RJ: 27.00, MG: 24.00, RS: 24.50, PR: 24.00, SC: 24.50, BA: 26.00, PE: 27.50 } },
  { codigo: '00034138', descricao: 'PISO CERAMICO PEI-4 45X45CM', unidade: 'M2', classificacao: 'MATERIAL', origemPreco: 'C', precos: { SP: 45.00, RJ: 48.00, MG: 43.00, RS: 44.00, PR: 43.50, SC: 44.00, BA: 47.00, PE: 49.00 } },
  { codigo: '00034198', descricao: 'PORCELANATO POLIDO 60X60CM', unidade: 'M2', classificacao: 'MATERIAL', origemPreco: 'C', precos: { SP: 85.00, RJ: 90.00, MG: 82.00, RS: 83.00, PR: 83.00, SC: 84.00, BA: 88.00, PE: 92.00 } },
  { codigo: '00004625', descricao: 'TINTA ACRILICA PREMIUM BRANCA, LATA 18L', unidade: 'LT', classificacao: 'MATERIAL', origemPreco: 'C', precos: { SP: 280.00, RJ: 295.00, MG: 270.00, RS: 275.00, PR: 272.00, SC: 278.00, BA: 285.00, PE: 290.00 } },
  { codigo: '00007402', descricao: 'GESSO EM PO PARA REVESTIMENTO, SACO 20KG', unidade: 'SC', classificacao: 'MATERIAL', origemPreco: 'C', precos: { SP: 20.00, RJ: 22.00, MG: 19.00, RS: 19.50, PR: 19.50, SC: 20.00, BA: 21.00, PE: 22.50 } },
  { codigo: '00006028', descricao: 'ACO CA-50, BARRAS E FIOS, D=6,3MM (1/4")', unidade: 'KG', classificacao: 'MATERIAL', origemPreco: 'C', precos: { SP: 8.50, RJ: 9.00, MG: 8.30, RS: 8.40, PR: 8.35, SC: 8.50, BA: 8.80, PE: 9.20 } },
  { codigo: '00006033', descricao: 'ACO CA-50, BARRAS E FIOS, D=12,5MM (1/2")', unidade: 'KG', classificacao: 'MATERIAL', origemPreco: 'C', precos: { SP: 8.30, RJ: 8.80, MG: 8.10, RS: 8.20, PR: 8.15, SC: 8.30, BA: 8.60, PE: 9.00 } },
  { codigo: '00000090', descricao: 'TABUA *2,5 X 30* CM EM MADEIRA NAO APARELHADA', unidade: 'M', classificacao: 'MATERIAL', origemPreco: 'C', precos: { SP: 22.00, RJ: 24.00, MG: 21.00, RS: 21.50, PR: 21.50, SC: 22.00, BA: 23.00, PE: 24.00 } },
  { codigo: '00037636', descricao: 'PREGO DE ACO POLIDO COM CABECA 17X27 (2 1/4 X 10)', unidade: 'KG', classificacao: 'MATERIAL', origemPreco: 'CR', precos: { SP: 18.00, RJ: 19.50, MG: 17.50, RS: 17.80, PR: 17.80, SC: 18.00, BA: null, PE: null } },
  { codigo: '00000246', descricao: 'CAL HIDRATADA CH-III, SACO 20KG', unidade: 'SC', classificacao: 'MATERIAL', origemPreco: 'C', precos: { SP: 14.00, RJ: 15.50, MG: 13.50, RS: 13.80, PR: 13.80, SC: 14.00, BA: 14.80, PE: 15.50 } },
  { codigo: '00000875', descricao: 'ARGAMASSA DE REGULARIZACAO TRACO 1:3 (EM VOLUME)', unidade: 'M3', classificacao: 'MATERIAL', origemPreco: 'C', precos: { SP: 340.00, RJ: 360.00, MG: 325.00, RS: 330.00, PR: 328.00, SC: 335.00, BA: 350.00, PE: 365.00 } },
  { codigo: '00007613', descricao: 'SELADOR ACRILICO, LATA 18L', unidade: 'LT', classificacao: 'MATERIAL', origemPreco: 'C', precos: { SP: 180.00, RJ: 190.00, MG: 175.00, RS: 177.00, PR: 176.00, SC: 178.00, BA: 183.00, PE: 188.00 } },
  { codigo: '00034395', descricao: 'MASSA CORRIDA PVA, LATA 25KG', unidade: 'LT', classificacao: 'MATERIAL', origemPreco: 'CR', precos: { SP: 95.00, RJ: 102.00, MG: 92.00, RS: 93.00, PR: null, SC: 93.50, BA: null, PE: 102.00 } },
  { codigo: '00000273', descricao: 'CONCRETO FCK=25 MPA, PREPARO MANUAL', unidade: 'M3', classificacao: 'MATERIAL', origemPreco: 'C', precos: { SP: 480.00, RJ: 510.00, MG: 460.00, RS: 470.00, PR: 465.00, SC: 475.00, BA: 495.00, PE: 515.00 } },
  { codigo: '00001599', descricao: 'GROUT DE ALTA RESISTENCIA, SACO 25KG', unidade: 'SC', classificacao: 'MATERIAL', origemPreco: 'C', precos: { SP: 65.00, RJ: 70.00, MG: 63.00, RS: 64.00, PR: 63.50, SC: 64.50, BA: 67.00, PE: 70.00 } },
]

export const COMPOSICOES_ANALITICAS: ComposicaoAnalitica[] = [
  {
    codigoComposicao: '87888', grupo: 'ALVENARIA', unidade: 'M2',
    descricao: 'ALVENARIA DE VEDACAO COM BLOCOS CERAMICOS FURADOS 9X19X19CM',
    itens: [
      { tipoItem: 'INSUMO', codigo: '34034', descricao: 'BLOCO CERAMICO 9X19X19', unidade: 'UN', coeficiente: 22.68, situacao: 'COM PRECO' },
      { tipoItem: 'INSUMO', codigo: '00001379', descricao: 'CIMENTO CP II-E-32', unidade: 'SC', coeficiente: 0.32, situacao: 'COM PRECO' },
      { tipoItem: 'INSUMO', codigo: '04727', descricao: 'AREIA MEDIA LAVADA', unidade: 'M3', coeficiente: 0.064, situacao: 'COM PRECO' },
      { tipoItem: 'COMPOSICAO', codigo: '88316', descricao: 'SERVENTE COM ENCARGOS SOCIAIS', unidade: 'H', coeficiente: 0.75, situacao: 'COM CUSTO' },
      { tipoItem: 'COMPOSICAO', codigo: '88239', descricao: 'PEDREIRO COM ENCARGOS SOCIAIS', unidade: 'H', coeficiente: 0.87, situacao: 'COM CUSTO' },
    ],
  },
  {
    codigoComposicao: '87251', grupo: 'REGULARIZACAO', unidade: 'M2',
    descricao: 'CONTRAPISO EM ARGAMASSA TRACO 1:3, E=5CM',
    itens: [
      { tipoItem: 'INSUMO', codigo: '00000875', descricao: 'ARGAMASSA 1:3', unidade: 'M3', coeficiente: 0.055, situacao: 'COM PRECO' },
      { tipoItem: 'COMPOSICAO', codigo: '88316', descricao: 'SERVENTE COM ENCARGOS SOCIAIS', unidade: 'H', coeficiente: 0.35, situacao: 'COM CUSTO' },
      { tipoItem: 'COMPOSICAO', codigo: '88239', descricao: 'PEDREIRO COM ENCARGOS SOCIAIS', unidade: 'H', coeficiente: 0.48, situacao: 'COM CUSTO' },
    ],
  },
  {
    codigoComposicao: '87264', grupo: 'REVESTIMENTO', unidade: 'M2',
    descricao: 'REVESTIMENTO COM ARGAMASSA GESSO LISO, 1CM',
    itens: [
      { tipoItem: 'INSUMO', codigo: '07402', descricao: 'GESSO EM PO', unidade: 'SC', coeficiente: 2.00, situacao: 'COM PRECO' },
      { tipoItem: 'COMPOSICAO', codigo: '88309', descricao: 'GESSEIRO COM ENCARGOS SOCIAIS', unidade: 'H', coeficiente: 0.50, situacao: 'COM CUSTO' },
    ],
  },
  {
    codigoComposicao: '88484', grupo: 'PINTURA', unidade: 'M2',
    descricao: 'PINTURA COM TINTA ACRILICA EM PAREDE INTERNA, 2 DEMAOS',
    itens: [
      { tipoItem: 'INSUMO', codigo: '04625', descricao: 'TINTA ACRILICA 18L', unidade: 'LT', coeficiente: 0.16, situacao: 'COM PRECO' },
      { tipoItem: 'INSUMO', codigo: '07613', descricao: 'SELADOR ACRILICO 18L', unidade: 'LT', coeficiente: 0.08, situacao: 'COM PRECO' },
      { tipoItem: 'COMPOSICAO', codigo: '88316', descricao: 'SERVENTE COM ENCARGOS SOCIAIS', unidade: 'H', coeficiente: 0.10, situacao: 'COM CUSTO' },
      { tipoItem: 'COMPOSICAO', codigo: '88268', descricao: 'PINTOR COM ENCARGOS SOCIAIS', unidade: 'H', coeficiente: 0.32, situacao: 'COM CUSTO' },
    ],
  },
  {
    codigoComposicao: '87557', grupo: 'FUNDACAO', unidade: 'M3',
    descricao: 'SAPATA CORRIDA EM CONCRETO ARMADO FCK=25MPA',
    itens: [
      { tipoItem: 'INSUMO', codigo: '00000273', descricao: 'CONCRETO FCK=25MPA', unidade: 'M3', coeficiente: 1.00, situacao: 'COM PRECO' },
      { tipoItem: 'INSUMO', codigo: '06028', descricao: 'ACO CA-50 D=6,3MM', unidade: 'KG', coeficiente: 68.0, situacao: 'COM PRECO' },
      { tipoItem: 'COMPOSICAO', codigo: '88239', descricao: 'PEDREIRO COM ENCARGOS SOCIAIS', unidade: 'H', coeficiente: 5.20, situacao: 'COM CUSTO' },
      { tipoItem: 'COMPOSICAO', codigo: '88316', descricao: 'SERVENTE COM ENCARGOS SOCIAIS', unidade: 'H', coeficiente: 6.50, situacao: 'COM CUSTO' },
    ],
  },
]

export const COMPOSICOES_PROFISSIONAIS: ComposicaoProfissional[] = [
  { id: 1, categoria: 'FUNDACAO', profissional: 'Pedreiro', descricao: 'Execução de sapata corrida em concreto armado', servico: 'Fundação Sapata Corrida', refSINAPI: '87557', medicao: 'M³', unidade: 'M³', producaoMensalSINAPI: 18, valorRefMetaDiaria: 68.75, produtividadeUNh: 0.40, produtividadeUNdia: 3.20, metaProducaoMes: 70.4, metaProducaoSemana: 16.3 },
  { id: 2, categoria: 'FUNDACAO', profissional: 'Armador', descricao: 'Armação de aço para fundações', servico: 'Armação para Fundação', refSINAPI: '87316', medicao: 'KG', unidade: 'KG', producaoMensalSINAPI: 3200, valorRefMetaDiaria: 3.13, produtividadeUNh: 8.79, produtividadeUNdia: 70.3, metaProducaoMes: 1547, metaProducaoSemana: 357 },
  { id: 3, categoria: 'FUNDACAO', profissional: 'Carpinteiro', descricao: 'Execução de formas para fundações', servico: 'Forma para Fundação', refSINAPI: '87411', medicao: 'M²', unidade: 'M²', producaoMensalSINAPI: 110, valorRefMetaDiaria: 53.97, produtividadeUNh: 0.51, produtividadeUNdia: 4.07, metaProducaoMes: 89.5, metaProducaoSemana: 20.7 },
  { id: 4, categoria: 'ESTRUTURA_CONCRETO_ARMADO', profissional: 'Armador', descricao: 'Armação de aço para pilares e vigas', servico: 'Armação Estrutural', refSINAPI: '87316', medicao: 'KG', unidade: 'KG', producaoMensalSINAPI: 2800, valorRefMetaDiaria: 3.13, produtividadeUNh: 8.79, produtividadeUNdia: 70.3, metaProducaoMes: 1547, metaProducaoSemana: 357 },
  { id: 5, categoria: 'ESTRUTURA_CONCRETO_ARMADO', profissional: 'Carpinteiro', descricao: 'Formas para pilares e vigas', servico: 'Forma Estrutural', refSINAPI: '87394', medicao: 'M²', unidade: 'M²', producaoMensalSINAPI: 95, valorRefMetaDiaria: 53.97, produtividadeUNh: 0.51, produtividadeUNdia: 4.07, metaProducaoMes: 89.5, metaProducaoSemana: 20.7 },
  { id: 6, categoria: 'ESTRUTURA_LAJE_PRE_MOLDADA', profissional: 'Pedreiro', descricao: 'Assentamento de laje pré-moldada', servico: 'Laje Pré-Moldada', refSINAPI: '89736', medicao: 'M²', unidade: 'M²', producaoMensalSINAPI: 200, valorRefMetaDiaria: 27.50, produtividadeUNh: 1.00, produtividadeUNdia: 8.00, metaProducaoMes: 176, metaProducaoSemana: 40.6 },
  { id: 7, categoria: 'ESTRUTURA_LAJE_PRE_MOLDADA', profissional: 'Carpinteiro', descricao: 'Escoras e cimbramento para laje', servico: 'Escoramento Laje', refSINAPI: '87411', medicao: 'M²', unidade: 'M²', producaoMensalSINAPI: 180, valorRefMetaDiaria: 37.50, produtividadeUNh: 0.73, produtividadeUNdia: 5.87, metaProducaoMes: 129, metaProducaoSemana: 29.8 },
  { id: 8, categoria: 'ALVENARIA', profissional: 'Pedreiro', descricao: 'Assentamento de blocos cerâmicos e de concreto', servico: 'Alvenaria', refSINAPI: '87888', medicao: 'M²', unidade: 'M²', producaoMensalSINAPI: 190, valorRefMetaDiaria: 13.00, produtividadeUNh: 2.12, produtividadeUNdia: 16.9, metaProducaoMes: 372, metaProducaoSemana: 86.0 },
  { id: 9, categoria: 'ALVENARIA', profissional: 'Armador', descricao: 'Armação de aço para alvenaria estrutural', servico: 'Armação Alvenaria Estrutural', refSINAPI: '87266', medicao: 'KG', unidade: 'KG', producaoMensalSINAPI: 2200, valorRefMetaDiaria: 3.13, produtividadeUNh: 8.79, produtividadeUNdia: 70.3, metaProducaoMes: 1547, metaProducaoSemana: 357 },
  { id: 10, categoria: 'REGULARIZACAO_PISO', profissional: 'Pedreiro', descricao: 'Execução de contrapiso em argamassa', servico: 'Contrapiso', refSINAPI: '87251', medicao: 'M²', unidade: 'M²', producaoMensalSINAPI: 260, valorRefMetaDiaria: 10.00, produtividadeUNh: 2.75, produtividadeUNdia: 22.0, metaProducaoMes: 484, metaProducaoSemana: 111.8 },
  { id: 11, categoria: 'REGULARIZACAO_PAREDES_TETOS', profissional: 'Gesseiro', descricao: 'Gesso liso em paredes e tetos internos', servico: 'Gesso Liso', refSINAPI: '87264', medicao: 'M²', unidade: 'M²', producaoMensalSINAPI: 280, valorRefMetaDiaria: 8.46, produtividadeUNh: 3.25, produtividadeUNdia: 26.0, metaProducaoMes: 572, metaProducaoSemana: 132.1 },
  { id: 12, categoria: 'ACABAMENTO_PISO_INTERNO', profissional: 'Azulejista', descricao: 'Assentamento de piso cerâmico e porcelanato', servico: 'Revestimento Cerâmico Piso', refSINAPI: '87879', medicao: 'M²', unidade: 'M²', producaoMensalSINAPI: 160, valorRefMetaDiaria: 16.25, produtividadeUNh: 1.69, produtividadeUNdia: 13.5, metaProducaoMes: 297, metaProducaoSemana: 68.6 },
  { id: 13, categoria: 'ACABAMENTO_PAREDE_INTERNA', profissional: 'Azulejista', descricao: 'Assentamento de revestimento cerâmico em paredes internas', servico: 'Revestimento Cerâmico Parede', refSINAPI: '87269', medicao: 'M²', unidade: 'M²', producaoMensalSINAPI: 130, valorRefMetaDiaria: 19.00, produtividadeUNh: 1.45, produtividadeUNdia: 11.6, metaProducaoMes: 255, metaProducaoSemana: 58.9 },
  { id: 14, categoria: 'ACABAMENTO_PAREDE_INTERNA', profissional: 'Pintor', descricao: 'Pintura acrílica interna (selador + massa + 2 demãos)', servico: 'Pintura Interna', refSINAPI: '88484', medicao: 'M²', unidade: 'M²', producaoMensalSINAPI: 440, valorRefMetaDiaria: 4.59, produtividadeUNh: 5.99, produtividadeUNdia: 47.9, metaProducaoMes: 1054, metaProducaoSemana: 243.4 },
  { id: 15, categoria: 'ACABAMENTO_PAREDE_EXTERNA', profissional: 'Pintor', descricao: 'Pintura acrílica externa (selador + textura)', servico: 'Pintura Externa', refSINAPI: '88485', medicao: 'M²', unidade: 'M²', producaoMensalSINAPI: 380, valorRefMetaDiaria: 5.26, produtividadeUNh: 5.23, produtividadeUNdia: 41.9, metaProducaoMes: 921, metaProducaoSemana: 212.7 },
]

export const PONTOS_HIDRAULICOS: PontoHidraulico[] = [
  { tipo: 'BANHEIRO', descricaoPonto: 'Ponto de chuveiro', tempoExecucaoHoras: 4.0, pecas: [
    { descricao: 'Tubo PVC soldável 25mm', unidade: 'M', quantidade: 3.5 },
    { descricao: 'Joelho 90° PVC 25mm', unidade: 'UN', quantidade: 4 },
    { descricao: 'Te PVC 25mm', unidade: 'UN', quantidade: 1 },
    { descricao: 'Adaptador curto PVC 25mm', unidade: 'UN', quantidade: 2 },
  ]},
  { tipo: 'BANHEIRO', descricaoPonto: 'Ponto de lavatório', tempoExecucaoHoras: 3.5, pecas: [
    { descricao: 'Tubo PVC soldável 25mm', unidade: 'M', quantidade: 2.5 },
    { descricao: 'Joelho 90° PVC 25mm', unidade: 'UN', quantidade: 3 },
    { descricao: 'Registro de gaveta 3/4"', unidade: 'UN', quantidade: 1 },
    { descricao: 'Adaptador curto PVC 25mm', unidade: 'UN', quantidade: 2 },
  ]},
  { tipo: 'BANHEIRO', descricaoPonto: 'Ponto de vaso sanitário', tempoExecucaoHoras: 2.5, pecas: [
    { descricao: 'Tubo PVC soldável 25mm', unidade: 'M', quantidade: 1.5 },
    { descricao: 'Joelho 90° PVC 25mm', unidade: 'UN', quantidade: 2 },
    { descricao: 'Adaptador curto PVC 25mm', unidade: 'UN', quantidade: 1 },
  ]},
  { tipo: 'COZINHA_LAVANDERIA', descricaoPonto: 'Ponto de pia de cozinha', tempoExecucaoHoras: 4.0, pecas: [
    { descricao: 'Tubo PVC soldável 25mm', unidade: 'M', quantidade: 3.0 },
    { descricao: 'Joelho 90° PVC 25mm', unidade: 'UN', quantidade: 3 },
    { descricao: 'Te PVC 25mm', unidade: 'UN', quantidade: 1 },
    { descricao: 'Registro de gaveta 3/4"', unidade: 'UN', quantidade: 2 },
    { descricao: 'Adaptador curto PVC 25mm', unidade: 'UN', quantidade: 2 },
  ]},
  { tipo: 'COZINHA_LAVANDERIA', descricaoPonto: 'Ponto de tanque/máquina', tempoExecucaoHoras: 3.0, pecas: [
    { descricao: 'Tubo PVC soldável 25mm', unidade: 'M', quantidade: 2.5 },
    { descricao: 'Joelho 90° PVC 25mm', unidade: 'UN', quantidade: 3 },
    { descricao: 'Registro de gaveta 3/4"', unidade: 'UN', quantidade: 1 },
    { descricao: 'Adaptador curto PVC 25mm', unidade: 'UN', quantidade: 2 },
  ]},
]

export const PLANTAS_PADRAO: PlantaPadrao[] = [
  {
    id: 'planta-1q-36', nome: 'Kitnet 1Q', quartos: 1, areaConstruidaM2: 36, tempoObraMeses: 4,
    descricao: 'Kitnet térrea com 1 quarto, sala/cozinha integrada e banheiro',
    compatibilidadeTerreno: { areaMinima: 100, frenteMinima: 6 },
    servicos: [
      { serviceType: 'FUNDACAO', descricao: 'Fundação Sapata Corrida', unidade: 'M3', quantidade: 3.0, especificacao1: 'Sapata Corrida', especificacao2: '', especificacao3: '', composicaoBasica: '104924', composicaoProfissionalId: 38 },
      { serviceType: 'ALVENARIA', descricao: 'Alvenaria Estrutural', unidade: 'M2', quantidade: 120, especificacao1: 'Alvenaria Estrutural', especificacao2: 'Módulo 15 - Vertical', especificacao3: 'Concreto', composicaoBasica: '89288', composicaoProfissionalId: 15 },
      { serviceType: 'GRAUTE', descricao: 'Grauteamento Vertical', unidade: 'M3', quantidade: 1.8, especificacao1: 'Vertical', especificacao2: '', especificacao3: '', composicaoBasica: '89993', composicaoProfissionalId: 21 },
      { serviceType: 'CONTRAPISO', descricao: 'Contrapiso Farofa 2cm', unidade: 'M2', quantidade: 36, especificacao1: '', especificacao2: '', especificacao3: '', composicaoBasica: '87622', composicaoProfissionalId: 41 },
      { serviceType: 'REVESTIMENTO_ARGAMASSA_PAREDE', descricao: 'Gesso Liso Paredes', unidade: 'M2', quantidade: 150, especificacao1: 'Gesso Liso', especificacao2: '1,0 cm', especificacao3: '', composicaoBasica: '87421', composicaoProfissionalId: 39 },
      { serviceType: 'REVESTIMENTO_ARGAMASSA_TETO', descricao: 'Gesso Liso Teto', unidade: 'M2', quantidade: 36, especificacao1: 'Gesso Liso', especificacao2: '1,0 cm', especificacao3: '', composicaoBasica: '87414', composicaoProfissionalId: 40 },
      { serviceType: 'REVESTIMENTO_CERAMICO', descricao: 'Porcelanato Piso 60x60', unidade: 'M2', quantidade: 30, especificacao1: 'Piso Interno', especificacao2: 'Porcelanato até 60x60', especificacao3: '', composicaoBasica: '87263', composicaoProfissionalId: 11 },
      { serviceType: 'PINTURA_INTERNA', descricao: 'Pintura Interna', unidade: 'M2', quantidade: 186, especificacao1: 'Tinta Acrílica', especificacao2: '', especificacao3: '', composicaoBasica: '88489', composicaoProfissionalId: 10 },
      { serviceType: 'PINTURA_EXTERNA', descricao: 'Pintura Externa Textura', unidade: 'M2', quantidade: 65, especificacao1: 'Textura Acrílica', especificacao2: '', especificacao3: '', composicaoBasica: '88423', composicaoProfissionalId: 3 },
      { serviceType: 'LIMPEZA_INTERNA', descricao: 'Limpeza Final', unidade: 'M2', quantidade: 36, especificacao1: '', especificacao2: '', especificacao3: '', composicaoBasica: '', composicaoProfissionalId: 0 },
    ],
  },
  {
    id: 'planta-2q-48', nome: 'Casa Compacta 2Q', quartos: 2, areaConstruidaM2: 48, tempoObraMeses: 6,
    descricao: 'Casa térrea compacta com 2 quartos, sala, cozinha, banheiro e área de serviço',
    compatibilidadeTerreno: { areaMinima: 150, frenteMinima: 8 },
    servicos: [
      { serviceType: 'FUNDACAO', descricao: 'Fundação Sapata Corrida', unidade: 'M3', quantidade: 4.5, especificacao1: 'Sapata Corrida', especificacao2: '', especificacao3: '', composicaoBasica: '104924', composicaoProfissionalId: 38 },
      { serviceType: 'ALVENARIA', descricao: 'Alvenaria Estrutural', unidade: 'M2', quantidade: 180, especificacao1: 'Alvenaria Estrutural', especificacao2: 'Módulo 15 - Vertical', especificacao3: 'Concreto', composicaoBasica: '89288', composicaoProfissionalId: 15 },
      { serviceType: 'GRAUTE', descricao: 'Grauteamento Vertical', unidade: 'M3', quantidade: 2.8, especificacao1: 'Vertical', especificacao2: '', especificacao3: '', composicaoBasica: '89993', composicaoProfissionalId: 21 },
      { serviceType: 'CONTRAPISO', descricao: 'Contrapiso Farofa 2cm', unidade: 'M2', quantidade: 48, especificacao1: '', especificacao2: '', especificacao3: '', composicaoBasica: '87622', composicaoProfissionalId: 41 },
      { serviceType: 'REVESTIMENTO_ARGAMASSA_PAREDE', descricao: 'Gesso Liso Paredes', unidade: 'M2', quantidade: 220, especificacao1: 'Gesso Liso', especificacao2: '1,0 cm', especificacao3: '', composicaoBasica: '87421', composicaoProfissionalId: 39 },
      { serviceType: 'REVESTIMENTO_ARGAMASSA_TETO', descricao: 'Gesso Liso Teto', unidade: 'M2', quantidade: 48, especificacao1: 'Gesso Liso', especificacao2: '1,0 cm', especificacao3: '', composicaoBasica: '87414', composicaoProfissionalId: 40 },
      { serviceType: 'REVESTIMENTO_CERAMICO', descricao: 'Porcelanato Piso 60x60', unidade: 'M2', quantidade: 42, especificacao1: 'Piso Interno', especificacao2: 'Porcelanato até 60x60', especificacao3: '', composicaoBasica: '87263', composicaoProfissionalId: 11 },
      { serviceType: 'PINTURA_INTERNA', descricao: 'Pintura Interna', unidade: 'M2', quantidade: 268, especificacao1: 'Tinta Acrílica', especificacao2: '', especificacao3: '', composicaoBasica: '88489', composicaoProfissionalId: 10 },
      { serviceType: 'PINTURA_EXTERNA', descricao: 'Pintura Externa Textura', unidade: 'M2', quantidade: 95, especificacao1: 'Textura Acrílica', especificacao2: '', especificacao3: '', composicaoBasica: '88423', composicaoProfissionalId: 3 },
      { serviceType: 'LIMPEZA_INTERNA', descricao: 'Limpeza Final', unidade: 'M2', quantidade: 48, especificacao1: '', especificacao2: '', especificacao3: '', composicaoBasica: '', composicaoProfissionalId: 0 },
    ],
  },
  {
    id: 'planta-3q-72', nome: 'Casa Padrão 3Q', quartos: 3, areaConstruidaM2: 72, tempoObraMeses: 8,
    descricao: 'Casa térrea com 3 quartos, sala ampla, cozinha americana, 2 banheiros e garagem',
    compatibilidadeTerreno: { areaMinima: 200, frenteMinima: 10 },
    servicos: [
      { serviceType: 'FUNDACAO', descricao: 'Fundação Sapata Corrida', unidade: 'M3', quantidade: 6.2, especificacao1: 'Sapata Corrida', especificacao2: '', especificacao3: '', composicaoBasica: '104924', composicaoProfissionalId: 38 },
      { serviceType: 'ALVENARIA', descricao: 'Alvenaria Estrutural', unidade: 'M2', quantidade: 260, especificacao1: 'Alvenaria Estrutural', especificacao2: 'Módulo 15 - Vertical', especificacao3: 'Concreto', composicaoBasica: '89288', composicaoProfissionalId: 15 },
      { serviceType: 'GRAUTE', descricao: 'Grauteamento Vertical', unidade: 'M3', quantidade: 3.8, especificacao1: 'Vertical', especificacao2: '', especificacao3: '', composicaoBasica: '89993', composicaoProfissionalId: 21 },
      { serviceType: 'CONTRAPISO', descricao: 'Contrapiso Farofa 2cm', unidade: 'M2', quantidade: 72, especificacao1: '', especificacao2: '', especificacao3: '', composicaoBasica: '87622', composicaoProfissionalId: 41 },
      { serviceType: 'REVESTIMENTO_ARGAMASSA_PAREDE', descricao: 'Gesso Liso Paredes', unidade: 'M2', quantidade: 340, especificacao1: 'Gesso Liso', especificacao2: '1,0 cm', especificacao3: '', composicaoBasica: '87421', composicaoProfissionalId: 39 },
      { serviceType: 'REVESTIMENTO_ARGAMASSA_TETO', descricao: 'Gesso Liso Teto', unidade: 'M2', quantidade: 72, especificacao1: 'Gesso Liso', especificacao2: '1,0 cm', especificacao3: '', composicaoBasica: '87414', composicaoProfissionalId: 40 },
      { serviceType: 'REVESTIMENTO_CERAMICO', descricao: 'Porcelanato Piso 60x60', unidade: 'M2', quantidade: 62, especificacao1: 'Piso Interno', especificacao2: 'Porcelanato até 60x60', especificacao3: '', composicaoBasica: '87263', composicaoProfissionalId: 11 },
      { serviceType: 'PINTURA_INTERNA', descricao: 'Pintura Interna', unidade: 'M2', quantidade: 412, especificacao1: 'Tinta Acrílica', especificacao2: '', especificacao3: '', composicaoBasica: '88489', composicaoProfissionalId: 10 },
      { serviceType: 'PINTURA_EXTERNA', descricao: 'Pintura Externa Textura', unidade: 'M2', quantidade: 140, especificacao1: 'Textura Acrílica', especificacao2: '', especificacao3: '', composicaoBasica: '88423', composicaoProfissionalId: 3 },
      { serviceType: 'LIMPEZA_INTERNA', descricao: 'Limpeza Final', unidade: 'M2', quantidade: 72, especificacao1: '', especificacao2: '', especificacao3: '', composicaoBasica: '', composicaoProfissionalId: 0 },
    ],
  },
  {
    id: 'planta-3q-90', nome: 'Casa Conforto 3Q', quartos: 3, areaConstruidaM2: 90, tempoObraMeses: 10,
    descricao: 'Casa térrea ampla com 3 quartos (1 suíte), sala, cozinha, área gourmet e garagem dupla',
    compatibilidadeTerreno: { areaMinima: 250, frenteMinima: 12 },
    servicos: [
      { serviceType: 'FUNDACAO', descricao: 'Fundação Radier', unidade: 'M3', quantidade: 9.0, especificacao1: 'Radier', especificacao2: '', especificacao3: '', composicaoBasica: '97096', composicaoProfissionalId: 37 },
      { serviceType: 'ALVENARIA', descricao: 'Alvenaria Estrutural', unidade: 'M2', quantidade: 320, especificacao1: 'Alvenaria Estrutural', especificacao2: 'Módulo 20 - Vertical/Horizontal', especificacao3: 'Concreto', composicaoBasica: '89288', composicaoProfissionalId: 15 },
      { serviceType: 'GRAUTE', descricao: 'Grauteamento Vertical', unidade: 'M3', quantidade: 4.5, especificacao1: 'Vertical', especificacao2: '', especificacao3: '', composicaoBasica: '89993', composicaoProfissionalId: 21 },
      { serviceType: 'CONTRAPISO', descricao: 'Contrapiso Farofa 2cm', unidade: 'M2', quantidade: 90, especificacao1: '', especificacao2: '', especificacao3: '', composicaoBasica: '87622', composicaoProfissionalId: 41 },
      { serviceType: 'REVESTIMENTO_ARGAMASSA_PAREDE', descricao: 'Gesso Liso Paredes', unidade: 'M2', quantidade: 420, especificacao1: 'Gesso Liso', especificacao2: '1,0 cm', especificacao3: '', composicaoBasica: '87421', composicaoProfissionalId: 39 },
      { serviceType: 'REVESTIMENTO_ARGAMASSA_TETO', descricao: 'Gesso Liso Teto', unidade: 'M2', quantidade: 90, especificacao1: 'Gesso Liso', especificacao2: '1,0 cm', especificacao3: '', composicaoBasica: '87414', composicaoProfissionalId: 40 },
      { serviceType: 'REVESTIMENTO_CERAMICO', descricao: 'Porcelanato Piso 60x60', unidade: 'M2', quantidade: 78, especificacao1: 'Piso Interno', especificacao2: 'Porcelanato até 60x60', especificacao3: '', composicaoBasica: '87263', composicaoProfissionalId: 11 },
      { serviceType: 'PINTURA_INTERNA', descricao: 'Pintura Interna', unidade: 'M2', quantidade: 510, especificacao1: 'Tinta Acrílica', especificacao2: '', especificacao3: '', composicaoBasica: '88489', composicaoProfissionalId: 10 },
      { serviceType: 'PINTURA_EXTERNA', descricao: 'Pintura Externa Textura', unidade: 'M2', quantidade: 175, especificacao1: 'Textura Acrílica', especificacao2: '', especificacao3: '', composicaoBasica: '88423', composicaoProfissionalId: 3 },
      { serviceType: 'LIMPEZA_INTERNA', descricao: 'Limpeza Final', unidade: 'M2', quantidade: 90, especificacao1: '', especificacao2: '', especificacao3: '', composicaoBasica: '', composicaoProfissionalId: 0 },
    ],
  },
  {
    id: 'planta-4q-120', nome: 'Casa Premium 4Q', quartos: 4, areaConstruidaM2: 120, tempoObraMeses: 12,
    descricao: 'Casa térrea premium com 4 quartos (2 suítes), sala ampla, cozinha gourmet, lavabo e garagem tripla',
    compatibilidadeTerreno: { areaMinima: 360, frenteMinima: 15 },
    servicos: [
      { serviceType: 'FUNDACAO', descricao: 'Fundação Radier', unidade: 'M3', quantidade: 12.0, especificacao1: 'Radier', especificacao2: '', especificacao3: '', composicaoBasica: '97096', composicaoProfissionalId: 37 },
      { serviceType: 'ALVENARIA', descricao: 'Alvenaria Estrutural', unidade: 'M2', quantidade: 420, especificacao1: 'Alvenaria Estrutural', especificacao2: 'Módulo 20 - Vertical/Horizontal', especificacao3: 'Concreto', composicaoBasica: '89288', composicaoProfissionalId: 15 },
      { serviceType: 'GRAUTE', descricao: 'Grauteamento Vertical e Horizontal', unidade: 'M3', quantidade: 6.0, especificacao1: 'Vertical', especificacao2: '', especificacao3: '', composicaoBasica: '89993', composicaoProfissionalId: 21 },
      { serviceType: 'CONTRAPISO', descricao: 'Contrapiso Farofa 2cm', unidade: 'M2', quantidade: 120, especificacao1: '', especificacao2: '', especificacao3: '', composicaoBasica: '87622', composicaoProfissionalId: 41 },
      { serviceType: 'REVESTIMENTO_ARGAMASSA_PAREDE', descricao: 'Gesso Liso Paredes', unidade: 'M2', quantidade: 560, especificacao1: 'Gesso Liso', especificacao2: '1,0 cm', especificacao3: '', composicaoBasica: '87421', composicaoProfissionalId: 39 },
      { serviceType: 'REVESTIMENTO_ARGAMASSA_TETO', descricao: 'Gesso Liso Teto', unidade: 'M2', quantidade: 120, especificacao1: 'Gesso Liso', especificacao2: '1,0 cm', especificacao3: '', composicaoBasica: '87414', composicaoProfissionalId: 40 },
      { serviceType: 'REVESTIMENTO_CERAMICO', descricao: 'Porcelanato Piso 60x60', unidade: 'M2', quantidade: 105, especificacao1: 'Piso Interno', especificacao2: 'Porcelanato até 60x60', especificacao3: '', composicaoBasica: '87263', composicaoProfissionalId: 11 },
      { serviceType: 'PINTURA_INTERNA', descricao: 'Pintura Interna', unidade: 'M2', quantidade: 680, especificacao1: 'Tinta Acrílica', especificacao2: '', especificacao3: '', composicaoBasica: '88489', composicaoProfissionalId: 10 },
      { serviceType: 'PINTURA_EXTERNA', descricao: 'Pintura Externa Textura', unidade: 'M2', quantidade: 225, especificacao1: 'Textura Acrílica', especificacao2: '', especificacao3: '', composicaoBasica: '88423', composicaoProfissionalId: 3 },
      { serviceType: 'LIMPEZA_INTERNA', descricao: 'Limpeza Final', unidade: 'M2', quantidade: 120, especificacao1: '', especificacao2: '', especificacao3: '', composicaoBasica: '', composicaoProfissionalId: 0 },
    ],
  },
]

export const OPCIONAIS_PADRAO: Omit<OpcionalItem, 'selecionado'>[] = [
  { id: 'pe-direito-alto', nome: 'Pé-direito alto', descricao: 'Deixa o ambiente mais amplo e ventilado. Aumenta o custo da obra.', vantagensCliente: 'Ambientes mais amplos, melhor ventilação e iluminação natural', desvantagensCliente: 'Aumento no custo de alvenaria, revestimento e pintura', impactoServicos: [
    { tipo: 'INCREMENTO', serviceType: 'ALVENARIA', incrementoQuantidade: 0.25 },
    { tipo: 'INCREMENTO', serviceType: 'REVESTIMENTO_ARGAMASSA_PAREDE', incrementoQuantidade: 0.20 },
    { tipo: 'INCREMENTO', serviceType: 'PINTURA_INTERNA', incrementoQuantidade: 0.20 },
  ]},
  { id: 'garagem-coberta', nome: 'Garagem coberta', descricao: 'Protege o veículo. Acrescenta cobertura e estrutura ao projeto.', vantagensCliente: 'Proteção do veículo contra intempéries', desvantagensCliente: 'Custo adicional de estrutura e cobertura', impactoServicos: [
    { tipo: 'INCREMENTO', serviceType: 'FUNDACAO', incrementoQuantidade: 0.15 },
    { tipo: 'INCREMENTO', serviceType: 'CONTRAPISO', incrementoQuantidade: 0.10 },
  ]},
  { id: 'piscina', nome: 'Piscina', descricao: 'Lazer. Impacto significativo no custo e no prazo da obra.', vantagensCliente: 'Área de lazer valoriza o imóvel', desvantagensCliente: 'Custo significativo, manutenção recorrente, impacto no prazo', impactoServicos: [
    { tipo: 'INCREMENTO', serviceType: 'FUNDACAO', incrementoQuantidade: 0.30 },
    { tipo: 'INCREMENTO', serviceType: 'REVESTIMENTO_CERAMICO', incrementoQuantidade: 0.15 },
  ]},
  { id: 'forro-gesso', nome: 'Forro rebaixado (gesso)', descricao: 'Acabamento mais refinado no teto. Impacta custo e prazo de acabamento.', vantagensCliente: 'Acabamento mais sofisticado, esconde tubulações', desvantagensCliente: 'Custo adicional de material e mão de obra', impactoServicos: [
    { tipo: 'INCREMENTO', serviceType: 'REVESTIMENTO_ARGAMASSA_TETO', incrementoQuantidade: 0.40 },
  ]},
  { id: 'aquecedor-solar', nome: 'Aquecedor solar', descricao: 'Reduz conta de energia. Requer instalação hidráulica específica.', vantagensCliente: 'Economia na conta de energia, sustentabilidade', desvantagensCliente: 'Investimento inicial, manutenção periódica', impactoServicos: [] },
  { id: 'placas-solares', nome: 'Placas solares (fotovoltaico)', descricao: 'Geração de energia elétrica. Requer instalação elétrica específica.', vantagensCliente: 'Geração própria de energia, economia a longo prazo', desvantagensCliente: 'Investimento inicial elevado', impactoServicos: [] },
  { id: 'automacao', nome: 'Corretor elétrico (automação)', descricao: 'Automação residencial de circuitos elétricos. Aumenta conforto e custo.', vantagensCliente: 'Conforto, praticidade, valorização do imóvel', desvantagensCliente: 'Custo de equipamentos e instalação diferenciada', impactoServicos: [] },
]

export const CONDICOES_FINANCIAMENTO: CondicoesFinanciamento[] = [
  { modalidade: 'MCMV', taxaJurosAnual: 0.055, prazoMaximoMeses: 420, percentualMaximoFinanciavel: 0.80, valorMaximo: 600000 },
  { modalidade: 'SBPE', taxaJurosAnual: 0.0999, prazoMaximoMeses: 420, percentualMaximoFinanciavel: 0.80, valorMaximo: 1500000 },
]

export const FASES_OBRA_PADRAO: FaseObra[] = [
  { nome: 'Fundação e Estrutura', mesInicio: 1, mesFim: 2, percentualCusto: 0.25, servicosRelacionados: ['FUNDACAO', 'ESTRUTURA_CONCRETO'] },
  { nome: 'Alvenaria e Graute', mesInicio: 2, mesFim: 4, percentualCusto: 0.20, servicosRelacionados: ['ALVENARIA', 'GRAUTE', 'ARMACAO_VERTICAL_HORIZONTAL'] },
  { nome: 'Revestimentos e Contrapiso', mesInicio: 3, mesFim: 6, percentualCusto: 0.25, servicosRelacionados: ['CONTRAPISO', 'REVESTIMENTO_ARGAMASSA_PAREDE', 'REVESTIMENTO_ARGAMASSA_TETO', 'REVESTIMENTO_CERAMICO'] },
  { nome: 'Pintura e Acabamentos', mesInicio: 5, mesFim: 8, percentualCusto: 0.20, servicosRelacionados: ['PINTURA_INTERNA', 'PINTURA_EXTERNA'] },
  { nome: 'Limpeza e Entrega', mesInicio: 7, mesFim: 8, percentualCusto: 0.10, servicosRelacionados: ['LIMPEZA_INTERNA'] },
]
