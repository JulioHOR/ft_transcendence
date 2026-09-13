#!/bin/bash
set -e

echo "Waiting for database..."
python3 -c "import app; app.wait_db()"

echo "Starting backend (gunicorn, 1 worker) on port ${BACKEND_INTERNAL_PORT}..."
# 1 worker: o estado das partidas vive em memória do processo.
# threading mode + simple-websocket → worker sync padrão serve WebSocket.
exec gunicorn \
    --worker-class gthread \
    --workers 1 \
    --threads 32 \
    --bind "0.0.0.0:${BACKEND_INTERNAL_PORT}" \
    --timeout 0 \
    --graceful-timeout 10 \
    app:app
