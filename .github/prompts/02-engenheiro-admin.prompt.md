---
agent: 'agent'
description: 'Protótipo do fluxo do ENGENHEIRO — Admin da plataforma de orçamentação'
---

# Tarefa: Implementar Protótipo do Fluxo do ENGENHEIRO (Admin)

## Regras obrigatórias ANTES de qualquer código

Leia e respeite TODOS os arquivos em `.github/instructions/`:
- `rules.instructions.md` — regras globais (sem emojis, sem comentários no código, sem testes, sem docstrings, input padrão DaisyUI fieldset, cleancode, o menor número de arquivos e linhas possível)
- `frontend.instructions.md` — stack Next.js 15 + React 19 + TypeScript + Tailwind CSS v4 + DaisyUI v5, ícones apenas `react-icons/md`, temas `mylight`/`mydark`, classes semânticas DaisyUI
- `backend.instructions.md` — referência, mas neste protótipo **não há chamadas de backend**

## Contexto crítico

Este prompt é executado **após** o prompt `01-cliente-orcamento.prompt.md`. O fluxo do cliente já foi implementado. Agora você deve **adicionar** o fluxo do engenheiro (admin), reutilizando:
- `lib/storage.ts` (já existente)
- `lib/mockData.ts` (já existente — estender com dados do engenheiro)
- `lib/calculos.ts` (já existente — estender se necessário)
- `lib/formatters.ts` (já existente)
- `types/index.ts` (já existente — estender com novos tipos)

O fluxo atual do cliente ficará intacto. O engenheiro acessa uma área separada, identificada pela tela de login com perfil "Engenheiro" (sem autenticação real — apenas uma flag em localStorage distingue o papel).

Este é um **protótipo**: sem banco de dados, sem autenticação real. Tudo mockado e persistido em `localStorage`.

---

## Componentes existentes para reutilizar (NÃO recriar do zero)

Os arquivos abaixo já estão construídos com qualidade. **Adapte-os** em vez de recriar:

| Arquivo | O que aproveitar |
|---------|-----------------|
| `components/LoginPage.tsx` | Layout dois painéis (brand esquerda + form direita), fieldset inputs, estado de loading. Adaptar: adicionar botão "Acesso Engenheiro" que abre um segundo form com campo senha; manter estrutura visual. |
| `components/Sidebar.tsx` | Estrutura de nav items com ícone + label + sublabel, avatar com iniciais, dropdown de ações, clique fora para fechar. Criar `components/engenheiro/SidebarEngenheiro.tsx` copiando o padrão e trocando os `NAV_ITEMS` pelos 12 módulos do engenheiro. |
| `components/HelpModal.tsx` | Modal com overlay, Escape, header + botão X. Reutilizar para confirmações e detalhes de composições. |
| `components/QuoteResultCard.tsx` | Padrões `StatRow` (label + valor linha) e `CostBar` (CSS progress). Usar em CalculadoraMO, CalculadoraMateriais e Consolidação. |
| `lib/api.ts` | `fetchWithAuth` — manter para `/api/health`. |

---

## Novos tipos — adicionar em `types/index.ts`

```ts
// Papel do usuário logado
type UserRole = 'cliente' | 'engenheiro'

// Insumo SINAPI (ISE — Insumos Sem Encargos Sociais) — seção 3.1
// Mês de referência: Janeiro/2026 | Base: 4.861 registros | Cobertura: 27 UFs
interface InsumoSINAPI {
  codigo: string
  descricao: string
  unidade: string
  classificacao: 'MATERIAL' | 'SERVICOS' | 'EQUIPAMENTO'
  origemPreco: 'C' | 'CR'              // C = Coletado diretamente; CR = Coeficiente de Representatividade
  precos: Record<string, number | null> // chave = UF (ex: 'SP'); null = sem coleta válida → usar SP como fallback
}

// Composição analítica SINAPI
interface ComposicaoAnalitica {
  codigoComposicao: string
  grupo: string
  descricao: string
  unidade: string
  itens: ItemComposicao[]
}

interface ItemComposicao {
  tipoItem: 'COMPOSICAO' | 'INSUMO'
  codigo: string
  descricao: string
  unidade: string
  coeficiente: number
  situacao: 'COM PRECO' | 'SEM PRECO' | 'COM CUSTO' | 'SEM CUSTO' | 'EM ESTUDO'
}

// Categoria de serviço profissional
type CategoriaProfissional =
  | 'ACABAMENTO_PAREDE_EXTERNA'
  | 'ACABAMENTO_PAREDE_INTERNA'
  | 'ACABAMENTO_PISO_INTERNO'
  | 'ALVENARIA'
  | 'ESTRUTURA_CONCRETO_ARMADO'
  | 'ESTRUTURA_LAJE_PRE_MOLDADA'
  | 'FUNDACAO'
  | 'REGULARIZACAO_PAREDES_TETOS'
  | 'REGULARIZACAO_PISO'

// Composição profissional (seção 4.3 e 4.4 do documento)
interface ComposicaoProfissional {
  id: number                           // número sequencial
  categoria: CategoriaProfissional
  profissional: string                 // ex: 'Pedreiro', 'Armador'
  descricao: string
  servico: string
  refSINAPI: string                    // código SINAPI de referência
  medicao: string                      // ex: 'M²', 'M³', 'UN'
  unidade: string
  producaoMensalSINAPI: number         // produção base de referência SINAPI
  valorRefMetaDiaria: number           // R$/UN necessário para atingir meta diária de R$220
  produtividadeUNh: number             // calculado: valorMetaDiario / (valorRefMetaDiaria × 8)
  produtividadeUNdia: number           // produtividadeUNh × 8
  metaProducaoMes: number              // produtividadeUNdia × 22
  metaProducaoSemana: number           // metaProducaoMes / 4,33
  metaEstipulada?: number              // meta mensal definida manualmente pelo engenheiro
}

// Precificador — configuração de serviço
interface PrecificadorItem {
  id: string
  servico: string
  quantidade: number
  especificacao1: string
  especificacao2: string
  especificacao3: string
  composicaoBasica: string             // código SINAPI
  composicaoProfissionalId: number     // ref para ComposicaoProfissional.id
  modalidade: 'MEI' | 'CLT'
  unidade: string
  custoTotal?: number
  custoUnitario?: number
}

// Configuração do calculador de MO por serviço
interface CalculoMOConfig {
  servicoId: string
  servico: string
  unidade: string
  quantidade: number
  especificacao1: string
  especificacao2: string
  composicaoBasica: string
  produtividadeHoraMensalista: number  // 80% SINAPI
  produtividadeBasica: number          // 100% SINAPI
  adicionalProdutividade: number       // % de ajuste
  produtividadeRequerida: number       // basica × (1 + adicional)
  proporcaoAjudante: number
  rsUN: number                         // custo referência R$/UN (SINAPI)
  prazoRequerido: number               // dias corridos
}

// Resultado do calculador de MO (3 cenários) — seção 6.3 a 6.8
interface CalculoMOResultado {
  configId: string
  mensalista: CenarioDetalhadoMO
  otima: CenarioDetalhadoMO
  prazo: CenarioDetalhadoMO
  // Bônus de performance (seção 6.5)
  cSINAPI: number                      // custo de referência SINAPI (100%)
  economia: number                     // max(0, C_SINAPI - C_real)
  bonusMEI: number                     // S_base × 1,3 + 0,64 × Economia
  bonusCLT: number                     // custo_fixo + 0,56 × Economia
  bonusConstrutora: number             // 0,14 × Economia
  // Campos seção 6.6 e 6.8
  cltFixoMaisBônus: number             // "CLT (Fixo + Bônus)" — valor de produção total CLT
  meiValorProducao: number             // "MEI (Valor de Produção)" — valor total pago ao MEI
  salarioEsperadoMEI: number           // remuneração mensal esperada MEI
  salarioEsperadoCLT: number           // remuneração mensal esperada CLT
  valorBonusProducaoMEI: number        // "Valor de Bônus de Produção" MEI (seção 6.8)
  valorBonusProducaoCLT: number        // "Valor de Bônus de Produção" CLT (seção 6.8)
  valorEquivalenteTotalUNMEI: number   // "Valor Equivalente Total/UN (c/ Bônus)" MEI (seção 6.8)
  valorEquivalenteTotalUNCLT: number   // "Valor Equivalente Total/UN (c/ Bônus)" CLT (seção 6.8)
  valorMensalEsperadoMEI: number       // "Valor Mensal Esperado" MEI (seção 6.8)
  valorMensalEsperadoCLT: number       // "Valor Mensal Esperado" CLT (seção 6.8)
  custoFinalMEI: number                // "Custo Final — MEI" (seção 6.6)
  custoFinalCLT: number                // "Custo Final — CLT" (seção 6.6)
  precoFinalMEI: number                // custoFinalMEI × 1,20
  precoFinalCLT: number                // custoFinalCLT × 1,20
}

// Tabelas auxiliares de Hidráulica — seção 4.5
interface PontoHidraulico {
  tipo: 'BANHEIRO' | 'COZINHA_LAVANDERIA'
  descricaoPonto: string               // ex: "Ponto de chuveiro", "Ponto de lavatório"
  pecas: PecaHidraulica[]
  tempoExecucaoHoras: number           // hora/un
}

interface PecaHidraulica {
  descricao: string                    // ex: "Joelho 90°", "Te"
  unidade: string                      // UN, M, etc.
  quantidade: number                   // consumo por ponto
}

interface CenarioDetalhadoMO {
  cenario: 'Mensalista' | 'Ótima' | 'Prazo'
  produtividade: number
  hhProfissional: number
  hhAjudante: number
  profissionaisNecessarios: number
  ajudantesNecessarios: number
  prazoEfetivoDias: number
  custoBase: number
  bonusCenario: number               // bônus estimado para este cenário (seção 6.7); 0 para Mensalista
}

// Configuração de materiais por serviço
interface CalculoMatConfig {
  servicoId: string
  servico: string
  unidade: string
  quantidade: number
  composicaoBasica: string
  insumos: InsumoCalculo[]             // até 5 insumos
}

interface InsumoCalculo {
  codigoSINAPI: string
  descricao: string
  unidade: string
  coeficiente: number                  // quantidade por unidade do serviço
  valorUnitario: number               // R$ por unidade do insumo
  total: number                        // coef × valorUnit × quantidade
}

// Orçamento consolidado (visão do engenheiro)
interface OrcamentoConsolidado {
  orcamentoId: string
  clienteId: string
  custoMOTotalMEI: number
  custoMOTotalCLT: number
  custoMatTotal: number
  custosDiretosMEI: number
  custosDiretosCLT: number
  custosDiretosPorM2MEI: number
  custosDiretosPorM2CLT: number
  precoFinalMEI: number               // custosDiretosMEI × 1,20
  precoFinalCLT: number
  precoPorM2MEI: number
  precoPorM2CLT: number
  status: 'pendente' | 'aprovado' | 'rejeitado'
  observacoes: string
}
```

---

## Fórmulas adicionais — engenheiro

### Composições profissionais — produtividade e metas (seção 4.2)
```
produtividadeUNh    = valorMetaDiario / (valorRefMetaDiaria × 8)
produtividadeUNdia  = produtividadeUNh × 8
metaProducaoMes     = produtividadeUNdia × 22
metaProducaoSemana  = metaProducaoMes / 4,33

valorMetaDiario = R$220,00 (constante global)
```

### Calculador de MO — 3 cenários (seção 6.3)
```
produtividade_mensalista = prodBasica × 0,80
produtividade_otima      = prodBasica × 1,25
produtividade_sinapi     = prodBasica × 1,00   (usado na equipe prazo)

Para cada cenário:
  HH_prof    = Q / produtividade_cenario
  HH_ajudante= HH_prof × proporcaoAjudante
  N_prof     = ceil(HH_prof / (prazoRequerido × 8))  // mín 1
  prazoEfetivo = HH_prof / (N_prof × 8)
  custo_base = HH_prof × Vh_prof + HH_ajud × Vh_ajud
    (CLT usa valores COM encargos; MEI usa valores SEM encargos × 1,3)

Vh_qualificado_com_enc = 2664,75 × 2,6013 / (22 × 8) = R$24,24/h
Vh_servente_com_enc    = 2189,97 × 2,6013 / (22 × 8) = R$19,92/h
Vh_qualificado_sem_enc = 2664,75 / (22 × 8) = R$15,14/h
Vh_servente_sem_enc    = 2189,97 / (22 × 8) = R$12,44/h
```

### Bônus de performance (seção 6.5)
```
C_SINAPI = HH_sinapi_prof × Vh_prof + HH_sinapi_ajud × Vh_ajud
Economia = max(0, C_SINAPI - C_real)

Bônus MEI       = S_base × 1,3 + 0,64 × Economia
Bônus CLT       = custo_fixo + 0,56 × Economia
Bônus construtora = 0,14 × Economia

custo_final_MEI = HH_prof × Vh_sem_enc × 1,3 + HH_ajud × Vh_ajud_com_enc + 0,64 × Economia
custo_final_CLT = HH_prof × Vh_com_enc + HH_ajud × Vh_ajud_com_enc + 0,56 × Economia

precoFinalMEI = custoFinalMEI × 1,20
precoFinalCLT = custoFinalCLT × 1,20
```

### Custo de materiais (seção 7.2)
```
C_mat_servico = sum(coeficiente_i × valorUnitario_i, i=1..5) × quantidade
C_mat_total   = sum(C_mat_servico para todos os serviços)
P_mat_final   = C_mat_total × 1,20
```

### Totais consolidados (seção 6.9)
```
custosDiretosMEI    = custoMOTotalMEI + custoMatTotal
custosDiretosCLT    = custoMOTotalCLT + custoMatTotal
precoFinalMEI       = custosDiretosMEI × 1,20
precoFinalCLT       = custosDiretosCLT × 1,20
custosDiretosPorM2MEI = custosDiretosMEI / areaTotal
precoPorM2MEI         = precoFinalMEI  / areaTotal
```

---

## Dados mockados para engenheiro — estender `lib/mockData.ts`

### Insumos SINAPI (ISE) — mock representativo (mínimo 20 insumos)
```ts
export const INSUMOS_SINAPI: InsumoSINAPI[] = [
  { codigo: '00001379', descricao: 'CIMENTO PORTLAND COMPOSTO CP II-E-32, SACO 50KG', unidade: 'SC',
    classificacao: 'MATERIAL', origemPreco: 'C', precos: { SP: 32.50, RJ: 34.00, MG: 31.00, RS: 30.50, PR: 31.50, SC: 30.00, BA: 33.00, PE: 34.50 } },
  { codigo: '00004727', descricao: 'AREIA MEDIA LAVADA', unidade: 'M3',
    classificacao: 'MATERIAL', origemPreco: 'C', precos: { SP: 120.00, RJ: 135.00, MG: 110.00, RS: 115.00, PR: 112.00, SC: 118.00, BA: 125.00, PE: 130.00 } },
  { codigo: '00000364', descricao: 'BRITA 1', unidade: 'M3',
    classificacao: 'MATERIAL', origemPreco: 'C', precos: { SP: 150.00, RJ: 165.00, MG: 140.00, RS: 145.00, PR: 142.00, SC: 148.00, BA: 155.00, PE: 160.00 } },
  { codigo: '00034034', descricao: 'BLOCO CERAMICO (TIJOLO FURADO) 9X19X19 CM', unidade: 'UN',
    classificacao: 'MATERIAL', origemPreco: 'C', precos: { SP: 1.20, RJ: 1.35, MG: 1.10, RS: 1.15, PR: 1.12, SC: 1.18, BA: 1.25, PE: 1.30 } },
  { codigo: '00008020', descricao: 'BLOCO DE CONCRETO ESTRUTURAL 14X19X39 CM', unidade: 'UN',
    classificacao: 'MATERIAL', origemPreco: 'C', precos: { SP: 4.50, RJ: 4.80, MG: 4.30, RS: 4.40, PR: 4.35, SC: 4.50, BA: 4.60, PE: 4.75 } },
  { codigo: '00006162', descricao: 'ARGAMASSA COLANTE AC-II, SACO 20KG', unidade: 'SC',
    classificacao: 'MATERIAL', origemPreco: 'C', precos: { SP: 25.00, RJ: 27.00, MG: 24.00, RS: 24.50, PR: 24.00, SC: 24.50, BA: 26.00, PE: 27.50 } },
  { codigo: '00034138', descricao: 'PISO CERAMICO PEI-4 45X45CM', unidade: 'M2',
    classificacao: 'MATERIAL', origemPreco: 'C', precos: { SP: 45.00, RJ: 48.00, MG: 43.00, RS: 44.00, PR: 43.50, SC: 44.00, BA: 47.00, PE: 49.00 } },
  { codigo: '00034198', descricao: 'PORCELANATO POLIDO 60X60CM', unidade: 'M2',
    classificacao: 'MATERIAL', origemPreco: 'C', precos: { SP: 85.00, RJ: 90.00, MG: 82.00, RS: 83.00, PR: 83.00, SC: 84.00, BA: 88.00, PE: 92.00 } },
  { codigo: '00004625', descricao: 'TINTA ACRILICA PREMIUM BRANCA, LATA 18L', unidade: 'LT',
    classificacao: 'MATERIAL', origemPreco: 'C', precos: { SP: 280.00, RJ: 295.00, MG: 270.00, RS: 275.00, PR: 272.00, SC: 278.00, BA: 285.00, PE: 290.00 } },
  { codigo: '00007402', descricao: 'GESSO EM PO PARA REVESTIMENTO, SACO 20KG', unidade: 'SC',
    classificacao: 'MATERIAL', origemPreco: 'C', precos: { SP: 20.00, RJ: 22.00, MG: 19.00, RS: 19.50, PR: 19.50, SC: 20.00, BA: 21.00, PE: 22.50 } },
  { codigo: '00006028', descricao: 'ACO CA-50, BARRAS E FIOS, D=6,3MM (1/4")', unidade: 'KG',
    classificacao: 'MATERIAL', origemPreco: 'C', precos: { SP: 8.50, RJ: 9.00, MG: 8.30, RS: 8.40, PR: 8.35, SC: 8.50, BA: 8.80, PE: 9.20 } },
  { codigo: '00006033', descricao: 'ACO CA-50, BARRAS E FIOS, D=12,5MM (1/2")', unidade: 'KG',
    classificacao: 'MATERIAL', origemPreco: 'C', precos: { SP: 8.30, RJ: 8.80, MG: 8.10, RS: 8.20, PR: 8.15, SC: 8.30, BA: 8.60, PE: 9.00 } },
  { codigo: '00000090', descricao: 'TABUA *2,5 X 30* CM EM MADEIRA NAO APARELHADA', unidade: 'M',
    classificacao: 'MATERIAL', origemPreco: 'C', precos: { SP: 22.00, RJ: 24.00, MG: 21.00, RS: 21.50, PR: 21.50, SC: 22.00, BA: 23.00, PE: 24.00 } },
  { codigo: '00037636', descricao: 'PREGO DE ACO POLIDO COM CABECA 17X27 (2 1/4 X 10)', unidade: 'KG',
    classificacao: 'MATERIAL', origemPreco: 'CR', precos: { SP: 18.00, RJ: 19.50, MG: 17.50, RS: 17.80, PR: 17.80, SC: 18.00, BA: null, PE: null } },
  { codigo: '00000246', descricao: 'CAL HIDRATADA CH-III, SACO 20KG', unidade: 'SC',
    classificacao: 'MATERIAL', origemPreco: 'C', precos: { SP: 14.00, RJ: 15.50, MG: 13.50, RS: 13.80, PR: 13.80, SC: 14.00, BA: 14.80, PE: 15.50 } },
  { codigo: '00000875', descricao: 'ARGAMASSA DE REGULARIZACAO TRACO 1:3 (EM VOLUME)', unidade: 'M3',
    classificacao: 'MATERIAL', origemPreco: 'C', precos: { SP: 340.00, RJ: 360.00, MG: 325.00, RS: 330.00, PR: 328.00, SC: 335.00, BA: 350.00, PE: 365.00 } },
  { codigo: '00007613', descricao: 'SELADOR ACRILICO, LATA 18L', unidade: 'LT',
    classificacao: 'MATERIAL', origemPreco: 'C', precos: { SP: 180.00, RJ: 190.00, MG: 175.00, RS: 177.00, PR: 176.00, SC: 178.00, BA: 183.00, PE: 188.00 } },
  { codigo: '00034395', descricao: 'MASSA CORRIDA PVA, LATA 25KG', unidade: 'LT',
    classificacao: 'MATERIAL', origemPreco: 'CR', precos: { SP: 95.00, RJ: 102.00, MG: 92.00, RS: 93.00, PR: null, SC: 93.50, BA: null, PE: 102.00 } },
  { codigo: '00000273', descricao: 'CONCRETO FCK=25 MPA, PREPARO MANUAL', unidade: 'M3',
    classificacao: 'MATERIAL', origemPreco: 'C', precos: { SP: 480.00, RJ: 510.00, MG: 460.00, RS: 470.00, PR: 465.00, SC: 475.00, BA: 495.00, PE: 515.00 } },
  { codigo: '00001599', descricao: 'GROUT DE ALTA RESISTENCIA, SACO 25KG', unidade: 'SC',
    classificacao: 'MATERIAL', origemPreco: 'C', precos: { SP: 65.00, RJ: 70.00, MG: 63.00, RS: 64.00, PR: 63.50, SC: 64.50, BA: 67.00, PE: 70.00 } },
]
```

### Tabelas auxiliares de Hidráulica — mock `lib/mockData.ts` (seção 4.5)
```ts
export const PONTOS_HIDRAULICOS: PontoHidraulico[] = [
  // Ponto de banheiro — chuveiro
  { tipo: 'BANHEIRO', descricaoPonto: 'Ponto de chuveiro', tempoExecucaoHoras: 4.0,
    pecas: [
      { descricao: 'Tubo PVC soldável 25mm', unidade: 'M', quantidade: 3.5 },
      { descricao: 'Joelho 90° PVC 25mm', unidade: 'UN', quantidade: 4 },
      { descricao: 'Te PVC 25mm', unidade: 'UN', quantidade: 1 },
      { descricao: 'Adaptador curto PVC 25mm', unidade: 'UN', quantidade: 2 },
    ]
  },
  { tipo: 'BANHEIRO', descricaoPonto: 'Ponto de lavatório', tempoExecucaoHoras: 3.5,
    pecas: [
      { descricao: 'Tubo PVC soldável 25mm', unidade: 'M', quantidade: 2.5 },
      { descricao: 'Joelho 90° PVC 25mm', unidade: 'UN', quantidade: 3 },
      { descricao: 'Registro de gaveta 3/4"', unidade: 'UN', quantidade: 1 },
      { descricao: 'Adaptador curto PVC 25mm', unidade: 'UN', quantidade: 2 },
    ]
  },
  { tipo: 'BANHEIRO', descricaoPonto: 'Ponto de vaso sanitário', tempoExecucaoHoras: 2.5,
    pecas: [
      { descricao: 'Tubo PVC soldável 25mm', unidade: 'M', quantidade: 1.5 },
      { descricao: 'Joelho 90° PVC 25mm', unidade: 'UN', quantidade: 2 },
      { descricao: 'Adaptador curto PVC 25mm', unidade: 'UN', quantidade: 1 },
    ]
  },
  // Ponto de cozinha/lavanderia
  { tipo: 'COZINHA_LAVANDERIA', descricaoPonto: 'Ponto de pia de cozinha', tempoExecucaoHoras: 4.0,
    pecas: [
      { descricao: 'Tubo PVC soldável 25mm', unidade: 'M', quantidade: 3.0 },
      { descricao: 'Joelho 90° PVC 25mm', unidade: 'UN', quantidade: 3 },
      { descricao: 'Te PVC 25mm', unidade: 'UN', quantidade: 1 },
      { descricao: 'Registro de gaveta 3/4"', unidade: 'UN', quantidade: 2 },
      { descricao: 'Adaptador curto PVC 25mm', unidade: 'UN', quantidade: 2 },
    ]
  },
  { tipo: 'COZINHA_LAVANDERIA', descricaoPonto: 'Ponto de tanque/máquina', tempoExecucaoHoras: 3.0,
    pecas: [
      { descricao: 'Tubo PVC soldável 25mm', unidade: 'M', quantidade: 2.5 },
      { descricao: 'Joelho 90° PVC 25mm', unidade: 'UN', quantidade: 3 },
      { descricao: 'Registro de gaveta 3/4"', unidade: 'UN', quantidade: 1 },
      { descricao: 'Adaptador curto PVC 25mm', unidade: 'UN', quantidade: 2 },
    ]
  },
]
```

### Composições analíticas — mock representativo (mínimo 5 composições com itens)
```ts
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
    ]
  },
  {
    codigoComposicao: '87251', grupo: 'REGULARIZACAO', unidade: 'M2',
    descricao: 'CONTRAPISO EM ARGAMASSA TRACO 1:3, E=5CM',
    itens: [
      { tipoItem: 'INSUMO', codigo: '00000875', descricao: 'ARGAMASSA 1:3', unidade: 'M3', coeficiente: 0.055, situacao: 'COM PRECO' },
      { tipoItem: 'COMPOSICAO', codigo: '88316', descricao: 'SERVENTE COM ENCARGOS SOCIAIS', unidade: 'H', coeficiente: 0.35, situacao: 'COM CUSTO' },
      { tipoItem: 'COMPOSICAO', codigo: '88239', descricao: 'PEDREIRO COM ENCARGOS SOCIAIS', unidade: 'H', coeficiente: 0.48, situacao: 'COM CUSTO' },
    ]
  },
  {
    codigoComposicao: '87264', grupo: 'REVESTIMENTO', unidade: 'M2',
    descricao: 'REVESTIMENTO COM ARGAMASSA GESSO LISO, 1CM',
    itens: [
      { tipoItem: 'INSUMO', codigo: '07402', descricao: 'GESSO EM PO', unidade: 'SC', coeficiente: 2.00, situacao: 'COM PRECO' },
      { tipoItem: 'COMPOSICAO', codigo: '88309', descricao: 'GESSEIRO COM ENCARGOS SOCIAIS', unidade: 'H', coeficiente: 0.50, situacao: 'COM CUSTO' },
    ]
  },
  {
    codigoComposicao: '88484', grupo: 'PINTURA', unidade: 'M2',
    descricao: 'PINTURA COM TINTA ACRILICA EM PAREDE INTERNA, 2 DEMAOS',
    itens: [
      { tipoItem: 'INSUMO', codigo: '04625', descricao: 'TINTA ACRILICA 18L', unidade: 'LT', coeficiente: 0.16, situacao: 'COM PRECO' },
      { tipoItem: 'INSUMO', codigo: '07613', descricao: 'SELADOR ACRILICO 18L', unidade: 'LT', coeficiente: 0.08, situacao: 'COM PRECO' },
      { tipoItem: 'COMPOSICAO', codigo: '88316', descricao: 'SERVENTE COM ENCARGOS SOCIAIS', unidade: 'H', coeficiente: 0.10, situacao: 'COM CUSTO' },
      { tipoItem: 'COMPOSICAO', codigo: '88268', descricao: 'PINTOR COM ENCARGOS SOCIAIS', unidade: 'H', coeficiente: 0.32, situacao: 'COM CUSTO' },
    ]
  },
  {
    codigoComposicao: '87557', grupo: 'FUNDACAO', unidade: 'M3',
    descricao: 'SAPATA CORRIDA EM CONCRETO ARMADO FCK=25MPA',
    itens: [
      { tipoItem: 'INSUMO', codigo: '00000273', descricao: 'CONCRETO FCK=25MPA', unidade: 'M3', coeficiente: 1.00, situacao: 'COM PRECO' },
      { tipoItem: 'INSUMO', codigo: '06028', descricao: 'ACO CA-50 D=6,3MM', unidade: 'KG', coeficiente: 68.0, situacao: 'COM PRECO' },
      { tipoItem: 'COMPOSICAO', codigo: '88239', descricao: 'PEDREIRO COM ENCARGOS SOCIAIS', unidade: 'H', coeficiente: 5.20, situacao: 'COM CUSTO' },
      { tipoItem: 'COMPOSICAO', codigo: '88316', descricao: 'SERVENTE COM ENCARGOS SOCIAIS', unidade: 'H', coeficiente: 6.50, situacao: 'COM CUSTO' },
    ]
  },
]
```

### Composições profissionais — mock representativo (seção 4.3 e 4.4)
```ts
// Usar produtividadeUNh = 220 / (valorRefMetaDiaria × 8)
// Exemplo: Pedreiro alvenaria, valorRef = R$13,00/m², prod = 220/(13×8) = 2,12 UN/h
// As composições abaixo cobrem as 9 categorias da seção 4.4
export const COMPOSICOES_PROFISSIONAIS: ComposicaoProfissional[] = [
  // Fundação
  { id: 1, categoria: 'FUNDACAO', profissional: 'Pedreiro', descricao: 'Execução de sapata corrida em concreto armado',
    servico: 'Fundação Sapata Corrida', refSINAPI: '87557', medicao: 'M³', unidade: 'M³',
    producaoMensalSINAPI: 18, valorRefMetaDiaria: 68.75, produtividadeUNh: 0.40, produtividadeUNdia: 3.20, metaProducaoMes: 70.4, metaProducaoSemana: 16.3 },
  { id: 2, categoria: 'FUNDACAO', profissional: 'Armador', descricao: 'Armação de aço para fundações',
    servico: 'Armação para Fundação', refSINAPI: '87316', medicao: 'KG', unidade: 'KG',
    producaoMensalSINAPI: 3200, valorRefMetaDiaria: 3.13, produtividadeUNh: 8.79, produtividadeUNdia: 70.3, metaProducaoMes: 1547, metaProducaoSemana: 357 },
  { id: 3, categoria: 'FUNDACAO', profissional: 'Carpinteiro', descricao: 'Execução de formas para fundações',
    servico: 'Forma para Fundação', refSINAPI: '87411', medicao: 'M²', unidade: 'M²',
    producaoMensalSINAPI: 110, valorRefMetaDiaria: 53.97, produtividadeUNh: 0.51, produtividadeUNdia: 4.07, metaProducaoMes: 89.5, metaProducaoSemana: 20.7 },
  // Estrutura concreto armado
  { id: 4, categoria: 'ESTRUTURA_CONCRETO_ARMADO', profissional: 'Armador', descricao: 'Armação de aço para pilares e vigas',
    servico: 'Armação Estrutural', refSINAPI: '87316', medicao: 'KG', unidade: 'KG',
    producaoMensalSINAPI: 2800, valorRefMetaDiaria: 3.13, produtividadeUNh: 8.79, produtividadeUNdia: 70.3, metaProducaoMes: 1547, metaProducaoSemana: 357 },
  { id: 5, categoria: 'ESTRUTURA_CONCRETO_ARMADO', profissional: 'Carpinteiro', descricao: 'Formas para pilares e vigas',
    servico: 'Forma Estrutural', refSINAPI: '87394', medicao: 'M²', unidade: 'M²',
    producaoMensalSINAPI: 95, valorRefMetaDiaria: 53.97, produtividadeUNh: 0.51, produtividadeUNdia: 4.07, metaProducaoMes: 89.5, metaProducaoSemana: 20.7 },
  // Estrutura laje pré-moldada
  { id: 6, categoria: 'ESTRUTURA_LAJE_PRE_MOLDADA', profissional: 'Pedreiro', descricao: 'Assentamento de laje pré-moldada',
    servico: 'Laje Pré-Moldada', refSINAPI: '89736', medicao: 'M²', unidade: 'M²',
    producaoMensalSINAPI: 200, valorRefMetaDiaria: 27.50, produtividadeUNh: 1.00, produtividadeUNdia: 8.00, metaProducaoMes: 176, metaProducaoSemana: 40.6 },
  { id: 7, categoria: 'ESTRUTURA_LAJE_PRE_MOLDADA', profissional: 'Carpinteiro', descricao: 'Escoras e cimbramento para laje',
    servico: 'Escoramento Laje', refSINAPI: '87411', medicao: 'M²', unidade: 'M²',
    producaoMensalSINAPI: 180, valorRefMetaDiaria: 37.50, produtividadeUNh: 0.73, produtividadeUNdia: 5.87, metaProducaoMes: 129, metaProducaoSemana: 29.8 },
  // Alvenaria
  { id: 8, categoria: 'ALVENARIA', profissional: 'Pedreiro', descricao: 'Assentamento de blocos cerâmicos e de concreto',
    servico: 'Alvenaria', refSINAPI: '87888', medicao: 'M²', unidade: 'M²',
    producaoMensalSINAPI: 190, valorRefMetaDiaria: 13.00, produtividadeUNh: 2.12, produtividadeUNdia: 16.9, metaProducaoMes: 372, metaProducaoSemana: 86.0 },
  { id: 9, categoria: 'ALVENARIA', profissional: 'Armador', descricao: 'Armação de aço para alvenaria estrutural',
    servico: 'Armação Alvenaria Estrutural', refSINAPI: '87266', medicao: 'KG', unidade: 'KG',
    producaoMensalSINAPI: 2200, valorRefMetaDiaria: 3.13, produtividadeUNh: 8.79, produtividadeUNdia: 70.3, metaProducaoMes: 1547, metaProducaoSemana: 357 },
  // Regularização pisos
  { id: 10, categoria: 'REGULARIZACAO_PISO', profissional: 'Pedreiro', descricao: 'Execução de contrapiso em argamassa',
    servico: 'Contrapiso', refSINAPI: '87251', medicao: 'M²', unidade: 'M²',
    producaoMensalSINAPI: 260, valorRefMetaDiaria: 10.00, produtividadeUNh: 2.75, produtividadeUNdia: 22.0, metaProducaoMes: 484, metaProducaoSemana: 111.8 },
  // Regularização paredes e tetos
  { id: 11, categoria: 'REGULARIZACAO_PAREDES_TETOS', profissional: 'Gesseiro', descricao: 'Gesso liso em paredes e tetos internos',
    servico: 'Gesso Liso', refSINAPI: '87264', medicao: 'M²', unidade: 'M²',
    producaoMensalSINAPI: 280, valorRefMetaDiaria: 8.46, produtividadeUNh: 3.25, produtividadeUNdia: 26.0, metaProducaoMes: 572, metaProducaoSemana: 132.1 },
  // Acabamento piso interno
  { id: 12, categoria: 'ACABAMENTO_PISO_INTERNO', profissional: 'Azulejista', descricao: 'Assentamento de piso cerâmico e porcelanato',
    servico: 'Revestimento Cerâmico Piso', refSINAPI: '87879', medicao: 'M²', unidade: 'M²',
    producaoMensalSINAPI: 160, valorRefMetaDiaria: 16.25, produtividadeUNh: 1.69, produtividadeUNdia: 13.5, metaProducaoMes: 297, metaProducaoSemana: 68.6 },
  // Acabamento parede interna
  { id: 13, categoria: 'ACABAMENTO_PAREDE_INTERNA', profissional: 'Azulejista', descricao: 'Assentamento de revestimento cerâmico em paredes internas',
    servico: 'Revestimento Cerâmico Parede', refSINAPI: '87269', medicao: 'M²', unidade: 'M²',
    producaoMensalSINAPI: 130, valorRefMetaDiaria: 19.00, produtividadeUNh: 1.45, produtividadeUNdia: 11.6, metaProducaoMes: 255, metaProducaoSemana: 58.9 },
  { id: 14, categoria: 'ACABAMENTO_PAREDE_INTERNA', profissional: 'Pintor', descricao: 'Pintura acrílica interna (selador + massa + 2 demãos)',
    servico: 'Pintura Interna', refSINAPI: '88484', medicao: 'M²', unidade: 'M²',
    producaoMensalSINAPI: 440, valorRefMetaDiaria: 4.59, produtividadeUNh: 5.99, produtividadeUNdia: 47.9, metaProducaoMes: 1054, metaProducaoSemana: 243.4 },
  // Acabamento parede externa
  { id: 15, categoria: 'ACABAMENTO_PAREDE_EXTERNA', profissional: 'Pintor', descricao: 'Pintura acrílica externa (selador + textura)',
    servico: 'Pintura Externa', refSINAPI: '88485', medicao: 'M²', unidade: 'M²',
    producaoMensalSINAPI: 380, valorRefMetaDiaria: 5.26, produtividadeUNh: 5.23, produtividadeUNdia: 41.9, metaProducaoMes: 921, metaProducaoSemana: 212.7 },
]
```

---

## Estrutura de arquivos — adicionar/modificar

```
frontend/
  lib/
    mockData.ts         ← estender com INSUMOS_SINAPI (c/ origemPreco), COMPOSICOES_ANALITICAS,
                           COMPOSICOES_PROFISSIONAIS, PONTOS_HIDRAULICOS, ENGINEER_PASSWORD
    calculos.ts         ← estender com calcularMOEngenheiro, calcularMatEngenheiro, consolidar,
                           calcularConsultaComposicao (seção 3.3)
  types/
    index.ts            ← estender com os novos tipos acima
  components/
    engenheiro/
      SidebarEngenheiro.tsx          ← sidebar do engenheiro (cópia adaptada de Sidebar.tsx com 12 itens)
      ParametrosGlobais.tsx          ← visualização e edição dos parâmetros globais (grupos A/B/C/D/D'/E)
      TabelaSINAPI.tsx               ← tabela de insumos ISE com origemPreco, fallback SP, filtro por UF
      ConsultaComposicao.tsx         ← consulta interativa seção 3.3 (inputs: encargos/UF/código → tabela com %AS)
      ComposicoesAnaliticas.tsx      ← visualização das composições com hierarquia 3 níveis
      ComposicoesProfissionais.tsx   ← tabela editável + aba Hidráulica (PONTOS_HIDRAULICOS)
      Precificador.tsx               ← configuração dos 12 serviços com código SINAPI e composição prof.
      CalculadoraMO.tsx              ← calculadora MO (3 cenários + bônus + campos seção 6.6/6.8)
      CalculadoraMateriais.tsx       ← calculadora de materiais por serviço (até 5 insumos + fallback SP)
      ConsolidacaoOrcamento.tsx      ← totais MO + mat + BDI + gráfico CSS + export JSON
      GestaoOrcamentos.tsx           ← lista de todos os orçamentos dos clientes
  app/
    page.tsx            ← estender orquestrador: detectar papel (cliente / engenheiro) e renderizar fluxo correto
```

---

## Fluxo de telas (UX) — ENGENHEIRO

### Acesso ao modo engenheiro
- Na tela de login do app, adicionar botão "Acesso Engenheiro"
- Pede apenas uma senha local simples (ex: `construbot2026`) — salvar flag `role: 'engenheiro'` no localStorage via `lib/storage.ts`
- Não há autenticação real — é apenas para diferenciar a view no protótipo

### Layout do engenheiro
- Sidebar esquerda com itens de menu:
  1. Painel Geral (dashboard)
  2. Parâmetros Globais
  3. SINAPI — Insumos (ISE)
  4. Consulta SINAPI (Composição com Custo)
  5. Composições Analíticas
  6. Composições Profissionais (incl. Hidráulica)
  7. Precificador
  8. Calculadora — Mão de Obra
  9. Calculadora — Materiais
  10. Consolidação
  11. Orçamentos (todos os clientes)
  12. Sair (voltar a tela de login)
- Área principal renderiza o módulo ativo

### 1. Painel Geral (dashboard)
- Cards de resumo:
  - Total de orçamentos (calculados vs. rascunhos)
  - Custo médio por m² (MEI e CLT) de todos os orçamentos calculados
  - Último orçamento criado
  - BDI atual e percentual de encargos
- Tabela com os 5 orçamentos mais recentes

### 2. Parâmetros Globais
- Exibir e permitir edição (salva em localStorage, não em banco):
  - BDI: campo numérico (% — padrão 20%) + exibir componentes informativos: Aluguel, Impostos, Pró-labore, BDI sobre projetado; Faturamento mensal de referência: R$40.000 + R$4.800
  - Encargos Sociais: exibir cada grupo (A, B, C, D, D', E) com seus subitens e percentuais
    - Grupo A (**8 itens editáveis**: INSS 10%, FGTS 8%, Sal.Educação 2,5%, SESI 1,5%, SENAI/SEBRAE 16%, INCRA 2%, Seguro contra Riscos e Acidentes 3%, SECONCI 1% → Total 27,80%)
    - Grupo B (7 itens editáveis: DSR 18,13%, Feriados 8%, Férias+1/3 Constitucional 15,10%, Aux.Enfermidade e Acidentes 2,58%, 13° Salário 11,33%, Lic.Paternidade 0,13%, Faltas Justificadas 0,76% → Total 52,93%)
    - Grupo C = A × B = 14,71% (calculado automaticamente, somente leitura)
    - Grupo D (4 itens editáveis: Aviso Prévio 11,56%, Depósito por Despedida Injusta 3,08%, Indenização Adicional 0,78%, LC 110/01 0,77% → Total 16,19%)
    - Grupo D' = (A - FGTS - SECONCI) × AvisoPrévio = 2,17% (calculado, somente leitura: fórmula explícita exibida)
    - Grupo E (7 itens editáveis: Dias de chuva 1,5%, Almoço 21,34%, Jantar 3,87%, Café da manhã 8,47%, EPI 6,14%, Vale-transporte 4,57%, Seguro de vida 0,44% → Total 46,33%)
    - Total geral = A + B + C + D + D' + E = 160,13% (calculado automaticamente)
    - Fator de encargos = 1 + Total/100 = 2,6013 (exibido)
  - Salários base (Qualificado R$2.664,75, Meio-Oficial R$2.427,36, Servente R$2.189,97) com display calculado de:
    - Salário c/encargos (× 2,6013): Qualificado R$4.267,06 | Meio-Oficial R$3.886,93 | Servente R$3.506,80
    - Diária sem encargos: Qualificado R$121,125
    - Diária com encargos: Qualificado R$193,96
    - Valor/hora sem encargos: Qualificado R$15,14/h | Servente R$12,44/h
    - Valor/hora com encargos: Qualificado R$24,24/h | Servente R$19,92/h
  - Valor Meta Diário (padrão R$220,00)
  - Prêmio Máximo Mensal (padrão R$2.175,25)
- Botão "Restaurar Padrões" (recarrega valores da `lib/mockData.ts`)

### 3. SINAPI — Insumos (ISE) — seção 3.1
- Tabela com todos os insumos mockados
- Filtros: pesquisa por código/descrição, filtro por classificação (Material/Serviços/Equipamento)
- Colunas: Código, Descrição, Unidade, Classificação, Origem (`C` = Coletado / `CR` = Coef.Representatividade), preço para a UF selecionada
- Select de UF para alternar o preço exibido (padrão SP)
- Quando preço da UF for `null` (sem coleta): exibir preço de SP com badge "SP" indicando o fallback
- Exibir nota: "Referência SINAPI Janeiro/2026 — 4.861 insumos (exibindo amostra representativa)"
- Link "Ver composição analítica" para cada insumo que tiver composição mockada associada

### 4. Consulta de Composição com Custo — seção 3.3
Este é um módulo de consulta interativa separado do módulo de Composições Analíticas.

**Campos de entrada:**
- Encargos Sociais: radio/select `SEM ENCARGOS SOCIAIS` | `COM ENCARGOS SOCIAIS`
- UF: select com as 27 UFs (padrão SP)
- Código da Composição: input texto (ex: `88423`, `87888`)

**Ao consultar, exibir tabela com os itens da composição:**
| Campo | Descrição |
|-------|-----------|
| Tipo Item | COMPOSIÇÃO ou INSUMO |
| Código | Código SINAPI do item |
| Descrição | Nome do item |
| Unidade | Unidade de medida |
| Coeficiente | Quantidade por unidade do serviço principal |
| Custo Unitário | Preço unitário na UF selecionada (com ou sem encargos conforme seleção) |
| Custo Total | Coeficiente × Custo Unitário |
| %AS | Percentual de preços atribuídos de SP por indisponibilidade local (0% se preço coletado na UF, 100% se veio de SP como fallback) |
| Situação | COM PRECO / SEM PRECO / COM CUSTO / SEM CUSTO / EM ESTUDO |

Exibir na linha do serviço principal (Nível 0): subtotal de custos calculado.

### 5. Composições Analíticas — seção 3.2
- Lista de composições com código, grupo, descrição, unidade
- Ao expandir: tabela de itens (TipoItem, Código, Descrição, Unidade, Coeficiente, Situação)
- Exibir hierarquia visual com 3 níveis:
  - Nível 0: linha sem Tipo de Item = serviço principal (negrito, sem indent)
  - Nível 1: COMPOSICAO = subserviço referenciado (indent leve, cor distinta)
  - Nível 2: INSUMO = material direto (indent maior, cor terceira)
- Filtro por grupo e pesquisa por código/descrição
- Exibir nota: "Referência SINAPI Janeiro/2026 — 64.943 registros (exibindo amostra representativa)"

### 6. Composições Profissionais — seções 4.2, 4.3, 4.4
- Tabela editável com todas as 15 composições mockadas
- Colunas: ID, Categoria, Profissional, Serviço, Ref.SINAPI, Unidade, Prod.Mensal SINAPI, Valor Ref Meta (R$/UN), Prod.UN/h, Prod.UN/dia, Meta Mês, Meta Semana, Meta Estipulada
- Fórmulas calculadas automaticamente quando usuário altera "Valor Ref Meta" ou "Prod.Mensal SINAPI":
  ```
  produtividadeUNh   = valorMetaDiario / (valorRefMetaDiaria × 8)
  produtividadeUNdia = produtividadeUNh × 8
  metaProducaoMes    = produtividadeUNdia × 22
  metaProducaoSemana = metaProducaoMes / 4,33
  ```
- Campo "Meta Estipulada" é editável manualmente (independente do calculado)
- Cabeçalho agrupado: Identificação | Referência SINAPI | Produtividade Calculada | Metas | Meta Manual
- Botão "Adicionar composição" com modal usando inputs `fieldset`
- **Tabelas auxiliares de Hidráulica (seção 4.5):** aba ou seção separada dentro do mesmo módulo exibindo:
  - Consumo de peças por ponto de aranha de banheiro (chuveiro, lavatório, vaso, tanque) com lista de peças (joelho, tê, tubo, etc.) e quantidades por ponto
  - Consumo de peças para cozinha/lavanderia
  - Tempo de execução por unidade (hora/un) para cada tipo de ponto
  - Usar dados mockados de `PONTOS_HIDRAULICOS` em `lib/mockData.ts`

### 7. Precificador — seção 5
- Lista de serviços configurados (inicialmente vazia, engenheiro preenche)
- Para cada serviço (**12 tipos, incluindo Armação Vertical/Horizontal**):
  - Campos: Serviço (select dos 12 tipos), Quantidade, Espec1/2/3 (dinâmicas), Código SINAPI, Composição Profissional (select das 15), Modalidade, Unidade
  - Custo Total e Custo/UN calculados automaticamente ao salvar
- Botão "Adicionar serviço"
- Botão "Calcular todos os serviços" → dispara cálculo de MO e Materiais simultaneamente

### 8. Calculadora — Mão de Obra — seções 6.2 a 6.8
- Para cada serviço do Precificador (ou manual):
  - Inputs: Quantidade, Produtividade Básica SINAPI (UN/h), Adicional de Produtividade (%), Proporção Ajudante/Profissional, R$/UN SINAPI, Prazo Requerido (dias corridos)
  - Produtividade Requerida = Prod.Básica × (1 + Adicional) — calculada automaticamente
  - Resultado: tabela dos 3 cenários (**Mensalista 80% / Ótima 125% / Prazo 100% SINAPI**) com colunas:
    - Produtividade (UN/h e UN/dia)
    - HH Profissional / HH Ajudante
    - N° Profissionais / Ajudantes (seção 6.7: Profissional e Ajudante para Equipe Ótima e Equipe Prazo)
    - Prazo Efetivo (dias)
    - Custo Base (R$)
    - Bônus do Cenário (R$) — seção 6.7: Bônus Equipe Ótima e Bônus Equipe Prazo calculados individualmente; Mensalista exibe R$0,00 (produtividade abaixo do SINAPI → sem economia)
  - Seção de bônus de performance (seção 6.5) — distribuição da economia:
    - C_SINAPI calculado e exibido
    - Economia = max(0, C_SINAPI - C_real)
    - 30% → repasse ao cliente | 56% → profissional | 14% → construtora
    - Todos os valores em R$
  - **Campos de contratação — seções 6.6 e 6.8** (colunas MEI | CLT):
    - CLT (Fixo + Bônus) / MEI (Valor de Produção)
    - Salário Esperado MEI / CLT
    - Valor de Bônus de Produção MEI / CLT
    - Valor Equivalente Total/UN (c/ Bônus) MEI / CLT
    - Valor Mensal Esperado MEI / CLT
    - Custo Final MEI / CLT
  - Preço Final MEI/CLT com BDI 20%
- Linha de totais gerais (seção 6.9):
  - Custos Diretos Totais MEI / CLT
  - Custos Diretos/m² MEI / CLT
  - Preço Final MEI / CLT (c/ BDI 20%)
  - Preço/m² MEI / CLT

### 9. Calculadora — Materiais — seção 7
- Para cada serviço:
  - Campos: Quantidade, Código SINAPI (auto-preenche insumos da composição analítica se existir)
  - Tabela de **até 5 insumos** por serviço: select de insumo (busca no SINAPI ISE), coeficiente, valor unitário (pré-preenchido pelo SINAPI ISE conforme UF selecionada), total calculado
  - Quando insumo usa fallback SP: exibir badge "SP" (indicador %AS = 100%)
  - Total do serviço, subtotal geral, preço final com BDI 20%
- UF selecionada (sincronizada com módulo ISE) afeta o valor unitário dos insumos
- Fórmula: `C_mat_servico = sum(coeficiente_i × valorUnitario_i) × quantidade`

### 10. Consolidação — seção 6.9
- Resumo completo dos cálculos:
  - Por serviço: nome, quantidade, custo MO MEI/CLT, custo materiais, custo total MEI/CLT
  - Totais gerais:
    - Custos Diretos Totais MEI / CLT
    - Custos Diretos/m² MEI / CLT
    - Preço Final MEI (c/BDI 20%) / CLT (c/BDI 20%)
    - Preço/m² MEI / CLT
  - Gráfico de barras (div CSS + classe `progress` DaisyUI, sem biblioteca externa) mostrando proporção MO × Materiais × BDI para MEI e CLT
- Botão "Exportar como JSON" (download de arquivo `.json` com todos os dados do orçamento)
- Botão "Vincular a orçamento de cliente" (dropdown dos orçamentos de clientes no localStorage)

### 11. Orçamentos (gestão)
- Tabela de todos os orçamentos dos clientes (lidos do localStorage)
- Colunas: ID, Cliente, Data, UF, N° serviços, Status, Ações
- Ações: Abrir (visualizar detalhes), Aprovar, Rejeitar (com campo de observação), Recalcular
- Ao abrir um orçamento de cliente → mostrar os dados do cliente, os serviços e os resultados calculados
- Campo de observações do engenheiro (salvo no orçamento)
- Mudar status para 'aprovado' ou 'rejeitado'

---

## Regras de implementação

- Todo novo código segue as mesmas regras do prompt anterior: inputs `fieldset`, ícones `react-icons/md`, classes DaisyUI semânticas, sem comentários, sem testes, sem `any`
- Todo acesso ao localStorage via `lib/storage.ts`
- Lógica de cálculo em `lib/calculos.ts` — componentes não calculam
- A senha do engenheiro NÃO deve ser hardcoded em componente — usar constante em `lib/mockData.ts` (ex: `export const ENGINEER_PASSWORD = 'construbot2026'`)
- O papel `role` é salvo e lido via `lib/storage.ts`
- Ao detectar `role: 'engenheiro'`, o `page.tsx` renderiza o layout do engenheiro em vez do layout do cliente
- Sidebar do engenheiro e do cliente são componentes separados
- Reutilizar `lib/formatters.ts` para formatação monetária
- Gráficos (seção Consolidação): usar apenas CSS/DaisyUI — nenhuma biblioteca de gráficos externa
- Tabelas com muitas colunas (especialmente Composições Profissionais e Calculadora MO): usar `overflow-x-auto` no contêiner

---

## Resultado esperado

Ao final, o engenheiro deve conseguir:
1. Acessar a área admin com senha local
2. Visualizar e editar todos os parâmetros globais (BDI, grupos de encargos A/B/C/D/D'/E, salários, meta diária)
3. Consultar insumos SINAPI ISE por UF com coluna `origemPreco` (C/CR); células `null` exibem badge `%AS` e valor de SP como fallback
4. Consultar qualquer composição analítica pelo código (seção 3.3): selecionar encargos (sem/com), UF, inserir código → ver tabela de insumos com %AS nas células sem preço direto
5. Navegar e inspecionar composições analíticas com hierarquia 3 níveis (Nível 0 → 1 → 2)
6. Gerenciar composições profissionais com metas calculadas automaticamente; visualizar tabelas hidráulicas auxiliares (PONTOS_HIDRAULICOS por cômodo com peças e horas)
7. Configurar os 12 serviços no Precificador com código SINAPI e composição profissional
8. Calcular MO com os 3 cenários (Mensalista 80%, Ótima 125%, Prazo 100%) e bônus de performance (MEI: S_base×1,3 + 0,64×Economia; CLT: custo fixo + 0,56×Economia; construtora: 0,14×Economia); exibir Valor Equivalente Total/UN e Valor Mensal Esperado
9. Calcular materiais com coeficientes SINAPI e preços por UF; fallback para SP com badge `%AS`
10. Ver totais consolidados (MO + Materiais) com preço final MEI/CLT com BDI 20%, custo/m² MEI e CLT
11. Revisar e aprovar/rejeitar orçamentos submetidos pelos clientes
