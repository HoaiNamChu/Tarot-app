<?php

namespace App\Http\Controllers\Api\PublicApi;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\DailyReading;
use App\Models\ReadingInterpretation;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class ReadingController extends Controller
{
    // Kiểm tra còn bao nhiêu lần hôm nay
    public function getLimit(Request $request)
    {
        $today = now()->toDateString();
        $user  = $request->user('sanctum'); // null nếu chưa login

        $limit = $user
            ? (int) config('tarot.daily_limits.user', 5)
            : (int) config('tarot.daily_limits.guest', 3);

        if ($user) {
            $record = DailyReading::firstOrCreate(
                ['user_id' => $user->id, 'date' => $today],
                ['count' => 0]
            );
        } else {
            $ip = $request->ip();
            $record = DailyReading::firstOrCreate(
                ['ip_address' => $ip, 'date' => $today, 'user_id' => null],
                ['count' => 0]
            );
        }

        return response()->json([
            'used'      => $record->count,
            'limit'     => $limit,
            'remaining' => max(0, $limit - $record->count),
            'can_read'  => $record->count < $limit,
        ]);
    }
    // Dùng 1 lần rút
    public function useLimit(Request $request)
    {
        $result = $this->consumeDailyLimit($request);
        if (!$result) {
            return response()->json(['message' => 'Bạn đã dùng hết lượt đọc miễn phí hôm nay. Vui lòng quay lại vào ngày mai.'], 429);
        }

        return response()->json($result);
    }
    public function interpret(Request $request)
    {
        $request->validate([
            'question' => 'required|string|max:500',
            'cards' => 'required|array|size:3',
            'cards.*.name' => 'required|string',
            'cards.*.position' => 'required|string',
            'cards.*.isReversed' => 'required|boolean',
            'cards.*.slug' => 'sometimes|string',
        ]);

        $question = $request->question;
        $cards = $request->cards;
        $limit = $this->consumeDailyLimit($request);
        if (!$limit) {
            return response()->json(['message' => 'Bạn đã dùng hết lượt đọc miễn phí hôm nay. Vui lòng quay lại vào ngày mai.'], 429);
        }

        $cardText = collect($cards)->map(
            fn($card) => "- {$card['position']}: {$card['name']}" . ($card['isReversed'] ? ' (Ngược)' : ' (Xuôi)')
        )->join("\n");

        $prompt = <<<EOT
            Bạn là một Tarot Reader chuyên nghiệp, có tâm và trực giác sâu sắc. Hãy giải nghĩa trải bài Tarot 3 lá sau bằng tiếng Việt.

            Câu hỏi của người dùng: "{$question}"

            Các lá bài được rút:
            {$cardText}

            Hãy viết phần giải nghĩa theo cấu trúc:
            1. Tổng quan năng lượng của trải bài
            2. Giải nghĩa từng lá theo vị trí (Quá khứ, Hiện tại, Tương lai)
            3. Thông điệp tổng hợp và lời khuyên

            Viết bằng giọng văn ấm áp, huyền bí nhưng thực tế. Khoảng 250-350 từ.
            EOT;

        $interpretation = $this->tryAnthropic($prompt)
            ?? $this->tryGemini($prompt)
            ?? $this->tryGroq($prompt)
            ?? $this->mockInterpretation($question, $cards);

        ReadingInterpretation::create([
            'user_id' => $request->user('sanctum')?->id,
            'ip_address' => $request->ip(),
            'question' => $question,
            'cards' => $cards,
            'interpretation' => $interpretation,
        ]);

        return response()->json(['interpretation' => $interpretation, 'limit' => $limit]);
    }

    private function consumeDailyLimit(Request $request): ?array
    {
        $today = now()->toDateString();
        $user = $request->user('sanctum');
        $limit = $user
            ? (int) config('tarot.daily_limits.user', 5)
            : (int) config('tarot.daily_limits.guest', 3);

        return DB::transaction(function () use ($today, $user, $limit, $request) {
            $identity = $user
                ? ['user_id' => $user->id, 'date' => $today]
                : ['ip_address' => $request->ip(), 'date' => $today, 'user_id' => null];

            $record = DailyReading::firstOrCreate($identity, ['count' => 0]);
            $updated = DailyReading::whereKey($record->id)
                ->where('count', '<', $limit)
                ->increment('count');

            if ($updated === 0) {
                return null;
            }

            $used = (int) $record->fresh()->count;
            return [
                'used' => $used,
                'limit' => $limit,
                'remaining' => max(0, $limit - $used),
                'can_read' => $used < $limit,
            ];
        });
    }
    public function history(Request $request)
    {
        return response()->json(
            ReadingInterpretation::where('user_id', $request->user()->id)
                ->orderBy('created_at', 'desc')
                ->limit(50)
                ->get()
                ->map(fn($reading) => [
                    'id'             => $reading->id,
                    'question'       => $reading->question,
                    'cards'          => $reading->cards,
                    'interpretation' => $reading->interpretation,
                    'created_at'     => $reading->created_at->toIso8601String(),
                    'date'           => $reading->created_at->format('d/m/Y H:i'),
                ])
        );
    }

    private function tryAnthropic(string $prompt): ?string
    {
        $apiKey = config('tarot.ai.anthropic_key');
        if (!$apiKey) return null;

        try {
            $response = Http::timeout(20)->withHeaders([
                'x-api-key'         => $apiKey,
                'anthropic-version' => '2023-06-01',
                'content-type'      => 'application/json',
            ])->post('https://api.anthropic.com/v1/messages', [
                'model'      => 'claude-sonnet-4-20250514',
                'max_tokens' => 1024,
                'messages'   => [['role' => 'user', 'content' => $prompt]],
            ]);

            if ($response->successful()) {
                Log::info('AI: Anthropic used');
                return $response->json('content.0.text');
            }
        } catch (\Exception $e) {
            Log::warning('Anthropic failed: ' . $e->getMessage());
        }

        return null;
    }

    // ── Google Gemini ──
    private function tryGemini(string $prompt): ?string
    {
        $apiKey = config('tarot.ai.gemini_key');
        if (!$apiKey) return null;

        try {
            $response = Http::timeout(20)
                ->withHeaders(['x-goog-api-key' => $apiKey])
                ->post('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', [
                    'contents' => [
                        ['parts' => [['text' => $prompt]]]
                    ],
                ]);

            if ($response->successful()) {
                Log::info('AI: Gemini used');
                return $response->json('candidates.0.content.parts.0.text');
            }
        } catch (\Exception) {
            // Do not log request URLs or exception details that could contain credentials.
            Log::warning('Gemini request failed.');
        }

        return null;
    }

    // ── Groq ──
    private function tryGroq(string $prompt): ?string
    {
        $apiKey = config('tarot.ai.groq_key');
        if (!$apiKey) return null;

        try {
            $response = Http::timeout(20)->withHeaders([
                'Authorization' => 'Bearer ' . $apiKey,
                'Content-Type'  => 'application/json',
            ])->post('https://api.groq.com/openai/v1/chat/completions', [
                'model'      => 'llama-3.3-70b-versatile',
                'max_tokens' => 1024,
                'messages'   => [['role' => 'user', 'content' => $prompt]],
            ]);

            if ($response->successful()) {
                Log::info('AI: Groq used');
                return $response->json('choices.0.message.content');
            }
        } catch (\Exception $e) {
            Log::warning('Groq failed: ' . $e->getMessage());
        }

        return null;
    }

    // ── Mock fallback ──
    private function mockInterpretation(string $question, array $cards): string
    {
        Log::info('AI: Mock used');

        $cardNames = collect($cards)->map(
            fn($c) =>
            $c['name'] . ($c['isReversed'] ? ' (Ngược)' : '')
        )->join(', ');

        return "✦ Thông điệp từ vũ trụ ✦\n\n" .
            "Với câu hỏi \"{$question}\", ba lá bài {$cardNames} " .
            "đang gửi đến bạn một thông điệp sâu sắc.\n\n" .
            "Quá khứ đã tạo nên nền tảng cho hiện tại của bạn. " .
            "Hãy nhìn nhận những bài học đã qua với lòng biết ơn thay vì hối tiếc.\n\n" .
            "Hiện tại đang đòi hỏi bạn phải đưa ra quyết định quan trọng. " .
            "Hãy tin vào trực giác và lắng nghe tiếng nói bên trong tâm hồn.\n\n" .
            "Tương lai đang mở ra những cơ hội mới. " .
            "Vũ trụ đang sắp xếp mọi thứ theo cách tốt nhất cho bạn, " .
            "hãy kiên nhẫn và tin tưởng vào hành trình của mình.\n\n" .
            "✦ Đặt lịch với Reader để được giải mã chi tiết hơn ✦";
    }
}
