'use client'

import { useState, useEffect } from 'react'
import { MdClose, MdEdit, MdWarning, MdSave } from 'react-icons/md'
import { UF_LIST, OPCIONAIS_PADRAO } from '@/lib/mockData'
import { formatCurrency } from '@/lib/formatters'
import type { CartData, CartEditResult } from './CarrinhoFlutuante'
import type { ModalidadeFinanciamento, Terreno, PlantaPadrao, OpcionalItem, Personalizacao, TopografiaTerreno, SituacaoTerreno } from '@/types'

interface Props {
  open: boolean
  data: CartData
  plantas: PlantaPadrao[]
  onClose: () => void
  onSave: (result: CartEditResult) => void
  initialStepKey?: string
}

const TOPO_LABELS: Record<TopografiaTerreno, string> = { PLANO: 'Plano', ACLIVE: 'Aclive', DECLIVE: 'Declive' }
const SIT_LABELS: Record<SituacaoTerreno, string> = { PROPRIO_QUITADO: 'Próprio quitado', FINANCIADO_EM_CURSO: 'Financiado', A_ADQUIRIR: 'A adquirir' }

function stepValue(d: CartData, key: string): string {
  switch (key) {
    case 'modalidade': return d.modalidade ?? ''
    case 'terreno': return d.terreno ? `${d.terreno.municipio}, ${d.terreno.frenteMetros}x${d.terreno.fundoMetros}m` : ''
    case 'quartos': return d.quartos ? `${d.quartos} quarto${d.quartos > 1 ? 's' : ''}` : ''
    case 'planta': return d.planta ? `${d.planta.nome} (${d.planta.areaConstruidaM2} m²)` : ''
    case 'opcionais': { const n = d.opcionais?.filter(o => o.selecionado).length ?? 0; return n > 0 ? `${n} selecionado${n > 1 ? 's' : ''}` : 'Nenhum' }
    case 'personalizacoes': { const n = d.personalizacoes?.length ?? 0; return n > 0 ? `${n} adicionada${n > 1 ? 's' : ''}` : 'Nenhuma' }
    default: return ''
  }
}

export default function OrcamentoEditModal({ open, data, plantas, onClose, onSave, initialStepKey }: Props) {
  const focused = !!initialStepKey
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmMsg, setConfirmMsg] = useState('')
  const [pendingResult, setPendingResult] = useState<CartEditResult | null>(null)

  const [eModal, setEModal] = useState<ModalidadeFinanciamento>('MCMV')
  const [eUf, setEUf] = useState('')
  const [eMunicipios, setEMunicipios] = useState<string[]>([])
  const [eMunicipio, setEMunicipio] = useState('')
  const [eSit, setESit] = useState<SituacaoTerreno>('PROPRIO_QUITADO')
  const [eFrente, setEFrente] = useState(0)
  const [eFundo, setEFundo] = useState(0)
  const [eTopo, setETopo] = useState<TopografiaTerreno>('PLANO')
  const [eValor, setEValor] = useState(0)
  const [eQuartos, setEQuartos] = useState(0)
  const [ePlantaId, setEPlantaId] = useState('')
  const [eOpc, setEOpc] = useState<OpcionalItem[]>([])
  const [ePers, setEPers] = useState<Personalizacao[]>([])
  const [novaPers, setNovaPers] = useState('')

  useEffect(() => {
    if (!eUf) { setEMunicipios([]); return }
    fetch(`/api/localidades/municipios/${eUf}`)
      .then(r => r.json())
      .then(d => setEMunicipios(d.municipios ?? []))
      .catch(() => setEMunicipios([]))
  }, [eUf])

  useEffect(() => {
    if (open && initialStepKey) openEditModal(initialStepKey)
  }, [open, initialStepKey])

  if (!open) return null

  function closeStepEditor() {
    if (focused) { onClose() } else { setEditingKey(null) }
  }

  function openEditModal(key: string) {
    setEditingKey(key)
    if (key === 'modalidade') setEModal(data.modalidade ?? 'MCMV')
    if (key === 'terreno') {
      setEUf(data.uf ?? '')
      setEMunicipio(data.terreno?.municipio ?? '')
      setESit(data.terreno?.situacao ?? 'PROPRIO_QUITADO')
      setEFrente(data.terreno?.frenteMetros ?? 0)
      setEFundo(data.terreno?.fundoMetros ?? 0)
      setETopo(data.terreno?.topografia ?? 'PLANO')
      setEValor(data.terreno?.valorAvaliacao ?? 0)
    }
    if (key === 'quartos') setEQuartos(data.quartos ?? 2)
    if (key === 'planta') setEPlantaId(data.planta?.id ?? '')
    if (key === 'opcionais') setEOpc(data.opcionais ? data.opcionais.map(o => ({ ...o })) : OPCIONAIS_PADRAO.map(o => ({ ...o, selecionado: false })))
    if (key === 'personalizacoes') { setEPers(data.personalizacoes ? data.personalizacoes.map(p => ({ ...p })) : []); setNovaPers('') }
  }

  function buildEditResult(): CartEditResult {
    if (editingKey === 'modalidade') return { ...data, modalidade: eModal }
    if (editingKey === 'terreno') {
      const newTerreno: Terreno = { municipio: eMunicipio, bairro: data.terreno?.bairro ?? '', endereco: data.terreno?.endereco ?? '', frenteMetros: eFrente, fundoMetros: eFundo, areaTotalM2: eFrente * eFundo, topografia: eTopo, situacao: eSit, valorAvaliacao: eValor }
      return { ...data, terreno: newTerreno, uf: eUf }
    }
    if (editingKey === 'quartos') return { ...data, quartos: eQuartos }
    if (editingKey === 'planta') return { ...data, planta: plantas.find(p => p.id === ePlantaId) }
    if (editingKey === 'opcionais') return { ...data, opcionais: eOpc }
    if (editingKey === 'personalizacoes') return { ...data, personalizacoes: ePers }
    return data
  }

  function checkIncompatibility(result: CartEditResult): { incompatible: boolean; msg: string; resetPhase: string } {
    const t = result.terreno ?? data.terreno
    const q = result.quartos ?? data.quartos
    const p = data.planta

    if (!p || !t) return { incompatible: false, msg: '', resetPhase: '' }

    const area = t.frenteMetros * t.fundoMetros
    const areaFail = area < p.compatibilidadeTerreno.areaMinima || t.frenteMetros < p.compatibilidadeTerreno.frenteMinima
    const quartosFail = q !== undefined && q !== p.quartos

    if (areaFail || quartosFail) {
      const reasons: string[] = []
      if (areaFail) reasons.push('as dimensões do terreno não comportam a planta atual')
      if (quartosFail) reasons.push('o número de quartos não corresponde à planta selecionada')
      return {
        incompatible: true,
        msg: `A planta "${p.nome}" será removida porque ${reasons.join(' e ')}. Você voltará para a conversa para escolher uma nova planta, e os opcionais e personalizações serão redefinidos. Deseja continuar?`,
        resetPhase: 'PLANTA',
      }
    }
    return { incompatible: false, msg: '', resetPhase: '' }
  }

  function handleSave() {
    const result = buildEditResult()
    const check = checkIncompatibility(result)

    if (check.incompatible) {
      setConfirmMsg(check.msg)
      setPendingResult({
        ...result,
        planta: undefined,
        opcionais: undefined,
        personalizacoes: undefined,
        invalidated: true,
        resetToPhase: check.resetPhase,
      })
      setShowConfirm(true)
      return
    }

    onSave(result)
    if (focused) { onClose() } else { setEditingKey(null) }
  }

  function confirmAndApply() {
    if (pendingResult) {
      onSave(pendingResult)
      setPendingResult(null)
      setShowConfirm(false)
      if (focused) { onClose() } else { setEditingKey(null) }
    }
  }

  const compatPlantas = plantas.filter(p => {
    const q = editingKey === 'quartos' ? eQuartos : data.quartos
    if (q && p.quartos !== q) return false
    const t = data.terreno
    if (t) {
      const a = t.frenteMetros * t.fundoMetros
      if (a < p.compatibilidadeTerreno.areaMinima || t.frenteMetros < p.compatibilidadeTerreno.frenteMinima) return false
    }
    return true
  })

  const steps = [
    { key: 'modalidade', label: 'Financiamento', show: !!data.modalidade },
    { key: 'terreno', label: 'Terreno', show: !!data.terreno },
    { key: 'quartos', label: 'Quartos', show: data.quartos !== undefined && data.quartos > 0 },
    { key: 'planta', label: 'Planta', show: !!data.planta },
    { key: 'opcionais', label: 'Opcionais', show: !!data.opcionais },
    { key: 'personalizacoes', label: 'Personalizações', show: !!data.personalizacoes },
  ]

  return (
    <>
      {!focused && (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
        <div className="card bg-base-100 shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="card-body p-5 gap-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm tracking-wide uppercase text-base-content">Editar Orçamento</h3>
              <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle"><MdClose size={18} /></button>
            </div>

            <div className="flex flex-col gap-2">
              {steps.filter(s => s.show).map(step => (
                <div key={step.key} className="flex items-center justify-between bg-base-200 rounded-lg px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-base-content/50">{step.label}</p>
                    <p className="text-sm font-semibold truncate">{stepValue(data, step.key)}</p>
                  </div>
                  <button onClick={() => openEditModal(step.key)} className="btn btn-ghost btn-xs"><MdEdit size={14} /></button>
                </div>
              ))}
            </div>

            {data.faixaAtual && (
              <>
                <div className="divider my-0" />
                <div className="text-center py-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-base-content/50">Faixa Estimada</p>
                  <div className="flex items-baseline justify-center gap-2 mt-1">
                    <span className="text-lg font-bold text-success">{formatCurrency(data.faixaAtual.minimo)}</span>
                    <span className="text-xs text-base-content/40">a</span>
                    <span className="text-lg font-bold text-error">{formatCurrency(data.faixaAtual.maximo)}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      )}

      {editingKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={closeStepEditor}>
          <div className="card bg-base-100 shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="card-body p-5 gap-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">Editar: {steps.find(s => s.key === editingKey)?.label}</h3>
                <button onClick={closeStepEditor} className="btn btn-ghost btn-sm btn-circle"><MdClose size={18} /></button>
              </div>

              {editingKey === 'modalidade' && (
                <div className="flex flex-col gap-2">
                  {(['MCMV', 'SBPE'] as ModalidadeFinanciamento[]).map(m => (
                    <button key={m} onClick={() => setEModal(m)} className={`btn ${eModal === m ? 'btn-primary' : 'btn-outline'} justify-start`}>
                      {m === 'MCMV' ? 'MCMV — Minha Casa Minha Vida' : 'SBPE — Poupança e Empréstimo'}
                    </button>
                  ))}
                </div>
              )}

              {editingKey === 'terreno' && (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <fieldset className="fieldset">
                      <legend className="fieldset-legend">Estado (UF)</legend>
                      <select className="select select-sm w-full" value={eUf} onChange={e => { setEUf(e.target.value); setEMunicipio('') }}>
                        <option value="">Selecione...</option>
                        {UF_LIST.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </fieldset>
                    <fieldset className="fieldset">
                      <legend className="fieldset-legend">Município</legend>
                      <select className="select select-sm w-full" value={eMunicipio} onChange={e => setEMunicipio(e.target.value)} disabled={!eMunicipios.length}>
                        <option value="">{eMunicipios.length ? 'Selecione...' : 'Selecione UF'}</option>
                        {eMunicipios.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </fieldset>
                  </div>
                  <div>
                    <p className="text-xs text-base-content/50 mb-1">Situação:</p>
                    <div className="flex flex-wrap gap-1">
                      {(Object.keys(SIT_LABELS) as SituacaoTerreno[]).map(k => (
                        <button key={k} onClick={() => setESit(k)} className={`btn btn-xs ${eSit === k ? 'btn-primary' : 'btn-outline'}`}>{SIT_LABELS[k]}</button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <fieldset className="fieldset">
                      <legend className="fieldset-legend">Frente (m)</legend>
                      <input type="number" className="input input-sm w-full" value={eFrente || ''} onChange={e => setEFrente(Number(e.target.value))} />
                    </fieldset>
                    <fieldset className="fieldset">
                      <legend className="fieldset-legend">Fundo (m)</legend>
                      <input type="number" className="input input-sm w-full" value={eFundo || ''} onChange={e => setEFundo(Number(e.target.value))} />
                    </fieldset>
                  </div>
                  {eFrente > 0 && eFundo > 0 && <p className="text-xs text-base-content/50 text-center">Área: {eFrente * eFundo} m²</p>}
                  <div>
                    <p className="text-xs text-base-content/50 mb-1">Topografia:</p>
                    <div className="flex flex-wrap gap-1">
                      {(Object.keys(TOPO_LABELS) as TopografiaTerreno[]).map(k => (
                        <button key={k} onClick={() => setETopo(k)} className={`btn btn-xs ${eTopo === k ? 'btn-primary' : 'btn-outline'}`}>{TOPO_LABELS[k]}</button>
                      ))}
                    </div>
                  </div>
                  <fieldset className="fieldset">
                    <legend className="fieldset-legend">Valor de avaliação (R$)</legend>
                    <input type="number" className="input input-sm w-full" value={eValor || ''} onChange={e => setEValor(Number(e.target.value))} />
                  </fieldset>
                </div>
              )}

              {editingKey === 'quartos' && (
                <div className="flex gap-3 justify-center">
                  {[1, 2, 3, 4].map(q => (
                    <button key={q} onClick={() => setEQuartos(q)} className={`btn btn-lg btn-circle ${eQuartos === q ? 'btn-primary' : 'btn-outline'}`}>{q}</button>
                  ))}
                </div>
              )}

              {editingKey === 'planta' && (
                <div className="flex flex-col gap-2">
                  {compatPlantas.length === 0 && <p className="text-sm text-warning text-center py-4">Nenhuma planta compatível com o terreno e quartos atuais.</p>}
                  {compatPlantas.map(p => (
                    <button key={p.id} onClick={() => setEPlantaId(p.id)} className={`btn ${ePlantaId === p.id ? 'btn-primary' : 'btn-outline'} justify-start h-auto py-2 flex-col items-start gap-0`}>
                      <span className="font-bold text-sm">{p.nome}</span>
                      <span className="text-xs opacity-60">{p.areaConstruidaM2} m² · {p.tempoObraMeses} meses</span>
                    </button>
                  ))}
                </div>
              )}

              {editingKey === 'opcionais' && (
                <div className="flex flex-col gap-2">
                  {eOpc.map((op, i) => (
                    <label key={op.id} className="flex items-center gap-3 p-2 bg-base-200 rounded-lg cursor-pointer">
                      <input type="checkbox" className="toggle toggle-sm toggle-primary" checked={op.selecionado} onChange={e => { const n = [...eOpc]; n[i] = { ...n[i], selecionado: e.target.checked }; setEOpc(n) }} />
                      <span className="text-sm">{op.nome}</span>
                    </label>
                  ))}
                </div>
              )}

              {editingKey === 'personalizacoes' && (
                <div className="flex flex-col gap-2">
                  {ePers.map((p, i) => (
                    <div key={p.id} className="flex items-center gap-2 bg-base-200 rounded-lg px-3 py-2">
                      <span className="text-sm flex-1">{p.descricao}</span>
                      <button className="btn btn-ghost btn-xs text-error" onClick={() => setEPers(ePers.filter((_, idx) => idx !== i))}><MdClose size={14} /></button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <input type="text" className="input input-sm flex-1" placeholder="Nova personalização..." value={novaPers} onChange={e => setNovaPers(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && novaPers.trim()) { setEPers([...ePers, { id: `pers-${Date.now()}`, descricao: novaPers.trim(), impacto: '', custoEstimadoAdicional: 0 }]); setNovaPers('') } }} />
                    <button className="btn btn-sm btn-primary" disabled={!novaPers.trim()} onClick={() => { if (novaPers.trim()) { setEPers([...ePers, { id: `pers-${Date.now()}`, descricao: novaPers.trim(), impacto: '', custoEstimadoAdicional: 0 }]); setNovaPers('') } }}>Adicionar</button>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 mt-2">
                <button className="btn btn-ghost btn-sm" onClick={closeStepEditor}>Cancelar</button>
                <button className="btn btn-primary btn-sm gap-1" onClick={handleSave}><MdSave size={16} /> Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
          <div className="card bg-base-100 shadow-2xl w-96">
            <div className="card-body p-5 gap-4">
              <div className="flex items-start gap-3">
                <MdWarning size={28} className="text-warning flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm mb-2">Alteração incompatível</p>
                  <p className="text-sm text-base-content/70">{confirmMsg}</p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button className="btn btn-sm btn-ghost" onClick={() => { setPendingResult(null); setShowConfirm(false) }}>Cancelar</button>
                <button className="btn btn-sm btn-warning" onClick={confirmAndApply}>Continuar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
