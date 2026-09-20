#!/bin/bash

set -e

ENV_FILE="./.env"
SECRETS_DIR="./secrets"

if [ ! -f "${ENV_FILE}" ]; then
    echo "Missing ${ENV_FILE}"
    exit 1
fi

# shellcheck disable=SC1090
set -a
source "${ENV_FILE}"
set +a

if [ -z "${DOMAIN_NAME}" ]; then
    echo "DOMAIN_NAME is not set in ${ENV_FILE}"
    exit 1
fi

ensure_secret_readable() {
    local file_path="$1"

    if [ -f "${file_path}" ]; then
        chmod 644 "${file_path}"
    fi
}

ensure_secret_file() {
    local file_path="$1"
    local prompt_message="$2"
    local secret_value

    if [ -s "${file_path}" ]; then
        ensure_secret_readable "${file_path}"
        return 0
    fi

    mkdir -p "${SECRETS_DIR}"

    while true; do
        read -r -s -p "${prompt_message}: " secret_value
        printf '\n'

        if [ -n "${secret_value}" ]; then
            printf '%s' "${secret_value}" > "${file_path}"
            chmod 644 "${file_path}"
            return 0
        fi

        echo "Value cannot be empty. Try again."
    done
}

ensure_generated_secret() {
    local file_path="$1"

    if [ -s "${file_path}" ]; then
        ensure_secret_readable "${file_path}"
        return 0
    fi

    mkdir -p "${SECRETS_DIR}"
    openssl rand -hex 32 | tr -d '\n' > "${file_path}"
    chmod 644 "${file_path}"
    echo "Generated ${file_path}"
}

ensure_hosts_entry() {
    local hosts_line="127.0.0.1 ${DOMAIN_NAME}"

    if grep -qE "(^|[[:space:]])${DOMAIN_NAME}([[:space:]]|$)" /etc/hosts; then
        echo "Domain ${DOMAIN_NAME} already configured in /etc/hosts"
        return 0
    fi

    echo "Adding ${DOMAIN_NAME} to /etc/hosts..."
    if echo "${hosts_line}" | sudo tee -a /etc/hosts > /dev/null; then
        echo "OK: ${DOMAIN_NAME} added"
    else
        echo "ERROR: could not edit /etc/hosts. Run manually:"
        echo "  echo \"${hosts_line}\" | sudo tee -a /etc/hosts"
        exit 1
    fi
}

ensure_secret_file "${SECRETS_DIR}/db_password.txt" "Enter PostgreSQL password for app user"
ensure_generated_secret "${SECRETS_DIR}/flask_secret_key.txt"
ensure_hosts_entry

echo "Setup complete."
