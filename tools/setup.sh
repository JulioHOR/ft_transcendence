#!/bin/bash

set -e

ENV_FILE="./.env"
ENV_EXAMPLE="./.env.example"
SECRETS_DIR="./secrets"

if [ ! -f "${ENV_FILE}" ]; then
    cp "${ENV_EXAMPLE}" "${ENV_FILE}"
fi

# shellcheck disable=SC1090
set -a
source "${ENV_FILE}"
set +a

mkdir -p "${SECRETS_DIR}"

for secret in db_password flask_secret_key; do
    file_path="${SECRETS_DIR}/${secret}.txt"
    if [ ! -s "${file_path}" ]; then
        openssl rand -hex 32 > "${file_path}"
    fi
done

if [ ! -s "${SECRETS_DIR}/backend.crt" ] || [ ! -s "${SECRETS_DIR}/backend.key" ]; then
    rm -f "${SECRETS_DIR}/backend.crt" "${SECRETS_DIR}/backend.key"
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "${SECRETS_DIR}/backend.key" \
        -out "${SECRETS_DIR}/backend.crt" \
        -subj "/CN=backend" \
        -addext "subjectAltName=DNS:backend" \
        >/dev/null 2>&1
fi

chmod 644 "${SECRETS_DIR}/db_password.txt" \
    "${SECRETS_DIR}/flask_secret_key.txt"
chmod 644 "${SECRETS_DIR}/backend.key"
chmod 644 "${SECRETS_DIR}/backend.crt"

echo "Setup complete."
