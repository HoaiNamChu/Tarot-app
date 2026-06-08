<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {

            $table->timestamp('paid_at')
                ->nullable()
                ->after('amount');

            $table->index([
                'booking_id',
                'status'
            ]);

            $table->index('transaction_code');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {

            $table->dropIndex([
                'booking_id',
                'status'
            ]);

            $table->dropIndex([
                'transaction_code'
            ]);

            $table->dropColumn([
                'paid_at'
            ]);
        });
    }
};
