<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('chart_of_accounts', function (Blueprint $table): void {
            $table->string('description', 500)->nullable()->after('name');
        });

        Schema::table('journal_lines', function (Blueprint $table): void {
            $table->index(['treasury_account_id', 'journal_entry_id'], 'ix_journal_lines_treasury_entry');
        });

        Schema::create('financial_adjustments', function (Blueprint $table): void {
            $table->id();
            $table->string('adjustment_number', 80)->unique('uq_financial_adjustments_number');
            $table->string('reference_number', 160);
            $table->enum('adjustment_type', ['add', 'deduct', 'expense', 'revenue', 'settlement', 'correction']);
            $table->date('adjustment_date');
            $table->foreignId('debit_account_id')->constrained('chart_of_accounts')->restrictOnDelete();
            $table->foreignId('credit_account_id')->constrained('chart_of_accounts')->restrictOnDelete();
            $table->decimal('amount', 19, 4);
            $table->string('reason', 500);
            $table->text('notes')->nullable();
            $table->foreignId('journal_entry_id')->unique('uq_financial_adjustments_journal')->constrained('journal_entries')->restrictOnDelete();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->char('idempotency_key', 64)->unique('uq_financial_adjustments_idempotency');
            $table->char('request_hash', 64);
            $table->timestamp('created_at')->useCurrent();
            $table->index(['adjustment_date', 'adjustment_type', 'id'], 'ix_financial_adjustments_date_type');
            $table->index(['debit_account_id', 'adjustment_date'], 'ix_financial_adjustments_debit_date');
            $table->index(['credit_account_id', 'adjustment_date'], 'ix_financial_adjustments_credit_date');
        });

        $permissions = [
            'chart_of_accounts.view' => 'View the chart of accounts and balances.',
            'chart_of_accounts.manage' => 'Create and update unposted accounts.',
            'journal_entries.view' => 'View journal entries and posting history.',
            'journal_entries.create' => 'Create and update draft journal entries.',
            'journal_entries.post' => 'Post balanced journal entries.',
            'journal_entries.reverse' => 'Post reversal journal entries.',
            'accounting.reports.view' => 'View ledger, trial balance, and financial statements.',
            'financial_adjustments.view' => 'View journal-backed financial adjustments.',
        ];
        foreach ($permissions as $code => $description) {
            DB::table('permissions')->insertOrIgnore(['code' => $code, 'description' => $description]);
        }
        $accountantPermissions = [
            'chart_of_accounts.view', 'journal_entries.view', 'journal_entries.create',
            'accounting.reports.view', 'financial_adjustments.view',
        ];
        foreach (['owner', 'admin', 'accountant'] as $roleCode) {
            $roleId = DB::table('roles')->where('code', $roleCode)->value('id');
            if ($roleId === null) continue;
            $codes = $roleCode === 'accountant' ? $accountantPermissions : array_keys($permissions);
            foreach ($codes as $code) {
                $permissionId = DB::table('permissions')->where('code', $code)->value('id');
                DB::table('role_permissions')->insertOrIgnore([
                    'role_id' => $roleId, 'permission_id' => $permissionId, 'granted_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        throw new LogicException('This forward-only migration retains accounting and financial adjustment history.');
    }
};
