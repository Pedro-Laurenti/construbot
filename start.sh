#!/usr/bin/env bash

ORIGINAL_DIR="$(pwd)"
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
    echo ""
    echo "Encerrando..."

    if command -v fuser > /dev/null 2>&1; then
        fuser -k 8000/tcp 2>/dev/null || true
        fuser -k 3000/tcp 2>/dev/null || true
    fi

    if [ -n "$BACKEND_PID" ]; then
        kill -TERM $BACKEND_PID 2>/dev/null || true
        wait $BACKEND_PID 2>/dev/null || true
    fi

    if [ -n "$FRONTEND_PID" ]; then
        kill -TERM $FRONTEND_PID 2>/dev/null || true
        wait $FRONTEND_PID 2>/dev/null || true
    fi

    cd "$ORIGINAL_DIR"
    return 0
}
trap 'cleanup' SIGINT SIGTERM

if command -v fuser > /dev/null 2>&1; then
    fuser -k 8000/tcp 2>/dev/null || true
    fuser -k 3000/tcp 2>/dev/null || true
fi

echo ""

# Caminhos
BACKEND_DIR="backend"
VENV_DIR="$BACKEND_DIR/.venv"
REQUIREMENTS_FILE="$BACKEND_DIR/requirements.txt"
FRONTEND_DIR="frontend"

# --- BACKEND SETUP ---
if [ ! -d "$VENV_DIR" ]; then
    echo "Criando ambiente virtual (.venv)..."
    python3 -m venv "$VENV_DIR"
    "$VENV_DIR/bin/pip" install -r "$REQUIREMENTS_FILE"
else
    echo "✓ Ambiente virtual encontrado"
fi

echo "Iniciando backend (porta 8000)..."
source "$VENV_DIR/bin/activate"
pushd "$BACKEND_DIR" > /dev/null
uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!
popd > /dev/null
cd "$ORIGINAL_DIR"

# --- FRONTEND SETUP ---
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo "Instalando dependências do frontend..."
    pushd "$FRONTEND_DIR" > /dev/null
    npm install
    popd > /dev/null
else
    echo "✓ node_modules encontrado"
fi

echo "Iniciando frontend (porta 3000)..."
pushd "$FRONTEND_DIR" > /dev/null
npm run dev &
FRONTEND_PID=$!
wait $FRONTEND_PID || true
popd > /dev/null
