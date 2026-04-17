'use client'

import { useState } from 'react'
import { GLOBAL_PARAMS, DEFAULT_GRUPOS_ENCARGOS, UF_LIST } from '@/lib/mockData'
import type { EngineerData, GlobalParams, GruposEncargos, ItemGrupoEncargo } from '@/types'
import { formatCurrency } from '@/lib/formatters'

interface Props { data: EngineerData; onUpdate: (p: Partial<EngineerData>) => void }

function sumGrupo(items: ItemGrupoEncargo[]) { return items.reduce((s, i) => s + i.valor, 0) }

export default function ParametrosGlobais({ data, onUpdate }: Props) {
  const { globalParams: p, gruposEncargos: g } = data
  const [params, setParams] = useState<GlobalParams>(p)
  const [grupos, setGrupos] = useState<GruposEncargos>(g)

  const totalA = sumGrupo(grupos.grupoA)
  const totalB = sumGrupo(grupos.grupoB)
  const grupoC = (totalA * totalB) / 100
  const totalD = sumGrupo(grupos.grupoD)
  const fgts = grupos.grupoA.find(i => i.label === 'FGTS')?.valor ?? 8
  const seconci = grupos.grupoA.find(i => i.label === 'SECONCI')?.valor ?? 1
  const avisoPrevio = grupos.grupoD.find(i => i.label === 'Aviso Prévio')?.valor ?? 11.56
  const grupoD2 = ((totalA - fgts - seconci) * avisoPrevio) / 100
  const totalE = sumGrupo(grupos.grupoE)
  const totalGeral = totalA + totalB + grupoC + totalD + grupoD2 + totalE
  const fatorEncargos = 1 + totalGeral / 100

  function updateGrupoItem(grupo: keyof GruposEncargos, idx: number, valor: number) {
    const updated = { ...grupos, [grupo]: grupos[grupo].map((item, i) => i === idx ? { ...item, valor } : item) }
    setGrupos(updated)
    const newFator = fatorEncargos
    const newEnc = totalGeral / 100
    const updatedParams = { ...params, encargosPercentual: newEnc, fatorEncargos: newFator }
    setParams(updatedParams)
    onUpdate({ gruposEncargos: updated, globalParams: updatedParams })
  }

  function saveParams() { onUpdate({ globalParams: params, gruposEncargos: grupos }) }

  function restore() {
    setParams(GLOBAL_PARAMS)
    setGrupos(DEFAULT_GRUPOS_ENCARGOS)
    onUpdate({ globalParams: GLOBAL_PARAMS, gruposEncargos: DEFAULT_GRUPOS_ENCARGOS })
  }

  function GrupoTable({ label, items, grupoKey, readonly, nota }: { label: string; items: ItemGrupoEncargo[] | { label: string; valor: number }[]; grupoKey?: keyof GruposEncargos; readonly?: boolean; nota?: string }) {
    return (
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="font-semibold text-sm">{label}</p>
          <p className="text-sm font-mono">{(items as ItemGrupoEncargo[]).reduce((s, i) => s + i.valor, 0).toFixed(2)}%</p>
        </div>
        {nota && <p className="text-xs text-base-content/50 mb-1">{nota}</p>}
        <table className="table table-xs w-full">
          <tbody>
            {(items as ItemGrupoEncargo[]).map((item, idx) => (
              <tr key={item.label}>
                <td className="text-xs">{item.label}</td>
                <td className="w-28">
                  {readonly ? (
                    <span className="text-xs font-mono">{item.valor.toFixed(2)}%</span>
                  ) : (
                    <div className="flex items-center gap-1">
                      <input type="number" step="0.01" value={item.valor} onChange={e => grupoKey && updateGrupoItem(grupoKey, idx, parseFloat(e.target.value) || 0)} className="input input-xs w-20 text-right" />
                      <span className="text-xs">%</span>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const vhQualSem = params.salarioQualificado / (22 * 8)
  const vhServSem = params.salarioServente / (22 * 8)
  const vhQualCom = vhQualSem * fatorEncargos
  const vhServCom = vhServSem * fatorEncargos

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Parâmetros Globais</h1>
          <p className="text-base-content/50 text-sm">Configurações de cálculo do sistema</p>
        </div>
        <div className="flex gap-2">
          <button onClick={restore} className="btn btn-ghost btn-sm">Restaurar Padrões</button>
          <button onClick={saveParams} className="btn btn-primary btn-sm">Salvar</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card bg-base-100 shadow">
          <div className="card-body p-4 gap-4">
            <p className="font-semibold">BDI e Metas</p>
            <div className="grid grid-cols-2 gap-3">
              <fieldset className="fieldset">
                <legend className="fieldset-legend text-xs">BDI (%)</legend>
                <input type="number" step="0.01" value={(params.bdi * 100).toFixed(0)} onChange={e => setParams({ ...params, bdi: (parseFloat(e.target.value) || 20) / 100 })} className="input input-sm w-full" />
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend text-xs">Meta Diária (R$)</legend>
                <input type="number" step="0.01" value={params.valorMetaDiario} onChange={e => setParams({ ...params, valorMetaDiario: parseFloat(e.target.value) || 220 })} className="input input-sm w-full" />
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend text-xs">Prêmio Máx. Mensal (R$)</legend>
                <input type="number" step="0.01" value={params.premioMaximoMensal} onChange={e => setParams({ ...params, premioMaximoMensal: parseFloat(e.target.value) || 2175.25 })} className="input input-sm w-full" />
              </fieldset>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow">
          <div className="card-body p-4 gap-4">
            <p className="font-semibold">Salários Base</p>
            <div className="grid grid-cols-1 gap-2">
              {[
                { label: 'Qualificado', key: 'salarioQualificado' as keyof GlobalParams },
                { label: 'Meio-Oficial', key: 'salarioMeioOficial' as keyof GlobalParams },
                { label: 'Servente', key: 'salarioServente' as keyof GlobalParams },
              ].map(({ label, key }) => (
                <fieldset key={key} className="fieldset">
                  <legend className="fieldset-legend text-xs">{label} (R$/mês)</legend>
                  <input type="number" step="0.01" value={params[key] as number} onChange={e => setParams({ ...params, [key]: parseFloat(e.target.value) || 0 })} className="input input-sm w-full" />
                </fieldset>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card bg-base-100 shadow">
        <div className="card-body p-4">
          <p className="font-semibold mb-3">Valores Derivados (calculados)</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
            {[
              { l: 'Vh Qualificado s/enc', v: `${vhQualSem.toFixed(2)}/h` },
              { l: 'Vh Qualificado c/enc', v: `${vhQualCom.toFixed(2)}/h` },
              { l: 'Vh Servente s/enc', v: `${vhServSem.toFixed(2)}/h` },
              { l: 'Vh Servente c/enc', v: `${vhServCom.toFixed(2)}/h` },
              { l: 'Qualificado c/enc (mês)', v: formatCurrency(params.salarioQualificado * fatorEncargos) },
              { l: 'Servente c/enc (mês)', v: formatCurrency(params.salarioServente * fatorEncargos) },
              { l: 'Fator Encargos', v: fatorEncargos.toFixed(4) },
              { l: 'Total Encargos', v: `${totalGeral.toFixed(2)}%` },
            ].map(({ l, v }) => (
              <div key={l} className="bg-base-200 rounded p-2">
                <p className="text-xs text-base-content/50">{l}</p>
                <p className="font-mono font-semibold text-sm">R$ {v.startsWith('R$') ? v.slice(2) : v}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card bg-base-100 shadow">
        <div className="card-body p-4">
          <p className="font-semibold mb-4">Encargos Sociais — Grupos A a E</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GrupoTable label="Grupo A — Encargos Básicos" items={grupos.grupoA} grupoKey="grupoA" />
            <GrupoTable label="Grupo B — Remuneração por Tempo não Trabalhado" items={grupos.grupoB} grupoKey="grupoB" />
            <GrupoTable label="Grupo C = A × B (calculado)" items={[{ label: 'Grupo C', valor: grupoC }]} readonly nota={`${totalA.toFixed(2)}% × ${totalB.toFixed(2)}% / 100 = ${grupoC.toFixed(2)}%`} />
            <GrupoTable label="Grupo D — Rescisões" items={grupos.grupoD} grupoKey="grupoD" />
            <GrupoTable label="Grupo D' (calculado)" items={[{ label: "Grupo D'", valor: grupoD2 }]} readonly nota={`(A - FGTS - SECONCI) × AvisoPrévio / 100 = ${grupoD2.toFixed(2)}%`} />
            <GrupoTable label="Grupo E — Despesas Indiretas da Obra" items={grupos.grupoE} grupoKey="grupoE" />
          </div>
          <div className="mt-4 bg-base-200 rounded p-3 flex items-center justify-between">
            <span className="font-semibold">Total Geral = A + B + C + D + D&apos; + E</span>
            <span className="font-mono font-bold text-lg">{totalGeral.toFixed(2)}%</span>
          </div>
          <p className="text-xs text-base-content/50 mt-1">Fator de encargos = 1 + Total/100 = {fatorEncargos.toFixed(4)}</p>
        </div>
      </div>

      <div className="card bg-base-100 shadow">
        <div className="card-body p-4 gap-4">
          <p className="font-semibold">Referência e Correção</p>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <fieldset className="fieldset">
              <legend className="fieldset-legend text-xs">UF de execução</legend>
              <select value={data.uf} onChange={e => onUpdate({ uf: e.target.value })} className="select select-sm w-full">
                {UF_LIST.map(uf => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </fieldset>
            <fieldset className="fieldset">
              <legend className="fieldset-legend text-xs">Mês referência SINAPI</legend>
              <input type="text" value={data.mesReferenciaSINAPI} onChange={e => onUpdate({ mesReferenciaSINAPI: e.target.value })} className="input input-sm w-full" />
            </fieldset>
            <fieldset className="fieldset">
              <legend className="fieldset-legend text-xs">INCC mensal projetado (%)</legend>
              <input type="number" step="0.001" value={(data.inccMensal * 100).toFixed(1)} onChange={e => onUpdate({ inccMensal: (parseFloat(e.target.value) || 0.5) / 100 })} className="input input-sm w-full" />
            </fieldset>
          </div>
        </div>
      </div>

      <div className="card bg-base-100 shadow">
        <div className="card-body p-4 gap-4">
          <p className="font-semibold">Condições de Financiamento Caixa</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-base-200 rounded p-3">
              <p className="text-xs font-bold text-success mb-2">MCMV</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><p className="text-base-content/50">Taxa juros anual</p><p className="font-semibold">5,50%</p></div>
                <div><p className="text-base-content/50">Prazo máximo</p><p className="font-semibold">420 meses (35 anos)</p></div>
                <div><p className="text-base-content/50">% financiável</p><p className="font-semibold">80%</p></div>
                <div><p className="text-base-content/50">Valor máximo</p><p className="font-semibold">{formatCurrency(600000)}</p></div>
              </div>
            </div>
            <div className="bg-base-200 rounded p-3">
              <p className="text-xs font-bold text-info mb-2">SBPE</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><p className="text-base-content/50">Taxa juros anual</p><p className="font-semibold">9,99%</p></div>
                <div><p className="text-base-content/50">Prazo máximo</p><p className="font-semibold">420 meses (35 anos)</p></div>
                <div><p className="text-base-content/50">% financiável</p><p className="font-semibold">80%</p></div>
                <div><p className="text-base-content/50">Valor máximo</p><p className="font-semibold">{formatCurrency(1500000)}</p></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
