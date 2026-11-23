<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PendingFund extends Model
{
    protected $fillable = ['partner_id', 'source_label', 'source_reference', 'description', 'due_date', 'amount', 'received_amount', 'status', 'created_by_user_id', 'updated_by_user_id'];
    protected function casts(): array { return ['due_date' => 'date:Y-m-d', 'amount' => 'decimal:4', 'received_amount' => 'decimal:4', 'cancelled_at' => 'datetime']; }
}
