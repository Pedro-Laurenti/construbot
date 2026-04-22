---
mode: agent
---
# Infraestrutura Azure — Storage Account + Tables + Managed Identity

## Contexto

O projeto ConstruBot possui atualmente:
- **Backend**: FastAPI hospedado em Azure App Service via `deploy.sh`, sem autenticação, sem persistência real
- **Frontend**: Next.js hospedado em Azure App Service via `deploy.sh`
- **Dados**: protótipo usa `localStorage` (`frontend/lib/storage.ts`) e mocks (`frontend/lib/mockData.ts`)
- **Infraestrutura atual**: `deploy.sh` provisiona Resource Group, Azure Container Registry, App Service Plan B1, dois Web Apps (backend + frontend) com imagens Docker

Este prompt é a **primeira etapa do caminho para produção** (alfa). Ao final, o Storage Account estará provisionado e configurado, mas **não será consumido ainda** pelo código. Etapas posteriores (02-schemas, 03-persistencia) implementarão a camada de dados que usará esta infraestrutura.

## Pré-requisitos

Nenhum. Esta é a etapa alfa-01, base de todas as demais.

## Entregáveis

Ao final desta etapa, devem existir:

1. **Storage Account** criado no mesmo Resource Group (`construbot-rg`)
2. **Table Service** habilitado no Storage Account
3. **Managed Identity system-assigned** no Web App do backend (`construbot-api`)
4. **Role assignment** `Storage Table Data Contributor` vinculando a Managed Identity ao Storage Account
5. **Variáveis de ambiente** no backend expostas via App Service Application Settings:
   - `CM_STORAGE_ACCOUNT_NAME` — nome do Storage Account
   - `CM_STORAGE_ACCOUNT_URL` — URL completa do Table Service endpoint
   - `CM_STORAGE_CONNECTION_STRING` — fallback para desenvolvimento local (vazio em produção)
6. **Seção nova em `deploy.sh`** provisionando Storage Account + Tables + Managed Identity + RBAC de forma idempotente
7. **Key Vault** (opcional nesta etapa, pode ficar para etapa 04 ou integração futura) — se criado agora, armazenar a connection string como secret

## Implementação

### 1. Adicionar variáveis de configuração em `backend/app/utils/config.py`

Adicionar ao final do arquivo `backend/app/utils/config.py`:

```python
CM_STORAGE_ACCOUNT_NAME = os.getenv("CM_STORAGE_ACCOUNT_NAME", "")
CM_STORAGE_ACCOUNT_URL = os.getenv("CM_STORAGE_ACCOUNT_URL", "")
CM_STORAGE_CONNECTION_STRING = os.getenv("CM_STORAGE_CONNECTION_STRING", "")
```

Essas variáveis serão populadas pelo `deploy.sh` (produção) ou por `.env` local (dev).

### 2. Atualizar `deploy.sh` — provisionar Storage Account

Adicionar nova seção após a criação do Resource Group e antes do Container Registry:

```bash
# ── 2. Storage Account ──────────────────────────────────────────
STORAGE_ACCOUNT="construtobtstorage"  # nome globalmente único, até 24 chars, apenas alfanuméricos minúsculos

log "Garantindo Storage Account '$STORAGE_ACCOUNT' com Tables..."
az storage account create \
  --name "$STORAGE_ACCOUNT" \
  --resource-group "$RG" \
  --location "$LOCATION" \
  --sku Standard_LRS \
  --kind StorageV2 \
  --min-tls-version TLS1_2 \
  --allow-blob-public-access false \
  --output none 2>/dev/null || true

STORAGE_URL="https://${STORAGE_ACCOUNT}.table.core.windows.net"
ok "Storage Account pronto: $STORAGE_URL"
```

**Notas:**
- `Standard_LRS` (Locally Redundant Storage) — o mais barato, adequado para dev/staging; produção pode usar `Standard_GRS` (Geo-Redundant)
- `--min-tls-version TLS1_2` — segurança obrigatória
- `--allow-blob-public-access false` — segurança obrigatória (mesmo sem Blob Storage nesta etapa)
- Nome do Storage Account deve ser **globalmente único** na Azure; ajustar `construtobtstorage` se houver conflito

### 3. Atualizar `deploy.sh` — habilitar Managed Identity no backend

Adicionar após a criação do backend Web App (seção 6 do `deploy.sh` atual), mas antes do `ok` final:

```bash
log "Habilitando Managed Identity (system-assigned) no backend..."
az webapp identity assign \
  --name "$BACKEND_APP" \
  --resource-group "$RG" \
  --output none

PRINCIPAL_ID=$(az webapp identity show \
  --name "$BACKEND_APP" \
  --resource-group "$RG" \
  --query principalId -o tsv)

ok "Managed Identity habilitada: $PRINCIPAL_ID"
```

### 4. Atualizar `deploy.sh` — atribuir role RBAC ao Storage Account

Adicionar logo após a obtenção do `PRINCIPAL_ID`:

```bash
log "Atribuindo role 'Storage Table Data Contributor' ao backend..."
STORAGE_SCOPE=$(az storage account show \
  --name "$STORAGE_ACCOUNT" \
  --resource-group "$RG" \
  --query id -o tsv)

az role assignment create \
  --assignee "$PRINCIPAL_ID" \
  --role "Storage Table Data Contributor" \
  --scope "$STORAGE_SCOPE" \
  --output none 2>/dev/null || true   # ignora se já existe

ok "RBAC configurado: backend tem acesso às Tables."
```

**Nota:** `Storage Table Data Contributor` permite operações CRUD em Tables, mas não em Blobs nem Queues. Para etapas futuras (10-blob-storage, 11b-notificacoes), será necessário adicionar roles adicionais (`Storage Blob Data Contributor`, `Storage Queue Data Contributor`).

### 5. Atualizar `deploy.sh` — configurar variáveis de ambiente no backend

Adicionar após a configuração de RBAC:

```bash
log "Configurando variáveis de ambiente no backend..."
az webapp config appsettings set \
  --name "$BACKEND_APP" \
  --resource-group "$RG" \
  --settings \
    CM_STORAGE_ACCOUNT_NAME="$STORAGE_ACCOUNT" \
    CM_STORAGE_ACCOUNT_URL="$STORAGE_URL" \
    CM_STORAGE_CONNECTION_STRING="" \
  --output none

ok "Variáveis de Storage configuradas no App Service."
```

**Nota:** `CM_STORAGE_CONNECTION_STRING` fica vazio em produção. A autenticação será via Managed Identity (`DefaultAzureCredential` na etapa 03).

### 6. Criar `.env.example` no backend para desenvolvimento local

Criar o arquivo `backend/.env.example`:

```bash
# Azure Storage Account (local usa connection string; produção usa Managed Identity)
CM_STORAGE_ACCOUNT_NAME=construtobtstorage
CM_STORAGE_ACCOUNT_URL=https://construtobtstorage.table.core.windows.net
CM_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=construtobtstorage;AccountKey=...;EndpointSuffix=core.windows.net

# CORS
CM_APP_CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

Instruir desenvolvedores a copiarem `.env.example` para `.env` e preencherem a connection string obtida via:

```bash
az storage account show-connection-string \
  --name construtobtstorage \
  --resource-group construbot-rg \
  --output tsv
```

### 7. Atualizar `backend/requirements.txt`

Adicionar dependências do Azure SDK:

```txt
fastapi==0.115.12
uvicorn[standard]==0.34.0
python-dotenv==1.0.1
azure-data-tables==12.5.0
azure-identity==1.19.0
```

**Notas:**
- `azure-data-tables` — cliente para Azure Table Storage
- `azure-identity` — `DefaultAzureCredential` para autenticação via Managed Identity em produção e fallback para variáveis de ambiente em dev

### 8. Criar utilitário de teste de conectividade (opcional, mas recomendado)

Criar `backend/app/routers/storage_health.py`:

```python
from fastapi import APIRouter

from app.utils.config import CM_STORAGE_ACCOUNT_NAME, CM_STORAGE_ACCOUNT_URL
from app.utils.helpers import create_response, create_error_response

router = APIRouter()

@router.get("/storage-health")
async def storage_health():
    if not CM_STORAGE_ACCOUNT_NAME or not CM_STORAGE_ACCOUNT_URL:
        return create_error_response("Storage Account não configurado")
    return create_response("success", {
        "account_name": CM_STORAGE_ACCOUNT_NAME,
        "account_url": CM_STORAGE_ACCOUNT_URL,
        "connection_mode": "managed_identity" if not CM_STORAGE_CONNECTION_STRING else "connection_string"
    })
```

Registrar em `backend/app/main.py`:

```python
from app.routers import health, calculos, localidades, storage_health

app.include_router(storage_health.router, prefix="/api", tags=["Health"])
```

### 9. Atualizar README.md (documentação de infra)

Adicionar seção no `README.md` raiz:

```markdown
## Infraestrutura Azure

### Storage Account

- **Nome**: `construtobtstorage` (ajustar se houver conflito)
- **Tipo**: StorageV2, Standard_LRS
- **Serviços habilitados**: Tables (etapa alfa-01), Blobs e Queues (etapas futuras)
- **Autenticação**: Managed Identity em produção, connection string em dev local

### Desenvolvimento Local

1. Obter connection string:
   ```bash
   az storage account show-connection-string \
     --name construtobtstorage \
     --resource-group construbot-rg \
     --output tsv
   ```

2. Criar `backend/.env` com a connection string obtida (ver `.env.example`)

3. Rodar backend:
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn app.main:app --reload --port 8000
   ```

4. Verificar conectividade:
   ```bash
   curl http://localhost:8000/api/storage-health
   ```

### Produção

Deploy via `./deploy.sh` configura automaticamente:
- Storage Account
- Managed Identity no backend
- RBAC (Storage Table Data Contributor)
- Variáveis de ambiente

Verificar após deploy:
```bash
curl https://construbot-api.azurewebsites.net/api/storage-health
```
```

### 10. (Opcional) Provisionar Key Vault para secrets

Se optar por criar o Key Vault agora (pode ser movido para etapa 04):

Adicionar ao `deploy.sh` após a criação do Storage Account:

```bash
# ── Key Vault (opcional) ────────────────────────────────────────
VAULT_NAME="construbot-vault"  # nome globalmente único

log "Garantindo Key Vault '$VAULT_NAME'..."
az keyvault create \
  --name "$VAULT_NAME" \
  --resource-group "$RG" \
  --location "$LOCATION" \
  --enable-rbac-authorization true \
  --output none 2>/dev/null || true

STORAGE_CONN_STRING=$(az storage account show-connection-string \
  --name "$STORAGE_ACCOUNT" \
  --resource-group "$RG" \
  --query connectionString -o tsv)

az keyvault secret set \
  --vault-name "$VAULT_NAME" \
  --name "storage-connection-string" \
  --value "$STORAGE_CONN_STRING" \
  --output none 2>/dev/null || true

ok "Key Vault pronto: $VAULT_NAME"
```

Atribuir role `Key Vault Secrets User` à Managed Identity:

```bash
VAULT_SCOPE=$(az keyvault show \
  --name "$VAULT_NAME" \
  --resource-group "$RG" \
  --query id -o tsv)

az role assignment create \
  --assignee "$PRINCIPAL_ID" \
  --role "Key Vault Secrets User" \
  --scope "$VAULT_SCOPE" \
  --output none 2>/dev/null || true
```

## Restrições

- Sem comentários no código
- Sem emojis
- Variáveis de ambiente apenas em `backend/app/utils/config.py`, padrão `CM_[DOMINIO]_[NOME]`
- Nomes de recursos Azure devem ser **globalmente únicos** — ajustar `construtobtstorage` se houver conflito de nome
- Não usar `os.getenv()` fora de `utils/config.py`
- Não usar `dev_mode`
- Todas as mensagens e documentação em português brasileiro com acentuação correta
- Scripts shell devem usar `set -euo pipefail` e logging estruturado (`log`, `ok`, `fail`)

## Verificação

Após executar `./deploy.sh`, confirmar:

### 1. Storage Account criado

```bash
az storage account show \
  --name construtobtstorage \
  --resource-group construbot-rg \
  --query "{Name:name, Location:location, Sku:sku.name, Kind:kind}" \
  --output table
```

Saída esperada:
```
Name                  Location    Sku           Kind
--------------------  ----------  ------------  ----------
construtobtstorage   eastus      Standard_LRS  StorageV2
```

### 2. Managed Identity habilitada no backend

```bash
az webapp identity show \
  --name construbot-api \
  --resource-group construbot-rg \
  --query "{Type:type, PrincipalId:principalId}" \
  --output table
```

Saída esperada:
```
Type           PrincipalId
-------------  ------------------------------------
SystemAssigned  <guid>
```

### 3. Role assignment configurado

```bash
az role assignment list \
  --assignee $(az webapp identity show --name construbot-api --resource-group construbot-rg --query principalId -o tsv) \
  --scope $(az storage account show --name construtobtstorage --resource-group construbot-rg --query id -o tsv) \
  --query "[].{Role:roleDefinitionName, Scope:scope}" \
  --output table
```

Saída esperada:
```
Role                              Scope
--------------------------------  -------------------------------------------------------
Storage Table Data Contributor    /subscriptions/.../resourceGroups/construbot-rg/providers/Microsoft.Storage/storageAccounts/construtobtstorage
```

### 4. Variáveis de ambiente configuradas no backend

```bash
az webapp config appsettings list \
  --name construbot-api \
  --resource-group construbot-rg \
  --query "[?starts_with(name, 'CM_STORAGE')].{Name:name, Value:value}" \
  --output table
```

Saída esperada:
```
Name                             Value
-------------------------------  -------------------------------------------------
CM_STORAGE_ACCOUNT_NAME          construtobtstorage
CM_STORAGE_ACCOUNT_URL           https://construtobtstorage.table.core.windows.net
CM_STORAGE_CONNECTION_STRING     
```

### 5. Endpoint de health respondendo

Após deploy do backend com a alteração em `storage_health.py`:

```bash
curl https://construbot-api.azurewebsites.net/api/storage-health
```

Saída esperada:
```json
{
  "status": "success",
  "data": {
    "account_name": "construtobtstorage",
    "account_url": "https://construtobtstorage.table.core.windows.net",
    "connection_mode": "managed_identity"
  }
}
```

Se alguma verificação falhar, revisar os comandos do `deploy.sh` e garantir que foram executados na ordem correta.
