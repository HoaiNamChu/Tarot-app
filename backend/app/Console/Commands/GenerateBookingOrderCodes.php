<?php

namespace App\Console\Commands;

use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use App\Models\Booking;
use Illuminate\Support\Str;

#[Signature('app:generate-booking-order-codes')]
#[Description('Command description')]
class GenerateBookingOrderCodes extends Command
{
    /**
     * Execute the console command.
     */
    public function handle()
    {
        Booking::whereNull('order_code')
            ->chunk(100, function ($items) {

                foreach ($items as $booking) {

                    $booking->update([
                        'order_code' => Str::uuid()
                    ]);
                }
            });
    }
}
