<?php

return [
    'register' => env('AUTH_REGISTER_THROTTLE', '30,1'),
    'login' => env('AUTH_LOGIN_THROTTLE', '10,1'),
    'login_email_per_minute' => (int) env('AUTH_LOGIN_EMAIL_PER_MINUTE', 5),
    'password' => env('AUTH_PASSWORD_THROTTLE', '20,1'),
    'session' => env('AUTH_SESSION_THROTTLE', '240,1'),
];
