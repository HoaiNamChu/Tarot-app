<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use RuntimeException;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $email = strtolower(trim((string) env('ADMIN_EMAIL', 'admin@example.com')));
        $password = (string) env('ADMIN_PASSWORD');

        if ($password === '') {
            throw new RuntimeException('Set ADMIN_PASSWORD in the environment before seeding the admin account.');
        }

        User::updateOrCreate(
            ['email' => $email],
            [
                'name' => 'Administrator',
                'password' => $password,
                'role' => 'admin',
            ],
        );
    }
}
