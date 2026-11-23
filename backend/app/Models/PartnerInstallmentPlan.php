<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PartnerInstallmentPlan extends Model
{
    protected $fillable = ['partner_id', 'container_partner_id', 'container_id', 'reference', 'total_amount', 'installment_amount', 'first_due_date', 'status', 'created_by_user_id'];
    protected function casts(): array { return ['total_amount' => 'decimal:4', 'installment_amount' => 'decimal:4', 'first_due_date' => 'date:Y-m-d', 'stopped_at' => 'datetime']; }
}
