---
agent: agent
---
# Endpoints API — CRUD de Domínio

## Contexto

O projeto ConstruBot possui atualmente:
- **Etapa 01 concluída**: Storage Account provisionado, Managed Identity configurada
- **Etapa 02 concluída**: Schemas documentados para 12 tabelas (Cliente, Orcamento, OrcamentoEngenheiro, PlantaPadrao, Opcional, ParametrosGlobais, GruposEncargos, ComposicaoProfissional, InsumoSINAPI, ComposicaoAnalitica, Auditoria, Usuario)
- **Etapa 03 concluída**: 12 repositórios implementados (ClienteRepository, OrcamentoRepository, etc.) com métodos CRUD básicos
- **Etapa 04 concluída**: Autenticação Azure AD implementada com JWT, decorators `@require_auth` e `@require_role` disponíveis em `backend/app/utils/auth.py`
- **Backend atual**: 5 routers registrados em `main.py` (health, calculos, localidades, storage_health, auth), mas nenhum endpoint de CRUD de domínio exposto

**Arquivos existentes que serão usados:**
- `backend/app/repositories/*_repository.py` — 12 repositórios com métodos create, get, update, delete, query
- `backend/app/utils/auth.py` — decorators `@require_auth`, `@require_role`, função `get_current_user`
- `backend/app/utils/helpers.py` — `create_response`, `create_error_response`, `raise_http_error`
- `backend/app/routers/health.py` — exemplo de router simples existente
- `backend/app/main.py` — registra todos os routers

**Arquivos que serão criados:**
- `backend/app/routers/clientes.py` — CRUD de clientes
- `backend/app/routers/orcamentos.py` — CRUD de orçamentos
- `backend/app/routers/orcamentos_engenheiro.py` — CRUD de orçamentos de engenharia
- `backend/app/routers/plantas.py` — CRUD de plantas padrão
- `backend/app/routers/opcionais.py` — CRUD de opcionais
- `backend/app/routers/parametros_globais.py` — CRUD de parâmetros globais
- `backend/app/routers/grupos_encargos.py` — CRUD de grupos de encargos
- `backend/app/routers/composicoes_profissionais.py` — CRUD de composições profissionais
- `backend/app/routers/insumos_sinapi.py` — CRUD de insumos SINAPI
- `backend/app/routers/composicoes_analiticas.py` — CRUD de composições analíticas
- `backend/app/routers/auditoria.py` — Consulta de logs de auditoria (somente leitura)
- `backend/app/models/` — Pydantic models para request/response bodies

Esta etapa expõe **endpoints REST completos** para todas as entidades, com autenticação JWT, autorização por role, validação Pydantic, paginação, filtros e documentação OpenAPI automática.

## Pré-requisitos

- Etapa alfa-01 concluída (Storage Account provisionado)
- Etapa alfa-02 concluída (schemas documentados)
- Etapa alfa-03 concluída (repositórios implementados)
- Etapa alfa-04 concluída (autenticação Azure AD + JWT)

## Entregáveis

Ao final desta etapa, devem existir:

1. **11 routers com endpoints CRUD** (um para cada entidade, exceto Usuario que já tem auth.py):
   - Clientes: `POST /api/clientes`, `GET /api/clientes`, `GET /api/clientes/{id}`, `PUT /api/clientes/{id}`, `DELETE /api/clientes/{id}`
   - Orçamentos: `POST /api/orcamentos`, `GET /api/orcamentos`, `GET /api/orcamentos/{id}`, `PUT /api/orcamentos/{id}`, `DELETE /api/orcamentos/{id}`, `GET /api/clientes/{cliente_id}/orcamentos`
   - Orçamentos Engenheiro: `POST /api/orcamentos-engenheiro`, `GET /api/orcamentos-engenheiro`, `GET /api/orcamentos-engenheiro/{id}`, `PUT /api/orcamentos-engenheiro/{id}`, `DELETE /api/orcamentos-engenheiro/{id}`
   - Plantas: `POST /api/plantas`, `GET /api/plantas`, `GET /api/plantas/{id}`, `PUT /api/plantas/{id}`, `DELETE /api/plantas/{id}`
   - Opcionais: `POST /api/opcionais`, `GET /api/opcionais`, `PUT /api/opcionais/{id}`, `DELETE /api/opcionais/{id}`
   - Parâmetros Globais: `GET /api/parametros-globais`, `PUT /api/parametros-globais` (singleton, sem create/delete)
   - Grupos Encargos: `GET /api/grupos-encargos`, `PUT /api/grupos-encargos` (singleton, sem create/delete)
   - Composições Profissionais: `POST /api/composicoes-profissionais`, `GET /api/composicoes-profissionais`, `GET /api/composicoes-profissionais/{id}`, `PUT /api/composicoes-profissionais/{id}`, `DELETE /api/composicoes-profissionais/{id}`
   - Insumos SINAPI: `POST /api/insumos-sinapi`, `GET /api/insumos-sinapi`, `GET /api/insumos-sinapi/{codigo}`, `PUT /api/insumos-sinapi/{codigo}`, `DELETE /api/insumos-sinapi/{codigo}`, `GET /api/insumos-sinapi/buscar?descricao=...`
   - Composições Analíticas: `POST /api/composicoes-analiticas`, `GET /api/composicoes-analiticas`, `GET /api/composicoes-analiticas/{codigo}`, `PUT /api/composicoes-analiticas/{codigo}`, `DELETE /api/composicoes-analiticas/{codigo}`
   - Auditoria: `GET /api/auditoria?tabela=...&entidadeId=...&start=...&end=...` (somente leitura)

2. **Pydantic models** em `backend/app/models/`:
   - `cliente.py` — `ClienteCreate`, `ClienteUpdate`, `ClienteResponse`
   - `orcamento.py` — `OrcamentoCreate`, `OrcamentoUpdate`, `OrcamentoResponse`
   - `orcamento_engenheiro.py` — `OrcamentoEngenheiroCreate`, `OrcamentoEngenheiroUpdate`, `OrcamentoEngenheiroResponse`
   - `planta.py` — `PlantaCreate`, `PlantaUpdate`, `PlantaResponse`
   - `opcional.py` — `OpcionalCreate`, `OpcionalUpdate`, `OpcionalResponse`
   - `parametros_globais.py` — `ParametrosGlobaisUpdate`, `ParametrosGlobaisResponse`
   - `grupos_encargos.py` — `GruposEncargosUpdate`, `GruposEncargosResponse`
   - `composicao_profissional.py` — `ComposicaoProfissionalCreate`, `ComposicaoProfissionalUpdate`, `ComposicaoProfissionalResponse`
   - `insumo_sinapi.py` — `InsumoSINAPICreate`, `InsumoSINAPIUpdate`, `InsumoSINAPIResponse`
   - `composicao_analitica.py` — `ComposicaoAnaliticaCreate`, `ComposicaoAnaliticaUpdate`, `ComposicaoAnaliticaResponse`
   - `common.py` — `PaginatedResponse`, `ErrorResponse`, `SuccessResponse`

3. **Autorização por role**:
   - Clientes: qualquer usuário autenticado pode criar/ler seus próprios orçamentos; engenheiros e admins podem ler todos
   - Orçamentos: cliente pode criar/editar apenas seus próprios; engenheiro e admin podem ler todos
   - Orçamentos Engenheiro: apenas engenheiro e admin
   - Plantas, Opcionais, Parâmetros Globais, Grupos Encargos, Composições: apenas engenheiro e admin
   - Insumos SINAPI, Composições Analíticas: apenas admin (dados sensíveis)
   - Auditoria: apenas admin

4. **Paginação**:
   - Endpoints de listagem aceitam `?skip=0&limit=50`
   - Resposta padrão: `{"status": "success", "data": [...], "total": 123, "skip": 0, "limit": 50}`

5. **Filtros**:
   - Clientes: `?email=...` (exact match, case-insensitive)
   - Orçamentos: `?cliente_id=...&status=...&uf=...`
   - Insumos SINAPI: `?descricao=...` (busca parcial case-insensitive), `?codigo=...`, `?tipo=...`
   - Composições Analíticas: `?descricao=...`, `?codigo=...`
   - Auditoria: `?tabela=...&entidadeId=...&start=...&end=...&usuario=...`

6. **Registro em main.py**:
   - Todos os 11 routers registrados com prefixo `/api` e tags apropriadas

7. **OpenAPI completo**:
   - Documentação automática em `/docs` com todos os endpoints, schemas, autenticação Bearer token
   - Tags organizadas por domínio

## Implementação

### 1. Criar diretório de models Pydantic

```bash
mkdir -p backend/app/models
touch backend/app/models/__init__.py
```

### 2. Criar models comuns em `backend/app/models/common.py`

```python
from typing import Any, List, Optional
from pydantic import BaseModel

class SuccessResponse(BaseModel):
    status: str = "success"
    data: Optional[Any] = None

class ErrorResponse(BaseModel):
    status: str = "error"
    error: str

class PaginatedResponse(BaseModel):
    status: str = "success"
    data: List[Any]
    total: int
    skip: int
    limit: int
```

### 3. Criar models de Cliente em `backend/app/models/cliente.py`

```python
from typing import Optional
from pydantic import BaseModel, EmailStr, Field

class ClienteCreate(BaseModel):
    nome: str = Field(..., min_length=2, max_length=200)
    telefone: str = Field(..., min_length=10, max_length=20)
    email: EmailStr

class ClienteUpdate(BaseModel):
    nome: Optional[str] = Field(None, min_length=2, max_length=200)
    telefone: Optional[str] = Field(None, min_length=10, max_length=20)
    email: Optional[EmailStr] = None

class ClienteResponse(BaseModel):
    id: str
    nome: str
    telefone: str
    email: str
    dataCadastro: str
    createdAt: str
    updatedAt: str
    createdBy: Optional[str] = None
    updatedBy: Optional[str] = None
```

**Seguir o mesmo padrão para as outras 9 entidades**, criando arquivos:
- `orcamento.py` com `OrcamentoCreate` (campos: nome, uf, itensJson como string), `OrcamentoUpdate`, `OrcamentoResponse`
- `orcamento_engenheiro.py` com `OrcamentoEngenheiroCreate` (campos: orcamentoClienteId, etapaAtual, quantitativosJson), `OrcamentoEngenheiroUpdate`, `OrcamentoEngenheiroResponse`
- `planta.py` com `PlantaCreate` (campos: codigo, nome, tipo, areaM2, geometriaJson), `PlantaUpdate`, `PlantaResponse`
- `opcional.py` com `OpcionalCreate` (campos: codigo, nome, descricao, unidade, custoUnitario), `OpcionalUpdate`, `OpcionalResponse`
- `parametros_globais.py` com `ParametrosGlobaisUpdate` (campos: bdi, fatorEncargos, salarioQualificado, etc.), `ParametrosGlobaisResponse`
- `grupos_encargos.py` com `GruposEncargosUpdate` (campos: grupoAJson, grupoBJson, etc.), `GruposEncargosResponse`
- `composicao_profissional.py` com `ComposicaoProfissionalCreate` (campos: codigo, descricao, tipo, produtividadeBase, etc.), `ComposicaoProfissionalUpdate`, `ComposicaoProfissionalResponse`
- `insumo_sinapi.py` com `InsumoSINAPICreate` (campos: codigo, descricao, unidade, tipo, precosUFJson), `InsumoSINAPIUpdate`, `InsumoSINAPIResponse`
- `composicao_analitica.py` com `ComposicaoAnaliticaCreate` (campos: codigo, descricao, unidade, itensJson), `ComposicaoAnaliticaUpdate`, `ComposicaoAnaliticaResponse`

### 4. Criar router de Clientes em `backend/app/routers/clientes.py`

```python
from fastapi import APIRouter, Depends, Query
from typing import Dict, Any, Optional

from app.models.cliente import ClienteCreate, ClienteUpdate, ClienteResponse
from app.repositories.cliente_repository import ClienteRepository
from app.utils.auth import get_current_user, require_role
from app.utils.helpers import raise_http_error, create_response

router = APIRouter()

@router.post("/clientes", response_model=Dict[str, Any])
async def create_cliente(
    body: ClienteCreate,
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    repo = ClienteRepository()
    result = repo.create_cliente(
        nome=body.nome,
        telefone=body.telefone,
        email=body.email,
        user_email=current_user["email"]
    )
    if result.get("status") == "error":
        raise_http_error(400, result.get("error", "Erro ao criar cliente"))
    return result

@router.get("/clientes", response_model=Dict[str, Any])
async def list_clientes(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    email: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    repo = ClienteRepository()
    
    if email:
        result = repo.get_by_email(email)
        if result.get("status") == "error":
            return create_response("success", [], total=0, skip=skip, limit=limit)
        return create_response("success", [result.get("data")], total=1, skip=0, limit=1)
    
    result = repo.list_all_clientes()
    if result.get("status") == "error":
        raise_http_error(500, result.get("error", "Erro ao listar clientes"))
    
    data = result.get("data", [])
    total = len(data)
    paginated_data = data[skip:skip + limit]
    
    return create_response("success", paginated_data, total=total, skip=skip, limit=limit)

@router.get("/clientes/{cliente_id}", response_model=Dict[str, Any])
async def get_cliente(
    cliente_id: str,
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    repo = ClienteRepository()
    result = repo.get_by_id(cliente_id)
    if result.get("status") == "error":
        raise_http_error(404, "Cliente não encontrado")
    return result

@router.put("/clientes/{cliente_id}", response_model=Dict[str, Any])
async def update_cliente(
    cliente_id: str,
    body: ClienteUpdate,
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    repo = ClienteRepository()
    result = repo.get_by_id(cliente_id)
    if result.get("status") == "error":
        raise_http_error(404, "Cliente não encontrado")
    
    entity = result.get("data")
    
    if body.nome is not None:
        entity["nome"] = body.nome
    if body.telefone is not None:
        entity["telefone"] = body.telefone
    if body.email is not None:
        entity["email"] = body.email
    
    update_result = repo.update(entity, current_user["email"])
    if update_result.get("status") == "error":
        raise_http_error(500, update_result.get("error", "Erro ao atualizar cliente"))
    return update_result

@router.delete("/clientes/{cliente_id}", response_model=Dict[str, Any])
async def delete_cliente(
    cliente_id: str,
    current_user: dict = Depends(require_role("admin"))
) -> Dict[str, Any]:
    repo = ClienteRepository()
    result = repo.get_by_id(cliente_id)
    if result.get("status") == "error":
        raise_http_error(404, "Cliente não encontrado")
    
    entity = result.get("data")
    delete_result = repo.delete(entity["PartitionKey"], entity["RowKey"], current_user["email"])
    if delete_result.get("status") == "error":
        raise_http_error(500, delete_result.get("error", "Erro ao deletar cliente"))
    return delete_result
```

**Seguir o mesmo padrão para criar os outros 10 routers**, com adaptações específicas:
- `orcamentos.py`: adicionar endpoint `GET /clientes/{cliente_id}/orcamentos` usando `OrcamentoRepository.list_by_cliente()`
- `orcamentos_engenheiro.py`: proteger todos os endpoints com `@require_role("engenheiro")`
- `parametros_globais.py`: implementar apenas GET e PUT (singleton), RowKey fixo `PARAMETROS_GLOBAIS_SINGLETON`
- `grupos_encargos.py`: implementar apenas GET e PUT (singleton), RowKey fixo `GRUPOS_ENCARGOS_SINGLETON`
- `insumos_sinapi.py`: adicionar endpoint `GET /insumos-sinapi/buscar?descricao=...` para busca parcial
- `composicoes_analiticas.py`: adicionar endpoint `GET /composicoes-analiticas/buscar?descricao=...` para busca parcial
- `auditoria.py`: implementar apenas GET com filtros (tabela, entidadeId, start, end, usuario), proteger com `@require_role("admin")`

### 5. Registrar todos os routers em `backend/app/main.py`

Adicionar os imports no início do arquivo:

```python
from app.routers import (
    health,
    calculos,
    localidades,
    storage_health,
    auth,
    clientes,
    orcamentos,
    orcamentos_engenheiro,
    plantas,
    opcionais,
    parametros_globais,
    grupos_encargos,
    composicoes_profissionais,
    insumos_sinapi,
    composicoes_analiticas,
    auditoria
)
```

Registrar todos os routers após a configuração de CORS:

```python
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(clientes.router, prefix="/api", tags=["Clientes"])
app.include_router(orcamentos.router, prefix="/api", tags=["Orçamentos"])
app.include_router(orcamentos_engenheiro.router, prefix="/api", tags=["Orçamentos Engenheiro"])
app.include_router(plantas.router, prefix="/api", tags=["Plantas"])
app.include_router(opcionais.router, prefix="/api", tags=["Opcionais"])
app.include_router(parametros_globais.router, prefix="/api", tags=["Parâmetros Globais"])
app.include_router(grupos_encargos.router, prefix="/api", tags=["Grupos Encargos"])
app.include_router(composicoes_profissionais.router, prefix="/api", tags=["Composições Profissionais"])
app.include_router(insumos_sinapi.router, prefix="/api", tags=["Insumos SINAPI"])
app.include_router(composicoes_analiticas.router, prefix="/api", tags=["Composições Analíticas"])
app.include_router(auditoria.router, prefix="/api", tags=["Auditoria"])
app.include_router(calculos.router, prefix="/api", tags=["Calculos"])
app.include_router(localidades.router, prefix="/api", tags=["Localidades"])
app.include_router(storage_health.router, prefix="/api", tags=["Health"])
```

### 6. Atualizar `backend/app/repositories/__init__.py`

Adicionar exports para facilitar imports:

```python
from .cliente_repository import ClienteRepository
from .orcamento_repository import OrcamentoRepository
from .orcamento_engenheiro_repository import OrcamentoEngenheiroRepository
from .planta_repository import PlantaRepository
from .opcional_repository import OpcionalRepository
from .parametros_globais_repository import ParametrosGlobaisRepository
from .grupos_encargos_repository import GruposEncargosRepository
from .composicao_profissional_repository import ComposicaoProfissionalRepository
from .insumo_sinapi_repository import InsumoSINAPIRepository
from .composicao_analitica_repository import ComposicaoAnaliticaRepository
from .auditoria_repository import AuditoriaRepository
from .usuario_repository import UsuarioRepository

__all__ = [
    "ClienteRepository",
    "OrcamentoRepository",
    "OrcamentoEngenheiroRepository",
    "PlantaRepository",
    "OpcionalRepository",
    "ParametrosGlobaisRepository",
    "GruposEncargosRepository",
    "ComposicaoProfissionalRepository",
    "InsumoSINAPIRepository",
    "ComposicaoAnaliticaRepository",
    "AuditoriaRepository",
    "UsuarioRepository",
]
```

### 7. Adicionar Pydantic ao requirements.txt (se não estiver)

Verificar se `pydantic==2.10.6` (ou versão compatível com FastAPI 0.115.12) está presente. Se não estiver, adicionar:

```
pydantic==2.10.6
email-validator==2.2.0
```

### 8. Criar testes de integração (opcional mas recomendado)

Criar `backend/tests/test_clientes_api.py`:

```python
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_create_cliente():
    response = client.post("/api/clientes", json={
        "nome": "João Silva",
        "telefone": "(11) 98765-4321",
        "email": "joao@teste.com"
    })
    assert response.status_code == 401

def test_list_clientes_requires_auth():
    response = client.get("/api/clientes")
    assert response.status_code == 401
```

### 9. Atualizar README.md com novos endpoints

Adicionar seção em README.md:

```markdown
### Endpoints API

Após a etapa 05, os seguintes endpoints estão disponíveis:

- **Clientes**: `/api/clientes` (POST, GET, GET /{id}, PUT /{id}, DELETE /{id})
- **Orçamentos**: `/api/orcamentos` (POST, GET, GET /{id}, PUT /{id}, DELETE /{id})
- **Orçamentos Engenheiro**: `/api/orcamentos-engenheiro` (POST, GET, GET /{id}, PUT /{id}, DELETE /{id})
- **Plantas**: `/api/plantas` (POST, GET, GET /{id}, PUT /{id}, DELETE /{id})
- **Opcionais**: `/api/opcionais` (POST, GET, PUT /{id}, DELETE /{id})
- **Parâmetros Globais**: `/api/parametros-globais` (GET, PUT)
- **Grupos Encargos**: `/api/grupos-encargos` (GET, PUT)
- **Composições Profissionais**: `/api/composicoes-profissionais` (POST, GET, GET /{id}, PUT /{id}, DELETE /{id})
- **Insumos SINAPI**: `/api/insumos-sinapi` (POST, GET, GET /{codigo}, PUT /{codigo}, DELETE /{codigo})
- **Composições Analíticas**: `/api/composicoes-analiticas` (POST, GET, GET /{codigo}, PUT /{codigo}, DELETE /{codigo})
- **Auditoria**: `/api/auditoria` (GET com filtros)

Documentação completa: `http://localhost:8000/docs`
```

## Restrições

- Sem comentários no código
- Sem emojis
- Variáveis de ambiente apenas em `backend/app/utils/config.py`, padrão `CM_[DOMINIO]_[NOME]`
- Retorno sempre `Dict[str, Any]` nos endpoints — sem response models tipados em type hints de retorno (Pydantic models apenas para request bodies e response_model no decorator)
- Sempre `except HTTPException: raise` antes do `except Exception` em try/catch
- Usar `raise_http_error(code, msg)` de `utils/helpers.py` para erros HTTP
- Usar `create_response("success", data)` e `create_error_response(msg)` para respostas de serviço
- Autorização por role: usar decorators `Depends(get_current_user)` para autenticação básica e `Depends(require_role("role"))` para autorização específica
- Paginação obrigatória em endpoints de listagem: `skip` e `limit` como query params
- Filtros case-insensitive quando aplicável
- OpenAPI tags organizadas por domínio
- Não criar serviços separados — lógica de negócio fica nos repositórios, routers apenas orquestram
- Não adicionar mais routers além dos 11 especificados
- Não modificar os repositórios existentes — apenas usá-los

## Verificação

Após a implementação, validar que:

1. Todos os 11 routers foram criados em `backend/app/routers/`
2. Todos os Pydantic models foram criados em `backend/app/models/`
3. Todos os routers foram registrados em `main.py`
4. Executar backend e verificar que não há erros de import:
   ```bash
   cd backend
   uvicorn app.main:app --reload --port 8000
   ```
5. Acessar `http://localhost:8000/docs` e verificar:
   - 11 tags de domínio visíveis (Clientes, Orçamentos, etc.)
   - Cada tag expandida mostra os endpoints corretos
   - Cada endpoint mostra os schemas Pydantic corretamente
   - Botão "Authorize" presente com bearer token
6. Testar autenticação em qualquer endpoint protegido:
   ```bash
   curl http://localhost:8000/api/clientes
   # Deve retornar 401 Unauthorized
   ```
7. Testar criação de cliente com token válido (obtido via login no frontend):
   ```bash
   curl -X POST http://localhost:8000/api/clientes \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"nome": "Teste", "telefone": "11987654321", "email": "teste@teste.com"}'
   # Deve retornar 200 com dados do cliente criado
   ```
8. Verificar que não há erros no terminal do backend
9. Verificar que todos os repositórios estão exportados em `backend/app/repositories/__init__.py`
