<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            if (!Schema::hasColumn('reviews', 'status')) {
                $table->string('status')->default('approved')->after('content');
            }
            if (!Schema::hasColumn('reviews', 'admin_reply')) {
                $table->text('admin_reply')->nullable()->after('status');
            }
            if (!Schema::hasColumn('reviews', 'reply_visible')) {
                $table->boolean('reply_visible')->default(true)->after('admin_reply');
            }
            if (!Schema::hasColumn('reviews', 'replied_at')) {
                $table->timestamp('replied_at')->nullable()->after('reply_visible');
            }
        });
    }

    public function down(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            $columns = array_filter(['status', 'admin_reply', 'reply_visible', 'replied_at'], fn($column) => Schema::hasColumn('reviews', $column));
            if ($columns) {
                $table->dropColumn($columns);
            }
        });
    }
};
