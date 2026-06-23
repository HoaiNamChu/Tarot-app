<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            if (!Schema::hasColumn('bookings', 'cancel_reason')) {
                $table->text('cancel_reason')->nullable()->after('cancelled_at');
            }

            if (!Schema::hasColumn('bookings', 'cancelled_by')) {
                $table->string('cancelled_by', 30)->nullable()->after('cancel_reason');
            }
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $columns = array_filter(
                ['cancel_reason', 'cancelled_by'],
                fn (string $column) => Schema::hasColumn('bookings', $column)
            );

            if ($columns) {
                $table->dropColumn($columns);
            }
        });
    }
};
