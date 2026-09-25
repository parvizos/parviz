#!/bin/sh
# ── ParvizOS · старт с непрерывной репликацией базы в облако ──────────
# Если заданы LITESTREAM_* (бакет + ключи), запускаем приложение под
# Litestream: сначала восстанавливаем базу из R2, если локальной нет,
# затем стримим все изменения в облако, пока живёт процесс. Если
# LITESTREAM_* пустые — обычный запуск (репликация выключена).
set -e

export DB_PATH="${DB_PATH:-/app/data/parviz.db}"
export LITESTREAM_PATH="${LITESTREAM_PATH:-litestream/parviz.db}"
export LITESTREAM_REGION="${LITESTREAM_REGION:-auto}"
CFG=/etc/litestream.yml

replication_on() {
  [ -n "$LITESTREAM_BUCKET" ] && \
  [ -n "$LITESTREAM_ENDPOINT" ] && \
  [ -n "$LITESTREAM_ACCESS_KEY_ID" ] && \
  [ -n "$LITESTREAM_SECRET_ACCESS_KEY" ]
}

if replication_on; then
  mkdir -p "$(dirname "$DB_PATH")"
  if [ ! -f "$DB_PATH" ]; then
    echo "[litestream] Локальной базы нет — пробую восстановить из облака…"
    litestream restore -if-replica-exists -config "$CFG" "$DB_PATH" \
      && echo "[litestream] База восстановлена из R2." \
      || echo "[litestream] Копии в облаке нет — стартуем с чистой базой."
  fi
  echo "[litestream] Приложение под непрерывной репликацией в R2 (${LITESTREAM_BUCKET})."
  exec litestream replicate -config "$CFG" -exec "npm start"
else
  echo "[litestream] Репликация не настроена (нет LITESTREAM_*) — обычный запуск."
  exec npm start
fi
