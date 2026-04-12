---
description: "Separar fluxos em 3 conversas distintas + edição + navegação entre fluxos"
agent: "agent"
model: Claude Sonnet 4.6 (copilot)
---

# REGRAS:

Leia antes de qualquer alteração:
- [backend.instructions.md](../instructions/backend.instructions.md)
- [frontend.instructions.md](../instructions/frontend.instructions.md)
- [rules.instructions.md](../instructions/rules.instructions.md)

---

# CONTEXTO DO PROTÓTIPO ATUAL

- `ConversationId = "cotacao" | "engenheiro"` — 2 conversas na sidebar
- `ChatWindow.tsx` mistura dois fluxos: onboarding (coleta nome/telefone/email, sender `bot-onboarding`, label verde "Informações iniciais") + cotação (7 perguntas de obra, sender `bot-cotacao`, label azul "Assistente de Cotação")
- `EngineerWindow.tsx` já é um componente separado
- `userProfile` (name, phone, email) fica salvo dentro de `conversations.cotacao.userProfile`
- `session.ts` inicializa `conversations: { cotacao, engenheiro }`

---

# MUDANÇAS NECESSÁRIAS

## 1. `types/index.ts`

- Alterar `ConversationId = "cotacao" | "engenheiro"` para `ConversationId = "inicial" | "cotacao" | "engenheiro"`
- Mover `userProfile: Partial<UserProfile>` de `ConversationState` para o nível de `AppSession` (campo `userProfile: Partial<UserProfile>`)
- Remover campos `onboardingComplete` e `onboardingStep` de `ConversationState` — esses campos agora ficam inferidos pelo estado da conversa `"inicial"`
- Adicionar campo `cotacaoComplete: boolean` em `ConversationState` para saber se o fluxo de cotação já foi concluído ao menos uma vez

## 2. `lib/session.ts`

- Atualizar `defaultSession()` para incluir `userProfile: {}` no nível raiz e inicializar `conversations: { inicial: defaultConversation(), cotacao: defaultConversation(), engenheiro: defaultConversation() }`
- Remover `onboardingComplete`, `onboardingStep`, `userProfile` de `defaultConversation()`
- Adicionar `cotacaoComplete: false` em `defaultConversation()`

## 3. `components/Sidebar.tsx`

- Adicionar terceiro item em `NAV_ITEMS` antes de "cotacao":
  ```ts
  {
    id: "inicial",
    label: "Assistente inicial",
    sublabel: "Informações sobre você",
    icon: <MdPerson size={22} />,
    avatarClass: "bg-success text-success-content",
  }
  ```
- A ordem na sidebar deve ser: `inicial` → `cotacao` → `engenheiro`

## 4. `components/ChatWindow.tsx` — remover fluxo de onboarding

- Remover completamente o fluxo de onboarding (passos `ONBOARDING_STEPS`, componente `OnboardingInput`, lógica de `onboardingStep`, etc.)
- O componente agora recebe `userProfile` via prop para exibir o nome do usuário se necessário
- O fluxo começa diretamente na `StartPrompt` e nas perguntas de cotação
- Ao final (após exibir `QuoteResultCard`), renderizar um botão:
  ```tsx
  <button onClick={onGoToEngineer} className="btn btn-info btn-wide rounded-full gap-2">
    Falar com um Engenheiro
    <MdChevronRight size={18} />
  </button>
  ```
- Se `cotacaoComplete === true` (segunda visita), ao abrir a conversa mostrar tela diferente da `StartPrompt`: exibir resumo das respostas anteriores com um botão "Refazer cotação" (limpa as mensagens e `cotacaoStep`) e um botão "Ver resultado anterior" (rola até o `QuoteResultCard` salvo nas mensagens)
- Ao concluir o fluxo, chamar `onCotacaoComplete()` (nova prop) para setar `cotacaoComplete: true` no estado da conversa

## 5. Criar `components/InicialWindow.tsx` (novo componente)

- Baseado na lógica de onboarding extraída de `ChatWindow.tsx`
- Usa `ONBOARDING_STEPS` de `botScripts.ts`
- Recebe props: `state: ConversationState`, `onStateChange`, `userProfile: Partial<UserProfile>`, `onProfileChange(profile: Partial<UserProfile>)`, `onGoToCotacao: () => void`
- Fluxo normal (primeira vez): 3 perguntas (nome → telefone → email) + mensagem de conclusão + botão "Iniciar Cotação"
- Fluxo de edição (segunda vez, quando `userProfile.name` já existe): exibir os dados atuais e permitir editar campo a campo (mesmo formulário `OnboardingInput`, mas pré-preenchido)
  - Mostrar tela inicial diferente com: "Bem-vindo de volta, {name}! Seus dados:" e os 3 campos preenchidos
  - Botão "Editar informações" → abre o fluxo de re-coleta
  - Botão "Continuar para cotação" → chama `onGoToCotacao()`
- Ao concluir (nova ou edição), salvar via `onProfileChange` e exibir botão "Iniciar Cotação" que chama `onGoToCotacao()`
- Avatar/cor do bot: `bg-success text-success-content`
- Label do bot nas mensagens: "Assistente inicial" com cor `text-success`

## 6. `app/page.tsx`

- Atualizar `selectedId` para `ConversationId` com valor inicial `"inicial"`
- Passar `userProfile` (do nível raiz da session) como prop para `InicialWindow` e `ChatWindow`
- Adicionar handler `handleProfileChange` que atualiza `session.userProfile`
- Renderizar `InicialWindow` quando `selectedId === "inicial"`, `ChatWindow` quando `"cotacao"`, `EngineerWindow` quando `"engenheiro"`
- `userName` agora vem de `session.userProfile.name` em vez de `session.conversations.cotacao.userProfile.name`
- Passar `onGoToCotacao={() => setSelectedId("cotacao")}` para `InicialWindow`
- Passar `onGoToEngineer={() => setSelectedId("engenheiro")}` para `ChatWindow`

## 7. `lib/botScripts.ts`

- Mover `ONBOARDING_STEPS` para continuar existindo (será usado por `InicialWindow`)
- Sem outras alterações

---

# COMPORTAMENTO ESPERADO

### Fluxo "Assistente inicial" (`InicialWindow`)
- Primeira vez: coleta nome → telefone → email → mensagem "Tudo pronto! Agora vamos para a cotação." → botão "Iniciar Cotação" → `setSelectedId("cotacao")`
- Segunda vez em diante: exibe dados salvos, permite editar, botão "Ir para cotação"

### Fluxo "Assistente de cotações" (`ChatWindow`)
- Começa com `StartPrompt` (sem mais passar pelo onboarding)
- Ao fim do fluxo (após resultado): botão "Falar com um Engenheiro" → `setSelectedId("engenheiro")`
- Segunda vez em diante: exibe tela de revisão com opção de refazer

### Fluxo "Engenheiro" (`EngineerWindow`)
- Sem mudanças no funcionamento atual
- Sem botão de redirecionamento necessário (é o fluxo final)