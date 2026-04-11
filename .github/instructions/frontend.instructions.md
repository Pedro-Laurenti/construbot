---
description: Requisitos para implementar novas páginas e funcionalidades no frontend.
applyTo: "frontend/app/**/*.tsx,frontend/components/**/*.tsx"
---

# Nova Página Frontend

## Stack
Next.js 15 + React 19 + TypeScript + Tailwind CSS v4 + DaisyUI v5

## Checklist obrigatório ao criar uma nova página

1. Criar `frontend/app/[rota]/page.tsx`
2. Registrar em `frontend/lib/navigation.ts` (array `menuItems`)
3. Iniciar JSX com `<PageHeader />` (renderiza breadcrumb + título automaticamente)
4. Proteger com `<PermissionGuard resource="/recurso" action="read">` se necessário

## Registro em navigation.ts

```ts
{
  href: "/minha-rota",
  label: "Meu Módulo",
  icon: MdIcone,
  group: "Market Data",           // "Market Data" | "Infraestrutura" | "Sistema"
  requiredPermission: { resource: "/recurso", action: "read" },
  parentHref: "id-do-pai",        // se for sub-item
}
```

Páginas ocultas na sidebar (sub-rotas sem item de menu): usar `showInSidebar: false`.

## Estrutura padrão de página

```tsx
'use client'
import { useState, useEffect } from 'react'
import { fetchWithAuth } from '@/lib/api'
import PageHeader from '@/components/layout/PageHeader'
import QueryControls from '@/components/table/QueryControls'
import DataTable from '@/components/table/DataTable'
import { PermissionGuard } from '@/components/auth/PermissionGuard'
import { useUpdateTasks } from '@/hooks/useUpdateTasks'

export default function MinhaPage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fetchData() {
    setLoading(true)
    try {
      const res = await fetchWithAuth('/api/meu-endpoint')
      const json = await res.json()
      setData(json.data ?? [])
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  const { updating, handleUpdate } = useUpdateTasks({
    apiUrl: '/api/meu-endpoint/atualizar',
    taskName: 'meu_task',
    taskLabel: 'Atualizar Dados',
    onComplete: fetchData,
  })

  useEffect(() => { fetchData() }, [])

  return (
    <PermissionGuard resource="/recurso" action="read">
      <div className="p-6">
        <PageHeader />
        <QueryControls onQuery={fetchData} onUpdate={handleUpdate} updating={updating} />
        {error && <div className="alert alert-error">{error}</div>}
        {data.length > 0 && (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <DataTable columns={columns} data={data} />
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  )
}
```

## Componentes disponíveis (não recriar)

### Layout
| Componente | Arquivo | Uso |
|---|---|---|
| `<PageHeader />` | `components/layout/PageHeader.tsx` | **Sempre o primeiro elemento.** Breadcrumb + título via navigation.ts |
| `<Modal>` | `components/layout/Modal.tsx` | Modal genérico. Props: `isOpen, onClose, title, children, actions?, size?, variant?` |
| `<ConfirmModal>` | `components/layout/ConfirmModal.tsx` | Modal de confirmação com alerta. Props: `isOpen, onClose, onConfirm, title, message` |
| `<Toast>` | `components/layout/Toast.tsx` | Stack de toasts. Props: `messages: ToastMessage[], onRemove(id)` |
| `<Tabs>` | `components/layout/Tabs.tsx` | Tabs boxed. Props: `tabs, activeTab, onChange` |
| `<BadgeList>` | `components/layout/BadgeList.tsx` | Pills removíveis |

`Sidebar`, `Navbar` e `ProcessingStatus` são globais (layout.tsx) — nunca incluir em páginas.

### Tabela
| Componente | Uso |
|---|---|
| `<DataTable columns data initialFilters?>` | Tabela universal com sort, filtros, paginação, CSV export, resize |
| `<QueryControls>` | Card com botões "Consultar" / "Atualizar", seletor de dias úteis / período |
| `<DateSelectorModal>` | Seletor de range de datas (usa `cally`) |

**Definição de coluna:**
```ts
{ key: string; label: string; sortable?: boolean; filterable?: boolean;
  render?: (value, row?) => React.ReactNode; type?: 'text'|'number'|'date' }
```

## API — sempre usar fetchWithAuth

```ts
import { fetchWithAuth, getApiUrl, API_ENDPOINTS } from '@/lib/api'

const res = await fetchWithAuth(getApiUrl('/meu-endpoint'))
// ou com constante já definida:
const res = await fetchWithAuth(API_ENDPOINTS.SAD_PUBLICO)
```

Nunca usar `fetch` diretamente — `fetchWithAuth` injeta o Bearer token e trata expiração.

Novos endpoints: adicionar como constante em `lib/api.ts`.

## Hooks disponíveis (não recriar)

| Hook | Retorno | Uso |
|---|---|---|
| `useUpdateTasks(opts)` | `{ updating, handleUpdate }` | Dispara task no backend + polling via ProcessingContext |
| `usePermissions()` | `{ hasPermission, isAdmin, isOperator, isViewer }` | Verificação de permissão inline |
| `useLogs()` | `{ tasks, stats, markTaskAsViewed }` | Tasks / audit log |
| `useNotifications()` | `{ notifications, stats, markAsRead }` | Notificações |
| `useTheme()` | `{ theme, toggleTheme, isDark }` | Tema claro/escuro |

## Permissões inline

```tsx
import { usePermissions } from '@/hooks/usePermissions'
const { hasPermission } = usePermissions()

{hasPermission('/recurso', 'write') && <button>Editar</button>}
```

### Modelo de permissão

`AuthContext` armazena as permissões do usuário como `PermissionRule[]`:
```ts
interface PermissionRule { route: string; actions: string[] }
```

`hasPermission(resource, action)` verifica se alguma regra cobre o par recurso+action, com suporte a wildcards (`/*` e `/prefix/*`). A API pública (`usePermissions`) não mudou — apenas o formato interno no contexto.

Ao exibir permissões em tela, use `ACTION_LABELS` local para traduzir actions para PT-BR:
```ts
const ACTION_LABELS: Record<string, string> = {
  read: 'Visualizar', write: 'Criar', update: 'Editar',
  delete: 'Excluir', execute: 'Executar',
}
```

## Inputs — padrão obrigatório

```tsx
<fieldset className="fieldset">
  <legend className="fieldset-legend">Label</legend>
  <input type="text" className="input" placeholder="..." />
  <p className="label">Opcional</p>  {/* somente se opcional */}
</fieldset>
```

## Ícones

Somente `react-icons/md`:
```tsx
import { MdAdd, MdEdit, MdDelete, MdRefresh } from 'react-icons/md'
```

## Temas

Dois temas: `mylight` / `mydark`. Sempre usar classes semânticas DaisyUI (`bg-base-100`, `text-base-content`) — nunca cores fixas.

## Sanitização / anti-duplicidade

- Lógica de filtro reutilizável → `lib/filterUtils.ts` (`applyLastBusinessDayFilters`)
- Formatações → `utils/formatters.ts`
- Não criar novo componente de tabela, modal ou toast — usar os existentes
- Estado de toast: array `ToastMessage[]` + helper `addToast` local (padrão das páginas existentes)
- Não usar `localStorage` diretamente — usar `utils/storageGuard.ts`
