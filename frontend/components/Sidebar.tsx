'use client'

import { useState, useRef, useEffect } from 'react'
import { MdAdd, MdMoreVert, MdLogout, MdHistory } from 'react-icons/md'
import type { Orcamento, OrcamentoStatus } from '@/types'

interface SidebarProps {
  orcamentos: Orcamento[]
  selectedId: string | null
  onSelect: (id: string) => void
  onLogout: () => void
  userName: string
}

const STATUS_BADGE: Record<OrcamentoStatus, { className: string; label: string }> = {
  aguardando_engenheiro: { className: 'badge-warning', label: 'Aguardando' },
  em_calculo: { className: 'badge-info', label: 'Em análise' },
  entregue: { className: 'badge-success', label: 'Pronto' },
  calculado: { className: 'badge-success', label: 'Calculado' },
  rascunho: { className: 'badge-ghost', label: 'Rascunho' },
  enviado: { className: 'badge-info', label: 'Enviado' },
}

export default function Sidebar({ orcamentos, selectedId, onSelect, onLogout, userName }: SidebarProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const initials = userName.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    if (menuOpen) document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [menuOpen])

  return (
    <aside className="w-[360px] min-w-[360px] flex flex-col h-full border-r border-secondary bg-base-100">
      <div className="flex items-center justify-between px-4 py-2.5 bg-base-300 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="avatar placeholder flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-primary text-primary-content flex items-center justify-center font-semibold text-sm select-none">
              {initials || 'U'}
            </div>
          </div>
          <span className="text-base-content text-sm font-medium truncate">{userName}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onSelect('novo')} className="btn btn-ghost btn-sm btn-circle" title="Nova cotação">
            <MdAdd size={20} />
          </button>
          <div className="relative" ref={menuRef}>
            <button onClick={() => setMenuOpen(v => !v)} className="btn btn-ghost btn-sm btn-circle">
              <MdMoreVert size={20} />
            </button>
            {menuOpen && (
              <ul className="menu absolute top-full right-0 mt-1 w-44 bg-base-300 rounded-box shadow-xl z-50 border border-secondary p-1">
                <li>
                  <button onClick={() => { setMenuOpen(false); onLogout() }} className="flex items-center gap-2 text-sm">
                    <MdLogout size={16} className="text-base-content/50" />
                    Sair da conta
                  </button>
                </li>
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="divider my-0 h-px" />

      <button
        onClick={() => onSelect('novo')}
        className={`flex items-center gap-3 px-3 py-3 w-full text-left transition-colors flex-shrink-0 ${selectedId === 'novo' ? 'bg-secondary' : 'hover:bg-base-200'}`}
      >
        <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
          <MdAdd size={24} className="text-primary-content" />
        </div>
        <div>
          <p className="text-base-content font-medium text-sm">Nova Consulta</p>
          <p className="text-base-content/40 text-xs">Iniciar novo projeto</p>
        </div>
      </button>

      <div className="divider my-0 h-px" />

      <button
        onClick={() => onSelect('historico')}
        disabled={orcamentos.length === 0}
        className={`flex items-center gap-3 px-3 py-3 w-full text-left transition-colors flex-shrink-0 ${selectedId === 'historico' || (selectedId && selectedId !== 'novo' && selectedId !== 'historico') ? 'bg-secondary' : 'hover:bg-base-200'} disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        <div className="w-12 h-12 rounded-full bg-warning flex items-center justify-center flex-shrink-0">
          <MdHistory size={22} className="text-warning-content" />
        </div>
        <div className="flex-1">
          <p className="text-base-content font-medium text-sm">Meus Orçamentos</p>
          <p className="text-base-content/40 text-xs">
            {orcamentos.length === 0 ? 'Nenhum salvo ainda' : `${orcamentos.length} orçamento(s) salvo(s)`}
          </p>
        </div>
        {orcamentos.length > 0 && (
          <span className="badge badge-warning badge-sm flex-shrink-0">{orcamentos.length}</span>
        )}
      </button>

      {orcamentos.length > 0 && (
        <div className="flex-1 overflow-y-auto">
          {orcamentos.map(orc => (
            <button
              key={orc.id}
              onClick={() => onSelect(orc.id)}
              className={`flex items-center justify-between px-4 py-2.5 w-full text-left transition-colors ${selectedId === orc.id ? 'bg-secondary' : 'hover:bg-base-200'}`}
            >
              <div className="min-w-0">
                <p className="text-base-content text-sm font-medium truncate">{orc.nome || `Orçamento — ${orc.uf}`}</p>
                <p className="text-base-content/40 text-xs">{orc.dataCriacao}</p>
              </div>
              <span className={`badge badge-sm flex-shrink-0 ${STATUS_BADGE[orc.status].className}`}>
                {STATUS_BADGE[orc.status].label}
              </span>
            </button>
          ))}
        </div>
      )}
    </aside>
  )
}

