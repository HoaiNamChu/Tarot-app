<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class MailSmokeTest extends Mailable
{
    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Kiem tra gui mail Luna Arcana');
    }

    public function content(): Content
    {
        return new Content(view: 'emails.mail-smoke-test');
    }
}
