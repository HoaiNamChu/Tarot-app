<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReaderDashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_reader_profile_update_without_reader_record_returns_not_found(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        $this->putJson('/api/reader/profile', [
            'bio' => 'Updated bio',
            'phone' => '0900000000',
        ])->assertNotFound();
    }

    public function test_reader_bookings_without_reader_record_returns_not_found(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        $this->getJson('/api/reader/bookings')->assertNotFound();
    }
}
