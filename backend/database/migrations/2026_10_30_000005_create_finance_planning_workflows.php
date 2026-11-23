<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! in_array(DB::connection()->getConfig('driver'), ['mysql', 'mariadb'], true)) {
            throw new RuntimeException('Finance planning workflows require MySQL or MariaDB.');
        }

        Schema::create('pending_funds', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->foreignId('partner_id')->constrained('partners')->restrictOnDelete();
            $table->string('source_label', 180);
            $table->string('source_reference', 160)->nullable();
            $table->string('description', 500);
            $table->date('due_date');
            $table->decimal('amount', 19, 4);
            $table->decimal('received_amount', 19, 4)->default(0);
            $table->string('status', 24)->default('pending');
            $table->timestamp('cancelled_at')->nullable();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['status', 'due_date', 'id'], 'ix_pending_funds_status_due');
            $table->index(['partner_id', 'due_date', 'id'], 'ix_pending_funds_partner_due');
        });

        Schema::create('pending_fund_receipts', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->foreignId('pending_fund_id')->constrained('pending_funds')->restrictOnDelete();
            $table->foreignId('treasury_account_id')->constrained('treasury_accounts')->restrictOnDelete();
            $table->foreignId('treasury_entry_id')->unique()->constrained('treasury_entries')->restrictOnDelete();
            $table->decimal('amount', 19, 4);
            $table->date('received_date');
            $table->string('idempotency_key', 200)->unique();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['pending_fund_id', 'received_date', 'id'], 'ix_pending_receipts_fund_date');
        });

        Schema::create('partner_installment_plans', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->foreignId('partner_id')->constrained('partners')->restrictOnDelete();
            $table->foreignId('container_id')->nullable()->constrained('containers')->restrictOnDelete();
            $table->string('reference', 160)->nullable();
            $table->decimal('total_amount', 19, 4);
            $table->decimal('installment_amount', 19, 4);
            $table->date('first_due_date');
            $table->string('status', 24)->default('active');
            $table->timestamp('stopped_at')->nullable();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['partner_id', 'status', 'id'], 'ix_partner_installments_partner_status');
            $table->index(['container_id', 'status'], 'ix_partner_installments_container');
        });

        Schema::create('partner_installments', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->foreignId('plan_id')->constrained('partner_installment_plans')->restrictOnDelete();
            $table->unsignedInteger('sequence_number');
            $table->date('due_date');
            $table->decimal('amount', 19, 4);
            $table->decimal('paid_amount', 19, 4)->default(0);
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
            $table->unique(['plan_id', 'sequence_number'], 'uq_partner_installments_plan_seq');
            $table->index(['due_date', 'plan_id', 'id'], 'ix_partner_installments_due');
        });

        Schema::create('partner_installment_payments', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->foreignId('plan_id')->constrained('partner_installment_plans')->restrictOnDelete();
            $table->foreignId('treasury_account_id')->constrained('treasury_accounts')->restrictOnDelete();
            $table->foreignId('treasury_entry_id')->unique()->constrained('treasury_entries')->restrictOnDelete();
            $table->decimal('amount', 19, 4);
            $table->date('payment_date');
            $table->string('idempotency_key', 200)->unique();
            $table->string('notes', 500)->nullable();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['plan_id', 'payment_date', 'id'], 'ix_partner_installment_payments_plan_date');
        });

        Schema::create('expense_budgets', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->foreignId('expense_category_id')->constrained('expense_categories')->restrictOnDelete();
            $table->date('period_start');
            $table->decimal('budget_amount', 19, 4);
            $table->string('notes', 500)->nullable();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['expense_category_id', 'period_start'], 'uq_expense_budgets_category_period');
            $table->index(['period_start', 'expense_category_id'], 'ix_expense_budgets_period');
        });

        Schema::create('recurring_expense_templates', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->string('name', 180);
            $table->foreignId('expense_category_id')->constrained('expense_categories')->restrictOnDelete();
            $table->decimal('amount', 19, 4);
            $table->unsignedTinyInteger('due_day');
            $table->date('start_date');
            $table->string('status', 24)->default('active');
            $table->string('notes', 500)->nullable();
            $table->timestamp('stopped_at')->nullable();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['status', 'start_date', 'id'], 'ix_recurring_expense_templates_active');
        });

        Schema::create('recurring_expense_occurrences', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->foreignId('template_id')->constrained('recurring_expense_templates')->restrictOnDelete();
            $table->date('period_start');
            $table->date('due_date');
            $table->decimal('amount', 19, 4);
            $table->string('status', 24)->default('due');
            $table->foreignId('expense_id')->nullable()->unique()->constrained('expenses')->restrictOnDelete();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->nullable();
            $table->unique(['template_id', 'period_start'], 'uq_recurring_expense_template_period');
            $table->index(['status', 'due_date', 'id'], 'ix_recurring_expense_occurrences_due');
        });

        $permissions = [
            ['pending_funds.view', 'View expected funds and receipts'],
            ['pending_funds.manage', 'Create and cancel expected funds'],
            ['pending_funds.receive', 'Receive expected funds into treasury'],
            ['partner_installments.view', 'View partner installment plans'],
            ['partner_installments.manage', 'Create partner installment plans'],
            ['partner_installments.receive', 'Receive partner installment payments'],
            ['expense_budgets.view', 'View expense budgets and actual spend'],
            ['expense_budgets.manage', 'Create and update expense budgets'],
            ['recurring_expenses.view', 'View recurring expense templates and due items'],
            ['recurring_expenses.manage', 'Create, update, stop, and post recurring expenses'],
            ['finance_reports.view', 'View monthly comparisons and cash forecasts'],
        ];
        foreach ($permissions as [$code, $description]) {
            DB::table('permissions')->updateOrInsert(['code' => $code], ['description' => $description]);
            $permissionId = DB::table('permissions')->where('code', $code)->value('id');
            $ownerId = DB::table('roles')->where('code', 'owner')->value('id');
            if ($permissionId && $ownerId) {
                DB::table('role_permissions')->insertOrIgnore(['role_id' => $ownerId, 'permission_id' => $permissionId, 'granted_at' => now()]);
            }
        }
    }

    public function down(): void
    {
        throw new LogicException('Finance planning workflow migrations are forward-only.');
    }
};
