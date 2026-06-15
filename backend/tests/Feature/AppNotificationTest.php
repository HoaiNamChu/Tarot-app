<?php

namespace Tests\Feature;

use App\Models\AppNotification;
use App\Models\Booking;
use App\Models\Payment;
use App\Models\Reader;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AppNotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_booking_notifies_admin_and_assigned_reader(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $customer = User::factory()->create(['role' => 'user']);
        $readerUser = User::factory()->create(['role' => 'reader']);
        $reader = $this->makeReader($readerUser);
        $service = $this->makeService();

        Sanctum::actingAs($customer);

        $this->postJson('/api/bookings', [
            'reader_id' => $reader->id,
            'service_id' => $service->id,
            'booked_at' => now()->addDays(2)->setTime(10, 0)->toDateTimeString(),
        ])->assertCreated();

        $this->assertDatabaseHas('app_notifications', [
            'user_id' => $admin->id,
            'audience' => 'admin',
            'type' => 'booking.created',
        ]);

        $this->assertDatabaseHas('app_notifications', [
            'user_id' => $readerUser->id,
            'audience' => 'reader',
            'type' => 'booking.assigned',
        ]);
    }

    public function test_reader_notification_api_only_returns_that_readers_notifications(): void
    {
        $readerUser = User::factory()->create(['role' => 'reader']);
        $otherReaderUser = User::factory()->create(['role' => 'reader']);

        AppNotification::create([
            'user_id' => $readerUser->id,
            'audience' => 'reader',
            'type' => 'booking.assigned',
            'title' => 'Reader notification',
        ]);

        AppNotification::create([
            'user_id' => $otherReaderUser->id,
            'audience' => 'reader',
            'type' => 'booking.assigned',
            'title' => 'Other reader notification',
        ]);

        Sanctum::actingAs($readerUser);

        $this->getJson('/api/reader/notifications')
            ->assertOk()
            ->assertJsonPath('unread_count', 1)
            ->assertJsonFragment(['title' => 'Reader notification'])
            ->assertJsonMissing(['title' => 'Other reader notification']);
    }

    public function test_expired_booking_notifies_admin_and_reader(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $customer = User::factory()->create(['role' => 'user']);
        $readerUser = User::factory()->create(['role' => 'reader']);
        $reader = $this->makeReader($readerUser);
        $service = $this->makeService();

        $booking = Booking::create([
            'user_id' => $customer->id,
            'reader_id' => $reader->id,
            'service_id' => $service->id,
            'booked_at' => now()->addDay(),
            'status' => 'pending',
            'payment_status' => 'unpaid',
            'payment_method' => 'vnpay',
            'expires_at' => now()->subMinute(),
        ]);

        Payment::create([
            'booking_id' => $booking->id,
            'gateway' => 'vnpay',
            'amount' => $service->price,
            'status' => Payment::PENDING,
        ]);

        $this->artisan('bookings:expire')
            ->expectsOutput('Expired 1 bookings')
            ->assertExitCode(0);

        $this->assertDatabaseHas('app_notifications', [
            'user_id' => $admin->id,
            'audience' => 'admin',
            'type' => 'booking.expired',
        ]);

        $this->assertDatabaseHas('app_notifications', [
            'user_id' => $readerUser->id,
            'audience' => 'reader',
            'type' => 'booking.expired',
        ]);
    }

    private function makeReader(User $readerUser): Reader
    {
        return Reader::create([
            'user_id' => $readerUser->id,
            'name' => 'Notify Reader',
            'title' => 'Tarot Reader',
            'bio' => 'Bio',
            'email' => $readerUser->email,
        ]);
    }

    private function makeService(): Service
    {
        return Service::create([
            'name' => 'Notify Service',
            'description' => 'Service',
            'duration' => 30,
            'price' => 250000,
        ]);
    }
}
