<?php

namespace App\Services\Booking;

use App\Models\Booking;
use App\Models\Reader;
use App\Models\Service;
use Carbon\Carbon;

class BookingConflictService
{
    public function assertSlotIsFree(Reader $reader, Service $service, Carbon $start, ?int $ignoreBookingId = null, bool $lock = true): void
    {
        app(ReaderAvailabilityService::class)->assertSlotAllowed($reader, $start, (int) $service->duration);

        if ($this->findConflict($reader->id, $service, $start, $ignoreBookingId, $lock)) {
            abort(422, 'Reader da co lich trong khung gio nay.');
        }
    }

    public function findConflict(int $readerId, Service $service, Carbon $start, ?int $ignoreBookingId = null, bool $lock = false): ?Booking
    {
        $end = $start->copy()->addMinutes($service->duration);
        $query = Booking::with('service')
            ->where('reader_id', $readerId)
            ->whereDate('booked_at', $start->toDateString());

        if ($ignoreBookingId) {
            $query->where('id', '!=', $ignoreBookingId);
        }

        $this->applyBlockingBookingScope($query);

        if ($lock) {
            $query->lockForUpdate();
        }

        return $query->get()->first(function (Booking $booking) use ($start, $end) {
            $existingStart = Carbon::parse($booking->booked_at);
            $existingEnd = $existingStart->copy()->addMinutes($booking->service->duration);

            return $start->lt($existingEnd) && $end->gt($existingStart);
        });
    }

    public function applyBlockingBookingScope($query)
    {
        return $query
            ->whereNotIn('status', ['cancelled', 'completed'])
            ->where(function ($activeBooking) {
                $activeBooking
                    ->where('status', '!=', 'pending')
                    ->orWhereIn('payment_status', ['pending_verification', 'paid', 'refund_pending'])
                    ->orWhereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            });
    }
}
