<?php

namespace App\Http\Controllers\Api\Payment;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Payment;
use App\Services\NotificationService;
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
        $query = [];

        // FIX: verify HMAC trước khi xử lý, giống IPN
        // Không verify thì bất kỳ ai cũng giả được thanh toán thành công
        if (!$this->verifySignature($request)) {
            $query['status'] = 'invalid-signature';
            return redirect(rtrim(config('tarot.frontend_url'), '/') . '/payment-result?' . http_build_query($query));
        }

        $payment = Payment::find($request->vnp_TxnRef);
        $query['booking_id'] = $payment?->booking_id;

        try {
            $this->processPayment($request);
            $payment?->refresh();
            $payment?->load('booking');
            $query['status'] = $payment?->status === Payment::SUCCESS
                ? ($payment->booking?->payment_status === 'refund_pending' ? 'refund_pending' : 'success')
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

        if (
            blank($vnp_HashSecret) ||
            blank($this->gatewayConfig->vnpay()['tmn_code']) ||
            !is_string($vnp_SecureHash) ||
            $vnp_SecureHash === '' ||
            collect($inputData)->contains(fn($value) => !is_scalar($value)) ||
            !hash_equals((string) $this->gatewayConfig->vnpay()['tmn_code'], (string) $request->input('vnp_TmnCode', ''))
        ) {
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
        $paymentId = (int) $request->input('vnp_TxnRef');
        $bookingId = Payment::whereKey($paymentId)->value('booking_id');
        abort_if(!$bookingId, 404, 'Payment not found.');

        return DB::transaction(function () use ($request, $paymentId, $bookingId) {
            $booking = Booking::lockForUpdate()->findOrFail($bookingId);
            $payment = Payment::where('booking_id', $booking->id)
                ->lockForUpdate()
                ->findOrFail($paymentId);

            if ((int) $request->input('vnp_Amount') !== (int) ($payment->amount * 100)) {
                throw new \Exception('invalid-amount');
            }

            if ($payment->status === Payment::SUCCESS) {
                return response()->json(['RspCode' => '00', 'Message' => 'Already confirmed']);
            }

            if ($payment->status === Payment::REFUNDED || in_array($booking->payment_status, ['refund_pending', 'refunded'], true)) {
                return response()->json(['RspCode' => '00', 'Message' => 'Already refunded']);
            }

            $succeeded = $request->input('vnp_ResponseCode') === '00'
                && $request->input('vnp_TransactionStatus') === '00';

            if ($succeeded) {
                $capturedAfterCancellation = $payment->status === Payment::EXPIRED || $booking->status === 'cancelled';
                $payment->update([
                    'status' => Payment::SUCCESS,
                    'transaction_code' => $request->input('vnp_TransactionNo'),
                    'payload' => $request->all(),
                ]);

                $booking->update([
                    'payment_status' => $capturedAfterCancellation ? 'refund_pending' : 'paid',
                    'status' => $capturedAfterCancellation ? 'cancelled' : 'confirmed',
                    'paid_at' => now(),
                ]);

                if ($capturedAfterCancellation) {
                    app(NotificationService::class)->notifyAdmins(
                        'payment.late_capture',
                        'Đã nhận thanh toán sau khi lịch bị hủy',
                        'Giao dịch VNPay đến sau khi hủy lịch, cần kiểm tra để hoàn tiền.',
                        '/payments',
                        ['booking_id' => $booking->id, 'payment_id' => $payment->id, 'gateway' => 'vnpay']
                    );
                }

                return response()->json([
                    'RspCode' => '00',
                    'Message' => $capturedAfterCancellation ? 'Late payment captured; refund review required' : 'Confirm Success',
                ]);
            }

            if ($payment->status === Payment::EXPIRED || $booking->status === 'cancelled') {
                return response()->json(['RspCode' => '00', 'Message' => 'Booking is closed']);
            }

            $payment->update([
                'status'  => 'failed',
                'payload' => $request->all(),
            ]);

            return response()->json(['RspCode' => '00', 'Message' => 'Failed']);
        });
    }
}
