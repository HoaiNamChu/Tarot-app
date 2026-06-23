<?php

namespace App\Services\Booking;

use App\Models\Booking;
use App\Services\NotificationService;

class BookingCompletionService
{
    public const GRACE_HOURS = 24;

    public function requestCompletion(Booking $booking, string $actor = 'reader'): Booking
    {
        $booking->loadMissing(['user', 'reader.user', 'service']);

        if ($booking->status !== 'confirmed') {
            abort(422, 'Chi co the yeu cau hoan thanh lich da xac nhan.');
        }

        if ($booking->payment_status !== 'paid') {
            abort(422, 'Chi co the hoan thanh lich da thanh toan.');
        }

        $sessionEnd = $booking->booked_at->copy()->addMinutes((int) $booking->service->duration);
        if ($sessionEnd->isFuture()) {
            abort(422, 'Chi co the danh dau sau khi buoi xem ket thuc.');
        }

        $booking->update([
            'status' => 'completion_pending',
            'completion_requested_at' => now(),
            'completion_auto_complete_at' => now()->addHours(self::GRACE_HOURS),
            'completion_confirmed_at' => null,
            'completion_disputed_at' => null,
            'completed_at' => null,
        ]);

        app(NotificationService::class)->notifyUser(
            $booking->user,
            'customer',
            'booking.completion_requested',
            'Xac nhan buoi xem',
            'Reader da danh dau lich BK-' . str_pad($booking->id, 4, '0', STR_PAD_LEFT) . ' la da dien ra. Vui long xac nhan trong ' . self::GRACE_HOURS . ' gio.',
            '/dashboard',
            ['booking_id' => $booking->id, 'actor' => $actor]
        );

        return $booking->refresh();
    }

    public function confirmByCustomer(Booking $booking): Booking
    {
        if ($booking->status !== 'completion_pending') {
            abort(422, 'Lich nay khong can xac nhan hoan thanh.');
        }

        $booking->update([
            'status' => 'completed',
            'completed_at' => now(),
            'completion_confirmed_at' => now(),
        ]);

        $booking->loadMissing(['user', 'reader.user', 'service']);
        app(NotificationService::class)->notifyReaderForBooking(
            $booking,
            'booking.completed_by_customer',
            'Khach da xac nhan hoan thanh',
            'Khach da xac nhan lich BK-' . str_pad($booking->id, 4, '0', STR_PAD_LEFT) . ' da hoan thanh.'
        );

        return $booking->refresh();
    }

    public function disputeByCustomer(Booking $booking): Booking
    {
        if ($booking->status !== 'completion_pending') {
            abort(422, 'Lich nay khong o trang thai cho xac nhan.');
        }

        $booking->update([
            'status' => 'confirmed',
            'completion_disputed_at' => now(),
            'completion_auto_complete_at' => null,
        ]);

        $booking->loadMissing(['user', 'reader.user', 'service']);
        app(NotificationService::class)->notifyAdmins(
            'booking.completion_disputed',
            'Khach bao chua xem',
            ($booking->user?->name ?? 'Khach hang') . ' bao chua hoan thanh lich BK-' . str_pad($booking->id, 4, '0', STR_PAD_LEFT) . '.',
            '/bookings',
            ['booking_id' => $booking->id, 'reader' => $booking->reader?->name]
        );
        app(NotificationService::class)->notifyReaderForBooking(
            $booking,
            'booking.completion_disputed',
            'Khach bao chua xem',
            'Khach bao lich BK-' . str_pad($booking->id, 4, '0', STR_PAD_LEFT) . ' chua hoan thanh. Vui long kiem tra lai.'
        );

        return $booking->refresh();
    }

    public function autoComplete(Booking $booking): Booking
    {
        if ($booking->status !== 'completion_pending') {
            return $booking;
        }

        $booking->update([
            'status' => 'completed',
            'completed_at' => now(),
            'completion_confirmed_at' => now(),
        ]);

        return $booking->refresh();
    }
}
