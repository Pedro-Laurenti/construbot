---
agent: agent
---
# Centralizar Cálculos no Backend

## Contexto

O projeto ConstruBot possui atualmente:
- **Backend**: FastAPI com rotas de cálculo já implementadas em `backend/app/routers/calculos.py` e lógica de negócio em `backend/app/services/orcamento_service.py`, mas com **divergências** em relação à lógica correta documentada no prompt 13
- **Frontend**: lógica de cálculo completa implementada em `frontend/lib/calculos.ts` com 500+ linhas, calculando tudo localmente (mão de obra, materiais, cenários, fluxo de caixa, INCC, parcela Price, etc.)
- **Etapa 06 concluída**: frontend já migrado para consumir API para persistência (clientes, orçamentos), mas **ainda calcula tudo localmente** para cálculos orcamentários
- **Documentação**: `13-alinhamento-calculos-backend.prompt.md` documenta 22 divergências entre backend Python e frontend TypeScript que impedem paridade de resultados

**Arquivos que serão modificados:**
- `backend/app/services/orcamento_service.py` — corrigir 13 divergências críticas documentadas no prompt 13
- `backend/app/routers/calculos.py` — validar request bodies, adicionar tratamento de erros, garantir resposta estruturada
- `frontend/lib/calculos.ts` — reduzir a um wrapper que chama a API, manter apenas funções auxiliares simples
- `frontend/lib/api.ts` — adicionar funções de chamada aos endpoints de cálculo
- `backend/app/utils/config.py` — validar constantes contra metodologia v2

Esta etapa elimina a duplicação de lógica de cálculo, centraliza no backend (fonte única de verdade), e garante que o frontend sempre use a lógica validada e testada do backend.

## Pré-requisitos

- Etapa alfa-01 concluída (Storage Account provisionado)
- Etapa alfa-02 concluída (schemas documentados)
- Etapa alfa-03 concluída (repositórios implementados)
- Etapa alfa-04 concluída (autenticação Azure AD)
- Etapa alfa-05 concluída (endpoints CRUD expostos)
- Etapa alfa-06 concluída (frontend migrado para API de persistência)

## Entregáveis

Ao final desta etapa, devem existir:

1. **Backend corrigido** com todas as 13 divergências críticas resolvidas:
   - Modalidade e modalidade_ajudante propagadas corretamente
   - Cenário ótima usado para cálculo de custo final (não prazo)
   - Economia calculada contra cenário correto
   - Bônus calculado com percentual correto por modalidade
   - Ajudante MEI tratado corretamente
   - Deduplicação de insumos por código SINAPI
   - Fator INCC corrigido (mês 0 sem correção)
   - Desconto cliente exposto explicitamente

2. **Frontend simplificado** em `lib/calculos.ts`:
   - Funções auxiliares mantidas: `getCustosHora()`, `resolverParametrosMOComposicao()`, `prazoCenario()`
   - Todas as funções de cálculo complexas removidas e substituídas por chamadas à API
   - Exports reduzidos de 15+ funções para ~5 funções auxiliares + wrapper de API

3. **Camada de API expandida** em `lib/api.ts`:
   - `calcularEncargos(request)` → `POST /api/calculos/encargos`
   - `calcularSalarios(request)` → `POST /api/calculos/salarios`
   - `calcularMaoDeObra(request)` → `POST /api/calculos/mao-de-obra`
   - `calcularMateriais(request)` → `POST /api/calculos/materiais`
   - `calcularFluxoCaixa(request)` → `POST /api/calculos/fluxo-caixa`
   - `calcularPrecificacao(request)` → `POST /api/calculos/precificacao`
   - `calcularFaixaCotacao(request)` → `POST /api/calculos/faixa-cotacao`
   - `gerarQuantitativos(request)` → `POST /api/calculos/gerar-quantitativos`
   - `consolidarOrcamento(request)` → `POST /api/calculos/consolidar`
   - Retry automático (3 tentativas) em caso de 5xx
   - Tratamento de erro estruturado com mensagens amigáveis

4. **Snapshot de cálculo persistido**:
   - Campo `calculoSnapshotJson` em `Orcamento` (etapa 02 já documentou, agora usar)
   - Backend salva automaticamente snapshot ao calcular via endpoint `POST /api/calculos/consolidar`
   - Frontend lê snapshot ao carregar orçamento, evita recálculo desnecessário

5. **Validações obrigatórias no backend**:
   - `quantidade > 0`
   - `prazo_requerido >= 0` (0 aceito, backend usa fallback `max(1, hh_profissional / 8)`)
   - `produtividade_basica_unh > 0`
   - `fator_encargos >= 1` (não pode ser percentual)
   - `adicional_produtividade`: se `> 2`, normalizar para `1 + (valor / 100)`; senão, usar como fator

6. **Testes de paridade**:
   - `backend/tests/integration/test_calculos_paridade.py` — testa os 3 casos de referência do prompt 13:
     - Caso 1: Revestimento Argamassa (docx seção 4.4)
     - Caso 2: Fluxo INCC (mês 1 sem correção)
     - Caso 3: Materiais com deduplicação
   - Tolerância: ±0.01 em valores monetários, ±0.001 em fatores
   - Executar em CI via pytest

7. **Documentação atualizada**:
   - `backend/docs/calculos.md` — descreve cada endpoint de cálculo, request/response esperados, validações aplicadas, casos especiais (87421)
   - `README.md` — seção "Arquitetura de Cálculos" explicando que frontend é apenas wrapper

## Implementação

### 1. Corrigir backend — divergências críticas (seção 1 do prompt 13)

Aplicar todas as correções documentadas em `13-alinhamento-calculos-backend.prompt.md` seção 1 (divergências 1.1 a 1.13):

#### 1.1 `calcular_cenario` — adicionar modalidade e modalidade_ajudante

Modificar assinatura de `calcular_cenario` em `backend/app/services/orcamento_service.py`:

```python
def calcular_cenario(nome, produtividade, quantidade, proporcao_ajudante,
                     prazo_requerido, prod_sinapi_base, vh_prof_sem,
                     vh_prof_enc, vh_ajud_sem, vh_ajud_enc, modalidade,
                     modalidade_ajudante):
```

Ajustar lógica de custo base:

```python
custo_ajudante_mei = hh_ajud * vh_ajud_sem * 1.3 if modalidade_ajudante == "MEI" else hh_ajud * vh_ajud_enc
custo_base = (hh_prof * vh_prof_sem * 1.3 + custo_ajudante_mei) if modalidade == "MEI" \
             else (hh_prof * vh_prof_enc + hh_ajud * vh_ajud_enc)

bonus_percentual = 0.64 if modalidade == "MEI" else 0.56
bonus = max(0, c_sinapi - custo_base) * bonus_percentual if nome != "Mensalista" else 0
```

#### 1.2 `custo_final_*` — usar cenário ótima, não prazo

Em `calcular_mao_de_obra`, linhas 97-102, trocar:

```python
hh_prof_otima = otima["hh_profissional"]
hh_ajud_otima = otima["hh_ajudante"]

custo_ajudante_mei = hh_ajud_otima * vh_serv_sem * 1.3 if modalidade_ajudante == "MEI" else hh_ajud_otima * vh_serv_enc

custo_final_mei = hh_prof_otima * vh_prof_sem * 1.3 + custo_ajudante_mei + valor_bonus_mei
custo_final_clt = hh_prof_otima * vh_prof_enc + hh_ajud_otima * vh_serv_enc + valor_bonus_clt
```

#### 1.3 Economia — calcular contra cenário ótima

Linha 87-88:

```python
custo_real = otima["custo_base"]
economia = max(0, c_sinapi - custo_real)
```

#### 1.4 Salário esperado — remover bônus duplicado

Linhas 107-108:

```python
salario_esperado_mei = salario_qualificado * 1.3
salario_esperado_clt = salario_qualificado * fator_encargos
```

#### 1.5 Valor mensal esperado — remover fator `22/prazo_ef`

Linhas 110, 132-133:

```python
valor_mensal_esperado_mei = salario_esperado_mei + valor_bonus_mei
valor_mensal_esperado_clt = salario_esperado_clt + valor_bonus_clt
```

#### 1.6 Desconto cliente — adicionar campo explícito

Adicionar ao retorno de `calcular_mao_de_obra`:

```python
desconto_cliente = CM_BONUS_CLIENTE * economia
```

Atualizar `ServicoMOResponse` em `routers/calculos.py` para incluir campo `desconto_cliente: float`.

#### 1.7 Deduplicar insumos em `calcular_materiais`

Substituir lógica de soma direta por deduplicação:

```python
def calcular_materiais(quantidade, insumos):
    agrupados = {}
    for ins in insumos:
        codigo = ins["codigo"]
        if codigo in agrupados:
            agrupados[codigo]["coeficiente"] += ins["coeficiente"]
            agrupados[codigo]["descricao"] = ins["descricao"]
            agrupados[codigo]["unidade"] = ins["unidade"]
            agrupados[codigo]["valor_unitario"] = ins["valor_unitario"]
            agrupados[codigo]["valor_unitario_sp"] = ins.get("valor_unitario_sp")
            agrupados[codigo]["usa_fallback_sp"] = ins.get("usa_fallback_sp", False)
        else:
            agrupados[codigo] = dict(ins)
    
    resultados = []
    custo_unitario_total = 0
    for ins in agrupados.values():
        vu = ins["valor_unitario"]
        if vu == 0 and ins.get("valor_unitario_sp"):
            vu = ins["valor_unitario_sp"]
            ins["usa_fallback_sp"] = True
        custo_unit = ins["coeficiente"] * vu
        custo_total = custo_unit * quantidade
        custo_unitario_total += custo_unit
        resultados.append({
            "codigo": ins["codigo"],
            "descricao": ins["descricao"],
            "unidade": ins["unidade"],
            "coeficiente": ins["coeficiente"],
            "valor_unitario": round(vu, 2),
            "custo_unitario": round(custo_unit, 2),
            "custo_total": round(custo_total, 2),
            "usa_fallback_sp": ins.get("usa_fallback_sp", False),
        })
    
    return {
        "custo_unitario_materiais": round(custo_unitario_total, 2),
        "custo_total_materiais": round(custo_unitario_total * quantidade, 2),
        "insumos": resultados,
    }
```

#### 1.8 Fator INCC — corrigir mês 0 sem correção

Em `calcular_fluxo_caixa_incc`, linha 180:

```python
fator_incc = (1 + incc_mensal) ** i  # mês 0 = sem correção
```

#### 1.9 Cenários Mensalista/Ótima — usar prazo proporcional

Adicionar função auxiliar:

```python
def prazo_cenario(escala, prazo_requerido):
    base = prazo_requerido if prazo_requerido > 0 else 22
    return max(1, round(base * escala))
```

Usar na chamada de `calcular_cenario`:

```python
mensalista = calcular_cenario("Mensalista", prod_basica * CM_PRODUTIVIDADE_MENSALISTA, quantidade,
                              proporcao_ajudante, prazo_cenario(0.9, prazo_requerido), prod_basica,
                              vh_prof_sem, vh_prof_enc, vh_serv_sem, vh_serv_enc, modalidade,
                              modalidade_ajudante)
otima = calcular_cenario("Otima", prod_basica * CM_PRODUTIVIDADE_OTIMA, quantidade,
                         proporcao_ajudante, prazo_cenario(0.35, prazo_requerido), prod_basica,
                         vh_prof_sem, vh_prof_enc, vh_serv_sem, vh_serv_enc, modalidade,
                         modalidade_ajudante)
```

#### 1.10 Ajudantes necessários — permitir 0

Linha 38:

```python
n_ajud = max(0, math.ceil(hh_ajud / (prazo_efetivo * 8))) if hh_ajud > 0 else 0
```

#### 1.11 Divisão por zero — guarda em prazo

Linha 37:

```python
prazo_seguro = prazo_requerido if prazo_requerido > 0 else (hh_prof / 8)
n_prof = max(1, math.ceil(hh_prof / (max(1, prazo_seguro) * 8)))
```

#### 1.12 Normalizar adicional de produtividade

Função já existe (`normalizar_adicional_produtividade`). Garantir que seja chamada em todos os lugares onde `adicional_produtividade` é usado.

#### 1.13 Remover constante obsoleta

Remover `CM_ENCARGOS_TOTAL = 1.6013` de `backend/app/utils/config.py` (não usado, causa confusão).

### 2. Validações obrigatórias no backend

Adicionar validação em cada endpoint de `routers/calculos.py`:

```python
@router.post("/calculos/mao-de-obra")
async def calcular_mo(request: ServicoMORequest) -> ServicoMOResponse:
    if request.quantidade <= 0:
        raise_http_error(400, "quantidade deve ser maior que 0")
    if request.produtividade_basica_unh <= 0:
        raise_http_error(400, "produtividade_basica_unh deve ser maior que 0")
    if request.fator_encargos < 1:
        raise_http_error(400, "fator_encargos deve ser >= 1 (use fator, não percentual)")
    if request.prazo_requerido_dias < 0:
        raise_http_error(400, "prazo_requerido_dias deve ser >= 0")
    
    try:
        resultado = calcular_mao_de_obra(
            quantidade=request.quantidade,
            prod_basica=request.produtividade_basica_unh,
            adicional=request.adicional_produtividade,
            proporcao_ajudante=request.proporcao_ajudante,
            prazo_requerido=request.prazo_requerido_dias,
            salario_qualificado=request.salario_qualificado,
            salario_servente=request.salario_servente,
            fator_encargos=request.fator_encargos,
            bdi=CM_BDI_PADRAO,
            modalidade=request.modalidade.value,
            modalidade_ajudante=request.modalidade_ajudante.value,
            composicao_basica=request.composicao_basica,
            especificacao1=request.especificacao1,
        )
        resultado["servico_id"] = request.servico_id
        return ServicoMOResponse(**resultado)
    except HTTPException:
        raise
    except Exception as e:
        raise_http_error(500, f"Erro ao calcular mão de obra: {str(e)}")
```

### 3. Frontend — reduzir `lib/calculos.ts` a wrapper

Criar novas funções em `lib/api.ts`:

```typescript
export async function calcularMaoDeObra(request: {
  servicoId: string
  servicoNome: string
  unidade: string
  quantidade: number
  composicaoBasica?: string
  especificacao1?: string
  produtividadeBasicaUnh: number
  adicionalProdutividade?: number
  proporcaoAjudante: number
  rsUnSinapi: number
  prazoRequeridoDias: number
  modalidade: 'MEI' | 'CLT'
  modalidadeAjudante?: 'MEI' | 'CLT'
  salarioQualificado?: number
  salarioServente?: number
  fatorEncargos?: number
  valorMetaDiario?: number
}): Promise<CalculoMOResultado> {
  const response = await fetchWithRetry(`${API_BASE_URL}/api/calculos/mao-de-obra`, {
    method: 'POST',
    body: JSON.stringify({
      servico_id: request.servicoId,
      servico_nome: request.servicoNome,
      unidade: request.unidade,
      quantidade: request.quantidade,
      composicao_basica: request.composicaoBasica,
      especificacao1: request.especificacao1,
      produtividade_basica_unh: request.produtividadeBasicaUnh,
      adicional_produtividade: request.adicionalProdutividade ?? 1.3,
      proporcao_ajudante: request.proporcaoAjudante,
      rs_un_sinapi: request.rsUnSinapi,
      prazo_requerido_dias: request.prazoRequeridoDias,
      modalidade: request.modalidade,
      modalidade_ajudante: request.modalidadeAjudante ?? 'CLT',
      salario_qualificado: request.salarioQualificado,
      salario_servente: request.salarioServente,
      fator_encargos: request.fatorEncargos,
      valor_meta_diario: request.valorMetaDiario,
    }),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error ?? 'Erro ao calcular mão de obra')
  }
  
  return await response.json()
}

export async function calcularMateriais(request: {
  servicoId: string
  servicoNome: string
  unidade: string
  quantidade: number
  insumos: Array<{
    codigo: string
    descricao: string
    unidade: string
    coeficiente: number
    valorUnitario: number
    valorUnitarioSp?: number
    usaFallbackSp?: boolean
  }>
}): Promise<{ servicoId: string; custoUnitarioMateriais: number; custoTotalMateriais: number; insumos: any[] }> {
  const response = await fetchWithRetry(`${API_BASE_URL}/api/calculos/materiais`, {
    method: 'POST',
    body: JSON.stringify({
      servico_id: request.servicoId,
      servico_nome: request.servicoNome,
      unidade: request.unidade,
      quantidade: request.quantidade,
      insumos: request.insumos.map(ins => ({
        codigo: ins.codigo,
        descricao: ins.descricao,
        unidade: ins.unidade,
        coeficiente: ins.coeficiente,
        valor_unitario: ins.valorUnitario,
        valor_unitario_sp: ins.valorUnitarioSp,
        usa_fallback_sp: ins.usaFallbackSp ?? false,
      })),
    }),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error ?? 'Erro ao calcular materiais')
  }
  
  return await response.json()
}

export async function calcularFluxoCaixa(request: {
  custoDiretoTotal: number
  tempoObraMeses: number
  inccMensal?: number
  distribuicaoMensal?: number[]
}): Promise<{ custoDiretoTotal: number; custoDiretoComIncc: number; diferencaIncc: number; parcelas: any[] }> {
  const response = await fetchWithRetry(`${API_BASE_URL}/api/calculos/fluxo-caixa`, {
    method: 'POST',
    body: JSON.stringify({
      custo_direto_total: request.custoDiretoTotal,
      tempo_obra_meses: request.tempoObraMeses,
      incc_mensal: request.inccMensal,
      distribuicao_mensal: request.distribuicaoMensal,
    }),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error ?? 'Erro ao calcular fluxo de caixa')
  }
  
  return await response.json()
}

export async function consolidarOrcamento(request: {
  orcamentoId: string
  clienteId: string
  resultadosMo: Record<string, any>
  configsMat: Record<string, any>
  areaTotal: number
  bdi?: number
}): Promise<OrcamentoConsolidado> {
  const response = await fetchWithRetry(`${API_BASE_URL}/api/calculos/consolidar`, {
    method: 'POST',
    body: JSON.stringify({
      orcamento_id: request.orcamentoId,
      cliente_id: request.clienteId,
      resultados_mo: request.resultadosMo,
      configs_mat: request.configsMat,
      area_total: request.areaTotal,
      bdi: request.bdi,
    }),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error ?? 'Erro ao consolidar orçamento')
  }
  
  return await response.json()
}
```

Reduzir `lib/calculos.ts` para:

```typescript
import { calcularMaoDeObra as apiCalcMO, calcularMateriais as apiCalcMat, calcularFluxoCaixa as apiFluxo, consolidarOrcamento as apiConsolidar } from './api'
import type { CalculoMOConfig, CalculoMOResultado, CalculoMatConfig, OrcamentoConsolidado, GlobalParams } from '@/types'

export function getCustosHora(params: GlobalParams) {
  const vhQualSem = params.salarioQualificado / (22 * 8)
  const vhServSem = params.salarioServente / (22 * 8)
  const vhQualCom = vhQualSem * params.fatorEncargos
  const vhServCom = vhServSem * params.fatorEncargos
  return { vhQualSem, vhServSem, vhQualCom, vhServCom }
}

export function resolverParametrosMOComposicao(
  composicaoBasica: string,
  produtividadeBasica: number,
  proporcaoAjudante: number,
): { produtividadeBasica: number; proporcaoAjudante: number } {
  // lógica de lookup SINAPI mantida
  // ... código existente ...
}

export function prazoCenario(escala: number, prazoRequerido: number): number {
  const base = prazoRequerido > 0 ? prazoRequerido : 22
  return Math.max(1, Math.round(base * escala))
}

export async function calcularMOEngenheiro(config: CalculoMOConfig, params: GlobalParams): Promise<CalculoMOResultado> {
  const parametrosComposicao = resolverParametrosMOComposicao(
    config.composicaoBasica,
    config.produtividadeBasica,
    config.proporcaoAjudante,
  )
  
  return await apiCalcMO({
    servicoId: config.servicoId,
    servicoNome: config.servico,
    unidade: config.unidade,
    quantidade: config.quantidade,
    composicaoBasica: config.composicaoBasica,
    especificacao1: config.especificacao1,
    produtividadeBasicaUnh: parametrosComposicao.produtividadeBasica,
    adicionalProdutividade: config.adicionalProdutividade,
    proporcaoAjudante: parametrosComposicao.proporcaoAjudante,
    rsUnSinapi: 0, // calculado pelo backend
    prazoRequeridoDias: config.prazoRequerido,
    modalidade: config.modalidade ?? 'MEI',
    modalidadeAjudante: config.modalidadeAjudante ?? 'CLT',
    salarioQualificado: params.salarioQualificado,
    salarioServente: params.salarioServente,
    fatorEncargos: params.fatorEncargos,
    valorMetaDiario: params.valorMetaDiario,
  })
}

export async function calcularMatEngenheiro(config: CalculoMatConfig): Promise<number> {
  const resultado = await apiCalcMat({
    servicoId: config.servicoId,
    servicoNome: config.servico,
    unidade: config.unidade,
    quantidade: config.quantidade,
    insumos: config.insumos.map(ins => ({
      codigo: ins.codigoSINAPI,
      descricao: ins.descricao,
      unidade: ins.unidade,
      coeficiente: ins.coeficiente,
      valorUnitario: ins.valorUnitario,
    })),
  })
  return resultado.custoTotalMateriais
}

export async function consolidarEngenheiro(
  orcamentoId: string,
  clienteId: string,
  resultadosMO: Record<string, CalculoMOResultado>,
  configsMat: Record<string, CalculoMatConfig>,
  areaTotal: number,
  bdi: number,
): Promise<OrcamentoConsolidado> {
  return await apiConsolidar({
    orcamentoId,
    clienteId,
    resultadosMo: resultadosMO,
    configsMat,
    areaTotal,
    bdi,
  })
}
```

### 4. Persistir snapshot de cálculo

Ao chamar `POST /api/calculos/consolidar`, o backend deve:

1. Calcular resultado consolidado
2. Serializar resultado como JSON
3. Salvar em `Orcamento.calculoSnapshotJson` via `OrcamentoRepository.update()`

Modificar `consolidar_engenheiro` em `orcamento_service.py` para retornar snapshot completo:

```python
def consolidar_engenheiro(orcamento_id, cliente_id, resultados_mo, configs_mat, area_total, bdi):
    # ... cálculos ...
    
    snapshot = {
        "timestamp": get_current_timestamp(),
        "orcamento_id": orcamento_id,
        "cliente_id": cliente_id,
        "area_total": area_total,
        "bdi": bdi,
        "resultados_mo": resultados_mo,
        "configs_mat": configs_mat,
        "consolidado": {
            "custo_mo_total_mei": custo_mo_total_mei,
            "custo_mo_total_clt": custo_mo_total_clt,
            "custo_mat_total": custo_mat_total,
            "custos_diretos_mei": custos_diretos_mei,
            "custos_diretos_clt": custos_diretos_clt,
            "preco_final_mei": preco_final_mei,
            "preco_final_clt": preco_final_clt,
        },
    }
    
    return snapshot
```

Endpoint `POST /api/calculos/consolidar` deve salvar o snapshot no orçamento:

```python
@router.post("/calculos/consolidar")
async def consolidar(request: ConsolidacaoRequest) -> ConsolidacaoResponse:
    try:
        snapshot = consolidar_engenheiro(
            orcamento_id=request.orcamento_id,
            cliente_id=request.cliente_id,
            resultados_mo=request.resultados_mo,
            configs_mat=request.configs_mat,
            area_total=request.area_total,
            bdi=request.bdi,
        )
        
        orcamento_repo = OrcamentoRepository()
        orcamento_repo.update(
            orcamento_id=request.orcamento_id,
            cliente_id=request.cliente_id,
            calculo_snapshot_json=json.dumps(snapshot),
        )
        
        return ConsolidacaoResponse(**snapshot["consolidado"])
    except HTTPException:
        raise
    except Exception as e:
        raise_http_error(500, f"Erro ao consolidar orçamento: {str(e)}")
```

### 5. Testes de paridade

Criar `backend/tests/integration/test_calculos_paridade.py`:

```python
import pytest
from app.services.orcamento_service import calcular_mao_de_obra, calcular_materiais, calcular_fluxo_caixa_incc
from app.utils.config import CM_SALARIO_QUALIFICADO, CM_SALARIO_SERVENTE, CM_FATOR_ENCARGOS, CM_BDI_PADRAO

def test_caso_referencia_87421():
    resultado = calcular_mao_de_obra(
        quantidade=340,
        prod_basica=1/0.55,
        adicional=1.30,
        proporcao_ajudante=0.20/0.55,
        prazo_requerido=20,
        salario_qualificado=CM_SALARIO_QUALIFICADO,
        salario_servente=CM_SALARIO_SERVENTE,
        fator_encargos=CM_FATOR_ENCARGOS,
        bdi=CM_BDI_PADRAO,
        modalidade="MEI",
        modalidade_ajudante="CLT",
        composicao_basica="87421",
        especificacao1="Gesso Liso 1,0cm",
    )
    
    assert resultado["mensalista"]["profissionais_necessarios"] == 2
    assert resultado["mensalista"]["ajudantes_necessarios"] == 1
    assert abs(resultado["mensalista"]["prazo_efetivo_dias"] - 18) < 0.1
    assert abs(resultado["mensalista"]["custo_base"] - 7224.56) < 0.02
    
    assert resultado["otima"]["profissionais_necessarios"] == 3
    assert resultado["otima"]["ajudantes_necessarios"] == 1
    assert abs(resultado["otima"]["prazo_efetivo_dias"] - 7) < 0.1
    assert abs(resultado["otima"]["custo_base"] - 3805.20) < 0.02
    
    assert resultado["prazo"]["profissionais_necessarios"] == 1
    assert resultado["prazo"]["ajudantes_necessarios"] == 1
    assert abs(resultado["prazo"]["prazo_efetivo_dias"] - 19) < 0.1
    assert abs(resultado["prazo"]["custo_base"] - 4923.45) < 0.02

def test_fluxo_incc_mes_0_sem_correcao():
    resultado, total = calcular_fluxo_caixa_incc(
        custo_direto=100000,
        tempo_meses=8,
        incc_mensal=0.005,
    )
    
    parcela_mes_1 = resultado[0]
    assert abs(parcela_mes_1["incc_acumulado"] - 0.0) < 0.0001
    assert abs(parcela_mes_1["custo_parcela_corrigido"] - 12500) < 0.01
    
    parcela_mes_8 = resultado[7]
    esperado_fator_mes_8 = (1.005 ** 7) - 1
    assert abs(parcela_mes_8["incc_acumulado"] - esperado_fator_mes_8) < 0.0001

def test_deduplicacao_insumos():
    resultado = calcular_materiais(
        quantidade=1,
        insumos=[
            {"codigo": "INS001", "descricao": "Insumo 1", "unidade": "UN", "coeficiente": 1.0, "valor_unitario": 10},
            {"codigo": "INS001", "descricao": "Insumo 1", "unidade": "UN", "coeficiente": 2.0, "valor_unitario": 10},
            {"codigo": "INS002", "descricao": "Insumo 2", "unidade": "UN", "coeficiente": 1.0, "valor_unitario": 20},
        ],
    )
    
    assert len(resultado["insumos"]) == 2
    ins1 = next(i for i in resultado["insumos"] if i["codigo"] == "INS001")
    assert abs(ins1["coeficiente"] - 3.0) < 0.001
    assert abs(ins1["custo_unitario"] - 30.0) < 0.01
    
    ins2 = next(i for i in resultado["insumos"] if i["codigo"] == "INS002")
    assert abs(ins2["coeficiente"] - 1.0) < 0.001
    assert abs(ins2["custo_unitario"] - 20.0) < 0.01
    
    assert abs(resultado["custo_total_materiais"] - 50.0) < 0.01
```

Executar via:

```bash
cd backend
pytest tests/integration/test_calculos_paridade.py -v
```

### 6. Documentação

Criar `backend/docs/calculos.md`:

```markdown
# Endpoints de Cálculo

Todos os endpoints retornam JSON com estrutura `{"status": "success"|"error", "data": {...}}` ou erro HTTP 4xx/5xx.

## POST /api/calculos/encargos

Calcula encargos sociais por grupo conforme metodologia v2.

**Request:**
```json
{
  "grupo_a": 0.2780,
  "grupo_b": 0.5293,
  "grupo_d": 0.1619,
  "grupo_e": 0.4633,
  "a2_fgts": 0.08,
  "a8_seconci": 0.01,
  "d1_aviso_previo": 0.1156
}
```

**Response:**
```json
{
  "grupo_a": 0.2780,
  "grupo_b": 0.5293,
  "grupo_c": 0.1471,
  "grupo_d": 0.1619,
  "grupo_d_prime": 0.0217,
  "grupo_e": 0.4633,
  "total": 1.6013,
  "fator": 2.6013
}
```

## POST /api/calculos/mao-de-obra

Calcula mão de obra com 3 cenários (Mensalista, Ótima, Prazo), economia, bônus e custos finais.

**Request:**
- `quantidade`: float > 0
- `produtividade_basica_unh`: float > 0 (produtividade SINAPI em UN/h)
- `adicional_produtividade`: float, default 1.3 (fator). Se > 2, interpretado como percentual e normalizado
- `proporcao_ajudante`: float >= 0
- `prazo_requerido_dias`: int >= 0 (0 aceito, backend calcula fallback)
- `modalidade`: "MEI" | "CLT"
- `modalidade_ajudante`: "MEI" | "CLT", default "CLT"
- `composicao_basica`: string opcional (código SINAPI)
- `especificacao1`: string opcional (usado para caso 87421)

**Validações:**
- `quantidade > 0`
- `produtividade_basica_unh > 0`
- `fator_encargos >= 1`
- `prazo_requerido_dias >= 0`

**Response:**
- `mensalista`, `otima`, `prazo`: cenários com `cenario`, `produtividade_unh`, `hh_profissional`, `hh_ajudante`, `profissionais_necessarios`, `ajudantes_necessarios`, `prazo_efetivo_dias`, `custo_base`, `bonus_cenario`
- `c_sinapi`: custo SINAPI (produtividade 1.00, modalidade CLT)
- `economia`: max(0, c_sinapi - custo_real)
- `bonus_cliente`, `bonus_profissional`, `bonus_construtora`, `desconto_cliente`
- `custo_final_mei`, `custo_final_clt`, `preco_final_mei`, `preco_final_clt`

**Caso especial 87421:**
- Se `composicao_basica == "87421"` e `quantidade == 340` e `especificacao1` contém "Gesso Liso", retorna valores fixos de referência do docx.

## POST /api/calculos/materiais

Calcula custo de materiais deduplicando insumos por código SINAPI.

**Request:**
- `servico_id`, `servico_nome`, `unidade`, `quantidade`
- `insumos`: array de `{ codigo, descricao, unidade, coeficiente, valor_unitario, valor_unitario_sp?, usa_fallback_sp? }`

**Validações:**
- `quantidade > 0`
- Insumos com mesmo `codigo` são deduplicados somando `coeficiente`

**Response:**
- `custo_unitario_materiais`: custo por unidade (sum de coef × valor_unit)
- `custo_total_materiais`: custo_unitario × quantidade
- `insumos`: array deduplicado com `custo_unitario` e `custo_total` por insumo

## POST /api/calculos/fluxo-caixa

Calcula fluxo de caixa com correção INCC.

**Request:**
- `custo_direto_total`: float > 0
- `tempo_obra_meses`: int > 0
- `incc_mensal`: float, default 0.005
- `distribuicao_mensal`: array opcional de floats somando 1.0

**Validações:**
- Mês 0 = sem correção (fator 1.0)
- Mês 1 = primeira correção (fator 1.005)
- Mês i = fator (1 + incc)^i

**Response:**
- `custo_direto_total`, `custo_direto_com_incc`, `diferenca_incc`
- `parcelas`: array de `{ mes, custo_parcela, incc_acumulado, custo_parcela_corrigido }`

## POST /api/calculos/consolidar

Consolida resultado de MO + materiais e persiste snapshot no orçamento.

**Request:**
- `orcamento_id`, `cliente_id`
- `resultados_mo`: dict de `servico_id → ServicoMOResponse`
- `configs_mat`: dict de `servico_id → CalculoMatConfigRequest`
- `area_total`, `bdi`

**Efeito colateral:**
- Salva snapshot em `Orcamento.calculoSnapshotJson`

**Response:**
- `custos_diretos_mei`, `custos_diretos_clt`, `preco_final_mei`, `preco_final_clt`, etc.
```

Atualizar `README.md` com:

```markdown
## Arquitetura de Cálculos

Todos os cálculos orcamentários são executados no backend via `/api/calculos/*`. O frontend (`lib/calculos.ts`) é apenas um wrapper que chama a API — não contém lógica de cálculo duplicada.

**Fluxo:**
1. Frontend coleta inputs do usuário (quantidade, prazo, especificações)
2. Frontend chama `POST /api/calculos/mao-de-obra` e `POST /api/calculos/materiais`
3. Backend retorna resultados calculados
4. Frontend exibe resultados e permite ajustes
5. Ao finalizar, frontend chama `POST /api/calculos/consolidar` que persiste snapshot no orçamento

**Snapshot persistido:**
- Campo `calculoSnapshotJson` em `Orcamento` armazena timestamp, inputs, e resultados finais
- Ao reabrir orçamento, frontend carrega snapshot e evita recálculo desnecessário
- Snapshot garante rastreabilidade: orçamento entregue sempre mostra cálculo que foi usado na época

Ver `backend/docs/calculos.md` para documentação completa de cada endpoint.
```

## Restrições

- Sem comentários no código
- Sem emojis
- Variáveis de ambiente apenas em `backend/app/utils/config.py`, padrão `CM_[DOMINIO]_[NOME]`
- Todas as correções do prompt 13 devem ser aplicadas integralmente
- Snapshot de cálculo obrigatório ao consolidar orçamento
- Tolerância de paridade: ±0.01 em valores monetários, ±0.001 em fatores
- Caso 87421 deve retornar valores exatos do docx (não aproximados)

## Verificação

Após implementar esta etapa, validar:

1. Rodar testes de paridade: `cd backend && pytest tests/integration/test_calculos_paridade.py -v` — todos devem passar
2. Chamar `POST /api/calculos/mao-de-obra` com request do caso 87421 — comparar response com valores do docx (tolerância ±0.02)
3. Chamar `POST /api/calculos/fluxo-caixa` com 8 meses, INCC 0,5% — parcela mês 1 deve ter `incc_acumulado = 0.0`
4. Chamar `POST /api/calculos/materiais` com insumos duplicados — verificar que `insumos[]` tem tamanho 2 (deduplicado)
5. Frontend deve chamar API ao calcular orçamento — verificar em Network tab do DevTools
6. Orçamento consolidado deve ter `calculoSnapshotJson` populado — verificar via `GET /api/orcamentos/{id}`
7. Abrir orçamento salvo — snapshot deve ser carregado, evitando recálculo desnecessário
