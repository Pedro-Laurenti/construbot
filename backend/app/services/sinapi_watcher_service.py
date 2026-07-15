import requests
import hashlib
import os
import re
from bs4 import BeautifulSoup
from typing import Optional, Dict, Any, Tuple, List
from app.repositories.sinapi_publicacao_repository import SINAPIPublicacaoRepository
from app.services.sinapi_service import listar_versoes
from app.utils.helpers import get_current_timestamp
from app.utils.config import CM_SINAPI_WATCHER_URL, CM_SINAPI_ADMIN_EMAILS

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
        
        versoes_existentes = listar_versoes()
        if sinapi_ref in versoes_existentes:
            return None
        
        return sinapi_ref, url_ise, url_composicoes
    
    except Exception as e:
        print(f"Erro ao detectar nova versão: {str(e)}")
        return None

def baixar_arquivo(url: str, destino: str, max_tentativas: int = 3) -> bool:
    for tentativa in range(max_tentativas):
        try:
            response = requests.get(url, timeout=60, stream=True)
            response.raise_for_status()
            
            with open(destino, "wb") as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            
            return True
        except Exception as e:
            print(f"Tentativa {tentativa + 1}/{max_tentativas} falhou ao baixar {url}: {str(e)}")
            if tentativa < max_tentativas - 1:
                import time
                time.sleep(2 ** tentativa)
    
    return False

def calcular_checksum(arquivo: str) -> str:
    sha256 = hashlib.sha256()
    with open(arquivo, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            sha256.update(chunk)
    return sha256.hexdigest()

def executar_ingestao_automatica(sinapi_ref: str, arquivo_ise: str, arquivo_composicoes: str) -> Dict[str, Any]:
    try:
        from scripts.etl_sinapi import executar_etl
        import argparse
        
        repo = SINAPIPublicacaoRepository()
        repo.update_status(sinapi_ref, "PROCESSANDO")
        
        args = argparse.Namespace(
            ise=arquivo_ise,
            composicoes=arquivo_composicoes,
            ref=sinapi_ref,
            dry_run=False
        )
        
        executar_etl(args)
        
        repo.update_status(
            sinapi_ref,
            "INGERIDA",
            log={"ingerido_em": get_current_timestamp()},
            data_ingestao=get_current_timestamp()
        )
        
        return {"status": "success", "sinapiRef": sinapi_ref}
    
    except Exception as e:
        repo = SINAPIPublicacaoRepository()
        repo.update_status(
            sinapi_ref,
            "ERRO",
            log={"erro": str(e), "timestamp": get_current_timestamp()}
        )
        return {"status": "error", "error": str(e)}

def notificar_admins(sinapi_ref: str, resultado: Dict[str, Any]):
    if not CM_SINAPI_ADMIN_EMAILS:
        print("Nenhum email de admin configurado para notificação")
        return
    
    emails = [e.strip() for e in CM_SINAPI_ADMIN_EMAILS.split(",")]
    
    if resultado.get("status") == "success":
        subject = f"Nova versão SINAPI ingerida: {sinapi_ref}"
        body = f"A versão SINAPI {sinapi_ref} foi detectada, baixada e ingerida com sucesso."
    else:
        subject = f"Erro ao ingerir SINAPI {sinapi_ref}"
        body = f"Erro ao processar versão {sinapi_ref}: {resultado.get('error', 'Desconhecido')}"
    
    print(f"Notificação: {subject} para {emails}")

def marcar_orcamentos_para_revalidacao(sinapi_ref_antiga: str, sinapi_ref_nova: str):
    from app.repositories.orcamento_repository import OrcamentoRepository
    from app.utils.table_client import get_table_client
    
    try:
        repo = OrcamentoRepository(get_table_client("Orcamento"))
        
        query_filter = f"sinapiRef eq '{sinapi_ref_antiga}' and status ne 'entregue'"
        entities = repo.table_client.query_entities(query_filter, results_per_page=5000)
        
        count = 0
        for entity in entities:
            entity["sinapiAtualizacaoDisponivel"] = True
            entity["updatedAt"] = get_current_timestamp()
            repo.table_client.update_entity(entity, mode="merge")
            count += 1
        
        print(f"{count} orçamentos marcados para revalidação")
        
    except Exception as e:
        print(f"Erro ao marcar orçamentos: {str(e)}")
