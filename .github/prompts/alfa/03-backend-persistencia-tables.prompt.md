# Backend — Camada de Persistência Azure Tables

Escopo: implementar cliente Azure Tables em Python (`azure-data-tables`) com autenticação via `DefaultAzureCredential` (managed identity em produção, fallback para connection string em dev). Repositórios por entidade (CRUD + query por PK). Serialização para tipos não-nativos (datas, nested JSON). Testes de integração com Azurite local.
