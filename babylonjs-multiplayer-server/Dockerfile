FROM alpine:latest

RUN apk update \
    && apk add --no-cache \
    npm \
    vite

RUN npm install 

ENTRYPOINT [ "ls" ]