<!DOCTYPE html>
<html>

<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: Arial, sans-serif;
            background: #0d0b12;
            color: #f0e8d8;
            margin: 0;
            padding: 0;
        }

        .wrap {
            max-width: 560px;
            margin: 0 auto;
            padding: 32px 16px;
        }

        .logo {
            color: #c8a96e;
            font-size: 22px;
            font-weight: 700;
            margin-bottom: 20px;
            text-align: center;
        }

        .box {
            background: #1a1625;
            border: 1px solid rgba(200, 169, 110, .18);
            border-radius: 8px;
            padding: 24px;
        }

        h1 {
            color: #f0e8d8;
            font-size: 20px;
            margin: 0 0 16px;
        }

        p {
            color: #b8aacd;
            font-size: 14px;
            line-height: 1.7;
        }

        .btn {
            display: inline-block;
            background: #c8a96e;
            color: #0d0b12;
            padding: 12px 22px;
            border-radius: 4px;
            text-decoration: none;
            font-weight: 700;
            margin: 14px 0;
        }

        .url {
            color: #c8a96e;
            word-break: break-all;
            font-size: 12px;
        }
    </style>
</head>

<body>
    <div class="wrap">
        <div class="logo">Luna Arcana</div>
        <div class="box">
            <h1>Dat lai mat khau</h1>
            <p>Ban vua yeu cau dat lai mat khau cho tai khoan Luna Arcana.</p>
            <p>Duong dan nay het han sau {{ $expiresInMinutes }} phut. Neu ban khong yeu cau, hay bo qua email nay.</p>
            <p><a class="btn" href="{{ $resetUrl }}">Dat lai mat khau</a></p>
            <p>Neu nut tren khong hoat dong, hay mo duong dan sau:</p>
            <p class="url">{{ $resetUrl }}</p>
        </div>
    </div>
</body>

</html>
