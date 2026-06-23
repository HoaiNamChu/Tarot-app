<?php

namespace Tests\Feature;

use App\Models\AppNotification;
use App\Models\Booking;
use App\Models\Reader;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BookingCompletionConfirmationTest extends TestCase
{
    use RefreshDatabase;

    public function test_reader_completion_requires_customer_confirmation(): void
    {
        [$booking, $readerUser] = $this->makeConfirmedPastBooking();

        Sanctum::actingAs($readerUser);

        $this->patchJson("/api/reader/bookings/{$booking->id}/complete")
            ->assertOk()
            ->assertJson(['message' => 'Da gui yeu cau khach xac nhan hoan thanh.']);

        $booking->refresh();
        $this->assertSame('completion_pending', $booking->status);
        $this->assertNull($booking->completed_at);
        $this->assertNotNull($booking->completion_requested_at);
        $this->assertNotNull($booking->completion_auto_complete_at);
        $this->assertDatabaseHas('app_notifications', [
            'user_id' => $booking->user_id,
            'type' => 'booking.completion_requested',
        ]);
    }

    public function test_reader_cannot_request_completion_for_unpaid_booking(): void
    {
        [$booking, $readerUser] = $this->makeConfirmedPastBooking([
            'payment_status' => 'unpaid',
            'paid_at' => null,
        ]);

        Sanctum::actingAs($readerUser);

        $this->patchJson("/api/reader/bookings/{$booking->id}/complete")
            ->assertUnprocessable();

        $booking->refresh();
        $this->assertSame('confirmed', $booking->status);
        $this->assertNull($booking->completion_requested_at);
    }

    public function test_admin_cannot_request_completion_for_unpaid_booking(): void
    {
        [$booking] = $this->makeConfirmedPastBooking([
            'payment_status' => 'unpaid',
            'paid_at' => null,
        ]);

        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        $this->patchJson("/api/admin/bookings/{$booking->id}/complete")
            ->assertUnprocessable();

        $booking->refresh();
        $this->assertSame('confirmed', $booking->status);
        $this->assertNull($booking->completion_requested_at);
    }

    public function test_customer_can_confirm_completion(): void
    {
        [$booking] = $this->makeConfirmedPastBooking([
            'status' => 'completion_pending',
            'completion_requested_at' => now()->subHour(),
            'completion_auto_complete_at' => now()->addHours(23),
        ]);

        Sanctum::actingAs($booking->user);

        $this->patchJson("/api/bookings/{$booking->id}/confirm-completion")
            ->assertOk()
            ->assertJsonPath('booking.status', 'completed');

        $booking->refresh();
        $this->assertSame('completed', $booking->status);
        $this->assertNotNull($booking->completed_at);
        $this->assertNotNull($booking->completion_confirmed_at);
    }

    public function test_customer_can_dispute_completion_and_restore_confirmed_status(): void
    {
        [$booking] = $this->makeConfirmedPastBooking([
            'status' => 'completion_pending',
            'completion_requested_at' => now()->subHour(),
            'completion_auto_complete_at' => now()->addHours(23),
        ]);

        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($booking->user);

        $this->patchJson("/api/bookings/{$booking->id}/dispute-completion")
            ->assertOk()
            ->assertJsonPath('booking.status', 'confirmed');

        $booking->refresh();
        $this->assertSame('confirmed', $booking->status);
        $this->assertNotNull($booking->completion_disputed_at);
        $this->assertNull($booking->completion_auto_complete_at);
        $this->assertDatabaseHas('app_notifications', [
            'user_id' => $admin->id,
            'type' => 'booking.completion_disputed',
        ]);
    }

    public function test_completion_pending_booking_auto_completes_after_grace_period(): void
    {
        [$booking] = $this->makeConfirmedPastBooking([
            'status' => 'completion_pending',
            'completion_requested_at' => now()->subHours(25),
            'completion_auto_complete_at' => now()->subMinute(),
        ]);

        $this->artisan('bookings:auto-complete')
            ->expectsOutput('Auto-completed 1 bookings')
            ->assertExitCode(0);

        $booking->refresh();
        $this->assertSame('completed', $booking->status);
        $this->assertNotNull($booking->completed_at);
        $this->assertNotNull($booking->completion_confirmed_at);
    }

    public function test_completion_cannot_be_requested_before_session_end(): void
    {
        [$booking, $readerUser] = $this->makeConfirmedPastBooking([
            'booked_at' => now()->addMinutes(30),
        ]);

        Sanctum::actingAs($readerUser);

        $this->patchJson("/api/reader/bookings/{$booking->id}/complete")
            ->assertUnprocessable();

        $this->assertSame('confirmed', $booking->refresh()->status);
    }

    private function makeConfirmedPastBooking(array $overrides = []): array
    {
        $user = User::factory()->create();
        $readerUser = User::factory()->create(['role' => 'reader']);
        $reader = Reader::create([
            'user_id' => $readerUser->id,
            'name' => 'QA Reader',
            'title' => 'Tarot Reader',
            'bio' => 'QA bio',
            'email' => $readerUser->email,
        ]);
        $service = Service::create([
            'name' => 'QA Service',
            'description' => 'QA service',
            'duration' => 60,
            'price' => 250000,
            'is_active' => true,
        ]);

        $booking = Booking::create(array_merge([
            'user_id' => $user->id,
            'reader_id' => $reader->id,
            'service_id' => $service->id,
            'booked_at' => now()->subHours(2),
            'status' => 'confirmed',
            'payment_status' => 'paid',
            'paid_at' => now()->subHours(3),
        ], $overrides))->load(['user', 'reader.user', 'service']);

        return [$booking, $readerUser];
    }
}
