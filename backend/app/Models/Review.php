<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Review extends Model
{
    protected $fillable = ['user_id', 'booking_id', 'reader_id', 'stars', 'content'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }
    public function reader()
    {
        return $this->belongsTo(Reader::class);
    }
}
