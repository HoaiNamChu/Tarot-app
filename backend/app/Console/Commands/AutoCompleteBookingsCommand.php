<?php

namespace App\Console\Commands;

use App\Models\Booking;
use App\Services\Booking\BookingCompletionService;
use Illuminate\Console\Command;

class AutoCompleteBookingsCommand extends Command
{
    protected $signature = 'bookings:auto-complete';

    protected $description = 'Automatically complete bookings that customers did not dispute in time';

    public function handle(BookingCompletionService $completion): int
    {
        $bookings = Booking::where('status', 'completion_pending')
            ->whereNotNull('completion_auto_complete_at')
            ->where('completion_auto_complete_at', '<=', now())
            ->get();

        foreach ($bookings as $booking) {
            $completion->autoComplete($booking);
        }

        $this->info('Auto-completed ' . $bookings->count() . ' bookings');

        return self::SUCCESS;
    }
}
