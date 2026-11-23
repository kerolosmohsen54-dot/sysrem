<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InventoryBalance extends Model
{
    protected $table = 'inventory_balances';
    public $incrementing = false;
    public $timestamps = false;
}
