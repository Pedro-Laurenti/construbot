---
agent: agent
---
# Autenticação — Azure AD (Entra ID) + JWT

## Contexto

O projeto ConstruBot possui atualmente:
- **Etapa 01 concluída**: Storage Account provisionado, Managed Identity configurada
- **Etapa 02 concluída**: Schemas documentados incluindo tabela `Usuario`
- **Etapa 03 concluída**: Repositórios implementados, incluindo `UsuarioRepository` com métodos `create_usuario()`, `get_by_email()`, `get_by_azure_ad_id()`
- **Frontend atual**: autenticação fake com `SEED_CONTA_MOCK` (`maria@construbot.com`) e `GOOGLE_MOCK_USER` (`pedro.laurenti@gmail.com`), senha hardcoded `ENGINEER_PASSWORD = 'construbot2026'` para acesso engenheiro
- **Backend atual**: sem autenticação — `main.py` registra 4 routers (health, calculos, localidades, storage_health) sem proteção de acesso

**Arquivos que serão modificados:**
- `frontend/lib/storage.ts` — funções `findConta()`, `SEED_CONTA_MOCK` removidas
- `frontend/lib/mockData.ts` — `SEED_CONTA_MOCK`, `GOOGLE_MOCK_USER`, `ENGINEER_PASSWORD` removidos
- `frontend/components/OnboardingChatFlow.tsx` — fluxo de login fake substituído por MSAL
- `backend/app/main.py` — adicionar middleware de autenticação JWT
- `backend/requirements.txt` — adicionar dependências de autenticação

Esta etapa implementa **autenticação real via Azure AD (Entra ID)** com fluxo OAuth2 Authorization Code + PKCE, substituindo toda a lógica de autenticação fake.

## Pré-requisitos

- Etapa alfa-01 concluída (Storage Account provisionado)
- Etapa alfa-02 concluída (schemas documentados)
- Etapa alfa-03 concluída (repositórios implementados, incluindo `UsuarioRepository`)
- Conta Azure com permissões para registrar aplicativos no Entra ID
- Azure CLI instalado e autenticado (`az login`)

## Entregáveis

Ao final desta etapa, devem existir:

1. **App Registration no Azure AD**:
   - Aplicativo registrado no Entra ID com client ID e tenant ID
   - Redirect URIs configurados (localhost + produção)
   - Roles (engenheiro, cliente, admin) definidos como App Roles
   - API scope exposto para o backend

2. **Backend — autenticação JWT**:
   - Dependências: `python-jose[cryptography]`, `pyjwt[crypto]`, `cryptography`
   - Middleware FastAPI para validação de JWT em rotas protegidas
   - Utilitário `backend/app/utils/auth.py` com funções de validação de token
   - Decorator `@require_auth` para proteger endpoints
   - Decorator `@require_role(role: str)` para autorização por role
   - Integração com `UsuarioRepository` para criar/atualizar usuário no primeiro login

3. **Frontend — MSAL.js**:
   - Dependência: `@azure/msal-browser`
   - Provider `MSALProvider` em `frontend/app/layout.tsx`
   - Hook personalizado `frontend/lib/hooks/useAuth.ts` com `login()`, `logout()`, `getAccessToken()`
   - Remoção completa de `SEED_CONTA_MOCK`, `GOOGLE_MOCK_USER`, `ENGINEER_PASSWORD`
   - Substituição do fluxo de login fake em `OnboardingChatFlow.tsx` por botão "Entrar com Microsoft"
   - Token JWT incluído em todas as requisições HTTP via `Authorization: Bearer <token>`

4. **Variáveis de ambiente atualizadas**:
   - Backend: `CM_AZURE_AD_TENANT_ID`, `CM_AZURE_AD_CLIENT_ID`, `CM_AZURE_AD_AUDIENCE`
   - Frontend: `NEXT_PUBLIC_AZURE_AD_CLIENT_ID`, `NEXT_PUBLIC_AZURE_AD_TENANT_ID`, `NEXT_PUBLIC_AZURE_AD_REDIRECT_URI`

5. **Script de registro de app**:
   - `scripts/setup_azure_ad.sh` para automatizar o registro do app no Entra ID

6. **Documentação**:
   - README.md atualizado com instruções de configuração do Azure AD

## Implementação

### 1. Registrar aplicativo no Azure AD via script

Criar `scripts/setup_azure_ad.sh`:

```bash
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
```

Tornar executável e rodar:
```bash
chmod +x scripts/setup_azure_ad.sh
./scripts/setup_azure_ad.sh
```

### 2. Adicionar constantes de Azure AD em `backend/app/utils/config.py`

Adicionar ao final do arquivo (após as constantes de tabela):

```python
CM_AZURE_AD_TENANT_ID = os.getenv("CM_AZURE_AD_TENANT_ID", "")
CM_AZURE_AD_CLIENT_ID = os.getenv("CM_AZURE_AD_CLIENT_ID", "")
CM_AZURE_AD_AUDIENCE = os.getenv("CM_AZURE_AD_AUDIENCE", "")
CM_JWT_ALGORITHM = "RS256"
CM_JWT_ISSUER = f"https://login.microsoftonline.com/{CM_AZURE_AD_TENANT_ID}/v2.0"
```

### 3. Adicionar dependências de autenticação em `backend/requirements.txt`

Adicionar ao final do arquivo:

```
python-jose[cryptography]==3.3.0
pyjwt[crypto]==2.10.1
cryptography==45.0.0
requests==2.32.3
```

### 4. Criar utilitário de autenticação em `backend/app/utils/auth.py`

```python
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
import requests
from typing import Optional, Dict, Any
from functools import wraps

from app.utils.config import (
    CM_AZURE_AD_TENANT_ID,
    CM_AZURE_AD_CLIENT_ID,
    CM_AZURE_AD_AUDIENCE,
    CM_JWT_ALGORITHM,
    CM_JWT_ISSUER
)
from app.utils.helpers import raise_http_error
from app.repositories import UsuarioRepository

security = HTTPBearer()

_jwks_cache: Optional[Dict[str, Any]] = None

def get_jwks() -> Dict[str, Any]:
    global _jwks_cache
    if _jwks_cache is not None:
        return _jwks_cache
    
    jwks_url = f"https://login.microsoftonline.com/{CM_AZURE_AD_TENANT_ID}/discovery/v2.0/keys"
    response = requests.get(jwks_url, timeout=10)
    response.raise_for_status()
    _jwks_cache = response.json()
    return _jwks_cache

def validate_token(token: str) -> Dict[str, Any]:
    try:
        jwks = get_jwks()
        
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        
        rsa_key = None
        for key in jwks.get("keys", []):
            if key.get("kid") == kid:
                rsa_key = {
                    "kty": key["kty"],
                    "kid": key["kid"],
                    "use": key["use"],
                    "n": key["n"],
                    "e": key["e"]
                }
                break
        
        if not rsa_key:
            raise_http_error(401, "Token inválido: chave pública não encontrada")
        
        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=[CM_JWT_ALGORITHM],
            audience=CM_AZURE_AD_AUDIENCE,
            issuer=CM_JWT_ISSUER
        )
        
        return payload
    
    except JWTError as e:
        raise_http_error(401, f"Token inválido: {str(e)}")
    except Exception as e:
        raise_http_error(401, f"Erro ao validar token: {str(e)}")

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Dict[str, Any]:
    token = credentials.credentials
    payload = validate_token(token)
    
    user_email = payload.get("preferred_username") or payload.get("email")
    user_name = payload.get("name")
    azure_ad_id = payload.get("oid")
    roles = payload.get("roles", [])
    
    if not user_email or not azure_ad_id:
        raise_http_error(401, "Token inválido: email ou oid ausente")
    
    repo = UsuarioRepository()
    result = repo.get_by_azure_ad_id(azure_ad_id)
    
    if result.get("status") == "error":
        default_role = "engenheiro" if "engenheiro" in roles else "cliente"
        create_result = repo.create_usuario(
            nome=user_name or user_email.split("@")[0],
            email=user_email,
            role=default_role,
            azure_ad_id=azure_ad_id
        )
        if create_result.get("status") == "error":
            raise_http_error(500, f"Erro ao criar usuário: {create_result.get('error')}")
        usuario = create_result.get("data")
    else:
        usuario = result.get("data")
        repo.update_ultimo_login(usuario["RowKey"])
    
    return {
        "id": usuario["RowKey"],
        "email": user_email,
        "nome": usuario["nome"],
        "role": usuario["role"],
        "azure_ad_id": azure_ad_id,
        "roles_ad": roles
    }

def require_auth(func):
    @wraps(func)
    async def wrapper(*args, current_user: dict = Depends(get_current_user), **kwargs):
        return await func(*args, current_user=current_user, **kwargs)
    return wrapper

def require_role(required_role: str):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, current_user: dict = Depends(get_current_user), **kwargs):
            user_role = current_user.get("role")
            if user_role != required_role and user_role != "admin":
                raise_http_error(403, f"Acesso negado. Role necessária: {required_role}")
            return await func(*args, current_user=current_user, **kwargs)
        return wrapper
    return decorator
```

**Notas:**
- `get_jwks()` busca as chaves públicas do Azure AD para validar assinatura do JWT
- `validate_token()` decodifica e valida o token JWT
- `get_current_user()` extrai dados do usuário do token e cria/atualiza no banco
- `require_auth` e `require_role` são decorators para proteger endpoints

### 5. Atualizar `backend/.env.example` com variáveis de Azure AD

Adicionar ao final do arquivo:

```
CM_AZURE_AD_TENANT_ID=your-tenant-id
CM_AZURE_AD_CLIENT_ID=your-client-id
CM_AZURE_AD_AUDIENCE=api://your-client-id
```

### 6. Adicionar endpoint de usuário autenticado em `backend/app/routers/auth.py`

Criar novo router:

```python
from fastapi import APIRouter, Depends
from typing import Dict, Any

from app.utils.auth import get_current_user
from app.utils.helpers import create_response

router = APIRouter()

@router.get("/me")
async def get_me(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    return create_response("success", {
        "id": current_user["id"],
        "nome": current_user["nome"],
        "email": current_user["email"],
        "role": current_user["role"]
    })
```

### 7. Registrar router de auth em `backend/app/main.py`

Adicionar import e registro:

```python
from app.routers import health, calculos, localidades, storage_health, auth

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
```

### 8. Instalar MSAL no frontend

```bash
cd frontend
npm install @azure/msal-browser
```

### 9. Criar configuração MSAL em `frontend/lib/msal-config.ts`

```typescript
import { Configuration, PublicClientApplication } from '@azure/msal-browser'

const clientId = process.env.NEXT_PUBLIC_AZURE_AD_CLIENT_ID || ''
const tenantId = process.env.NEXT_PUBLIC_AZURE_AD_TENANT_ID || ''
const redirectUri = process.env.NEXT_PUBLIC_AZURE_AD_REDIRECT_URI || 'http://localhost:3000'

export const msalConfig: Configuration = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri,
    postLogoutRedirectUri: redirectUri,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
}

export const loginRequest = {
  scopes: ['openid', 'profile', 'email', `api://${clientId}/access_as_user`],
}

export const msalInstance = new PublicClientApplication(msalConfig)

await msalInstance.initialize()
```

### 10. Criar hook de autenticação em `frontend/lib/hooks/useAuth.ts`

```typescript
import { useEffect, useState } from 'react'
import { msalInstance, loginRequest } from '@/lib/msal-config'
import { AuthenticationResult } from '@azure/msal-browser'

export interface User {
  id: string
  nome: string
  email: string
  role: 'cliente' | 'engenheiro' | 'admin'
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const accounts = msalInstance.getAllAccounts()
    if (accounts.length > 0) {
      msalInstance.setActiveAccount(accounts[0])
      fetchUserInfo()
    } else {
      setLoading(false)
    }
  }, [])

  async function fetchUserInfo() {
    try {
      const token = await getAccessToken()
      const response = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await response.json()
      if (data.status === 'success') {
        setUser(data.data)
      }
    } catch (error) {
      console.error('Erro ao buscar usuário:', error)
    } finally {
      setLoading(false)
    }
  }

  async function login() {
    try {
      const result: AuthenticationResult = await msalInstance.loginPopup(loginRequest)
      msalInstance.setActiveAccount(result.account)
      await fetchUserInfo()
    } catch (error) {
      console.error('Erro no login:', error)
      throw error
    }
  }

  async function logout() {
    await msalInstance.logoutPopup()
    setUser(null)
  }

  async function getAccessToken(): Promise<string> {
    const account = msalInstance.getActiveAccount()
    if (!account) throw new Error('Usuário não autenticado')

    try {
      const response = await msalInstance.acquireTokenSilent({
        ...loginRequest,
        account,
      })
      return response.accessToken
    } catch (error) {
      const response = await msalInstance.acquireTokenPopup(loginRequest)
      return response.accessToken
    }
  }

  return {
    user,
    loading,
    login,
    logout,
    getAccessToken,
    isAuthenticated: !!user,
  }
}
```

### 11. Criar AuthProvider em `frontend/lib/contexts/AuthContext.tsx`

```typescript
'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useAuth, User } from '@/lib/hooks/useAuth'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: () => Promise<void>
  logout: () => Promise<void>
  getAccessToken: () => Promise<string>
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext deve ser usado dentro de AuthProvider')
  }
  return context
}
```

### 12. Adicionar AuthProvider em `frontend/app/layout.tsx`

Envolver children com AuthProvider:

```typescript
import { AuthProvider } from '@/lib/contexts/AuthContext'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
```

### 13. Substituir fluxo de login fake em `OnboardingChatFlow.tsx`

Remover imports de `SEED_CONTA_MOCK`, `GOOGLE_MOCK_USER`, `ENGINEER_PASSWORD`, `findConta`.

Adicionar import do hook de auth:

```typescript
import { useAuthContext } from '@/lib/contexts/AuthContext'
```

Substituir função `entrarComGoogle()` por:

```typescript
async function entrarComMicrosoft() {
  try {
    await login()
    setMessages([])
    enviarBot(`Autenticação concluída! Bem-vindo, ${user?.nome.split(' ')[0]}.`, undefined, () => {
      setPhase('CONCLUIDO')
      if (user && onLoginExisting) {
        const sessao: AppSession = {
          cliente: {
            id: user.id,
            nome: user.nome,
            email: user.email,
            telefone: '',
            dataCadastro: new Date().toISOString().split('T')[0],
          },
          orcamentos: [],
          orcamentoAtivo: null,
        }
        onLoginExisting(sessao)
      }
    })
  } catch (error) {
    enviarBot('Erro ao autenticar. Tente novamente.')
  }
}
```

Substituir botão "Entrar com Google" por:

```tsx
<button onClick={entrarComMicrosoft} className="btn btn-primary">
  Entrar com Microsoft
</button>
```

Remover validação de senha de engenheiro (`ENGINEER_PASSWORD`). Role será determinada pelo Azure AD.

### 14. Atualizar `frontend/lib/api.ts` para incluir token JWT

Substituir fetch simples por `fetchWithAuth`:

```typescript
import { msalInstance, loginRequest } from './msal-config'

async function getAccessToken(): Promise<string> {
  const account = msalInstance.getActiveAccount()
  if (!account) throw new Error('Usuário não autenticado')

  try {
    const response = await msalInstance.acquireTokenSilent({
      ...loginRequest,
      account,
    })
    return response.accessToken
  } catch (error) {
    const response = await msalInstance.acquireTokenPopup(loginRequest)
    return response.accessToken
  }
}

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = await getAccessToken()
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  }

  const response = await fetch(url, { ...options, headers })
  return response
}
```

### 15. Remover mocks de `frontend/lib/mockData.ts`

Deletar:
- `export const SEED_CONTA_MOCK`
- `export const GOOGLE_MOCK_USER`
- `export const ENGINEER_PASSWORD`

### 16. Remover lógica de conta fake de `frontend/lib/storage.ts`

Deletar funções:
- `loadContas()`
- `saveConta()`
- `findConta()`

Manter apenas:
- `loadStorage()` / `saveStorage()` (serão migradas na etapa 06)
- `loadRole()` / `saveRole()` (serão substituídas por role do token JWT)
- `loadEngineerData()` / `saveEngineerData()` (serão migradas na etapa 06)

### 17. Criar `frontend/.env.local` com variáveis de Azure AD

```
NEXT_PUBLIC_AZURE_AD_CLIENT_ID=your-client-id
NEXT_PUBLIC_AZURE_AD_TENANT_ID=your-tenant-id
NEXT_PUBLIC_AZURE_AD_REDIRECT_URI=http://localhost:3000
```

### 18. Atualizar `deploy.sh` com variáveis de Azure AD

Adicionar configuração de variáveis no App Service do backend:

```bash
az webapp config appsettings set \
  --name construbot-api \
  --resource-group construbot-rg \
  --settings \
    CM_AZURE_AD_TENANT_ID="$TENANT_ID" \
    CM_AZURE_AD_CLIENT_ID="$CLIENT_ID" \
    CM_AZURE_AD_AUDIENCE="api://$CLIENT_ID"
```

### 19. Atualizar README.md com instruções de Azure AD

Adicionar seção após "Desenvolvimento Local — Azure Table Storage":

```markdown
## 🔐 Autenticação — Azure AD (Entra ID)

### Registrar aplicativo no Azure AD

```bash
./scripts/setup_azure_ad.sh
```

O script irá:
1. Registrar aplicativo `construbot-app` no Azure AD
2. Criar App Roles: `cliente`, `engenheiro`, `admin`
3. Expor API scope `access_as_user`
4. Exibir variáveis de ambiente para backend e frontend

### Configurar variáveis de ambiente

**Backend (`backend/.env`):**
```
CM_AZURE_AD_TENANT_ID=<tenant-id>
CM_AZURE_AD_CLIENT_ID=<client-id>
CM_AZURE_AD_AUDIENCE=api://<client-id>
```

**Frontend (`frontend/.env.local`):**
```
NEXT_PUBLIC_AZURE_AD_CLIENT_ID=<client-id>
NEXT_PUBLIC_AZURE_AD_TENANT_ID=<tenant-id>
NEXT_PUBLIC_AZURE_AD_REDIRECT_URI=http://localhost:3000
```

### Atribuir roles a usuários

1. Acessar [Azure Portal](https://portal.azure.com)
2. Navegar para **Azure Active Directory** > **Enterprise Applications**
3. Buscar por `construbot-app`
4. Clicar em **Users and groups** > **Add user/group**
5. Selecionar usuário e atribuir role (cliente, engenheiro ou admin)

### Testar autenticação

1. Rodar backend: `cd backend && uvicorn app.main:app --reload`
2. Rodar frontend: `cd frontend && npm run dev`
3. Acessar http://localhost:3000
4. Clicar em "Entrar com Microsoft"
5. Autenticar com conta Azure AD
6. Verificar role atribuída: `curl -H "Authorization: Bearer <token>" http://localhost:8000/api/auth/me`
```

## Restrições

- Sem comentários no código
- Sem emojis
- Escrever em português brasileiro com acentuação correta
- Remover TODOS os mocks: `SEED_CONTA_MOCK`, `GOOGLE_MOCK_USER`, `ENGINEER_PASSWORD`
- Não criar endpoints CRUD nesta etapa (será feito na etapa 05)
- Não migrar localStorage nesta etapa (será feito na etapa 06)
- Usar fluxo OAuth2 Authorization Code + PKCE (não usar Client Credentials)
- Tokens JWT devem ser validados em TODAS as rotas protegidas
- Role padrão para novos usuários: `cliente` (exceto se `engenheiro` vier no token AD)

## Verificação

Para confirmar que a etapa está concluída:

1. **Script de setup executado:**
   ```bash
   ./scripts/setup_azure_ad.sh
   ```
   Deve exibir `CLIENT_ID` e `TENANT_ID`.

2. **Variáveis configuradas:**
   ```bash
   grep CM_AZURE_AD backend/.env
   grep NEXT_PUBLIC_AZURE_AD frontend/.env.local
   ```

3. **Dependências instaladas:**
   ```bash
   grep python-jose backend/requirements.txt
   grep @azure/msal-browser frontend/package.json
   ```

4. **Mocks removidos:**
   ```bash
   ! grep -q "SEED_CONTA_MOCK" frontend/lib/storage.ts
   ! grep -q "GOOGLE_MOCK_USER" frontend/components/OnboardingChatFlow.tsx
   ! grep -q "ENGINEER_PASSWORD" frontend/lib/mockData.ts
   ```

5. **Backend valida JWT:**
   ```bash
   curl http://localhost:8000/api/auth/me
   ```
   Deve retornar erro 401 (Unauthorized).

6. **Frontend autentica com Azure AD:**
   - Abrir http://localhost:3000
   - Clicar em "Entrar com Microsoft"
   - Popup do Azure AD deve abrir
   - Após login, usuário deve ser redirecionado de volta

7. **Endpoint protegido funciona:**
   ```bash
   TOKEN=$(curl -s -X POST "https://login.microsoftonline.com/$TENANT_ID/oauth2/v2.0/token" \
     -d "client_id=$CLIENT_ID&scope=api://$CLIENT_ID/access_as_user&grant_type=client_credentials&client_secret=$SECRET" \
     | jq -r .access_token)
   
   curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/auth/me
   ```
   Deve retornar dados do usuário.

8. **Usuário criado no banco:**
   ```bash
   cd backend
   python -c "from app.repositories import UsuarioRepository; r = UsuarioRepository(); print(r.list_all_clientes())"
   ```
   Deve listar o usuário autenticado.

9. **Pronto para etapa 05:**
   - Etapa 05 criará endpoints CRUD protegidos com `@require_auth`
   - Etapa 06 substituirá localStorage por chamadas a esses endpoints
