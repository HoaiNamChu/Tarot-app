<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DailyReading extends Model
{
    protected $fillable = ['user_id', 'ip_address', 'count', 'date'];

    protected $casts = ['date' => 'date'];
}
