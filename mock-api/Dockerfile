FROM node:24-trixie-slim

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY server.mjs ./

ENV PORT=3001

EXPOSE 3001

CMD ["npm", "start"]
