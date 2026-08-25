#!/bin/bash
set -e

PGDATA="/var/lib/postgresql/data"
PG_VERSION="$(ls /usr/lib/postgresql | head -n1)"
PG_BIN="/usr/lib/postgresql/${PG_VERSION}/bin"

db_password="$(cat /run/secrets/db_password)"

chown -R postgres:postgres /var/lib/postgresql /run/postgresql
chmod 700 "${PGDATA}" 2>/dev/null || true

if [ ! -f "${PGDATA}/PG_VERSION" ]; then
    echo "Initializing PostgreSQL data directory..."
    gosu postgres "${PG_BIN}/initdb" -D "${PGDATA}"

    echo "listen_addresses='*'" >> "${PGDATA}/postgresql.conf"
    echo "port = ${POSTGRES_INTERNAL_PORT}" >> "${PGDATA}/postgresql.conf"
    echo "host all all 0.0.0.0/0 md5" >> "${PGDATA}/pg_hba.conf"

    gosu postgres "${PG_BIN}/pg_ctl" -D "${PGDATA}" -o "-c listen_addresses=localhost -p ${POSTGRES_INTERNAL_PORT}" -w start

    gosu postgres psql -v ON_ERROR_STOP=1 --username=postgres <<-EOSQL
        CREATE USER ${POSTGRES_USER} WITH PASSWORD '${db_password}';
        CREATE DATABASE ${POSTGRES_DB} OWNER ${POSTGRES_USER};
EOSQL

    gosu postgres env PGPASSWORD="${db_password}" psql -v ON_ERROR_STOP=1 \
        --username="${POSTGRES_USER}" \
        --dbname="${POSTGRES_DB}" \
        -f /docker-entrypoint-initdb.d/01-seed.sql

    gosu postgres "${PG_BIN}/pg_ctl" -D "${PGDATA}" -m fast -w stop
    echo "PostgreSQL initialized"
fi

echo "Starting PostgreSQL on port ${POSTGRES_INTERNAL_PORT}..."
exec gosu postgres "${PG_BIN}/postgres" -D "${PGDATA}" -c "listen_addresses=*" -p "${POSTGRES_INTERNAL_PORT}"
