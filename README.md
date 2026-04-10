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

## 🌐 Variáveis de ambiente

### Frontend

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `BACKEND_URL` | URL do backend (build-time, usada pelo `next.config.ts`) | `http://localhost:8000` |

### Backend

Nenhuma variável obrigatória no momento. Para produção, crie um `.env` com as credenciais necessárias e use `python-dotenv` (já incluso nas dependências).

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
