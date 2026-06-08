<?php

namespace App\Http\Controllers\Api\PublicApi;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Service;
use Illuminate\Http\Request;

class AvailabilityController extends Controller
{
    // Lấy các slot đã bị đặt của reader theo tháng
    public function getBusySlots(Request $request, $readerId)
    {
        $request->validate([
            'month' => 'required|date_format:Y-m',
        ]);

        $month     = $request->month;
        $startDate = \Carbon\Carbon::parse($month . '-01')->startOfMonth();
        $endDate   = $startDate->copy()->endOfMonth();

        $bookings = Booking::with('service')
            ->where('reader_id', $readerId)
            ->whereIn('status', ['pending', 'confirmed'])
            ->where('booked_at', '>=', $startDate)
            ->where('booked_at', '<=', $endDate)
            ->get()
            ->map(fn($b) => [
                'booked_at' => \Carbon\Carbon::parse($b->booked_at)->format('Y-m-d H:i'),
                'duration'  => $b->service->duration,
                'end_at'    => \Carbon\Carbon::parse($b->booked_at)
                    ->addMinutes($b->service->duration)
                    ->format('Y-m-d H:i'),
            ]);

        return response()->json($bookings);
    }

    // Kiểm tra slot cụ thể có trống không
    public function checkSlot(Request $request, $readerId)
    {
        $request->validate([
            'booked_at'  => 'required|date|after:now',
            'service_id' => 'required|exists:services,id',
        ]);

        $service  = Service::findOrFail($request->service_id);
        $newStart = \Carbon\Carbon::parse($request->booked_at);
        $newEnd   = $newStart->copy()->addMinutes($service->duration);

        // Lấy tất cả booking của reader trong ngày đó
        $bookings = Booking::with('service')
            ->where('reader_id', $readerId)
            ->whereIn('status', ['pending', 'confirmed'])
            ->whereDate('booked_at', $newStart->toDateString())
            ->get();

        // Check từng booking xem có overlap không
        $conflict = $bookings->first(function ($b) use ($newStart, $newEnd) {
            $existStart = \Carbon\Carbon::parse($b->booked_at);
            $existEnd   = $existStart->copy()->addMinutes($b->service->duration);

            // Overlap khi: newStart < existEnd VÀ newEnd > existStart
            return $newStart->lt($existEnd) && $newEnd->gt($existStart);
        });

        return response()->json([
            'available' => !$conflict,
            'message'   => $conflict
                ? 'Reader đã có lịch từ '
                . \Carbon\Carbon::parse($conflict->booked_at)->format('H:i')
                . ' đến '
                . \Carbon\Carbon::parse($conflict->booked_at)->addMinutes($conflict->service->duration)->format('H:i')
                . '. Vui lòng chọn thời gian khác.'
                : 'Khung giờ này còn trống.',
        ]);
    }
}
