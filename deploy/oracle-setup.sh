#!/usr/bin/env bash
# ── ParvizOS · первичная настройка сервера (Ubuntu/Debian) ────────
# Ставит Docker и ОТКРЫВАЕТ ПОРТЫ 80/443 В ЛОКАЛЬНОМ ФАЕРВОЛЕ сервера.
#
# Зачем скрипт: на Oracle Cloud (образы Ubuntu) уже стоит iptables с
# правилом, которое режет всё лишнее. Открыть порты только в облачной
# Security List НЕ достаточно — сайт всё равно не откроется, пока порты
# не открыты и здесь. Это самая частая причина «не работает».
#
# Запуск на сервере:  sudo bash deploy/oracle-setup.sh
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Запусти через sudo: sudo bash deploy/oracle-setup.sh" >&2
  exit 1
fi

echo "==> 1/3 Docker"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
  # чтобы пользователь мог docker без sudo (перелогинься после этого)
  if [[ -n "${SUDO_USER:-}" ]]; then usermod -aG docker "$SUDO_USER" || true; fi
  echo "    Docker установлен."
else
  echo "    Docker уже есть — пропускаю."
fi

echo "==> 2/3 Открываю порты 80/443 в iptables"
open_port() { # proto port
  local proto="$1" port="$2"
  if iptables -C INPUT -p "$proto" --dport "$port" -j ACCEPT 2>/dev/null; then
    echo "    ${proto}/${port} уже открыт."
  else
    # -I INPUT вставляет ПЕРЕД правилом REJECT, иначе не подействует
    iptables -I INPUT -p "$proto" --dport "$port" -j ACCEPT
    echo "    ${proto}/${port} открыт."
  fi
}
open_port tcp 80
open_port tcp 443
open_port udp 443   # HTTP/3

echo "==> 3/3 Сохраняю правила фаервола, чтобы пережили перезагрузку"
if ! dpkg -s iptables-persistent >/dev/null 2>&1; then
  DEBIAN_FRONTEND=noninteractive apt-get update -qq
  echo "iptables-persistent iptables-persistent/autosave_v4 boolean true" | debconf-set-selections
  echo "iptables-persistent iptables-persistent/autosave_v6 boolean true" | debconf-set-selections
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq iptables-persistent
fi
netfilter-persistent save

echo
echo "Готово. Порты 80/443 открыты и на сервере."
echo "Не забудь открыть их ещё и в облаке: VCN → Security List → Ingress Rules"
echo "(0.0.0.0/0 → TCP 80 и 443). Затем — docker compose (см. docs/DEPLOY.md)."
