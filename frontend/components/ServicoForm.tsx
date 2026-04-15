'use client'

import { SERVICE_CONFIG, SERVICE_LABELS, SERVICE_SPECS } from '@/lib/mockData'
import type { OrcamentoItem, ServiceType, ContratoModalidade } from '@/types'

interface Props {
  item: OrcamentoItem
  onChange: (item: OrcamentoItem) => void
}

export default function ServicoForm({ item, onChange }: Props) {
  const specs = SERVICE_SPECS[item.serviceType as ServiceType]
  const cfg = SERVICE_CONFIG[item.serviceType]

  function update(partial: Partial<OrcamentoItem>) {
    onChange({ ...item, ...partial })
  }

  return (
    <div className="card bg-base-100 border border-secondary">
      <div className="card-body gap-3 p-4">
        <h3 className="font-semibold text-sm">{SERVICE_LABELS[item.serviceType]}</h3>

        <div className="grid grid-cols-2 gap-3">
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Quantidade ({cfg.unidade})</legend>
            <input
              type="number"
              min={0.01}
              step={0.01}
              value={item.quantidade || ''}
              onChange={e => update({ quantidade: parseFloat(e.target.value) || 0 })}
              className="input w-full"
              placeholder="0.00"
            />
          </fieldset>
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Prazo (dias)</legend>
            <input
              type="number"
              min={1}
              value={item.prazoRequerido || ''}
              onChange={e => update({ prazoRequerido: parseInt(e.target.value) || 1 })}
              className="input w-full"
              placeholder="30"
            />
          </fieldset>
        </div>

        {specs?.esp1 && specs.esp1.length > 0 && (
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Especificação 1</legend>
            <select
              value={item.especificacao1}
              onChange={e => update({ especificacao1: e.target.value, subTipo: e.target.value })}
              className="select w-full"
            >
              <option value="">Selecione...</option>
              {specs.esp1.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </fieldset>
        )}

        {specs?.esp2 && specs.esp2.length > 0 && (
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Especificação 2</legend>
            <select
              value={item.especificacao2}
              onChange={e => update({ especificacao2: e.target.value })}
              className="select w-full"
            >
              <option value="">Selecione...</option>
              {specs.esp2.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </fieldset>
        )}

        {specs?.esp3 && specs.esp3.length > 0 && (
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Especificação 3</legend>
            <select
              value={item.especificacao3}
              onChange={e => update({ especificacao3: e.target.value })}
              className="select w-full"
            >
              <option value="">Selecione...</option>
              {specs.esp3.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </fieldset>
        )}

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Modalidade</legend>
          <select
            value={item.modalidade}
            onChange={e => update({ modalidade: e.target.value as ContratoModalidade })}
            className="select w-full"
          >
            <option value="MEI">MEI</option>
            <option value="CLT">CLT</option>
          </select>
        </fieldset>
      </div>
    </div>
  )
}
