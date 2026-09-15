#!/usr/bin/env bash
# ── ParvizOS · внешний бэкап с гарантией (3-2-1) ─────────────────
# Делает консистентный снимок базы и выгружает его в одно или несколько
# облаков ВНЕ этого сервера (Google Drive, Backblaze B2, …). Хранит версии,
# пингует монитор — чтобы даже гибель сервера/аккаунта Oracle не стоила
# данных.
#
# Подготовка (один раз, см. docs/DEPLOY.md):
#   curl https://rclone.org/install.sh | sudo bash
#   rclone config                      # создать remote(ы), напр. gdrive [и b2]
#
# Затем в cron (crontab -e), каждые 6 часов:
#   0 */6 * * * RCLONE_REMOTES="gdrive" HEALTHCHECK_URL="https://hc-ping.com/ВАШ-UUID" \
#     /home/ubuntu/parviz/deploy/offsite-backup.sh >> /var/log/parviz-backup.log 2>&1
set -euo pipefail

# --- настройки (переопределяются переменными окружения) ---
DB="${PARVIZ_DB:-$HOME/parviz/data/parviz.db}"
REMOTES="${RCLONE_REMOTES:-gdrive}"        # через пробел: "gdrive b2"
DEST="${RCLONE_DEST:-parvizos-backups}"    # папка/бакет на той стороне
KEEP_DAYS="${KEEP_DAYS:-30}"               # сколько дней хранить версии
HEALTHCHECK_URL="${HEALTHCHECK_URL:-}"     # напр. https://hc-ping.com/<uuid>

fail() { # шлём монитору сигнал провала, если он настроен
  [ -n "$HEALTHCHECK_URL" ] && curl -fsS -m 10 "${HEALTHCHECK_URL}/fail" >/dev/null 2>&1 || true
  echo "$(date '+%F %T')  ОШИБКА: $1" >&2
  exit 1
}

command -v rclone >/dev/null 2>&1 || fail "rclone не установлен (curl https://rclone.org/install.sh | sudo bash)"
[ -f "$DB" ] || fail "нет файла базы: $DB"
if ! command -v sqlite3 >/dev/null 2>&1; then
  sudo apt-get update -qq && sudo apt-get install -y -qq sqlite3 || fail "не поставился sqlite3"
fi

ts="$(date +%Y%m%d-%H%M%S)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
snap="$tmp/parviz-$ts.db"

# Консистентный горячий снимок (online backup API — безопасно на живой базе).
sqlite3 "$DB" ".backup '$snap'" || fail "не удалось снять снимок базы"
# Быстрая проверка целостности снимка перед выгрузкой.
[ "$(sqlite3 "$snap" 'PRAGMA integrity_check;')" = "ok" ] || fail "снимок битый (integrity_check)"

ok=0
for r in $REMOTES; do
  if rclone copy "$snap" "${r}:${DEST}/" --no-traverse; then
    # ретенция: удалить версии старше KEEP_DAYS на этом remote
    rclone delete "${r}:${DEST}/" --min-age "${KEEP_DAYS}d" --include "parviz-*.db" 2>/dev/null || true
    echo "$(date '+%F %T')  выгружено в ${r}:${DEST}/parviz-$ts.db"
    ok=1
  else
    echo "$(date '+%F %T')  НЕ удалось выгрузить в ${r}" >&2
  fi
done

[ "$ok" = "1" ] || fail "ни один remote не принял бэкап"

# успех — пингуем монитор (если задан)
[ -n "$HEALTHCHECK_URL" ] && curl -fsS -m 10 "$HEALTHCHECK_URL" >/dev/null 2>&1 || true
echo "$(date '+%F %T')  бэкап завершён (parviz-$ts.db)"
