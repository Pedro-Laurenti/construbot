from typing import Dict, Any, Optional

from app.repositories.base_repository import BaseRepository
from app.utils.config import CM_TABLE_PLANTA, CM_TENANT_ID_DEFAULT
from app.utils.table_helpers import build_partition_key, generate_row_key
from app.utils.helpers import create_response, create_error_response

class PlantaRepository(BaseRepository):
    def __init__(self):
        super().__init__(CM_TABLE_PLANTA)
    
    def create_planta(
        self,
        nome: str,
        quartos: int,
        banheiros: int,
        area_total: float,
        preco_base: float,
        thumbnail_url: Optional[str] = None,
        tenant_id: str = CM_TENANT_ID_DEFAULT,
        user_email: Optional[str] = None
    ) -> Dict[str, Any]:
        planta_id = generate_row_key()
        partition_key = build_partition_key(tenant_id, "PLANTA")
        
        entity = {
            "PartitionKey": partition_key,
            "RowKey": planta_id,
            "nome": nome,
            "quartos": quartos,
            "banheiros": banheiros,
            "areaTotal": area_total,
            "precoBase": preco_base
        }
        
        if thumbnail_url:
            entity["thumbnailUrl"] = thumbnail_url
        
        return self.create(entity, user_email)
    
    def get_by_id(self, planta_id: str, tenant_id: str = CM_TENANT_ID_DEFAULT) -> Dict[str, Any]:
        partition_key = build_partition_key(tenant_id, "PLANTA")
        return self.get(partition_key, planta_id)
    
    def list_all_plantas(self, tenant_id: str = CM_TENANT_ID_DEFAULT) -> Dict[str, Any]:
        partition_key = build_partition_key(tenant_id, "PLANTA")
        return self.list_all(partition_key)
    
    def filter_by_quartos(self, quartos: int, tenant_id: str = CM_TENANT_ID_DEFAULT) -> Dict[str, Any]:
        partition_key = build_partition_key(tenant_id, "PLANTA")
        filter_query = f"PartitionKey eq '{partition_key}' and quartos eq {quartos}"
        return self.query(filter_query)
