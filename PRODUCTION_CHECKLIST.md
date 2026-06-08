# Production Checklist

## Backend

- Set `APP_ENV=production` and `APP_DEBUG=false`.
- Generate and keep a private `APP_KEY`.
- Use production database credentials and run:
  - `php artisan migrate --force`
  - `php artisan config:cache`
  - `php artisan route:cache`
  - `php artisan view:cache`
- Run a queue worker for queued emails/jobs:
  - `php artisan queue:work --tries=3 --timeout=90`
- Run the scheduler every minute if booking expiration is scheduled:
  - `php artisan schedule:run`
- Point the web server document root to `backend/public`.
- Ensure `storage/` and `bootstrap/cache/` are writable by the web server user.

## Environment

- Set `APP_URL` to the backend public URL.
- Set `FRONTEND_URL` and `ADMIN_FRONTEND_URL` to the deployed frontend URLs.
- Set `CORS_ALLOWED_ORIGINS` to the exact allowed frontend origins.
- Set `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_URL`, `VNPAY_RETURN_URL`, and `VNPAY_IPN_URL`.
- Rotate any credentials that were ever committed, copied into logs, or shared outside the server.

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
