<?php

namespace App\Services\Booking;

use App\Mail\BookingCreated;
use App\Models\Booking;
use App\Models\Reader;
use App\Models\Service;
use App\Models\User;
use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class CreateBookingService
{
    public function execute(User $user, array $data, bool $notify = true): Booking
    {
        return DB::transaction(function () use ($user, $data, $notify) {
            $reader = Reader::lockForUpdate()->findOrFail($data['reader_id']);
            $service = Service::findOrFail($data['service_id']);
            $newStart = Carbon::parse($data['booked_at']);

            app(BookingConflictService::class)->assertSlotIsFree($reader, $service, $newStart);

            $booking = Booking::create([
                'order_code' => Str::uuid(),
                'user_id' => $user->id,
                'reader_id' => $reader->id,
                'service_id' => $service->id,
                'booked_at' => $data['booked_at'],
                'note' => $data['note'] ?? null,
                'status' => 'pending',
                'payment_status' => 'unpaid',
                'expires_at' => now()->addMinutes(15),
            ]);

            $booking->load(['reader', 'service', 'user']);

            if ($notify) {
                DB::afterCommit(function () use ($booking) {
                    app(NotificationService::class)->notifyBookingCreated($booking, true);

                    try {
                        Mail::to($booking->user->email)->queue(new BookingCreated($booking));
                        Mail::to(config('tarot.admin_email'))->queue(new BookingCreated($booking));
                    } catch (\Throwable $e) {
                        Log::warning('Booking notification mail failed', [
                            'booking_id' => $booking->id,
                            'error' => $e->getMessage(),
                        ]);
                    }
                });
            } else {
                DB::afterCommit(fn() => app(NotificationService::class)->notifyBookingCreated($booking, false));
            }

            return $booking;
        });
    }
}
