<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SalesOrderReservationAllocation extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'reservation_id',
        'location_id',
        'quantity',
        'created_at',
    ];

    protected function casts(): array
    {
        return ['quantity' => 'integer', 'created_at' => 'immutable_datetime'];
    }

    public function reservation(): BelongsTo
    {
        return $this->belongsTo(SalesOrderReservation::class, 'reservation_id');
    }
}
