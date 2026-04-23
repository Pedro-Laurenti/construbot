from azure.data.tables import TableServiceClient
from azure.identity import DefaultAzureCredential
from azure.core.exceptions import ResourceExistsError

from app.utils.config import (
    CM_STORAGE_ACCOUNT_URL,
    CM_STORAGE_CONNECTION_STRING
)

_table_service_client = None

def get_table_service_client() -> TableServiceClient:
    global _table_service_client
    if _table_service_client is not None:
        return _table_service_client
    
    if CM_STORAGE_CONNECTION_STRING:
        _table_service_client = TableServiceClient.from_connection_string(
            conn_str=CM_STORAGE_CONNECTION_STRING
        )
    else:
        credential = DefaultAzureCredential()
        _table_service_client = TableServiceClient(
            endpoint=CM_STORAGE_ACCOUNT_URL,
            credential=credential
        )
    
    return _table_service_client

def get_table_client(table_name: str):
    service_client = get_table_service_client()
    return service_client.get_table_client(table_name)

def create_table_if_not_exists(table_name: str) -> bool:
    try:
        service_client = get_table_service_client()
        service_client.create_table(table_name)
        return True
    except ResourceExistsError:
        return False
    except Exception:
        return False
