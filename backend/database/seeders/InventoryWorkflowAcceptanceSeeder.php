<?php

namespace Database\Seeders;

use App\Services\InventoryService;
use App\Services\SalesService;
use Illuminate\Database\Seeder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class InventoryWorkflowAcceptanceSeeder extends Seeder
{
    public function run(): void
    {
        if (DB::selectOne('SELECT DATABASE() AS name')?->name !== 'erp_acceptance_tests') {
            throw new RuntimeException('Inventory acceptance fixtures are restricted to erp_acceptance_tests.');
        }
        $ownerId = (int) DB::table('users')->where('username', 'sales-workflow-e2e-owner')->value('id');
        $customerId = (int) DB::table('customers')->where('customer_number', 'like', 'SWE2E-%')->orderByDesc('id')->value('id');
        if (! $ownerId || ! $customerId) throw new RuntimeException('Sales acceptance fixture must be seeded first.');
        $suffix = strtoupper(substr((string) Str::uuid(), 0, 8));
        $now = now();
        $productId = (int) DB::table('products')->insertGetId([
            'sku' => 'IWE2E-'.$suffix, 'name' => 'صنف اختبار المخزون '.$suffix, 'unit_code' => 'piece',
            'is_active' => true, 'created_by_user_id' => $ownerId, 'created_at' => $now, 'updated_at' => $now,
        ]);
        $warehouseId = (int) DB::table('locations')->insertGetId([
            'code' => 'IWE2E-'.$suffix, 'name' => 'مخزن اختبار المخزون '.$suffix,
            'location_type' => 'main', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now,
        ]);
        $request = Request::create('/api/v1/inventory/opening-stock', 'POST');
        $actor = (object) ['id' => $ownerId, 'display_name' => 'مالك اختبار المخزون'];
        $request->attributes->set('authenticated_user', $actor);
        $opening = app(InventoryService::class)->receive($productId, $warehouseId, 12, '10.00', [
            'movement_type' => 'opening', 'movement_date' => $now->toDateString(), 'reason' => 'Inventory acceptance opening '.$suffix,
        ], $request);
        $sales = app(SalesService::class);
        $invoiceRequest = Request::create('/api/v1/invoices', 'POST');
        $invoiceRequest->headers->set('Idempotency-Key', 'inventory-e2e-invoice-'.$suffix);
        $invoiceRequest->attributes->set('authenticated_user', $actor);
        $invoiceId = $sales->createInvoice($invoiceRequest, [
            'customer_id' => $customerId, 'issuer_type' => 'company', 'issuer_company' => 'MASTER',
            'payment_terms' => 'immediate', 'issue_date' => $now->toDateString(), 'due_date' => null,
            'discount_type' => 'fixed', 'discount_value' => '0', 'notes' => 'Inventory acceptance sale '.$suffix,
            'lines' => [[ 'product_id' => $productId, 'warehouse_id' => $warehouseId, 'quantity' => 2,
                'unit_price_egp' => '25.00', 'discount_amount_egp' => '0' ]],
        ]);
        $issueRequest = Request::create('/api/v1/invoices/'.$invoiceId.'/issue', 'POST');
        $issueRequest->headers->set('Idempotency-Key', 'inventory-e2e-issue-'.$suffix);
        $issueRequest->attributes->set('authenticated_user', $actor);
        $sales->issueInvoice($issueRequest, $invoiceId);
        fwrite(STDOUT, 'INVENTORY_E2E_FIXTURE='.json_encode([
            'product_id' => $productId, 'warehouse_id' => $warehouseId,
            'product_sku' => 'IWE2E-'.$suffix, 'warehouse_code' => 'IWE2E-'.$suffix,
            'opening_movement_id' => $opening['movement_id'], 'invoice_id' => $invoiceId,
            'on_hand_after_sale' => 10,
        ], JSON_THROW_ON_ERROR).PHP_EOL);
    }
}
