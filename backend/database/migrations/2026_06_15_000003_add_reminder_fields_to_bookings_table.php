<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            if (!Schema::hasColumn('bookings', 'reminder_24h_sent_at')) {
                $table->timestamp('reminder_24h_sent_at')->nullable()->after('completed_at');
            }

            if (!Schema::hasColumn('bookings', 'reminder_1h_sent_at')) {
                $table->timestamp('reminder_1h_sent_at')->nullable()->after('reminder_24h_sent_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $columns = array_filter(
                ['reminder_24h_sent_at', 'reminder_1h_sent_at'],
                fn (string $column) => Schema::hasColumn('bookings', $column)
            );

            if ($columns) {
                $table->dropColumn($columns);
            }
        });
    }
};
