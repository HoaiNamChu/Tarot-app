<?php

namespace Tests\Feature;

use App\Mail\PasswordResetRequested;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_register_normalizes_email_returns_role_and_allows_me_lookup(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'QA User',
            'email' => 'CaseUser@Example.COM',
            'password' => 'password123',
        ])->assertCreated()
            ->assertJsonPath('user.email', 'caseuser@example.com')
            ->assertJsonPath('user.role', 'user')
            ->assertJsonMissingPath('user.password')
            ->assertJsonMissingPath('user.internal_note');

        $token = $response->json('token');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('email', 'caseuser@example.com')
            ->assertJsonPath('role', 'user')
            ->assertJsonMissingPath('password')
            ->assertJsonMissingPath('internal_note');
    }

    public function test_register_rejects_duplicate_email_even_when_case_differs(): void
    {
        $this->postJson('/api/auth/register', [
            'name' => 'QA User',
            'email' => 'duplicate@example.com',
            'password' => 'password123',
        ])->assertCreated();

        $this->postJson('/api/auth/register', [
            'name' => 'QA User 2',
            'email' => 'Duplicate@Example.com',
            'password' => 'password123',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);
    }

    public function test_login_normalizes_email_and_returns_safe_user_payload(): void
    {
        User::factory()->create([
            'name' => 'Admin User',
            'email' => 'admin@example.com',
            'password' => 'password123',
            'role' => 'admin',
            'internal_note' => 'Do not expose this',
        ]);

        $this->postJson('/api/auth/login', [
            'email' => 'Admin@Example.COM',
            'password' => 'password123',
        ])->assertOk()
            ->assertJsonPath('user.email', 'admin@example.com')
            ->assertJsonPath('user.role', 'admin')
            ->assertJsonMissingPath('user.password')
            ->assertJsonMissingPath('user.internal_note')
            ->assertJsonStructure(['token']);
    }

    public function test_login_with_wrong_password_returns_401_without_token(): void
    {
        User::factory()->create([
            'email' => 'wrong-pass@example.com',
            'password' => 'password123',
        ]);

        $this->postJson('/api/auth/login', [
            'email' => 'wrong-pass@example.com',
            'password' => 'bad-password',
        ])->assertUnauthorized()
            ->assertJsonMissingPath('token');
    }

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

    public function test_password_reset_link_from_mail_can_reset_password(): void
    {
        config(['tarot.frontend_url' => 'https://app.example.com']);
        Mail::fake();

        $this->postJson('/api/auth/register', [
            'name' => 'QA Reset',
            'email' => 'reset-flow@example.com',
            'password' => 'old-password',
        ])->assertCreated();

        $resetUrl = null;

        $this->postJson('/api/auth/forgot-password', [
            'email' => 'reset-flow@example.com',
        ])->assertOk();

        Mail::assertQueued(PasswordResetRequested::class, function (PasswordResetRequested $mail) use (&$resetUrl) {
            if (!$mail->hasTo('reset-flow@example.com')) {
                return false;
            }

            $resetUrl = $mail->resetUrl;
            return true;
        });

        $parts = parse_url($resetUrl);
        parse_str($parts['query'] ?? '', $query);

        $this->postJson('/api/auth/reset-password', [
            'email' => $query['email'] ?? '',
            'token' => $query['token'] ?? '',
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ])->assertOk();

        $this->postJson('/api/auth/login', [
            'email' => 'reset-flow@example.com',
            'password' => 'new-password',
        ])->assertOk();
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
