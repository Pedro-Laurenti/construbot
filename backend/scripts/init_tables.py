from app.utils.table_client import create_table_if_not_exists
from app.utils.config import (
    CM_TABLE_CLIENTE,
    CM_TABLE_ORCAMENTO,
    CM_TABLE_ORCAMENTO_ENGENHEIRO,
    CM_TABLE_PLANTA,
    CM_TABLE_OPCIONAL,
    CM_TABLE_PARAMETROS_GLOBAIS,
    CM_TABLE_GRUPOS_ENCARGOS,
    CM_TABLE_COMPOSICAO_PROFISSIONAL,
    CM_TABLE_INSUMO_SINAPI,
    CM_TABLE_COMPOSICAO_ANALITICA,
    CM_TABLE_AUDITORIA,
    CM_TABLE_USUARIO,
)

def init_all_tables():
    tables = [
        CM_TABLE_CLIENTE,
        CM_TABLE_ORCAMENTO,
        CM_TABLE_ORCAMENTO_ENGENHEIRO,
        CM_TABLE_PLANTA,
        CM_TABLE_OPCIONAL,
        CM_TABLE_PARAMETROS_GLOBAIS,
        CM_TABLE_GRUPOS_ENCARGOS,
        CM_TABLE_COMPOSICAO_PROFISSIONAL,
        CM_TABLE_INSUMO_SINAPI,
        CM_TABLE_COMPOSICAO_ANALITICA,
        CM_TABLE_AUDITORIA,
        CM_TABLE_USUARIO,
    ]
    
    print("Inicializando tabelas no Azure Table Storage...")
    for table_name in tables:
        try:
            created = create_table_if_not_exists(table_name)
            status = "criada" if created else "já existe"
            print(f"  ✓ {table_name}: {status}")
        except Exception as e:
            print(f"  ✗ {table_name}: erro - {str(e)}")
    
    print("Inicialização concluída.")

if __name__ == "__main__":
    init_all_tables()
