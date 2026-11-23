<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** @var array<string, array{code:string, name:string, type:string, normal:string}> */
    private array $accounts = [
        'cash' => ['code' => 'AUTO-1000', 'name' => 'نقدية الخزائن والبنوك', 'type' => 'asset', 'normal' => 'debit'],
        'receivables' => ['code' => 'AUTO-1100', 'name' => 'ذمم العملاء', 'type' => 'asset', 'normal' => 'debit'],
        'partner_recoverable' => ['code' => 'AUTO-1150', 'name' => 'مبالغ مستحقة من الشركاء', 'type' => 'asset', 'normal' => 'debit'],
        'inventory' => ['code' => 'AUTO-1200', 'name' => 'مخزون البضائع', 'type' => 'asset', 'normal' => 'debit'],
        'input_tax' => ['code' => 'AUTO-1300', 'name' => 'ضريبة مدخلات قابلة للاسترداد', 'type' => 'asset', 'normal' => 'debit'],
        'supplier_payables' => ['code' => 'AUTO-2000', 'name' => 'ذمم الموردين', 'type' => 'liability', 'normal' => 'credit'],
        'partner_payables' => ['code' => 'AUTO-2100', 'name' => 'مستحقات أرباح الشركاء', 'type' => 'liability', 'normal' => 'credit'],
        'customer_advances' => ['code' => 'AUTO-2200', 'name' => 'دفعات العملاء غير المخصصة', 'type' => 'liability', 'normal' => 'credit'],
        'sales_tax_payable' => ['code' => 'AUTO-2300', 'name' => 'ضريبة المبيعات المستحقة', 'type' => 'liability', 'normal' => 'credit'],
        'sales_revenue' => ['code' => 'AUTO-4000', 'name' => 'إيراد المبيعات', 'type' => 'revenue', 'normal' => 'credit'],
        'inventory_gain' => ['code' => 'AUTO-4100', 'name' => 'زيادة المخزون المكتشفة بالجرد', 'type' => 'revenue', 'normal' => 'credit'],
        'sales_returns' => ['code' => 'AUTO-4200', 'name' => 'مرتجعات المبيعات', 'type' => 'revenue', 'normal' => 'debit'],
        'cogs' => ['code' => 'AUTO-5000', 'name' => 'تكلفة البضاعة المباعة', 'type' => 'expense', 'normal' => 'debit'],
        'operating_expense' => ['code' => 'AUTO-5100', 'name' => 'مصروفات التشغيل', 'type' => 'expense', 'normal' => 'debit'],
        'purchase_partner_profit' => ['code' => 'AUTO-5200', 'name' => 'أرباح شركاء التوريد', 'type' => 'expense', 'normal' => 'debit'],
        'inventory_loss' => ['code' => 'AUTO-5300', 'name' => 'عجز وتلف المخزون', 'type' => 'expense', 'normal' => 'debit'],
        'opening_equity' => ['code' => 'AUTO-3000', 'name' => 'الأرصدة الافتتاحية', 'type' => 'equity', 'normal' => 'credit'],
        'unclassified_cash_in' => ['code' => 'AUTO-2400', 'name' => 'مقبوضات غير مصنفة', 'type' => 'liability', 'normal' => 'credit'],
        'unclassified_cash_out' => ['code' => 'AUTO-5400', 'name' => 'مدفوعات غير مصنفة', 'type' => 'expense', 'normal' => 'debit'],
        'container_cost_expense' => ['code' => 'AUTO-5500', 'name' => 'مصروفات شحن ومصاريف الحاويات', 'type' => 'expense', 'normal' => 'debit'],
    ];

    /** @var array<string, string> */
    private array $labels = [
        'cash' => 'الخزائن والبنوك',
        'receivables' => 'ذمم العملاء',
        'partner_recoverable' => 'مبالغ مستحقة من الشركاء',
        'inventory' => 'المخزون',
        'input_tax' => 'ضريبة المدخلات',
        'supplier_payables' => 'ذمم الموردين',
        'partner_payables' => 'مستحقات أرباح الشركاء',
        'customer_advances' => 'دفعات العملاء غير المخصصة',
        'sales_tax_payable' => 'ضريبة المبيعات المستحقة',
        'sales_revenue' => 'إيراد المبيعات',
        'inventory_gain' => 'زيادة المخزون بالجرد',
        'sales_returns' => 'مرتجعات المبيعات',
        'cogs' => 'تكلفة البضاعة المباعة',
        'operating_expense' => 'مصروف التشغيل الافتراضي',
        'purchase_partner_profit' => 'ربح شريك التوريد',
        'inventory_loss' => 'عجز المخزون',
        'opening_equity' => 'الأرصدة الافتتاحية',
        'unclassified_cash_in' => 'المقبوضات غير المصنفة',
        'unclassified_cash_out' => 'المدفوعات غير المصنفة',
        'container_cost_expense' => 'تكلفة الحاوية غير المرسملة',
    ];

    public function up(): void
    {
        Schema::create('financial_account_mappings', function (Blueprint $table): void {
            $table->string('mapping_key', 80)->primary();
            $table->string('label', 160);
            $table->enum('account_type', ['asset', 'liability', 'equity', 'revenue', 'expense']);
            $table->enum('normal_balance', ['debit', 'credit']);
            $table->foreignId('account_id')->constrained('chart_of_accounts')->restrictOnDelete();
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();
            $table->index(['account_id', 'mapping_key'], 'ix_financial_account_mappings_account');
        });

        foreach ($this->accounts as $key => $account) {
            DB::table('chart_of_accounts')->insertOrIgnore([
                'parent_account_id' => null,
                'code' => $account['code'],
                'name' => $account['name'],
                'description' => 'حساب نظام افتراضي للترحيل المالي التلقائي؛ يمكن تغيير الربط قبل الترحيل.',
                'account_type' => $account['type'],
                'normal_balance' => $account['normal'],
                'is_control_account' => false,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $accountId = DB::table('chart_of_accounts')->where('code', $account['code'])->value('id');
            $existing = DB::table('chart_of_accounts')->where('id', $accountId)->first(['account_type', 'normal_balance']);
            if ($existing === null || $existing->account_type !== $account['type'] || $existing->normal_balance !== $account['normal']) {
                throw new RuntimeException('Automatic accounting account code conflicts with an existing incompatible account: '.$account['code']);
            }
            DB::table('financial_account_mappings')->insertOrIgnore([
                'mapping_key' => $key,
                'label' => $this->labels[$key],
                'account_type' => $account['type'],
                'normal_balance' => $account['normal'],
                'account_id' => $accountId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        throw new LogicException('Automatic financial posting mappings and their journal history are forward-only.');
    }
};
