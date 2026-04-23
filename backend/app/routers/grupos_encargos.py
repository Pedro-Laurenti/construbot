from fastapi import APIRouter, Depends, Query
from typing import Dict, Any

from app.repositories import GruposEncargosRepository
from app.utils.auth import get_current_user, require_role
from app.utils.helpers import raise_http_error, create_response

router = APIRouter()

@router.get("/grupos-encargos", response_model=Dict[str, Any])
async def get_grupos_encargos(
    current_user: dict = Depends(require_role("engenheiro"))
) -> Dict[str, Any]:
    repo = GruposEncargosRepository()
    result = repo.list_all()
    if result.get("status") == "error":
        raise_http_error(500, result.get("error", "Erro ao listar grupos de encargos"))
    return result

@router.put("/grupos-encargos", response_model=Dict[str, Any])
async def update_grupos_encargos(
    body: Dict[str, Any],
    current_user: dict = Depends(require_role("engenheiro"))
) -> Dict[str, Any]:
    repo = GruposEncargosRepository()
    result = repo.list_all()
    if result.get("status") == "error":
        raise_http_error(404, "Grupos de encargos não encontrados")
    
    data = result.get("data", [])
    if len(data) == 0:
        raise_http_error(404, "Nenhum grupo de encargos encontrado")
    
    entity = data[0]
    entity.update(body)
    
    update_result = repo.update(entity, current_user["email"])
    if update_result.get("status") == "error":
        raise_http_error(500, update_result.get("error", "Erro ao atualizar grupos de encargos"))
    return update_result
