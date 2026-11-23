<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SalesOrderReservation extends Model
{
    protected $fillable = [
        'sales_order_line_id',
        'cycle_number',
        'product_id',
        'quantity',
        'status',
        'created_by_user_id',
        'reserved_at',
        'released_at',
        'consumed_at',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'cycle_number' => 'integer',
            'reserved_at' => 'immutable_datetime',
            'released_at' => 'immutable_datetime',
            'consumed_at' => 'immutable_datetime',
        ];
    }

    public function orderLine(): BelongsTo
    {
        return $this->belongsTo(SalesOrderLine::class, 'sales_order_line_id');
    }

    public function allocations(): HasMany
    {
        return $this->hasMany(SalesOrderReservationAllocation::class, 'reservation_id');
    }
}
