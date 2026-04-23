from typing import Dict, Any, Optional, List
import json
from app.repositories.insumo_sinapi_repository import InsumoSINAPIRepository
from app.repositories.composicao_analitica_repository import ComposicaoAnaliticaRepository
from app.repositories.parametros_globais_repository import ParametrosGlobaisRepository
from app.utils.table_client import get_table_client

_cache_composicoes: Dict[str, Dict[str, Any]] = {}

def get_versao_ativa() -> str:
    repo = ParametrosGlobaisRepository(get_table_client("ParametrosGlobais"))
    params = repo.get_parametros_globais()
    if not params or "sinapiVersaoAtiva" not in params:
        raise ValueError("Versão SINAPI ativa não configurada em ParametrosGlobais")
    return params["sinapiVersaoAtiva"]

def get_insumo_preco(codigo: str, uf: str, sinapi_ref: Optional[str] = None, classificacao: str = "MATERIAL") -> Optional[float]:
    if not sinapi_ref:
        sinapi_ref = get_versao_ativa()
    
    repo = InsumoSINAPIRepository(get_table_client("InsumoSINAPI"))
    insumo = repo.get_by_codigo(codigo, sinapi_ref, classificacao)
    
    if not insumo:
        return None
    
    preco = insumo.get(f"preco{uf.upper()}")
    if preco:
        return preco
    
    preco_sp = insumo.get("precoSP")
    return preco_sp if preco_sp else None

def get_composicao(codigo: str, sinapi_ref: Optional[str] = None) -> Optional[Dict[str, Any]]:
    if not sinapi_ref:
        sinapi_ref = get_versao_ativa()
    
    cache_key = f"{sinapi_ref}#{codigo}"
    if cache_key in _cache_composicoes:
        return _cache_composicoes[cache_key]
    
    repo = ComposicaoAnaliticaRepository(get_table_client("ComposicaoAnalitica"))
    comp = repo.get_by_codigo(codigo, sinapi_ref, "COMP_ANALITICA")
    
    if comp:
        comp["itens"] = json.loads(comp["itensJson"])
        _cache_composicoes[cache_key] = comp
    
    return comp

def listar_versoes() -> List[str]:
    repo = InsumoSINAPIRepository(get_table_client("InsumoSINAPI"))
    insumos = repo.list_all_with_projection(["PartitionKey"])
    
    versoes_set = set()
    for insumo in insumos:
        pk = insumo.get("PartitionKey", "")
        if "#" in pk:
            sinapi_ref = pk.split("#")[0]
            versoes_set.add(sinapi_ref)
    
    return sorted(list(versoes_set), reverse=True)

def set_versao_ativa(sinapi_ref: str) -> Dict[str, Any]:
    repo = ParametrosGlobaisRepository(get_table_client("ParametrosGlobais"))
    params = repo.get_parametros_globais()
    
    if not params:
        params = {
            "PartitionKey": "GLOBAL",
            "RowKey": "CONFIG",
            "sinapiVersaoAtiva": sinapi_ref
        }
        repo.create_parametros_globais(params)
    else:
        params["sinapiVersaoAtiva"] = sinapi_ref
        repo.update_parametros_globais(params)
    
    global _cache_composicoes
    _cache_composicoes.clear()
    
    return params
