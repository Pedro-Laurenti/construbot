---
agent: agent
---
# Backend — Camada de Persistência Azure Tables

## Contexto

O projeto ConstruBot possui atualmente:
- **Infraestrutura (etapa 01 concluída)**: Storage Account `construtobtstorage` provisionado, Managed Identity configurada, variáveis `CM_STORAGE_ACCOUNT_NAME`, `CM_STORAGE_ACCOUNT_URL`, `CM_STORAGE_CONNECTION_STRING` disponíveis em `backend/app/utils/config.py`
- **Schemas documentados (etapa 02 concluída)**: arquivo `backend/docs/schemas.md` com modelagem completa de 12 tabelas (Cliente, Orcamento, OrcamentoEngenheiro, PlantaPadrao, Opcional, ParametrosGlobais, GruposEncargos, ComposicaoProfissional, InsumoSINAPI, ComposicaoAnalitica, Auditoria, Usuario)
- **Backend atual**: sem persistência real. Estrutura em `backend/app/` com:
  - `main.py` — bootstrap FastAPI, registra routers
  - `routers/` — endpoints (calculos, health, localidades, storage_health)
  - `services/` — lógica de negócio (apenas `orcamento_service.py`)
  - `utils/` — helpers (`config.py`, `helpers.py`)
- **Dependências atuais**: `fastapi`, `uvicorn`, `python-dotenv`, `azure-data-tables==12.5.0`, `azure-identity==1.19.0`

Esta etapa implementa a **camada de persistência** que será consumida pelos endpoints CRUD da etapa 05. Não cria endpoints novos, apenas a infraestrutura de dados.

## Pré-requisitos

- Etapa alfa-01 concluída (Storage Account provisionado)
- Etapa alfa-02 concluída (schemas documentados em `backend/docs/schemas.md`)

## Entregáveis

Ao final desta etapa, devem existir:

1. **Cliente Azure Tables** configurável em `backend/app/utils/table_client.py`:
   - Autenticação via `DefaultAzureCredential` (Managed Identity em produção)
   - Fallback para connection string em desenvolvimento local
   - Singleton para reutilização de conexões

2. **Helpers de serialização** em `backend/app/utils/table_helpers.py`:
   - `serialize_entity(entity: dict) -> dict` — converte tipos Python → Azure Tables
   - `deserialize_entity(entity: dict) -> dict` — converte Azure Tables → Python
   - `validate_entity_size(entity: dict) -> bool` — valida limite de 1MB
   - `build_partition_key(tenant_id: str, categoria: str) -> str`
   - `build_audit_fields(user_email: str = None) -> dict`

3. **Repositório base** em `backend/app/repositories/base_repository.py`:
   - Classe abstrata `BaseRepository` com operações CRUD genéricas
   - Métodos: `create()`, `get()`, `update()`, `delete()`, `query()`, `list_all()`
   - Tratamento de erros Azure Tables → responses padronizados
   - Paginação via continuation tokens

4. **Repositórios de domínio** em `backend/app/repositories/`:
   - `cliente_repository.py` — CRUD de Cliente
   - `orcamento_repository.py` — CRUD de Orcamento
   - `orcamento_engenheiro_repository.py` — CRUD de OrcamentoEngenheiro
   - `planta_repository.py` — CRUD de PlantaPadrao
   - `opcional_repository.py` — CRUD de Opcional
   - `parametros_globais_repository.py` — CRUD de ParametrosGlobais (versionado)
   - `grupos_encargos_repository.py` — CRUD de GruposEncargos (versionado)
   - `composicao_profissional_repository.py` — CRUD de ComposicaoProfissional
   - `insumo_sinapi_repository.py` — CRUD de InsumoSINAPI (versionado por sinapiRef)
   - `composicao_analitica_repository.py` — CRUD de ComposicaoAnalitica (versionado)
   - `auditoria_repository.py` — CRUD de Auditoria
   - `usuario_repository.py` — CRUD de Usuario (preparação para etapa 04)

5. **Constantes de tabelas** em `backend/app/utils/config.py`:
   - `CM_TABLE_CLIENTE = "Cliente"`
   - `CM_TABLE_ORCAMENTO = "Orcamento"`
   - ... (uma constante por tabela)

6. **Script de inicialização de tabelas** em `backend/scripts/init_tables.py`:
   - Cria todas as tabelas no Storage Account se não existirem
   - Idempotente (não falha se tabela já existe)
   - Executável via `python -m backend.scripts.init_tables`

7. **Testes de integração** em `backend/tests/integration/`:
   - `test_table_client.py` — testa conexão e autenticação
   - `test_repositories.py` — testa CRUD de cada repositório contra Azurite local
   - Configuração de Azurite em `backend/tests/conftest.py`

8. **Arquivo `.env.example` atualizado** com variáveis para Azurite local

## Implementação

### 1. Adicionar constantes de tabelas em `backend/app/utils/config.py`

Adicionar ao final do arquivo (após as variáveis de Storage Account já existentes):

```python
CM_TABLE_CLIENTE = "Cliente"
CM_TABLE_ORCAMENTO = "Orcamento"
CM_TABLE_ORCAMENTO_ENGENHEIRO = "OrcamentoEngenheiro"
CM_TABLE_PLANTA = "PlantaPadrao"
CM_TABLE_OPCIONAL = "Opcional"
CM_TABLE_PARAMETROS_GLOBAIS = "ParametrosGlobais"
CM_TABLE_GRUPOS_ENCARGOS = "GruposEncargos"
CM_TABLE_COMPOSICAO_PROFISSIONAL = "ComposicaoProfissional"
CM_TABLE_INSUMO_SINAPI = "InsumoSINAPI"
CM_TABLE_COMPOSICAO_ANALITICA = "ComposicaoAnalitica"
CM_TABLE_AUDITORIA = "Auditoria"
CM_TABLE_USUARIO = "Usuario"

CM_TENANT_ID_DEFAULT = "default"
```

### 2. Criar cliente Azure Tables em `backend/app/utils/table_client.py`

Criar arquivo com singleton do TableServiceClient:

```python
from azure.data.tables import TableServiceClient
from azure.identity import DefaultAzureCredential
from azure.core.exceptions import ResourceNotFoundError

from app.utils.config import (
    CM_STORAGE_ACCOUNT_URL,
    CM_STORAGE_CONNECTION_STRING
)

_table_service_client = None

def get_table_service_client() -> TableServiceClient:
    global _table_service_client
    if _table_service_client is not None:
        return _table_service_client
    
    if CM_STORAGE_CONNECTION_STRING:
        _table_service_client = TableServiceClient.from_connection_string(
            conn_str=CM_STORAGE_CONNECTION_STRING
        )
    else:
        credential = DefaultAzureCredential()
        _table_service_client = TableServiceClient(
            endpoint=CM_STORAGE_ACCOUNT_URL,
            credential=credential
        )
    
    return _table_service_client

def get_table_client(table_name: str):
    service_client = get_table_service_client()
    return service_client.get_table_client(table_name)

def create_table_if_not_exists(table_name: str) -> bool:
    try:
        service_client = get_table_service_client()
        service_client.create_table(table_name)
        return True
    except ResourceNotFoundError:
        return False
    except Exception:
        return False
```

**Notas:**
- `DefaultAzureCredential` tenta autenticação via Managed Identity primeiro, depois variáveis de ambiente, Azure CLI, etc.
- Em produção (Azure App Service com Managed Identity), `CM_STORAGE_CONNECTION_STRING` estará vazio
- Em desenvolvimento local, usar connection string do Azurite no `.env`

### 3. Criar helpers de serialização em `backend/app/utils/table_helpers.py`

Criar arquivo com funções auxiliares:

```python
import json
import sys
from datetime import datetime
from typing import Any, Dict, Optional
from uuid import uuid4

from app.utils.config import CM_TENANT_ID_DEFAULT
from app.utils.helpers import get_current_timestamp

def serialize_entity(entity: dict) -> dict:
    serialized = {}
    for key, value in entity.items():
        if key in ("PartitionKey", "RowKey", "Timestamp"):
            serialized[key] = value
        elif value is None:
            continue
        elif isinstance(value, (dict, list)):
            serialized[f"{key}"] = json.dumps(value, ensure_ascii=False)
        elif isinstance(value, datetime):
            serialized[key] = value.isoformat()
        elif isinstance(value, bool):
            serialized[key] = value
        elif isinstance(value, (int, float)):
            serialized[key] = value
        else:
            serialized[key] = str(value)
    return serialized

def deserialize_entity(entity: dict) -> dict:
    deserialized = {}
    for key, value in entity.items():
        if key in ("PartitionKey", "RowKey", "Timestamp", "etag"):
            deserialized[key] = value
        elif isinstance(value, str) and (key.endswith("Json") or key.endswith("json")):
            try:
                deserialized[key.replace("Json", "").replace("json", "")] = json.loads(value)
            except json.JSONDecodeError:
                deserialized[key] = value
        else:
            deserialized[key] = value
    return deserialized

def validate_entity_size(entity: dict, max_size_bytes: int = 1_000_000) -> bool:
    serialized = serialize_entity(entity)
    json_str = json.dumps(serialized, ensure_ascii=False)
    size_bytes = len(json_str.encode('utf-8'))
    return size_bytes < max_size_bytes

def build_partition_key(tenant_id: str, categoria: str) -> str:
    return f"{tenant_id}#{categoria}"

def build_audit_fields(user_email: Optional[str] = None, is_update: bool = False) -> dict:
    timestamp = get_current_timestamp()
    fields = {}
    if not is_update:
        fields["createdAt"] = timestamp
        if user_email:
            fields["createdBy"] = user_email
    fields["updatedAt"] = timestamp
    if user_email:
        fields["updatedBy"] = user_email
    return fields

def generate_row_key() -> str:
    return str(uuid4())
```

**Notas:**
- `serialize_entity()`: converte campos JSON (dict/list) em strings JSON, mantém tipos nativos do Azure Tables
- `deserialize_entity()`: detecta campos com sufixo `Json` e desserializa automaticamente
- `validate_entity_size()`: verifica limite de 1MB antes de persistir
- `build_audit_fields()`: adiciona `createdAt`, `updatedAt`, `createdBy`, `updatedBy`

### 4. Criar repositório base em `backend/app/repositories/base_repository.py`

Criar diretório `backend/app/repositories/` e arquivo base abstrato:

```python
from abc import ABC
from typing import Any, Dict, List, Optional
from azure.core.exceptions import ResourceNotFoundError, ResourceExistsError
from azure.data.tables import TableClient

from app.utils.table_client import get_table_client
from app.utils.table_helpers import (
    serialize_entity,
    deserialize_entity,
    validate_entity_size,
    build_audit_fields
)
from app.utils.helpers import create_response, create_error_response

class BaseRepository(ABC):
    def __init__(self, table_name: str):
        self.table_name = table_name
        self._client: Optional[TableClient] = None
    
    @property
    def client(self) -> TableClient:
        if self._client is None:
            self._client = get_table_client(self.table_name)
        return self._client
    
    def create(self, entity: dict, user_email: Optional[str] = None) -> Dict[str, Any]:
        try:
            if not validate_entity_size(entity):
                return create_error_response("Entidade excede limite de 1MB")
            
            audit_fields = build_audit_fields(user_email, is_update=False)
            entity.update(audit_fields)
            
            serialized = serialize_entity(entity)
            result = self.client.create_entity(serialized)
            return create_response("success", deserialize_entity(result))
        except ResourceExistsError:
            return create_error_response("Entidade já existe")
        except Exception as e:
            return create_error_response(f"Erro ao criar entidade: {str(e)}")
    
    def get(self, partition_key: str, row_key: str) -> Dict[str, Any]:
        try:
            entity = self.client.get_entity(partition_key, row_key)
            return create_response("success", deserialize_entity(entity))
        except ResourceNotFoundError:
            return create_error_response("Entidade não encontrada")
        except Exception as e:
            return create_error_response(f"Erro ao buscar entidade: {str(e)}")
    
    def update(self, entity: dict, user_email: Optional[str] = None, mode: str = "merge") -> Dict[str, Any]:
        try:
            if not validate_entity_size(entity):
                return create_error_response("Entidade excede limite de 1MB")
            
            audit_fields = build_audit_fields(user_email, is_update=True)
            entity.update(audit_fields)
            
            serialized = serialize_entity(entity)
            self.client.update_entity(serialized, mode=mode)
            
            return self.get(entity["PartitionKey"], entity["RowKey"])
        except ResourceNotFoundError:
            return create_error_response("Entidade não encontrada")
        except Exception as e:
            return create_error_response(f"Erro ao atualizar entidade: {str(e)}")
    
    def delete(self, partition_key: str, row_key: str) -> Dict[str, Any]:
        try:
            self.client.delete_entity(partition_key, row_key)
            return create_response("success", {"deleted": True})
        except ResourceNotFoundError:
            return create_error_response("Entidade não encontrada")
        except Exception as e:
            return create_error_response(f"Erro ao deletar entidade: {str(e)}")
    
    def query(
        self,
        filter_query: str,
        select: Optional[List[str]] = None,
        max_results: int = 1000
    ) -> Dict[str, Any]:
        try:
            entities = self.client.query_entities(
                query_filter=filter_query,
                select=select,
                results_per_page=max_results
            )
            results = [deserialize_entity(e) for e in entities]
            return create_response("success", results)
        except Exception as e:
            return create_error_response(f"Erro ao consultar entidades: {str(e)}")
    
    def list_all(
        self,
        partition_key: Optional[str] = None,
        max_results: int = 1000
    ) -> Dict[str, Any]:
        try:
            if partition_key:
                filter_query = f"PartitionKey eq '{partition_key}'"
                return self.query(filter_query, max_results=max_results)
            
            entities = self.client.list_entities(results_per_page=max_results)
            results = [deserialize_entity(e) for e in entities]
            return create_response("success", results)
        except Exception as e:
            return create_error_response(f"Erro ao listar entidades: {str(e)}")
```

**Notas:**
- Todos os métodos retornam `{"status": "success"|"error", ...}` (padrão helpers.py)
- `mode="merge"` atualiza apenas campos fornecidos, `mode="replace"` substitui entidade completa
- Paginação implementada via `results_per_page` (continuation tokens podem ser adicionados em etapa futura)
- Sem levantamento de exceções — todas são capturadas e retornadas como erro estruturado

### 5. Criar repositórios de domínio

Criar um arquivo por entidade em `backend/app/repositories/`. Exemplo para `cliente_repository.py`:

```python
from typing import Dict, Any, Optional
from uuid import uuid4

from app.repositories.base_repository import BaseRepository
from app.utils.config import CM_TABLE_CLIENTE, CM_TENANT_ID_DEFAULT
from app.utils.table_helpers import build_partition_key, generate_row_key
from app.utils.helpers import create_response, create_error_response

class ClienteRepository(BaseRepository):
    def __init__(self):
        super().__init__(CM_TABLE_CLIENTE)
    
    def create_cliente(
        self,
        nome: str,
        telefone: str,
        email: str,
        senha: Optional[str] = None,
        data_cadastro: Optional[str] = None,
        tenant_id: str = CM_TENANT_ID_DEFAULT,
        user_email: Optional[str] = None
    ) -> Dict[str, Any]:
        from app.utils.helpers import get_current_timestamp
        
        email_normalized = email.lower().strip()
        existing = self.get_by_email(email_normalized, tenant_id)
        if existing.get("status") == "success" and existing.get("data"):
            return create_error_response("Email já cadastrado")
        
        cliente_id = generate_row_key()
        partition_key = build_partition_key(tenant_id, "CLIENTE")
        
        entity = {
            "PartitionKey": partition_key,
            "RowKey": cliente_id,
            "nome": nome,
            "telefone": telefone,
            "email": email_normalized,
            "dataCadastro": data_cadastro or get_current_timestamp()
        }
        
        if senha:
            entity["senha"] = senha
        
        return self.create(entity, user_email)
    
    def get_by_email(self, email: str, tenant_id: str = CM_TENANT_ID_DEFAULT) -> Dict[str, Any]:
        email_normalized = email.lower().strip()
        partition_key = build_partition_key(tenant_id, "CLIENTE")
        filter_query = f"PartitionKey eq '{partition_key}' and email eq '{email_normalized}'"
        
        result = self.query(filter_query, max_results=1)
        if result.get("status") == "error":
            return result
        
        data = result.get("data", [])
        if not data:
            return create_error_response("Cliente não encontrado")
        
        return create_response("success", data[0])
    
    def get_by_id(self, cliente_id: str, tenant_id: str = CM_TENANT_ID_DEFAULT) -> Dict[str, Any]:
        partition_key = build_partition_key(tenant_id, "CLIENTE")
        return self.get(partition_key, cliente_id)
    
    def list_all_clientes(self, tenant_id: str = CM_TENANT_ID_DEFAULT) -> Dict[str, Any]:
        partition_key = build_partition_key(tenant_id, "CLIENTE")
        return self.list_all(partition_key)
```

**Criar arquivos similares para todas as entidades:**

- `orcamento_repository.py` — métodos: `create_orcamento()`, `get_by_id()`, `list_by_cliente()`, `update_status()`
- `orcamento_engenheiro_repository.py` — métodos: `create_orcamento_eng()`, `get_by_orcamento_cliente_id()`, `update_etapa()`, `list_by_etapa()`
- `planta_repository.py` — métodos: `create_planta()`, `get_by_id()`, `list_all_plantas()`, `filter_by_quartos()`
- `opcional_repository.py` — métodos: `create_opcional()`, `get_by_id()`, `list_by_categoria()`
- `parametros_globais_repository.py` — métodos: `create_versao()`, `get_current()`, `get_by_versao()`, `set_active()`
- `grupos_encargos_repository.py` — métodos: `create_versao()`, `get_current()`, `get_by_versao()`
- `composicao_profissional_repository.py` — métodos: `create_composicao()`, `get_by_id()`, `list_by_categoria()`, `get_by_ref_sinapi()`
- `insumo_sinapi_repository.py` — métodos: `create_insumo()`, `get_by_codigo()`, `list_by_classificacao()`, `list_by_sinapi_ref()`
- `composicao_analitica_repository.py` — métodos: `create_composicao()`, `get_by_codigo()`, `list_by_grupo()`, `list_by_sinapi_ref()`
- `auditoria_repository.py` — métodos: `create_evento()`, `list_by_mes()`, `list_by_usuario()`, `list_by_modulo()`
- `usuario_repository.py` — métodos: `create_usuario()`, `get_by_email()`, `get_by_azure_ad_id()`, `update_ultimo_login()`

**Padrão para todos os repositórios:**
- Herdar de `BaseRepository`
- Métodos específicos de domínio (ex: `get_by_email`, `list_by_categoria`)
- Validações de negócio (ex: email único, versão ativa)
- Sempre retornar `{"status": "success"|"error", ...}`

### 6. Criar arquivo `backend/app/repositories/__init__.py`

```python
from app.repositories.cliente_repository import ClienteRepository
from app.repositories.orcamento_repository import OrcamentoRepository
from app.repositories.orcamento_engenheiro_repository import OrcamentoEngenheiroRepository
from app.repositories.planta_repository import PlantaRepository
from app.repositories.opcional_repository import OpcionalRepository
from app.repositories.parametros_globais_repository import ParametrosGlobaisRepository
from app.repositories.grupos_encargos_repository import GruposEncargosRepository
from app.repositories.composicao_profissional_repository import ComposicaoProfissionalRepository
from app.repositories.insumo_sinapi_repository import InsumoSINAPIRepository
from app.repositories.composicao_analitica_repository import ComposicaoAnaliticaRepository
from app.repositories.auditoria_repository import AuditoriaRepository
from app.repositories.usuario_repository import UsuarioRepository

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

### 7. Criar script de inicialização de tabelas em `backend/scripts/init_tables.py`

Criar diretório `backend/scripts/` e arquivo:

```python
from app.utils.table_client import create_table_if_not_exists
from app.utils.config import (
    CM_TABLE_CLIENTE,
    CM_TABLE_ORCAMENTO,
    CM_TABLE_ORCAMENTO_ENGENHEIRO,
    CM_TABLE_PLANTA,
    CM_TABLE_OPCIONAL,
    CM_TABLE_PARAMETROS_GLOBAIS,
    CM_TABLE_GRUPOS_ENCARGOS,
    CM_TABLE_COMPOSICAO_PROFISSIONAL,
    CM_TABLE_INSUMO_SINAPI,
    CM_TABLE_COMPOSICAO_ANALITICA,
    CM_TABLE_AUDITORIA,
    CM_TABLE_USUARIO,
)

def init_all_tables():
    tables = [
        CM_TABLE_CLIENTE,
        CM_TABLE_ORCAMENTO,
        CM_TABLE_ORCAMENTO_ENGENHEIRO,
        CM_TABLE_PLANTA,
        CM_TABLE_OPCIONAL,
        CM_TABLE_PARAMETROS_GLOBAIS,
        CM_TABLE_GRUPOS_ENCARGOS,
        CM_TABLE_COMPOSICAO_PROFISSIONAL,
        CM_TABLE_INSUMO_SINAPI,
        CM_TABLE_COMPOSICAO_ANALITICA,
        CM_TABLE_AUDITORIA,
        CM_TABLE_USUARIO,
    ]
    
    print("Inicializando tabelas no Azure Table Storage...")
    for table_name in tables:
        try:
            created = create_table_if_not_exists(table_name)
            status = "criada" if created else "já existe"
            print(f"  ✓ {table_name}: {status}")
        except Exception as e:
            print(f"  ✗ {table_name}: erro - {str(e)}")
    
    print("Inicialização concluída.")

if __name__ == "__main__":
    init_all_tables()
```

**Executar via:**
```bash
python -m backend.scripts.init_tables
```

### 8. Criar arquivo `backend/scripts/__init__.py`

Criar arquivo vazio para tornar `scripts/` um pacote Python.

### 9. Atualizar `.env.example` com configuração Azurite

Adicionar ao final do arquivo:

```
CM_STORAGE_ACCOUNT_NAME=devstoreaccount1
CM_STORAGE_ACCOUNT_URL=http://127.0.0.1:10002/devstoreaccount1
CM_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;TableEndpoint=http://127.0.0.1:10002/devstoreaccount1;
```

**Notas:**
- `devstoreaccount1` e a AccountKey são valores padrão do Azurite
- Para instalar Azurite localmente: `npm install -g azurite`
- Para iniciar Azurite: `azurite --silent --location ~/azurite --debug ~/azurite/debug.log`

### 10. Adicionar dependências de testes em `backend/requirements.txt`

Adicionar ao final do arquivo:

```
pytest==8.3.4
pytest-asyncio==0.25.2
```

### 11. Criar testes de integração em `backend/tests/conftest.py`

Criar diretório `backend/tests/integration/` e arquivo de configuração:

```python
import pytest
import os

@pytest.fixture(scope="session", autouse=True)
def setup_test_env():
    os.environ["CM_STORAGE_ACCOUNT_NAME"] = "devstoreaccount1"
    os.environ["CM_STORAGE_ACCOUNT_URL"] = "http://127.0.0.1:10002/devstoreaccount1"
    os.environ["CM_STORAGE_CONNECTION_STRING"] = (
        "DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;"
        "AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;"
        "TableEndpoint=http://127.0.0.1:10002/devstoreaccount1;"
    )
    yield
```

### 12. Criar testes de integração em `backend/tests/integration/test_table_client.py`

```python
from app.utils.table_client import get_table_service_client, create_table_if_not_exists

def test_table_service_client_connection():
    client = get_table_service_client()
    assert client is not None

def test_create_table():
    table_name = "TestTable"
    result = create_table_if_not_exists(table_name)
    assert result is not None
```

### 13. Criar testes de integração em `backend/tests/integration/test_repositories.py`

```python
import pytest
from app.repositories import ClienteRepository
from app.utils.table_client import create_table_if_not_exists
from app.utils.config import CM_TABLE_CLIENTE

@pytest.fixture(scope="module", autouse=True)
def setup_tables():
    create_table_if_not_exists(CM_TABLE_CLIENTE)
    yield

def test_create_cliente():
    repo = ClienteRepository()
    result = repo.create_cliente(
        nome="Test User",
        telefone="+5511999999999",
        email="test@example.com"
    )
    assert result["status"] == "success"
    assert result["data"]["nome"] == "Test User"

def test_get_cliente_by_email():
    repo = ClienteRepository()
    result = repo.get_by_email("test@example.com")
    assert result["status"] == "success"
    assert result["data"]["email"] == "test@example.com"

def test_duplicate_email():
    repo = ClienteRepository()
    result = repo.create_cliente(
        nome="Duplicate User",
        telefone="+5511888888888",
        email="test@example.com"
    )
    assert result["status"] == "error"
    assert "já cadastrado" in result["error"]
```

**Criar testes similares para todos os repositórios.**

### 14. Criar arquivo `backend/tests/__init__.py`

Criar arquivo vazio para tornar `tests/` um pacote Python.

### 15. Documentar setup de desenvolvimento local em `README.md`

Adicionar seção após a documentação da etapa 01:

```markdown
## Desenvolvimento Local — Azure Table Storage

### 1. Instalar Azurite

```bash
npm install -g azurite
```

### 2. Iniciar Azurite

```bash
azurite --silent --location ~/azurite --debug ~/azurite/debug.log
```

Azurite estará disponível em:
- Blob Service: `http://127.0.0.1:10000`
- Queue Service: `http://127.0.0.1:10001`
- Table Service: `http://127.0.0.1:10002`

### 3. Configurar variáveis de ambiente

Copiar `.env.example` para `.env` e ajustar variáveis para Azurite (já configuradas por padrão).

### 4. Inicializar tabelas

```bash
cd backend
python -m backend.scripts.init_tables
```

### 5. Executar testes de integração

```bash
cd backend
pytest tests/integration/ -v
```

## Produção — Azure Table Storage

Em produção, o backend usa **Managed Identity** para autenticar no Storage Account. Nenhuma connection string é armazenada.

Variáveis de ambiente em produção (configuradas via `deploy.sh`):
- `CM_STORAGE_ACCOUNT_NAME=construtobtstorage`
- `CM_STORAGE_ACCOUNT_URL=https://construtobtstorage.table.core.windows.net`
- `CM_STORAGE_CONNECTION_STRING=` (vazio — usa Managed Identity)
```

## Restrições

- Sem comentários no código
- Sem emojis
- Escrever em português brasileiro com acentuação correta
- Todos os métodos de repositório retornam `{"status": "success"|"error", ...}` (padrão de `helpers.py`)
- Sem levantamento de exceções em repositórios — todas capturadas e retornadas como erro estruturado
- Variáveis de ambiente apenas em `backend/app/utils/config.py`, padrão `CM_[DOMINIO]_[NOME]`
- Não criar endpoints HTTP nesta etapa (será feito na etapa 05)
- Não adicionar autenticação/autorização nesta etapa (será feito na etapa 04)
- Não adicionar testes unitários (apenas testes de integração com Azurite)

## Verificação

Para confirmar que a etapa está concluída:

1. **Arquivos criados:**
   ```bash
   ls -1 backend/app/utils/table_client.py backend/app/utils/table_helpers.py
   ls -1 backend/app/repositories/*.py | wc -l  # deve retornar 13 (base + 12 domínio)
   ls -1 backend/scripts/init_tables.py
   ```

2. **Constantes adicionadas:**
   ```bash
   grep -c "CM_TABLE_" backend/app/utils/config.py  # deve retornar >= 12
   ```

3. **Azurite rodando:**
   ```bash
   curl http://127.0.0.1:10002/devstoreaccount1 2>&1 | grep -q "XML" && echo "OK" || echo "FALHOU"
   ```

4. **Tabelas criadas:**
   ```bash
   cd backend && python -m backend.scripts.init_tables
   ```
   Deve mostrar `✓ Cliente: criada` (ou `já existe`) para todas as 12 tabelas.

5. **Testes de integração passando:**
   ```bash
   cd backend && pytest tests/integration/ -v
   ```
   Todos os testes devem passar (status `PASSED`).

6. **Sem erros de sintaxe:**
   ```bash
   python -m py_compile backend/app/repositories/*.py
   ```
   Não deve retornar erros.

7. **Importações funcionando:**
   ```bash
   cd backend && python -c "from app.repositories import ClienteRepository; print('OK')"
   ```
   Deve imprimir `OK`.

8. **Pronto para etapa 04 e 05:**
   - Etapa 04 implementará autenticação Azure AD (middleware de validação JWT)
   - Etapa 05 criará endpoints REST consumindo os repositórios desta etapa
