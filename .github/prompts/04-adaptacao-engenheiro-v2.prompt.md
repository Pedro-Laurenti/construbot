---
agent: 'agent'
description: 'Adapta o fluxo do ENGENHEIRO para v2: 6 etapas tecnicas (E1-E6) com INCC, fluxo de caixa, financiamento e entrega ao cliente'
---

# Tarefa: Adaptar Fluxo do Engenheiro para v2 — 6 Etapas Tecnicas

## Regras obrigatorias ANTES de qualquer codigo

Leia e respeite TODOS os arquivos em `.github/instructions/`:
- `rules.instructions.md` — regras globais
- `frontend.instructions.md` — stack Next.js 15 + React 19 + TypeScript + Tailwind CSS v4 + DaisyUI v5
- `backend.instructions.md` — referencia

---

## Contexto critico — O que muda do v1 para v2

O fluxo atual do engenheiro (prompt `02-engenheiro-admin.prompt.md`) tem 12 modulos independentes. O v2 **reestrutura** o fluxo em 6 etapas sequenciais interdependentes (E1-E6), adicionando conceitos novos:

1. **Levantamento de quantitativos** agora e derivado dos 5 parametros do cliente (planta + opcionais + personalizacoes), nao configurado manualmente
2. **INCC** — correcao monetaria mensal sobre o fluxo de caixa da obra
3. **Fluxo de caixa** — distribuicao do custo direto ao longo dos meses de obra
4. **Parcela Price** — calculo da parcela de financiamento bancario
5. **AA (Aporte Minimo)** — calculo do valor minimo de recursos proprios
6. **Entrega ao cliente** — engenheiro entrega as 3 saidas e muda status do orcamento

### Manter intacto
- Layout admin com sidebar + area principal
- Modulos existentes que continuam relevantes (Parametros Globais, SINAPI ISE, Consulta Composicao, Composicoes Analiticas, Composicoes Profissionais, Calculadora MO, Calculadora Materiais)
- Identidade visual DaisyUI
- Persistencia em localStorage
- Todas as formulas de calculo de MO e materiais do v1

---

## Novos tipos — adicionar em `types/index.ts`

```ts
interface ParametrosINCC {
  inccProjetadoMensal: number
  mesReferencia: string
}

interface FaseObra {
  nome: string
  mesInicio: number
  mesFim: number
  percentualCusto: number
  servicosRelacionados: ServiceType[]
}

interface FluxoCaixaMensal {
  mes: number
  custoParcela: number
  custoParcelaCorrigido: number
  inccAcumulado: number
}

interface PrecificacaoFinal {
  custoDiretoTotal: number
  custoDiretoPorM2: number
  custoDiretoComINCC: number
  precoFinal: number
  precoFinalPorM2: number
  fluxoCaixa: FluxoCaixaMensal[]
  parcelaPrice: number
  aporteMinimo: number
  tabelaAportes: AporteMensal[]
}

interface OrcamentoEngenheiro {
  orcamentoClienteId: string
  parametrosCliente: ParametrosCliente
  etapaAtual: 'E1' | 'E2' | 'E3' | 'E4' | 'E5' | 'E6' | 'ENTREGUE'
  quantitativos: QuantitativoServico[]
  calculosMO: Record<string, CalculoMOResultado>
  calculosMat: Record<string, CalculoMatResultado>
  precificacao?: PrecificacaoFinal
}

interface QuantitativoServico {
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
}

interface CalculoMatResultado {
  servicoId: string
  insumos: InsumoCalculo[]
  custoUnitarioMat: number
  custoTotalMat: number
}
```

Reutilizar tipos existentes de `types/index.ts`: `CalculoMOConfig`, `CalculoMOResultado`, `CenarioDetalhadoMO`, `InsumoCalculo`, etc.

---

## Sidebar do Engenheiro — Reorganizar

A sidebar agora reflete as 6 etapas + modulos de apoio:

```
ETAPAS DO ORCAMENTO
  1. Parametros Globais           (E1)
  2. Quantitativos                (E2) — NOVO
  3. Composicoes SINAPI           (E3)
  4. Calculo Mao de Obra          (E4)
  5. Calculo Materiais            (E5)
  6. Precificacao Final           (E6) — NOVO/EXPANDIDO

FERRAMENTAS
  SINAPI — Insumos (ISE)
  Composicoes Analiticas
  Composicoes Profissionais

GESTAO
  Painel Geral
  Orcamentos dos Clientes        — EXPANDIDO
  Sair
```

---

## Etapa E1 — Configuracao dos Parametros Globais

**Mesmo que o modulo atual `ParametrosGlobais.tsx` com adicoes:**

Parametros existentes (manter):
- BDI: 20% (fator 1,20)
- Encargos Sociais: 160,13% (grupos A/B/C/D/D'/E editaveis)
- Salarios base: Qualificado R$2.664,75 / Meio-Oficial R$2.427,36 / Servente R$2.189,97
- Valor Meta Diario: R$220,00
- Premio Maximo Mensal: R$2.175,25

**Novos parametros a adicionar:**
- UF de execucao da obra (select 27 UFs)
- Mes de referencia SINAPI (select: "Janeiro/2026")
- INCC projetado mensal: input numerico (padrao: 0.005 = 0,5% ao mes)
- Condicoes de financiamento Caixa:
  - MCMV: taxa juros anual, prazo maximo, % maximo financiavel, valor maximo
  - SBPE: taxa juros anual, prazo maximo, % maximo financiavel, valor maximo

Botao "Restaurar Padroes" (recarrega valores da `lib/mockData.ts`)

---

## Etapa E2 — Levantamento de Quantitativos (NOVO)

**Este modulo NAO existia no v1.** Ele transforma os 5 parametros do cliente em uma lista de servicos com quantitativos.

### Fluxo:
1. Engenheiro seleciona um orcamento de cliente com `status: 'aguardando_engenheiro'`
2. Sistema exibe os 5 parametros coletados do cliente:
   - Terreno (municipio, dimensoes, topografia, situacao, valor)
   - Quartos: N
   - Planta selecionada: nome, area, tempo de obra
   - Opcionais marcados (S/N)
   - Personalizacoes descritas
3. Sistema gera automaticamente a lista de servicos a partir de:

### 3.1 Servicos do Projeto Base (Parametro 3)
A planta selecionada gera a lista de servicos com quantitativos pre-definidos.
Exibir tabela:
| Servico | Unidade | Quantidade | Origem |
|---------|---------|------------|--------|
| Fundacao Sapata Corrida | M3 | 6.2 | Planta Base |
| Alvenaria Estrutural | M2 | 260 | Planta Base |
| ... | ... | ... | ... |

### 3.2 Servicos dos Opcionais (Parametro 4)
Cada opcional marcado como 'S' gera incrementos ou novos servicos:
| Opcional | Servico Impactado | Tipo | Incremento |
|----------|-------------------|------|-----------|
| Pe-direito alto | Alvenaria | INCREMENTO | +25% quantidade |
| Pe-direito alto | Revestimento Paredes | INCREMENTO | +20% quantidade |
| Garagem coberta | Fundacao | INCREMENTO | +15% quantidade |
| ... | ... | ... | ... |

### 3.3 Ajustes por Personalizacoes (Parametro 5)
Personalizacoes alteram especificacoes tecnicas dos servicos existentes.
O engenheiro pode:
- Alterar especificacoes (esp1, esp2, esp3) de qualquer servico
- Ajustar quantidades
- Alterar composicao SINAPI de referencia
- Alterar composicao profissional

### 3.4 Registro Final
Para cada servico, o engenheiro confirma/edita:
| Campo | Descricao |
|-------|-----------|
| Servico | Nome do servico |
| Unidade | M2, M3, KG, UN, Aranha |
| Quantidade | Volume total levantado |
| Especificacao 1 | Tipo/variacao |
| Especificacao 2 | Dimensao/modulo |
| Especificacao 3 | Material/orientacao |
| Composicao Basica | Codigo SINAPI |
| Composicao Profissional (CP) | Numero 1 a 43 |
| Modalidade | MEI ou CLT |

Botao "Confirmar Quantitativos" -> salva e avanca para E3.

---

## Etapa E3 — Consulta das Composicoes SINAPI

**Mesmo modulo `ConsultaComposicao.tsx` do v1, mas agora contextualizado:**

Para cada servico do E2, o engenheiro consulta a composicao analitica SINAPI.

Campos de entrada:
| Campo | Valores |
|-------|---------|
| Encargos Sociais | SEM ENCARGOS SOCIAIS / COM ENCARGOS SOCIAIS |
| UF | Sigla do estado (da E1) |
| Codigo da Composicao | Codigo SINAPI do servico |

Campos retornados por item:
| Campo | Uso |
|-------|-----|
| Tipo do Item | COMPOSICAO / INSUMO |
| Codigo e Descricao | Identificacao |
| Coeficiente | Usado diretamente no calculo de materiais |
| Custo Unitario | Preco mediano na UF |
| Situacao | COM PRECO / SEM PRECO |
| %AS | Percentual de precos atribuidos de SP |

Quando insumo SEM PRECO no estado: usar preco de SP como fallback (registrar %AS).

---

## Etapa E4 — Calculo do Custo de Mao de Obra

**Mesmo modulo `CalculadoraMO.tsx` do v1, agora operando sobre os quantitativos do E2.**

Para cada servico:

### Dados de entrada:
| Parametro | Fonte |
|-----------|-------|
| Produtividade Basica (UN/h) | Composicao Profissional (CP) correspondente |
| Adicional de Produtividade | Padrao: 1,3 (30% acima do SINAPI) — editavel |
| Proporcao Ajudante/Profissional | Definida pelo engenheiro por servico |
| Prazo Requerido (dias corridos) | Conforme cronograma da obra |
| Modalidade | MEI ou CLT |

### Os 3 Cenarios (calculados simultaneamente):
| Cenario | Produtividade | Quando Usar |
|---------|--------------|-------------|
| Mensalista | 80% do SINAPI | Equipe menos experiente, custo conservador |
| Otima | 125% do SINAPI | Equipe experiente e motivada, minimiza custo |
| Prazo | SINAPI x Adicional | Prazo fixo a cumprir, calcula N profissionais |

### Formulas:
```
Produtividade Requerida = Prod. Basica SINAPI x Adicional
HH Profissional = Quantidade / Produtividade Requerida
HH Ajudante = HH Profissional x Proporcao Ajudante
N Profissionais (Cenario Prazo) = ceil(HH Total / (Prazo x 8h/dia))
Prazo Efetivo = HH Total / (N Prof inteiro x 8h/dia)
Custo Base = (HH Prof x R$/h Prof) + (HH Ajud x R$/h Ajud)
```

### Sistema de Bonus:
```
Economia = C_SINAPI - C_real (quando C_real < C_SINAPI)

Distribuicao:
  30% -> Cliente (desconto no preco final)
  56% -> Profissional (0,80 x 0,70)
  14% -> Construtora (0,20 x 0,70)

MEI: Remuneracao = Salario Base x 1,3 + 0,64 x Economia
CLT: Remuneracao = Custo Fixo (Prazo Efetivo) + Participacao na Economia
Bonus Construtora = 0,14 x Economia
```

### Campos de saida (secao 6.6 e 6.8):
Exibir em colunas paralelas MEI | CLT:
- CLT (Fixo + Bonus) / MEI (Valor de Producao)
- Salario Esperado MEI / CLT
- Valor de Bonus de Producao MEI / CLT
- Valor Equivalente Total/UN (c/ Bonus) MEI / CLT
- Valor Mensal Esperado MEI / CLT
- Custo Final MEI / CLT
- Bonus Construtora
- Preco Final MEI / CLT (com BDI 20%)

### Formacao de Equipe (por cenario):
Exibir para Equipe Otima e Equipe Prazo:
- N Profissionais / N Ajudantes
- Bonus estimado do cenario

### Decisao MEI vs CLT:
Exibir tabela comparativa:
| Criterio | MEI | CLT |
|----------|-----|-----|
| Custo fixo | Menor (sem encargos) | Maior (160,13% encargos) |
| Flexibilidade | Alta — contrato por servico | Menor — vinculo |
| Bonus | Direto e imediato | Participacao nos resultados |
| Adequacao | Autonomos, servicos pontuais | Equipes fixas, obras longas |

---

## Etapa E5 — Calculo do Custo de Materiais

**Mesmo modulo `CalculadoraMateriais.tsx` do v1.**

Para cada servico, com base nos coeficientes da consulta SINAPI (E3):

```
C_mat_servico = Quantidade x SUM(Coeficiente_i x Valor_Unitario_i) para i=1 a 5
```

Ate 5 insumos por servico. Quando preço indisponivel na UF: usar SP como fallback (badge %AS).

---

## Etapa E6 — Precificacao Final (NOVO/EXPANDIDO)

**Este modulo EXPANDE significativamente o antigo `ConsolidacaoOrcamento.tsx`.**

### 6.1 Consolidacao do Custo Direto

```
Passo 1: Somar custos de MO de todos os servicos (modalidade escolhida)
Passo 2: Somar custos de materiais de todos os servicos
Passo 3: MO + Materiais = Custo Direto Total da Obra
Passo 4: Custo Direto Total / m2 construido
```

Tabela consolidada:
| Servico | Qtd | Custo MO MEI | Custo MO CLT | Custo Mat | Total MEI | Total CLT |
|---------|-----|-------------|-------------|-----------|-----------|-----------|

Totais:
- Custo Direto Total de MO (MEI e CLT)
- Custo Direto Total de Materiais
- Custo Direto Total (MEI e CLT)
- Custo Direto por m2 (MEI e CLT)

### 6.2 Distribuicao do Fluxo de Caixa e Correcao pelo INCC (NOVO)

O tempo de obra e fixo por projeto (definido na planta do Parametro 3).

O engenheiro distribui o custo direto ao longo dos meses de obra conforme as fases:

```ts
export const FASES_OBRA_PADRAO: FaseObra[] = [
  { nome: 'Fundacao e Estrutura', mesInicio: 1, mesFim: 2, percentualCusto: 0.25,
    servicosRelacionados: ['FUNDACAO', 'ESTRUTURA_CONCRETO'] },
  { nome: 'Alvenaria e Graute', mesInicio: 2, mesFim: 4, percentualCusto: 0.20,
    servicosRelacionados: ['ALVENARIA', 'GRAUTE', 'ARMACAO_VERTICAL_HORIZONTAL'] },
  { nome: 'Revestimentos e Contrapiso', mesInicio: 3, mesFim: 6, percentualCusto: 0.25,
    servicosRelacionados: ['CONTRAPISO', 'REVESTIMENTO_ARGAMASSA_PAREDE', 'REVESTIMENTO_ARGAMASSA_TETO', 'REVESTIMENTO_CERAMICO'] },
  { nome: 'Pintura e Acabamentos', mesInicio: 5, mesFim: 8, percentualCusto: 0.20,
    servicosRelacionados: ['PINTURA_INTERNA', 'PINTURA_EXTERNA'] },
  { nome: 'Limpeza e Entrega', mesInicio: 7, mesFim: 8, percentualCusto: 0.10,
    servicosRelacionados: ['LIMPEZA_INTERNA'] },
]
```

As fases se ajustam proporcionalmente ao tempo total da obra (ex: obra de 12 meses distribui as fases proporcionalmente).

Formula de correcao INCC por parcela mensal:
```
Custo Parcela Corrigida = Custo Parcela x (1 + INCC)^n
Onde n = numero de meses entre o mes de referencia e o mes de desembolso

Custo Direto com INCC = SUM(Custo Parcela Corrigida) para todos os meses
```

Exibir tabela:
| Mes | Custo Parcela | INCC Acum. | Custo Corrigido |
|-----|--------------|------------|-----------------|
| 1 | R$ XX.XXX | 0,50% | R$ XX.XXX |
| 2 | R$ XX.XXX | 1,00% | R$ XX.XXX |
| ... | ... | ... | ... |
| N | R$ XX.XXX | X,XX% | R$ XX.XXX |
| TOTAL | R$ XX.XXX | — | R$ XX.XXX |

### 6.3 Aplicacao do BDI e Formacao do Preco Final

```
Preco Final = Custo Direto com INCC x 1,20

Preco Final MEI = Custo Direto MEI com INCC x 1,20
Preco Final CLT = Custo Direto CLT com INCC x 1,20

Preco por m2 = Preco Final / Area Construida
```

Exibir cards de resultado:
- Preco Final MEI (com BDI) / CLT (com BDI) — destaque visual grande
- Preco por m2 MEI / CLT

### 6.4 Calculo da Parcela Price e do Aporte Minimo (AA) (NOVO)

Com o preco final definido, calcular as informacoes para o cliente:

**Parcela Price (sistema Price — parcelas fixas):**
```
taxa_mensal = (1 + taxa_juros_anual)^(1/12) - 1
n = prazo_maximo_meses
valor_financiado = preco_final x percentual_maximo_financiavel
parcela = valor_financiado x [taxa_mensal x (1+taxa_mensal)^n] / [(1+taxa_mensal)^n - 1]
```

**Aporte Minimo (AA):**
```
AA = preco_final - valor_financiado
   = preco_final x (1 - percentual_maximo_financiavel)
```

**Tabela de Aportes Mensais:**
Para cada mes de 1 a N (tempo_obra_meses):
```
MCMV: aportes proprios concentrados nos meses iniciais
  aporte_proprio[i] = custo_mes_corrigido[i] - repasse_financiamento[i]
  repasse e liberado conforme medicao da obra

SBPE: aportes proprios diluidos igualmente
  aporte_proprio[i] = AA / tempo_obra_meses
  repasse_financiamento[i] = custo_mes_corrigido[i] - aporte_proprio[i]
```

Exibir preview das 3 saidas como o cliente vera (para conferencia do engenheiro).

### 6.5 Entrega ao Cliente (NOVO)

Botao "Entregar Orcamento ao Cliente" que:
1. Salva os resultados finais no orcamento
2. Muda status para `status: 'entregue'`
3. Gera as 3 saidas (AA, Parcela Price, Tabela de Aportes)
4. O cliente passa a ver o resultado na area dele

---

## Modulo: Orcamentos dos Clientes (EXPANDIDO)

Tabela de todos os orcamentos com novos status:
| ID | Cliente | Data | Planta | Status | Etapa | Acoes |
|----|---------|------|--------|--------|-------|-------|
| ... | Joao Silva | 15/01/2026 | Casa 3Q | Aguardando | — | Iniciar |
| ... | Maria Santos | 10/01/2026 | Casa 4Q | Em calculo | E4 | Continuar |
| ... | Pedro Oliveira | 05/01/2026 | Casa 2Q | Entregue | — | Ver |

Status:
- `aguardando_engenheiro` — badge "Aguardando" (amarelo)
- `em_calculo` — badge "Em analise" (azul) + indicador de etapa (E1-E6)
- `calculado` — badge "Calculado" (verde claro)
- `entregue` — badge "Entregue" (verde)

Acoes:
- **Iniciar**: abre o fluxo E1-E6 para o orcamento do cliente
- **Continuar**: retoma na etapa onde parou
- **Ver**: visualiza o orcamento completo (se entregue)
- **Recalcular**: permite refazer calculos

Ao clicar em "Iniciar" ou "Continuar":
- Exibe os 5 parametros do cliente no topo (colapsavel)
- Abre a etapa correspondente na area principal

---

## Composicoes Profissionais — 43 CPs Completas

Atualizar o mock `COMPOSICOES_PROFISSIONAIS` com as 43 composicoes do documento de metodologia:

```ts
export const COMPOSICOES_PROFISSIONAIS: ComposicaoProfissional[] = [
  { id: 1, categoria: 'ACABAMENTO_PAREDE_EXTERNA', profissional: 'Azulejista',
    descricao: 'Revestimento Externo - Sacadas e Similares', servico: 'Revestimento Externo',
    refSINAPI: '104859', medicao: 'M2', unidade: 'M2',
    producaoMensalSINAPI: 139.26, valorRefMetaDiaria: 15.60, produtividadeUNh: 0.754,
    produtividadeUNdia: 6.032, metaProducaoMes: 132.70, metaProducaoSemana: 30.65 },
  { id: 2, categoria: 'ACABAMENTO_PAREDE_EXTERNA', profissional: 'Pintor',
    descricao: 'Pintura Externa - Selador de Textura - Casas', servico: 'Selador Externo',
    refSINAPI: '88415', medicao: 'M2', unidade: 'M2',
    producaoMensalSINAPI: 3265.02, valorRefMetaDiaria: 0.60, produtividadeUNh: 17.668,
    produtividadeUNdia: 141.34, metaProducaoMes: 3109.54, metaProducaoSemana: 718.14,
    metaEstipulada: 421 },
  { id: 3, categoria: 'ACABAMENTO_PAREDE_EXTERNA', profissional: 'Pintor',
    descricao: 'Pintura Externa - Textura c/ Desenhos - Casas', servico: 'Textura Externa',
    refSINAPI: '88423', medicao: 'M2', unidade: 'M2',
    producaoMensalSINAPI: 605.90, valorRefMetaDiaria: 3.50, produtividadeUNh: 3.279,
    produtividadeUNdia: 26.23, metaProducaoMes: 577.05, metaProducaoSemana: 133.27,
    metaEstipulada: 421 },
  { id: 4, categoria: 'ACABAMENTO_PAREDE_INTERNA', profissional: 'Azulejista',
    descricao: 'Azulejista - Ceramicos 60x60 Parede - Interno', servico: 'Ceramica Parede Interna',
    refSINAPI: '88415', medicao: 'M2', unidade: 'M2',
    producaoMensalSINAPI: 3265.02, valorRefMetaDiaria: 0.60, produtividadeUNh: 17.668,
    produtividadeUNdia: 141.34, metaProducaoMes: 3109.54, metaProducaoSemana: 718.14 },
  { id: 5, categoria: 'ACABAMENTO_PAREDE_INTERNA', profissional: 'Azulejista',
    descricao: 'Rodape Porcelanato 7cm', servico: 'Rodape',
    refSINAPI: '88316', medicao: 'M2', unidade: 'M2',
    producaoMensalSINAPI: 2121.70, valorRefMetaDiaria: 1.00, produtividadeUNh: 11.481,
    produtividadeUNdia: 91.85, metaProducaoMes: 2020.67, metaProducaoSemana: 466.90 },
  { id: 6, categoria: 'ACABAMENTO_PAREDE_INTERNA', profissional: 'Pintor',
    descricao: 'Pintura Interna - Selador - Teto', servico: 'Selador Teto',
    refSINAPI: '88484', medicao: 'M2', unidade: 'M2',
    producaoMensalSINAPI: 1993.53, valorRefMetaDiaria: 1.00, produtividadeUNh: 10.787,
    produtividadeUNdia: 86.30, metaProducaoMes: 1898.60, metaProducaoSemana: 438.47,
    metaEstipulada: 420 },
  { id: 7, categoria: 'ACABAMENTO_PAREDE_INTERNA', profissional: 'Pintor',
    descricao: 'Pintura Interna - Selador - Parede', servico: 'Selador Parede',
    refSINAPI: '88485', medicao: 'M2', unidade: 'M2',
    producaoMensalSINAPI: 2774.77, valorRefMetaDiaria: 0.70, produtividadeUNh: 15.015,
    produtividadeUNdia: 120.12, metaProducaoMes: 2642.64, metaProducaoSemana: 610.31,
    metaEstipulada: 421 },
  { id: 8, categoria: 'ACABAMENTO_PAREDE_INTERNA', profissional: 'Pintor',
    descricao: 'Pintura Interna - Massa Corrida - Maquina - Teto', servico: 'Massa Corrida Teto',
    refSINAPI: '88310', medicao: 'M2', unidade: 'M2',
    producaoMensalSINAPI: 475.43, valorRefMetaDiaria: 4.50, produtividadeUNh: 2.573,
    produtividadeUNdia: 20.58, metaProducaoMes: 452.79, metaProducaoSemana: 104.57,
    metaEstipulada: 420 },
  { id: 9, categoria: 'ACABAMENTO_PAREDE_INTERNA', profissional: 'Pintor',
    descricao: 'Pintura Interna - Massa Corrida - Maquina - Parede', servico: 'Massa Corrida Parede',
    refSINAPI: '104646', medicao: 'M2', unidade: 'M2',
    producaoMensalSINAPI: 977.26, valorRefMetaDiaria: 2.20, produtividadeUNh: 5.288,
    produtividadeUNdia: 42.30, metaProducaoMes: 930.72, metaProducaoSemana: 214.94 },
  { id: 10, categoria: 'ACABAMENTO_PAREDE_INTERNA', profissional: 'Pintor',
    descricao: 'Pintura Interna - Airless', servico: 'Pintura Airless',
    refSINAPI: '104644', medicao: 'M2', unidade: 'M2',
    producaoMensalSINAPI: 4928.00, valorRefMetaDiaria: 0.40, produtividadeUNh: 26.667,
    produtividadeUNdia: 213.33, metaProducaoMes: 4693.33, metaProducaoSemana: 1083.91,
    metaEstipulada: 420 },
  { id: 11, categoria: 'ACABAMENTO_PISO_INTERNO', profissional: 'Azulejista',
    descricao: 'Revestimento Ceramicos 60x60 Piso - Interno', servico: 'Piso Ceramico 60x60',
    refSINAPI: '87257', medicao: 'M2', unidade: 'M2',
    producaoMensalSINAPI: 355.18, valorRefMetaDiaria: 6.10, produtividadeUNh: 1.922,
    produtividadeUNdia: 15.38, metaProducaoMes: 338.27, metaProducaoSemana: 78.12,
    metaEstipulada: 250 },
  { id: 12, categoria: 'ACABAMENTO_PISO_INTERNO', profissional: 'Azulejista',
    descricao: 'Revestimento Ceramicos 90x90 Piso - Interno', servico: 'Piso Ceramico 90x90',
    refSINAPI: '104958', medicao: 'M2', unidade: 'M2',
    producaoMensalSINAPI: 345.55, valorRefMetaDiaria: 6.20, produtividadeUNh: 1.870,
    produtividadeUNdia: 14.96, metaProducaoMes: 329.09, metaProducaoSemana: 76.00 },
  { id: 13, categoria: 'ALVENARIA', profissional: 'Armador',
    descricao: 'Armacao Horizontal Alvenaria Estrutural', servico: 'Armacao Horizontal Alvenaria',
    refSINAPI: '88245', medicao: 'KG', unidade: 'KG',
    producaoMensalSINAPI: 3004.88, valorRefMetaDiaria: 0.70, produtividadeUNh: 16.260,
    produtividadeUNdia: 130.08, metaProducaoMes: 3147.97, metaProducaoSemana: 727.13,
    metaEstipulada: 354 },
  { id: 14, categoria: 'ALVENARIA', profissional: 'Armador',
    descricao: 'Armacao Vertical Alvenaria Estrutural', servico: 'Armacao Vertical Alvenaria',
    refSINAPI: '89998', medicao: 'KG', unidade: 'KG',
    producaoMensalSINAPI: 3786.89, valorRefMetaDiaria: 0.50, produtividadeUNh: 20.492,
    produtividadeUNdia: 163.94, metaProducaoMes: 3606.59, metaProducaoSemana: 832.93 },
  { id: 15, categoria: 'ALVENARIA', profissional: 'Pedreiro',
    descricao: 'Alvenaria Estrutural - Concreto 14x19x39 - Pe-Direito ate 3m', servico: 'Alvenaria Concreto 14x19x39',
    refSINAPI: '89288', medicao: 'M2', unidade: 'M2',
    producaoMensalSINAPI: 401.74, valorRefMetaDiaria: 5.40, produtividadeUNh: 2.174,
    produtividadeUNdia: 17.39, metaProducaoMes: 420.87, metaProducaoSemana: 97.20,
    metaEstipulada: 248 },
  { id: 16, categoria: 'ALVENARIA', profissional: 'Pedreiro',
    descricao: 'Alvenaria Estrutural - Concreto 14x19x29 - Pe-Direito ate 3m', servico: 'Alvenaria Concreto 14x19x29',
    refSINAPI: '104442', medicao: 'M2', unidade: 'M2',
    producaoMensalSINAPI: 243.16, valorRefMetaDiaria: 8.90, produtividadeUNh: 1.316,
    produtividadeUNdia: 10.53, metaProducaoMes: 254.74, metaProducaoSemana: 58.83,
    metaEstipulada: 249 },
  { id: 17, categoria: 'ALVENARIA', profissional: 'Pedreiro',
    descricao: 'Alvenaria Estrutural - Ceramico 14x19x39 - Pe-Direito ate 3m', servico: 'Alvenaria Ceramico 14x19x39',
    refSINAPI: '89289', medicao: 'M2', unidade: 'M2',
    producaoMensalSINAPI: 284.31, valorRefMetaDiaria: 7.60, produtividadeUNh: 1.538,
    produtividadeUNdia: 12.30, metaProducaoMes: 297.85, metaProducaoSemana: 68.79,
    metaEstipulada: 249 },
  { id: 18, categoria: 'ALVENARIA', profissional: 'Pedreiro',
    descricao: 'Alvenaria Estrutural - Ceramico 14x19x29 - Pe-Direito ate 3m', servico: 'Alvenaria Ceramico 14x19x29',
    refSINAPI: '89290', medicao: 'M2', unidade: 'M2',
    producaoMensalSINAPI: 214.88, valorRefMetaDiaria: 10.10, produtividadeUNh: 1.163,
    produtividadeUNdia: 9.30, metaProducaoMes: 225.12, metaProducaoSemana: 51.99,
    metaEstipulada: 250 },
  { id: 19, categoria: 'ALVENARIA', profissional: 'Pedreiro',
    descricao: 'Alvenaria Vedacao - Ceramico 14x19x39 - Furo Vertical/Horizontal', servico: 'Vedacao Ceramico 14x19x39',
    refSINAPI: '103368', medicao: 'M2', unidade: 'M2',
    producaoMensalSINAPI: 195.35, valorRefMetaDiaria: 11.10, produtividadeUNh: 1.057,
    produtividadeUNdia: 8.46, metaProducaoMes: 186.05, metaProducaoSemana: 42.97 },
  { id: 20, categoria: 'ALVENARIA', profissional: 'Pedreiro',
    descricao: 'Alvenaria Vedacao - Ceramico 14x19x29 - Furo Vertical/Horizontal', servico: 'Vedacao Ceramico 14x19x29',
    refSINAPI: '103346', medicao: 'M2', unidade: 'M2',
    producaoMensalSINAPI: 148.67, valorRefMetaDiaria: 14.60, produtividadeUNh: 0.805,
    produtividadeUNdia: 6.44, metaProducaoMes: 155.75, metaProducaoSemana: 35.97,
    metaEstipulada: 350 },
  { id: 21, categoria: 'ALVENARIA', profissional: 'Pedreiro',
    descricao: 'Grauteamento Vertical', servico: 'Graute Vertical',
    refSINAPI: '89993', medicao: 'M3', unidade: 'M3',
    producaoMensalSINAPI: 22.27, valorRefMetaDiaria: 97.60, produtividadeUNh: 0.121,
    produtividadeUNdia: 0.968, metaProducaoMes: 23.33, metaProducaoSemana: 5.39,
    metaEstipulada: 351 },
  { id: 22, categoria: 'ALVENARIA', profissional: 'Pedreiro',
    descricao: 'Grauteamento Horizontal Superior/Verga', servico: 'Graute Horizontal Verga',
    refSINAPI: '89995', medicao: 'M3', unidade: 'M3',
    producaoMensalSINAPI: 24.92, valorRefMetaDiaria: 87.20, produtividadeUNh: 0.135,
    produtividadeUNdia: 1.08, metaProducaoMes: 26.11, metaProducaoSemana: 6.03,
    metaEstipulada: 352 },
  { id: 23, categoria: 'ALVENARIA', profissional: 'Pedreiro',
    descricao: 'Grauteamento Horizontal Intermediario/Contra-Verga', servico: 'Graute Horizontal Contra-Verga',
    refSINAPI: '89994', medicao: 'M3', unidade: 'M3',
    producaoMensalSINAPI: 38.13, valorRefMetaDiaria: 57.00, produtividadeUNh: 0.206,
    produtividadeUNdia: 1.648, metaProducaoMes: 39.94, metaProducaoSemana: 9.22,
    metaEstipulada: 353 },
  { id: 24, categoria: 'ESTRUTURA_CONCRETO_ARMADO', profissional: 'Armador',
    descricao: 'Armacao Pilar e Viga', servico: 'Armacao Pilar/Viga',
    refSINAPI: '92762', medicao: 'KG', unidade: 'KG',
    producaoMensalSINAPI: 4714.29, valorRefMetaDiaria: 0.40, produtividadeUNh: 25.510,
    produtividadeUNdia: 204.08, metaProducaoMes: 4938.78, metaProducaoSemana: 1140.60,
    metaEstipulada: 3000 },
  { id: 25, categoria: 'ESTRUTURA_CONCRETO_ARMADO', profissional: 'Armador',
    descricao: 'Armacao Laje', servico: 'Armacao Laje',
    refSINAPI: '92771', medicao: 'KG', unidade: 'KG',
    producaoMensalSINAPI: 7135.14, valorRefMetaDiaria: 0.30, produtividadeUNh: 38.610,
    produtividadeUNdia: 308.88, metaProducaoMes: 7474.90, metaProducaoSemana: 1726.30,
    metaEstipulada: 5500 },
  { id: 26, categoria: 'ESTRUTURA_CONCRETO_ARMADO', profissional: 'Carpinteiro',
    descricao: 'Montagem de Formas de Vigas', servico: 'Forma Vigas',
    refSINAPI: '92472', medicao: 'M2', unidade: 'M2',
    producaoMensalSINAPI: 154.90, valorRefMetaDiaria: 14.00, produtividadeUNh: 0.838,
    produtividadeUNdia: 6.70, metaProducaoMes: 162.28, metaProducaoSemana: 37.48,
    metaEstipulada: 5501 },
  { id: 27, categoria: 'ESTRUTURA_CONCRETO_ARMADO', profissional: 'Carpinteiro',
    descricao: 'Montagem de Formas de Lajes', servico: 'Forma Lajes',
    refSINAPI: '92538', medicao: 'M2', unidade: 'M2',
    producaoMensalSINAPI: 504.92, valorRefMetaDiaria: 4.30, produtividadeUNh: 2.732,
    produtividadeUNdia: 21.86, metaProducaoMes: 528.96, metaProducaoSemana: 122.16 },
  { id: 28, categoria: 'ESTRUTURA_CONCRETO_ARMADO', profissional: 'Carpinteiro',
    descricao: 'Montagem de Formas de Pilares', servico: 'Forma Pilares',
    refSINAPI: '92443', medicao: 'M2', unidade: 'M2',
    producaoMensalSINAPI: 308.00, valorRefMetaDiaria: 7.00, produtividadeUNh: 1.667,
    produtividadeUNdia: 13.33, metaProducaoMes: 322.67, metaProducaoSemana: 74.52 },
  { id: 29, categoria: 'ESTRUTURA_LAJE_PRE_MOLDADA', profissional: 'Carpinteiro',
    descricao: 'Laje Trelicada H-12 a H-16', servico: 'Laje Trelicada',
    refSINAPI: '106059', medicao: 'M2', unidade: 'M2',
    producaoMensalSINAPI: 371.08, valorRefMetaDiaria: 5.80, produtividadeUNh: 2.008,
    produtividadeUNdia: 16.06, metaProducaoMes: 388.76, metaProducaoSemana: 89.78 },
  { id: 30, categoria: 'ESTRUTURA_LAJE_PRE_MOLDADA', profissional: 'Pedreiro',
    descricao: 'Pedreiro Laje Trelicada H-12 a H-16', servico: 'Pedreiro Laje Trelicada',
    refSINAPI: '103674', medicao: 'M3', unidade: 'M3',
    producaoMensalSINAPI: 165.15, valorRefMetaDiaria: 13.10, produtividadeUNh: 0.894,
    produtividadeUNdia: 7.15, metaProducaoMes: 173.01, metaProducaoSemana: 39.95,
    metaEstipulada: 351 },
  { id: 31, categoria: 'FUNDACAO', profissional: 'Armador',
    descricao: 'Radier - Tela Eletrosoldada', servico: 'Armacao Radier',
    refSINAPI: '97088', medicao: 'KG', unidade: 'KG',
    producaoMensalSINAPI: 4400.00, valorRefMetaDiaria: 0.40, produtividadeUNh: 23.810,
    produtividadeUNdia: 190.48, metaProducaoMes: 4609.52, metaProducaoSemana: 1064.55 },
  { id: 32, categoria: 'FUNDACAO', profissional: 'Armador',
    descricao: 'Sapata Corrida / Baldrame / Sapata', servico: 'Armacao Sapata',
    refSINAPI: '104919', medicao: 'KG', unidade: 'KG',
    producaoMensalSINAPI: 2281.48, valorRefMetaDiaria: 0.90, produtividadeUNh: 12.346,
    produtividadeUNdia: 98.77, metaProducaoMes: 2390.12, metaProducaoSemana: 552.00 },
  { id: 33, categoria: 'FUNDACAO', profissional: 'Carpinteiro',
    descricao: 'Radier - Forma', servico: 'Forma Radier',
    refSINAPI: '97086', medicao: 'M2', unidade: 'M2',
    producaoMensalSINAPI: 78.40, valorRefMetaDiaria: 27.70, produtividadeUNh: 0.424,
    produtividadeUNdia: 3.39, metaProducaoMes: 82.14, metaProducaoSemana: 18.97 },
  { id: 34, categoria: 'FUNDACAO', profissional: 'Carpinteiro',
    descricao: 'Sapata Corrida - Forma', servico: 'Forma Sapata Corrida',
    refSINAPI: '104927', medicao: 'M2', unidade: 'M2',
    producaoMensalSINAPI: 170.64, valorRefMetaDiaria: 12.70, produtividadeUNh: 0.923,
    produtividadeUNdia: 7.38, metaProducaoMes: 178.76, metaProducaoSemana: 41.28 },
  { id: 35, categoria: 'FUNDACAO', profissional: 'Pedreiro',
    descricao: 'Radier - Preparo + Compactacao + Lona', servico: 'Preparo Radier',
    refSINAPI: '97083', medicao: 'M2', unidade: 'M2',
    producaoMensalSINAPI: 4400.00, valorRefMetaDiaria: 0.40, produtividadeUNh: 23.810,
    produtividadeUNdia: 190.48, metaProducaoMes: 4609.52, metaProducaoSemana: 1064.55 },
  { id: 36, categoria: 'FUNDACAO', profissional: 'Pedreiro',
    descricao: 'Radier - Lastro Britado', servico: 'Lastro Radier',
    refSINAPI: '96624', medicao: 'M3', unidade: 'M3',
    producaoMensalSINAPI: 117.04, valorRefMetaDiaria: 18.50, produtividadeUNh: 0.633,
    produtividadeUNdia: 5.06, metaProducaoMes: 122.61, metaProducaoSemana: 28.32 },
  { id: 37, categoria: 'FUNDACAO', profissional: 'Pedreiro',
    descricao: 'Radier - Concretagem', servico: 'Concretagem Radier',
    refSINAPI: '97096', medicao: 'M3', unidade: 'M3',
    producaoMensalSINAPI: 449.64, valorRefMetaDiaria: 4.80, produtividadeUNh: 2.433,
    produtividadeUNdia: 19.46, metaProducaoMes: 471.05, metaProducaoSemana: 108.79 },
  { id: 38, categoria: 'FUNDACAO', profissional: 'Pedreiro',
    descricao: 'Sapata Corrida - Concretagem', servico: 'Concretagem Sapata Corrida',
    refSINAPI: '104924', medicao: 'M3', unidade: 'M3',
    producaoMensalSINAPI: 420.00, valorRefMetaDiaria: 5.10, produtividadeUNh: 2.273,
    produtividadeUNdia: 18.18, metaProducaoMes: 440.00, metaProducaoSemana: 101.62 },
  { id: 39, categoria: 'REGULARIZACAO_PAREDES_TETOS', profissional: 'Gesseiro',
    descricao: 'Gesseiro - Parede (Canto e Rodape)', servico: 'Gesso Parede',
    refSINAPI: '', medicao: 'M2', unidade: 'M2',
    producaoMensalSINAPI: 409.78, valorRefMetaDiaria: 5.30, produtividadeUNh: 2.217,
    produtividadeUNdia: 17.74, metaProducaoMes: 390.27, metaProducaoSemana: 90.13,
    metaEstipulada: 420 },
  { id: 40, categoria: 'REGULARIZACAO_PAREDES_TETOS', profissional: 'Gesseiro',
    descricao: 'Gesseiro - Teto (Canto)', servico: 'Gesso Teto',
    refSINAPI: '', medicao: 'M2', unidade: 'M2',
    producaoMensalSINAPI: 306.11, valorRefMetaDiaria: 7.10, produtividadeUNh: 1.656,
    produtividadeUNdia: 13.25, metaProducaoMes: 291.44, metaProducaoSemana: 67.30 },
  { id: 41, categoria: 'REGULARIZACAO_PISO', profissional: 'Pedreiro',
    descricao: 'Contrapiso 2cm - Farofa', servico: 'Contrapiso Farofa',
    refSINAPI: '87622', medicao: 'M2', unidade: 'M2',
    producaoMensalSINAPI: 863.55, valorRefMetaDiaria: 2.50, produtividadeUNh: 4.673,
    produtividadeUNdia: 37.38, metaProducaoMes: 822.43, metaProducaoSemana: 189.94,
    metaEstipulada: 650 },
  { id: 42, categoria: 'INSTALACOES', profissional: 'Eletricista',
    descricao: 'Eletricista (em desenvolvimento)', servico: 'Instalacao Eletrica',
    refSINAPI: '', medicao: 'M2', unidade: 'M2',
    producaoMensalSINAPI: 0, valorRefMetaDiaria: 0, produtividadeUNh: 0,
    produtividadeUNdia: 0, metaProducaoMes: 0, metaProducaoSemana: 0 },
  { id: 43, categoria: 'INSTALACOES', profissional: 'Encanador',
    descricao: 'Encanador - por aranha de banheiro', servico: 'Instalacao Hidraulica',
    refSINAPI: '', medicao: 'ARANHA', unidade: 'ARANHA',
    producaoMensalSINAPI: 0, valorRefMetaDiaria: 0, produtividadeUNh: 0,
    produtividadeUNdia: 0, metaProducaoMes: 0, metaProducaoSemana: 0 },
]
```

Adicionar `'INSTALACOES'` ao tipo `CategoriaProfissional`.

---

## Tabelas Auxiliares de Hidraulica — CP 43

Mock completo conforme documento de metodologia:

```ts
export const TABELAS_HIDRAULICA = {
  banheiroEsgoto: {
    nome: 'Banheiro - Esgoto (Ramal Terreo)',
    totalHoras: 6.005,
    pecas: [
      { descricao: 'Tubo 100mm', tempoHoraUn: 0.4444, quantidade: 2.5, totalHoras: 1.111 },
      { descricao: 'Joelho 90 50mm', tempoHoraUn: 0.1379, quantidade: 6, totalHoras: 0.827 },
      { descricao: 'Luva 100mm', tempoHoraUn: 0.1284, quantidade: 2, totalHoras: 0.257 },
      { descricao: 'Joelho 90 100mm', tempoHoraUn: 0.1926, quantidade: 1, totalHoras: 0.193 },
      { descricao: 'Juncao 100x50', tempoHoraUn: 0.2325, quantidade: 5, totalHoras: 1.163 },
      { descricao: 'Joelho 45 50mm', tempoHoraUn: 0.1379, quantidade: 3, totalHoras: 0.414 },
      { descricao: 'Joelho 45 100mm', tempoHoraUn: 0.2172, quantidade: 1, totalHoras: 0.217 },
      { descricao: 'Caixa Sifonada 100x100x50', tempoHoraUn: 0.2175, quantidade: 2, totalHoras: 0.435 },
    ]
  },
  cozinhaLavanderiaEsgoto: {
    nome: 'Cozinha / Lavanderia - Esgoto',
    totalHoras: 3.370,
    pecas: [
      { descricao: 'Tubo 50mm', tempoHoraUn: 0.3182, quantidade: 2.5, totalHoras: 0.796 },
      { descricao: 'Joelho 90 50mm', tempoHoraUn: 0.1379, quantidade: 12, totalHoras: 1.655 },
      { descricao: 'Juncao 50', tempoHoraUn: 0.1839, quantidade: 4, totalHoras: 0.736 },
      { descricao: 'T 50', tempoHoraUn: 0.1839, quantidade: 1, totalHoras: 0.184 },
    ]
  },
  saidaTuboRamalPrincipal: {
    nome: 'Saida Tubo (Ramal Principal)',
    totalHoras: 6.222,
    pecas: [
      { descricao: 'Tubo 100mm', tempoHoraUn: 0.4444, quantidade: 14, totalHoras: 6.222 },
    ]
  },
  banheiroHidraulica: {
    nome: 'Banheiro - Hidraulica (Ramal Terreo)',
    totalHoras: 1.972,
    pecas: [
      { descricao: 'Joelho 90 25mm', tempoHoraUn: 0.152, quantidade: 4, totalHoras: 0.608 },
      { descricao: 'T 25mm', tempoHoraUn: 0.2026, quantidade: 3, totalHoras: 0.608 },
      { descricao: 'Tubo 25mm', tempoHoraUn: 0.0195, quantidade: 18, totalHoras: 0.351 },
      { descricao: 'Registro 25mm', tempoHoraUn: 0.2026, quantidade: 2, totalHoras: 0.405 },
    ]
  },
  montagemCaixaDagua: {
    nome: 'Montagem Caixa DAgua',
    totalHoras: 3.110,
    pecas: [
      { descricao: 'Joelho 90 25mm', tempoHoraUn: 0.152, quantidade: 8, totalHoras: 1.216 },
      { descricao: 'Adaptador 25mm', tempoHoraUn: 0.0944, quantidade: 4, totalHoras: 0.378 },
      { descricao: 'Joelho 90 50mm', tempoHoraUn: 0.1271, quantidade: 4, totalHoras: 0.508 },
      { descricao: 'T 50mm', tempoHoraUn: 0.1694, quantidade: 2, totalHoras: 0.339 },
      { descricao: 'Tubo 50mm', tempoHoraUn: 0.2677, quantidade: 2.5, totalHoras: 0.669 },
    ]
  },
  cozinhaLavanderiaHidraulica: {
    nome: 'Cozinha / Lavanderia - Hidraulica',
    totalHoras: 1.554,
    pecas: [
      { descricao: 'Joelho 90 25mm', tempoHoraUn: 0.1552, quantidade: 8, totalHoras: 1.242 },
      { descricao: 'Tubo 25mm', tempoHoraUn: 0.0195, quantidade: 16, totalHoras: 0.312 },
    ]
  },
  pluvial: {
    nome: 'Pluvial',
    totalHoras: 16.665,
    pecas: [
      { descricao: 'Tubo 100mm', tempoHoraUn: 1.111, quantidade: 15, totalHoras: 16.665 },
    ]
  },
  resumoAranha: {
    totalHorasPorAranha: 38.90,
  }
}
```

---

## Estrutura de arquivos — substituir/adicionar

```
frontend/
  lib/
    mockData.ts         <- substituir COMPOSICOES_PROFISSIONAIS por 43 CPs completas
                           adicionar FASES_OBRA_PADRAO, TABELAS_HIDRAULICA
    calculos.ts         <- estender com calcularFluxoCaixa, calcularINCC,
                           calcularParcelaPrice, calcularAA, calcularTabelaAportes,
                           gerarQuantitativosFromParametros
  types/
    index.ts            <- estender com novos tipos acima
  components/
    engenheiro/
      SidebarEngenheiro.tsx       <- reorganizar com 3 secoes (Etapas, Ferramentas, Gestao)
      ParametrosGlobais.tsx       <- adicionar UF, mes SINAPI, INCC, condicoes financiamento
      QuantitativosServico.tsx    <- NOVO: E2 — gera servicos a partir dos 5 parametros
      ConsultaComposicao.tsx      <- manter (E3)
      CalculadoraMO.tsx           <- manter (E4)
      CalculadoraMateriais.tsx    <- manter (E5)
      PrecificacaoFinal.tsx       <- NOVO: E6 — consolidacao + INCC + BDI + Price + AA + entrega
      TabelaSINAPI.tsx            <- manter (ferramenta)
      ComposicoesAnaliticas.tsx   <- manter (ferramenta)
      ComposicoesProfissionais.tsx <- atualizar com 43 CPs
      PainelGeral.tsx             <- manter (gestao)
      GestaoOrcamentos.tsx        <- expandir com novos status e acoes
  app/
    page.tsx            <- ajustar orquestrador para novo fluxo E1-E6
```

---

## Regras de implementacao

- A ordem E1->E2->E3->E4->E5->E6 e obrigatoria: cada etapa depende da anterior
- Os 5 parametros do cliente sao vistos pelo engenheiro mas NAO editados (apenas os quantitativos derivados)
- O engenheiro escolhe MEI ou CLT para cada servico — o cliente nao participa dessa decisao
- O INCC e aplicado sobre o fluxo de caixa mensal, NAO sobre o custo direto total de uma vez
- A parcela Price usa o sistema Price (parcelas fixas) com as condicoes de financiamento da Caixa
- O botao "Entregar ao Cliente" muda o status do orcamento e gera as 3 saidas
- O engenheiro pode ver um preview de como o cliente vera o resultado antes de entregar

---

## Resultado esperado

Ao final, o engenheiro deve conseguir:
1. Receber orcamentos de clientes com `status: 'aguardando_engenheiro'`
2. Configurar parametros globais incluindo UF, INCC e condicoes de financiamento (E1)
3. Gerar automaticamente quantitativos a partir dos 5 parametros do cliente, com edicao manual (E2)
4. Consultar composicoes SINAPI por servico (E3)
5. Calcular MO com 3 cenarios + bonus + decisao MEI/CLT (E4)
6. Calcular materiais com coeficientes SINAPI (E5)
7. Consolidar custos, aplicar INCC no fluxo de caixa, aplicar BDI, calcular Parcela Price e AA (E6)
8. Entregar ao cliente as 3 saidas (AA, Parcela, Tabela de Aportes)
9. Gerenciar todos os 43 CPs e tabelas hidraulicas
10. Acompanhar status de todos os orcamentos com etapa atual
