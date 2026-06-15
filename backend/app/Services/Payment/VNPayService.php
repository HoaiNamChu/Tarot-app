<?php

namespace App\Services\Payment;

use App\Models\Booking;
use App\Models\Payment;

class VNPayService
{
    public function __construct(private PaymentGatewayConfig $config)
    {
    }

    public function isConfigured(): bool
    {
        return $this->config->missingVnpay() === [];
    }

    public function createUrl(
        Booking $booking,
        Payment $payment
    ): string {

        $vnpay = $this->config->vnpay();
        $vnp_TmnCode = $vnpay['tmn_code'];
        $vnp_HashSecret = $vnpay['hash_secret'];
        $vnp_Url = $vnpay['url'];
        $vnp_Returnurl = $vnpay['return_url'];
        $vnp_IpnUrl = $vnpay['ipn_url'];

        $missing = $this->config->missingVnpay();
        if ($missing !== []) {
            throw new \RuntimeException('VNPay gateway is not configured: ' . implode(', ', $missing));
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
