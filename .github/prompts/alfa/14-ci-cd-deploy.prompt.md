# CI/CD e Deploy

Escopo: pipeline GitHub Actions (lint, test, build, deploy). Ambientes dev/stg/prd com Storage Accounts separados. OIDC federado (sem secrets de longa duração) para deploy. Refatorar `deploy.sh` como entrypoint local; CI usa os mesmos passos via Actions. Estratégia de rollback e feature flags.
