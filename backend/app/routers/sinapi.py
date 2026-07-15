from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List, Optional
from app.services import sinapi_service
from app.utils.auth import get_user_from_token

router = APIRouter()

@router.post("/sinapi/upload", status_code=501)
async def upload_sinapi_file(user: Dict[str, Any] = Depends(get_user_from_token)) -> Dict[str, Any]:
    return {
        "erro": "Upload via API não implementado. Use o script etl_sinapi.py no backend."
    }

@router.get("/sinapi/versoes")
async def listar_versoes_sinapi(user: Dict[str, Any] = Depends(get_user_from_token)) -> Dict[str, Any]:
    try:
        versoes = sinapi_service.listar_versoes()
        versao_ativa = sinapi_service.get_versao_ativa()
        return {
            "versoes": versoes,
            "versaoAtiva": versao_ativa
        }
    except ValueError as e:
        return {
            "versoes": [],
            "versaoAtiva": None,
            "aviso": str(e)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sinapi/versao-ativa")
async def obter_versao_ativa(user: Dict[str, Any] = Depends(get_user_from_token)) -> Dict[str, Any]:
    try:
        versao_ativa = sinapi_service.get_versao_ativa()
        return {"versaoAtiva": versao_ativa}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/sinapi/versao-ativa")
async def atualizar_versao_ativa(
    payload: Dict[str, str],
    user: Dict[str, Any] = Depends(get_user_from_token)
) -> Dict[str, Any]:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem alterar a versão ativa")
    
    sinapi_ref = payload.get("sinapiRef")
    if not sinapi_ref:
        raise HTTPException(status_code=400, detail="Campo sinapiRef obrigatório")
    
    try:
        params = sinapi_service.set_versao_ativa(sinapi_ref)
        return {
            "mensagem": f"Versão SINAPI ativa atualizada para {sinapi_ref}",
            "versaoAtiva": params.get("sinapiVersaoAtiva")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sinapi/insumo/{codigo}")
async def obter_insumo(
    codigo: str,
    uf: str = "SP",
    sinapi_ref: Optional[str] = None,
    classificacao: str = "MATERIAL",
    user: Dict[str, Any] = Depends(get_user_from_token)
) -> Dict[str, Any]:
    try:
        preco = sinapi_service.get_insumo_preco(codigo, uf, sinapi_ref, classificacao)
        if preco is None:
            raise HTTPException(status_code=404, detail=f"Insumo {codigo} não encontrado")
        
        versao = sinapi_ref if sinapi_ref else sinapi_service.get_versao_ativa()
        return {
            "codigo": codigo,
            "uf": uf.upper(),
            "preco": preco,
            "sinapiRef": versao
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sinapi/composicao/{codigo}")
async def obter_composicao(
    codigo: str,
    sinapi_ref: Optional[str] = None,
    user: Dict[str, Any] = Depends(get_user_from_token)
) -> Dict[str, Any]:
    try:
        comp = sinapi_service.get_composicao(codigo, sinapi_ref)
        if not comp:
            raise HTTPException(status_code=404, detail=f"Composição {codigo} não encontrada")
        
        return comp
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sinapi/publicacoes")
async def listar_publicacoes(user: Dict[str, Any] = Depends(get_user_from_token)) -> Dict[str, Any]:
    from app.repositories.sinapi_publicacao_repository import SINAPIPublicacaoRepository
    
    try:
        repo = SINAPIPublicacaoRepository()
        publicacoes = repo.list_all_publicacoes()
        return {
            "publicacoes": publicacoes,
            "total": len(publicacoes)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sinapi/publicacao/{sinapiRef}")
async def obter_publicacao(
    sinapiRef: str,
    user: Dict[str, Any] = Depends(get_user_from_token)
) -> Dict[str, Any]:
    from app.repositories.sinapi_publicacao_repository import SINAPIPublicacaoRepository
    
    try:
        repo = SINAPIPublicacaoRepository()
        publicacao = repo.get_by_sinapi_ref(sinapiRef)
        if not publicacao:
            raise HTTPException(status_code=404, detail="Publicação não encontrada")
        return publicacao
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sinapi/revalidar-orcamento/{orcamento_id}")
async def revalidar_orcamento(
    orcamento_id: str,
    user: Dict[str, Any] = Depends(get_user_from_token)
) -> Dict[str, Any]:
    from app.repositories.orcamento_repository import OrcamentoRepository
    from app.utils.table_client import get_table_client
    from app.utils.helpers import get_current_timestamp
    
    try:
        repo_orc = OrcamentoRepository(get_table_client("Orcamento"))
        
        entities = repo_orc.table_client.query_entities(f"RowKey eq '{orcamento_id}'")
        entity_list = list(entities)
        
        if not entity_list:
            raise HTTPException(status_code=404, detail="Orçamento não encontrado")
        
        orcamento = entity_list[0]
        
        if orcamento.get("clienteId") != user.get("sub") and user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Sem permissão para acessar este orçamento")
        
        versao_ativa = sinapi_service.get_versao_ativa()
        
        orcamento["sinapiRef"] = versao_ativa
        orcamento["sinapiAtualizacaoDisponivel"] = False
        orcamento["updatedAt"] = get_current_timestamp()
        
        repo_orc.table_client.update_entity(orcamento, mode="merge")
        
        return {
            "mensagem": "Orçamento revalidado com sucesso",
            "sinapiRef": versao_ativa,
            "orcamentoId": orcamento_id
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
