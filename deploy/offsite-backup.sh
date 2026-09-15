#!/usr/bin/env bash
# ── ParvizOS · внешний бэкап базы в облако (rclone) ───────────────
# Отправляет ежедневные снимки базы (папку data/backups, которую
# приложение наполняет само) на удалённое хранилище — Google Drive,
# Backblaze B2 и т.п. Смысл: даже если сервер удалят/потеряют, данные
# останутся у тебя в другом месте.
#
# Подготовка (один раз):
#   curl https://rclone.org/install.sh | sudo bash   # поставить rclone
#   rclone config                                     # создать remote (напр. gdrive)
# Затем в cron (crontab -e), каждый день в 4:30 утра:
#   30 4 * * * RCLONE_REMOTE=gdrive /home/ubuntu/parviz/deploy/offsite-backup.sh >> /var/log/parviz-backup.log 2>&1
set -euo pipefail

REMOTE="${RCLONE_REMOTE:-gdrive}"      # имя remote из `rclone config`
DEST="${RCLONE_DEST:-parvizos-backups}" # папка на той стороне
SRC="$(cd "$(dirname "$0")/.." && pwd)/data/backups"

if ! command -v rclone >/dev/null 2>&1; then
  echo "rclone не установлен: curl https://rclone.org/install.sh | sudo bash" >&2
  exit 1
fi
if [ ! -d "$SRC" ]; then
  echo "Нет папки $SRC — запусти приложение хотя бы раз, оно её создаст." >&2
  exit 1
fi

# Зеркалим последние ежедневные снимки (их приложение держит 7 штук).
rclone sync "$SRC" "${REMOTE}:${DEST}" --create-empty-src-dirs
echo "$(date '+%F %T')  бэкап уехал в ${REMOTE}:${DEST}"
