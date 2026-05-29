#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this script as root on the VPS." >&2
  exit 1
fi

apt-get update
apt-get install -y ca-certificates curl gnupg nginx postgresql postgresql-contrib ufw rsync

if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt 22 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

npm install -g pm2

ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

systemctl enable --now postgresql
systemctl enable --now nginx

echo "Bootstrap complete. Next: copy the 2100 folder to /var/www/2100 and run deploy/install-app.sh."
