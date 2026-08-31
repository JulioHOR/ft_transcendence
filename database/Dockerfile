FROM debian:bookworm

RUN apt-get update && apt-get install -y \
    postgresql \
    gosu \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /var/lib/postgresql/data /run/postgresql \
    && chown -R postgres:postgres /var/lib/postgresql /run/postgresql

COPY tools/init_db.sh /usr/local/bin/init_db.sh
COPY init/01-seed.sql /docker-entrypoint-initdb.d/01-seed.sql

RUN chmod +x /usr/local/bin/init_db.sh

ENTRYPOINT ["init_db.sh"]
