# Infraestrutura Azure — Storage Account + Tables + Managed Identity

Escopo: provisionar Storage Account, habilitar Tables, criar Managed Identity (system-assigned no backend + user-assigned reutilizável), configurar RBAC (`Storage Table Data Contributor`), atualizar `deploy.sh` para criar/idempotentemente atualizar esses recursos. Secrets de fallback (connection string) em Key Vault.
