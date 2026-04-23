import json
from datetime import datetime
from typing import Any, Dict, Optional
from uuid import uuid4

from app.utils.config import CM_TENANT_ID_DEFAULT
from app.utils.helpers import get_current_timestamp

def serialize_entity(entity: dict) -> dict:
    serialized = {}
    for key, value in entity.items():
        if key in ("PartitionKey", "RowKey", "Timestamp"):
            serialized[key] = value
        elif value is None:
            continue
        elif isinstance(value, (dict, list)):
            serialized[f"{key}"] = json.dumps(value, ensure_ascii=False)
        elif isinstance(value, datetime):
            serialized[key] = value.isoformat()
        elif isinstance(value, bool):
            serialized[key] = value
        elif isinstance(value, (int, float)):
            serialized[key] = value
        else:
            serialized[key] = str(value)
    return serialized

def deserialize_entity(entity: dict) -> dict:
    deserialized = {}
    for key, value in entity.items():
        if key in ("PartitionKey", "RowKey", "Timestamp", "etag"):
            deserialized[key] = value
        elif isinstance(value, str) and (key.endswith("Json") or key.endswith("json")):
            try:
                deserialized[key.replace("Json", "").replace("json", "")] = json.loads(value)
            except json.JSONDecodeError:
                deserialized[key] = value
        else:
            deserialized[key] = value
    return deserialized

def validate_entity_size(entity: dict, max_size_bytes: int = 1_000_000) -> bool:
    serialized = serialize_entity(entity)
    json_str = json.dumps(serialized, ensure_ascii=False)
    size_bytes = len(json_str.encode('utf-8'))
    return size_bytes < max_size_bytes

def build_partition_key(tenant_id: str, categoria: str) -> str:
    return f"{tenant_id}#{categoria}"

def build_audit_fields(user_email: Optional[str] = None, is_update: bool = False) -> dict:
    timestamp = get_current_timestamp()
    fields = {}
    if not is_update:
        fields["createdAt"] = timestamp
        if user_email:
            fields["createdBy"] = user_email
    fields["updatedAt"] = timestamp
    if user_email:
        fields["updatedBy"] = user_email
    return fields

def generate_row_key() -> str:
    return str(uuid4())
