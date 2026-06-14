<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PasswordResetRequested extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $resetUrl,
        public int $expiresInMinutes = 60
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Dat lai mat khau Luna Arcana');
    }

    public function content(): Content
    {
        return new Content(view: 'emails.password-reset');
    }
}
