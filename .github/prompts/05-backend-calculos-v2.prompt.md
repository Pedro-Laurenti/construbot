---
agent: 'agent'
description: 'Backend FastAPI com rotas de calculo orcamentario v2: encargos, MO (3 cenarios + bonus), materiais, INCC, fluxo de caixa, BDI, parcela Price e AA'
---

# Tarefa: Implementar Backend de Calculos Orcamentarios v2

## Regras obrigatorias ANTES de qualquer codigo

Leia e respeite TODOS os arquivos em `.github/instructions/`:
- `rules.instructions.md` — regras globais
- `backend.instructions.md` — stack FastAPI, estrutura routers/services/utils
- `frontend.instructions.md` — referencia para alinhamento de tipos

---

## Contexto critico

Este e um **prototipo de alta fidelidade**. O backend implementa APENAS os calculos orcamentarios — sem autenticacao, sem persistencia em banco de dados, sem Azure Table Storage. Os dados vem no body da request e a response retorna o resultado calculado.

O objetivo e que o frontend possa chamar estas rotas em vez de calcular tudo no `lib/calculos.ts`, permitindo que a logica de calculo fique centralizada no backend e seja testavel independentemente.

**O calculo deve seguir EXATAMENTE a metodologia descrita no documento `metodologia_orcamentaria_v2_integral.docx`.**

---

## Stack

- FastAPI (Python 3.13)
- Pydantic para request/response models
- Sem banco de dados
- Sem autenticacao
- CORS habilitado para o frontend
- Rotas sob prefixo `/api/calculos/`

---

## Estrutura de arquivos

```
backend/
  app/
    main.py                     <- registrar novo router
    routers/
      health.py                 <- manter
      calculos.py               <- NOVO: rotas de calculo
    services/
      orcamento_service.py      <- NOVO: logica de calculo
    utils/
      config.py                 <- manter (adicionar constantes)
      helpers.py                <- manter
  requirements.txt              <- manter
```

---

## Constantes — adicionar em `utils/config.py`

```python
CM_ENCARGOS_GRUPO_A = 0.2780
CM_ENCARGOS_GRUPO_B = 0.5293
CM_ENCARGOS_GRUPO_C_FORMULA = "A * B"
CM_ENCARGOS_GRUPO_D = 0.1619
CM_ENCARGOS_GRUPO_D_PRIME_FORMULA = "(A - A2_FGTS - A8_SECONCI) * D1_AVISO_PREVIO"
CM_ENCARGOS_GRUPO_E = 0.4633
CM_ENCARGOS_TOTAL = 1.6013
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
CM_PRODUTIVIDADE_SINAPI = 1.00

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
```

---

## Modelos Pydantic — em `routers/calculos.py` ou `models/` separado

```python
from pydantic import BaseModel
from typing import Optional
from enum import Enum

class ContratoModalidade(str, Enum):
    MEI = "MEI"
    CLT = "CLT"

class ModalidadeFinanciamento(str, Enum):
    MCMV = "MCMV"
    SBPE = "SBPE"


class EncargosRequest(BaseModel):
    grupo_a: float = 0.2780
    grupo_b: float = 0.5293
    grupo_d: float = 0.1619
    grupo_e: float = 0.4633
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
    salario_qualificado: float = 2664.75
    salario_meio_oficial: float = 2427.36
    salario_servente: float = 2189.97
    fator_encargos: float = 2.6013

class SalarioCalculado(BaseModel):
    categoria: str
    salario_base: float
    salario_com_encargos: float
    diaria_sem_encargos: float
    diaria_com_encargos: float
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
    produtividade_basica_unh: float
    adicional_produtividade: float = 1.3
    proporcao_ajudante: float
    rs_un_sinapi: float
    prazo_requerido_dias: int
    modalidade: ContratoModalidade
    salario_qualificado: float = 2664.75
    salario_servente: float = 2189.97
    fator_encargos: float = 2.6013
    valor_meta_diario: float = 220.00

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
    incc_mensal: float = 0.005
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
    incc_mensal: float = 0.005
    bdi: float = 0.20
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
```

---

## Rotas — `routers/calculos.py`

### POST `/api/calculos/encargos`
Calcula os encargos sociais a partir dos grupos editaveis.

```
Input: EncargosRequest
Output: EncargosResponse

Logica:
  grupo_c = grupo_a * grupo_b
  grupo_d_prime = (grupo_a - a2_fgts - a8_seconci) * d1_aviso_previo
  total = grupo_a + grupo_b + grupo_c + grupo_d + grupo_d_prime + grupo_e
  fator = 1 + total
```

### POST `/api/calculos/salarios`
Calcula salarios com encargos, diarias e valores hora.

```
Input: SalariosRequest
Output: SalariosResponse

Logica para cada categoria:
  salario_com_encargos = salario_base * fator_encargos
  diaria_sem_encargos = salario_base / 22
  diaria_com_encargos = salario_com_encargos / 22
  valor_hora_sem_encargos = salario_base / 176
  valor_hora_com_encargos = salario_com_encargos / 176
```

### POST `/api/calculos/mao-de-obra`
Calcula MO para um servico com 3 cenarios + bonus.

```
Input: ServicoMORequest
Output: ServicoMOResponse

Logica:

1. Produtividade Requerida = prod_basica * adicional_produtividade
2. HH Profissional = quantidade / produtividade_requerida
3. HH Ajudante = hh_profissional * proporcao_ajudante
4. Valor hora qualificado sem enc = salario_qualificado / 176
5. Valor hora servente sem enc = salario_servente / 176
6. Valor hora qualificado com enc = salario_qualificado * fator_encargos / 176
7. Valor hora servente com enc = salario_servente * fator_encargos / 176

Para cada cenario:
  MENSALISTA (80% SINAPI):
    prod = prod_basica * 0.80
    hh_prof = quantidade / prod
    hh_ajud = hh_prof * proporcao_ajudante
    n_prof = ceil(hh_prof / (prazo_requerido * 8))
    n_ajud = ceil(hh_ajud / (prazo_requerido * 8))  # minimo 1 se hh_ajud > 0
    prazo_efetivo = hh_prof / (n_prof * 8)
    custo_base = hh_prof * vh_prof_com_enc + hh_ajud * vh_serv_com_enc
    bonus_cenario = 0  # produtividade abaixo do SINAPI, sem economia

  OTIMA (125% SINAPI):
    prod = prod_basica * 1.25
    hh_prof = quantidade / prod
    hh_ajud = hh_prof * proporcao_ajudante
    n_prof = ceil(hh_prof / (prazo_requerido * 8))
    n_ajud = ceil(hh_ajud / (prazo_requerido * 8))
    prazo_efetivo = hh_prof / (n_prof * 8)
    custo_base = hh_prof * vh_prof_com_enc + hh_ajud * vh_serv_com_enc
    # Bonus deste cenario: economia em relacao ao SINAPI 100%
    c_sinapi_cenario = (quantidade / prod_basica) * vh_prof_com_enc + (quantidade / prod_basica * proporcao_ajudante) * vh_serv_com_enc
    bonus_cenario = max(0, c_sinapi_cenario - custo_base)

  PRAZO (produtividade requerida = basica * adicional):
    prod = prod_basica * adicional_produtividade
    hh_prof = quantidade / prod
    hh_ajud = hh_prof * proporcao_ajudante
    n_prof = ceil(hh_prof / (prazo_requerido * 8))  # minimo 1
    n_ajud = ceil(hh_ajud / (prazo_requerido * 8))
    prazo_efetivo = hh_prof / (n_prof * 8)
    custo_base = hh_prof * vh_prof_com_enc + hh_ajud * vh_serv_com_enc
    c_sinapi_cenario = (quantidade / prod_basica) * vh_prof_com_enc + (quantidade / prod_basica * proporcao_ajudante) * vh_serv_com_enc
    bonus_cenario = max(0, c_sinapi_cenario - custo_base)

Bonus de Performance (sobre cenario Prazo):
  c_sinapi = (quantidade / prod_basica) * vh_prof_com_enc + (quantidade / prod_basica * proporcao_ajudante) * vh_serv_com_enc
  custo_real = cenario_prazo.custo_base
  economia = max(0, c_sinapi - custo_real)
  bonus_cliente = 0.30 * economia
  bonus_profissional = 0.56 * economia  # 0.80 * 0.70
  bonus_construtora = 0.14 * economia   # 0.20 * 0.70

Remuneracao:
  MEI:
    remuneracao_mei = salario_qualificado * 1.3 + 0.64 * economia
    # 0.64 = 0.80 * 0.80 (do total retido 70%, profissional leva 80%, e como MEI leva 80% disso)
    custo_final_mei = hh_prof_prazo * vh_prof_sem_enc * 1.3 + hh_ajud_prazo * vh_serv_com_enc + 0.64 * economia
  CLT:
    remuneracao_clt = custo_real + 0.56 * economia
    custo_final_clt = hh_prof_prazo * vh_prof_com_enc + hh_ajud_prazo * vh_serv_com_enc + 0.56 * economia

  preco_final_mei = custo_final_mei * (1 + bdi)
  preco_final_clt = custo_final_clt * (1 + bdi)

Campos secao 6.8:
  valor_bonus_producao_mei = 0.64 * economia
  valor_bonus_producao_clt = 0.56 * economia
  valor_equivalente_total_un_mei = custo_final_mei / quantidade
  valor_equivalente_total_un_clt = custo_final_clt / quantidade
  valor_mensal_esperado_mei = remuneracao_mei * (22 / prazo_efetivo_prazo)
  valor_mensal_esperado_clt = remuneracao_clt * (22 / prazo_efetivo_prazo)
  salario_esperado_mei = salario_qualificado * 1.3 + valor_bonus_producao_mei
  salario_esperado_clt = salario_qualificado * fator_encargos + valor_bonus_producao_clt
```

### POST `/api/calculos/materiais`
Calcula custo de materiais para um servico.

```
Input: ServicoMatRequest
Output: ServicoMatResponse

Logica:
  Para cada insumo (ate 5):
    custo_unitario = coeficiente * valor_unitario
    custo_total = custo_unitario * quantidade
    Se valor_unitario == 0 e valor_unitario_sp != None:
      usar valor_unitario_sp como fallback, marcar usa_fallback_sp = true

  custo_unitario_materiais = sum(coeficiente_i * valor_unitario_i)
  custo_total_materiais = custo_unitario_materiais * quantidade
```

### POST `/api/calculos/fluxo-caixa`
Calcula distribuicao mensal com correcao INCC.

```
Input: FluxoCaixaRequest
Output: FluxoCaixaResponse

Logica:
  Se distribuicao_mensal nao fornecida: distribuir igualmente
    parcela_mensal = custo_direto_total / tempo_obra_meses

  Se distribuicao_mensal fornecida (array de percentuais):
    parcela_mensal[i] = custo_direto_total * distribuicao_mensal[i]
    # Validar que sum(distribuicao_mensal) == 1.0

  Para cada mes i de 1 a N:
    incc_acumulado = (1 + incc_mensal)^i - 1
    custo_parcela_corrigido = parcela_mensal[i] * (1 + incc_mensal)^i

  custo_direto_com_incc = sum(custo_parcela_corrigido para todos os meses)
  diferenca_incc = custo_direto_com_incc - custo_direto_total
```

### POST `/api/calculos/precificacao`
Calcula precificacao final completa: consolidacao + INCC + BDI + Price + AA.

```
Input: PrecificacaoRequest
Output: PrecificacaoResponse

Logica:

1. Custo Direto:
  custo_direto_mei = custo_mo_total_mei + custo_mat_total
  custo_direto_clt = custo_mo_total_clt + custo_mat_total
  custo_direto_por_m2_mei = custo_direto_mei / area_construida_m2
  custo_direto_por_m2_clt = custo_direto_clt / area_construida_m2

2. Fluxo de Caixa + INCC (para MEI e CLT):
  Distribuir custo_direto ao longo de tempo_obra_meses
  Se distribuicao_mensal fornecida: usar percentuais
  Senao: distribuir igualmente

  Para cada mes i:
    custo_parcela_mei[i] = custo_direto_mei * percentual[i]
    custo_parcela_clt[i] = custo_direto_clt * percentual[i]
    custo_corrigido_mei[i] = custo_parcela_mei[i] * (1 + incc_mensal)^i
    custo_corrigido_clt[i] = custo_parcela_clt[i] * (1 + incc_mensal)^i

  custo_direto_com_incc_mei = sum(custo_corrigido_mei)
  custo_direto_com_incc_clt = sum(custo_corrigido_clt)

3. BDI:
  preco_final_mei = custo_direto_com_incc_mei * (1 + bdi)
  preco_final_clt = custo_direto_com_incc_clt * (1 + bdi)
  preco_por_m2_mei = preco_final_mei / area_construida_m2
  preco_por_m2_clt = preco_final_clt / area_construida_m2

4. Parcela Price:
  Usar condicoes de financiamento conforme modalidade:
    MCMV: taxa = 0.055/ano, prazo = 420 meses, financiavel = 80%
    SBPE: taxa = 0.0999/ano, prazo = 420 meses, financiavel = 80%
  (Ou usar valores custom do request se fornecidos)

  taxa_mensal = (1 + taxa_juros_anual)^(1/12) - 1
  valor_financiado_mei = preco_final_mei * percentual_financiavel
  valor_financiado_clt = preco_final_clt * percentual_financiavel

  parcela_price_mei = valor_financiado_mei * [taxa_mensal * (1+taxa_mensal)^n] / [(1+taxa_mensal)^n - 1]
  parcela_price_clt = valor_financiado_clt * [taxa_mensal * (1+taxa_mensal)^n] / [(1+taxa_mensal)^n - 1]

5. Aporte Minimo (AA):
  aporte_minimo_mei = preco_final_mei - valor_financiado_mei
  aporte_minimo_clt = preco_final_clt - valor_financiado_clt

6. Tabela de Aportes Mensais (para MEI e CLT):
  MCMV:
    # Aportes proprios concentrados nos primeiros meses
    # Repasses do financiamento conforme medicao
    Para cada mes i:
      repasse[i] = valor_financiado * (custo_corrigido[i] / custo_direto_com_incc)
      aporte_proprio[i] = custo_corrigido[i] - repasse[i]
      # Ajustar para que sum(aporte_proprio) = aporte_minimo

  SBPE:
    # Aportes proprios diluidos igualmente
    aporte_mensal_fixo = aporte_minimo / tempo_obra_meses
    Para cada mes i:
      aporte_proprio[i] = aporte_mensal_fixo
      repasse[i] = custo_corrigido[i] - aporte_proprio[i]
      # Se repasse negativo: ajustar aporte para cobrir
```

### GET `/api/calculos/parametros-padrao`
Retorna todos os parametros padrao do sistema.

```
Output: {
  encargos: { grupo_a, grupo_b, ..., total, fator },
  salarios: { qualificado, meio_oficial, servente },
  bdi: 0.20,
  valor_meta_diario: 220.00,
  premio_maximo_mensal: 2175.25,
  incc_mensal: 0.005,
  financiamento: {
    mcmv: { taxa, prazo, percentual, valor_maximo },
    sbpe: { taxa, prazo, percentual, valor_maximo }
  },
  bonus: { cliente: 0.30, profissional: 0.56, construtora: 0.14 }
}
```

---

## Service — `services/orcamento_service.py`

Toda a logica de calculo fica neste service. O router apenas valida o input e chama o service.

```python
import math

def calcular_encargos(grupo_a, grupo_b, grupo_d, grupo_e, a2_fgts, a8_seconci, d1_aviso_previo):
    grupo_c = grupo_a * grupo_b
    grupo_d_prime = (grupo_a - a2_fgts - a8_seconci) * d1_aviso_previo
    total = grupo_a + grupo_b + grupo_c + grupo_d + grupo_d_prime + grupo_e
    fator = 1 + total
    return {
        "grupo_a": grupo_a, "grupo_b": grupo_b, "grupo_c": round(grupo_c, 4),
        "grupo_d": grupo_d, "grupo_d_prime": round(grupo_d_prime, 4),
        "grupo_e": grupo_e, "total": round(total, 4), "fator": round(fator, 4)
    }

def calcular_salario(salario_base, fator_encargos, categoria):
    return {
        "categoria": categoria,
        "salario_base": salario_base,
        "salario_com_encargos": round(salario_base * fator_encargos, 2),
        "diaria_sem_encargos": round(salario_base / 22, 3),
        "diaria_com_encargos": round(salario_base * fator_encargos / 22, 2),
        "valor_hora_sem_encargos": round(salario_base / 176, 2),
        "valor_hora_com_encargos": round(salario_base * fator_encargos / 176, 2),
    }

def calcular_cenario(nome, produtividade, quantidade, proporcao_ajudante,
                     prazo_requerido, vh_prof, vh_ajud, prod_sinapi_base, vh_prof_enc, vh_ajud_enc):
    hh_prof = quantidade / produtividade
    hh_ajud = hh_prof * proporcao_ajudante
    n_prof = max(1, math.ceil(hh_prof / (prazo_requerido * 8)))
    n_ajud = max(1, math.ceil(hh_ajud / (prazo_requerido * 8))) if hh_ajud > 0 else 0
    prazo_efetivo = hh_prof / (n_prof * 8)
    custo_base = hh_prof * vh_prof_enc + hh_ajud * vh_ajud_enc

    hh_sinapi = quantidade / prod_sinapi_base
    hh_ajud_sinapi = hh_sinapi * proporcao_ajudante
    c_sinapi = hh_sinapi * vh_prof_enc + hh_ajud_sinapi * vh_ajud_enc
    bonus = max(0, c_sinapi - custo_base) if nome != "Mensalista" else 0

    return {
        "cenario": nome,
        "produtividade_unh": round(produtividade, 3),
        "produtividade_un_dia": round(produtividade * 8, 3),
        "hh_profissional": round(hh_prof, 2),
        "hh_ajudante": round(hh_ajud, 2),
        "profissionais_necessarios": n_prof,
        "ajudantes_necessarios": n_ajud,
        "prazo_efetivo_dias": round(prazo_efetivo, 1),
        "custo_base": round(custo_base, 2),
        "bonus_cenario": round(bonus, 2),
    }

def calcular_parcela_price(valor_financiado, taxa_juros_anual, prazo_meses):
    taxa_mensal = (1 + taxa_juros_anual) ** (1/12) - 1
    if taxa_mensal == 0:
        return valor_financiado / prazo_meses
    numerador = taxa_mensal * (1 + taxa_mensal) ** prazo_meses
    denominador = (1 + taxa_mensal) ** prazo_meses - 1
    return valor_financiado * (numerador / denominador)

def calcular_fluxo_caixa_incc(custo_direto, tempo_meses, incc_mensal, distribuicao=None):
    if distribuicao and len(distribuicao) == tempo_meses:
        parcelas = [custo_direto * p for p in distribuicao]
    else:
        parcela_base = custo_direto / tempo_meses
        parcelas = [parcela_base] * tempo_meses

    resultado = []
    total_corrigido = 0
    for i in range(tempo_meses):
        fator_incc = (1 + incc_mensal) ** (i + 1)
        corrigido = parcelas[i] * fator_incc
        total_corrigido += corrigido
        resultado.append({
            "mes": i + 1,
            "custo_parcela": round(parcelas[i], 2),
            "incc_acumulado": round(fator_incc - 1, 6),
            "custo_parcela_corrigido": round(corrigido, 2),
        })
    return resultado, round(total_corrigido, 2)
```

---

## Formulas Consolidadas — Referencia Completa

### Encargos Sociais (160,13%)
```
Grupo A = 27,80% (8 itens: INSS 10%, FGTS 8%, Sal.Ed 2,5%, SESI 1,5%, SENAI/SEBRAE 16%, INCRA 2%, Seguro 3%, SECONCI 1%)
Grupo B = 52,93% (7 itens: DSR 18,13%, Feriados 8%, Ferias+1/3 15,10%, Aux.Enf 2,58%, 13o 11,33%, Lic.Pat 0,13%, Faltas 0,76%)
Grupo C = A * B = 0,2780 * 0,5293 = 14,71%
Grupo D = 16,19% (4 itens: Aviso Previo 11,56%, Desp.Injusta 3,08%, Ind.Adicional 0,78%, LC110 0,77%)
Grupo D' = (A - FGTS - SECONCI) * Aviso Previo = (0,2780 - 0,0800 - 0,0100) * 0,1156 = 2,17%
Grupo E = 46,33% (7 itens: Chuva 1,5%, Almoco 21,34%, Jantar 3,87%, Cafe 8,47%, EPI 6,14%, VT 4,57%, Seg.Vida 0,44%)
Total = 27,80 + 52,93 + 14,71 + 16,19 + 2,17 + 46,33 = 160,13%
Fator = 2,6013
```

### Salarios e Valores Hora
```
S_com_encargos = S_base * 2,6013
Qualificado: R$2.664,75 * 2,6013 = R$6.931,81 | Vh = R$39,38/h
Servente: R$2.189,97 * 2,6013 = R$5.697,33 | Vh = R$32,37/h
Vh_sem_enc_qualificado = 2664,75 / 176 = R$15,14/h
Vh_sem_enc_servente = 2189,97 / 176 = R$12,44/h
```

### Mao de Obra
```
Produtividade Requerida = Prod. Basica SINAPI * Adicional
HH Profissional = Quantidade / Produtividade Requerida
HH Ajudante = HH Profissional * Proporcao Ajudante
N Profissionais (Prazo) = ceil(HH / (Prazo * 8))
Prazo Efetivo = HH / (N Prof * 8)
Custo Base = (HH Prof * Vh Prof) + (HH Ajud * Vh Ajud)
```

### Bonus
```
Economia = max(0, C_SINAPI - C_real)
Bonus Cliente = 0,30 * Economia
Bonus Profissional = 0,56 * Economia (0,80 * 0,70)
Bonus Construtora = 0,14 * Economia (0,20 * 0,70)
MEI: Remuneracao = S_base * 1,3 + 0,64 * Economia
CLT: Remuneracao = Custo Fixo + 0,56 * Economia
```

### Materiais
```
C_mat_servico = Quantidade * SUM(Coeficiente_i * Valor_Unitario_i) para i=1 a 5
Fallback: quando preco da UF = null, usar preco de SP
```

### INCC
```
Custo Parcela Corrigida = Custo Parcela * (1 + INCC)^n
n = numero de meses ate o desembolso
Custo Direto com INCC = SUM(todas as parcelas corrigidas)
```

### BDI e Preco Final
```
Preco Final = Custo Direto com INCC * 1,20
Preco por m2 = Preco Final / Area Construida
```

### Parcela Price (sistema Price)
```
taxa_mensal = (1 + taxa_anual)^(1/12) - 1
valor_financiado = preco_final * percentual_financiavel
parcela = valor_financiado * [taxa * (1+taxa)^n] / [(1+taxa)^n - 1]
```

### Aporte Minimo (AA)
```
AA = preco_final * (1 - percentual_financiavel)
```

---

## Registro do router em `main.py`

```python
from routers import calculos
app.include_router(calculos.router, prefix="/api", tags=["Calculos"])
```

---

## Resultado esperado

Ao final, o backend deve expor as seguintes rotas funcionais:
1. `GET /api/calculos/parametros-padrao` — retorna todos os parametros default
2. `POST /api/calculos/encargos` — calcula encargos sociais (160,13%) a partir dos grupos editaveis
3. `POST /api/calculos/salarios` — calcula salarios com encargos, diarias e valores hora
4. `POST /api/calculos/mao-de-obra` — calcula MO com 3 cenarios + bonus + contratacao MEI/CLT
5. `POST /api/calculos/materiais` — calcula custo de materiais com fallback SP
6. `POST /api/calculos/fluxo-caixa` — calcula distribuicao mensal + correcao INCC
7. `POST /api/calculos/precificacao` — calcula precificacao final completa (INCC + BDI + Price + AA + tabela aportes)

Todas as formulas devem seguir EXATAMENTE a metodologia do documento, com os valores de referencia:
- Encargos: 160,13% (fator 2,6013)
- BDI: 20% (fator 1,20)
- Bonus: 30% cliente / 56% profissional / 14% construtora
- MEI: S_base * 1,3 + 0,64 * Economia
- INCC: projecao mensal sobre fluxo de caixa
- Price: sistema Price com condicoes Caixa vigentes
