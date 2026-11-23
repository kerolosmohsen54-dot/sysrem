<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class FinanceWorkflowAcceptanceSeeder extends Seeder
{
    public function run(): void
    {
        if (DB::selectOne('SELECT DATABASE() AS database_name')?->database_name !== 'erp_acceptance_tests') {
            throw new RuntimeException('Finance acceptance fixtures may only be seeded into erp_acceptance_tests.');
        }
        $userId = DB::table('users')->where('username', 'sales-workflow-e2e-owner')->value('id');
        if ($userId === null) throw new RuntimeException('Run SalesWorkflowAcceptanceSeeder first.');

        $suffix = strtoupper(substr(str_replace('-', '', (string) Str::uuid()), 0, 8));
        $now = now();
        $partnerId = (int) DB::table('partners')->insertGetId([
            'name' => 'Finance acceptance partner '.$suffix, 'phone' => null, 'status' => 'active',
            'profit_percentage' => null, 'created_by_user_id' => $userId, 'created_at' => $now, 'updated_at' => $now,
        ]);
        $containerPartnerId = (int) DB::table('container_partners')->insertGetId([
            'name' => 'Finance acceptance container partner '.$suffix, 'phone' => null, 'status' => 'active',
            'created_by_user_id' => $userId, 'created_at' => $now, 'updated_at' => $now,
        ]);
        $containerId = (int) DB::table('containers')->insertGetId([
            'container_name' => 'Finance acceptance container '.$suffix,
            'container_number' => 'FAC-'.$suffix,
            'status' => 'in_transit',
            'tracking_stage' => 'shipping',
            'created_by_user_id' => $userId,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        $treasuryId = (int) DB::table('treasury_accounts')->insertGetId([
            'code' => 'FAE-'.$suffix, 'name' => 'Finance acceptance treasury '.$suffix, 'account_type' => 'cash',
            'is_active' => true, 'notes' => 'Dedicated isolated finance acceptance fixture', 'created_at' => $now, 'updated_at' => $now,
        ]);
        DB::table('treasury_entries')->insert([
            'treasury_account_id' => $treasuryId, 'entry_number' => 'FAE-OPEN-'.$suffix, 'entry_type' => 'opening',
            'direction' => 'in', 'entry_date' => $now->copy()->subDay()->toDateString(), 'amount' => '100000.0000',
            'source_type' => null, 'source_id' => null, 'description' => 'Acceptance fixture opening balance',
            'created_by_user_id' => $userId, 'posted_at' => $now, 'created_at' => $now,
        ]);
        $categoryId = (int) DB::table('expense_categories')->insertGetId([
            'name' => 'Finance acceptance category '.$suffix, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now,
        ]);
        $sourceInvoice = DB::table('sales_documents')->where('status', 'posted')->where('document_type', 'invoice')
            ->where('notes', 'like', 'Sales workflow acceptance source invoice %')->orderByDesc('id')->first(['id', 'customer_id', 'document_number']);
        if ($sourceInvoice === null) throw new RuntimeException('The sales acceptance invoice fixture is missing.');

        fwrite(STDOUT, 'FINANCE_E2E_FIXTURE='.json_encode([
            'partner_id' => $partnerId, 'partner_name' => 'Finance acceptance partner '.$suffix,
            'container_partner_id' => $containerPartnerId,
            'container_id' => $containerId,
            'treasury_id' => $treasuryId, 'treasury_name' => 'Finance acceptance treasury '.$suffix,
            'category_id' => $categoryId, 'category_name' => 'Finance acceptance category '.$suffix,
            'customer_id' => (int) $sourceInvoice->customer_id, 'source_invoice_id' => (int) $sourceInvoice->id,
            'source_invoice_number' => (string) $sourceInvoice->document_number, 'username' => 'sales-workflow-e2e-owner',
            'today' => $now->toDateString(), 'next_month' => $now->copy()->startOfMonth()->addMonthNoOverflow()->toDateString(),
        ], JSON_THROW_ON_ERROR).PHP_EOL);
    }
}
