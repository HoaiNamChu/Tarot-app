<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\PublicApi\ReadingController;
use App\Http\Controllers\Api\PublicApi\ReaderController;
use App\Http\Controllers\Api\PublicApi\ServiceController;
use App\Http\Controllers\Api\PublicApi\AvailabilityController;

Route::prefix('readings')->middleware('throttle:40,1')->group(function () {
    Route::get('/limit', [ReadingController::class, 'getLimit']);
    Route::post('/use', [ReadingController::class, 'useLimit']);
    Route::post('/interpret', [ReadingController::class, 'interpret']);
});

Route::middleware('throttle:150,1')->group(function () {
    Route::get('/readers', [ReaderController::class, 'index']);
    Route::get('/services', [ServiceController::class, 'index']);
});

Route::prefix('readers')->middleware('throttle:80,1')->group(function () {
    Route::get('/{id}/busy-slots', [AvailabilityController::class, 'getBusySlots']);
    Route::get('/{id}/check-slot', [AvailabilityController::class, 'checkSlot']);
});
