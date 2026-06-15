<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AppNotification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $limit = min((int) $request->query('limit', 20), 50);

        $items = AppNotification::where('user_id', $request->user()->id)
            ->latest()
            ->limit($limit)
            ->get();

        return response()->json([
            'unread_count' => AppNotification::where('user_id', $request->user()->id)->whereNull('read_at')->count(),
            'items' => $items->map(fn(AppNotification $item) => $this->format($item))->values(),
        ]);
    }

    public function markRead(Request $request, $id)
    {
        $notification = AppNotification::where('user_id', $request->user()->id)->findOrFail($id);
        $notification->update(['read_at' => now()]);

        return response()->json($this->format($notification->refresh()));
    }

    public function markAllRead(Request $request)
    {
        AppNotification::where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['message' => 'Da danh dau tat ca thong bao la da doc.']);
    }

    private function format(AppNotification $item): array
    {
        return [
            'id' => $item->id,
            'audience' => $item->audience,
            'type' => $item->type,
            'title' => $item->title,
            'body' => $item->body,
            'action_url' => $item->action_url,
            'data' => $item->data,
            'read_at' => $item->read_at?->toIso8601String(),
            'created_at' => $item->created_at?->toIso8601String(),
        ];
    }
}
