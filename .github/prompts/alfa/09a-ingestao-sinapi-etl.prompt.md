# Ingestão SINAPI — ETL + Schema Versionado

Escopo: parser dos arquivos oficiais da Caixa (ISE insumos × 27 UFs, composições analíticas sem/com encargos, relatório de coeficientes). Normalização, validação de integridade, carga idempotente em Tables com `sinapiRef` (ex.: `2026-01`). Staging → produção com rollback. Suporte a upload manual de XLSX/CSV como primeiro caminho (desbloqueia 07/08 antes do watcher existir). Substituir `INSUMOS_SINAPI` e `COMPOSICOES_ANALITICAS` de `mockData.ts`.

Durante a transição, o backend pode carregar um lookup temporário e reduzido de produtividade/proporção de ajudante derivado do protótipo (`mockData.ts`) para manter paridade com o frontend. Esta dependência provisória deve ser removida nesta etapa: a origem da verdade passa a ser a base SINAPI ingerida e versionada em Tables, sem leitura indireta nem réplica manual do mock do frontend.
