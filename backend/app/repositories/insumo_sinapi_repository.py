from typing import Dict, Any, Optional

from app.repositories.base_repository import BaseRepository
from app.utils.config import CM_TABLE_INSUMO_SINAPI, CM_TENANT_ID_DEFAULT
from app.utils.table_helpers import build_partition_key, generate_row_key
from app.utils.helpers import create_response, create_error_response

class InsumoSINAPIRepository(BaseRepository):
    def __init__(self):
        super().__init__(CM_TABLE_INSUMO_SINAPI)
    
    def create_insumo(
        self,
        codigo: str,
        descricao: str,
        unidade: str,
        preco: float,
        classificacao: str,
        sinapi_ref: str,
        tenant_id: str = CM_TENANT_ID_DEFAULT,
        user_email: Optional[str] = None
    ) -> Dict[str, Any]:
        insumo_id = generate_row_key()
        partition_key = f"{sinapi_ref}#{classificacao}"
        
        entity = {
            "PartitionKey": partition_key,
            "RowKey": insumo_id,
            "codigo": codigo,
            "descricao": descricao,
            "unidade": unidade,
            "preco": preco,
            "classificacao": classificacao,
            "sinapiRef": sinapi_ref
        }
        
        return self.create(entity, user_email)
    
    def get_by_codigo(
        self,
        codigo: str,
        sinapi_ref: str,
        classificacao: str
    ) -> Dict[str, Any]:
        partition_key = f"{sinapi_ref}#{classificacao}"
        filter_query = f"PartitionKey eq '{partition_key}' and codigo eq '{codigo}'"
        
        result = self.query(filter_query, max_results=1)
        if result.get("status") == "error":
            return result
        
        data = result.get("data", [])
        if not data:
            return create_error_response("Insumo não encontrado")
        
        return create_response("success", data[0])
    
    def list_by_classificacao(self, classificacao: str, sinapi_ref: str) -> Dict[str, Any]:
        partition_key = f"{sinapi_ref}#{classificacao}"
        return self.list_all(partition_key)
    
    def list_by_sinapi_ref(self, sinapi_ref: str) -> Dict[str, Any]:
        filter_query = f"sinapiRef eq '{sinapi_ref}'"
        return self.query(filter_query, max_results=5000)
