# Atualização do documento `fluxo_usuarios_v2.docx`

## Objetivo

Atualizar o documento `fluxo_usuarios_v2.docx` para refletir todas as mudanças de fluxo de usuário implementadas nos commits posteriores à sua criação (commit `64adc05`, 17/04/2026).

O documento atual (`fluxo_usuarios_v2.docx`) descreve o fluxo dos dois perfis — cliente e engenheiro — até a entrega do orçamento. As seções abaixo listam as mudanças que devem ser incorporadas.

---

## Grupo 1 — Mudanças no fluxo do cliente (commit `a24c559`, 20/04/2026)

### 1.1 Login e cadastro substituídos por fluxo conversacional

**Antes:** o cliente acessava um formulário estático (`LoginPage`) para informar nome, telefone e e-mail antes de iniciar a cotação.

**Depois:** o cliente passa por um fluxo conversacional guiado (`OnboardingChatFlow`) com as seguintes fases em sequência:
1. **NOME** — assistente pergunta o nome do cliente
2. **TELEFONE** — assistente pergunta o telefone
3. **EMAIL** — assistente pergunta o e-mail
4. **CONFIRMAÇÃO** — exibe um card resumo com os dados e botão "Confirmar e continuar"

O mesmo componente opera em modo `edicao` quando o cliente acessa "Meu perfil" — todos os campos são pré-preenchidos com os dados atuais e o cliente pode alterar individualmente.

Atualizar a seção **1. Primeiro Contato e Captação** e **2. Reunião de Levantamento** para refletir que o cadastro digital é feito de forma conversacional, não via formulário.

### 1.2 Edição de orçamento já criado

**Antes:** não havia como editar um orçamento depois de criado.

**Depois:** o cliente pode editar os parâmetros de um orçamento em qualquer um dos estados `rascunho` ou `aguardando_engenheiro`, clicando no botão "Editar informações".

Ao editar, abre-se o `OrcamentoEditModal`, que exibe os parâmetros atuais do orçamento divididos em dois grupos:

**Grupo A — Parâmetros fundamentais (terreno, quartos, UF, modalidade):**
- Se algum desses for alterado, o orçamento é invalidado: status volta a `rascunho`, planta e opcionais são resetados, e o fluxo de cotação (`OrcamentoChatFlow`) é reiniciado a partir da fase `PLANTA`

**Grupo B — Parâmetros de especificação (planta, opcionais, personalizações):**
- Podem ser editados sem reiniciar o fluxo do início. O orçamento é recalculado com os novos dados sem perda dos parâmetros fundamentais.

Adicionar uma nova sub-seção **3.1 — Edição de Orçamento** descrevendo esse fluxo com o seguinte mapa:

```
Cliente acessa "Meus Orçamentos" → seleciona um orçamento → clica "Editar informações"
→ abre OrcamentoEditModal
→ se alterar terreno/quartos/UF/modalidade:
     → orçamento invalidado → fluxo reinicia da fase PLANTA
→ se alterar apenas planta/opcionais/personalizações:
     → orçamento atualizado sem reinício → saída recalculada
→ fecha modal → orçamento atualizado salvo
```

### 1.3 Retomada de orçamento em rascunho

**Antes:** orçamentos em `rascunho` com parâmetros já preenchidos não tinham forma de continuar de onde pararam.

**Depois:** ao selecionar um orçamento em `rascunho` que já possui `parametros`, o sistema carrega o `OrcamentoChatFlow` a partir da fase `PLANTA` (fase de seleção de planta arquitetônica), com terreno, quartos, modalidade e UF já preenchidos. O cliente retoma a cotação de onde parou.

Adicionar essa lógica na seção **2. Reunião de Levantamento**, como nota: "Orçamentos interrompidos podem ser retomados a qualquer momento a partir do ponto onde o cliente parou."

### 1.4 Botão "Editar informações" na tela de aguardo

Quando um orçamento está com status `aguardando_engenheiro`, a tela de aguardo exibe:
- Se já existe faixa de cotação calculada: o card com os valores estimados + botão "Editar informações"
- Se ainda não existe faixa: spinner de carregamento + botão "Editar informações"

O botão abre o `OrcamentoEditModal` descrito em 1.2.

Adicionar na seção **3. O que o Cliente Vê Durante o Processo** a informação de que o cliente pode editar o orçamento mesmo enquanto aguarda o engenheiro.

---

## Grupo 2 — Mudanças no fluxo do engenheiro (implementação atual — não commitada)

### 2.1 Novo modelo de trabalho: wizard por orçamento

**Antes:** o fluxo do engenheiro era modular e independente — cada ferramenta (CalculadoraMO, ConsultaComposicao, etc.) funcionava de forma autônoma, sem vínculo explícito com um orçamento específico de cliente.

**Depois:** o fluxo do engenheiro é conduzido por um wizard contextual por orçamento. O engenheiro:
1. Acessa "Orçamentos" no sidebar
2. Seleciona um orçamento com status `aguardando_engenheiro` e clica em "Iniciar análise"
3. O sistema abre o `OrcamentoWizard` em tela cheia, que guia o engenheiro pelas etapas E2 → E6

O wizard exibe no cabeçalho:
- Identificação do cliente (`clienteId`), UF e nome da planta
- Badge de status do orçamento
- Botão "Voltar à lista"

O stepper horizontal mostra o progresso: **E2 → E3 → E4 → E5 → E6** com estados visuais distintos (concluída, ativa, pendente, bloqueada).

Atualizar integralmente as seções **6 a 8** da Parte II para refletir esse novo modelo de trabalho.

### 2.2 Novo sidebar do engenheiro — 3 seções

O sidebar do engenheiro está organizado em três seções:

**TRABALHAR EM ORÇAMENTO:**
- Orçamentos (lista de orçamentos de clientes) — acesso ao wizard

**FERRAMENTAS DE CONSULTA:**
- Tabela SINAPI
- Consulta de Composição
- Composições Analíticas
- Composições Profissionais

**GESTÃO:**
- Parâmetros Globais
- Gestão de Plantas
- Painel Geral

Atualizar a seção **6. Visão Geral do Fluxo Técnico** para listar as ferramentas disponíveis e a separação entre "trabalho por orçamento" e "ferramentas de apoio".

### 2.3 Etapa E2 — Levantamento de Quantitativos (dentro do wizard)

Dentro do wizard, a E2 exibe os serviços gerados automaticamente pela planta selecionada pelo cliente. O engenheiro:
- Confirma as quantidades de cada serviço
- Seleciona as especificações técnicas (por dropdown)
- Confirma a modalidade de contratação (MEI ou CLT) por serviço
- O código de composição SINAPI é derivado automaticamente das especificações

Status de progresso: o wizard não avança para a E3 enquanto houver serviços sem composição SINAPI definida.

Adicionar sub-seção **8.3 — Comportamento no Wizard** na seção E2.

### 2.4 Etapa E3 — Revisão de Preços dos Insumos

O objetivo da E3 é verificar e confirmar os preços dos insumos para a UF do orçamento. Os insumos são carregados automaticamente da base ISE SINAPI pelos códigos de composição definidos na E2.

Para cada serviço, o engenheiro vê:
- Lista de insumos com coeficiente técnico e preço mediano ISE para a UF
- Campos editáveis de preço
- Destaque visual para insumos sem preço coletado na UF (fallback São Paulo)
- Subtotal calculado em tempo real: `Custo = Quantidade × Σ(coeficiente_i × preço_i)`

Os preços confirmados na E3 alimentam diretamente o cálculo de materiais da E5.

Atualizar a seção **E3** para refletir que a consulta é automática (não manual) e que o objetivo é revisão/correção de preços, não pesquisa de composições.

### 2.5 Etapa E4 — Cálculo do Custo de Mão de Obra

O engenheiro escolhe um cenário de equipe para cada serviço. Três cenários são apresentados lado a lado como cards:
- **Cenário 1 — Mensalista:** 80% da produtividade SINAPI
- **Cenário 2 — Equipe Ótima:** 125% da produtividade SINAPI (menor custo unitário de MO)
- **Cenário 3 — Equipe Prazo:** produtividade ajustada para cumprir o prazo requerido informado no E2

Para cada cenário, são exibidos:
- Número de profissionais e ajudantes
- Prazo efetivo
- Custo base
- Projeção de bônus de performance (`Economia = Custo SINAPI - Custo Real`)
- Distribuição do bônus: cliente 30%, profissional 56%, construtora 14%
- Remuneração estimada do profissional em MEI e CLT

O engenheiro clica em um cenário para selecioná-lo como a escolha para aquele serviço.

Atualizar a seção **E4** para incluir a lógica dos três cenários e do sistema de bônus de performance.

### 2.6 Etapa E5 — Cálculo do Custo de Materiais

Utiliza os coeficientes da E3 e as quantidades da E2 para calcular o custo total de materiais por serviço.

Fórmula:
```
Custo Mat. = Quantidade × Σ (coeficiente_i × valorUnitário_i)
```

O engenheiro revisa o cálculo por serviço e salva.

### 2.7 Etapa E6 — Precificação Final e Entrega

A E6 consolida os custos e forma o preço final. É dividida em quatro blocos:

**Bloco 1 — Consolidação dos custos diretos:**
- Tabela por serviço: custo MO MEI, custo MO CLT, custo materiais, custo total
- 7 cards de custo: Custo Direto MEI, Custo Direto CLT, Custo Mat. Total, Custo Direto/m² MEI, Custo Direto/m² CLT, Bônus Construtora, Preço Final (com BDI 20%)

**Bloco 2 — Cronograma físico-financeiro:**
- Engenheiro define as fases da obra com mês de início, mês de fim e percentual de custo
- Gráfico de barras (SVG) mostrando o fluxo de caixa mensal: valor nominal e valor corrigido pelo INCC

**Bloco 3 — Comparação MEI × CLT:**
- Dois cards lado a lado: Preço Final MEI e Preço Final CLT
- Delta entre as duas modalidades com badge de recomendação

**Bloco 4 — Saídas para o cliente:**
- Valor mínimo de entrada (AA)
- Parcela mensal ao banco (sistema Price)
- Tabela de aportes mensais
- Botão "Entregar ao cliente" — exibe modal de confirmação e, ao confirmar, muda o status do orçamento para `entregue` e salva as saídas no orçamento do cliente

Atualizar a seção **E6** para refletir esse fluxo de 4 blocos.

### 2.8 Status dos orçamentos no engenheiro

Adicionar uma tabela de estados na seção **6. Visão Geral do Fluxo Técnico**:

| Status | Descrição | Ação disponível |
|---|---|---|
| `aguardando_engenheiro` | Cliente concluiu o levantamento dos 5 parâmetros | Iniciar análise → entra no wizard |
| `em_calculo` | Engenheiro está trabalhando no orçamento | Retomar → volta à etapa onde parou |
| `entregue` | Engenheiro entregou o resultado ao cliente | Reabrir → volta ao status `em_calculo` |
| `calculado` | Orçamento calculado (estado legado) | Entrar no wizard |

### 2.9 Resumo dos parâmetros do cliente no wizard

O wizard exibe no início de cada etapa um card colapsível com os 5 parâmetros do cliente:
1. Terreno: área (m²), frente (m), tipo de solo, modalidade de financiamento
2. Quartos
3. Planta: nome, área (m²), tempo de obra (meses)
4. Opcionais selecionados
5. Personalizações

Isso garante que o engenheiro tenha contexto completo durante todo o fluxo de cálculo.

---

## Resumo das seções a atualizar no documento

| Seção atual | Atualização necessária |
|---|---|
| 1. Primeiro Contato e Captação | Descrever o fluxo conversacional de cadastro (OnboardingChatFlow) |
| 2. Reunião de Levantamento | Adicionar sub-seção sobre retomada de orçamentos interrompidos |
| 3. O que o Cliente Vê Durante o Processo | Adicionar botão "Editar informações" na tela de aguardo |
| 3.1 (nova seção) | Edição de orçamento já criado — modal e lógica de invalidação |
| 5. Mapa do Fluxo do Cliente | Atualizar com os novos estados e possibilidades |
| 6. Visão Geral do Fluxo Técnico | Descrever o novo modelo wizard + tabela de status |
| 7. Etapa E1 | Sem alterações |
| 8. Etapa E2 | Adicionar comportamento no wizard: auto-geração de serviços, confirmação de specs |
| E3 (nova descrição) | Revisão de preços de insumos — automático, não consulta manual |
| E4 (nova descrição) | Três cenários de equipe com bônus de performance |
| E5 (nova descrição) | Cálculo de materiais com fórmula |
| E6 (nova descrição) | Quatro blocos: consolidação, cronograma, comparação MEI/CLT, entrega |
| (nova seção) | Sidebar do engenheiro — 3 seções |
| (nova seção) | Resumo dos parâmetros do cliente no wizard |

---

## Instruções para geração do documento atualizado

1. Manter o estilo, formatação e linguagem do documento original (PT-BR, sem emojis, objetivo, sem jargão técnico desnecessário)
2. Preservar todas as seções que não foram alteradas
3. Numerar as etapas do engenheiro de E1 a E6 como no original
4. Tabelas de campos devem seguir o mesmo padrão do documento original
5. Fluxos de usuário devem ser representados como mapas de etapas (tabela: Etapa | O que acontece | Quem age | Saída)
6. Salvar o documento atualizado como `fluxo_usuarios_v3.docx` e manter o original `fluxo_usuarios_v2.docx` inalterado
