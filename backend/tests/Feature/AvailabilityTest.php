<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Reader;
use App\Models\ReaderAvailabilityRule;
use App\Models\Service;
use App\Models\User;
use App\Services\Booking\CreateBookingService;
use App\Services\Booking\ReaderAvailabilityService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AvailabilityTest extends TestCase
{
    use RefreshDatabase;

    public function test_booking_api_rejects_inactive_reader_and_service(): void
    {
        [$reader, $service, $user] = $this->seedReaderServiceAndUser();
        Sanctum::actingAs($user);
        $payload = [
            'reader_id' => $reader->id,
            'service_id' => $service->id,
            'booked_at' => now()->addDays(2)->setTime(10, 0)->toDateTimeString(),
        ];

        $reader->update(['is_active' => false]);
        $this->postJson('/api/bookings', $payload)->assertNotFound();

        $reader->update(['is_active' => true]);
        $service->update(['is_active' => false]);
        $this->postJson('/api/bookings', $payload)->assertNotFound();
    }

    public function test_default_reader_hours_match_displayed_09_to_22_window(): void
    {
        [$reader, $service] = $this->seedReaderServiceAndUser();
        $availability = app(ReaderAvailabilityService::class);

        $this->assertFalse($availability->isSlotAllowed($reader, now()->addDays(2)->setTime(8, 0), $service->duration));
        $this->assertTrue($availability->isSlotAllowed($reader, now()->addDays(2)->setTime(10, 0), $service->duration));
        $this->assertSame('09:00', $availability->formatRules($reader)[0]['start_time']);
        $this->assertSame('22:00', $availability->formatRules($reader)[0]['end_time']);
    }

    public function test_public_reader_list_does_not_expose_account_contact_or_user_id(): void
    {
        $user = User::factory()->create();
        $reader = Reader::create([
            'user_id' => $user->id,
            'name' => 'Public QA Reader',
            'title' => 'Tarot Reader',
            'bio' => 'Public profile',
            'email' => 'private-reader@example.com',
            'phone' => '0900000000',
        ]);

        $this->getJson('/api/readers')
            ->assertOk()
            ->assertJsonPath('0.id', $reader->id)
            ->assertJsonMissingPath('0.email')
            ->assertJsonMissingPath('0.phone')
            ->assertJsonMissingPath('0.user_id');
    }

    public function test_expired_pending_booking_does_not_block_reader_slot(): void
    {
        [$reader, $service, $user] = $this->seedReaderServiceAndUser();
        $bookedAt = now()->addDays(2)->setTime(10, 0);

        Booking::create([
            'user_id' => $user->id,
            'reader_id' => $reader->id,
            'service_id' => $service->id,
            'booked_at' => $bookedAt,
            'status' => 'pending',
            'payment_status' => 'unpaid',
            'expires_at' => now()->subMinute(),
        ]);

        $this->getJson("/api/readers/{$reader->id}/check-slot?booked_at=" . urlencode($bookedAt->toDateTimeString()) . "&service_id={$service->id}")
            ->assertOk()
            ->assertJsonPath('available', true);

        $this->getJson("/api/readers/{$reader->id}/busy-slots?month=" . $bookedAt->format('Y-m'))
            ->assertOk()
            ->assertJsonCount(0);
    }

    public function test_confirmed_booking_blocks_reader_slot_and_appears_in_busy_slots(): void
    {
        [$reader, $service, $user] = $this->seedReaderServiceAndUser();
        $bookedAt = now()->addDays(2)->setTime(10, 0);

        Booking::create([
            'user_id' => $user->id,
            'reader_id' => $reader->id,
            'service_id' => $service->id,
            'booked_at' => $bookedAt,
            'status' => 'confirmed',
            'payment_status' => 'paid',
            'expires_at' => now()->subMinute(),
        ]);

        $this->getJson("/api/readers/{$reader->id}/check-slot?booked_at=" . urlencode($bookedAt->copy()->addMinutes(30)->toDateTimeString()) . "&service_id={$service->id}")
            ->assertOk()
            ->assertJsonPath('available', false);

        $this->getJson("/api/readers/{$reader->id}/busy-slots?month=" . $bookedAt->format('Y-m'))
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.start_time', '10:00')
            ->assertJsonPath('0.end_time', '11:00')
            ->assertJsonPath('0.service', 'QA Service')
            ->assertJsonMissingPath('0.status')
            ->assertJsonMissingPath('0.payment_status');
    }

    public function test_pending_verification_booking_blocks_slot_even_after_hold_expiry(): void
    {
        [$reader, $service, $user] = $this->seedReaderServiceAndUser();
        $bookedAt = now()->addDays(2)->setTime(10, 10);

        Booking::create([
            'user_id' => $user->id,
            'reader_id' => $reader->id,
            'service_id' => $service->id,
            'booked_at' => $bookedAt,
            'status' => 'pending',
            'payment_status' => 'pending_verification',
            'expires_at' => now()->subMinute(),
        ]);

        $this->getJson("/api/readers/{$reader->id}/check-slot?booked_at=" . urlencode($bookedAt->copy()->setTime(10, 30)->toDateTimeString()) . "&service_id={$service->id}")
            ->assertOk()
            ->assertJsonPath('available', false);

        $this->getJson("/api/readers/{$reader->id}/busy-slots?month=" . $bookedAt->format('Y-m'))
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.start_time', '10:10')
            ->assertJsonPath('0.end_time', '11:10');

        $this->expectException(\Symfony\Component\HttpKernel\Exception\HttpException::class);

        app(CreateBookingService::class)->execute($user, [
            'reader_id' => $reader->id,
            'service_id' => $service->id,
            'booked_at' => $bookedAt->copy()->setTime(10, 30)->toDateTimeString(),
        ], false);
    }

    public function test_refund_pending_booking_blocks_slot_until_cancelled(): void
    {
        [$reader, $service, $user] = $this->seedReaderServiceAndUser();
        $bookedAt = now()->addDays(2)->setTime(10, 10);

        Booking::create([
            'user_id' => $user->id,
            'reader_id' => $reader->id,
            'service_id' => $service->id,
            'booked_at' => $bookedAt,
            'status' => 'pending',
            'payment_status' => 'refund_pending',
            'expires_at' => now()->subMinute(),
        ]);

        $this->getJson("/api/readers/{$reader->id}/check-slot?booked_at=" . urlencode($bookedAt->copy()->setTime(10, 30)->toDateTimeString()) . "&service_id={$service->id}")
            ->assertOk()
            ->assertJsonPath('available', false);

        $this->getJson("/api/readers/{$reader->id}/busy-slots?month=" . $bookedAt->format('Y-m'))
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.start_time', '10:10')
            ->assertJsonPath('0.end_time', '11:10');
    }

    public function test_confirmed_unpaid_booking_still_blocks_slot_until_completed_or_cancelled(): void
    {
        [$reader, $service, $user] = $this->seedReaderServiceAndUser();
        $bookedAt = now()->addDays(2)->setTime(13, 0);

        Booking::create([
            'user_id' => $user->id,
            'reader_id' => $reader->id,
            'service_id' => $service->id,
            'booked_at' => $bookedAt,
            'status' => 'confirmed',
            'payment_status' => 'unpaid',
            'expires_at' => now()->subHour(),
        ]);

        $this->getJson("/api/readers/{$reader->id}/check-slot?booked_at=" . urlencode($bookedAt->copy()->addMinutes(15)->toDateTimeString()) . "&service_id={$service->id}")
            ->assertOk()
            ->assertJsonPath('available', false);

        $this->getJson("/api/readers/{$reader->id}/busy-slots?month=" . $bookedAt->format('Y-m'))
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.start_time', '13:00');
    }

    public function test_active_pending_booking_blocks_same_and_overlapping_slots(): void
    {
        [$reader, $service, $firstUser] = $this->seedReaderServiceAndUser();
        $secondUser = User::factory()->create();
        $bookedAt = now()->addDays(2)->setTime(10, 10);

        app(CreateBookingService::class)->execute($firstUser, [
            'reader_id' => $reader->id,
            'service_id' => $service->id,
            'booked_at' => $bookedAt->toDateTimeString(),
        ], false);

        foreach ([
            $bookedAt->copy(),
            $bookedAt->copy()->addMinutes(20),
            $bookedAt->copy()->subMinutes(20),
        ] as $overlappingStart) {
            try {
                app(CreateBookingService::class)->execute($secondUser, [
                    'reader_id' => $reader->id,
                    'service_id' => $service->id,
                    'booked_at' => $overlappingStart->toDateTimeString(),
                ], false);

                $this->fail('Overlapping booking should be rejected.');
            } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
                $this->assertSame(422, $e->getStatusCode());
            }
        }

        $this->assertSame(1, Booking::where('reader_id', $reader->id)->count());
    }

    public function test_back_to_back_booking_is_allowed_when_previous_slot_has_ended(): void
    {
        [$reader, $service, $firstUser] = $this->seedReaderServiceAndUser();
        $secondUser = User::factory()->create();
        $bookedAt = now()->addDays(2)->setTime(10, 10);

        app(CreateBookingService::class)->execute($firstUser, [
            'reader_id' => $reader->id,
            'service_id' => $service->id,
            'booked_at' => $bookedAt->toDateTimeString(),
        ], false);

        $secondBooking = app(CreateBookingService::class)->execute($secondUser, [
            'reader_id' => $reader->id,
            'service_id' => $service->id,
            'booked_at' => $bookedAt->copy()->addMinutes($service->duration)->toDateTimeString(),
        ], false);

        $this->assertSame($reader->id, $secondBooking->reader_id);
        $this->assertSame(2, Booking::where('reader_id', $reader->id)->count());
    }

    public function test_completed_and_cancelled_bookings_do_not_block_slots(): void
    {
        [$reader, $service, $user] = $this->seedReaderServiceAndUser();
        $completedAt = now()->addDays(2)->setTime(14, 0);
        $cancelledAt = now()->addDays(2)->setTime(16, 0);

        foreach ([[$completedAt, 'completed'], [$cancelledAt, 'cancelled']] as [$bookedAt, $status]) {
            Booking::create([
                'user_id' => $user->id,
                'reader_id' => $reader->id,
                'service_id' => $service->id,
                'booked_at' => $bookedAt,
                'status' => $status,
                'payment_status' => 'paid',
                'expires_at' => null,
            ]);
        }

        $this->getJson("/api/readers/{$reader->id}/busy-slots?month=" . $completedAt->format('Y-m'))
            ->assertOk()
            ->assertJsonCount(0);

        $this->getJson("/api/readers/{$reader->id}/check-slot?booked_at=" . urlencode($completedAt->copy()->addMinutes(15)->toDateTimeString()) . "&service_id={$service->id}")
            ->assertOk()
            ->assertJsonPath('available', true);
    }

    public function test_busy_slots_without_month_returns_upcoming_reader_schedule(): void
    {
        [$reader, $service, $user] = $this->seedReaderServiceAndUser();
        $nextMonth = now()->addMonth()->setTime(10, 10);

        Booking::create([
            'user_id' => $user->id,
            'reader_id' => $reader->id,
            'service_id' => $service->id,
            'booked_at' => $nextMonth,
            'status' => 'pending',
            'payment_status' => 'pending_verification',
            'expires_at' => now()->subMinute(),
        ]);

        $this->getJson("/api/readers/{$reader->id}/busy-slots")
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.start_time', '10:10')
            ->assertJsonPath('0.service', 'QA Service');
    }

    public function test_reader_availability_rules_block_closed_hours(): void
    {
        [$reader, $service, $user] = $this->seedReaderServiceAndUser();
        $bookedAt = now()->addDays(2)->setTime(10, 0);

        ReaderAvailabilityRule::create([
            'reader_id' => $reader->id,
            'weekday' => $bookedAt->dayOfWeek,
            'start_time' => '13:00',
            'end_time' => '18:00',
            'is_active' => true,
        ]);

        $this->getJson("/api/readers/{$reader->id}/check-slot?booked_at=" . urlencode($bookedAt->toDateTimeString()) . "&service_id={$service->id}")
            ->assertOk()
            ->assertJsonPath('available', false);

        $this->expectException(\Illuminate\Validation\ValidationException::class);

        app(CreateBookingService::class)->execute($user, [
            'reader_id' => $reader->id,
            'service_id' => $service->id,
            'booked_at' => $bookedAt->toDateTimeString(),
        ], false);
    }

    public function test_reader_availability_rules_allow_open_hours(): void
    {
        [$reader, $service, $user] = $this->seedReaderServiceAndUser();
        $bookedAt = now()->addDays(2)->setTime(14, 0);

        ReaderAvailabilityRule::create([
            'reader_id' => $reader->id,
            'weekday' => $bookedAt->dayOfWeek,
            'start_time' => '13:00',
            'end_time' => '18:00',
            'is_active' => true,
        ]);

        $this->getJson("/api/readers/{$reader->id}/check-slot?booked_at=" . urlencode($bookedAt->toDateTimeString()) . "&service_id={$service->id}")
            ->assertOk()
            ->assertJsonPath('available', true);

        $booking = app(CreateBookingService::class)->execute($user, [
            'reader_id' => $reader->id,
            'service_id' => $service->id,
            'booked_at' => $bookedAt->toDateTimeString(),
        ], false);

        $this->assertSame($reader->id, $booking->reader_id);
    }

    private function seedReaderServiceAndUser(): array
    {
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

        $user = User::factory()->create();

        return [$reader, $service, $user];
    }
}
