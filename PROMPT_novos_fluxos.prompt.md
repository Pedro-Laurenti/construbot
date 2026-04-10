---
mode: agent
description: Implementa três novos fluxos de chat na plataforma ConstruBot
---

# Tarefa: Implementar 3 novos fluxos de chat no ConstruBot

## Contexto do projeto

O ConstruBot é uma plataforma web (Next.js 16 + TypeScript + DaisyUI v4 + Tailwind v3) onde o usuário conversa com bots para resolver tarefas relacionadas a construção civil no Brasil. O layout é idêntico ao WhatsApp Web: sidebar esquerda com a lista de conversas, janela direita com o chat ativo.

### Stack e regras obrigatórias

- **Framework**: Next.js 16, TypeScript estrito, `"use client"` apenas onde necessário
- **Estilo**: DaisyUI v4 + Tailwind v3, tema `"whatsapp"` (dark)
  - Inputs: `<input className="input w-full" />` dentro de `<fieldset className="fieldset"><legend className="fieldset-legend">Label</legend>...</fieldset>`
  - Inputs inline (no rodapé do chat): `<input className="input input-bordered flex-1 text-sm" />`
  - Botões de opção em grade/lista: `className="btn btn-secondary hover:btn-primary ..."`
  - Botão primário de envio: `className="btn btn-primary btn-circle"`
  - Cards de resultado: `className="card bg-base-300"` + `className="card-body"`
  - Badges: `className="badge badge-ghost"`, `"badge badge-primary"`, etc.
- **Ícones**: `react-icons/ri` (Remix Icons) — NÃO usar outras bibliotecas
- **Protótipo**: toda a lógica é 100% client-side, nenhuma chamada de API real.
  Usar dados mockados/calculados localmente exatamente como `calcularOrcamento()` em `lib/botScripts.ts`.
- **Padrão de componente**: seguir fielmente o `ChatWindow.tsx` — chat de cotação existente.
  Cada janela de chat é um componente com:
  1. Header com título + avatar do bot + botão de opções (três pontinhos)
  2. Área de mensagens com scroll (`chat chat-start/chat-end`, `chat-bubble`, `chat-image`)
  3. Rodapé dinâmico: troca entre inputs especializados conforme o step atual
  4. Tela de início (`StartPrompt`) antes de o usuário iniciar

---

## Arquivos existentes que precisam ser MODIFICADOS

### `frontend/types/index.ts`
Adicionar os 3 novos IDs ao union type:
```ts
export type ConversationId = "cotacao" | "engenheiro" | "calculadora" | "checklist" | "financiamento";
```

### `frontend/lib/botScripts.ts`
Adicionar no final do arquivo os scripts e funções de cálculo para os 3 fluxos (ver detalhes de cada fluxo abaixo).

### `frontend/components/Sidebar.tsx`
Adicionar 3 novos itens ao array `NAV_ITEMS`:
```ts
{
  id: "calculadora",
  label: "Calculadora de Materiais",
  sublabel: "Estime quantidades de materiais",
  icon: <RiBrickLine size={22} />,
  avatarBg: "#d97706",
},
{
  id: "checklist",
  label: "Checklist de Documentação",
  sublabel: "Alvarás e documentos da obra",
  icon: <RiFileListLine size={22} />,
  avatarBg: "#7c3aed",
},
{
  id: "financiamento",
  label: "Simulador de Financiamento",
  sublabel: "Simule parcelas e renda mínima",
  icon: <RiBankLine size={22} />,
  avatarBg: "#0891b2",
},
```
Importar os ícones necessários de `react-icons/ri`.

### `frontend/app/page.tsx`
- Importar os 3 novos componentes
- Adicionar os 3 novos estados de conversa em `loadSession()` / `AppSession`
- Adicionar os 3 novos `else if (selectedId === "X")` no bloco de renderização da janela direita

### `frontend/lib/session.ts`
Garantir que as conversas dos 3 novos IDs sejam inicializadas com `defaultConversationState()` em `loadSession()`.

---

## Arquivos novos a CRIAR

### `frontend/components/CalculadoraWindow.tsx`
### `frontend/components/ChecklistWindow.tsx`
### `frontend/components/FinanciamentoWindow.tsx`

---

## Fluxo 1 — Calculadora de Materiais (`CalculadoraWindow.tsx`)

### Propósito
O usuário informa o cômodo, dimensões e tipo de material → o bot calcula automaticamente a quantidade necessária com fator de desperdício de 12%.

### Fluxo de conversa (step a step)

**Step 0 — Seleção do cômodo/área**
- Bot diz: `"Olá! Sou o Assistente de Materiais. Vou calcular a quantidade de materiais para você. Qual área ou cômodo vamos calcular?"`
- Input: grade de botões com opções:
  - `Quarto`, `Sala`, `Cozinha`, `Banheiro`, `Área de serviço`, `Garagem`, `Outro`
- Ao selecionar "Outro": exibir `<input className="input input-bordered flex-1 text-sm" />` para digitar
- Resposta do usuário entra no chat como mensagem normal

**Step 1 — Dimensões**
- Bot diz: `"Perfeito! Informe as dimensões do ambiente (largura × comprimento em metros)."`
- Input: dois campos numéricos lado a lado (Largura + Comprimento) + botão de confirmar
- Calcular e exibir a área: `"Entendido: ${larg} × ${comp} = ${(larg*comp).toFixed(1)} m²."`

**Step 2 — Material desejado**
- Bot diz: `"Qual material você quer calcular?"`
- Input: grade de botões:
  - `Cerâmica/Porcelanato (piso)`, `Cerâmica (parede)`, `Tinta (parede)`, `Cimento (reboco)`, `Tijolo/Bloco`, `Areia (m³)`

**Step 3 — RESULTADO (exibido como card no chat)**
- Bot diz: `"Aqui está o cálculo com 12% de fator de desperdício:"`
- Exibir `MateriaisResultCard` dentro da bolha/área de mensagens (igual ao QuoteResultCard)

#### Cálculos mockados (todos com fator 1.12 de desperdício):

```ts
// Cerâmica/Porcelanato piso:   área × 1.12 → resultado em m²
// Cerâmica parede (assumir pé-direito 2,6m): perímetro × 2.6 × 1.12 → m²
//   perímetro = 2 × (larg + comp)
// Tinta parede:   perímetro × 2.6 × 1.05 → m²  (rende 12 m²/litro → litros)
// Cimento reboco: área × 15 × 1.12 → kg  (15 kg/m²)
// Tijolo/Bloco:   área × 25 × 1.12 → unidades  (25 blocos/m²)
// Areia:          área × 0.04 × 1.12 → m³
```

#### `MateriaisResultCard` — estrutura visual:
- Card `bg-base-300` com título do material e ícone
- Linha principal: quantidade calculada em destaque (`text-primary text-2xl font-bold`)
- Linha secundária: área base + fator de desperdício aplicado
- Badge `badge-ghost`: nome do cômodo
- Botão `btn btn-secondary w-full` no final: `"Calcular outro material"` → reinicia do step 2
- Botão `btn btn-ghost w-full`: `"Novo cômodo"` → reinicia do step 0

---

## Fluxo 2 — Checklist de Documentação (`ChecklistWindow.tsx`)

### Propósito
O bot pergunta tipo de obra e município → gera uma lista de documentos e etapas burocráticas necessárias no Brasil, marcáveis como concluídas (checkboxes).

### Fluxo de conversa

**Step 0 — Tipo de obra**
- Bot diz: `"Olá! Sou o Assistente de Documentação. Vou gerar o checklist de documentos necessários para sua obra. Qual é o tipo de obra?"`
- Input: grade de botões (igual ao `TipoObraInput` do ChatWindow):
  - `Casa térrea`, `Sobrado`, `Comercial`, `Reforma`, `Galpão`

**Step 1 — Porte da obra**
- Bot diz: `"Qual é o porte da obra?"`
- Input: 3 botões:
  - `Pequeno (até 70 m²)`, `Médio (70 – 300 m²)`, `Grande (acima de 300 m²)`

**Step 2 — Estado (UF)**
- Bot diz: `"Em qual estado a obra será realizada? (Isso afeta requisitos de alvará.)"`
- Input: `<input className="input input-bordered flex-1 text-sm" />` para digitar a UF (2 letras, uppercase)
- Aceitar qualquer UF — texto mockado

**Step 3 — RESULTADO: ChecklistCard exibido no chat**
- Bot diz: `"Aqui está o checklist de documentação para a sua obra. Marque cada item conforme for concluindo:"`
- O card fica permanentemente visível no chat (não some), sendo interativo

#### Checklist mockado — gerar com base no tipo e porte:

```ts
// Sempre incluir (base):
const BASE_DOCS = [
  { id: "matricula",    label: "Matrícula do terreno atualizada (Cartório de Registro de Imóveis)" },
  { id: "iptu",         label: "IPTU do terreno (comprovante de quitação)" },
  { id: "rg_cpf",       label: "RG e CPF do proprietário" },
  { id: "art",          label: "ART (Anotação de Responsabilidade Técnica) do engenheiro responsável" },
  { id: "proj_arq",     label: "Projeto arquitetônico aprovado pela prefeitura" },
  { id: "alvara",       label: "Alvará de construção emitido pela prefeitura" },
];

// Adicionar se tipo !== "Reforma":
const DOCS_NOVA_CONSTRUCAO = [
  { id: "proj_estrut",  label: "Projeto estrutural (fundações, vigas, pilares)" },
  { id: "proj_hidra",   label: "Projeto hidrossanitário" },
  { id: "proj_eletro",  label: "Projeto elétrico" },
];

// Adicionar se porte !== "Pequeno":
const DOCS_MEDIO_GRANDE = [
  { id: "eia",          label: "Licença ambiental / consulta viabilidade ambiental" },
  { id: "bombeiros",    label: "Aprovação do Corpo de Bombeiros (PPCI)" },
];

// Adicionar sempre ao final:
const DOCS_FINAL = [
  { id: "habite_se",    label: "Habite-se (após conclusão da obra)" },
  { id: "averbacao",    label: "Averbação da construção no Registro de Imóveis" },
];
```

#### `ChecklistCard` — estrutura visual:
- Card `bg-base-300` com header mostrando tipo de obra + UF como badges
- Lista de itens com `<input type="checkbox" className="checkbox checkbox-primary checkbox-sm" />` clicável
- Contador `"X de Y concluídos"` atualizado em tempo real
- Barra `<progress className="progress progress-primary" />` mostrando % de conclusão
- Quando 100%: exibir `<div className="alert alert-success">` com mensagem de parabéns
- Os checkboxes devem ser **funcionais** (state local no componente)

---

## Fluxo 3 — Simulador de Financiamento (`FinanciamentoWindow.tsx`)

### Propósito
O usuário informa o valor da obra e seu perfil → o bot simula parcelas pelo sistema SAC e Price, mostrando tabela comparativa e renda mínima exigida.

### Fluxo de conversa

**Step 0 — Valor da obra**
- Bot diz: `"Olá! Sou o Assistente de Financiamento. Vou simular as condições de crédito para sua obra. Qual é o valor total estimado da obra?"`
- Input: botões de atalho com valores comuns + campo numérico livre:
  - Atalhos: `R$ 150 mil`, `R$ 300 mil`, `R$ 500 mil`, `R$ 800 mil`, `R$ 1 milhão`
  - Campo numérico: `<input className="input input-bordered flex-1 text-sm" placeholder="Ou digite o valor (R$)" />`

**Step 1 — Entrada disponível (%)**
- Bot diz: `"Qual percentual você tem disponível para entrada? (Mínimo 20% para financiamento habitacional)"`
- Input: slider `<input type="range" className="range range-primary" min={20} max={80} step={5} />` + exibir o valor em tempo real como `"20% = R$ XX.XXX"`

**Step 2 — Prazo desejado (anos)**
- Bot diz: `"Em quantos anos deseja quitar o financiamento?"`
- Input: botões de seleção:
  - `10 anos`, `15 anos`, `20 anos`, `25 anos`, `30 anos`

**Step 3 — Taxa de juros anual**
- Bot diz: `"Qual taxa de juros anual você espera negociar? (referência: Caixa Econômica cobra 8,5% a 11% a.a. dependendo do perfil)"`
- Input: slider `range range-primary` de 7% a 14%, passo 0,5%, exibindo valor em tempo real

**Step 4 — RESULTADO: FinanciamentoResultCard**
- Bot diz: `"Aqui está a simulação de financiamento para a sua obra:"`

#### Cálculos:

```ts
// Valor financiado = valorObra × (1 - entrada/100)
// Sistema Price (parcela fixa):
//   pmt = PV × (i × (1+i)^n) / ((1+i)^n - 1)
//   onde i = taxaAnual/12/100, n = prazoAnos × 12
// Sistema SAC (amortização constante):
//   amortizacao = PV / n
//   primeiraParcelaSAC = amortizacao + (PV × i)
//   ultimaParcelaSAC = amortizacao + (amortizacao × i)
// Renda mínima exigida: parcela × (1 / 0.30) → comprometimento máx 30%
// Total pago Price: pmt × n
// Total pago SAC: PV + (PV × i × (n+1) / 2)
```

#### `FinanciamentoResultCard` — estrutura visual:
- Header: valor financiado + prazo em destaque
- Duas colunas lado a lado (grid-cols-2) — **Sistema Price** vs **Sistema SAC**:
  - Parcela 1ª / fixa: `text-primary font-bold text-xl`
  - Última parcela (SAC): valor menor destacado como vantagem (`text-success`)
  - Total pago ao final
  - Juros totais pagos
- Linha separadora com `divider`
- Seção "Renda mínima exigida": `text-warning font-semibold`
- Aviso legal: `<div className="alert bg-secondary text-xs">` com texto: `"⚠️ Simulação baseada no sistema SFH/Caixa. Valores reais variam conforme análise de crédito. Consulte seu gerente bancário."`
- Botão `btn btn-primary w-full`: `"Nova simulação"` → reinicia do step 0

---

## Padrões de código obrigatórios (seguir exatamente)

### Estrutura de cada componente `XxxWindow.tsx`:

```tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { Ri... } from "react-icons/ri";
import type { ConversationState, ChatMessage } from "@/types";
import { formatTimestamp, generateId } from "@/lib/botScripts";

// 1. MessageBubble — idêntico ao ChatWindow, com chat-start/chat-end + chat-bubble
// 2. StartPrompt — tela inicial com avatar, título, descrição e btn btn-primary
// 3. Funções de input especializadas (ex: ValorInput, EntradaInput, PrazoInput...)
// 4. ResultCard — componente interno com o card de resultado
// 5. export default function XxxWindow({ state, onStateChange }: Props)
//    — com scrollRef, useEffect para scroll automático
//    — lógica de steps controlada por `state.cotacaoStep` (reutilizar o campo existente)
//    — renderização condicional do input no rodapé
```

### Adição de mensagens no chat:
```ts
function addBotMsg(text: string, base: ConversationState): ConversationState {
  const msg: ChatMessage = { id: generateId(), sender: "bot-cotacao", text, timestamp: formatTimestamp() };
  return { ...base, messages: [...base.messages, msg] };
}
function addUserMsg(text: string, base: ConversationState): ConversationState {
  const msg: ChatMessage = { id: generateId(), sender: "user", text, timestamp: formatTimestamp() };
  return { ...base, messages: [...base.messages, msg] };
}
```

### Cards de resultado sempre renderizados dentro do fluxo de mensagens:
O card **não** é uma mensagem de texto — é renderizado condicionalmente no `<main>` quando `state.cotacaoStep` está no step de resultado, abaixo das mensagens, antes do rodapé. Idêntico a como `<QuoteResultCard />` é usado no `ChatWindow.tsx`.

### DaisyUI v4 — inputs:
- **NUNCA** usar `<label className="input">` wrapper (isso é DaisyUI v5)
- Inputs simples: `<input className="input w-full" />` dentro de `<fieldset>`
- Inputs no rodapé do chat: `<input className="input input-bordered flex-1 text-sm" />`
- Checkboxes: `<input type="checkbox" className="checkbox checkbox-primary checkbox-sm" />`
- Sliders: `<input type="range" className="range range-primary" />`

---

## Ordem de execução

1. Editar `types/index.ts` — adicionar 3 IDs ao union
2. Editar `lib/botScripts.ts` — adicionar scripts e funções de cálculo
3. Editar `lib/session.ts` — inicializar novos estados
4. Criar `components/CalculadoraWindow.tsx`
5. Criar `components/ChecklistWindow.tsx`
6. Criar `components/FinanciamentoWindow.tsx`
7. Editar `components/Sidebar.tsx` — adicionar 3 itens ao NAV_ITEMS
8. Editar `app/page.tsx` — importar e renderizar os 3 novos componentes
9. Verificar com `get_errors` em todos os arquivos modificados/criados

---

## Critérios de aceitação

- [ ] Os 3 novos itens aparecem na sidebar e são clicáveis
- [ ] Cada fluxo inicia com a tela de StartPrompt
- [ ] Cada step exibe mensagem do bot no chat + input correto no rodapé
- [ ] O card de resultado é exibido ao final de cada fluxo
- [ ] Nenhum erro TypeScript em nenhum arquivo
- [ ] DaisyUI v4 correto em todos os inputs (sem `<label className="input">`)
- [ ] Sem chamadas de API — tudo mockado/calculado localmente
