<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\Auth\AuthController;

Route::prefix('auth')->group(function () {
    $registerThrottle = config('auth_limits.register', '30,1');
    $loginThrottle = config('auth_limits.login', '60,1');
    $passwordThrottle = config('auth_limits.password', '20,1');
    $sessionThrottle = config('auth_limits.session', '240,1');

    Route::post('/register', [AuthController::class, 'register'])->middleware("throttle:$registerThrottle");
    Route::post('/login', [AuthController::class, 'login'])->middleware("throttle:$loginThrottle");
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware("throttle:$passwordThrottle");
    Route::post('/reset-password', [AuthController::class, 'resetPassword'])->middleware("throttle:$passwordThrottle");

    Route::middleware(['auth:sanctum', "throttle:$sessionThrottle"])->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
    });
});
