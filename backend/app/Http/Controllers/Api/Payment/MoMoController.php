<?php

namespace App\Http\Controllers\Api\Payment;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Services\Payment\MoMoService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MoMoController extends Controller
{
    public function handleReturn(Request $request, MoMoService $service)
    {
        $payment = $this->findPayment($request, $service);
        $query = [
            'booking_id' => $payment?->booking_id,
            'gateway' => 'momo',
        ];

        if (!$service->verifyResult($request->all())) {
            $query['status'] = 'invalid-signature';
            return redirect(rtrim(config('tarot.frontend_url'), '/') . '/payment-result?' . http_build_query($query));
        }

        try {
            $response = $this->processPayment($request, $service);
            $payment?->refresh();
            $query['status'] = $payment?->status === Payment::SUCCESS ? 'success' : 'failed';
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
        return DB::transaction(function () use ($request, $service) {
            $paymentId = $service->paymentIdFromOrderId((string) $request->input('orderId'));
            if (!$paymentId) {
                throw new \RuntimeException('invalid-order-id');
            }

            $payment = Payment::lockForUpdate()->findOrFail($paymentId);
            $payment->load('booking');

            if ((int) $request->input('amount') !== (int) $payment->amount) {
                throw new \RuntimeException('invalid-amount');
            }

            if ($payment->status === Payment::SUCCESS) {
                return response()->json(['resultCode' => 0, 'message' => 'Already confirmed']);
            }

            if ($payment->status === Payment::REFUNDED || in_array($payment->booking->payment_status, ['refund_pending', 'refunded'], true)) {
                return response()->json(['resultCode' => 0, 'message' => 'Already refunded']);
            }

            if ($payment->status === Payment::EXPIRED || $payment->booking->status === 'cancelled') {
                return response()->json(['resultCode' => 0, 'message' => 'Booking is closed']);
            }

            if ((int) $request->input('resultCode') === 0) {
                $payment->update([
                    'status' => Payment::SUCCESS,
                    'transaction_code' => (string) $request->input('transId'),
                    'payload' => array_merge($payment->payload ?? [], [
                        'result' => $request->all(),
                    ]),
                ]);

                $payment->booking->update([
                    'payment_status' => 'paid',
                    'status' => 'confirmed',
                    'paid_at' => now(),
                ]);

                return response()->json(['resultCode' => 0, 'message' => 'Confirm Success']);
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
