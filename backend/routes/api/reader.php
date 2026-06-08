<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\Reader\ReaderDashboardController;

Route::middleware(['auth:sanctum', \App\Http\Middleware\ReaderMiddleware::class, 'throttle:80,1'])
    ->prefix('reader')
    ->group(function () {
        Route::get('/me', [ReaderDashboardController::class, 'me']);
        Route::get('/stats', [ReaderDashboardController::class, 'stats']);
        Route::get('/bookings', [ReaderDashboardController::class, 'bookings']);
        Route::put('/profile', [ReaderDashboardController::class, 'updateProfile']);
    });
