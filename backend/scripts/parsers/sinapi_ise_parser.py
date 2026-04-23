import pandas as pd
from typing import List, Dict, Any

def parse_ise_insumos(file_path: str, sinapi_ref: str) -> List[Dict[str, Any]]:
    df = pd.read_excel(file_path, sheet_name="INSUMOS", header=0)
    
    df.columns = df.columns.str.strip().str.upper()
    
    colunas_obrigatorias = ["CODIGO", "DESCRICAO", "UNIDADE", "CLASSIFICACAO", "ORIGEM"]
    colunas_ufs = ["SP", "RJ", "MG", "RS", "PR", "SC", "BA", "PE", "ES", "DF", "GO", "MT", "MS", 
                   "AM", "PA", "RO", "AC", "RR", "AP", "TO", "MA", "PI", "CE", "RN", "PB", "AL", "SE"]
    
    for col in colunas_obrigatorias:
        if col not in df.columns:
            raise ValueError(f"Coluna obrigatória ausente: {col}")
    
    insumos = []
    for _, row in df.iterrows():
        insumo = {
            "codigo": str(row["CODIGO"]).strip(),
            "descricao": str(row["DESCRICAO"]).strip(),
            "unidade": str(row["UNIDADE"]).strip(),
            "classificacao": str(row["CLASSIFICACAO"]).strip().upper(),
            "origemPreco": str(row["ORIGEM"]).strip().upper(),
            "sinapiRef": sinapi_ref,
        }
        
        for uf in colunas_ufs:
            preco = row.get(uf)
            if pd.notna(preco) and preco > 0:
                insumo[f"preco{uf}"] = round(float(preco), 2)
            else:
                insumo[f"preco{uf}"] = None
        
        if not any(insumo[f"preco{uf}"] for uf in colunas_ufs):
            continue
        
        insumos.append(insumo)
    
    return insumos
