from typing import Dict, Any, Optional

from app.repositories.base_repository import BaseRepository
from app.utils.config import CM_TABLE_GRUPOS_ENCARGOS, CM_TENANT_ID_DEFAULT
from app.utils.table_helpers import build_partition_key, generate_row_key
from app.utils.helpers import create_response, create_error_response, get_current_timestamp

class GruposEncargosRepository(BaseRepository):
    def __init__(self):
        super().__init__(CM_TABLE_GRUPOS_ENCARGOS)
    
    def create_versao(
        self,
        versao: str,
        grupos: dict,
        ativo: bool = False,
        tenant_id: str = CM_TENANT_ID_DEFAULT,
        user_email: Optional[str] = None
    ) -> Dict[str, Any]:
        grupos_id = generate_row_key()
        partition_key = build_partition_key(tenant_id, "GRUPOS_ENC")
        
        entity = {
            "PartitionKey": partition_key,
            "RowKey": grupos_id,
            "versao": versao,
            "gruposJson": grupos,
            "ativo": ativo,
            "dataVersao": get_current_timestamp()
        }
        
        return self.create(entity, user_email)
    
    def get_current(self, tenant_id: str = CM_TENANT_ID_DEFAULT) -> Dict[str, Any]:
        partition_key = build_partition_key(tenant_id, "GRUPOS_ENC")
        filter_query = f"PartitionKey eq '{partition_key}' and ativo eq true"
        
        result = self.query(filter_query, max_results=1)
        if result.get("status") == "error":
            return result
        
        data = result.get("data", [])
        if not data:
            return create_error_response("Nenhuma versão ativa encontrada")
        
        return create_response("success", data[0])
    
    def get_by_versao(self, versao: str, tenant_id: str = CM_TENANT_ID_DEFAULT) -> Dict[str, Any]:
        partition_key = build_partition_key(tenant_id, "GRUPOS_ENC")
        filter_query = f"PartitionKey eq '{partition_key}' and versao eq '{versao}'"
        
        result = self.query(filter_query, max_results=1)
        if result.get("status") == "error":
            return result
        
        data = result.get("data", [])
        if not data:
            return create_error_response("Versão não encontrada")
        
        return create_response("success", data[0])
