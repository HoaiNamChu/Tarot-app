<?php

namespace Tests\Feature;

use App\Mail\PasswordResetRequested;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_logout_revokes_current_token(): void
    {
        $register = $this->postJson('/api/auth/register', [
            'name' => 'QA User',
            'email' => 'qa@example.com',
            'password' => 'password123',
        ]);

        $register->assertCreated();
        $token = $register->json('token');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/auth/me')
            ->assertOk();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/auth/logout')
            ->assertOk();

        auth()->forgetGuards();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/auth/me')
            ->assertUnauthorized();
    }

    public function test_forgot_password_queues_reset_mail_to_existing_user(): void
    {
        config(['tarot.frontend_url' => 'https://app.example.com']);
        Mail::fake();

        $this->postJson('/api/auth/register', [
            'name' => 'QA User',
            'email' => 'reset@example.com',
            'password' => 'password123',
        ])->assertCreated();

        $this->postJson('/api/auth/forgot-password', [
            'email' => 'reset@example.com',
        ])->assertOk();

        Mail::assertQueued(PasswordResetRequested::class, function (PasswordResetRequested $mail) {
            return $mail->hasTo('reset@example.com')
                && str_starts_with($mail->resetUrl, 'https://app.example.com/reset-password?')
                && str_contains($mail->resetUrl, 'email=reset%40example.com');
        });
    }

    public function test_forgot_password_does_not_queue_mail_for_unknown_user(): void
    {
        Mail::fake();

        $this->postJson('/api/auth/forgot-password', [
            'email' => 'missing@example.com',
        ])->assertOk();

        Mail::assertNothingQueued();
    }
}
