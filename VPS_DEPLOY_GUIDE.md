# VPS deploy guide for Luna Arcana

This guide targets a small Ubuntu VPS, for example 1 CPU / 2GB RAM / 35GB NVMe.

## 1. Server baseline

Use Ubuntu 22.04 or 24.04.

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx mysql-server supervisor git unzip curl ca-certificates software-properties-common
```

Create swap on a 2GB VPS:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Install PHP 8.3 and extensions:

```bash
sudo add-apt-repository ppa:ondrej/php -y
sudo apt update
sudo apt install -y php8.3-fpm php8.3-cli php8.3-mysql php8.3-mbstring php8.3-xml php8.3-curl php8.3-zip php8.3-bcmath php8.3-intl php8.3-gd
```

Install Composer:

```bash
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
```

Install Node 22:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

## 2. Database

```bash
sudo mysql
```

```sql
CREATE DATABASE tarot_database CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'tarot_user'@'localhost' IDENTIFIED BY 'CHANGE_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON tarot_database.* TO 'tarot_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## 3. Upload code

```bash
sudo mkdir -p /var/www/tarot
sudo chown -R $USER:www-data /var/www/tarot
cd /var/www/tarot
git clone YOUR_GIT_REPO_URL .
```

## 4. Backend env

```bash
cd /var/www/tarot/backend
cp .env.example .env
nano .env
```

Required values:

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.your-domain.com
FRONTEND_URL=https://your-domain.com
ADMIN_FRONTEND_URL=https://admin.your-domain.com
CORS_ALLOWED_ORIGINS=https://your-domain.com,https://admin.your-domain.com

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=tarot_database
DB_USERNAME=tarot_user
DB_PASSWORD=CHANGE_STRONG_PASSWORD

QUEUE_CONNECTION=database
CACHE_STORE=database
SESSION_DRIVER=database

MAIL_MAILER=smtp
# Leave MAIL_SCHEME empty for port 587. Use MAIL_SCHEME=smtps only for port 465.
MAIL_SCHEME=
MAIL_HOST=your-smtp-host
MAIL_PORT=587
MAIL_USERNAME=your-smtp-user
MAIL_PASSWORD=your-smtp-password
MAIL_FROM_ADDRESS=hello@your-domain.com
MAIL_FROM_NAME="Luna Arcana"
```

Payment values must match the public API domain:

```env
VNPAY_RETURN_URL=https://api.your-domain.com/api/payment/vnpay/return
VNPAY_IPN_URL=https://api.your-domain.com/api/payment/vnpay/ipn
MOMO_REDIRECT_URL=https://api.your-domain.com/api/payment/momo/return
MOMO_IPN_URL=https://api.your-domain.com/api/payment/momo/ipn
```

Install backend:

```bash
composer install --no-dev --prefer-dist --optimize-autoloader
php artisan key:generate --force
php artisan migrate --force
php artisan storage:link
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

Permissions:

```bash
sudo chown -R www-data:www-data storage bootstrap/cache
sudo chmod -R ug+rw storage bootstrap/cache
```

## 5. Frontend builds

Build on the VPS:

```bash
cd /var/www/tarot/frontend/user-app
npm ci
VITE_API_URL=https://api.your-domain.com npm run build

cd /var/www/tarot/frontend/admin-app
npm ci
VITE_API_URL=https://api.your-domain.com npm run build
```

If the VPS is slow, build locally and upload only each `dist/` folder.

## 6. Nginx

Copy and edit the provided examples:

```bash
sudo cp /var/www/tarot/deploy/nginx-api.conf.example /etc/nginx/sites-available/tarot-api
sudo cp /var/www/tarot/deploy/nginx-spa.conf.example /etc/nginx/sites-available/tarot-spa
sudo nano /etc/nginx/sites-available/tarot-api
sudo nano /etc/nginx/sites-available/tarot-spa
sudo ln -s /etc/nginx/sites-available/tarot-api /etc/nginx/sites-enabled/tarot-api
sudo ln -s /etc/nginx/sites-available/tarot-spa /etc/nginx/sites-enabled/tarot-spa
sudo nginx -t
sudo systemctl reload nginx
```

Install SSL:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.your-domain.com -d your-domain.com -d admin.your-domain.com
```

## 7. Queue and scheduler

Supervisor:

```bash
sudo cp /var/www/tarot/deploy/supervisor-queue.conf.example /etc/supervisor/conf.d/tarot-queue.conf
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl status
```

Cron:

```bash
sudo crontab -u www-data -e
```

Add:

```cron
* * * * * cd /var/www/tarot/backend && php artisan schedule:run >> /var/www/tarot/backend/storage/logs/scheduler.log 2>&1
```

## 8. Smoke tests

```bash
curl https://api.your-domain.com/api/health
cd /var/www/tarot/backend
php artisan mail:test your-email@example.com
php artisan queue:failed
php artisan schedule:list
php artisan app:preflight --production
```

Manual checks:

- Open user app and admin app over HTTPS.
- Register, login, logout.
- Load services and readers.
- Create a booking.
- Test bank transfer flow.
- Test MoMo/VNPay sandbox or live small amount.
- Confirm reader can update own schedule and booking status.

## 9. Deploy updates later

```bash
cd /var/www/tarot
git pull

cd backend
composer install --no-dev --prefer-dist --optimize-autoloader
php artisan down
php artisan migrate --force
php artisan queue:restart
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan up

cd ../frontend/user-app
npm ci
VITE_API_URL=https://api.your-domain.com npm run build

cd ../admin-app
npm ci
VITE_API_URL=https://api.your-domain.com npm run build

sudo supervisorctl restart tarot-queue:*
sudo systemctl reload nginx
```
