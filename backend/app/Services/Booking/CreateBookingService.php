<?php

namespace App\Services\Booking;

use App\Models\Booking;
use App\Models\Reader;
use App\Models\Service;
use App\Models\User;
use App\Mail\BookingCreated;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class CreateBookingService
{
    public function execute(
        User $user,
        array $data
    ): Booking {

        return DB::transaction(function () use (
            $user,
            $data
        ) {

            $reader = Reader::lockForUpdate()
                ->findOrFail(
                    $data['reader_id']
                );

            $service = Service::findOrFail(
                $data['service_id']
            );

            $newStart = Carbon::parse(
                $data['booked_at']
            );

            $newEnd = $newStart
                ->copy()
                ->addMinutes(
                    $service->duration
                );

            $existingBookings = Booking::with('service')
                ->where(
                    'reader_id',
                    $reader->id
                )
                ->whereIn('status', [
                    'pending',
                    // 'pending_payment',
                    'confirmed'
                ])
                ->whereDate(
                    'booked_at',
                    $newStart->toDateString()
                )
                ->lockForUpdate()
                ->get();

            $conflict = $existingBookings
                ->first(function ($b) use (
                    $newStart,
                    $newEnd
                ) {

                    $existStart =
                        Carbon::parse(
                            $b->booked_at
                        );

                    $existEnd =
                        $existStart
                        ->copy()
                        ->addMinutes(
                            $b->service->duration
                        );

                    return
                        $newStart->lt($existEnd)
                        &&
                        $newEnd->gt($existStart);
                });

            if ($conflict) {

                abort(
                    422,
                    'Reader đã có lịch trong khung giờ này.'
                );
            }

            $booking = Booking::create([

                'order_code' =>
                Str::uuid(),

                'user_id' =>
                $user->id,

                'reader_id' =>
                $reader->id,

                'service_id' =>
                $service->id,

                'booked_at' =>
                $data['booked_at'],

                'note' =>
                $data['note'] ?? null,

                'status' =>
                'pending',

                'payment_status' =>
                'unpaid',

                'expires_at' =>
                now()->addMinutes(15),
            ]);

            $booking->load([
                'reader',
                'service',
                'user'
            ]);

            DB::afterCommit(function () use ($booking) {

                Mail::to(
                    $booking->user->email
                )->queue(
                    new BookingCreated(
                        $booking
                    )
                );

                Mail::to(
                    env(
                        'ADMIN_EMAIL',
                        'admin@lunaarcana.com'
                    )
                )->queue(
                    new BookingCreated(
                        $booking
                    )
                );
            });


            return $booking;
        });
    }
}
