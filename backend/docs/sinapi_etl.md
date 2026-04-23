# SINAPI ETL - Ingestão de Dados

## Visão Geral

O sistema ETL (Extract, Transform, Load) do SINAPI permite importar dados oficiais de insumos e composições analíticas da Caixa Econômica Federal para o Azure Table Storage do ConstruBot.

## Versionamento

O SINAPI utiliza versionamento mensal no formato `AAAA-MM`:
- Exemplo: `2026-04` (abril de 2026)
- Múltiplas versões coexistem no banco (armazenadas na PartitionKey)
- Apenas uma versão está ativa por vez (configurada em ParametrosGlobais)
- Rollback: troque a versão ativa para uma anterior via API

## Formato dos Arquivos ISE

### Insumos (sheet "INSUMOS")

Colunas obrigatórias:
- `CODIGO`: código SINAPI (ex: "88316")
- `DESCRICAO`: descrição do insumo
- `UNIDADE`: unidade de medida (ex: "M2", "KG", "H")
- `CLASSIFICACAO`: tipo do insumo ("MATERIAL", "SERVICO", "EQUIPAMENTO")
- `ORIGEM`: origem do preço ("SINAPI", "ORSE", "OUTRA")

Colunas de preço (27 UFs):
- `SP`, `RJ`, `MG`, `RS`, `PR`, `SC`, `BA`, `PE`, `ES`, `DF`, `GO`, `MT`, `MS`, `AM`, `PA`, `RO`, `AC`, `RR`, `AP`, `TO`, `MA`, `PI`, `CE`, `RN`, `PB`, `AL`, `SE`

Cada linha representa um insumo com preços diferenciados por UF.

### Composições Analíticas (sheet "COMPOSICOES")

Colunas obrigatórias:
- `CODIGO`: código da composição (sem prefixo) ou código do item (com prefixo "+")
- `DESCRICAO`: descrição da composição ou item
- `UNIDADE`: unidade de medida
- `GRUPO`: grupo da composição ("COMP_ANALITICA")
- `TIPO`: tipo do item ("MAO_DE_OBRA_PROFISSIONAL", "MAO_DE_OBRA_AJUDANTE", "MATERIAL", "EQUIPAMENTO")
- `COEFICIENTE`: coeficiente de consumo

Formato hierárquico:
1. Linha sem prefixo: inicia nova composição
2. Linhas com "+" no CODIGO: itens da composição atual

Exemplo:
```
CODIGO    DESCRICAO                      UNIDADE  GRUPO            TIPO                         COEFICIENTE
87888     Alvenaria de blocos...         M2       COMP_ANALITICA
+88316    Pedreiro                       H        COMP_ANALITICA   MAO_DE_OBRA_PROFISSIONAL     0.87
+88309    Servente                       H        COMP_ANALITICA   MAO_DE_OBRA_AJUDANTE         0.75
+27260    Bloco cerâmico 14x19x29cm      UN       COMP_ANALITICA   MATERIAL                     15.5
```

## Processo de Ingestão

### Modo Produção

```bash
cd backend
python scripts/etl_sinapi.py \
  --ise /caminho/ise_2026_04.xlsx \
  --composicoes /caminho/composicoes_2026_04.xlsx \
  --ref 2026-04
```

Etapas executadas:
1. Validação do formato `sinapiRef` (AAAA-MM)
2. Parsing dos arquivos Excel com pandas
3. Normalização de códigos e colunas
4. Validação de integridade:
   - Duplicados
   - Preços ausentes
   - Classificações inválidas
   - Referências órfãs (itens que referenciam insumos inexistentes)
5. Persistência no Azure Table Storage (upsert idempotente)

### Modo Dry-Run (Simulação)

```bash
python scripts/etl_sinapi.py \
  --ise /caminho/ise_2026_04.xlsx \
  --ref 2026-04 \
  --dry-run
```

Executa parsing e validação sem persistir dados. Use para testar arquivos antes da ingestão real.

### Ingestão Parcial

Você pode ingerir apenas insumos ou apenas composições:

```bash
python scripts/etl_sinapi.py --ise /caminho/ise_2026_04.xlsx --ref 2026-04
```

```bash
python scripts/etl_sinapi.py --composicoes /caminho/composicoes_2026_04.xlsx --ref 2026-04
```

## Ativação de Versão

Após ingestão, ative a nova versão via API:

```bash
curl -X PUT http://localhost:8000/api/sinapi/versao-ativa \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sinapiRef": "2026-04"}'
```

Requer role `admin`.

## Rollback

Para voltar a uma versão anterior:

1. Liste versões disponíveis:
```bash
curl http://localhost:8000/api/sinapi/versoes \
  -H "Authorization: Bearer SEU_TOKEN"
```

2. Ative versão anterior:
```bash
curl -X PUT http://localhost:8000/api/sinapi/versao-ativa \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sinapiRef": "2026-03"}'
```

A mudança é imediata. Caches são limpos automaticamente.

## Consultas via API

### Listar versões
```bash
GET /api/sinapi/versoes
```

Retorna todas as versões ingeridas e a versão ativa.

### Obter versão ativa
```bash
GET /api/sinapi/versao-ativa
```

### Consultar insumo
```bash
GET /api/sinapi/insumo/{codigo}?uf=SP&sinapi_ref=2026-04&classificacao=MATERIAL
```

Parâmetros:
- `codigo`: código SINAPI (obrigatório)
- `uf`: UF para consulta de preço (padrão: SP)
- `sinapi_ref`: versão específica (padrão: versão ativa)
- `classificacao`: tipo do insumo (padrão: MATERIAL)

Se o preço não existir na UF solicitada, retorna preço de SP como fallback.

### Consultar composição
```bash
GET /api/sinapi/composicao/{codigo}?sinapi_ref=2026-04
```

Retorna composição com itens expandidos (campo `itens`).

## Schemas

### InsumoSINAPI

```
PartitionKey: {sinapiRef}#{classificacao}
RowKey: {codigo}
codigo: string
descricao: string
unidade: string
classificacao: string
origemPreco: string
sinapiRef: string
precoSP: float
precoRJ: float
... (27 colunas de preço, uma por UF)
```

### ComposicaoAnalitica

```
PartitionKey: {sinapiRef}#COMP_ANALITICA
RowKey: {codigo}
codigo: string
descricao: string
unidade: string
grupo: string
sinapiRef: string
itensJson: string (JSON serializado)
```

Formato de `itensJson`:
```json
[
  {
    "tipo": "MAO_DE_OBRA_PROFISSIONAL",
    "codigoInsumo": "88316",
    "descricaoInsumo": "Pedreiro",
    "unidade": "H",
    "coeficiente": 0.87
  },
  ...
]
```

## Observações

- O ETL é idempotente: reexecutar para a mesma versão sobrescreve dados
- Não há deleção automática de versões antigas
- Validações falham a ingestão inteira se houver erros
- Use dry-run para testar arquivos antes da ingestão real
- Cache de composições é limpo ao trocar versão ativa
- Preços ausentes em uma UF retornam `null` (não zero)
