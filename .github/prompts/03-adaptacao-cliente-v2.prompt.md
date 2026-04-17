---
agent: 'agent'
description: 'Adapta o fluxo do CLIENTE para v2: 5 parametros sequenciais -> aguarda engenheiro -> 3 saidas (AA, Parcela Price, Tabela de Aportes)'
---

# Tarefa: Adaptar Fluxo do Cliente para v2 — 5 Parametros, 3 Saidas

## Regras obrigatorias ANTES de qualquer codigo

Leia e respeite TODOS os arquivos em `.github/instructions/`:
- `rules.instructions.md` — regras globais (sem emojis, sem comentarios no codigo, sem testes, sem docstrings, input padrao DaisyUI fieldset, cleancode, o menor numero de arquivos e linhas possivel)
- `frontend.instructions.md` — stack Next.js 15 + React 19 + TypeScript + Tailwind CSS v4 + DaisyUI v5, icones apenas `react-icons/md`, temas `mylight`/`mydark`, classes semanticas DaisyUI
- `backend.instructions.md` — referencia

---

## Contexto critico — O que muda do v1 para v2

O fluxo atual do cliente (prompt `01-cliente-orcamento.prompt.md`) permite ao cliente selecionar servicos, configurar cada um (quantidade, specs, prazo, modalidade) e ver o resultado tecnico completo (3 cenarios, bonus, BDI, custos de MO e materiais).

**O v2 muda FUNDAMENTALMENTE o papel do cliente:**
- O cliente NAO seleciona servicos individuais
- O cliente NAO ve NENHUM detalhe tecnico (SINAPI, cenarios, bonus, encargos, BDI, custos de MO/materiais)
- O cliente informa 5 parametros sequenciais sobre o PROJETO (terreno, quartos, planta, opcionais, personalizacoes)
- O cliente AGUARDA enquanto o engenheiro trabalha
- O cliente recebe APENAS 3 saidas: valor minimo de entrada (AA), parcela mensal ao banco (Price) e tabela de aportes mensais

### Manter intacto
- Identidade visual WhatsApp-like (sidebar + chat area)
- Componentes existentes de qualidade (LoginPage, Sidebar, HelpModal, ChatWindow patterns)
- Persistencia em localStorage via `lib/storage.ts`
- Formatadores em `lib/formatters.ts`
- Stack: Next.js 15 + React 19 + TypeScript + Tailwind v4 + DaisyUI v5

---

## Novos tipos — substituir/estender em `types/index.ts`

```ts
type ModalidadeFinanciamento = 'MCMV' | 'SBPE'

type TopografiaTerreno = 'PLANO' | 'ACLIVE' | 'DECLIVE'

type SituacaoTerreno = 'PROPRIO_QUITADO' | 'FINANCIADO_EM_CURSO' | 'A_ADQUIRIR'

interface Terreno {
  municipio: string
  bairro: string
  endereco: string
  frenteMetros: number
  fundoMetros: number
  areaTotalM2: number
  topografia: TopografiaTerreno
  situacao: SituacaoTerreno
  valorAvaliacao: number
}

interface PlantaPadrao {
  id: string
  nome: string
  quartos: number
  areaConstruidaM2: number
  tempoObraMeses: number
  descricao: string
  compatibilidadeTerreno: {
    areaMinima: number
    frenteMinima: number
  }
  servicos: ServicoPlanta[]
}

interface ServicoPlanta {
  serviceType: ServiceType
  descricao: string
  unidade: string
  quantidade: number
  especificacao1: string
  especificacao2: string
  especificacao3: string
  composicaoBasica: string
  composicaoProfissionalId: number
}

interface OpcionalItem {
  id: string
  nome: string
  descricao: string
  vantagensCliente: string
  desvantagensCliente: string
  selecionado: boolean
  impactoServicos: ImpactoOpcional[]
}

interface ImpactoOpcional {
  tipo: 'INCREMENTO' | 'NOVO_SERVICO'
  serviceType: ServiceType
  incrementoQuantidade?: number
  novoServico?: ServicoPlanta
}

interface Personalizacao {
  id: string
  descricao: string
  impacto: string
  custoEstimadoAdicional: number
}

interface ParametrosCliente {
  terreno: Terreno
  quartos: number
  plantaId: string
  opcionais: OpcionalItem[]
  personalizacoes: Personalizacao[]
  modalidadeFinanciamento: ModalidadeFinanciamento
}

interface SaidaCliente {
  valorMinimoEntrada: number
  parcelaMensalPrice: number
  tabelaAportes: AporteMensal[]
  prazoTotalObraMeses: number
  precoFinalObra: number
}

interface AporteMensal {
  mes: number
  aporteRecursosProprios: number
  repasseFinanciamento: number
  desembolsoTotal: number
}

interface CondicoesFinanciamento {
  modalidade: ModalidadeFinanciamento
  taxaJurosAnual: number
  prazoMaximoMeses: number
  percentualMaximoFinanciavel: number
  valorMaximo: number
}

interface Cliente {
  id: string
  nome: string
  telefone: string
  email: string
  municipio: string
  modalidadeFinanciamento: ModalidadeFinanciamento
  dataCadastro: string
}

interface Orcamento {
  id: string
  clienteId: string
  dataCriacao: string
  status: 'aguardando_engenheiro' | 'em_calculo' | 'calculado' | 'entregue'
  parametros: ParametrosCliente
  saida?: SaidaCliente
}

interface AppSession {
  cliente: Cliente | null
  role: UserRole
  orcamentos: Orcamento[]
  orcamentoAtivo: string | null
}
```

---

## Onboarding — Primeiro Contato e Captacao (secao 1 do fluxo)

Layout dois paineis (brand esquerda + form direita) com **duas abas**:

**Aba 1 — Cadastro manual:**
- Nome completo (fieldset input)
- Telefone com formatacao BR +55 (fieldset input)
- E-mail (fieldset input)
- Municipio de interesse (fieldset input)
- Modalidade provavel: pill buttons `MCMV` | `SBPE` com descricao curta:
  - MCMV: "Ate R$ 600.000 — subsidios federais, juros reduzidos"
  - SBPE: "Acima de R$ 600.000 — taxas de mercado"

**Aba 2 — Google (mockado):**
- Botao "Entrar com Google" que preenche um usuario demo e chama `onSubmit`

Salvar em localStorage via `lib/storage.ts` com `role: 'cliente'`.

---

## Wizard de Reuniao como Conversa — 5 Parametros Sequenciais

O fluxo e conduzido pela "Ana - ConstruBot" como conversa WhatsApp. A **ordem dos parametros e obrigatoria** — cada parametro condiciona os seguintes.

### Parametro 1 — Terreno

Bot: "Para comecarmos, preciso entender o terreno onde sera construida a casa."

Input area mostra formulario com campos fieldset:
- Municipio (pre-preenchido do onboarding)
- Bairro
- Endereco completo
- Frente (metros) + Fundo (metros) — area total calculada automaticamente
- Topografia: pill buttons `Plano` | `Em aclive` | `Em declive`
- Situacao: pill buttons `Proprio quitado` | `Financiado em curso` | `A adquirir`
- Valor de avaliacao (R$) — input monetario

Ao confirmar: bubble do usuario com resumo compacto. Bot confirma e avanca.

### Parametro 2 — Numero de Quartos

Bot: "Com o terreno definido, quantos quartos o senhor deseja?"

Input area: pill buttons grandes `1` | `2` | `3` | `4` quartos

Ao selecionar: bubble do usuario. Bot confirma e avanca.

### Parametro 3 — Planta Arquitetonica

Bot: "Baseado no seu terreno e numero de quartos, temos as seguintes plantas disponiveis:"

O sistema filtra `PLANTAS_PADRAO` por:
- `quartos === parametro2`
- `compatibilidadeTerreno.areaMinima <= terreno.areaTotalM2`
- `compatibilidadeTerreno.frenteMinima <= terreno.frenteMetros`

Input area: cards de planta com:
- Nome da planta
- Area construida (m2)
- Tempo de obra (meses)
- Descricao breve
- Botao "Selecionar"

Se nenhuma planta compativel: bot informa e sugere ajustar terreno ou quartos.

Ao selecionar: bubble do usuario com planta escolhida. Bot confirma e avanca.

### Parametro 4 — Opcionais

Bot: "Agora vou apresentar alguns itens opcionais. Para cada um, o senhor responde Sim ou Nao."

**7 opcionais apresentados UM POR VEZ como mensagens do bot:**

| Opcional | Descricao para o cliente |
|----------|------------------------|
| Pe-direito alto | Deixa o ambiente mais amplo e ventilado. Aumenta o custo da obra. |
| Garagem coberta | Protege o veiculo. Acrescenta cobertura e estrutura ao projeto. |
| Piscina | Lazer. Impacto significativo no custo e no prazo da obra. |
| Forro rebaixado (gesso) | Acabamento mais refinado no teto. Impacta custo e prazo. |
| Aquecedor solar | Reduz conta de energia. Requer instalacao hidraulica especifica. |
| Placas solares (fotovoltaico) | Geracao de energia eletrica. Requer instalacao eletrica especifica. |
| Corretor eletrico (automacao) | Automacao residencial de circuitos eletricos. Aumenta conforto e custo. |

Para cada opcional:
- Bot apresenta nome, descricao, vantagens/desvantagens e **custo incremental estimado em R$**
- Input area: dois botoes grandes `Sim` | `Nao`
- Ao responder: bubble do usuario, bot avanca para proximo opcional

Ao final dos 7: bot mostra resumo dos opcionais selecionados (S/N).

### Parametro 5 — Personalizacoes

Bot: "Por ultimo, ha alguma personalizacao que o senhor gostaria? Por exemplo: revestimentos diferentes do padrao, modificacoes de layout, esquadrias especiais, acabamentos diferenciados."

Input area: textarea + botao "Adicionar personalizacao" (pode adicionar multiplas)
- Cada personalizacao: descricao (texto livre) + impacto estimado opcional
- Botao "Nenhuma personalizacao" para pular
- Botao "Concluir personalizacoes"

Ao confirmar: bubble do usuario com personalizacoes listadas (ou "Sem personalizacoes").

---

## Estado de Aguardo — Cliente Espera o Engenheiro

Apos os 5 parametros:

Bot: "Perfeito! Todos os dados do seu projeto foram registrados. Agora nosso engenheiro vai analisar e calcular o orcamento. Voce sera notificado assim que o resultado estiver pronto."

O orcamento e salvo com `status: 'aguardando_engenheiro'`.

A tela mostra:
- Mensagem do bot com resumo dos 5 parametros coletados
- Indicador visual de "Aguardando analise" (skeleton/loading discreto)
- O cliente pode navegar para "Meus Orcamentos" na sidebar

**O cliente NAO pode ver nem editar os calculos.** Ele so vera o resultado quando o engenheiro marcar como `status: 'entregue'`.

---

## Entrega ao Cliente — As 3 Saidas

Quando o engenheiro marca o orcamento como `status: 'entregue'`, o cliente ve:

Bot: "Seu orcamento ficou pronto! Aqui estao os resultados:"

### Saida 1 — Valor Minimo de Entrada (AA)
Card destacado com:
- Titulo: "Valor Minimo de Recursos Proprios"
- Valor em R$ (grande, destaque visual)
- Nota explicativa: descricao da estrategia conforme modalidade:
  - MCMV: "Aportes concentrados nas etapas iniciais, aproveitando repasses do financiamento"
  - SBPE: "Possibilidade de antecipacao de recursos para diluir aportes ao longo da obra"

### Saida 2 — Primeira Parcela Mensal (Price)
Card destacado com:
- Titulo: "Parcela Mensal ao Banco"
- Valor em R$ (grande, destaque visual)
- Nota: "Valor da primeira parcela que sera paga ao banco apos a conclusao da obra, no sistema Price (parcelas fixas)"

### Saida 3 — Tabela de Aportes Mensais
Tabela com colunas:
| Mes | Aporte Recursos Proprios | Repasse Financiamento Caixa | Desembolso Total |
|-----|--------------------------|----------------------------|-----------------|
| Mes 1 | R$ X.XXX,XX | R$ X.XXX,XX | R$ X.XXX,XX |
| Mes 2 | R$ X.XXX,XX | R$ X.XXX,XX | R$ X.XXX,XX |
| ... | ... | ... | ... |
| Mes N | R$ X.XXX,XX | R$ X.XXX,XX | R$ X.XXX,XX |

Informacoes adicionais (discretas, abaixo da tabela):
- Prazo total da obra: N meses
- Preco total da obra (com BDI): R$ XXX.XXX,XX

### O que o cliente NAO ve (e nao precisa ver)
- Composicoes SINAPI
- Coeficientes de insumos
- Encargos sociais
- Cenarios de equipe (Mensalista/Otima/Prazo)
- Modalidade MEI vs CLT
- BDI
- INCC
- Custo direto de mao de obra
- Custo direto de materiais
- Produtividade em UN/h
- Bonus de performance (o desconto de 30% ja esta embutido no preco)

---

## Sidebar WhatsApp-like — Adaptar

Sidebar do cliente com:
1. **"Nova Consulta"** — pinnada no topo, abre o chat com Ana para iniciar os 5 parametros
2. **"Meus Orcamentos"** — entrada unica com badge de contagem
   - Ao clicar: area de chat mostra lista de orcamentos com status:
     - `aguardando_engenheiro` — badge "Aguardando"
     - `em_calculo` — badge "Em analise"
     - `entregue` — badge "Pronto" (destaque verde)
   - Ao selecionar um orcamento entregue: exibe as 3 saidas
   - Ao selecionar um em aguardo: exibe mensagem "Aguardando analise do engenheiro"
3. **Sair** — limpar sessao

---

## Dados mockados — estender `lib/mockData.ts`

### Plantas padrao (mock representativo)
```ts
export const PLANTAS_PADRAO: PlantaPadrao[] = [
  {
    id: 'planta-2q-48',
    nome: 'Casa Compacta 2Q',
    quartos: 2,
    areaConstruidaM2: 48,
    tempoObraMeses: 6,
    descricao: 'Casa terrea compacta com 2 quartos, sala, cozinha, banheiro e area de servico',
    compatibilidadeTerreno: { areaMinima: 150, frenteMinima: 8 },
    servicos: [
      { serviceType: 'FUNDACAO', descricao: 'Fundacao Sapata Corrida', unidade: 'M3', quantidade: 4.5,
        especificacao1: 'Sapata Corrida', especificacao2: '', especificacao3: '',
        composicaoBasica: '104924', composicaoProfissionalId: 38 },
      { serviceType: 'ALVENARIA', descricao: 'Alvenaria Estrutural', unidade: 'M2', quantidade: 180,
        especificacao1: 'Alvenaria Estrutural', especificacao2: 'Modulo 15 - Vertical', especificacao3: 'Concreto',
        composicaoBasica: '89288', composicaoProfissionalId: 15 },
      { serviceType: 'GRAUTE', descricao: 'Grauteamento Vertical', unidade: 'M3', quantidade: 2.8,
        especificacao1: 'Vertical', especificacao2: '', especificacao3: '',
        composicaoBasica: '89993', composicaoProfissionalId: 21 },
      { serviceType: 'CONTRAPISO', descricao: 'Contrapiso Farofa 2cm', unidade: 'M2', quantidade: 48,
        especificacao1: '', especificacao2: '', especificacao3: '',
        composicaoBasica: '87622', composicaoProfissionalId: 41 },
      { serviceType: 'REVESTIMENTO_ARGAMASSA_PAREDE', descricao: 'Gesso Liso Paredes', unidade: 'M2', quantidade: 220,
        especificacao1: 'Gesso Liso', especificacao2: '1,0 cm', especificacao3: '',
        composicaoBasica: '87421', composicaoProfissionalId: 39 },
      { serviceType: 'REVESTIMENTO_ARGAMASSA_TETO', descricao: 'Gesso Liso Teto', unidade: 'M2', quantidade: 48,
        especificacao1: 'Gesso Liso', especificacao2: '1,0 cm', especificacao3: '',
        composicaoBasica: '87414', composicaoProfissionalId: 40 },
      { serviceType: 'REVESTIMENTO_CERAMICO', descricao: 'Porcelanato Piso 60x60', unidade: 'M2', quantidade: 42,
        especificacao1: 'Piso Interno', especificacao2: 'Porcelanato ate 60x60', especificacao3: '',
        composicaoBasica: '87263', composicaoProfissionalId: 11 },
      { serviceType: 'PINTURA_INTERNA', descricao: 'Pintura Interna Completa', unidade: 'M2', quantidade: 268,
        especificacao1: 'Tinta Acrilica', especificacao2: '', especificacao3: '',
        composicaoBasica: '88489', composicaoProfissionalId: 10 },
      { serviceType: 'PINTURA_EXTERNA', descricao: 'Pintura Externa Textura', unidade: 'M2', quantidade: 95,
        especificacao1: 'Textura Acrilica', especificacao2: '', especificacao3: '',
        composicaoBasica: '88423', composicaoProfissionalId: 3 },
      { serviceType: 'LIMPEZA_INTERNA', descricao: 'Limpeza Final', unidade: 'M2', quantidade: 48,
        especificacao1: '', especificacao2: '', especificacao3: '',
        composicaoBasica: '', composicaoProfissionalId: 0 },
    ]
  },
  {
    id: 'planta-3q-72',
    nome: 'Casa Padrao 3Q',
    quartos: 3,
    areaConstruidaM2: 72,
    tempoObraMeses: 8,
    descricao: 'Casa terrea com 3 quartos, sala ampla, cozinha americana, 2 banheiros e garagem',
    compatibilidadeTerreno: { areaMinima: 200, frenteMinima: 10 },
    servicos: [
      { serviceType: 'FUNDACAO', descricao: 'Fundacao Sapata Corrida', unidade: 'M3', quantidade: 6.2,
        especificacao1: 'Sapata Corrida', especificacao2: '', especificacao3: '',
        composicaoBasica: '104924', composicaoProfissionalId: 38 },
      { serviceType: 'ALVENARIA', descricao: 'Alvenaria Estrutural', unidade: 'M2', quantidade: 260,
        especificacao1: 'Alvenaria Estrutural', especificacao2: 'Modulo 15 - Vertical', especificacao3: 'Concreto',
        composicaoBasica: '89288', composicaoProfissionalId: 15 },
      { serviceType: 'GRAUTE', descricao: 'Grauteamento Vertical', unidade: 'M3', quantidade: 3.8,
        especificacao1: 'Vertical', especificacao2: '', especificacao3: '',
        composicaoBasica: '89993', composicaoProfissionalId: 21 },
      { serviceType: 'CONTRAPISO', descricao: 'Contrapiso Farofa 2cm', unidade: 'M2', quantidade: 72,
        especificacao1: '', especificacao2: '', especificacao3: '',
        composicaoBasica: '87622', composicaoProfissionalId: 41 },
      { serviceType: 'REVESTIMENTO_ARGAMASSA_PAREDE', descricao: 'Gesso Liso Paredes', unidade: 'M2', quantidade: 340,
        especificacao1: 'Gesso Liso', especificacao2: '1,0 cm', especificacao3: '',
        composicaoBasica: '87421', composicaoProfissionalId: 39 },
      { serviceType: 'REVESTIMENTO_ARGAMASSA_TETO', descricao: 'Gesso Liso Teto', unidade: 'M2', quantidade: 72,
        especificacao1: 'Gesso Liso', especificacao2: '1,0 cm', especificacao3: '',
        composicaoBasica: '87414', composicaoProfissionalId: 40 },
      { serviceType: 'REVESTIMENTO_CERAMICO', descricao: 'Porcelanato Piso 60x60', unidade: 'M2', quantidade: 62,
        especificacao1: 'Piso Interno', especificacao2: 'Porcelanato ate 60x60', especificacao3: '',
        composicaoBasica: '87263', composicaoProfissionalId: 11 },
      { serviceType: 'PINTURA_INTERNA', descricao: 'Pintura Interna Completa', unidade: 'M2', quantidade: 412,
        especificacao1: 'Tinta Acrilica', especificacao2: '', especificacao3: '',
        composicaoBasica: '88489', composicaoProfissionalId: 10 },
      { serviceType: 'PINTURA_EXTERNA', descricao: 'Pintura Externa Textura', unidade: 'M2', quantidade: 140,
        especificacao1: 'Textura Acrilica', especificacao2: '', especificacao3: '',
        composicaoBasica: '88423', composicaoProfissionalId: 3 },
      { serviceType: 'LIMPEZA_INTERNA', descricao: 'Limpeza Final', unidade: 'M2', quantidade: 72,
        especificacao1: '', especificacao2: '', especificacao3: '',
        composicaoBasica: '', composicaoProfissionalId: 0 },
    ]
  },
  {
    id: 'planta-3q-90',
    nome: 'Casa Conforto 3Q',
    quartos: 3,
    areaConstruidaM2: 90,
    tempoObraMeses: 10,
    descricao: 'Casa terrea ampla com 3 quartos (1 suite), sala, cozinha, area gourmet e garagem dupla',
    compatibilidadeTerreno: { areaMinima: 250, frenteMinima: 12 },
    servicos: [
      { serviceType: 'FUNDACAO', descricao: 'Fundacao Radier', unidade: 'M3', quantidade: 9.0,
        especificacao1: 'Radier', especificacao2: '', especificacao3: '',
        composicaoBasica: '97096', composicaoProfissionalId: 37 },
      { serviceType: 'ALVENARIA', descricao: 'Alvenaria Estrutural', unidade: 'M2', quantidade: 320,
        especificacao1: 'Alvenaria Estrutural', especificacao2: 'Modulo 20 - Vertical/Horizontal', especificacao3: 'Concreto',
        composicaoBasica: '89288', composicaoProfissionalId: 15 },
      { serviceType: 'GRAUTE', descricao: 'Grauteamento Vertical', unidade: 'M3', quantidade: 4.5,
        especificacao1: 'Vertical', especificacao2: '', especificacao3: '',
        composicaoBasica: '89993', composicaoProfissionalId: 21 },
      { serviceType: 'CONTRAPISO', descricao: 'Contrapiso Farofa 2cm', unidade: 'M2', quantidade: 90,
        especificacao1: '', especificacao2: '', especificacao3: '',
        composicaoBasica: '87622', composicaoProfissionalId: 41 },
      { serviceType: 'REVESTIMENTO_ARGAMASSA_PAREDE', descricao: 'Gesso Liso Paredes', unidade: 'M2', quantidade: 420,
        especificacao1: 'Gesso Liso', especificacao2: '1,0 cm', especificacao3: '',
        composicaoBasica: '87421', composicaoProfissionalId: 39 },
      { serviceType: 'REVESTIMENTO_ARGAMASSA_TETO', descricao: 'Gesso Liso Teto', unidade: 'M2', quantidade: 90,
        especificacao1: 'Gesso Liso', especificacao2: '1,0 cm', especificacao3: '',
        composicaoBasica: '87414', composicaoProfissionalId: 40 },
      { serviceType: 'REVESTIMENTO_CERAMICO', descricao: 'Porcelanato Piso 60x60', unidade: 'M2', quantidade: 78,
        especificacao1: 'Piso Interno', especificacao2: 'Porcelanato ate 60x60', especificacao3: '',
        composicaoBasica: '87263', composicaoProfissionalId: 11 },
      { serviceType: 'PINTURA_INTERNA', descricao: 'Pintura Interna Completa', unidade: 'M2', quantidade: 510,
        especificacao1: 'Tinta Acrilica', especificacao2: '', especificacao3: '',
        composicaoBasica: '88489', composicaoProfissionalId: 10 },
      { serviceType: 'PINTURA_EXTERNA', descricao: 'Pintura Externa Textura', unidade: 'M2', quantidade: 175,
        especificacao1: 'Textura Acrilica', especificacao2: '', especificacao3: '',
        composicaoBasica: '88423', composicaoProfissionalId: 3 },
      { serviceType: 'LIMPEZA_INTERNA', descricao: 'Limpeza Final', unidade: 'M2', quantidade: 90,
        especificacao1: '', especificacao2: '', especificacao3: '',
        composicaoBasica: '', composicaoProfissionalId: 0 },
    ]
  },
  {
    id: 'planta-4q-120',
    nome: 'Casa Premium 4Q',
    quartos: 4,
    areaConstruidaM2: 120,
    tempoObraMeses: 12,
    descricao: 'Casa terrea premium com 4 quartos (2 suites), sala ampla, cozinha gourmet, lavabo e garagem tripla',
    compatibilidadeTerreno: { areaMinima: 360, frenteMinima: 15 },
    servicos: [
      { serviceType: 'FUNDACAO', descricao: 'Fundacao Radier', unidade: 'M3', quantidade: 12.0,
        especificacao1: 'Radier', especificacao2: '', especificacao3: '',
        composicaoBasica: '97096', composicaoProfissionalId: 37 },
      { serviceType: 'ALVENARIA', descricao: 'Alvenaria Estrutural', unidade: 'M2', quantidade: 420,
        especificacao1: 'Alvenaria Estrutural', especificacao2: 'Modulo 20 - Vertical/Horizontal', especificacao3: 'Concreto',
        composicaoBasica: '89288', composicaoProfissionalId: 15 },
      { serviceType: 'GRAUTE', descricao: 'Grauteamento Vertical e Horizontal', unidade: 'M3', quantidade: 6.0,
        especificacao1: 'Vertical', especificacao2: '', especificacao3: '',
        composicaoBasica: '89993', composicaoProfissionalId: 21 },
      { serviceType: 'CONTRAPISO', descricao: 'Contrapiso Farofa 2cm', unidade: 'M2', quantidade: 120,
        especificacao1: '', especificacao2: '', especificacao3: '',
        composicaoBasica: '87622', composicaoProfissionalId: 41 },
      { serviceType: 'REVESTIMENTO_ARGAMASSA_PAREDE', descricao: 'Gesso Liso Paredes', unidade: 'M2', quantidade: 560,
        especificacao1: 'Gesso Liso', especificacao2: '1,0 cm', especificacao3: '',
        composicaoBasica: '87421', composicaoProfissionalId: 39 },
      { serviceType: 'REVESTIMENTO_ARGAMASSA_TETO', descricao: 'Gesso Liso Teto', unidade: 'M2', quantidade: 120,
        especificacao1: 'Gesso Liso', especificacao2: '1,0 cm', especificacao3: '',
        composicaoBasica: '87414', composicaoProfissionalId: 40 },
      { serviceType: 'REVESTIMENTO_CERAMICO', descricao: 'Porcelanato Piso 60x60', unidade: 'M2', quantidade: 105,
        especificacao1: 'Piso Interno', especificacao2: 'Porcelanato ate 60x60', especificacao3: '',
        composicaoBasica: '87263', composicaoProfissionalId: 11 },
      { serviceType: 'PINTURA_INTERNA', descricao: 'Pintura Interna Completa', unidade: 'M2', quantidade: 680,
        especificacao1: 'Tinta Acrilica', especificacao2: '', especificacao3: '',
        composicaoBasica: '88489', composicaoProfissionalId: 10 },
      { serviceType: 'PINTURA_EXTERNA', descricao: 'Pintura Externa Textura', unidade: 'M2', quantidade: 225,
        especificacao1: 'Textura Acrilica', especificacao2: '', especificacao3: '',
        composicaoBasica: '88423', composicaoProfissionalId: 3 },
      { serviceType: 'LIMPEZA_INTERNA', descricao: 'Limpeza Final', unidade: 'M2', quantidade: 120,
        especificacao1: '', especificacao2: '', especificacao3: '',
        composicaoBasica: '', composicaoProfissionalId: 0 },
    ]
  },
]
```

### Opcionais padrao
```ts
export const OPCIONAIS_PADRAO: Omit<OpcionalItem, 'selecionado'>[] = [
  {
    id: 'pe-direito-alto',
    nome: 'Pe-direito alto',
    descricao: 'Deixa o ambiente mais amplo e ventilado. Aumenta o custo da obra.',
    vantagensCliente: 'Ambientes mais amplos, melhor ventilacao e iluminacao natural',
    desvantagensCliente: 'Aumento no custo de alvenaria, revestimento e pintura',
    impactoServicos: [
      { tipo: 'INCREMENTO', serviceType: 'ALVENARIA', incrementoQuantidade: 0.25 },
      { tipo: 'INCREMENTO', serviceType: 'REVESTIMENTO_ARGAMASSA_PAREDE', incrementoQuantidade: 0.20 },
      { tipo: 'INCREMENTO', serviceType: 'PINTURA_INTERNA', incrementoQuantidade: 0.20 },
    ]
  },
  {
    id: 'garagem-coberta',
    nome: 'Garagem coberta',
    descricao: 'Protege o veiculo. Acrescenta cobertura e estrutura ao projeto.',
    vantagensCliente: 'Protecao do veiculo contra intemperies',
    desvantagensCliente: 'Custo adicional de estrutura e cobertura',
    impactoServicos: [
      { tipo: 'INCREMENTO', serviceType: 'FUNDACAO', incrementoQuantidade: 0.15 },
      { tipo: 'INCREMENTO', serviceType: 'CONTRAPISO', incrementoQuantidade: 0.10 },
    ]
  },
  {
    id: 'piscina',
    nome: 'Piscina',
    descricao: 'Lazer. Impacto significativo no custo e no prazo da obra.',
    vantagensCliente: 'Area de lazer valoriza o imovel',
    desvantagensCliente: 'Custo significativo, manutencao recorrente, impacto no prazo',
    impactoServicos: [
      { tipo: 'INCREMENTO', serviceType: 'FUNDACAO', incrementoQuantidade: 0.30 },
      { tipo: 'INCREMENTO', serviceType: 'REVESTIMENTO_CERAMICO', incrementoQuantidade: 0.15 },
    ]
  },
  {
    id: 'forro-gesso',
    nome: 'Forro rebaixado (gesso)',
    descricao: 'Acabamento mais refinado no teto. Impacta custo e prazo de acabamento.',
    vantagensCliente: 'Acabamento mais sofisticado, esconde tubulacoes',
    desvantagensCliente: 'Custo adicional de material e mao de obra',
    impactoServicos: [
      { tipo: 'INCREMENTO', serviceType: 'REVESTIMENTO_ARGAMASSA_TETO', incrementoQuantidade: 0.40 },
    ]
  },
  {
    id: 'aquecedor-solar',
    nome: 'Aquecedor solar',
    descricao: 'Reduz conta de energia. Requer instalacao hidraulica especifica.',
    vantagensCliente: 'Economia na conta de energia, sustentabilidade',
    desvantagensCliente: 'Investimento inicial, manutencao periodica',
    impactoServicos: []
  },
  {
    id: 'placas-solares',
    nome: 'Placas solares (fotovoltaico)',
    descricao: 'Geracao de energia eletrica. Requer instalacao eletrica especifica.',
    vantagensCliente: 'Geracao propria de energia, economia a longo prazo',
    desvantagensCliente: 'Investimento inicial elevado',
    impactoServicos: []
  },
  {
    id: 'automacao',
    nome: 'Corretor eletrico (automacao)',
    descricao: 'Automacao residencial de circuitos eletricos. Aumenta conforto e custo.',
    vantagensCliente: 'Conforto, praticidade, valorizacao do imovel',
    desvantagensCliente: 'Custo de equipamentos e instalacao diferenciada',
    impactoServicos: []
  },
]
```

### Condicoes de financiamento mock
```ts
export const CONDICOES_FINANCIAMENTO: CondicoesFinanciamento[] = [
  {
    modalidade: 'MCMV',
    taxaJurosAnual: 0.055,
    prazoMaximoMeses: 420,
    percentualMaximoFinanciavel: 0.80,
    valorMaximo: 600000,
  },
  {
    modalidade: 'SBPE',
    taxaJurosAnual: 0.0999,
    prazoMaximoMeses: 420,
    percentualMaximoFinanciavel: 0.80,
    valorMaximo: 1500000,
  },
]
```

---

## Estrutura de arquivos — substituir/adicionar

```
frontend/
  lib/
    storage.ts        <- estender com novos tipos (Terreno, PlantaPadrao, etc.)
    mockData.ts       <- estender com PLANTAS_PADRAO, OPCIONAIS_PADRAO, CONDICOES_FINANCIAMENTO
    calculos.ts       <- manter calculos existentes + adicionar calcularParcelaPrice, calcularAA, calcularTabelaAportes
    formatters.ts     <- manter
  types/
    index.ts          <- substituir/estender com novos tipos acima
  components/
    OnboardingForm.tsx       <- adaptar: adicionar campos municipio + modalidade financiamento
    Sidebar.tsx              <- adaptar: "Nova Consulta", "Meus Orcamentos", Sair
    OrcamentoChatFlow.tsx    <- REESCREVER: wizard de 5 parametros (terreno -> quartos -> planta -> opcionais -> personalizacoes)
    EntregaResultado.tsx     <- NOVO: exibe as 3 saidas (AA, Parcela, Tabela)
    PlantaCard.tsx           <- NOVO: card de planta para selecao no P3
    OpcionalCard.tsx         <- NOVO: card S/N para cada opcional no P4
    HistoricoOrcamentos.tsx  <- adaptar: novos status (aguardando_engenheiro, em_calculo, entregue)
    HelpModal.tsx            <- manter
  app/
    page.tsx          <- adaptar: novo fluxo de estados
```

---

## Regras de implementacao

- Nenhuma chamada de API para calculos (calculos ficam no `lib/calculos.ts` ou, na versao com backend, via API — ver prompt `05-backend-calculos-v2.prompt.md`)
- Todo acesso a localStorage centralizado em `lib/storage.ts`
- O cliente NUNCA ve detalhes tecnicos — a separacao e absoluta
- A conversa WhatsApp conduz os 5 parametros na ORDEM EXATA (P1->P2->P3->P4->P5)
- Cada parametro condiciona o seguinte (ex: quartos filtra plantas, terreno filtra plantas)
- Apos os 5 parametros, o orcamento fica em `status: 'aguardando_engenheiro'`
- O cliente so ve resultado quando o engenheiro marca como `status: 'entregue'`
- Apresentar SEMPRE o custo incremental de cada opcional em reais
- O resultado do cliente mostra APENAS: AA, Parcela Price e Tabela de Aportes

---

## Formulas de calculo das 3 saidas do cliente

Implementar em `lib/calculos.ts`:

### Parcela Price (sistema Price — parcelas fixas)
```
taxa_mensal = (1 + taxa_juros_anual)^(1/12) - 1
n = prazo_maximo_meses (ex: 420 meses = 35 anos)
valor_financiado = preco_final × percentual_maximo_financiavel
parcela_price = valor_financiado × [taxa_mensal × (1+taxa_mensal)^n] / [(1+taxa_mensal)^n - 1]
```

### Valor Minimo de Entrada (AA)
```
AA = preco_final - valor_financiado
   = preco_final × (1 - percentual_maximo_financiavel)
```
Para MCMV: aportes concentrados nos primeiros meses
Para SBPE: aportes diluidos em parcelas iguais mensais

### Tabela de Aportes Mensais
```
Para cada mes i de 1 a N (tempo_obra_meses):
  repasse_financiamento[i] = valor_financiado × percentual_fase[i]
  aporte_proprio[i] = custo_mes[i] - repasse_financiamento[i]
  desembolso_total[i] = aporte_proprio[i] + repasse_financiamento[i]

Onde percentual_fase[i] segue a distribuicao:
  - MCMV: aportes proprios concentrados nos meses iniciais
  - SBPE: aportes proprios diluidos igualmente ao longo dos meses
```

---

## Resultado esperado

Ao final, o cliente deve conseguir:
1. Cadastrar-se com nome, telefone, email, municipio e modalidade de financiamento
2. Informar os 5 parametros sequenciais sobre o projeto (terreno, quartos, planta, opcionais, personalizacoes)
3. Aguardar enquanto o engenheiro trabalha (status visual claro)
4. Receber APENAS as 3 saidas: valor minimo de entrada (AA), parcela mensal ao banco (Price) e tabela de aportes mensais
5. Consultar orcamentos salvos com status atualizado
6. NAO ver nenhum detalhe tecnico do calculo (SINAPI, cenarios, bonus, encargos, BDI, custos intermediarios)
