# Production Checklist

## Backend

- Read `DEPLOYMENT.md` and run `.\scripts\predeploy-check.ps1` locally before release.
- Set `APP_ENV=production` and `APP_DEBUG=false`.
- Generate and keep a private `APP_KEY`.
- Do not deploy with the local `.env` values. Create a server-only `.env` from `.env.example`.
- Use production database credentials and run:
  - `php artisan migrate --force`
  - `php artisan config:cache`
  - `php artisan route:cache`
  - `php artisan view:cache`
- Run a queue worker for queued emails/jobs:
  - `php artisan queue:work database --queue=default --sleep=3 --tries=3 --timeout=90 --max-time=3600`
  - Run `php artisan queue:restart` after each deploy.
- Configure SMTP mail correctly:
  - `MAIL_MAILER=smtp`
  - `MAIL_HOST=smtp.gmail.com`
  - `MAIL_PORT=587`
  - `MAIL_SCHEME=tls` or legacy `MAIL_ENCRYPTION=tls`
  - `MAIL_FROM_ADDRESS` should match or be authorized by the SMTP account.
- Send a production smoke-test email:
  - `php artisan mail:test you@example.com`
- Run the scheduler every minute so unpaid bookings are released after expiry:
  - `* * * * * cd /path/to/backend && php artisan schedule:run >> /dev/null 2>&1`
- Confirm password reset email delivery works from the production domain.
- Point the web server document root to `backend/public`.
- Ensure `storage/` and `bootstrap/cache/` are writable by the web server user.
- Enable OPcache for PHP-FPM and reload PHP-FPM after deploy.

## Environment

- Set `APP_URL` to the backend public URL.
- Set `FRONTEND_URL` and `ADMIN_FRONTEND_URL` to the deployed frontend URLs.
- Set `CORS_ALLOWED_ORIGINS` to the exact allowed frontend origins.
- Set `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_URL`, `VNPAY_RETURN_URL`, and `VNPAY_IPN_URL`.
- Set `MOMO_PARTNER_CODE`, `MOMO_ACCESS_KEY`, `MOMO_SECRET_KEY`, `MOMO_ENDPOINT`, `MOMO_REDIRECT_URL`, and `MOMO_IPN_URL` before enabling MoMo gateway.
- Use the production VNPay URL, not the sandbox URL, before accepting real payments.
- Set real bank transfer information in Admin Settings before launch, including the VietQR bank BIN.
- In Admin Settings, configure bank/VietQR details, then enable only the payment methods that are actually ready to accept money.
- Rotate any credentials that were ever committed, copied into logs, or shared outside the server.
- Create the first admin account with a strong password, then remove demo/test accounts from production data.

## Frontend

- Build both Vite apps with the production API URL:
  - `VITE_API_URL=https://api.example.com npm run build`
- Deploy the generated `dist/` folders behind HTTPS.
- Configure SPA fallback so unknown frontend routes serve `index.html`.

## Smoke Tests

- Login as a normal user.
- Confirm `/api/health` returns `status: ok` over HTTPS.
- Load readers/services.
- Create a booking.
- Pay with bank transfer and confirm `pending_verification`.
- Start a VNPay payment and confirm redirect URL.
- Disable each payment method in Admin Settings and confirm users cannot select or submit that method.
- Enable MoMo in Admin Settings and confirm the user payment modal shows wallet info, requires a transaction code, and creates `pending_verification`.
- Verify VNPay return/IPN on the public backend URL.
- Confirm admin and reader-only APIs return `403` for a normal user.
- Confirm admin can create a booking, add a reader, list services, and mark bank payments as paid.
- Confirm `/api/readings/history` returns the authenticated user's reading history.
- Confirm password reset link opens the deployed user app and can set a new password.
- Confirm bank transfer proof code/note appears in Admin Payments and admin approval records an audit log.
- Confirm refund flow requires amount/reason, stores refund reference/note, and records the admin audit log after the real bank/VNPay refund is done outside the app.
- Confirm Admin Settings updates bank information shown in the user payment modal.
- Confirm VietQR image scans correctly with a Vietnamese banking app and pre-fills amount/content.

## Current Code Readiness

- User and admin frontends must pass `npm run lint` and `npm run build`.
- Backend must pass `php artisan test` and `php artisan route:list`.
- Admin destructive actions should hide readers/services with historical bookings instead of deleting operational records.
- Production DB must include `app_settings`, `admin_action_logs`, payment proof columns, and refund audit columns from the latest migrations.
