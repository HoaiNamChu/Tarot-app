<?php

namespace Tests\Feature;

use App\Mail\BookingCreated;
use App\Models\Booking;
use App\Models\Reader;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminBookingTest extends TestCase
{
    use RefreshDatabase;

    public function test_failed_admin_booking_does_not_leave_orphan_customer(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $customer = User::factory()->create(['email' => 'existing@example.com']);
        Sanctum::actingAs($admin);

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

        Booking::create([
            'user_id' => $customer->id,
            'reader_id' => $reader->id,
            'service_id' => $service->id,
            'booked_at' => now()->addDays(3)->setTime(10, 0),
            'status' => 'pending',
            'payment_status' => 'unpaid',
        ]);

        $this->postJson('/api/admin/bookings', [
            'customer_name' => 'Orphan Check',
            'customer_email' => 'orphan-check@example.com',
            'reader_id' => $reader->id,
            'service_id' => $service->id,
            'date' => now()->addDays(3)->toDateString(),
            'time' => '10:30',
        ])->assertUnprocessable();

        $this->assertDatabaseMissing('users', ['email' => 'orphan-check@example.com']);
    }

    public function test_user_booking_queues_customer_and_admin_mail(): void
    {
        config(['tarot.admin_email' => 'admin@example.com']);
        Mail::fake();

        $user = User::factory()->create(['email' => 'customer@example.com']);
        Sanctum::actingAs($user);

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

        $response = $this->postJson('/api/bookings', [
            'reader_id' => $reader->id,
            'service_id' => $service->id,
            'booked_at' => now()->addDays(5)->setTime(14, 0)->toDateTimeString(),
            'note' => 'Mail test',
        ])->assertCreated();

        $bookingId = $response->json('booking_id');

        Mail::assertQueued(BookingCreated::class, function (BookingCreated $mail) use ($bookingId) {
            return $mail->hasTo('customer@example.com') && $mail->booking->id === $bookingId;
        });

        Mail::assertQueued(BookingCreated::class, function (BookingCreated $mail) use ($bookingId) {
            return $mail->hasTo('admin@example.com') && $mail->booking->id === $bookingId;
        });
    }
}
