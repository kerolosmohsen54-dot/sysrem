<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use RuntimeException;

class OrderReservationAcceptanceSeeder extends Seeder
{
    public function run(): void
    {
        $database = DB::selectOne('SELECT DATABASE() AS database_name')?->database_name;
        if (! in_array($database, ['erp_scratch', 'erp_acceptance_tests'], true)) {
            throw new RuntimeException('Reservation acceptance fixtures may only be seeded into erp_scratch or erp_acceptance_tests.');
        }

        $now = now();
        $permissionCodes = [
            'users.view_self',
            'orders.view',
            'orders.manage',
            'invoices.view',
            'invoices.create',
            'inventory.view',
            'products.view',
        ];
        $roleId = DB::table('roles')->where('code', 'reservation_e2e')->value('id');
        if ($roleId === null) {
            $roleId = DB::table('roles')->insertGetId([
                'code' => 'reservation_e2e',
                'name' => 'اختبار حجز المخزون',
                'description' => 'Dedicated local acceptance fixture role.',
                'is_system' => false,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
        foreach ($permissionCodes as $code) {
            DB::table('permissions')->insertOrIgnore([
                'code' => $code,
                'description' => 'Acceptance fixture permission.',
            ]);
            $permissionId = DB::table('permissions')->where('code', $code)->value('id');
            DB::table('role_permissions')->insertOrIgnore([
                'role_id' => $roleId,
                'permission_id' => $permissionId,
                'granted_at' => $now,
            ]);
        }
        DB::table('app_settings')->insertOrIgnore([
            'setting_key' => 'sales_tax',
            'setting_value' => json_encode(['enabled' => false, 'rate' => null, 'calculation_method' => null], JSON_THROW_ON_ERROR),
            'description' => 'Acceptance fixture default; does not overwrite an existing setting.',
            'updated_by_user_id' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        $userId = DB::table('users')->where('username', 'reservation-e2e-owner')->value('id');
        $userValues = [
            'username' => 'reservation-e2e-owner',
            'display_name' => 'مالك اختبار حجز المخزون',
            'password_hash' => Hash::make('Reservation-e2e-password-2026!'),
            'is_active' => true,
            'password_changed_at' => $now,
            'updated_at' => $now,
        ];
        if ($userId === null) {
            $userId = DB::table('users')->insertGetId($userValues + ['created_at' => $now]);
        } else {
            DB::table('users')->where('id', $userId)->update($userValues);
        }
        DB::table('user_roles')->insertOrIgnore([
            'user_id' => $userId,
            'role_id' => $roleId,
            'granted_by_user_id' => null,
            'granted_at' => $now,
        ]);

        $suffix = strtoupper(substr((string) Str::uuid(), 0, 8));
        $customerId = (int) DB::table('customers')->insertGetId([
            'customer_number' => 'RSV-E2E-'.$suffix,
            'name' => 'عميل اختبار حجز '.$suffix,
            'credit_limit' => null,
            'is_active' => true,
            'created_by_user_id' => $userId,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        $productId = (int) DB::table('products')->insertGetId([
            'sku' => 'RSV-E2E-'.$suffix,
            'name' => 'صنف اختبار الحجز '.$suffix,
            'unit_code' => 'قطعة',
            'is_active' => true,
            'created_by_user_id' => $userId,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        $warehouseId = (int) DB::table('locations')->insertGetId([
            'code' => 'RSV-E2E-'.$suffix,
            'name' => 'مخزن اختبار الحجز '.$suffix,
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

        $orderIds = [];
        foreach ([['cancel', 2], ['invoice', 3]] as [$action, $quantity]) {
            $orderId = (int) DB::table('sales_orders')->insertGetId([
                'order_number' => 'RSV-E2E-'.$action.'-'.$suffix,
                'status' => 'draft',
                'customer_id' => $customerId,
                'order_date' => $now->toDateString(),
                'notes' => 'Acceptance fixture '.$suffix,
                'created_by_user_id' => $userId,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            DB::table('sales_order_lines')->insert([
                'sales_order_id' => $orderId,
                'line_number' => 1,
                'product_id' => $productId,
                'quantity' => $quantity,
                'unit_price' => '25.0000',
                'notes' => null,
                'created_at' => $now,
            ]);
            $orderIds[$action] = $orderId;
        }

        fwrite(STDOUT, 'RESERVATION_E2E_FIXTURE='.json_encode([
            'cancel_order_id' => $orderIds['cancel'],
            'invoice_order_id' => $orderIds['invoice'],
            'product_id' => $productId,
            'warehouse_id' => $warehouseId,
            'customer_id' => $customerId,
            'initial_quantity_on_hand' => 12,
        ], JSON_THROW_ON_ERROR).PHP_EOL);
    }
}
