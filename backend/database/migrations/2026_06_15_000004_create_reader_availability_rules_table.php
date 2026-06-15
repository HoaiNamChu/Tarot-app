<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reader_availability_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reader_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('weekday');
            $table->time('start_time')->default('09:00:00');
            $table->time('end_time')->default('22:00:00');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['reader_id', 'weekday']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reader_availability_rules');
    }
};
