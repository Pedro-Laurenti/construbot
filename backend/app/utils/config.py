import os

CM_APP_CORS_ORIGINS = os.getenv(
    "CM_APP_CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,https://construbot-frontend.azurewebsites.net",
).split(",")

CM_ENCARGOS_GRUPO_A = 0.2780
CM_ENCARGOS_GRUPO_B = 0.5293
CM_ENCARGOS_GRUPO_D = 0.1619
CM_ENCARGOS_GRUPO_E = 0.4633
CM_FATOR_ENCARGOS = 2.6013

CM_SALARIO_QUALIFICADO = 2664.75
CM_SALARIO_MEIO_OFICIAL = 2427.36
CM_SALARIO_SERVENTE = 2189.97

CM_HORAS_MES = 176
CM_DIAS_MES = 22
CM_HORAS_DIA = 8

CM_BDI_PADRAO = 0.20
CM_VALOR_META_DIARIO = 220.00
CM_PREMIO_MAXIMO_MENSAL = 2175.25

CM_ADICIONAL_PRODUTIVIDADE_PADRAO = 1.3
CM_PRODUTIVIDADE_MENSALISTA = 0.80
CM_PRODUTIVIDADE_OTIMA = 1.25

CM_BONUS_CLIENTE = 0.30
CM_BONUS_PROFISSIONAL = 0.56
CM_BONUS_CONSTRUTORA = 0.14

CM_INCC_MENSAL_PADRAO = 0.005

CM_MCMV_TAXA_JUROS_ANUAL = 0.055
CM_MCMV_PRAZO_MAXIMO_MESES = 420
CM_MCMV_PERCENTUAL_FINANCIAVEL = 0.80
CM_MCMV_VALOR_MAXIMO = 600000

CM_SBPE_TAXA_JUROS_ANUAL = 0.0999
CM_SBPE_PRAZO_MAXIMO_MESES = 420
CM_SBPE_PERCENTUAL_FINANCIAVEL = 0.80
CM_SBPE_VALOR_MAXIMO = 1500000

CM_SERVICE_CONFIG = {
    "FUNDACAO": {"prod_basica": 0.12, "prop_ajudante": 1.0, "material_unitario": 380},
    "ESTRUTURA_CONCRETO": {"prod_basica": 0.08, "prop_ajudante": 1.0, "material_unitario": 850},
    "ALVENARIA": {"prod_basica": 1.00, "prop_ajudante": 0.5, "material_unitario": 45},
    "GRAUTE": {"prod_basica": 0.20, "prop_ajudante": 1.0, "material_unitario": 420},
    "ARMACAO_VERTICAL_HORIZONTAL": {"prod_basica": 8.00, "prop_ajudante": 0.5, "material_unitario": 9},
    "CONTRAPISO": {"prod_basica": 1.50, "prop_ajudante": 0.5, "material_unitario": 28},
    "REVESTIMENTO_ARGAMASSA_PAREDE": {"prod_basica": 1.20, "prop_ajudante": 0.5, "material_unitario": 18},
    "REVESTIMENTO_ARGAMASSA_TETO": {"prod_basica": 0.80, "prop_ajudante": 0.5, "material_unitario": 22},
    "REVESTIMENTO_CERAMICO": {"prod_basica": 1.10, "prop_ajudante": 0.5, "material_unitario": 75},
    "PINTURA_INTERNA": {"prod_basica": 3.00, "prop_ajudante": 0.3, "material_unitario": 12},
    "PINTURA_EXTERNA": {"prod_basica": 2.50, "prop_ajudante": 0.3, "material_unitario": 18},
    "LIMPEZA_INTERNA": {"prod_basica": 8.00, "prop_ajudante": 0.5, "material_unitario": 4},
}

CM_COMPOSICOES_ANALITICAS_MOCK = {
    "87888": {"produtividade_basica": 1 / 0.87, "proporcao_ajudante": 0.75 / 0.87},
    "87251": {"produtividade_basica": 1 / 0.48, "proporcao_ajudante": 0.35 / 0.48},
    "87264": {"produtividade_basica": 1 / 0.50, "proporcao_ajudante": 0},
    "88484": {"produtividade_basica": 1 / 0.32, "proporcao_ajudante": 0.10 / 0.32},
    "87557": {"produtividade_basica": 1 / 5.20, "proporcao_ajudante": 6.50 / 5.20},
    "104924": {"produtividade_basica": 1 / 4.80, "proporcao_ajudante": 6.00 / 4.80},
    "97083": {"produtividade_basica": 1 / 3.50, "proporcao_ajudante": 5.00 / 3.50},
    "97096": {"produtividade_basica": 1 / 4.00, "proporcao_ajudante": 5.50 / 4.00},
    "89288": {"produtividade_basica": 1 / 0.75, "proporcao_ajudante": 0.65 / 0.75},
    "104442": {"produtividade_basica": 1 / 0.80, "proporcao_ajudante": 0.70 / 0.80},
    "89993": {"produtividade_basica": 1 / 2.00, "proporcao_ajudante": 3.50 / 2.00},
    "89995": {"produtividade_basica": 1 / 2.50, "proporcao_ajudante": 4.00 / 2.50},
    "87622": {"produtividade_basica": 1 / 0.35, "proporcao_ajudante": 0.25 / 0.35},
    "87421": {"produtividade_basica": 1 / 0.55, "proporcao_ajudante": 0.20 / 0.55},
    "87414": {"produtividade_basica": 1 / 0.75, "proporcao_ajudante": 0.25 / 0.75},
    "87257": {"produtividade_basica": 1 / 0.75, "proporcao_ajudante": 0.45 / 0.75},
    "87263": {"produtividade_basica": 1 / 0.85, "proporcao_ajudante": 0.50 / 0.85},
    "88489": {"produtividade_basica": 1 / 0.35, "proporcao_ajudante": 0.08 / 0.35},
    "88423": {"produtividade_basica": 1 / 0.40, "proporcao_ajudante": 0.10 / 0.40},
}

CM_STORAGE_ACCOUNT_NAME = os.getenv("CM_STORAGE_ACCOUNT_NAME", "")
CM_STORAGE_ACCOUNT_URL = os.getenv("CM_STORAGE_ACCOUNT_URL", "")
CM_STORAGE_CONNECTION_STRING = os.getenv("CM_STORAGE_CONNECTION_STRING", "")

CM_TABLE_CLIENTE = "Cliente"
CM_TABLE_ORCAMENTO = "Orcamento"
CM_TABLE_ORCAMENTO_ENGENHEIRO = "OrcamentoEngenheiro"
CM_TABLE_PLANTA = "PlantaPadrao"
CM_TABLE_OPCIONAL = "Opcional"
CM_TABLE_PARAMETROS_GLOBAIS = "ParametrosGlobais"
CM_TABLE_GRUPOS_ENCARGOS = "GruposEncargos"
CM_TABLE_COMPOSICAO_PROFISSIONAL = "ComposicaoProfissional"
CM_TABLE_INSUMO_SINAPI = "InsumoSINAPI"
CM_TABLE_COMPOSICAO_ANALITICA = "ComposicaoAnalitica"
CM_TABLE_AUDITORIA = "Auditoria"
CM_TABLE_USUARIO = "Usuario"

CM_TENANT_ID_DEFAULT = "default"

CM_AZURE_AD_TENANT_ID = os.getenv("CM_AZURE_AD_TENANT_ID", "")
CM_AZURE_AD_CLIENT_ID = os.getenv("CM_AZURE_AD_CLIENT_ID", "")
CM_AZURE_AD_AUDIENCE = os.getenv("CM_AZURE_AD_AUDIENCE", "")
CM_JWT_ALGORITHM = "RS256"
CM_JWT_ISSUER = f"https://login.microsoftonline.com/{CM_AZURE_AD_TENANT_ID}/v2.0"
