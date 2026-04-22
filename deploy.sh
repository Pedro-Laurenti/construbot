#!/usr/bin/env bash
set -euo pipefail

# ── Configuração ────────────────────────────────────────────────
RG="construbot-rg"
LOCATION="eastus"
ACR="construbotacr"
PLAN="construbot-plan"
BACKEND_APP="construbot-api"
FRONTEND_APP="construbot-frontend"

BACKEND_URL="https://${BACKEND_APP}.azurewebsites.net"

# ── Helpers ─────────────────────────────────────────────────────
log()  { echo -e "\n\033[1;34m[deploy]\033[0m $*"; }
ok()   { echo -e "\033[1;32m[ok]\033[0m $*"; }
fail() { echo -e "\033[1;31m[erro]\033[0m $*" >&2; exit 1; }

# ── Pré-requisitos ──────────────────────────────────────────────
command -v az >/dev/null 2>&1 || fail "Azure CLI não encontrado. Instale: https://aka.ms/installazureclilinux"
az account show >/dev/null 2>&1 || fail "Não autenticado. Execute: az login"

# ── 1. Resource Group ───────────────────────────────────────────
log "Garantindo resource group '$RG' em '$LOCATION'..."
az group create --name "$RG" --location "$LOCATION" --output none
ok "Resource group pronto."

# ── 2. Storage Account ──────────────────────────────────────────
STORAGE_ACCOUNT="construtobtstorage"

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

# ── 3. Container Registry ────────────────────────────────────────
log "Garantindo Container Registry '$ACR'..."
az acr create \
  --name "$ACR" \
  --resource-group "$RG" \
  --sku Basic \
  --admin-enabled true \
  --location "$LOCATION" \
  --output none 2>/dev/null || true   # ignora se já existe

ACR_SERVER=$(az acr show --name "$ACR" --query loginServer -o tsv)
ACR_USER=$(az acr credential show --name "$ACR" --query username -o tsv)
ACR_PASS=$(az acr credential show --name "$ACR" --query "passwords[0].value" -o tsv)
ok "Registry: $ACR_SERVER"

# ── 4. Build e push: backend ────────────────────────────────────
log "Build do backend (Python/FastAPI)..."
az acr build \
  --registry "$ACR" \
  --image "construbot-backend:latest" \
  ./backend
ok "Backend image publicada."

# ── 5. Build e push: frontend ───────────────────────────────────
log "Build do frontend (Next.js) com BACKEND_URL=$BACKEND_URL ..."
az acr build \
  --registry "$ACR" \
  --image "construbot-frontend:latest" \
  --build-arg "BACKEND_URL=$BACKEND_URL" \
  ./frontend
ok "Frontend image publicada."

# ── 6. App Service Plan ──────────────────────────────────────────
log "Garantindo App Service Plan '$PLAN' (B1, Linux)..."
az appservice plan create \
  --name "$PLAN" \
  --resource-group "$RG" \
  --is-linux \
  --sku B1 \
  --location "$LOCATION" \
  --output none 2>/dev/null || true
ok "Plan pronto."

# ── 7. Backend Web App ───────────────────────────────────────────
log "Criando/atualizando backend web app '$BACKEND_APP'..."
if az webapp show --name "$BACKEND_APP" --resource-group "$RG" &>/dev/null; then
  # App já existe: atualiza apenas a imagem do container
  az webapp config container set \
    --name "$BACKEND_APP" \
    --resource-group "$RG" \
    --container-image-name "${ACR_SERVER}/construbot-backend:latest" \
    --container-registry-url "https://${ACR_SERVER}" \
    --container-registry-user "$ACR_USER" \
    --container-registry-password "$ACR_PASS" \
    --output none
else
  az webapp create \
    --name "$BACKEND_APP" \
    --resource-group "$RG" \
    --plan "$PLAN" \
    --container-image-name "${ACR_SERVER}/construbot-backend:latest" \
    --container-registry-url "https://${ACR_SERVER}" \
    --container-registry-user "$ACR_USER" \
    --container-registry-password "$ACR_PASS" \
    --output none

  az webapp config appsettings set \
    --name "$BACKEND_APP" \
    --resource-group "$RG" \
    --settings WEBSITES_PORT=8000 \
    --output none
fi

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

log "Atribuindo role 'Storage Table Data Contributor' ao backend..."
STORAGE_SCOPE=$(az storage account show \
  --name "$STORAGE_ACCOUNT" \
  --resource-group "$RG" \
  --query id -o tsv)

az role assignment create \
  --assignee "$PRINCIPAL_ID" \
  --role "Storage Table Data Contributor" \
  --scope "$STORAGE_SCOPE" \
  --output none 2>/dev/null || true

ok "RBAC configurado: backend tem acesso às Tables."

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
ok "Backend app pronto: https://${BACKEND_APP}.azurewebsites.net"

# ── 8. Frontend Web App ──────────────────────────────────────────
log "Criando/atualizando frontend web app '$FRONTEND_APP'..."
if az webapp show --name "$FRONTEND_APP" --resource-group "$RG" &>/dev/null; then
  az webapp config container set \
    --name "$FRONTEND_APP" \
    --resource-group "$RG" \
    --container-image-name "${ACR_SERVER}/construbot-frontend:latest" \
    --container-registry-url "https://${ACR_SERVER}" \
    --container-registry-user "$ACR_USER" \
    --container-registry-password "$ACR_PASS" \
    --output none
else
  az webapp create \
    --name "$FRONTEND_APP" \
    --resource-group "$RG" \
    --plan "$PLAN" \
    --container-image-name "${ACR_SERVER}/construbot-frontend:latest" \
    --container-registry-url "https://${ACR_SERVER}" \
    --container-registry-user "$ACR_USER" \
    --container-registry-password "$ACR_PASS" \
    --output none

  az webapp config appsettings set \
    --name "$FRONTEND_APP" \
    --resource-group "$RG" \
    --settings WEBSITES_PORT=3000 \
    --output none
fi
ok "Frontend app pronto: https://${FRONTEND_APP}.azurewebsites.net"

# ── 9. Restart para aplicar nova imagem ──────────────────────────
log "Reiniciando apps para aplicar novas imagens..."
az webapp restart --name "$BACKEND_APP"  --resource-group "$RG" --output none
az webapp restart --name "$FRONTEND_APP" --resource-group "$RG" --output none

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Deploy concluído!"
echo " Backend:  https://${BACKEND_APP}.azurewebsites.net"
echo " Frontend: https://${FRONTEND_APP}.azurewebsites.net"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
