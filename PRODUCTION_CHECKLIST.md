# Production Checklist

## Backend

- Set `APP_ENV=production` and `APP_DEBUG=false`.
- Generate and keep a private `APP_KEY`.
- Do not deploy with the local `.env` values. Create a server-only `.env` from `.env.example`.
- Use production database credentials and run:
  - `php artisan migrate --force`
  - `php artisan config:cache`
  - `php artisan route:cache`
  - `php artisan view:cache`
- Run a queue worker for queued emails/jobs:
  - `php artisan queue:work --tries=3 --timeout=90`
- Configure SMTP mail correctly:
  - `MAIL_MAILER=smtp`
  - `MAIL_HOST=smtp.gmail.com`
  - `MAIL_PORT=587`
  - `MAIL_SCHEME=tls` or legacy `MAIL_ENCRYPTION=tls`
  - `MAIL_FROM_ADDRESS` should match or be authorized by the SMTP account.
- Send a production smoke-test email:
  - `php artisan mail:test you@example.com`
- Run the scheduler every minute if booking expiration is scheduled:
  - `php artisan schedule:run`
- Confirm password reset email delivery works from the production domain.
- Point the web server document root to `backend/public`.
- Ensure `storage/` and `bootstrap/cache/` are writable by the web server user.

## Environment

- Set `APP_URL` to the backend public URL.
- Set `FRONTEND_URL` and `ADMIN_FRONTEND_URL` to the deployed frontend URLs.
- Set `CORS_ALLOWED_ORIGINS` to the exact allowed frontend origins.
- Set `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_URL`, `VNPAY_RETURN_URL`, and `VNPAY_IPN_URL`.
- Use the production VNPay URL, not the sandbox URL, before accepting real payments.
- Set real bank transfer information in Admin Settings before launch, including the VietQR bank BIN.
- Rotate any credentials that were ever committed, copied into logs, or shared outside the server.
- Create the first admin account with a strong password, then remove demo/test accounts from production data.

## Frontend

- Build both Vite apps with the production API URL:
  - `VITE_API_URL=https://api.example.com npm run build`
- Deploy the generated `dist/` folders behind HTTPS.
- Configure SPA fallback so unknown frontend routes serve `index.html`.

## Smoke Tests

- Login as a normal user.
- Load readers/services.
- Create a booking.
- Pay with bank transfer and confirm `pending_verification`.
- Start a VNPay payment and confirm redirect URL.
- Verify VNPay return/IPN on the public backend URL.
- Confirm admin and reader-only APIs return `403` for a normal user.
- Confirm admin can create a booking, add a reader, list services, and mark bank payments as paid.
- Confirm `/api/readings/history` returns the authenticated user's reading history.
- Confirm password reset link opens the deployed user app and can set a new password.
- Confirm bank transfer proof code/note appears in Admin Payments and admin approval records an audit log.
- Confirm Admin Settings updates bank information shown in the user payment modal.
- Confirm VietQR image scans correctly with a Vietnamese banking app and pre-fills amount/content.

## Current Code Readiness

- User and admin frontends must pass `npm run lint` and `npm run build`.
- Backend must pass `php artisan test` and `php artisan route:list`.
- Admin destructive actions should hide readers/services with historical bookings instead of deleting operational records.
- Production DB must include `app_settings`, `admin_action_logs`, and new payment proof columns from the latest migrations.
