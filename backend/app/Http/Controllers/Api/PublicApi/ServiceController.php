<?php

namespace App\Http\Controllers\Api\PublicApi;

use App\Http\Controllers\Controller;
use App\Models\Service;
use Illuminate\Support\Facades\Cache;

class ServiceController extends Controller
{
    public function index()
    {
        $services = Cache::remember('public:services:active:v1', now()->addMinutes(10), fn() =>
            Service::query()
                ->select(['id', 'name', 'description', 'duration', 'price', 'is_active', 'created_at', 'updated_at'])
                ->where('is_active', true)
                ->orderBy('id')
                ->get()
                ->values()
                ->toArray()
        );

        return response()
            ->json($services)
            ->header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    }
}
