import useSWR from 'swr'
import { getParametrosGlobais, updateParametrosGlobais, getGruposEncargos, updateGruposEncargos } from '@/lib/api'
import type { GlobalParams, GruposEncargos } from '@/types'

export function useParametrosGlobais() {
  const { data, error, mutate } = useSWR('/api/parametros-globais', getParametrosGlobais)
  
  return {
    parametros: data,
    loading: !data && !error,
    error,
    mutate,
    async update(payload: Partial<GlobalParams>) {
      const updated = await updateParametrosGlobais(payload)
      mutate(updated)
      return updated
    },
  }
}

export function useGruposEncargos() {
  const { data, error, mutate } = useSWR('/api/grupos-encargos', getGruposEncargos)
  
  return {
    grupos: data,
    loading: !data && !error,
    error,
    mutate,
    async update(payload: Partial<GruposEncargos>) {
      const updated = await updateGruposEncargos(payload)
      mutate(updated)
      return updated
    },
  }
}
