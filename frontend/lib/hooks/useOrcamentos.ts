import useSWR from 'swr'
import { listOrcamentos, createOrcamento, updateOrcamento, deleteOrcamento } from '@/lib/api'
import type { Orcamento } from '@/types'

export function useOrcamentos(clienteId?: string, status?: string) {
  const { data, error, mutate } = useSWR(
    clienteId ? `/api/orcamentos?cliente_id=${clienteId}` : '/api/orcamentos',
    () => listOrcamentos({ cliente_id: clienteId, status })
  )
  
  return {
    orcamentos: data?.data ?? [],
    total: data?.total ?? 0,
    loading: !data && !error,
    error,
    mutate,
    async create(payload: { nome: string; uf: string; itensJson: string }) {
      const created = await createOrcamento(payload)
      mutate()
      return created
    },
    async update(id: string, payload: Partial<{ nome: string; status: string; itensJson: string; totaisJson: string; parametrosJson: string; saidaJson: string }>) {
      const updated = await updateOrcamento(id, payload)
      mutate()
      return updated
    },
    async remove(id: string) {
      await deleteOrcamento(id)
      mutate()
    },
  }
}
