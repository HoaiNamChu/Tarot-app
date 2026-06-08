<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {

            $table->index([
                'reader_id',
                'booked_at'
            ]);

            $table->index([
                'user_id',
                'status'
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {

            $table->dropIndex([
                'reader_id',
                'booked_at'
            ]);

            $table->dropIndex([
                'user_id',
                'status'
            ]);
        });
    }
};
