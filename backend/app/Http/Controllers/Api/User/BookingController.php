<?php

namespace App\Http\Controllers\Api\User;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Review;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use App\Mail\BookingCancelled;
use App\Models\AppSetting;
use App\Services\Booking\CreateBookingService;
use App\Services\NotificationService;
use Illuminate\Support\Facades\Log;

class BookingController extends Controller
{
    public function index(Request $request)
    {
        $bookings = Booking::with(['reader', 'service', 'payments'])
            ->where('user_id', $request->user()->id)
            ->orderBy('booked_at', 'desc')
            ->get()
            ->map(fn($b) => $this->formatBooking($b));

        return response()->json($bookings);
    }

    public function store(Request $request, CreateBookingService $service)
    {
        $data = $request->validate([
            'reader_id'  => 'required|exists:readers,id',
            'service_id' => 'required|exists:services,id',
            'booked_at'  => 'required|date|after:now',
            'note'       => 'nullable|string|max:1000',
        ]);

        $booking = $service->execute($request->user(), $data);

        return response()->json($this->formatBooking($booking), 201);
    }

    public function cancel(Request $request, $id)
    {
        $booking = Booking::where('user_id', $request->user()->id)
            ->where('id', $id)
            ->firstOrFail();

        if (!in_array($booking->status, ['pending', 'confirmed'])) {
            return response()->json(['message' => 'Không thể huỷ lịch này.'], 422);
        }

        $booking->load(['user', 'reader', 'service']);

        $booking->update([
            'status'       => 'cancelled',
            'cancelled_at' => now(),
        ]);

        try {
            Mail::to($booking->user->email)->queue(new BookingCancelled($booking));
        } catch (\Throwable $e) {
            Log::warning('Booking cancellation mail failed', [
                'booking_id' => $booking->id,
                'error' => $e->getMessage(),
            ]);
        }

        app(NotificationService::class)->notifyAdmins('booking.cancelled_by_customer', 'Khach huy lich', ($booking->user?->name ?? 'Khach hang') . ' da huy lich BK-' . str_pad($booking->id, 4, '0', STR_PAD_LEFT), '/bookings', [
            'booking_id' => $booking->id,
            'reader' => $booking->reader?->name,
        ]);
        app(NotificationService::class)->notifyReaderForBooking($booking, 'booking.cancelled_by_customer', 'Khach da huy lich', ($booking->user?->name ?? 'Khach hang') . ' da huy lich ' . $booking->booked_at?->format('d/m/Y H:i'));

        return response()->json(['message' => 'Đã huỷ lịch thành công.']);
    }

    public function pay(Request $request, $id, \App\Services\Payment\PaymentService $service)
    {
        $data = $request->validate([
            'payment_method' => 'required|in:vnpay,bank,momo',
            'proof_code' => 'nullable|string|max:100',
            'proof_note' => 'nullable|string|max:1000',
        ]);

        try {
            if ($data['payment_method'] === 'vnpay' && !AppSetting::getBool('payment_vnpay_enabled', true)) {
                return response()->json(['message' => 'Phuong thuc thanh toan VNPay dang tam tat.'], 422);
            }

            if ($data['payment_method'] === 'bank' && !AppSetting::getBool('payment_bank_enabled', true)) {
                return response()->json(['message' => 'Phuong thuc chuyen khoan dang tam tat.'], 422);
            }

            if ($data['payment_method'] === 'momo' && !AppSetting::getBool('payment_momo_enabled', false)) {
                return response()->json(['message' => 'Phuong thuc thanh toan MoMo dang tam tat.'], 422);
            }

            $booking = Booking::with('service')
                ->where('user_id', $request->user()->id)
                ->findOrFail($id);

            if ($booking->status === 'cancelled') {
                return response()->json(['message' => 'Booking đã bị huỷ.'], 409);
            }

            if ($booking->payment_status === 'paid') {
                return response()->json(['message' => 'Booking đã thanh toán.'], 409);
            }

            if ($booking->status === 'completed') {
                return response()->json(['message' => 'Booking đã hoàn thành.'], 422);
            }

            // FIX: bỏ check duplicate, thêm cancelled_at khi tự cancel do hết hạn
            if ($booking->expires_at && $booking->expires_at->isPast()) {
                $booking->update([
                    'status'       => 'cancelled',
                    'cancelled_at' => now(),
                ]);
                return response()->json(['message' => 'Booking đã hết hạn thanh toán.'], 410);
            }

            $payment = $service->create($booking, $data['payment_method']);

            if ($data['payment_method'] === 'vnpay') {
                $vnpay = app(\App\Services\Payment\VNPayService::class);
                $url = $vnpay->createUrl($booking, $payment);
                return response()->json(['payment_url' => $url]);
            }

            if ($data['payment_method'] === 'momo') {
                $momo = app(\App\Services\Payment\MoMoService::class);
                $url = $momo->createUrl($booking, $payment);
                return response()->json(['payment_url' => $url]);
            }

            if ($data['payment_method'] === 'bank' && empty(trim($data['proof_code'] ?? ''))) {
                return response()->json(['message' => 'Vui long nhap ma giao dich hoac thoi gian chuyen tien.'], 422);
            }

            $booking->update([
                'payment_method' => $data['payment_method'],
                'payment_status' => 'pending_verification',
            ]);

            $payment->update([
                'proof_code' => $data['proof_code'] ?? null,
                'proof_note' => $data['proof_note'] ?? null,
                'submitted_at' => now(),
            ]);

            $booking->loadMissing(['user', 'reader', 'service']);
            app(NotificationService::class)->notifyAdmins('payment.pending_verification', 'Thanh toan can xac minh', ($booking->user?->name ?? 'Khach hang') . ' da gui thong tin chuyen khoan cho BK-' . str_pad($booking->id, 4, '0', STR_PAD_LEFT), '/payments', [
                'booking_id' => $booking->id,
                'payment_method' => $data['payment_method'],
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Da ghi nhan thanh toan. Admin se xac nhan thanh toan.',
                'payment_status' => 'pending_verification',
                'payment_method' => $data['payment_method'],
            ]);
        } catch (\RuntimeException $e) {
            if (str_starts_with($e->getMessage(), 'VNPay gateway is not configured:')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cong thanh toan VNPay chua duoc cau hinh day du. Vui long cap nhat cau hinh VNPay trong admin.',
                    'missing_config' => array_map('trim', explode(',', substr($e->getMessage(), strlen('VNPay gateway is not configured:')))),
                ], 422);
            }

            if (str_starts_with($e->getMessage(), 'MoMo gateway is not configured:')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cong thanh toan MoMo chua duoc cau hinh day du. Vui long cap nhat cau hinh MoMo trong admin.',
                    'missing_config' => array_map('trim', explode(',', substr($e->getMessage(), strlen('MoMo gateway is not configured:')))),
                ], 422);
            }

            Log::warning('Payment request failed', [
                'booking_id' => $id,
                'payment_method' => $data['payment_method'] ?? null,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Khong the xu ly thanh toan luc nay. Vui long thu lai sau.',
            ], 409);
        } catch (\Throwable $e) {
            Log::warning('Payment request failed', [
                'booking_id' => $id,
                'payment_method' => $data['payment_method'] ?? null,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Khong the xu ly thanh toan luc nay. Vui long thu lai sau.',
            ], 409);
        }
    }

    public function getReviews(Request $request)
    {
        $reviews = Review::with(['reader', 'booking.service'])
            ->where('user_id', $request->user()->id)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($r) => [
                'id'         => $r->id,
                'readerEm'   => $r->reader->avatar,
                'readerName' => $r->reader->name,
                'svc'        => $r->booking->service->name ?? '',
                'stars'      => $r->stars,
                'text'       => $r->content,
                'status'     => $r->status ?: 'pending',
                'adminReply' => $r->reply_visible ? $r->admin_reply : null,
                'date'       => $r->created_at->format('d/m/Y'),
                'bookingId'  => $r->booking_id,
            ]);

        return response()->json($reviews);
    }

    public function storeReview(Request $request, $id)
    {
        $request->validate([
            'stars'   => 'required|integer|min:1|max:5',
            'content' => 'required|string|min:10|max:1000',
        ], [
            'stars.required'   => 'Vui lòng chọn số sao.',
            'content.required' => 'Vui lòng viết nhận xét.',
            'content.min'      => 'Nhận xét phải có ít nhất 10 ký tự.',
        ]);

        $booking = Booking::where('user_id', $request->user()->id)
            ->where('id', $id)
            ->where('status', 'completed')
            ->firstOrFail();

        if (Review::where('booking_id', $id)->where('user_id', $request->user()->id)->exists()) {
            return response()->json(['message' => 'Bạn đã đánh giá lịch này rồi.'], 422);
        }

        $review = Review::create([
            'user_id'    => $request->user()->id,
            'booking_id' => $booking->id,
            'reader_id'  => $booking->reader_id,
            'stars'      => $request->stars,
            'content'    => $request->content,
            'status'     => 'pending',
        ]);

        $booking->update(['reviewed' => true]);
        $booking->loadMissing(['user', 'reader', 'service']);
        app(NotificationService::class)->notifyAdmins('review.created', 'Danh gia moi can duyet', ($request->user()->name ?? 'Khach hang') . ' da gui danh gia ' . $review->stars . ' sao', '/reviews', [
            'booking_id' => $booking->id,
            'review_id' => $review->id,
            'reader' => $booking->reader?->name,
        ]);
        app(NotificationService::class)->notifyReaderForBooking($booking, 'review.created', 'Ban co danh gia moi', ($request->user()->name ?? 'Khach hang') . ' da danh gia ' . $review->stars . ' sao', [
            'review_id' => $review->id,
        ]);

        return response()->json([
            'id'         => $review->id,
            'readerEm'   => $booking->reader->avatar,
            'readerName' => $booking->reader->name,
            'svc'        => $booking->service->name,
            'stars'      => $review->stars,
            'text'       => $review->content,
            'status'     => $review->status,
            'adminReply' => null,
            'date'       => $review->created_at->format('d/m/Y'),
            'bookingId'  => $review->booking_id,
        ], 201);
    }

    private function formatBooking(Booking $b): array
    {
        $latestPayment = $b->payments->sortByDesc('id')->first();

        return [
            'id'                    => 'BK-' . str_pad($b->id, 4, '0', STR_PAD_LEFT),
            'booking_id'            => $b->id,
            'svc'                   => $b->service->name,
            'reader'                => $b->reader->name,
            'readerEm'              => $b->reader->avatar,
            'date'                  => $b->booked_at->format('d/m/Y'),
            'time'                  => $b->booked_at->format('H:i'),
            'dur'                   => $b->service->duration . ' phút',
            'price'                 => number_format($b->service->price, 0, ',', '.') . 'đ',
            'amount'                => $b->service->price,
            'status'                => $b->status,
            'payment_status'        => $b->payment_status,
            'payment_method'        => $b->payment_method,
            'latest_payment_status' => $latestPayment?->status,
            'paid'                  => $b->payment_status === 'paid',
            'reviewed'              => $b->reviewed ?? false,
            'zoom_link'             => $b->zoom_link,
            'expires_at'            => $b->expires_at?->toIso8601String(),
        ];
    }
}
