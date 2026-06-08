<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {

            $table->timestamp('paid_at')
                ->nullable()
                ->after('payment_status');

            $table->timestamp('cancelled_at')
                ->nullable()
                ->after('paid_at');

            $table->timestamp('completed_at')
                ->nullable()
                ->after('cancelled_at');
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {

            $table->dropColumn([
                'paid_at',
                'cancelled_at',
                'completed_at'
            ]);
        });
    }
};
