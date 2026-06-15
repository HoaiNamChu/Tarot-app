<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;

class HealthController extends Controller
{
    public function __invoke()
    {
        DB::select('select 1');

        return response()->json([
            'status' => 'ok',
            'environment' => app()->environment(),
            'debug' => (bool) config('app.debug'),
            'queue' => config('queue.default'),
            'cache' => config('cache.default'),
            'mail' => config('mail.default'),
            'time' => now()->toIso8601String(),
        ]);
    }
}
