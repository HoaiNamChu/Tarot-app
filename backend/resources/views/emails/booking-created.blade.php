<!DOCTYPE html>
<html>

<head>
    <meta charset="UTF-8">
    <style>
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
            margin-bottom: .3rem;
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
            margin: 1rem 0;
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
            <div class="title">✦ Đặt lịch thành công!</div>
            <p>Xin chào <strong style="color:#f0e8d8">{{ $booking->user->name }}</strong>,</p>
            <p>Chúng tôi đã nhận được yêu cầu đặt lịch của bạn. Đây là thông tin chi tiết:</p>

            <div class="info-box">
                <div class="info-row">
                    <span class="info-label">Mã đặt lịch</span>
                    <span class="info-value gold">BK-{{ str_pad($booking->id, 4, '0', STR_PAD_LEFT) }}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Dịch vụ</span>
                    <span class="info-value">{{ $booking->service->name }}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Reader</span>
                    <span class="info-value">{{ $booking->reader->avatar }} {{ $booking->reader->name }}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Thời gian</span>
                    <span class="info-value">{{ $booking->booked_at->format('H:i — d/m/Y') }}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Thời lượng</span>
                    <span class="info-value">{{ $booking->service->duration }} phút</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Giá</span>
                    <span class="info-value gold">{{ number_format($booking->service->price, 0, ',', '.') }}đ</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Trạng thái</span>
                    <span class="info-value">⏳ Đang chờ xác nhận</span>
                </div>
            </div>

            <p>Chúng tôi sẽ xác nhận lịch và gửi link Google Meet cho bạn trong vòng <strong style="color:#f0e8d8">15-30
                    phút</strong>.</p>
            <p>Nếu bạn có thắc mắc, hãy reply email này hoặc liên hệ fanpage của chúng tôi.</p>

            <div style="text-align:center">
                <a href="{{ rtrim(config('tarot.frontend_url'), '/') }}/dashboard" class="btn">Xem lịch của
                    tôi</a>
            </div>
        </div>

        <div class="footer">
            © 2026 Luna Arcana · <a href="#" style="color:#c8a96e">Huỷ đăng ký nhận email</a>
        </div>
    </div>
</body>

</html>
