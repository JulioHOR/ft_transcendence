#!/bin/bash
set -e

echo "Waiting for database..."
python3 -c "import app; import db; app.wait_db(); db.ensure_schema()"

echo "Starting backend (gunicorn, 1 worker) on port ${BACKEND_INTERNAL_PORT}..."
exec gunicorn \
    --worker-class gthread \
    --workers 1 \
    --threads 32 \
    --preload \
    --bind "0.0.0.0:${BACKEND_INTERNAL_PORT}" \
    --control-socket "${GUNICORN_CONTROL_SOCKET:-/tmp/gunicorn.ctl}" \
    --control-socket-mode 600 \
    --certfile /run/secrets/backend_tls_certificate \
    --keyfile /run/secrets/backend_tls_key \
    --timeout 0 \
    --graceful-timeout 10 \
    app:app
