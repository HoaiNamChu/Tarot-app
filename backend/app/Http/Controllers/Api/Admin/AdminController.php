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
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use App\Mail\BookingCancelled;
use App\Services\Booking\BookingCompletionService;
use App\Services\Booking\CreateBookingService;
use App\Services\NotificationService;
use App\Services\Payment\PaymentGatewayConfig;
use App\Services\PolicyContentService;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Str;

class AdminController extends Controller
{
    private const PUBLIC_READERS_CACHE_KEY = 'public:readers:active:v1';
    private const PUBLIC_SERVICES_CACHE_KEY = 'public:services:active:v1';

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
        $refundPending = Booking::join('services', 'bookings.service_id', '=', 'services.id')
            ->where('bookings.payment_status', 'refund_pending')
            ->selectRaw('COUNT(bookings.id) as count, COALESCE(SUM(services.price), 0) as amount')
            ->first();
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
            'payments_refund_pending' => (int) ($refundPending->count ?? 0),
            'payments_refund_pending_amount' => (float) ($refundPending->amount ?? 0),
            'payments_refund_pending_amount_million' => round(((float) ($refundPending->amount ?? 0)) / 1000000, 2),
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

    public function readiness()
    {
        $gatewayConfig = app(PaymentGatewayConfig::class);
        $checks = [];

        $this->addReadinessCheck($checks, 'app_key', 'APP_KEY', filled(config('app.key')), 'critical');
        $this->addReadinessCheck($checks, 'database', 'Database connection', $this->databaseWorks(), 'critical');
        $this->addReadinessCheck($checks, 'storage', 'Storage writable', is_writable(storage_path()), 'critical');
        $this->addReadinessCheck($checks, 'cache_path', 'Cache path writable', is_writable(storage_path('framework/cache')), 'critical');
        $this->addReadinessCheck($checks, 'log_path', 'Logs path writable', is_writable(storage_path('logs')), 'critical');
        $this->addReadinessCheck($checks, 'app_debug', 'APP_DEBUG off', config('app.debug') === false, 'critical');
        $this->addReadinessCheck($checks, 'app_env', 'APP_ENV production', config('app.env') === 'production', 'warning');
        $this->addReadinessCheck($checks, 'app_url', 'APP_URL uses HTTPS and is public', $this->isHttpsPublicUrl(config('app.url')), 'critical', config('app.url'));
        $this->addReadinessCheck($checks, 'frontend_url', 'FRONTEND_URL uses HTTPS and is public', $this->isHttpsPublicUrl(config('tarot.frontend_url')), 'critical', config('tarot.frontend_url'));
        $this->addReadinessCheck($checks, 'admin_url', 'ADMIN_FRONTEND_URL uses HTTPS and is public', $this->isHttpsPublicUrl(config('tarot.admin_frontend_url')), 'critical', config('tarot.admin_frontend_url'));
        $this->addReadinessCheck($checks, 'queue', 'Queue driver not sync', config('queue.default') !== 'sync', 'warning', config('queue.default'));
        $this->addReadinessCheck($checks, 'mail_driver', 'Mail driver production-ready', !in_array(config('mail.default'), ['log', 'array'], true), 'critical', config('mail.default'));
        $this->addReadinessCheck($checks, 'mail_scheme', 'MAIL_SCHEME valid', $this->mailSchemeIsValid(), 'critical', config('mail.mailers.smtp.scheme') ?: '(empty)');
        $this->addReadinessCheck($checks, 'mail_from', 'Mail from address is set', filled(config('mail.from.address')) && !str_ends_with((string) config('mail.from.address'), '@example.com'), 'warning', config('mail.from.address'));
        $this->addReadinessCheck($checks, 'scheduler_expire', 'Scheduler command bookings:expire exists', $this->commandExists('bookings:expire'), 'critical');
        $this->addReadinessCheck($checks, 'scheduler_reminders', 'Scheduler command bookings:send-reminders exists', $this->commandExists('bookings:send-reminders'), 'warning');
        $this->addReadinessCheck($checks, 'scheduler_auto_complete', 'Scheduler command bookings:auto-complete exists', $this->commandExists('bookings:auto-complete'), 'warning');

        if (AppSetting::getBool('payment_bank_enabled', true)) {
            $bank = config('tarot.bank');
            $this->addReadinessCheck($checks, 'bank_config', 'Bank transfer config complete', filled($bank['bin'] ?? null) && filled($bank['account_number'] ?? null) && filled($bank['account_name'] ?? null), 'critical');
        }

        if (AppSetting::getBool('payment_vnpay_enabled', true)) {
            $missing = $gatewayConfig->missingVnpay();
            $this->addReadinessCheck($checks, 'vnpay_config', 'VNPay config complete', $missing === [], 'critical', $missing === [] ? 'Ready' : 'Missing: ' . implode(', ', $missing));
        }

        if (AppSetting::getBool('payment_momo_enabled', false)) {
            $missing = $gatewayConfig->missingMomo();
            $this->addReadinessCheck($checks, 'momo_config', 'MoMo config complete', $missing === [], 'critical', $missing === [] ? 'Ready' : 'Missing: ' . implode(', ', $missing));
        }

        $criticalFailed = collect($checks)->where('severity', 'critical')->where('ok', false)->count();
        $warningFailed = collect($checks)->where('severity', 'warning')->where('ok', false)->count();
        $passed = collect($checks)->where('ok', true)->count();

        return response()->json([
            'ready' => $criticalFailed === 0,
            'score' => count($checks) ? round(($passed / count($checks)) * 100) : 0,
            'critical_failed' => $criticalFailed,
            'warning_failed' => $warningFailed,
            'checks' => $checks,
            'manual_checks' => [
                'Cron chay php artisan schedule:run moi phut tren server.',
                'Queue worker duoc supervisor/systemd giu chay nen.',
                'Backup database hang ngay va da test restore.',
            ],
        ]);
    }

    public function search(Request $request)
    {
        $data = $request->validate([
            'q' => 'nullable|string|max:100',
        ]);

        $term = trim($data['q'] ?? '');
        if (Str::length($term) < 2) {
            return response()->json([]);
        }

        $like = '%' . str_replace(['%', '_'], ['\\%', '\\_'], $term) . '%';
        $bookingId = preg_match('/\d+/', $term, $matches) ? (int) $matches[0] : null;

        $bookings = Booking::with(['user', 'reader', 'service'])
            ->where(function ($query) use ($like, $bookingId) {
                if ($bookingId) {
                    $query->orWhere('id', $bookingId);
                }
                $query->orWhere('status', 'like', $like)
                    ->orWhere('payment_status', 'like', $like)
                    ->orWhereHas('user', fn($q) => $q->where('name', 'like', $like)->orWhere('email', 'like', $like)->orWhere('phone', 'like', $like))
                    ->orWhereHas('reader', fn($q) => $q->where('name', 'like', $like))
                    ->orWhereHas('service', fn($q) => $q->where('name', 'like', $like));
            })
            ->latest('booked_at')
            ->limit(5)
            ->get()
            ->map(fn($booking) => [
                'type' => 'booking',
                'title' => 'BK-' . str_pad($booking->id, 4, '0', STR_PAD_LEFT) . ' - ' . $booking->user?->name,
                'subtitle' => trim(($booking->service?->name ?? 'Dich vu') . ' / ' . ($booking->reader?->name ?? 'Reader') . ' / ' . $booking->booked_at?->format('d/m/Y H:i')),
                'to' => '/bookings',
            ]);

        $users = User::where('role', 'user')
            ->where(fn($query) => $query->where('name', 'like', $like)->orWhere('email', 'like', $like)->orWhere('phone', 'like', $like))
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn($user) => [
                'type' => 'user',
                'title' => $user->name,
                'subtitle' => trim(($user->email ?? '') . ' ' . ($user->phone ?? '')),
                'to' => '/users',
            ]);

        $readers = Reader::where(fn($query) => $query->where('name', 'like', $like)->orWhere('title', 'like', $like)->orWhere('email', 'like', $like)->orWhere('phone', 'like', $like))
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn($reader) => [
                'type' => 'reader',
                'title' => $reader->name,
                'subtitle' => trim(($reader->title ?? 'Tarot Reader') . ' ' . ($reader->email ?? '')),
                'to' => '/readers',
            ]);

        $services = Service::where(fn($query) => $query->where('name', 'like', $like)->orWhere('description', 'like', $like))
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn($service) => [
                'type' => 'service',
                'title' => $service->name,
                'subtitle' => $service->duration . ' phut / ' . number_format($service->price, 0, ',', '.') . 'd',
                'to' => '/content',
            ]);

        $payments = Booking::with(['user', 'service', 'latestPayment'])
            ->whereIn('payment_status', ['paid', 'pending_verification', 'refund_pending', 'refunded'])
            ->where(function ($query) use ($like, $bookingId) {
                if ($bookingId) {
                    $query->orWhere('id', $bookingId);
                }
                $query->orWhere('payment_status', 'like', $like)
                    ->orWhere('payment_method', 'like', $like)
                    ->orWhereHas('user', fn($q) => $q->where('name', 'like', $like)->orWhere('email', 'like', $like))
                    ->orWhereHas('service', fn($q) => $q->where('name', 'like', $like));
            })
            ->latest('updated_at')
            ->limit(5)
            ->get()
            ->map(fn($booking) => [
                'type' => 'payment',
                'title' => 'Thanh toan BK-' . str_pad($booking->id, 4, '0', STR_PAD_LEFT),
                'subtitle' => trim(($booking->user?->name ?? '') . ' / ' . $booking->payment_status . ' / ' . number_format($booking->service?->price ?? 0, 0, ',', '.') . 'd'),
                'to' => '/payments',
            ]);

        $reviews = Review::with(['user', 'reader'])
            ->where(function ($query) use ($like) {
                $query->where('content', 'like', $like)
                    ->orWhere('status', 'like', $like)
                    ->orWhereHas('user', fn($q) => $q->where('name', 'like', $like)->orWhere('email', 'like', $like))
                    ->orWhereHas('reader', fn($q) => $q->where('name', 'like', $like));
            })
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn($review) => [
                'type' => 'review',
                'title' => ($review->user?->name ?? 'Khach hang') . ' - ' . $review->stars . ' sao',
                'subtitle' => Str::limit($review->content ?? '', 80),
                'to' => '/reviews',
            ]);

        return response()->json(
            $bookings
                ->concat($users)
                ->concat($readers)
                ->concat($services)
                ->concat($payments)
                ->concat($reviews)
                ->take(12)
                ->values()
        );
    }

    public function bookings(Request $request)
    {
        $query = Booking::with(['user', 'reader', 'service', 'latestPayment'])
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
            'completion_requested_at' => $b->completion_requested_at?->toIso8601String(),
            'completion_auto_complete_at' => $b->completion_auto_complete_at?->toIso8601String(),
            'completion_confirmed_at' => $b->completion_confirmed_at?->toIso8601String(),
            'completion_disputed_at' => $b->completion_disputed_at?->toIso8601String(),
            'payment_status' => $b->payment_status,
            'payment_method' => $b->payment_method,
            'refund_amount' => $b->latestPayment?->refund_amount,
            'refund_reference' => $b->latestPayment?->refund_reference,
            'refund_reason' => $b->latestPayment?->refund_reason,
            'refund_note' => $b->latestPayment?->refund_note,
            'refunded_at' => $b->latestPayment?->refunded_at?->format('d/m/Y H:i'),
            'zoom_link'      => $b->zoom_link,
            'note'           => $b->note,
            'cancel_reason'  => $b->cancel_reason,
            'cancelled_by'   => $b->cancelled_by,
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

        return DB::transaction(function () use ($data, $service, $request) {
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

        $this->logAdminAction($request, 'booking.create', $booking, [
            'customer' => $booking->user->name,
            'reader' => $booking->reader->name,
            'service' => $booking->service->name,
            'booked_at' => $booking->booked_at->toIso8601String(),
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
            'price'          => number_format($booking->service->price, 0, ',', '.') . 'đ',
            'amount'         => $booking->service->price,
            'status'         => $booking->status,
            'completion_requested_at' => $booking->completion_requested_at?->toIso8601String(),
            'completion_auto_complete_at' => $booking->completion_auto_complete_at?->toIso8601String(),
            'payment_status' => $booking->payment_status,
            'payment_method' => $booking->payment_method,
            'zoom_link'      => $booking->zoom_link,
            'note'           => $booking->note,
            'cancel_reason'  => $booking->cancel_reason,
            'cancelled_by'   => $booking->cancelled_by,
        ], 201);
        });
    }

    public function confirmBooking(Request $request, $id)
    {
        $booking = Booking::with(['user', 'reader', 'service'])->findOrFail($id);

        if ($booking->status !== 'pending') {
            return response()->json(['message' => 'Không thể xác nhận lịch này.'], 422);
        }

        $booking->update(['status' => 'confirmed']);
        $this->queueBookingMailSafely($booking, BookingConfirmed::class, 'Booking confirmation mail failed');
        $this->logAdminAction($request, 'booking.confirm', $booking, ['status' => 'confirmed']);
        app(NotificationService::class)->notifyReaderForBooking($booking, 'booking.confirmed', 'Lich da duoc xac nhan', 'Lich BK-' . str_pad($booking->id, 4, '0', STR_PAD_LEFT) . ' da duoc admin xac nhan.');

        return response()->json(['message' => 'Đã xác nhận lịch.']);
    }

    public function cancelBooking(Request $request, $id)
    {
        $data = $request->validate([
            'cancel_reason' => 'required|string|min:5|max:1000',
        ]);

        $booking = Booking::findOrFail($id);
        $booking->load(['user', 'reader', 'service']);

        if (!in_array($booking->status, ['pending', 'confirmed'], true)) {
            return response()->json(['message' => 'Chi co the huy lich dang cho xac nhan hoac da xac nhan.'], 422);
        }

        $booking->update([
            'status'       => 'cancelled',
            'payment_status' => $booking->payment_status === 'paid' ? 'refund_pending' : $booking->payment_status,
            'cancelled_at' => now(),  // FIX: trước đây thiếu
            'cancel_reason' => $data['cancel_reason'],
            'cancelled_by' => 'admin',
        ]);

        $this->queueBookingMailSafely($booking, BookingCancelled::class, 'Booking cancellation mail failed');
        $this->logAdminAction($request, 'booking.cancel', $booking, ['status' => 'cancelled', 'cancel_reason' => $data['cancel_reason']]);
        app(NotificationService::class)->notifyReaderForBooking($booking, 'booking.cancelled_by_admin', 'Admin da huy lich', 'Lich BK-' . str_pad($booking->id, 4, '0', STR_PAD_LEFT) . ' da bi huy. Ly do: ' . $data['cancel_reason']);

        return response()->json([
            'message' => 'Đã huỷ lịch.',
            'payment_status' => $booking->refresh()->payment_status,
        ]);
    }

    public function completeBooking(Request $request, $id)
    {
        $booking = app(BookingCompletionService::class)->requestCompletion(
            Booking::with(['user', 'reader.user', 'service'])->findOrFail($id),
            'admin'
        );

        $this->logAdminAction($request, 'booking.completion_requested', $booking, ['status' => $booking->status]);

        return response()->json(['message' => 'Da gui yeu cau khach xac nhan hoan thanh.']);
    }

    public function updateBookingStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:pending,confirmed,completion_pending,completed,cancelled',
        ]);

        $booking = Booking::findOrFail($id);
        $status = $request->status;

        if ($booking->status !== $status) {
            return response()->json(['message' => 'Khong the doi trang thai truc tiep. Hay dung cac thao tac xac nhan, huy, hoac gui xac nhan hoan thanh.'], 422);
        }

        return response()->json([
            'message' => 'Trang thai khong thay doi.',
            'status' => $booking->status,
        ]);

    }

    public function setZoom(Request $request, $id)
    {
        $request->validate(['zoom_link' => 'required|url']);
        $booking = Booking::with(['user', 'reader', 'service'])->findOrFail($id);

        if (!in_array($booking->status, ['pending', 'confirmed'], true)) {
            return response()->json(['message' => 'Khong the sua link Zoom khi lich da ket thuc hoac dang cho khach xac nhan.'], 422);
        }

        $booking->update(['zoom_link' => $request->zoom_link]);
        $this->queueBookingMailSafely($booking, BookingConfirmed::class, 'Booking zoom mail failed');
        $this->logAdminAction($request, 'booking.zoom', $booking, ['zoom_link' => $request->zoom_link]);
        app(NotificationService::class)->notifyReaderForBooking($booking, 'booking.zoom_updated', 'Link Zoom da duoc cap nhat', 'Lich BK-' . str_pad($booking->id, 4, '0', STR_PAD_LEFT) . ' da co link Zoom.');

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

        $this->forgetPublicReaderCache();

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
        $this->forgetPublicReaderCache();

        return response()->json($reader);
    }

    public function deleteReader($id)
    {
        $reader = Reader::findOrFail($id);

        if ($reader->bookings()->exists()) {
            $reader->update(['is_active' => false]);
            $this->forgetPublicReaderCache();

            return response()->json(['message' => 'Reader da co lich dat nen da duoc an thay vi xoa.']);
        }

        $reader->user?->delete();
        $reader->delete();
        $this->forgetPublicReaderCache();
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

        $this->forgetPublicServiceCache();

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
        $this->forgetPublicServiceCache();

        return response()->json($service);
    }

    public function deleteService($id)
    {
        $service = Service::findOrFail($id);

        if ($service->bookings()->exists()) {
            $service->update(['is_active' => false]);
            $this->forgetPublicServiceCache();

            return response()->json(['message' => 'Dich vu da co lich dat nen da duoc an thay vi xoa.']);
        }

        $service->delete();
        $this->forgetPublicServiceCache();

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
                ->whereIn('payment_status', ['paid', 'pending_verification', 'refund_pending', 'refunded'])
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
                    'booking_status' => $b->status,
                    'payment_status' => $b->payment_status,
                    'cancel_reason'  => $b->cancel_reason,
                    'cancelled_by'   => $b->cancelled_by,
                    'proof_code'     => $b->latestPayment?->proof_code,
                    'proof_note'     => $b->latestPayment?->proof_note,
                    'refund_amount'  => $b->latestPayment?->refund_amount,
                    'refund_reference' => $b->latestPayment?->refund_reference,
                    'refund_reason'  => $b->latestPayment?->refund_reason,
                    'refund_note'    => $b->latestPayment?->refund_note,
                    'refunded_at'    => $b->latestPayment?->refunded_at?->format('d/m/Y H:i'),
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
            'payment_status' => 'required|in:paid,unpaid,pending_verification,refund_pending,refunded',
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
            'refund_pending' => 'Da danh dau cho hoan tien.',
            'refunded' => 'Đã đánh dấu hoàn tiền.',
        };

        return response()->json(['message' => $msg]);
    }

    public function updatePaymentWithRefundAudit(Request $request, $id)
    {
        $data = $request->validate([
            'payment_status' => 'required|in:paid,unpaid,pending_verification,refund_pending,refunded',
            'payment_method' => 'nullable|in:vnpay,bank,vietqr,cash,momo',
            'refund_amount' => 'nullable|numeric|min:0.01',
            'refund_reference' => 'nullable|string|max:255',
            'refund_reason' => 'nullable|string|max:1000',
            'refund_note' => 'nullable|string|max:2000',
        ]);

        $result = DB::transaction(function () use ($data, $id, $request) {
            $booking = Booking::with(['service', 'payments'])->lockForUpdate()->findOrFail($id);

            if ($booking->payment_status === 'refunded' && $data['payment_status'] !== 'refunded') {
                return response()->json([
                    'message' => 'Khong the mo lai thanh toan da hoan tien.',
                ], 422);
            }

            if ($booking->status === 'completed' && in_array($data['payment_status'], ['unpaid', 'pending_verification'], true)) {
                return response()->json([
                    'message' => 'Khong the chuyen lich da hoan thanh ve chua thanh toan hoac cho xac minh.',
                ], 422);
            }

            if ($data['payment_status'] === 'refund_pending' && !in_array($booking->payment_status, ['paid', 'refund_pending'], true)) {
                return response()->json([
                    'message' => 'Chi co the cho hoan tien booking da thanh toan.',
                ], 422);
            }

            if ($data['payment_status'] === 'refunded') {
                if (!in_array($booking->payment_status, ['paid', 'refund_pending'], true)) {
                    return response()->json([
                        'message' => 'Chi co the hoan tien booking da thanh toan.',
                    ], 422);
                }

                if (empty($data['refund_amount']) || empty($data['refund_reason'])) {
                    return response()->json([
                        'message' => 'Vui long nhap so tien va ly do hoan tien.',
                    ], 422);
                }

                if ((float) $data['refund_amount'] > (float) $booking->service->price) {
                    return response()->json([
                        'message' => 'So tien hoan khong duoc lon hon gia tri booking.',
                    ], 422);
                }
            }

            $method = $data['payment_method'] ?? $booking->payment_method ?? 'bank';

            $bookingUpdate = [
                'payment_status' => $data['payment_status'],
                'payment_method' => $method,
            ];

            if ($data['payment_status'] === 'paid') {
                $bookingUpdate['paid_at'] = now();
            } elseif (in_array($data['payment_status'], ['unpaid', 'pending_verification'], true)) {
                $bookingUpdate['paid_at'] = null;
            }

            $booking->update($bookingUpdate);

            $payment = $booking->payments()->latest('id')->first();
            if (!$payment && in_array($data['payment_status'], ['paid', 'pending_verification', 'refund_pending', 'refunded'], true)) {
                $payment = Payment::create([
                    'booking_id' => $booking->id,
                    'gateway' => $method,
                    'amount' => $booking->service->price,
                    'status' => in_array($data['payment_status'], ['paid', 'refund_pending'], true) ? Payment::SUCCESS : Payment::PENDING,
                ]);
            }

            if ($payment && $data['payment_status'] === 'paid') {
                $payment->update([
                    'status' => Payment::SUCCESS,
                    'verified_by' => $request->user()->id,
                    'verified_at' => now(),
                    'paid_at' => now(),
                    'refund_amount' => null,
                    'refund_reference' => null,
                    'refund_reason' => null,
                    'refund_note' => null,
                    'refunded_by' => null,
                    'refunded_at' => null,
                ]);
            } elseif ($payment && $data['payment_status'] === 'pending_verification') {
                $payment->update([
                    'status' => Payment::PENDING,
                    'verified_by' => null,
                    'verified_at' => null,
                    'paid_at' => null,
                    'refund_amount' => null,
                    'refund_reference' => null,
                    'refund_reason' => null,
                    'refund_note' => null,
                    'refunded_by' => null,
                    'refunded_at' => null,
                ]);
            } elseif ($payment && $data['payment_status'] === 'refund_pending') {
                $payment->update([
                    'status' => Payment::SUCCESS,
                    'refund_amount' => null,
                    'refund_reference' => null,
                    'refund_reason' => null,
                    'refund_note' => null,
                    'refunded_by' => null,
                    'refunded_at' => null,
                ]);
            } elseif ($payment && $data['payment_status'] === 'refunded') {
                $payment->update([
                    'status' => Payment::REFUNDED,
                    'refund_amount' => $data['refund_amount'],
                    'refund_reference' => $data['refund_reference'] ?? null,
                    'refund_reason' => $data['refund_reason'],
                    'refund_note' => $data['refund_note'] ?? null,
                    'refunded_by' => $request->user()->id,
                    'refunded_at' => now(),
                ]);
            }

            $this->logAdminAction($request, 'payment.update', $booking, [
                'payment_status' => $data['payment_status'],
                'payment_method' => $method,
                'refund_amount' => $data['refund_amount'] ?? null,
                'refund_reference' => $data['refund_reference'] ?? null,
            ]);

            return null;
        });

        if ($result) {
            return $result;
        }

        $bookingForNotification = Booking::with(['user', 'reader.user', 'service'])->find($id);
        if ($bookingForNotification) {
            $notificationTitle = match ($data['payment_status']) {
                'paid' => 'Thanh toan da duoc xac nhan',
                'pending_verification' => 'Thanh toan dang cho xac minh',
                'refund_pending' => 'Thanh toan dang cho hoan tien',
                'refunded' => 'Thanh toan da hoan tien',
                default => 'Trang thai thanh toan da doi',
            };
            app(NotificationService::class)->notifyReaderForBooking(
                $bookingForNotification,
                'payment.' . $data['payment_status'],
                $notificationTitle,
                'Lich BK-' . str_pad($bookingForNotification->id, 4, '0', STR_PAD_LEFT) . ' co trang thai thanh toan: ' . $data['payment_status'],
                ['payment_status' => $data['payment_status']]
            );
        }

        $msg = match ($data['payment_status']) {
            'pending_verification' => 'Da chuyen ve cho xac minh thanh toan.',
            'paid' => 'Da danh dau thanh toan.',
            'unpaid' => 'Da danh dau chua thanh toan.',
            'refund_pending' => 'Da danh dau cho hoan tien.',
            'refunded' => 'Da ghi nhan thong tin hoan tien.',
        };

        return response()->json(['message' => $msg]);
    }

    public function settings()
    {
        return response()->json($this->settingsPayload());
    }

    public function policies(PolicyContentService $policies)
    {
        return response()->json($policies->all());
    }

    public function updatePolicy(Request $request, string $type, PolicyContentService $policies)
    {
        if (!in_array($type, PolicyContentService::TYPES, true)) {
            return response()->json(['message' => 'Policy not found.'], 404);
        }

        $data = $request->validate([
            'title' => 'required|string|max:255',
            'updated' => 'required|string|max:100',
            'intro' => 'required|string|max:2000',
            'sections' => 'required|array|min:1|max:20',
            'sections.*.heading' => 'required|string|max:255',
            'sections.*.body' => 'required|string|max:3000',
        ]);

        $policy = $policies->update($type, $data);
        $this->logAdminAction($request, 'policy.update', null, ['type' => $type]);

        return response()->json(['message' => 'Da luu chinh sach.', 'policy' => $policy]);
    }

    private function settingsPayload(): array
    {
        $gatewayConfig = app(PaymentGatewayConfig::class);
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
            'payment_vnpay_enabled' => '1',
            'payment_bank_enabled' => '1',
            'payment_momo_enabled' => '0',
            'momo_phone' => '',
            'momo_account_name' => '',
            'momo_transfer_prefix' => 'MOMO',
            'vnpay_tmn_code' => config('vnpay.tmn_code'),
            'vnpay_hash_secret' => '',
            'vnpay_url' => config('vnpay.url'),
            'vnpay_return_url' => config('vnpay.return_url'),
            'vnpay_ipn_url' => config('vnpay.ipn_url'),
            'momo_partner_code' => config('momo.partner_code'),
            'momo_access_key' => config('momo.access_key'),
            'momo_secret_key' => '',
            'momo_endpoint' => config('momo.endpoint'),
            'momo_redirect_url' => config('momo.redirect_url'),
            'momo_ipn_url' => config('momo.ipn_url'),
            'momo_lang' => config('momo.lang', 'vi'),
            'reader_commission_percent' => '30',
        ];

        $saved = AppSetting::whereIn('key', array_keys($defaults))->pluck('value', 'key');
        $secretKeys = ['vnpay_hash_secret', 'momo_secret_key'];

        $payload = collect($defaults)
            ->mapWithKeys(function ($value, $key) use ($saved) {
                if (in_array($key, ['payment_vnpay_enabled', 'payment_bank_enabled', 'payment_momo_enabled'], true)) {
                    return [$key => AppSetting::getBool($key, $value === '1')];
                }

                return [$key => $saved[$key] ?? $value];
            })
            ->mapWithKeys(fn($value, $key) => in_array($key, $secretKeys, true) ? [$key => ''] : [$key => $value])
            ->all();

        return array_merge($payload, [
            'vnpay_gateway_configured' => $gatewayConfig->missingVnpay() === [],
            'vnpay_hash_secret_configured' => filled($gatewayConfig->vnpay()['hash_secret']),
            'momo_gateway_configured' => $gatewayConfig->missingMomo() === [],
            'momo_secret_key_configured' => filled($gatewayConfig->momo()['secret_key']),
        ]);
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
            'payment_vnpay_enabled' => 'required|boolean',
            'payment_bank_enabled' => 'required|boolean',
            'payment_momo_enabled' => 'required|boolean',
            'momo_phone' => 'nullable|string|max:30',
            'momo_account_name' => 'nullable|string|max:255',
            'momo_transfer_prefix' => 'nullable|string|max:30',
            'vnpay_tmn_code' => 'nullable|string|max:100',
            'vnpay_hash_secret' => 'nullable|string|max:255',
            'vnpay_url' => 'nullable|url|max:500',
            'vnpay_return_url' => 'nullable|url|max:500',
            'vnpay_ipn_url' => 'nullable|url|max:500',
            'momo_partner_code' => 'nullable|string|max:100',
            'momo_access_key' => 'nullable|string|max:255',
            'momo_secret_key' => 'nullable|string|max:255',
            'momo_endpoint' => 'nullable|url|max:500',
            'momo_redirect_url' => 'nullable|url|max:500',
            'momo_ipn_url' => 'nullable|url|max:500',
            'momo_lang' => 'nullable|string|max:10',
            'reader_commission_percent' => 'required|integer|min:0|max:100',
        ]);

        $secretKeys = ['vnpay_hash_secret', 'momo_secret_key'];
        foreach ($data as $key => $value) {
            if (in_array($key, $secretKeys, true) && blank($value)) {
                continue;
            }

            AppSetting::updateOrCreate(['key' => $key], ['value' => is_bool($value) ? ($value ? '1' : '0') : (string) $value]);
        }

        $logData = $data;
        foreach ($secretKeys as $key) {
            if (array_key_exists($key, $logData)) {
                $logData[$key] = blank($logData[$key]) ? '(unchanged)' : '(updated)';
            }
        }

        $this->logAdminAction($request, 'settings.update', null, $logData);

        return response()->json(['message' => 'Da luu cau hinh.', 'settings' => $this->settingsPayload()]);
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

    private function queueBookingMailSafely(Booking $booking, string $mailableClass, string $logMessage): void
    {
        try {
            Mail::to($booking->user->email)->queue(new $mailableClass($booking));
        } catch (\Throwable $e) {
            Log::warning($logMessage, [
                'booking_id' => $booking->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function forgetPublicReaderCache(): void
    {
        Cache::forget(self::PUBLIC_READERS_CACHE_KEY);
    }

    private function forgetPublicServiceCache(): void
    {
        Cache::forget(self::PUBLIC_SERVICES_CACHE_KEY);
    }

    private function addReadinessCheck(array &$checks, string $key, string $label, bool $ok, string $severity = 'warning', ?string $detail = null): void
    {
        $checks[] = [
            'key' => $key,
            'label' => $label,
            'ok' => $ok,
            'severity' => $severity,
            'detail' => $detail,
        ];
    }

    private function databaseWorks(): bool
    {
        try {
            DB::select('select 1');
            return true;
        } catch (\Throwable) {
            return false;
        }
    }

    private function isHttpsPublicUrl(?string $url): bool
    {
        if (blank($url) || parse_url((string) $url, PHP_URL_SCHEME) !== 'https') {
            return false;
        }

        $host = parse_url((string) $url, PHP_URL_HOST);

        return !in_array($host, ['localhost', '127.0.0.1', '::1'], true);
    }

    private function mailSchemeIsValid(): bool
    {
        $scheme = config('mail.mailers.smtp.scheme');

        return blank($scheme) || in_array($scheme, ['smtp', 'smtps'], true);
    }

    private function commandExists(string $command): bool
    {
        return array_key_exists($command, Artisan::all());
    }
}
