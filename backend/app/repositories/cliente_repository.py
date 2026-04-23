from typing import Dict, Any, Optional

from app.repositories.base_repository import BaseRepository
from app.utils.config import CM_TABLE_CLIENTE, CM_TENANT_ID_DEFAULT
from app.utils.table_helpers import build_partition_key, generate_row_key
from app.utils.helpers import create_response, create_error_response, get_current_timestamp

class ClienteRepository(BaseRepository):
    def __init__(self):
        super().__init__(CM_TABLE_CLIENTE)
    
    def create_cliente(
        self,
        nome: str,
        telefone: str,
        email: str,
        senha: Optional[str] = None,
        data_cadastro: Optional[str] = None,
        tenant_id: str = CM_TENANT_ID_DEFAULT,
        user_email: Optional[str] = None
    ) -> Dict[str, Any]:
        email_normalized = email.lower().strip()
        existing = self.get_by_email(email_normalized, tenant_id)
        if existing.get("status") == "success" and existing.get("data"):
            return create_error_response("Email já cadastrado")
        
        cliente_id = generate_row_key()
        partition_key = build_partition_key(tenant_id, "CLIENTE")
        
        entity = {
            "PartitionKey": partition_key,
            "RowKey": cliente_id,
            "nome": nome,
            "telefone": telefone,
            "email": email_normalized,
            "dataCadastro": data_cadastro or get_current_timestamp()
        }
        
        if senha:
            entity["senha"] = senha
        
        return self.create(entity, user_email)
    
    def get_by_email(self, email: str, tenant_id: str = CM_TENANT_ID_DEFAULT) -> Dict[str, Any]:
        email_normalized = email.lower().strip()
        partition_key = build_partition_key(tenant_id, "CLIENTE")
        filter_query = f"PartitionKey eq '{partition_key}' and email eq '{email_normalized}'"
        
        result = self.query(filter_query, max_results=1)
        if result.get("status") == "error":
            return result
        
        data = result.get("data", [])
        if not data:
            return create_error_response("Cliente não encontrado")
        
        return create_response("success", data[0])
    
    def get_by_id(self, cliente_id: str, tenant_id: str = CM_TENANT_ID_DEFAULT) -> Dict[str, Any]:
        partition_key = build_partition_key(tenant_id, "CLIENTE")
        return self.get(partition_key, cliente_id)
    
    def list_all_clientes(self, tenant_id: str = CM_TENANT_ID_DEFAULT) -> Dict[str, Any]:
        partition_key = build_partition_key(tenant_id, "CLIENTE")
        return self.list_all(partition_key)
