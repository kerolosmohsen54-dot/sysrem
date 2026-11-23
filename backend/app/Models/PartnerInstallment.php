<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PartnerInstallment extends Model
{
    protected $fillable = ['plan_id', 'sequence_number', 'due_date', 'amount', 'paid_amount', 'paid_at'];
    protected function casts(): array { return ['due_date' => 'date:Y-m-d', 'amount' => 'decimal:4', 'paid_amount' => 'decimal:4', 'paid_at' => 'datetime']; }
}
