#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/2100}"
APP_DOMAIN="${APP_DOMAIN:-dumbthingsdaily.com}"
DB_NAME="${DB_NAME:-code_knowledge_db}"
DB_USER="${DB_USER:-2100_app}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this script as root on the VPS." >&2
  exit 1
fi

if [[ ! -d "${APP_DIR}" ]]; then
  echo "App directory not found: ${APP_DIR}" >&2
  exit 1
fi

if [[ ! -f "${APP_DIR}/.env" ]]; then
  echo "Missing ${APP_DIR}/.env. Copy deploy/backend.env.example and fill secrets first." >&2
  exit 1
fi

if [[ ! -f "${APP_DIR}/frontend/.env.production" ]]; then
  echo "Missing ${APP_DIR}/frontend/.env.production. Copy deploy/frontend.env.production.example first." >&2
  exit 1
fi

cd "${APP_DIR}"
npm ci
cd frontend
npm ci
NEXT_PUBLIC_API_BASE_URL="https://${APP_DOMAIN}/api" npm run build
cd "${APP_DIR}"

npm run migrate
npm run import:codebase
npm run enrich:codebase
npm run attach:mock-hackathon-tests
npm run attach:mock-task-descriptions
npm run seed:documentation-guides
npm run index:symbols

NGINX_SITE="/etc/nginx/sites-available/${APP_DOMAIN}.conf"
if [[ -f "${NGINX_SITE}" ]] && grep -q "/etc/letsencrypt/live/${APP_DOMAIN}/" "${NGINX_SITE}"; then
  echo "Preserving existing HTTPS nginx config: ${NGINX_SITE}"
else
  cp "${APP_DIR}/deploy/nginx/dumbthingsdaily.com.conf" "${NGINX_SITE}"
fi
ln -sfn "/etc/nginx/sites-available/${APP_DOMAIN}.conf" "/etc/nginx/sites-enabled/${APP_DOMAIN}.conf"
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

pm2 startOrReload "${APP_DIR}/ecosystem.config.cjs" --update-env
pm2 save
pm2 startup systemd -u root --hp /root || true

echo "Application installed. If DNS points to this VPS, run certbot for HTTPS next."
