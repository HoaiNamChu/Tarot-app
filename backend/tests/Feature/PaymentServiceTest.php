<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Reader;
use App\Models\Service;
use App\Models\User;
use App\Services\Payment\PaymentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PaymentServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_reuses_pending_vnpay_payment_for_same_booking(): void
    {
        $booking = $this->makeBooking();

        $service = app(PaymentService::class);

        $first = $service->create($booking, 'vnpay');
        $second = $service->create($booking, 'vnpay');

        $this->assertSame($first->id, $second->id);
        $this->assertDatabaseCount('payments', 1);
    }

    public function test_it_does_not_create_payment_for_non_unpaid_booking(): void
    {
        foreach (['pending_verification', 'paid', 'refund_pending', 'refunded'] as $status) {
            $booking = $this->makeBooking(['payment_status' => $status]);

            try {
                app(PaymentService::class)->create($booking, 'vnpay');
                $this->fail("Payment creation should fail for {$status} bookings.");
            } catch (\Exception) {
                $this->assertDatabaseMissing('payments', ['booking_id' => $booking->id]);
            }
        }
    }

    public function test_it_allows_confirmed_unpaid_booking_after_hold_expired(): void
    {
        $booking = $this->makeBooking([
            'status' => 'confirmed',
            'payment_status' => 'unpaid',
            'expires_at' => now()->subMinute(),
        ]);

        $payment = app(PaymentService::class)->create($booking, 'vnpay');

        $this->assertSame($booking->id, $payment->booking_id);
        $this->assertDatabaseCount('payments', 1);
    }

    private function makeBooking(array $overrides = []): Booking
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

        return Booking::create(array_merge([
            'user_id' => $user->id,
            'reader_id' => $reader->id,
            'service_id' => $service->id,
            'booked_at' => now()->addDay(),
            'status' => 'pending',
            'payment_status' => 'unpaid',
            'expires_at' => now()->addMinutes(15),
        ], $overrides))->load('service');
    }
}
