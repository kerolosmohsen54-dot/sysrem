<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FinancialAdjustment extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'adjustment_number',
        'reference_number',
        'adjustment_type',
        'adjustment_date',
        'debit_account_id',
        'credit_account_id',
        'debit_treasury_account_id',
        'credit_treasury_account_id',
        'amount',
        'reason',
        'notes',
        'journal_entry_id',
        'created_by_user_id',
        'idempotency_key',
        'request_hash',
    ];

    protected function casts(): array
    {
        return ['adjustment_date' => 'date'];
    }

    public function journalEntry(): BelongsTo
    {
        return $this->belongsTo(JournalEntry::class);
    }

    public function debitAccount(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccount::class, 'debit_account_id');
    }

    public function creditAccount(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccount::class, 'credit_account_id');
    }
}
