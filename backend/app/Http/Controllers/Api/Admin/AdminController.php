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
use App\Services\Booking\CreateBookingService;
use Illuminate\Support\Str;

class AdminController extends Controller
{
    public function stats()
    {
        $now = now();
        $today = today();

        // DĂ¹ng paid_at thay vĂ¬ created_at Ä‘á»ƒ tĂ­nh revenue Ä‘Ăºng
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

    public function createBooking(Request $request, CreateBookingService $bookingService)
    {
        $request->validate([
            'customer_name'  => 'required|string|max:255',
            'customer_email' => 'required|email|max:255',
            'reader_id'      => 'required|exists:readers,id',
            'service_id'     => 'required|exists:services,id',
            'booked_at'      => 'nullable|date|after:now',
            'date'           => 'required_without:booked_at|date|after_or_equal:today',
            'time'           => 'required_without:booked_at|date_format:H:i',
            'note'           => 'nullable|string|max:1000',
        ]);

        $user = User::firstOrCreate(
            ['email' => $request->customer_email],
            [
                'name' => $request->customer_name,
                'password' => bcrypt(Str::random(24)),
                'role' => 'user',
            ]
        );

        if ($user->name !== $request->customer_name) {
            $user->update(['name' => $request->customer_name]);
        }

        $bookedAt = $request->booked_at ?: "{$request->date} {$request->time}:00";

        $booking = $bookingService->execute($user, [
            'reader_id' => $request->reader_id,
            'service_id' => $request->service_id,
            'booked_at' => $bookedAt,
            'note' => $request->note,
        ]);

        return response()->json([
            'id'             => $booking->id,
            'code'           => 'BK-' . str_pad($booking->id, 4, '0', STR_PAD_LEFT),
            'user'           => $booking->user->name,
            'user_email'     => $booking->user->email,
            'svc'            => $booking->service->name,
            'reader'         => $booking->reader->name,
            'reader_em'      => $booking->reader->avatar,
            'booked_at'      => $booking->booked_at->format('d/m/Y H:i'),
            'booked_at_iso'  => $booking->booked_at->toIso8601String(),
            'date'           => $booking->booked_at->toDateString(),
            'time'           => $booking->booked_at->format('H:i'),
            'price'          => number_format($booking->service->price, 0, ',', '.') . 'd',
            'amount'         => $booking->service->price,
            'status'         => $booking->status,
            'payment_status' => $booking->payment_status,
            'payment_method' => $booking->payment_method,
            'zoom_link'      => $booking->zoom_link,
            'note'           => $booking->note,
        ], 201);
    }

    public function confirmBooking($id)
    {
        $booking = Booking::with(['user', 'reader', 'service'])->findOrFail($id);

        if ($booking->status !== 'pending') {
            return response()->json(['message' => 'KhĂ´ng thá»ƒ xĂ¡c nháº­n lá»‹ch nĂ y.'], 422);
        }

        $booking->update(['status' => 'confirmed']);
        Mail::to($booking->user->email)->queue(new BookingConfirmed($booking));

        return response()->json(['message' => 'ÄĂ£ xĂ¡c nháº­n lá»‹ch.']);
    }

    public function cancelBooking($id)
    {
        $booking = Booking::findOrFail($id);
        $booking->load(['user', 'reader', 'service']);

        $booking->update([
            'status'       => 'cancelled',
            'cancelled_at' => now(),  // FIX: trÆ°á»›c Ä‘Ă¢y thiáº¿u
        ]);

        Mail::to($booking->user->email)->queue(new BookingCancelled($booking));

        return response()->json(['message' => 'ÄĂ£ huá»· lá»‹ch.']);
    }

    public function completeBooking($id)
    {
        $booking = Booking::findOrFail($id);

        if ($booking->status !== 'confirmed') {
            return response()->json(['message' => 'Chá»‰ cĂ³ thá»ƒ hoĂ n thĂ nh lá»‹ch Ä‘Ă£ xĂ¡c nháº­n.'], 422);
        }

        if ($booking->payment_status !== 'paid') {
            return response()->json(['message' => 'Chi co the hoan thanh lich da thanh toan.'], 422);
        }

        $booking->update([
            'status'       => 'completed',
            'completed_at' => now(),  // FIX: trÆ°á»›c Ä‘Ă¢y thiáº¿u
        ]);

        return response()->json(['message' => 'ÄĂ£ hoĂ n thĂ nh.']);
    }

    public function setZoom(Request $request, $id)
    {
        $request->validate(['zoom_link' => 'required|url']);
        $booking = Booking::with(['user', 'reader', 'service'])->findOrFail($id);
        $booking->update(['zoom_link' => $request->zoom_link]);
        Mail::to($booking->user->email)->queue(new BookingConfirmed($booking));

        return response()->json(['message' => 'ÄĂ£ cáº­p nháº­t link Zoom.']);
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
            'avatar'  => $request->avatar ?? 'đŸ”®',
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
        return response()->json(['message' => 'ÄĂ£ xoĂ¡ Reader.']);
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
                    'price'          => number_format($b->service->price, 0, ',', '.') . 'Ä‘',
                    'method'         => $b->payment_method,
                    'payment_status' => $b->payment_status,
                    // FIX: dĂ¹ng paid_at, fallback updated_at cho data cÅ©
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

        $booking = Booking::findOrFail($id);

        if ($request->payment_status === 'paid' && $booking->status === 'cancelled') {
            return response()->json(['message' => 'Khong the danh dau da thanh toan cho lich da huy.'], 422);
        }

        // FIX: set paid_at khi admin Ä‘Ă¡nh dáº¥u Ä‘Ă£ thanh toĂ¡n thá»§ cĂ´ng
        if ($request->payment_status === 'paid') {
            $update['paid_at'] = now();
            if ($booking->status === 'pending') {
                $update['status'] = 'confirmed';
            }
        }

        if ($request->payment_status === 'unpaid') {
            $update['paid_at'] = null;
        }

        $booking->update($update);

        $msg = match ($request->payment_status) {
            'paid'     => 'ÄĂ£ Ä‘Ă¡nh dáº¥u thanh toĂ¡n.',
            'unpaid'   => 'ÄĂ£ Ä‘Ă¡nh dáº¥u chÆ°a thanh toĂ¡n.',
            'refunded' => 'ÄĂ£ Ä‘Ă¡nh dáº¥u hoĂ n tiá»n.',
        };

        return response()->json(['message' => $msg]);
    }
}
