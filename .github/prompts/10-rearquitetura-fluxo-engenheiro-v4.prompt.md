---
agent: 'agent'
description: 'Rearquitetura completa do fluxo do engenheiro com foco em consistência de dados, clareza de jornada E2-E6 e experiência operacional de alto nível.'
---

# Tarefa: Reimaginar o fluxo do ENGENHEIRO (dados + UX)

## Leitura obrigatória

Leia e obedeça integralmente todos os arquivos em `.github/instructions/` antes de alterar qualquer código.

Também use como referência os prompts anteriores do repositório em `.github/prompts/`, sem repetir soluções já tentadas de forma literal.

## Contexto consolidado

A solução atual já possui base funcional e vários componentes no módulo `frontend/components/engenheiro`, porém o fluxo de trabalho ainda apresenta problemas de previsibilidade, rastreabilidade e continuidade operacional.

Principais sintomas observados em código:

1. Estado misto entre contexto global e contexto por orçamento.
2. Módulos que funcionam em paralelo ao wizard e geram dados não vinculados ao orçamento ativo.
3. Validações de etapa incompletas ou superficiais.
4. Transições de status com semântica inconsistente.
5. Cálculos com partes hardcoded que ignoram parâmetros globais alteráveis.
6. UI densa, com excesso de decisões simultâneas e baixa orientação para o próximo passo.
7. Pouca visibilidade de risco de dados (fallback SP, ausência de preço, premissas de cálculo).
8. Ausência de trilha clara de auditoria por decisão de engenharia.

## Objetivo macro

Transformar o módulo ENGENHEIRO em uma experiência guiada por orçamento, com consistência de dados ponta a ponta e UX orientada a decisões.

O engenheiro deve conseguir:

1. Entender em segundos em que etapa está.
2. Saber exatamente o que falta para avançar.
3. Revisar impacto de escolhas sem perder contexto.
4. Entregar resultado com confiança e rastreabilidade.

## Princípios de redesign

1. Um orçamento, uma fonte de verdade.
2. Toda etapa precisa produzir artefato persistido e validável.
3. Avanço sempre condicionado por critério explícito.
4. Visual orientado por risco e pendência.
5. Edição reversível com invalidação controlada de etapas futuras.
6. Transparência de premissas financeiras e de composição.
7. Zero ambiguidade entre modo ferramenta e modo orçamento.

## Mudanças estruturais de dados (alta prioridade)

1. Migrar para modelo centrado em `orcamentosEngenheiro[orcamentoId]` como fonte principal.
2. Desacoplar gradualmente `calculoMOResults`, `calculoMOConfigs`, `calculoMatConfigs` globais.
3. Vincular explicitamente qualquer cálculo ao `orcamentoClienteId`.
4. Persistir snapshots de parâmetros globais por orçamento no momento da primeira análise.
5. Adicionar versionamento de parâmetros usados em cada etapa (`versaoParametrosE2`, `versaoParametrosE4`, etc.).
6. Adicionar checksum simples por etapa para detectar inconsistência entre dependências.
7. Registrar transições de etapa com `logEtapas` enriquecido: etapa, data, usuário, motivo da transição.
8. Persistir motivo de reabertura quando orçamento entregue voltar para edição.
9. Incluir campo de integridade da etapa (`statusValidacaoEtapa`) com erros e avisos.
10. Criar mecanismo de migração local para dados legados já salvos em localStorage.

## Mudanças de arquitetura de fluxo

1. Unificar entrada operacional pelo módulo de gestão de orçamentos.
2. Converter o wizard em motor de etapas com regras declarativas por etapa.
3. Cada etapa define:
   1. pré-condições
   2. requisitos de conclusão
   3. dependências de invalidação
   4. artefato de saída
4. Implementar invalidação em cascata quando etapa anterior for alterada.
5. Exibir modal de impacto antes de invalidar etapas seguintes.
6. Permitir navegação livre apenas para etapas concluídas ou etapa atual.
7. Bloquear avanço com diagnóstico textual específico por item pendente.
8. Reforçar transição de status:
   1. aguardando_engenheiro
   2. em_calculo
   3. entregue
9. Padronizar semântica visual de status em todos os módulos e tabelas.

## Mudanças de UX de alta alavanca

1. Cabeçalho fixo de contexto do orçamento com cliente, UF, planta, data, status, etapa atual.
2. Painel lateral de pendências em tempo real por etapa.
3. Barra de progresso com percentual real de conclusão por critérios.
4. Área de "Decisões desta etapa" com resumo do que foi escolhido.
5. Área de "Riscos detectados" com prioridade visual (erro, alerta, informação).
6. Botão único de ação primária por etapa (ex.: "Validar e avançar").
7. Evidenciar fallback SP com impacto monetário estimado por serviço.
8. Mostrar diferença entre custo anterior e novo após edição de parâmetro.
9. Introduzir modo foco para tabelas densas (expandir linha ativa e ocultar ruído).
10. Melhorar legibilidade numérica com alinhamento e agrupamento consistente.

## Mudanças específicas por etapa

### E2 Quantitativos

1. Exibir geração automática inicial e destacar campos que exigem revisão humana.
2. Agrupar serviços por macroetapa construtiva.
3. Exibir indicadores de completude por linha (composição, CP, prazo, modalidade).
4. Adicionar ação "aplicar valor em lote" para campos repetitivos.
5. Criar painel de inconsistências de quantitativos.

### E3 SINAPI

1. Navegação por fila de serviços pendentes, não por lista genérica.
2. Exibir origem do preço por insumo: UF atual, fallback SP, editado manualmente.
3. Mostrar aviso de confiabilidade por serviço quando muitos insumos em fallback.
4. Permitir "aprovar com ressalva" e registrar justificativa.
5. Exibir histórico de edição de preço por insumo durante a sessão.

### E4 MO

1. Destacar cenário recomendado automaticamente com justificativa.
2. Separar visualmente entrada de premissas e saída de custo.
3. Mostrar impacto marginal da troca de cenário em prazo e custo.
4. Exibir comparador MEI vs CLT como matriz de decisão prática.
5. Salvar escolha por serviço com carimbo temporal.

### E5 Materiais

1. Importar insumos de E3 com rastreio de origem.
2. Destacar itens sem referência confiável.
3. Validar coerência entre coeficiente, unidade e quantidade.
4. Mostrar total por serviço e contribuição percentual no orçamento.
5. Permitir duplicação de configuração entre serviços similares.

### E6 Precificação final

1. Dividir a tela em quatro blocos claros:
   1. consolidação de custos
   2. fluxo de caixa e INCC
   3. preço final com BDI
   4. saída cliente
2. Exibir gráfico de sensibilidade para INCC e BDI.
3. Simulação rápida de cenários alternativos sem sobrescrever o oficial.
4. Card de "pronto para entrega" com checklist final.
5. Preview fiel da saída que o cliente verá.

## Mudanças no ecossistema de componentes

1. Reduzir duplicação entre modo wizard e modo standalone em MO/Materiais.
2. Extrair helpers de validação por etapa em utilitário central único.
3. Extrair normalizadores de dados para leitura/escrita no storage.
4. Criar adaptador de compatibilidade para formatos antigos de dados.
5. Consolidar componentes redundantes de consolidação e precificação.
6. Reavaliar papel do Precificador: ferramenta separada de laboratório ou entrada formal de orçamento interno.

## Quick wins (executar em até 1 dia)

1. Corrigir vazamento de estado global para cálculos por orçamento.
2. Exibir etapa atual no badge da gestão de orçamentos de forma confiável.
3. Bloquear avanço de etapa com mensagem específica por pendência.
4. Persistir seleção de serviço/aba por orçamento no wizard.
5. Sinalizar fallback SP em todos os pontos críticos.
6. Corrigir qualquer hardcode de custo-hora para ler parâmetros globais.
7. Adicionar resumo compacto fixo do orçamento nas etapas E3-E6.

## Fases de implementação sugeridas

### Fase 0 Estabilização

1. Criar baseline de estado atual e mapear migração.
2. Implementar telemetria mínima local (eventos de etapa).
3. Corrigir bugs críticos de consistência.

### Fase 1 Consistência de dados

1. Centralizar estado por orçamento.
2. Implementar validações declarativas.
3. Introduzir migração de dados legados.

### Fase 2 Fluxo guiado

1. Consolidar wizard como jornada principal.
2. Revisar sidebar e navegação por contexto.
3. Invalidação controlada de etapas dependentes.

### Fase 3 UX avançada

1. Painéis de risco, decisão e pendência.
2. Visualização de impacto em tempo real.
3. Preview final de entrega ao cliente.

### Fase 4 Governança operacional

1. Auditoria de mudanças por etapa.
2. Histórico de revisões e reaberturas.
3. Critérios de qualidade para liberação de entrega.

## Métricas de sucesso

1. Redução de retrabalho por reabertura de orçamento.
2. Redução de tempo médio para concluir E2-E6.
3. Redução de orçamentos entregues com pendência oculta.
4. Aumento de previsibilidade do valor final entre revisões.
5. Diminuição de divergência entre saída de engenharia e visão do cliente.

## Critérios de aceite funcionais

1. Não deve existir cálculo salvo sem vínculo ao orçamento ativo.
2. Não deve ser possível avançar etapa sem artefato mínimo válido.
3. Alterar etapa anterior precisa invalidar dependências posteriores com confirmação.
4. Entrega ao cliente só habilita com checklist final completo.
5. Reabrir orçamento entregue preserva histórico e motivo.

## Critérios de aceite de UX

1. Usuário deve identificar etapa, pendências e próxima ação em menos de 5 segundos.
2. Toda tela de etapa deve mostrar contexto do orçamento.
3. Toda pendência deve apontar item e ação corretiva.
4. Toda decisão crítica deve ter feedback visual imediato.

## Restrições

1. Manter stack atual (Next.js, React, TypeScript, Tailwind, DaisyUI).
2. Manter idioma PT-BR em toda interface.
3. Usar somente ícones de `react-icons/md`.
4. Priorizar reuso e evitar explosão de arquivos.
5. Não introduzir dependências desnecessárias.

## Entregáveis esperados desta tarefa

1. Refactor incremental implementado sem quebrar o fluxo atual do cliente.
2. Código limpo e consistente com padrões do repositório.
3. Jornada do engenheiro mais previsível, guiada e auditável.
4. Base pronta para evoluções futuras sem duplicar estado e lógica.
