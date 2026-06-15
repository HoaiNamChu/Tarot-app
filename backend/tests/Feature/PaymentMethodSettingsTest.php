<?php

namespace Tests\Feature;

use App\Models\AppSetting;
use App\Models\Booking;
use App\Models\Reader;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PaymentMethodSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_toggle_payment_methods_and_public_settings_expose_flags(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        $this->putJson('/api/admin/settings', $this->settingsPayload([
            'payment_vnpay_enabled' => false,
            'payment_bank_enabled' => true,
            'payment_momo_enabled' => true,
            'momo_phone' => '0900000000',
            'momo_account_name' => 'LUNA ARCANA MOMO',
            'momo_transfer_prefix' => 'MOMO',
        ]))->assertOk()
            ->assertJsonPath('settings.payment_vnpay_enabled', false)
            ->assertJsonPath('settings.payment_bank_enabled', true)
            ->assertJsonPath('settings.payment_momo_enabled', true);

        $this->assertFalse(AppSetting::getBool('payment_vnpay_enabled', true));
        $this->assertTrue(AppSetting::getBool('payment_bank_enabled', false));
        $this->assertTrue(AppSetting::getBool('payment_momo_enabled', false));

        $this->getJson('/api/settings/payment')
            ->assertOk()
            ->assertJson([
                'payment_vnpay_enabled' => false,
                'payment_bank_enabled' => true,
                'payment_momo_enabled' => true,
                'payment_momo_gateway_configured' => false,
                'momo_phone' => '0900000000',
                'momo_account_name' => 'LUNA ARCANA MOMO',
                'momo_transfer_prefix' => 'MOMO',
            ]);
    }

    public function test_admin_can_manage_gateway_config_without_exposing_or_erasing_secrets(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        $payload = $this->settingsPayload([
            'payment_vnpay_enabled' => true,
            'payment_momo_enabled' => true,
            'vnpay_tmn_code' => 'DBVNPAY',
            'vnpay_hash_secret' => 'db-vnpay-secret',
            'vnpay_url' => 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
            'vnpay_return_url' => 'https://api.example.com/api/payment/vnpay/return',
            'vnpay_ipn_url' => 'https://api.example.com/api/payment/vnpay/ipn',
            'momo_partner_code' => 'MOMO_DB',
            'momo_access_key' => 'momo-access',
            'momo_secret_key' => 'momo-secret',
            'momo_endpoint' => 'https://test-payment.momo.vn/v2/gateway/api/create',
            'momo_redirect_url' => 'https://api.example.com/api/payment/momo/return',
            'momo_ipn_url' => 'https://api.example.com/api/payment/momo/ipn',
            'momo_lang' => 'vi',
        ]);

        $this->putJson('/api/admin/settings', $payload)
            ->assertOk()
            ->assertJsonPath('settings.vnpay_tmn_code', 'DBVNPAY')
            ->assertJsonPath('settings.vnpay_hash_secret', '')
            ->assertJsonPath('settings.vnpay_hash_secret_configured', true)
            ->assertJsonPath('settings.momo_secret_key', '')
            ->assertJsonPath('settings.momo_secret_key_configured', true)
            ->assertJsonPath('settings.momo_gateway_configured', true);

        $this->assertDatabaseHas('app_settings', ['key' => 'vnpay_hash_secret', 'value' => 'db-vnpay-secret']);
        $this->assertDatabaseHas('app_settings', ['key' => 'momo_secret_key', 'value' => 'momo-secret']);

        $payload['vnpay_hash_secret'] = '';
        $payload['momo_secret_key'] = '';
        $payload['vnpay_tmn_code'] = 'DBVNPAY2';

        $this->putJson('/api/admin/settings', $payload)
            ->assertOk()
            ->assertJsonPath('settings.vnpay_tmn_code', 'DBVNPAY2')
            ->assertJsonPath('settings.vnpay_hash_secret', '')
            ->assertJsonPath('settings.momo_secret_key', '');

        $this->assertDatabaseHas('app_settings', ['key' => 'vnpay_hash_secret', 'value' => 'db-vnpay-secret']);
        $this->assertDatabaseHas('app_settings', ['key' => 'momo_secret_key', 'value' => 'momo-secret']);

        $this->getJson('/api/settings/payment')
            ->assertOk()
            ->assertJsonPath('payment_vnpay_gateway_configured', true)
            ->assertJsonPath('payment_momo_gateway_configured', true);
    }

    public function test_disabled_vnpay_method_cannot_be_used_for_payment(): void
    {
        AppSetting::updateOrCreate(['key' => 'payment_vnpay_enabled'], ['value' => '0']);

        $user = User::factory()->create();
        $booking = $this->makeBooking(['user_id' => $user->id]);

        Sanctum::actingAs($user);

        $this->patchJson("/api/bookings/{$booking->id}/pay", [
            'payment_method' => 'vnpay',
        ])->assertUnprocessable()
            ->assertJson(['message' => 'Phuong thuc thanh toan VNPay dang tam tat.']);

        $this->assertDatabaseCount('payments', 0);
        $this->assertSame('unpaid', $booking->refresh()->payment_status);
    }

    public function test_disabled_bank_method_cannot_be_used_for_payment(): void
    {
        AppSetting::updateOrCreate(['key' => 'payment_bank_enabled'], ['value' => '0']);

        $user = User::factory()->create();
        $booking = $this->makeBooking(['user_id' => $user->id]);

        Sanctum::actingAs($user);

        $this->patchJson("/api/bookings/{$booking->id}/pay", [
            'payment_method' => 'bank',
            'proof_code' => 'FT123',
        ])->assertUnprocessable()
            ->assertJson(['message' => 'Phuong thuc chuyen khoan dang tam tat.']);

        $this->assertDatabaseCount('payments', 0);
        $this->assertSame('unpaid', $booking->refresh()->payment_status);
    }

    public function test_disabled_momo_method_cannot_be_used_for_payment(): void
    {
        AppSetting::updateOrCreate(['key' => 'payment_momo_enabled'], ['value' => '0']);

        $user = User::factory()->create();
        $booking = $this->makeBooking(['user_id' => $user->id]);

        Sanctum::actingAs($user);

        $this->patchJson("/api/bookings/{$booking->id}/pay", [
            'payment_method' => 'momo',
            'proof_code' => 'MOMO123',
        ])->assertUnprocessable()
            ->assertJson(['message' => 'Phuong thuc thanh toan MoMo dang tam tat.']);

        $this->assertDatabaseCount('payments', 0);
        $this->assertSame('unpaid', $booking->refresh()->payment_status);
    }

    public function test_momo_payment_returns_gateway_url(): void
    {
        AppSetting::updateOrCreate(['key' => 'payment_momo_enabled'], ['value' => '1']);
        config([
            'momo.partner_code' => 'MOMO_TEST',
            'momo.access_key' => 'access',
            'momo.secret_key' => 'secret',
            'momo.endpoint' => 'https://test-payment.momo.vn/v2/gateway/api/create',
            'momo.redirect_url' => 'https://api.example.com/api/payment/momo/return',
            'momo.ipn_url' => 'https://api.example.com/api/payment/momo/ipn',
        ]);
        Http::fake([
            'test-payment.momo.vn/*' => Http::response([
                'resultCode' => 0,
                'message' => 'Successful.',
                'payUrl' => 'https://test-payment.momo.vn/v2/gateway/pay?t=abc',
                'orderId' => 'MOMO-1',
                'requestId' => 'request-1',
                'amount' => 250000,
            ], 200),
        ]);

        $user = User::factory()->create();
        $booking = $this->makeBooking(['user_id' => $user->id]);

        Sanctum::actingAs($user);

        $this->patchJson("/api/bookings/{$booking->id}/pay", [
            'payment_method' => 'momo',
        ])->assertOk()
            ->assertJson([
                'payment_url' => 'https://test-payment.momo.vn/v2/gateway/pay?t=abc',
            ]);

        $booking->refresh();
        $this->assertSame('momo', $booking->payment_method);
        $this->assertDatabaseHas('payments', [
            'booking_id' => $booking->id,
            'gateway' => 'momo',
            'status' => 'pending',
        ]);
    }

    public function test_enabled_momo_without_gateway_config_returns_clear_error(): void
    {
        AppSetting::updateOrCreate(['key' => 'payment_momo_enabled'], ['value' => '1']);
        config([
            'momo.partner_code' => null,
            'momo.access_key' => null,
            'momo.secret_key' => null,
            'momo.redirect_url' => null,
            'momo.ipn_url' => null,
        ]);

        $user = User::factory()->create();
        $booking = $this->makeBooking(['user_id' => $user->id]);

        Sanctum::actingAs($user);

        $this->patchJson("/api/bookings/{$booking->id}/pay", [
            'payment_method' => 'momo',
        ])->assertUnprocessable()
            ->assertJsonPath('success', false)
            ->assertJsonPath('missing_config.0', 'MOMO_PARTNER_CODE');

        $this->assertSame('unpaid', $booking->refresh()->payment_status);
    }

    private function settingsPayload(array $overrides = []): array
    {
        return array_merge([
            'brand_name' => 'Luna Arcana',
            'contact_email' => 'hello@example.com',
            'contact_phone' => '0900000000',
            'contact_address' => 'HCMC',
            'bank_name' => 'Vietcombank',
            'bank_bin' => '970436',
            'bank_account_number' => '1234567890',
            'bank_account_name' => 'LUNA ARCANA',
            'bank_transfer_prefix' => 'LUNA',
            'payment_vnpay_enabled' => true,
            'payment_bank_enabled' => true,
            'payment_momo_enabled' => false,
            'momo_phone' => '',
            'momo_account_name' => '',
            'momo_transfer_prefix' => 'MOMO',
            'reader_commission_percent' => 30,
        ], $overrides);
    }

    private function makeBooking(array $overrides = []): Booking
    {
        $user = isset($overrides['user_id'])
            ? User::findOrFail($overrides['user_id'])
            : User::factory()->create();

        $reader = Reader::create([
            'name' => 'QA Reader',
            'title' => 'Tarot Reader',
            'bio' => 'QA bio',
        ]);

        $service = Service::create([
            'name' => 'QA Service',
            'description' => 'QA service',
            'duration' => 60,
            'price' => 250000,
        ]);

        return Booking::create(array_merge([
            'user_id' => $user->id,
            'reader_id' => $reader->id,
            'service_id' => $service->id,
            'booked_at' => now()->addDays(2)->setTime(10, 0),
            'status' => 'pending',
            'payment_status' => 'unpaid',
            'expires_at' => now()->addMinutes(15),
        ], $overrides))->load(['user', 'reader', 'service']);
    }
}
