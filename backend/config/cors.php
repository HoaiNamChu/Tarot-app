<?php

$defaultOrigins = [
    env('FRONTEND_URL', 'http://localhost:5173'),
    env('ADMIN_FRONTEND_URL', 'http://localhost:5174'),
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
];

$allowedOrigins = array_values(array_unique(array_filter(array_map(
    'trim',
    explode(',', env('CORS_ALLOWED_ORIGINS', implode(',', $defaultOrigins)))
))));

return [

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => $allowedOrigins,

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,

];
