<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;

class SalesOrderLine extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'sales_order_id',
        'line_number',
        'product_id',
        'quantity',
        'unit_price',
        'notes',
    ];

    protected function casts(): array
    {
        return ['line_number' => 'integer', 'quantity' => 'integer'];
    }

    public function reservation(): HasOne
    {
        return $this->hasOne(SalesOrderReservation::class, 'sales_order_line_id');
    }
}
