# 08 — UX: Redução de Densidade do Wizard de Orçamento

## Contexto

O fluxo de engenharia (E2→E6) está funcional, mas excessivamente denso. Todos os elementos são necessários — o problema é a **disposição**: tudo aparece ao mesmo tempo, sobrecarregando o engenheiro. O objetivo é **reorganizar sem remover**, usando colapso progressivo, separação visual e hierarquia clara.

---

## Regras Gerais

- DaisyUI v5 apenas: `collapse`, `collapse-arrow`, `collapse-open`, `details`/`summary` nativos, `divider`, `badge`, `alert`
- Ícones: `react-icons/md` apenas
- Texto em português brasileiro
- Sem comentários no código, sem emojis
- Não alterar lógica de cálculo, apenas layout/apresentação
- O menor número possível de linhas alteradas por arquivo

---

## T1 — OrcamentoWizard.tsx: Cabeçalho compacto

**Problema**: O cabeçalho ocupa ~30% da tela antes de qualquer conteúdo útil. `ResumoParametrosCliente` mesmo colapsado já ocupa uma linha inteira.

**Solução**:

O cabeçalho deve ter **duas linhas fixas**, não mais que isso:

```
Linha 1: [← Voltar] | Cliente · UF · Planta  [badge status]  [data]
Linha 2: StepperEtapas
```

`ResumoParametrosCliente` deve ser removido do cabeçalho do wizard. Em vez disso:
- Renderizá-lo colapsado **dentro do conteúdo de E2**, como primeiro bloco antes do banner, apenas quando `etapaVisivel === 'E2'`
- Nas demais etapas, exibir uma linha de resumo compacta (só texto) acima do título da etapa: `"Cliente · UF · Planta · SINAPI Jan/2026"` como `<p className="text-xs text-base-content/40">`

---

## T2 — QuantitativosServico.tsx (E2): Cartões mais compactos

**Problema**: Cada card de serviço tem 9+ elementos empilhados verticalmente: título, badge, texto de ajuda, 5+ campos de input, linha de SINAPI, botão remover.

**Solução — Layout em 2 linhas por card**:

### Linha 1 (sempre visível):
```
[Fundação]  [badge Planta base]  [qtd: __24__ M3]  [spec1: Sapata Corrida ▼]  [spec2 se houver]  [SINAPI: 104924 auto]  [× remover]
```
Usar `flex items-center flex-wrap gap-3` — tudo inline.

### Linha 2 (colapsável, padrão fechado):
Usar `<details className="collapse collapse-arrow bg-base-200 rounded">` com `<summary>Detalhes</summary>`:
- Texto de ajuda (`SERVICE_HELP`)
- Modalidade (MEI/CLT)
- Especificação 3 (se houver)
- Prazo requerido
- Campo manual de composição (se não mapeado automaticamente)

**Regra**: Se `composicaoBasica` foi preenchida automaticamente, o campo de composição NÃO aparece nem colapsado — apenas o badge `auto` inline na linha 1 é suficiente. Só aparece (no collapse) quando está vazio ou foi preenchido manualmente.

**Badge de composição inline (linha 1)**:
- Mapeado: `<span className="badge badge-info badge-xs font-mono">{row.composicaoBasica}</span><span className="badge badge-ghost badge-xs">auto</span>`
- Pendente: `<span className="badge badge-warning badge-xs">pendente</span>`

O progresso e o banner continuam acima dos grupos.

---

## T3 — ConsultaComposicao.tsx (E3): Tabela mais enxuta

**Problema**: Tabela com 8 colunas (Tipo, Código, Descrição, UN, Coef., Custo Unit. [input], Custo/UN, Total) é ilegível em telas de 1280px. Os service tabs ficam muito largos com badges.

**Solução**:

### Colunas da tabela: 5 (de 8)
Remover as colunas **Tipo** e **Custo/UN**. A nova ordem:
```
Código+Tipo | Descrição | UN | Coef. | Custo Unit. (input) | Total (por serviço)
```
- "Código+Tipo": `<td><span className="font-mono text-xs">{item.codigo}</span><span className={`badge badge-xs ml-1 ${...}`}>{item.tipoItem}</span></td>`
- Coluna "Total" = `item.coeficiente × item.custoUnitario × servicoAtualQtd` (mantida igual)
- Remover coluna "Custo/UN" do JSX (o valor já está implícito)

### Tabs de serviço: compactos
Substituir os botões de tab por uma lista compacta no estilo `<div className="flex gap-1 flex-wrap">`:
- Serviço ativo: `btn-primary btn-xs`
- Confirmado: `btn-ghost btn-xs` + `<MdCheckCircle className="text-success" />`
- Sem composição: `btn-ghost btn-xs` + `<MdWarning className="text-error" />`
- Retirar o `badge-error` com texto "Sem composição (E2)" dos botões — substituir apenas pelo ícone `MdWarning`

### Seção de controles (encargos + UF): linha única inline
Mover encargos + UF para uma `<div className="flex items-center gap-4 flex-wrap mb-3">` sem card wrapper — não precisa de `card bg-base-100 shadow` para 2 controles simples.

---

## T4 — CalculadoraMO.tsx (E4): Config colapsável por padrão

**Problema**: O painel de configuração (5 inputs) + 3 scenario cards + bonus + tabela MEI×CLT aparecem todos de uma vez no mesmo scroll.

**Solução**:

### Layout em 2 colunas (grid):
```tsx
<div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
  {/* Coluna esquerda: tabs de serviço + config colapsável */}
  {/* Coluna direita: cenários + resultado */}
</div>
```

### Config inputs: colapsável, fechado por padrão:
```tsx
<details className="collapse collapse-arrow bg-base-200 rounded">
  <summary className="collapse-title text-sm font-medium py-2 px-3 min-h-0">
    Parâmetros SINAPI
    {config && <span className="text-xs text-base-content/40 ml-2">prod. {config.produtividadeBasica} UN/h</span>}
  </summary>
  <div className="collapse-content">
    {/* os 5 fieldsets + Recalcular button */}
  </div>
</details>
```

### Bonus + MEI×CLT: colapsável, fechado por padrão:
```tsx
<details className="collapse collapse-arrow bg-base-200 rounded">
  <summary className="collapse-title text-sm font-medium py-2 px-3 min-h-0">
    Bônus e Modalidade de Contrato
    {cenAtual && cenAtual.bonusCenario > 0 && <span className="badge badge-success badge-xs ml-2">{formatCurrency(cenAtual.bonusCenario)}</span>}
  </summary>
  <div className="collapse-content">
    {/* BonusBar x3 + MEI×CLT table */}
  </div>
</details>
```

**O que fica sempre visível** na coluna direita:
- 3 `CenarioCard` lado a lado (mantidos como estão)
- Tabela de resultado resumida (apenas as linhas chave: custo/UN MEI, custo/UN CLT, equipe, dias)
- Botão "Salvar escolha"

---

## T5 — CalculadoraMateriais.tsx (E5): Remover tabela de resumo por serviço

**Problema**: A tabela "Resumo por Serviço" criada na sessão anterior aparece ANTES dos 3 totalizadores, adicionando mais uma tabela a uma tela já densa.

**Solução**: Remover a tabela "Resumo por Serviço" completamente. Substituir por uma linha de totais acima dos 3 cards:

```tsx
<div className="flex gap-4 text-xs text-base-content/50 mb-3 flex-wrap">
  {itensLista.map(item => {
    const t = configs[item.id] ? calcularMatEngenheiro(configs[item.id]) : 0
    return (
      <span key={item.id}>
        {item.servico.replace(/_/g, ' ')}: <span className="font-mono text-base-content/70">{formatCurrency(t)}</span>
      </span>
    )
  })}
</div>
```

Manter os 3 totalizadores (Total Materiais, BDI, Preço Final Mat.).

---

## T6 — PrecificacaoFinal.tsx (E6): Blocos colapsáveis

**Problema**: 4 blocos estão todos expandidos ao mesmo tempo — ~80rem de conteúdo vertical.

**Solução**: Blocos 1 e 2 colapsáveis, Blocos 3 e 4 sempre visíveis.

### Bloco 1 — colapsável, fechado por padrão:
```tsx
<details className="collapse collapse-arrow bg-base-100 shadow rounded-2xl">
  <summary className="collapse-title font-semibold py-3 px-4 min-h-0">
    Bloco 1 — Consolidação de Custos Diretos
    <span className="text-xs text-base-content/50 ml-2 font-normal">MEI {formatCurrency(custoDiretoMEI)} · CLT {formatCurrency(custoDiretoCLT)}</span>
  </summary>
  <div className="collapse-content overflow-x-auto">
    {/* tabela + 7 metric cards */}
  </div>
</details>
```

### Bloco 2 — colapsável, fechado por padrão:
```tsx
<details className="collapse collapse-arrow bg-base-100 shadow rounded-2xl">
  <summary className="collapse-title font-semibold py-3 px-4 min-h-0">
    Bloco 2 — Cronograma e Correção INCC
    <span className="text-xs text-base-content/50 ml-2 font-normal">+{formatCurrency(custoDiretoComInccMEI - custoDiretoMEI)} INCC</span>
  </summary>
  <div className="collapse-content">
    {/* fases table + BarChart + numeric table + 3 metric cards */}
  </div>
</details>
```

### Blocos 3 e 4: manter como `<div className="card bg-base-100 shadow">` (sempre visíveis — são os mais acionáveis).

---

## Checklist de Validação

- [ ] Nenhuma lógica de cálculo alterada
- [ ] Todos os campos ainda editáveis (apenas reorganizados ou colapsados)
- [ ] `collapse` usa classes DaisyUI v5 (`collapse`, `collapse-arrow`, `collapse-content`, `collapse-title`)
- [ ] Sem emojis, sem comentários no código
- [ ] Nenhum dado removido — apenas hierarquia visual alterada
- [ ] `get_errors` retorna 0 erros em todos os arquivos alterados
