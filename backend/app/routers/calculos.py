from typing import Dict, Any, Optional

from fastapi import APIRouter
from pydantic import BaseModel
from enum import Enum

from app.services.orcamento_service import (
    calcular_encargos,
    calcular_salario,
    calcular_mao_de_obra,
    calcular_materiais,
    calcular_fluxo_caixa_incc,
    calcular_parcela_price,
    calcular_precificacao_completa,
    calcular_faixa_cotacao,
    consolidar_engenheiro,
    gerar_quantitativos_from_parametros,
)
from app.utils.config import (
    CM_ENCARGOS_GRUPO_A, CM_ENCARGOS_GRUPO_B, CM_ENCARGOS_GRUPO_D,
    CM_ENCARGOS_GRUPO_E, CM_FATOR_ENCARGOS, CM_SALARIO_QUALIFICADO,
    CM_SALARIO_MEIO_OFICIAL, CM_SALARIO_SERVENTE, CM_BDI_PADRAO,
    CM_VALOR_META_DIARIO, CM_PREMIO_MAXIMO_MENSAL, CM_INCC_MENSAL_PADRAO,
    CM_BONUS_CLIENTE, CM_BONUS_PROFISSIONAL, CM_BONUS_CONSTRUTORA,
    CM_MCMV_TAXA_JUROS_ANUAL, CM_MCMV_PRAZO_MAXIMO_MESES,
    CM_MCMV_PERCENTUAL_FINANCIAVEL, CM_MCMV_VALOR_MAXIMO,
    CM_SBPE_TAXA_JUROS_ANUAL, CM_SBPE_PRAZO_MAXIMO_MESES,
    CM_SBPE_PERCENTUAL_FINANCIAVEL, CM_SBPE_VALOR_MAXIMO,
)

router = APIRouter()


class ContratoModalidade(str, Enum):
    MEI = "MEI"
    CLT = "CLT"


class ModalidadeFinanciamento(str, Enum):
    MCMV = "MCMV"
    SBPE = "SBPE"


class EncargosRequest(BaseModel):
    grupo_a: float = CM_ENCARGOS_GRUPO_A
    grupo_b: float = CM_ENCARGOS_GRUPO_B
    grupo_d: float = CM_ENCARGOS_GRUPO_D
    grupo_e: float = CM_ENCARGOS_GRUPO_E
    a2_fgts: float = 0.08
    a8_seconci: float = 0.01
    d1_aviso_previo: float = 0.1156


class EncargosResponse(BaseModel):
    grupo_a: float
    grupo_b: float
    grupo_c: float
    grupo_d: float
    grupo_d_prime: float
    grupo_e: float
    total: float
    fator: float


class SalariosRequest(BaseModel):
    salario_qualificado: float = CM_SALARIO_QUALIFICADO
    salario_meio_oficial: float = CM_SALARIO_MEIO_OFICIAL
    salario_servente: float = CM_SALARIO_SERVENTE
    fator_encargos: float = CM_FATOR_ENCARGOS


class SalarioCalculado(BaseModel):
    categoria: str
    salario_base: float
    salario_com_encargos: float
    diaria_sem_encargos: float
    diaria_com_encargos: float
    diaria_custo_total_encargos: float
    valor_hora_sem_encargos: float
    valor_hora_com_encargos: float


class SalariosResponse(BaseModel):
    qualificado: SalarioCalculado
    meio_oficial: SalarioCalculado
    servente: SalarioCalculado


class ServicoMORequest(BaseModel):
    servico_id: str
    servico_nome: str
    unidade: str
    quantidade: float
    composicao_basica: Optional[str] = None
    especificacao1: Optional[str] = None
    produtividade_basica_unh: float
    adicional_produtividade: float = 1.3
    proporcao_ajudante: float
    rs_un_sinapi: float
    prazo_requerido_dias: int
    modalidade: ContratoModalidade
    modalidade_ajudante: ContratoModalidade = ContratoModalidade.CLT
    salario_qualificado: float = CM_SALARIO_QUALIFICADO
    salario_servente: float = CM_SALARIO_SERVENTE
    fator_encargos: float = CM_FATOR_ENCARGOS
    valor_meta_diario: float = CM_VALOR_META_DIARIO


class CenarioEquipeResponse(BaseModel):
    cenario: str
    produtividade_unh: float
    produtividade_un_dia: float
    hh_profissional: float
    hh_ajudante: float
    profissionais_necessarios: int
    ajudantes_necessarios: int
    prazo_efetivo_dias: float
    custo_base: float
    bonus_cenario: float


class ServicoMOResponse(BaseModel):
    servico_id: str
    produtividade_requerida: float
    hh_profissional: float
    hh_ajudante: float
    mensalista: CenarioEquipeResponse
    otima: CenarioEquipeResponse
    prazo: CenarioEquipeResponse
    c_sinapi: float
    economia: float
    bonus_cliente: float
    desconto_cliente: float
    bonus_profissional: float
    bonus_construtora: float
    remuneracao_mei: float
    remuneracao_clt: float
    salario_esperado_mei: float
    salario_esperado_clt: float
    valor_bonus_producao_mei: float
    valor_bonus_producao_clt: float
    valor_equivalente_total_un_mei: float
    valor_equivalente_total_un_clt: float
    valor_mensal_esperado_mei: float
    valor_mensal_esperado_clt: float
    custo_final_mei: float
    custo_final_clt: float
    preco_final_mei: float
    preco_final_clt: float


class InsumoRequest(BaseModel):
    codigo: str
    descricao: str
    unidade: str
    coeficiente: float
    valor_unitario: float
    valor_unitario_sp: Optional[float] = None
    usa_fallback_sp: bool = False


class ServicoMatRequest(BaseModel):
    servico_id: str
    servico_nome: str
    unidade: str
    quantidade: float
    insumos: list[InsumoRequest]


class InsumoResultado(BaseModel):
    codigo: str
    descricao: str
    unidade: str
    coeficiente: float
    valor_unitario: float
    custo_unitario: float
    custo_total: float
    usa_fallback_sp: bool


class ServicoMatResponse(BaseModel):
    servico_id: str
    custo_unitario_materiais: float
    custo_total_materiais: float
    insumos: list[InsumoResultado]


class FluxoCaixaRequest(BaseModel):
    custo_direto_total: float
    tempo_obra_meses: int
    incc_mensal: float = CM_INCC_MENSAL_PADRAO
    distribuicao_mensal: Optional[list[float]] = None


class FluxoCaixaMensalResponse(BaseModel):
    mes: int
    custo_parcela: float
    incc_acumulado: float
    custo_parcela_corrigido: float


class FluxoCaixaResponse(BaseModel):
    custo_direto_total: float
    custo_direto_com_incc: float
    diferenca_incc: float
    parcelas: list[FluxoCaixaMensalResponse]


class PrecificacaoRequest(BaseModel):
    custo_mo_total_mei: float
    custo_mo_total_clt: float
    custo_mat_total: float
    area_construida_m2: float
    tempo_obra_meses: int
    incc_mensal: float = CM_INCC_MENSAL_PADRAO
    bdi: float = CM_BDI_PADRAO
    modalidade_financiamento: ModalidadeFinanciamento
    taxa_juros_anual: Optional[float] = None
    prazo_financiamento_meses: Optional[int] = None
    percentual_financiavel: Optional[float] = None
    distribuicao_mensal: Optional[list[float]] = None


class AporteMensalResponse(BaseModel):
    mes: int
    aporte_recursos_proprios: float
    repasse_financiamento: float
    desembolso_total: float


class PrecificacaoResponse(BaseModel):
    custo_direto_mei: float
    custo_direto_clt: float
    custo_direto_por_m2_mei: float
    custo_direto_por_m2_clt: float
    custo_direto_com_incc_mei: float
    custo_direto_com_incc_clt: float
    preco_final_mei: float
    preco_final_clt: float
    preco_por_m2_mei: float
    preco_por_m2_clt: float
    parcela_price_mei: float
    parcela_price_clt: float
    aporte_minimo_mei: float
    aporte_minimo_clt: float
    tabela_aportes_mei: list[AporteMensalResponse]
    tabela_aportes_clt: list[AporteMensalResponse]
    fluxo_caixa_mei: list[FluxoCaixaMensalResponse]
    fluxo_caixa_clt: list[FluxoCaixaMensalResponse]


class ParametrosFaixaRequest(BaseModel):
    bdi: float = CM_BDI_PADRAO
    fator_encargos: float = CM_FATOR_ENCARGOS
    salario_qualificado: float = CM_SALARIO_QUALIFICADO
    salario_servente: float = CM_SALARIO_SERVENTE


class ImpactoOpcionalRequest(BaseModel):
    tipo: str
    service_type: str
    incremento_quantidade: Optional[float] = None


class OpcionalQuantitativoRequest(BaseModel):
    selecionado: bool
    impacto_servicos: list[ImpactoOpcionalRequest]


class ServicoPlantaRequest(BaseModel):
    service_type: str
    descricao: str
    unidade: str
    quantidade: float
    especificacao1: str = ""
    especificacao2: str = ""
    especificacao3: str = ""
    composicao_basica: str = ""
    composicao_profissional_id: int = 0


class PlantaQuantitativoRequest(BaseModel):
    id: str
    tempo_obra_meses: int
    servicos: list[ServicoPlantaRequest]


class QuantitativoServicoResponse(BaseModel):
    id: str
    service_type: str
    descricao: str
    unidade: str
    quantidade: float
    especificacao1: str
    especificacao2: str
    especificacao3: str
    composicao_basica: str
    composicao_manual: bool
    composicao_profissional_id: int
    modalidade: ContratoModalidade
    modalidade_ajudante: ContratoModalidade
    adicional_produtividade: float
    origem: str
    prazo_requerido: int


class GerarQuantitativosRequest(BaseModel):
    planta: PlantaQuantitativoRequest
    opcionais: list[OpcionalQuantitativoRequest]


class GerarQuantitativosResponse(BaseModel):
    quantitativos: list[QuantitativoServicoResponse]


class FaixaCotacaoRequest(BaseModel):
    quantitativos: list[QuantitativoServicoResponse]
    parametros: ParametrosFaixaRequest = ParametrosFaixaRequest()
    incc_mensal: float = CM_INCC_MENSAL_PADRAO
    tempo_obra_meses: int


class FaixaCotacaoResponse(BaseModel):
    minimo: float
    maximo: float
    area_construida_m2: float
    tempo_obra_meses: int


class InsumoCalculoRequest(BaseModel):
    codigo_sinapi: str
    descricao: str
    unidade: str
    coeficiente: float
    valor_unitario: float
    total: float = 0


class CalculoMatConfigRequest(BaseModel):
    servico_id: str
    servico: str
    unidade: str
    quantidade: float
    composicao_basica: str
    insumos: list[InsumoCalculoRequest]


class ConsolidacaoRequest(BaseModel):
    orcamento_id: str
    cliente_id: str
    resultados_mo: dict[str, ServicoMOResponse]
    configs_mat: dict[str, CalculoMatConfigRequest]
    area_total: float
    bdi: float = CM_BDI_PADRAO


class ConsolidacaoResponse(BaseModel):
    orcamento_id: str
    cliente_id: str
    custo_mo_total_mei: float
    custo_mo_total_clt: float
    custo_mat_total: float
    custos_diretos_mei: float
    custos_diretos_clt: float
    custos_diretos_por_m2_mei: float
    custos_diretos_por_m2_clt: float
    preco_final_mei: float
    preco_final_clt: float
    preco_por_m2_mei: float
    preco_por_m2_clt: float
    status: str
    observacoes: str


@router.get("/calculos/parametros-padrao")
async def parametros_padrao() -> Dict[str, Any]:
    enc = calcular_encargos(CM_ENCARGOS_GRUPO_A, CM_ENCARGOS_GRUPO_B,
                            CM_ENCARGOS_GRUPO_D, CM_ENCARGOS_GRUPO_E,
                            0.08, 0.01, 0.1156)
    return {
        "encargos": enc,
        "salarios": {
            "qualificado": CM_SALARIO_QUALIFICADO,
            "meio_oficial": CM_SALARIO_MEIO_OFICIAL,
            "servente": CM_SALARIO_SERVENTE,
        },
        "bdi": CM_BDI_PADRAO,
        "valor_meta_diario": CM_VALOR_META_DIARIO,
        "premio_maximo_mensal": CM_PREMIO_MAXIMO_MENSAL,
        "incc_mensal": CM_INCC_MENSAL_PADRAO,
        "financiamento": {
            "mcmv": {
                "taxa": CM_MCMV_TAXA_JUROS_ANUAL,
                "prazo": CM_MCMV_PRAZO_MAXIMO_MESES,
                "percentual": CM_MCMV_PERCENTUAL_FINANCIAVEL,
                "valor_maximo": CM_MCMV_VALOR_MAXIMO,
            },
            "sbpe": {
                "taxa": CM_SBPE_TAXA_JUROS_ANUAL,
                "prazo": CM_SBPE_PRAZO_MAXIMO_MESES,
                "percentual": CM_SBPE_PERCENTUAL_FINANCIAVEL,
                "valor_maximo": CM_SBPE_VALOR_MAXIMO,
            },
        },
        "bonus": {
            "cliente": CM_BONUS_CLIENTE,
            "profissional": CM_BONUS_PROFISSIONAL,
            "construtora": CM_BONUS_CONSTRUTORA,
        },
    }


@router.post("/calculos/encargos", response_model=EncargosResponse)
async def post_encargos(req: EncargosRequest) -> EncargosResponse:
    result = calcular_encargos(req.grupo_a, req.grupo_b, req.grupo_d, req.grupo_e,
                               req.a2_fgts, req.a8_seconci, req.d1_aviso_previo)
    return EncargosResponse(**result)


@router.post("/calculos/salarios", response_model=SalariosResponse)
async def post_salarios(req: SalariosRequest) -> SalariosResponse:
    return SalariosResponse(
        qualificado=SalarioCalculado(**calcular_salario(req.salario_qualificado, req.fator_encargos, "Qualificado")),
        meio_oficial=SalarioCalculado(**calcular_salario(req.salario_meio_oficial, req.fator_encargos, "Meio-Oficial")),
        servente=SalarioCalculado(**calcular_salario(req.salario_servente, req.fator_encargos, "Servente")),
    )


@router.post("/calculos/mao-de-obra", response_model=ServicoMOResponse)
async def post_mao_de_obra(req: ServicoMORequest) -> ServicoMOResponse:
    result = calcular_mao_de_obra(
        req.quantidade, req.produtividade_basica_unh, req.adicional_produtividade,
        req.proporcao_ajudante, req.prazo_requerido_dias, req.salario_qualificado,
        req.salario_servente, req.fator_encargos, CM_BDI_PADRAO,
        req.modalidade.value, req.modalidade_ajudante.value,
        req.composicao_basica, req.especificacao1,
    )
    return ServicoMOResponse(
        servico_id=req.servico_id,
        **result,
    )


@router.post("/calculos/materiais", response_model=ServicoMatResponse)
async def post_materiais(req: ServicoMatRequest) -> ServicoMatResponse:
    insumos = [i.model_dump() for i in req.insumos]
    result = calcular_materiais(req.quantidade, insumos)
    return ServicoMatResponse(servico_id=req.servico_id, **result)


@router.post("/calculos/fluxo-caixa", response_model=FluxoCaixaResponse)
async def post_fluxo_caixa(req: FluxoCaixaRequest) -> FluxoCaixaResponse:
    parcelas, total_corrigido = calcular_fluxo_caixa_incc(
        req.custo_direto_total, req.tempo_obra_meses,
        req.incc_mensal, req.distribuicao_mensal,
    )
    return FluxoCaixaResponse(
        custo_direto_total=req.custo_direto_total,
        custo_direto_com_incc=total_corrigido,
        diferenca_incc=round(total_corrigido - req.custo_direto_total, 2),
        parcelas=[FluxoCaixaMensalResponse(**p) for p in parcelas],
    )


@router.post("/calculos/precificacao", response_model=PrecificacaoResponse)
async def post_precificacao(req: PrecificacaoRequest) -> PrecificacaoResponse:
    if req.modalidade_financiamento == ModalidadeFinanciamento.MCMV:
        taxa = req.taxa_juros_anual or CM_MCMV_TAXA_JUROS_ANUAL
        prazo = req.prazo_financiamento_meses or CM_MCMV_PRAZO_MAXIMO_MESES
        perc = req.percentual_financiavel or CM_MCMV_PERCENTUAL_FINANCIAVEL
    else:
        taxa = req.taxa_juros_anual or CM_SBPE_TAXA_JUROS_ANUAL
        prazo = req.prazo_financiamento_meses or CM_SBPE_PRAZO_MAXIMO_MESES
        perc = req.percentual_financiavel or CM_SBPE_PERCENTUAL_FINANCIAVEL

    result = calcular_precificacao_completa(
        req.custo_mo_total_mei, req.custo_mo_total_clt, req.custo_mat_total,
        req.area_construida_m2, req.tempo_obra_meses, req.incc_mensal,
        req.bdi, req.modalidade_financiamento.value, taxa, prazo, perc,
        req.distribuicao_mensal,
    )
    return PrecificacaoResponse(**result)


@router.post("/calculos/quantitativos", response_model=GerarQuantitativosResponse)
async def post_quantitativos(req: GerarQuantitativosRequest) -> GerarQuantitativosResponse:
    result = gerar_quantitativos_from_parametros(
        req.planta.model_dump(),
        [opcional.model_dump() for opcional in req.opcionais],
    )
    return GerarQuantitativosResponse(
        quantitativos=[QuantitativoServicoResponse(**quantitativo) for quantitativo in result],
    )


@router.post("/calculos/faixa-cotacao", response_model=FaixaCotacaoResponse)
async def post_faixa_cotacao(req: FaixaCotacaoRequest) -> FaixaCotacaoResponse:
    result = calcular_faixa_cotacao(
        [quantitativo.model_dump() for quantitativo in req.quantitativos],
        req.parametros.model_dump(),
        req.incc_mensal,
        req.tempo_obra_meses,
    )
    return FaixaCotacaoResponse(**result)


@router.post("/calculos/consolidacao", response_model=ConsolidacaoResponse)
async def post_consolidacao(req: ConsolidacaoRequest) -> ConsolidacaoResponse:
    result = consolidar_engenheiro(
        req.orcamento_id,
        req.cliente_id,
        {chave: valor.model_dump(exclude={"servico_id"}) for chave, valor in req.resultados_mo.items()},
        {chave: valor.model_dump() for chave, valor in req.configs_mat.items()},
        req.area_total,
        req.bdi,
    )
    return ConsolidacaoResponse(**result)
