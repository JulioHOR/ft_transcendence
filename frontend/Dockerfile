FROM debian:bookworm

RUN apt-get update && apt-get install -y \
    nginx \
    openssl \
    gettext-base \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /etc/nginx/ssl /var/www/html

COPY conf/nginx.conf /etc/nginx/nginx.conf.template
COPY html/ /var/www/html/
COPY tools/init_frontend.sh /usr/local/bin/init_frontend.sh

RUN chmod +x /usr/local/bin/init_frontend.sh

ENTRYPOINT ["init_frontend.sh"]
