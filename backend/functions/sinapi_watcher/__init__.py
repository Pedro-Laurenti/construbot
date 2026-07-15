import datetime
import logging
import azure.functions as func
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

from app.services.sinapi_watcher_service import (
    detectar_nova_versao,
    baixar_arquivo,
    calcular_checksum,
    executar_ingestao_automatica,
    notificar_admins,
    marcar_orcamentos_para_revalidacao
)
from app.repositories.sinapi_publicacao_repository import SINAPIPublicacaoRepository
from app.services.sinapi_service import get_versao_ativa
from app.utils.helpers import get_current_timestamp
from app.utils.config import CM_SINAPI_WATCHER_ENABLED

def main(mytimer: func.TimerRequest) -> None:
    logging.info("SINAPI Watcher iniciado")
    
    if not CM_SINAPI_WATCHER_ENABLED or CM_SINAPI_WATCHER_ENABLED.lower() != "true":
        logging.info("Watcher desabilitado via CM_SINAPI_WATCHER_ENABLED")
        return
    
    resultado_deteccao = detectar_nova_versao()
    if not resultado_deteccao:
        logging.info("Nenhuma nova versão detectada")
        return
    
    sinapi_ref, url_ise, url_composicoes = resultado_deteccao
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
        logging.error("Falha ao baixar arquivo ISE")
        return
    
    if not baixar_arquivo(url_composicoes, arquivo_composicoes):
        repo.update_status(sinapi_ref, "ERRO", log={"erro": "Falha ao baixar composições"})
        logging.error("Falha ao baixar arquivo de composições")
        return
    
    checksum_ise = calcular_checksum(arquivo_ise)
    checksum_composicoes = calcular_checksum(arquivo_composicoes)
    
    repo.update_status(
        sinapi_ref,
        "BAIXANDO",
        checksum_ise=checksum_ise,
        checksum_composicoes=checksum_composicoes
    )
    
    logging.info(f"Arquivos baixados - ISE: {checksum_ise}, Composições: {checksum_composicoes}")
    
    resultado = executar_ingestao_automatica(sinapi_ref, arquivo_ise, arquivo_composicoes)
    
    notificar_admins(sinapi_ref, resultado)
    
    if resultado.get("status") == "success":
        try:
            versao_antiga = get_versao_ativa()
            marcar_orcamentos_para_revalidacao(versao_antiga, sinapi_ref)
        except Exception as e:
            logging.warning(f"Erro ao marcar orçamentos para revalidação: {str(e)}")
    
    try:
        os.remove(arquivo_ise)
        os.remove(arquivo_composicoes)
    except Exception:
        pass
    
    logging.info("SINAPI Watcher concluído")
