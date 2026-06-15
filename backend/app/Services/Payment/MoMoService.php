<?php

namespace App\Services\Payment;

use App\Models\Booking;
use App\Models\Payment;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class MoMoService
{
    public function __construct(private PaymentGatewayConfig $config)
    {
    }

    public function isConfigured(): bool
    {
        return $this->config->missingMomo() === [];
    }

    public function missingConfig(): array
    {
        return $this->config->missingMomo();
    }

    public function createUrl(Booking $booking, Payment $payment): string
    {
        $existingPayUrl = $payment->payload['payUrl'] ?? null;
        if ($payment->status === Payment::PENDING && filled($existingPayUrl)) {
            return $existingPayUrl;
        }

        $momo = $this->config->momo();
        $partnerCode = $momo['partner_code'];
        $accessKey = $momo['access_key'];
        $secretKey = $momo['secret_key'];
        $endpoint = $momo['endpoint'];
        $redirectUrl = $momo['redirect_url'];
        $ipnUrl = $momo['ipn_url'];
        $requestType = 'captureWallet';
        $extraData = '';
        $amount = (int) $payment->amount;
        $orderId = $this->orderId($payment);
        $requestId = (string) Str::uuid();
        $orderInfo = "Thanh toan booking #{$booking->id}";

        $missing = $this->missingConfig();
        if ($missing !== []) {
            throw new \RuntimeException('MoMo gateway is not configured: ' . implode(', ', $missing));
        }

        $signature = $this->signCreate([
            'accessKey' => $accessKey,
            'amount' => $amount,
            'extraData' => $extraData,
            'ipnUrl' => $ipnUrl,
            'orderId' => $orderId,
            'orderInfo' => $orderInfo,
            'partnerCode' => $partnerCode,
            'redirectUrl' => $redirectUrl,
            'requestId' => $requestId,
            'requestType' => $requestType,
        ]);

        $payload = [
            'partnerCode' => $partnerCode,
            'requestId' => $requestId,
            'amount' => $amount,
            'orderId' => $orderId,
            'orderInfo' => $orderInfo,
            'redirectUrl' => $redirectUrl,
            'ipnUrl' => $ipnUrl,
            'requestType' => $requestType,
            'extraData' => $extraData,
            'lang' => $momo['lang'] ?: 'vi',
            'signature' => $signature,
        ];

        $response = Http::timeout(30)->post($endpoint, $payload);
        if (!$response->successful()) {
            throw new \RuntimeException('MoMo create payment request failed.');
        }

        $data = $response->json();
        if (($data['resultCode'] ?? null) !== 0 || blank($data['payUrl'] ?? null)) {
            throw new \RuntimeException($data['message'] ?? 'MoMo payment URL was not created.');
        }

        $payment->update([
            'payload' => array_merge($data, [
                'create_request' => $payload,
            ]),
        ]);

        return $data['payUrl'];
    }

    public function orderId(Payment $payment): string
    {
        return 'MOMO-' . $payment->id;
    }

    public function paymentIdFromOrderId(string $orderId): ?int
    {
        if (!str_starts_with($orderId, 'MOMO-')) {
            return null;
        }

        $id = substr($orderId, 5);

        return ctype_digit($id) ? (int) $id : null;
    }

    public function verifyResult(array $data): bool
    {
        $signature = $data['signature'] ?? '';
        if (!is_string($signature) || $signature === '') {
            return false;
        }

        $computed = $this->signResult([
            'accessKey' => $this->config->momo()['access_key'],
            'amount' => $data['amount'] ?? '',
            'extraData' => $data['extraData'] ?? '',
            'message' => $data['message'] ?? '',
            'orderId' => $data['orderId'] ?? '',
            'orderInfo' => $data['orderInfo'] ?? '',
            'orderType' => $data['orderType'] ?? '',
            'partnerCode' => $data['partnerCode'] ?? '',
            'payType' => $data['payType'] ?? '',
            'requestId' => $data['requestId'] ?? '',
            'responseTime' => $data['responseTime'] ?? '',
            'resultCode' => $data['resultCode'] ?? '',
            'transId' => $data['transId'] ?? '',
        ]);

        return hash_equals($computed, $signature);
    }

    private function signCreate(array $data): string
    {
        $raw = 'accessKey=' . $data['accessKey']
            . '&amount=' . $data['amount']
            . '&extraData=' . $data['extraData']
            . '&ipnUrl=' . $data['ipnUrl']
            . '&orderId=' . $data['orderId']
            . '&orderInfo=' . $data['orderInfo']
            . '&partnerCode=' . $data['partnerCode']
            . '&redirectUrl=' . $data['redirectUrl']
            . '&requestId=' . $data['requestId']
            . '&requestType=' . $data['requestType'];

        return hash_hmac('sha256', $raw, $this->config->momo()['secret_key']);
    }

    private function signResult(array $data): string
    {
        $raw = 'accessKey=' . $data['accessKey']
            . '&amount=' . $data['amount']
            . '&extraData=' . $data['extraData']
            . '&message=' . $data['message']
            . '&orderId=' . $data['orderId']
            . '&orderInfo=' . $data['orderInfo']
            . '&orderType=' . $data['orderType']
            . '&partnerCode=' . $data['partnerCode']
            . '&payType=' . $data['payType']
            . '&requestId=' . $data['requestId']
            . '&responseTime=' . $data['responseTime']
            . '&resultCode=' . $data['resultCode']
            . '&transId=' . $data['transId'];

        return hash_hmac('sha256', $raw, $this->config->momo()['secret_key']);
    }
}
