<?php

namespace App\Http\Controllers\Api\Payment;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class VNPayController extends Controller
{
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
            $query['status'] = $request->vnp_ResponseCode === '00' ? 'success' : 'failed';
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
        $vnp_HashSecret = config('vnpay.hash_secret');
        $inputData      = $request->except(['vnp_SecureHash', 'vnp_SecureHashType']);
        $vnp_SecureHash = $request->input('vnp_SecureHash', '');

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

            // FIX: throw exception thay vì redirect() trong transaction
            // redirect() không thoát ra khỏi transaction, code vẫn chạy tiếp
            if ((int)$request->vnp_Amount !== (int)($payment->amount * 100)) {
                throw new \Exception('invalid-amount');
            }

            // Idempotent: đã xử lý rồi thì bỏ qua
            if ($payment->status === 'success') {
                return response()->json(['RspCode' => '00', 'Message' => 'Already confirmed']);
            }

            if ($request->vnp_ResponseCode === '00') {
                $payment->update([
                    'status'           => 'success',
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
