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
        Route::patch('/bookings/{id}/status', [AdminController::class, 'updateBookingStatus']);
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
        Route::post('/users', [AdminController::class, 'createUser']);
        Route::put('/users/{id}', [AdminController::class, 'updateUser']);
        Route::delete('/users/{id}', [AdminController::class, 'deleteUser']);
        Route::get('/reviews', [AdminController::class, 'reviews']);
        Route::patch('/reviews/{id}', [AdminController::class, 'updateReview']);
        Route::patch('/reviews/{id}/reply', [AdminController::class, 'replyReview']);
        Route::get('/payments', [AdminController::class, 'payments']);
        Route::get('/settings', [AdminController::class, 'settings']);
        Route::put('/settings', [AdminController::class, 'updateSettings']);
        Route::get('/action-logs', [AdminController::class, 'actionLogs']);
    });
