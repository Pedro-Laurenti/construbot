'use client'

import { useMemo, useState } from 'react'
import type { EngineerData } from '@/types'

interface Props {
  data: EngineerData
}

export default function AuditoriaModule({ data }: Props) {
  const [fModulo, setFModulo] = useState('')
  const [fAcao, setFAcao] = useState('')
  const [fUsuario, setFUsuario] = useState('')

  const modulos = Array.from(new Set(data.auditTrail.map(item => item.modulo))).sort()
  const acoes = Array.from(new Set(data.auditTrail.map(item => item.acao))).sort()
  const usuarios = Array.from(new Set(data.auditTrail.map(item => item.usuario))).sort()

  const eventos = useMemo(() => {
    return [...data.auditTrail]
      .reverse()
      .filter(item => {
        const okModulo = !fModulo || item.modulo === fModulo
        const okAcao = !fAcao || item.acao === fAcao
        const okUsuario = !fUsuario || item.usuario === fUsuario
        return okModulo && okAcao && okUsuario
      })
  }, [data.auditTrail, fAcao, fModulo, fUsuario])

  return (
    <div className="flex flex-col gap-4 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold">Auditoria</h1>
        <p className="text-base-content/50 text-sm">Histórico visível de ações operacionais do engenheiro</p>
      </div>

      <div className="card bg-base-100 shadow">
        <div className="card-body p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <fieldset className="fieldset">
            <legend className="fieldset-legend text-xs">Módulo</legend>
            <select value={fModulo} onChange={e => setFModulo(e.target.value)} className="select select-sm w-full">
              <option value="">Todos</option>
              {modulos.map(modulo => <option key={modulo} value={modulo}>{modulo}</option>)}
            </select>
          </fieldset>
          <fieldset className="fieldset">
            <legend className="fieldset-legend text-xs">Ação</legend>
            <select value={fAcao} onChange={e => setFAcao(e.target.value)} className="select select-sm w-full">
              <option value="">Todas</option>
              {acoes.map(acao => <option key={acao} value={acao}>{acao}</option>)}
            </select>
          </fieldset>
          <fieldset className="fieldset">
            <legend className="fieldset-legend text-xs">Usuário</legend>
            <select value={fUsuario} onChange={e => setFUsuario(e.target.value)} className="select select-sm w-full">
              <option value="">Todos</option>
              {usuarios.map(usuario => <option key={usuario} value={usuario}>{usuario}</option>)}
            </select>
          </fieldset>
        </div>
      </div>

      {eventos.length === 0 ? (
        <div className="card bg-base-100 shadow">
          <div className="card-body items-center py-10 gap-2">
            <p className="text-base-content/40 text-sm">Nenhum evento encontrado para os filtros aplicados.</p>
            <p className="text-xs text-base-content/60">Ajuste os filtros ou execute uma ação operacional para gerar rastreabilidade.</p>
          </div>
        </div>
      ) : (
        <div className="card bg-base-100 shadow overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr><th>Data</th><th>Usuário</th><th>Módulo</th><th>Ação</th><th>Motivo</th><th>Impacto</th></tr>
            </thead>
            <tbody>
              {eventos.map((item, idx) => (
                <tr key={`${item.data}-${item.acao}-${idx}`}>
                  <td className="text-xs font-mono">{new Date(item.data).toLocaleString('pt-BR')}</td>
                  <td className="text-xs">{item.usuario}</td>
                  <td className="text-xs">{item.modulo}</td>
                  <td className="text-xs font-semibold">{item.acao}</td>
                  <td className="text-xs">{item.motivo ?? '—'}</td>
                  <td className="text-xs">{item.impacto ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}