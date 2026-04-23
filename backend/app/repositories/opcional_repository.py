from typing import Dict, Any, Optional

from app.repositories.base_repository import BaseRepository
from app.utils.config import CM_TABLE_OPCIONAL, CM_TENANT_ID_DEFAULT
from app.utils.table_helpers import build_partition_key, generate_row_key
from app.utils.helpers import create_response, create_error_response

class OpcionalRepository(BaseRepository):
    def __init__(self):
        super().__init__(CM_TABLE_OPCIONAL)
    
    def create_opcional(
        self,
        nome: str,
        categoria: str,
        preco: float,
        descricao: Optional[str] = None,
        tenant_id: str = CM_TENANT_ID_DEFAULT,
        user_email: Optional[str] = None
    ) -> Dict[str, Any]:
        opcional_id = generate_row_key()
        partition_key = build_partition_key(tenant_id, "OPCIONAL")
        
        entity = {
            "PartitionKey": partition_key,
            "RowKey": opcional_id,
            "nome": nome,
            "categoria": categoria,
            "preco": preco
        }
        
        if descricao:
            entity["descricao"] = descricao
        
        return self.create(entity, user_email)
    
    def get_by_id(self, opcional_id: str, tenant_id: str = CM_TENANT_ID_DEFAULT) -> Dict[str, Any]:
        partition_key = build_partition_key(tenant_id, "OPCIONAL")
        return self.get(partition_key, opcional_id)
    
    def list_by_categoria(self, categoria: str, tenant_id: str = CM_TENANT_ID_DEFAULT) -> Dict[str, Any]:
        partition_key = build_partition_key(tenant_id, "OPCIONAL")
        filter_query = f"PartitionKey eq '{partition_key}' and categoria eq '{categoria}'"
        return self.query(filter_query)
