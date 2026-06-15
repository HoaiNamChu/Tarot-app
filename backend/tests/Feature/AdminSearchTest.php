<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Reader;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminSearchTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_search_returns_matching_booking_and_customer(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        $customer = User::factory()->create([
            'role' => 'user',
            'name' => 'Searchable Customer',
            'email' => 'searchable@example.com',
        ]);

        $reader = Reader::create([
            'name' => 'Search Reader',
            'title' => 'Tarot Reader',
            'bio' => 'Search reader bio',
        ]);

        $service = Service::create([
            'name' => 'Search Service',
            'description' => 'Search service description',
            'duration' => 30,
            'price' => 300000,
        ]);

        Booking::create([
            'user_id' => $customer->id,
            'reader_id' => $reader->id,
            'service_id' => $service->id,
            'booked_at' => now()->addDay(),
            'status' => 'pending',
            'payment_status' => 'unpaid',
        ]);

        $this->getJson('/api/admin/search?q=Searchable')
            ->assertOk()
            ->assertJsonFragment(['type' => 'booking'])
            ->assertJsonFragment(['type' => 'user']);
    }

    public function test_admin_search_requires_at_least_two_characters(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/search?q=a')
            ->assertOk()
            ->assertExactJson([]);
    }
}
