<?php

namespace App\Http\Controllers\Api\PublicApi;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Reader;
use App\Models\Service;
use App\Services\Booking\ReaderAvailabilityService;
use Carbon\Carbon;
use Illuminate\Http\Request;

class AvailabilityController extends Controller
{
    public function getBusySlots(Request $request, $readerId)
    {
        $request->validate([
            'month' => 'nullable|date_format:Y-m',
        ]);

        if ($request->filled('month')) {
            $startDate = Carbon::createFromFormat('Y-m-d', $request->month . '-01', config('app.timezone'))->startOfMonth();
            $endDate = $startDate->copy()->endOfMonth();
        } else {
            $startDate = now()->startOfDay();
            $endDate = now()->copy()->addDays(90)->endOfDay();
        }

        $bookings = Booking::with('service')
            ->where('reader_id', $readerId)
            ->where(fn($query) => $this->blockingBookingQuery($query))
            ->whereBetween('booked_at', [$startDate, $endDate])
            ->orderBy('booked_at')
            ->get()
            ->map(function (Booking $booking) {
                $start = $booking->booked_at->copy();
                $end = $start->copy()->addMinutes($booking->service->duration);

                return [
                    'booked_at' => $start->toIso8601String(),
                    'end_at' => $end->toIso8601String(),
                    'date_label' => $start->format('d/m/Y'),
                    'start_time' => $start->format('H:i'),
                    'end_time' => $end->format('H:i'),
                    'duration' => $booking->service->duration,
                    'service' => $booking->service->name,
                    'status' => $booking->status,
                    'payment_status' => $booking->payment_status,
                ];
            })
            ->values();

        return response()->json($bookings);
    }

    public function checkSlot(Request $request, $readerId)
    {
        $request->validate([
            'booked_at' => 'required|date|after:now',
            'service_id' => 'required|exists:services,id',
        ]);

        $service = Service::findOrFail($request->service_id);
        $reader = Reader::findOrFail($readerId);
        $newStart = Carbon::parse($request->booked_at, config('app.timezone'));
        $newEnd = $newStart->copy()->addMinutes($service->duration);

        if (!app(ReaderAvailabilityService::class)->isSlotAllowed($reader, $newStart, (int) $service->duration)) {
            return response()->json([
                'available' => false,
                'message' => 'Reader khong mo lich trong khung gio nay. Vui long chon thoi gian khac.',
            ]);
        }

        $bookings = Booking::with('service')
            ->where('reader_id', $readerId)
            ->where(fn($query) => $this->blockingBookingQuery($query))
            ->whereDate('booked_at', $newStart->toDateString())
            ->get();

        $conflict = $bookings->first(function (Booking $booking) use ($newStart, $newEnd) {
            $existingStart = $booking->booked_at->copy();
            $existingEnd = $existingStart->copy()->addMinutes($booking->service->duration);

            return $newStart->lt($existingEnd) && $newEnd->gt($existingStart);
        });

        return response()->json([
            'available' => !$conflict,
            'message' => $conflict
                ? 'Reader da co lich tu ' . $conflict->booked_at->format('H:i') . ' den ' . $conflict->booked_at->copy()->addMinutes($conflict->service->duration)->format('H:i') . '. Vui long chon thoi gian khac.'
                : 'Khung gio nay con trong.',
        ]);
    }

    private function blockingBookingQuery($query)
    {
        return $query
            ->whereNotIn('status', ['cancelled', 'completed'])
            ->where(function ($activeBooking) {
                $activeBooking
                    ->where('status', '!=', 'pending')
                    ->orWhereIn('payment_status', ['pending_verification', 'paid'])
                    ->orWhereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            });
    }
}
