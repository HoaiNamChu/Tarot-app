<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReaderAvailabilityRule extends Model
{
    protected $fillable = [
        'reader_id',
        'weekday',
        'start_time',
        'end_time',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function reader()
    {
        return $this->belongsTo(Reader::class);
    }
}
