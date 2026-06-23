<?php

namespace App\Http\Controllers\Api\Payment;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Services\Payment\PaymentGatewayConfig;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class VNPayController extends Controller
{
    public function __construct(private PaymentGatewayConfig $gatewayConfig)
    {
    }

    public function handleReturn(Request $request)
    {
        $payment = Payment::find($request->vnp_TxnRef);
        $query = [
            'booking_id' => $payment?->booking_id,
        ];

        // FIX: verify HMAC trước khi xử lý, giống IPN
        // Không verify thì bất kỳ ai cũng giả được thanh toán thành công
        if (!$this->verifySignature($request)) {
            $query['status'] = 'invalid-signature';
            return redirect(rtrim(config('tarot.frontend_url'), '/') . '/payment-result?' . http_build_query($query));
        }

        try {
            $this->processPayment($request);
            $payment?->refresh();
            $query['status'] = $request->vnp_ResponseCode === '00' && $payment?->status === Payment::SUCCESS
                ? 'success'
                : 'failed';
        } catch (\Throwable) {
            $query['status'] = 'failed';
        }

        return redirect(rtrim(config('tarot.frontend_url'), '/') . '/payment-result?' . http_build_query($query));
    }

    public function ipn(Request $request)
    {
        if (!$this->verifySignature($request)) {
            return response()->json(['RspCode' => '97', 'Message' => 'Invalid signature']);
        }

        try {
            return $this->processPayment($request);
        } catch (\Throwable) {
            return response()->json(['RspCode' => '99', 'Message' => 'Payment processing failed']);
        }
    }

    private function verifySignature(Request $request): bool
    {
        $vnp_HashSecret = $this->gatewayConfig->vnpay()['hash_secret'];
        $inputData      = $request->except(['vnp_SecureHash', 'vnp_SecureHashType']);
        $vnp_SecureHash = $request->input('vnp_SecureHash', '');

        if (blank($vnp_HashSecret) || blank($vnp_SecureHash)) {
            return false;
        }

        ksort($inputData);

        $hashData = collect($inputData)
            ->map(fn($v, $k) => urlencode($k) . '=' . urlencode($v))
            ->implode('&');
        $computed = hash_hmac('sha512', $hashData, $vnp_HashSecret);

        return hash_equals($computed, $vnp_SecureHash);
    }

    private function processPayment(Request $request)
    {
        return DB::transaction(function () use ($request) {

            $payment = Payment::lockForUpdate()->findOrFail($request->vnp_TxnRef);
            $payment->load('booking');

            // FIX: throw exception thay vì redirect() trong transaction
            // redirect() không thoát ra khỏi transaction, code vẫn chạy tiếp
            if ((int)$request->vnp_Amount !== (int)($payment->amount * 100)) {
                throw new \Exception('invalid-amount');
            }

            // Idempotent: đã xử lý rồi thì bỏ qua
            if ($payment->status === Payment::SUCCESS) {
                return response()->json(['RspCode' => '00', 'Message' => 'Already confirmed']);
            }

            if ($payment->status === Payment::REFUNDED || in_array($payment->booking->payment_status, ['refund_pending', 'refunded'], true)) {
                return response()->json(['RspCode' => '00', 'Message' => 'Already refunded']);
            }

            if ($payment->status === Payment::EXPIRED || $payment->booking->status === 'cancelled') {
                return response()->json(['RspCode' => '00', 'Message' => 'Booking is closed']);
            }

            if ($request->vnp_ResponseCode === '00') {
                $payment->update([
                    'status'           => Payment::SUCCESS,
                    'transaction_code' => $request->vnp_TransactionNo,
                    'payload'          => $request->all(),
                ]);

                $payment->booking->update([
                    'payment_status' => 'paid',
                    'status'         => 'confirmed',
                    'paid_at'        => now(),
                ]);

                return response()->json(['RspCode' => '00', 'Message' => 'Confirm Success']);
            }

            // FIX: set failed thay vì để pending mãi khi user back/tắt tab
            $payment->update([
                'status'  => 'failed',
                'payload' => $request->all(),
            ]);

            return response()->json(['RspCode' => '00', 'Message' => 'Failed']);
        });
    }
}
