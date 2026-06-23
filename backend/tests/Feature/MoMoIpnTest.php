<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Payment;
use App\Models\Reader;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MoMoIpnTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'momo.partner_code' => 'MOMO_TEST',
            'momo.access_key' => 'access',
            'momo.secret_key' => 'secret',
        ]);
    }

    public function test_it_marks_booking_paid_when_ipn_signature_and_amount_are_valid(): void
    {
        [$booking, $payment] = $this->makePayment();

        $this->postJson('/api/payment/momo/ipn', $this->signedParams($payment))
            ->assertOk()
            ->assertJson([
                'resultCode' => 0,
                'message' => 'Confirm Success',
            ]);

        $booking->refresh();
        $payment->refresh();

        $this->assertSame(Payment::SUCCESS, $payment->status);
        $this->assertSame('123456789', $payment->transaction_code);
        $this->assertSame('paid', $booking->payment_status);
        $this->assertSame('confirmed', $booking->status);
        $this->assertNotNull($booking->paid_at);
    }

    public function test_it_rejects_ipn_with_invalid_signature_without_updating_payment(): void
    {
        [$booking, $payment] = $this->makePayment();
        $params = $this->signedParams($payment);
        $params['signature'] = str_repeat('0', 64);

        $this->postJson('/api/payment/momo/ipn', $params)
            ->assertOk()
            ->assertJson([
                'resultCode' => 97,
                'message' => 'Invalid signature',
            ]);

        $this->assertSame(Payment::PENDING, $payment->refresh()->status);
        $this->assertSame('unpaid', $booking->refresh()->payment_status);
    }

    public function test_late_success_ipn_does_not_reopen_cancelled_or_expired_booking(): void
    {
        [$booking, $payment] = $this->makePayment();
        $booking->update([
            'status' => 'cancelled',
            'cancelled_at' => now(),
        ]);
        $payment->update(['status' => Payment::EXPIRED]);

        $this->postJson('/api/payment/momo/ipn', $this->signedParams($payment))
            ->assertOk()
            ->assertJson([
                'resultCode' => 0,
                'message' => 'Booking is closed',
            ]);

        $this->assertSame(Payment::EXPIRED, $payment->refresh()->status);
        $this->assertSame('unpaid', $booking->refresh()->payment_status);
        $this->assertSame('cancelled', $booking->status);
    }

    public function test_late_success_ipn_does_not_reverse_refund_pending_booking(): void
    {
        [$booking, $payment] = $this->makePayment();
        $booking->update([
            'payment_status' => 'refund_pending',
            'status' => 'confirmed',
            'paid_at' => now()->subHour(),
        ]);

        $this->postJson('/api/payment/momo/ipn', $this->signedParams($payment))
            ->assertOk()
            ->assertJson([
                'resultCode' => 0,
                'message' => 'Already refunded',
            ]);

        $this->assertSame(Payment::PENDING, $payment->refresh()->status);
        $this->assertSame('refund_pending', $booking->refresh()->payment_status);
        $this->assertSame('confirmed', $booking->status);
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
            'payment_method' => 'momo',
            'expires_at' => now()->addMinutes(15),
        ]);

        $payment = Payment::create([
            'booking_id' => $booking->id,
            'gateway' => 'momo',
            'amount' => 250000,
            'status' => Payment::PENDING,
        ]);

        return [$booking, $payment];
    }

    private function signedParams(Payment $payment, array $overrides = []): array
    {
        $params = array_merge([
            'partnerCode' => 'MOMO_TEST',
            'orderId' => 'MOMO-' . $payment->id,
            'requestId' => 'request-' . $payment->id,
            'amount' => 250000,
            'orderInfo' => 'Thanh toan booking #' . $payment->booking_id,
            'orderType' => 'momo_wallet',
            'transId' => 123456789,
            'resultCode' => 0,
            'message' => 'Successful.',
            'payType' => 'qr',
            'responseTime' => 1721720663942,
            'extraData' => '',
        ], $overrides);

        $raw = 'accessKey=' . config('momo.access_key')
            . '&amount=' . $params['amount']
            . '&extraData=' . $params['extraData']
            . '&message=' . $params['message']
            . '&orderId=' . $params['orderId']
            . '&orderInfo=' . $params['orderInfo']
            . '&orderType=' . $params['orderType']
            . '&partnerCode=' . $params['partnerCode']
            . '&payType=' . $params['payType']
            . '&requestId=' . $params['requestId']
            . '&responseTime=' . $params['responseTime']
            . '&resultCode=' . $params['resultCode']
            . '&transId=' . $params['transId'];

        $params['signature'] = hash_hmac('sha256', $raw, config('momo.secret_key'));

        return $params;
    }
}
