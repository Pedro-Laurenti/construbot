---
agent: 'agent'
description: 'Refina o fluxo do ENGENHEIRO para ser guiado por orçamento (wizard E1-E6), com contexto sempre visível, decisões visuais e entrega auditável ao cliente.'
---

# Tarefa: Melhorias profundas no fluxo do Engenheiro

## ANTES DE QUALQUER CÓDIGO

Leia e obedeça **TODOS** os arquivos em `.github/instructions/`:

- `rules.instructions.md` — regras globais (sem emojis, sem comentários, sem documentação extra, input padrão fieldset/legend, PT-BR com acentuação correta, menos arquivos é melhor, reuso via `utils`/componentes, clean code)
- `frontend.instructions.md` — stack Next.js 15 + React 19 + TypeScript + Tailwind v4 + DaisyUI v5, ícones só `react-icons/md`, temas semânticos `bg-base-100`/`text-base-content`
- `backend.instructions.md` — referência, caso alguma melhoria atravesse para o backend

Também leia os dois documentos de referência antes de começar:

- `fluxo_usuarios_v2.docx` — fluxos de Cliente e Engenheiro (seções 6 a 14)
- `metodologia_orcamentaria_v2_integral.docx` — metodologia de cálculo (seções 1 a 10)

Não repetir nem contradizer o que já está nos prompts `02-engenheiro-admin.prompt.md`, `04-adaptacao-engenheiro-v2.prompt.md` e `05-backend-calculos-v2.prompt.md`. Este prompt apenas **refina** o que já existe.

---

## Contexto — o que já existe e o que está errado

O fluxo do engenheiro hoje vive em `frontend/components/engenheiro/`. A sidebar lista as 6 etapas (E1–E6) como módulos livres, intercaladas com ferramentas e gestão. Cada módulo opera **globalmente**, sem amarração a um orçamento específico.

Problemas reais:

1. **Navegação por módulo, não por orçamento.** O engenheiro entra em "E4 Cálculo MO" e não sabe para qual cliente está calculando. A `GestaoOrcamentos` existe mas o resto da sidebar ignora esse contexto.
2. **Sequência E1→E6 é obrigatória no papel, mas livre na tela.** É possível abrir a Precificação Final (E6) sem ter levantado quantitativos (E2). Não há bloqueio, nem sinal visual de "etapa atual".
3. **Os 5 parâmetros do cliente somem.** Eles aparecem em `QuantitativosServico` e talvez em `PrecificacaoFinal`, mas no resto do fluxo o engenheiro não tem como consultar de relance "quem é o cliente, que terreno, que planta, que opcionais".
4. **Decisão MEI vs CLT é pouco tangível.** Os dois números aparecem em paralelo, mas não há a matriz comparativa (custo fixo, flexibilidade, bônus, adequação) descrita na seção 10.4 do `fluxo_usuarios_v2.docx`, nem indicação clara da escolha por serviço.
5. **Sistema de bônus 30/56/14 é invisível.** A distribuição da economia (cliente/profissional/construtora) está nas fórmulas mas não aparece como painel de resultado por serviço.
6. **Fluxo de caixa + INCC é tabelado, mas sem narrativa visual.** Falta gráfico de barras por mês e destaque do impacto do INCC acumulado.
7. **Preview "o que o cliente vai ver" não existe.** O engenheiro entrega sem revisar exatamente as 3 saídas (AA, Parcela Price, Tabela de Aportes) que o cliente receberá.
8. **Status do orçamento não reflete a jornada.** `aguardando_engenheiro` vai direto para `entregue` — a `etapaAtual` (E1…E6) declarada em `OrcamentoEngenheiro` não é persistida nem avança de verdade.
9. **Validações entre etapas não existem.** Nada impede calcular MO sem ter consultado SINAPI primeiro.
10. **Fallback %AS (preço de SP quando UF não tem) é regra do documento, mas a UI não destaca quando um insumo está nesse estado.**

---

## Visão alvo — como o engenheiro deve trabalhar

O fluxo de cálculo passa a ser **guiado por orçamento**, em formato de wizard. As ferramentas continuam acessíveis de forma livre em outra seção.

### Dois modos de operação na sidebar

```
TRABALHAR EM ORÇAMENTO
  Lista de orçamentos de clientes (com status e etapa atual)
  [seleciona um] → entra em modo-wizard do orçamento escolhido

FERRAMENTAS DE CONSULTA
  SINAPI Insumos (ISE)
  Composições Analíticas
  Composições Profissionais
  Plantas Arquitetônicas
  Calculadoras avulsas (MO e Materiais, fora do fluxo do cliente)

GESTÃO
  Painel Geral
  Parâmetros Globais (E1 é feito aqui, fora do orçamento específico)
```

### Modo-wizard do orçamento

Quando o engenheiro entra em um orçamento específico, a tela inteira assume esse contexto:

- **Cabeçalho fixo** no topo com: nome do cliente, nome do projeto, UF, planta selecionada e status atual. Botão "Voltar à lista".
- **Resumo dos 5 parâmetros do cliente** colapsável logo abaixo do cabeçalho (default fechado, abre em um clique) — reaproveitar o mesmo padrão visual do cartão de resumo já usado no fluxo do cliente.
- **Stepper E1–E6** horizontal, mostrando: concluídas (verde, com check), atual (destacada, animada), pendentes (cinza, desabilitadas se ainda sem pré-requisito).
- **Área de trabalho** renderiza o módulo da etapa atual, já recebendo o orçamento como contexto (não busca de estado global solto).
- **Rodapé de navegação** com `← Voltar etapa` e `Avançar etapa →`. Avançar só libera quando a etapa tem saída válida.

O engenheiro pode clicar em uma etapa anterior já concluída para revisar/corrigir. Se alterar algo que invalida etapas posteriores, usar o mesmo padrão de confirmação do carrinho do cliente (`CarrinhoFlutuante`): aviso "isso vai redefinir as etapas X, Y. Continuar?".

### Status do orçamento refletindo a jornada

- `aguardando_engenheiro` → badge amarelo, rótulo "Aguardando"
- `em_calculo` → badge azul, rótulo "Em análise · E{n}" mostrando a etapa atual
- `entregue` → badge verde, rótulo "Entregue em {data}"

A mudança de status é automática conforme o engenheiro avança: abrir pela primeira vez → `em_calculo` com `etapaAtual='E1'`; clicar em "Entregar ao cliente" no E6 → `entregue` com todas as 3 saídas persistidas.

---

## Melhorias por etapa

### E1 — Parâmetros Globais

- Mantido como hoje, **fora** do wizard (é global a todas as obras).
- Adicionar na sidebar em "GESTÃO", não mais como E1 da lista de etapas.
- Ao entrar em um orçamento novo, validar se os parâmetros obrigatórios (UF, INCC, condições de financiamento) estão preenchidos. Se faltar algo, stepper E1–E6 fica bloqueado com mensagem "Complete os Parâmetros Globais primeiro" e botão atalho para abrir o módulo.

### E2 — Levantamento de Quantitativos

- Ao abrir, **já carregar** os serviços derivados da planta + opcionais do cliente (função `gerarQuantitativosFromParametros` em `lib/calculos.ts`). Nunca exigir que o engenheiro aperte um botão para "gerar" — já vem pronto, ele apenas ajusta.
- Tabela com colunas: serviço, unidade, quantidade, esp.1, esp.2, esp.3, composição básica SINAPI, composição profissional (CP), origem (badge: "Planta base" / "Opcional" / "Personalização").
- Edição inline por célula. Mudar composição básica abre um seletor da base SINAPI; mudar CP abre um seletor das 43 composições profissionais.
- Botão "Adicionar serviço manual" para cobrir personalizações que geram serviços extras.
- Resumo no topo: total de serviços, total por origem, área construída da planta.
- Para avançar: todo serviço precisa ter composição básica e CP preenchidas.

### E3 — Composições SINAPI

- Reutiliza `ConsultaComposicao.tsx`, mas agora **percorrendo os serviços do E2 um a um** no modo wizard.
- Um card por serviço com: dados da composição SINAPI correspondente, lista de insumos com coeficiente e preço, badge "COM PREÇO" / "SEM PREÇO" / "%AS {n}%" (quando usou fallback de SP).
- Qualquer insumo "SEM PREÇO" precisa ser tratado: ou aplicar fallback automático de SP (mostrar badge amarelo) ou o engenheiro edita o preço manualmente.
- Para avançar: todos os insumos devem ter preço resolvido.

### E4 — Cálculo MO

- Para cada serviço do E2, painel de cálculo com:
  - **Inputs**: produtividade básica (preenchida da CP), adicional de produtividade (padrão 1,3 editável), proporção ajudante, prazo requerido, modalidade padrão (MEI/CLT).
  - **Três cenários lado a lado** (Mensalista / Ótima / Prazo) em cards: produtividade usada, HH prof, HH ajud, prazo efetivo, N profissionais, N ajudantes, custo base, bônus do cenário. O cenário escolhido fica marcado visualmente (borda colorida + check).
  - **Painel de bônus**: economia total do serviço, distribuição em barras 30% cliente / 56% profissional / 14% construtora com valores em R$.
  - **Comparativo MEI vs CLT** em matriz com as 4 dimensões do documento: custo fixo, flexibilidade, bônus, adequação. Valores calculados quando possível, qualitativos quando não. A escolha MEI/CLT fica em toggle grande acima da matriz.
- Resumo no rodapé: custo MO total do orçamento (MEI), custo MO total (CLT), economia total prevista, cenário predominante escolhido.
- Para avançar: todo serviço precisa ter cenário + modalidade escolhidos.

### E5 — Cálculo Materiais

- Para cada serviço, card com insumos (até 5), coeficientes herdados do E3 e preço unitário editável. Cálculo automático do custo de materiais do serviço.
- Alerta visível quando um insumo está usando fallback de SP (badge %AS).
- Para avançar: todo serviço precisa ter custo de materiais calculado (> 0 ou explicitamente zero).

### E6 — Precificação Final

Esta é a etapa que mais ganha visualização nova. Dividir em quatro blocos rolados verticalmente:

1. **Consolidação do Custo Direto**
   - Tabela única por serviço com custo MO (MEI e CLT), custo Mat, totais.
   - Cards de total: Custo Direto Total (MEI e CLT), Custo por m² (MEI e CLT).

2. **Fluxo de Caixa + INCC**
   - Edição das fases de obra (`FASES_OBRA_PADRAO` como default) — engenheiro pode ajustar `mesInicio`, `mesFim`, `percentualCusto` arrastando sliders ou editando os campos.
   - Gráfico de barras mensais (R$ por mês) com duas séries: custo nominal e custo corrigido pelo INCC acumulado. Eixo x = meses da obra, tamanho da barra = valor.
   - Tabela mensal abaixo do gráfico: mês, custo parcela, INCC acumulado (%), custo corrigido, com linha de total.

3. **Aplicação do BDI e Preço Final**
   - Cards grandes lado a lado: Preço Final MEI (com BDI 20%) e Preço Final CLT (com BDI 20%).
   - Subvalores menores: preço por m² MEI, preço por m² CLT.
   - Indicador do delta entre MEI e CLT (quem está mais barato, em R$ e %).

4. **Saídas para o Cliente**
   - Os três resultados (AA mínimo, Parcela Price, Tabela de Aportes) em cards de preview **idênticos** aos que o cliente vai ver no `EntregaResultado.tsx`. Preview lado a lado para MCMV e SBPE.
   - Botão `Entregar orçamento ao cliente` somente habilitado quando todos os blocos acima tiverem saída válida. Ao clicar: confirmar em modal ("Tem certeza? Após entregar, o cliente será notificado e o orçamento não poderá mais ser alterado sem reabertura."), salvar `saida` no orçamento, mudar status para `entregue` e redirecionar à lista de orçamentos.
   - Opção secundária `Salvar rascunho e sair` para persistir sem entregar.

---

## Persistência e tipos

Reforçar em `types/index.ts` (sem quebrar o que já existe):

- Garantir que `OrcamentoEngenheiro.etapaAtual` seja realmente persistido e avance automaticamente. Adicionar campo opcional `etapasConcluidas: Array<'E1'|'E2'|'E3'|'E4'|'E5'|'E6'>` para o stepper saber o que já está verde.
- Adicionar `Orcamento.logEtapas?: Array<{ etapa: string; concluidaEm: string }>` para auditoria simples (quando cada etapa foi finalizada).
- Se `OrcamentoEngenheiro` ainda não contém os resultados intermediários por serviço (consulta SINAPI resolvida, cenário MO escolhido, insumos do materiais), adicionar. Nunca reler do zero: o engenheiro reabre o orçamento e vê tudo como deixou.

Storage: a sessão do engenheiro (`construbot_engineer`) deve armazenar esses dados por orçamento. Reutilizar `saveEngineerData` e evoluir o objeto, não criar chaves paralelas em `localStorage`.

---

## Componentes novos / afetados

Sugestões (respeitar "menos arquivos é melhor" — reagrupar onde fizer sentido):

```
frontend/components/engenheiro/
  OrcamentoWizard.tsx            NOVO  orquestra o modo-wizard (cabeçalho + stepper + etapa ativa + rodapé)
  StepperEtapas.tsx              NOVO  barra E1-E6 com estados (concluída/ativa/pendente/bloqueada)
  ResumoParametrosCliente.tsx    NOVO  card colapsável com os 5 parâmetros do cliente
  SidebarEngenheiro.tsx          ALTERAR  3 seções: Trabalhar em Orçamento, Ferramentas, Gestão
  EngineerApp.tsx                ALTERAR  dois modos (lista/wizard) controlados por estado de orçamento selecionado
  QuantitativosServico.tsx       ALTERAR  receber `orcamentoId`, carregar automaticamente, edição inline
  ConsultaComposicao.tsx         ALTERAR  modo "percorrer serviços do orçamento" + badge %AS
  CalculadoraMO.tsx              ALTERAR  cenários lado-a-lado, painel bônus, matriz MEI vs CLT
  CalculadoraMateriais.tsx       ALTERAR  alerta de fallback SP por insumo
  PrecificacaoFinal.tsx          ALTERAR  blocos 1-4 acima, gráfico de fluxo de caixa, preview das 3 saídas
  GestaoOrcamentos.tsx           ALTERAR  entrada única para o wizard, coluna de etapa atual
```

Módulos que ficam como estão, acessíveis só via "Ferramentas de Consulta": `TabelaSINAPI`, `ComposicoesAnaliticas`, `ComposicoesProfissionais`, `GestaoPlantasModule`.

Remover ou fundir se perderem propósito: `ConsolidacaoOrcamento.tsx` e `Precificador.tsx` provavelmente viraram redundantes com o novo E6 — avaliar e fundir.

---

## Validações entre etapas (regras de negócio)

- E1 deve estar completo para começar qualquer orçamento.
- Avançar E2 → E3: todo serviço tem composição básica e CP.
- Avançar E3 → E4: todos os insumos de todos os serviços têm preço (direto ou via fallback SP).
- Avançar E4 → E5: todo serviço tem cenário e modalidade MEI/CLT escolhidos.
- Avançar E5 → E6: todo serviço tem custo de materiais calculado.
- Entregar ao cliente (fim de E6): BDI aplicado, fluxo de caixa consolidado, 3 saídas preenchidas.

Em todas essas validações, mostrar quais itens ainda estão pendentes (não só "falta coisa"). Ex.: "3 serviços ainda não têm composição básica: Alvenaria Estrutural, Grauteamento Vertical, Contrapiso Farofa."

---

## UI / UX — regras específicas

- **Nenhum emoji** (respeitar `rules.instructions.md`).
- Todos os inputs seguem o padrão obrigatório `fieldset > legend > input` (ver `rules.instructions.md` e `frontend.instructions.md`).
- Ícones apenas de `react-icons/md`. Para sinalizações usar: `MdCheckCircle` (concluída), `MdRadioButtonUnchecked` (pendente), `MdLock` (bloqueada), `MdWarning` (alerta de fallback), `MdInsertChart` (gráficos).
- Cores semânticas DaisyUI (`bg-base-100`, `bg-base-200`, `text-base-content`, `badge-success`, `badge-warning`, `badge-info`, `badge-error`) — nada de cores fixas.
- Linguagem sempre em português brasileiro com acentuação correta. Termos técnicos do setor (SINAPI, BDI, INCC, MEI, CLT, AA, Price) mantidos em letras maiúsculas.
- Reutilizar componentes já padronizados (`OrcamentoEditModal`, `CarrinhoFlutuante` — só o padrão de confirmação de invalidação, não a estrutura) em vez de criar modais novos.

---

## Testes manuais de aceitação

Antes de considerar pronto, o fluxo precisa passar nos seguintes cenários:

1. Engenheiro abre um orçamento novo (status `aguardando_engenheiro`). O status muda para `em_calculo · E1` (ou E2 se E1 já estiver ok).
2. Percorrer E2 → E6 de ponta a ponta em um orçamento real (usar o mock existente), confirmando que cada etapa recebe os dados da anterior sem o engenheiro redigitar.
3. Voltar para E2 após ter chegado em E4 e alterar uma quantidade. O sistema avisa que E3, E4 e E5 vão ser invalidados. Confirmar. Stepper volta a mostrar essas etapas como pendentes.
4. Simular um insumo "SEM PREÇO" no UF escolhido. A UI marca com badge %AS e aplica o preço de SP. O engenheiro consegue editar manualmente se quiser.
5. No E4, comparar MEI e CLT para um serviço. Alternar o toggle. O custo total do orçamento recalcula em tempo real na barra lateral.
6. No E6, editar a fase de obra arrastando o início/fim de uma fase. O gráfico de fluxo de caixa e a tabela atualizam.
7. Clicar em "Entregar ao cliente". O cliente, ao abrir o orçamento no fluxo dele, vê as 3 saídas (valor mínimo de entrada, parcela mensal Price, tabela de aportes).
8. Reabrir um orçamento já `entregue`. O wizard mostra tudo em modo leitura com botão "Reabrir para edição" (que volta status para `em_calculo` mantendo os dados).
9. O resumo dos 5 parâmetros do cliente está disponível em todas as etapas, sem obrigar o engenheiro a sair do contexto.
10. Parâmetros Globais incompletos → wizard não avança e mostra atalho para corrigir.

---

## Resultado esperado

O engenheiro entra na ConstruBot, vê a lista de orçamentos com a etapa atual visível, clica em um, entra em um wizard focado e sequencial, percorre E1–E6 com o contexto do cliente sempre à vista, toma decisões informadas de MEI/CLT e cenário por serviço, visualiza economia e bônus, corrige o que precisa voltando em etapas anteriores de forma segura, e entrega as 3 saídas ao cliente sabendo exatamente o que ele vai ver. Nenhuma etapa livre de contexto, nenhuma decisão às cegas, nenhuma entrega sem preview.
