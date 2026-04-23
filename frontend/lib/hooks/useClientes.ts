import useSWR from 'swr'
import { listClientes, createCliente, updateCliente, deleteCliente } from '@/lib/api'
import type { Cliente } from '@/types'

export function useClientes(email?: string) {
  const { data, error, mutate } = useSWR(
    email ? `/api/clientes?email=${email}` : '/api/clientes',
    () => listClientes({ email })
  )
  
  return {
    clientes: data?.data ?? [],
    total: data?.total ?? 0,
    loading: !data && !error,
    error,
    mutate,
    async create(payload: { nome: string; telefone: string; email: string }) {
      const created = await createCliente(payload)
      mutate()
      return created
    },
    async update(id: string, payload: Partial<{ nome: string; telefone: string; email: string }>) {
      const updated = await updateCliente(id, payload)
      mutate()
      return updated
    },
    async remove(id: string) {
      await deleteCliente(id)
      mutate()
    },
  }
}
