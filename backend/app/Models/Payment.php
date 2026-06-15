<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    // protected $guarded = [];
    const PENDING = 'pending';
    const SUCCESS = 'success';
    const FAILED  = 'failed';
    const REFUNDED = 'refunded';
    const EXPIRED = 'expired';


    protected $fillable = [
        'booking_id',
        'gateway',
        'amount',
        'status',
        'transaction_code',
        'paid_at',
        'proof_code',
        'proof_note',
        'submitted_at',
        'verified_by',
        'verified_at',
        'refund_amount',
        'refund_reference',
        'refund_reason',
        'refund_note',
        'refunded_by',
        'refunded_at',
        'payload',
    ];

    protected $casts = [
        'payload' => 'array',
        'submitted_at' => 'datetime',
        'verified_at' => 'datetime',
        'refunded_at' => 'datetime',
    ];

    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }
}
