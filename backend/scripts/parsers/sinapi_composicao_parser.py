import pandas as pd
from typing import List, Dict, Any
import json

def parse_composicoes_analiticas(file_path: str, sinapi_ref: str) -> List[Dict[str, Any]]:
    df = pd.read_excel(file_path, sheet_name="COMPOSICOES", header=0)
    
    df.columns = df.columns.str.strip().str.upper()
    
    colunas_obrigatorias = ["CODIGO", "DESCRICAO", "UNIDADE", "GRUPO"]
    for col in colunas_obrigatorias:
        if col not in df.columns:
            raise ValueError(f"Coluna obrigatória ausente: {col}")
    
    composicoes = {}
    composicao_atual = None
    
    for _, row in df.iterrows():
        codigo = str(row["CODIGO"]).strip() if pd.notna(row["CODIGO"]) else None
        
        if codigo and not codigo.startswith("+"):
            composicao_atual = {
                "codigo": codigo,
                "descricao": str(row["DESCRICAO"]).strip(),
                "unidade": str(row["UNIDADE"]).strip(),
                "grupo": str(row["GRUPO"]).strip().upper(),
                "sinapiRef": sinapi_ref,
                "itens": []
            }
            composicoes[codigo] = composicao_atual
        
        elif codigo and codigo.startswith("+") and composicao_atual:
            item = {
                "tipo": str(row.get("TIPO", "")).strip().upper(),
                "codigoInsumo": codigo.lstrip("+").strip(),
                "descricaoInsumo": str(row["DESCRICAO"]).strip(),
                "unidade": str(row["UNIDADE"]).strip(),
                "coeficiente": float(row["COEFICIENTE"]) if pd.notna(row.get("COEFICIENTE")) else 0.0
            }
            composicao_atual["itens"].append(item)
    
    composicoes_list = []
    for comp in composicoes.values():
        comp["itensJson"] = json.dumps(comp["itens"], ensure_ascii=False)
        del comp["itens"]
        composicoes_list.append(comp)
    
    return composicoes_list
