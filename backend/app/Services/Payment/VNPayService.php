<?php

namespace App\Services\Payment;

use App\Models\Booking;
use App\Models\Payment;

class VNPayService
{
    public function createUrl(
        Booking $booking,
        Payment $payment
    ): string {

        $vnp_TmnCode = config('vnpay.tmn_code');
        $vnp_HashSecret = config('vnpay.hash_secret');
        $vnp_Url = config('vnpay.url');
        $vnp_Returnurl = config('vnpay.return_url');
        $vnp_IpnUrl = config('vnpay.ipn_url');

        foreach ([
            'VNPAY_TMN_CODE' => $vnp_TmnCode,
            'VNPAY_HASH_SECRET' => $vnp_HashSecret,
            'VNPAY_URL' => $vnp_Url,
            'VNPAY_RETURN_URL' => $vnp_Returnurl,
        ] as $name => $value) {
            if (blank($value)) {
                throw new \RuntimeException("Missing {$name} configuration.");
            }
        }

        $inputData = [
            "vnp_Version"   => "2.1.0",
            "vnp_TmnCode"   => $vnp_TmnCode,
            "vnp_Amount"    => (int) ($payment->amount * 100),
            "vnp_Command"   => "pay",
            "vnp_CreateDate" => now()->format('YmdHis'),
            "vnp_CurrCode"  => "VND",
            "vnp_IpAddr"    => request()->ip(),
            "vnp_Locale"    => "vn",
            "vnp_OrderInfo" => "Booking #{$booking->id}",
            "vnp_OrderType" => "billpayment",
            "vnp_ReturnUrl" => $vnp_Returnurl,
            "vnp_TxnRef"    => $payment->id,
            // "vnp_IpnUrl"    => $vnp_IpnUrl,  // ← bỏ comment
        ];

        ksort($inputData);

        $hashData = '';

        $query = '';

        $i = 0;

        foreach ($inputData as $key => $value) {

            if ($i == 1) {
                $hashData .= '&';
                $query .= '&';
            }

            $hashData .= urlencode($key) . "=" . urlencode($value);

            $query .= urlencode($key) . "=" . urlencode($value);

            $i = 1;
        }

        $vnpSecureHash = hash_hmac(
            'sha512',
            $hashData,
            $vnp_HashSecret
        );

        return $vnp_Url
            . '?'
            . $query
            . '&vnp_SecureHash='
            . $vnpSecureHash;
    }
}
