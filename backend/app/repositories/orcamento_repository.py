from typing import Dict, Any, Optional

from app.repositories.base_repository import BaseRepository
from app.utils.config import CM_TABLE_ORCAMENTO, CM_TENANT_ID_DEFAULT
from app.utils.table_helpers import build_partition_key, generate_row_key
from app.utils.helpers import create_response, create_error_response, get_current_timestamp

class OrcamentoRepository(BaseRepository):
    def __init__(self):
        super().__init__(CM_TABLE_ORCAMENTO)
    
    def create_orcamento(
        self,
        cliente_id: str,
        status: str,
        items: list,
        valor_total: float,
        data_criacao: Optional[str] = None,
        tenant_id: str = CM_TENANT_ID_DEFAULT,
        user_email: Optional[str] = None
    ) -> Dict[str, Any]:
        orcamento_id = generate_row_key()
        partition_key = build_partition_key(tenant_id, "ORCAMENTO")
        
        entity = {
            "PartitionKey": partition_key,
            "RowKey": orcamento_id,
            "clienteId": cliente_id,
            "status": status,
            "itemsJson": items,
            "valorTotal": valor_total,
            "dataCriacao": data_criacao or get_current_timestamp()
        }
        
        return self.create(entity, user_email)
    
    def get_by_id(self, orcamento_id: str, tenant_id: str = CM_TENANT_ID_DEFAULT) -> Dict[str, Any]:
        partition_key = build_partition_key(tenant_id, "ORCAMENTO")
        return self.get(partition_key, orcamento_id)
    
    def list_by_cliente(self, cliente_id: str, tenant_id: str = CM_TENANT_ID_DEFAULT) -> Dict[str, Any]:
        partition_key = build_partition_key(tenant_id, "ORCAMENTO")
        filter_query = f"PartitionKey eq '{partition_key}' and clienteId eq '{cliente_id}'"
        return self.query(filter_query)
    
    def update_status(
        self,
        orcamento_id: str,
        status: str,
        tenant_id: str = CM_TENANT_ID_DEFAULT,
        user_email: Optional[str] = None
    ) -> Dict[str, Any]:
        partition_key = build_partition_key(tenant_id, "ORCAMENTO")
        result = self.get(partition_key, orcamento_id)
        
        if result.get("status") == "error":
            return result
        
        entity = result.get("data")
        entity["status"] = status
        
        return self.update(entity, user_email)
