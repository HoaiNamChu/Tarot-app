<?php

namespace Tests\Feature;

use App\Mail\BookingCreated;
use App\Mail\BookingCancelled;
use App\Mail\BookingConfirmed;
use App\Models\Booking;
use App\Models\Payment;
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

    public function test_user_booking_still_succeeds_when_notification_mail_fails(): void
    {
        config(['tarot.admin_email' => 'admin@example.com']);
        Mail::shouldReceive('to')
            ->once()
            ->andThrow(new \RuntimeException('mail down'));

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
            'booked_at' => now()->addDays(5)->setTime(15, 0)->toDateTimeString(),
            'note' => 'Mail failure should not fail booking',
        ])->assertCreated();

        $this->assertDatabaseHas('bookings', [
            'id' => $response->json('booking_id'),
            'user_id' => $user->id,
            'reader_id' => $reader->id,
            'service_id' => $service->id,
        ]);
    }

    public function test_admin_confirm_booking_queues_confirmation_mail_to_customer(): void
    {
        Mail::fake();

        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);
        $booking = $this->makeBooking(['status' => 'pending'], ['email' => 'confirm-customer@example.com']);

        $this->patchJson("/api/admin/bookings/{$booking->id}/confirm")->assertOk();

        Mail::assertQueued(BookingConfirmed::class, function (BookingConfirmed $mail) use ($booking) {
            return $mail->hasTo('confirm-customer@example.com') && $mail->booking->id === $booking->id;
        });
    }

    public function test_admin_cancel_booking_queues_cancelled_mail_to_customer(): void
    {
        Mail::fake();

        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);
        $booking = $this->makeBooking(['status' => 'confirmed'], ['email' => 'cancel-customer@example.com']);

        $this->patchJson("/api/admin/bookings/{$booking->id}/cancel", [
            'cancel_reason' => 'Reader bi ban dot xuat',
        ])->assertOk();

        Mail::assertQueued(BookingCancelled::class, function (BookingCancelled $mail) use ($booking) {
            return $mail->hasTo('cancel-customer@example.com') && $mail->booking->id === $booking->id;
        });
        $this->assertSame('admin', $booking->refresh()->cancelled_by);
        $this->assertSame('Reader bi ban dot xuat', $booking->cancel_reason);
    }

    public function test_admin_cancel_booking_requires_reason(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);
        $booking = $this->makeBooking(['status' => 'confirmed'], ['email' => 'cancel-required@example.com']);

        $this->patchJson("/api/admin/bookings/{$booking->id}/cancel")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['cancel_reason']);

        $this->assertSame('confirmed', $booking->refresh()->status);
        $this->assertNull($booking->cancelled_at);
        $this->assertNull($booking->cancel_reason);
    }

    public function test_user_cancel_booking_queues_cancelled_mail_to_customer(): void
    {
        Mail::fake();

        $user = User::factory()->create(['email' => 'self-cancel@example.com']);
        Sanctum::actingAs($user);
        $booking = $this->makeBooking([
            'user_id' => $user->id,
            'status' => 'pending',
        ], ['email' => 'self-cancel@example.com']);

        $this->patchJson("/api/bookings/{$booking->id}/cancel")->assertOk();

        Mail::assertQueued(BookingCancelled::class, function (BookingCancelled $mail) use ($booking) {
            return $mail->hasTo('self-cancel@example.com') && $mail->booking->id === $booking->id;
        });
    }

    public function test_user_cancel_booking_still_succeeds_when_notification_mail_fails(): void
    {
        Mail::shouldReceive('to')
            ->once()
            ->andThrow(new \RuntimeException('mail down'));

        $user = User::factory()->create(['email' => 'self-cancel-fail@example.com']);
        Sanctum::actingAs($user);
        $booking = $this->makeBooking([
            'user_id' => $user->id,
            'status' => 'pending',
        ], ['email' => 'self-cancel-fail@example.com']);

        $this->patchJson("/api/bookings/{$booking->id}/cancel")->assertOk();

        $booking->refresh();
        $this->assertSame('cancelled', $booking->status);
        $this->assertNotNull($booking->cancelled_at);
    }

    public function test_user_cannot_cancel_completion_pending_booking(): void
    {
        $user = User::factory()->create(['email' => 'completion-pending-cancel@example.com']);
        Sanctum::actingAs($user);
        $booking = $this->makeBooking([
            'user_id' => $user->id,
            'status' => 'completion_pending',
            'payment_status' => 'paid',
            'completion_requested_at' => now(),
            'completion_auto_complete_at' => now()->addHours(24),
        ], ['email' => 'completion-pending-cancel@example.com']);

        $this->patchJson("/api/bookings/{$booking->id}/cancel", [
            'cancel_reason' => 'Khach muon huy sau khi reader bao hoan thanh',
        ])->assertUnprocessable();

        $this->assertSame('completion_pending', $booking->refresh()->status);
        $this->assertNull($booking->cancelled_at);
    }

    public function test_admin_cancel_booking_still_succeeds_when_notification_mail_fails(): void
    {
        Mail::shouldReceive('to')
            ->once()
            ->andThrow(new \RuntimeException('mail down'));

        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);
        $booking = $this->makeBooking(['status' => 'confirmed'], ['email' => 'admin-cancel-fail@example.com']);

        $this->patchJson("/api/admin/bookings/{$booking->id}/cancel", [
            'cancel_reason' => 'Khach yeu cau doi lich',
        ])->assertOk();

        $booking->refresh();
        $this->assertSame('cancelled', $booking->status);
        $this->assertNotNull($booking->cancelled_at);
        $this->assertSame('admin', $booking->cancelled_by);
    }

    public function test_admin_cancel_paid_booking_marks_refund_pending(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        $booking = $this->makeBooking([
            'status' => 'confirmed',
            'payment_status' => 'paid',
            'payment_method' => 'bank',
            'paid_at' => now(),
        ], ['email' => 'admin-paid-cancel@example.com']);

        $payment = Payment::create([
            'booking_id' => $booking->id,
            'gateway' => 'bank',
            'amount' => 250000,
            'status' => Payment::SUCCESS,
            'paid_at' => now(),
        ]);

        $this->patchJson("/api/admin/bookings/{$booking->id}/cancel", [
            'cancel_reason' => 'Khach can hoan tien',
        ])->assertOk()
            ->assertJson(['payment_status' => 'refund_pending']);

        $booking->refresh();
        $this->assertSame('cancelled', $booking->status);
        $this->assertSame('refund_pending', $booking->payment_status);
        $this->assertSame(Payment::SUCCESS, $payment->refresh()->status);
    }

    public function test_admin_refund_requires_amount_and_reason(): void
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
        ])->assertUnprocessable()
            ->assertJson(['message' => 'Vui long nhap so tien va ly do hoan tien.']);

        $this->assertSame('paid', $booking->refresh()->payment_status);
        $this->assertSame(Payment::SUCCESS, $booking->payments()->latest('id')->first()->status);
    }

    public function test_admin_refund_records_refund_audit_fields(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);
        $booking = $this->makeBooking([
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

        $this->patchJson("/api/admin/bookings/{$booking->id}/payment", [
            'payment_status' => 'refunded',
            'payment_method' => 'bank',
            'refund_amount' => 250000,
            'refund_reference' => 'FT123456',
            'refund_reason' => 'Customer requested cancellation',
            'refund_note' => 'Refunded manually via bank transfer',
        ])->assertOk()
            ->assertJson(['message' => 'Da ghi nhan thong tin hoan tien.']);

        $booking->refresh();
        $payment->refresh();

        $this->assertSame('refunded', $booking->payment_status);
        $this->assertSame(Payment::REFUNDED, $payment->status);
        $this->assertSame(250000.0, (float) $payment->refund_amount);
        $this->assertSame('FT123456', $payment->refund_reference);
        $this->assertSame('Customer requested cancellation', $payment->refund_reason);
        $this->assertSame($admin->id, $payment->refunded_by);
        $this->assertNotNull($payment->refunded_at);
    }

    public function test_admin_can_refund_refund_pending_booking(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);
        $booking = $this->makeBooking([
            'status' => 'cancelled',
            'payment_status' => 'refund_pending',
            'payment_method' => 'bank',
            'paid_at' => now(),
            'cancelled_at' => now(),
        ]);

        $payment = Payment::create([
            'booking_id' => $booking->id,
            'gateway' => 'bank',
            'amount' => 250000,
            'status' => Payment::SUCCESS,
            'paid_at' => now(),
        ]);

        $this->patchJson("/api/admin/bookings/{$booking->id}/payment", [
            'payment_status' => 'refunded',
            'payment_method' => 'bank',
            'refund_amount' => 250000,
            'refund_reference' => 'RF-PENDING-1',
            'refund_reason' => 'Refund pending completed',
        ])->assertOk();

        $this->assertSame('refunded', $booking->refresh()->payment_status);
        $this->assertSame(Payment::REFUNDED, $payment->refresh()->status);
        $this->assertSame('RF-PENDING-1', $payment->refund_reference);
    }

    public function test_admin_payments_include_refund_pending_cancellation_context(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        $booking = $this->makeBooking([
            'status' => 'cancelled',
            'payment_status' => 'refund_pending',
            'payment_method' => 'bank',
            'paid_at' => now(),
            'cancelled_at' => now(),
            'cancel_reason' => 'Khach yeu cau hoan tien',
            'cancelled_by' => 'customer',
        ]);

        Payment::create([
            'booking_id' => $booking->id,
            'gateway' => 'bank',
            'amount' => 250000,
            'status' => Payment::SUCCESS,
            'paid_at' => now(),
        ]);

        $this->getJson('/api/admin/payments')
            ->assertOk()
            ->assertJsonFragment([
                'id' => $booking->id,
                'booking_status' => 'cancelled',
                'payment_status' => 'refund_pending',
                'cancel_reason' => 'Khach yeu cau hoan tien',
                'cancelled_by' => 'customer',
            ]);
    }

    public function test_admin_cannot_mark_completed_booking_unpaid_or_pending_verification(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        $booking = $this->makeBooking([
            'status' => 'completed',
            'payment_status' => 'paid',
            'payment_method' => 'bank',
            'paid_at' => now(),
            'completed_at' => now(),
        ]);

        foreach (['unpaid', 'pending_verification'] as $status) {
            $this->patchJson("/api/admin/bookings/{$booking->id}/payment", [
                'payment_status' => $status,
                'payment_method' => 'bank',
            ])->assertUnprocessable()
                ->assertJson(['message' => 'Khong the chuyen lich da hoan thanh ve chua thanh toan hoac cho xac minh.']);
        }

        $this->assertSame('paid', $booking->refresh()->payment_status);
    }

    public function test_admin_cannot_reopen_refunded_payment(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        $booking = $this->makeBooking([
            'status' => 'cancelled',
            'payment_status' => 'refunded',
            'payment_method' => 'bank',
            'paid_at' => now(),
            'cancelled_at' => now(),
        ]);

        Payment::create([
            'booking_id' => $booking->id,
            'gateway' => 'bank',
            'amount' => 250000,
            'status' => Payment::REFUNDED,
            'paid_at' => now(),
            'refund_amount' => 250000,
            'refund_reason' => 'Already refunded',
            'refunded_at' => now(),
        ]);

        $this->patchJson("/api/admin/bookings/{$booking->id}/payment", [
            'payment_status' => 'paid',
            'payment_method' => 'bank',
        ])->assertUnprocessable()
            ->assertJson(['message' => 'Khong the mo lai thanh toan da hoan tien.']);

        $this->assertSame('refunded', $booking->refresh()->payment_status);
        $this->assertSame(Payment::REFUNDED, $booking->payments()->latest('id')->first()->status);
    }

    public function test_admin_cannot_reopen_terminal_booking_statuses_or_complete_directly(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        $completed = $this->makeBooking([
            'status' => 'completed',
            'payment_status' => 'paid',
            'completed_at' => now(),
        ]);
        $cancelled = $this->makeBooking([
            'status' => 'cancelled',
            'cancelled_at' => now(),
        ], ['email' => 'cancelled@example.com']);
        $confirmed = $this->makeBooking([
            'status' => 'confirmed',
            'payment_status' => 'paid',
        ], ['email' => 'confirmed@example.com']);

        $this->patchJson("/api/admin/bookings/{$completed->id}/status", ['status' => 'confirmed'])
            ->assertUnprocessable();
        $this->patchJson("/api/admin/bookings/{$cancelled->id}/status", ['status' => 'pending'])
            ->assertUnprocessable();
        $this->patchJson("/api/admin/bookings/{$confirmed->id}/status", ['status' => 'completed'])
            ->assertUnprocessable();
        $this->patchJson("/api/admin/bookings/{$confirmed->id}/status", ['status' => 'pending'])
            ->assertUnprocessable();

        $this->assertSame('completed', $completed->refresh()->status);
        $this->assertSame('cancelled', $cancelled->refresh()->status);
        $this->assertSame('confirmed', $confirmed->refresh()->status);
    }

    public function test_admin_cannot_cancel_completed_booking(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        $booking = $this->makeBooking([
            'status' => 'completed',
            'payment_status' => 'paid',
            'completed_at' => now(),
        ]);

        $this->patchJson("/api/admin/bookings/{$booking->id}/cancel", [
            'cancel_reason' => 'Should still be blocked',
        ])
            ->assertUnprocessable();

        $this->assertSame('completed', $booking->refresh()->status);
    }

    public function test_admin_cannot_cancel_completion_pending_booking_or_edit_locked_zoom(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        $pendingCompletion = $this->makeBooking([
            'status' => 'completion_pending',
            'payment_status' => 'paid',
            'completion_requested_at' => now(),
            'completion_auto_complete_at' => now()->addHours(24),
        ]);
        $completed = $this->makeBooking([
            'status' => 'completed',
            'payment_status' => 'paid',
            'completed_at' => now(),
        ], ['email' => 'completed-zoom@example.com']);

        $this->patchJson("/api/admin/bookings/{$pendingCompletion->id}/cancel", [
            'cancel_reason' => 'Should still be blocked',
        ])
            ->assertUnprocessable();
        $this->patchJson("/api/admin/bookings/{$pendingCompletion->id}/zoom", [
            'zoom_link' => 'https://example.com/room',
        ])->assertUnprocessable();
        $this->patchJson("/api/admin/bookings/{$completed->id}/zoom", [
            'zoom_link' => 'https://example.com/room',
        ])->assertUnprocessable();

        $this->assertSame('completion_pending', $pendingCompletion->refresh()->status);
        $this->assertNull($pendingCompletion->zoom_link);
        $this->assertNull($completed->refresh()->zoom_link);
    }

    private function makeBooking(array $bookingOverrides = [], array $userOverrides = []): Booking
    {
        $user = isset($bookingOverrides['user_id'])
            ? User::findOrFail($bookingOverrides['user_id'])
            : User::factory()->create(array_merge([
                'email' => 'booking-customer@example.com',
            ], $userOverrides));

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
            'booked_at' => now()->addDays(4)->setTime(10, 0),
            'status' => 'pending',
            'payment_status' => 'unpaid',
        ], $bookingOverrides))->load(['user', 'reader', 'service']);
    }
}
