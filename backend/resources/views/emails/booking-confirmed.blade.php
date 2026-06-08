<!DOCTYPE html>
<html>

<head>
    <meta charset="UTF-8">
    <style>
        /* giống booking-created */
        body {
            font-family: 'Segoe UI', sans-serif;
            background: #0d0b12;
            color: #f0e8d8;
            margin: 0;
            padding: 0;
        }

        .wrap {
            max-width: 560px;
            margin: 0 auto;
            padding: 2rem 1rem;
        }

        .header {
            text-align: center;
            padding: 2rem 0 1.5rem;
            border-bottom: 1px solid rgba(200, 169, 110, .2);
        }

        .logo {
            font-size: 1.4rem;
            color: #c8a96e;
            font-weight: 700;
        }

        .sub {
            font-size: .8rem;
            color: #6b5f80;
            letter-spacing: .2em;
            text-transform: uppercase;
        }

        .body {
            padding: 1.75rem 0;
        }

        .title {
            font-size: 1.2rem;
            color: #f0e8d8;
            margin-bottom: 1rem;
        }

        .info-box {
            background: #1a1625;
            border: 1px solid rgba(200, 169, 110, .15);
            border-radius: 6px;
            padding: 1.25rem;
            margin: 1.25rem 0;
        }

        .info-row {
            display: flex;
            justify-content: space-between;
            padding: .5rem 0;
            border-bottom: 1px solid rgba(255, 255, 255, .06);
            font-size: .88rem;
        }

        .info-row:last-child {
            border-bottom: none;
        }

        .info-label {
            color: #6b5f80;
        }

        .info-value {
            color: #f0e8d8;
            font-weight: 500;
        }

        .gold {
            color: #c8a96e;
        }

        .zoom-box {
            background: rgba(124, 106, 247, .1);
            border: 1px solid rgba(124, 106, 247, .3);
            border-radius: 6px;
            padding: 1.25rem;
            margin: 1.25rem 0;
            text-align: center;
        }

        .zoom-link {
            color: #7c6af7;
            font-size: .95rem;
            word-break: break-all;
        }

        .btn {
            display: inline-block;
            background: #c8a96e;
            color: #0d0b12;
            padding: .85rem 2rem;
            border-radius: 4px;
            text-decoration: none;
            font-weight: 600;
            font-size: .85rem;
            letter-spacing: .1em;
            text-transform: uppercase;
            margin: .5rem;
        }

        .btn-zoom {
            background: #7c6af7;
            color: #fff;
        }

        .footer {
            text-align: center;
            padding: 1.5rem 0;
            border-top: 1px solid rgba(200, 169, 110, .1);
            font-size: .75rem;
            color: #6b5f80;
        }

        p {
            font-size: .88rem;
            color: #9486aa;
            line-height: 1.7;
        }
    </style>
</head>

<body>
    <div class="wrap">
        <div class="header">
            <div class="logo">🌙 Luna Arcana</div>
            <div class="sub">Tarot · Chiêm tinh · Huyền học</div>
        </div>

        <div class="body">
            <div class="title">✦ Lịch đặt đã được xác nhận!</div>
            <p>Xin chào <strong style="color:#f0e8d8">{{ $booking->user->name }}</strong>,</p>
            <p>Lịch đặt của bạn đã được <strong style="color:#4ade80">xác nhận</strong>. Hẹn gặp bạn vào:</p>

            <div class="info-box">
                <div class="info-row">
                    <span class="info-label">Mã đặt lịch</span>
                    <span class="info-value gold">BK-{{ str_pad($booking->id, 4, '0', STR_PAD_LEFT) }}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Reader</span>
                    <span class="info-value">{{ $booking->reader->avatar }} {{ $booking->reader->name }}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Dịch vụ</span>
                    <span class="info-value">{{ $booking->service->name }} ({{ $booking->service->duration }}
                        phút)</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Thời gian</span>
                    <span class="info-value gold">{{ $booking->booked_at->format('H:i — d/m/Y') }}</span>
                </div>
            </div>

            @if ($booking->zoom_link)
                <div class="zoom-box">
                    <div style="font-size:.8rem;color:#9486aa;margin-bottom:.5rem">Link tham gia buổi đọc bài</div>
                    <div class="zoom-link">{{ $booking->zoom_link }}</div>
                    <a href="{{ $booking->zoom_link }}" class="btn btn-zoom"
                        style="margin-top:.85rem;display:inline-block">
                        🎥 Vào phòng Google Meet
                    </a>
                </div>
            @else
                <p>Link Google Meet sẽ được gửi cho bạn trước buổi đọc bài <strong style="color:#f0e8d8">30
                        phút</strong>.</p>
            @endif

            <p>Hãy chuẩn bị không gian yên tĩnh và tập trung vào câu hỏi bạn muốn giải đáp nhé.</p>

            <div style="text-align:center">
                <a href="{{ env('FRONTEND_URL', 'http://localhost:5173') }}/dashboard" class="btn">Xem lịch của
                    tôi</a>
            </div>
        </div>

        <div class="footer">
            © 2026 Luna Arcana
        </div>
    </div>
</body>

</html>
