<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class ReadersSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $readers = [
            ['name' => 'Luna', 'title' => 'Tình Cảm & Chữa Lành', 'bio' => 'Chuyên gia Tarot với 5 năm kinh nghiệm. Nổi bật với sự dịu dàng và những thông điệp chữa lành sâu sắc.', 'avatar' => '🔮'],
            ['name' => 'Sol', 'title' => 'Sự Nghiệp & Định Hướng', 'bio' => 'Góc nhìn thực tế, sắc bén. Giúp bạn tìm ra nút thắt trong công việc và vạch ra lộ trình rõ ràng.', 'avatar' => '☀️'],
            ['name' => 'Nova', 'title' => 'Chiêm Tinh & Bản Đồ Sao', 'bio' => 'Kết hợp Tarot và Chiêm Tinh học để đọc thấu bản nguyên tâm hồn và con đường vận mệnh.', 'avatar' => '🌠'],
            ['name' => 'Aura', 'title' => 'Trực Giác & Năng Lượng', 'bio' => 'Sử dụng Oracle và cảm xạ học để làm sạch năng lượng, kết nối bạn với Higher Self.', 'avatar' => '🌿'],
        ];

        foreach ($readers as $reader) {
            \App\Models\Reader::create($reader);
        }
    }
}
