---
agent: agent
---
# Watcher SINAPI — Descoberta, Revalidação e Notificação

## Contexto

O projeto ConstruBot possui atualmente:
- **Ingestão manual SINAPI** (etapa 09a concluída): script ETL `backend/scripts/etl_sinapi.py` que parseia e persiste dados SINAPI versionados com `sinapiRef` (ex: `2026-04`)
- **Tabelas Azure**: `InsumoSINAPI` e `ComposicaoAnalitica` populadas via ETL manual
- **Versão ativa**: configurada em `ParametrosGlobais.sinapiRefAtiva`, consultada pelos cálculos
- **Orçamentos entregues**: campo `sinapiRef` em `Orcamento` registra qual versão foi usada no cálculo

**Problema:** Novas versões SINAPI são publicadas mensalmente pela Caixa Econômica Federal, mas o sistema atual exige intervenção manual (download, execução do ETL, ativação da versão). Orçamentos abertos podem ficar desatualizados sem que os usuários saibam.

**Solução:** Criar subsistema automatizado de monitoramento (Azure Function Timer Trigger) que detecta novas publicações, executa ETL automaticamente, notifica administradores e oferece revalidação de orçamentos abertos.

**Arquivos que serão criados:**
- `backend/functions/sinapi_watcher/__init__.py` — Azure Function Timer Trigger (execução diária)
- `backend/functions/sinapi_watcher/function.json` — configuração da Function (cron daily)
- `backend/app/services/sinapi_watcher_service.py` — lógica de detecção e notificação
- `backend/app/models/sinapi_publicacao.py` — modelo de metadados de publicação SINAPI
- `backend/app/repositories/sinapi_publicacao_repository.py` — histórico de publicações detectadas
- `backend/docs/sinapi_watcher.md` — documentação do watcher

**Arquivos que serão modificados:**
- `backend/app/routers/sinapi.py` — adicionar endpoints de notificação e revalidação
- `backend/app/routers/orcamentos.py` — adicionar flag `sinapiAtualizacaoDisponivel` ao GET
- `backend/docs/schemas.md` — documentar tabela `SINAPIPublicacao`
- `frontend/components/OrcamentoWizard.tsx` — exibir banner de revalidação se flag ativa
- `deploy.sh` — provisionar Azure Function App

## Pré-requisitos

- Etapa alfa-01 concluída (Storage Account provisionado)
- Etapa alfa-02 concluída (schemas documentados)
- Etapa alfa-03 concluída (repositórios implementados)
- Etapa alfa-09a concluída (ETL SINAPI implementado)
- Etapa alfa-11b concluída (notificações email via Azure Communication Services)

## Entregáveis

Ao final desta etapa, devem existir:

1. **Azure Function Timer Trigger** em `backend/functions/sinapi_watcher/`:
   - Execução diária às 03:00 UTC (cron: `0 0 3 * * *`)
   - Faz polling na página oficial da Caixa (URL configurável via `CM_SINAPI_WATCHER_URL`)
   - Detecta novas versões por parsing HTML ou checksum de arquivos
   - Baixa arquivos ISE e composições se versão inédita detectada
   - Chama ETL automaticamente via `etl_sinapi.executar_etl()`
   - Registra execução em tabela `SINAPIPublicacao`
   - Envia notificação email para admins se nova versão ingerida

2. **Tabela Azure `SINAPIPublicacao`**:
   - **PartitionKey**: `{tenantId}#SINAPI_PUB`
   - **RowKey**: `{sinapiRef}` (ex: `2026-04`)
   - Colunas: `sinapiRef`, `dataPublicacao`, `dataDeteccao`, `dataIngestao`, `status`, `urlISE`, `urlComposicoes`, `checksumISE`, `checksumComposicoes`, `logJson`, `createdAt`, `updatedAt`
   - Status: `DETECTADA`, `BAIXANDO`, `PROCESSANDO`, `INGERIDA`, `ERRO`

3. **Serviço de detecção** em `backend/app/services/sinapi_watcher_service.py`:
   - `detectar_nova_versao()` — parsing da página oficial, retorna `sinapiRef` se nova
   - `baixar_arquivos(sinapi_ref, url_ise, url_composicoes)` — download idempotente com retry
   - `validar_checksum(arquivo, checksum_esperado)` — valida integridade
   - `executar_ingestao_automatica(sinapi_ref, arquivo_ise, arquivo_composicoes)` — chama ETL
   - `notificar_admins(sinapi_ref, resultado)` — envia email via Communication Services
   - `marcar_orcamentos_para_revalidacao(sinapi_ref_antiga, sinapi_ref_nova)` — atualiza flag em orçamentos abertos

4. **Endpoints de revalidação** em `backend/app/routers/sinapi.py`:
   - `GET /api/sinapi/publicacoes` — lista histórico de publicações detectadas
   - `GET /api/sinapi/publicacao/{sinapiRef}` — detalhes de uma publicação específica
   - `POST /api/sinapi/revalidar-orcamento/{orcamentoId}` — recalcula orçamento com versão ativa, atualiza `sinapiRef` e remove flag `sinapiAtualizacaoDisponivel`

5. **Flag de revalidação em orçamentos**:
   - Adicionar campo `sinapiAtualizacaoDisponivel` (bool) em `Orcamento`
   - Documentar em `backend/docs/schemas.md`
   - Modificar `GET /api/orcamentos/{id}` para incluir flag no retorno
   - Modificar `POST /api/sinapi/revalidar-orcamento/{id}` para remover flag após revalidação

6. **Banner no frontend**:
   - Modificar `frontend/components/OrcamentoWizard.tsx` para exibir alert amarelo se `orcamento.sinapiAtualizacaoDisponivel === true`
   - Texto: "Nova versão SINAPI disponível (AAAA-MM). [Recalcular orçamento]"
   - Botão chama `POST /api/sinapi/revalidar-orcamento/{id}`, recarrega orçamento após sucesso

7. **Provisionamento Azure Function**:
   - Modificar `deploy.sh` para criar Function App (plan Consumption)
   - Configurar variáveis de ambiente:
     - `CM_SINAPI_WATCHER_URL` — URL da página oficial da Caixa
     - `CM_SINAPI_WATCHER_ENABLED` — flag on/off (padrão: `true`)
     - `CM_SINAPI_ADMIN_EMAILS` — lista de emails para notificação (separado por vírgula)
   - Deploy da Function via `func azure functionapp publish`

8. **Documentação** em `backend/docs/sinapi_watcher.md`:
   - Fluxo completo do watcher (detecção → download → validação → ingestão → notificação → revalidação)
   - Configuração de credenciais para download (se página exigir autenticação)
   - Política de retry e timeout
   - Exemplos de logs de execução
   - Troubleshooting (página offline, checksum divergente, ETL falha)

## Implementação

### 1. Criar tabela `SINAPIPublicacao`

Adicionar schema em `backend/docs/schemas.md`:

```markdown
## Tabela: SINAPIPublicacao

**Descrição:** Histórico de versões SINAPI detectadas e ingeridas pelo watcher.

**PartitionKey:** `{tenantId}#SINAPI_PUB`  
**RowKey:** `{sinapiRef}` (ex: `2026-04`)

### Colunas

| Coluna | Tipo Azure | Obrigatório | Notas |
|--------|-----------|-------------|-------|
| `PartitionKey` | string | Sim | `default#SINAPI_PUB` |
| `RowKey` | string | Sim | sinapiRef (ex: `2026-04`) |
| `sinapiRef` | string | Sim | Referência mensal (duplicado) |
| `dataPublicacao` | string | Não | ISO 8601 UTC da publicação oficial |
| `dataDeteccao` | string | Sim | ISO 8601 UTC da detecção pelo watcher |
| `dataIngestao` | string | Não | ISO 8601 UTC da conclusão da ingestão |
| `status` | string | Sim | `DETECTADA`, `BAIXANDO`, `PROCESSANDO`, `INGERIDA`, `ERRO` |
| `urlISE` | string | Não | URL do arquivo ISE baixado |
| `urlComposicoes` | string | Não | URL do arquivo de composições baixado |
| `checksumISE` | string | Não | SHA256 do arquivo ISE |
| `checksumComposicoes` | string | Não | SHA256 do arquivo de composições |
| `logJson` | string | Não | JSON com log de execução (erros, warnings, total de registros) |
| `createdAt` | string | Sim | ISO 8601 UTC |
| `updatedAt` | string | Sim | ISO 8601 UTC |
```

### 2. Criar modelo e repositório

Criar `backend/app/models/sinapi_publicacao.py`:

```python
from typing import Optional, Dict, Any

class SINAPIPublicacao:
    def __init__(
        self,
        sinapi_ref: str,
        status: str,
        data_deteccao: str,
        data_publicacao: Optional[str] = None,
        data_ingestao: Optional[str] = None,
        url_ise: Optional[str] = None,
        url_composicoes: Optional[str] = None,
        checksum_ise: Optional[str] = None,
        checksum_composicoes: Optional[str] = None,
        log: Optional[Dict[str, Any]] = None
    ):
        self.sinapi_ref = sinapi_ref
        self.status = status
        self.data_publicacao = data_publicacao
        self.data_deteccao = data_deteccao
        self.data_ingestao = data_ingestao
        self.url_ise = url_ise
        self.url_composicoes = url_composicoes
        self.checksum_ise = checksum_ise
        self.checksum_composicoes = checksum_composicoes
        self.log = log or {}
```

Criar `backend/app/repositories/sinapi_publicacao_repository.py`:

```python
from typing import Dict, Any, Optional
from app.repositories.base_repository import BaseRepository
from app.utils.config import CM_TENANT_ID_DEFAULT
from app.utils.helpers import create_response, create_error_response, get_current_timestamp
import json

class SINAPIPublicacaoRepository(BaseRepository):
    def __init__(self):
        super().__init__("SINAPIPublicacao")
    
    def create_publicacao(
        self,
        sinapi_ref: str,
        status: str,
        data_deteccao: str,
        url_ise: Optional[str] = None,
        url_composicoes: Optional[str] = None,
        tenant_id: str = CM_TENANT_ID_DEFAULT
    ) -> Dict[str, Any]:
        partition_key = f"{tenant_id}#SINAPI_PUB"
        row_key = sinapi_ref
        
        entity = {
            "PartitionKey": partition_key,
            "RowKey": row_key,
            "sinapiRef": sinapi_ref,
            "status": status,
            "dataDeteccao": data_deteccao,
            "urlISE": url_ise,
            "urlComposicoes": url_composicoes,
            "createdAt": get_current_timestamp(),
            "updatedAt": get_current_timestamp()
        }
        
        return self.create(entity)
    
    def update_status(
        self,
        sinapi_ref: str,
        status: str,
        log: Optional[Dict[str, Any]] = None,
        data_ingestao: Optional[str] = None,
        tenant_id: str = CM_TENANT_ID_DEFAULT
    ) -> Dict[str, Any]:
        partition_key = f"{tenant_id}#SINAPI_PUB"
        row_key = sinapi_ref
        
        updates = {
            "status": status,
            "updatedAt": get_current_timestamp()
        }
        
        if log:
            updates["logJson"] = json.dumps(log)
        if data_ingestao:
            updates["dataIngestao"] = data_ingestao
        
        return self.update_partial(partition_key, row_key, updates)
    
    def get_by_sinapi_ref(self, sinapi_ref: str, tenant_id: str = CM_TENANT_ID_DEFAULT) -> Dict[str, Any]:
        partition_key = f"{tenant_id}#SINAPI_PUB"
        return self.get(partition_key, sinapi_ref)
    
    def list_all_publicacoes(self, tenant_id: str = CM_TENANT_ID_DEFAULT) -> Dict[str, Any]:
        partition_key = f"{tenant_id}#SINAPI_PUB"
        return self.list_all(partition_key)
```

### 3. Criar serviço de watcher

Criar `backend/app/services/sinapi_watcher_service.py`:

```python
import requests
import hashlib
import os
from bs4 import BeautifulSoup
from typing import Optional, Dict, Any, Tuple
from app.repositories.sinapi_publicacao_repository import SINAPIPublicacaoRepository
from app.services.sinapi_service import listar_versoes
from app.utils.helpers import get_current_timestamp, create_response, create_error_response
from app.utils.config import CM_SINAPI_WATCHER_URL, CM_SINAPI_ADMIN_EMAILS
from scripts.etl_sinapi import executar_etl

def detectar_nova_versao() -> Optional[Tuple[str, str, str]]:
    try:
        response = requests.get(CM_SINAPI_WATCHER_URL, timeout=30)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, "html.parser")
        
        links_ise = soup.find_all("a", href=lambda x: x and "ISE" in x and ".xlsx" in x)
        links_composicoes = soup.find_all("a", href=lambda x: x and "COMPOSICOES" in x and ".xlsx" in x)
        
        if not links_ise or not links_composicoes:
            return None
        
        url_ise = links_ise[0]["href"]
        url_composicoes = links_composicoes[0]["href"]
        
        sinapi_ref_match = re.search(r"(\d{4})-(\d{2})", url_ise)
        if not sinapi_ref_match:
            return None
        
        sinapi_ref = f"{sinapi_ref_match.group(1)}-{sinapi_ref_match.group(2)}"
        
        result = listar_versoes()
        if result.get("status") == "error":
            return sinapi_ref, url_ise, url_composicoes
        
        versoes_existentes = result["data"].get("versoes", [])
        if sinapi_ref in versoes_existentes:
            return None
        
        return sinapi_ref, url_ise, url_composicoes
    
    except Exception as e:
        print(f"Erro ao detectar nova versão: {str(e)}")
        return None

def baixar_arquivo(url: str, destino: str) -> bool:
    try:
        response = requests.get(url, timeout=60, stream=True)
        response.raise_for_status()
        
        with open(destino, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        return True
    except Exception as e:
        print(f"Erro ao baixar {url}: {str(e)}")
        return False

def calcular_checksum(arquivo: str) -> str:
    sha256 = hashlib.sha256()
    with open(arquivo, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            sha256.update(chunk)
    return sha256.hexdigest()

def executar_ingestao_automatica(sinapi_ref: str, arquivo_ise: str, arquivo_composicoes: str) -> Dict[str, Any]:
    try:
        repo = SINAPIPublicacaoRepository()
        repo.update_status(sinapi_ref, "PROCESSANDO")
        
        executar_etl(arquivo_ise, arquivo_composicoes, sinapi_ref, dry_run=False)
        
        repo.update_status(
            sinapi_ref,
            "INGERIDA",
            log={"ingerido_em": get_current_timestamp()},
            data_ingestao=get_current_timestamp()
        )
        
        return create_response("success", {"sinapiRef": sinapi_ref})
    
    except Exception as e:
        repo = SINAPIPublicacaoRepository()
        repo.update_status(
            sinapi_ref,
            "ERRO",
            log={"erro": str(e), "timestamp": get_current_timestamp()}
        )
        return create_error_response(str(e))

def notificar_admins(sinapi_ref: str, resultado: Dict[str, Any]):
    emails = CM_SINAPI_ADMIN_EMAILS.split(",")
    
    if resultado.get("status") == "success":
        subject = f"Nova versão SINAPI ingerida: {sinapi_ref}"
        body = f"A versão SINAPI {sinapi_ref} foi detectada, baixada e ingerida com sucesso."
    else:
        subject = f"Erro ao ingerir SINAPI {sinapi_ref}"
        body = f"Erro ao processar versão {sinapi_ref}: {resultado.get('error', 'Desconhecido')}"
    
    for email in emails:
        enviar_email(email.strip(), subject, body)

def marcar_orcamentos_para_revalidacao(sinapi_ref_antiga: str, sinapi_ref_nova: str):
    from app.repositories.orcamento_repository import OrcamentoRepository
    
    repo = OrcamentoRepository()
    result = repo.query(f"sinapiRef eq '{sinapi_ref_antiga}' and status ne 'entregue'", max_results=5000)
    
    if result.get("status") == "error":
        return
    
    orcamentos = result.get("data", [])
    for orc in orcamentos:
        repo.update_partial(
            orc["PartitionKey"],
            orc["RowKey"],
            {"sinapiAtualizacaoDisponivel": True}
        )
```

### 4. Criar Azure Function Timer Trigger

Criar `backend/functions/sinapi_watcher/__init__.py`:

```python
import datetime
import logging
import azure.functions as func
from app.services.sinapi_watcher_service import (
    detectar_nova_versao,
    baixar_arquivo,
    calcular_checksum,
    executar_ingestao_automatica,
    notificar_admins,
    marcar_orcamentos_para_revalidacao
)
from app.repositories.sinapi_publicacao_repository import SINAPIPublicacaoRepository
from app.utils.helpers import get_current_timestamp
from app.utils.config import CM_SINAPI_WATCHER_ENABLED
import os

def main(mytimer: func.TimerRequest) -> None:
    logging.info("SINAPI Watcher iniciado")
    
    if not CM_SINAPI_WATCHER_ENABLED or CM_SINAPI_WATCHER_ENABLED.lower() != "true":
        logging.info("Watcher desabilitado via CM_SINAPI_WATCHER_ENABLED")
        return
    
    resultado = detectar_nova_versao()
    if not resultado:
        logging.info("Nenhuma nova versão detectada")
        return
    
    sinapi_ref, url_ise, url_composicoes = resultado
    logging.info(f"Nova versão detectada: {sinapi_ref}")
    
    repo = SINAPIPublicacaoRepository()
    repo.create_publicacao(
        sinapi_ref=sinapi_ref,
        status="DETECTADA",
        data_deteccao=get_current_timestamp(),
        url_ise=url_ise,
        url_composicoes=url_composicoes
    )
    
    repo.update_status(sinapi_ref, "BAIXANDO")
    
    temp_dir = "/tmp/sinapi"
    os.makedirs(temp_dir, exist_ok=True)
    
    arquivo_ise = os.path.join(temp_dir, f"ise_{sinapi_ref}.xlsx")
    arquivo_composicoes = os.path.join(temp_dir, f"composicoes_{sinapi_ref}.xlsx")
    
    if not baixar_arquivo(url_ise, arquivo_ise):
        repo.update_status(sinapi_ref, "ERRO", log={"erro": "Falha ao baixar ISE"})
        return
    
    if not baixar_arquivo(url_composicoes, arquivo_composicoes):
        repo.update_status(sinapi_ref, "ERRO", log={"erro": "Falha ao baixar composições"})
        return
    
    checksum_ise = calcular_checksum(arquivo_ise)
    checksum_composicoes = calcular_checksum(arquivo_composicoes)
    
    logging.info(f"Arquivos baixados - ISE: {checksum_ise}, Composições: {checksum_composicoes}")
    
    resultado = executar_ingestao_automatica(sinapi_ref, arquivo_ise, arquivo_composicoes)
    
    notificar_admins(sinapi_ref, resultado)
    
    if resultado.get("status") == "success":
        from app.services.sinapi_service import get_versao_ativa
        versao_antiga = get_versao_ativa()
        marcar_orcamentos_para_revalidacao(versao_antiga, sinapi_ref)
    
    os.remove(arquivo_ise)
    os.remove(arquivo_composicoes)
    
    logging.info("SINAPI Watcher concluído")
```

Criar `backend/functions/sinapi_watcher/function.json`:

```json
{
  "scriptFile": "__init__.py",
  "bindings": [
    {
      "name": "mytimer",
      "type": "timerTrigger",
      "direction": "in",
      "schedule": "0 0 3 * * *"
    }
  ]
}
```

### 5. Adicionar endpoints de revalidação

Modificar `backend/app/routers/sinapi.py`:

```python
@router.get("/sinapi/publicacoes")
async def listar_publicacoes() -> Dict[str, Any]:
    repo = SINAPIPublicacaoRepository()
    return repo.list_all_publicacoes()

@router.get("/sinapi/publicacao/{sinapiRef}")
async def get_publicacao(sinapiRef: str) -> Dict[str, Any]:
    repo = SINAPIPublicacaoRepository()
    result = repo.get_by_sinapi_ref(sinapiRef)
    if result.get("status") == "error":
        raise_http_error(404, "Publicação não encontrada")
    return result

@router.post("/sinapi/revalidar-orcamento/{orcamento_id}")
async def revalidar_orcamento(orcamento_id: str, current_user: dict = Depends(require_permission("/orcamentos", "write"))) -> Dict[str, Any]:
    from app.repositories.orcamento_repository import OrcamentoRepository
    from app.services.sinapi_service import get_versao_ativa
    
    repo_orc = OrcamentoRepository()
    result = repo_orc.get_by_id(orcamento_id)
    
    if result.get("status") == "error":
        raise_http_error(404, "Orçamento não encontrado")
    
    orcamento = result["data"]
    versao_ativa = get_versao_ativa()
    
    repo_orc.update_partial(
        orcamento["PartitionKey"],
        orcamento["RowKey"],
        {
            "sinapiRef": versao_ativa,
            "sinapiAtualizacaoDisponivel": False,
            "updatedAt": get_current_timestamp()
        }
    )
    
    return create_response("success", {"sinapiRef": versao_ativa, "orcamentoId": orcamento_id})
```

### 6. Adicionar flag no schema e repository

Adicionar em `backend/docs/schemas.md`, seção `Tabela: Orcamento`:

```markdown
| `sinapiRef` | string | string? | Não | Versão SINAPI usada no cálculo (ex: `2026-04`) |
| `sinapiAtualizacaoDisponivel` | bool | boolean? | Não | Flag indicando que nova versão SINAPI está disponível para revalidação |
```

### 7. Adicionar banner no frontend

Modificar `frontend/components/OrcamentoWizard.tsx`:

```tsx
{orcamento.sinapiAtualizacaoDisponivel && (
  <div className="alert alert-warning">
    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
    <span>Nova versão SINAPI disponível. Deseja recalcular o orçamento com os dados atualizados?</span>
    <button className="btn btn-sm btn-primary" onClick={handleRevalidarOrcamento}>
      Recalcular
    </button>
  </div>
)}
```

Adicionar função:

```tsx
const handleRevalidarOrcamento = async () => {
  try {
    await revalidarOrcamento(orcamento.id)
    toast.success('Orçamento recalculado com sucesso')
    window.location.reload()
  } catch (error) {
    toast.error('Erro ao recalcular orçamento')
  }
}
```

Adicionar em `frontend/lib/api.ts`:

```typescript
export async function revalidarOrcamento(orcamentoId: string) {
  const response = await fetchWithAuth(`${API_BASE_URL}/api/sinapi/revalidar-orcamento/${orcamentoId}`, {
    method: 'POST'
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error ?? 'Erro ao revalidar orçamento')
  }
  
  return await response.json()
}
```

### 8. Atualizar `deploy.sh` para provisionar Function App

Adicionar seção após provisionamento do backend:

```bash
log "Provisionando Azure Function App para watcher SINAPI..."
FUNCTION_APP="construbot-sinapi-watcher"
FUNCTION_STORAGE="construtobtwatcherstorage"

az storage account create \
  --name "$FUNCTION_STORAGE" \
  --resource-group "$RG" \
  --location "$LOCATION" \
  --sku Standard_LRS \
  --output none 2>/dev/null || true

az functionapp create \
  --name "$FUNCTION_APP" \
  --resource-group "$RG" \
  --storage-account "$FUNCTION_STORAGE" \
  --consumption-plan-location "$LOCATION" \
  --runtime python \
  --runtime-version 3.11 \
  --functions-version 4 \
  --os-type Linux \
  --output none 2>/dev/null || true

az functionapp config appsettings set \
  --name "$FUNCTION_APP" \
  --resource-group "$RG" \
  --settings \
    CM_SINAPI_WATCHER_URL="https://www.caixa.gov.br/site/paginas/downloads.aspx" \
    CM_SINAPI_WATCHER_ENABLED="true" \
    CM_SINAPI_ADMIN_EMAILS="admin@example.com" \
    CM_STORAGE_ACCOUNT_NAME="$STORAGE_ACCOUNT" \
    CM_STORAGE_ACCOUNT_URL="$STORAGE_URL" \
  --output none

ok "Function App provisionada: $FUNCTION_APP"
```

Deploy da function:

```bash
cd backend/functions
func azure functionapp publish $FUNCTION_APP --python
```

## Restrições

- Sem comentários no código
- Sem emojis
- Sem testes (apenas logs de execução)
- Variáveis de ambiente apenas em `backend/utils/config.py` com padrão `CM_[DOMINIO]_[NOME]`
- Parsing HTML deve ser robusto (tentar múltiplos seletores se estrutura da página mudar)
- Timeout de download: máximo 60 segundos por arquivo
- Retry de download: 3 tentativas com backoff exponencial
- Notificações email apenas para admins (não spam para clientes)

## Verificação

Ao concluir esta etapa:

1. Executar watcher manualmente:
   ```bash
   cd backend/functions/sinapi_watcher
   func start
   ```

2. Verificar detecção de nova versão:
   ```bash
   curl http://localhost:7071/admin/functions/sinapi_watcher
   ```

3. Verificar histórico de publicações:
   ```bash
   curl http://localhost:8000/api/sinapi/publicacoes
   ```

4. Verificar flag de revalidação:
   ```bash
   curl http://localhost:8000/api/orcamentos/{id}
   # Deve retornar "sinapiAtualizacaoDisponivel": true se nova versão disponível
   ```

5. Testar revalidação:
   ```bash
   curl -X POST http://localhost:8000/api/sinapi/revalidar-orcamento/{id} -H "Authorization: Bearer {token}"
   ```

6. Verificar banner no frontend acessando orçamento aberto com flag ativa
