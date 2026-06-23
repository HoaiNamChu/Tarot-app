<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Reader;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminStatsTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_stats_include_refund_pending_totals(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $customer = User::factory()->create();
        $reader = Reader::create([
            'name' => 'QA Reader',
            'title' => 'Tarot Reader',
            'bio' => 'QA bio',
        ]);
        $service = Service::create([
            'name' => 'QA Service',
            'description' => 'QA service',
            'duration' => 60,
            'price' => 250000,
        ]);

        Booking::create([
            'user_id' => $customer->id,
            'reader_id' => $reader->id,
            'service_id' => $service->id,
            'booked_at' => now()->addDay(),
            'status' => 'cancelled',
            'payment_status' => 'refund_pending',
            'payment_method' => 'bank',
            'paid_at' => now(),
            'cancelled_at' => now(),
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/stats')
            ->assertOk()
            ->assertJsonPath('payments_refund_pending', 1)
            ->assertJsonPath('payments_refund_pending_amount', 250000)
            ->assertJsonPath('payments_refund_pending_amount_million', 0.25);
    }
}
