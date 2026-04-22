# Frontend — Remover localStorage, consumir API

Escopo: substituir `loadStorage`/`saveStorage`/`loadEngineerData`/`saveEngineerData` por chamadas HTTP (`lib/api.ts` real com fetch + auth token + retry). Cache/state management (React Query ou SWR). Migration script para importar dados existentes de `localStorage` para Tables na primeira abertura pós-deploy.
