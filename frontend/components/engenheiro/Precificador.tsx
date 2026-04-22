'use client'

import { useState } from 'react'
import { COMPOSICOES_PROFISSIONAIS, SERVICE_LABELS } from '@/lib/mockData'
import type { EngineerData, PrecificadorItem, ServiceType } from '@/types'
import { MdAdd, MdDelete } from 'react-icons/md'

interface Props { data: EngineerData; onUpdate: (p: Partial<EngineerData>) => void }

const SERVICO_LABELS: Record<string, string> = { ...SERVICE_LABELS }

function emptyItem(): Omit<PrecificadorItem, 'id'> {
  return { servico: 'ALVENARIA', quantidade: 0, especificacao1: '', especificacao2: '', especificacao3: '', composicaoBasica: '', composicaoProfissionalId: 1, modalidade: 'MEI', unidade: 'M²' }
}

export default function Precificador({ data, onUpdate }: Props) {
  const { precificadorItens } = data
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<Omit<PrecificadorItem, 'id'>>(emptyItem())
  const canAdd = form.quantidade > 0 && !!form.composicaoProfissionalId && !!form.composicaoBasica.trim()

  function addItem() {
    const id = `svc-${Date.now()}`
    const comp = COMPOSICOES_PROFISSIONAIS.find(c => c.id === form.composicaoProfissionalId)
    const item: PrecificadorItem = {
      ...form,
      id,
      unidade: comp?.unidade ?? form.unidade,
    }
    onUpdate({ precificadorItens: [...precificadorItens, item] })
    setShowModal(false)
    setForm(emptyItem())
  }

  function removeItem(id: string) {
    onUpdate({ precificadorItens: precificadorItens.filter(i => i.id !== id) })
  }

  const serviceTypes: ServiceType[] = [
    'FUNDACAO', 'ESTRUTURA_CONCRETO', 'ALVENARIA', 'GRAUTE', 'ARMACAO_VERTICAL_HORIZONTAL',
    'CONTRAPISO', 'REVESTIMENTO_ARGAMASSA_PAREDE', 'REVESTIMENTO_ARGAMASSA_TETO',
    'REVESTIMENTO_CERAMICO', 'PINTURA_INTERNA', 'PINTURA_EXTERNA', 'LIMPEZA_INTERNA',
  ]

  return (
    <div className="flex flex-col gap-4 max-w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Precificador</h1>
          <p className="text-base-content/50 text-sm">Configuração dos serviços para cálculo</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary btn-sm gap-1"><MdAdd size={16} /> Adicionar Serviço</button>
      </div>

      {precificadorItens.length === 0 ? (
        <div className="card bg-base-100 shadow">
          <div className="card-body items-center py-12">
            <p className="text-base-content/40">Nenhum serviço configurado. Clique em "Adicionar Serviço" para começar.</p>
          </div>
        </div>
      ) : (
        <div className="card bg-base-100 shadow overflow-x-auto">
          <div className="sticky left-0 pointer-events-none h-0">
            <div className="absolute right-0 top-0 h-full w-4 bg-gradient-to-l from-base-100/90 to-transparent" />
          </div>
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Serviço</th><th>Qtd.</th><th>Espec.1</th><th>Espec.2</th><th>Espec.3</th>
                <th>Cód. SINAPI</th><th>Comp. Prof.</th><th>Modalidade</th><th>UN</th>
                <th>Custo Total</th><th>Custo/UN</th><th></th>
              </tr>
            </thead>
            <tbody>
              {precificadorItens.map(item => {
                const comp = COMPOSICOES_PROFISSIONAIS.find(c => c.id === item.composicaoProfissionalId)
                return (
                  <tr key={item.id} className="hover">
                    <td className="text-xs font-semibold sticky left-0 bg-base-100 z-10">{SERVICO_LABELS[item.servico] ?? item.servico}</td>
                    <td className="font-mono text-xs">{item.quantidade}</td>
                    <td className="text-xs">{item.especificacao1 || '—'}</td>
                    <td className="text-xs">{item.especificacao2 || '—'}</td>
                    <td className="text-xs">{item.especificacao3 || '—'}</td>
                    <td className="font-mono text-xs">{item.composicaoBasica || '—'}</td>
                    <td className="text-xs">{comp?.servico ?? item.composicaoProfissionalId}</td>
                    <td><span className={`badge badge-xs ${item.modalidade === 'MEI' ? 'badge-info' : 'badge-warning'}`}>{item.modalidade}</span></td>
                    <td className="text-xs">{item.unidade}</td>
                    <td className="font-mono text-xs">{item.custoTotal ? `R$ ${item.custoTotal.toFixed(2)}` : '—'}</td>
                    <td className="font-mono text-xs">{item.custoUnitario ? `R$ ${item.custoUnitario.toFixed(2)}` : '—'}</td>
                    <td>
                      <button onClick={() => removeItem(item.id)} className="btn btn-ghost btn-xs text-error"><MdDelete size={14} /></button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-lg max-h-[85vh] overflow-y-auto">
            <h3 className="font-bold text-lg mb-4">Adicionar Serviço</h3>
            <div className="grid grid-cols-2 gap-3">
              <fieldset className="fieldset col-span-2">
                <legend className="fieldset-legend text-xs">Tipo de Serviço</legend>
                <select value={form.servico} onChange={e => setForm(f => ({ ...f, servico: e.target.value }))} className="select select-sm w-full">
                  {serviceTypes.map(s => <option key={s} value={s}>{SERVICO_LABELS[s] ?? s}</option>)}
                </select>
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend text-xs">Quantidade</legend>
                <input type="number" step="0.01" value={form.quantidade} onChange={e => setForm(f => ({ ...f, quantidade: parseFloat(e.target.value) || 0 }))} className="input input-sm w-full" />
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend text-xs">Código SINAPI</legend>
                <input type="text" value={form.composicaoBasica} onChange={e => setForm(f => ({ ...f, composicaoBasica: e.target.value }))} className="input input-sm w-full" placeholder="Ex: 87888" />
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend text-xs">Especificação 1</legend>
                <input type="text" value={form.especificacao1} onChange={e => setForm(f => ({ ...f, especificacao1: e.target.value }))} className="input input-sm w-full" />
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend text-xs">Especificação 2</legend>
                <input type="text" value={form.especificacao2} onChange={e => setForm(f => ({ ...f, especificacao2: e.target.value }))} className="input input-sm w-full" />
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend text-xs">Especificação 3</legend>
                <input type="text" value={form.especificacao3} onChange={e => setForm(f => ({ ...f, especificacao3: e.target.value }))} className="input input-sm w-full" />
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend text-xs">Composição Profissional</legend>
                <select value={form.composicaoProfissionalId} onChange={e => setForm(f => ({ ...f, composicaoProfissionalId: parseInt(e.target.value) }))} className="select select-sm w-full">
                  {COMPOSICOES_PROFISSIONAIS.map(c => <option key={c.id} value={c.id}>{c.id} — {c.servico}</option>)}
                </select>
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend text-xs">Modalidade</legend>
                <select value={form.modalidade} onChange={e => setForm(f => ({ ...f, modalidade: e.target.value as 'MEI' | 'CLT' }))} className="select select-sm w-full">
                  <option value="MEI">MEI</option>
                  <option value="CLT">CLT</option>
                </select>
              </fieldset>
            </div>
            <div className="modal-action">
              <button onClick={() => setShowModal(false)} className="btn btn-ghost btn-sm">Cancelar</button>
              <button onClick={addItem} disabled={!canAdd} className="btn btn-primary btn-sm">Adicionar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
