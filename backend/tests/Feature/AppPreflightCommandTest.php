<?php

namespace Tests\Feature;

use App\Models\AppSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AppPreflightCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_basic_preflight_passes_in_testing_environment(): void
    {
        $this->artisan('app:preflight')
            ->expectsOutputToContain('Preflight passed.')
            ->assertSuccessful();
    }

    public function test_production_preflight_fails_for_local_debug_settings(): void
    {
        $this->artisan('app:preflight --production')
            ->expectsOutputToContain('Preflight failed.')
            ->assertFailed();
    }

    public function test_preflight_fails_for_invalid_mail_scheme(): void
    {
        config(['mail.mailers.smtp.scheme' => 'tls']);

        $this->artisan('app:preflight')
            ->expectsOutputToContain('[FAIL] MAIL_SCHEME is valid')
            ->assertFailed();
    }

    public function test_preflight_fails_when_enabled_momo_gateway_is_incomplete(): void
    {
        AppSetting::updateOrCreate(['key' => 'payment_vnpay_enabled'], ['value' => '0']);
        AppSetting::updateOrCreate(['key' => 'payment_momo_enabled'], ['value' => '1']);
        config([
            'momo.partner_code' => null,
            'momo.access_key' => null,
            'momo.secret_key' => null,
            'momo.redirect_url' => null,
            'momo.ipn_url' => null,
        ]);

        $this->artisan('app:preflight')
            ->expectsOutputToContain('[FAIL] MoMo config is complete when enabled')
            ->expectsOutputToContain('Missing MoMo config')
            ->assertFailed();
    }
}
