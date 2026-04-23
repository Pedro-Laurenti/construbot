from fastapi import APIRouter, Depends, Query
from typing import Dict, Any, Optional

from app.repositories import AuditoriaRepository
from app.utils.auth import get_current_user, require_role
from app.utils.helpers import raise_http_error, create_response

router = APIRouter()

@router.get("/auditoria", response_model=Dict[str, Any])
async def list_auditoria(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    tabela: Optional[str] = Query(None),
    user_email: Optional[str] = Query(None),
    current_user: dict = Depends(require_role("admin"))
) -> Dict[str, Any]:
    repo = AuditoriaRepository()
    result = repo.list_all()
    
    if result.get("status") == "error":
        raise_http_error(500, result.get("error", "Erro ao listar auditoria"))
    
    data = result.get("data", [])
    
    if tabela:
        data = [item for item in data if item.get("tabela") == tabela]
    
    if user_email:
        data = [item for item in data if item.get("user") == user_email]
    
    total = len(data)
    paginated_data = data[skip:skip + limit]
    
    return create_response("success", data=paginated_data, total=total, skip=skip, limit=limit)
