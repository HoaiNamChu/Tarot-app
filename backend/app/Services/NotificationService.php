<?php

namespace App\Services;

use App\Models\AppNotification;
use App\Models\Booking;
use App\Models\User;

class NotificationService
{
    public function notifyUser(User $user, string $audience, string $type, string $title, ?string $body = null, ?string $actionUrl = null, array $data = []): void
    {
        AppNotification::create([
            'user_id' => $user->id,
            'audience' => $audience,
            'type' => $type,
            'title' => $title,
            'body' => $body,
            'action_url' => $actionUrl,
            'data' => $data,
        ]);
    }

    public function notifyAdmins(string $type, string $title, ?string $body = null, ?string $actionUrl = null, array $data = []): void
    {
        User::where('role', 'admin')
            ->select(['id', 'name', 'email', 'role'])
            ->get()
            ->each(fn(User $admin) => $this->notifyUser($admin, 'admin', $type, $title, $body, $actionUrl, $data));
    }

    public function notifyReaderForBooking(Booking $booking, string $type, string $title, ?string $body = null, array $data = []): void
    {
        $booking->loadMissing(['reader.user', 'user', 'service']);
        $readerUser = $booking->reader?->user;
        if (!$readerUser) {
            return;
        }

        $this->notifyUser($readerUser, 'reader', $type, $title, $body, '/reader/bookings', array_merge([
            'booking_id' => $booking->id,
            'booking_code' => 'BK-' . str_pad($booking->id, 4, '0', STR_PAD_LEFT),
            'customer' => $booking->user?->name,
            'service' => $booking->service?->name,
            'booked_at' => $booking->booked_at?->toIso8601String(),
        ], $data));
    }

    public function notifyBookingCreated(Booking $booking, bool $notifyAdmins = true): void
    {
        $booking->loadMissing(['user', 'reader.user', 'service']);
        $code = 'BK-' . str_pad($booking->id, 4, '0', STR_PAD_LEFT);
        $body = trim(($booking->user?->name ?? 'Khach hang') . ' dat ' . ($booking->service?->name ?? 'dich vu') . ' luc ' . $booking->booked_at?->format('d/m/Y H:i'));

        if ($notifyAdmins) {
            $this->notifyAdmins('booking.created', 'Lich moi can xu ly', $body, '/bookings', [
                'booking_id' => $booking->id,
                'booking_code' => $code,
                'reader' => $booking->reader?->name,
                'customer' => $booking->user?->name,
            ]);
        }

        $this->notifyReaderForBooking($booking, 'booking.assigned', 'Ban co lich moi', $body);
    }
}
