# Otimização de Custos — Revisão de Infraestrutura

**Executar APENAS após etapas 01–14 estarem estáveis em produção e com métricas reais de uso (logins/dia, tamanho de app, frequência de acesso, picos).**

Escopo: reavaliar escolha atual (App Service B1 para backend + frontend) contra alternativas mais baratas, decidindo com base em dados e não em especulação.

## Cenários a avaliar

**A — Máxima economia (R$ 60–90/mês)**
- Frontend → Azure Static Web Apps (Free ou Standard $9). Exige reescrever pipeline: deploy passa a ser git-based/artifact (sem Docker), CDN embutido, SSL grátis.
- Backend → Azure Container Apps Consumption (scale-to-zero). Mantém Docker e ACR. Cold start de 1–3s após idle.
- Trade-offs: cold start ocasional no primeiro hit do dia; middleware Next.js / ISR com limitações no SWA; body request limitado a 28MB (não impacta se uploads forem via SAS URL — etapa 10).

**B — Economia média, zero cold start (R$ 80–110/mês)**
- Frontend → Static Web Apps Standard.
- Backend → mantém App Service B1 sozinho (sem compartilhar plan com frontend).
- Trade-off: só reescreve pipeline do frontend; backend permanece igual.

**C — Status quo otimizado (R$ 110–150/mês)**
- Mantém App Service B1 compartilhado.
- Zero mudança, zero risco, zero cold start.

## Critérios de decisão

Coletar durante ≥30 dias em produção:
- Requests/dia no backend (pico e média)
- Tempo médio entre requests (para estimar idle do container)
- Tamanho real do bundle Next.js (caber em 250MB do SWA?)
- Quanto do frontend é SSR vs client-rendered
- Tolerância dos usuários a cold start (feedback direto)

Decidir:
- Se backend fica ocioso >20min entre requests frequentemente → Container Apps vale a pena
- Se SSR representa <20% das rotas → SWA é seguro
- Se uso é previsível e contínuo → App Service B1 (C) provavelmente é o mais simples

## Entregáveis

- `deploy.sh` atualizado para cenário escolhido (ou dois scripts: `deploy-app-service.sh` + `deploy-container-apps.sh`)
- Pipeline GitHub Actions ajustado (etapa 14)
- Documentação do trade-off escolhido e métricas que justificaram
- Plano de rollback se o cenário novo degradar UX
