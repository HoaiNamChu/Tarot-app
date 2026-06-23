<?php

namespace App\Console\Commands;

use App\Models\AppSetting;
use App\Services\Payment\PaymentGatewayConfig;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

class AppPreflightCommand extends Command
{
    protected $signature = 'app:preflight {--production : Require production-safe settings}';

    protected $description = 'Check runtime configuration before deployment or launch';

    public function handle(): int
    {
        $strict = (bool) $this->option('production');
        $failures = [];
        $warnings = [];
        $gatewayConfig = app(PaymentGatewayConfig::class);
        $databaseOk = $this->databaseWorks();

        $this->line('Running application preflight checks...');

        $this->check('APP_KEY is set', filled(config('app.key')), $failures);
        $this->check('Database connection works', $databaseOk, $failures);
        $this->check('Storage path is writable', is_writable(storage_path()), $failures);
        $this->check('Cache path is writable', is_writable(storage_path('framework/cache')), $failures);
        $this->check('Logs path is writable', is_writable(storage_path('logs')), $failures);
        $this->check('APP_URL is set', filled(config('app.url')), $failures);
        $this->check('FRONTEND_URL is set', filled(config('tarot.frontend_url')), $failures);
        $this->check('ADMIN_FRONTEND_URL is set', filled(config('tarot.admin_frontend_url')), $failures);
        $this->check('Queue driver is set', filled(config('queue.default')), $failures);
        $this->check('Cache driver is set', filled(config('cache.default')), $failures);
        $this->check('Mail driver is set', filled(config('mail.default')), $failures);
        $this->check('MAIL_SCHEME is valid', $this->mailSchemeIsValid(), $failures);
        $this->check('bookings:expire command exists', $this->commandExists('bookings:expire'), $failures);
        $this->check('bookings:send-reminders command exists', $this->commandExists('bookings:send-reminders'), $failures);
        $this->check('bookings:auto-complete command exists', $this->commandExists('bookings:auto-complete'), $failures);
        if ($databaseOk) {
            $this->checkPaymentConfig($gatewayConfig, $failures, $warnings);
        } else {
            $this->addWarning('Skipped payment setting checks because database is not reachable', $warnings);
        }

        if ($strict) {
            $this->check('APP_DEBUG is false', config('app.debug') === false, $failures);
            $this->check('APP_ENV is production', config('app.env') === 'production', $failures);
            $this->check('APP_URL is not localhost', !$this->isLocalUrl(config('app.url')), $failures);
            $this->check('FRONTEND_URL is not localhost', !$this->isLocalUrl(config('tarot.frontend_url')), $failures);
            $this->check('ADMIN_FRONTEND_URL is not localhost', !$this->isLocalUrl(config('tarot.admin_frontend_url')), $failures);
            $this->check('APP_URL uses HTTPS', $this->isHttpsUrl(config('app.url')), $failures);
            $this->check('FRONTEND_URL uses HTTPS', $this->isHttpsUrl(config('tarot.frontend_url')), $failures);
            $this->check('ADMIN_FRONTEND_URL uses HTTPS', $this->isHttpsUrl(config('tarot.admin_frontend_url')), $failures);
            $this->check('Queue driver is not sync', config('queue.default') !== 'sync', $failures);
            $this->check('Mail driver is not log/array', !in_array(config('mail.default'), ['log', 'array'], true), $failures);
            $this->check('Mail from address is production-safe', !$this->isExampleEmail(config('mail.from.address')), $failures);
            $this->checkSmtpConfig($failures);
            if ($databaseOk) {
                $this->checkBankConfig($failures);
            } else {
                $this->addWarning('Skipped bank setting checks because database is not reachable', $warnings);
            }
            $this->addWarning('Cron runs php artisan schedule:run every minute on the server', $warnings);
            $this->addWarning('Queue worker is supervised on the server when QUEUE_CONNECTION is not sync', $warnings);
            $this->addWarning('Database backup and restore process has been tested', $warnings);
        }

        if ($warnings) {
            $this->newLine();
            $this->warn('Preflight warnings / manual checks:');
            foreach ($warnings as $warning) {
                $this->line('- ' . $warning);
            }
        }

        if ($failures) {
            $this->newLine();
            $this->error('Preflight failed. Fix these items before opening to customers:');
            foreach ($failures as $failure) {
                $this->line('- ' . $failure);
            }

            return self::FAILURE;
        }

        $this->info('Preflight passed.');

        return self::SUCCESS;
    }

    private function check(string $label, bool $passed, array &$failures): void
    {
        if ($passed) {
            $this->line('[OK] ' . $label);
            return;
        }

        $this->line('[FAIL] ' . $label);
        $failures[] = $label;
    }

    private function addWarning(string $label, array &$warnings): void
    {
        $this->line('[WARN] ' . $label);
        $warnings[] = $label;
    }

    private function databaseWorks(): bool
    {
        try {
            DB::select('select 1');
            return true;
        } catch (\Throwable) {
            return false;
        }
    }

    private function isLocalUrl(?string $url): bool
    {
        if (!$url) {
            return true;
        }

        $host = parse_url($url, PHP_URL_HOST);

        return in_array($host, ['localhost', '127.0.0.1', '::1'], true);
    }

    private function isHttpsUrl(?string $url): bool
    {
        return parse_url((string) $url, PHP_URL_SCHEME) === 'https';
    }

    private function commandExists(string $command): bool
    {
        return array_key_exists($command, Artisan::all());
    }

    private function mailSchemeIsValid(): bool
    {
        $scheme = config('mail.mailers.smtp.scheme');

        return blank($scheme) || in_array($scheme, ['smtp', 'smtps'], true);
    }

    private function checkSmtpConfig(array &$failures): void
    {
        if (config('mail.default') !== 'smtp') {
            return;
        }

        $this->check('SMTP host is set', filled(config('mail.mailers.smtp.host')), $failures);
        $this->check('SMTP port is set', filled(config('mail.mailers.smtp.port')), $failures);
        $this->check('SMTP username is set', filled(config('mail.mailers.smtp.username')), $failures);
        $this->check('SMTP password is set', filled(config('mail.mailers.smtp.password')), $failures);
    }

    private function checkBankConfig(array &$failures): void
    {
        if (!AppSetting::getBool('payment_bank_enabled', true)) {
            return;
        }

        $bank = config('tarot.bank');
        $this->check('BANK_BIN is set when bank payment is enabled', filled($bank['bin'] ?? null), $failures);
        $this->check('BANK_ACCOUNT_NUMBER is set when bank payment is enabled', filled($bank['account_number'] ?? null), $failures);
        $this->check('BANK_ACCOUNT_NAME is set when bank payment is enabled', filled($bank['account_name'] ?? null), $failures);
    }

    private function checkPaymentConfig(PaymentGatewayConfig $gatewayConfig, array &$failures, array &$warnings): void
    {
        if (AppSetting::getBool('payment_vnpay_enabled', true)) {
            $missing = $gatewayConfig->missingVnpay();
            $this->check('VNPay config is complete when enabled', $missing === [], $failures);
            if ($missing !== []) {
                $this->addWarning('Missing VNPay config: ' . implode(', ', $missing), $warnings);
            }
        }

        if (AppSetting::getBool('payment_momo_enabled', false)) {
            $missing = $gatewayConfig->missingMomo();
            $this->check('MoMo config is complete when enabled', $missing === [], $failures);
            if ($missing !== []) {
                $this->addWarning('Missing MoMo config: ' . implode(', ', $missing), $warnings);
            }
        }
    }

    private function isExampleEmail(?string $email): bool
    {
        return blank($email) || str_ends_with((string) $email, '@example.com');
    }
}
