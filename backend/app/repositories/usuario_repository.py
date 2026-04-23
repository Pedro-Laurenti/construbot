from typing import Dict, Any, Optional

from app.repositories.base_repository import BaseRepository
from app.utils.config import CM_TABLE_USUARIO, CM_TENANT_ID_DEFAULT
from app.utils.table_helpers import build_partition_key, generate_row_key
from app.utils.helpers import create_response, create_error_response, get_current_timestamp

class UsuarioRepository(BaseRepository):
    def __init__(self):
        super().__init__(CM_TABLE_USUARIO)
    
    def create_usuario(
        self,
        nome: str,
        email: str,
        role: str,
        azure_ad_id: Optional[str] = None,
        tenant_id: str = CM_TENANT_ID_DEFAULT,
        user_email: Optional[str] = None
    ) -> Dict[str, Any]:
        email_normalized = email.lower().strip()
        existing = self.get_by_email(email_normalized, tenant_id)
        if existing.get("status") == "success" and existing.get("data"):
            return create_error_response("Email já cadastrado")
        
        usuario_id = generate_row_key()
        partition_key = build_partition_key(tenant_id, "USUARIO")
        
        entity = {
            "PartitionKey": partition_key,
            "RowKey": usuario_id,
            "nome": nome,
            "email": email_normalized,
            "role": role,
            "dataCadastro": get_current_timestamp()
        }
        
        if azure_ad_id:
            entity["azureAdId"] = azure_ad_id
        
        return self.create(entity, user_email)
    
    def get_by_email(self, email: str, tenant_id: str = CM_TENANT_ID_DEFAULT) -> Dict[str, Any]:
        email_normalized = email.lower().strip()
        partition_key = build_partition_key(tenant_id, "USUARIO")
        filter_query = f"PartitionKey eq '{partition_key}' and email eq '{email_normalized}'"
        
        result = self.query(filter_query, max_results=1)
        if result.get("status") == "error":
            return result
        
        data = result.get("data", [])
        if not data:
            return create_error_response("Usuário não encontrado")
        
        return create_response("success", data[0])
    
    def get_by_azure_ad_id(self, azure_ad_id: str, tenant_id: str = CM_TENANT_ID_DEFAULT) -> Dict[str, Any]:
        partition_key = build_partition_key(tenant_id, "USUARIO")
        filter_query = f"PartitionKey eq '{partition_key}' and azureAdId eq '{azure_ad_id}'"
        
        result = self.query(filter_query, max_results=1)
        if result.get("status") == "error":
            return result
        
        data = result.get("data", [])
        if not data:
            return create_error_response("Usuário não encontrado")
        
        return create_response("success", data[0])
    
    def update_ultimo_login(
        self,
        usuario_id: str,
        tenant_id: str = CM_TENANT_ID_DEFAULT,
        user_email: Optional[str] = None
    ) -> Dict[str, Any]:
        partition_key = build_partition_key(tenant_id, "USUARIO")
        result = self.get(partition_key, usuario_id)
        
        if result.get("status") == "error":
            return result
        
        entity = result.get("data")
        entity["ultimoLogin"] = get_current_timestamp()
        
        return self.update(entity, user_email)
