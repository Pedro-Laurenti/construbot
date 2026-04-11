"use client";

import {
  MdApartment,
  MdSchedule,
  MdHandyman,
  MdAttachMoney,
  MdRecordVoiceOver,
  MdChevronRight,
} from "react-icons/md";
import type { QuoteResult, QuoteInputs } from "@/lib/botScripts";
import { formatCurrency } from "@/lib/botScripts";

interface QuoteResultCardProps {
  result: QuoteResult;
  inputs: QuoteInputs;
  onTalkToEngineer: () => void;
}

interface StatRowProps {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}

function StatRow({ label, value, sub, color = "text-base-content" }: StatRowProps) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-secondary last:border-0">
      <span className="text-base-content/50 text-sm">{label}</span>
      <div className="text-right">
        <span className={`${color} text-sm font-semibold`}>{value}</span>
        {sub && <div className="text-base-content/40 text-xs">{sub}</div>}
      </div>
    </div>
  );
}

interface BarProps {
  label: string;
  value: number;
  total: number;
  className?: string;
}

function CostBar({ label, value, total, className = "progress-primary" }: BarProps) {
  const pct = Math.round((value / total) * 100);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-base-content/50">{label}</span>
        <span className="text-base-content/70 font-medium">
          {formatCurrency(value)} ({pct}%)
        </span>
      </div>
      <progress className={`progress h-1.5 w-full ${className}`} value={pct} max={100} />
    </div>
  );
}

export default function QuoteResultCard({
  result,
  inputs,
  onTalkToEngineer,
}: QuoteResultCardProps) {
  const avgTotal = (result.totalMin + result.totalMax) / 2;

  return (
    <div className="flex flex-col gap-4 py-4 px-1">
      {/* Header card */}
      <div className="card bg-primary/10 border border-primary/30">
        <div className="card-body px-4 py-5 gap-1">
          <div className="flex items-center gap-2">
            <MdApartment size={16} className="text-primary" />
            <span className="text-primary text-xs font-semibold uppercase tracking-wide">Estimativa de Orçamento</span>
          </div>
          <p className="text-base-content/50 text-xs">
            {inputs.tipoObra} · {inputs.area} m² · Padrão {inputs.padrao}
          </p>
          <div className="flex items-end gap-2">
            <span className="text-base-content text-3xl font-bold">{formatCurrency(result.totalMin)}</span>
            <span className="text-base-content/50 text-base mb-1">— {formatCurrency(result.totalMax)}</span>
          </div>
          <p className="text-base-content/50 text-xs">
            {formatCurrency(result.custoM2Min)} – {formatCurrency(result.custoM2Max)} por m²
          </p>
        </div>
      </div>

      <div className="card bg-base-300">
        <div className="card-body px-4 py-1">
          <StatRow label="Prazo estimado" value={result.prazoEstimado} color="text-accent" />
          <StatRow label="Custo médio total" value={formatCurrency(avgTotal)} />
          <StatRow label="Localização" value={inputs.localizacao} />
          <StatRow label="Projeto na mão" value={inputs.temProjeto} />
        </div>
      </div>

      <div className="card bg-base-300">
        <div className="card-body px-4 py-4 gap-3">
          <div className="flex items-center gap-2">
            <MdAttachMoney size={15} className="text-base-content/40" />
            <span className="text-base-content/40 text-xs font-semibold uppercase tracking-wide">Distribuição de Custos</span>
          </div>
          <CostBar label="Materiais de construção" value={result.materiais} total={avgTotal} className="progress-success" />
          <CostBar label="Mão de obra" value={result.maoDeObra} total={avgTotal} className="progress-info" />
          <CostBar label="Indiretos e administração" value={result.indiretosAdmin} total={avgTotal} className="progress-warning" />
        </div>
      </div>

      <div className="card bg-base-300">
        <div className="card-body px-4 py-4 gap-2">
          <div className="flex items-center gap-2 mb-1">
            <MdSchedule size={15} className="text-base-content/40" />
            <span className="text-base-content/40 text-xs font-semibold uppercase tracking-wide">Cronograma Estimado</span>
          </div>
          {[
            { phase: "Fundação e estrutura", pct: 25, dotClass: "bg-warning" },
            { phase: "Alvenaria e coberta", pct: 30, dotClass: "bg-info" },
            { phase: "Instalações e revestimento", pct: 30, dotClass: "bg-success" },
            { phase: "Acabamentos e pintura", pct: 15, dotClass: "bg-accent" },
          ].map((p) => (
            <div key={p.phase} className="flex items-center gap-3 text-xs">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${p.dotClass}`} />
              <span className="text-base-content/70 flex-1">{p.phase}</span>
              <span className="badge badge-ghost badge-xs">{p.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="alert bg-secondary border-0">
        <MdHandyman size={13} className="text-base-content/40 flex-shrink-0" />
        <div>
          <p className="text-base-content/40 text-xs font-semibold mb-0.5">Observação</p>
          <p className="text-base-content/40 text-xs leading-relaxed">
            Esta estimativa é gerada automaticamente com base em médias de mercado e
            pode variar conforme a região, disponibilidade de materiais e condições
            específicas do terreno. Para um orçamento preciso, fale com um engenheiro.
          </p>
        </div>
      </div>

      <button
        onClick={onTalkToEngineer}
        className="btn btn-info w-full h-auto py-4 px-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="avatar placeholder flex-shrink-0">
            <div className="w-9 rounded-full bg-info-content/20 text-info-content">
              <MdRecordVoiceOver size={18} />
            </div>
          </div>
          <div className="text-left">
            <p className="font-semibold text-sm">Fale com um engenheiro</p>
            <p className="text-info-content/70 text-xs">Valide esta estimativa e receba um orçamento oficial</p>
          </div>
        </div>
        <MdChevronRight size={20} className="opacity-70 flex-shrink-0" />
      </button>
    </div>
  );
}
