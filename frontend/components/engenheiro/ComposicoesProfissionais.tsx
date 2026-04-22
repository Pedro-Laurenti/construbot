'use client'

import { useState } from 'react'
import { COMPOSICOES_PROFISSIONAIS, PONTOS_HIDRAULICOS } from '@/lib/mockData'
import { appendAuditEvent, getModuleUiState, setModuleUiState } from '@/lib/engineerDashboard'
import type { EngineerData, ComposicaoProfissional } from '@/types'
import { MdAdd } from 'react-icons/md'

interface Props { data: EngineerData; onUpdate: (p: Partial<EngineerData>) => void }

const VALOR_META_DIARIO = 220

function calcProds(valorRef: number) {
  const prodUNh = VALOR_META_DIARIO / (valorRef * 8)
  const prodUNdia = prodUNh * 8
  return { produtividadeUNh: prodUNh, produtividadeUNdia: prodUNdia, metaProducaoMes: prodUNdia * 22, metaProducaoSemana: (prodUNdia * 22) / 4.33 }
}

const CATEGORIA_LABEL: Record<string, string> = {
  FUNDACAO: 'Fundação',
  ESTRUTURA_CONCRETO_ARMADO: 'Estrutura Concreto Armado',
  ESTRUTURA_LAJE_PRE_MOLDADA: 'Estrutura Laje Pré-Moldada',
  ALVENARIA: 'Alvenaria',
  REGULARIZACAO_PISO: 'Regularização de Piso',
  REGULARIZACAO_PAREDES_TETOS: 'Regularização Paredes/Tetos',
  ACABAMENTO_PISO_INTERNO: 'Acabamento Piso Interno',
  ACABAMENTO_PAREDE_INTERNA: 'Acabamento Parede Interna',
  ACABAMENTO_PAREDE_EXTERNA: 'Acabamento Parede Externa',
}

export default function ComposicoesProfissionais({ data, onUpdate }: Props) {
  const [composicoes, setComposicoes] = useState<ComposicaoProfissional[]>(COMPOSICOES_PROFISSIONAIS)
  const ui = getModuleUiState(data, 'composicoes-profissionais')
  const [aba, setAba] = useState<'composicoes' | 'hidraulica'>((ui.abaAtiva as 'composicoes' | 'hidraulica') ?? 'composicoes')
  const [showModal, setShowModal] = useState(false)
  const [novaComp, setNovaComp] = useState<Partial<ComposicaoProfissional>>({ categoria: 'ALVENARIA', profissional: '', servico: '', refSINAPI: '', unidade: 'M²', medicao: 'M²', producaoMensalSINAPI: 0, valorRefMetaDiaria: 0 })

  function updateComp(id: number, field: keyof ComposicaoProfissional, value: string | number) {
    setComposicoes(prev => prev.map(c => {
      if (c.id !== id) return c
      const updated = { ...c, [field]: value }
      if (field === 'valorRefMetaDiaria') {
        const prods = calcProds(value as number)
        return { ...updated, ...prods }
      }
      return updated
    }))
  }

  function addComp() {
    const prods = calcProds(novaComp.valorRefMetaDiaria ?? 1)
    const newItem: ComposicaoProfissional = {
      id: Math.max(...composicoes.map(c => c.id)) + 1,
      ...prods,
      categoria: novaComp.categoria ?? 'ALVENARIA',
      profissional: novaComp.profissional ?? '',
      descricao: novaComp.servico ?? '',
      servico: novaComp.servico ?? '',
      refSINAPI: novaComp.refSINAPI ?? '',
      medicao: novaComp.medicao ?? 'M²',
      unidade: novaComp.unidade ?? 'M²',
      producaoMensalSINAPI: novaComp.producaoMensalSINAPI ?? 0,
      valorRefMetaDiaria: novaComp.valorRefMetaDiaria ?? 0,
    }
    setComposicoes(prev => [...prev, newItem])
    onUpdate({
      auditTrail: appendAuditEvent(data, {
        usuario: 'engenheiro_local',
        modulo: 'composicoes-profissionais',
        acao: 'adicao_composicao_profissional',
        impacto: `comp:${newItem.id}`,
      }),
    })
    setShowModal(false)
    setNovaComp({ categoria: 'ALVENARIA', profissional: '', servico: '', refSINAPI: '', unidade: 'M²', medicao: 'M²', producaoMensalSINAPI: 0, valorRefMetaDiaria: 0 })
  }

  const banheiroPoints = PONTOS_HIDRAULICOS.filter(p => p.tipo === 'BANHEIRO')
  const cozPoints = PONTOS_HIDRAULICOS.filter(p => p.tipo === 'COZINHA_LAVANDERIA')

  return (
    <div className="flex flex-col gap-4 max-w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Composições Profissionais</h1>
          <p className="text-base-content/50 text-sm">Seções 4.2 a 4.5 — Metas e tabelas hidráulicas</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary btn-sm gap-1"><MdAdd size={16} /> Adicionar</button>
      </div>

      <div role="tablist" className="tabs tabs-boxed w-fit">
        <button role="tab" onClick={() => { setAba('composicoes'); onUpdate({ moduleUIState: setModuleUiState(data, 'composicoes-profissionais', { abaAtiva: 'composicoes' }) }) }} className={`tab ${aba === 'composicoes' ? 'tab-active' : ''}`}>Composições ({composicoes.length})</button>
        <button role="tab" onClick={() => { setAba('hidraulica'); onUpdate({ moduleUIState: setModuleUiState(data, 'composicoes-profissionais', { abaAtiva: 'hidraulica' }) }) }} className={`tab ${aba === 'hidraulica' ? 'tab-active' : ''}`}>Hidráulica</button>
      </div>

      {aba === 'composicoes' && (
        <div className="card bg-base-100 shadow overflow-x-auto">
          <table className="table table-xs">
            <thead>
              <tr>
                <th>ID</th><th>Categoria</th><th>Profissional</th><th>Serviço</th><th>Ref.SINAPI</th><th>UN</th>
                <th className="text-right">Prod.Mensal SINAPI</th>
                <th className="text-right">Val.Ref Meta (R$/UN)</th>
                <th className="text-right">Prod.UN/h</th><th className="text-right">Prod.UN/dia</th>
                <th className="text-right">Meta Mês</th><th className="text-right">Meta Sem.</th>
                <th className="text-right">Meta Estip.</th>
              </tr>
            </thead>
            <tbody>
              {composicoes.map(c => (
                <tr key={c.id} className="hover">
                  <td>{c.id}</td>
                  <td className="text-xs max-w-[120px] truncate">{CATEGORIA_LABEL[c.categoria] ?? c.categoria.replace(/_/g, ' ')}</td>
                  <td className="text-xs">{c.profissional}</td>
                  <td className="text-xs max-w-[150px] truncate">{c.servico}</td>
                  <td className="font-mono text-xs">{c.refSINAPI}</td>
                  <td className="text-xs">{c.unidade}</td>
                  <td className="text-right">
                    <input type="number" value={c.producaoMensalSINAPI} onChange={e => updateComp(c.id, 'producaoMensalSINAPI', parseFloat(e.target.value) || 0)} className="input input-xs w-20 text-right" />
                  </td>
                  <td className="text-right">
                    <input type="number" step="0.01" value={c.valorRefMetaDiaria} onChange={e => updateComp(c.id, 'valorRefMetaDiaria', parseFloat(e.target.value) || 0)} className="input input-xs w-20 text-right" />
                  </td>
                  <td className="text-right font-mono text-xs">{c.produtividadeUNh.toFixed(2)}</td>
                  <td className="text-right font-mono text-xs">{c.produtividadeUNdia.toFixed(2)}</td>
                  <td className="text-right font-mono text-xs">{c.metaProducaoMes.toFixed(1)}</td>
                  <td className="text-right font-mono text-xs">{c.metaProducaoSemana.toFixed(1)}</td>
                  <td className="text-right">
                    <input type="number" step="0.1" value={c.metaEstipulada ?? ''} onChange={e => updateComp(c.id, 'metaEstipulada', parseFloat(e.target.value) || 0)} placeholder="—" className="input input-xs w-20 text-right" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {aba === 'hidraulica' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[{ label: 'Banheiro', points: banheiroPoints }, { label: 'Cozinha / Lavanderia', points: cozPoints }].map(({ label, points }) => (
            <div key={label} className="card bg-base-100 shadow">
              <div className="card-body p-4">
                <p className="font-semibold mb-3">{label}</p>
                {points.map(pt => (
                  <div key={pt.descricaoPonto} className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-sm">{pt.descricaoPonto}</p>
                      <span className="badge badge-sm badge-ghost">{pt.tempoExecucaoHoras}h/un</span>
                    </div>
                    <table className="table table-xs">
                      <thead><tr><th>Peça</th><th>UN</th><th className="text-right">Qtd./ponto</th></tr></thead>
                      <tbody>
                        {pt.pecas.map((peca, idx) => (
                          <tr key={idx}><td className="text-xs">{peca.descricao}</td><td className="text-xs">{peca.unidade}</td><td className="text-right text-xs font-mono">{peca.quantidade}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Nova Composição Profissional</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Profissional', key: 'profissional' as const, type: 'text' },
                { label: 'Serviço', key: 'servico' as const, type: 'text' },
                { label: 'Ref. SINAPI', key: 'refSINAPI' as const, type: 'text' },
                { label: 'Unidade', key: 'unidade' as const, type: 'text' },
                { label: 'Prod. Mensal SINAPI', key: 'producaoMensalSINAPI' as const, type: 'number' },
                { label: 'Valor Ref. Meta (R$/UN)', key: 'valorRefMetaDiaria' as const, type: 'number' },
              ].map(({ label, key, type }) => (
                <fieldset key={key} className="fieldset">
                  <legend className="fieldset-legend text-xs">{label}</legend>
                  <input type={type} value={(novaComp[key] as string | number) ?? ''} onChange={e => setNovaComp(prev => ({ ...prev, [key]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }))} className="input input-sm w-full" />
                </fieldset>
              ))}
            </div>
            <div className="modal-action">
              <button onClick={() => setShowModal(false)} className="btn btn-ghost btn-sm">Cancelar</button>
              <button onClick={addComp} className="btn btn-primary btn-sm">Adicionar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
