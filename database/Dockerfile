FROM debian:trixie

RUN apt-get update && apt-get install -y \
    postgresql-17 \
    gosu \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /var/lib/postgresql/data /run/postgresql \
    && chown -R postgres:postgres /var/lib/postgresql /run/postgresql

COPY tools/init_db.sh /usr/local/bin/init_db.sh
COPY init/02-users.sql /docker-entrypoint-initdb.d/02-users.sql
COPY init/03-social.sql /docker-entrypoint-initdb.d/03-social.sql
COPY init/04-chat-features.sql /docker-entrypoint-initdb.d/04-chat-features.sql

RUN chmod +x /usr/local/bin/init_db.sh

ENTRYPOINT ["init_db.sh"]
