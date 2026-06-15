<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Payment;
use App\Models\Reader;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CommonFailureTest extends TestCase
{
    use RefreshDatabase;

    public function test_api_unauthenticated_requests_return_json_401_instead_of_redirect(): void
    {
        $this->getJson('/api/bookings')
            ->assertUnauthorized()
            ->assertJsonStructure(['message']);
    }

    public function test_normal_user_cannot_access_admin_routes(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'user']));

        $this->getJson('/api/admin/bookings')
            ->assertForbidden()
            ->assertJsonStructure(['message']);
    }

    public function test_booking_validation_rejects_missing_required_fields(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/bookings', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['reader_id', 'service_id', 'booked_at']);
    }

    public function test_user_cannot_pay_another_users_booking(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $booking = $this->makeBooking(['user_id' => $owner->id]);

        Sanctum::actingAs($other);

        $this->patchJson("/api/bookings/{$booking->id}/pay", [
            'payment_method' => 'bank',
            'proof_code' => 'FT999',
        ])->assertStatus(409)
            ->assertJson([
                'success' => false,
                'message' => 'Khong the xu ly thanh toan luc nay. Vui long thu lai sau.',
            ]);

        $this->assertDatabaseCount('payments', 0);
        $this->assertSame('unpaid', $booking->refresh()->payment_status);
    }

    public function test_expired_booking_payment_returns_410_and_cancels_booking(): void
    {
        $user = User::factory()->create();
        $booking = $this->makeBooking([
            'user_id' => $user->id,
            'expires_at' => now()->subMinute(),
        ]);

        Sanctum::actingAs($user);

        $this->patchJson("/api/bookings/{$booking->id}/pay", [
            'payment_method' => 'bank',
            'proof_code' => 'FT123',
        ])->assertStatus(410)
            ->assertJsonStructure(['message']);

        $booking->refresh();
        $this->assertSame('cancelled', $booking->status);
        $this->assertNotNull($booking->cancelled_at);
        $this->assertDatabaseCount('payments', 0);
    }

    public function test_admin_refund_cannot_exceed_booking_amount(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        $booking = $this->makeBooking([
            'payment_status' => 'paid',
            'payment_method' => 'bank',
            'paid_at' => now(),
        ]);

        Payment::create([
            'booking_id' => $booking->id,
            'gateway' => 'bank',
            'amount' => 250000,
            'status' => Payment::SUCCESS,
            'paid_at' => now(),
        ]);

        $this->patchJson("/api/admin/bookings/{$booking->id}/payment", [
            'payment_status' => 'refunded',
            'payment_method' => 'bank',
            'refund_amount' => 300000,
            'refund_reason' => 'Over refund check',
        ])->assertUnprocessable()
            ->assertJson(['message' => 'So tien hoan khong duoc lon hon gia tri booking.']);

        $payment = $booking->payments()->latest('id')->first();
        $this->assertSame('paid', $booking->refresh()->payment_status);
        $this->assertSame(Payment::SUCCESS, $payment->refresh()->status);
    }

    public function test_admin_cannot_refund_booking_that_was_not_paid(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        $booking = $this->makeBooking([
            'payment_status' => 'unpaid',
            'payment_method' => 'bank',
        ]);

        $this->patchJson("/api/admin/bookings/{$booking->id}/payment", [
            'payment_status' => 'refunded',
            'payment_method' => 'bank',
            'refund_amount' => 250000,
            'refund_reason' => 'Should not be possible',
        ])->assertUnprocessable()
            ->assertJson(['message' => 'Chi co the hoan tien booking da thanh toan.']);

        $this->assertSame('unpaid', $booking->refresh()->payment_status);
        $this->assertDatabaseCount('payments', 0);
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
