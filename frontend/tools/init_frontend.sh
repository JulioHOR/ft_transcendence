#!/bin/bash
set -e

echo "Generating TLS certificate for ${DOMAIN_NAME}..."
CERTIFICATE_NAMES="DNS:localhost"
if [ "${DOMAIN_NAME}" != "localhost" ]; then
    CERTIFICATE_NAMES="${CERTIFICATE_NAMES},DNS:${DOMAIN_NAME}"
fi
if [ -n "${LAN_IP:-}" ]; then
    CERTIFICATE_NAMES="${CERTIFICATE_NAMES},IP:${LAN_IP}"
fi
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/nginx.key \
    -out /etc/nginx/ssl/nginx.crt \
    -subj "/CN=${DOMAIN_NAME}" \
    -addext "subjectAltName=${CERTIFICATE_NAMES}" \
    >/dev/null 2>&1

envsubst '${DOMAIN_NAME} ${FRONTEND_INTERNAL_PORT} ${BACKEND_INTERNAL_PORT}' \
    < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

echo "Frontend ready on port ${FRONTEND_INTERNAL_PORT}"
exec nginx -g "daemon off;"
