<?php

namespace App\Http\Controllers\Api\Payment;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

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
            return redirect(env('FRONTEND_URL') . '/payment-result?' . http_build_query($query));
        }

        $this->processPayment($request);

        if ($request->vnp_ResponseCode === '00') {
            $query['status'] = 'success';
            return redirect(env('FRONTEND_URL') . '/payment-result?' . http_build_query($query));
        }

        $query['status'] = 'failed';
        return redirect(env('FRONTEND_URL') . '/payment-result?' . http_build_query($query));
    }

    public function ipn(Request $request)
    {
        if (!$this->verifySignature($request)) {
            return response()->json(['RspCode' => '97', 'Message' => 'Invalid signature']);
        }

        return $this->processPayment($request);
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

        Log::debug('VNPay signature', [
            'match'     => $computed === $vnp_SecureHash,
            'computed'  => $computed,
            'received'  => $vnp_SecureHash,
            'hash_data' => $hashData,
        ]);
        
        return hash_hmac('sha512', $hashData, $vnp_HashSecret) === $vnp_SecureHash;
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
