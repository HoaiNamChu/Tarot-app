<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'phone')) {
                $table->string('phone')->nullable()->after('email');
            }
            if (!Schema::hasColumn('users', 'customer_type')) {
                $table->string('customer_type')->default('active')->after('role');
            }
            if (!Schema::hasColumn('users', 'customer_status')) {
                $table->string('customer_status')->default('active')->after('customer_type');
            }
            if (!Schema::hasColumn('users', 'internal_note')) {
                $table->text('internal_note')->nullable()->after('customer_status');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $columns = array_filter(['phone', 'customer_type', 'customer_status', 'internal_note'], fn($column) => Schema::hasColumn('users', $column));
            if ($columns) {
                $table->dropColumn($columns);
            }
        });
    }
};
