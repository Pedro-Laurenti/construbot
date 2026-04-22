# Watcher SINAPI — Descoberta, Revalidação e Notificação

Escopo: subsistema de monitoramento (Azure Function Timer Trigger diário) que vigia a página oficial da Caixa detectando novas referências e republicações. Pipeline: polling → detecção por checksum/etag/data de publicação → download idempotente → chama ETL (09a) → versiona em Tables → notifica admin → emite flag `sinapiAtualizacaoDisponivel` em orçamentos abertos oferecendo revalidação. Histórico de republicações com rastreamento de qual `sinapiRef` cada orçamento entregue consumiu.
