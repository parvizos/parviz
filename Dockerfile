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
RUN apk add --no-cache libc6-compat
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL=file:./data/parviz.db

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/drizzle ./drizzle

# База лежит в томе, чтобы данные переживали пересоздание контейнера.
VOLUME ["/app/data"]
EXPOSE 3000

CMD ["npm", "start"]
