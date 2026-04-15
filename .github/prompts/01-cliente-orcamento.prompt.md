---
agent: 'agent'
description: 'Protótipo do fluxo de orçamento do CLIENTE (lado do usuário final)'
---

# Tarefa: Implementar Protótipo do Fluxo de Orçamento — LADO DO CLIENTE

## Regras obrigatórias ANTES de qualquer código

Leia e respeite TODOS os arquivos em `.github/instructions/`:
- `rules.instructions.md` — regras globais (sem emojis, sem comentários no código, sem testes, sem docstrings, input padrão DaisyUI fieldset, cleancode, o menor número de arquivos e linhas possível)
- `frontend.instructions.md` — stack Next.js 15 + React 19 + TypeScript + Tailwind CSS v4 + DaisyUI v5, ícones apenas `react-icons/md`, temas `mylight`/`mydark`, classes semânticas DaisyUI
- `backend.instructions.md` — referência, mas neste protótipo **não há chamadas de backend** (exceto `/api/health`)

## Contexto crítico

O frontend atual (`frontend/`) foi criado APENAS para testar layout — o **fluxo está completamente errado** em relação à regra de negócio real e deve ser **substituído integralmente**. Porém, os componentes e utilitários já construídos têm qualidade e devem ser **reaproveitados** — veja a seção "Componentes existentes para reutilizar" abaixo.

Este é um **protótipo**: sem banco de dados, sem autenticação real. Tudo mockado e persistido em `localStorage` via `lib/storage.ts` (renomear/substituir o atual `lib/session.ts`, centralizando todo acesso ao localStorage — não usar `localStorage` diretamente nos componentes).

---

## Stack e persistência

- Next.js 15 App Router (`'use client'` onde necessário)
- React 19, TypeScript estrito
- Tailwind CSS v4 + DaisyUI v5
- `localStorage` via `lib/storage.ts` (único ponto de acesso)
- Sem chamadas de API (exceto `/api/health` para status — manter `lib/api.ts` com `fetchWithAuth`)
- Dados iniciais (seed) definidos em `lib/mockData.ts`

---

## Design obrigatório: WhatsApp-like

**TODA a interface principal deve imitar a UX/UI do WhatsApp Web:**
- Painel esquerdo: **apenas duas entradas fixas** na sidebar:
  1. **"Nova Cotação"** — pinnada no topo, abre o chat com Ana
  2. **"Meus Orçamentos"** — entrada única com badge de contagem; desabilitada se nenhum salvo; ao clicar, área de chat mostra lista de orçamentos para selecionar
  - Orçamentos NÃO aparecem individualmente na sidebar
  - Ao selecionar um orçamento da lista: exibe `ResultadoOrcamento` com `isSaved={true}` (sem botão salvar) e voltar retorna à lista
- Painel direito: área de chat
  - Header com avatar do "contato" (assistente), nome, status online
  - Área de mensagens com background base-200, chat bubbles DaisyUI (`chat chat-start` / `chat chat-end`)
  - Bot messages: `chat-start`, bolha `bg-base-300 text-base-content`
  - User messages: `chat-end`, bolha `bg-primary text-primary-content`
  - Timestamp em cada mensagem
  - Área de input fixed no bottom (muda conforme o passo do wizard)
- A dinâmica é: o usuário não está "usando um sistema", está **conversando com Ana, assistente da ConstruBot** — ela pergunta, ele responde, ela calcula
- O fluxo do wizard de orçamento É a conversa: cada passo vira uma mensagem do bot + resposta do usuário

---

## Onboarding (tela de primeiro acesso)

Layout dois painéis (brand esquerda + form direita) com **duas abas**:
1. **Cadastro manual**: nome completo + telefone (com formatação BR +55) + e-mail
2. **Google (mockado)**: botão "Entrar com Google" que preenche um usuário demo e chama `onSubmit` diretamente — sem lógica real de OAuth

---

## Componentes existentes para reutilizar (NÃO recriar do zero)

| Arquivo | O que aproveitar |
|---------|-----------------|
| `components/LoginPage.tsx` | Layout dois painéis, fieldset inputs, loading, erro. Adaptar: cadastro (nome+tel+email) + aba Google mockada. |
| `components/ChatWindow.tsx` | **Reutilizar integralmente os padrões:** `MessageBubble` (chat-start/end, timestamps, DoneAll), `StartPrompt`, padrão de input na parte inferior, auto-scroll via `useRef`. Adaptar ao novo fluxo. |
| `components/Sidebar.tsx` | Avatar com iniciais, dropdown com clique fora. Adaptar: converter para lista WhatsApp-like de conversas. |
| `components/HelpModal.tsx` | Reutilizar sem modificação. |
| `components/QuoteResultCard.tsx` | `StatRow` e `CostBar` — extrair como sub-componentes. |
| `lib/session.ts` | Padrão try/catch + fallback. Migrado para `lib/storage.ts`. |
| `lib/api.ts` | `fetchWithAuth` — manter exatamente. |

**Componentes que devem ser descartados**: `EngineerWindow.tsx`, `InicialWindow.tsx`, `lib/botScripts.ts`.
**OrcamentoWizard.tsx** foi substituído por **OrcamentoChatFlow.tsx** (chat-based).

---

## Wizard de orçamento como conversa (OrcamentoChatFlow)

O fluxo é conduzido pela "Ana - ConstruBot" como se fosse uma conversa de WhatsApp:

**Fase 1 — Inputs gerais (mensagens sequenciais):**
1. Bot: saudação + pergunta UF → input: select estilizado ou pill buttons
2. Bot: pergunta prazo global → input: quick buttons (7d, 14d, 30d, 45d, 60d, Outro) + confirmar
3. Bot: apresenta lista de 12 serviços → input: checkbox grid estilizado, confirmar

> **Nota:** Modalidade de contrato (MEI/CLT) é definida pelo ENGENHEIRO, não pelo cliente. Não aparece no fluxo do cliente. Todos os itens do cliente são criados com `modalidade: 'MEI'` como padrão do sistema.

**Fase 2 — Configuração de serviços (UM POR VEZ):**
- Bot: "Serviço X de N — [Nome do Serviço]" (com progresso visual)
- Input area (na parte inferior) mostra o formulário RICO daquele serviço:
  - Quantidade com unit badge (grande, prominente)
  - Especificações como **pill buttons** clicáveis (não selects) com **rótulo contextual** por campo (ex: "Tipo de fundação", "Elemento estrutural", "Bitola do aço") — definidos em `SERVICE_SPEC_LABELS` em `mockData.ts`
  - Prazo como **quick buttons** (7d, 14d, 30d, 45d, 60d + custom)
  - Botão "Confirmar" destacado
  - **Modalidade NÃO aparece** — é atribuição do engenheiro
- Ao confirmar: aparece bubble do usuário com resumo compacto, bot responde com confirmação e abre próximo serviço

**Fase 3 — Resumo e cálculo:**
- Bot mostra tabela resumo → botão "Calcular Orçamento"

**Fase 4 — Resultado:**
- `ResultadoOrcamento` renderizado inline abaixo das mensagens
- Botão "Salvar Orçamento" aparece **apenas neste momento** (orçamento ainda não salvo)
- Após salvar, o usuário é redirecionado para a visualização do orçamento salvo **sem** o botão de salvar (`isSaved` prop)

---

## Tipos — `types/index.ts`

Manter os tipos da primeira implementação (GlobalParams, ServiceType, ContratoModalidade, OrcamentoItem, ItemResultado, CenarioEquipe, InsumoItem, Orcamento, OrcamentoTotais, Cliente, AppSession) sem alterações.

---

## Regras de negócio — fórmulas

Implementadas em `lib/calculos.ts` — manter exatamente as fórmulas da primeira implementação (BDI 20%, encargos 160,13%, bônus MEI = S_base × 1,3 + 0,64 × Economia, bônus construtora = 0,14 × Economia).

---

## Estrutura de arquivos

```
frontend/
  lib/
    storage.ts          ← único ponto de acesso ao localStorage
    mockData.ts         ← SERVICE_CONFIG, SERVICE_SPECS, GLOBAL_PARAMS, SEED_CLIENTE
    calculos.ts         ← todas as fórmulas
    formatters.ts       ← formatCurrency, formatDate, formatArea, formatNationalPhone
  types/
    index.ts            ← tipos completos
  components/
    OnboardingForm.tsx       ← cadastro (manual + aba Google mockada)
    Sidebar.tsx              ← lista WhatsApp-like de orçamentos
    OrcamentoChatFlow.tsx    ← wizard como conversa (substitui OrcamentoWizard)
    ResultadoOrcamento.tsx   ← resultado calculado
    ItemResultadoCard.tsx    ← card por serviço (expandível)
    HistoricoOrcamentos.tsx  ← listagem de orçamentos salvos
    ServicoForm.tsx          ← form rico por serviço (usado dentro do chat)
    HelpModal.tsx            ← sem modificação
  app/
    page.tsx          ← layout WhatsApp (Sidebar + ChatArea)
    globals.css       ← sem modificação
    layout.tsx        ← sem modificação
```

---

## Seed de dados demo

```ts
// ?demo=1 na URL carrega dados do SEED_CLIENTE + SEED_ORCAMENTO
export const SEED_CLIENTE: Cliente = {
  id: 'demo-001', nome: 'João Silva', telefone: '(11) 98765-4321',
  email: 'joao@email.com', dataCadastro: '2026-01-15'
}
```


---

## Componentes existentes para reutilizar (NÃO recriar do zero)

Os arquivos abaixo já estão construídos com a qualidade correta. **Adapte-os** ao novo fluxo em vez de recriar:

| Arquivo | O que aproveitar |
|---------|-----------------|
| `components/LoginPage.tsx` | Layout dois painéis (brand esquerda + form direita), fieldset inputs, estado de loading, erro de validação. Adaptar: trocar campos de usuário/senha pelo formulário de onboarding (nome, telefone, email), remover tab Google, manter estrutura visual. |
| `components/Sidebar.tsx` | Estrutura de nav items com ícone + label + sublabel, avatar com iniciais calculadas, dropdown de ações, comportamento de clique fora para fechar. Adaptar: trocar `ConversationId` pelos novos itens de menu (Novo Orçamento, Meus Orçamentos, Sair). |
| `components/HelpModal.tsx` | Modal com overlay clicável, fechar com Escape, header com título + botão X, área de conteúdo, botão "Entendido". Reutilizar **sem modificação** para modais de confirmação/ajuda. |
| `components/QuoteResultCard.tsx` | Padrão `StatRow` (label esquerda + valor direita com linha divisória) e `CostBar` (barra de progresso CSS com percentual). Extrair esses dois sub-componentes para uso nos cards de resultado. |
| `components/InicialWindow.tsx` | Função `formatNationalPhone` e `OnboardingInput` com validação de telefone por dígitos. Reutilizar a lógica de formatação de telefone no formulário de onboarding. |
| `lib/session.ts` | Padrão `loadSession`/`saveSession`/`clearSession` com try/catch e fallback para `defaultSession`. Migrar para `lib/storage.ts` com as novas chaves tipadas, mantendo o mesmo padrão de segurança. |
| `lib/api.ts` | `fetchWithAuth` — manter exatamente como está para a chamada `/api/health`. |

**Componentes que devem ser descartados** (apenas o fluxo, não o padrão): `ChatWindow.tsx`, `EngineerWindow.tsx`, `InicialWindow.tsx` (substituir pelo novo onboarding), `lib/botScripts.ts`.

---

## Tipos — `types/index.ts` (reescrever completamente)

```ts
// Parâmetros globais do sistema
interface GlobalParams {
  bdi: number                    // 0.20 (20%)
  encargosPercentual: number     // 1.6013 (160.13%)
  fatorEncargos: number          // 2.6013 (= 1 + 1.6013)
  salarioQualificado: number     // 2664.75
  salarioMeioOficial: number     // 2427.36
  salarioServente: number        // 2189.97
  diariaSemEncargos: number      // 121.125
  diariaComEncargos: number      // 193.96
  valorMetaDiario: number        // 220.00
  premioMaximoMensal: number     // 2175.25
}

// Serviços disponíveis para orçar (12 tipos — seção 5.2 do documento)
type ServiceType =
  | 'FUNDACAO'                          // 1. Fundação (sub: Sapata Corrida, Radier, Sapata Isolada, Estaca, Tubulão)
  | 'ESTRUTURA_CONCRETO'                // 2. Estrutura Concreto Armado (Pilar, Viga, Laje, Parede de Concreto; sub: Armação, Forma, Concretagem)
  | 'ALVENARIA'                         // 3. Alvenaria
  | 'GRAUTE'                            // 4. Graute (Vertical, Horizontal)
  | 'ARMACAO_VERTICAL_HORIZONTAL'       // 5. Armação Vertical / Horizontal
  | 'CONTRAPISO'                        // 6. Área de Contrapiso
  | 'REVESTIMENTO_ARGAMASSA_PAREDE'     // 7. Revestimento Argamassa Interna — Paredes
  | 'REVESTIMENTO_ARGAMASSA_TETO'       // 8. Revestimento Argamassa Interna — Teto
  | 'REVESTIMENTO_CERAMICO'             // 9. Revestimento Cerâmico
  | 'PINTURA_INTERNA'                   // 10. Pintura Interna
  | 'PINTURA_EXTERNA'                   // 11. Pintura Externa
  | 'LIMPEZA_INTERNA'                   // 12. Limpeza Interna

type ContratoModalidade = 'MEI' | 'CLT'

// Item de serviço dentro de um orçamento (pedido pelo cliente)
interface OrcamentoItem {
  id: string
  serviceType: ServiceType
  subTipo: string               // ex: 'Sapata Corrida', 'Alvenaria de Vedação'
  especificacao1: string
  especificacao2: string
  especificacao3: string
  unidade: string               // M², M³
  quantidade: number
  prazoRequerido: number        // dias corridos
  modalidade: ContratoModalidade
  resultado?: ItemResultado
}

// Resultado calculado por item
interface ItemResultado {
  // Mão de obra
  produtividadeBasicaUNh: number       // SINAPI reference
  produtividadeRequerida: number       // ajustada
  hhProfissional: number
  hhAjudante: number
  proporcaoAjudante: number
  rsUN: number                         // custo referência R$/UN (SINAPI)
  // Cenário Mensalista (80% SINAPI)
  mensalista: CenarioEquipe
  // Cenário Ótima (125% SINAPI)
  otima: CenarioEquipe
  // Cenário Prazo (ajustado ao prazo requerido)
  prazo: CenarioEquipe
  // Bônus de performance (calculado sobre o cenário SINAPI 100%)
  economia: number                     // max(0, C_SINAPI - C_real)
  bonusMEI: number                     // S_base × 1,3 + 0,64 × Economia
  bonusCLT: number                     // custo_fixo + 0,56 × Economia
  bonusConstrutora: number             // 0,14 × Economia
  salarioEsperadoMEI: number
  salarioEsperadoCLT: number
  valorEquivalenteTotalUNMEI: number   // custo final MEI / quantidade (seção 6.8)
  valorEquivalenteTotalUNCLT: number   // custo final CLT / quantidade (seção 6.8)
  valorMensalEsperadoMEI: number       // remuneração mensal esperada profissional MEI (seção 6.8)
  valorMensalEsperadoCLT: number       // remuneração mensal esperada profissional CLT (seção 6.8)
  // Materiais
  custoMaterialServico: number         // sum(coef_i × valorUnit_i) × quantidade
  insumos: InsumoItem[]                // até 5 insumos
  // Resultado final por modalidade
  custoFinalMEI: number
  custoFinalCLT: number
  custoUnitarioMEI: number
  custoUnitarioCLT: number
  bonusConstrutoraMEI: number
  bonusConstrutoralCLT: number
  precoFinalMEI: number                // custoFinalMEI × 1,20 (BDI)
  precoFinalCLT: number                // custoFinalCLT × 1,20 (BDI)
}

interface InsumoItem {
  descricao: string
  unidade: string
  coeficiente: number
  valorUnitario: number
  total: number                        // coef × valorUnit × quantidade item pai
}

interface CenarioEquipe {
  produtividade: number               // UN/h efetiva
  hhProfissional: number
  hhAjudante: number
  profissionaisNecessarios: number
  ajudantesNecessarios: number
  prazoEfetivoDias: number
  custoBase: number                   // sem bônus
  bonusCenario: number               // bônus estimado para este cenário (seção 6.7); 0 para Mensalista
}

// Orçamento completo
interface Orcamento {
  id: string
  clienteId: string
  dataCriacao: string
  status: 'rascunho' | 'calculado' | 'enviado'
  uf: string                          // estado de referência para preços
  itens: OrcamentoItem[]
  totais?: OrcamentoTotais
}

interface OrcamentoTotais {
  custoMOTotalMEI: number
  custoMOTotalCLT: number
  custoMatTotal: number
  custosDiretosMEI: number             // custoMOTotalMEI + custoMatTotal
  custosDiretosCLT: number             // custoMOTotalCLT + custoMatTotal
  custosDiretosPorM2MEI: number        // custosDiretosMEI / areaTotal
  custosDiretosPorM2CLT: number        // custosDiretosCLT / areaTotal
  precoFinalMEI: number                // custosDiretosMEI × 1,20
  precoFinalCLT: number                // custosDiretosCLT × 1,20
  areaTotal: number                    // soma das quantidades em M²
  precoPorM2MEI: number                // precoFinalMEI / areaTotal
  precoPorM2CLT: number                // precoFinalCLT / areaTotal
}

// Cliente
interface Cliente {
  id: string
  nome: string
  telefone: string
  email: string
  dataCadastro: string
}

// Sessão do app
interface AppSession {
  cliente: Cliente | null
  orcamentos: Orcamento[]
  orcamentoAtivo: string | null       // id do orcamento em edição
}
```

---

## Regras de negócio — fórmulas (implementar exatamente)

### BDI — Benefícios e Despesas Indiretas (seção 2.1)
```
BDI = 20% (padrão)
P_final = C_direto × 1,20

Faturamento mensal de referência = R$40.000,00 + R$4.800,00
Componentes do BDI:
  - Aluguel de escritório/estrutura
  - Impostos (federais, estaduais, municipais)
  - Pró-labore da direção
  - BDI em cima do projetado
(Exibir esses componentes informativamente para o cliente no resultado)
```

### Encargos Sociais (160,13%)
```
Grupo A = 27,80%   (INSS 10% + FGTS 8% + Sal.Educação 2,5% + SESI 1,5% + SENAI/SEBRAE 16% + INCRA 2% + Seguro 3% + SECONCI 1%)
Grupo B = 52,93%   (DSR 18,13% + Feriados 8% + Férias+1/3 15,10% + Aux.Enfermidade 2,58% + 13º 11,33% + Lic.Paternidade 0,13% + Faltas 0,76%)
Grupo C = A × B    = 0,2780 × 0,5293 = 14,71%
Grupo D = 16,19%   (Aviso Prévio 11,56% + Desp.Injusta 3,08% + Ind.Adicional 0,78% + LC110 0,77%)
Grupo D'= (A - FGTS - SECONCI) × AvisoPrévio = (0,2780 - 0,0800 - 0,0100) × 0,1156 = 2,17%
Grupo E = 46,33%   (Chuva 1,5% + Almoço 21,34% + Jantar 3,87% + Café 8,47% + EPI 6,14% + VT 4,57% + SegVida 0,44%)
Total   = 27,80 + 52,93 + 14,71 + 16,19 + 2,17 + 46,33 = 160,13%
fatorEncargos = 2,6013
```

### Salários com encargos
```
S_com_encargos = S_base × 2,6013
Qualificado: R$2.664,75 × 2,6013 = R$4.267,06
Meio-Oficial: R$2.427,36 × 2,6013 = R$3.886,93
Servente:     R$2.189,97 × 2,6013 = R$3.506,80
Diária qualificado: R$121,125 (sem enc.) / R$193,96 (c/enc.)
Valor hora qualificado = 2664,75 / (22 dias × 8h) = R$15,14/h (sem enc.)
Valor hora servente   = 2189,97 / (22 dias × 8h) = R$12,44/h (sem enc.)
Valor hora qualificado c/enc = 4267,06 / (22 × 8) = R$24,24/h
Valor hora servente c/enc    = 3506,80 / (22 × 8) = R$19,92/h
```

### Cálculo de equipe e HH
```
HH_prof        = Quantidade / Produtividade_UN_h
HH_ajudante    = HH_prof × proporcao_ajudante
N_prof_prazo   = HH_prof / (prazo_requerido × 8)  → arredondar para cima (inteiro >= 1)
prazo_efetivo  = HH_prof / (N_prof × 8)
custo_base     = HH_prof × Vh_prof + HH_ajudante × Vh_ajudante
  (usar valores COM encargos para CLT; sem encargos para MEI)
```

### Cenários de produtividade
```
Mensalista: prod = produtividade_basica × 0,80
Ótima:      prod = produtividade_basica × 1,25
Prazo:      prod = produtividade_basica × 1,00  (SINAPI base)
  N_prof_prazo calculado para cumprir prazo_requerido
```

### Sistema de bônus (aplicar sobre o cenário selecionado)
```
C_SINAPI = HH_sinapi × Vh_prof + HH_ajudante_sinapi × Vh_ajudante
Economia = C_SINAPI - C_real   (só quando C_real < C_SINAPI)

Distribuição da economia:
  30% → desconto ao cliente
  70% → construtora + profissional
    56% da economia total → profissional  (0,80 × 0,70)
    14% da economia total → construtora   (0,20 × 0,70)

Bônus MEI  = S_base × 1,3 + 0,64 × Economia
  (0,64 = 0,80 × 0,80, conforme seção 6.5)
Bônus CLT  = custo_fixo_prazo_efetivo + participacao_economia

custo_final_MEI = HH_prof × Vh_prof_sem_enc × 1,3 + HH_ajudante × Vh_ajudante_com_enc + 0,64 × Economia
custo_final_CLT = custo_base_CLT + participacao_profissional

Bônus construtora = 0,14 × Economia

precoFinalMEI = custosDiretosMEI × 1,20   (BDI 20%)
precoFinalCLT = custosDiretosCLT × 1,20
```

### Custo de materiais e fallback de preços (seção 3.1 + 7.2)
```
C_mat_item = sum(coeficiente_i × preco_unitario_i, i=1..5)
C_mat_total = sum(C_mat_item para todos os serviços)
P_mat_final = C_mat_total × 1,20

REGRA DE FALLBACK: quando o preço do insumo não está disponível para a UF selecionada
(campo em branco na base SINAPI), usar o preço de SP como referência.
Registrar visualmente no resultado que aquele insumo usou preço de SP (%AS).
```

---

## Dados mockados — `lib/mockData.ts`

### Parâmetros globais (fixos)
```ts
const GLOBAL_PARAMS: GlobalParams = {
  bdi: 0.20, encargosPercentual: 1.6013, fatorEncargos: 2.6013,
  salarioQualificado: 2664.75, salarioMeioOficial: 2427.36, salarioServente: 2189.97,
  diariaSemEncargos: 121.125, diariaComEncargos: 193.96,
  valorMetaDiario: 220.00, premioMaximoMensal: 2175.25
}
```

### Configurações dos serviços (produtividade base SINAPI e proporção ajudante)
```ts
const SERVICE_CONFIG = {
  FUNDACAO:                       { unidade: 'M³', prodBasica: 0.12, propAjudante: 1.0, materialUnitario: 380 },
  ESTRUTURA_CONCRETO:             { unidade: 'M³', prodBasica: 0.08, propAjudante: 1.0, materialUnitario: 850 },
  ALVENARIA:                      { unidade: 'M²', prodBasica: 1.00, propAjudante: 0.5, materialUnitario: 45  },
  GRAUTE:                         { unidade: 'M³', prodBasica: 0.20, propAjudante: 1.0, materialUnitario: 420 },
  ARMACAO_VERTICAL_HORIZONTAL:    { unidade: 'KG', prodBasica: 8.00, propAjudante: 0.5, materialUnitario: 9   },
  CONTRAPISO:                     { unidade: 'M²', prodBasica: 1.50, propAjudante: 0.5, materialUnitario: 28  },
  REVESTIMENTO_ARGAMASSA_PAREDE:  { unidade: 'M²', prodBasica: 1.20, propAjudante: 0.5, materialUnitario: 18  },
  REVESTIMENTO_ARGAMASSA_TETO:    { unidade: 'M²', prodBasica: 0.80, propAjudante: 0.5, materialUnitario: 22  },
  REVESTIMENTO_CERAMICO:          { unidade: 'M²', prodBasica: 1.10, propAjudante: 0.5, materialUnitario: 75  },
  PINTURA_INTERNA:                { unidade: 'M²', prodBasica: 3.00, propAjudante: 0.3, materialUnitario: 12  },
  PINTURA_EXTERNA:                { unidade: 'M²', prodBasica: 2.50, propAjudante: 0.3, materialUnitario: 18  },
  LIMPEZA_INTERNA:                { unidade: 'M²', prodBasica: 8.00, propAjudante: 0.5, materialUnitario: 4   },
}
```

### Especificações por serviço
```ts
const SERVICE_SPECS = {
  FUNDACAO: {
    esp1: ['Sapata Corrida', 'Radier', 'Sapata Isolada', 'Estaca', 'Tubulão'],
    esp2: [], esp3: []
  },
  ESTRUTURA_CONCRETO: {
    esp1: ['Pilar', 'Viga', 'Laje', 'Parede de Concreto'],
    esp2: ['Armação', 'Forma', 'Concretagem'],
    esp3: []
  },
  ALVENARIA: {
    esp1: ['Alvenaria de Vedação', 'Alvenaria Estrutural'],
    esp2: ['Módulo 20 - Vertical/Horizontal', 'Módulo 15 - Vertical', 'Módulo 15 - Vertical/Horizontal', 'Módulo 20 - Horizontal', 'Módulo 15 - Horizontal'],
    esp3: ['Concreto', 'ESP 19', 'Cerâmico']
  },
  GRAUTE: {
    esp1: ['Vertical', 'Horizontal'],
    esp2: [], esp3: []
  },
  REVESTIMENTO_ARGAMASSA_PAREDE: {
    esp1: ['Gesso Liso', 'Massa Pronta', 'Emboço'],
    esp2: ['1,0 cm', '1,5 cm', '2,0 cm'],
    esp3: []
  },
  REVESTIMENTO_ARGAMASSA_TETO: {
    esp1: ['Gesso Liso', 'Massa Pronta'],
    esp2: ['1,0 cm', '1,5 cm'],
    esp3: []
  },
  REVESTIMENTO_CERAMICO: {
    esp1: ['Piso Interno', 'Parede Interna', 'Fachada', 'Área Externa', 'Piscina'],
    esp2: ['Cerâmica até 45x45', 'Porcelanato até 60x60', 'Porcelanato até 90x90'],
    esp3: []
  },
  PINTURA_INTERNA: {
    esp1: ['Selador Acrílico', 'Massa Corrida PVA', 'Tinta Acrílica'],
    esp2: [], esp3: []
  },
  PINTURA_EXTERNA: {
    esp1: ['Selador Acrílico', 'Textura Acrílica'],
    esp2: [], esp3: []
  },
  ARMACAO_VERTICAL_HORIZONTAL: {
    esp1: ['Vertical', 'Horizontal', 'Vertical e Horizontal'],
    esp2: ['CA-50', 'CA-60'],
    esp3: []
  },
}
```

---

## Estrutura de arquivos a criar/substituir

```
frontend/
  lib/
    storage.ts        ← único ponto de acesso ao localStorage
    mockData.ts       ← SERVICE_CONFIG, SERVICE_SPECS, GLOBAL_PARAMS, seed de cliente demo
    calculos.ts       ← todas as fórmulas acima (HH, cenários, bônus, materiais, totais)
    formatters.ts     ← formatCurrency, formatDate, formatArea, formatPercentual
  types/
    index.ts          ← reescrever com os tipos acima
  components/
    OrcamentoWizard.tsx     ← wizard de criação de orçamento (seleção de serviços)
    ServicoForm.tsx          ← form para um item de serviço (quantidade, specs, prazo, modalidade)
    ResultadoOrcamento.tsx   ← exibição do resultado calculado
    ItemResultadoCard.tsx    ← card de resultado por serviço (MEI vs CLT, 3 cenários)
    HistoricoOrcamentos.tsx  ← lista de orçamentos salvos
    OnboardingForm.tsx       ← formulário de cadastro do cliente (nome, telefone, email)
    Sidebar.tsx              ← sidebar simplificada (novo orçamento, histórico, sair)
  app/
    page.tsx          ← orquestrador principal com estado global
    globals.css       ← manter
    layout.tsx        ← manter estrutura, ajustar se necessário
```

---

## Fluxo de telas (UX) — CLIENTE

### 1. Onboarding (primeira vez — sem dados no localStorage)
- Tela de boas-vindas com campo nome completo, telefone, email
- Usar inputs padrão DaisyUI `fieldset` — conforme `rules.instructions.md`
- Salvar cliente no localStorage via `lib/storage.ts`
- Ir para tela principal após salvar

### 2. Tela principal — Dashboard do cliente
- Sidebar esquerda: "Novo Orçamento", "Meus Orçamentos", botão sair (limpar session)
- Área central: lista de orçamentos ou wizard quando novo orçamento ativo
- Exibir status de cada orçamento (rascunho / calculado)

### 3. Wizard de criação de orçamento — etapas:
**Etapa 1 — Informações gerais:**
- UF de referência (select com 27 estados; padrão SP)
- Modalidade padrão (MEI ou CLT) — pode ser sobrescrita por serviço
- Prazo global da obra (dias corridos) — pode ser sobrescrito por serviço

**Etapa 2 — Seleção de serviços:**
- Checkboxes com os 12 tipos de serviço disponíveis (usar nomes brasileiros)
- Para cada serviço selecionado: mostrar badge com quantidade
- Botão "Configurar serviços selecionados"

**Etapa 3 — Configuração de cada serviço (um por vez, ou scroll):**
Para cada serviço selecionado:
- Quantidade (número + unidade exibida automaticamente: M², M³)
- Especificação 1, 2, 3 (selects dinâmicos conforme SERVICE_SPECS — só mostrar se houver opções)
- Prazo requerido (dias corridos) — pré-preenchido com prazo global
- Modalidade (MEI / CLT) — pré-preenchida com modalidade padrão

**Etapa 4 — Resumo antes de calcular:**
- Listar todos os serviços configurados com quantidades e especificações
- Botão "Calcular Orçamento"

**Etapa 5 — Resultado:**
- Ver `ResultadoOrcamento` abaixo

### 4. Resultado do orçamento

**Card de totais gerais (seção 6.9):**
```
Custos Diretos MO — MEI      R$ XXXX,XX  |  Custos Diretos MO — CLT      R$ XXXX,XX
Custo Total Materiais         R$ XXXX,XX  |  (mesmo para MEI e CLT)
Custos Diretos Totais — MEI  R$ XXXX,XX  |  Custos Diretos Totais — CLT  R$ XXXX,XX
Custos Diretos/m² — MEI      R$  XXX,XX  |  Custos Diretos/m² — CLT      R$  XXX,XX
Preço Final c/ BDI — MEI     R$ XXXX,XX  |  Preço Final c/ BDI — CLT     R$ XXXX,XX
Preço/m² — MEI               R$  XXX,XX  |  Preço/m² — CLT               R$  XXX,XX
```
Usar padrão `CostBar` (CSS progress) para exibir proporção MO × Materiais × BDI visualmente.

**Por serviço — ItemResultadoCard:**
- Nome do serviço + especificações + quantidade + unidade
- Tabela dos 3 cenários de equipe (Mensalista 80%, Ótima 125%, Prazo 100% SINAPI):
  - Produtividade efetiva (UN/h e UN/dia)
  - HH profissional / HH ajudante
  - Qtd profissionais / ajudantes
  - Prazo efetivo (dias)
  - Custo base (R$)
  - Bônus estimado para o cenário (seção 6.7 — exibir Bônus Equipe Ótima e Bônus Equipe Prazo calculados; Mensalista possui bônus zero pois produtividade < SINAPI)
- Seção de bônus de performance (exibir sempre, mesmo quando Economia = 0):
  - C_SINAPI calculado (referência)
  - Economia gerada (C_SINAPI - C_real, mínimo R$0,00)
  - Distribuição: 30% cliente | 56% profissional | 14% construtora
  - Bônus MEI / Bônus CLT / Bônus Construtora (R$)
- Contratação — campos seção 6.8 (exibir para MEI e CLT em colunas paralelas):
  - Valor de Bônus de Produção (R$)
  - Valor Equivalente Total/UN c/ Bônus (R$/unidade)
  - Valor Mensal Esperado do Profissional (R$/mês)
  - Custo Final do Serviço (R$) — MEI vs CLT
- Custo de materiais do serviço (sum coeficientes × preços, indicar insumos com fallback SP)
- Preço final com BDI 20% — MEI e CLT (destacar em destaque visual)
- Toggle para expandir/colapsar detalhes (reaproveitando padrão StatRow do QuoteResultCard)

**Botão "Salvar Orçamento"** → salva no localStorage como `status: 'calculado'`

### 5. Histórico de orçamentos
- Lista com data, UF, número de serviços, status
- Botão para abrir/revisar cada orçamento
- Botão para duplicar orçamento
- Botão para excluir (com confirmação inline)

---

## Regras de implementação

- Nenhuma chamada de API (exceto `/api/health` já existente em `layout.tsx` ou `page.tsx`)
- Todo acesso a localStorage centralizado em `lib/storage.ts` com chaves tipadas
- Toda lógica de cálculo em `lib/calculos.ts` — componentes não calculam diretamente
- `lib/mockData.ts` exporta `GLOBAL_PARAMS`, `SERVICE_CONFIG`, `SERVICE_SPECS` como constantes
- Não usar `any` em TypeScript
- Sem comentários no código
- Sem testes
- Formatação monetária: `lib/formatters.ts` → `formatCurrency(value: number): string` usando `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`
- Ícones exclusivamente de `react-icons/md`
- Classes DaisyUI semânticas: `bg-base-100`, `text-base-content`, `btn-primary`, `card`, etc.
- Inputs SEMPRE no padrão:
  ```tsx
  <fieldset className="fieldset">
    <legend className="fieldset-legend">Label</legend>
    <input type="text" className="input" placeholder="..." />
  </fieldset>
  ```
- Selects no mesmo padrão `fieldset` com `<select className="select">`
- Feedback de loading/erro com classes DaisyUI (`loading`, `alert alert-error`)

---

## Seed de dados demo

Em `lib/mockData.ts`, exportar `SEED_CLIENTE` e `SEED_ORCAMENTO` para popular localStorage na primeira vez:

```ts
// Cliente demo (usado se localStorage estiver vazio e houver query param ?demo=1)
export const SEED_CLIENTE: Cliente = {
  id: 'demo-001', nome: 'João Silva', telefone: '(11) 98765-4321',
  email: 'joao@email.com', dataCadastro: '2026-01-15'
}

// Orçamento demo com 3 serviços (Alvenaria 120m², Contrapiso 120m², Pintura Interna 240m²)
// já calculado, para o cliente ver como fica o resultado
```

---

## Resultado esperado

Ao final, o cliente deve conseguir:
1. Cadastrar-se (onboarding)
2. Criar um orçamento selecionando qualquer combinação dos 12 serviços
3. Configurar quantidades, especificações, prazo e modalidade por serviço
4. Ver o resultado calculado com os 3 cenários de equipe, bônus de performance, custo de materiais e preço final com BDI para MEI e CLT
5. Salvar o orçamento e consultá-lo no histórico

O cálculo deve usar EXATAMENTE as fórmulas descritas neste prompt — fatorEncargos 2,6013; bônus MEI = S_base × 1,3 + 0,64 × Economia; bônus construtora = 0,14 × Economia; BDI = 20%.
