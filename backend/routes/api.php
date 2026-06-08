<?php
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\Payment\VNPayController;

// Route::get(
//     '/payment/vnpay/return',
//     function () {
//         return request()->all();
//     }
// );
Route::get(
    '/payment/vnpay/return',
    [VNPayController::class, 'handleReturn']
);
Route::get(
    '/payment/vnpay/ipn',
    [VNPayController::class, 'ipn']
);
require __DIR__ . '/api/auth.php';
require __DIR__ . '/api/public.php';
require __DIR__ . '/api/user.php';
require __DIR__ . '/api/admin.php';
require __DIR__ . '/api/reader.php';
