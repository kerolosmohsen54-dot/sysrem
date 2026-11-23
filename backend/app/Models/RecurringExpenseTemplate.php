<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RecurringExpenseTemplate extends Model
{
    protected $fillable = ['name', 'expense_category_id', 'amount', 'due_day', 'start_date', 'status', 'notes', 'stopped_at', 'created_by_user_id', 'updated_by_user_id'];
    protected function casts(): array { return ['amount' => 'decimal:4', 'start_date' => 'date:Y-m-d', 'stopped_at' => 'datetime']; }
}
