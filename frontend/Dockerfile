FROM node:22-bookworm AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json ./
COPY src ./src
COPY public ./public

RUN npm run build

FROM debian:bookworm

RUN apt-get update && apt-get install -y \
    nginx \
    openssl \
    gettext-base \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /etc/nginx/ssl /var/www/html

COPY conf/nginx.conf /etc/nginx/nginx.conf.template
COPY --from=build /app/dist/ /var/www/html/
COPY tools/init_frontend.sh /usr/local/bin/init_frontend.sh

RUN chmod +x /usr/local/bin/init_frontend.sh

ENTRYPOINT ["init_frontend.sh"]
