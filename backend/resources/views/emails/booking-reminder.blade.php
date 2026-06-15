<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; background: #0d0b12; color: #f0e8d8; margin: 0; padding: 0; }
        .wrap { max-width: 560px; margin: 0 auto; padding: 32px 16px; }
        .card { background: #1a1625; border: 1px solid rgba(200, 169, 110, .2); border-radius: 8px; padding: 24px; }
        .brand { color: #c8a96e; font-size: 20px; font-weight: 700; margin-bottom: 8px; }
        h1 { font-size: 22px; margin: 0 0 16px; }
        p { color: #b8aec8; line-height: 1.65; }
        .row { border-top: 1px solid rgba(255,255,255,.08); padding: 10px 0; display: flex; justify-content: space-between; gap: 16px; }
        .label { color: #847893; }
        .value { color: #f0e8d8; text-align: right; }
        .button { display: inline-block; margin-top: 18px; background: #c8a96e; color: #0d0b12; padding: 12px 18px; border-radius: 4px; text-decoration: none; font-weight: 700; }
    </style>
</head>
<body>
    <div class="wrap">
        <div class="card">
            <div class="brand">Luna Arcana</div>
            <h1>Nhac lich hen {{ $windowLabel }}</h1>
            <p>
                @if ($recipientRole === 'reader')
                    Ban co lich doc bai sap dien ra. Vui long kiem tra thong tin va chuan bi phong hop neu can.
                @else
                    Lich hen cua ban sap dien ra. Vui long kiem tra thoi gian va link tham gia neu da duoc cap nhat.
                @endif
            </p>

            <div class="row">
                <span class="label">Ma lich</span>
                <span class="value">BK-{{ str_pad($booking->id, 4, '0', STR_PAD_LEFT) }}</span>
            </div>
            <div class="row">
                <span class="label">Reader</span>
                <span class="value">{{ $booking->reader?->name ?? 'Reader' }}</span>
            </div>
            <div class="row">
                <span class="label">Dich vu</span>
                <span class="value">{{ $booking->service?->name ?? 'Dich vu' }}</span>
            </div>
            <div class="row">
                <span class="label">Thoi gian</span>
                <span class="value">{{ $booking->booked_at?->format('H:i d/m/Y') }}</span>
            </div>

            @if ($booking->zoom_link)
                <a class="button" href="{{ $booking->zoom_link }}">Vao phong hop</a>
            @elseif ($recipientRole !== 'reader')
                <p>Link phong hop se duoc cap nhat trong dashboard cua ban khi reader hoac admin them link.</p>
            @endif
        </div>
    </div>
</body>
</html>
