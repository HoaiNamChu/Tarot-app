<?php

namespace Tests\Feature;

use App\Mail\MailSmokeTest;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class MailCommandTest extends TestCase
{
    public function test_mail_test_command_sends_smoke_test_mail(): void
    {
        Mail::fake();

        $this->artisan('mail:test qa@example.com')
            ->assertExitCode(0);

        Mail::assertSent(MailSmokeTest::class, function (MailSmokeTest $mail) {
            return $mail->hasTo('qa@example.com');
        });
    }

    public function test_mail_test_command_rejects_invalid_recipient(): void
    {
        Mail::fake();

        $this->artisan('mail:test not-an-email')
            ->assertExitCode(1);

        Mail::assertNothingSent();
    }
}
