# Alinhamento do Backend Python à Lógica de Cálculo do Frontend

Fonte da verdade: `frontend/lib/calculos.ts` (já corrigido).
Arquivos do backend a modificar:
- `backend/app/services/orcamento_service.py`
- `backend/app/routers/calculos.py`
- `backend/app/utils/config.py`

Há **22 divergências** entre as duas implementações. O backend está desatualizado e produzirá resultados diferentes do frontend se for chamado hoje.

---

## 1. DIVERGÊNCIAS CRÍTICAS (resultado numérico diferente)

### 1.1 `calcular_cenario` não recebe `modalidade` nem aplica % de bônus
**backend `orcamento_service.py:33-45`**

Atual:
```python
custo_base = hh_prof * vh_prof_enc + hh_ajud * vh_ajud_enc   # sempre CLT
bonus = max(0, c_sinapi - custo_base) if nome != "Mensalista" else 0   # sem % MEI/CLT
```

Frontend (`calculos.ts:190-193`):
```ts
const custoBase = modalidade === 'MEI'
  ? (hhP * vhQualSem * 1.3 + custoAjudanteMEI)
  : (hhP * vhQualCom + hhA * vhServCom)
const bonusPercentual = modalidade === 'MEI' ? 0.64 : 0.56
const bonusCenario = Math.max(0, cSINAPI - custoBase) * bonusPercentual
```

**Ação:** adicionar parâmetros `modalidade: str` e `modalidade_ajudante: str` em `calcular_cenario`. Escolher custo base por modalidade. Aplicar 0,64 (MEI) ou 0,56 (CLT) no bônus.

### 1.2 Ajudante MEI ignorado
**backend `orcamento_service.py:40`** — `vh_ajud_enc` fixo.

**Ação:** passar `modalidade_ajudante`. Se MEI, custo ajudante = `hh_ajud * vh_serv_sem * 1.3`. Caso contrário `hh_ajud * vh_serv_enc`. Alinhar com linha 190 do TS.

### 1.3 `custo_final_*` usa cenário `prazo`, deveria usar `otima`
**backend `orcamento_service.py:97-102`**

Atual:
```python
hh_prof_prazo = prazo["hh_profissional"]
hh_ajud_prazo = prazo["hh_ajudante"]
custo_final_mei = hh_prof_prazo * vh_prof_sem * 1.3 + hh_ajud_prazo * vh_serv_enc + valor_bonus_mei
custo_final_clt = hh_prof_prazo * vh_prof_enc + hh_ajud_prazo * vh_serv_enc + valor_bonus_clt
```

Frontend (`calculos.ts:257-259`) usa **`otima.hhProfissional` e `otima.hhAjudante`**.

**Ação:** trocar `prazo[...]` por `otima[...]`. Ajustar `custo_ajudante_mei` conforme `modalidade_ajudante`.

### 1.4 Economia calculada contra cenário errado
**backend `orcamento_service.py:87-88`**
```python
custo_real = prazo["custo_base"]   # ERRADO
economia = max(0, c_sinapi - custo_real)
```

Frontend (`calculos.ts:254`): `const economia = Math.max(0, cSINAPI - otima.custoBase)`

**Ação:** `custo_real = otima["custo_base"]`.

### 1.5 `salario_esperado_*` soma bônus duplamente
**backend `orcamento_service.py:107-108`**
```python
salario_esperado_mei = salario_qualificado * 1.3 + valor_bonus_mei   # ERRADO: bônus duas vezes
salario_esperado_clt = salario_qualificado * fator_encargos + valor_bonus_clt
```

Frontend (`calculos.ts:260-261`):
```ts
const salarioEsperadoMEI = params.salarioQualificado * 1.3
const salarioEsperadoCLT = params.salarioQualificado * params.fatorEncargos
```

Depois o frontend retorna `bonusMEI = salarioEsperadoMEI + valorBonusProducaoMEI` (linha 266) — aí sim o bônus entra, em outro campo.

**Ação:** remover `+ valor_bonus_*` de `salario_esperado_*`. Retornar `bonus_mei = salario_esperado_mei + valor_bonus_mei` se quiser manter um campo agregado.

### 1.6 `valor_mensal_esperado_*` multiplica por `22/prazo_ef`
**backend `orcamento_service.py:110, 132-133`**
```python
mensal_fator = (22 / prazo_ef) if prazo_ef > 0 else 1
valor_mensal_esperado_mei = remuneracao_mei * mensal_fator
```

Frontend (`calculos.ts:275-276`):
```ts
valorMensalEsperadoMEI: salarioEsperadoMEI + valorBonusProducaoMEI,
valorMensalEsperadoCLT: salarioEsperadoCLT + valorBonusProducaoCLT,
```

**Ação:** remover `mensal_fator`. `valor_mensal_esperado_mei = salario_esperado_mei + valor_bonus_mei`.

### 1.7 `remuneracao_clt = custo_real + valor_bonus_clt` é conceitualmente diferente
**backend `orcamento_service.py:105`**

Frontend não tem campo equivalente; o conceito mais próximo é `bonusCLT = salarioEsperadoCLT + valorBonusProducaoCLT`.

**Ação:** substituir por `remuneracao_clt = salario_qualificado * fator_encargos + valor_bonus_clt`. Mesma estrutura do MEI.

### 1.8 Falta campo `desconto_cliente` na resposta
Frontend (`calculos.ts:278`): `descontoCliente: 0.30 * economia`.

**Ação:** adicionar `desconto_cliente = 0.30 * economia` no retorno de `calcular_mao_de_obra` e no `ServicoMOResponse` (router). No frontend, MEI usa `economia * 0.22` em `calcularItem`, mas `calcularMOEngenheiro` (engenheiro) usa `0.30` fixo — seguir 0,30.

### 1.9 Dedup de insumos em materiais
**backend `orcamento_service.py:141-167`** — soma todos os insumos, sem deduplicar por código.

Frontend (`calculos.ts:284-298`) deduplica por `codigoSINAPI` somando coeficientes.

**Ação:** antes de iterar, agrupar por `codigo` somando `coeficiente`; manter último `valor_unitario`.

### 1.10 Fator INCC começa um mês adiantado
**backend `orcamento_service.py:180`**
```python
fator_incc = (1 + incc_mensal) ** (i + 1)   # mês 1 já recebe correção
```

Frontend (`calculos.ts:390`): `const fator = Math.pow(1 + inccMensal, i)` — mês 1 sem correção, mês 2 é `(1+i)^1`.

**Ação:** trocar `** (i + 1)` por `** i`.

### 1.11 Cenários Mensalista/Ótima usam `prazo_requerido` cheio
**backend `orcamento_service.py:73-78`**

Frontend (`calculos.ts:251-252`) usa prazos proporcionais via `prazoCenario(0.9, prazoRequerido)` (Mensalista) e `prazoCenario(0.35, prazoRequerido)` (Ótima). Metodologia v2: Mensalista = ~18 dias, Ótima = ~7 dias, Prazo = 19 dias (exemplo do docx).

**Ação:** replicar a função auxiliar:
```python
def prazo_cenario(escala: float, prazo_requerido: int) -> int:
    base = prazo_requerido if prazo_requerido > 0 else 22
    return max(1, round(base * escala))
```
Passar `prazo_cenario(0.9, prazo_requerido)` para Mensalista, `prazo_cenario(0.35, prazo_requerido)` para Ótima, `prazo_requerido` para Prazo.

### 1.12 `ajudantes_necessarios` mínimo = 1 quando deveria aceitar 0
**backend `orcamento_service.py:38`**
```python
n_ajud = max(1, math.ceil(hh_ajud / (prazo_requerido * 8))) if hh_ajud > 0 else 0
```

Frontend (`calculos.ts:189`): `const nA = Math.max(0, Math.ceil(hhA / (prazoEf * 8)))` — permite 0 se `hhA` for minúsculo.

**Ação:** trocar para `max(0, ...)` e usar `prazo_ef` (não `prazo_requerido`) no denominador.

### 1.13 Divisão por zero quando `prazo_requerido = 0`
**backend `orcamento_service.py:37`** quebra se `prazo_requerido = 0`.

Frontend (`calculos.ts:186-187`): usa `prazo_seguro = prazoAlvo > 0 ? prazoAlvo : (hhP / 8)`.

**Ação:** adicionar guarda equivalente antes da divisão.

---

## 2. DIVERGÊNCIAS DE SEMÂNTICA (precisam decisão antes de corrigir)

### 2.1 `calcular_tabela_aportes` usa parcela corrigida (com INCC)
**backend `orcamento_service.py:208-229`** — desembolso e repasse usam `custo_parcela_corrigido`.
Frontend (`calculos.ts:355-375`) usa `custoMensal = precoFinal / tempoObraMeses` (nominal).

**Impacto:** desembolso total mensal diferente entre frontend e backend, especialmente em obras longas (INCC acumula).

**Decisão necessária:** qual é o "certo"? Fisicamente, o aporte sobre valor atualizado faz mais sentido. Frontend está simplificado. **Sugestão:** alinhar o frontend ao backend (usar parcela corrigida).

### 2.2 `diaria_com_encargos` em `calcular_salario`
**backend `orcamento_service.py:27`**: `salario_base * fator_encargos / 22` → qualificado = R$ 315,08.
Frontend `mockData.ts`: `diariaComEncargos: 193.96` (constante hardcoded, igual ao docx Tabela 10).
193,96 = 2.664,75 × 1,6013 / 22 (usa percentual, não fator).

**Decisão necessária:** qual semântica? Se 193,96 representa "custo-dia adicional por encargos" (percentual), OK manter como constante exibida. Se representa "custo-dia total", backend está matematicamente correto e o docx/mockData estão errados.

**Sugestão:** tratar como dois campos distintos: `diaria_custo_total_enc` (fator) e `diaria_adicional_encargos` (percentual). Remover ambiguidade.

### 2.3 Adicional de produtividade aceito como porcentagem inteira
**frontend `calculos.ts:205-207`**:
```ts
const adicionalPrazo = config.adicionalProdutividade > 2
  ? 1 + (config.adicionalProdutividade / 100)
  : Math.max(1, config.adicionalProdutividade || 1.30)
```
Aceita `1.30` (fator) ou `30` (percentual). Backend recebe apenas fator.

**Ação:** alinhar backend à mesma heurística, ou padronizar contrato da API para exigir fator (1,30) e validar via Pydantic. **Recomendo padronizar em fator e rejeitar > 2 na API** — remove ambiguidade.

---

## 3. FUNCIONALIDADES AUSENTES NO BACKEND

### 3.1 Lookup de composição SINAPI para derivar produtividade
Frontend (`calculos.ts:124-145`) `resolverParametrosMOComposicao`: busca `COMPOSICOES_ANALITICAS` pelo `composicaoBasica`, extrai coeficientes de Pedreiro/Azulejista e Servente, calcula `produtividadeBasica = 1/coefProf` e `proporcaoAjudante = coefAjudante/coefProf`.

**Backend não tem esse lookup.** A composição SINAPI só existirá no backend após etapas 09a/09b (ingestão SINAPI). **Ação:** implementar após 09a. Enquanto isso, o frontend envia `produtividade_basica` e `proporcao_ajudante` já resolvidos — mantém o contrato.

### 3.2 Caso especial composição 87421 (valores calibrados do docx)
Frontend (`calculos.ts:212-249`) retorna valores fixos quando composição = 87421 + qtd = 340 + esp1 ~ "Gesso Liso". Cenários: Mensalista (2 prof, 1 ajud, 18 dias, R$ 7.224,56), Ótima (3, 1, 7, R$ 3.805,20), Prazo (1, 1, 19, R$ 4.923,45).

**Ação:** replicar o bloco condicional no backend, ou transformar em **fixture de teste** (etapa 13) em vez de código de produção. **Recomendo mover para teste** — override hardcoded em produção é cheiro ruim.

### 3.3 `gerar_quantitativos_from_parametros` e `calcular_faixa_cotacao`
Frontend tem (`calculos.ts:398-474`), backend não.

**Ação:** portar ambas as funções para Python. `calcular_faixa_cotacao` entrega a estimativa mínima/máxima para o cliente na tela inicial (fluxo cliente). Importante para paridade.

### 3.4 `consolidar_engenheiro`
Frontend `calculos.ts:300-327` produz `OrcamentoConsolidado`. Backend tem `calcular_precificacao_completa` que é similar mas não idêntico (retorna mais campos de financiamento, não retorna `status` nem `observacoes`).

**Ação:** decidir se mantêm duas funções (consolidação técnica + precificação comercial) ou unificam. Documentar.

---

## 4. CONSTANTES A VALIDAR EM `config.py`

Conferir cada uma contra `frontend/lib/mockData.ts → GLOBAL_PARAMS` e contra o docx:

| Constante | Backend | Esperado (docx) | Status |
|---|---|---|---|
| `CM_ENCARGOS_GRUPO_A` | 0,2780 | 27,80% | ✓ |
| `CM_ENCARGOS_GRUPO_B` | 0,5293 | 52,93% | ✓ |
| `CM_ENCARGOS_GRUPO_D` | 0,1619 | 16,19% | ✓ |
| `CM_ENCARGOS_GRUPO_E` | 0,4633 | 46,33% | ✓ |
| `CM_FATOR_ENCARGOS` | 2,6013 | 2,6013 | ✓ |
| `CM_SALARIO_QUALIFICADO` | 2.664,75 | 2.664,75 | ✓ |
| `CM_SALARIO_MEIO_OFICIAL` | 2.427,36 | — | ✓ (não citado no docx) |
| `CM_SALARIO_SERVENTE` | 2.189,97 | 2.189,97 | ✓ |
| `CM_BDI_PADRAO` | 0,20 | 0,20 | ✓ |
| `CM_VALOR_META_DIARIO` | 220,00 | 220,00 | ✓ |
| `CM_BONUS_CLIENTE/PROF/CONST` | 0,30/0,56/0,14 | 0,30/0,56/0,14 | ✓ |
| `CM_INCC_MENSAL_PADRAO` | 0,005 | — | validar com engenheiro |
| `CM_MCMV_TAXA_JUROS_ANUAL` | 0,055 | — | validar |
| `CM_SBPE_TAXA_JUROS_ANUAL` | 0,0999 | — | validar |

Constantes ok. **Ação:** remover `CM_ENCARGOS_TOTAL = 1.6013` (não usado, só causa confusão com `CM_FATOR_ENCARGOS`).

---

## 5. TESTES DE PARIDADE OBRIGATÓRIOS

Após as correções, rodar o mesmo input nos dois lados e comparar:

**Caso 1 — Revestimento Argamassa Interna Paredes 1 (docx):**
- Input: quantidade 340 m², composição 87421, gesso liso 1,0cm, prod. básica 2,222 UN/h, prop. ajudante 0,5, prazo 20 dias, adicional 1,30, modalidade MEI, ajudante CLT
- Output esperado: Mensalista (2/1/18/R$ 7.224,56), Ótima (3/1/7/R$ 3.805,20), Prazo (1/1/19/R$ 4.923,45)
- Tolerância: ±2% em custos, idêntico em quantidades inteiras

**Caso 2 — Fluxo INCC:**
- Input: custo direto R$ 100.000, 8 meses, INCC 0,5%/mês
- Output esperado: mês 1 = R$ 12.500 (sem correção, fator 1,0), mês 8 = ~R$ 12.944 (fator 1,005^7)

**Caso 3 — Materiais com insumos duplicados:**
- Input: insumos = [(cod=1, coef=1, val=10), (cod=1, coef=2, val=10), (cod=2, coef=1, val=20)], qtd=1
- Output esperado: R$ 50 (código 1 somado: (1+2)×10 + código 2: 1×20)
- Sem dedup o backend retorna R$ 50 também (por acaso) — adicionar caso com valor_unitario diferente para expor o bug

---

## 6. ORDEM DE EXECUÇÃO

1. **Constantes e defaults** (seção 4) — trivial, ganho de confiança
2. **Bugs críticos 1.1 a 1.13** — tudo em um PR, rodar testes de paridade do caso 1 (docx)
3. **Dedup materiais (1.9)** e **INCC (1.10)** se for fazer separado
4. **Semântica (seção 2)** — alinhar com o engenheiro antes, não fazer à revelia
5. **Funcionalidades ausentes (seção 3)** — `faixa_cotacao` primeiro (bloqueia fluxo cliente), depois `consolidar_engenheiro`, depois lookup SINAPI (entra junto da etapa 09a)
6. **Testes de paridade (seção 5)** — como regressão, rodar no CI

---

## 7. CRITÉRIOS DE ACEITAÇÃO

- Rodar o input do docx nos dois lados retorna valores idênticos (tolerância ±0,01 em moeda, ±0,001 em fator).
- `ServicoMOResponse` contém `desconto_cliente`.
- Zero chamada a `prazo["custo_base"]` para economia ou custo final — tudo via `otima`.
- Parâmetros `modalidade` e `modalidade_ajudante` chegam a `calcular_cenario` e influenciam o custo base.
- Insumos duplicados por código somam coeficientes.
- Fator INCC do mês 1 é 1,000 (sem correção).
- `salario_esperado_*` não contém bônus; bônus está em campo separado.
- Suíte de testes de paridade passa em CI.
