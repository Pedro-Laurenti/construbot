from typing import Dict, Any, Optional

from app.repositories.base_repository import BaseRepository
from app.utils.config import CM_TABLE_COMPOSICAO_PROFISSIONAL, CM_TENANT_ID_DEFAULT
from app.utils.table_helpers import build_partition_key, generate_row_key
from app.utils.helpers import create_response, create_error_response

class ComposicaoProfissionalRepository(BaseRepository):
    def __init__(self):
        super().__init__(CM_TABLE_COMPOSICAO_PROFISSIONAL)
    
    def create_composicao(
        self,
        nome: str,
        categoria: str,
        ref_sinapi: Optional[str] = None,
        composicao: Optional[dict] = None,
        tenant_id: str = CM_TENANT_ID_DEFAULT,
        user_email: Optional[str] = None
    ) -> Dict[str, Any]:
        composicao_id = generate_row_key()
        partition_key = build_partition_key(tenant_id, "COMP_PROF")
        
        entity = {
            "PartitionKey": partition_key,
            "RowKey": composicao_id,
            "nome": nome,
            "categoria": categoria
        }
        
        if ref_sinapi:
            entity["refSinapi"] = ref_sinapi
        
        if composicao:
            entity["composicaoJson"] = composicao
        
        return self.create(entity, user_email)
    
    def get_by_id(self, composicao_id: str, tenant_id: str = CM_TENANT_ID_DEFAULT) -> Dict[str, Any]:
        partition_key = build_partition_key(tenant_id, "COMP_PROF")
        return self.get(partition_key, composicao_id)
    
    def list_by_categoria(self, categoria: str, tenant_id: str = CM_TENANT_ID_DEFAULT) -> Dict[str, Any]:
        partition_key = build_partition_key(tenant_id, "COMP_PROF")
        filter_query = f"PartitionKey eq '{partition_key}' and categoria eq '{categoria}'"
        return self.query(filter_query)
    
    def get_by_ref_sinapi(self, ref_sinapi: str, tenant_id: str = CM_TENANT_ID_DEFAULT) -> Dict[str, Any]:
        partition_key = build_partition_key(tenant_id, "COMP_PROF")
        filter_query = f"PartitionKey eq '{partition_key}' and refSinapi eq '{ref_sinapi}'"
        
        result = self.query(filter_query, max_results=1)
        if result.get("status") == "error":
            return result
        
        data = result.get("data", [])
        if not data:
            return create_error_response("Composição não encontrada")
        
        return create_response("success", data[0])
