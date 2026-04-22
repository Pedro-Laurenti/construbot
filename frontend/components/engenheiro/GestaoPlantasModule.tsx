import { useState } from 'react'
import { PLANTAS_PADRAO } from '@/lib/mockData'
import { MdAdd, MdEdit, MdDelete, MdRestore, MdClose, MdImage, MdChevronLeft, MdChevronRight } from 'react-icons/md'
import type { EngineerData, PlantaPadrao } from '@/types'

interface Props {
  data: EngineerData
  onUpdate: (p: Partial<EngineerData>) => void
}

interface FormState {
  nome: string
  quartos: number
  areaConstruidaM2: number
  tempoObraMeses: number
  descricao: string
  descricaoDetalhada: string
  caracteristicas: string[]
  imagens: string[]
  areaMinima: number
  frenteMinima: number
}

const emptyForm: FormState = {
  nome: '',
  quartos: 2,
  areaConstruidaM2: 50,
  tempoObraMeses: 6,
  descricao: '',
  descricaoDetalhada: '',
  caracteristicas: [],
  imagens: [],
  areaMinima: 100,
  frenteMinima: 5,
}

function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function resizeImage(file: File, maxSize = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const ratio = Math.min(1, maxSize / img.width, maxSize / img.height)
        const w = Math.max(1, Math.round(img.width * ratio))
        const h = Math.max(1, Math.round(img.height * ratio))
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('canvas'))
          return
        }
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.onerror = reject
      img.src = String(reader.result)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function MiniCarrossel({ imagens }: { imagens: string[] }) {
  const [idx, setIdx] = useState(0)
  if (imagens.length === 0) {
    return (
      <div className="w-14 h-10 bg-base-200 rounded flex items-center justify-center">
        <MdImage size={18} className="text-base-content/25" />
      </div>
    )
  }
  return (
    <div className="relative w-14 h-10 bg-base-200 rounded overflow-hidden">
      <img src={imagens[idx]} alt="" className="w-full h-full object-cover" />
      {imagens.length > 1 && (
        <span className="absolute bottom-0 right-0 bg-black/60 text-white text-[9px] px-1 rounded-tl">
          {idx + 1}/{imagens.length}
        </span>
      )}
    </div>
  )
}

export default function GestaoPlantasModule({ data, onUpdate }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [imgUrl, setImgUrl] = useState('')
  const [novaCaract, setNovaCaract] = useState('')
  const [uploadError, setUploadError] = useState('')
  const [confirmAction, setConfirmAction] = useState<{ label: string; onConfirm: () => void } | null>(null)

  function openAdd() { setEditingId(null); setForm(emptyForm); setImgUrl(''); setNovaCaract(''); setUploadError(''); setShowModal(true) }

  function openEdit(p: PlantaPadrao) {
    setEditingId(p.id)
    setForm({
      nome: p.nome,
      quartos: p.quartos,
      areaConstruidaM2: p.areaConstruidaM2,
      tempoObraMeses: p.tempoObraMeses,
      descricao: p.descricao,
      descricaoDetalhada: p.descricaoDetalhada ?? '',
      caracteristicas: p.caracteristicas ? [...p.caracteristicas] : [],
      imagens: p.imagens ? [...p.imagens] : [],
      areaMinima: p.compatibilidadeTerreno.areaMinima,
      frenteMinima: p.compatibilidadeTerreno.frenteMinima,
    })
    setImgUrl('')
    setNovaCaract('')
    setUploadError('')
    setShowModal(true)
  }

  function handleSave() {
    const id = editingId ?? `planta-${form.quartos}q-${form.areaConstruidaM2}`
    const planta: PlantaPadrao = {
      id,
      nome: form.nome,
      quartos: form.quartos,
      areaConstruidaM2: form.areaConstruidaM2,
      tempoObraMeses: form.tempoObraMeses,
      descricao: form.descricao,
      descricaoDetalhada: form.descricaoDetalhada.trim() || undefined,
      caracteristicas: form.caracteristicas.length > 0 ? form.caracteristicas : undefined,
      imagens: form.imagens.length > 0 ? form.imagens : undefined,
      compatibilidadeTerreno: { areaMinima: form.areaMinima, frenteMinima: form.frenteMinima },
      servicos: editingId ? (data.plantas.find(p => p.id === editingId)?.servicos ?? []) : [],
    }
    const plantas = editingId ? data.plantas.map(p => p.id === editingId ? planta : p) : [...data.plantas, planta]
    onUpdate({ plantas })
    setShowModal(false)
  }

  function handleDelete(id: string) {
    setConfirmAction({
      label: 'Tem certeza que deseja excluir esta planta?',
      onConfirm: () => onUpdate({ plantas: data.plantas.filter(p => p.id !== id) }),
    })
  }

  function restoreDefaults() {
    setConfirmAction({
      label: 'Restaurar todas as plantas para o padrão original? Esta ação não pode ser desfeita.',
      onConfirm: () => onUpdate({ plantas: PLANTAS_PADRAO }),
    })
  }

  function addImageUrl() {
    const url = imgUrl.trim()
    if (!url) return
    setForm(f => ({ ...f, imagens: [...f.imagens, url] }))
    setImgUrl('')
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    setUploadError('')
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    try {
      const uris: string[] = []
      for (const f of files) {
        const resized = await resizeImage(f, 1024)
        if (resized.length > 500_000) {
          setUploadError(`"${f.name}" excede 500KB mesmo após redimensionar.`)
          continue
        }
        uris.push(resized)
      }
      if (uris.length > 0) setForm(f => ({ ...f, imagens: [...f.imagens, ...uris] }))
    } catch {
      setUploadError('Falha ao carregar arquivo.')
    } finally {
      e.target.value = ''
    }
  }

  function removeImage(i: number) {
    setForm(f => ({ ...f, imagens: f.imagens.filter((_, idx) => idx !== i) }))
  }

  function moveImage(i: number, dir: -1 | 1) {
    setForm(f => {
      const arr = [...f.imagens]
      const j = i + dir
      if (j < 0 || j >= arr.length) return f
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
      return { ...f, imagens: arr }
    })
  }

  function addCaract() {
    const c = novaCaract.trim()
    if (!c) return
    setForm(f => ({ ...f, caracteristicas: [...f.caracteristicas, c] }))
    setNovaCaract('')
  }

  function removeCaract(i: number) {
    setForm(f => ({ ...f, caracteristicas: f.caracteristicas.filter((_, idx) => idx !== i) }))
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
            <tr><th>Mídia</th><th>Nome</th><th>Quartos</th><th>Área (m²)</th><th>Tempo Obra</th><th>Terreno Mín. (m²)</th><th>Frente Mín. (m)</th><th>Serviços</th><th>Ações</th></tr>
          </thead>
          <tbody>
            {data.plantas.map(p => (
              <tr key={p.id} className="hover">
                <td><MiniCarrossel imagens={p.imagens ?? []} /></td>
                <td className="font-semibold text-sm">{p.nome}</td>
                <td>{p.quartos}</td>
                <td>{p.areaConstruidaM2}</td>
                <td>{p.tempoObraMeses} meses</td>
                <td>{p.compatibilidadeTerreno.areaMinima}</td>
                <td>{p.compatibilidadeTerreno.frenteMinima}</td>
                <td>{p.servicos.length}</td>
                <td>
                  <div className="flex gap-1">
                    <button className="btn btn-ghost btn-xs gap-1" onClick={() => openEdit(p)}><MdEdit size={14} className="text-info" /> Editar</button>
                    <button className="btn btn-ghost btn-xs gap-1 text-error" onClick={() => handleDelete(p.id)}><MdDelete size={14} /> Excluir</button>
                  </div>
                </td>
              </tr>
            ))}
            {data.plantas.length === 0 && (
              <tr><td colSpan={9} className="text-center text-base-content/40 py-8">Nenhuma planta cadastrada.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowModal(false)}>
          <div className="card bg-base-100 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
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
                  <legend className="fieldset-legend">Descrição resumida (usada na lista)</legend>
                  <input type="text" className="input w-full" placeholder="Ex: Casa térrea com 2 quartos..." value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} />
                </fieldset>
                <fieldset className="fieldset col-span-2">
                  <legend className="fieldset-legend">Descrição detalhada (vitrine)</legend>
                  <textarea
                    className="textarea w-full"
                    rows={4}
                    placeholder="Descreva a planta como se fosse um anúncio de e-commerce: disposição dos ambientes, acabamentos, pontos fortes, etc."
                    value={form.descricaoDetalhada}
                    onChange={e => setForm({ ...form, descricaoDetalhada: e.target.value })}
                  />
                </fieldset>
              </div>

              <div className="card bg-base-200/50 border border-base-300">
                <div className="card-body p-4 gap-3">
                  <h4 className="font-semibold text-sm">Imagens da planta</h4>
                  <p className="text-xs text-base-content/50">Cole URLs ou faça upload. A ordem abaixo é a ordem do carrossel.</p>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="input input-sm flex-1"
                      placeholder="https://..."
                      value={imgUrl}
                      onChange={e => setImgUrl(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addImageUrl() } }}
                    />
                    <button className="btn btn-sm btn-secondary" onClick={addImageUrl} disabled={!imgUrl.trim()}>
                      <MdAdd size={16} /> URL
                    </button>
                    <label className="btn btn-sm btn-outline cursor-pointer">
                      <MdImage size={16} /> Upload
                      <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} />
                    </label>
                  </div>
                  {uploadError && <p className="text-xs text-error">{uploadError}</p>}

                  {form.imagens.length === 0 ? (
                    <p className="text-xs text-base-content/40 text-center py-4 bg-base-100 rounded">Nenhuma imagem adicionada.</p>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {form.imagens.map((src, i) => (
                        <div key={i} className="relative group bg-base-100 rounded overflow-hidden aspect-square">
                          <img src={src} alt="" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between p-1">
                            <button onClick={() => moveImage(i, -1)} disabled={i === 0} className="btn btn-circle btn-xs bg-base-100/80 border-0 disabled:opacity-30">
                              <MdChevronLeft size={14} />
                            </button>
                            <button onClick={() => removeImage(i)} className="btn btn-circle btn-xs bg-error/90 border-0 text-white">
                              <MdClose size={14} />
                            </button>
                            <button onClick={() => moveImage(i, 1)} disabled={i === form.imagens.length - 1} className="btn btn-circle btn-xs bg-base-100/80 border-0 disabled:opacity-30">
                              <MdChevronRight size={14} />
                            </button>
                          </div>
                          <span className="absolute top-0 left-0 bg-black/60 text-white text-[10px] px-1.5 rounded-br">{i + 1}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="card bg-base-200/50 border border-base-300">
                <div className="card-body p-4 gap-3">
                  <h4 className="font-semibold text-sm">Características / Diferenciais</h4>
                  <p className="text-xs text-base-content/50">Lista curta de pontos fortes exibida na vitrine (ex: "Suíte com closet", "Cozinha americana").</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="input input-sm flex-1"
                      placeholder="Adicionar característica..."
                      value={novaCaract}
                      onChange={e => setNovaCaract(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCaract() } }}
                    />
                    <button className="btn btn-sm btn-secondary" onClick={addCaract} disabled={!novaCaract.trim()}>
                      <MdAdd size={16} /> Adicionar
                    </button>
                  </div>
                  {form.caracteristicas.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {form.caracteristicas.map((c, i) => (
                        <span key={i} className="badge badge-outline gap-1 py-3">
                          {c}
                          <button onClick={() => removeCaract(i)} className="btn btn-ghost btn-xs btn-circle">
                            <MdClose size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
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

      {confirmAction && (
        <div className="modal modal-open">
          <div className="modal-box max-w-sm">
            <p className="text-sm mb-4">{confirmAction.label}</p>
            <div className="modal-action">
              <button onClick={() => setConfirmAction(null)} className="btn btn-ghost btn-sm">Cancelar</button>
              <button onClick={() => { confirmAction.onConfirm(); setConfirmAction(null) }} className="btn btn-error btn-sm">Confirmar</button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setConfirmAction(null)} />
        </div>
      )}
    </div>
  )
}
