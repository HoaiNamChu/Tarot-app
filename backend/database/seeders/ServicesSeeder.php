<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class ServicesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $services = [
            ['name' => 'Đọc Bài Tổng Quan', 'description' => 'Giải mã năng lượng hiện tại, định hướng chung cho tình cảm và sự nghiệp trong thời gian tới.', 'duration' => 30, 'price' => 250000],
            ['name' => 'Chữa Lành Chuyên Sâu', 'description' => 'Đi sâu vào tổn thương quá khứ, giải quyết triệt để nút thắt tâm lý bằng năng lượng Tarot & Oracle.', 'duration' => 60, 'price' => 450000],
            ['name' => 'Trải Bài Năm/Tháng', 'description' => 'Dự báo chi tiết 12 tháng, lên kế hoạch hành động và né tránh các rủi ro năng lượng.', 'duration' => 90, 'price' => 600000],
        ];

        foreach ($services as $service) {
            \App\Models\Service::create($service);
        }
    }
}
