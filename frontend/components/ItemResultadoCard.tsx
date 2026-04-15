'use client'

import { useState } from 'react'
import { MdExpandMore, MdExpandLess } from 'react-icons/md'
import { SERVICE_LABELS } from '@/lib/mockData'
import { formatCurrency } from '@/lib/formatters'
import type { OrcamentoItem, CenarioEquipe } from '@/types'

interface StatRowProps {
  label: string
  value: string
  color?: string
}

function StatRow({ label, value, color = 'text-base-content' }: StatRowProps) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-secondary last:border-0">
      <span className="text-base-content/50 text-sm">{label}</span>
      <span className={`${color} text-sm font-semibold`}>{value}</span>
    </div>
  )
}

interface CostBarProps {
  label: string
  value: number
  total: number
  className?: string
}

function CostBar({ label, value, total, className = 'progress-primary' }: CostBarProps) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs">
        <span className="text-base-content/50">{label}</span>
        <span className="text-base-content/70 font-medium">{formatCurrency(value)} ({pct}%)</span>
      </div>
      <progress className={`progress h-1.5 w-full ${className}`} value={pct} max={100} />
    </div>
  )
}

function CenarioRow({ label, cenario }: { label: string; cenario: CenarioEquipe }) {
  return (
    <tr>
      <td className="text-xs font-medium">{label}</td>
      <td className="text-xs text-right">{cenario.produtividade.toFixed(2)}</td>
      <td className="text-xs text-right">{cenario.profissionaisNecessarios}</td>
      <td className="text-xs text-right">{cenario.prazoEfetivoDias.toFixed(1)}d</td>
      <td className="text-xs text-right">{formatCurrency(cenario.custoBase)}</td>
      <td className="text-xs text-right text-success">{cenario.bonusCenario > 0 ? formatCurrency(cenario.bonusCenario) : '—'}</td>
    </tr>
  )
}

interface Props {
  item: OrcamentoItem
}

export default function ItemResultadoCard({ item }: Props) {
  const [expanded, setExpanded] = useState(false)
  const r = item.resultado!
  const totalRef = r.precoFinalMEI

  return (
    <div className="card bg-base-100 border border-secondary mb-4">
      <div className="card-body p-4 gap-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold">{SERVICE_LABELS[item.serviceType]}</h3>
            <p className="text-sm text-base-content/50">
              {[item.especificacao1, item.especificacao2, item.especificacao3].filter(Boolean).join(' · ')}
              {' '}· {item.quantidade} {item.unidade}
            </p>
          </div>
          <button onClick={() => setExpanded(v => !v)} className="btn btn-ghost btn-sm btn-circle">
            {expanded ? <MdExpandLess size={20} /> : <MdExpandMore size={20} />}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="card bg-success/10 border border-success/30 p-3">
            <p className="text-xs text-success font-semibold uppercase mb-1">MEI</p>
            <p className="text-xl font-bold">{formatCurrency(r.precoFinalMEI)}</p>
            <p className="text-xs text-base-content/40">Preço final c/ BDI 20%</p>
          </div>
          <div className="card bg-info/10 border border-info/30 p-3">
            <p className="text-xs text-info font-semibold uppercase mb-1">CLT</p>
            <p className="text-xl font-bold">{formatCurrency(r.precoFinalCLT)}</p>
            <p className="text-xs text-base-content/40">Preço final c/ BDI 20%</p>
          </div>
        </div>

        {expanded && (
          <>
            <div className="divider my-0" />

            <div>
              <p className="text-xs font-semibold uppercase text-base-content/40 mb-2">Cenários de Equipe</p>
              <div className="overflow-x-auto">
                <table className="table table-xs">
                  <thead>
                    <tr>
                      <th>Cenário</th>
                      <th className="text-right">UN/h</th>
                      <th className="text-right">Prof.</th>
                      <th className="text-right">Prazo</th>
                      <th className="text-right">Custo Base</th>
                      <th className="text-right">Bônus</th>
                    </tr>
                  </thead>
                  <tbody>
                    <CenarioRow label="Mensalista (80%)" cenario={r.mensalista} />
                    <CenarioRow label="Ótima (125%)" cenario={r.otima} />
                    <CenarioRow label="Prazo (100%)" cenario={r.prazo} />
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase text-base-content/40 mb-2">Bônus de Performance</p>
              <div className="card bg-base-200 p-3 gap-0">
                <StatRow label="Referência SINAPI (R$/UN)" value={formatCurrency(r.rsUN)} />
                <StatRow label="Economia Gerada" value={formatCurrency(r.economia)} color={r.economia > 0 ? 'text-success' : 'text-base-content'} />
                <StatRow label="30% Desconto ao Cliente" value={formatCurrency(r.economia * 0.30)} />
                <StatRow label="56% Profissional" value={formatCurrency(r.economia * 0.56)} />
                <StatRow label="14% Construtora" value={formatCurrency(r.bonusConstrutora)} />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase text-base-content/40 mb-2">Contratação</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="card bg-success/5 border border-success/20 p-3">
                  <p className="text-xs font-bold text-success mb-2">MEI</p>
                  <StatRow label="Bônus de Produção" value={formatCurrency(r.bonusMEI)} />
                  <StatRow label="Valor Equiv./UN" value={formatCurrency(r.valorEquivalenteTotalUNMEI)} />
                  <StatRow label="Salário Mensal Esp." value={formatCurrency(r.valorMensalEsperadoMEI)} />
                  <StatRow label="Custo Final" value={formatCurrency(r.custoFinalMEI)} />
                </div>
                <div className="card bg-info/5 border border-info/20 p-3">
                  <p className="text-xs font-bold text-info mb-2">CLT</p>
                  <StatRow label="Bônus de Produção" value={formatCurrency(r.otima.bonusCenario)} />
                  <StatRow label="Valor Equiv./UN" value={formatCurrency(r.valorEquivalenteTotalUNCLT)} />
                  <StatRow label="Salário Mensal Esp." value={formatCurrency(r.valorMensalEsperadoCLT)} />
                  <StatRow label="Custo Final" value={formatCurrency(r.custoFinalCLT)} />
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase text-base-content/40 mb-2">Composição de Custos (MEI)</p>
              <div className="flex flex-col gap-2">
                <CostBar label="Mão de obra" value={r.custoFinalMEI} total={totalRef} className="progress-success" />
                <CostBar label="Materiais" value={r.custoMaterialServico} total={totalRef} className="progress-warning" />
                <CostBar label="BDI (20%)" value={(r.custoFinalMEI + r.custoMaterialServico) * 0.20} total={totalRef} className="progress-info" />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase text-base-content/40 mb-2">Materiais</p>
              {r.insumos.map((ins, i) => (
                <div key={i} className="flex justify-between text-sm py-1 border-b border-secondary last:border-0">
                  <span className="text-base-content/70">{ins.descricao}</span>
                  <span className="font-medium">{formatCurrency(ins.total)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
