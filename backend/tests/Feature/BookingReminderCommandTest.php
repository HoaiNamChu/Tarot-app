<?php

namespace Tests\Feature;

use App\Mail\BookingReminder;
use App\Models\Booking;
use App\Models\Reader;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class BookingReminderCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_queues_customer_and_reader_reminders_for_confirmed_upcoming_bookings(): void
    {
        Mail::fake();
        $booking = $this->makeBooking([
            'booked_at' => now()->addDay(),
            'status' => 'confirmed',
        ]);

        $this->artisan('bookings:send-reminders')
            ->expectsOutput('Sent 2 booking reminder messages')
            ->assertSuccessful();

        Mail::assertQueued(BookingReminder::class, function (BookingReminder $mail) use ($booking) {
            return $mail->booking->id === $booking->id
                && $mail->windowLabel === '24 gio nua'
                && $mail->recipientRole === 'customer';
        });

        Mail::assertQueued(BookingReminder::class, function (BookingReminder $mail) use ($booking) {
            return $mail->booking->id === $booking->id
                && $mail->windowLabel === '24 gio nua'
                && $mail->recipientRole === 'reader';
        });

        $this->assertNotNull($booking->refresh()->reminder_24h_sent_at);
    }

    public function test_it_does_not_send_duplicate_reminders(): void
    {
        Mail::fake();
        $this->makeBooking([
            'booked_at' => now()->addHour(),
            'status' => 'confirmed',
            'reminder_1h_sent_at' => now(),
        ]);

        $this->artisan('bookings:send-reminders')
            ->expectsOutput('Sent 0 booking reminder messages')
            ->assertSuccessful();

        Mail::assertNothingQueued();
    }

    private function makeBooking(array $overrides = []): Booking
    {
        $customer = User::factory()->create(['email' => 'customer-reminder@example.com']);
        $readerUser = User::factory()->create(['email' => 'reader-reminder@example.com', 'role' => 'reader']);
        $reader = Reader::create([
            'user_id' => $readerUser->id,
            'name' => 'Reminder Reader',
            'title' => 'Tarot Reader',
            'bio' => 'Reminder test',
            'email' => 'reader-direct@example.com',
            'is_active' => true,
        ]);
        $service = Service::create([
            'name' => 'Reminder Service',
            'description' => 'Reminder test',
            'duration' => 60,
            'price' => 250000,
        ]);

        return Booking::create(array_merge([
            'user_id' => $customer->id,
            'reader_id' => $reader->id,
            'service_id' => $service->id,
            'booked_at' => now()->addDay(),
            'status' => 'confirmed',
            'payment_status' => 'paid',
            'expires_at' => null,
        ], $overrides));
    }
}
