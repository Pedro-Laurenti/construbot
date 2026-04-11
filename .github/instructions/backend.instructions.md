---
description: Requisitos para implementar novas funcionalidades no backend (FastAPI/Python).
applyTo: "backend/**/*.py"
---

# Novo Router / Funcionalidade Backend

## Stack
FastAPI + Azure Table Storage + Azure AD (JWT) + APScheduler

## Estrutura de arquivos
```
backend/
  routers/       ← endpoints HTTP
  services/      ← lógica de negócio
  utils/         ← utilitários compartilhados (auth, config, helpers, tableStorage, task_logger)
  workers/       ← execução síncrona dos jobs agendados
  tasks/         ← tarefas agendadas (wrapper para workers)
  scheduler.py   ← APScheduler, registra todas as tarefas
  main.py        ← app bootstrap, registra todos os routers
```

## Adicionar novo router

1. Criar `backend/routers/[nome].router`
2. Registrar em `main.py`:
```python
from routers import nome
app.include_router(nome.router, prefix="/api", tags=["Nome"])
```

## Padrão de router

```python
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional, Dict, Any
from utils.helpers import raise_http_error
from utils.permissions import require_permission

router = APIRouter()

class MeuRequest(BaseModel):
    campo: Optional[str] = None

@router.get("/recurso")
async def get_recurso(
    param: Optional[str] = Query(None),
    current_user: dict = Depends(require_permission("/recurso", "read"))
) -> Dict[str, Any]:
    try:
        result = meu_service(param)
        if result.get("status") == "error":
            raise_http_error(500, result.get("error", "Erro"))
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise_http_error(500, str(e))
```

**Regras obrigatórias:**
- Retorno sempre `-> Dict[str, Any]` — sem response models tipados
- Sempre `except HTTPException: raise` antes do `except Exception`
- Operações mutantes: chamar `log_action()` de `utils/task_logger.py`
- POST bodies: usar `.model_dump(exclude_none=True)`

## Adicionar novo serviço

```python
from utils.helpers import create_response, create_error_response

def meu_service(param: str, **kwargs) -> Dict[str, Any]:
    try:
        # lógica aqui
        return create_response("success", data=[...])
    except Exception as e:
        return create_error_response(str(e))
```

**Serviços nunca chamam outros serviços diretamente.** Recebem kwargs, retornam `{"status": "success"|"error", ...}`.

## Variáveis de ambiente

**TODAS** as variáveis ficam em `utils/config.py`. Nenhum `os.getenv()` fora desse arquivo.

Nomeação: `CM_[DOMINIO]_[NOME]` — tudo maiúsculo.

```python
# utils/config.py
CM_MINHA_VARIAVEL = os.getenv('CM_MINHA_VARIAVEL', '')
```

## Permissões

Recursos seguem o padrão: `/grupo/subgrupo/acao`

| Grupo | Recurso |
|---|---|
| `/marketdata/sad-publico/*` | SAD Público |
| `/marketdata/sad-privado/*` | SAD Privado |
| `/infra/rabbitmq` | RabbitMQ |
| `/infra/sas-token` | SAS Tokens |
| `/permissions` | Permissionamento |
| `/notifications` | Notificações |

```python
Depends(require_permission("/novo-recurso", "read"))    # leitura
Depends(require_permission("/novo-recurso", "write"))   # escrita
Depends(require_permission("/novo-recurso", "execute")) # execução
```

### Modelo de permissão (Table Storage)

Cada entrada tem um campo `Rules` com JSON serializado:
```json
[{"route": "/marketdata/sad-publico/importacoes", "actions": ["read", "execute"]}]
```

Compatibilidade com entradas antigas (`Resources`/`Actions`) é feita via `_parse_rules(perm)` em `utils/permissions.py` — **sempre usar este helper** para ler permissões da tabela, nunca ler `Rules` diretamente.

### Mapeamento de rotas → actions disponíveis

`utils/route_permissions.py` — dict hardcoded com as actions reais de cada rota:
```python
ROUTE_PERMISSIONS = {
    "/marketdata/sad-publico/importacoes": [
        {"action": "read", "label": "Visualizar importações"},
        {"action": "execute", "label": "Atualizar dados"},
    ],
    ...
}
```

**Ao adicionar um novo recurso/action:** atualizar `ROUTE_PERMISSIONS` com a nova entrada.

## Utilitários disponíveis (não duplicar)

| Função | Arquivo | Uso |
|---|---|---|
| `raise_http_error(code, msg)` | `utils/helpers.py` | Levanta HTTPException estruturada |
| `create_response(status, data)` | `utils/helpers.py` | Resposta padrão de serviço |
| `create_error_response(msg)` | `utils/helpers.py` | Resposta de erro de serviço |
| `get_current_timestamp()` | `utils/helpers.py` | ISO UTC string |
| `parse_date_range("str")` | `utils/helpers.py` | `(datetime, datetime)`, máx 30 dias |
| `get_module_logger()` | `utils/helpers.py` | Logger com nome do caller |
| `extract_user_info(user)` | `utils/helpers.py` | `{user_email, user_name, user_groups}` |
| `log_action(...)` | `utils/task_logger.py` | Audit log de mutações |
| `get_app_table_storage_client()` | `utils/tableStorage.py` | Cliente Azure Table Storage |
| `get_business_days(n, holidays)` | `utils/lastBusinessday.py` | Lista de dias úteis |

## Azure Table Storage

Único banco de dados. Todas as operações retornam `{"status": "success"|"error", ...}` (nunca levantam exceção).

```python
client = get_app_table_storage_client()
client.query_entities("NomeTabela", filter_query="PartitionKey eq 'pk'")
client.insert_entity("NomeTabela", {"PartitionKey": "pk", "RowKey": str(uuid4()), ...})
client.update_entity("NomeTabela", entity, mode="merge")
client.delete_entity("NomeTabela", partition_key, row_key)
```

Nomes das tabelas como constantes em `utils/config.py`.

## Novo job agendado

1. Criar worker em `workers/[nome].py`
2. Criar task em `tasks/[nome].py` (wrapper que chama o worker)
3. Registrar em `scheduler.py` com `CronTrigger`

## Sanitização / anti-duplicidade

- Lógica repetida em 2+ lugares → mover para `utils/helpers.py` ou serviço dedicado
- Nunca reimplementar: logging, error response, timestamp, date parsing, table storage
- Sem `try/except` em serviços que não retornam ao router — usar o padrão `create_error_response`
- Sem variáveis de ambiente hardcoded fora de `utils/config.py`
