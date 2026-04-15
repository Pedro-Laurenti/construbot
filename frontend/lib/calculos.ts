import { GLOBAL_PARAMS, SERVICE_CONFIG } from './mockData'
import type { OrcamentoItem, ItemResultado, CenarioEquipe, OrcamentoTotais, Orcamento, InsumoItem } from '@/types'

export function calcularItem(item: OrcamentoItem): ItemResultado {
  const p = GLOBAL_PARAMS
  const cfg = SERVICE_CONFIG[item.serviceType]

  const vhProfSem = p.salarioQualificado / (22 * 8)
  const vhServSem = p.salarioServente / (22 * 8)
  const vhProfCom = vhProfSem * p.encargosPercentual
  const vhServCom = vhServSem * p.encargosPercentual

  const { prodBasica, propAjudante, materialUnitario } = cfg

  const hhProfSin = item.quantidade / prodBasica
  const hhAjudSin = hhProfSin * propAjudante
  const cSinapi = hhProfSin * vhProfCom + hhAjudSin * vhServCom

  function buildCenario(mult: number): CenarioEquipe {
    const prod = prodBasica * mult
    const hhP = item.quantidade / prod
    const hhA = hhP * propAjudante
    const nP = Math.max(1, Math.ceil(hhP / (item.prazoRequerido * 8)))
    const prazoEf = hhP / (nP * 8)
    const nA = Math.max(0, Math.ceil(hhA / (prazoEf * 8)))
    const cReal = item.modalidade === 'MEI'
      ? hhP * vhProfSem * 1.3 + hhA * vhServCom
      : hhP * vhProfCom + hhA * vhServCom
    const eco = Math.max(0, cSinapi - cReal)
    const bonusCenario = item.modalidade === 'MEI' ? 0.64 * eco : 0.56 * eco
    return { produtividade: prod, hhProfissional: hhP, hhAjudante: hhA, profissionaisNecessarios: nP, ajudantesNecessarios: nA, prazoEfetivoDias: prazoEf, custoBase: cReal, bonusCenario }
  }

  const mensalista = buildCenario(0.80)
  const otima = buildCenario(1.25)
  const prazo = buildCenario(1.00)

  const cRealMEI = hhProfSin * vhProfSem * 1.3 + hhAjudSin * vhServCom
  const economiaMEI = Math.max(0, cSinapi - cRealMEI)
  const custoFinalMEI = cRealMEI + 0.64 * economiaMEI
  const custoFinalCLT = cSinapi

  const custoMat = materialUnitario * item.quantidade
  const insumos: InsumoItem[] = [{
    descricao: item.serviceType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()),
    unidade: cfg.unidade,
    coeficiente: materialUnitario,
    valorUnitario: 1,
    total: custoMat,
  }]

  const meses = Math.max(0.1, item.prazoRequerido / 22)

  return {
    produtividadeBasicaUNh: prodBasica,
    produtividadeRequerida: prodBasica,
    hhProfissional: hhProfSin,
    hhAjudante: hhAjudSin,
    proporcaoAjudante: propAjudante,
    rsUN: cSinapi / item.quantidade,
    mensalista,
    otima,
    prazo,
    economia: economiaMEI,
    bonusMEI: p.salarioQualificado * 1.3 + 0.64 * economiaMEI,
    bonusCLT: otima.bonusCenario,
    bonusConstrutora: 0.14 * economiaMEI,
    salarioEsperadoMEI: p.salarioQualificado * 1.3,
    salarioEsperadoCLT: p.salarioQualificado * p.encargosPercentual,
    valorEquivalenteTotalUNMEI: custoFinalMEI / item.quantidade,
    valorEquivalenteTotalUNCLT: custoFinalCLT / item.quantidade,
    valorMensalEsperadoMEI: p.salarioQualificado * 1.3 + (0.64 * economiaMEI) / meses,
    valorMensalEsperadoCLT: p.salarioQualificado * p.encargosPercentual,
    custoMaterialServico: custoMat,
    insumos,
    custoFinalMEI,
    custoFinalCLT,
    custoUnitarioMEI: custoFinalMEI / item.quantidade,
    custoUnitarioCLT: custoFinalCLT / item.quantidade,
    bonusConstrutoraMEI: 0.14 * economiaMEI,
    bonusConstrutoralCLT: 0,
    precoFinalMEI: (custoFinalMEI + custoMat) * (1 + p.bdi),
    precoFinalCLT: (custoFinalCLT + custoMat) * (1 + p.bdi),
  }
}

export function calcularTotais(orcamento: Orcamento): OrcamentoTotais {
  const itens = orcamento.itens.filter(i => i.resultado)
  const custoMOTotalMEI = itens.reduce((s, i) => s + i.resultado!.custoFinalMEI, 0)
  const custoMOTotalCLT = itens.reduce((s, i) => s + i.resultado!.custoFinalCLT, 0)
  const custoMatTotal = itens.reduce((s, i) => s + i.resultado!.custoMaterialServico, 0)
  const custosDiretosMEI = custoMOTotalMEI + custoMatTotal
  const custosDiretosCLT = custoMOTotalCLT + custoMatTotal
  const areaTotal = itens.reduce((s, i) => s + i.quantidade, 0)
  return {
    custoMOTotalMEI,
    custoMOTotalCLT,
    custoMatTotal,
    custosDiretosMEI,
    custosDiretosCLT,
    custosDiretosPorM2MEI: areaTotal > 0 ? custosDiretosMEI / areaTotal : 0,
    custosDiretosPorM2CLT: areaTotal > 0 ? custosDiretosCLT / areaTotal : 0,
    precoFinalMEI: custosDiretosMEI * 1.2,
    precoFinalCLT: custosDiretosCLT * 1.2,
    areaTotal,
    precoPorM2MEI: areaTotal > 0 ? (custosDiretosMEI * 1.2) / areaTotal : 0,
    precoPorM2CLT: areaTotal > 0 ? (custosDiretosCLT * 1.2) / areaTotal : 0,
  }
}
