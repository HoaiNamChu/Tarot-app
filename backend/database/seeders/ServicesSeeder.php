<?php

namespace Database\Seeders;

use App\Models\Service;
use Illuminate\Database\Seeder;

class ServicesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $services = [
            [
                'name' => 'Đọc Bài Tổng Quan',
                'description' => 'Giải mã năng lượng hiện tại, định hướng chung cho tình cảm và sự nghiệp trong thời gian tới.',
                'duration' => 30,
                'price' => 250000,
                'is_active' => true,
            ],
            [
                'name' => 'Chữa Lành Chuyên Sâu',
                'description' => 'Đi sâu vào tổn thương quá khứ, giải quyết triệt để nút thắt tâm lý bằng năng lượng Tarot & Oracle.',
                'duration' => 60,
                'price' => 450000,
                'is_active' => true,
            ],
            [
                'name' => 'Trải Bài Năm/Tháng',
                'description' => 'Dự báo chi tiết theo tháng, lên kế hoạch hành động và né tránh các rủi ro năng lượng.',
                'duration' => 90,
                'price' => 600000,
                'is_active' => true,
            ],
        ];

        foreach ($services as $service) {
            Service::updateOrCreate(
                ['name' => $service['name']],
                $service
            );
        }
    }
}
