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
                MODIFY COLUMN `status`
                ENUM('pending','confirmed','completion_pending','completed','cancelled')
                NOT NULL DEFAULT 'pending'
            ");
        }

        Schema::table('bookings', function (Blueprint $table) {
            if (!Schema::hasColumn('bookings', 'completion_requested_at')) {
                $table->timestamp('completion_requested_at')->nullable()->after('completed_at');
            }

            if (!Schema::hasColumn('bookings', 'completion_auto_complete_at')) {
                $table->timestamp('completion_auto_complete_at')->nullable()->after('completion_requested_at');
            }

            if (!Schema::hasColumn('bookings', 'completion_confirmed_at')) {
                $table->timestamp('completion_confirmed_at')->nullable()->after('completion_auto_complete_at');
            }

            if (!Schema::hasColumn('bookings', 'completion_disputed_at')) {
                $table->timestamp('completion_disputed_at')->nullable()->after('completion_confirmed_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $columns = array_filter([
                'completion_requested_at',
                'completion_auto_complete_at',
                'completion_confirmed_at',
                'completion_disputed_at',
            ], fn (string $column) => Schema::hasColumn('bookings', $column));

            if ($columns) {
                $table->dropColumn($columns);
            }
        });

        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("
                ALTER TABLE `bookings`
                MODIFY COLUMN `status`
                ENUM('pending','confirmed','completed','cancelled')
                NOT NULL DEFAULT 'pending'
            ");
        }
    }
};
