from typing import Dict, Any, Optional, List
from app.utils.table_client import get_table_client
from app.utils.config import CM_TENANT_ID_DEFAULT
from app.utils.helpers import get_current_timestamp
import json

class SINAPIPublicacaoRepository:
    def __init__(self):
        self.table_client = get_table_client("SINAPIPublicacao")
    
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
            "createdAt": get_current_timestamp(),
            "updatedAt": get_current_timestamp()
        }
        
        if url_ise:
            entity["urlISE"] = url_ise
        if url_composicoes:
            entity["urlComposicoes"] = url_composicoes
        
        try:
            self.table_client.create_entity(entity)
            return entity
        except Exception as e:
            raise Exception(f"Erro ao criar publicação: {str(e)}")
    
    def update_status(
        self,
        sinapi_ref: str,
        status: str,
        log: Optional[Dict[str, Any]] = None,
        data_ingestao: Optional[str] = None,
        checksum_ise: Optional[str] = None,
        checksum_composicoes: Optional[str] = None,
        tenant_id: str = CM_TENANT_ID_DEFAULT
    ) -> Dict[str, Any]:
        partition_key = f"{tenant_id}#SINAPI_PUB"
        row_key = sinapi_ref
        
        try:
            entity = self.table_client.get_entity(partition_key, row_key)
            entity["status"] = status
            entity["updatedAt"] = get_current_timestamp()
            
            if log:
                entity["logJson"] = json.dumps(log, ensure_ascii=False)
            if data_ingestao:
                entity["dataIngestao"] = data_ingestao
            if checksum_ise:
                entity["checksumISE"] = checksum_ise
            if checksum_composicoes:
                entity["checksumComposicoes"] = checksum_composicoes
            
            self.table_client.update_entity(entity, mode="merge")
            return entity
        except Exception as e:
            raise Exception(f"Erro ao atualizar status: {str(e)}")
    
    def get_by_sinapi_ref(self, sinapi_ref: str, tenant_id: str = CM_TENANT_ID_DEFAULT) -> Optional[Dict[str, Any]]:
        partition_key = f"{tenant_id}#SINAPI_PUB"
        
        try:
            entity = self.table_client.get_entity(partition_key, sinapi_ref)
            return entity
        except Exception:
            return None
    
    def list_all_publicacoes(self, tenant_id: str = CM_TENANT_ID_DEFAULT) -> List[Dict[str, Any]]:
        partition_key = f"{tenant_id}#SINAPI_PUB"
        
        try:
            entities = self.table_client.query_entities(f"PartitionKey eq '{partition_key}'")
            return list(entities)
        except Exception as e:
            raise Exception(f"Erro ao listar publicações: {str(e)}")
