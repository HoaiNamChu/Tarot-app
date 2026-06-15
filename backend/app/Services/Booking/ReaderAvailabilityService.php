<?php

namespace App\Services\Booking;

use App\Models\Reader;
use App\Models\ReaderAvailabilityRule;
use Carbon\Carbon;
use Illuminate\Validation\ValidationException;

class ReaderAvailabilityService
{
    public function assertSlotAllowed(Reader $reader, Carbon $start, int $durationMinutes): void
    {
        if (!$this->isSlotAllowed($reader, $start, $durationMinutes)) {
            throw ValidationException::withMessages([
                'booked_at' => 'Reader khong mo lich trong khung gio nay.',
            ]);
        }
    }

    public function isSlotAllowed(Reader $reader, Carbon $start, int $durationMinutes): bool
    {
        $rules = $reader->availabilityRules()->get();
        if ($rules->isEmpty()) {
            return true;
        }

        $rule = $rules->firstWhere('weekday', $start->dayOfWeek);
        if (!$rule || !$rule->is_active) {
            return false;
        }

        $end = $start->copy()->addMinutes($durationMinutes);
        $windowStart = $start->copy()->setTimeFromTimeString($rule->start_time);
        $windowEnd = $start->copy()->setTimeFromTimeString($rule->end_time);

        return $start->greaterThanOrEqualTo($windowStart) && $end->lessThanOrEqualTo($windowEnd);
    }

    public function formatRules(Reader $reader): array
    {
        $rules = $reader->availabilityRules()->orderBy('weekday')->get()->keyBy('weekday');
        $hasRules = $rules->isNotEmpty();

        return collect(range(0, 6))->map(function (int $weekday) use ($rules, $hasRules) {
            $rule = $rules->get($weekday);

            return [
                'weekday' => $weekday,
                'is_active' => $rule ? (bool) $rule->is_active : !$hasRules,
                'start_time' => $rule ? substr((string) $rule->start_time, 0, 5) : '09:00',
                'end_time' => $rule ? substr((string) $rule->end_time, 0, 5) : '22:00',
            ];
        })->values()->all();
    }

    public function syncRules(Reader $reader, array $rules): array
    {
        foreach ($rules as $rule) {
            ReaderAvailabilityRule::updateOrCreate(
                [
                    'reader_id' => $reader->id,
                    'weekday' => $rule['weekday'],
                ],
                [
                    'start_time' => $rule['start_time'],
                    'end_time' => $rule['end_time'],
                    'is_active' => $rule['is_active'] ?? true,
                ]
            );
        }

        return $this->formatRules($reader->refresh());
    }
}
