<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Payment;
use App\Models\Reader;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExpireBookingsCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_cancels_expired_pending_unpaid_bookings_and_expires_open_payments(): void
    {
        $booking = $this->makeBooking([
            'expires_at' => now()->subMinute(),
        ]);

        $pendingPayment = Payment::create([
            'booking_id' => $booking->id,
            'gateway' => 'vnpay',
            'amount' => 250000,
            'status' => Payment::PENDING,
        ]);

        $failedPayment = Payment::create([
            'booking_id' => $booking->id,
            'gateway' => 'vnpay',
            'amount' => 250000,
            'status' => Payment::FAILED,
        ]);

        $this->artisan('bookings:expire')
            ->expectsOutput('Expired 1 bookings')
            ->assertExitCode(0);

        $booking->refresh();
        $pendingPayment->refresh();
        $failedPayment->refresh();

        $this->assertSame('cancelled', $booking->status);
        $this->assertNotNull($booking->cancelled_at);
        $this->assertSame('system', $booking->cancelled_by);
        $this->assertSame('Tu dong huy do het han thanh toan.', $booking->cancel_reason);
        $this->assertSame(Payment::EXPIRED, $pendingPayment->status);
        $this->assertSame(Payment::EXPIRED, $failedPayment->status);
    }

    public function test_it_keeps_paid_or_active_bookings_unchanged(): void
    {
        $paidBooking = $this->makeBooking([
            'payment_status' => 'paid',
            'expires_at' => now()->subMinute(),
        ]);

        $activeBooking = $this->makeBooking([
            'expires_at' => now()->addMinutes(10),
        ]);

        $this->artisan('bookings:expire')
            ->expectsOutput('Expired 0 bookings')
            ->assertExitCode(0);

        $this->assertSame('pending', $paidBooking->refresh()->status);
        $this->assertNull($paidBooking->cancelled_at);
        $this->assertSame('pending', $activeBooking->refresh()->status);
        $this->assertNull($activeBooking->cancelled_at);
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
            'payment_method' => 'vnpay',
            'expires_at' => now()->subMinute(),
        ], $overrides));
    }
}
