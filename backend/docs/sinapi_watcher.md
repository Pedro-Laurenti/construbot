# SINAPI Watcher - Detecção Automática e Revalidação

## Visão Geral

O SINAPI Watcher é um subsistema automatizado que monitora diariamente o site da Caixa Econômica Federal em busca de novas versões do SINAPI (Sistema Nacional de Pesquisa de Custos e Índices da Construção Civil).

Quando uma nova versão é detectada, o sistema:
1. Baixa automaticamente os arquivos Excel (ISE e Composições)
2. Executa o ETL para persistir os dados no Azure Table Storage
3. Notifica administradores via email
4. Marca orçamentos abertos para revalidação

## Arquitetura

### Componentes

- **Azure Function Timer Trigger** (`backend/functions/sinapi_watcher/__init__.py`)
  - Execução: diária às 03:00 UTC (cron: `0 0 3 * * *`)
  - Timeout: 10 minutos (configurável)
  
- **Serviço de Detecção** (`backend/app/services/sinapi_watcher_service.py`)
  - Faz parsing HTML da página oficial da Caixa
  - Detecta novas versões por análise de links de download
  - Gerencia download com retry (3 tentativas)
  - Calcula checksums SHA256 para validação de integridade
  
- **Repositório de Publicações** (`backend/app/repositories/sinapi_publicacao_repository.py`)
  - Tabela Azure: `SINAPIPublicacao`
  - Armazena histórico de detecções e status de ingestão
  
- **Endpoints de Revalidação** (`backend/app/routers/sinapi.py`)
  - `GET /api/sinapi/publicacoes` — lista histórico
  - `GET /api/sinapi/publicacao/{sinapiRef}` — detalhes de publicação
  - `POST /api/sinapi/revalidar-orcamento/{id}` — recalcula orçamento

- **Banner no Frontend** (`frontend/components/ResultadoOrcamento.tsx`)
  - Exibe alerta amarelo quando `orcamento.sinapiAtualizacaoDisponivel === true`
  - Botão "Recalcular" chama endpoint de revalidação

## Fluxo Completo

```
[Timer Trigger 03:00 UTC]
        ↓
[Detectar Nova Versão]
        ↓
   Nova versão?
    ↙       ↘
  Não       Sim
   ↓         ↓
  Fim    [Criar Registro: DETECTADA]
            ↓
       [Download ISE]
            ↓
       [Download Composições]
            ↓
       [Calcular Checksums]
            ↓
       [Executar ETL]
            ↓
       [Atualizar Status: INGERIDA]
            ↓
       [Marcar Orçamentos para Revalidação]
            ↓
       [Notificar Admins]
            ↓
          Fim
```

## Configuração

### Variáveis de Ambiente

Adicionar em `backend/.env` e configurar no Azure Function App:

```bash
CM_SINAPI_WATCHER_URL=https://www.caixa.gov.br/site/paginas/downloads.aspx
CM_SINAPI_WATCHER_ENABLED=true
CM_SINAPI_ADMIN_EMAILS=admin1@example.com,admin2@example.com
```

### Deploy da Function

```bash
cd backend/functions
func azure functionapp publish construbot-sinapi-watcher --python
```

### Execução Manual (Teste)

```bash
cd backend/functions
func start
```

A Function será executada na próxima ocorrência do cron ou pode ser acionada manualmente via Azure Portal.

## Detecção de Novas Versões

O watcher utiliza **parsing HTML** para detectar links de download. A lógica busca:

1. Links contendo "ISE" e extensão ".xlsx"
2. Links contendo "COMPOSICOES" e extensão ".xlsx"
3. Extrai `sinapiRef` (formato `AAAA-MM`) do nome do arquivo

Se a versão já existir em `listar_versoes()`, a detecção retorna `None` (nenhuma ação).

**Limitações:**
- Depende da estrutura HTML da página oficial
- Se a Caixa mudar o formato dos links, o parsing falhará
- Não há autenticação — assume que arquivos são públicos

## Download e Validação

### Retry com Backoff Exponencial

```python
max_tentativas = 3
timeout = 60 segundos
backoff = 2^tentativa segundos
```

### Checksum SHA256

Após download, o sistema calcula o hash SHA256 de cada arquivo e armazena em `SINAPIPublicacao.checksumISE` e `checksumComposicoes`.

Isso permite:
- Detectar corrupção de arquivos
- Evitar reprocessamento de arquivos duplicados
- Auditoria de integridade

## Ingestão Automática

O watcher chama diretamente o ETL:

```python
from scripts.etl_sinapi import executar_etl

args = argparse.Namespace(
    ise=arquivo_ise,
    composicoes=arquivo_composicoes,
    ref=sinapi_ref,
    dry_run=False
)

executar_etl(args)
```

Se o ETL falhar, o status é atualizado para `ERRO` e o log de erro é armazenado em `logJson`.

## Notificações

Quando `CM_SINAPI_ADMIN_EMAILS` está configurado, o sistema envia notificação para todos os emails listados (separados por vírgula).

**Status de sucesso:**
```
Assunto: Nova versão SINAPI ingerida: 2026-04
Corpo: A versão SINAPI 2026-04 foi detectada, baixada e ingerida com sucesso.
```

**Status de erro:**
```
Assunto: Erro ao ingerir SINAPI 2026-04
Corpo: Erro ao processar versão 2026-04: [mensagem de erro]
```

**Nota:** A integração de email real requer Azure Communication Services (etapa alfa-11b). Atualmente, as notificações apenas imprimem logs.

## Revalidação de Orçamentos

### Marcação Automática

Quando uma nova versão é ingerida com sucesso, o watcher:

1. Obtém a versão ativa anterior via `get_versao_ativa()`
2. Consulta orçamentos com `sinapiRef == versao_antiga` e `status != 'entregue'`
3. Define `sinapiAtualizacaoDisponivel = True` para cada orçamento encontrado

### Banner no Frontend

O componente `ResultadoOrcamento` verifica se `orcamento.sinapiAtualizacaoDisponivel === true` e exibe:

```tsx
<div className="alert alert-warning">
  <MdWarning className="w-6 h-6" />
  <div>
    <h3>Nova versão SINAPI disponível</h3>
    <p>Deseja recalcular o orçamento com os dados atualizados?</p>
  </div>
  <button onClick={handleRevalidarOrcamento}>Recalcular</button>
</div>
```

### Endpoint de Revalidação

`POST /api/sinapi/revalidar-orcamento/{id}`

Efeitos:
- Atualiza `orcamento.sinapiRef` para a versão ativa atual
- Define `orcamento.sinapiAtualizacaoDisponivel = False`
- Atualiza `updatedAt` com timestamp atual

**Importante:** A revalidação **não recalcula** os totais automaticamente. O usuário deve recalcular o orçamento manualmente (funcionalidade futura).

## Status de Publicação

A tabela `SINAPIPublicacao` armazena os seguintes status:

| Status | Significado |
|--------|-------------|
| `DETECTADA` | Nova versão detectada, aguardando download |
| `BAIXANDO` | Download em progresso |
| `PROCESSANDO` | ETL em execução |
| `INGERIDA` | ETL concluído com sucesso |
| `ERRO` | Falha em alguma etapa (ver `logJson` para detalhes) |

## Troubleshooting

### Watcher não detecta novas versões

**Causas possíveis:**
- Página da Caixa offline ou mudou estrutura HTML
- `CM_SINAPI_WATCHER_URL` incorreto
- Timeout de rede (30s padrão)

**Solução:**
1. Testar URL manualmente: `curl -I $CM_SINAPI_WATCHER_URL`
2. Verificar logs da Function no Azure Portal
3. Ajustar seletores HTML em `sinapi_watcher_service.detectar_nova_versao()`

### Download falha após 3 tentativas

**Causas possíveis:**
- Arquivo grande (>50MB) com timeout de 60s insuficiente
- Rede lenta ou instável
- Arquivo não acessível publicamente

**Solução:**
1. Aumentar timeout em `baixar_arquivo()` (linha `response = requests.get(url, timeout=120)`)
2. Verificar tamanho do arquivo: `curl -I $URL_DO_ARQUIVO`
3. Testar download manual

### ETL falha com erro de validação

**Causas possíveis:**
- Arquivo Excel com formato divergente
- Colunas faltando ou renomeadas
- Dados inválidos (códigos duplicados, preços negativos)

**Solução:**
1. Executar ETL em dry-run: `python scripts/etl_sinapi.py --ise arquivo.xlsx --ref 2026-04 --dry-run`
2. Verificar logs de erro em `SINAPIPublicacao.logJson`
3. Corrigir parsers em `scripts/parsers/` se necessário

### Orçamentos não marcados para revalidação

**Causas possíveis:**
- Query de orçamentos falhou
- Permissões insuficientes no Storage Account
- Versão ativa não configurada

**Solução:**
1. Verificar se `ParametrosGlobais.sinapiRefAtiva` existe
2. Verificar logs: "X orçamentos marcados para revalidação"
3. Query manual: `GET /api/orcamentos?sinapi_ref={antiga}&status=rascunho`

## Logs e Monitoramento

Todos os logs da Function são enviados para Azure Application Insights (se configurado).

**Logs importantes:**
- `SINAPI Watcher iniciado`
- `Nova versão detectada: {sinapiRef}`
- `Arquivos baixados - ISE: {checksum}, Composições: {checksum}`
- `{count} orçamentos marcados para revalidação`
- `SINAPI Watcher concluído`

**Monitoramento recomendado:**
- Alertas para execuções com status `ERRO`
- Métricas de tempo de execução (deve ser < 5min)
- Taxa de sucesso de downloads

## Desabilitando o Watcher

Para desabilitar temporariamente:

```bash
az functionapp config appsettings set \
  --name construbot-sinapi-watcher \
  --resource-group construbot-rg \
  --settings CM_SINAPI_WATCHER_ENABLED=false
```

Ou editar variável de ambiente no Azure Portal.

## Segurança

- **Autenticação:** Endpoints de revalidação exigem token JWT válido
- **Autorização:** Apenas admins podem alterar versão ativa
- **Isolamento:** Function App roda em Consumption Plan isolado
- **Retry limitado:** Máximo 3 tentativas para evitar abuso

## Próximos Passos

- Integrar Azure Communication Services para emails reais (etapa 11b)
- Adicionar recálculo automático de orçamentos ao revalidar
- Implementar webhook para notificação instantânea (em vez de polling diário)
- Adicionar interface admin para acionar ingestão manual via frontend
