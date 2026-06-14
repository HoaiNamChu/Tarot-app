<?php

namespace App\Console\Commands;

use App\Mail\MailSmokeTest;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class TestMailCommand extends Command
{
    protected $signature = 'mail:test {to : Recipient email address}';

    protected $description = 'Send a smoke-test email using the configured mailer';

    public function handle(): int
    {
        $to = (string) $this->argument('to');

        if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
            $this->error('Invalid recipient email address.');
            return self::FAILURE;
        }

        Mail::to($to)->send(new MailSmokeTest());

        $this->info("Test email sent to {$to}.");

        return self::SUCCESS;
    }
}
