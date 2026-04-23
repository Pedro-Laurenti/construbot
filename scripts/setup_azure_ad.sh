#!/bin/bash
set -e

RESOURCE_GROUP="construbot-rg"
APP_NAME="construbot-app"
FRONTEND_URL_LOCAL="http://localhost:3000"
FRONTEND_URL_PROD="https://construbot-frontend.azurewebsites.net"
BACKEND_URL_PROD="https://construbot-api.azurewebsites.net"

echo "Registrando aplicativo no Azure AD..."

APP_ID=$(az ad app create \
  --display-name "$APP_NAME" \
  --sign-in-audience AzureADMyOrg \
  --web-redirect-uris "$FRONTEND_URL_LOCAL" "$FRONTEND_URL_PROD" \
  --enable-id-token-issuance true \
  --query appId -o tsv)

echo "App registrado com ID: $APP_ID"

TENANT_ID=$(az account show --query tenantId -o tsv)

echo "Criando App Roles..."

cat > /tmp/app_roles.json <<EOF
[
  {
    "allowedMemberTypes": ["User"],
    "description": "Cliente — acesso a orçamentos próprios",
    "displayName": "Cliente",
    "id": "$(uuidgen)",
    "isEnabled": true,
    "value": "cliente"
  },
  {
    "allowedMemberTypes": ["User"],
    "description": "Engenheiro — acesso a dashboard de engenharia",
    "displayName": "Engenheiro",
    "id": "$(uuidgen)",
    "isEnabled": true,
    "value": "engenheiro"
  },
  {
    "allowedMemberTypes": ["User"],
    "description": "Administrador — acesso total",
    "displayName": "Admin",
    "id": "$(uuidgen)",
    "isEnabled": true,
    "value": "admin"
  }
]
EOF

az ad app update --id "$APP_ID" --app-roles @/tmp/app_roles.json

echo "Expondo API scope..."

SCOPE_ID=$(uuidgen)
az ad app update --id "$APP_ID" \
  --identifier-uris "api://$APP_ID" \
  --oauth2-permissions "[{\"adminConsentDescription\":\"Access ConstruBot API\",\"adminConsentDisplayName\":\"Access API\",\"id\":\"$SCOPE_ID\",\"isEnabled\":true,\"type\":\"User\",\"value\":\"access_as_user\"}]"

echo "=========================================="
echo "Configuração concluída!"
echo "=========================================="
echo ""
echo "Adicione as seguintes variáveis ao backend/.env:"
echo "CM_AZURE_AD_TENANT_ID=$TENANT_ID"
echo "CM_AZURE_AD_CLIENT_ID=$APP_ID"
echo "CM_AZURE_AD_AUDIENCE=api://$APP_ID"
echo ""
echo "Adicione as seguintes variáveis ao frontend/.env.local:"
echo "NEXT_PUBLIC_AZURE_AD_CLIENT_ID=$APP_ID"
echo "NEXT_PUBLIC_AZURE_AD_TENANT_ID=$TENANT_ID"
echo "NEXT_PUBLIC_AZURE_AD_REDIRECT_URI=$FRONTEND_URL_LOCAL"
echo ""
echo "Para atribuir role a um usuário:"
echo "az ad app permission admin-consent --id $APP_ID"
echo "az ad user show --id <email_usuario>"
echo "az ad user member add --group <role_group_id> --member-id <user_object_id>"
echo "=========================================="

rm /tmp/app_roles.json
