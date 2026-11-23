<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('financial_adjustments', function (Blueprint $table): void {
            $table->foreignId('debit_treasury_account_id')->nullable()->after('credit_account_id')->constrained('treasury_accounts')->restrictOnDelete();
            $table->foreignId('credit_treasury_account_id')->nullable()->after('debit_treasury_account_id')->constrained('treasury_accounts')->restrictOnDelete();
            $table->index(['debit_treasury_account_id', 'adjustment_date'], 'ix_financial_adjustments_debit_treasury');
            $table->index(['credit_treasury_account_id', 'adjustment_date'], 'ix_financial_adjustments_credit_treasury');
        });
    }

    public function down(): void
    {
        throw new LogicException('This forward-only migration retains financial adjustment history.');
    }
};
