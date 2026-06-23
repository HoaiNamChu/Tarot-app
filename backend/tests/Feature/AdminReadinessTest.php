<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminReadinessTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_readiness_checks(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/readiness')
            ->assertOk()
            ->assertJsonStructure([
                'ready',
                'score',
                'critical_failed',
                'warning_failed',
                'checks' => [
                    '*' => ['key', 'label', 'ok', 'severity', 'detail'],
                ],
                'manual_checks',
            ])
            ->assertJsonPath('checks.0.key', 'app_key');
    }

    public function test_non_admin_cannot_view_readiness_checks(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        Sanctum::actingAs($user);

        $this->getJson('/api/admin/readiness')->assertForbidden();
    }
}
