<?php

return [
    'frontend_url' => env('FRONTEND_URL', env('APP_URL', 'http://localhost')),
    'admin_email' => env('ADMIN_EMAIL', 'admin@lunaarcana.com'),

    'daily_limits' => [
        'guest' => (int) env('DAILY_LIMIT_GUEST', 3),
        'user' => (int) env('DAILY_LIMIT_USER', 5),
    ],

    'bank' => [
        'name' => env('BANK_NAME', 'Vietcombank'),
        'bin' => env('BANK_BIN', '970436'),
        'account_number' => env('BANK_ACCOUNT_NUMBER', '1234 5678 9012'),
        'account_name' => env('BANK_ACCOUNT_NAME', 'LUNA ARCANA'),
        'transfer_prefix' => env('BANK_TRANSFER_PREFIX', 'LUNA'),
    ],

    'ai' => [
        'anthropic_key' => env('ANTHROPIC_API_KEY'),
        'gemini_key' => env('GEMINI_API_KEY'),
        'groq_key' => env('GROQ_API_KEY'),
    ],
];
