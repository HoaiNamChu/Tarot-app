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
            $booking->update(['payment_method' => $gateway]);

            // Tái dùng payment pending thay vì throw exception
            // (user back từ VNPay rồi nhấn thanh toán lại)
            if ($gateway !== 'vnpay') {
                $existing = Payment::where('booking_id', $booking->id)
                    ->where('gateway', $gateway)
                    ->where('status', Payment::PENDING)
                    ->first();

                if ($existing) {
                    return $existing;
                }
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
