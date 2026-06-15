<?php

namespace App\Http\Controllers\Api\Reader;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Reader;
use App\Models\Service;
use App\Models\User;
use App\Services\Booking\CreateBookingService;
use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ReaderDashboardController extends Controller
{
    private function currentReader(Request $request): ?Reader
    {
        return $request->user()->reader;
    }

    public function me(Request $request)
    {
        $reader = $this->currentReader($request);
        if (!$reader) {
            return response()->json(['message' => 'Khong tim thay thong tin Reader.'], 404);
        }

        return response()->json([
            'id' => $reader->id,
            'name' => $reader->name,
            'title' => $reader->title,
            'bio' => $reader->bio,
            'avatar' => $reader->avatar,
            'email' => $reader->email,
            'phone' => $reader->phone,
            'is_active' => $reader->is_active,
        ]);
    }

    public function bookings(Request $request)
    {
        $reader = $this->currentReader($request);
        if (!$reader) {
            return response()->json(['message' => 'Khong tim thay thong tin Reader.'], 404);
        }

        $query = Booking::with(['user', 'service'])
            ->where('reader_id', $reader->id)
            ->orderBy('booked_at', 'desc');

        if ($request->status && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->date) {
            $query->whereDate('booked_at', $request->date);
        }

        return response()->json($query->get()->map(fn(Booking $booking) => $this->formatBooking($booking))->values());
    }

    public function services()
    {
        return response()->json(
            Service::where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'duration', 'price'])
        );
    }

    public function createBooking(Request $request, CreateBookingService $service)
    {
        $reader = $this->currentReader($request);
        if (!$reader) {
            return response()->json(['message' => 'Khong tim thay thong tin Reader.'], 404);
        }

        $data = $request->validate([
            'customer_name' => 'required|string|max:255',
            'customer_email' => 'nullable|email|max:255',
            'customer_phone' => 'nullable|string|max:30',
            'service_id' => 'required|exists:services,id',
            'booked_at' => 'required|date|after:now',
            'note' => 'nullable|string|max:1000',
            'zoom_link' => 'nullable|url|max:500',
        ]);

        $booking = DB::transaction(function () use ($data, $reader, $service) {
            $email = $data['customer_email'] ?: 'reader-walkin-' . Str::uuid() . '@local.lunaarcana';
            $user = User::firstOrCreate(
                ['email' => $email],
                [
                    'name' => $data['customer_name'],
                    'phone' => $data['customer_phone'] ?? null,
                    'password' => Str::password(32),
                    'role' => 'user',
                ]
            );

            if (!$user->phone && !empty($data['customer_phone'])) {
                $user->update(['phone' => $data['customer_phone']]);
            }

            $booking = $service->execute($user, [
                'reader_id' => $reader->id,
                'service_id' => $data['service_id'],
                'booked_at' => $data['booked_at'],
                'note' => $data['note'] ?? null,
            ], false);

            if (!empty($data['zoom_link'])) {
                $booking->update(['zoom_link' => $data['zoom_link']]);
            }

            return $booking->refresh()->load(['user', 'service']);
        });
        app(NotificationService::class)->notifyAdmins('reader.booking.created', 'Reader tao lich moi', ($reader->name ?? 'Reader') . ' da tao lich BK-' . str_pad($booking->id, 4, '0', STR_PAD_LEFT), '/bookings', [
            'booking_id' => $booking->id,
            'reader' => $reader->name,
        ]);

        return response()->json($this->formatBooking($booking), 201);
    }

    public function updateBooking(Request $request, $id)
    {
        $reader = $this->currentReader($request);
        if (!$reader) {
            return response()->json(['message' => 'Khong tim thay thong tin Reader.'], 404);
        }

        $data = $request->validate([
            'service_id' => 'sometimes|required|exists:services,id',
            'booked_at' => 'sometimes|required|date|after:now',
            'note' => 'nullable|string|max:1000',
            'zoom_link' => 'nullable|url|max:500',
        ]);

        return DB::transaction(function () use ($reader, $id, $data) {
            $booking = Booking::with('service')
                ->where('reader_id', $reader->id)
                ->lockForUpdate()
                ->findOrFail($id);

            if (in_array($booking->status, ['cancelled', 'completed'], true)) {
                return response()->json(['message' => 'Khong the sua lich da huy hoac da hoan thanh.'], 422);
            }

            $service = Service::findOrFail($data['service_id'] ?? $booking->service_id);
            $bookedAt = Carbon::parse($data['booked_at'] ?? $booking->booked_at);
            $this->ensureSlotIsFree($reader->id, $booking->id, $service, $bookedAt);

            $booking->update([
                'service_id' => $service->id,
                'booked_at' => $bookedAt,
                'note' => array_key_exists('note', $data) ? $data['note'] : $booking->note,
                'zoom_link' => array_key_exists('zoom_link', $data) ? $data['zoom_link'] : $booking->zoom_link,
            ]);

            return response()->json($this->formatBooking($booking->refresh()->load(['user', 'service'])));
        });
    }

    public function confirmBooking(Request $request, $id)
    {
        return $this->changeOwnBookingStatus($request, $id, 'confirmed', ['pending'], 'Da xac nhan lich.');
    }

    public function completeBooking(Request $request, $id)
    {
        return $this->changeOwnBookingStatus($request, $id, 'completed', ['confirmed'], 'Da hoan thanh lich.');
    }

    public function cancelBooking(Request $request, $id)
    {
        $reader = $this->currentReader($request);
        if (!$reader) {
            return response()->json(['message' => 'Khong tim thay thong tin Reader.'], 404);
        }

        $booking = Booking::where('reader_id', $reader->id)->findOrFail($id);
        if (!in_array($booking->status, ['pending', 'confirmed'], true)) {
            return response()->json(['message' => 'Khong the huy lich nay.'], 422);
        }

        $booking->update([
            'status' => 'cancelled',
            'cancelled_at' => now(),
        ]);
        app(NotificationService::class)->notifyAdmins('reader.booking.cancelled', 'Reader huy lich', ($reader->name ?? 'Reader') . ' da huy lich BK-' . str_pad($booking->id, 4, '0', STR_PAD_LEFT), '/bookings', [
            'booking_id' => $booking->id,
            'reader' => $reader->name,
        ]);

        return response()->json(['message' => 'Da huy lich.']);
    }

    public function stats(Request $request)
    {
        $reader = $this->currentReader($request);
        if (!$reader) {
            return response()->json(['message' => 'Khong tim thay thong tin Reader.'], 404);
        }

        $now = now();
        return response()->json([
            'total_bookings' => Booking::where('reader_id', $reader->id)->count(),
            'bookings_month' => Booking::where('reader_id', $reader->id)->whereMonth('created_at', $now->month)->count(),
            'bookings_today' => Booking::where('reader_id', $reader->id)->whereDate('booked_at', today())->count(),
            'bookings_pending' => Booking::where('reader_id', $reader->id)->where('status', 'pending')->count(),
            'bookings_upcoming' => Booking::where('reader_id', $reader->id)->where('status', 'confirmed')->where('booked_at', '>=', now())->count(),
            'revenue_month' => Booking::join('services', 'bookings.service_id', '=', 'services.id')
                ->where('bookings.reader_id', $reader->id)
                ->where('bookings.payment_status', 'paid')
                ->whereMonth('bookings.created_at', $now->month)
                ->sum('services.price'),
        ]);
    }

    public function updateProfile(Request $request)
    {
        $reader = $this->currentReader($request);
        if (!$reader) {
            return response()->json(['message' => 'Khong tim thay thong tin Reader.'], 404);
        }

        $data = $request->validate([
            'bio' => 'nullable|string',
            'phone' => 'nullable|string',
        ]);

        $reader->update($data);

        return response()->json(['message' => 'Da cap nhat thong tin.']);
    }

    private function changeOwnBookingStatus(Request $request, $id, string $nextStatus, array $allowedCurrentStatuses, string $message)
    {
        $reader = $this->currentReader($request);
        if (!$reader) {
            return response()->json(['message' => 'Khong tim thay thong tin Reader.'], 404);
        }

        $booking = Booking::where('reader_id', $reader->id)->findOrFail($id);
        if (!in_array($booking->status, $allowedCurrentStatuses, true)) {
            return response()->json(['message' => 'Trang thai lich khong hop le.'], 422);
        }

        $updates = ['status' => $nextStatus];
        if ($nextStatus === 'completed') {
            $updates['completed_at'] = now();
        }

        $booking->update($updates);
        app(NotificationService::class)->notifyAdmins('reader.booking.' . $nextStatus, 'Reader cap nhat lich', ($reader->name ?? 'Reader') . ' chuyen lich BK-' . str_pad($booking->id, 4, '0', STR_PAD_LEFT) . ' sang ' . $nextStatus, '/bookings', [
            'booking_id' => $booking->id,
            'reader' => $reader->name,
            'status' => $nextStatus,
        ]);

        return response()->json(['message' => $message]);
    }

    private function ensureSlotIsFree(int $readerId, int $ignoreBookingId, Service $service, Carbon $start): void
    {
        $end = $start->copy()->addMinutes($service->duration);
        $existing = Booking::with('service')
            ->where('reader_id', $readerId)
            ->where('id', '!=', $ignoreBookingId)
            ->whereDate('booked_at', $start->toDateString())
            ->whereNotIn('status', ['cancelled', 'completed'])
            ->lockForUpdate()
            ->get();

        $conflict = $existing->first(function (Booking $booking) use ($start, $end) {
            $existStart = Carbon::parse($booking->booked_at);
            $existEnd = $existStart->copy()->addMinutes($booking->service->duration);
            return $start->lt($existEnd) && $end->gt($existStart);
        });

        if ($conflict) {
            abort(422, 'Reader da co lich trong khung gio nay.');
        }
    }

    private function formatBooking(Booking $booking): array
    {
        return [
            'id' => $booking->id,
            'code' => 'BK-' . str_pad($booking->id, 4, '0', STR_PAD_LEFT),
            'user' => $booking->user->name,
            'user_email' => $booking->user->email,
            'svc' => $booking->service->name,
            'service_id' => $booking->service_id,
            'duration' => $booking->service->duration,
            'booked_at' => $booking->booked_at->format('d/m/Y H:i'),
            'booked_at_iso' => $booking->booked_at->toDateTimeString(),
            'booked_date' => $booking->booked_at->format('Y-m-d'),
            'booked_time' => $booking->booked_at->format('H:i'),
            'price' => number_format($booking->service->price, 0, ',', '.') . 'd',
            'status' => $booking->status,
            'payment_status' => $booking->payment_status,
            'zoom_link' => $booking->zoom_link,
            'note' => $booking->note,
        ];
    }
}
