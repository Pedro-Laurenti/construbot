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

---

## 🧮 Arquitetura de Cálculos

A partir da etapa alfa-07, **todos os cálculos de orçamento são realizados exclusivamente no backend** (FastAPI). O frontend atua como um wrapper fino, enviando requisições para a API e exibindo os resultados.

### Princípios

1. **Backend é a fonte de verdade** — toda lógica de cálculo (mão de obra, materiais, fluxo de caixa, INCC, consolidação) está em `backend/app/services/orcamento_service.py`

2. **Frontend é wrapper** — `frontend/lib/calculos.ts` apenas:
   - Chama endpoints `/api/calculos/*`
   - Formata parâmetros (camelCase → snake_case)
   - Transforma respostas (snake_case → camelCase)
   - Mantém funções auxiliares locais (getCustosHora, resolverParametrosMOComposicao, prazoCenario)

3. **Snapshot de cálculo** — ao consolidar um orçamento via POST `/api/calculos/consolidacao`, o backend serializa o resultado como JSON e salva no campo `calculoSnapshotJson` da entidade Orcamento (Azure Table Storage). Isso permite:
   - Reproduzir cálculos exatos mesmo após mudanças nas constantes ou lógica
   - Auditar divergências entre versões
   - Garantir consistência para clientes

### Endpoints Principais

| Endpoint | Descrição | Validações |
|----------|-----------|------------|
| `POST /api/calculos/mao-de-obra` | Calcula mão de obra para um serviço (cenários mensalista/ótima/prazo, bônus, economia) | quantidade > 0, produtividade_basica_unh > 0, fator_encargos >= 1, prazo_requerido_dias >= 0 |
| `POST /api/calculos/materiais` | Calcula custo de materiais com deduplicação de insumos por código SINAPI | quantidade > 0 |
| `POST /api/calculos/fluxo-caixa` | Calcula fluxo de caixa mensal com correção INCC (mês 0 = sem correção) | custo_direto_total > 0, tempo_obra_meses > 0 |
| `POST /api/calculos/consolidacao` | Consolida orçamento completo (soma custos MO + Mat, aplica BDI, salva snapshot) | area_total > 0 |

### Correções Aplicadas (Etapa 07)

A etapa alfa-07 corrigiu **13 divergências críticas** identificadas no prompt 13:

1. Modalidade profissional/ajudante propagada corretamente para todos os cenários
2. Custo final calculado contra cenário **ótima** (não prazo)
3. Economia calculada contra cenário **ótima** (não prazo)
4. Salário esperado sem bônus duplicado
5. Valor mensal esperado sem fator `22/prazo_ef` incorreto
6. Campo `desconto_cliente` explícito no retorno
7. Deduplicação de insumos por código SINAPI em `calcular_materiais`
8. Fator INCC com mês 0 sem correção (`(1 + incc_mensal) ** i`)
9. Cenários mensalista/ótima usam prazos proporcionais via `prazo_cenario(escala, prazo_requerido)`
10. Ajudantes necessários podem ser 0
11. Guarda contra divisão por zero em prazo
12. Constante obsoleta `CM_ENCARGOS_TOTAL` removida
13. Validações obrigatórias em todos os endpoints de cálculo

### Desenvolvimento

Ao modificar lógica de cálculo:

1. Editar `backend/app/services/orcamento_service.py`
2. Adicionar validações em `backend/app/routers/calculos.py` se necessário
3. Atualizar modelos Pydantic se a resposta mudar
4. Executar `pytest backend/tests/integration/test_calculos_paridade.py` (se houver testes)
5. Documentar mudanças no changelog e atualizar `backend/docs/schemas.md`

### Importante

Não reimplemente cálculos no frontend. Se você precisa de um novo cálculo, adicione um endpoint no backend e chame-o do frontend via `frontend/lib/api.ts`.

---

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

## � Migração de Dados

Na primeira vez que você acessar o ConstruBot após a atualização para a versão com persistência em nuvem, uma modal será exibida automaticamente oferecendo a migração dos dados armazenados localmente para o Azure Table Storage.

### Como Funciona

A migração:
- Detecta dados em `localStorage` (chaves `construbot_v2`, `construbot_engineer`)
- Cria seu perfil de cliente na nuvem via POST `/api/clientes`
- Migra todos os orçamentos salvos localmente via POST `/api/orcamentos`
- Limpa o `localStorage` após sucesso
- Exibe relatório de sucesso/erros

### Opções de Migração

1. **Migrar agora**: executa a migração imediatamente e recarrega a página
2. **Pular**: mantém os dados em `localStorage` até o próximo login (flag `construbot_migrated=skipped`)

### Forçar Nova Migração

Se você pulou a migração e deseja executá-la novamente, limpe o flag no console do navegador:

```javascript
localStorage.removeItem('construbot_migrated')
```

Depois recarregue a página e a modal de migração aparecerá novamente.

### Resetar Migração (Desenvolvimento)

Para testar a migração múltiplas vezes durante desenvolvimento:

```javascript
localStorage.setItem('construbot_v2', JSON.stringify({
  cliente: { nome: 'Teste', telefone: '11999999999', email: 'teste@example.com' },
  orcamentos: [{ id: '1', nome: 'Obra Teste', uf: 'SP', itens: [] }],
  orcamentoAtivo: null
}))
localStorage.removeItem('construbot_migrated')
```

Recarregue a página para ver a modal de migração.

---

## �📡 Endpoints da API

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

## 📊 Dados SINAPI

O ConstruBot utiliza dados oficiais de custos de construção do **SINAPI** (Sistema Nacional de Pesquisa de Custos e Índices da Construção Civil) da Caixa Econômica Federal.

### Versionamento

- Formato: `AAAA-MM` (ex: `2026-04` para abril de 2026)
- Múltiplas versões coexistem no banco de dados
- Apenas uma versão está ativa por vez (configurada em ParametrosGlobais)
- Rollback: troque a versão ativa para uma anterior via API PUT `/api/sinapi/versao-ativa` (requer role admin)

### Ingestão de Dados

Use o script ETL para importar arquivos Excel oficiais do SINAPI:

```bash
cd backend
python scripts/etl_sinapi.py \
  --ise /caminho/ise_2026_04.xlsx \
  --composicoes /caminho/composicoes_2026_04.xlsx \
  --ref 2026-04
```

O ETL realiza:
1. Parsing de insumos (27 UFs) e composições analíticas
2. Validação de integridade (duplicados, referências órfãs, preços ausentes)
3. Persistência no Azure Table Storage (InsumoSINAPI e ComposicaoAnalitica)

### Modo Dry-Run

Teste arquivos antes da ingestão real:

```bash
python scripts/etl_sinapi.py \
  --ise /caminho/ise_2026_04.xlsx \
  --ref 2026-04 \
  --dry-run
```

### Consultar Dados via API

**Listar versões disponíveis:**
```bash
GET /api/sinapi/versoes
```

**Obter preço de insumo:**
```bash
GET /api/sinapi/insumo/{codigo}?uf=SP&sinapi_ref=2026-04&classificacao=MATERIAL
```

**Obter composição analítica:**
```bash
GET /api/sinapi/composicao/{codigo}?sinapi_ref=2026-04
```

### Fallback de Preços

Se o preço não existir na UF solicitada, o sistema retorna automaticamente o preço de SP como fallback.

### Documentação Completa

Veja [backend/docs/sinapi_etl.md](backend/docs/sinapi_etl.md) para detalhes sobre formato dos arquivos, schemas das tabelas e processo completo de ingestão.

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
