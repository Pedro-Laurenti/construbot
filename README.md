# 🏗️ ConstruBot

> Plataforma de cotações inteligentes para construção civil, com interface estilo WhatsApp.

ConstruBot é uma aplicação full-stack que guia usuários passo a passo pelo processo de estimativa de orçamento para obras, com suporte a redirecionamento para engenheiros especializados via WhatsApp.

---

## ✨ Funcionalidades

- 💬 **Chat de Cotação** — assistente interativo que coleta dados da obra (tipo, área, localização, padrão, prazo etc.) e gera uma estimativa detalhada com distribuição de custos e cronograma
- 👷 **Falar com Engenheiro** — fluxo de redirecionamento para atendimento humano via WhatsApp, com coleta do motivo do contato
- 📊 **Card de Resultado** — exibe faixa de preço, custo por m², cronograma estimado e distribuição de custos em gráfico de barras
- 🔐 **Login** — tela de autenticação com suporte a e-mail/senha e Google
- 🎨 **Tema WhatsApp** — tema DaisyUI customizado com a paleta de cores do WhatsApp

---

## 🖥️ Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 16 + TypeScript + Tailwind CSS + DaisyUI |
| Backend | Python 3.13 + FastAPI + Uvicorn |
| Containerização | Docker (multi-stage builds) |
| Deploy | Azure App Service + Azure Container Registry |

---

## 📁 Estrutura do projeto

```
construbot/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   └── main.py          # FastAPI app, rotas e CORS
│   ├── Dockerfile
│   ├── .dockerignore
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx         # Orquestrador principal
│   ├── components/
│   │   ├── ChatWindow.tsx   # Fluxo de cotação
│   │   ├── EngineerWindow.tsx
│   │   ├── HelpModal.tsx
│   │   ├── LoginPage.tsx
│   │   ├── QuoteResultCard.tsx
│   │   └── Sidebar.tsx
│   ├── lib/
│   │   ├── botScripts.ts    # Scripts do bot e lógica de orçamento
│   │   └── session.ts       # Sessão do usuário (localStorage)
│   ├── types/
│   │   └── index.ts
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── next.config.ts
│   └── tailwind.config.ts
├── deploy.sh                # Script de deploy para Azure
├── start.sh                 # Script de dev local
└── package.json
```

---

## 🚀 Rodando localmente

### Pré-requisitos

- Node.js 22+
- Python 3.13+
- `npm` e `pip`

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/construbot.git
cd construbot
```

### 2. Configure o backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Configure o frontend

```bash
cd frontend
npm install
```

### 4. Inicie os serviços

**Opção A — script integrado (recomendado):**
```bash
./start.sh
```

**Opção B — separado:**
```bash
# Terminal 1
npm run dev:backend

# Terminal 2
npm run dev:frontend
```

Acesse em: [http://localhost:3000](http://localhost:3000)  
API docs: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🐳 Rodando com Docker

### Backend

```bash
docker build -t construbot-backend ./backend
docker run -p 8000:8000 construbot-backend
```

### Frontend

```bash
docker build \
  --build-arg BACKEND_URL=http://localhost:8000 \
  -t construbot-frontend \
  ./frontend

docker run -p 3000:3000 construbot-frontend
```

---

## ☁️ Deploy na Azure

> Pré-requisito: `az login` já executado.

O script `deploy.sh` automatiza todo o processo:

```bash
./deploy.sh
```

O script irá:
1. Criar o Resource Group `construbot-rg` em `eastus`
2. Criar o Azure Container Registry `construbotacr`
3. Fazer o build e push das imagens via `az acr build` (sem Docker local)
4. Criar os App Services (B1, Linux) para backend e frontend
5. Configurar as variáveis de ambiente e reiniciar os apps

Após o deploy:
- **Frontend:** `https://construbot-frontend.azurewebsites.net`
- **Backend / API:** `https://construbot-api.azurewebsites.net/docs`

Para redeploys, basta rodar `./deploy.sh` novamente — o script detecta apps existentes e só atualiza a imagem.

---

## 🗄️ Infraestrutura Azure

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

### Azure AD (Autenticação)

A autenticação é feita via **Azure AD (Entra ID)** com fluxo OAuth2 Authorization Code + PKCE:

1. **Backend** valida tokens JWT (RS256) usando chaves públicas (JWKS) do Azure AD
2. **Frontend** usa MSAL.js para obter tokens via popup
3. Usuários são criados automaticamente na primeira autenticação (tabela Usuario)

#### Configuração Inicial

1. Execute o script de setup:
   ```bash
   cd scripts
   chmod +x setup_azure_ad.sh
   ./setup_azure_ad.sh
   ```

2. O script cria o app registration no Azure AD com:
   - **App Roles**: cliente, engenheiro, admin
   - **API Scope**: access_as_user
   - **Redirect URIs**: localhost:3000 + produção

3. Configure as variáveis de ambiente:
   
   Backend (`backend/.env`):
   ```bash
   CM_AZURE_AD_TENANT_ID=<tenant-id>
   CM_AZURE_AD_CLIENT_ID=<client-id>
   CM_AZURE_AD_AUDIENCE=api://<client-id>
   ```
   
   Frontend (`frontend/.env.local`):
   ```bash
   NEXT_PUBLIC_AZURE_AD_CLIENT_ID=<client-id>
   NEXT_PUBLIC_AZURE_AD_TENANT_ID=<tenant-id>
   NEXT_PUBLIC_AZURE_AD_REDIRECT_URI=http://localhost:3000
   ```

#### Atribuir Roles aos Usuários

1. Obter Object ID do usuário:
   ```bash
   az ad user show --id <email> --query id -o tsv
   ```

2. Atribuir role via Azure Portal:
   - Acesse **Azure Active Directory > Enterprise Applications**
   - Busque pelo app "construbot-app"
   - Vá em **Users and groups > Add user/group**
   - Selecione o usuário e a role (cliente, engenheiro ou admin)

#### Verificar Autenticação

1. Teste o endpoint `/api/auth/me` sem token:
   ```bash
   curl http://localhost:8000/api/auth/me
   # Deve retornar 401 Unauthorized
   ```

2. Faça login no frontend e verifique no console do navegador se o token JWT está sendo obtido

3. Teste com token válido:
   ```bash
   curl -H "Authorization: Bearer <token>" http://localhost:8000/api/auth/me
   # Deve retornar dados do usuário
   ```

---

## 📡 Endpoints da API

A API REST expõe endpoints CRUD para todas as entidades, com autenticação JWT obrigatória e controle de acesso baseado em roles.

### Autenticação

Todos os endpoints (exceto `/api/health`) requerem token JWT no header:

```bash
Authorization: Bearer <token>
```

### Clientes (`/api/clientes`)

- **POST** `/clientes` — Criar novo cliente (role: cliente)
- **GET** `/clientes` — Listar clientes (role: cliente, retorna apenas os próprios)
- **GET** `/clientes/:id` — Obter cliente por ID (role: cliente)
- **PUT** `/clientes/:id` — Atualizar cliente (role: cliente)
- **DELETE** `/clientes/:id` — Deletar cliente (role: admin)

Parâmetros de query:
- `skip` (int): Paginação (padrão: 0)
- `limit` (int): Itens por página (padrão: 50, máx: 100)
- `email` (string): Filtrar por email

### Orçamentos (`/api/orcamentos`)

- **POST** `/orcamentos` — Criar novo orçamento (role: cliente)
- **GET** `/orcamentos` — Listar orçamentos (role: cliente, retorna apenas os próprios)
- **GET** `/orcamentos/:id` — Obter orçamento por ID (role: cliente)
- **GET** `/clientes/:clienteId/orcamentos` — Listar orçamentos de um cliente (role: cliente)
- **PUT** `/orcamentos/:id` — Atualizar orçamento (role: cliente)
- **DELETE** `/orcamentos/:id` — Deletar orçamento (role: cliente)

Parâmetros de query:
- `skip` (int): Paginação (padrão: 0)
- `limit` (int): Itens por página (padrão: 50, máx: 100)
- `cliente_id` (string): Filtrar por cliente
- `status` (string): Filtrar por status

### Orçamentos Engenheiro (`/api/orcamentos-engenheiro`)

- **GET** `/orcamentos-engenheiro` — Listar todos os orçamentos engenheiro (role: engenheiro)
- **GET** `/orcamentos-engenheiro/:id` — Obter orçamento engenheiro por ID (role: engenheiro)

Parâmetros de query:
- `skip` (int): Paginação (padrão: 0)
- `limit` (int): Itens por página (padrão: 50, máx: 100)

### Parâmetros Globais (`/api/parametros-globais`)

- **GET** `/parametros-globais` — Obter parâmetros globais (role: engenheiro)
- **PUT** `/parametros-globais` — Atualizar parâmetros globais (role: engenheiro)

### Grupos de Encargos (`/api/grupos-encargos`)

- **GET** `/grupos-encargos` — Obter grupos de encargos (role: engenheiro)
- **PUT** `/grupos-encargos` — Atualizar grupos de encargos (role: engenheiro)

### Auditoria (`/api/auditoria`)

- **GET** `/auditoria` — Listar registros de auditoria (role: admin)

Parâmetros de query:
- `skip` (int): Paginação (padrão: 0)
- `limit` (int): Itens por página (padrão: 50, máx: 100)
- `tabela` (string): Filtrar por nome da tabela
- `user_email` (string): Filtrar por email do usuário

### Formato das Respostas

**Sucesso (entidade única):**
```json
{
  "status": "success",
  "data": { ... }
}
```

**Sucesso (lista paginada):**
```json
{
  "status": "success",
  "data": [ ... ],
  "total": 42,
  "skip": 0,
  "limit": 50
}
```

**Erro:**
```json
{
  "status": "error",
  "error": "Mensagem de erro"
}
```

**Documentação Interativa:**

Acesse [http://localhost:8000/docs](http://localhost:8000/docs) para explorar todos os endpoints via Swagger UI.

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

---

## 🗃️ Desenvolvimento Local — Azure Table Storage

### 1. Instalar Azurite

Azurite é o emulador local do Azure Storage:

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
- **Table Service**: `http://127.0.0.1:10002`

### 3. Configurar variáveis de ambiente

Copiar `backend/.env.example` para `backend/.env` (as variáveis já estão configuradas para Azurite por padrão).

### 4. Inicializar tabelas

```bash
cd backend
python -m backend.scripts.init_tables
```

Saída esperada:
```
Inicializando tabelas no Azure Table Storage...
  ✓ Cliente: criada
  ✓ Orcamento: criada
  ✓ OrcamentoEngenheiro: criada
  ✓ PlantaPadrao: criada
  ✓ Opcional: criada
  ✓ ParametrosGlobais: criada
  ✓ GruposEncargos: criada
  ✓ ComposicaoProfissional: criada
  ✓ InsumoSINAPI: criada
  ✓ ComposicaoAnalitica: criada
  ✓ Auditoria: criada
  ✓ Usuario: criada
Inicialização concluída.
```

### 5. Executar testes de integração

```bash
cd backend
pytest tests/integration/ -v
```

Todos os testes devem passar (status `PASSED`).

### Produção — Azure Table Storage

Em produção, o backend usa **Managed Identity** para autenticar no Storage Account. Nenhuma connection string é armazenada.

Variáveis de ambiente em produção (configuradas via `deploy.sh`):
- `CM_STORAGE_ACCOUNT_NAME=construtobtstorage`
- `CM_STORAGE_ACCOUNT_URL=https://construtobtstorage.table.core.windows.net`
- `CM_STORAGE_CONNECTION_STRING=` (vazio — usa Managed Identity)

---

## 🌐 Variáveis de ambiente

### Frontend

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `BACKEND_URL` | URL do backend (build-time, usada pelo `next.config.ts`) | `http://localhost:8000` |

### Backend

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `CM_STORAGE_ACCOUNT_NAME` | Nome do Storage Account (produção: via App Service Settings) | `""` |
| `CM_STORAGE_ACCOUNT_URL` | URL do Table Service endpoint | `""` |
| `CM_STORAGE_CONNECTION_STRING` | Connection string para dev local (produção: vazio, usa Managed Identity) | `""` |
| `CM_APP_CORS_ORIGINS` | Origens permitidas para CORS (separadas por vírgula) | `http://localhost:3000,http://127.0.0.1:3000` |

---

## 📐 Tema DaisyUI

O tema `whatsapp` é definido em `tailwind.config.ts` com a paleta de cores do WhatsApp:

| Token | Cor | Uso |
|-------|-----|-----|
| `primary` | `#00a884` | Botões principais, bolhas do usuário |
| `secondary` | `#2a3942` | Fundos secundários, inputs |
| `accent` | `#53bdeb` | Ticks de leitura, labels de bot |
| `base-100` | `#111b21` | Fundo principal |
| `base-300` | `#202c33` | Cabeçalhos, painéis |

---

## 🤝 Contribuindo

1. Fork o repositório
2. Crie uma branch: `git checkout -b feat/minha-feature`
3. Commit: `git commit -m 'feat: minha feature'`
4. Push: `git push origin feat/minha-feature`
5. Abra um Pull Request

---

## 📄 Licença

MIT — veja o arquivo [LICENSE](LICENSE) para detalhes.

---

<p align="center">Feito com ☕ e <a href="https://daisyui.com">DaisyUI</a></p>
