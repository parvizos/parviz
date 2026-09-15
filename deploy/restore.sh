#!/usr/bin/env bash
# ── ParvizOS · восстановление базы из облачного бэкапа ────────────
# Тянет последний снимок из облака, проверяет целостность и кладёт его
# как рабочую базу. Работает и на совершенно новом сервере — так что
# даже если старый пропал целиком, ты поднимаешься за пару минут.
#
# Использование (после git clone + rclone config на новом сервере):
#   RCLONE_REMOTE=gdrive bash deploy/restore.sh
#   docker compose -f docker-compose.prod.yml up -d --build
set -euo pipefail

REMOTE="${RCLONE_REMOTE:-gdrive}"
DEST="${RCLONE_DEST:-parvizos-backups}"
TARGET_DIR="${PARVIZ_DATA:-$HOME/parviz/data}"

command -v rclone >/dev/null 2>&1 || {
  echo "Нет rclone: curl https://rclone.org/install.sh | sudo bash" >&2
  exit 1
}
if ! command -v sqlite3 >/dev/null 2>&1; then
  sudo apt-get update -qq && sudo apt-get install -y -qq sqlite3
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

latest="$(rclone lsf "${REMOTE}:${DEST}/" --include 'parviz-*.db' 2>/dev/null | sort | tail -1)"
[ -n "$latest" ] || { echo "В ${REMOTE}:${DEST} нет бэкапов parviz-*.db" >&2; exit 1; }
echo "Беру последний снимок: $latest"
rclone copyto "${REMOTE}:${DEST}/${latest}" "$tmp/parviz.db"

[ "$(sqlite3 "$tmp/parviz.db" 'PRAGMA integrity_check;' 2>/dev/null || echo bad)" = "ok" ] || {
  echo "Снимок повреждён — не восстанавливаю." >&2
  exit 1
}

mkdir -p "$TARGET_DIR"
if [ -f "$TARGET_DIR/parviz.db" ]; then
  keep="$TARGET_DIR/parviz.db.before-restore-$(date +%s)"
  cp "$TARGET_DIR/parviz.db" "$keep"
  echo "Старая база сохранена рядом: $keep"
fi
cp "$tmp/parviz.db" "$TARGET_DIR/parviz.db"
rm -f "$TARGET_DIR/parviz.db-wal" "$TARGET_DIR/parviz.db-shm" 2>/dev/null || true

echo
echo "Готово. База восстановлена из $latest → $TARGET_DIR/parviz.db"
echo "Запусти:  docker compose -f docker-compose.prod.yml up -d --build"
