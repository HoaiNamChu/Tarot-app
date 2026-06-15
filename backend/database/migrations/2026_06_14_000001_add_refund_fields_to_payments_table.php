<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->decimal('refund_amount', 12, 2)->nullable()->after('verified_at');
            $table->string('refund_reference')->nullable()->after('refund_amount');
            $table->text('refund_reason')->nullable()->after('refund_reference');
            $table->text('refund_note')->nullable()->after('refund_reason');
            $table->foreignId('refunded_by')->nullable()->after('refund_note')->constrained('users')->nullOnDelete();
            $table->timestamp('refunded_at')->nullable()->after('refunded_by');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('refunded_by');
            $table->dropColumn([
                'refund_amount',
                'refund_reference',
                'refund_reason',
                'refund_note',
                'refunded_at',
            ]);
        });
    }
};
