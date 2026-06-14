<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminActionLog;
use App\Models\AppSetting;
use App\Models\Booking;
use App\Models\Payment;
use App\Models\Reader;
use App\Models\Review;
use App\Models\Service;
use App\Models\User;
use Illuminate\Http\Request;
use App\Mail\BookingConfirmed;
use Illuminate\Support\Facades\DB;
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
            ->where('status', 'approved')
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
            'avg_rating'         => round(Review::where('status', 'approved')->avg('stars') ?? 0, 2),
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

    public function createBooking(Request $request, CreateBookingService $service)
    {
        $data = $request->validate([
            'customer_name'  => 'required|string|max:255',
            'customer_email' => 'nullable|email|max:255',
            'customer_phone' => 'nullable|string|max:30',
            'reader_id'      => 'required|exists:readers,id',
            'service_id'     => 'required|exists:services,id',
            'date'           => 'required_without:booked_at|date',
            'time'           => 'required_without:booked_at|date_format:H:i',
            'booked_at'      => 'nullable|date|after:now',
            'note'           => 'nullable|string|max:1000',
        ]);

        return DB::transaction(function () use ($data, $service) {
        $email = $data['customer_email'] ?? 'walkin-' . Str::uuid() . '@local.lunaarcana';
        $user = User::firstOrCreate(
            ['email' => $email],
            [
                'name'     => $data['customer_name'],
                'password' => Str::password(32),
                'role'     => 'user',
            ]
        );

        $bookedAt = $data['booked_at'] ?? "{$data['date']} {$data['time']}";
        if (\Carbon\Carbon::parse($bookedAt)->isPast()) {
            return response()->json(['message' => 'Booked time must be in the future.'], 422);
        }

        $note = $data['note'] ?? null;
        if (!$note && !empty($data['customer_phone'])) {
            $note = 'Phone: ' . $data['customer_phone'];
        }

        $booking = $service->execute($user, [
            'reader_id'  => $data['reader_id'],
            'service_id' => $data['service_id'],
            'booked_at'  => $bookedAt,
            'note'       => $note,
        ], false);

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
            'price'          => number_format($booking->service->price, 0, ',', '.') . 'đ',
            'amount'         => $booking->service->price,
            'status'         => $booking->status,
            'payment_status' => $booking->payment_status,
            'payment_method' => $booking->payment_method,
            'zoom_link'      => $booking->zoom_link,
            'note'           => $booking->note,
        ], 201);
        });
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

    public function updateBookingStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:pending,confirmed,completed,cancelled',
        ]);

        $booking = Booking::findOrFail($id);
        $status = $request->status;
        $updates = ['status' => $status];

        if ($status !== 'cancelled') {
            $updates['cancelled_at'] = null;
        } elseif (!$booking->cancelled_at) {
            $updates['cancelled_at'] = now();
        }

        if ($status !== 'completed') {
            $updates['completed_at'] = null;
        } elseif (!$booking->completed_at) {
            $updates['completed_at'] = now();
        }

        $booking->update($updates);

        return response()->json([
            'message' => 'Da cap nhat trang thai lich.',
            'status' => $booking->status,
        ]);
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
            ->where('status', 'approved')
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
                'sessions'       => $r->bookings_count,
                'avg_rating'     => round($ratings[$r->id] ?? 0, 2),
                'rating'         => round($ratings[$r->id] ?? 0, 2),
                'revenue'        => $revenues[$r->id] ?? 0,
                'specialty'      => $r->title,
                'joined_at'      => $r->created_at,
                'created_at' => $r->created_at,
            ])
        );
    }

    public function createReader(Request $request)
    {
        $request->validate([
            'name'     => 'required|string',
            'title'    => 'nullable|string',
            'specialty' => 'nullable|string',
            'bio'      => 'required|string',
            'avatar'   => 'nullable|string',
            'email'    => 'required|email|unique:users,email',
            'phone'    => 'nullable|string',
            'password' => 'nullable|string|min:6',
        ]);

        $reader = DB::transaction(function () use ($request) {
            $title = $request->title ?: $request->specialty ?: 'Tarot Reader';

            $user = User::create([
                'name'     => $request->name,
                'email'    => $request->email,
                'password' => $request->password ?: Str::password(16),
                'role'     => 'reader',
            ]);

            return Reader::create([
                'user_id' => $user->id,
                'name'    => $request->name,
                'title'   => $title,
                'bio'     => $request->bio,
                'avatar'  => $request->avatar ?? '🔮',
                'email'   => $request->email,
                'phone'   => $request->phone,
            ]);
        });

        return response()->json([
            'id'             => $reader->id,
            'name'           => $reader->name,
            'title'          => $reader->title,
            'specialty'      => $reader->title,
            'bio'            => $reader->bio,
            'avatar'         => $reader->avatar,
            'email'          => $reader->email,
            'phone'          => $reader->phone,
            'is_active'      => $reader->is_active,
            'bookings_count' => 0,
            'sessions'       => 0,
            'avg_rating'     => 0,
            'rating'         => 0,
            'revenue'        => 0,
            'joined_at'      => $reader->created_at,
            'created_at'     => $reader->created_at,
        ], 201);
    }

    public function updateReader(Request $request, $id)
    {
        $reader = Reader::findOrFail($id);
        $data = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'title' => 'sometimes|nullable|string|max:255',
            'bio' => 'sometimes|required|string',
            'avatar' => 'sometimes|nullable|string|max:255',
            'is_active' => 'sometimes|boolean',
        ]);

        $reader->update($data);
        return response()->json($reader);
    }

    public function deleteReader($id)
    {
        $reader = Reader::findOrFail($id);

        if ($reader->bookings()->exists()) {
            $reader->update(['is_active' => false]);
            return response()->json(['message' => 'Reader da co lich dat nen da duoc an thay vi xoa.']);
        }

        $reader->user?->delete();
        $reader->delete();
        return response()->json(['message' => 'Đã xoá Reader.']);
    }

    public function services()
    {
        return response()->json(Service::orderBy('created_at', 'desc')->get());
    }

    public function createService(Request $request)
    {
        $data = $request->validate([
            'name'        => 'required|string|max:255',
            'description' => 'required|string',
            'duration'    => 'required|integer|min:1|max:1440',
            'price'       => 'required|integer|min:0',
            'is_active'   => 'sometimes|boolean',
        ]);

        $service = Service::create([
            'name'        => $data['name'],
            'description' => $data['description'],
            'duration'    => $data['duration'],
            'price'       => $data['price'],
            'is_active'   => $request->boolean('is_active', true),
        ]);

        return response()->json($service, 201);
    }

    public function updateService(Request $request, $id)
    {
        $service = Service::findOrFail($id);
        $data = $request->validate([
            'name'        => 'sometimes|required|string|max:255',
            'description' => 'sometimes|required|string',
            'duration'    => 'sometimes|required|integer|min:1|max:1440',
            'price'       => 'sometimes|required|integer|min:0',
            'is_active'   => 'sometimes|boolean',
        ]);

        $service->update($data);

        return response()->json($service);
    }

    public function deleteService($id)
    {
        $service = Service::findOrFail($id);

        if ($service->bookings()->exists()) {
            $service->update(['is_active' => false]);
            return response()->json(['message' => 'Dich vu da co lich dat nen da duoc an thay vi xoa.']);
        }

        $service->delete();

        return response()->json(['message' => 'Da xoa dich vu.']);
    }

    public function users()
    {
        $totalSpent = Booking::join('services', 'bookings.service_id', '=', 'services.id')
            ->selectRaw('bookings.user_id, SUM(services.price) as total_spent')
            ->where('bookings.payment_status', 'paid')
            ->groupBy('bookings.user_id')
            ->pluck('total_spent', 'user_id');

        return response()->json(
            User::where('role', 'user')
                ->withCount('bookings')
                ->with(['bookings' => fn($query) => $query->with(['service', 'reader'])->latest()])
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(fn($u) => $this->formatAdminUser($u, $totalSpent[$u->id] ?? 0))
        );
    }

    public function createUser(Request $request)
    {
        $data = $request->validate([
            'name'            => 'required|string|max:255',
            'email'           => 'required|email|unique:users,email',
            'phone'           => 'nullable|string|max:50',
            'password'        => 'nullable|string|min:6',
            'customer_type'   => 'nullable|in:active,vip,new,inactive',
            'customer_status' => 'nullable|in:active,inactive',
            'internal_note'   => 'nullable|string',
        ]);

        $user = User::create([
            'name'            => $data['name'],
            'email'           => $data['email'],
            'phone'           => $data['phone'] ?? null,
            'password'        => $data['password'] ?? Str::password(16),
            'role'            => 'user',
            'customer_type'   => $data['customer_type'] ?? 'new',
            'customer_status' => $data['customer_status'] ?? 'active',
            'internal_note'   => $data['internal_note'] ?? null,
        ]);

        return response()->json($this->formatAdminUser($user->load('bookings'), 0), 201);
    }

    public function updateUser(Request $request, $id)
    {
        $user = User::where('role', 'user')->findOrFail($id);

        $data = $request->validate([
            'name'            => 'required|string|max:255',
            'email'           => 'required|email|unique:users,email,' . $user->id,
            'phone'           => 'nullable|string|max:50',
            'password'        => 'nullable|string|min:6',
            'customer_type'   => 'nullable|in:active,vip,new,inactive',
            'customer_status' => 'nullable|in:active,inactive',
            'internal_note'   => 'nullable|string',
        ]);

        $user->fill([
            'name'            => $data['name'],
            'email'           => $data['email'],
            'phone'           => $data['phone'] ?? null,
            'customer_type'   => $data['customer_type'] ?? 'active',
            'customer_status' => $data['customer_status'] ?? 'active',
            'internal_note'   => $data['internal_note'] ?? null,
        ]);

        if (!empty($data['password'])) {
            $user->password = $data['password'];
        }

        $user->save();

        $spent = Booking::join('services', 'bookings.service_id', '=', 'services.id')
            ->where('bookings.user_id', $user->id)
            ->where('bookings.payment_status', 'paid')
            ->sum('services.price');

        return response()->json($this->formatAdminUser($user->loadCount('bookings')->load(['bookings.service', 'bookings.reader']), $spent));
    }

    public function deleteUser($id)
    {
        $user = User::where('role', 'user')->withCount('bookings')->findOrFail($id);

        if ($user->bookings_count > 0) {
            $user->update([
                'customer_type' => 'inactive',
                'customer_status' => 'inactive',
            ]);

            return response()->json(['message' => 'Khach hang da co lich nen da duoc chuyen sang khong hoat dong.']);
        }

        $user->delete();

        return response()->json(['message' => 'Da xoa khach hang.']);
    }

    private function formatAdminUser(User $user, int|float $spent): array
    {
        $bookingsCount = $user->bookings_count ?? $user->bookings()->count();
        $type = $user->customer_type ?: ($bookingsCount >= 3 ? 'vip' : 'active');

        return [
            'id'             => $user->id,
            'name'           => $user->name,
            'email'          => $user->email,
            'phone'          => $user->phone,
            'type'           => $type,
            'status'         => $user->customer_status ?: 'active',
            'internal_note'  => $user->internal_note,
            'bookings_count' => $bookingsCount,
            'total_bookings' => $bookingsCount,
            'total_spent'    => $spent,
            'spent'          => round(((float) $spent) / 1000000, 1),
            'created_at'     => $user->created_at?->toIso8601String(),
            'created_label'  => $user->created_at?->format('d/m/Y'),
            'bookings'       => $user->bookings?->take(5)->map(fn($b) => [
                'id'      => $b->id,
                'code'    => 'BK-' . str_pad($b->id, 4, '0', STR_PAD_LEFT),
                'service' => $b->service?->name,
                'reader'  => $b->reader?->name,
                'time'    => $b->booked_at?->format('d/m/Y H:i'),
                'status'  => $b->status,
                'price'   => $b->service ? number_format($b->service->price / 1000, 0) . 'K' : null,
            ])->values() ?? [],
        ];
    }

    public function reviews()
    {
        return response()->json(
            Review::with(['user', 'reader'])->orderBy('created_at', 'desc')->get()->map(fn($r) => $this->formatAdminReview($r))
        );
    }

    public function updateReview(Request $request, $id)
    {
        $data = $request->validate([
            'status' => 'required|in:pending,approved,flagged,hidden',
        ]);

        $review = Review::with(['user', 'reader'])->findOrFail($id);
        $review->update(['status' => $data['status']]);

        $this->logAdminAction($request, 'review.status', $review, ['status' => $data['status']]);

        return response()->json($this->formatAdminReview($review->refresh()->load(['user', 'reader'])));
    }

    public function replyReview(Request $request, $id)
    {
        $data = $request->validate([
            'reply' => 'required|string|min:2|max:2000',
            'reply_visible' => 'nullable|boolean',
        ]);

        $review = Review::with(['user', 'reader'])->findOrFail($id);
        $review->update([
            'admin_reply' => $data['reply'],
            'reply_visible' => $data['reply_visible'] ?? true,
            'replied_at' => now(),
            'status' => 'approved',
        ]);

        $this->logAdminAction($request, 'review.reply', $review, ['reply_visible' => $review->reply_visible]);

        return response()->json($this->formatAdminReview($review->refresh()->load(['user', 'reader'])));
    }

    private function formatAdminReview(Review $review): array
    {
        return [
            'id'            => $review->id,
            'user'          => $review->user?->name,
            'customer_name' => $review->user?->name,
            'reader'        => $review->reader?->name,
            'reader_name'   => $review->reader?->name,
            'reader_em'     => $review->reader?->avatar,
            'reader_id'     => $review->reader_id,
            'stars'         => $review->stars,
            'content'       => $review->content,
            'status'        => $review->status ?: 'pending',
            'reply'         => $review->admin_reply,
            'reply_visible' => $review->reply_visible,
            'replied_at'    => $review->replied_at?->toIso8601String(),
            'created_at'    => $review->created_at?->toIso8601String(),
            'created_label' => $review->created_at?->format('d/m/Y'),
        ];
    }

    public function payments()
    {
        return response()->json(
            Booking::with(['user', 'service', 'reader', 'latestPayment'])
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
                    'proof_code'     => $b->latestPayment?->proof_code,
                    'proof_note'     => $b->latestPayment?->proof_note,
                    'submitted_at'   => $b->latestPayment?->submitted_at?->format('d/m/Y H:i'),
                    'verified_at'    => $b->latestPayment?->verified_at?->format('d/m/Y H:i'),
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
            'payment_status' => 'required|in:paid,unpaid,pending_verification,refunded',
            'payment_method' => 'nullable|in:vnpay,bank,vietqr,cash,momo',
        ]);

        $update = [
            'payment_status' => $request->payment_status,
            'payment_method' => $request->payment_method,
        ];

        // FIX: set paid_at khi admin đánh dấu đã thanh toán thủ công
        if ($request->payment_status === 'paid') {
            $update['paid_at'] = now();
        } elseif (in_array($request->payment_status, ['unpaid', 'pending_verification'], true)) {
            $update['paid_at'] = null;
        }

        $booking = Booking::findOrFail($id);
        $booking->update($update);

        $latestPayment = $booking->payments()->latest('id')->first();
        if ($latestPayment && $request->payment_status === 'paid') {
            $latestPayment->update([
                'status' => 'success',
                'verified_by' => $request->user()->id,
                'verified_at' => now(),
                'paid_at' => now(),
            ]);
        } elseif ($latestPayment && $request->payment_status === 'pending_verification') {
            $latestPayment->update([
                'status' => Payment::PENDING,
                'verified_by' => null,
                'verified_at' => null,
                'paid_at' => null,
            ]);
        }

        $this->logAdminAction($request, 'payment.update', $booking, [
            'payment_status' => $request->payment_status,
            'payment_method' => $request->payment_method,
        ]);

        $msg = match ($request->payment_status) {
            'pending_verification' => 'Da chuyen ve cho xac minh thanh toan.',
            'paid'     => 'Đã đánh dấu thanh toán.',
            'unpaid'   => 'Đã đánh dấu chưa thanh toán.',
            'refunded' => 'Đã đánh dấu hoàn tiền.',
        };

        return response()->json(['message' => $msg]);
    }

    public function settings()
    {
        $defaults = [
            'brand_name' => 'Luna Arcana',
            'contact_email' => config('mail.from.address', 'hello@example.com'),
            'contact_phone' => '',
            'contact_address' => '',
            'bank_name' => config('tarot.bank.name'),
            'bank_bin' => config('tarot.bank.bin'),
            'bank_account_number' => config('tarot.bank.account_number'),
            'bank_account_name' => config('tarot.bank.account_name'),
            'bank_transfer_prefix' => config('tarot.bank.transfer_prefix'),
            'reader_commission_percent' => '30',
        ];

        $saved = AppSetting::whereIn('key', array_keys($defaults))->pluck('value', 'key');

        return response()->json(collect($defaults)
            ->mapWithKeys(fn($value, $key) => [$key => $saved[$key] ?? $value]));
    }

    public function updateSettings(Request $request)
    {
        $data = $request->validate([
            'brand_name' => 'required|string|max:255',
            'contact_email' => 'nullable|email|max:255',
            'contact_phone' => 'nullable|string|max:50',
            'contact_address' => 'nullable|string|max:500',
            'bank_name' => 'required|string|max:255',
            'bank_bin' => 'required|string|max:20',
            'bank_account_number' => 'required|string|max:100',
            'bank_account_name' => 'required|string|max:255',
            'bank_transfer_prefix' => 'required|string|max:30',
            'reader_commission_percent' => 'required|integer|min:0|max:100',
        ]);

        foreach ($data as $key => $value) {
            AppSetting::updateOrCreate(['key' => $key], ['value' => (string) $value]);
        }

        $this->logAdminAction($request, 'settings.update', null, $data);

        return response()->json(['message' => 'Da luu cau hinh.', 'settings' => $data]);
    }

    public function actionLogs()
    {
        return response()->json(
            AdminActionLog::with('user:id,name,email')
                ->orderBy('created_at', 'desc')
                ->limit(100)
                ->get()
        );
    }

    private function logAdminAction(Request $request, string $action, ?object $subject = null, array $payload = []): void
    {
        AdminActionLog::create([
            'user_id' => $request->user()?->id,
            'action' => $action,
            'subject_type' => $subject ? $subject::class : null,
            'subject_id' => $subject?->id,
            'payload' => $payload,
            'ip_address' => $request->ip(),
        ]);
    }
}
