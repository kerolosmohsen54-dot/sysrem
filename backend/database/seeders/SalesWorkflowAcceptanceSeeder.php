<?php

namespace Database\Seeders;

use App\Services\SalesService;
use Illuminate\Database\Seeder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use RuntimeException;

class SalesWorkflowAcceptanceSeeder extends Seeder
{
    public function run(): void
    {
        $database = DB::selectOne('SELECT DATABASE() AS database_name')?->database_name;
        if ($database !== 'erp_acceptance_tests') {
            throw new RuntimeException('Sales workflow acceptance fixtures may only be seeded into erp_acceptance_tests.');
        }

        app(RolePermissionMatrixSeeder::class)->run();
        $now = now();
        DB::table('currency_references')->updateOrInsert(
            ['code' => 'EGP'],
            [
                'name' => 'الجنيه المصري',
                'symbol' => 'ج.م',
                'decimal_places' => 2,
                'is_active' => true,
                'updated_by_user_id' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        );
        DB::table('app_settings')->updateOrInsert(
            ['setting_key' => 'sales_tax'],
            [
                'setting_value' => json_encode(['enabled' => false, 'rate' => null, 'calculation_method' => null], JSON_THROW_ON_ERROR),
                'description' => 'Acceptance fixture default; sales tax disabled.',
                'updated_by_user_id' => null,
                'updated_at' => $now,
            ],
        );

        $username = 'sales-workflow-e2e-owner';
        $userId = DB::table('users')->where('username', $username)->value('id');
        $userValues = [
            'username' => $username,
            'display_name' => 'مالك اختبار تدفقات المبيعات',
            'password_hash' => Hash::make('Sales-workflow-e2e-2026!'),
            'is_active' => true,
            'password_changed_at' => $now,
            'updated_at' => $now,
        ];
        if ($userId === null) {
            $userId = (int) DB::table('users')->insertGetId($userValues + ['created_at' => $now]);
        } else {
            DB::table('users')->where('id', $userId)->update($userValues);
            $userId = (int) $userId;
        }
        $ownerRoleId = (int) DB::table('roles')->where('code', 'owner')->value('id');
        DB::table('user_roles')->insertOrIgnore([
            'user_id' => $userId,
            'role_id' => $ownerRoleId,
            'granted_by_user_id' => null,
            'granted_at' => $now,
        ]);

        $suffix = strtoupper(substr((string) Str::uuid(), 0, 8));
        $customerId = (int) DB::table('customers')->insertGetId([
            'customer_number' => 'SWE2E-'.$suffix,
            'name' => 'عميل اختبار المبيعات '.$suffix,
            'phone' => '0100000'.substr($suffix, 0, 4),
            'credit_limit' => null,
            'is_active' => true,
            'created_by_user_id' => $userId,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        $productId = (int) DB::table('products')->insertGetId([
            'company_price' => '20.0000',
            'purchase_cost_egp' => '10.0000',
            'sku' => 'SWE2E-'.$suffix,
            'name' => 'صنف اختبار تدفق البيع '.$suffix,
            'unit_code' => 'قطعة',
            'is_active' => true,
            'created_by_user_id' => $userId,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        $warehouseId = (int) DB::table('locations')->insertGetId([
            'code' => 'SWE2E-'.$suffix,
            'name' => 'مخزن اختبار التدفق '.$suffix,
            'location_type' => 'main',
            'is_active' => true,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        DB::table('inventory_balances')->insert([
            'product_id' => $productId,
            'location_id' => $warehouseId,
            'quantity_on_hand' => 12,
            'quantity_reserved' => 0,
            'average_unit_cost_egp' => '10.0000',
            'inventory_value_egp' => '120.0000',
            'updated_at' => $now,
        ]);

        $actor = (object) ['id' => $userId, 'display_name' => 'مالك اختبار تدفقات المبيعات'];
        $invoiceRequest = Request::create('/api/v1/invoices', 'POST');
        $invoiceRequest->headers->set('Idempotency-Key', 'sales-e2e-source-'.$suffix);
        $invoiceRequest->attributes->set('authenticated_user', $actor);
        $sales = app(SalesService::class);
        $sourceInvoiceId = $sales->createInvoice($invoiceRequest, [
            'customer_id' => $customerId,
            'issuer_type' => 'company',
            'issuer_company' => 'MASTER',
            'payment_terms' => 'immediate',
            'issue_date' => $now->toDateString(),
            'due_date' => null,
            'discount_type' => 'fixed',
            'discount_value' => '0',
            'notes' => 'Sales workflow acceptance source invoice '.$suffix,
            'lines' => [[
                'product_id' => $productId,
                'warehouse_id' => $warehouseId,
                'quantity' => 2,
                'unit_price_egp' => '25.00',
                'discount_amount_egp' => '0',
            ]],
        ]);
        $issueRequest = Request::create('/api/v1/invoices/'.$sourceInvoiceId.'/issue', 'POST');
        $issueRequest->headers->set('Idempotency-Key', 'sales-e2e-source-issue-'.$suffix);
        $issueRequest->attributes->set('authenticated_user', $actor);
        $sales->issueInvoice($issueRequest, $sourceInvoiceId);
        $sourceInvoiceLineId = (int) DB::table('sales_document_lines')
            ->where('sales_document_id', $sourceInvoiceId)
            ->value('id');

        fwrite(STDOUT, 'SALES_E2E_FIXTURE='.json_encode([
            'customer_id' => $customerId,
            'customer_name' => 'عميل اختبار المبيعات '.$suffix,
            'product_id' => $productId,
            'product_sku' => 'SWE2E-'.$suffix,
            'warehouse_id' => $warehouseId,
            'warehouse_code' => 'SWE2E-'.$suffix,
            'source_invoice_id' => $sourceInvoiceId,
            'source_invoice_line_id' => $sourceInvoiceLineId,
            'on_hand_before_order' => 10,
        ], JSON_THROW_ON_ERROR).PHP_EOL);
    }
}
