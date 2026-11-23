<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RecurringExpenseOccurrence extends Model
{
    protected $fillable = ['template_id', 'period_start', 'due_date', 'amount', 'status', 'expense_id', 'created_by_user_id'];
    protected function casts(): array { return ['period_start' => 'date:Y-m-d', 'due_date' => 'date:Y-m-d', 'amount' => 'decimal:4']; }
}
