<?php

namespace App\Services\Payment;

use App\Models\AppSetting;

class PaymentGatewayConfig
{
    public function vnpay(): array
    {
        return [
            'tmn_code' => $this->value('vnpay_tmn_code', config('vnpay.tmn_code')),
            'hash_secret' => $this->value('vnpay_hash_secret', config('vnpay.hash_secret')),
            'url' => $this->value('vnpay_url', config('vnpay.url')),
            'return_url' => $this->value('vnpay_return_url', config('vnpay.return_url')),
            'ipn_url' => $this->value('vnpay_ipn_url', config('vnpay.ipn_url')),
        ];
    }

    public function momo(): array
    {
        return [
            'partner_code' => $this->value('momo_partner_code', config('momo.partner_code')),
            'access_key' => $this->value('momo_access_key', config('momo.access_key')),
            'secret_key' => $this->value('momo_secret_key', config('momo.secret_key')),
            'endpoint' => $this->value('momo_endpoint', config('momo.endpoint')),
            'redirect_url' => $this->value('momo_redirect_url', config('momo.redirect_url')),
            'ipn_url' => $this->value('momo_ipn_url', config('momo.ipn_url')),
            'lang' => $this->value('momo_lang', config('momo.lang', 'vi')),
        ];
    }

    public function missingVnpay(): array
    {
        return $this->missing([
            'VNPAY_TMN_CODE' => $this->vnpay()['tmn_code'],
            'VNPAY_HASH_SECRET' => $this->vnpay()['hash_secret'],
            'VNPAY_URL' => $this->vnpay()['url'],
            'VNPAY_RETURN_URL' => $this->vnpay()['return_url'],
        ]);
    }

    public function missingMomo(): array
    {
        $momo = $this->momo();

        return $this->missing([
            'MOMO_PARTNER_CODE' => $momo['partner_code'],
            'MOMO_ACCESS_KEY' => $momo['access_key'],
            'MOMO_SECRET_KEY' => $momo['secret_key'],
            'MOMO_ENDPOINT' => $momo['endpoint'],
            'MOMO_REDIRECT_URL' => $momo['redirect_url'],
            'MOMO_IPN_URL' => $momo['ipn_url'],
        ]);
    }

    public function hasStoredValue(string $key): bool
    {
        return filled(AppSetting::where('key', $key)->value('value'));
    }

    private function value(string $key, ?string $fallback = null): ?string
    {
        $value = AppSetting::where('key', $key)->value('value');

        return filled($value) ? $value : $fallback;
    }

    private function missing(array $values): array
    {
        return array_keys(array_filter($values, fn($value) => blank($value)));
    }
}
