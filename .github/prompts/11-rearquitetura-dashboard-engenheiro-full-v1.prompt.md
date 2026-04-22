---
agent: 'agent'
description: 'Rearquitetura completa de todo o Dashboard do Engenheiro, cobrindo todos os módulos e jornadas, com consistência de dados, UX operacional e governança ponta a ponta.'
---

# Tarefa: Reimaginar TODO o Dashboard do Engenheiro (todos os módulos)

## Leitura obrigatória

Antes de alterar qualquer código, leia e siga integralmente:

- .github/instructions/rules.instructions.md
- .github/instructions/frontend.instructions.md
- .github/instructions/backend.instructions.md
- Prompts anteriores em .github/prompts/, sem repetir soluções literalmente

Este prompt substitui qualquer interpretação limitada ao fluxo de orçamentos. O escopo é o Dashboard do Engenheiro completo.

## Objetivo macro

Transformar o Dashboard do Engenheiro em uma plataforma operacional única, previsível e auditável, com padrões consistentes de dados, status, navegação, UX e tomada de decisão em todos os módulos.

## Escopo obrigatório (todas as páginas e módulos)

Aplicar melhorias em todo o conjunto:

1. Painel Geral
2. Parâmetros Globais
3. Gestão de Orçamentos
4. Wizard E2-E6 (já evoluído, manter e ampliar)
5. SINAPI Insumos (ISE)
6. Consulta de Composição
7. Composições Analíticas
8. Composições Profissionais
9. Calculadora MO avulsa
10. Calculadora Materiais avulsa
11. Gestão de Plantas
12. Precificador
13. Consolidação
14. Sidebar e estrutura de navegação do EngineerApp

## Problema consolidado atual

A aplicação tem ganhos no wizard, mas ainda sofre no restante do dashboard com:

1. Semântica de status e badges divergente entre módulos
2. Falta de padrão de contexto ativo (qual orçamento, qual UF, qual referência)
3. Persistência de estado inconsistente por módulo
4. Riscos não evidenciados de forma homogênea
5. Duplicação de lógica entre modo avulso e modo orçamento
6. Ausência de linguagem visual única de progresso, pendência e decisão
7. Ações críticas sem trilha operacional clara
8. Módulos legados sem aderência ao fluxo guiado já adotado

## Princípios globais de redesign

1. Uma linguagem operacional para todo o dashboard
2. Um padrão único de status, risco, pendência e próxima ação
3. Todo módulo deve ter contexto explícito e persistência previsível
4. Decisões relevantes devem gerar artefato persistido
5. Navegação deve preservar continuidade de trabalho
6. Transparência de premissas técnicas e financeiras em qualquer tela
7. Reuso máximo de componentes e utilitários para evitar divergência

## Arquitetura transversal obrigatória

### 1) Estado e persistência

Padronizar estado por contexto operacional:

1. Contexto por orçamento quando houver orçamento ativo
2. Contexto global para módulos de referência e configuração
3. UI state por módulo persistido por usuário e por orçamento quando aplicável:
   - aba ativa
   - filtros
   - seleção de item/linha
   - ordenação
   - densidade visual ou modo foco
4. Migração legada para formatos antigos de localStorage sem quebra

### 2) Motor de validação e risco compartilhado

Criar e aplicar utilitário central para:

1. statusValidacaoEtapa e statusValidacaoModulo
2. lista de erros, alertas e informações
3. mensagem de ação corretiva por item
4. score simples de prontidão por tela

### 3) Auditoria operacional local

Padronizar eventos de auditoria para todos os módulos:

1. data
2. usuário
3. módulo
4. ação
5. motivo opcional
6. impacto (dados afetados)

Exemplos de eventos:

1. alteração de parâmetro global
2. alteração de composição
3. confirmação de preços
4. reabertura de orçamento
5. entrega ao cliente
6. importação ou edição de planta

## Mudanças de UX globais para todo o dashboard

### 1) Header operacional padrão em todas as telas

Cada módulo deve exibir, no topo:

1. nome do módulo
2. contexto ativo (orçamento, UF, referência SINAPI, data)
3. status operacional
4. próxima ação principal

### 2) Painel padrão de Decisões e Riscos

Toda tela principal deve ter bloco compacto com:

1. Decisões desta tela
2. Riscos detectados (erro, alerta, info)
3. Pendências para avançar ou concluir

### 3) Ação primária única por contexto

Cada tela deve deixar evidente um CTA principal:

1. validar
2. confirmar
3. salvar
4. avançar
5. entregar

### 4) Padrão de feedback visual unificado

1. Semântica consistente de badges e alertas
2. Numeração e moeda sempre legíveis e alinhadas
3. Mesma linguagem para vazio, carregando, erro e sucesso

### 5) Modo foco para telas densas

Aplicar em tabelas e listas grandes:

1. reduzir ruído visual
2. destacar item ativo
3. manter ações essenciais visíveis

## Mudanças específicas por módulo

### Painel Geral

1. Exibir métricas operacionais reais do dashboard inteiro
2. Incluir fila de pendências por módulo
3. Incluir indicadores de risco operacional e integridade de dados
4. Permitir entrada rápida para itens críticos

### Parâmetros Globais

1. Exibir impacto de alteração antes de salvar
2. Versionar parâmetros com histórico simples
3. Destacar campos alterados versus baseline
4. Alertar módulos dependentes quando parâmetro mudar

### Gestão de Orçamentos

1. Colunas padronizadas com etapa, risco, pronto para entrega e bloqueios
2. Filtros por status, etapa, UF e risco
3. Reabertura obrigatória com motivo e trilha de auditoria
4. Ações em lote para triagem operacional

### SINAPI Insumos (ISE)

1. Melhorar filtros e navegação por UF e referência
2. Evidenciar indisponibilidade e fallback
3. Mostrar confiabilidade por item
4. Expor impacto estimado em orçamento quando houver contexto

### Consulta de Composição

1. Navegação orientada por fila de pendências quando em modo orçamento
2. Histórico de edição na sessão
3. Sinalização de fallback com impacto financeiro
4. Justificativa obrigatória para aprovação com ressalva

### Composições Analíticas

1. Busca avançada por código, grupo e descrição
2. Estrutura hierárquica legível com expansão controlada
3. Destaque de itens sem preço
4. Exportação de visão consolidada no padrão da tela

### Composições Profissionais

1. Melhorar comparação entre composições equivalentes
2. Exibir impacto em produtividade, prazo e custo
3. Aplicação em lote por categoria de serviço
4. Rastro de alterações manuais

### Calculadora MO avulsa

1. Diferenciar claramente modo laboratório e modo orçamento
2. Persistir presets reutilizáveis sem contaminar orçamento ativo
3. Exibir comparador de cenários no mesmo padrão do wizard
4. Padronizar linguagem de decisão MEI vs CLT

### Calculadora Materiais avulsa

1. Mesma separação entre laboratório e orçamento
2. Presets de insumos por tipo de serviço
3. Evidenciar itens críticos sem referência confiável
4. Mostrar impacto total e percentual por grupo de insumo

### Gestão de Plantas

1. Melhorar governança de versões de planta
2. Mostrar impacto da planta nos serviços gerados
3. Validações de compatibilidade de parâmetros
4. Melhorar edição sem perder rastreabilidade

### Precificador

1. Definir papel definitivo: laboratório técnico ou etapa formal
2. Se laboratório: isolar estado e deixar explícito
3. Se formal: integrar com fluxo por orçamento sem duplicação
4. Reusar componentes de decisão e risco já padronizados

### Consolidação

1. Consolidar lógica com E6 para evitar redundância
2. Manter uma única fonte de verdade para totais
3. Mostrar divergências entre cenários e revisões
4. Preparar saída operacional para handoff ao cliente

### Sidebar e EngineerApp

1. Melhorar arquitetura de navegação por contexto
2. Exibir sinalização de pendências por módulo
3. Preservar retorno ao último ponto de trabalho
4. Evitar saltos de contexto sem confirmação

## Quick wins globais (até 1 dia)

1. Padronizar badges de status em todos os módulos
2. Adicionar header operacional padrão em todas as telas do engenheiro
3. Persistir filtros e abas por módulo
4. Exibir painel de riscos em módulos críticos além do wizard
5. Revisar hardcodes restantes de parâmetros financeiros
6. Unificar mensagens de bloqueio com diagnóstico específico

## Fases de implementação sugeridas

### Fase A — Base transversal

1. Estado e persistência padronizados
2. Semântica visual unificada
3. Utilitário de validação/risco compartilhado

### Fase B — Núcleo operacional

1. Gestão de Orçamentos
2. Painel Geral
3. Parametrização Global
4. Sidebar e EngineerApp

### Fase C — Módulos técnicos

1. SINAPI
2. Consulta de Composição
3. Composições Analíticas
4. Composições Profissionais

### Fase D — Ferramentas e convergência

1. Calculadoras avulsas
2. Precificador
3. Consolidação
4. Gestão de Plantas

### Fase E — Governança

1. Auditoria consolidada
2. Histórico de alterações por módulo
3. Critérios de qualidade para operação contínua

## Critérios de aceite funcionais (globais)

1. Todo módulo deve indicar claramente contexto ativo
2. Nenhuma ação crítica sem feedback e persistência
3. Estados de status e risco padronizados em toda interface
4. Navegação deve manter continuidade entre sessões
5. Alterações com impacto devem registrar trilha de auditoria
6. Não pode haver duplicidade de fonte de verdade entre módulos equivalentes

## Critérios de aceite de UX (globais)

1. Usuário identifica situação e próxima ação em menos de 5 segundos em qualquer módulo
2. Toda pendência aponta ação corretiva explícita
3. Toda tela crítica exibe decisões e riscos
4. Linguagem visual é consistente em todas as páginas do engenheiro

## Restrições

1. Manter stack atual (Next.js, React, TypeScript, Tailwind, DaisyUI)
2. Manter interface em PT-BR
3. Usar somente ícones de react-icons/md
4. Priorizar reuso e evitar explosão de arquivos
5. Não introduzir dependências desnecessárias
6. Não quebrar o fluxo atual do cliente

## Entregáveis esperados

1. Refactor incremental cobrindo todo o Dashboard do Engenheiro
2. Padrão único de dados, risco, decisão e status em todos os módulos
3. Melhor previsibilidade operacional do time de engenharia
4. Base escalável para novas funcionalidades sem retrabalho estrutural
