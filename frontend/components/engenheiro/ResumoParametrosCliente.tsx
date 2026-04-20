'use client'

import { useState } from 'react'
import { MdExpandMore, MdExpandLess } from 'react-icons/md'
import { formatCurrency } from '@/lib/formatters'
import { PLANTAS_PADRAO } from '@/lib/mockData'
import type { ParametrosCliente } from '@/types'

interface Props {
  parametros: ParametrosCliente
  nomeCliente?: string
}

export default function ResumoParametrosCliente({ parametros, nomeCliente }: Props) {
  const [aberto, setAberto] = useState(false)
  const planta = PLANTAS_PADRAO.find(p => p.id === parametros.plantaId)
  const opcionaisSelecionados = parametros.opcionais.filter(o => o.selecionado)

  return (
    <div className="card bg-base-100 border border-base-300 shadow-sm">
      <button
        className="flex items-center justify-between w-full px-4 py-2.5 text-left"
        onClick={() => setAberto(v => !v)}
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-base-content">
            {nomeCliente ? `Parâmetros — ${nomeCliente}` : 'Parâmetros do Cliente'}
          </span>
          <span className="badge badge-sm badge-ghost">{parametros.modalidadeFinanciamento}</span>
        </div>
        {aberto ? <MdExpandLess size={18} className="text-base-content/50 flex-shrink-0" /> : <MdExpandMore size={18} className="text-base-content/50 flex-shrink-0" />}
      </button>

      {aberto && (
        <div className="px-4 pb-4">
          <div className="divider my-0 mb-3" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 text-sm">
            <div>
              <p className="text-xs text-base-content/50 font-medium mb-1">Planta</p>
              <p className="font-semibold">{planta ? planta.nome : parametros.plantaId}</p>
              <p className="text-xs text-base-content/50">{planta ? `${planta.areaConstruidaM2} m²` : '-'}</p>
            </div>
            <div>
              <p className="text-xs text-base-content/50 font-medium mb-1">Quartos</p>
              <p className="font-semibold">{parametros.quartos} quarto(s)</p>
            </div>
            <div>
              <p className="text-xs text-base-content/50 font-medium mb-1">Terreno</p>
              <p className="font-semibold">{parametros.terreno.municipio}</p>
              <p className="text-xs text-base-content/50">{parametros.terreno.areaTotalM2} m² · {parametros.terreno.topografia}</p>
              <p className="text-xs text-base-content/50">{formatCurrency(parametros.terreno.valorAvaliacao)}</p>
            </div>
            <div>
              <p className="text-xs text-base-content/50 font-medium mb-1">Financiamento</p>
              <p className="font-semibold">{parametros.modalidadeFinanciamento}</p>
              <p className="text-xs text-base-content/50">{parametros.terreno.situacao.replace(/_/g, ' ')}</p>
            </div>
            <div>
              <p className="text-xs text-base-content/50 font-medium mb-1">Opcionais</p>
              {opcionaisSelecionados.length === 0 ? (
                <p className="text-xs text-base-content/40">Nenhum</p>
              ) : (
                <ul className="space-y-0.5">
                  {opcionaisSelecionados.map(op => (
                    <li key={op.id} className="text-xs font-medium">{op.nome}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          {parametros.personalizacoes.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-base-content/50 font-medium mb-1">Personalizações</p>
              <div className="flex flex-wrap gap-1">
                {parametros.personalizacoes.map(p => (
                  <span key={p.id} className="badge badge-sm badge-ghost">{p.descricao}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
