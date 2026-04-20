'use client'

import { MdCheckCircle, MdRadioButtonUnchecked, MdLock, MdWarning } from 'react-icons/md'

type Etapa = 'E2' | 'E3' | 'E4' | 'E5' | 'E6'

interface Props {
  etapaAtual: 'E1' | 'E2' | 'E3' | 'E4' | 'E5' | 'E6' | 'ENTREGUE'
  etapasConcluidas: Array<'E1' | 'E2' | 'E3' | 'E4' | 'E5' | 'E6'>
  onClickEtapa: (e: Etapa) => void
  parametrosCompletos: boolean
}

const ETAPAS: { id: Etapa; label: string; sub: string }[] = [
  { id: 'E2', label: 'E2', sub: 'Quantitativos' },
  { id: 'E3', label: 'E3', sub: 'SINAPI' },
  { id: 'E4', label: 'E4', sub: 'Cálculo MO' },
  { id: 'E5', label: 'E5', sub: 'Materiais' },
  { id: 'E6', label: 'E6', sub: 'Precificação' },
]

const PREREQ: Record<Etapa, Etapa | null> = {
  E2: null,
  E3: 'E2',
  E4: 'E3',
  E5: 'E4',
  E6: 'E5',
}

export default function StepperEtapas({ etapaAtual, etapasConcluidas, onClickEtapa, parametrosCompletos }: Props) {
  function getEstado(etapa: Etapa): 'concluida' | 'ativa' | 'pendente' | 'bloqueada' {
    if (!parametrosCompletos) return 'bloqueada'
    if (etapasConcluidas.includes(etapa)) return 'concluida'
    if (etapaAtual === etapa) return 'ativa'
    const prereq = PREREQ[etapa]
    if (prereq && !etapasConcluidas.includes(prereq)) return 'bloqueada'
    return 'pendente'
  }

  return (
    <div className="w-full">
      {!parametrosCompletos && (
        <div className="alert alert-warning mb-3 text-sm flex items-center gap-2 py-2">
          <MdWarning size={18} />
          <span>Parâmetros Globais incompletos. Complete-os em Gestão antes de prosseguir.</span>
        </div>
      )}
      <div className="flex items-center w-full">
        {ETAPAS.map((etapa, idx) => {
          const estado = getEstado(etapa.id)
          const isActive = estado === 'ativa'
          const isDone = estado === 'concluida'
          const isLocked = estado === 'bloqueada'

          return (
            <div key={etapa.id} className="flex items-center flex-1 min-w-0">
              <button
                onClick={() => !isLocked && onClickEtapa(etapa.id)}
                disabled={isLocked}
                className={`flex flex-col items-center gap-1 px-2 py-1 rounded transition-all min-w-0 ${
                  isActive ? 'text-primary' : isDone ? 'text-success' : isLocked ? 'text-base-content/20 cursor-not-allowed' : 'text-base-content/50 hover:text-base-content'
                }`}
              >
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all ${
                  isActive ? 'border-primary bg-primary/10 animate-pulse' : isDone ? 'border-success bg-success/10' : isLocked ? 'border-base-content/10 bg-base-200' : 'border-base-content/30 bg-base-200'
                }`}>
                  {isDone ? <MdCheckCircle size={18} className="text-success" /> : isLocked ? <MdLock size={14} /> : <span className="text-xs font-bold">{etapa.label}</span>}
                </div>
                <span className="text-xs font-medium truncate">{etapa.sub}</span>
              </button>
              {idx < ETAPAS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 ${isDone ? 'bg-success' : 'bg-base-content/10'}`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
