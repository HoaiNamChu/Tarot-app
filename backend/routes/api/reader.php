<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\Reader\ReaderDashboardController;
use App\Http\Controllers\Api\NotificationController;

Route::middleware(['auth:sanctum', \App\Http\Middleware\ReaderMiddleware::class, 'throttle:80,1'])
    ->prefix('reader')
    ->group(function () {
        Route::get('/me', [ReaderDashboardController::class, 'me']);
        Route::get('/notifications', [NotificationController::class, 'index']);
        Route::patch('/notifications/read-all', [NotificationController::class, 'markAllRead']);
        Route::patch('/notifications/{id}/read', [NotificationController::class, 'markRead']);
        Route::get('/stats', [ReaderDashboardController::class, 'stats']);
        Route::get('/services', [ReaderDashboardController::class, 'services']);
        Route::get('/availability', [ReaderDashboardController::class, 'availability']);
        Route::put('/availability', [ReaderDashboardController::class, 'updateAvailability']);
        Route::get('/bookings', [ReaderDashboardController::class, 'bookings']);
        Route::post('/bookings', [ReaderDashboardController::class, 'createBooking']);
        Route::put('/bookings/{id}', [ReaderDashboardController::class, 'updateBooking']);
        Route::patch('/bookings/{id}/confirm', [ReaderDashboardController::class, 'confirmBooking']);
        Route::patch('/bookings/{id}/complete', [ReaderDashboardController::class, 'completeBooking']);
        Route::patch('/bookings/{id}/cancel', [ReaderDashboardController::class, 'cancelBooking']);
        Route::put('/profile', [ReaderDashboardController::class, 'updateProfile']);
    });
