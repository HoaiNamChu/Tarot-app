<?php

namespace App\Http\Controllers\Api\PublicApi;

use App\Http\Controllers\Controller;
use App\Models\Reader;
use Illuminate\Support\Facades\Cache;

class ReaderController extends Controller
{
    public function index()
    {
        $readers = Cache::remember('public:readers:active:v1', now()->addMinutes(10), fn() =>
            Reader::query()
                ->select(['id', 'name', 'title', 'bio', 'avatar', 'email', 'phone', 'is_active', 'created_at', 'updated_at', 'user_id'])
                ->where('is_active', true)
                ->orderBy('id')
                ->get()
                ->values()
                ->toArray()
        );

        return response()
            ->json($readers)
            ->header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    }
}
