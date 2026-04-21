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
      terreno: {
        municipio: 'São Paulo',
        bairro: 'Centro',
        endereco: 'Rua Exemplo, 100',
        frenteMetros: 10,
        fundoMetros: 20,
        areaTotalM2: 200,
        topografia: 'PLANO',
        situacao: 'PROPRIO_QUITADO',
        valorAvaliacao: 150000,
      },
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
