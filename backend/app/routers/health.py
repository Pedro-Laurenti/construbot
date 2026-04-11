from typing import Dict, Any

from fastapi import APIRouter

from app.utils.helpers import get_current_timestamp

router = APIRouter()


@router.get("/health")
async def health_check() -> Dict[str, Any]:
    return {
        "status": "ok",
        "message": "Backend is running",
        "timestamp": get_current_timestamp(),
        "version": "0.1.0",
    }
