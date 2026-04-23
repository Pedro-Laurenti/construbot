from fastapi import APIRouter, Depends
from typing import Dict, Any

from app.repositories import ParametrosGlobaisRepository
from app.utils.auth import get_current_user, require_role
from app.utils.helpers import raise_http_error

router = APIRouter()

@router.get("/parametros-globais", response_model=Dict[str, Any])
async def get_parametros_globais(
    current_user: dict = Depends(require_role("engenheiro"))
) -> Dict[str, Any]:
    repo = ParametrosGlobaisRepository()
    result = repo.get_singleton()
    if result.get("status") == "error":
        raise_http_error(404, "Parâmetros globais não encontrados")
    return result

@router.put("/parametros-globais", response_model=Dict[str, Any])
async def update_parametros_globais(
    body: Dict[str, Any],
    current_user: dict = Depends(require_role("engenheiro"))
) -> Dict[str, Any]:
    repo = ParametrosGlobaisRepository()
    result = repo.get_singleton()
    if result.get("status") == "error":
        raise_http_error(404, "Parâmetros globais não encontrados")
    
    entity = result.get("data")
    entity.update(body)
    
    update_result = repo.update(entity, current_user["email"])
    if update_result.get("status") == "error":
        raise_http_error(500, update_result.get("error", "Erro ao atualizar parâmetros globais"))
    return update_result
