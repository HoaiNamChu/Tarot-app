<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    // protected $guarded = [];
    const PENDING = 'pending';
    const SUCCESS = 'success';
    const FAILED  = 'failed';
    const EXPIRED = 'expired';


    protected $fillable = [
        'booking_id',
        'gateway',
        'amount',
        'status',
        'transaction_code',
        'payload',
    ];

    protected $casts = [
        'payload' => 'array'
    ];

    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }
}
