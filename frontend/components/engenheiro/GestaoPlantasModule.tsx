import { useState } from 'react'
import { PLANTAS_PADRAO } from '@/lib/mockData'
import { MdAdd, MdEdit, MdDelete, MdRestore } from 'react-icons/md'
import type { EngineerData, PlantaPadrao } from '@/types'

interface Props {
  data: EngineerData
  onUpdate: (p: Partial<EngineerData>) => void
}

const emptyForm = { nome: '', quartos: 2, areaConstruidaM2: 50, tempoObraMeses: 6, descricao: '', areaMinima: 100, frenteMinima: 5 }

export default function GestaoPlantasModule({ data, onUpdate }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  function openAdd() { setEditingId(null); setForm(emptyForm); setShowModal(true) }

  function openEdit(p: PlantaPadrao) {
    setEditingId(p.id)
    setForm({ nome: p.nome, quartos: p.quartos, areaConstruidaM2: p.areaConstruidaM2, tempoObraMeses: p.tempoObraMeses, descricao: p.descricao, areaMinima: p.compatibilidadeTerreno.areaMinima, frenteMinima: p.compatibilidadeTerreno.frenteMinima })
    setShowModal(true)
  }

  function handleSave() {
    const id = editingId ?? `planta-${form.quartos}q-${form.areaConstruidaM2}`
    const planta: PlantaPadrao = {
      id, nome: form.nome, quartos: form.quartos, areaConstruidaM2: form.areaConstruidaM2,
      tempoObraMeses: form.tempoObraMeses, descricao: form.descricao,
      compatibilidadeTerreno: { areaMinima: form.areaMinima, frenteMinima: form.frenteMinima },
      servicos: editingId ? (data.plantas.find(p => p.id === editingId)?.servicos ?? []) : [],
    }
    const plantas = editingId ? data.plantas.map(p => p.id === editingId ? planta : p) : [...data.plantas, planta]
    onUpdate({ plantas })
    setShowModal(false)
  }

  function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta planta?')) return
    onUpdate({ plantas: data.plantas.filter(p => p.id !== id) })
  }

  function restoreDefaults() {
    if (!confirm('Restaurar todas as plantas para o padrão original?')) return
    onUpdate({ plantas: PLANTAS_PADRAO })
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestão de Plantas Arquitetônicas</h2>
          <p className="text-base-content/50 text-sm">Plantas disponíveis para os clientes</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost btn-sm" onClick={restoreDefaults}><MdRestore size={16} /> Restaurar Padrão</button>
          <button className="btn btn-primary btn-sm" onClick={openAdd}><MdAdd size={16} /> Adicionar Planta</button>
        </div>
      </div>

      <div className="card bg-base-100 shadow overflow-x-auto">
        <table className="table table-sm">
          <thead>
            <tr><th>Nome</th><th>Quartos</th><th>Área (m²)</th><th>Tempo Obra</th><th>Terreno Mín. (m²)</th><th>Frente Mín. (m)</th><th>Serviços</th><th>Ações</th></tr>
          </thead>
          <tbody>
            {data.plantas.map(p => (
              <tr key={p.id} className="hover">
                <td className="font-semibold text-sm">{p.nome}</td>
                <td>{p.quartos}</td>
                <td>{p.areaConstruidaM2}</td>
                <td>{p.tempoObraMeses} meses</td>
                <td>{p.compatibilidadeTerreno.areaMinima}</td>
                <td>{p.compatibilidadeTerreno.frenteMinima}</td>
                <td>{p.servicos.length}</td>
                <td>
                  <div className="flex gap-1">
                    <button className="btn btn-ghost btn-xs" onClick={() => openEdit(p)}><MdEdit size={14} className="text-info" /></button>
                    <button className="btn btn-ghost btn-xs" onClick={() => handleDelete(p.id)}><MdDelete size={14} className="text-error" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {data.plantas.length === 0 && (
              <tr><td colSpan={8} className="text-center text-base-content/40 py-8">Nenhuma planta cadastrada.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowModal(false)}>
          <div className="card bg-base-100 w-full max-w-lg shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="card-body gap-4">
              <h3 className="card-title">{editingId ? 'Editar Planta' : 'Nova Planta'}</h3>
              <div className="grid grid-cols-2 gap-3">
                <fieldset className="fieldset col-span-2">
                  <legend className="fieldset-legend">Nome</legend>
                  <input type="text" className="input w-full" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
                </fieldset>
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Quartos</legend>
                  <input type="number" className="input w-full" min={1} max={4} value={form.quartos} onChange={e => setForm({ ...form, quartos: +e.target.value })} />
                </fieldset>
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Área Construída (m²)</legend>
                  <input type="number" className="input w-full" value={form.areaConstruidaM2} onChange={e => setForm({ ...form, areaConstruidaM2: +e.target.value })} />
                </fieldset>
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Tempo de Obra (meses)</legend>
                  <input type="number" className="input w-full" value={form.tempoObraMeses} onChange={e => setForm({ ...form, tempoObraMeses: +e.target.value })} />
                </fieldset>
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Área Mínima Terreno (m²)</legend>
                  <input type="number" className="input w-full" value={form.areaMinima} onChange={e => setForm({ ...form, areaMinima: +e.target.value })} />
                </fieldset>
                <fieldset className="fieldset col-span-2">
                  <legend className="fieldset-legend">Frente Mínima Terreno (m)</legend>
                  <input type="number" className="input w-full" value={form.frenteMinima} onChange={e => setForm({ ...form, frenteMinima: +e.target.value })} />
                </fieldset>
                <fieldset className="fieldset col-span-2">
                  <legend className="fieldset-legend">Descrição</legend>
                  <textarea className="textarea w-full" rows={2} value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} />
                </fieldset>
              </div>
              <div className="bg-info/10 border border-info/30 rounded-lg p-3 text-sm text-base-content/60">
                Os serviços da planta são definidos automaticamente com base no projeto padrão e podem ser ajustados na etapa E2 (Quantitativos).
              </div>
              <div className="flex justify-end gap-2">
                <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>Cancelar</button>
                <button className="btn btn-primary btn-sm" disabled={!form.nome.trim()} onClick={handleSave}>Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
