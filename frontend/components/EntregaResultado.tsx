'use client'

import { MdArrowBack, MdAccountBalance, MdCalendarMonth, MdAttachMoney } from 'react-icons/md'
import { formatCurrency } from '@/lib/formatters'
import type { SaidaCliente, ModalidadeFinanciamento } from '@/types'

interface Props {
  saida: SaidaCliente
  modalidade: ModalidadeFinanciamento
  onBack: () => void
}

export default function EntregaResultado({ saida, modalidade, onBack }: Props) {
  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto p-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="btn btn-ghost btn-sm btn-circle">
          <MdArrowBack size={20} />
        </button>
        <h1 className="text-xl font-bold text-base-content">Resultado do Orçamento</h1>
      </div>

      <div className="card bg-success/10 border border-success/30">
        <div className="card-body items-center text-center gap-1">
          <MdAttachMoney size={28} className="text-success" />
          <p className="text-sm text-base-content/60 font-medium">Valor Mínimo de Entrada</p>
          <p className="text-3xl font-bold text-success">{formatCurrency(saida.valorMinimoEntrada)}</p>
          <p className="text-xs text-base-content/50 mt-1">
            {modalidade === 'MCMV'
              ? 'Entrada mínima para financiamento MCMV com subsídio federal'
              : 'Entrada mínima para financiamento SBPE a taxas de mercado'}
          </p>
        </div>
      </div>

      <div className="card bg-info/10 border border-info/30">
        <div className="card-body items-center text-center gap-1">
          <MdAccountBalance size={28} className="text-info" />
          <p className="text-sm text-base-content/60 font-medium">Parcela Mensal ao Banco</p>
          <p className="text-3xl font-bold text-info">{formatCurrency(saida.parcelaMensalPrice)}</p>
          <p className="text-xs text-base-content/50 mt-1">Valor da primeira parcela no sistema Price (parcelas fixas)</p>
        </div>
      </div>

      <div className="card bg-base-100 border border-base-300">
        <div className="card-body gap-3">
          <div className="flex items-center gap-2">
            <MdCalendarMonth size={22} className="text-base-content/60" />
            <h2 className="font-semibold text-base-content">Tabela de Aportes Mensais</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Mês</th>
                  <th>Aporte Recursos Próprios</th>
                  <th>Repasse Financiamento</th>
                  <th>Desembolso Total</th>
                </tr>
              </thead>
              <tbody>
                {saida.tabelaAportes.map(row => (
                  <tr key={row.mes}>
                    <td className="font-medium">{row.mes}</td>
                    <td>{formatCurrency(row.aporteRecursosProprios)}</td>
                    <td>{formatCurrency(row.repasseFinanciamento)}</td>
                    <td className="font-semibold">{formatCurrency(row.desembolsoTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-base-content/40 px-1">
        <span>Prazo total: {saida.prazoTotalObraMeses} meses</span>
        <span>Preço total (com BDI): {formatCurrency(saida.precoFinalObra)}</span>
        {saida.sinapiRef && <span>Referência SINAPI: {saida.sinapiRef}</span>}
      </div>
    </div>
  )
}
