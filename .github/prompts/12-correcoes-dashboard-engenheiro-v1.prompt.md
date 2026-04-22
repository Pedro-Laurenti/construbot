# Correções Dashboard do Engenheiro — ConstruBot v2

Referência: `metodologia_orcamentaria_v2_integral.docx` (Jan/2026).
Escopo: todo o fluxo do dashboard do engenheiro (`frontend/components/engenheiro/*`, `frontend/lib/*`, `frontend/data/*`, `frontend/types/*`).

---

## 1. ERROS DE CÁLCULO (corrigir primeiro — quebram o orçamento)

### 1.1 `lib/calculos.ts` — `calcularItem()` usa fator errado de encargos
**Linhas 10–11**
```ts
const vhProfCom = vhProfSem * p.encargosPercentual   // 1.6013 — ERRADO
const vhServCom = vhServSem * p.encargosPercentual   // 1.6013 — ERRADO
```
Deve ser `p.fatorEncargos` (2.6013). Impacto: SINAPI subestimado ~38%, economia e preço final errados.

**Linha 69 e 73** repetem o mesmo bug:
```ts
salarioEsperadoCLT: p.salarioQualificado * p.encargosPercentual,
valorMensalEsperadoCLT: p.salarioQualificado * p.encargosPercentual,
```
Trocar por `* p.fatorEncargos`.

**Ação:** remover o campo `encargosPercentual` de `GlobalParams` (tipo e `mockData.ts`). Usar apenas `fatorEncargos`. Atualizar todas as referências.

### 1.2 `lib/calculos.ts` — BDI hardcoded em `calcularTotais()` e `calcularMOEngenheiro()`
**Linhas 103–104**: `custosDiretosMEI * 1.2` → trocar por `custosDiretosMEI * (1 + GLOBAL_PARAMS.bdi)`. Aplicar também em 106–107.
**Linhas 173–174**: `custoFinalMEI * 1.2` → `custoFinalMEI * (1 + params.bdi)`. Também trocar todas ocorrências hardcoded `1.2` por `(1 + bdi)`.

### 1.3 `lib/calculos.ts` — `gerarQuantitativosFromParametros` gera `prazoRequerido: 0`
**Linha 297**: `prazoRequerido: 0` causa divisão por zero nas linhas 23, 133 (`item.prazoRequerido * 8`).
**Ação:** usar `Math.max(1, planta.tempoObraMeses * 22)` como default, ou adicionar guarda em `buildCenario` e `buildCenarioEng`: se `prazoRequerido <= 0`, retornar cenário com `nP = 1`, `prazoEf = hhP / 8`.

### 1.4 `lib/calculos.ts` — Cenário "Prazo" não aplica "Adicional de Produtividade"
Metodologia: Cenário 3 usa Produtividade Requerida = SINAPI × Adicional (1,0 a 1,3). Código atual: `prazo = buildCenario(1.00)` — ignora o adicional.
**Ação:** incluir campo `adicionalProdutividade` em `QuantitativoServico` e em `CalculoMOConfig`. Usar esse valor no cenário Prazo. Default = 1.30.

### 1.5 `lib/calculos.ts` — `buildCenarioEng` calcula bônus sem modalidade
**Linha 137**: `bonusCenario = Math.max(0, cSINAPI - custoBase) * 0.64` — usa sempre 0.64 (MEI). Cenários CLT vão receber bônus errado quando usados.
**Ação:** passar `modalidade` para `buildCenarioEng` e aplicar `0.64` para MEI, `0.56` para CLT. Alinhar com `buildCenario` (linha 30) que já faz certo.

### 1.6 `lib/calculos.ts` — Custo MEI assume ajudante sempre CLT
**Linhas 27–28, 136**:
```ts
const cReal = item.modalidade === 'MEI'
  ? hhP * vhProfSem * 1.3 + hhA * vhServCom   // ajudante com encargos mesmo em MEI
```
Se o ajudante também é MEI, deveria ser `hhA * vhServSem * 1.3`.
**Ação:** adicionar campo `modalidadeAjudante` ('MEI' | 'CLT') em `QuantitativoServico`. Default: CLT. Usar para escolher `vhServSem * 1.3` ou `vhServCom`.

### 1.7 `components/engenheiro/ConsultaComposicao.tsx` — VH hardcoded
**Linhas 37–38**:
```ts
const VH_COM = 2664.75 * 2.6013 / (22 * 8)
const VH_SEM = 2664.75 / (22 * 8)
```
Ignora `data.globalParams`. Se engenheiro alterar salário ou fator, E3 continua com valores antigos.
**Ação:** receber `globalParams` via prop ou ler de `data`. Calcular `VH_COM = salarioQualificado * fatorEncargos / (22 * 8)` dinamicamente.

### 1.8 `components/engenheiro/ComposicoesProfissionais.tsx` — 220 hardcoded
Valor meta diário hardcoded em `calcProds()`. Deve usar `data.globalParams.valorMetaDiario`.

### 1.9 `lib/mockData.ts` — `DEFAULT_GRUPOS_ENCARGOS` incorreto
Metodologia: A=27,80%, B=52,93%, C=14,71%, D=16,19%, D'=2,17%, E=46,33% → total 160,13%.

Problemas atuais:
- **Grupo B soma 56,03%** (deveria 52,93%): "Férias + 1/3 Constitucional" está 15,10% — o valor correto é **12,10%** para bater 52,93% total, OU ajustar DSR (18,13 → 15,10) e manter Férias. Alinhar com metodologia v2 (Tabela 3 do docx).
- **Grupos C e D' ausentes na estrutura `GruposEncargos`**. São calculados dinamicamente em `ParametrosGlobais.tsx` (linhas 22, 27) mas não existem no tipo nem no default. Persistência fica inconsistente.

**Ação:**
1. Corrigir valores do grupoB para bater 52,93%.
2. Adicionar `grupoC: ItemGrupoEncargo[]` e `grupoDLinha: ItemGrupoEncargo[]` ao tipo `GruposEncargos` (mesmo que sejam calculados, persistir o resultado).
3. Garantir que `fatorEncargos = 2.6013` default bate exatamente com a soma dos grupos (auditoria automática).

### 1.10 `components/engenheiro/ParametrosGlobais.tsx` — persistência inconsistente de fator
**Linhas 35–39**: `updateGrupoItem` usa `fatorEncargos` (variável derivada do render atual) e `totalGeral` (idem). Em updates rápidos, o `onUpdate` pode receber valores desincronizados entre `gruposEncargos` novo e `fatorEncargos` recalculado.
**Ação:** recalcular fator a partir do `updated` no mesmo passo, não usar a variável de render.

### 1.11 `components/engenheiro/PrecificacaoFinal.tsx` — fases sem validação de 100%
`getDistribuicaoMensal` (linhas 74–87) normaliza quando `soma > 0`, mas nunca avisa o usuário se as fases não somam 100%.
**Ação:** adicionar validação visual no editor de fases: badge vermelho se soma ≠ 100% ± 0,1pp. Bloquear entrega até fechar 100%.

### 1.12 `lib/calculos.ts` — Desconto Cliente (30% × Economia) implícito e inconsistente
Metodologia: 30% cliente, 56% prof, 14% construtora (CLT). MEI: 64% prof.
- CLT: cliente recebe 1 − 0,56 − 0,14 = 30% ✓
- MEI: cliente recebe 1 − 0,64 − 0,14 = 22% (não bate com 30%)

**Ação:** expor campo explícito `descontoCliente` em `ItemResultado` e `CalculoMOResultado`. Definir com o engenheiro a regra para MEI (manter 22% embutido ou ajustar distribuição). Exibir na tela E6 para transparência.

### 1.13 `lib/calculos.ts` — `cRealMEI` (linha 38) ignora cenário escolhido
`calcularItem` calcula `custoFinalMEI` a partir de `hhProfSin` (SINAPI direto) em vez do cenário selecionado (mensalista/ótima/prazo). Resultado: preço final sempre SINAPI puro × 1,3 + bônus, perdendo o ganho de cenário.
**Ação:** usar `otima.custoBase` (ou cenário selecionado) no lugar de `cRealMEI`.

### 1.14 `lib/calculos.ts` — `calcularMatEngenheiro` não valida duplicatas
Soma `coef × valor × qtd` sem checar códigos SINAPI repetidos. Custos duplicados silenciosos.
**Ação:** deduplicar por `codigo` antes de somar, ou avisar no componente `CalculadoraMateriais`.

### 1.15 `lib/calculos.ts` — `calcularFluxoCaixaINCC` aplica INCC a partir do mês 1
Linha 272: `Math.pow(1 + inccMensal, i + 1)`. Metodologia comum: mês 0 = data-base (sem correção), mês 1 = primeira correção. Aqui o mês 1 já tem `(1+incc)^2`.
**Ação:** confirmar com o engenheiro: deve ser `i` (mês 0 = sem correção) ou `i + 1` (mês 1 = primeira correção). Documentar no JSDoc.

---

## 2. ERROS DE REGRA DE NEGÓCIO

### 2.1 Invalidação em cascata silenciosa (`OrcamentoWizard.tsx`)
Editar E2 apaga checksums E3–E6 sem aviso. Engenheiro pode perder horas de trabalho.
**Ação:** modal de confirmação listando o que será invalidado. Exigir confirmação explícita.

### 2.2 `QuantitativosServico.tsx` — `resolverSINAPI` apaga composição manual
Se usuário digita composição manualmente e depois muda especificação, `updateEsp` chama `resolverSINAPI` e sobrescreve com `null` se não houver mapping.
**Ação:** preservar `composicaoBasica` se já foi preenchida manualmente (flag `composicaoManual: boolean`). Só sobrescrever se `origem === 'PLANTA_BASE'` e não foi editada.

### 2.3 `ConsultaComposicao.tsx` — sem aviso de alto % fallback SP
Threshold 40% (hardcoded) no componente, sem visibilidade agregada.
**Ação:** mostrar badge "IMPACTO FALLBACK: X%" no cabeçalho de E3 e no `OperationalModuleShell`. Se > 40%, bloquear confirmação e pedir justificativa.

### 2.4 `ComposicoesProfissionais.tsx` — adições perdidas no refresh
Função `adicionar` atualiza estado local, não persiste em `data`.
**Ação:** adicionar `composicoesProfissionais: ComposicaoProfissional[]` em `EngineerData`. Persistir via `onUpdate`. Load inicial faz merge com `COMPOSICOES_PROFISSIONAIS` (mock).

### 2.5 `ConsolidacaoOrcamento.tsx` — botão "Vincular" inerte
Botão existe mas não faz nada.
**Ação:** remover o botão, ou implementar vinculação (consolida laboratório em orçamento cliente específico).

### 2.6 `ParametrosGlobais.tsx` — restore sem confirmação
`restore()` reseta tudo sem perguntar.
**Ação:** modal de confirmação. Guardar snapshot em `auditTrail` antes de sobrescrever (já existe `appendAuditEvent`, adicionar o `beforeValue`).

### 2.7 `CalculadoraMO.tsx` — validação ausente de prazo viável
Se `prazoRequerido` < `prazoEfetivo` calculado, o cenário Prazo é irreal.
**Ação:** comparar `prazoRequerido` com `prazo.prazoEfetivoDias`. Se diferença > 20%, exibir alerta "Prazo requerido impossível com equipe atual". Sugerir aumentar `adicionalProdutividade` ou o prazo.

### 2.8 `Precificador.tsx` — modal sem validação de composição obrigatória
`canAdd = quantidade > 0` (linha 144). Permite adicionar sem composição profissional/básica.
**Ação:** `canAdd = quantidade > 0 && compProfId && compBasica`.

### 2.9 `GestaoPlantasModule.tsx` — upload sem limite
Imagens grandes estouram localStorage.
**Ação:** limite 500KB por imagem. Redimensionar via canvas antes de salvar (max 1024×1024).

### 2.10 `GestaoOrcamentos.tsx` — "Mockar orçamento" recarrega a página
`window.location.reload()` após mockar. Perde estado de outras abas.
**Ação:** atualizar estado via `onUpdate` sem reload.

### 2.11 `CalculadoraMateriais.tsx` — limite arbitrário de 5 insumos
Metodologia cita "Insumo 1 a 5", mas composições reais podem ter mais. Limite de UI divergente da realidade SINAPI.
**Ação:** remover limite hardcoded; aceitar N insumos. Apenas exibir "5 principais" visualmente, com botão "ver todos".

### 2.12 Checksum E2–E6 em `OrcamentoWizard.tsx` baseado em `JSON.stringify`
Frágil a reordenação de chaves.
**Ação:** usar hash estável com chaves ordenadas (ex.: `sortKeys(obj)` antes de stringify), ou biblioteca `object-hash`.

---

## 3. UI (pontos a melhorar)

### 3.1 `SidebarEngenheiro.tsx`
- Badges de pendência: diferenciar erro (vermelho) / aviso (amarelo) / info (azul). Hoje tudo é uma contagem crua.
- Subtítulos truncados sem `ellipsis`. Aplicar `truncate` + `title` com tooltip.
- Ícone muda só background; adicionar estado visual (fill color) no ícone ativo.

### 3.2 `PainelGeral.tsx`
- Card vazio genérico. Adicionar CTA "Criar primeiro orçamento".
- Tabela "Orçamentos Recentes" sem paginação. Paginar ou mostrar top 10 com link "Ver todos".
- Falta timestamp "Última atualização".
- KPIs misturam dados do laboratório e do wizard — separar visualmente em duas seções ("Laboratório" vs "Orçamentos Ativos").

### 3.3 `ParametrosGlobais.tsx`
- Grid `cols-2` quebra em mobile (<640px). Usar `grid-cols-1 sm:grid-cols-2`.
- Falta validação visual (campos vermelhos) para BDI < 0, encargos absurdos.
- Exibir fator calculado vs fator salvo — hoje misturado.

### 3.4 `TabelaSINAPI.tsx`
- Indicar critério da amostra (ex.: "20 insumos mais usados"). Documentar.
- Badge "SP" sem tooltip. Adicionar tooltip "Preço de SP usado como fallback".

### 3.5 `ConsultaComposicao.tsx`
- Diferenciar 3 situações de "sem preço": nunca teve, editado para 0, fallback falhou.
- Exibir impacto fallback agregado no topo.

### 3.6 `CalculadoraMO.tsx`
- `CenarioCard` com 6 valores densos. Em mobile, quebrar em 2 colunas (3+3) ou usar acordeão.
- Adicionar tabela comparativa lado-a-lado dos 3 cenários.
- Textos das modalidades em i18n dict (mesmo sem traduzir, centralizar).

### 3.7 `Precificador.tsx`
- Tabela 11 colunas em tela única. Usar sticky columns, scroll horizontal claro com sombra, ou agrupar em sub-tabelas.
- Modal de adição sem scroll em mobile.

### 3.8 `PrecificacaoFinal.tsx`
- `BarChart`: sem escala Y, sem valores. Adicionar eixo Y com 3 ticks (0, max/2, max) e tooltip por barra.
- Legenda "nominal" solta em (0,10) do SVG — reposicionar com legenda estruturada.
- Distribuição por fase sem indicação se bate 100%.

### 3.9 `ConsolidacaoOrcamento.tsx`
- Subtotais ausentes (MO + Mat = Total). Adicionar linha subtotal por serviço.
- Sem ordenação por coluna.

### 3.10 `StepperEtapas.tsx`
- Em viewport <480px, 5 etapas apertadas. Em mobile, converter para dropdown "Etapa 2/6 · E2 Quantitativos".

### 3.11 `OperationalModuleShell.tsx`
- Card muito longo em mobile. Adicionar toggle "Recolher/Expandir".

---

## 4. UX (experiência de uso)

### 4.1 Fluxo wizard (`EngineerApp.tsx` + `OrcamentoWizard.tsx`)
- Entrada no wizard remove a sidebar sem aviso — usuário "perde" contexto. Adicionar breadcrumb "Engenheiro > Orçamentos > {Cliente} > Wizard".
- Sem loading/transição entre `wizardOrcamento = null` e `!= null`.
- Modo foco (`focoAtivo`) só muda padding. Aplicar também: esconder `OperationalModuleShell` cabeçalho, aumentar área útil.

### 4.2 Salvamento silencioso
`saveEngineerData` é chamado em cada update sem feedback. Usuário não sabe se salvou.
**Ação:** toast sutil "Salvo às HH:MM" (debounced, canto inferior direito).

### 4.3 `CalculadoraMO.tsx` — auto-save agressivo
Digitar e mudar de ideia já persistiu o cenário.
**Ação:** botão explícito "Salvar cenário". Enquanto não salvar, mostrar "Alterações não salvas" em amarelo. Manter debounce apenas para preview.

### 4.4 `ConsultaComposicao.tsx` — bloqueio sem feedback
Linha 114: `if (semPreco.length > 0) return` silencioso.
**Ação:** toast de erro listando insumos pendentes. Destacar visualmente as linhas problemáticas.

### 4.5 `GestaoOrcamentos.tsx` — reabertura sem feedback
`motivoReabertura.trim()` vazio = retorno silencioso.
**Ação:** input inválido com mensagem "Motivo obrigatório".

### 4.6 Geral — confirmações de ações destrutivas
- `CalculadoraMateriais.tsx` deleta insumo sem confirmação.
- `ParametrosGlobais.tsx` restaura sem confirmação.
- `OrcamentoWizard.tsx` invalida cascata sem confirmação.
**Ação:** modal de confirmação em todos. Ou sistema de undo com toast "Item removido. Desfazer (5s)".

### 4.7 Estados vazios
- `PainelGeral`, `GestaoOrcamentos`, `ComposicoesProfissionais` quando sem dados: mostrar ilustração + CTA claro.

### 4.8 Onboarding de engenheiro novo
Não há fluxo introdutório. Usuário novo vê tela vazia.
**Ação:** checklist "Configurar parâmetros → Revisar plantas → Criar primeiro orçamento" no PainelGeral.

---

## 5. FLUXO DE INFORMAÇÃO (consistência entre módulos)

### 5.1 Dessincronia E3 ↔ E5
E3 confirma preços de insumos (ConsultaComposicao). E5 permite editar os mesmos preços (CalculadoraMateriais). Se editar em E5, E3 não reflete.
**Ação:** fonte única de verdade. E3 popula `engData.calculosMat[servicoId].insumos`. Edições em E5 refletem em E3 (e invalidam checksum). Ou: travar E5 apenas para coeficiente, preços vêm de E3.

### 5.2 `ParametrosGlobais` não propaga invalidação
Alterar fator de encargos/BDI/salário deveria invalidar todos os `CalculoMOResult` calculados. Hoje, dados continuam com fator antigo.
**Ação:** ao salvar parâmetros, comparar com snapshot anterior. Se mudou fator de cálculo, marcar todos os `orcamentosEngenheiro[*]` com `parametrosObsoletos: true`. Banner no Wizard: "Parâmetros mudaram, recalcular?".

### 5.3 `PainelGeral` mistura laboratório e wizard
Cards "Custos Diretos MEI/CLT" usam `data.calculoMOResults` (laboratório) e ignoram `orcamentosEngenheiro` (produção). Resultado enganoso.
**Ação:** separar KPIs em 2 cards ou usar orçamentos entregues como fonte.

### 5.4 `GestaoOrcamentos` — coluna etapa sem progresso
Hoje mostra só etapa atual. Adicionar coluna "X/6 etapas concluídas".

### 5.5 `SidebarEngenheiro` — validação não memoizada
`getModuleValidation()` roda por item × render. Com 100+ orçamentos, trava.
**Ação:** `useMemo` em `EngineerApp` passando resultado por prop, ou memoizar por `(moduleId, dataChecksum)`.

### 5.6 `loadStorage()` em múltiplos pontos
`EngineerApp` chama no `useMemo([data])`. `ConsolidacaoOrcamento`, `PainelGeral` também. Fonte inconsistente (localStorage + data).
**Ação:** centralizar em um único provider (contexto React ou hook `useSession`). Ler uma vez.

### 5.7 SINAPI version tracking ausente
Referência "Janeiro/2026" hardcoded. Não há campo `versaoSINAPI` associado a cada composição nem ao orçamento.
**Ação:** adicionar `sinapiRef: string` (ex.: "2026-01") em `InsumoSINAPI`, `ComposicaoAnalitica` e snapshot do orçamento. Ao entregar, travar a versão usada.

### 5.8 Ausência de telemetria/auditoria visível
`appendAuditEvent` é chamado, mas não há tela para visualizar histórico.
**Ação:** aba "Auditoria" no Sidebar listando eventos. Filtro por módulo/ação/usuário.

---

## 6. ORDEM DE EXECUÇÃO

**Bloco 1 — Cálculos corretos (dia 1):**
1.1, 1.2, 1.3, 1.7, 1.8, 1.13 — impedem o sistema de produzir orçamentos válidos.

**Bloco 2 — Consistência de dados (dia 2–3):**
1.9, 1.10, 1.11, 1.4, 1.5, 1.6, 5.2, 5.1, 5.7.

**Bloco 3 — Regras de negócio (dia 4–5):**
1.12, 1.14, 1.15, 2.1, 2.2, 2.3, 2.4, 2.6, 2.7, 2.12.

**Bloco 4 — UX crítico (dia 6–7):**
4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 2.5, 2.8, 2.9, 2.10, 2.11.

**Bloco 5 — UI polish (dia 8+):**
Seção 3 completa.

**Bloco 6 — Performance e telemetria:**
5.3, 5.4, 5.5, 5.6, 5.8.

---

## 7. TESTES OBRIGATÓRIOS APÓS CORREÇÕES

Para cada módulo alterado, rodar caso real do docx (página 8, "Exemplo real"):
- Revestimento Argamassa Interna Paredes 1, 340 m², comp. 87421, gesso liso 1,0cm
- Resultado esperado cenário 1 (mensalista): 2 prof, 1 ajud, 18 dias, R$ 7.224,56
- Resultado esperado cenário 2 (ótimo): 3 prof, 1 ajud, 7 dias, R$ 3.805,20
- Resultado esperado cenário 3 (prazo 20d): 1 prof, 1 ajud, 19 dias, R$ 4.923,45

Se qualquer cenário divergir > 2%, bloco 1 não está correto.

Validar também:
- Fator encargos total = 2,6013 (±0,001) com `DEFAULT_GRUPOS_ENCARGOS` aplicados.
- BDI 20% aplicado = custoDireto × 1,20 (nunca hardcoded).
- Cenário "prazo" respeita `adicionalProdutividade` informado.
- Rollback de parâmetros volta orçamentos ao estado salvo (snapshot).

---

## 8. ARQUIVOS A ALTERAR (lista curta)

- `frontend/lib/calculos.ts` — itens 1.1 a 1.6, 1.13, 1.14, 1.15
- `frontend/lib/mockData.ts` — itens 1.9
- `frontend/types/index.ts` — remover `encargosPercentual`, adicionar `grupoC`, `grupoDLinha`, `adicionalProdutividade`, `modalidadeAjudante`, `composicaoManual`, `sinapiRef`, `parametrosObsoletos`, `descontoCliente`
- `frontend/components/engenheiro/ConsultaComposicao.tsx` — 1.7, 2.3, 3.5, 4.4
- `frontend/components/engenheiro/ComposicoesProfissionais.tsx` — 1.8, 2.4
- `frontend/components/engenheiro/ParametrosGlobais.tsx` — 1.10, 2.6, 3.3, 5.2
- `frontend/components/engenheiro/PrecificacaoFinal.tsx` — 1.11, 3.8, 1.12
- `frontend/components/engenheiro/CalculadoraMO.tsx` — 2.7, 3.6, 4.3
- `frontend/components/engenheiro/CalculadoraMateriais.tsx` — 1.14, 2.11
- `frontend/components/engenheiro/Precificador.tsx` — 2.8, 3.7
- `frontend/components/engenheiro/QuantitativosServico.tsx` — 2.2
- `frontend/components/engenheiro/ConsolidacaoOrcamento.tsx` — 2.5, 3.9
- `frontend/components/engenheiro/GestaoOrcamentos.tsx` — 2.10, 3.2, 5.4
- `frontend/components/engenheiro/GestaoPlantasModule.tsx` — 2.9
- `frontend/components/engenheiro/OrcamentoWizard.tsx` — 2.1, 2.12, 4.1
- `frontend/components/engenheiro/SidebarEngenheiro.tsx` — 3.1, 5.5
- `frontend/components/engenheiro/PainelGeral.tsx` — 3.2, 5.3
- `frontend/components/engenheiro/OperationalModuleShell.tsx` — 3.11
- `frontend/components/engenheiro/StepperEtapas.tsx` — 3.10
- `frontend/components/engenheiro/EngineerApp.tsx` — 4.1, 4.2, 5.6

---

## 9. CRITÉRIOS DE ACEITAÇÃO GERAIS

- Nenhum `1.2` ou `220` ou `2664.75` hardcoded em arquivos de cálculo. Tudo vem de `globalParams`.
- Nenhuma divisão onde denominador pode ser zero sem guarda explícita.
- Toda ação destrutiva tem confirmação.
- Todo salvamento silencioso tem feedback (toast).
- Valores exibidos em E6 batem com fórmulas do docx (seção 9 "Formulário Consolidado").
- Alterar parâmetros globais marca orçamentos existentes como "Obsoleto" com banner visível.
