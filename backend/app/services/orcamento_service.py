import math


def calcular_encargos(grupo_a, grupo_b, grupo_d, grupo_e, a2_fgts, a8_seconci, d1_aviso_previo):
    grupo_c = grupo_a * grupo_b
    grupo_d_prime = (grupo_a - a2_fgts - a8_seconci) * d1_aviso_previo
    total = grupo_a + grupo_b + grupo_c + grupo_d + grupo_d_prime + grupo_e
    fator = 1 + total
    return {
        "grupo_a": grupo_a,
        "grupo_b": grupo_b,
        "grupo_c": round(grupo_c, 4),
        "grupo_d": grupo_d,
        "grupo_d_prime": round(grupo_d_prime, 4),
        "grupo_e": grupo_e,
        "total": round(total, 4),
        "fator": round(fator, 4),
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
                     prazo_requerido, prod_sinapi_base, vh_prof_enc, vh_ajud_enc):
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


def calcular_mao_de_obra(quantidade, prod_basica, adicional, proporcao_ajudante,
                         prazo_requerido, salario_qualificado, salario_servente,
                         fator_encargos, bdi):
    vh_prof_sem = salario_qualificado / 176
    vh_serv_sem = salario_servente / 176
    vh_prof_enc = salario_qualificado * fator_encargos / 176
    vh_serv_enc = salario_servente * fator_encargos / 176

    prod_requerida = prod_basica * adicional
    hh_prof = quantidade / prod_requerida
    hh_ajud = hh_prof * proporcao_ajudante

    mensalista = calcular_cenario("Mensalista", prod_basica * 0.80, quantidade,
                                  proporcao_ajudante, prazo_requerido, prod_basica,
                                  vh_prof_enc, vh_serv_enc)
    otima = calcular_cenario("Otima", prod_basica * 1.25, quantidade,
                             proporcao_ajudante, prazo_requerido, prod_basica,
                             vh_prof_enc, vh_serv_enc)
    prazo = calcular_cenario("Prazo", prod_requerida, quantidade,
                             proporcao_ajudante, prazo_requerido, prod_basica,
                             vh_prof_enc, vh_serv_enc)

    hh_sinapi = quantidade / prod_basica
    hh_ajud_sinapi = hh_sinapi * proporcao_ajudante
    c_sinapi = hh_sinapi * vh_prof_enc + hh_ajud_sinapi * vh_serv_enc

    custo_real = prazo["custo_base"]
    economia = max(0, c_sinapi - custo_real)

    bonus_cliente = round(0.30 * economia, 2)
    bonus_profissional = round(0.56 * economia, 2)
    bonus_construtora = round(0.14 * economia, 2)

    valor_bonus_mei = round(0.64 * economia, 2)
    valor_bonus_clt = round(0.56 * economia, 2)

    hh_prof_prazo = prazo["hh_profissional"]
    hh_ajud_prazo = prazo["hh_ajudante"]
    prazo_ef = prazo["prazo_efetivo_dias"]

    custo_final_mei = round(hh_prof_prazo * vh_prof_sem * 1.3 + hh_ajud_prazo * vh_serv_enc + valor_bonus_mei, 2)
    custo_final_clt = round(hh_prof_prazo * vh_prof_enc + hh_ajud_prazo * vh_serv_enc + valor_bonus_clt, 2)

    remuneracao_mei = round(salario_qualificado * 1.3 + valor_bonus_mei, 2)
    remuneracao_clt = round(custo_real + valor_bonus_clt, 2)

    salario_esperado_mei = round(salario_qualificado * 1.3 + valor_bonus_mei, 2)
    salario_esperado_clt = round(salario_qualificado * fator_encargos + valor_bonus_clt, 2)

    mensal_fator = (22 / prazo_ef) if prazo_ef > 0 else 1

    return {
        "produtividade_requerida": round(prod_requerida, 3),
        "hh_profissional": round(hh_prof, 2),
        "hh_ajudante": round(hh_ajud, 2),
        "mensalista": mensalista,
        "otima": otima,
        "prazo": prazo,
        "c_sinapi": round(c_sinapi, 2),
        "economia": round(economia, 2),
        "bonus_cliente": bonus_cliente,
        "bonus_profissional": bonus_profissional,
        "bonus_construtora": bonus_construtora,
        "remuneracao_mei": remuneracao_mei,
        "remuneracao_clt": remuneracao_clt,
        "salario_esperado_mei": salario_esperado_mei,
        "salario_esperado_clt": salario_esperado_clt,
        "valor_bonus_producao_mei": valor_bonus_mei,
        "valor_bonus_producao_clt": valor_bonus_clt,
        "valor_equivalente_total_un_mei": round(custo_final_mei / quantidade, 2) if quantidade > 0 else 0,
        "valor_equivalente_total_un_clt": round(custo_final_clt / quantidade, 2) if quantidade > 0 else 0,
        "valor_mensal_esperado_mei": round(remuneracao_mei * mensal_fator, 2),
        "valor_mensal_esperado_clt": round(remuneracao_clt * mensal_fator, 2),
        "custo_final_mei": custo_final_mei,
        "custo_final_clt": custo_final_clt,
        "preco_final_mei": round(custo_final_mei * (1 + bdi), 2),
        "preco_final_clt": round(custo_final_clt * (1 + bdi), 2),
    }


def calcular_materiais(quantidade, insumos):
    resultados = []
    custo_unit_total = 0
    for ins in insumos:
        vu = ins["valor_unitario"]
        fallback = False
        if vu == 0 and ins.get("valor_unitario_sp"):
            vu = ins["valor_unitario_sp"]
            fallback = True
        custo_unit = ins["coeficiente"] * vu
        custo_total = custo_unit * quantidade
        custo_unit_total += custo_unit
        resultados.append({
            "codigo": ins["codigo"],
            "descricao": ins["descricao"],
            "unidade": ins["unidade"],
            "coeficiente": ins["coeficiente"],
            "valor_unitario": round(vu, 2),
            "custo_unitario": round(custo_unit, 2),
            "custo_total": round(custo_total, 2),
            "usa_fallback_sp": fallback,
        })
    return {
        "custo_unitario_materiais": round(custo_unit_total, 2),
        "custo_total_materiais": round(custo_unit_total * quantidade, 2),
        "insumos": resultados,
    }


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


def calcular_parcela_price(valor_financiado, taxa_juros_anual, prazo_meses):
    taxa_mensal = (1 + taxa_juros_anual) ** (1 / 12) - 1
    if taxa_mensal == 0:
        return round(valor_financiado / prazo_meses, 2)
    numerador = taxa_mensal * (1 + taxa_mensal) ** prazo_meses
    denominador = (1 + taxa_mensal) ** prazo_meses - 1
    return round(valor_financiado * (numerador / denominador), 2)


def calcular_tabela_aportes(preco_final, percentual_financiavel, tempo_meses,
                            modalidade, parcelas_corrigidas):
    valor_financiado = preco_final * percentual_financiavel
    aa = preco_final - valor_financiado
    custo_total_corrigido = sum(p["custo_parcela_corrigido"] for p in parcelas_corrigidas)
    tabela = []

    if modalidade == "SBPE":
        aporte_fixo = aa / tempo_meses
        for p in parcelas_corrigidas:
            repasse = p["custo_parcela_corrigido"] - aporte_fixo
            tabela.append({
                "mes": p["mes"],
                "aporte_recursos_proprios": round(aporte_fixo, 2),
                "repasse_financiamento": round(max(0, repasse), 2),
                "desembolso_total": round(p["custo_parcela_corrigido"], 2),
            })
    else:
        fase_inicial = max(1, math.ceil(tempo_meses * 0.3))
        aporte_concentrado = aa / fase_inicial
        for p in parcelas_corrigidas:
            aporte = aporte_concentrado if p["mes"] <= fase_inicial else 0
            repasse = p["custo_parcela_corrigido"] - aporte
            tabela.append({
                "mes": p["mes"],
                "aporte_recursos_proprios": round(max(0, aporte), 2),
                "repasse_financiamento": round(max(0, repasse), 2),
                "desembolso_total": round(p["custo_parcela_corrigido"], 2),
            })
    return tabela


def calcular_precificacao_completa(custo_mo_mei, custo_mo_clt, custo_mat, area_m2,
                                   tempo_meses, incc_mensal, bdi, modalidade_fin,
                                   taxa_juros, prazo_fin, percentual_fin, distribuicao):
    custo_direto_mei = custo_mo_mei + custo_mat
    custo_direto_clt = custo_mo_clt + custo_mat

    fluxo_mei, total_incc_mei = calcular_fluxo_caixa_incc(custo_direto_mei, tempo_meses, incc_mensal, distribuicao)
    fluxo_clt, total_incc_clt = calcular_fluxo_caixa_incc(custo_direto_clt, tempo_meses, incc_mensal, distribuicao)

    preco_mei = round(total_incc_mei * (1 + bdi), 2)
    preco_clt = round(total_incc_clt * (1 + bdi), 2)

    vf_mei = preco_mei * percentual_fin
    vf_clt = preco_clt * percentual_fin

    parcela_mei = calcular_parcela_price(vf_mei, taxa_juros, prazo_fin)
    parcela_clt = calcular_parcela_price(vf_clt, taxa_juros, prazo_fin)

    aa_mei = round(preco_mei - vf_mei, 2)
    aa_clt = round(preco_clt - vf_clt, 2)

    aportes_mei = calcular_tabela_aportes(preco_mei, percentual_fin, tempo_meses, modalidade_fin, fluxo_mei)
    aportes_clt = calcular_tabela_aportes(preco_clt, percentual_fin, tempo_meses, modalidade_fin, fluxo_clt)

    return {
        "custo_direto_mei": round(custo_direto_mei, 2),
        "custo_direto_clt": round(custo_direto_clt, 2),
        "custo_direto_por_m2_mei": round(custo_direto_mei / area_m2, 2) if area_m2 > 0 else 0,
        "custo_direto_por_m2_clt": round(custo_direto_clt / area_m2, 2) if area_m2 > 0 else 0,
        "custo_direto_com_incc_mei": total_incc_mei,
        "custo_direto_com_incc_clt": total_incc_clt,
        "preco_final_mei": preco_mei,
        "preco_final_clt": preco_clt,
        "preco_por_m2_mei": round(preco_mei / area_m2, 2) if area_m2 > 0 else 0,
        "preco_por_m2_clt": round(preco_clt / area_m2, 2) if area_m2 > 0 else 0,
        "parcela_price_mei": parcela_mei,
        "parcela_price_clt": parcela_clt,
        "aporte_minimo_mei": aa_mei,
        "aporte_minimo_clt": aa_clt,
        "tabela_aportes_mei": aportes_mei,
        "tabela_aportes_clt": aportes_clt,
        "fluxo_caixa_mei": fluxo_mei,
        "fluxo_caixa_clt": fluxo_clt,
    }
