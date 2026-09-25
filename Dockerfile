# ── ParvizOS ──────────────────────────────────────────────
# Многоступенчатая сборка: отдельно прод-зависимости, отдельно билд.

# 1) Прод-зависимости (без dev)
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# 2) Сборка приложения (нужны и dev-зависимости)
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# 3) Рантайм
FROM node:22-alpine AS run
WORKDIR /app

# Litestream — непрерывная репликация базы в R2/S3 (нужную под архитектуру
# сборку тянем на этапе билда; на ARM-сервере Oracle это arm64).
ARG LITESTREAM_VERSION=0.3.13
RUN apk add --no-cache libc6-compat curl ca-certificates \
 && ARCH="$(uname -m)" \
 && case "$ARCH" in \
      x86_64) LSARCH=amd64 ;; \
      aarch64|arm64) LSARCH=arm64 ;; \
      *) LSARCH=amd64 ;; \
    esac \
 && curl -fsSL "https://github.com/benbjohnson/litestream/releases/download/v${LITESTREAM_VERSION}/litestream-v${LITESTREAM_VERSION}-linux-${LSARCH}.tar.gz" \
      | tar -xz -C /usr/local/bin litestream \
 && chmod +x /usr/local/bin/litestream \
 && litestream version

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL=file:./data/parviz.db
# Абсолютный путь к базе — для Litestream и entrypoint (та же, что DATABASE_URL).
ENV DB_PATH=/app/data/parviz.db

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/drizzle ./drizzle
COPY deploy/litestream.yml /etc/litestream.yml
COPY deploy/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# База лежит в томе, чтобы данные переживали пересоздание контейнера.
VOLUME ["/app/data"]
EXPOSE 3000

# Старт под Litestream, если заданы LITESTREAM_* (иначе обычный npm start).
CMD ["/app/docker-entrypoint.sh"]
