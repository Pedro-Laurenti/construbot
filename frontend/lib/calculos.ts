import { GLOBAL_PARAMS, SERVICE_CONFIG } from './mockData'
import type { OrcamentoItem, ItemResultado, CenarioEquipe, OrcamentoTotais, Orcamento, InsumoItem, CalculoMOConfig, CalculoMOResultado, CenarioDetalhadoMO, CalculoMatConfig, OrcamentoConsolidado } from '@/types'

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

const VH_QUAL_COM = 2664.75 * 2.6013 / (22 * 8)
const VH_SERV_COM = 2189.97 * 2.6013 / (22 * 8)
const VH_QUAL_SEM = 2664.75 / (22 * 8)
const VH_SERV_SEM = 2189.97 / (22 * 8)

function buildCenarioEng(
  cenario: CenarioDetalhadoMO['cenario'],
  Q: number,
  prodBasica: number,
  mult: number,
  propAjudante: number,
  prazoRequerido: number,
  cSINAPI: number,
): CenarioDetalhadoMO {
  const prod = prodBasica * mult
  const hhP = Q / prod
  const hhA = hhP * propAjudante
  const nP = Math.max(1, Math.ceil(hhP / (prazoRequerido * 8)))
  const prazoEf = hhP / (nP * 8)
  const nA = Math.max(0, Math.ceil(hhA / (prazoEf * 8)))
  const custoBase = hhP * VH_QUAL_SEM * 1.3 + hhA * VH_SERV_COM
  const bonusCenario = Math.max(0, cSINAPI - custoBase) * 0.64
  return { cenario, produtividade: prod, hhProfissional: hhP, hhAjudante: hhA, profissionaisNecessarios: nP, ajudantesNecessarios: nA, prazoEfetivoDias: prazoEf, custoBase, bonusCenario }
}

export function calcularMOEngenheiro(config: CalculoMOConfig): CalculoMOResultado {
  const { quantidade: Q, produtividadeBasica, proporcaoAjudante, prazoRequerido } = config
  const hhProfSin = Q / produtividadeBasica
  const hhAjudSin = hhProfSin * proporcaoAjudante
  const cSINAPI = hhProfSin * VH_QUAL_COM + hhAjudSin * VH_SERV_COM
  const mensalista = buildCenarioEng('Mensalista', Q, produtividadeBasica, 0.80, proporcaoAjudante, prazoRequerido, cSINAPI)
  const otima = buildCenarioEng('Ótima', Q, produtividadeBasica, 1.25, proporcaoAjudante, prazoRequerido, cSINAPI)
  const prazo = buildCenarioEng('Prazo', Q, produtividadeBasica, 1.00, proporcaoAjudante, prazoRequerido, cSINAPI)
  const economia = Math.max(0, cSINAPI - otima.custoBase)
  const valorBonusProducaoMEI = 0.64 * economia
  const valorBonusProducaoCLT = 0.56 * economia
  const custoFinalMEI = otima.hhProfissional * VH_QUAL_SEM * 1.3 + otima.hhAjudante * VH_SERV_COM + valorBonusProducaoMEI
  const custoFinalCLT = otima.hhProfissional * VH_QUAL_COM + otima.hhAjudante * VH_SERV_COM + valorBonusProducaoCLT
  const salarioEsperadoMEI = 2664.75 * 1.3
  const salarioEsperadoCLT = 2664.75 * 2.6013
  return {
    configId: config.servicoId,
    mensalista, otima, prazo,
    cSINAPI, economia,
    bonusMEI: salarioEsperadoMEI + valorBonusProducaoMEI,
    bonusCLT: salarioEsperadoCLT + valorBonusProducaoCLT,
    bonusConstrutora: 0.14 * economia,
    cltFixoMaisBônus: custoFinalCLT,
    meiValorProducao: custoFinalMEI,
    salarioEsperadoMEI, salarioEsperadoCLT,
    valorBonusProducaoMEI, valorBonusProducaoCLT,
    valorEquivalenteTotalUNMEI: Q > 0 ? custoFinalMEI / Q : 0,
    valorEquivalenteTotalUNCLT: Q > 0 ? custoFinalCLT / Q : 0,
    valorMensalEsperadoMEI: salarioEsperadoMEI + valorBonusProducaoMEI,
    valorMensalEsperadoCLT: salarioEsperadoCLT + valorBonusProducaoCLT,
    custoFinalMEI, custoFinalCLT,
    precoFinalMEI: custoFinalMEI * 1.2,
    precoFinalCLT: custoFinalCLT * 1.2,
  }
}

export function calcularMatEngenheiro(config: CalculoMatConfig): number {
  return config.insumos.reduce((s, ins) => s + ins.coeficiente * ins.valorUnitario * config.quantidade, 0)
}

export function consolidarEngenheiro(
  orcamentoId: string,
  clienteId: string,
  resultadosMO: Record<string, CalculoMOResultado>,
  configsMat: Record<string, CalculoMatConfig>,
  areaTotal: number,
  bdi: number,
): OrcamentoConsolidado {
  const custoMOTotalMEI = Object.values(resultadosMO).reduce((s, r) => s + r.custoFinalMEI, 0)
  const custoMOTotalCLT = Object.values(resultadosMO).reduce((s, r) => s + r.custoFinalCLT, 0)
  const custoMatTotal = Object.values(configsMat).reduce((s, c) => s + calcularMatEngenheiro(c), 0)
  const custosDiretosMEI = custoMOTotalMEI + custoMatTotal
  const custosDiretosCLT = custoMOTotalCLT + custoMatTotal
  const precoFinalMEI = custosDiretosMEI * (1 + bdi)
  const precoFinalCLT = custosDiretosCLT * (1 + bdi)
  return {
    orcamentoId, clienteId,
    custoMOTotalMEI, custoMOTotalCLT, custoMatTotal,
    custosDiretosMEI, custosDiretosCLT,
    custosDiretosPorM2MEI: areaTotal > 0 ? custosDiretosMEI / areaTotal : 0,
    custosDiretosPorM2CLT: areaTotal > 0 ? custosDiretosCLT / areaTotal : 0,
    precoFinalMEI, precoFinalCLT,
    precoPorM2MEI: areaTotal > 0 ? precoFinalMEI / areaTotal : 0,
    precoPorM2CLT: areaTotal > 0 ? precoFinalCLT / areaTotal : 0,
    status: 'pendente',
    observacoes: '',
  }
}

export { VH_QUAL_COM, VH_SERV_COM, VH_QUAL_SEM, VH_SERV_SEM }
