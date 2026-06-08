<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Reader;
use App\Models\Review;
use App\Models\User;
use Illuminate\Http\Request;
use App\Mail\BookingConfirmed;
use Illuminate\Support\Facades\Mail;
use App\Mail\BookingCancelled;

class AdminController extends Controller
{
    public function stats()
    {
        $now = now();
        $today = today();

        // Dùng paid_at thay vì created_at để tính revenue đúng
        $revenueMonth = Booking::join('services', 'bookings.service_id', '=', 'services.id')
            ->whereMonth('bookings.paid_at', $now->month)
            ->whereYear('bookings.paid_at', $now->year)
            ->where('bookings.payment_status', 'paid')
            ->sum('services.price');

        $bookingsMonth = Booking::whereMonth('created_at', $now->month)
            ->whereYear('created_at', $now->year)
            ->count();
        $usersNew = User::whereMonth('created_at', $now->month)
            ->whereYear('created_at', $now->year)
            ->count();
        $bookingsToday = Booking::whereDate('booked_at', $today)->count();
        $completedToday = Booking::whereDate('booked_at', $today)
            ->where('status', 'completed')
            ->count();
        $totalBookings = Booking::count();
        $confirmedOrCompleted = Booking::whereIn('status', ['confirmed', 'completed'])->count();
        $activeReaders = Reader::where('is_active', true)->count();
        $revenueWeek = Booking::join('services', 'bookings.service_id', '=', 'services.id')
            ->whereBetween('bookings.paid_at', [$now->copy()->subDays(6)->startOfDay(), $now->copy()->endOfDay()])
            ->where('bookings.payment_status', 'paid')
            ->sum('services.price');
        $revenueByDate = Booking::join('services', 'bookings.service_id', '=', 'services.id')
            ->selectRaw('DATE(bookings.paid_at) as paid_date, SUM(services.price) as total')
            ->whereBetween('bookings.paid_at', [$now->copy()->subDays(6)->startOfDay(), $now->copy()->endOfDay()])
            ->where('bookings.payment_status', 'paid')
            ->groupBy('paid_date')
            ->pluck('total', 'paid_date');
        $revenue7Days = collect(range(6, 0))->map(function ($daysAgo) use ($now, $revenueByDate) {
            $date = $now->copy()->subDays($daysAgo)->toDateString();
            return round(($revenueByDate[$date] ?? 0) / 1000000, 2);
        })->values();
        $readerRatings = Review::selectRaw('reader_id, AVG(stars) as avg_rating')
            ->groupBy('reader_id')
            ->pluck('avg_rating', 'reader_id');
        $topReaders = Reader::withCount('bookings')
            ->orderByDesc('bookings_count')
            ->limit(4)
            ->get()
            ->map(fn($reader) => [
                'id' => $reader->id,
                'name' => $reader->name,
                'avatar' => $reader->avatar,
                'specialty' => $reader->title,
                'sessions' => $reader->bookings_count,
                'rating' => round($readerRatings[$reader->id] ?? 0, 1),
            ]);

        return response()->json([
            'revenue_month'      => $revenueMonth,
            'bookings_month'     => $bookingsMonth,
            'bookings_pending'   => Booking::where('status', 'pending')->count(),
            'bookings_today'     => $bookingsToday,
            'bookings_cancelled' => Booking::where('status', 'cancelled')->whereMonth('created_at', $now->month)->whereYear('created_at', $now->year)->count(),
            'users_new'          => $usersNew,
            'avg_rating'         => round(Review::avg('stars') ?? 0, 2),
            'readers_count'      => $activeReaders,
            'payments_pending_verification' => Booking::where('payment_status', 'pending_verification')->count(),
            'revenue'           => round($revenueMonth / 1000000, 2),
            'revenue_week'      => round($revenueWeek / 1000000, 2),
            'revenue_7days'     => $revenue7Days,
            'revenue_growth'    => 0,
            'total_bookings'    => $bookingsMonth,
            'new_bookings'      => $bookingsMonth,
            'new_customers'     => $usersNew,
            'customer_growth'   => 0,
            'rating_change'     => 0,
            'completed_today'   => $completedToday,
            'total_today'       => $bookingsToday,
            'completion_rate'   => $bookingsToday ? round(($completedToday / $bookingsToday) * 100, 1) : 0,
            'confirmation_rate' => $totalBookings ? round(($confirmedOrCompleted / $totalBookings) * 100, 1) : 0,
            'reader_capacity'   => $activeReaders ? min(100, round(($bookingsToday / ($activeReaders * 6)) * 100, 1)) : 0,
            'top_readers'       => $topReaders,
        ]);
    }

    public function bookings(Request $request)
    {
        $query = Booking::with(['user', 'reader', 'service'])
            ->orderBy('booked_at', 'desc');

        if ($request->status && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        return response()->json($query->get()->map(fn($b) => [
            'id'             => $b->id,
            'code'           => 'BK-' . str_pad($b->id, 4, '0', STR_PAD_LEFT),
            'user'           => $b->user->name,
            'user_email'     => $b->user->email,
            'svc'            => $b->service->name,
            'reader'         => $b->reader->name,
            'reader_em'      => $b->reader->avatar,
            'booked_at'      => $b->booked_at->format('d/m/Y H:i'),
            'booked_at_iso'  => $b->booked_at->toIso8601String(),
            'date'           => $b->booked_at->toDateString(),
            'time'           => $b->booked_at->format('H:i'),
            'price'          => number_format($b->service->price, 0, ',', '.') . 'đ',
            'amount'         => $b->service->price,
            'status'         => $b->status,
            'payment_status' => $b->payment_status,
            'payment_method' => $b->payment_method,
            'zoom_link'      => $b->zoom_link,
            'note'           => $b->note,
        ]));
    }

    public function confirmBooking($id)
    {
        $booking = Booking::with(['user', 'reader', 'service'])->findOrFail($id);

        if ($booking->status !== 'pending') {
            return response()->json(['message' => 'Không thể xác nhận lịch này.'], 422);
        }

        $booking->update(['status' => 'confirmed']);
        Mail::to($booking->user->email)->queue(new BookingConfirmed($booking));

        return response()->json(['message' => 'Đã xác nhận lịch.']);
    }

    public function cancelBooking($id)
    {
        $booking = Booking::findOrFail($id);
        $booking->load(['user', 'reader', 'service']);

        $booking->update([
            'status'       => 'cancelled',
            'cancelled_at' => now(),  // FIX: trước đây thiếu
        ]);

        Mail::to($booking->user->email)->queue(new BookingCancelled($booking));

        return response()->json(['message' => 'Đã huỷ lịch.']);
    }

    public function completeBooking($id)
    {
        $booking = Booking::findOrFail($id);

        if ($booking->status !== 'confirmed') {
            return response()->json(['message' => 'Chỉ có thể hoàn thành lịch đã xác nhận.'], 422);
        }

        $booking->update([
            'status'       => 'completed',
            'completed_at' => now(),  // FIX: trước đây thiếu
        ]);

        return response()->json(['message' => 'Đã hoàn thành.']);
    }

    public function setZoom(Request $request, $id)
    {
        $request->validate(['zoom_link' => 'required|url']);
        $booking = Booking::with(['user', 'reader', 'service'])->findOrFail($id);
        $booking->update(['zoom_link' => $request->zoom_link]);
        Mail::to($booking->user->email)->queue(new BookingConfirmed($booking));

        return response()->json(['message' => 'Đã cập nhật link Zoom.']);
    }

    public function readers()
    {
        $ratings = Review::selectRaw('reader_id, AVG(stars) as avg_rating')
            ->groupBy('reader_id')
            ->pluck('avg_rating', 'reader_id');
        $revenues = Booking::join('services', 'bookings.service_id', '=', 'services.id')
            ->selectRaw('bookings.reader_id, SUM(services.price) as revenue')
            ->where('bookings.payment_status', 'paid')
            ->groupBy('bookings.reader_id')
            ->pluck('revenue', 'reader_id');

        return response()->json(
            Reader::withCount('bookings')->get()->map(fn($r) => [
                'id'             => $r->id,
                'name'           => $r->name,
                'title'          => $r->title,
                'bio'            => $r->bio,
                'avatar'         => $r->avatar,
                'email'          => $r->email,
                'phone'          => $r->phone,
                'is_active'      => $r->is_active,
                'bookings_count' => $r->bookings_count,
                'avg_rating'     => round($ratings[$r->id] ?? 0, 2),
                'revenue'        => $revenues[$r->id] ?? 0,
                'created_at' => $r->created_at,
            ])
        );
    }

    public function createReader(Request $request)
    {
        $request->validate([
            'name'     => 'required|string',
            'title'    => 'required|string',
            'bio'      => 'required|string',
            'avatar'   => 'nullable|string',
            'email'    => 'required|email|unique:users,email',
            'phone'    => 'nullable|string',
            'password' => 'required|string|min:6',
        ]);

        $user = User::create([
            'name'     => $request->name,
            'email'    => $request->email,
            'password' => bcrypt($request->password),
            'role'     => 'reader',
        ]);

        $reader = Reader::create([
            'user_id' => $user->id,
            'name'    => $request->name,
            'title'   => $request->title,
            'bio'     => $request->bio,
            'avatar'  => $request->avatar ?? '🔮',
            'email'   => $request->email,
            'phone'   => $request->phone,
        ]);

        return response()->json($reader, 201);
    }

    public function updateReader(Request $request, $id)
    {
        $reader = Reader::findOrFail($id);
        $reader->update($request->only('name', 'title', 'bio', 'avatar', 'is_active'));
        return response()->json($reader);
    }

    public function deleteReader($id)
    {
        Reader::findOrFail($id)->delete();
        return response()->json(['message' => 'Đã xoá Reader.']);
    }

    public function users()
    {
        $totalSpent = Booking::join('services', 'bookings.service_id', '=', 'services.id')
            ->selectRaw('bookings.user_id, SUM(services.price) as total_spent')
            ->where('bookings.payment_status', 'paid')
            ->groupBy('bookings.user_id')
            ->pluck('total_spent', 'user_id');

        return response()->json(
            User::where('role', 'user')->withCount('bookings')->orderBy('created_at', 'desc')->get()->map(fn($u) => [
                'id'             => $u->id,
                'name'           => $u->name,
                'email'          => $u->email,
                'bookings_count' => $u->bookings_count,
                'total_spent'    => $totalSpent[$u->id] ?? 0,
                'created_at'     => $u->created_at->format('d/m/Y'),
                'created_at_raw' => $u->created_at->toIso8601String(),
            ])
        );
    }

    public function reviews()
    {
        return response()->json(
            Review::with(['user', 'reader'])->orderBy('created_at', 'desc')->get()->map(fn($r) => [
                'id'         => $r->id,
                'user'       => $r->user->name,
                'reader'     => $r->reader->name,
                'reader_em'  => $r->reader->avatar,
                'stars'      => $r->stars,
                'content'    => $r->content,
                'created_at' => $r->created_at->format('d/m/Y'),
            ])
        );
    }

    public function payments()
    {
        return response()->json(
            Booking::with(['user', 'service', 'reader'])
                ->whereIn('payment_status', ['paid', 'pending_verification', 'refunded'])
                ->orderBy('updated_at', 'desc')
                ->get()
                ->map(fn($b) => [
                    'id'             => $b->id,
                    'code'           => 'BK-' . str_pad($b->id, 4, '0', STR_PAD_LEFT),
                    'user'           => $b->user->name,
                    'svc'            => $b->service->name,
                    'reader'         => $b->reader->name,
                    'reader_em'      => $b->reader->avatar,
                    'amount'         => $b->service->price,
                    'price'          => number_format($b->service->price, 0, ',', '.') . 'đ',
                    'method'         => $b->payment_method,
                    'payment_status' => $b->payment_status,
                    // FIX: dùng paid_at, fallback updated_at cho data cũ
                    'paid_at'        => $b->paid_at
                        ? $b->paid_at->format('d/m/Y H:i')
                        : $b->updated_at->format('d/m/Y H:i'),
                ])
        );
    }

    public function updatePayment(Request $request, $id)
    {
        $request->validate([
            'payment_status' => 'required|in:paid,unpaid,refunded',
            'payment_method' => 'nullable|in:vnpay,bank,cash',
        ]);

        $update = [
            'payment_status' => $request->payment_status,
            'payment_method' => $request->payment_method,
        ];

        // FIX: set paid_at khi admin đánh dấu đã thanh toán thủ công
        if ($request->payment_status === 'paid') {
            $update['paid_at'] = now();
        }

        Booking::findOrFail($id)->update($update);

        $msg = match ($request->payment_status) {
            'paid'     => 'Đã đánh dấu thanh toán.',
            'unpaid'   => 'Đã đánh dấu chưa thanh toán.',
            'refunded' => 'Đã đánh dấu hoàn tiền.',
        };

        return response()->json(['message' => $msg]);
    }
}
