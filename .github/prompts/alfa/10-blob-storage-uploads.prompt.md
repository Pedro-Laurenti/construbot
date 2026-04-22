# Blob Storage — Upload de Plantas e Documentos

Escopo: criar containers no mesmo Storage Account (`plantas`, `documentos`, `exports`). Upload via SAS URL gerada pelo backend (evita tráfego grande passar pela API). Redimensionamento server-side de imagens. Remover Data URI de `GestaoPlantasModule.tsx`. Retenção e lifecycle policies.
