<?php

namespace Database\Seeders;

use App\Models\Booking;
use App\Models\User;
use App\Models\Reader;
use App\Models\Service;
use Illuminate\Database\Seeder;

class BookingsSeeder extends Seeder
{
    public function run(): void
    {
        // Lấy data có sẵn
        $readers  = Reader::all();
        $services = Service::all();

        // Tạo user test nếu chưa có
        $user = User::firstOrCreate(
            ['email' => 'test@lunaarcana.com'],
            [
                'name'     => 'Nguyễn Thị Test',
                'password' => bcrypt('password123'),
                'role'     => 'user',
            ]
        );

        $bookings = [
            // Sắp tới — confirmed, chưa thanh toán
            [
                'reader_id'      => $readers[0]->id, // Luna
                'service_id'     => $services[0]->id, // 30 phút
                'booked_at'      => now()->addDays(3)->setTime(14, 0),
                'status'         => 'confirmed',
                'payment_status' => 'unpaid',
                'note'           => 'Mình đang băn khoăn về chuyện tình cảm',
            ],
            // Sắp tới — confirmed, đã thanh toán
            [
                'reader_id'      => $readers[1]->id, // Sol
                'service_id'     => $services[1]->id, // 60 phút
                'booked_at'      => now()->addDays(7)->setTime(16, 0),
                'status'         => 'confirmed',
                'payment_status' => 'paid',
                'payment_method' => 'momo',
                'zoom_link'      => 'https://meet.google.com/abc-defg-hij',
                'note'           => 'Muốn hỏi về định hướng sự nghiệp',
            ],
            // Sắp tới — pending, chưa thanh toán
            [
                'reader_id'      => $readers[2]->id, // Nova
                'service_id'     => $services[2]->id, // 90 phút
                'booked_at'      => now()->addDays(14)->setTime(10, 0),
                'status'         => 'pending',
                'payment_status' => 'unpaid',
                'note'           => 'Muốn xem bản đồ năm 2026',
            ],

            // Lịch sử — completed, đã thanh toán, chưa review
            [
                'reader_id'      => $readers[0]->id,
                'service_id'     => $services[0]->id,
                'booked_at'      => now()->subDays(10)->setTime(9, 0),
                'status'         => 'completed',
                'payment_status' => 'paid',
                'payment_method' => 'bank',
                'reviewed'       => false,
            ],
            // Lịch sử — completed, đã review
            [
                'reader_id'      => $readers[1]->id,
                'service_id'     => $services[1]->id,
                'booked_at'      => now()->subDays(20)->setTime(15, 0),
                'status'         => 'completed',
                'payment_status' => 'paid',
                'payment_method' => 'vnpay',
                'reviewed'       => true,
            ],
            // Lịch sử — cancelled
            [
                'reader_id'      => $readers[3]->id, // Aura
                'service_id'     => $services[0]->id,
                'booked_at'      => now()->subDays(5)->setTime(11, 0),
                'status'         => 'cancelled',
                'payment_status' => 'unpaid',
            ],
        ];

        foreach ($bookings as $data) {
            Booking::create(array_merge($data, ['user_id' => $user->id]));
        }

        $this->command->info('✦ Đã tạo ' . count($bookings) . ' booking mẫu cho ' . $user->email);
        $this->command->info('✦ Password: password123');
    }
}
