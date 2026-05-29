# Vultr deployment notes

Target domain:

- `dumbthingsdaily.com`
- `www.dumbthingsdaily.com`

Runtime layout:

- Next.js frontend: `127.0.0.1:3001`
- Express backend: `127.0.0.1:3000`
- Public API base: `https://dumbthingsdaily.com/api`
- Nginx proxies `/api/*` to the backend and everything else to the frontend.

Recommended VPS:

- Ubuntu 24.04 LTS
- Shared CPU Cloud Compute
- 2 vCPU / 4 GB RAM if available, otherwise at least 1 vCPU / 2 GB RAM
- Region near the main users; Sydney is preferred for Australian use.

Deployment sequence:

1. Create the Vultr VPS.
2. Point GoDaddy DNS `A` records for `@` and `www` to the VPS IPv4 address.
3. Copy this `2100` folder to `/var/www/2100` on the VPS.
4. Run `sudo bash /var/www/2100/deploy/bootstrap-ubuntu.sh`.
5. Create PostgreSQL database/user matching `DATABASE_URL` in `/var/www/2100/.env`.
6. Copy and fill env files:
   - `/var/www/2100/deploy/backend.env.example` to `/var/www/2100/.env`
   - `/var/www/2100/deploy/frontend.env.production.example` to `/var/www/2100/frontend/.env.production`
7. Run `sudo APP_DOMAIN=dumbthingsdaily.com bash /var/www/2100/deploy/install-app.sh`.
8. Install HTTPS:

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d dumbthingsdaily.com -d www.dumbthingsdaily.com
```

9. Verify:

```bash
curl -I https://dumbthingsdaily.com
curl https://dumbthingsdaily.com/api/health
pm2 status
```

Production env reminders:

- Frontend `.env.production` must use `NEXT_PUBLIC_API_BASE_URL=https://dumbthingsdaily.com/api`.
