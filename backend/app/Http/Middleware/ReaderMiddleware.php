<?php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class ReaderMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        if (!in_array($request->user()?->role, ['reader', 'admin'])) {
            return response()->json(['message' => 'Không có quyền truy cập.'], 403);
        }
        return $next($request);
    }
}
