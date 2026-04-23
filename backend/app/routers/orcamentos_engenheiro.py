from fastapi import APIRouter, Depends, Query
from typing import Dict, Any

from app.repositories import OrcamentoEngenheiroRepository
from app.utils.auth import get_current_user, require_role
from app.utils.helpers import raise_http_error, create_response

router = APIRouter()

@router.get("/orcamentos-engenheiro", response_model=Dict[str, Any])
async def list_orcamentos_engenheiro(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(require_role("engenheiro"))
) -> Dict[str, Any]:
    repo = OrcamentoEngenheiroRepository()
    result = repo.list_all()
    
    if result.get("status") == "error":
        raise_http_error(500, result.get("error", "Erro ao listar orçamentos engenheiro"))
    
    data = result.get("data", [])
    total = len(data)
    paginated_data = data[skip:skip + limit]
    
    return create_response("success", data=paginated_data, total=total, skip=skip, limit=limit)

@router.get("/orcamentos-engenheiro/{orcamento_id}", response_model=Dict[str, Any])
async def get_orcamento_engenheiro(
    orcamento_id: str,
    current_user: dict = Depends(require_role("engenheiro"))
) -> Dict[str, Any]:
    repo = OrcamentoEngenheiroRepository()
    result = repo.get_by_id(orcamento_id)
    if result.get("status") == "error":
        raise_http_error(404, "Orçamento engenheiro não encontrado")
    return result
