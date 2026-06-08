<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\Admin\AdminController;

Route::middleware(['auth:sanctum', \App\Http\Middleware\AdminMiddleware::class, 'throttle:80,1'])
    ->prefix('admin')
    ->group(function () {
        Route::get('/stats', [AdminController::class, 'stats']);
        Route::get('/bookings', [AdminController::class, 'bookings']);
        Route::post('/bookings', [AdminController::class, 'createBooking']);
        Route::patch('/bookings/{id}/confirm', [AdminController::class, 'confirmBooking']);
        Route::patch('/bookings/{id}/cancel', [AdminController::class, 'cancelBooking']);
        Route::patch('/bookings/{id}/complete', [AdminController::class, 'completeBooking']);
        Route::patch('/bookings/{id}/zoom', [AdminController::class, 'setZoom']);
        Route::patch('/bookings/{id}/payment', [AdminController::class, 'updatePayment']);
        Route::get('/readers', [AdminController::class, 'readers']);
        Route::post('/readers', [AdminController::class, 'createReader']);
        Route::put('/readers/{id}', [AdminController::class, 'updateReader']);
        Route::delete('/readers/{id}', [AdminController::class, 'deleteReader']);
        Route::get('/services', [AdminController::class, 'services']);
        Route::post('/services', [AdminController::class, 'createService']);
        Route::put('/services/{id}', [AdminController::class, 'updateService']);
        Route::delete('/services/{id}', [AdminController::class, 'deleteService']);
        Route::get('/users', [AdminController::class, 'users']);
        Route::get('/reviews', [AdminController::class, 'reviews']);
        Route::get('/payments', [AdminController::class, 'payments']);
    });
