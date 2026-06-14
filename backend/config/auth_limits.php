<?php

return [
    'register' => env('AUTH_REGISTER_THROTTLE', '30,1'),
    'login' => env('AUTH_LOGIN_THROTTLE', '60,1'),
    'password' => env('AUTH_PASSWORD_THROTTLE', '20,1'),
    'session' => env('AUTH_SESSION_THROTTLE', '240,1'),
];
