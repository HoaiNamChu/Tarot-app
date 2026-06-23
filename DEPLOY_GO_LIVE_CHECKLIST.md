# Luna Arcana go-live checklist

## 1. Backend deploy

Run on the server after pulling the latest code:

```bash
cd backend
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan queue:restart
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan storage:link
php artisan app:preflight --production
```

Required long-running processes:

```bash
php artisan queue:work --tries=3 --timeout=90
```

Server cron must run Laravel scheduler every minute:

```cron
* * * * * cd /path/to/backend && php artisan schedule:run >> /dev/null 2>&1
```

The scheduler currently handles:

- `bookings:expire` every minute.
- `bookings:send-reminders` every 15 minutes.
- `bookings:auto-complete` every 15 minutes.

Health check after deploy:

```bash
curl https://api.your-domain.com/api/health
```

## 2. Frontend build

Build and upload static files:

```bash
cd frontend/user-app
npm ci
VITE_API_URL=https://api.your-domain.com npm run build

cd ../admin-app
npm ci
VITE_API_URL=https://api.your-domain.com npm run build
```

Set these before building:

- `VITE_API_URL=https://api.your-domain.com` is required for production builds. Without it the app will fail fast instead of calling localhost.
- User canonical/domain values in public SEO files if domain changes.

## 3. Production env checks

Backend `.env` must be set with real values:

- `APP_ENV=production`
- `APP_DEBUG=false`
- `APP_URL=https://api.your-domain.com`
- `FRONTEND_URL=https://your-domain.com`
- Database credentials.
- `MAIL_MAILER=smtp`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_ENCRYPTION`.
- Do not set `MAIL_SCHEME=tls`; leave it empty for SMTP port 587 or use `MAIL_SCHEME=smtps` for port 465.
- MoMo and VNPay credentials if enabled in admin settings.
- Bank transfer settings if enabled.

## 4. Smoke test before opening

Run these flows on staging/production:

- Register, login, logout, forgot password.
- Load services/readers on home page.
- Create booking and pay with each enabled payment method.
- Confirm payment in admin.
- Reader login, confirm/complete/cancel own booking.
- Update reader working hours and verify user cannot book outside that window.
- Verify email: booking created, confirmed, cancelled, reminder.
- Verify scheduler cancels expired unpaid bookings.

## 5. Operational notes

- Keep queue worker supervised with Supervisor/systemd/PM2.
- Keep daily database backups before opening real payment.
- Check `storage/logs/laravel.log` after first live transactions.
- Do not enable a payment method until its credentials are confirmed with the provider.
