<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class AccountingAcceptanceSeeder extends Seeder
{
    public function run(): void
    {
        $database = DB::selectOne('SELECT DATABASE() AS database_name')?->database_name;
        if ($database !== 'erp_acceptance_tests') {
            throw new RuntimeException('Accounting acceptance fixtures may only be seeded into erp_acceptance_tests.');
        }

        $userId = DB::table('users')->where('username', 'sales-workflow-e2e-owner')->value('id');
        if ($userId === null) throw new RuntimeException('Run SalesWorkflowAcceptanceSeeder before accounting fixtures.');
        $suffix = strtoupper(substr(str_replace('-', '', (string) Str::uuid()), 0, 8));
        $now = now();
        $definitions = [
            ['key' => 'cash', 'account_type' => 'asset', 'normal_balance' => 'debit'],
            ['key' => 'equity', 'account_type' => 'equity', 'normal_balance' => 'credit'],
            ['key' => 'revenue', 'account_type' => 'revenue', 'normal_balance' => 'credit'],
            ['key' => 'expense', 'account_type' => 'expense', 'normal_balance' => 'debit'],
        ];
        $accountIds = [];
        foreach ($definitions as $definition) {
            $code = 'AE-'.$suffix.'-'.$definition['key'];
            $accountIds[$definition['key']] = (int) DB::table('chart_of_accounts')->insertGetId([
                'parent_account_id' => null,
                'code' => $code,
                'name' => 'Accounting acceptance '.$definition['key'].' '.$suffix,
                'description' => 'Isolated Playwright fixture '.$suffix,
                'account_type' => $definition['account_type'],
                'normal_balance' => $definition['normal_balance'],
                'is_control_account' => false,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
        $treasuryId = (int) DB::table('treasury_accounts')->insertGetId([
            'code' => 'AE-'.$suffix.'-CASH', 'name' => 'Accounting acceptance cash '.$suffix,
            'account_type' => 'cash', 'is_active' => true,
            'notes' => 'Isolated Playwright fixture '.$suffix, 'created_at' => $now, 'updated_at' => $now,
        ]);

        fwrite(STDOUT, 'ACCOUNTING_E2E_FIXTURE='.json_encode([
            'date' => $now->toDateString(),
            'accounts' => $accountIds,
            'treasury_id' => $treasuryId,
            'username' => 'sales-workflow-e2e-owner',
            'user_id' => (int) $userId,
        ], JSON_THROW_ON_ERROR).PHP_EOL);
    }
}
