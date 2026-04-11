---
description: Processo obrigatório para publicar uma nova versão do MarketData Monitoramento.
applyTo: "**/package.json"
---

# Publicar uma Nova Versão

## Convenção de versão (SemVer)

| Tipo de mudança | Exemplo | Bump |
|---|---|---|
| Correção de bug | Fix de crash, comportamento errado | `X.Y.Z` → `X.Y.Z+1` (patch) |
| Nova funcionalidade | Nova página, novo endpoint | `X.Y.Z` → `X.Y+1.0` (minor) |
| Quebra de compatibilidade ou migração de dados | Mudança de schema, autenticação | `X.Y.Z` → `X+1.0.0` (major) |

## Passo a passo

### 1. Atualizar a versão no package.json

Edite `frontend/package.json` e incremente o campo `"version"` conforme o SemVer acima.

### 2. Atualizar a página de Novidades

Abra `frontend/app/changelog/page.tsx` e adicione um novo objeto no **início** do array `CHANGELOG`:

```ts
{
  version: '1.2.3',
  date: '10 de abril de 2026',   // data completa por extenso
  changes: [
    { type: 'feat',        description: 'Descrição da novidade' },
    { type: 'improvement', description: 'Descrição da melhoria' },
    { type: 'fix',         description: 'Descrição da correção' },
  ],
}
```

| type | Quando usar |
|---|---|
| `feat` | Nova funcionalidade adicionada |
| `improvement` | Melhoria em funcionalidade existente |
| `fix` | Correção de bug |

### 3. Commit, tag e push

```bash
# Commit com todas as mudanças (incluindo package.json e changelog)
git add .
git commit -m "release: v1.2.3"
git push origin <branch>

# Criar a tag apontando para esse commit
git tag -a v1.2.3 -m "v1.2.3"

# Enviar a tag para o remote (git push NÃO envia tags automaticamente)
git push origin v1.2.3
```

> **Por que tag?** Tags são ponteiros fixos para um commit — diferente de branches, nunca avançam. Permitem voltar exatamente ao estado de qualquer versão lançada com `git checkout v1.2.3`.

### Corrigir uma tag enviada por engano

```bash
git tag -d v1.2.3                  # deleta localmente
git push origin --delete v1.2.3    # deleta no remote
# recrie e reenvie normalmente
```
