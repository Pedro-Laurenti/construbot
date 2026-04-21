'use client'

import { useState, useEffect } from 'react'
import { MdArrowBack, MdArrowForward, MdArrowBack as MdBack, MdSave, MdWarning } from 'react-icons/md'
import { loadStorage, saveStorage, loadEngineerData, saveEngineerData } from '@/lib/storage'
import { PLANTAS_PADRAO } from '@/lib/mockData'
import { formatDate } from '@/lib/formatters'
import StepperEtapas from './StepperEtapas'
import ResumoParametrosCliente from './ResumoParametrosCliente'
import QuantitativosServico from './QuantitativosServico'
import ConsultaComposicao from './ConsultaComposicao'
import CalculadoraMO from './CalculadoraMO'
import CalculadoraMateriais from './CalculadoraMateriais'
import PrecificacaoFinal from './PrecificacaoFinal'
import type { EngineerData, Orcamento, OrcamentoEngenheiro, QuantitativoServico } from '@/types'

type EtapaWizard = 'E2' | 'E3' | 'E4' | 'E5' | 'E6'

const ETAPA_ORDEM: EtapaWizard[] = ['E2', 'E3', 'E4', 'E5', 'E6']

interface Props {
  orcamento: Orcamento
  data: EngineerData
  onUpdate: (p: Partial<EngineerData>) => void
  onVoltar: () => void
}

function isParametrosCompletos(data: EngineerData): boolean {
  return data.inccMensal > 0 && !!data.uf
}

function getStatusBadge(status: Orcamento['status'], etapaAtual: string) {
  if (status === 'aguardando_engenheiro') return { cls: 'badge-warning', label: 'Aguardando' }
  if (status === 'em_calculo') return { cls: 'badge-info', label: `Em análise · ${etapaAtual}` }
  if (status === 'entregue') return { cls: 'badge-success', label: 'Entregue' }
  return { cls: 'badge-ghost', label: status }
}

function validarE2(eng: OrcamentoEngenheiro): string[] {
  if (eng.quantitativos.length === 0) return ['Nenhum serviço adicionado']
  return eng.quantitativos.filter(q => !q.composicaoBasica).map(q => q.descricao)
}

function validarE3(eng: OrcamentoEngenheiro): string[] {
  return eng.quantitativos.filter(q => {
    const c = eng.consultasSINAPI[q.id]
    if (!c) return true
    return c.insumos.some(i => i.valorUnitario <= 0)
  }).map(q => q.descricao)
}

function validarE4(eng: OrcamentoEngenheiro): string[] {
  return eng.quantitativos.filter(q => !eng.calculosMO[q.id]?.cenarioEscolhido).map(q => q.descricao)
}

function validarE5(eng: OrcamentoEngenheiro): string[] {
  return eng.quantitativos.filter(q => !eng.calculosMat[q.id]).map(q => q.descricao)
}

export default function OrcamentoWizard({ orcamento, data, onUpdate, onVoltar }: Props) {
  const engData = data.orcamentosEngenheiro[orcamento.id]
  const etapaAtual = (engData?.etapaAtual ?? 'E2') as EtapaWizard
  const etapasConcluidas = engData?.etapasConcluidas ?? []
  const parametrosOk = isParametrosCompletos(data)

  const [etapaVisivel, setEtapaVisivel] = useState<EtapaWizard>(etapaAtual)
  const [confirmInvalidar, setConfirmInvalidar] = useState<{ etapa: EtapaWizard; afetadas: EtapaWizard[] } | null>(null)

  const planta = orcamento.parametros ? PLANTAS_PADRAO.find(p => p.id === orcamento.parametros!.plantaId) : null
  const badge = getStatusBadge(orcamento.status, engData?.etapaAtual ?? '-')

  function marcarEmCalculo() {
    if (!engData) {
      const novoEng: OrcamentoEngenheiro = {
        orcamentoClienteId: orcamento.id,
        etapaAtual: 'E2',
        etapasConcluidas: [],
        logEtapas: [],
        quantitativos: [],
        consultasSINAPI: {},
        calculosMO: {},
        calculosMat: {},
      }
      const updated = { ...data.orcamentosEngenheiro, [orcamento.id]: novoEng }
      onUpdate({ orcamentosEngenheiro: updated })
    }
    if (orcamento.status === 'aguardando_engenheiro') {
      const session = loadStorage()
      const orcs = session.orcamentos.map(o =>
        o.id === orcamento.id ? { ...o, status: 'em_calculo' as const } : o
      )
      saveStorage({ ...session, orcamentos: orcs })
    }
  }

  function atualizarEng(patch: Partial<OrcamentoEngenheiro>) {
    const atual = data.orcamentosEngenheiro[orcamento.id] ?? {
      orcamentoClienteId: orcamento.id, etapaAtual: 'E2', etapasConcluidas: [],
      quantitativos: [], consultasSINAPI: {}, calculosMO: {}, calculosMat: {},
    }
    const updated = { ...data.orcamentosEngenheiro, [orcamento.id]: { ...atual, ...patch } }
    onUpdate({ orcamentosEngenheiro: updated })
  }

  function concluirE2(quantitativos: QuantitativoServico[]) {
    const atual = data.orcamentosEngenheiro[orcamento.id]
    if (!atual) return
    const concluidas = Array.from(new Set([...atual.etapasConcluidas, 'E2'])) as Array<'E1' | 'E2' | 'E3' | 'E4' | 'E5' | 'E6'>
    const log = [...(atual.logEtapas ?? []), { etapa: 'E2', concluidaEm: new Date().toISOString() }]
    const novoEng: OrcamentoEngenheiro = { ...atual, quantitativos, etapaAtual: 'E3', etapasConcluidas: concluidas, logEtapas: log }
    const updated = { ...data.orcamentosEngenheiro, [orcamento.id]: novoEng }
    onUpdate({ orcamentosEngenheiro: updated })
    setEtapaVisivel('E3')
  }

  function concluirEtapa(etapa: EtapaWizard) {
    const atual = data.orcamentosEngenheiro[orcamento.id]
    if (!atual) return
    const concluidas = Array.from(new Set([...atual.etapasConcluidas, etapa])) as Array<'E1' | 'E2' | 'E3' | 'E4' | 'E5' | 'E6'>
    const log = [...(atual.logEtapas ?? []), { etapa, concluidaEm: new Date().toISOString() }]
    const idxAtual = ETAPA_ORDEM.indexOf(etapa)
    const proxima = ETAPA_ORDEM[idxAtual + 1] as EtapaWizard | undefined
    atualizarEng({ etapaAtual: proxima ?? 'ENTREGUE', etapasConcluidas: concluidas, logEtapas: log })
    if (proxima) setEtapaVisivel(proxima)
  }

  function navegarParaEtapa(etapa: EtapaWizard) {
    const idx = ETAPA_ORDEM.indexOf(etapa)
    const idxAtual = ETAPA_ORDEM.indexOf(etapaVisivel)
    if (idx < idxAtual && etapasConcluidas.includes(etapa)) {
      const etapasAfetadas = ETAPA_ORDEM.slice(idx + 1).filter(e =>
        etapasConcluidas.includes(e as 'E2' | 'E3' | 'E4' | 'E5' | 'E6')
      ) as EtapaWizard[]
      if (etapasAfetadas.length > 0) {
        setConfirmInvalidar({ etapa, afetadas: etapasAfetadas })
        return
      }
    }
    setEtapaVisivel(etapa)
  }

  function confirmarInvalidar() {
    if (!confirmInvalidar || !engData) return
    const { etapa, afetadas } = confirmInvalidar
    const novasConcluidas = etapasConcluidas.filter(e => !afetadas.includes(e as EtapaWizard)) as Array<'E1' | 'E2' | 'E3' | 'E4' | 'E5' | 'E6'>
    atualizarEng({ etapaAtual: etapa, etapasConcluidas: novasConcluidas })
    setEtapaVisivel(etapa)
    setConfirmInvalidar(null)
  }

  function getValidacaoPendente(): string[] {
    if (!engData) return []
    switch (etapaVisivel) {
      case 'E2': return validarE2(engData)
      case 'E3': return validarE3(engData)
      case 'E4': return validarE4(engData)
      case 'E5': return validarE5(engData)
      default: return []
    }
  }

  const pendentes = getValidacaoPendente()
  const podeAvancar = pendentes.length === 0
  const idxAtual = ETAPA_ORDEM.indexOf(etapaVisivel)
  const podeVoltar = idxAtual > 0

  useEffect(() => {
    if (!engData || orcamento.status === 'aguardando_engenheiro') {
      marcarEmCalculo()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orcamento.id])

  const eng = engData ?? {
    orcamentoClienteId: orcamento.id, etapaAtual: 'E2' as const, etapasConcluidas: [],
    quantitativos: [], consultasSINAPI: {}, calculosMO: {}, calculosMat: {},
  }

  const resumoCompacto = orcamento.parametros ? (
    <p className="text-xs text-base-content/40 mb-2">
      {orcamento.clienteId} · {orcamento.uf}{planta ? ` · ${planta.nome}` : ''} · SINAPI {data.mesReferenciaSINAPI}
    </p>
  ) : null

  function renderEtapa() {
    switch (etapaVisivel) {
      case 'E2':
        return (
          <>
            {orcamento.parametros && (
              <details className="collapse collapse-arrow bg-base-200 rounded mb-4">
                <summary className="collapse-title text-sm font-medium py-2 px-3 min-h-0">Resumo do cliente</summary>
                <div className="collapse-content">
                  <ResumoParametrosCliente parametros={orcamento.parametros} nomeCliente={orcamento.clienteId} />
                </div>
              </details>
            )}
            <QuantitativosServico data={data} onUpdate={onUpdate} orcamentos={[orcamento]} orcamentoId={orcamento.id} onConcluir={concluirE2} />
          </>
        )
      case 'E3':
        return <>{resumoCompacto}<ConsultaComposicao uf={orcamento.uf || data.uf} orcamentoId={orcamento.id} engData={eng} onUpdateEng={atualizarEng} /></>
      case 'E4':
        return <>{resumoCompacto}<CalculadoraMO data={data} onUpdate={onUpdate} orcamentoId={orcamento.id} engData={eng} onUpdateEng={atualizarEng} /></>
      case 'E5':
        return <>{resumoCompacto}<CalculadoraMateriais data={data} onUpdate={onUpdate} orcamentoId={orcamento.id} engData={eng} onUpdateEng={atualizarEng} /></>
      case 'E6':
        return <>{resumoCompacto}<PrecificacaoFinal data={data} onUpdate={onUpdate} orcamentos={[orcamento]} orcamentoId={orcamento.id} engData={eng} onUpdateEng={atualizarEng} onEntregar={() => {}} /></>
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="bg-base-100 border-b border-base-300 px-6 py-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <button onClick={onVoltar} className="btn btn-ghost btn-sm gap-1">
              <MdBack size={16} /> Voltar à lista
            </button>
            <div className="divider divider-horizontal my-0 h-6" />
            <div>
              <span className="font-semibold text-sm">{orcamento.clienteId}</span>
              <span className="text-base-content/40 text-sm mx-1">·</span>
              <span className="text-sm text-base-content/60">{orcamento.uf}</span>
              {planta && <span className="text-sm text-base-content/60"> · {planta.nome}</span>}
            </div>
            <span className={`badge badge-sm ${badge.cls}`}>{badge.label}</span>
          </div>
          <span className="text-xs text-base-content/40">{formatDate(orcamento.dataCriacao)}</span>
        </div>
        <StepperEtapas
          etapaAtual={engData?.etapaAtual ?? 'E2'}
          etapasConcluidas={etapasConcluidas as Array<'E1' | 'E2' | 'E3' | 'E4' | 'E5' | 'E6'>}
          onClickEtapa={navegarParaEtapa}
          parametrosCompletos={parametrosOk}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {renderEtapa()}
      </div>

      {etapaVisivel !== 'E6' && etapaVisivel !== 'E2' && (
        <div className="bg-base-100 border-t border-base-300 px-6 py-3 flex-shrink-0 flex items-center justify-between">
          <button
            onClick={() => podeVoltar && setEtapaVisivel(ETAPA_ORDEM[idxAtual - 1])}
            disabled={!podeVoltar}
            className="btn btn-ghost btn-sm gap-1"
          >
            <MdArrowBack size={16} /> Etapa anterior
          </button>

          {pendentes.length > 0 && (
            <div className="flex items-center gap-2 text-warning text-xs">
              <MdWarning size={14} />
              <span>Pendente: {pendentes.slice(0, 3).join(', ')}{pendentes.length > 3 ? ` +${pendentes.length - 3}` : ''}</span>
            </div>
          )}

          <button
            onClick={() => podeAvancar && concluirEtapa(etapaVisivel)}
            disabled={!podeAvancar}
            className="btn btn-primary btn-sm gap-1"
          >
            Avançar etapa <MdArrowForward size={16} />
          </button>
        </div>
      )}

      {confirmInvalidar && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-2">Confirmar retorno</h3>
            <p className="text-sm mb-3">
              Voltar para <strong>{confirmInvalidar.etapa}</strong> vai redefinir as etapas:{' '}
              <strong>{confirmInvalidar.afetadas.join(', ')}</strong>. Os dados calculados nessas etapas serão perdidos.
            </p>
            <div className="modal-action">
              <button onClick={() => setConfirmInvalidar(null)} className="btn btn-ghost btn-sm">Cancelar</button>
              <button onClick={confirmarInvalidar} className="btn btn-warning btn-sm">Confirmar e voltar</button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setConfirmInvalidar(null)} />
        </div>
      )}
    </div>
  )
}
