#!/usr/bin/env bash
# ── ParvizOS · установка keep-alive ──────────────────────────────
# Ставит сервис, который держит ~3 ГБ памяти занятыми, чтобы Oracle не
# забрал простаивающий Always Free инстанс. Автозапуск + авто-перезапуск.
#
# Запуск:   sudo bash deploy/keepalive/install.sh
# Удалить:  sudo systemctl disable --now parviz-keepalive &&
#           sudo rm /etc/systemd/system/parviz-keepalive.service \
#                   /usr/local/bin/parviz-keepalive.py &&
#           sudo systemctl daemon-reload
#
# Нужно ТОЛЬКО без Pay As You Go. PAYG отменяет правило простоя — надёжнее.
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Запусти через sudo: sudo bash deploy/keepalive/install.sh" >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "==> Ставлю python3"
  apt-get update -qq && apt-get install -y -qq python3
fi

SRC="$(cd "$(dirname "$0")" && pwd)"
install -m 755 "$SRC/keepalive.py" /usr/local/bin/parviz-keepalive.py
install -m 644 "$SRC/parviz-keepalive.service" /etc/systemd/system/parviz-keepalive.service

systemctl daemon-reload
systemctl enable --now parviz-keepalive.service

sleep 2
echo
echo "Готово. Сервис keep-alive запущен и включён в автозагрузку."
echo "Статус:"
systemctl --no-pager --lines=0 status parviz-keepalive.service | head -4
echo
echo "Память (должно быть занято ~3 ГБ):"
free -h | awk 'NR==1 || NR==2'
