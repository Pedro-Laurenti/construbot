from fastapi import APIRouter

from app.utils.config import CM_STORAGE_ACCOUNT_NAME, CM_STORAGE_ACCOUNT_URL, CM_STORAGE_CONNECTION_STRING
from app.utils.helpers import create_response, create_error_response

router = APIRouter()

@router.get("/storage-health")
async def storage_health():
    if not CM_STORAGE_ACCOUNT_NAME or not CM_STORAGE_ACCOUNT_URL:
        return create_error_response("Storage Account não configurado")
    return create_response("success", {
        "account_name": CM_STORAGE_ACCOUNT_NAME,
        "account_url": CM_STORAGE_ACCOUNT_URL,
        "connection_mode": "managed_identity" if not CM_STORAGE_CONNECTION_STRING else "connection_string"
    })
