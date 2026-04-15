'use client'

import { useState } from 'react'
import { MdAdd, MdOpenInNew, MdDelete } from 'react-icons/md'
import { formatDate, formatCurrency } from '@/lib/formatters'
import { SERVICE_LABELS } from '@/lib/mockData'
import type { Orcamento } from '@/types'

interface Props {
  orcamentos: Orcamento[]
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onNovo: () => void
}

export default function HistoricoOrcamentos({ orcamentos, onSelect, onDelete, onNovo }: Props) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Meus Orçamentos</h1>
        <button onClick={onNovo} className="btn btn-primary btn-sm">
          <MdAdd size={18} /> Novo
        </button>
      </div>

      {!orcamentos.length && (
        <div className="card bg-base-100 border border-secondary p-8 text-center">
          <p className="text-base-content/50">Nenhum orçamento salvo ainda.</p>
          <button onClick={onNovo} className="btn btn-primary btn-sm mt-4">Criar Orçamento</button>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {orcamentos.map(orc => (
          <div key={orc.id} className="card bg-base-100 border border-secondary">
            <div className="card-body p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">UF: {orc.uf}</span>
                    <span className={`badge badge-sm ${orc.status === 'calculado' ? 'badge-success' : orc.status === 'enviado' ? 'badge-info' : 'badge-ghost'}`}>
                      {orc.status}
                    </span>
                  </div>
                  <p className="text-xs text-base-content/40 mt-1">
                    {formatDate(orc.dataCriacao)} · {orc.itens.length} serviço(s)
                  </p>
                  <p className="text-xs text-base-content/40">
                    {orc.itens.slice(0, 3).map(i => SERVICE_LABELS[i.serviceType]).join(', ')}
                    {orc.itens.length > 3 ? '...' : ''}
                  </p>
                  {orc.totais && (
                    <p className="text-sm font-semibold text-success mt-1">
                      MEI: {formatCurrency(orc.totais.precoFinalMEI)} · CLT: {formatCurrency(orc.totais.precoFinalCLT)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => onSelect(orc.id)} className="btn btn-ghost btn-sm btn-circle" title="Abrir">
                    <MdOpenInNew size={18} />
                  </button>
                  {confirmDelete === orc.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => { onDelete(orc.id); setConfirmDelete(null) }} className="btn btn-error btn-xs">Confirmar</button>
                      <button onClick={() => setConfirmDelete(null)} className="btn btn-ghost btn-xs">Cancelar</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDelete(orc.id)} className="btn btn-ghost btn-sm btn-circle text-error" title="Excluir">
                      <MdDelete size={18} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
