<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("
                ALTER TABLE `bookings`
                MODIFY COLUMN `payment_status`
                ENUM('unpaid','pending_verification','paid','refund_pending','refunded')
                NOT NULL DEFAULT 'unpaid'
            ");
        } else {
            Schema::table('bookings', function (Blueprint $table) {
                $table->enum('payment_status', [
                    'unpaid',
                    'pending_verification',
                    'paid',
                    'refund_pending',
                    'refunded',
                ])->default('unpaid')->change();
            });
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("
                UPDATE `bookings`
                SET `payment_status` = 'paid'
                WHERE `payment_status` = 'refund_pending'
            ");

            DB::statement("
                ALTER TABLE `bookings`
                MODIFY COLUMN `payment_status`
                ENUM('unpaid','pending_verification','paid','refunded')
                NOT NULL DEFAULT 'unpaid'
            ");
        } else {
            DB::table('bookings')
                ->where('payment_status', 'refund_pending')
                ->update(['payment_status' => 'paid']);

            Schema::table('bookings', function (Blueprint $table) {
                $table->enum('payment_status', [
                    'unpaid',
                    'pending_verification',
                    'paid',
                    'refunded',
                ])->default('unpaid')->change();
            });
        }
    }
};
