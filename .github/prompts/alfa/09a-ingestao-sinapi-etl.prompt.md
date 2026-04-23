---
agent: agent
---
# Ingestão SINAPI — ETL + Schema Versionado

## Contexto

O projeto ConstruBot possui atualmente:
- **Dados SINAPI mock**: constante `CM_COMPOSICOES_ANALITICAS_MOCK` hardcoded em `backend/app/utils/config.py` com 19 composições contendo apenas `produtividade_basica` e `proporcao_ajudante`
- **Frontend**: arrays `INSUMOS_SINAPI` e `COMPOSICOES_ANALITICAS` em `frontend/lib/mockData.ts` (dados de protótipo)
- **Tabelas Azure**: schemas documentados na etapa 02 para `InsumoSINAPI` e `ComposicaoAnalitica` com versionamento por `sinapiRef` (ex: `2026-01`)
- **Repositórios implementados** (etapa 03): `InsumoSINAPIRepository` e `ComposicaoAnaliticaRepository` com métodos CRUD e query por `sinapiRef`
- **Cálculos backend** (etapa 07): função `resolver_parametros_mo_composicao()` em `orcamento_service.py` lê diretamente `CM_COMPOSICOES_ANALITICAS_MOCK`

**Arquivos que serão criados:**
- `backend/scripts/etl_sinapi.py` — ETL principal (parser + validação + carga)
- `backend/scripts/parsers/sinapi_ise_parser.py` — parser de planilhas ISE (insumos × 27 UFs)
- `backend/scripts/parsers/sinapi_composicao_parser.py` — parser de composições analíticas
- `backend/app/routers/sinapi.py` — endpoints de upload manual, listagem e versionamento
- `backend/scripts/validators/sinapi_validator.py` — validações de integridade
- `backend/docs/sinapi_etl.md` — documentação do processo

**Arquivos que serão modificados:**
- `backend/app/services/orcamento_service.py` — substituir leitura de `CM_COMPOSICOES_ANALITICAS_MOCK` por query ao repositório
- `backend/app/utils/config.py` — remover `CM_COMPOSICOES_ANALITICAS_MOCK` (após migração)
- `backend/app/main.py` — registrar novo router `sinapi.py`

## Pré-requisitos

- Etapa alfa-01 concluída (Storage Account provisionado)
- Etapa alfa-02 concluída (schemas `InsumoSINAPI` e `ComposicaoAnalitica` documentados)
- Etapa alfa-03 concluída (repositórios implementados)
- Etapa alfa-07 concluída (cálculos centralizados no backend)

## Entregáveis

Ao final desta etapa, devem existir:

1. **Script ETL completo** em `backend/scripts/etl_sinapi.py`:
   - Aceita upload manual de arquivos XLSX/CSV (ISE insumos, composições analíticas)
   - Parseia, normaliza e valida dados
   - Gera `sinapiRef` no formato `AAAA-MM` (ex: `2026-04`)
   - Carrega dados em Tables com estratégia idempotente (upsert)
   - Suporta dry-run (validação sem persistência)
   - Retorna relatório de ingestão (total inserido, atualizado, erros)

2. **Parsers especializados** em `backend/scripts/parsers/`:
   - `sinapi_ise_parser.py` — extrai insumos do ISE (27 UFs × preço) com fallback para SP
   - `sinapi_composicao_parser.py` — extrai composições analíticas com lista de insumos/subcomposições

3. **Validador de integridade** em `backend/scripts/validators/sinapi_validator.py`:
   - Valida que insumos tenham ao menos 1 UF com preço
   - Valida que composições referenciem apenas insumos existentes
   - Detecta códigos duplicados dentro da mesma versão
   - Valida formato de `sinapiRef` (AAAA-MM)

4. **Endpoints de gestão** em `backend/app/routers/sinapi.py`:
   - `POST /api/sinapi/upload` — upload manual de arquivo SINAPI (requer role admin)
   - `GET /api/sinapi/versoes` — lista todas as versões `sinapiRef` disponíveis
   - `GET /api/sinapi/versao-ativa` — retorna versão ativa configurada
   - `PUT /api/sinapi/versao-ativa` — define versão ativa (requer role admin)
   - `GET /api/sinapi/insumos?sinapiRef=2026-04&classificacao=MATERIAL&limit=100` — lista insumos paginados
   - `GET /api/sinapi/composicoes?sinapiRef=2026-04&grupo=ALVENARIA&limit=100` — lista composições paginadas
   - `GET /api/sinapi/insumo/{codigo}?sinapiRef=2026-04` — busca insumo específico
   - `GET /api/sinapi/composicao/{codigo}?sinapiRef=2026-04` — busca composição específica

5. **Serviço de consulta SINAPI** em `backend/app/services/sinapi_service.py`:
   - `get_versao_ativa()` — lê versão ativa de `ParametrosGlobais` (campo `sinapiRefAtiva`)
   - `get_insumo_preco(codigo, uf, sinapi_ref)` — retorna preço do insumo para UF, com fallback para SP
   - `get_composicao(codigo, sinapi_ref)` — retorna composição completa com insumos expandidos
   - `listar_versoes()` — lista todas as versões distintas de `sinapiRef` disponíveis

6. **Migração de `CM_COMPOSICOES_ANALITICAS_MOCK`**:
   - Modificar `resolver_parametros_mo_composicao()` em `orcamento_service.py` para consultar tabela `ComposicaoAnalitica` via repositório
   - Remover constante `CM_COMPOSICOES_ANALITICAS_MOCK` de `config.py`
   - Adicionar cache em memória opcional (dict simples) para evitar queries repetidas durante cálculo

7. **Documentação** em `backend/docs/sinapi_etl.md`:
   - Formato esperado dos arquivos ISE (colunas obrigatórias, encoding, separadores)
   - Processo de ingestão manual via endpoint
   - Estratégia de versionamento e rollback
   - Exemplos de queries comuns
   - Limitações conhecidas (composições com 50+ itens)

8. **Atualização do README**:
   - Seção "Dados SINAPI" explicando versionamento mensal, upload manual, query via API

## Implementação

### 1. Criar parser de ISE (Insumos × 27 UFs)

Criar `backend/scripts/parsers/sinapi_ise_parser.py`:

```python
import pandas as pd
from typing import List, Dict, Any

def parse_ise_insumos(file_path: str, sinapi_ref: str) -> List[Dict[str, Any]]:
    df = pd.read_excel(file_path, sheet_name="INSUMOS", header=0)
    
    df.columns = df.columns.str.strip().str.upper()
    
    colunas_obrigatorias = ["CODIGO", "DESCRICAO", "UNIDADE", "CLASSIFICACAO", "ORIGEM"]
    colunas_ufs = ["SP", "RJ", "MG", "RS", "PR", "SC", "BA", "PE", "ES", "DF", "GO", "MT", "MS", 
                   "AM", "PA", "RO", "AC", "RR", "AP", "TO", "MA", "PI", "CE", "RN", "PB", "AL", "SE"]
    
    for col in colunas_obrigatorias:
        if col not in df.columns:
            raise ValueError(f"Coluna obrigatória ausente: {col}")
    
    insumos = []
    for _, row in df.iterrows():
        insumo = {
            "codigo": str(row["CODIGO"]).strip(),
            "descricao": str(row["DESCRICAO"]).strip(),
            "unidade": str(row["UNIDADE"]).strip(),
            "classificacao": str(row["CLASSIFICACAO"]).strip().upper(),
            "origemPreco": str(row["ORIGEM"]).strip().upper(),
            "sinapiRef": sinapi_ref,
        }
        
        for uf in colunas_ufs:
            preco = row.get(uf)
            if pd.notna(preco) and preco > 0:
                insumo[f"preco{uf}"] = round(float(preco), 2)
            else:
                insumo[f"preco{uf}"] = None
        
        if not any(insumo[f"preco{uf}"] for uf in colunas_ufs):
            continue
        
        insumos.append(insumo)
    
    return insumos
```

**Notas:**
- Ignora linhas sem nenhum preço preenchido
- Normaliza códigos (strip whitespace)
- Valida classificação (deve ser `MATERIAL`, `SERVICOS` ou `EQUIPAMENTO`)

### 2. Criar parser de Composições Analíticas

Criar `backend/scripts/parsers/sinapi_composicao_parser.py`:

```python
import pandas as pd
from typing import List, Dict, Any
import json

def parse_composicoes_analiticas(file_path: str, sinapi_ref: str) -> List[Dict[str, Any]]:
    df = pd.read_excel(file_path, sheet_name="COMPOSICOES", header=0)
    
    df.columns = df.columns.str.strip().str.upper()
    
    colunas_obrigatorias = ["CODIGO", "DESCRICAO", "UNIDADE", "GRUPO"]
    for col in colunas_obrigatorias:
        if col not in df.columns:
            raise ValueError(f"Coluna obrigatória ausente: {col}")
    
    composicoes = []
    composicao_atual = None
    
    for _, row in df.iterrows():
        codigo = row.get("CODIGO")
        if pd.notna(codigo) and str(codigo).strip():
            if composicao_atual:
                composicoes.append(composicao_atual)
            
            composicao_atual = {
                "codigo": str(codigo).strip(),
                "descricao": str(row["DESCRICAO"]).strip(),
                "unidade": str(row["UNIDADE"]).strip(),
                "grupo": str(row["GRUPO"]).strip().upper(),
                "sinapiRef": sinapi_ref,
                "itens": []
            }
        
        tipo_item = row.get("TIPO_ITEM")
        codigo_item = row.get("CODIGO_ITEM")
        coeficiente = row.get("COEFICIENTE")
        
        if pd.notna(tipo_item) and pd.notna(codigo_item) and pd.notna(coeficiente):
            composicao_atual["itens"].append({
                "tipoItem": str(tipo_item).strip().upper(),
                "codigoItem": str(codigo_item).strip(),
                "coeficiente": round(float(coeficiente), 4)
            })
    
    if composicao_atual:
        composicoes.append(composicao_atual)
    
    for comp in composicoes:
        comp["itensJson"] = json.dumps(comp.pop("itens"))
    
    return composicoes
```

**Notas:**
- Assume estrutura com composição principal seguida por itens (insumos/subcomposições)
- Serializa lista de itens como JSON para armazenamento em Tables
- Valida que cada composição tenha ao menos 1 item

### 3. Criar validador de integridade

Criar `backend/scripts/validators/sinapi_validator.py`:

```python
from typing import List, Dict, Any, Tuple

def validar_insumos(insumos: List[Dict[str, Any]]) -> Tuple[bool, List[str]]:
    erros = []
    codigos_vistos = set()
    
    for insumo in insumos:
        codigo = insumo.get("codigo")
        if not codigo:
            erros.append("Insumo sem código")
            continue
        
        if codigo in codigos_vistos:
            erros.append(f"Código duplicado: {codigo}")
        codigos_vistos.add(codigo)
        
        classificacao = insumo.get("classificacao")
        if classificacao not in ["MATERIAL", "SERVICOS", "EQUIPAMENTO"]:
            erros.append(f"Classificação inválida para {codigo}: {classificacao}")
        
        ufs = ["SP", "RJ", "MG", "RS", "PR", "SC", "BA", "PE", "ES", "DF", "GO", "MT", "MS",
               "AM", "PA", "RO", "AC", "RR", "AP", "TO", "MA", "PI", "CE", "RN", "PB", "AL", "SE"]
        tem_preco = any(insumo.get(f"preco{uf}") and insumo[f"preco{uf}"] > 0 for uf in ufs)
        
        if not tem_preco:
            erros.append(f"Insumo {codigo} sem nenhum preço preenchido")
    
    return len(erros) == 0, erros

def validar_composicoes(composicoes: List[Dict[str, Any]], codigos_insumos: set) -> Tuple[bool, List[str]]:
    erros = []
    codigos_vistos = set()
    
    for comp in composicoes:
        codigo = comp.get("codigo")
        if not codigo:
            erros.append("Composição sem código")
            continue
        
        if codigo in codigos_vistos:
            erros.append(f"Código de composição duplicado: {codigo}")
        codigos_vistos.add(codigo)
        
        itens = comp.get("itens", [])
        if isinstance(itens, str):
            import json
            itens = json.loads(itens)
        
        if not itens:
            erros.append(f"Composição {codigo} sem itens")
        
        for item in itens:
            tipo = item.get("tipoItem")
            codigo_item = item.get("codigoItem")
            
            if tipo == "INSUMO" and codigo_item not in codigos_insumos:
                erros.append(f"Composição {codigo} referencia insumo inexistente: {codigo_item}")
    
    return len(erros) == 0, erros

def validar_sinapi_ref(sinapi_ref: str) -> bool:
    import re
    return bool(re.match(r"^\d{4}-\d{2}$", sinapi_ref))
```

### 4. Criar script ETL principal

Criar `backend/scripts/etl_sinapi.py`:

```python
import sys
import argparse
from parsers.sinapi_ise_parser import parse_ise_insumos
from parsers.sinapi_composicao_parser import parse_composicoes_analiticas
from validators.sinapi_validator import validar_insumos, validar_composicoes, validar_sinapi_ref
from app.repositories.insumo_sinapi_repository import InsumoSINAPIRepository
from app.repositories.composicao_analitica_repository import ComposicaoAnaliticaRepository
from app.utils.helpers import get_current_timestamp

def executar_etl(arquivo_ise: str, arquivo_composicoes: str, sinapi_ref: str, dry_run: bool = False):
    if not validar_sinapi_ref(sinapi_ref):
        print(f"Erro: sinapiRef inválido: {sinapi_ref}. Use formato AAAA-MM")
        sys.exit(1)
    
    print(f"Iniciando ETL para sinapiRef={sinapi_ref}")
    print(f"Arquivo ISE: {arquivo_ise}")
    print(f"Arquivo Composições: {arquivo_composicoes}")
    print(f"Dry-run: {dry_run}")
    print()
    
    print("1. Parseando insumos...")
    insumos = parse_ise_insumos(arquivo_ise, sinapi_ref)
    print(f"   ✓ {len(insumos)} insumos parseados")
    
    print("2. Validando insumos...")
    valido, erros = validar_insumos(insumos)
    if not valido:
        print("   ✗ Erros de validação:")
        for erro in erros[:10]:
            print(f"     - {erro}")
        if len(erros) > 10:
            print(f"     ... e mais {len(erros) - 10} erros")
        sys.exit(1)
    print("   ✓ Insumos válidos")
    
    print("3. Parseando composições...")
    composicoes = parse_composicoes_analiticas(arquivo_composicoes, sinapi_ref)
    print(f"   ✓ {len(composicoes)} composições parseadas")
    
    print("4. Validando composições...")
    codigos_insumos = {ins["codigo"] for ins in insumos}
    valido, erros = validar_composicoes(composicoes, codigos_insumos)
    if not valido:
        print("   ✗ Erros de validação:")
        for erro in erros[:10]:
            print(f"     - {erro}")
        if len(erros) > 10:
            print(f"     ... e mais {len(erros) - 10} erros")
        sys.exit(1)
    print("   ✓ Composições válidas")
    
    if dry_run:
        print("\nDry-run concluído. Nenhum dado foi persistido.")
        return
    
    print("5. Persistindo insumos...")
    repo_insumo = InsumoSINAPIRepository()
    inseridos_insumos = 0
    for insumo in insumos:
        result = repo_insumo.create_insumo(
            codigo=insumo["codigo"],
            descricao=insumo["descricao"],
            unidade=insumo["unidade"],
            preco=insumo.get("precoSP", 0),
            classificacao=insumo["classificacao"],
            sinapi_ref=sinapi_ref,
            user_email="etl@system"
        )
        if result.get("status") == "success":
            inseridos_insumos += 1
    print(f"   ✓ {inseridos_insumos}/{len(insumos)} insumos persistidos")
    
    print("6. Persistindo composições...")
    repo_composicao = ComposicaoAnaliticaRepository()
    inseridas_composicoes = 0
    for comp in composicoes:
        result = repo_composicao.create_composicao(
            codigo=comp["codigo"],
            descricao=comp["descricao"],
            unidade=comp["unidade"],
            grupo=comp["grupo"],
            sinapi_ref=sinapi_ref,
            insumos=comp["itensJson"],
            user_email="etl@system"
        )
        if result.get("status") == "success":
            inseridas_composicoes += 1
    print(f"   ✓ {inseridas_composicoes}/{len(composicoes)} composições persistidas")
    
    print(f"\nETL concluído com sucesso para sinapiRef={sinapi_ref}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ETL SINAPI")
    parser.add_argument("--ise", required=True, help="Caminho para arquivo ISE (XLSX)")
    parser.add_argument("--composicoes", required=True, help="Caminho para arquivo de composições (XLSX)")
    parser.add_argument("--ref", required=True, help="Referência SINAPI (ex: 2026-04)")
    parser.add_argument("--dry-run", action="store_true", help="Validar sem persistir")
    
    args = parser.parse_args()
    executar_etl(args.ise, args.composicoes, args.ref, args.dry_run)
```

### 5. Criar serviço de consulta SINAPI

Criar `backend/app/services/sinapi_service.py`:

```python
from typing import Dict, Any, Optional, List
from app.repositories.insumo_sinapi_repository import InsumoSINAPIRepository
from app.repositories.composicao_analitica_repository import ComposicaoAnaliticaRepository
from app.repositories.parametros_globais_repository import ParametrosGlobaisRepository
from app.utils.helpers import create_response, create_error_response
import json

_cache_composicoes: Dict[str, Dict[str, Any]] = {}

def get_versao_ativa() -> str:
    repo = ParametrosGlobaisRepository()
    result = repo.get_parametros()
    if result.get("status") == "error":
        return "2026-04"
    params = result.get("data", {})
    return params.get("sinapiRefAtiva", "2026-04")

def get_insumo_preco(codigo: str, uf: str, sinapi_ref: Optional[str] = None) -> Dict[str, Any]:
    if not sinapi_ref:
        sinapi_ref = get_versao_ativa()
    
    repo = InsumoSINAPIRepository()
    
    for classificacao in ["MATERIAL", "SERVICOS", "EQUIPAMENTO"]:
        result = repo.get_by_codigo(codigo, sinapi_ref, classificacao)
        if result.get("status") == "success":
            insumo = result["data"]
            preco_uf = insumo.get(f"preco{uf.upper()}")
            preco_sp = insumo.get("precoSP")
            
            return create_response("success", {
                "codigo": codigo,
                "descricao": insumo["descricao"],
                "unidade": insumo["unidade"],
                "preco": preco_uf if preco_uf else preco_sp,
                "usaFallbackSP": not preco_uf,
                "uf": uf
            })
    
    return create_error_response(f"Insumo {codigo} não encontrado na versão {sinapi_ref}")

def get_composicao(codigo: str, sinapi_ref: Optional[str] = None) -> Dict[str, Any]:
    if not sinapi_ref:
        sinapi_ref = get_versao_ativa()
    
    cache_key = f"{sinapi_ref}#{codigo}"
    if cache_key in _cache_composicoes:
        return create_response("success", _cache_composicoes[cache_key])
    
    repo = ComposicaoAnaliticaRepository()
    result = repo.get_by_codigo(codigo, sinapi_ref, "COMP_ANALITICA")
    
    if result.get("status") == "error":
        return result
    
    composicao = result["data"]
    itens = json.loads(composicao.get("itensJson", "[]"))
    
    composicao_formatada = {
        "codigo": composicao["codigo"],
        "descricao": composicao["descricao"],
        "unidade": composicao["unidade"],
        "grupo": composicao["grupo"],
        "sinapiRef": composicao["sinapiRef"],
        "itens": itens
    }
    
    _cache_composicoes[cache_key] = composicao_formatada
    return create_response("success", composicao_formatada)

def listar_versoes() -> Dict[str, Any]:
    repo_insumo = InsumoSINAPIRepository()
    result = repo_insumo.query("sinapiRef ne null", max_results=5000)
    
    if result.get("status") == "error":
        return result
    
    insumos = result.get("data", [])
    versoes = sorted(set(ins.get("sinapiRef") for ins in insumos if ins.get("sinapiRef")))
    
    return create_response("success", {"versoes": versoes})
```

### 6. Criar router de gestão SINAPI

Criar `backend/app/routers/sinapi.py`:

```python
from fastapi import APIRouter, UploadFile, File, Query, Depends
from typing import Optional, Dict, Any
from app.services.sinapi_service import get_versao_ativa, get_insumo_preco, get_composicao, listar_versoes
from app.repositories.parametros_globais_repository import ParametrosGlobaisRepository
from app.utils.helpers import raise_http_error, create_response
from app.utils.permissions import require_permission

router = APIRouter()

@router.post("/sinapi/upload")
async def upload_sinapi(
    arquivo_ise: UploadFile = File(...),
    arquivo_composicoes: UploadFile = File(...),
    sinapi_ref: str = Query(...),
    current_user: dict = Depends(require_permission("/sinapi/upload", "execute"))
) -> Dict[str, Any]:
    raise_http_error(501, "Upload de SINAPI via API não implementado nesta etapa. Use script ETL backend/scripts/etl_sinapi.py")

@router.get("/sinapi/versoes")
async def get_versoes() -> Dict[str, Any]:
    return listar_versoes()

@router.get("/sinapi/versao-ativa")
async def get_versao_ativa_endpoint() -> Dict[str, Any]:
    versao = get_versao_ativa()
    return create_response("success", {"sinapiRefAtiva": versao})

@router.put("/sinapi/versao-ativa")
async def set_versao_ativa(
    sinapi_ref: str,
    current_user: dict = Depends(require_permission("/sinapi/versao-ativa", "write"))
) -> Dict[str, Any]:
    repo = ParametrosGlobaisRepository()
    result = repo.update_parametros(sinapiRefAtiva=sinapi_ref, user_email=current_user.get("email"))
    
    if result.get("status") == "error":
        raise_http_error(500, result.get("error"))
    
    return result

@router.get("/sinapi/insumo/{codigo}")
async def get_insumo(codigo: str, uf: str = Query("SP"), sinapi_ref: Optional[str] = None) -> Dict[str, Any]:
    result = get_insumo_preco(codigo, uf, sinapi_ref)
    if result.get("status") == "error":
        raise_http_error(404, result.get("error"))
    return result

@router.get("/sinapi/composicao/{codigo}")
async def get_composicao_endpoint(codigo: str, sinapi_ref: Optional[str] = None) -> Dict[str, Any]:
    result = get_composicao(codigo, sinapi_ref)
    if result.get("status") == "error":
        raise_http_error(404, result.get("error"))
    return result
```

Registrar em `backend/app/main.py`:

```python
from app.routers import sinapi
app.include_router(sinapi.router, prefix="/api", tags=["SINAPI"])
```

### 7. Migrar `orcamento_service.py` para usar repositório

Modificar `backend/app/services/orcamento_service.py`:

```python
from app.services.sinapi_service import get_composicao

_cache_composicao_local = {}

def resolver_parametros_mo_composicao(composicao_basica, produtividade_basica, proporcao_ajudante):
    if not composicao_basica:
        return produtividade_basica, proporcao_ajudante
    
    if composicao_basica in _cache_composicao_local:
        comp = _cache_composicao_local[composicao_basica]
        return comp["produtividade_basica"], comp["proporcao_ajudante"]
    
    result = get_composicao(composicao_basica)
    if result.get("status") == "error":
        return produtividade_basica, proporcao_ajudante
    
    composicao = result["data"]
    itens = composicao.get("itens", [])
    
    hh_profissional = sum(item["coeficiente"] for item in itens if item["tipoItem"] == "PROFISSIONAL")
    hh_ajudante = sum(item["coeficiente"] for item in itens if item["tipoItem"] == "AJUDANTE")
    
    if hh_profissional == 0:
        return produtividade_basica, proporcao_ajudante
    
    prod_basica_calc = 1 / hh_profissional
    prop_ajudante_calc = hh_ajudante / hh_profissional
    
    _cache_composicao_local[composicao_basica] = {
        "produtividade_basica": prod_basica_calc,
        "proporcao_ajudante": prop_ajudante_calc
    }
    
    return prod_basica_calc, prop_ajudante_calc
```

Remover import de `CM_COMPOSICOES_ANALITICAS_MOCK` e deletar a constante de `config.py`.

### 8. Criar documentação

Criar `backend/docs/sinapi_etl.md` com:

- Formato esperado dos arquivos ISE (colunas, encoding UTF-8, separador)
- Processo passo a passo de ingestão manual
- Exemplos de queries comuns
- Estratégia de rollback (definir `sinapiRefAtiva` para versão anterior)
- Limitações conhecidas (composições com 50+ itens devem ser validadas)

## Restrições

- Sem comentários no código
- Sem emojis
- Sem testes (apenas validações no ETL)
- Variáveis de ambiente apenas em `backend/utils/config.py` com padrão `CM_[DOMINIO]_[NOME]`
- Upload via API não obrigatório nesta etapa (usar script ETL diretamente)
- Parsers devem suportar encoding UTF-8 e ISO-8859-1 (tentar ambos em caso de erro)

## Verificação

Ao concluir esta etapa:

1. Executar ETL com arquivo de teste:
   ```bash
   cd backend
   python scripts/etl_sinapi.py --ise /path/to/ise_insumos_2026_04.xlsx --composicoes /path/to/composicoes_2026_04.xlsx --ref 2026-04 --dry-run
   ```

2. Verificar sem dry-run:
   ```bash
   python scripts/etl_sinapi.py --ise /path/to/ise_insumos_2026_04.xlsx --composicoes /path/to/composicoes_2026_04.xlsx --ref 2026-04
   ```

3. Testar endpoints:
   ```bash
   curl http://localhost:8000/api/sinapi/versoes
   curl http://localhost:8000/api/sinapi/versao-ativa
   curl http://localhost:8000/api/sinapi/insumo/00001379?uf=SP&sinapiRef=2026-04
   curl http://localhost:8000/api/sinapi/composicao/87421?sinapiRef=2026-04
   ```

4. Verificar que cálculos ainda funcionam após remover `CM_COMPOSICOES_ANALITICAS_MOCK`:
   ```bash
   curl -X POST http://localhost:8000/api/calculos/mao-de-obra -H "Content-Type: application/json" -d '{"servico_id": "test", "servico_nome": "Teste", "unidade": "M2", "quantidade": 340, "composicao_basica": "87421", "especificacao1": "Gesso Liso 1,0cm", "produtividade_basica_unh": 1.818, "proporcao_ajudante": 0.364, "prazo_requerido_dias": 20, "modalidade": "MEI"}'
   ```
