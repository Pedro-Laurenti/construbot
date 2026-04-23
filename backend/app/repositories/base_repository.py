from abc import ABC
from typing import Any, Dict, List, Optional
from azure.core.exceptions import ResourceNotFoundError, ResourceExistsError
from azure.data.tables import TableClient

from app.utils.table_client import get_table_client
from app.utils.table_helpers import (
    serialize_entity,
    deserialize_entity,
    validate_entity_size,
    build_audit_fields
)
from app.utils.helpers import create_response, create_error_response

class BaseRepository(ABC):
    def __init__(self, table_name: str):
        self.table_name = table_name
        self._client: Optional[TableClient] = None
    
    @property
    def client(self) -> TableClient:
        if self._client is None:
            self._client = get_table_client(self.table_name)
        return self._client
    
    def create(self, entity: dict, user_email: Optional[str] = None) -> Dict[str, Any]:
        try:
            if not validate_entity_size(entity):
                return create_error_response("Entidade excede limite de 1MB")
            
            audit_fields = build_audit_fields(user_email, is_update=False)
            entity.update(audit_fields)
            
            serialized = serialize_entity(entity)
            result = self.client.create_entity(serialized)
            return create_response("success", deserialize_entity(result))
        except ResourceExistsError:
            return create_error_response("Entidade já existe")
        except Exception as e:
            return create_error_response(f"Erro ao criar entidade: {str(e)}")
    
    def get(self, partition_key: str, row_key: str) -> Dict[str, Any]:
        try:
            entity = self.client.get_entity(partition_key, row_key)
            return create_response("success", deserialize_entity(entity))
        except ResourceNotFoundError:
            return create_error_response("Entidade não encontrada")
        except Exception as e:
            return create_error_response(f"Erro ao buscar entidade: {str(e)}")
    
    def update(self, entity: dict, user_email: Optional[str] = None, mode: str = "merge") -> Dict[str, Any]:
        try:
            if not validate_entity_size(entity):
                return create_error_response("Entidade excede limite de 1MB")
            
            audit_fields = build_audit_fields(user_email, is_update=True)
            entity.update(audit_fields)
            
            serialized = serialize_entity(entity)
            self.client.update_entity(serialized, mode=mode)
            
            return self.get(entity["PartitionKey"], entity["RowKey"])
        except ResourceNotFoundError:
            return create_error_response("Entidade não encontrada")
        except Exception as e:
            return create_error_response(f"Erro ao atualizar entidade: {str(e)}")
    
    def delete(self, partition_key: str, row_key: str) -> Dict[str, Any]:
        try:
            self.client.delete_entity(partition_key, row_key)
            return create_response("success", {"deleted": True})
        except ResourceNotFoundError:
            return create_error_response("Entidade não encontrada")
        except Exception as e:
            return create_error_response(f"Erro ao deletar entidade: {str(e)}")
    
    def query(
        self,
        filter_query: str,
        select: Optional[List[str]] = None,
        max_results: int = 1000
    ) -> Dict[str, Any]:
        try:
            entities = self.client.query_entities(
                query_filter=filter_query,
                select=select,
                results_per_page=max_results
            )
            results = [deserialize_entity(e) for e in entities]
            return create_response("success", results)
        except Exception as e:
            return create_error_response(f"Erro ao consultar entidades: {str(e)}")
    
    def list_all(
        self,
        partition_key: Optional[str] = None,
        max_results: int = 1000
    ) -> Dict[str, Any]:
        try:
            if partition_key:
                filter_query = f"PartitionKey eq '{partition_key}'"
                return self.query(filter_query, max_results=max_results)
            
            entities = self.client.list_entities(results_per_page=max_results)
            results = [deserialize_entity(e) for e in entities]
            return create_response("success", results)
        except Exception as e:
            return create_error_response(f"Erro ao listar entidades: {str(e)}")
