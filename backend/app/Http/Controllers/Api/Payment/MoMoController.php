<?php

namespace App\Http\Controllers\Api\Payment;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Payment;
use App\Services\NotificationService;
use App\Services\Payment\MoMoService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MoMoController extends Controller
{
    public function handleReturn(Request $request, MoMoService $service)
    {
        $query = [
            'gateway' => 'momo',
        ];

        if (!$service->verifyResult($request->all())) {
            $query['status'] = 'invalid-signature';
            return redirect(rtrim(config('tarot.frontend_url'), '/') . '/payment-result?' . http_build_query($query));
        }

        $payment = $this->findPayment($request, $service);
        $query['booking_id'] = $payment?->booking_id;

        try {
            $response = $this->processPayment($request, $service);
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

    public function ipn(Request $request, MoMoService $service)
    {
        if (!$service->verifyResult($request->all())) {
            return response()->json(['resultCode' => 97, 'message' => 'Invalid signature']);
        }

        try {
            return $this->processPayment($request, $service);
        } catch (\Throwable) {
            return response()->json(['resultCode' => 99, 'message' => 'Payment processing failed']);
        }
    }

    private function processPayment(Request $request, MoMoService $service)
    {
        $paymentId = $service->paymentIdFromOrderId((string) $request->input('orderId'));
        if (!$paymentId) {
            throw new \RuntimeException('invalid-order-id');
        }

        $bookingId = Payment::whereKey($paymentId)->value('booking_id');
        if (!$bookingId) {
            throw new \RuntimeException('invalid-payment');
        }

        return DB::transaction(function () use ($request, $paymentId, $bookingId) {
            $booking = Booking::lockForUpdate()->findOrFail($bookingId);
            $payment = Payment::where('booking_id', $booking->id)
                ->lockForUpdate()
                ->findOrFail($paymentId);

            if ((int) $request->input('amount') !== (int) $payment->amount) {
                throw new \RuntimeException('invalid-amount');
            }

            if ($payment->status === Payment::SUCCESS) {
                return response()->json(['resultCode' => 0, 'message' => 'Already confirmed']);
            }

            if ($payment->status === Payment::REFUNDED || in_array($booking->payment_status, ['refund_pending', 'refunded'], true)) {
                return response()->json(['resultCode' => 0, 'message' => 'Already refunded']);
            }

            $succeeded = (int) $request->input('resultCode') === 0;

            if ($succeeded) {
                $capturedAfterCancellation = $payment->status === Payment::EXPIRED || $booking->status === 'cancelled';
                $payment->update([
                    'status' => Payment::SUCCESS,
                    'transaction_code' => (string) $request->input('transId'),
                    'payload' => array_merge($payment->payload ?? [], [
                        'result' => $request->all(),
                    ]),
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
                        'Giao dịch MoMo đến sau khi hủy lịch, cần kiểm tra để hoàn tiền.',
                        '/payments',
                        ['booking_id' => $booking->id, 'payment_id' => $payment->id, 'gateway' => 'momo']
                    );
                }

                return response()->json([
                    'resultCode' => 0,
                    'message' => $capturedAfterCancellation ? 'Late payment captured; refund review required' : 'Confirm Success',
                ]);
            }

            if ($payment->status === Payment::EXPIRED || $booking->status === 'cancelled') {
                return response()->json(['resultCode' => 0, 'message' => 'Booking is closed']);
            }

            $payment->update([
                'status' => Payment::FAILED,
                'payload' => array_merge($payment->payload ?? [], [
                    'result' => $request->all(),
                ]),
            ]);

            return response()->json(['resultCode' => 0, 'message' => 'Failed']);
        });
    }

    private function findPayment(Request $request, MoMoService $service): ?Payment
    {
        $paymentId = $service->paymentIdFromOrderId((string) $request->input('orderId'));

        return $paymentId ? Payment::find($paymentId) : null;
    }
}
