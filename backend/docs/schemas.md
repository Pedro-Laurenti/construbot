# Schemas Azure Table Storage — ConstruBot

Este documento define a estrutura de dados de todas as entidades do ConstruBot armazenadas em Azure Table Storage.

## Convenções Gerais

### Nomenclatura de Tabelas

- Padrão: PascalCase singular (ex: `Cliente`, `Orcamento`, `InsumoSINAPI`)
- Prefixo `CM` não é necessário (já isolado por Storage Account)

### PartitionKey e RowKey

**PartitionKey:** sempre no formato `{tenantId}#{categoria}` para isolamento multi-tenant e distribuição de carga

- `tenantId` será implementado na etapa 04 (autenticação) e refinado na etapa 12 (permissões). Por ora, usar `default` como tenant único
- `categoria` agrupa entidades logicamente relacionadas (ex: `CLIENTE`, `ORCAMENTO`, `SINAPI_INSUMO`)

**RowKey:** identificador único da entidade, geralmente UUID ou código composto

**Exemplo:** `PartitionKey = "default#CLIENTE"`, `RowKey = "uuid-do-cliente"`

### Serialização de Campos Complexos

- Azure Tables suporta nativamente: `string`, `int`, `float`, `bool`, `datetime`, `binary`
- Campos complexos (arrays, objetos aninhados) → serializar como `string` JSON
- Convenção de nomenclatura para campos JSON: sufixo `Json` (ex: `itensJson`, `parametrosJson`)
- Na camada de persistência (etapa 03), criar helpers `serialize_entity()` e `deserialize_entity()` em `backend/app/utils/table_helpers.py`

### Campos de Auditoria

Toda entidade mutável deve ter:

- `createdAt` (string ISO 8601 UTC)
- `updatedAt` (string ISO 8601 UTC)
- `createdBy` (string, email do usuário — disponível após etapa 04)
- `updatedBy` (string, email do usuário — disponível após etapa 04)

### Limites do Azure Table Storage

- Tamanho máximo por entidade: **1MB**
- Máximo de propriedades por entidade: **252** (3 são reservadas: PartitionKey, RowKey, Timestamp)
- Tamanho máximo de propriedade string: **64KB** (suficiente para JSON serializado de arrays médios)
- Para arrays grandes (ex: 100+ itens de orçamento), considerar estratégia de paginação ou tabela auxiliar

### Limites Específicos do Projeto

- `OrcamentoItem[]` em `Orcamento`: espera-se até 50 itens por orçamento → ~30KB JSON serializado → dentro do limite
- `InsumoSINAPI`: 27 UFs × preço → caber em 27 colunas individuais ou 1 JSON pequeno
- `ComposicaoAnalitica.itens[]`: até 30 itens por composição → ~15KB JSON → dentro do limite
- `OrcamentoEngenheiro`: pode ultrapassar 1MB se tiver 100+ serviços calculados → estratégia: separar cálculos em tabela auxiliar `CalculoServico` linkada por `orcamentoEngenheiroId`

---

## Tabela: Cliente

**Descrição:** Usuários finais que solicitam orçamentos.

**PartitionKey:** `{tenantId}#CLIENTE`  
**RowKey:** `{clienteId}` (UUID gerado no cadastro)

### Colunas

| Coluna | Tipo Azure | Tipo TS Original | Obrigatório | Notas |
|--------|-----------|-----------------|-------------|-------|
| `PartitionKey` | string | - | Sim | `default#CLIENTE` |
| `RowKey` | string | - | Sim | UUID do cliente |
| `nome` | string | string | Sim | Nome completo |
| `telefone` | string | string | Sim | Formato E.164 ou local |
| `email` | string | string | Sim | Único por tenant, lowercase normalizado |
| `senha` | string | string? | Não | Hash bcrypt. Após etapa 04 (Azure AD), remover este campo |
| `dataCadastro` | string | string | Sim | ISO 8601 UTC |
| `createdAt` | string | - | Sim | ISO 8601 UTC |
| `updatedAt` | string | - | Sim | ISO 8601 UTC |
| `createdBy` | string | - | Não | Email (disponível após etapa 04) |
| `updatedBy` | string | - | Não | Email (disponível após etapa 04) |

### Índices Secundários (Query Patterns)

- Por email: `filter = "PartitionKey eq '{tenant}#CLIENTE' and email eq '{email}'"`
- Listar todos do tenant: `filter = "PartitionKey eq '{tenant}#CLIENTE'"`

### Validações

- Email deve ser validado com regex antes de persistir
- Email deve ser único por tenant (verificar antes de insert)

---

## Tabela: Orcamento

**Descrição:** Orçamentos criados por clientes, contendo lista de serviços e totais calculados.

**PartitionKey:** `{tenantId}#{clienteId}`  
**RowKey:** `{orcamentoId}` (UUID)

### Colunas

| Coluna | Tipo Azure | Tipo TS Original | Obrigatório | Notas |
|--------|-----------|-----------------|-------------|-------|
| `PartitionKey` | string | - | Sim | `default#{clienteId}` — agrupa todos os orçamentos de um cliente |
| `RowKey` | string | - | Sim | UUID do orçamento |
| `clienteId` | string | string | Sim | Referência ao Cliente (denormalizado para facilitar queries) |
| `nome` | string | string | Sim | Nome do orçamento |
| `status` | string | OrcamentoStatus | Sim | `rascunho`, `calculado`, `enviado`, `aguardando_engenheiro`, `em_calculo`, `entregue` |
| `uf` | string | string | Sim | Sigla UF (ex: `SP`) |
| `dataCriacao` | string | string | Sim | ISO 8601 UTC |
| `itensJson` | string | OrcamentoItem[] | Sim | JSON serializado do array de itens |
| `totaisJson` | string | OrcamentoTotais? | Não | JSON serializado dos totais calculados |
| `parametrosJson` | string | ParametrosCliente? | Não | JSON serializado dos parâmetros do cliente (terreno, financiamento, etc.) |
| `saidaJson` | string | SaidaCliente? | Não | JSON serializado dos resultados finais para o cliente |
| `faixaCotacaoJson` | string | FaixaCotacao? | Não | JSON com faixa de preço estimada |
| `logEtapasJson` | string | Array<{etapa, concluidaEm}>? | Não | JSON do log de progresso |
| `motivoReabertura` | string | string? | Não | Motivo se orçamento foi reaberto após entregue |
| `createdAt` | string | - | Sim | ISO 8601 UTC |
| `updatedAt` | string | - | Sim | ISO 8601 UTC |
| `createdBy` | string | - | Não | Email |
| `updatedBy` | string | - | Não | Email |

### Índices Secundários (Query Patterns)

- Listar orçamentos de um cliente: `filter = "PartitionKey eq '{tenant}#{clienteId}'"`
- Buscar orçamento específico: `PartitionKey = '{tenant}#{clienteId}'` + `RowKey = '{orcamentoId}'`
- Filtrar por status: `filter = "PartitionKey eq '{tenant}#{clienteId}' and status eq 'entregue'"`

### Validações

- `itensJson` deve ser array válido (mínimo 1 item)
- `status` deve estar na lista de valores permitidos
- `uf` deve ser UF válida do Brasil

### Limite de Tamanho

- Com 50 itens × ~600 bytes/item → ~30KB de `itensJson`
- Totais, parâmetros, saída → ~10KB combinados
- **Total estimado:** ~50KB → bem dentro do limite de 1MB

---

## Tabela: OrcamentoEngenheiro

**Descrição:** Dados do dashboard de engenharia associados a um orçamento do cliente. Contém quantitativos, consultas SINAPI, cálculos de MO e materiais, precificação final.

**PartitionKey:** `{tenantId}#ORCAMENTO_ENG`  
**RowKey:** `{orcamentoEngenheiroId}` (pode ser igual ao `orcamentoClienteId` para mapeamento 1:1)

### Colunas

| Coluna | Tipo Azure | Tipo TS Original | Obrigatório | Notas |
|--------|-----------|-----------------|-------------|-------|
| `PartitionKey` | string | - | Sim | `default#ORCAMENTO_ENG` |
| `RowKey` | string | - | Sim | UUID (igual ao `orcamentoClienteId`) |
| `orcamentoClienteId` | string | string | Sim | Referência ao Orcamento |
| `etapaAtual` | string | string | Sim | `E1`, `E2`, `E3`, `E4`, `E5`, `E6`, `ENTREGUE` |
| `etapasConcluidasJson` | string | string[] | Sim | JSON array de etapas concluídas |
| `logEtapasJson` | string | Array? | Não | Log simples de conclusão de etapas |
| `logEtapasDetalhadoJson` | string | LogEtapaEngenharia[]? | Não | Log detalhado com usuário e motivo |
| `quantitativosJson` | string | QuantitativoServico[] | Sim | JSON array de quantitativos (Etapa 2) |
| `consultasSINAPIJson` | string | Record<string, ConsultaSINAPIServico> | Não | JSON de consultas SINAPI (Etapa 3) |
| `calculosMOJson` | string | Record<string, CenarioMOServico> | Não | JSON de cálculos de mão de obra (Etapa 4) |
| `calculosMatJson` | string | Record<string, CalculoMatConfig> | Não | JSON de cálculos de materiais (Etapa 5) |
| `fasesObraJson` | string | FaseObra[]? | Não | JSON de fases da obra |
| `precificacaoJson` | string | PrecificacaoFinalResult? | Não | JSON do resultado final (Etapa 6) |
| `statusValidacaoEtapaJson` | string | Record? | Não | JSON de validações por etapa |
| `checksumsEtapasJson` | string | Record? | Não | JSON de checksums para detecção de alterações |
| `snapshotParametrosGlobaisJson` | string | GlobalParams | Não | Snapshot dos parâmetros no momento do cálculo |
| `versaoParametrosE2` | string | string? | Não | ISO timestamp da última atualização de parâmetros na E2 |
| `versaoParametrosE4` | string | string? | Não | ISO timestamp da última atualização na E4 |
| `versaoParametrosE6` | string | string? | Não | ISO timestamp da última atualização na E6 |
| `parametrosObsoletos` | bool | boolean? | Não | Flag indicando se parâmetros globais foram alterados |
| `sinapiRef` | string | string? | Não | Referência à versão SINAPI usada (ex: `2026-01`) |
| `uiStateJson` | string | OrcamentoWizardUIState? | Não | JSON do estado da UI do wizard |
| `createdAt` | string | - | Sim | ISO 8601 UTC |
| `updatedAt` | string | - | Sim | ISO 8601 UTC |
| `createdBy` | string | - | Não | Email |
| `updatedBy` | string | - | Não | Email |

### Índices Secundários (Query Patterns)

- Buscar por ID: `PartitionKey = '{tenant}#ORCAMENTO_ENG'` + `RowKey = '{id}'`
- Listar todos do tenant: `filter = "PartitionKey eq '{tenant}#ORCAMENTO_ENG'"`
- Filtrar por etapa: `filter = "PartitionKey eq '{tenant}#ORCAMENTO_ENG' and etapaAtual eq 'E4'"`
- Buscar por orçamento cliente: `filter = "PartitionKey eq '{tenant}#ORCAMENTO_ENG' and orcamentoClienteId eq '{id}'"`

### Validações

- `orcamentoClienteId` deve existir na tabela `Orcamento`
- `etapaAtual` deve estar na lista permitida
- `etapasConcluidasJson` deve ser array JSON válido

### Limite de Tamanho — ATENÇÃO

- Com 50 serviços, cada um com:
  - `quantitativos`: ~2KB por serviço → 100KB
  - `consultasSINAPI`: ~3KB por serviço → 150KB
  - `calculosMO`: ~4KB por serviço → 200KB
  - `calculosMat`: ~2KB por serviço → 100KB
- **Total estimado:** ~550KB para 50 serviços
- **Para 100 serviços:** pode ultrapassar 1MB

**Estratégia de mitigação (implementar na etapa 03):**

- Se `calculosMOJson` + `calculosMatJson` + `consultasSINAPIJson` ultrapassar 800KB, criar tabela auxiliar `CalculoServico` com `PartitionKey = {tenant}#{orcamentoEngenheiroId}` e `RowKey = {servicoId}`
- Manter apenas IDs dos cálculos em `OrcamentoEngenheiro`, buscar detalhes sob demanda

---

## Tabela: PlantaPadrao

**Descrição:** Plantas padrão pré-configuradas com lista de serviços.

**PartitionKey:** `{tenantId}#PLANTA`  
**RowKey:** `{plantaId}` (UUID ou código)

### Colunas

| Coluna | Tipo Azure | Tipo TS Original | Obrigatório | Notas |
|--------|-----------|-----------------|-------------|-------|
| `PartitionKey` | string | - | Sim | `default#PLANTA` |
| `RowKey` | string | - | Sim | UUID da planta |
| `nome` | string | string | Sim | Nome da planta |
| `quartos` | int | number | Sim | Número de quartos |
| `areaConstruidaM2` | float | number | Sim | Área em m² |
| `tempoObraMeses` | int | number | Sim | Tempo estimado de obra |
| `descricao` | string | string | Sim | Descrição curta |
| `descricaoDetalhada` | string | string? | Não | Descrição longa |
| `caracteristicasJson` | string | string[]? | Não | JSON array de características |
| `imagensJson` | string | string[]? | Não | JSON array de URLs de imagens (Blob Storage após etapa 10) |
| `compatibilidadeTerrenoJson` | string | object | Sim | JSON `{areaMinima, frenteMinima}` |
| `servicosJson` | string | ServicoPlanta[] | Sim | JSON array de serviços da planta |
| `createdAt` | string | - | Sim | ISO 8601 UTC |
| `updatedAt` | string | - | Sim | ISO 8601 UTC |
| `createdBy` | string | - | Não | Email |
| `updatedBy` | string | - | Não | Email |

### Índices Secundários (Query Patterns)

- Listar todas do tenant: `filter = "PartitionKey eq '{tenant}#PLANTA'"`
- Filtrar por quartos: `filter = "PartitionKey eq '{tenant}#PLANTA' and quartos eq 3"`

### Validações

- `servicosJson` deve ter ao menos 1 serviço
- `areaConstruidaM2` > 0
- `tempoObraMeses` > 0

---

## Tabela: Opcional

**Descrição:** Opcionais que podem ser adicionados a plantas (ex: piscina, churrasqueira).

**PartitionKey:** `{tenantId}#OPCIONAL`  
**RowKey:** `{opcionalId}` (UUID)

### Colunas

| Coluna | Tipo Azure | Tipo TS Original | Obrigatório | Notas |
|--------|-----------|-----------------|-------------|-------|
| `PartitionKey` | string | - | Sim | `default#OPCIONAL` |
| `RowKey` | string | - | Sim | UUID do opcional |
| `nome` | string | string | Sim | Nome do opcional |
| `descricao` | string | string | Sim | Descrição |
| `categoria` | string | string | Sim | Categoria (ex: `LAZER`, `AREA_EXTERNA`) |
| `servicosJson` | string | ServicoPlanta[] | Sim | JSON array de serviços adicionais |
| `custoEstimadoMEI` | float | number? | Não | Custo estimado modalidade MEI |
| `custoEstimadoCLT` | float | number? | Não | Custo estimado modalidade CLT |
| `imagemUrl` | string | string? | Não | URL da imagem (Blob Storage) |
| `createdAt` | string | - | Sim | ISO 8601 UTC |
| `updatedAt` | string | - | Sim | ISO 8601 UTC |
| `createdBy` | string | - | Não | Email |
| `updatedBy` | string | - | Não | Email |

### Índices Secundários (Query Patterns)

- Listar todos: `filter = "PartitionKey eq '{tenant}#OPCIONAL'"`
- Filtrar por categoria: `filter = "PartitionKey eq '{tenant}#OPCIONAL' and categoria eq 'LAZER'"`

---

## Tabela: ParametrosGlobais

**Descrição:** Parâmetros globais de cálculo (BDI, salários, encargos, etc.). Versionado: permite múltiplas versões coexistentes.

**PartitionKey:** `{tenantId}#PARAM_GLOBAL`  
**RowKey:** `{versao}` (ex: `v1`, `v2`, `2026-01-15`, ou `current` para a versão ativa)

### Colunas

| Coluna | Tipo Azure | Tipo TS Original | Obrigatório | Notas |
|--------|-----------|-----------------|-------------|-------|
| `PartitionKey` | string | - | Sim | `default#PARAM_GLOBAL` |
| `RowKey` | string | - | Sim | Versão (ex: `current`, `2026-04-20`) |
| `bdi` | float | number | Sim | BDI padrão |
| `fatorEncargos` | float | number | Sim | Fator de encargos sociais |
| `salarioQualificado` | float | number | Sim | Salário do qualificado |
| `salarioMeioOficial` | float | number | Sim | Salário do meio oficial |
| `salarioServente` | float | number | Sim | Salário do servente |
| `diariaSemEncargos` | float | number | Sim | Diária sem encargos |
| `diariaComEncargos` | float | number | Sim | Diária com encargos |
| `valorMetaDiario` | float | number | Sim | Valor meta diário |
| `premioMaximoMensal` | float | number | Sim | Prêmio máximo mensal |
| `ativo` | bool | boolean | Sim | `true` se esta é a versão ativa |
| `createdAt` | string | - | Sim | ISO 8601 UTC |
| `updatedAt` | string | - | Sim | ISO 8601 UTC |
| `createdBy` | string | - | Não | Email |
| `updatedBy` | string | - | Não | Email |

### Índices Secundários (Query Patterns)

- Buscar versão ativa: `filter = "PartitionKey eq '{tenant}#PARAM_GLOBAL' and ativo eq true"` ou diretamente `RowKey = 'current'`
- Listar todas as versões: `filter = "PartitionKey eq '{tenant}#PARAM_GLOBAL'"`

### Estratégia de Versionamento

- Sempre manter uma entidade com `RowKey = 'current'` apontando para os parâmetros ativos
- Ao criar nova versão, atualizar `current` e opcionalmente salvar snapshot com timestamp como RowKey
- `OrcamentoEngenheiro.snapshotParametrosGlobaisJson` armazena cópia imutável dos parâmetros usados no cálculo

---

## Tabela: GruposEncargos

**Descrição:** Configuração de grupos de encargos sociais (A, B, C, D, D', E).

**PartitionKey:** `{tenantId}#GRUPOS_ENCARGOS`  
**RowKey:** `{versao}` (ex: `current`, `2026-01`)

### Colunas

| Coluna | Tipo Azure | Tipo TS Original | Obrigatório | Notas |
|--------|-----------|-----------------|-------------|-------|
| `PartitionKey` | string | - | Sim | `default#GRUPOS_ENCARGOS` |
| `RowKey` | string | - | Sim | Versão (ex: `current`) |
| `grupoAJson` | string | ItemGrupoEncargo[] | Sim | JSON array do grupo A |
| `grupoBJson` | string | ItemGrupoEncargo[] | Sim | JSON array do grupo B |
| `grupoCJson` | string | ItemGrupoEncargo[] | Sim | JSON array do grupo C |
| `grupoDJson` | string | ItemGrupoEncargo[] | Sim | JSON array do grupo D |
| `grupoDLinhaJson` | string | ItemGrupoEncargo[] | Sim | JSON array do grupo D' |
| `grupoEJson` | string | ItemGrupoEncargo[] | Sim | JSON array do grupo E |
| `ativo` | bool | boolean | Sim | `true` se esta é a versão ativa |
| `createdAt` | string | - | Sim | ISO 8601 UTC |
| `updatedAt` | string | - | Sim | ISO 8601 UTC |
| `createdBy` | string | - | Não | Email |
| `updatedBy` | string | - | Não | Email |

### Índices Secundários (Query Patterns)

- Buscar versão ativa: `RowKey = 'current'`
- Listar todas as versões: `filter = "PartitionKey eq '{tenant}#GRUPOS_ENCARGOS'"`

### Estratégia de Versionamento

- Mesma estratégia de `ParametrosGlobais`

---

## Tabela: ComposicaoProfissional

**Descrição:** Composições profissionais de serviços (meta de produção, valor referência, etc.).

**PartitionKey:** `{tenantId}#COMP_PROF`  
**RowKey:** `{composicaoId}` (ID numérico ou UUID)

### Colunas

| Coluna | Tipo Azure | Tipo TS Original | Obrigatório | Notas |
|--------|-----------|-----------------|-------------|-------|
| `PartitionKey` | string | - | Sim | `default#COMP_PROF` |
| `RowKey` | string | - | Sim | ID da composição |
| `categoria` | string | CategoriaProfissional | Sim | Enum de categoria |
| `profissional` | string | string | Sim | Nome do profissional/função |
| `descricao` | string | string | Sim | Descrição |
| `servico` | string | string | Sim | Nome do serviço |
| `refSINAPI` | string | string | Sim | Código SINAPI de referência |
| `medicao` | string | string | Sim | Unidade de medição |
| `unidade` | string | string | Sim | Unidade |
| `producaoMensalSINAPI` | float | number | Sim | Produção mensal SINAPI |
| `valorRefMetaDiaria` | float | number | Sim | Valor referência meta diária |
| `produtividadeUNh` | float | number | Sim | Produtividade UN/h |
| `produtividadeUNdia` | float | number | Sim | Produtividade UN/dia |
| `metaProducaoMes` | float | number | Sim | Meta produção mês |
| `metaProducaoSemana` | float | number | Sim | Meta produção semana |
| `metaEstipulada` | float | number? | Não | Meta estipulada customizada |
| `createdAt` | string | - | Sim | ISO 8601 UTC |
| `updatedAt` | string | - | Sim | ISO 8601 UTC |
| `createdBy` | string | - | Não | Email |
| `updatedBy` | string | - | Não | Email |

### Índices Secundários (Query Patterns)

- Listar todas: `filter = "PartitionKey eq '{tenant}#COMP_PROF'"`
- Filtrar por categoria: `filter = "PartitionKey eq '{tenant}#COMP_PROF' and categoria eq 'ALVENARIA'"`
- Buscar por refSINAPI: `filter = "PartitionKey eq '{tenant}#COMP_PROF' and refSINAPI eq '87888'"`

---

## Tabela: InsumoSINAPI

**Descrição:** Base de preços de insumos SINAPI por UF, versionada mensalmente.

**PartitionKey:** `{sinapiRef}#{classificacao}` (ex: `2026-01#MATERIAL`, `2026-01#SERVICOS`, `2026-01#EQUIPAMENTO`)  
**RowKey:** `{codigo}` (código SINAPI do insumo)

### Colunas

| Coluna | Tipo Azure | Tipo TS Original | Obrigatório | Notas |
|--------|-----------|-----------------|-------------|-------|
| `PartitionKey` | string | - | Sim | `{sinapiRef}#{classificacao}` — permite versionamento mensal |
| `RowKey` | string | - | Sim | Código SINAPI (ex: `00001379`) |
| `codigo` | string | string | Sim | Código SINAPI (duplicado para facilitar queries) |
| `descricao` | string | string | Sim | Descrição do insumo |
| `unidade` | string | string | Sim | Unidade (ex: `SC`, `M3`, `KG`) |
| `classificacao` | string | string | Sim | `MATERIAL`, `SERVICOS`, `EQUIPAMENTO` |
| `origemPreco` | string | string | Sim | `C` (coletado) ou `CR` (calculado/referência) |
| `sinapiRef` | string | string | Sim | Referência mensal (ex: `2026-01`) |
| `precoSP` | float | number? | Não | Preço em SP |
| `precoRJ` | float | number? | Não | Preço em RJ |
| `precoMG` | float | number? | Não | Preço em MG |
| `precoRS` | float | number? | Não | Preço em RS |
| `precoPR` | float | number? | Não | Preço em PR |
| `precoSC` | float | number? | Não | Preço em SC |
| `precoBA` | float | number? | Não | Preço em BA |
| `precoPE` | float | number? | Não | Preço em PE |
| `precoES` | float | number? | Não | Preço em ES |
| `precoDF` | float | number? | Não | Preço em DF |
| `precoGO` | float | number? | Não | Preço em GO |
| `precoMT` | float | number? | Não | Preço em MT |
| `precoMS` | float | number? | Não | Preço em MS |
| `precoAM` | float | number? | Não | Preço em AM |
| `precoPA` | float | number? | Não | Preço em PA |
| `precoRO` | float | number? | Não | Preço em RO |
| `precoAC` | float | number? | Não | Preço em AC |
| `precoRR` | float | number? | Não | Preço em RR |
| `precoAP` | float | number? | Não | Preço em AP |
| `precoTO` | float | number? | Não | Preço em TO |
| `precoMA` | float | number? | Não | Preço em MA |
| `precoPI` | float | number? | Não | Preço em PI |
| `precoCE` | float | number? | Não | Preço em CE |
| `precoRN` | float | number? | Não | Preço em RN |
| `precoPB` | float | number? | Não | Preço em PB |
| `precoAL` | float | number? | Não | Preço em AL |
| `precoSE` | float | number? | Não | Preço em SE |
| `createdAt` | string | - | Sim | ISO 8601 UTC (data de ingestão) |
| `updatedAt` | string | - | Sim | ISO 8601 UTC |

### Estratégia de Versionamento SINAPI

- **PartitionKey** inclui `sinapiRef` (ex: `2026-01#MATERIAL`) → múltiplas versões mensais coexistem sem conflito
- Ao ingerir nova versão SINAPI (etapa 09a), criar novo conjunto de partitions com `sinapiRef` atualizado
- Queries devem especificar `sinapiRef` desejado: `filter = "PartitionKey eq '2026-01#MATERIAL' and codigo eq '00001379'"`
- Fallback para SP: se UF não tiver preço (`null`), usar `precoSP` como referência
- Tabela `ParametrosGlobais` ou `EngineerData` deve ter campo `mesReferenciaSINAPI` indicando versão ativa

### Índices Secundários (Query Patterns)

- Buscar insumo por código e versão: `filter = "PartitionKey eq '{sinapiRef}#MATERIAL' and codigo eq '00001379'"`
- Listar todos os materiais de uma versão: `filter = "PartitionKey eq '{sinapiRef}#MATERIAL'"`
- Buscar por descrição (ineficiente, usar cache ou Cognitive Search): não suportado nativamente

### Validações

- Ao inserir, validar que ao menos 1 UF tenha preço preenchido
- `origemPreco` = `C` deve ter mais UFs preenchidas que `CR`

### Alternativa de Schema

Se 27 colunas for problemático:

- Manter `precosJson` como string JSON: `{"SP": 32.50, "RJ": 34.00, ...}`
- Vantagem: menos colunas, mais flexível
- Desvantagem: não permite query por preço de UF específica diretamente

**Recomendação:** usar colunas individuais por UF para facilitar queries e validações.

---

## Tabela: ComposicaoAnalitica

**Descrição:** Composições analíticas SINAPI (serviços compostos por insumos e/ou outras composições).

**PartitionKey:** `{sinapiRef}#COMP_ANALITICA`  
**RowKey:** `{codigoComposicao}` (código SINAPI da composição)

### Colunas

| Coluna | Tipo Azure | Tipo TS Original | Obrigatório | Notas |
|--------|-----------|-----------------|-------------|-------|
| `PartitionKey` | string | - | Sim | `{sinapiRef}#COMP_ANALITICA` — versionado por mês |
| `RowKey` | string | - | Sim | Código da composição (ex: `87888`) |
| `codigoComposicao` | string | string | Sim | Código SINAPI (duplicado) |
| `grupo` | string | string | Sim | Grupo da composição (ex: `ALVENARIA`, `FUNDACAO`) |
| `descricao` | string | string | Sim | Descrição da composição |
| `unidade` | string | string | Sim | Unidade (ex: `M2`, `M3`) |
| `sinapiRef` | string | string | Sim | Referência mensal (ex: `2026-01`) |
| `itensJson` | string | ItemComposicao[] | Sim | JSON array de itens (insumos e subcomposições) |
| `createdAt` | string | - | Sim | ISO 8601 UTC |
| `updatedAt` | string | - | Sim | ISO 8601 UTC |

### Índices Secundários (Query Patterns)

- Buscar por código e versão: `filter = "PartitionKey eq '{sinapiRef}#COMP_ANALITICA' and codigoComposicao eq '87888'"`
- Listar todas de uma versão: `filter = "PartitionKey eq '{sinapiRef}#COMP_ANALITICA'"`
- Filtrar por grupo: `filter = "PartitionKey eq '{sinapiRef}#COMP_ANALITICA' and grupo eq 'ALVENARIA'"`

### Validações

- `itensJson` deve ter ao menos 1 item
- Cada item deve ter `tipoItem` válido (`COMPOSICAO` ou `INSUMO`)

---

## Tabela: Auditoria

**Descrição:** Log de eventos de auditoria (ações mutantes, alterações de parâmetros, cálculos realizados).

**PartitionKey:** `{tenantId}#{ano-mes}` (ex: `default#2026-04`) — particiona por mês para facilitar queries e limpeza de dados antigos  
**RowKey:** `{timestamp}#{eventId}` (ISO timestamp + UUID) — garante ordem cronológica e unicidade

### Colunas

| Coluna | Tipo Azure | Tipo TS Original | Obrigatório | Notas |
|--------|-----------|-----------------|-------------|-------|
| `PartitionKey` | string | - | Sim | `{tenantId}#{ano-mes}` |
| `RowKey` | string | - | Sim | `{timestamp}#{uuid}` |
| `timestamp` | string | string | Sim | ISO 8601 UTC (duplicado para facilitar queries) |
| `usuario` | string | string | Sim | Email do usuário (disponível após etapa 04) |
| `modulo` | string | string | Sim | Módulo do sistema (ex: `ORCAMENTO`, `ENGENHEIRO`, `SINAPI`, `PARAMETROS`) |
| `acao` | string | string | Sim | Ação realizada (ex: `CREATE`, `UPDATE`, `DELETE`, `CALCULAR`, `EXPORTAR`) |
| `entidadeTipo` | string | string | Sim | Tipo da entidade afetada (ex: `Orcamento`, `ParametrosGlobais`) |
| `entidadeId` | string | string | Não | ID da entidade afetada |
| `motivo` | string | string? | Não | Motivo da ação (se aplicável) |
| `impacto` | string | string? | Não | Impacto da ação (ex: `ALTO`, `MEDIO`, `BAIXO`) |
| `detalhesJson` | string | object? | Não | JSON com detalhes adicionais (diff, valores alterados, etc.) |

### Índices Secundários (Query Patterns)

- Listar eventos de um mês: `filter = "PartitionKey eq '{tenant}#2026-04'"`
- Filtrar por usuário: `filter = "PartitionKey eq '{tenant}#2026-04' and usuario eq 'user@example.com'"`
- Filtrar por módulo: `filter = "PartitionKey eq '{tenant}#2026-04' and modulo eq 'ORCAMENTO'"`
- Filtrar por entidade: `filter = "PartitionKey eq '{tenant}#2026-04' and entidadeTipo eq 'Orcamento' and entidadeId eq '{id}'"`

### Validações

- `timestamp` deve ser ISO 8601 válido
- `acao` deve estar na lista de ações permitidas

### Retenção de Dados

- Considerar política de retenção (ex: manter 12 meses, arquivar ou deletar dados mais antigos)
- Implementar job periódico (Azure Function) para limpeza de partitions antigas (etapa 09b ou 11)

---

## Tabela: Usuario

**Descrição:** Usuários autenticados via Azure AD. Mapeia claims do JWT para roles e permissões no sistema.

**PartitionKey:** `{tenantId}#USUARIO`  
**RowKey:** `{userId}` (Object ID do Azure AD ou UUID)

### Colunas

| Coluna | Tipo Azure | Tipo TS Original | Obrigatório | Notas |
|--------|-----------|-----------------|-------------|-------|
| `PartitionKey` | string | - | Sim | `{tenantId}#USUARIO` |
| `RowKey` | string | - | Sim | Object ID do Azure AD |
| `email` | string | string | Sim | Email do usuário (normalizado, lowercase) |
| `nome` | string | string | Sim | Nome completo |
| `role` | string | UserRole | Sim | `cliente`, `engenheiro`, `admin_construtora` |
| `ativo` | bool | boolean | Sim | `true` se usuário ativo |
| `permissoesJson` | string | string[]? | Não | JSON array de permissões customizadas (etapa 12) |
| `azureAdObjectId` | string | string | Sim | Object ID do Azure AD (duplicado) |
| `dataCadastro` | string | string | Sim | ISO 8601 UTC |
| `ultimoLogin` | string | string? | Não | ISO 8601 UTC |
| `createdAt` | string | - | Sim | ISO 8601 UTC |
| `updatedAt` | string | - | Sim | ISO 8601 UTC |
| `createdBy` | string | - | Não | Email |
| `updatedBy` | string | - | Não | Email |

### Índices Secundários (Query Patterns)

- Buscar por email: `filter = "PartitionKey eq '{tenant}#USUARIO' and email eq '{email}'"`
- Listar todos do tenant: `filter = "PartitionKey eq '{tenant}#USUARIO'"`
- Filtrar por role: `filter = "PartitionKey eq '{tenant}#USUARIO' and role eq 'engenheiro'"`

### Validações

- Email deve ser único por tenant
- `role` deve estar na lista permitida
- `azureAdObjectId` deve ser único (validar antes de insert)

### Integração com Azure AD (etapa 04)

- Ao receber JWT do Azure AD, extrair claims (`sub`, `email`, `name`)
- Buscar usuário na tabela por `email` ou `azureAdObjectId`
- Se não existir, criar automaticamente (onboarding) ou retornar erro 403 (depende da estratégia)
- Atualizar `ultimoLogin` a cada autenticação bem-sucedida

---

## Padrões de Query Adicionais

### Query Cross-Entity (relacionamentos)

Exemplo: buscar todos os orçamentos de um cliente

1. Query `Cliente` por email → obter `clienteId`
2. Query `Orcamento` com `PartitionKey = '{tenant}#{clienteId}'`

### Query por Versão SINAPI Ativa

- Manter campo `mesReferenciaSINAPI` em `ParametrosGlobais` (RowKey = `current`)
- Ao calcular orçamento, ler `mesReferenciaSINAPI` e usar como prefixo nas queries de `InsumoSINAPI` e `ComposicaoAnalitica`
- Exemplo: `filter = "PartitionKey eq '{sinapiRef}#MATERIAL' and codigo eq '00001379'"`

### Query de Orçamentos em Andamento para Engenheiro

- Query `OrcamentoEngenheiro` com `filter = "PartitionKey eq '{tenant}#ORCAMENTO_ENG' and etapaAtual ne 'ENTREGUE'"`

---

## Considerações de Performance

### Particionamento Eficiente

- `Orcamento`: particionar por `{tenantId}#{clienteId}` distribui carga se houver muitos clientes
- `InsumoSINAPI`: particionar por `{sinapiRef}#{classificacao}` evita hot partitions (3 classificações × 12 meses/ano = 36 partições)
- `Auditoria`: particionar por mês evita crescimento ilimitado de uma partition

### Paginação

- Azure Tables retorna no máximo 1000 entidades por query
- Para queries grandes (ex: listar todos os insumos SINAPI), usar continuation token
- Implementar paginação na camada de serviço (etapa 03)

### Caching

- Dados read-heavy e raramente alterados (ex: `ParametrosGlobais`, `InsumoSINAPI`) → considerar cache Redis (etapa 15, otimização de custos)
- Orçamentos e cálculos são read-write frequente → não cachear

### Índices Secundários

- Azure Tables não suporta índices secundários nativamente
- Para queries complexas (ex: busca por descrição de insumo), considerar:
  - Azure Cognitive Search (adicionar em etapa futura)
  - Denormalização (duplicar campo em múltiplas entidades)
  - Cache em memória (para listas pequenas como `ComposicaoProfissional`)

---

## Limites e Validações — Resumo

| Entidade | Tamanho Estimado | Risco 1MB | Estratégia de Mitigação |
|----------|-----------------|-----------|------------------------|
| `Cliente` | ~1KB | Nenhum | - |
| `Orcamento` | ~50KB (50 itens) | Baixo | Separar `itens` se ultrapassar 100 itens |
| `OrcamentoEngenheiro` | ~550KB (50 serviços) | Médio | Separar cálculos em tabela auxiliar se > 800KB |
| `PlantaPadrao` | ~20KB | Baixo | - |
| `Opcional` | ~5KB | Nenhum | - |
| `ParametrosGlobais` | ~1KB | Nenhum | - |
| `GruposEncargos` | ~2KB | Nenhum | - |
| `ComposicaoProfissional` | ~1KB | Nenhum | - |
| `InsumoSINAPI` | ~1KB | Nenhum | - |
| `ComposicaoAnalitica` | ~15KB (30 itens) | Baixo | Separar itens se ultrapassar 50 itens |
| `Auditoria` | ~2KB | Nenhum | - |
| `Usuario` | ~1KB | Nenhum | - |

### Validação na Camada de Persistência (etapa 03)

- Antes de inserir/atualizar, calcular tamanho estimado da entidade serializada
- Se > 900KB, alertar ou rejeitar operação
- Para `OrcamentoEngenheiro`, implementar split automático em tabela auxiliar se necessário

---

## Convenções de Nomenclatura — Resumo

### Tabelas

- PascalCase singular (ex: `Cliente`, `Orcamento`)

### PartitionKey

- Formato: `{tenantId}#{categoria}`
- Sempre incluir `tenantId` (mesmo que `default` por ora)

### RowKey

- UUID v4 ou código único
- Para entidades versionadas: usar versão ou timestamp
- Para auditoria: usar `{timestamp}#{uuid}` para ordenação cronológica

### Colunas JSON

- Sufixo `Json` (ex: `itensJson`, `parametrosJson`)
- Serializar como string JSON válido
- Deserializar na camada de persistência

### Campos de Auditoria

- `createdAt`, `updatedAt`: ISO 8601 UTC
- `createdBy`, `updatedBy`: email do usuário (disponível após etapa 04)
