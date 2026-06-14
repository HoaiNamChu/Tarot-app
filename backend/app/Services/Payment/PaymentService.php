<?php

namespace App\Services\Payment;

use App\Models\Booking;
use App\Models\Payment;
use Illuminate\Support\Facades\DB;

class PaymentService
{
    public function create(Booking $booking, string $gateway): Payment
    {
        if ($booking->payment_status === 'paid') {
            throw new \Exception('Booking đã được thanh toán.');
        }

        if ($booking->expires_at && $booking->expires_at->isPast()) {
            throw new \Exception('Booking đã hết hạn thanh toán.');
        }

        return DB::transaction(function () use ($booking, $gateway) {
            $booking = Booking::lockForUpdate()->findOrFail($booking->id);

            if ($booking->payment_status === 'paid') {
                throw new \Exception('Booking da duoc thanh toan.');
            }

            if ($booking->expires_at && $booking->expires_at->isPast()) {
                throw new \Exception('Booking da het han thanh toan.');
            }

            $booking->update(['payment_method' => $gateway]);

            // Reuse a pending payment so retrying checkout does not create duplicates.
            $existing = Payment::where('booking_id', $booking->id)
                ->where('gateway', $gateway)
                ->where('status', Payment::PENDING)
                ->latest('id')
                ->first();

            if ($existing) {
                return $existing;
            }

            return Payment::create([
                'booking_id' => $booking->id,
                'gateway'    => $gateway,
                'amount'     => $booking->service->price,
                'status'     => Payment::PENDING,
            ]);
        });
    }
}
