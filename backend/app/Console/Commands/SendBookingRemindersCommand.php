<?php

namespace App\Console\Commands;

use App\Mail\BookingReminder;
use App\Models\Booking;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendBookingRemindersCommand extends Command
{
    protected $signature = 'bookings:send-reminders';

    protected $description = 'Send upcoming booking reminders to customers and readers';

    public function handle(): int
    {
        $sent = 0;
        $sent += $this->sendWindow('24 gio nua', 'reminder_24h_sent_at', now()->addHours(23), now()->addHours(25));
        $sent += $this->sendWindow('1 gio nua', 'reminder_1h_sent_at', now()->addMinutes(45), now()->addMinutes(75));

        $this->info("Sent {$sent} booking reminder messages");

        return self::SUCCESS;
    }

    private function sendWindow(string $label, string $column, $from, $to): int
    {
        $messages = 0;

        $bookings = Booking::with(['user', 'reader.user', 'service'])
            ->where('status', 'confirmed')
            ->whereBetween('booked_at', [$from, $to])
            ->whereNull($column)
            ->get();

        foreach ($bookings as $booking) {
            try {
                if ($booking->user?->email) {
                    Mail::to($booking->user->email)->queue(new BookingReminder($booking, $label, 'customer'));
                    $messages++;
                }

                $readerEmail = $booking->reader?->email ?: $booking->reader?->user?->email;
                if ($readerEmail) {
                    Mail::to($readerEmail)->queue(new BookingReminder($booking, $label, 'reader'));
                    $messages++;
                }

                $booking->forceFill([$column => now()])->save();
            } catch (\Throwable $e) {
                Log::warning('Booking reminder mail failed', [
                    'booking_id' => $booking->id,
                    'window' => $label,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return $messages;
    }
}
