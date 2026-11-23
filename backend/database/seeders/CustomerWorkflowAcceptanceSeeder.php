<?php

namespace Database\Seeders;

use App\Services\OrdersService;
use App\Services\SalesService;
use Illuminate\Database\Seeder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class CustomerWorkflowAcceptanceSeeder extends Seeder
{
    public function run(): void
    {
        $database = DB::selectOne('SELECT DATABASE() AS database_name')?->database_name;
        if ($database !== 'erp_acceptance_tests') {
            throw new RuntimeException('Customer workflow fixtures may only be seeded into erp_acceptance_tests.');
        }

        $customer = DB::table('customers')->where('customer_number', 'like', 'SWE2E-%')->orderByDesc('id')->first();
        $governorate = DB::table('governorates')->where('is_active', true)->orderBy('sort_order')->first();
        $actorId = (int) DB::table('users')->where('username', 'sales-workflow-e2e-owner')->value('id');
        $product = DB::table('products')->where('sku', 'like', 'SWE2E-%')->orderByDesc('id')->first();
        $warehouse = DB::table('locations')->where('code', 'like', 'SWE2E-%')->orderByDesc('id')->first();
        $treasuryId = (int) DB::table('treasury_accounts')->where('is_active', true)->orderBy('id')->value('id');
        if ($customer === null || $governorate === null || $actorId < 1 || $product === null || $warehouse === null || $treasuryId < 1) {
            throw new RuntimeException('Sales, warehouse, or treasury fixture records are missing.');
        }
        DB::table('customers')->where('id', $customer->id)->update(['governorate' => $governorate->name, 'updated_at' => now()]);
        $suffix = (string) $customer->customer_number;
        $notes = 'Customer UI acceptance '.$suffix;
        $actor = (object) ['id' => $actorId, 'display_name' => 'Customer UI acceptance owner'];

        $orderId = DB::table('sales_orders')->where('customer_id', $customer->id)->where('notes', $notes)->value('id');
        if ($orderId === null) {
            $request = Request::create('/api/v1/orders', 'POST');
            $request->attributes->set('authenticated_user', $actor);
            $orderId = app(OrdersService::class)->createOrder($request, [
                'customer_id' => (int) $customer->id,
                'order_date' => now()->toDateString(),
                'requested_delivery_date' => null,
                'notes' => $notes,
                'salesperson_id' => null,
                'warehouse_id' => (int) $warehouse->id,
                'currency_code' => 'EGP',
                'payment_method' => 'cash',
                'payment_terms' => null,
                'discount_type' => 'fixed',
                'discount_value' => '0',
                'shipping_amount_egp' => '0',
                'lines' => [[
                    'product_id' => (int) $product->id,
                    'quantity' => 1,
                    'unit_price_egp' => '25.00',
                    'discount_percent' => '0',
                    'notes' => null,
                ]],
            ]);
        }

        $externalReference = 'CUSTOMER-UI-'.$suffix;
        $paymentId = DB::table('sales_receipts')->where('external_reference', $externalReference)->value('id');
        if ($paymentId === null) {
            $request = Request::create('/api/v1/collections', 'POST');
            $request->headers->set('Idempotency-Key', 'customer-ui-collection-'.$suffix);
            $request->attributes->set('authenticated_user', $actor);
            $payment = app(SalesService::class)->recordCollection($request, [
                'customer_id' => (int) $customer->id,
                'treasury_account_id' => $treasuryId,
                'receipt_date' => now()->toDateString(),
                'amount_egp' => '5.00',
                'payment_method' => 'cash',
                'external_reference' => $externalReference,
                'notes' => $notes,
                'allocations' => [],
            ]);
            $paymentId = $payment['data']['id'] ?? DB::table('sales_receipts')->where('external_reference', $externalReference)->value('id');
        }

        fwrite(STDOUT, 'CUSTOMER_E2E_FIXTURE='.json_encode([
            'customer_id' => (int) $customer->id,
            'customer_name' => (string) $customer->name,
            'order_id' => (int) $orderId,
            'invoice_id' => (int) DB::table('sales_documents')->where('customer_id', $customer->id)->where('document_type', 'invoice')->orderByDesc('id')->value('id'),
            'payment_id' => (int) $paymentId,
            'governorate_id' => (int) $governorate->id,
            'governorate_name' => (string) $governorate->name,
        ], JSON_THROW_ON_ERROR).PHP_EOL);
    }
}
