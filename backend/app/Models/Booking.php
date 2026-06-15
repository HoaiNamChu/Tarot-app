<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Booking extends Model
{
    protected $fillable = [
        'user_id',
        'reader_id',
        'service_id',
        'note',
        'booked_at',
        'status',
        'payment_status',
        'payment_method',
        'zoom_link',
        'order_code',
        'expires_at',
        'paid_at',
        'cancelled_at',
        'completed_at',
        'reminder_24h_sent_at',
        'reminder_1h_sent_at',
    ];

    protected $casts = [
        'booked_at'    => 'datetime',
        'expires_at'   => 'datetime',
        'paid_at'      => 'datetime',
        'cancelled_at' => 'datetime',
        'completed_at' => 'datetime',
        'reminder_24h_sent_at' => 'datetime',
        'reminder_1h_sent_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function reader()
    {
        return $this->belongsTo(Reader::class);
    }

    public function service()
    {
        return $this->belongsTo(Service::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    public function latestPayment()
    {
        return $this->hasOne(Payment::class)->latestOfMany();
    }
}
