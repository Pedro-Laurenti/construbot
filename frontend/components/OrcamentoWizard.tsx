'use client'

import { useState } from 'react'
import { MdArrowBack, MdArrowForward, MdCalculate } from 'react-icons/md'
import { SERVICE_LABELS, SERVICE_CONFIG, UF_LIST } from '@/lib/mockData'
import ServicoForm from './ServicoForm'
import type { Orcamento, OrcamentoItem, ServiceType, ContratoModalidade } from '@/types'

interface Props {
  clienteId: string
  onComplete: (orcamento: Orcamento) => void
}

const ALL_SERVICES = Object.keys(SERVICE_LABELS) as ServiceType[]

export default function OrcamentoWizard({ clienteId, onComplete }: Props) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [uf, setUf] = useState('SP')
  const [modalidadePadrao, setModalidadePadrao] = useState<ContratoModalidade>('MEI')
  const [prazoPadrao, setPrazoPadrao] = useState(30)
  const [selecionados, setSelecionados] = useState<ServiceType[]>([])
  const [itens, setItens] = useState<OrcamentoItem[]>([])

  function toggleServico(st: ServiceType) {
    setSelecionados(prev => prev.includes(st) ? prev.filter(s => s !== st) : [...prev, st])
  }

  function goToStep3() {
    if (!selecionados.length) return
    const next: OrcamentoItem[] = selecionados.map(st => {
      const existing = itens.find(i => i.serviceType === st)
      if (existing) return existing
      return {
        id: `item-${Date.now()}-${st}`,
        serviceType: st,
        subTipo: '',
        especificacao1: '',
        especificacao2: '',
        especificacao3: '',
        unidade: SERVICE_CONFIG[st].unidade,
        quantidade: 0,
        prazoRequerido: prazoPadrao,
        modalidade: modalidadePadrao,
      }
    })
    setItens(next)
    setStep(3)
  }

  function updateItem(updated: OrcamentoItem) {
    setItens(prev => prev.map(i => i.id === updated.id ? updated : i))
  }

  function handleCalcular() {
    onComplete({
      id: `orc-${Date.now()}`,
      nome: `Orçamento — ${uf}`,
      clienteId,
      dataCriacao: new Date().toISOString().slice(0, 10),
      status: 'rascunho',
      uf,
      itens,
    })
  }

  const hasInvalid = itens.some(i => i.quantidade <= 0)

  return (
    <div className="max-w-2xl mx-auto p-6">
      <ul className="steps w-full mb-8">
        {['Informações', 'Serviços', 'Configurar', 'Resumo'].map((s, i) => (
          <li key={s} className={`step ${i + 1 <= step ? 'step-primary' : ''}`}>{s}</li>
        ))}
      </ul>

      {step === 1 && (
        <div className="card bg-base-100 shadow-sm border border-secondary">
          <div className="card-body gap-4">
            <h2 className="card-title">Informações do Orçamento</h2>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">Estado de Referência (UF)</legend>
              <select value={uf} onChange={e => setUf(e.target.value)} className="select w-full">
                {UF_LIST.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </fieldset>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">Modalidade Padrão</legend>
              <select value={modalidadePadrao} onChange={e => setModalidadePadrao(e.target.value as ContratoModalidade)} className="select w-full">
                <option value="MEI">MEI</option>
                <option value="CLT">CLT</option>
              </select>
            </fieldset>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">Prazo Global da Obra (dias corridos)</legend>
              <input
                type="number"
                min={1}
                value={prazoPadrao}
                onChange={e => setPrazoPadrao(parseInt(e.target.value) || 1)}
                className="input w-full"
              />
            </fieldset>

            <div className="flex justify-end">
              <button onClick={() => setStep(2)} className="btn btn-primary">
                Próximo <MdArrowForward size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card bg-base-100 shadow-sm border border-secondary">
          <div className="card-body gap-4">
            <h2 className="card-title">Selecione os Serviços</h2>
            <p className="text-base-content/60 text-sm">{selecionados.length} serviço(s) selecionado(s)</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ALL_SERVICES.map(st => (
                <label
                  key={st}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selecionados.includes(st) ? 'border-primary bg-primary/10' : 'border-secondary hover:bg-base-200'}`}
                >
                  <input
                    type="checkbox"
                    checked={selecionados.includes(st)}
                    onChange={() => toggleServico(st)}
                    className="checkbox checkbox-primary checkbox-sm"
                  />
                  <div>
                    <p className="text-sm font-medium">{SERVICE_LABELS[st]}</p>
                    <p className="text-xs text-base-content/40">{SERVICE_CONFIG[st].unidade}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="btn btn-ghost"><MdArrowBack size={18} /> Voltar</button>
              <button onClick={goToStep3} disabled={!selecionados.length} className="btn btn-primary">
                Configurar <MdArrowForward size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card bg-base-100 shadow-sm border border-secondary">
          <div className="card-body gap-4">
            <h2 className="card-title">Configure os Serviços</h2>
            {itens.map(item => <ServicoForm key={item.id} item={item} onChange={updateItem} />)}
            {hasInvalid && (
              <div className="alert alert-warning text-sm">Preencha a quantidade de todos os serviços.</div>
            )}
            <div className="flex justify-between">
              <button onClick={() => setStep(2)} className="btn btn-ghost"><MdArrowBack size={18} /> Voltar</button>
              <button onClick={() => setStep(4)} disabled={hasInvalid} className="btn btn-primary">
                Revisar <MdArrowForward size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="card bg-base-100 shadow-sm border border-secondary">
          <div className="card-body gap-4">
            <h2 className="card-title">Resumo do Orçamento</h2>
            <p className="text-sm text-base-content/60">
              UF: <strong>{uf}</strong> · Modalidade padrão: <strong>{modalidadePadrao}</strong>
            </p>

            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr><th>Serviço</th><th>Quantidade</th><th>Prazo</th><th>Modalidade</th></tr>
                </thead>
                <tbody>
                  {itens.map(i => (
                    <tr key={i.id}>
                      <td className="text-sm">{SERVICE_LABELS[i.serviceType]}</td>
                      <td className="text-sm">{i.quantidade} {i.unidade}</td>
                      <td className="text-sm">{i.prazoRequerido}d</td>
                      <td>
                        <span className={`badge badge-sm ${i.modalidade === 'MEI' ? 'badge-success' : 'badge-info'}`}>
                          {i.modalidade}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep(3)} className="btn btn-ghost"><MdArrowBack size={18} /> Voltar</button>
              <button onClick={handleCalcular} className="btn btn-primary">
                <MdCalculate size={18} /> Calcular Orçamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
