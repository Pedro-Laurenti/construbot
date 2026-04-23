from fastapi import APIRouter, Depends, Query
from typing import Dict, Any, Optional

from app.models.orcamento import OrcamentoCreate, OrcamentoUpdate
from app.repositories import OrcamentoRepository
from app.utils.auth import get_current_user
from app.utils.helpers import raise_http_error, create_response

router = APIRouter()

@router.post("/orcamentos", response_model=Dict[str, Any])
async def create_orcamento(
    body: OrcamentoCreate,
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    repo = OrcamentoRepository()
    result = repo.create_orcamento(
        cliente_id=current_user["id"],
        status="rascunho",
        items=[],
        valor_total=0.0,
        user_email=current_user["email"]
    )
    if result.get("status") == "error":
        raise_http_error(400, result.get("error", "Erro ao criar orçamento"))
    return result

@router.get("/orcamentos", response_model=Dict[str, Any])
async def list_orcamentos(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    cliente_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    repo = OrcamentoRepository()
    
    if cliente_id:
        result = repo.list_by_cliente(cliente_id)
    else:
        result = repo.list_by_cliente(current_user["id"])
    
    if result.get("status") == "error":
        raise_http_error(500, result.get("error", "Erro ao listar orçamentos"))
    
    data = result.get("data", [])
    
    if status:
        data = [item for item in data if item.get("status") == status]
    
    total = len(data)
    paginated_data = data[skip:skip + limit]
    
    return create_response("success", data=paginated_data, total=total, skip=skip, limit=limit)

@router.get("/orcamentos/{orcamento_id}", response_model=Dict[str, Any])
async def get_orcamento(
    orcamento_id: str,
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    repo = OrcamentoRepository()
    result = repo.get_by_id(orcamento_id)
    if result.get("status") == "error":
        raise_http_error(404, "Orçamento não encontrado")
    return result

@router.get("/clientes/{cliente_id}/orcamentos", response_model=Dict[str, Any])
async def list_orcamentos_by_cliente(
    cliente_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    repo = OrcamentoRepository()
    result = repo.list_by_cliente(cliente_id)
    
    if result.get("status") == "error":
        raise_http_error(500, result.get("error", "Erro ao listar orçamentos"))
    
    data = result.get("data", [])
    total = len(data)
    paginated_data = data[skip:skip + limit]
    
    return create_response("success", data=paginated_data, total=total, skip=skip, limit=limit)

@router.put("/orcamentos/{orcamento_id}", response_model=Dict[str, Any])
async def update_orcamento(
    orcamento_id: str,
    body: OrcamentoUpdate,
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    repo = OrcamentoRepository()
    result = repo.get_by_id(orcamento_id)
    if result.get("status") == "error":
        raise_http_error(404, "Orçamento não encontrado")
    
    entity = result.get("data")
    
    if body.nome is not None:
        entity["nome"] = body.nome
    if body.status is not None:
        entity["status"] = body.status
    if body.itensJson is not None:
        entity["itensJson"] = body.itensJson
    if body.totaisJson is not None:
        entity["totaisJson"] = body.totaisJson
    if body.parametrosJson is not None:
        entity["parametrosJson"] = body.parametrosJson
    if body.saidaJson is not None:
        entity["saidaJson"] = body.saidaJson
    
    update_result = repo.update(entity, current_user["email"])
    if update_result.get("status") == "error":
        raise_http_error(500, update_result.get("error", "Erro ao atualizar orçamento"))
    return update_result

@router.delete("/orcamentos/{orcamento_id}", response_model=Dict[str, Any])
async def delete_orcamento(
    orcamento_id: str,
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    repo = OrcamentoRepository()
    result = repo.get_by_id(orcamento_id)
    if result.get("status") == "error":
        raise_http_error(404, "Orçamento não encontrado")
    
    entity = result.get("data")
    delete_result = repo.delete(entity["PartitionKey"], entity["RowKey"], current_user["email"])
    if delete_result.get("status") == "error":
        raise_http_error(500, delete_result.get("error", "Erro ao deletar orçamento"))
    return delete_result
