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

class ReaderBookingManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_reader_can_create_confirm_complete_and_cancel_own_bookings(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $readerUser = User::factory()->create(['role' => 'reader']);
        $reader = $this->makeReader($readerUser);
        $service = $this->makeService();

        Sanctum::actingAs($readerUser);

        $created = $this->postJson('/api/reader/bookings', [
            'customer_name' => 'Reader Customer',
            'customer_email' => 'reader-customer@example.com',
            'customer_phone' => '0900000002',
            'service_id' => $service->id,
            'booked_at' => now()->addDays(3)->setTime(10, 0)->toDateTimeString(),
            'note' => 'Created by reader',
        ])->assertCreated();

        $bookingId = $created->json('id');
        $this->assertDatabaseHas('bookings', [
            'id' => $bookingId,
            'reader_id' => $reader->id,
            'status' => 'pending',
        ]);

        $this->assertDatabaseHas('app_notifications', [
            'user_id' => $admin->id,
            'type' => 'reader.booking.created',
        ]);

        $this->patchJson("/api/reader/bookings/{$bookingId}/confirm")->assertOk();
        $this->assertSame('confirmed', Booking::find($bookingId)->status);

        Booking::find($bookingId)->update([
            'booked_at' => now()->subHours(2),
            'payment_status' => 'paid',
            'paid_at' => now()->subHours(3),
        ]);
        $this->patchJson("/api/reader/bookings/{$bookingId}/complete")->assertOk();
        $this->assertSame('completion_pending', Booking::find($bookingId)->status);

        $cancelBooking = $this->makeBooking($reader, $service, ['status' => 'pending']);
        $this->patchJson("/api/reader/bookings/{$cancelBooking->id}/cancel", [
            'cancel_reason' => 'Reader bi ban dot xuat',
        ])->assertOk();
        $this->assertSame('cancelled', $cancelBooking->refresh()->status);
        $this->assertSame('reader', $cancelBooking->cancelled_by);
        $this->assertSame('Reader bi ban dot xuat', $cancelBooking->cancel_reason);
    }

    public function test_reader_cancel_booking_requires_reason(): void
    {
        $readerUser = User::factory()->create(['role' => 'reader']);
        $reader = $this->makeReader($readerUser);
        $service = $this->makeService();
        $booking = $this->makeBooking($reader, $service, ['status' => 'pending']);

        Sanctum::actingAs($readerUser);

        $this->patchJson("/api/reader/bookings/{$booking->id}/cancel")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['cancel_reason']);

        $this->assertSame('pending', $booking->refresh()->status);
        $this->assertNull($booking->cancelled_at);
        $this->assertNull($booking->cancel_reason);
    }

    public function test_reader_cancel_paid_booking_marks_refund_pending(): void
    {
        $readerUser = User::factory()->create(['role' => 'reader']);
        $reader = $this->makeReader($readerUser);
        $service = $this->makeService();
        $booking = $this->makeBooking($reader, $service, [
            'status' => 'confirmed',
            'payment_status' => 'paid',
            'payment_method' => 'bank',
            'paid_at' => now(),
        ]);

        $payment = Payment::create([
            'booking_id' => $booking->id,
            'gateway' => 'bank',
            'amount' => 250000,
            'status' => Payment::SUCCESS,
            'paid_at' => now(),
        ]);

        Sanctum::actingAs($readerUser);

        $this->patchJson("/api/reader/bookings/{$booking->id}/cancel", [
            'cancel_reason' => 'Reader huy lich da thanh toan',
        ])->assertOk()
            ->assertJson(['payment_status' => 'refund_pending']);

        $this->assertSame('cancelled', $booking->refresh()->status);
        $this->assertSame('refund_pending', $booking->payment_status);
        $this->assertSame(Payment::SUCCESS, $payment->refresh()->status);
    }

    public function test_reader_cannot_update_another_readers_booking(): void
    {
        $readerUser = User::factory()->create(['role' => 'reader']);
        $otherReaderUser = User::factory()->create(['role' => 'reader']);
        $reader = $this->makeReader($readerUser);
        $otherReader = $this->makeReader($otherReaderUser, 'Other Reader');
        $service = $this->makeService();
        $booking = $this->makeBooking($otherReader, $service);

        Sanctum::actingAs($readerUser);

        $this->putJson("/api/reader/bookings/{$booking->id}", [
            'service_id' => $service->id,
            'booked_at' => now()->addDays(4)->setTime(11, 0)->toDateTimeString(),
        ])->assertNotFound();

        $this->assertSame($otherReader->id, $booking->refresh()->reader_id);
    }

    public function test_reader_update_booking_checks_time_conflicts(): void
    {
        $readerUser = User::factory()->create(['role' => 'reader']);
        $reader = $this->makeReader($readerUser);
        $service = $this->makeService();
        $first = $this->makeBooking($reader, $service, [
            'booked_at' => now()->addDays(5)->setTime(10, 0),
        ]);
        $second = $this->makeBooking($reader, $service, [
            'booked_at' => now()->addDays(5)->setTime(12, 0),
        ]);

        Sanctum::actingAs($readerUser);

        $this->putJson("/api/reader/bookings/{$second->id}", [
            'service_id' => $service->id,
            'booked_at' => $first->booked_at->copy()->addMinutes(15)->toDateTimeString(),
        ])->assertUnprocessable();
    }

    public function test_reader_update_booking_ignores_expired_pending_unpaid_conflicts(): void
    {
        $readerUser = User::factory()->create(['role' => 'reader']);
        $reader = $this->makeReader($readerUser);
        $service = $this->makeService();
        $expired = $this->makeBooking($reader, $service, [
            'booked_at' => now()->addDays(5)->setTime(10, 0),
            'status' => 'pending',
            'payment_status' => 'unpaid',
            'expires_at' => now()->subMinute(),
        ]);
        $editable = $this->makeBooking($reader, $service, [
            'booked_at' => now()->addDays(5)->setTime(12, 0),
        ]);

        Sanctum::actingAs($readerUser);

        $this->putJson("/api/reader/bookings/{$editable->id}", [
            'service_id' => $service->id,
            'booked_at' => $expired->booked_at->copy()->addMinutes(15)->toDateTimeString(),
        ])->assertOk();

        $this->assertSame('10:15', $editable->refresh()->booked_at->format('H:i'));
    }

    public function test_reader_cannot_update_completion_pending_booking(): void
    {
        $readerUser = User::factory()->create(['role' => 'reader']);
        $reader = $this->makeReader($readerUser);
        $service = $this->makeService();
        $booking = $this->makeBooking($reader, $service, [
            'status' => 'completion_pending',
            'payment_status' => 'paid',
            'completion_requested_at' => now(),
            'completion_auto_complete_at' => now()->addHours(24),
        ]);

        Sanctum::actingAs($readerUser);

        $this->putJson("/api/reader/bookings/{$booking->id}", [
            'booked_at' => now()->addDays(4)->setTime(14, 0)->toDateTimeString(),
        ])->assertUnprocessable();

        $this->assertSame('completion_pending', $booking->refresh()->status);
    }

    private function makeReader(User $readerUser, string $name = 'QA Reader'): Reader
    {
        return Reader::create([
            'user_id' => $readerUser->id,
            'name' => $name,
            'title' => 'Tarot Reader',
            'bio' => 'QA bio',
            'email' => $readerUser->email,
        ]);
    }

    private function makeService(): Service
    {
        return Service::create([
            'name' => 'QA Service',
            'description' => 'QA service',
            'duration' => 60,
            'price' => 250000,
            'is_active' => true,
        ]);
    }

    private function makeBooking(Reader $reader, Service $service, array $overrides = []): Booking
    {
        $user = User::factory()->create(['role' => 'user']);

        return Booking::create(array_merge([
            'user_id' => $user->id,
            'reader_id' => $reader->id,
            'service_id' => $service->id,
            'booked_at' => now()->addDays(2)->setTime(10, 0),
            'status' => 'pending',
            'payment_status' => 'unpaid',
        ], $overrides));
    }
}
