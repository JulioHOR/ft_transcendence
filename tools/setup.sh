#!/bin/bash

set -e

ENV_FILE="./.env"
ENV_EXAMPLE="./.env.example"
SECRETS_DIR="./secrets"

# Prepara o arquivo .env e exporta suas configurações.
prepare_environment() {
    if [ ! -f "${ENV_FILE}" ]; then
        cp "${ENV_EXAMPLE}" "${ENV_FILE}"
    fi

    # shellcheck disable=SC1090
    set -a
    source "${ENV_FILE}"
    set +a
}

# Retorna o IP da rota padrão ou o primeiro IP local disponível.
detect_lan_ip() {
    local lan_ip

    lan_ip=$(ip -4 route get 1.1.1.1 2>/dev/null | grep -o 'src [0-9.]*' | cut -d' ' -f2)

    if [ -z "${lan_ip}" ]; then
        lan_ip=$(hostname -I 2>/dev/null | awk '{print $1}')
    fi

    printf '%s' "${lan_ip}"
}

# Salva uma configuração no arquivo .env.
save_environment_value() {
    local name="$1"
    local value="$2"

    if grep -q "^${name}=" "${ENV_FILE}"; then
        sed -i "s/^${name}=.*/${name}=${value}/" "${ENV_FILE}"
    else
        printf '\n%s=%s\n' "${name}" "${value}" >> "${ENV_FILE}"
    fi
}

# Detecta e salva LAN_IP quando não está configurado.
configure_lan_ip() {
    save_environment_value "USER_UID" "$(id -u)"
    if [ -z "${LAN_IP:-}" ]; then
        LAN_IP=$(detect_lan_ip)
        if [ -n "${LAN_IP}" ]; then
            save_environment_value "LAN_IP" "${LAN_IP}"
            export LAN_IP
        fi
    fi
}

# Gera API_KEY quando necessário e confere seu formato.
ensure_api_key() {
    if [ -z "${API_KEY:-}" ]; then
        API_KEY=$(openssl rand -hex 32)
        save_environment_value "API_KEY" "${API_KEY}"
        export API_KEY
    fi

    if [[ "${API_KEY}" =~ ^[a-f0-9]{64}$ ]]; then
        return 0
    fi

    echo "API_KEY deve conter exatamente 64 caracteres hexadecimais." >&2
    return 1
}

# Cria as senhas que ainda não existem.
create_application_secrets() {
    mkdir -p "${SECRETS_DIR}"

    local secret
    local file_path
    for secret in db_password flask_secret_key; do
        file_path="${SECRETS_DIR}/${secret}.txt"
        if [ ! -s "${file_path}" ]; then
            openssl rand -hex 32 > "${file_path}"
        fi
    done
}

# Cria o certificado interno quando necessário.
create_backend_certificate() {
    local certificate="${SECRETS_DIR}/backend.crt"
    local private_key="${SECRETS_DIR}/backend.key"

    if [ ! -s "${certificate}" ] || [ ! -s "${private_key}" ]; then
        rm -f "${certificate}" "${private_key}"
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout "${private_key}" \
            -out "${certificate}" \
            -subj "/CN=backend" \
            -addext "subjectAltName=DNS:backend" \
            >/dev/null 2>&1
    fi
}

# Define as permissões dos arquivos de segredo.
set_secret_permissions() {
    chmod 700 "${SECRETS_DIR}"
    chmod 600 "${SECRETS_DIR}/db_password.txt" \
        "${SECRETS_DIR}/flask_secret_key.txt" \
        "${SECRETS_DIR}/backend.key"
    chmod 644 "${SECRETS_DIR}/backend.crt"
}

# Executa as etapas do setup na ordem necessária.
main() {
    prepare_environment
    configure_lan_ip
    ensure_api_key
    create_application_secrets
    create_backend_certificate
    set_secret_permissions

    echo "Setup complete."
}

main "$@"
