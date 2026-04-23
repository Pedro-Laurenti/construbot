from typing import Dict, Any, Optional

from app.repositories.base_repository import BaseRepository
from app.utils.config import CM_TABLE_ORCAMENTO_ENGENHEIRO, CM_TENANT_ID_DEFAULT
from app.utils.table_helpers import build_partition_key, generate_row_key
from app.utils.helpers import create_response, create_error_response, get_current_timestamp

class OrcamentoEngenheiroRepository(BaseRepository):
    def __init__(self):
        super().__init__(CM_TABLE_ORCAMENTO_ENGENHEIRO)
    
    def create_orcamento_eng(
        self,
        orcamento_cliente_id: str,
        etapa: str,
        dados_completos: dict,
        tenant_id: str = CM_TENANT_ID_DEFAULT,
        user_email: Optional[str] = None
    ) -> Dict[str, Any]:
        orcamento_eng_id = generate_row_key()
        partition_key = build_partition_key(tenant_id, "ORCAMENTO_ENG")
        
        entity = {
            "PartitionKey": partition_key,
            "RowKey": orcamento_eng_id,
            "orcamentoClienteId": orcamento_cliente_id,
            "etapa": etapa,
            "dadosCompletosJson": dados_completos,
            "dataInicio": get_current_timestamp()
        }
        
        return self.create(entity, user_email)
    
    def get_by_orcamento_cliente_id(
        self,
        orcamento_cliente_id: str,
        tenant_id: str = CM_TENANT_ID_DEFAULT
    ) -> Dict[str, Any]:
        partition_key = build_partition_key(tenant_id, "ORCAMENTO_ENG")
        filter_query = f"PartitionKey eq '{partition_key}' and orcamentoClienteId eq '{orcamento_cliente_id}'"
        
        result = self.query(filter_query, max_results=1)
        if result.get("status") == "error":
            return result
        
        data = result.get("data", [])
        if not data:
            return create_error_response("Orçamento engenheiro não encontrado")
        
        return create_response("success", data[0])
    
    def update_etapa(
        self,
        orcamento_eng_id: str,
        etapa: str,
        tenant_id: str = CM_TENANT_ID_DEFAULT,
        user_email: Optional[str] = None
    ) -> Dict[str, Any]:
        partition_key = build_partition_key(tenant_id, "ORCAMENTO_ENG")
        result = self.get(partition_key, orcamento_eng_id)
        
        if result.get("status") == "error":
            return result
        
        entity = result.get("data")
        entity["etapa"] = etapa
        
        return self.update(entity, user_email)
    
    def list_by_etapa(self, etapa: str, tenant_id: str = CM_TENANT_ID_DEFAULT) -> Dict[str, Any]:
        partition_key = build_partition_key(tenant_id, "ORCAMENTO_ENG")
        filter_query = f"PartitionKey eq '{partition_key}' and etapa eq '{etapa}'"
        return self.query(filter_query)
