import argparse
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from parsers.sinapi_ise_parser import parse_ise_insumos
from parsers.sinapi_composicao_parser import parse_composicoes_analiticas
from validators.sinapi_validator import validar_sinapi_ref, validar_insumos, validar_composicoes
from app.repositories.insumo_sinapi_repository import InsumoSINAPIRepository
from app.repositories.composicao_analitica_repository import ComposicaoAnaliticaRepository
from app.utils.table_client import get_table_client

def executar_etl(args):
    if not validar_sinapi_ref(args.ref):
        print(f"Erro: sinapiRef inválido '{args.ref}'. Use formato AAAA-MM")
        sys.exit(1)
    
    print(f"Iniciando ETL SINAPI para versão {args.ref}")
    print(f"Modo: {'DRY-RUN (sem persistência)' if args.dry_run else 'PRODUÇÃO (com persistência)'}")
    print()
    
    insumos = []
    composicoes = []
    
    if args.ise:
        print(f"[1/4] Parseando ISE: {args.ise}")
        try:
            insumos = parse_ise_insumos(args.ise, args.ref)
            print(f"✓ {len(insumos)} insumos parseados")
        except Exception as e:
            print(f"✗ Erro ao parsear ISE: {e}")
            sys.exit(1)
    
    if args.composicoes:
        print(f"[2/4] Parseando composições: {args.composicoes}")
        try:
            composicoes = parse_composicoes_analiticas(args.composicoes, args.ref)
            print(f"✓ {len(composicoes)} composições parseadas")
        except Exception as e:
            print(f"✗ Erro ao parsear composições: {e}")
            sys.exit(1)
    
    print()
    print("[3/4] Validando dados")
    
    if insumos:
        resultado_insumos = validar_insumos(insumos)
        if not resultado_insumos["valido"]:
            print("✗ Validação de insumos falhou:")
            if resultado_insumos["duplicados"]:
                print(f"  - Códigos duplicados: {resultado_insumos['duplicados']}")
            if resultado_insumos["semPreco"]:
                print(f"  - Sem preço: {resultado_insumos['semPreco']}")
            if resultado_insumos["classificacaoInvalida"]:
                print(f"  - Classificação inválida: {resultado_insumos['classificacaoInvalida']}")
            sys.exit(1)
        print(f"✓ Insumos validados ({resultado_insumos['totalInsumos']} itens)")
    
    if composicoes:
        codigos_insumos = {i["codigo"] for i in insumos} if insumos else set()
        resultado_composicoes = validar_composicoes(composicoes, codigos_insumos)
        if not resultado_composicoes["valido"]:
            print("✗ Validação de composições falhou:")
            if resultado_composicoes["duplicados"]:
                print(f"  - Códigos duplicados: {resultado_composicoes['duplicados']}")
            if resultado_composicoes["referenciasOrfas"]:
                print(f"  - Referências órfãs: {resultado_composicoes['referenciasOrfas'][:5]}...")
            sys.exit(1)
        print(f"✓ Composições validadas ({resultado_composicoes['totalComposicoes']} itens)")
    
    print()
    
    if args.dry_run:
        print("[4/4] DRY-RUN: simulação concluída sem persistir dados")
        print("✓ ETL concluído com sucesso (modo simulação)")
        return
    
    print("[4/4] Persistindo dados no Azure Table Storage")
    
    try:
        if insumos:
            insumo_repo = InsumoSINAPIRepository(get_table_client("InsumoSINAPI"))
            for i, insumo in enumerate(insumos, 1):
                insumo_repo.create_insumo(insumo)
                if i % 100 == 0:
                    print(f"  Insumos: {i}/{len(insumos)}")
            print(f"✓ {len(insumos)} insumos persistidos")
        
        if composicoes:
            comp_repo = ComposicaoAnaliticaRepository(get_table_client("ComposicaoAnalitica"))
            for i, comp in enumerate(composicoes, 1):
                comp_repo.create_composicao(comp)
                if i % 50 == 0:
                    print(f"  Composições: {i}/{len(composicoes)}")
            print(f"✓ {len(composicoes)} composições persistidas")
        
        print()
        print("✓ ETL concluído com sucesso")
        print(f"Versão SINAPI {args.ref} disponível para uso")
        
    except Exception as e:
        print(f"✗ Erro ao persistir dados: {e}")
        sys.exit(1)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ETL para ingestão de dados SINAPI")
    parser.add_argument("--ise", help="Caminho para arquivo Excel ISE (Insumos)")
    parser.add_argument("--composicoes", help="Caminho para arquivo Excel de composições analíticas")
    parser.add_argument("--ref", required=True, help="Referência SINAPI no formato AAAA-MM (ex: 2026-04)")
    parser.add_argument("--dry-run", action="store_true", help="Modo simulação (não persiste dados)")
    
    args = parser.parse_args()
    
    if not args.ise and not args.composicoes:
        print("Erro: forneça ao menos um arquivo (--ise ou --composicoes)")
        sys.exit(1)
    
    executar_etl(args)
