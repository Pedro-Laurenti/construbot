from typing import Dict, Any, Optional

from app.repositories.base_repository import BaseRepository
from app.utils.config import CM_TABLE_AUDITORIA, CM_TENANT_ID_DEFAULT
from app.utils.table_helpers import build_partition_key, generate_row_key
from app.utils.helpers import create_response, create_error_response, get_current_timestamp

class AuditoriaRepository(BaseRepository):
    def __init__(self):
        super().__init__(CM_TABLE_AUDITORIA)
    
    def create_evento(
        self,
        usuario_id: str,
        modulo: str,
        acao: str,
        detalhes: Optional[dict] = None,
        tenant_id: str = CM_TENANT_ID_DEFAULT,
        user_email: Optional[str] = None
    ) -> Dict[str, Any]:
        evento_id = generate_row_key()
        timestamp = get_current_timestamp()
        mes_ano = timestamp[:7]
        partition_key = f"{tenant_id}#{mes_ano}"
        
        entity = {
            "PartitionKey": partition_key,
            "RowKey": evento_id,
            "usuarioId": usuario_id,
            "modulo": modulo,
            "acao": acao,
            "timestamp": timestamp
        }
        
        if detalhes:
            entity["detalhesJson"] = detalhes
        
        return self.create(entity, user_email)
    
    def list_by_mes(self, mes_ano: str, tenant_id: str = CM_TENANT_ID_DEFAULT) -> Dict[str, Any]:
        partition_key = f"{tenant_id}#{mes_ano}"
        return self.list_all(partition_key)
    
    def list_by_usuario(
        self,
        usuario_id: str,
        mes_ano: str,
        tenant_id: str = CM_TENANT_ID_DEFAULT
    ) -> Dict[str, Any]:
        partition_key = f"{tenant_id}#{mes_ano}"
        filter_query = f"PartitionKey eq '{partition_key}' and usuarioId eq '{usuario_id}'"
        return self.query(filter_query)
    
    def list_by_modulo(
        self,
        modulo: str,
        mes_ano: str,
        tenant_id: str = CM_TENANT_ID_DEFAULT
    ) -> Dict[str, Any]:
        partition_key = f"{tenant_id}#{mes_ano}"
        filter_query = f"PartitionKey eq '{partition_key}' and modulo eq '{modulo}'"
        return self.query(filter_query)
