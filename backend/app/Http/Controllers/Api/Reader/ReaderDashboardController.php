<?php

namespace App\Http\Controllers\Api\Reader;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use Illuminate\Http\Request;

class ReaderDashboardController extends Controller
{
    private function currentReader(Request $request)
    {
        return $request->user()->reader;
    }

    // Lấy thông tin reader hiện tại
    public function me(Request $request)
    {
        $reader = $this->currentReader($request);
        if (!$reader) {
            return response()->json(['message' => 'Không tìm thấy thông tin Reader.'], 404);
        }
        return response()->json([
            'id'        => $reader->id,
            'name'      => $reader->name,
            'title'     => $reader->title,
            'bio'       => $reader->bio,
            'avatar'    => $reader->avatar,
            'email'     => $reader->email,
            'phone'     => $reader->phone,
            'is_active' => $reader->is_active,
        ]);
    }

    // Lịch của reader
    public function bookings(Request $request)
    {
        $reader = $this->currentReader($request);
        if (!$reader) {
            return response()->json(['message' => 'Không tìm thấy thông tin Reader.'], 404);
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

        return response()->json($query->get()->map(fn($b) => [
            'id'             => $b->id,
            'code'           => 'BK-' . str_pad($b->id, 4, '0', STR_PAD_LEFT),
            'user'           => $b->user->name,
            'user_email'     => $b->user->email,
            'svc'            => $b->service->name,
            'duration'       => $b->service->duration,
            'booked_at'      => $b->booked_at->format('d/m/Y H:i'),
            'booked_date'    => $b->booked_at->format('Y-m-d'),
            'booked_time'    => $b->booked_at->format('H:i'),
            'price'          => number_format($b->service->price, 0, ',', '.') . 'đ',
            'status'         => $b->status,
            'payment_status' => $b->payment_status,
            'zoom_link'      => $b->zoom_link,
            'note'           => $b->note,
        ]));
    }

    // Stats của reader
    public function stats(Request $request)
    {
        $reader = $this->currentReader($request);
        if (!$reader) {
            return response()->json(['message' => 'Không tìm thấy thông tin Reader.'], 404);
        }

        $now = now();
        return response()->json([
            'total_bookings'    => Booking::where('reader_id', $reader->id)->count(),
            'bookings_month'    => Booking::where('reader_id', $reader->id)->whereMonth('created_at', $now->month)->count(),
            'bookings_today'    => Booking::where('reader_id', $reader->id)->whereDate('booked_at', today())->count(),
            'bookings_pending'  => Booking::where('reader_id', $reader->id)->where('status', 'pending')->count(),
            'bookings_upcoming' => Booking::where('reader_id', $reader->id)->where('status', 'confirmed')->where('booked_at', '>=', now())->count(),
            'revenue_month'     => Booking::join('services', 'bookings.service_id', '=', 'services.id')
                ->where('bookings.reader_id', $reader->id)
                ->where('bookings.payment_status', 'paid')
                ->whereMonth('bookings.created_at', $now->month)
                ->sum('services.price'),
        ]);
    }

    // Cập nhật profile
    public function updateProfile(Request $request)
    {
        $reader = $this->currentReader($request);
        if (!$reader) {
            return response()->json(['message' => 'Không tìm thấy thông tin Reader.'], 404);
        }

        $data = $request->validate([
            'bio'   => 'nullable|string',
            'phone' => 'nullable|string',
        ]);

        $reader->update($data);
        return response()->json(['message' => 'Đã cập nhật thông tin.']);
    }
}
