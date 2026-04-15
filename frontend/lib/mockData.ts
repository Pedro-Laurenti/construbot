import type { GlobalParams, ServiceType, Cliente, Orcamento } from '@/types'

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
