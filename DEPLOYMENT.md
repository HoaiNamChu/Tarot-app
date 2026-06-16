# Deployment Guide

This guide assumes a Linux VPS with Nginx, PHP 8.3+, Composer, Node.js 22+, and MySQL/MariaDB.

For a full step-by-step VPS setup from a fresh Ubuntu server, read `VPS_DEPLOY_GUIDE.md` first.

## 1. Build Locally Before Upload

Run the full predeploy check from the repository root:

```powershell
.\scripts\predeploy-check.ps1
```

Or on Linux/macOS:

```bash
bash scripts/predeploy-check.sh
```

The check runs backend tests, migration freshness in testing mode, frontend lint/build, dependency audits, route/config cache checks, and scheduler visibility.

## 2. Server Environment

Copy `backend/.env.example` to `backend/.env` on the server only. Never commit the production `.env`.

Required production values:

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.example.com
FRONTEND_URL=https://app.example.com
ADMIN_FRONTEND_URL=https://admin.example.com
CORS_ALLOWED_ORIGINS=https://app.example.com,https://admin.example.com

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=tarot_database
DB_USERNAME=tarot_user
DB_PASSWORD=change-me

QUEUE_CONNECTION=database
CACHE_STORE=database
SESSION_DRIVER=database

MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SCHEME=tls
MAIL_FROM_ADDRESS=your-mail@example.com
MAIL_FROM_NAME="Luna Arcana"

VNPAY_TMN_CODE=your-vnpay-code
VNPAY_HASH_SECRET=your-vnpay-secret
VNPAY_URL=https://pay.vnpay.vn/vpcpay.html
VNPAY_RETURN_URL=https://api.example.com/api/payment/vnpay/return
VNPAY_IPN_URL=https://api.example.com/api/payment/vnpay/ipn

MOMO_PARTNER_CODE=your-momo-partner-code
MOMO_ACCESS_KEY=your-momo-access-key
MOMO_SECRET_KEY=your-momo-secret-key
MOMO_ENDPOINT=https://payment.momo.vn/v2/gateway/api/create
MOMO_REDIRECT_URL=https://api.example.com/api/payment/momo/return
MOMO_IPN_URL=https://api.example.com/api/payment/momo/ipn
```

Generate the server key once:

```bash
cd /var/www/tarot/backend
php artisan key:generate --force
```

## 3. Backend Release Commands

```bash
cd /var/www/tarot/backend
composer install --no-dev --prefer-dist --optimize-autoloader
php artisan down
php artisan migrate --force
php artisan storage:link
php artisan queue:restart
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan up
```

Ensure writable directories:

```bash
chown -R www-data:www-data storage bootstrap/cache
chmod -R ug+rw storage bootstrap/cache
```

## 4. Frontend Builds

Build with the production API URL:

```bash
cd /var/www/tarot/frontend/user-app
VITE_API_URL=https://api.example.com npm ci
VITE_API_URL=https://api.example.com npm run build

cd /var/www/tarot/frontend/admin-app
VITE_API_URL=https://api.example.com npm ci
VITE_API_URL=https://api.example.com npm run build
```

Deploy each `dist/` folder behind HTTPS with SPA fallback to `index.html`.

## 5. Long-Running Processes

Queue worker:

```bash
php artisan queue:work database --queue=default --sleep=3 --tries=3 --timeout=90 --max-time=3600
```

Scheduler cron:

```cron
* * * * * cd /var/www/tarot/backend && php artisan schedule:run >> /dev/null 2>&1
```

Use the examples in `deploy/` for Nginx, Supervisor, and cron.

For PHP-FPM, enable OPcache in production. Typical values:

```ini
opcache.enable=1
opcache.enable_cli=0
opcache.validate_timestamps=0
opcache.memory_consumption=128
opcache.max_accelerated_files=20000
```

## 6. Smoke Tests After Deploy

- Open user app and admin app over HTTPS.
- Check backend health: `curl https://api.example.com/api/health`.
- Login as user and admin.
- Create a booking.
- Bank payment: submit proof, approve in admin, confirm audit log.
- VNPay: start payment, verify redirect, return URL, and IPN on public backend URL.
- Expiry: leave a pending unpaid booking and confirm scheduler cancels it after expiry.
- Refund: refund only after real bank/VNPay refund, then record amount, reason, reference, and note in admin.
- Payment methods: configure bank/VietQR and MoMo wallet details in Admin Settings, then disable any method that is not ready before launch.
- Mail: run `php artisan mail:test your-address@example.com` and test forgot password.
- Confirm queue is running: `php artisan queue:failed` should not show new failed mail/payment jobs.
- Confirm scheduler ran recently by checking `storage/logs/scheduler.log`.
