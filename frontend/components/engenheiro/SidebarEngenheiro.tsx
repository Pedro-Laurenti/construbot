'use client'

import { useState, useRef, useEffect } from 'react'
import { MdDashboard, MdSettings, MdTableChart, MdSearch, MdAccountTree, MdPeople, MdCalculate, MdEngineering, MdFolderOpen, MdLogout, MdMoreVert, MdApartment, MdHomeWork } from 'react-icons/md'

export type EngineerModule = 'painel' | 'parametros' | 'consulta' | 'calculadora-mo' | 'calculadora-mat' | 'sinapi' | 'composicoes-analiticas' | 'composicoes-profissionais' | 'orcamentos' | 'gestao-plantas'

interface NavSection {
  title: string
  items: { id: EngineerModule; label: string; sub: string; icon: React.ReactNode }[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'TRABALHAR EM ORÇAMENTO',
    items: [
      { id: 'orcamentos', label: 'Orçamentos Clientes', sub: 'Iniciar, continuar, entregar', icon: <MdFolderOpen size={20} /> },
    ],
  },
  {
    title: 'FERRAMENTAS DE CONSULTA',
    items: [
      { id: 'sinapi', label: 'SINAPI — Insumos (ISE)', sub: 'Tabela de preços por UF', icon: <MdTableChart size={20} /> },
      { id: 'composicoes-analiticas', label: 'Composições Analíticas', sub: 'Hierarquia 3 níveis', icon: <MdAccountTree size={20} /> },
      { id: 'composicoes-profissionais', label: 'Composições Profissionais', sub: 'Produtividade', icon: <MdPeople size={20} /> },
      { id: 'gestao-plantas', label: 'Plantas Arquitetônicas', sub: 'Gerenciar plantas', icon: <MdHomeWork size={20} /> },
      { id: 'consulta', label: 'Consulta de Composição', sub: 'SINAPI com custo avulso', icon: <MdSearch size={20} /> },
      { id: 'calculadora-mo', label: 'Calculadora MO', sub: 'Cálculo avulso', icon: <MdCalculate size={20} /> },
      { id: 'calculadora-mat', label: 'Calculadora Materiais', sub: 'Cálculo avulso', icon: <MdEngineering size={20} /> },
    ],
  },
  {
    title: 'GESTÃO',
    items: [
      { id: 'painel', label: 'Painel Geral', sub: 'Dashboard', icon: <MdDashboard size={20} /> },
      { id: 'parametros', label: 'Parâmetros Globais', sub: 'BDI, encargos e INCC', icon: <MdSettings size={20} /> },
    ],
  },
]

interface SidebarEngenheiroProps {
  activeModule: EngineerModule
  onNavigate: (m: EngineerModule) => void
  onLogout: () => void
}

export default function SidebarEngenheiro({ activeModule, onNavigate, onLogout }: SidebarEngenheiroProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    if (menuOpen) document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [menuOpen])

  return (
    <aside className="w-[280px] min-w-[280px] flex flex-col h-full border-r border-secondary bg-base-100 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-base-300 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="avatar placeholder flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-secondary text-secondary-content flex items-center justify-center font-semibold text-sm select-none">
              <MdApartment size={20} />
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-base-content text-sm font-semibold truncate">ConstruBot Admin</p>
            <p className="text-base-content/50 text-xs">Engenheiro</p>
          </div>
        </div>
        <div className="relative" ref={menuRef}>
          <button onClick={() => setMenuOpen(v => !v)} className="btn btn-ghost btn-sm btn-circle">
            <MdMoreVert size={20} />
          </button>
          {menuOpen && (
            <ul className="menu absolute top-full right-0 mt-1 w-44 bg-base-300 rounded-box shadow-xl z-50 border border-secondary p-1">
              <li>
                <button onClick={() => { setMenuOpen(false); onLogout() }} className="flex items-center gap-2 text-sm text-error">
                  <MdLogout size={16} /> Sair da área admin
                </button>
              </li>
            </ul>
          )}
        </div>
      </div>

      <div className="divider my-0 h-px" />

      <nav className="flex-1 overflow-y-auto py-1">
        {NAV_SECTIONS.map(section => (
          <div key={section.title}>
            <p className="text-xs font-bold text-base-content/30 uppercase tracking-wider px-4 pt-4 pb-1">{section.title}</p>
            {section.items.map(item => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex items-center gap-3 px-3 py-2.5 w-full text-left transition-colors ${activeModule === item.id ? 'bg-secondary text-secondary-content' : 'hover:bg-base-200'}`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${activeModule === item.id ? 'bg-secondary-content/20' : 'bg-base-300'}`}>
                  {item.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{item.label}</p>
                  <p className="text-xs opacity-50 truncate">{item.sub}</p>
                </div>
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="divider my-0 h-px" />
      <button onClick={onLogout} className="flex items-center gap-3 px-4 py-3 w-full text-left hover:bg-base-200 transition-colors text-error flex-shrink-0">
        <MdLogout size={20} />
        <span className="text-sm">Sair</span>
      </button>
    </aside>
  )
}

export type { EngineerModule }
