<?php

namespace Tests\Feature;

use App\Models\AppSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PolicyContentTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_policy_returns_default_content(): void
    {
        $this->getJson('/api/policies/refund')
            ->assertOk()
            ->assertJsonPath('type', 'refund')
            ->assertJsonStructure([
                'type',
                'title',
                'updated',
                'intro',
                'sections' => [
                    '*' => ['heading', 'body'],
                ],
            ]);
    }

    public function test_admin_can_update_policy_content(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        $payload = [
            'title' => 'Chinh sach hoan tien moi',
            'updated' => '19/06/2026',
            'intro' => 'Noi dung gioi thieu moi.',
            'sections' => [
                ['heading' => 'Dieu kien', 'body' => 'Chi hoan tien khi co ly do hop le.'],
            ],
        ];

        $this->putJson('/api/admin/policies/refund', $payload)
            ->assertOk()
            ->assertJsonPath('policy.title', 'Chinh sach hoan tien moi')
            ->assertJsonPath('policy.sections.0.heading', 'Dieu kien');

        $this->assertDatabaseHas('app_settings', [
            'key' => 'policy_refund_title',
            'value' => 'Chinh sach hoan tien moi',
        ]);

        $this->getJson('/api/policies/refund')
            ->assertOk()
            ->assertJsonPath('title', 'Chinh sach hoan tien moi')
            ->assertJsonPath('sections.0.body', 'Chi hoan tien khi co ly do hop le.');
    }

    public function test_invalid_policy_type_returns_404(): void
    {
        $this->getJson('/api/policies/unknown')->assertNotFound();

        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        $this->putJson('/api/admin/policies/unknown', [])->assertNotFound();
    }

    public function test_non_admin_cannot_update_policy_content(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        Sanctum::actingAs($user);

        $this->putJson('/api/admin/policies/refund', [])->assertForbidden();
    }
}
