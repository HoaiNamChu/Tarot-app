<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Payment;
use App\Models\Reader;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VNPayIpnTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['vnpay.hash_secret' => 'test-secret']);
    }

    public function test_it_marks_booking_paid_when_ipn_signature_and_amount_are_valid(): void
    {
        [$booking, $payment] = $this->makePayment();

        $response = $this->getJson('/api/payment/vnpay/ipn?' . http_build_query($this->signedParams($payment)));

        $response->assertOk()
            ->assertJson([
                'RspCode' => '00',
                'Message' => 'Confirm Success',
            ]);

        $booking->refresh();
        $payment->refresh();

        $this->assertSame(Payment::SUCCESS, $payment->status);
        $this->assertSame('VNP123456', $payment->transaction_code);
        $this->assertSame('paid', $booking->payment_status);
        $this->assertSame('confirmed', $booking->status);
        $this->assertNotNull($booking->paid_at);
    }

    public function test_it_rejects_ipn_with_invalid_signature_without_updating_payment(): void
    {
        [$booking, $payment] = $this->makePayment();
        $params = $this->signedParams($payment);
        $params['vnp_SecureHash'] = str_repeat('0', 128);

        $response = $this->getJson('/api/payment/vnpay/ipn?' . http_build_query($params));

        $response->assertOk()
            ->assertJson([
                'RspCode' => '97',
                'Message' => 'Invalid signature',
            ]);

        $this->assertSame(Payment::PENDING, $payment->refresh()->status);
        $this->assertSame('unpaid', $booking->refresh()->payment_status);
        $this->assertSame('pending', $booking->status);
    }

    public function test_it_rejects_ipn_with_amount_mismatch_without_marking_booking_paid(): void
    {
        [$booking, $payment] = $this->makePayment();

        $params = $this->signedParams($payment, [
            'vnp_Amount' => '10000',
        ]);

        $response = $this->getJson('/api/payment/vnpay/ipn?' . http_build_query($params));

        $response->assertOk()
            ->assertJson([
                'RspCode' => '99',
                'Message' => 'Payment processing failed',
            ]);

        $this->assertSame(Payment::PENDING, $payment->refresh()->status);
        $this->assertSame('unpaid', $booking->refresh()->payment_status);
        $this->assertSame('pending', $booking->status);
    }

    public function test_it_is_idempotent_for_already_successful_payments(): void
    {
        [$booking, $payment] = $this->makePayment();
        $params = $this->signedParams($payment);

        $this->getJson('/api/payment/vnpay/ipn?' . http_build_query($params))
            ->assertOk()
            ->assertJson(['RspCode' => '00']);

        $firstPaidAt = $booking->refresh()->paid_at?->toISOString();

        $this->getJson('/api/payment/vnpay/ipn?' . http_build_query($params))
            ->assertOk()
            ->assertJson([
                'RspCode' => '00',
                'Message' => 'Already confirmed',
            ]);

        $this->assertDatabaseCount('payments', 1);
        $this->assertSame(Payment::SUCCESS, $payment->refresh()->status);
        $this->assertSame($firstPaidAt, $booking->refresh()->paid_at?->toISOString());
    }

    public function test_late_success_ipn_does_not_reopen_cancelled_or_expired_booking(): void
    {
        [$booking, $payment] = $this->makePayment();
        $booking->update([
            'status' => 'cancelled',
            'cancelled_at' => now(),
        ]);
        $payment->update(['status' => Payment::EXPIRED]);

        $this->getJson('/api/payment/vnpay/ipn?' . http_build_query($this->signedParams($payment)))
            ->assertOk()
            ->assertJson([
                'RspCode' => '00',
                'Message' => 'Booking is closed',
            ]);

        $this->assertSame(Payment::EXPIRED, $payment->refresh()->status);
        $this->assertSame('unpaid', $booking->refresh()->payment_status);
        $this->assertSame('cancelled', $booking->status);
        $this->assertNull($booking->paid_at);
    }

    public function test_late_success_ipn_does_not_reverse_refunded_booking(): void
    {
        [$booking, $payment] = $this->makePayment();
        $booking->update([
            'payment_status' => 'refunded',
            'status' => 'cancelled',
            'paid_at' => now()->subHour(),
        ]);
        $payment->update([
            'status' => Payment::REFUNDED,
            'refund_amount' => 250000,
            'refund_reason' => 'Manual refund',
            'refunded_at' => now(),
        ]);

        $this->getJson('/api/payment/vnpay/ipn?' . http_build_query($this->signedParams($payment)))
            ->assertOk()
            ->assertJson([
                'RspCode' => '00',
                'Message' => 'Already refunded',
            ]);

        $this->assertSame(Payment::REFUNDED, $payment->refresh()->status);
        $this->assertSame('refunded', $booking->refresh()->payment_status);
        $this->assertSame('cancelled', $booking->status);
    }

    private function makePayment(): array
    {
        $user = User::factory()->create();

        $reader = Reader::create([
            'name' => 'QA Reader',
            'title' => 'Tarot Reader',
            'bio' => 'QA bio',
        ]);

        $service = Service::create([
            'name' => 'QA Service',
            'description' => 'QA service',
            'duration' => 30,
            'price' => 250000,
        ]);

        $booking = Booking::create([
            'user_id' => $user->id,
            'reader_id' => $reader->id,
            'service_id' => $service->id,
            'booked_at' => now()->addDay(),
            'status' => 'pending',
            'payment_status' => 'unpaid',
            'payment_method' => 'vnpay',
            'expires_at' => now()->addMinutes(15),
        ]);

        $payment = Payment::create([
            'booking_id' => $booking->id,
            'gateway' => 'vnpay',
            'amount' => 250000,
            'status' => Payment::PENDING,
        ]);

        return [$booking, $payment];
    }

    private function signedParams(Payment $payment, array $overrides = []): array
    {
        $params = array_merge([
            'vnp_TxnRef' => (string) $payment->id,
            'vnp_Amount' => (string) ($payment->amount * 100),
            'vnp_ResponseCode' => '00',
            'vnp_TransactionNo' => 'VNP123456',
            'vnp_BankCode' => 'NCB',
            'vnp_PayDate' => now()->format('YmdHis'),
        ], $overrides);

        ksort($params);

        $hashData = collect($params)
            ->map(fn ($value, $key) => urlencode($key) . '=' . urlencode($value))
            ->implode('&');

        $params['vnp_SecureHash'] = hash_hmac('sha512', $hashData, config('vnpay.hash_secret'));

        return $params;
    }
}
