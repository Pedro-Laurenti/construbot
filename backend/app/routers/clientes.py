from fastapi import APIRouter, Depends, Query
from typing import Dict, Any, Optional

from app.models.cliente import ClienteCreate, ClienteUpdate
from app.repositories import ClienteRepository
from app.utils.auth import get_current_user, require_role
from app.utils.helpers import raise_http_error, create_response

router = APIRouter()

@router.post("/clientes", response_model=Dict[str, Any])
async def create_cliente(
    body: ClienteCreate,
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    repo = ClienteRepository()
    result = repo.create_cliente(
        nome=body.nome,
        telefone=body.telefone,
        email=body.email,
        user_email=current_user["email"]
    )
    if result.get("status") == "error":
        raise_http_error(400, result.get("error", "Erro ao criar cliente"))
    return result

@router.get("/clientes", response_model=Dict[str, Any])
async def list_clientes(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    email: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    repo = ClienteRepository()
    
    if email:
        result = repo.get_by_email(email)
        if result.get("status") == "error":
            return create_response("success", data=[], total=0, skip=skip, limit=limit)
        return create_response("success", data=[result.get("data")], total=1, skip=0, limit=1)
    
    result = repo.list_all_clientes()
    if result.get("status") == "error":
        raise_http_error(500, result.get("error", "Erro ao listar clientes"))
    
    data = result.get("data", [])
    total = len(data)
    paginated_data = data[skip:skip + limit]
    
    return create_response("success", data=paginated_data, total=total, skip=skip, limit=limit)

@router.get("/clientes/{cliente_id}", response_model=Dict[str, Any])
async def get_cliente(
    cliente_id: str,
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    repo = ClienteRepository()
    result = repo.get_by_id(cliente_id)
    if result.get("status") == "error":
        raise_http_error(404, "Cliente não encontrado")
    return result

@router.put("/clientes/{cliente_id}", response_model=Dict[str, Any])
async def update_cliente(
    cliente_id: str,
    body: ClienteUpdate,
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    repo = ClienteRepository()
    result = repo.get_by_id(cliente_id)
    if result.get("status") == "error":
        raise_http_error(404, "Cliente não encontrado")
    
    entity = result.get("data")
    
    if body.nome is not None:
        entity["nome"] = body.nome
    if body.telefone is not None:
        entity["telefone"] = body.telefone
    if body.email is not None:
        entity["email"] = body.email
    
    update_result = repo.update(entity, current_user["email"])
    if update_result.get("status") == "error":
        raise_http_error(500, update_result.get("error", "Erro ao atualizar cliente"))
    return update_result

@router.delete("/clientes/{cliente_id}", response_model=Dict[str, Any])
async def delete_cliente(
    cliente_id: str,
    current_user: dict = Depends(require_role("admin"))
) -> Dict[str, Any]:
    repo = ClienteRepository()
    result = repo.get_by_id(cliente_id)
    if result.get("status") == "error":
        raise_http_error(404, "Cliente não encontrado")
    
    entity = result.get("data")
    delete_result = repo.delete(entity["PartitionKey"], entity["RowKey"], current_user["email"])
    if delete_result.get("status") == "error":
        raise_http_error(500, delete_result.get("error", "Erro ao deletar cliente"))
    return delete_result
