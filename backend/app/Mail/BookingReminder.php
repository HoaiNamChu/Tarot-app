<?php

namespace App\Mail;

use App\Models\Booking;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class BookingReminder extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public Booking $booking,
        public string $windowLabel,
        public string $recipientRole = 'customer',
    ) {
    }

    public function envelope(): Envelope
    {
        $code = 'BK-' . str_pad((string) $this->booking->id, 4, '0', STR_PAD_LEFT);

        return new Envelope(subject: "Nhac lich {$code} - {$this->windowLabel}");
    }

    public function content(): Content
    {
        return new Content(view: 'emails.booking-reminder');
    }

    public function attachments(): array
    {
        return [];
    }
}
