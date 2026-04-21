---
agent: 'agent'
description: 'Melhoria UX/UI completa de todas as etapas do fluxo do engenheiro (E1 a E6)'
model: Claude Sonnet 4.6 (copilot)
---


# Melhoria UX/UI completa do fluxo do engenheiro — E1 a E6

## Contexto

O wizard do engenheiro (`OrcamentoWizard`) guia o engenheiro pelas etapas E2 → E6. A etapa E1 existe fora do wizard, como configuração global (`ParametrosGlobais`). Todas as etapas sofrem de problemas de usabilidade que precisam ser corrigidos.

Problemas identificados por etapa:
- **E1 — Parâmetros Globais:** grupos de encargos editáveis sem contexto. Sem explicação sobre o que cada grupo é nem sobre o impacto dos valores. Sem indicador de quais parâmetros foram alterados em relação ao padrão.
- **E2 — Quantitativos:** tabela crua de 10 colunas. Engenheiro precisa digitar código SINAPI e escolher CP manualmente entre 43 opções sem filtro. Sem orientação sobre o que preencher.
- **E3 — Composições SINAPI:** nome não explica o objetivo. Parece ferramenta avulsa de consulta. Em modo wizard, insumos não são carregados automaticamente. Fallback SP não é explicado.
- **E4 — Mão de Obra:** formulário de entrada com 5 campos numéricos técnicos sem explicação. O botão "Calcular" exige ação separada — deveria ser automático. Sem orientação sobre os três cenários e o bônus de performance.
- **E5 — Materiais:** campos de código SINAPI editáveis desnecessariamente quando já vieram do E3. Sem explicação da fórmula. Sem conexão visual com o E3.
- **E6 — Precificação Final:** quatro blocos sem separação semântica clara. Cronograma de fases sem orientação. Botão "Entregar" não comunica o impacto (status muda, cliente recebe dados). Modal de confirmação vago.

A metodologia completa está em `metodologia_orcamentaria_v2_integral.docx`. Todos os cálculos devem seguir rigorosamente esse documento.

---

## Regras obrigatórias

- Sem emojis, sem comentários no código
- Escrever em Português Brasileiro
- DaisyUI v5: tokens semânticos (`bg-base-100`, `badge-warning`, `alert-error`, etc.)
- Apenas `react-icons/md` para ícones
- Padrão de input obrigatório:
  ```tsx
  <fieldset className="fieldset">
    <legend className="fieldset-legend">Rótulo</legend>
    <input ... />
  </fieldset>
  ```
- O menor número de arquivos e linhas possível
- Lógica repetida deve usar utils ou componentes

---

## Tarefa 0 — Dados de apoio em `frontend/lib/mockData.ts` e `frontend/types/index.ts`

### 0.1 Tipo `SINAPIMapping` em `types/index.ts`

```ts
export interface SINAPIMapping {
  esp1: string
  esp2?: string
  esp3?: string
  composicaoBasica: string
  cpIds: number[]
  prazoRequeridoPadrao: number
}
```

### 0.2 Constante `SERVICE_SINAPI_MAP` em `mockData.ts`

Mapeia cada combinação `serviceType + especificações` para código SINAPI e CPs. Exportar como `Partial<Record<ServiceType, SINAPIMapping[]>>`.

Preencher com base nas composições da seção 5.3 e na tabela CP da seção 7 do documento de metodologia:

```ts
export const SERVICE_SINAPI_MAP: Partial<Record<ServiceType, SINAPIMapping[]>> = {
  FUNDACAO: [
    { esp1: 'Sapata Corrida',  composicaoBasica: '104924', cpIds: [],  prazoRequeridoPadrao: 10 },
    { esp1: 'Radier',          composicaoBasica: '97083',  cpIds: [],  prazoRequeridoPadrao: 8  },
    { esp1: 'Sapata Isolada',  composicaoBasica: '104924', cpIds: [],  prazoRequeridoPadrao: 8  },
  ],
  ALVENARIA: [
    { esp1: 'Alvenaria Estrutural', esp2: 'Módulo 20 - Vertical/Horizontal', esp3: 'Concreto',  composicaoBasica: '89288',  cpIds: [15], prazoRequeridoPadrao: 20 },
    { esp1: 'Alvenaria Estrutural', esp2: 'Módulo 20 - Horizontal',          esp3: 'Concreto',  composicaoBasica: '89288',  cpIds: [15], prazoRequeridoPadrao: 20 },
    { esp1: 'Alvenaria Estrutural', esp2: 'Módulo 15 - Vertical',            esp3: 'Concreto',  composicaoBasica: '104442', cpIds: [16], prazoRequeridoPadrao: 20 },
    { esp1: 'Alvenaria Estrutural', esp2: 'Módulo 15 - Vertical/Horizontal', esp3: 'Cerâmico',  composicaoBasica: '89289',  cpIds: [17], prazoRequeridoPadrao: 20 },
    { esp1: 'Alvenaria Estrutural', esp2: 'Módulo 15 - Horizontal',          esp3: 'Cerâmico',  composicaoBasica: '89290',  cpIds: [18], prazoRequeridoPadrao: 20 },
    { esp1: 'Alvenaria de Vedação', esp2: 'Módulo 20 - Vertical/Horizontal', esp3: 'Cerâmico',  composicaoBasica: '103346', cpIds: [20], prazoRequeridoPadrao: 25 },
    { esp1: 'Alvenaria de Vedação', esp2: 'Módulo 15 - Vertical/Horizontal', esp3: 'Cerâmico',  composicaoBasica: '103368', cpIds: [19], prazoRequeridoPadrao: 25 },
  ],
  GRAUTE: [
    { esp1: 'Vertical',   composicaoBasica: '89993', cpIds: [21], prazoRequeridoPadrao: 5 },
    { esp1: 'Horizontal', composicaoBasica: '89995', cpIds: [22], prazoRequeridoPadrao: 5 },
  ],
  CONTRAPISO: [
    { esp1: '', composicaoBasica: '87622', cpIds: [], prazoRequeridoPadrao: 8 },
  ],
  REVESTIMENTO_ARGAMASSA_PAREDE: [
    { esp1: 'Gesso Liso',   esp2: '1,0 cm', composicaoBasica: '87421', cpIds: [39], prazoRequeridoPadrao: 15 },
    { esp1: 'Massa Pronta', esp2: '1,5 cm', composicaoBasica: '87421', cpIds: [39], prazoRequeridoPadrao: 15 },
    { esp1: 'Emboço',       esp2: '2,0 cm', composicaoBasica: '87421', cpIds: [39], prazoRequeridoPadrao: 15 },
  ],
  REVESTIMENTO_ARGAMASSA_TETO: [
    { esp1: 'Gesso Liso',   esp2: '1,0 cm', composicaoBasica: '87414', cpIds: [40], prazoRequeridoPadrao: 12 },
    { esp1: 'Massa Pronta', esp2: '1,5 cm', composicaoBasica: '87414', cpIds: [40], prazoRequeridoPadrao: 12 },
  ],
  REVESTIMENTO_CERAMICO: [
    { esp1: 'Piso Interno',   esp2: 'Cerâmica até 45x45',    composicaoBasica: '87257',  cpIds: [11], prazoRequeridoPadrao: 15 },
    { esp1: 'Piso Interno',   esp2: 'Porcelanato até 60x60', composicaoBasica: '87263',  cpIds: [11], prazoRequeridoPadrao: 15 },
    { esp1: 'Piso Interno',   esp2: 'Porcelanato até 90x90', composicaoBasica: '104958', cpIds: [12], prazoRequeridoPadrao: 15 },
    { esp1: 'Parede Interna', esp2: 'Cerâmica até 45x45',    composicaoBasica: '87257',  cpIds: [4],  prazoRequeridoPadrao: 15 },
    { esp1: 'Parede Interna', esp2: 'Porcelanato até 60x60', composicaoBasica: '87263',  cpIds: [4],  prazoRequeridoPadrao: 15 },
  ],
  PINTURA_INTERNA: [
    { esp1: 'Selador Acrílico',  composicaoBasica: '88485', cpIds: [7],  prazoRequeridoPadrao: 5 },
    { esp1: 'Massa Corrida PVA', composicaoBasica: '88495', cpIds: [8],  prazoRequeridoPadrao: 8 },
    { esp1: 'Tinta Acrílica',    composicaoBasica: '88489', cpIds: [10], prazoRequeridoPadrao: 8 },
  ],
  PINTURA_EXTERNA: [
    { esp1: 'Selador Acrílico', composicaoBasica: '88415', cpIds: [2], prazoRequeridoPadrao: 5 },
    { esp1: 'Textura Acrílica', composicaoBasica: '88423', cpIds: [3], prazoRequeridoPadrao: 8 },
  ],
}
```

Função utilitária:

```ts
export function resolverSINAPI(
  serviceType: ServiceType,
  esp1: string,
  esp2?: string,
  esp3?: string
): SINAPIMapping | null {
  const opcoes = SERVICE_SINAPI_MAP[serviceType] ?? []
  return opcoes.find(m =>
    (!m.esp1 || m.esp1 === esp1) &&
    (!m.esp2 || m.esp2 === esp2) &&
    (!m.esp3 || m.esp3 === esp3)
  ) ?? null
}
```

### 0.3 Constante `SERVICE_HELP` em `mockData.ts`

```ts
export const SERVICE_HELP: Partial<Record<ServiceType, string>> = {
  FUNDACAO: 'Estrutura que transfere o peso da construção para o solo. O tipo depende das características do solo e da carga da obra.',
  ESTRUTURA_CONCRETO: 'Pilares, vigas e lajes que formam o esqueleto resistente da edificação.',
  ALVENARIA: 'Paredes construídas com blocos. Podem ser estruturais (suportam carga) ou de vedação (apenas fechamento de ambiente).',
  GRAUTE: 'Concreto fluido que preenche os furos dos blocos de alvenaria estrutural, aumentando a resistência à compressão.',
  CONTRAPISO: 'Camada de regularização sobre a laje, preparando a base para pisos e revestimentos.',
  REVESTIMENTO_ARGAMASSA_PAREDE: 'Acabamento das paredes internas com gesso, massa pronta ou emboço. Define a textura final antes da pintura.',
  REVESTIMENTO_ARGAMASSA_TETO: 'Acabamento do teto com gesso ou massa. Nivela e prepara a superfície para pintura.',
  REVESTIMENTO_CERAMICO: 'Aplicação de cerâmica ou porcelanato em pisos e paredes. O formato e o local determinam a composição SINAPI.',
  PINTURA_INTERNA: 'Sequência de produtos aplicados internamente: selador (fixação) → massa corrida (regularização) → tinta (acabamento).',
  PINTURA_EXTERNA: 'Proteção e acabamento das fachadas externas: selador (fixação) → textura acrílica (proteção e visual).',
  LIMPEZA_INTERNA: 'Limpeza final da obra antes da entrega ao cliente.',
}
```

---

## Tarefa 1 — `ParametrosGlobais.tsx` (E1)

### Problema atual

Grupos de encargos editáveis sem contexto. Sem explicação sobre impacto dos valores. Sem indicador de parâmetros alterados.

### Novo comportamento

**Banner contextual fixo no topo:**
```
Card bg-base-200:
"Estes parâmetros são globais — afetam todos os orçamentos do sistema.
Altere apenas se houver mudança na legislação trabalhista, tabela SINAPI
ou nas condições operacionais da empresa."
```

**Seção BDI e Metas — subtexto abaixo de cada campo:**
- BDI: `"Percentual aplicado sobre o custo direto para formar o preço de venda. Cobre estrutura administrativa, impostos e margem. Padrão: 20%"`
- Meta Diária: `"Valor de produção diária que ativa o bônus de performance. Padrão: R$ 220,00"`

Usar `<p className="label">` do padrão fieldset para os subtextos.

**Seção Salários — nota contextual:**
`"Salário base mensal por categoria (Fev/2026, regime desonerado). Custo real = Salário × {fatorEncargos.toFixed(4)}."`

**Select de UF — badge ao lado:**
`<span className="badge badge-ghost text-xs">Ref. SINAPI: Jan/2026</span>`

**Grupos de encargos — título explicativo acima de cada grupo:**
- Grupo A: `"Encargos obrigatórios recolhidos mensalmente (INSS, FGTS, SESI, SENAI, etc.)"`
- Grupo B: `"Direitos sobre dias não trabalhados ou com remuneração especial (férias, feriados, 13º, etc.)"`
- Grupo C: `"Calculado automaticamente: A × B = {grupoC.toFixed(2)}% — não editável"`
- Grupo D: `"Provisões para rescisão contratual (aviso prévio, FGTS multa, etc.)"`
- Grupo D': `"Ajuste automático de FGTS sobre aviso prévio — não editável"`
- Grupo E: `"Outros benefícios: alimentação, transporte, EPI, seguro de vida"`

**Consolidado ao final da seção de encargos:**
```tsx
<p className="font-mono text-sm">
  Total: {totalGeral.toFixed(2)}% → Fator: {fatorEncargos.toFixed(4)}
</p>
<p className="font-mono text-xs text-base-content/50">
  Custo Real MO = Salário Base × {fatorEncargos.toFixed(4)}
</p>
```

**Badge de alteração:** quando um campo numérico difere do valor em `GLOBAL_PARAMS`, adicionar `<span className="badge badge-warning badge-xs ml-1">alterado</span>` ao lado da `fieldset-legend`.

---

## Tarefa 2 — `QuantitativosServico.tsx` (E2)

### Problema atual

Tabela de 10 colunas. Engenheiro digita SINAPI e CP manualmente.

### Novo comportamento

**Título:** `E2 — Serviços da Obra`

**Banner contextual:**
```
Card bg-base-200:
"A planta '{nome}' gerou {N} serviços abaixo. Confirme as quantidades,
selecione as especificações de cada serviço e o código SINAPI será
identificado automaticamente. Todos os serviços precisam estar
configurados para avançar."
```

**Barra de progresso:**
```tsx
<p className="text-xs text-base-content/50">{confirmados} de {total} serviços com composição definida</p>
<progress className="progress progress-primary w-full" value={confirmados} max={total} />
```

**Layout:** substituir tabela por cards empilhados, agrupados por seção construtiva:
- Grupo 1 — Fundação e Estrutura: `FUNDACAO`, `ESTRUTURA_CONCRETO`
- Grupo 2 — Alvenaria e Reforço: `ALVENARIA`, `GRAUTE`, `ARMACAO_VERTICAL_HORIZONTAL`
- Grupo 3 — Pisos: `CONTRAPISO`, `REVESTIMENTO_CERAMICO`
- Grupo 4 — Revestimentos: `REVESTIMENTO_ARGAMASSA_PAREDE`, `REVESTIMENTO_ARGAMASSA_TETO`
- Grupo 5 — Pintura e Limpeza: `PINTURA_INTERNA`, `PINTURA_EXTERNA`, `LIMPEZA_INTERNA`

Cabeçalho de grupo: `<p className="text-xs font-semibold text-base-content/50 uppercase tracking-wide mt-2">`.

**Cada card de serviço contém:**

```
[SERVICE_LABELS[type]]  [badge origem]
[SERVICE_HELP[type] — parágrafo sempre visível, text-xs text-base-content/50]

fieldset Quantidade + unidade readonly + fieldset Modalidade MEI/CLT

[se SERVICE_SPEC_OPTIONS[type].esp1:]
  fieldset "SERVICE_SPEC_LABELS[type].esp1": select com opções

[se SERVICE_SPEC_OPTIONS[type].esp2:]
  fieldset "SERVICE_SPEC_LABELS[type].esp2": select com opções

[se SERVICE_SPEC_OPTIONS[type].esp3:]
  fieldset "SERVICE_SPEC_LABELS[type].esp3": select com opções

Composição SINAPI:
  [se resolvida:] badge badge-info "{composicaoBasica}"  badge badge-ghost "CP {cpId}"
  [se não:] <p className="alert alert-warning text-xs">Selecione as especificações para identificar a composição SINAPI</p>

fieldset "Prazo requerido (dias)": input numérico pré-preenchido de SINAPIMapping.prazoRequeridoPadrao

[botão "Remover" apenas para origem PERSONALIZACAO]
```

**Auto-preenchimento:** ao alterar esp1/esp2/esp3, chamar `resolverSINAPI(type, esp1, esp2, esp3)` e atualizar `row.composicaoBasica`, `row.composicaoProfissionalId` e `row.prazoRequerido`.

**Select de CP quando não resolvido:** exibir `select` filtrado por categoria do serviço. Quando resolvido, exibir badge readonly.

**Validação:** footer do wizard só habilita "Próxima etapa" quando `pendentes.length === 0`.

**Adicionar serviço:** botão abre card inline no final da lista com select de serviceType + campos de spec.

---

## Tarefa 3 — `ConsultaComposicao.tsx` (E3)

### Problema atual

Nome não explica o objetivo. Insumos não carregam automaticamente em wizard. Fallback SP sem explicação.

### Novo comportamento

**Título em modo wizard:** `E3 — Preços dos Insumos`

**Banner contextual:**
```
Card bg-base-200:
"Os insumos de cada serviço são carregados automaticamente da base SINAPI ({UF}).
Verifique se os preços refletem a realidade da sua região e edite quando necessário.
Estes preços alimentam o cálculo de materiais na etapa E5.
Fórmula: Custo = Quantidade × Σ (coeficiente × preço)"
```

**Barra de progresso:**
```tsx
<p className="text-xs text-base-content/50">{confirmados} de {total} serviços com preços confirmados</p>
<progress className="progress progress-success w-full" value={confirmados} max={total} />
```

**Carregamento automático:** ao entrar no wizard, `useEffect` carrega o primeiro serviço pendente sem interação do engenheiro.

**Tabs de serviços:** serviços sem composição exibem `badge-error` com texto `"Sem composição (E2)"`. Serviços confirmados exibem `MdCheckCircle` verde.

**Tabela de insumos — novas colunas:** adicionar `Custo/UN` (`coeficiente × preço`) e `Total` (`coeficiente × preço × quantidade`), calculadas em tempo real.

**Regras visuais por linha:**
- Fallback SP: `className="bg-warning/10"`, badge `badge-warning badge-xs` com texto `SP`, e abaixo do campo: `<p className="label">Sem pesquisa em {UF} neste período — usando SP como referência</p>`
- Preço zerado: `className="bg-error/10"`, badge `badge-error badge-xs` com texto `Sem preço`

**Abaixo da tabela:**
```tsx
<p className="text-xs text-base-content/50 font-mono">
  Custo total: {quantidade} {unidade} × Σ(coef × preço) = {formatCurrency(subtotal)}
</p>
<p className="text-xs text-base-content/50">
  Custo unitário: {formatCurrency(subtotal / quantidade)} / {unidade}
</p>
```

**Modo standalone** (sem wizard): manter formulário de busca manual. Título: `Consulta de Composição com Custo`.

---

## Tarefa 4 — `CalculadoraMO.tsx` (E4)

### Problema atual

5 campos numéricos técnicos sem explicação. Botão "Calcular" separado. Sem orientação sobre cenários e bônus.

### Novo comportamento

**Título:** `E4 — Custo de Mão de Obra`

**Banner contextual:**
```
Card bg-base-200:
"Para cada serviço, o sistema calcula três cenários de equipe com base na
produtividade SINAPI. Selecione o cenário que melhor equilibra custo e prazo.
O cenário Ótimo minimiza o custo de mão de obra por unidade."
```

**Barra de progresso:**
```tsx
<p className="text-xs text-base-content/50">{salvos} de {total} serviços com cenário salvo</p>
<progress className="progress progress-primary w-full" value={salvos} max={total} />
```

**Pré-preenchimento automático em modo wizard:** ao selecionar um serviço, carregar `produtividadeBasica` e `rsUN` da `COMPOSICOES_PROFISSIONAIS[cpId]`, e `prazoRequerido` do `QuantitativoServico.prazoRequerido`. Exibir os campos pré-preenchidos — editáveis para ajuste, mas não em branco.

**Subtextos dos campos (via `<p className="label">`):**
- `produtividadeBasica`: `"Velocidade de referência oficial do SINAPI para este serviço"`
- `adicionalProdutividade`: `"0% = ritmo SINAPI. 30% = 30% acima do SINAPI (cenário Ótimo)."`
- `proporcaoAjudante`: `"Número de ajudantes por profissional qualificado. Ex: 0,5 = 1 ajudante para 2 profissionais."`
- `rsUN`: `"Custo por unidade segundo o SINAPI — base para calcular a economia e o bônus."`
- `prazoRequerido`: `"Prazo máximo disponível para executar este serviço (dias corridos)."`

**Cálculo automático:** substituir botão "Calcular" por `useEffect` com debounce de 400ms acionado ao mudar qualquer campo de configuração. Manter botão apenas como fallback (texto: "Recalcular").

**Subtextos nos cenários (dentro de `CenarioCard`):**
- Mensalista: `<p className="text-xs text-base-content/40">80% do SINAPI — ritmo conservador. Base de comparação.</p>`
- Ótima: `<p className="text-xs text-base-content/40">125% do SINAPI — menor custo por unidade. Recomendado para empreita.</p>`
- Prazo: `<p className="text-xs text-base-content/40">Equipe dimensionada para cumprir {prazoRequerido} dias.</p>`

**Seção Bônus — texto introdutório antes das barras:**
```tsx
<p className="text-xs text-base-content/50">
  Quando o custo real é menor que o SINAPI, a diferença (economia) é distribuída:
</p>
```

Após cada barra, adicionar a fórmula em `text-xs text-base-content/40`:
- Cliente 30%: `"Desconto no preço final — repasse ao contratante"`
- Profissional 56%: `"0,80 × 0,70 × Economia"`
- Construtora 14%: `"0,20 × 0,70 × Economia"`

**Nota MEI × CLT acima da tabela:**
```tsx
<p className="text-xs text-base-content/40">
  MEI: Salário × 1,3 + 0,64 × Economia | CLT: Custo fixo pelo prazo + participação na economia
</p>
```

---

## Tarefa 5 — `CalculadoraMateriais.tsx` (E5)

### Problema atual

Campos SINAPI editáveis desnecessariamente quando vieram do E3. Sem fórmula visível. Sem ligação visual com E3.

### Novo comportamento

**Título:** `E5 — Custo de Materiais`

**Banner contextual:**
```
Card bg-base-200:
"Os insumos abaixo foram importados dos preços confirmados na etapa E3.
Verifique os coeficientes técnicos e ajuste se necessário.
Fórmula: Custo = Quantidade × Σ (coeficiente_i × preço_i)"
```

**Barra de progresso:**
```tsx
<p className="text-xs text-base-content/50">{salvos} de {total} serviços com materiais salvos</p>
<progress className="progress progress-primary w-full" value={salvos} max={total} />
```

**Exibição dos insumos do E3 como readonly:** quando `engData.consultasSINAPI[servicoId]` existe, exibir código SINAPI e descrição como texto (não input), com badge `badge-info badge-xs` com texto `"E3"` ao lado. Coeficiente e Valor Unitário continuam editáveis. Fallback SP mantém badge `badge-warning badge-xs`.

**Nova coluna `Custo/UN`:** `coeficiente × valorUnitario`, exibida antes de Total.

**Abaixo da tabela:**
```tsx
<p className="text-xs text-base-content/50 font-mono">
  Custo total: {quantidade} × Σ(coef × preço) = {formatCurrency(totalServico)}
</p>
<p className="text-xs text-base-content/50">
  Custo unitário: {formatCurrency(totalServico / quantidade)} / {unidade}
</p>
```

**Resumo expandido no card inferior:** antes dos 3 cards atuais, adicionar tabela por serviço:

```
Resumo por serviço:
[table table-xs]
Serviço | Qtd | UN | Custo Materiais | Custo/UN
[row por serviço]
[linha Total]
```

Seguido pelos 3 cards atuais (Total Mat., BDI 20%, Preço Final Mat.).

---

## Tarefa 6 — `PrecificacaoFinal.tsx` (E6)

### Problema atual

Quatro blocos sem separação semântica. Cronograma de fases sem orientação. Botão "Entregar" vago. Modal de confirmação sem dados concretos.

### Novo comportamento

**Título:** `E6 — Precificação Final`

**Banner contextual:**
```
Card bg-base-200:
"Esta é a etapa final. Revise os custos consolidados, defina o cronograma
de execução e gere as saídas para o cliente: valor de entrada, parcela
mensal e tabela de aportes."
```

**Bloco 1 — Consolidação:**

Subtítulo: `<p className="font-semibold">Custos Diretos por Serviço (MO + Materiais)</p>`

Cards de custo — adicionar subtexto em `text-xs text-base-content/40` abaixo de cada valor:
- Custo Direto MEI: `"Soma dos custos de MO em contratação MEI"`
- Custo Direto CLT: `"Soma dos custos de MO em contratação CLT"`
- Custo Mat. Total: `"Soma dos materiais de todos os serviços"`
- Custo/m² MEI: `"Custo MEI ÷ {areaConstruida} m²"`
- Custo/m² CLT: `"Custo CLT ÷ {areaConstruida} m²"`
- Bônus Construtora: `"0,14 × Σ Economias de todos os serviços"`
- Preço Final (BDI): `"Custo Direto × 1,{(bdi*100).toFixed(0)}"`

**Bloco 2 — Cronograma:**

Subtítulo: `<p className="font-semibold">Cronograma Físico-Financeiro</p>`

Nota abaixo do subtítulo:
```tsx
<p className="text-xs text-base-content/50">
  Distribua o custo total entre as fases. Os percentuais devem somar 100%.
  O mês de início e fim define quando cada parcela será desembolsada.
</p>
```

Totalizador ao lado da tabela de fases:
```tsx
<p className="text-xs text-base-content/50">Total alocado: {somaPercentuais}%</p>
<progress className="progress progress-primary w-full" value={somaPercentuais} max={100} />
{somaPercentuais !== 100 && (
  <p className="alert alert-warning text-xs">Os percentuais somam {somaPercentuais}% — ajuste até totalizar 100%</p>
)}
```

Legenda do gráfico de barras (acima do SVG):
```tsx
<div className="flex gap-4 text-xs text-base-content/50">
  <span><span className="inline-block w-3 h-3 bg-primary/40 rounded mr-1" />Nominal</span>
  <span><span className="inline-block w-3 h-3 bg-primary rounded mr-1" />Corrigido INCC ({(incc * 100).toFixed(2)}% a.m.)</span>
</div>
```

**Bloco 3 — MEI × CLT:**

Subtítulo: `<p className="font-semibold">Modalidade de Contratação</p>`

Nota abaixo dos cards:
```tsx
<p className="text-xs text-base-content/40">
  Preço final = Custo Direto × 1,{(bdi*100).toFixed(0)} (BDI aplicado sobre custo direto total)
</p>
```

**Bloco 4 — Entrega:**

Subtítulo: `<p className="font-semibold">Saídas para o Cliente</p>`

Antes do botão "Entregar ao cliente", exibir 3 cards de resumo:
```
Card 1:  Valor Mínimo de Entrada (AA)
         [formatCurrency(valorAA)]
         <p className="text-xs text-base-content/50">Recursos próprios mínimos para viabilizar o início da obra</p>

Card 2:  Primeira Parcela Mensal (Price)
         [formatCurrency(parcelaPrice)] / mês
         <p className="text-xs text-base-content/50">Parcela que o cliente pagará ao banco após a conclusão</p>

Card 3:  Prazo Total da Obra
         {tempoMeses} meses
         <p className="text-xs text-base-content/50">Período de desembolso de aportes mensais</p>
```

**Modal de confirmação de entrega — tornar informativo:**
```
Título: "Confirmar entrega ao cliente"
Corpo:
  <p>"Ao confirmar, o orçamento mudará para 'Entregue' e as seguintes
  informações serão disponibilizadas ao cliente:"</p>
  <ul className="text-sm mt-2 space-y-1">
    <li>Valor de entrada mínimo: {formatCurrency(valorAA)}</li>
    <li>Parcela mensal (Price): {formatCurrency(parcelaPrice)}</li>
    <li>Tabela de {tempoMeses} aportes mensais</li>
  </ul>
  <p className="text-xs text-base-content/40 mt-3">
    Para desfazer, será necessário reabrir o orçamento manualmente.
  </p>

Botão cancelar: "Cancelar"
Botão confirmar: "Confirmar entrega"  (btn-success)
```

---

## Arquivos a modificar

| Arquivo | Alteração |
|---|---|
| `frontend/types/index.ts` | Adicionar `SINAPIMapping`; garantir `prazoRequerido: number` em `QuantitativoServico` |
| `frontend/lib/mockData.ts` | Adicionar `SERVICE_SINAPI_MAP`, `resolverSINAPI()`, `SERVICE_HELP` |
| `frontend/components/engenheiro/ParametrosGlobais.tsx` | Banner, subtextos, badge de alterado, fórmula consolidada |
| `frontend/components/engenheiro/QuantitativosServico.tsx` | Cards por grupo, auto-SINAPI, progresso, texto de ajuda |
| `frontend/components/engenheiro/ConsultaComposicao.tsx` | Banner, auto-load, colunas Custo/UN e Total, fallback label, progresso |
| `frontend/components/engenheiro/CalculadoraMO.tsx` | Banner, pré-preenchimento da CP, cálculo automático, subtextos nos cenários e bônus, progresso |
| `frontend/components/engenheiro/CalculadoraMateriais.tsx` | Banner, campos readonly do E3, coluna Custo/UN, resumo por serviço, progresso |
| `frontend/components/engenheiro/PrecificacaoFinal.tsx` | Banner, subtítulos por bloco, totalizador de fases, legenda gráfico, cards de saída, modal informativo |

Não criar nenhum arquivo novo além dos listados acima.

---

## Checklist de validação

- [ ] E1: campos alterados exibem badge `alterado` ao lado da legend
- [ ] E1: fórmula `Custo Real MO = Salário Base × {fator}` visível abaixo dos encargos
- [ ] E1: subtexto contextual em todos os campos de BDI, Meta e Salários
- [ ] E2: ao selecionar especificações, `composicaoBasica` e `prazoRequerido` preenchem automaticamente
- [ ] E2: barra de progresso reflete serviços com composição definida
- [ ] E2: `SERVICE_HELP[type]` exibido diretamente no card (não como tooltip)
- [ ] E2: serviços agrupados por seção construtiva
- [ ] E3: ao entrar no wizard, primeiro serviço pendente tem insumos carregados automaticamente
- [ ] E3: fallback SP exibe label `"Sem pesquisa em {UF}"` abaixo do campo
- [ ] E3: colunas `Custo/UN` e `Total` calculadas em tempo real
- [ ] E3: barra de progresso reflete serviços confirmados
- [ ] E4: campos pré-preenchidos da CP e do prazoRequerido do E2
- [ ] E4: cálculo automático via useEffect (sem botão "Calcular" isolado)
- [ ] E4: subtexto explicativo dentro de cada CenarioCard
- [ ] E4: fórmula de bônus visível (30% / 56% / 14%) com explicação de cada parte
- [ ] E5: código SINAPI e descrição exibidos como readonly com badge `E3` quando vieram do E3
- [ ] E5: coluna `Custo/UN` visível na tabela
- [ ] E5: tabela de resumo por serviço antes dos cards totalizadores
- [ ] E6: totalizador de % das fases com alert quando soma ≠ 100%
- [ ] E6: legenda do gráfico de barras com nomenclatura nominal vs. corrigido INCC
- [ ] E6: cards de AA, Parcela e Prazo exibidos antes do botão "Entregar"
- [ ] E6: modal de confirmação exibe os três valores que serão entregues ao cliente
- [ ] Nenhuma lógica de cálculo foi alterada — apenas UX/UI
