# Ingestão SINAPI — ETL + Schema Versionado

Escopo: parser dos arquivos oficiais da Caixa (ISE insumos × 27 UFs, composições analíticas sem/com encargos, relatório de coeficientes). Normalização, validação de integridade, carga idempotente em Tables com `sinapiRef` (ex.: `2026-01`). Staging → produção com rollback. Suporte a upload manual de XLSX/CSV como primeiro caminho (desbloqueia 07/08 antes do watcher existir). Substituir `INSUMOS_SINAPI` e `COMPOSICOES_ANALITICAS` de `mockData.ts`.
