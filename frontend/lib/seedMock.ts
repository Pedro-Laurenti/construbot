import { loadStorage, saveStorage } from '@/lib/storage'
import type { Orcamento } from '@/types'

export function seedOrcamentoMock(): string {
  const id = `orc-mock-${Date.now()}`

  const orc: Orcamento = {
    id,
    nome: 'Orçamento Demonstração',
    clienteId: 'cli-demo-maria',
    dataCriacao: new Date().toISOString(),
    status: 'aguardando_engenheiro',
    uf: 'SP',
    itens: [],
    parametros: {
      terreno: { areaM2: 200, frenteM: 10, tipoSolo: 'normal' },
      quartos: 3,
      plantaId: 'planta-3q-72',
      opcionais: [],
      personalizacoes: [],
      modalidadeFinanciamento: 'SBPE',
    },
  }

  const session = loadStorage()
  session.orcamentos = [
    ...session.orcamentos.filter(o => !o.id.startsWith('orc-mock-')),
    orc,
  ]
  if (!session.cliente) {
    session.cliente = {
      id: 'cli-demo-maria',
      nome: 'Maria Silva',
      email: 'maria@construbot.com',
      telefone: '(11) 98765-4321',
      dataCadastro: '2026-01-10',
    }
  }
  saveStorage(session)
  return id
}

export function clearOrcamentosMock(): void {
  const session = loadStorage()
  session.orcamentos = session.orcamentos.filter(o => !o.id.startsWith('orc-mock-'))
  saveStorage(session)
}
