FROM node:24-trixie AS build
WORKDIR /app

COPY package.json package-lock.json .npmrc ./
RUN npm ci

COPY index.html vite.config.ts tsconfig.json ./
COPY src ./src
COPY public ./public
RUN npm run build

RUN npm prune --omit=dev

FROM node:24-trixie-slim
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

USER node
# EXPOSE 2567
CMD ["node", "dist/server/server.mjs"]