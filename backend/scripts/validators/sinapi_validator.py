from typing import List, Dict, Any
import re
import json

def validar_sinapi_ref(sinapi_ref: str) -> bool:
    pattern = r'^\d{4}-\d{2}$'
    if not re.match(pattern, sinapi_ref):
        return False
    ano, mes = sinapi_ref.split("-")
    return 2020 <= int(ano) <= 2050 and 1 <= int(mes) <= 12

def validar_insumos(insumos: List[Dict[str, Any]]) -> Dict[str, Any]:
    codigos_vistos = set()
    duplicados = []
    sem_preco = []
    classificacao_invalida = []
    
    for insumo in insumos:
        codigo = insumo["codigo"]
        if codigo in codigos_vistos:
            duplicados.append(codigo)
        codigos_vistos.add(codigo)
        
        tem_preco = False
        ufs = ["SP", "RJ", "MG", "RS", "PR", "SC", "BA", "PE", "ES", "DF", "GO", "MT", "MS", 
               "AM", "PA", "RO", "AC", "RR", "AP", "TO", "MA", "PI", "CE", "RN", "PB", "AL", "SE"]
        for uf in ufs:
            if insumo.get(f"preco{uf}"):
                tem_preco = True
                break
        if not tem_preco:
            sem_preco.append(codigo)
        
        classificacao = insumo.get("classificacao", "")
        if classificacao not in ["MATERIAL", "SERVICO", "EQUIPAMENTO"]:
            classificacao_invalida.append(codigo)
    
    return {
        "valido": len(duplicados) == 0 and len(sem_preco) == 0 and len(classificacao_invalida) == 0,
        "totalInsumos": len(insumos),
        "duplicados": duplicados,
        "semPreco": sem_preco,
        "classificacaoInvalida": classificacao_invalida
    }

def validar_composicoes(composicoes: List[Dict[str, Any]], codigos_insumos: set) -> Dict[str, Any]:
    codigos_vistos = set()
    duplicados = []
    referencias_orfas = []
    
    for comp in composicoes:
        codigo = comp["codigo"]
        if codigo in codigos_vistos:
            duplicados.append(codigo)
        codigos_vistos.add(codigo)
        
        itens = json.loads(comp["itensJson"])
        for item in itens:
            codigo_insumo = item.get("codigoInsumo")
            if codigo_insumo and codigo_insumo not in codigos_insumos:
                referencias_orfas.append(f"{codigo} → {codigo_insumo}")
    
    return {
        "valido": len(duplicados) == 0 and len(referencias_orfas) == 0,
        "totalComposicoes": len(composicoes),
        "duplicados": duplicados,
        "referenciasOrfas": referencias_orfas
    }
