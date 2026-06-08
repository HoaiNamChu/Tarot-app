<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReadingInterpretation extends Model
{
    protected $fillable = ['user_id', 'ip_address', 'question', 'cards', 'interpretation'];

    protected $casts = ['cards' => 'array'];
}
