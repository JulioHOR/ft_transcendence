#!/bin/bash
set -e

echo "Starting backend on port ${BACKEND_INTERNAL_PORT}..."
exec python3 /app/app.py
