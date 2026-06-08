<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\User\BookingController;
use App\Http\Controllers\Api\PublicApi\ReadingController;
use App\Http\Controllers\Api\User\ProfileController;

Route::middleware(['auth:sanctum', 'throttle:80,1'])->group(function () {
    Route::prefix('bookings')->group(function () {
        Route::get('/', [BookingController::class, 'index']);
        Route::post('/', [BookingController::class, 'store']);
        Route::patch('/{id}/cancel', [BookingController::class, 'cancel']);
        Route::patch('/{id}/pay', [BookingController::class, 'pay']);
        Route::get('/reviews', [BookingController::class, 'getReviews']);
        Route::post('/{id}/reviews', [BookingController::class, 'storeReview']);
    });

    Route::get('/readings/history', [ReadingController::class, 'history']);
    Route::put('/profile', [ProfileController::class, 'update']);
    Route::put('/profile/password', [ProfileController::class, 'changePassword']);
});

