<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Booking;
use Illuminate\Support\Facades\DB;
use App\Models\Payment;

class ExpireBookingsCommand extends Command
{
    protected $signature = 'bookings:expire';

    protected $description = 'Expire unpaid bookings that have passed their expires_at time';

    public function handle()
    {
        DB::transaction(function () {
            $bookings = Booking::where('payment_status', 'unpaid')
                ->where('expires_at', '<=', now())
                ->whereIn('status', ['pending']) // FIX: bỏ 'pending_payment' không tồn tại
                ->get();

            foreach ($bookings as $booking) {
                // Cancel tất cả payment pending (user back từ VNPay, chưa có callback)
                $booking->payments()
                    ->whereIn('status', [Payment::PENDING, 'failed'])
                    ->update(['status' => 'expired']);

                $booking->update([
                    'status'       => 'cancelled',
                    'cancelled_at' => now(),
                ]);
            }

            $this->info('Expired ' . $bookings->count() . ' bookings');
        });

        return self::SUCCESS;
    }
}
