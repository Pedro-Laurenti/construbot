from fastapi import APIRouter, Depends
from typing import Dict, Any

from app.utils.auth import get_current_user
from app.utils.helpers import create_response

router = APIRouter()

@router.get("/me")
async def get_me(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    return create_response("success", {
        "id": current_user["id"],
        "nome": current_user["nome"],
        "email": current_user["email"],
        "role": current_user["role"]
    })
