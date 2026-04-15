# SISTEMA DE ORÇAMENTAÇÃO PARA CONSTRUÇÃO CIVIL — DOCUMENTAÇÃO TÉCNICA

**Revisão:** Janeiro/2026  
**Base de referência:** SINAPI 01/2026 (emitido em 23/03/2026)

---

## 1. VISÃO GERAL

O sistema de orçamentação para construção civil é composto por nove módulos inter-relacionados que calculam, de forma integrada, os custos de mão de obra, materiais, encargos sociais e preço final de venda de serviços. O sistema utiliza como referência principal a base de dados SINAPI (Sistema Nacional de Pesquisa de Custos e Índices da Construção Civil).

---

## 2. PARÂMETROS GLOBAIS DO SISTEMA

### 2.1 BDI — Benefícios e Despesas Indiretas

O BDI representa a parcela de custos indiretos e lucro que incide sobre o custo direto para formação do preço final de venda. O valor padrão adotado é de **20%**.

**Faturamento mensal de referência:**
- Valor base: R$ 40.000,00
- Valor adicional: R$ 4.800,00

**Componentes que integram o BDI:**
- Aluguel de escritório/estrutura
- Impostos (federais, estaduais, municipais)
- Pró-labore da direção
- BDI em cima do projetado

**Fórmula de formação do preço final:**

$$P_{\text{final}} = C_{\text{direto}} \times (1 + \text{BDI})$$

$$P_{\text{final}} = C_{\text{direto}} \times 1{,}20$$

---

### 2.2 Encargos Sociais

Os encargos sociais são calculados como percentual sobre o salário base e representam o custo total das obrigações trabalhistas e benefícios do trabalhador. O percentual total do sistema é de **160,13%**, organizado em cinco grupos.

---

#### Grupo A — Encargos Sociais Básicos (Total: 27,80%)

| Código | Descrição | Percentual |
|--------|-----------|------------|
| A1 | INSS | 10,00% |
| A2 | FGTS | 8,00% |
| A3 | Salário Educação | 2,50% |
| A4 | SESI | 1,50% |
| A5 | SENAI e SEBRAE | 16,00% |
| A6 | INCRA | 2,00% |
| A7 | Seguro Contra Riscos e Acidentes | 3,00% |
| A8 | SECONCI | 1,00% |
| | **Total Grupo A** | **27,80%** |

#### Grupo B — Encargos que Recebem Incidência do Grupo A (Total: 52,93%)

| Código | Descrição | Percentual |
|--------|-----------|------------|
| B1 | Repouso Semanal Remunerado | 18,13% |
| B2 | Feriados | 8,00% |
| B3 | Férias + 1/3 Constitucional | 15,10% |
| B4 | Auxílio Enfermidade e Acidentes de Trabalho | 2,58% |
| B5 | 13º Salário | 11,33% |
| B6 | Licença Paternidade | 0,13% |
| B7 | Faltas Justificadas por Motivos Diversos | 0,76% |
| | **Total Grupo B** | **52,93%** |

#### Grupo C — Incidência Cruzada (A sobre B)

O Grupo C representa a incidência dos encargos do Grupo A sobre os itens do Grupo B, pois estes também constituem base de cálculo.

$$C = A \times B = 0{,}2780 \times 0{,}5293 = 14{,}71\%$$

#### Grupo D — Encargos Ligados à Demissão (Total: 16,19%)

| Código | Descrição | Percentual |
|--------|-----------|------------|
| D1 | Aviso Prévio | 11,56% |
| D2 | Depósito por Despedida Injusta | 3,08% |
| D3 | Indenização Adicional | 0,78% |
| D4 | Adicional Lei Complementar 110/01 | 0,77% |
| | **Total Grupo D** | **16,19%** |

#### Grupo D' — Cálculo Específico de Incidência do FGTS em D

Correção da incidência do FGTS e SECONCI sobre o aviso prévio, excluindo os próprios encargos do depósito:

$$D' = (A - A_2 - A_8) \times D_1 = (0{,}2780 - 0{,}0800 - 0{,}0100) \times 0{,}1156 = 2{,}17\%$$

#### Grupo E — Outros Encargos (Total: 46,33%)

| Código | Descrição | Percentual |
|--------|-----------|------------|
| E1 | Dias de chuva e outras dificuldades | 1,50% |
| E2 | Almoço | 21,34% |
| E3 | Jantar | 3,87% |
| E4 | Café da manhã | 8,47% |
| E5 | Equipamento de segurança (EPI) | 6,14% |
| E6 | Vale-transporte | 4,57% |
| E7 | Seguro de vida e acidentes | 0,44% |
| | **Total Grupo E** | **46,33%** |

---

#### Total Geral de Encargos Sociais

$$\text{Total} = A + B + C + D + D' + E = 27{,}80 + 52{,}93 + 14{,}71 + 16{,}19 + 2{,}17 + 46{,}33 = \mathbf{160{,}13\%}$$

Este percentual é aplicado sobre o salário base para obter o custo real total da mão de obra:

$$C_{MO} = S_{\text{base}} \times (1 + 1{,}6013) = S_{\text{base}} \times 2{,}6013$$

---

## 3. BASE DE DADOS SINAPI

### 3.1 ISE — Insumos Sem Encargos Sociais

Base de dados oficial do SINAPI contendo preços medianos de insumos por Unidade da Federação.

**Parâmetros gerais:**
- Mês de referência: Janeiro/2026
- Total de insumos: 4.861 registros
- Cobertura estadual: 27 UFs (AC, AL, AM, AP, BA, CE, DF, ES, GO, MA, MG, MS, MT, PA, PB, PE, PI, PR, RJ, RN, RO, RR, RS, SC, SE, SP, TO)

**Estrutura de dados de cada insumo:**

| Campo | Descrição |
|-------|-----------|
| Classificação | Categoria do insumo (MATERIAL, SERVIÇOS, etc.) |
| Código | Identificador único SINAPI |
| Descrição | Denominação completa do insumo |
| Unidade | Unidade de medida |
| Origem do Preço | `C` = Coletado diretamente; `CR` = Coeficiente de Representatividade |
| Preços por UF | Preço mediano em R$ para cada estado |

> Campos de preço em branco indicam ausência de coleta estatisticamente válida para aquele estado. Todos os preços são **sem** incidência de encargos sociais.

---

### 3.2 Composições Analíticas SINAPI

Relatório analítico de composições SINAPI, descrevendo a decomposição de cada serviço em seus insumos e subcomposições.

**Parâmetros gerais:**
- Mês de referência: Janeiro/2026
- Total de registros: 64.943 linhas

**Estrutura de dados:**

| Campo | Descrição |
|-------|-----------|
| Grupo | Categoria do serviço |
| Código da Composição | Identificador da composição principal |
| Tipo de Item | `COMPOSICAO`, `INSUMO` ou vazio (serviço principal) |
| Código do Item | Identificador do item componente |
| Descrição | Denominação do item |
| Unidade | Unidade de medida |
| Coeficiente | Quantidade do item por unidade do serviço principal |
| Situação | Status do item (ver abaixo) |

**Situações possíveis:**

| Situação | Significado |
|----------|-------------|
| COM PRECO | Insumo com preço coletado no estado |
| SEM PRECO | Insumo sem coleta de preços disponível |
| COM CUSTO | Composição com custo calculado |
| SEM CUSTO | Composição sem custo (falta preço de algum item) |
| EM ESTUDO | Composição em análise/revisão |

**Hierarquia das composições (três níveis):**

1. **Nível 0** — Linha sem Tipo de Item: serviço principal (ex.: código 104658)
2. **Nível 1** — `COMPOSICAO`: subserviço referenciado (ex.: 88316 — SERVENTE)
3. **Nível 2** — `INSUMO`: material direto (ex.: 36178 — PISO TÁTIL)

---

### 3.3 Consulta de Composição com Custo

Interface de consulta que permite calcular o custo de uma composição SINAPI específica, parametrizada por estado e opção de encargos sociais.

**Campos de entrada:**

| Campo | Valores possíveis |
|-------|-------------------|
| Encargos Sociais | `SEM ENCARGOS SOCIAIS` ou `COM ENCARGOS SOCIAIS` |
| UF | Sigla do estado (ex.: `SP`) |
| Código da Composição | Código SINAPI a consultar (ex.: `88423`) |

**Campos de saída por item da composição:**

| Campo | Descrição |
|-------|-----------|
| Tipo Item | COMPOSIÇÃO ou INSUMO |
| Código | Código SINAPI do item |
| Descrição | Nome do item |
| Unidade | Unidade de medida |
| Coeficiente | Quantidade por unidade do serviço |
| Custo Unitário | Preço unitário do item para a UF selecionada |
| Custo Total | $\text{Coeficiente} \times \text{Custo Unitário}$ |
| %AS | Percentual de preços atribuídos de SP por indisponibilidade local |
| Situação | Status do item (COM PRECO, SEM PRECO, etc.) |

---

## 4. COMPOSIÇÕES PROFISSIONAIS

### 4.1 Tabela de Salários de Referência

| Categoria | Salário Base | Salário c/ Encargos | Diária Base | Diária c/ Encargos |
|-----------|-------------|---------------------|-------------|---------------------|
| Qualificado | R$ 2.664,75 | R$ 4.267,06 | R$ 121,13 | R$ 193,96 |
| Meio-Oficial | R$ 2.427,36 | R$ 3.886,93 | — | — |
| Servente | R$ 2.189,97 | R$ 3.506,80 | — | — |

O salário com encargos é calculado aplicando o fator de encargos sociais total:

$$S_{\text{c/encargos}} = S_{\text{base}} \times 2{,}6013$$

---

### 4.2 Sistema de Metas de Produtividade

**Parâmetros do sistema:**
- Valor meta diário: **R$ 220,00**
- Prêmio máximo mensal calculado: **R$ 2.175,25**

**Cálculo da produtividade mínima necessária para atingir a meta:**

$$\text{Produtividade}_{UN/h} = \frac{\text{Valor Meta Diário}}{\text{R\$/UN} \times 8\text{h}}$$

$$\text{Produtividade}_{UN/dia} = \text{Produtividade}_{UN/h} \times 8$$

**Cálculo da meta de produção mensal:**

$$\text{Meta Mensal} = \text{Produtividade}_{UN/dia} \times 22 \text{ dias úteis}$$

$$\text{Meta Semanal} = \frac{\text{Meta Mensal}}{4{,}33}$$

---

### 4.3 Estrutura de Dados da Composição Profissional

| Campo | Descrição |
|-------|-----------|
| Composição Profissional | Número sequencial identificador |
| Classe | Categoria do serviço (ex.: ALVENARIA) |
| Profissional | Tipo de profissional (ex.: Pedreiro) |
| Descrição | Detalhamento da atividade |
| Serviço | Nome do serviço |
| Ref. SINAPI | Código de referência SINAPI |
| Medição | Forma de medição (ex.: M², M³) |
| Unidade | Unidade de medida |
| Produção Mensal Estimada (SINAPI) | Produção base de referência SINAPI |
| Valor Referência para Meta Diária | R$/UN necessário para atingir o valor meta |
| Produtividade UN/h | Unidades produzidas por hora |
| Produtividade UN/dia | Unidades produzidas por dia |
| Meta de Produção (Mês) — Calculada | Meta mensal calculada automaticamente |
| Meta de Produção (Semana) — Calculada | Meta semanal calculada automaticamente |
| Meta de Produção (Mês) — Estipulada | Meta mensal definida manualmente |

---

### 4.4 Categorias de Serviços Cadastrados

| # | Categoria | Profissionais |
|---|-----------|---------------|
| 1 | Acabamento Parede Externa | Azulejista, Pintor |
| 2 | Acabamento Parede Interna | Azulejista, Pintor |
| 3 | Acabamento Piso Interno | Azulejista |
| 4 | Alvenaria | Armador, Pedreiro |
| 5 | Estrutura Concreto Armado | Armador, Carpinteiro |
| 6 | Estrutura de Laje Pré-Moldada | Carpinteiro, Pedreiro |
| 7 | Fundação | Armador, Carpinteiro, Pedreiro |
| 8 | Regularização Paredes e Tetos | Gesseiro |
| 9 | Regularização Piso | Pedreiro |

---

### 4.5 Tabelas Auxiliares de Hidráulica

O módulo inclui tabelas de referência de consumo de peças e tempo de execução para instalações hidráulicas:

- Consumo de peças por ponto de aranha de banheiro
- Consumo de peças para cozinha/lavanderia
- Tempo de execução por unidade (hora/un)

---

## 5. PRECIFICADOR

### 5.1 Campos de Entrada por Serviço

| Campo | Descrição |
|-------|-----------|
| Serviços | Descrição do serviço a orçar |
| Quantidade | Quantidade total do serviço |
| Especificação 1 | Primeira característica técnica do serviço |
| Especificação 2 | Segunda característica técnica |
| Especificação 3 | Terceira característica técnica |
| Composição Básica | Código SINAPI da composição de referência |
| Composição Profissional | Número da composição profissional (CP) |
| Contratação | Modalidade: `MEI` ou `CLT` |
| Unidade | Unidade de medida |
| Custo Total | Custo calculado total do serviço |
| Custo/UN | Custo por unidade medida |

---

### 5.2 Serviços Disponíveis

| # | Serviço | Unidade |
|---|---------|---------|
| 1 | Fundação (1 a 5) | M³ |
| 2 | Estrutura Concreto Armado — Pilar, Viga, Laje, Parede de Concreto (sub-itens: Armação, Forma, Concretagem) | M³ |
| 3 | Alvenaria (1 a 6) | M² |
| 4 | Graute — Vertical e Horizontal | M³ |
| 5 | Armação Vertical / Horizontal | — |
| 6 | Área de Contrapiso | M² |
| 7 | Revestimento em Argamassa Interna — Paredes | M² |
| 8 | Revestimento em Argamassa Interna — Teto | M² |
| 9 | Revestimento Cerâmico (1 a 5) | M² |
| 10 | Pintura Interna — Selador, Massa Corrida, Pintura | M² |
| 11 | Pintura Externa — Selador, Textura | M² |
| 12 | Limpeza Interna | M² |

---

### 5.3 Tabelas de Especificações

**Alvenaria:**

| Especificação 1 | Especificação 2 | Especificação 3 |
|-----------------|-----------------|-----------------|
| Alvenaria de Vedação | Módulo 20 — Vertical/Horizontal | Concreto |
| Alvenaria Estrutural | Módulo 15 — Vertical | ESP 19 |
| Alvenaria Estrutural | Módulo 15 — Vertical/Horizontal | Cerâmico |
| — | Módulo 20 — Horizontal | — |
| — | Módulo 15 — Horizontal | — |

**Revestimento em Argamassa:**

| Especificação 1 | Especificação 2 |
|-----------------|-----------------|
| Gesso Liso | 1,0 cm |
| Massa Pronta | 1,5 cm |
| Emboço | 2,0 cm |

---

### 5.4 Modalidades de Contratação

| Modalidade | Descrição |
|------------|-----------|
| MEI | Microempreendedor Individual — sem vínculo empregatício |
| CLT | Consolidação das Leis do Trabalho — regime de emprego formal |

---

## 6. CÁLCULO DE CUSTO DE MÃO DE OBRA

### 6.1 Parâmetros de Referência

| Parâmetro | Valor |
|-----------|-------|
| BDI Aplicado | 20% |
| Valor Diária com Leis Sociais | R$ 121,125 |

**Referências de produtividade adotadas:**

| Perfil | Referência |
|--------|------------|
| Pedreiro Diária (baixo desempenho) | 80% da produtividade SINAPI |
| Pedreiro Empreita Fraca | 100% da produtividade SINAPI |
| Pedreiro Ideal | 125% da produtividade SINAPI |

---

### 6.2 Campos de Entrada por Serviço

| Campo | Descrição |
|-------|-----------|
| Serviços | Descrição do serviço |
| Unidade | Unidade de medida |
| Quantidade | Quantidade do serviço |
| Especificação 1, 2, 3 | Especificações técnicas |
| Composição Básica | Código SINAPI |
| Produtividade — Hora — Mensalista | Produtividade do mensalista em UN/h |
| Produtividade Básica (UN/h) | Produtividade de referência SINAPI |
| Adicional de Produtividade | Ajuste percentual sobre a produtividade básica |
| Produtividade Requerida (UN/h) | $\text{Prod. Básica} \times (1 + \text{Adicional})$ |
| Proporção Ajudante/Profissional | Razão entre número de ajudantes e profissionais |
| R$/UN | Custo de referência por unidade (SINAPI) |
| Prazo Requerido (dias corridos) | Período disponível para execução |

---

### 6.3 Cenários de Formação de Equipe

O sistema calcula simultaneamente três cenários para cada serviço:

| Cenário | Descrição |
|---------|-----------|
| **Equipe Mensalista** | Equipe dimensionada com produtividade do mensalista (80% SINAPI) |
| **Equipe Ótima** | Equipe dimensionada para máxima eficiência (125% SINAPI) |
| **Equipe Prazo** | Equipe dimensionada para cumprir o prazo requerido |

Cada cenário fornece os seguintes campos:

| Campo | Descrição |
|-------|-----------|
| Hora-Homem Profissional | Total de HH do profissional responsável |
| Hora-Homem Ajudante | Total de HH do ajudante |
| Profissionais Necessários | Quantidade de profissionais na equipe |
| Ajudantes Necessários | Quantidade de ajudantes na equipe |
| Prazo Efetivo (dias corridos) | Prazo real de execução com a equipe formada |
| Custo Base | Custo total do cenário sem bônus |

---

### 6.4 Fórmulas de Cálculo de Equipe

**Hora-Homem necessária para o serviço:**

$$HH = \frac{Q}{\text{Produtividade}_{UN/h}}$$

onde $Q$ é a quantidade total do serviço.

**Hora-Homem do ajudante:**

$$HH_{\text{ajudante}} = HH \times \text{proporção ajudante/profissional}$$

**Número de profissionais para o prazo requerido:**

$$N_{\text{prof}} = \frac{HH}{\text{Prazo} \times 8\text{h}}$$

**Prazo efetivo dado um número inteiro de profissionais:**

$$\text{Prazo efetivo} = \frac{HH}{N_{\text{prof}} \times 8\text{h}}$$

**Custo base da equipe:**

$$C_{\text{base}} = HH_{\text{prof}} \times V_{h,\text{prof}} + HH_{\text{ajud}} \times V_{h,\text{ajud}}$$

onde $V_{h}$ é o valor da hora-homem incluindo encargos sociais.

**Produção mensal estimada (referência de verificação):**

$$\text{Produção Mensal} = \frac{\text{Valor Meta Diário}}{\text{R\$/UN}} \times 22\text{ dias}$$

---

### 6.5 Sistema de Bônus de Performance

O sistema de bônus distribui a economia gerada quando a produtividade real supera a referência SINAPI, incentivando maior rendimento do profissional.

**Cálculo da economia:**

$$\text{Economia} = C_{\text{SINAPI}} - C_{\text{real}}$$

válido somente quando $C_{\text{real}} < C_{\text{SINAPI}}$, ou seja, quando a produtividade supera a referência.

**Distribuição da economia:**

$$\text{Economia total} = \underbrace{0{,}30 \times \text{Economia}}_{\text{repasse ao cliente}} + \underbrace{0{,}70 \times \text{Economia}}_{\text{construtora + profissional}}$$

Dos 70% retidos pela construtora:

$$0{,}70 \times \text{Economia} = \underbrace{0{,}80 \times 0{,}70 \times \text{Economia}}_{\text{profissional}} + \underbrace{0{,}20 \times 0{,}70 \times \text{Economia}}_{\text{construtora}}$$

**Bônus do profissional MEI:**

$$\text{Bônus}_{MEI} = S_{\text{base}} \times 1{,}3 + 0{,}80 \times 0{,}80 \times \text{Economia}$$

**Bônus do profissional CLT:**

$$\text{Bônus}_{CLT} = C_{\text{fixo, prazo efetivo}} + \text{participação na economia}$$

**Bônus da construtora:**

$$\text{Bônus}_{\text{construtora}} = 0{,}20 \times 0{,}70 \times \text{Economia}$$

---

### 6.6 Campos de Resultado — Bônus

| Campo | Descrição |
|-------|-----------|
| CLT (Fixo + Bônus) | Valor de produção total do profissional CLT |
| MEI (Valor de Produção) | Valor total pago ao profissional MEI |
| Salário Esperado MEI | Salário previsto para o profissional MEI |
| Salário Esperado CLT | Salário previsto para o profissional CLT |
| Custo Final — MEI | Custo total do serviço com profissional MEI + ajudante CLT |
| Custo Final — CLT | Custo total do serviço com equipe CLT e participação na economia |
| Bônus Construtora | Parcela de economia retida pela construtora (MEI ou CLT) |

---

### 6.7 Organização das Equipes

| Campo | Descrição |
|-------|-----------|
| Profissional — Equipe Ótima | Quantidade de profissionais no cenário ótimo |
| Ajudante — Equipe Ótima | Quantidade de ajudantes no cenário ótimo |
| Bônus Equipe Ótima | Valor de bônus estimado para equipe ótima |
| Profissional — Equipe Prazo | Quantidade de profissionais no cenário prazo |
| Ajudante — Equipe Prazo | Quantidade de ajudantes no cenário prazo |

---

### 6.8 Campos de Contratação

| Campo | Descrição |
|-------|-----------|
| Contratação | Modalidade selecionada (MEI ou CLT) |
| Valor Bônus | Valor do bônus de produção para a modalidade |
| Valor Equivalente Total/UN (c/ Bônus) | Custo por unidade incluindo o bônus |
| Valor Mensal Esperado | Remuneração mensal esperada do profissional |
| Valor de Bônus de Produção | Parcela de bônus calculada sobre a economia |
| Custo Total | Custo final do serviço com a contratação selecionada |

---

### 6.9 Custos Totais e Preço Final

| Campo | Descrição |
|-------|-----------|
| Custos Diretos Totais MEI | Soma dos custos de MO na modalidade MEI |
| Custos Diretos Totais CLT | Soma dos custos de MO na modalidade CLT |
| Custos Diretos/M² — MEI | Custo por metro quadrado — MEI |
| Custos Diretos/M² — CLT | Custo por metro quadrado — CLT |
| Preço Final — MEI (c/ BDI) | Preço de venda com BDI — modalidade MEI |
| Preço Final — CLT (c/ BDI) | Preço de venda com BDI — modalidade CLT |
| Preço/M² — MEI | Preço de venda por m² — MEI |
| Preço/M² — CLT | Preço de venda por m² — CLT |

$$P_{\text{final, MEI}} = C_{\text{direto, MEI}} \times (1 + 0{,}20)$$

$$P_{\text{final, CLT}} = C_{\text{direto, CLT}} \times (1 + 0{,}20)$$

**Serviços cadastrados no módulo de mão de obra:**
- Fundação: Sapata Corrida, Radier, Sapata, Estaca, Tubulão
- Estrutura Concreto Armado: Pilar, Viga, Laje (com sub-itens Armação, Forma, Concretagem)
- Alvenaria
- Revestimentos
- Pintura
- Limpeza

---

## 7. CÁLCULO DE CUSTO DE MATERIAIS

### 7.1 Campos de Entrada por Serviço

| Campo | Descrição |
|-------|-----------|
| Serviços | Descrição do serviço |
| Unidade | Unidade de medida |
| Quantidade | Quantidade total do serviço |
| Especificação 1, 2, 3 | Especificações técnicas |
| Composição Básica | Código SINAPI |

---

### 7.2 Insumos por Serviço (até 5 insumos)

| Campo | Descrição |
|-------|-----------|
| Insumo 1 a 5 — Coeficiente | Quantidade do insumo por unidade do serviço |
| Valor Unitário 1 a 5 | Preço do insumo (referência SINAPI/ISE) |
| Total | Custo total de materiais do serviço |

**Fórmula de custo de materiais:**

$$C_{\text{mat}} = \sum_{i=1}^{5} \text{Coef}_i \times V_{\text{unit},i}$$

---

### 7.3 Resultado Final de Materiais

O módulo de materiais segue a mesma estrutura de cenários, bônus e preço final do módulo de mão de obra. O custo total de materiais com BDI é calculado como:

$$P_{\text{mat, final}} = C_{\text{mat}} \times (1 + \text{BDI})$$

---

## 8. FLUXO COMPLETO DE ORÇAMENTAÇÃO

### Etapa 1 — Configuração Inicial

1. Definir o BDI (padrão: 20%)
2. Verificar percen­tual de encargos sociais (padrão: 160,13%)
3. Confirmar salários base (Qualificado: R$ 2.664,75 / Servente: R$ 2.189,97)

### Etapa 2 — Levantamento de Quantitativos

1. Para cada serviço a orçar:
   - Informar a quantidade
   - Selecionar as especificações técnicas (1, 2, 3)
   - Informar o código da composição básica SINAPI
   - Selecionar a composição profissional correspondente
   - Definir a modalidade de contratação (MEI ou CLT)

### Etapa 3 — Consulta de Referências SINAPI

1. Consultar a composição desejada para obter coeficientes e insumos
2. Verificar preços de materiais por UF
3. Confirmar a composição analítica (coeficientes de cada insumo)

### Etapa 4 — Cálculo de Mão de Obra

1. Preencher os dados do serviço (quantidade, especificações, produtividade, prazo)
2. O sistema calcula automaticamente:
   - Os três cenários de equipe (Mensalista, Ótima, Prazo)
   - As horas-homem necessárias
   - Os custos base de cada cenário
   - O bônus de performance (MEI e CLT)
   - Os custos finais com bônus
   - O preço de venda com BDI

### Etapa 5 — Cálculo de Materiais

1. Informar os coeficientes de cada insumo (até 5 por serviço)
2. Informar os valores unitários de referência
3. O sistema calcula o custo total de materiais

### Etapa 6 — Consolidação

1. Somar custos de mão de obra + materiais
2. Aplicar BDI sobre o custo direto total
3. Obter o preço final de venda por serviço e por m²

---

## 9. FORMULÁRIO CONSOLIDADO DE CÁLCULOS

### Custo da Mão de Obra com Encargos

$$C_{MO} = S_{\text{base}} \times 2{,}6013$$

### Hora-Homem Necessária

$$HH = \frac{Q}{\text{Prod}_{UN/h}}$$

### Profissionais Necessários para um Prazo

$$N_{\text{prof}} = \frac{HH}{\text{Prazo} \times 8}$$

### Custo Base da Equipe

$$C_{\text{base}} = HH_{\text{prof}} \times V_{h,\text{prof}} + HH_{\text{ajud}} \times V_{h,\text{ajud}}$$

### Bônus de Performance — MEI

$$\text{Bônus}_{MEI} = S_{\text{base}} \times 1{,}3 + 0{,}64 \times \text{Economia}$$

### Bônus da Construtora

$$\text{Bônus}_{\text{construtora}} = 0{,}14 \times \text{Economia}$$

### Custo de Materiais

$$C_{\text{mat}} = \sum_{i=1}^{5} \text{Coef}_i \times V_{\text{unit},i}$$

### Produtividade Mensal Estimada

$$\text{Produção Mensal} = \frac{\text{Valor Meta Diário}}{\text{R\$/UN}} \times 22$$

### Preço Final de Venda

$$P_{\text{final}} = (C_{MO} + C_{\text{mat}}) \times (1 + \text{BDI})$$

$$P_{\text{final}} = (C_{MO} + C_{\text{mat}}) \times 1{,}20$$

---

## 10. VARIÁVEIS CRÍTICAS DO SISTEMA

| Variável | Valor Padrão | Impacto |
|----------|-------------|---------|
| BDI | 20% | Margem aplicada sobre todos os custos diretos |
| Encargos Sociais | 160,13% | Multiplica o salário base para obter custo real de MO |
| Salário Qualificado | R$ 2.664,75 | Base de cálculo para profissionais |
| Salário Meio-Oficial | R$ 2.427,36 | Base de cálculo para meio-oficiais |
| Salário Servente | R$ 2.189,97 | Base de cálculo para ajudantes |
| Valor Meta Diário | R$ 220,00 | Referência para cálculo de bônus e produtividade |
| Diária com Leis Sociais | R$ 121,125 | Custo diário do profissional qualificado |
| Diária com Encargos (Qualif.) | R$ 193,96 | Custo real diário incluindo todos os encargos |
| Prêmio Máximo Mensal | R$ 2.175,25 | Teto do bônus de produção por mês |

---

## 11. REFERÊNCIAS CRUZADAS ENTRE MÓDULOS

```
Precificador ──────► Mão de Obra        (composições e quantidades)
Precificador ──────► Materiais          (composições e quantidades)
Composições Prof. ─► Mão de Obra        (produtividades e metas)
ISE ───────────────► Consulta SINAPI    (preços de insumos por UF)
Analítico ─────────► Consulta SINAPI    (coeficientes dos insumos)
Encargos Sociais ──► Composições Prof.  (cálculo de salários c/ encargos)
BDI ───────────────► Mão de Obra        (cálculo de preço final)
BDI ───────────────► Materiais          (cálculo de preço final)
```

---

## 12. CONSIDERAÇÕES METODOLÓGICAS

1. **Base SINAPI como referência:** O sistema utiliza os dados do SINAPI como referência de produtividade e preços, permitindo ajustes para refletir condições reais de obra.

2. **Comparativo MEI vs. CLT:** A diferenciação entre modalidades de contratação permite ao gestor avaliar o impacto real de cada regime na composição de custos do serviço.

3. **Incentivo à produtividade:** O sistema de bônus distribui a economia gerada pela maior produtividade entre o profissional (56% da economia), o cliente (30% da economia) e a construtora (14% da economia), alinhando incentivos de todas as partes.

4. **Três cenários complementares:** Os cenários Mensalista, Ótima e Prazo permitem analisar os trade-offs entre custo e prazo de execução antes de fechar o orçamento.

5. **Preços regionalizados:** A consulta de insumos por UF garante aderência aos preços praticados em cada mercado regional, com fallback para SP quando a coleta local é insuficiente.

6. **Mês de referência:** Todos os preços SINAPI utilizados correspondem à competência Janeiro/2026, emitidos em 23/03/2026.
