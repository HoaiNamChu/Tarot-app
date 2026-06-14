<!DOCTYPE html>
<html>

<head>
    <meta charset="UTF-8">
</head>

<body style="font-family: Arial, sans-serif; background:#0d0b12; color:#f0e8d8; padding:24px;">
    <div style="max-width:560px;margin:0 auto;background:#1a1625;border:1px solid rgba(200,169,110,.18);border-radius:8px;padding:24px;">
        <h1 style="font-size:20px;color:#c8a96e;margin-top:0;">Luna Arcana mail test</h1>
        <p>Neu ban nhan duoc email nay, cau hinh SMTP dang hoat dong.</p>
        <p style="color:#b8aacd;font-size:13px;">
            From: {{ config('mail.from.name') }} &lt;{{ config('mail.from.address') }}&gt;<br>
            Frontend: {{ config('tarot.frontend_url') }}<br>
            Sent at: {{ now()->format('Y-m-d H:i:s') }}
        </p>
    </div>
</body>

</html>
