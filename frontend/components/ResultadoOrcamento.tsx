'use client'

import { MdSave, MdArrowBack, MdApartment } from 'react-icons/md'
import { formatCurrency } from '@/lib/formatters'
import ItemResultadoCard from './ItemResultadoCard'
import type { Orcamento } from '@/types'

interface Props {
  orcamento: Orcamento
  onSave?: () => void
  onBack: () => void
  isSaved?: boolean
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-secondary last:border-0">
      <span className="text-base-content/50 text-sm">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  )
}

export default function ResultadoOrcamento({ orcamento, onSave, onBack, isSaved }: Props) {
  const t = orcamento.totais

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="btn btn-ghost btn-sm btn-circle">
          <MdArrowBack size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold">Resultado do Orçamento</h1>
          <p className="text-sm text-base-content/50">UF: {orcamento.uf} · {orcamento.itens.length} serviço(s)</p>
        </div>
      </div>

      {t && (
        <div className="card bg-primary/10 border border-primary/30 mb-6">
          <div className="card-body p-4">
            <div className="flex items-center gap-2 mb-3">
              <MdApartment size={16} className="text-primary" />
              <span className="text-primary text-xs font-semibold uppercase tracking-wide">Totais Gerais</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
              <div>
                <StatRow label="MO Total — MEI" value={formatCurrency(t.custoMOTotalMEI)} />
                <StatRow label="MO Total — CLT" value={formatCurrency(t.custoMOTotalCLT)} />
                <StatRow label="Custo Total Materiais" value={formatCurrency(t.custoMatTotal)} />
              </div>
              <div>
                <StatRow label="Custos Diretos — MEI" value={formatCurrency(t.custosDiretosMEI)} />
                <StatRow label="Custos Diretos — CLT" value={formatCurrency(t.custosDiretosCLT)} />
                <StatRow label="Área Total" value={`${t.areaTotal.toLocaleString('pt-BR')} un`} />
              </div>
            </div>
            <div className="divider my-2" />
            <div className="grid grid-cols-2 gap-3">
              <div className="card bg-success/10 border border-success/30 p-3">
                <p className="text-xs text-success font-semibold uppercase mb-1">MEI — Preço Final</p>
                <p className="text-2xl font-bold">{formatCurrency(t.precoFinalMEI)}</p>
                <p className="text-xs text-base-content/40">{formatCurrency(t.precoPorM2MEI)}/un · BDI 20%</p>
              </div>
              <div className="card bg-info/10 border border-info/30 p-3">
                <p className="text-xs text-info font-semibold uppercase mb-1">CLT — Preço Final</p>
                <p className="text-2xl font-bold">{formatCurrency(t.precoFinalCLT)}</p>
                <p className="text-xs text-base-content/40">{formatCurrency(t.precoPorM2CLT)}/un · BDI 20%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-sm font-semibold uppercase text-base-content/40 mb-3">Por Serviço</h2>
        {orcamento.itens.map(item => item.resultado ? (
          <ItemResultadoCard key={item.id} item={item} />
        ) : null)}
      </div>

      {!isSaved && onSave && (
        <button onClick={onSave} className="btn btn-primary w-full">
          <MdSave size={18} /> Salvar Orçamento
        </button>
      )}
    </div>
  )
}
