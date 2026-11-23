<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ExpenseBudget extends Model
{
    protected $fillable = ['expense_category_id', 'period_start', 'budget_amount', 'notes', 'created_by_user_id', 'updated_by_user_id'];
    protected function casts(): array { return ['period_start' => 'date:Y-m-d', 'budget_amount' => 'decimal:4']; }
}
