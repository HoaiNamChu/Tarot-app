<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Thêm 'expired' vào enum payments.status
        DB::statement("
            ALTER TABLE `payments`
            MODIFY COLUMN `status`
            ENUM('pending','success','failed','refunded','expired')
            NOT NULL
        ");

        // 2. Backfill cancelled_at
        DB::statement("
            UPDATE `bookings`
            SET `cancelled_at` = `updated_at`
            WHERE `status` = 'cancelled' AND `cancelled_at` IS NULL
        ");

        // 3. Backfill completed_at
        DB::statement("
            UPDATE `bookings`
            SET `completed_at` = `updated_at`
            WHERE `status` = 'completed' AND `completed_at` IS NULL
        ");

        // 4. Backfill paid_at
        DB::statement("
            UPDATE `bookings`
            SET `paid_at` = `updated_at`
            WHERE `payment_status` = 'paid' AND `paid_at` IS NULL
        ");
    }

    public function down(): void
    {
        DB::statement("
            ALTER TABLE `payments`
            MODIFY COLUMN `status`
            ENUM('pending','success','failed','refunded')
            NOT NULL
        ");
    }
};
