<?php

namespace Tests\Feature;

use App\Http\Controllers\ContainerController;
use App\Services\InventoryService;
use App\Support\ExactMoney;
use Database\Seeders\RolePermissionMatrixSeeder;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use PHPUnit\Framework\Attributes\Test;
use RuntimeException;
use Tests\TestCase;

class InventoryEngineTest extends TestCase
{
    private ?string $inventoryConnection = null;

    private InventoryService $inventory;

    protected function setUp(): void
    {
        parent::setUp();

        $connection = getenv('AUTH_TEST_CONNECTION');

        if (! is_string($connection) || ! in_array($connection, ['mysql_test', 'mariadb_test'], true)) {
            $this->markTestSkipped('Set AUTH_TEST_CONNECTION to mysql_test or mariadb_test to run inventory engine coverage.');
        }

        $this->inventoryConnection = $connection;
        config(['database.default' => $connection]);
        DB::setDefaultConnection($connection);
        DB::purge($connection);

        if (config("database.connections.{$connection}.database") !== 'erp_acceptance_tests') {
            throw new RuntimeException('Inventory integration tests require the erp_acceptance_tests database.');
        }

        $database = DB::selectOne('SELECT DATABASE() AS database_name')->database_name ?? null;

        if ($database !== 'erp_acceptance_tests') {
            throw new RuntimeException('Inventory integration tests require a live connection to erp_acceptance_tests.');
        }

        $this->createTemporaryTables();
        app(RolePermissionMatrixSeeder::class)->run();
        $this->inventory = app(InventoryService::class);
    }

    protected function tearDown(): void
    {
        if ($this->inventoryConnection !== null) {
            foreach ([
                'inventory_balances',
                'inventory_movement_lines',
                'inventory_movements',
                'trash_items',
                'locations',
                'products',
                'product_categories',
                'audit_logs',
                'container_status_history',
                'container_tracking_events',
                'container_cost_payments',
                'container_cost_allocations',
                'container_receipt_lines',
                'container_receipts',
                'container_cost_revaluations',
                'container_cost_type_settings',
                'container_costs',
                'container_lines',
                'containers',
                'treasury_entries',
                'role_permissions',
                'user_roles',
                'permissions',
                'roles',
                'auth_sessions',
                'users',
            ] as $table) {
                DB::statement("DROP TEMPORARY TABLE IF EXISTS `{$table}`");
            }

            DB::purge($this->inventoryConnection);
        }

        parent::tearDown();
    }

    #[Test]
    public function receipt_costs_are_weighted_per_product_and_location_and_reconcile_to_the_ledger(): void
    {
        [$productId, $warehouseId] = $this->createProductAndWarehouse('stock-main');
        [, $otherWarehouseId] = $this->createProductAndWarehouse('stock-other');

        $this->receive($productId, $warehouseId, 1, '1.00');
        $result = $this->receive($productId, $warehouseId, 2, '2.00');
        $this->receive($productId, $otherWarehouseId, 2, '9.00');

        self::assertSame(3, $result['quantity_on_hand']);
        self::assertSame('1.67', $result['average_unit_cost_egp']);
        self::assertSame('5.00', $result['inventory_value_egp']);
        self::assertSame('18.0000', DB::table('inventory_balances')
            ->where('product_id', $productId)
            ->where('location_id', $otherWarehouseId)
            ->value('inventory_value_egp'));
        $this->assertBalanceMatchesPostedMovementLines($productId, $warehouseId);
    }

    #[Test]
    public function weighted_average_uses_half_up_piastre_rounding_without_losing_ledger_value(): void
    {
        [$productId, $warehouseId] = $this->createProductAndWarehouse('rounding-stock');

        $this->receive($productId, $warehouseId, 1, '1.00');
        $result = $this->receive($productId, $warehouseId, 1, '1.01');

        self::assertSame('1.01', $result['average_unit_cost_egp']);
        self::assertSame('2.01', $result['inventory_value_egp']);
        $this->assertBalanceMatchesPostedMovementLines($productId, $warehouseId);
    }

    #[Test]
    public function issues_can_reduce_stock_to_zero_and_below_zero_issues_roll_back(): void
    {
        [$productId, $warehouseId] = $this->createProductAndWarehouse('issue-stock');
        $this->receive($productId, $warehouseId, 3, '1.00');
        $this->issue($productId, $warehouseId, 1);
        $beforeMovementCount = DB::table('inventory_movements')->count();

        try {
            $this->issue($productId, $warehouseId, 3);
            self::fail('An issue below available stock must be rejected.');
        } catch (ValidationException $exception) {
            self::assertArrayHasKey('quantity', $exception->errors());
        }

        self::assertSame($beforeMovementCount, DB::table('inventory_movements')->count());
        $result = $this->issue($productId, $warehouseId, 2);

        self::assertSame(0, $result['quantity_on_hand']);
        self::assertNull($result['average_unit_cost_egp']);
        self::assertSame('0.00', $result['inventory_value_egp']);
        $this->assertBalanceMatchesPostedMovementLines($productId, $warehouseId);
    }

    #[Test]
    public function failed_audit_insert_rolls_back_movement_line_and_balance_changes(): void
    {
        [$productId, $warehouseId] = $this->createProductAndWarehouse('rollback-stock');
        DB::statement("ALTER TABLE audit_logs ADD CONSTRAINT chk_test_reject_adjustment CHECK (action <> 'inventory.adjustment')");

        try {
            $this->inventory->receive(
                $productId,
                $warehouseId,
                4,
                '3.25',
                ['movement_type' => 'adjustment', 'reason' => 'rollback test'],
                $this->actorRequest(),
            );
            self::fail('The test audit constraint should reject the transaction.');
        } catch (QueryException) {
            self::assertSame(0, DB::table('inventory_movements')->count());
            self::assertSame(0, DB::table('inventory_movement_lines')->count());
            self::assertSame(0, DB::table('inventory_balances')->count());
        }
    }

    #[Test]
    public function twenty_five_warehouses_can_each_hold_stock_for_the_same_product(): void
    {
        [$productId] = $this->createProductAndWarehouse('unlimited-locations');
        $warehouseIds = [];

        for ($index = 1; $index <= 25; $index++) {
            $warehouseIds[] = (int) DB::table('locations')->insertGetId([
                'code' => 'LOC-MANY-'.$index,
                'name' => 'Warehouse '.$index,
                'location_type' => 'main',
            ]);
        }

        foreach ($warehouseIds as $warehouseId) {
            $this->receive($productId, $warehouseId, 1, '2.00');
        }

        self::assertCount(25, DB::table('locations')->whereIn('id', $warehouseIds)->get());
        self::assertSame(25, (int) DB::table('inventory_balances')
            ->where('product_id', $productId)
            ->whereIn('location_id', $warehouseIds)
            ->where('quantity_on_hand', 1)
            ->count());
    }

    #[Test]
    public function transfer_preserves_source_cost_and_recomputes_destination_weighted_average(): void
    {
        [$productId, $sourceId] = $this->createProductAndWarehouse('transfer-cost-source');
        $destinationId = (int) DB::table('locations')->insertGetId([
            'code' => 'LOC-transfer-cost-destination',
            'name' => 'Transfer Cost Destination',
            'location_type' => 'main',
        ]);
        $this->receive($productId, $sourceId, 2, '4.00');
        $this->receive($productId, $destinationId, 2, '10.00');

        $result = $this->inventory->transfer(
            $productId,
            $sourceId,
            $destinationId,
            2,
            '2026-10-10',
            'Warehouse transfer',
            $this->actorRequest(),
        );

        self::assertSame('4.00', $result['unit_cost_egp']);
        self::assertSame('8.00', $result['line_cost_egp']);
        self::assertSame(0, $result['source_quantity_on_hand']);
        self::assertSame(4, $result['destination_quantity_on_hand']);
        self::assertSame('7.00', $result['destination_average_unit_cost_egp']);
        self::assertSame(1, DB::table('inventory_movements')->where('movement_type', 'transfer')->count());
        self::assertSame(1, DB::table('inventory_movement_lines')->where('from_location_id', $sourceId)
            ->where('to_location_id', $destinationId)->count());
        self::assertSame(1, DB::table('audit_logs')->where('action', 'inventory.transfer')->count());
        $this->assertBalanceMatchesPostedMovementLines($productId, $sourceId);
        $this->assertBalanceMatchesPostedMovementLines($productId, $destinationId);
    }

    #[Test]
    public function transfer_rejects_negative_source_stock_and_rolls_back_audit_failures(): void
    {
        [$productId, $sourceId] = $this->createProductAndWarehouse('transfer-negative-source');
        $destinationId = (int) DB::table('locations')->insertGetId([
            'code' => 'LOC-transfer-negative-destination',
            'name' => 'Transfer Negative Destination',
            'location_type' => 'main',
        ]);
        $this->receive($productId, $sourceId, 1, '5.00');
        $sourceBefore = DB::table('inventory_balances')->where('product_id', $productId)->where('location_id', $sourceId)->first();
        $movementCount = DB::table('inventory_movements')->count();

        try {
            $this->inventory->transfer($productId, $sourceId, $destinationId, 2, '2026-10-10', 'Too many', $this->actorRequest());
            self::fail('A transfer exceeding source stock must be rejected.');
        } catch (ValidationException $exception) {
            self::assertArrayHasKey('quantity', $exception->errors());
        }

        self::assertSame($movementCount, DB::table('inventory_movements')->count());
        self::assertSame($sourceBefore->quantity_on_hand, DB::table('inventory_balances')
            ->where('product_id', $productId)->where('location_id', $sourceId)->value('quantity_on_hand'));
        try {
            $this->inventory->transfer($productId, $sourceId, $sourceId, 1, '2026-10-10', 'Same warehouse', $this->actorRequest());
            self::fail('A transfer to the same warehouse must be rejected.');
        } catch (ValidationException $exception) {
            self::assertArrayHasKey('destination_warehouse_id', $exception->errors());
        }

        DB::statement("ALTER TABLE audit_logs ADD CONSTRAINT chk_test_reject_transfer CHECK (action <> 'inventory.transfer')");
        try {
            $this->inventory->transfer($productId, $sourceId, $destinationId, 1, '2026-10-10', 'Rollback transfer', $this->actorRequest());
            self::fail('An audit failure must roll back the complete transfer.');
        } catch (QueryException) {
            self::assertSame($movementCount, DB::table('inventory_movements')->count());
            self::assertSame(0, (int) DB::table('inventory_balances')
                ->where('product_id', $productId)->where('location_id', $destinationId)->value('quantity_on_hand'));
            self::assertSame($sourceBefore->quantity_on_hand, DB::table('inventory_balances')
                ->where('product_id', $productId)->where('location_id', $sourceId)->value('quantity_on_hand'));
        }
    }

    #[Test]
    public function owner_can_manage_inventory_and_non_owner_routes_are_denied_or_hide_costs(): void
    {
        [$productId, $warehouseId] = $this->createProductAndWarehouse('permission-stock', '41.25');
        $this->receive($productId, $warehouseId, 2, '5.50');
        $owner = $this->createIdentity('owner', 'phase4-owner', 'Phase 4 Owner');

        $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', $owner['token'])
            ->getJson('/api/v1/inventory/balances?product_id='.$productId.'&warehouse_id='.$warehouseId)
            ->assertOk()
            ->assertJsonPath('data.0.average_unit_cost_egp', '5.50');
        $reauthentication = $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', $owner['token'])
            ->withHeader('X-CSRF-Token', $owner['csrf'])
            ->postJson('/api/v1/auth/reauth', ['password' => 'inventory test password']);
        $reauthentication->assertOk();
        self::assertSame(
            Carbon::parse($reauthentication->json('data.verified_at'))->addMinutes(10)->toDateTimeString(),
            $reauthentication->json('data.expires_at'),
        );

        $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', $owner['token'])
            ->withHeader('X-CSRF-Token', $owner['csrf'])
            ->getJson('/api/v1/products/'.$productId)
            ->assertOk()
            ->assertJsonPath('data.company_price', '41.25');

        $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', $owner['token'])
            ->getJson('/api/v1/inventory/balances?product_id='.$productId.'&warehouse_id='.$warehouseId)
            ->assertOk()
            ->assertJsonPath('data.0.average_unit_cost_egp', '5.50');

        $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', $owner['token'])
            ->withHeader('X-CSRF-Token', $owner['csrf'])
            ->postJson('/api/v1/inventory/opening-stock', [
                'product_id' => $productId,
                'warehouse_id' => $warehouseId,
                'quantity' => 2,
                'unit_cost_egp' => '3.00',
                'movement_date' => '2026-10-01',
                'reason' => 'Opening stock test',
            ])
            ->assertStatus(422)
            ->assertJsonStructure(['error' => ['details' => ['product_id']]]);

        self::assertSame(0, DB::table('audit_logs')->where('action', 'inventory.opening')->count());

        $category = $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', $owner['token'])
            ->withHeader('X-CSRF-Token', $owner['csrf'])
            ->postJson('/api/v1/categories', ['code' => 'CAT-PHASE4', 'name' => 'Phase 4 Category'])
            ->assertCreated()
            ->json('data');

        $warehouse = $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', $owner['token'])
            ->withHeader('X-CSRF-Token', $owner['csrf'])
            ->postJson('/api/v1/warehouses', [
                'code' => 'LOC-PHASE4-API',
                'name' => 'Phase 4 Warehouse',
                'location_type' => 'main',
            ])
            ->assertCreated()
            ->json('data');

        $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', $owner['token'])
            ->withHeader('X-CSRF-Token', $owner['csrf'])
            ->postJson('/api/v1/inventory/transfers', [
                'product_id' => $productId,
                'source_warehouse_id' => $warehouseId,
                'destination_warehouse_id' => $warehouse['id'],
                'quantity' => 1,
                'movement_date' => '2026-10-10',
                'reason' => 'Owner transfer permission test',
            ])
            ->assertCreated()
            ->assertJsonPath('data.unit_cost_egp', '5.50');

        $managedProduct = $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', $owner['token'])
            ->withHeader('X-CSRF-Token', $owner['csrf'])
            ->postJson('/api/v1/products', [
                'sku' => 'SKU-PHASE4-API',
                'name' => 'Managed Product',
                'unit_code' => 'each',
                'category_id' => $category['id'],
                'default_location_id' => $warehouse['id'],
                'company_price' => '12.345',
            ])
            ->assertCreated()
            ->assertJsonPath('data.company_price', '12.35')
            ->json('data');

        $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', $owner['token'])
            ->withHeader('X-CSRF-Token', $owner['csrf'])
            ->patchJson('/api/v1/products/'.$managedProduct['id'], ['name' => 'Managed Product Updated'])
            ->assertOk()
            ->assertJsonPath('data.name', 'Managed Product Updated');

        $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', $owner['token'])
            ->withHeader('X-CSRF-Token', $owner['csrf'])
            ->deleteJson('/api/v1/products/'.$managedProduct['id'])
            ->assertOk()
            ->assertJsonPath('data.status', 'deactivated');

        self::assertSame(3, DB::table('audit_logs')->where('entity_type', 'product')->count());

        $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', $owner['token'])
            ->withHeader('X-CSRF-Token', $owner['csrf'])
            ->deleteJson('/api/v1/products/'.$productId)
            ->assertUnprocessable();

        $readOnly = $this->createIdentity('read_only', 'phase4-reader', 'Phase 4 Reader');

        $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', $readOnly['token'])
            ->getJson('/api/v1/products')
            ->assertOk()
            ->assertJsonMissingPath('data.0.company_price');

        $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', $readOnly['token'])
            ->withHeader('X-CSRF-Token', $readOnly['csrf'])
            ->postJson('/api/v1/products', ['sku' => 'NO-ACCESS', 'name' => 'Denied', 'unit_code' => 'each'])
            ->assertForbidden();

        $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', $readOnly['token'])
            ->withHeader('X-CSRF-Token', $readOnly['csrf'])
            ->postJson('/api/v1/auth/reauth', ['password' => 'inventory test password'])
            ->assertOk();
        $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', $readOnly['token'])
            ->withHeader('X-CSRF-Token', $readOnly['csrf'])
            ->postJson('/api/v1/products', ['sku' => 'NO-ACCESS', 'name' => 'Denied', 'unit_code' => 'each'])
            ->assertForbidden();

        DB::table('auth_sessions')
            ->where('token_hash', hash('sha256', $readOnly['token'], true))
            ->update(['step_up_verified_at' => now()->subMinutes(11)]);
        $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', $readOnly['token'])
            ->getJson('/api/v1/inventory/balances')
            ->assertForbidden();

        $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', $readOnly['token'])
            ->withHeader('X-CSRF-Token', $readOnly['csrf'])
            ->postJson('/api/v1/inventory/transfers', [
                'product_id' => $productId,
                'source_warehouse_id' => $warehouseId,
                'destination_warehouse_id' => $warehouse['id'],
                'quantity' => 1,
                'reason' => 'Denied transfer',
            ])
            ->assertForbidden();

        $driver = $this->createIdentity('driver', 'phase4-driver', 'السواق');
        $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', $driver['token'])
            ->getJson('/api/v1/products/'.$productId)
            ->assertOk()
            ->assertJsonPath('data.company_price', '41.25');
        $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', $driver['token'])
            ->getJson('/api/v1/inventory/balances?product_id='.$productId.'&warehouse_id='.$warehouseId)
            ->assertOk()
            ->assertJsonMissingPath('data.0.average_unit_cost_egp')
            ->assertJsonMissingPath('data.0.inventory_value_egp');

        $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', $readOnly['token'])
            ->withHeader('X-CSRF-Token', $readOnly['csrf'])
            ->postJson('/api/v1/auth/reauth', ['password' => 'inventory test password'])
            ->assertOk();
        $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', $readOnly['token'])
            ->withHeader('X-CSRF-Token', $readOnly['csrf'])
            ->postJson('/api/v1/inventory/transfers', [
                'product_id' => $productId,
                'source_warehouse_id' => $warehouseId,
                'destination_warehouse_id' => $warehouse['id'],
                'quantity' => 1,
                'reason' => 'Denied after step-up',
            ])
            ->assertForbidden();

        DB::table('auth_sessions')
            ->where('token_hash', hash('sha256', $readOnly['token'], true))
            ->update(['step_up_verified_at' => now()->subMinutes(11)]);
        $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', $readOnly['token'])
            ->withHeader('X-CSRF-Token', $readOnly['csrf'])
            ->postJson('/api/v1/inventory/transfers', [
                'product_id' => $productId,
                'source_warehouse_id' => $warehouseId,
                'destination_warehouse_id' => $warehouse['id'],
                'quantity' => 1,
                'reason' => 'Expired step-up',
            ])
            ->assertForbidden();

        $this->withUnencryptedCookie('precision_slate_session', 'not-a-session')
            ->getJson('/api/v1/products')
            ->assertUnauthorized();
    }

    #[Test]
    public function exact_money_handles_decimal_rounding_without_float_arithmetic(): void
    {
        self::assertSame('101', ExactMoney::toCents('1.005'));
        self::assertSame('100', ExactMoney::toCents('1.0049'));
        self::assertSame('1.67', ExactMoney::fromCents(ExactMoney::divideRounded('500', 3)));
        self::assertSame('123450000012345', ExactMoney::multiply('12345', 10000000001));
    }

    #[Test]
    public function container_creation_receives_all_product_lines_into_stock_once(): void
    {
        $this->createContainerTemporaryTables();
        [$productId, $warehouseId] = $this->createProductAndWarehouse('container-create');
        $controller = app(ContainerController::class);
        $containerId = $this->storeReceivedContainer($controller, 'CONT-CREATE-1', $warehouseId, [[
            'product_id' => $productId,
            'quantity' => 3,
            'purchase_unit_cost_egp' => '10.00',
        ]]);

        self::assertSame(3, (int) DB::table('inventory_balances')->where('product_id', $productId)
            ->where('location_id', $warehouseId)->value('quantity_on_hand'));
        self::assertSame('30.0000', DB::table('inventory_balances')->where('product_id', $productId)
            ->where('location_id', $warehouseId)->value('inventory_value_egp'));
        self::assertSame(1, DB::table('container_receipts')->where('container_id', $containerId)->where('status', 'posted')->count());
        self::assertSame(1, DB::table('inventory_movements')->where('source_type', 'container_receipt')
            ->where('source_id', DB::table('container_receipts')->where('container_id', $containerId)->value('id'))->count());
        $this->assertBalanceMatchesPostedMovementLines($productId, $warehouseId);
    }

    #[Test]
    public function container_costs_allocate_by_quantity_and_late_costs_revalue_remaining_stock(): void
    {
        $this->createContainerTemporaryTables();
        [$firstProduct, $firstWarehouse] = $this->createProductAndWarehouse('container-quantity-a');
        [$secondProduct] = $this->createProductAndWarehouse('container-quantity-b');
        $controller = app(ContainerController::class);
        $containerId = $this->storeReceivedContainer($controller, 'CONT-QUANTITY-1', $firstWarehouse, [
            ['product_id' => $firstProduct, 'quantity' => 1, 'purchase_unit_cost_egp' => '100.00'],
            ['product_id' => $secondProduct, 'quantity' => 3, 'purchase_unit_cost_egp' => '100.00'],
        ]);
        $controller->configureCostType($this->containerRequest('PUT', [
            'include_in_inventory_cost' => true,
        ]), 'customs');
        $costId = $this->responseDataId($controller->addCost($this->containerRequest('POST', [
            'cost_type' => 'customs',
            'amount_egp' => '1.00',
        ]), $containerId));
        $quantityAllocations = DB::table('container_cost_allocations as allocation')
            ->join('container_receipt_lines as receipt_line', 'receipt_line.id', '=', 'allocation.container_receipt_line_id')
            ->where('allocation.container_cost_id', $costId)
            ->orderBy('receipt_line.product_id')
            ->pluck('allocation.allocated_amount', 'receipt_line.product_id');
        self::assertSame('0.2500', $quantityAllocations[$firstProduct]);
        self::assertSame('0.7500', $quantityAllocations[$secondProduct]);

        $beforeValue = DB::table('inventory_balances')->where('product_id', $firstProduct)->value('inventory_value_egp');
        $lateCostId = $this->responseDataId($controller->addCost($this->containerRequest('POST', [
            'cost_type' => 'customs',
            'amount_egp' => '5.00',
        ]), $containerId));
        self::assertSame(2, DB::table('container_cost_allocations')->where('container_cost_id', $lateCostId)->count());
        self::assertSame('5.0000', DB::table('container_cost_revaluations')
            ->where('container_cost_id', $lateCostId)
            ->sum('allocated_amount_egp'));
        self::assertSame('1.25', ExactMoney::fromCents(ExactMoney::subtract(
            ExactMoney::toCents((string) DB::table('inventory_balances')->where('product_id', $firstProduct)->value('inventory_value_egp')),
            ExactMoney::toCents((string) $beforeValue),
        )));
    }

    #[Test]
    public function container_cost_payments_link_only_matching_treasury_outflows(): void
    {
        $this->createContainerTemporaryTables();
        [$productId, $warehouseId] = $this->createProductAndWarehouse('container-payment');
        $controller = app(ContainerController::class);
        $containerId = $this->storeReceivedContainer($controller, 'CONT-PAYMENT-1', $warehouseId, [[
            'product_id' => $productId,
            'quantity' => 1,
            'purchase_unit_cost_egp' => '1.00',
        ]]);
        $costId = $this->responseDataId($controller->addCost($this->containerRequest('POST', [
            'cost_type' => 'freight',
            'amount_egp' => '3.00',
        ]), $containerId));
        $treasuryAccountId = (int) DB::table('treasury_accounts')->insertGetId([
            'code' => 'CONTAINER-PAY-'.strtoupper(bin2hex(random_bytes(4))),
            'name' => 'Container payment fixture cash',
            'account_type' => 'cash',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $firstEntryId = (int) DB::table('treasury_entries')->insertGetId(['treasury_account_id' => $treasuryAccountId, 'direction' => 'out', 'amount' => '1.25']);
        $secondEntryId = (int) DB::table('treasury_entries')->insertGetId(['treasury_account_id' => $treasuryAccountId, 'direction' => 'out', 'amount' => '1.75']);

        $controller->linkPayment($this->containerRequest('POST', [
            'treasury_entry_id' => $firstEntryId,
            'amount_egp' => '1.25',
        ]), $costId);
        self::assertSame('incurred', DB::table('container_costs')->where('id', $costId)->value('status'));
        try {
            $controller->linkPayment($this->containerRequest('POST', [
                'treasury_entry_id' => $secondEntryId,
                'amount_egp' => '1.74',
            ]), $costId);
            self::fail('A payment that differs from its treasury outflow must be rejected.');
        } catch (ValidationException $exception) {
            self::assertArrayHasKey('amount_egp', $exception->errors());
        }
        $controller->linkPayment($this->containerRequest('POST', [
            'treasury_entry_id' => $secondEntryId,
            'amount_egp' => '1.75',
        ]), $costId);

        self::assertSame('paid', DB::table('container_costs')->where('id', $costId)->value('status'));
        self::assertSame('3.0000', DB::table('container_cost_payments')->where('container_cost_id', $costId)->sum('amount_egp'));
        self::assertSame(2, DB::table('financial_outbox_events')->where('source_type', 'container_cost_payment')->count());
    }

    #[Test]
    public function failed_container_audit_rolls_back_the_receipt_and_stock(): void
    {
        $this->createContainerTemporaryTables();
        [$productId, $warehouseId] = $this->createProductAndWarehouse('container-rollback');
        $controller = app(ContainerController::class);
        DB::statement("ALTER TABLE audit_logs ADD CONSTRAINT chk_test_reject_container_create CHECK (entity_type <> 'container' OR action <> 'container.created')");

        try {
            $controller->store($this->containerRequest('POST', [
                'container_name' => 'Rollback container',
                'container_number' => 'CONT-ROLLBACK-1',
                'received_location_id' => $warehouseId,
                'lines' => [[
                    'product_id' => $productId,
                    'quantity' => 2,
                    'purchase_unit_cost_egp' => '10.00',
                ]],
            ]));
            self::fail('A container audit failure must roll back the container and stock receipt.');
        } catch (QueryException) {
            self::assertSame(0, DB::table('containers')->where('container_number', 'CONT-ROLLBACK-1')->count());
            self::assertSame(0, DB::table('container_receipts')->count());
            self::assertSame(0, DB::table('inventory_balances')->where('product_id', $productId)->count());
            self::assertSame(0, DB::table('inventory_movements')->where('movement_type', 'container_receipt')->count());
        }
    }

    #[Test]
    public function container_routes_require_authentication_and_the_container_view_permission(): void
    {
        $this->createContainerTemporaryTables();
        $owner = $this->createIdentity('owner', 'container-route-owner', 'Container Owner');
        $readOnly = $this->createIdentity('read_only', 'container-route-reader', 'Container Reader');

        $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', $owner['token'])
            ->getJson('/api/v1/containers')
            ->assertOk();
        $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', $readOnly['token'])
            ->getJson('/api/v1/containers')
            ->assertForbidden();
        $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', $owner['token'])
            ->withHeader('X-CSRF-Token', $owner['csrf'])
            ->postJson('/api/v1/auth/reauth', ['password' => 'inventory test password'])
            ->assertOk();
        $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', $owner['token'])
            ->withHeader('X-CSRF-Token', $owner['csrf'])
            ->postJson('/api/v1/containers', ['container_number' => 'CONT-ROUTE-OWNER'])
            ->assertUnprocessable();
        $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', $readOnly['token'])
            ->withHeader('X-CSRF-Token', $readOnly['csrf'])
            ->postJson('/api/v1/auth/reauth', ['password' => 'inventory test password'])
            ->assertOk();
        $this->withCredentials()
            ->withUnencryptedCookie('precision_slate_session', $readOnly['token'])
            ->withHeader('X-CSRF-Token', $readOnly['csrf'])
            ->postJson('/api/v1/containers', ['container_number' => 'CONT-ROUTE-DENIED'])
            ->assertForbidden();
        $this->withUnencryptedCookie('precision_slate_session', 'not-a-session')
            ->getJson('/api/v1/containers')
            ->assertUnauthorized();
    }

    private function createTemporaryTables(): void
    {
        $definitions = [
            'users' => 'CREATE TEMPORARY TABLE users (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, username VARCHAR(100) NULL UNIQUE, display_name VARCHAR(160) NOT NULL, password_hash VARCHAR(255) NOT NULL, is_active TINYINT(1) NOT NULL DEFAULT 1, password_changed_at DATETIME NULL, last_login_at DATETIME NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
            'auth_sessions' => 'CREATE TEMPORARY TABLE auth_sessions (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, user_id BIGINT UNSIGNED NOT NULL, token_hash BINARY(32) NOT NULL UNIQUE, csrf_token_hash BINARY(32) NULL, expires_at DATETIME NOT NULL, last_seen_at DATETIME NULL, step_up_verified_at DATETIME NULL, revoked_at DATETIME NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
            'roles' => 'CREATE TEMPORARY TABLE roles (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, code VARCHAR(80) NOT NULL UNIQUE, name VARCHAR(120) NOT NULL, description VARCHAR(500) NULL, is_system TINYINT(1) NOT NULL DEFAULT 0, is_active TINYINT(1) NOT NULL DEFAULT 1, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
            'permissions' => 'CREATE TEMPORARY TABLE permissions (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, code VARCHAR(120) NOT NULL UNIQUE, description VARCHAR(500) NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
            'user_roles' => 'CREATE TEMPORARY TABLE user_roles (user_id BIGINT UNSIGNED NOT NULL, role_id BIGINT UNSIGNED NOT NULL, granted_by_user_id BIGINT UNSIGNED NULL, granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (user_id, role_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
            'role_permissions' => 'CREATE TEMPORARY TABLE role_permissions (role_id BIGINT UNSIGNED NOT NULL, permission_id BIGINT UNSIGNED NOT NULL, granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (role_id, permission_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
            'audit_logs' => 'CREATE TEMPORARY TABLE audit_logs (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, actor_user_id BIGINT UNSIGNED NULL, actor_name_snapshot VARCHAR(160) NULL, action VARCHAR(100) NOT NULL, entity_type VARCHAR(100) NOT NULL, entity_id BIGINT UNSIGNED NULL, reason VARCHAR(1000) NULL, before_data LONGTEXT NULL, after_data LONGTEXT NULL, request_id VARCHAR(100) NULL, ip_address VARBINARY(16) NULL, user_agent VARCHAR(500) NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
            'trash_items' => 'CREATE TEMPORARY TABLE trash_items (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, entity_type VARCHAR(80) NOT NULL, entity_id BIGINT UNSIGNED NOT NULL, label VARCHAR(200) NOT NULL, snapshot LONGTEXT NOT NULL, deleted_by_user_id BIGINT UNSIGNED NULL, deleted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, restored_by_user_id BIGINT UNSIGNED NULL, restored_at TIMESTAMP NULL, permanently_deleted_by_user_id BIGINT UNSIGNED NULL, permanently_deleted_at TIMESTAMP NULL, INDEX idx_test_trash_entity (entity_type, entity_id, restored_at)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
            'product_categories' => 'CREATE TEMPORARY TABLE product_categories (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, parent_category_id BIGINT UNSIGNED NULL, code VARCHAR(80) NULL UNIQUE, name VARCHAR(160) NOT NULL, is_active TINYINT(1) NOT NULL DEFAULT 1, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
            'products' => 'CREATE TEMPORARY TABLE products (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, sku VARCHAR(100) NOT NULL UNIQUE, barcode VARCHAR(100) NULL UNIQUE, name VARCHAR(200) NOT NULL, category_id BIGINT UNSIGNED NULL, unit_code VARCHAR(32) NOT NULL, company_price DECIMAL(19,4) NULL, purchase_cost_egp DECIMAL(19,4) NULL, default_location_id BIGINT UNSIGNED NULL, minimum_stock INT UNSIGNED NULL, description TEXT NULL, is_active TINYINT(1) NOT NULL DEFAULT 1, created_by_user_id BIGINT UNSIGNED NULL, updated_by_user_id BIGINT UNSIGNED NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
            'locations' => 'CREATE TEMPORARY TABLE locations (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, parent_location_id BIGINT UNSIGNED NULL, code VARCHAR(80) NOT NULL UNIQUE, name VARCHAR(160) NOT NULL, location_type VARCHAR(20) NOT NULL, is_active TINYINT(1) NOT NULL DEFAULT 1, notes VARCHAR(500) NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
            'inventory_movements' => 'CREATE TEMPORARY TABLE inventory_movements (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, movement_number VARCHAR(80) NOT NULL UNIQUE, movement_type VARCHAR(30) NOT NULL, status VARCHAR(20) NOT NULL, movement_date DATE NOT NULL, source_type VARCHAR(80) NULL, source_id BIGINT UNSIGNED NULL, reversal_of_movement_id BIGINT UNSIGNED NULL, reason VARCHAR(1000) NULL, created_by_user_id BIGINT UNSIGNED NULL, posted_by_user_id BIGINT UNSIGNED NULL, posted_at DATETIME NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
            'inventory_movement_lines' => 'CREATE TEMPORARY TABLE inventory_movement_lines (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, inventory_movement_id BIGINT UNSIGNED NOT NULL, line_number INT UNSIGNED NOT NULL, product_id BIGINT UNSIGNED NOT NULL, from_location_id BIGINT UNSIGNED NULL, to_location_id BIGINT UNSIGNED NULL, sales_document_line_id BIGINT UNSIGNED NULL, container_receipt_line_id BIGINT UNSIGNED NULL, reversal_of_movement_line_id BIGINT UNSIGNED NULL, quantity INT UNSIGNED NOT NULL, unit_cost_egp_snapshot DECIMAL(19,4) NULL, line_cost_egp_snapshot DECIMAL(19,4) NULL, notes VARCHAR(500) NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY uq_inventory_movement_lines_number (inventory_movement_id, line_number)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
            'inventory_balances' => 'CREATE TEMPORARY TABLE inventory_balances (product_id BIGINT UNSIGNED NOT NULL, location_id BIGINT UNSIGNED NOT NULL, quantity_on_hand INT NOT NULL DEFAULT 0, quantity_reserved INT UNSIGNED NOT NULL DEFAULT 0, average_unit_cost_egp DECIMAL(19,4) NULL, inventory_value_egp DECIMAL(19,4) NULL, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY (product_id, location_id), CONSTRAINT chk_test_nonnegative_stock CHECK (quantity_on_hand >= 0)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
        ];

        foreach ($definitions as $table => $sql) {
            DB::statement("DROP TEMPORARY TABLE IF EXISTS `{$table}`");
            DB::statement($sql);
        }
    }

    private function createContainerTemporaryTables(): void
    {
        $definitions = [
            'treasury_entries' => 'CREATE TEMPORARY TABLE treasury_entries (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, treasury_account_id BIGINT UNSIGNED NOT NULL, direction VARCHAR(10) NOT NULL, amount DECIMAL(19,4) NOT NULL, entry_date DATE NULL, created_by_user_id BIGINT UNSIGNED NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
            'financial_outbox_events' => 'CREATE TEMPORARY TABLE financial_outbox_events (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, event_type VARCHAR(100) NOT NULL, source_type VARCHAR(100) NOT NULL, source_id BIGINT UNSIGNED NOT NULL, payload LONGTEXT NOT NULL, attempts INT UNSIGNED NOT NULL DEFAULT 0, last_error TEXT NULL, occurred_at DATETIME NOT NULL, processed_at DATETIME NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY uq_financial_outbox_source_event (source_type, source_id, event_type)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
            'containers' => 'CREATE TEMPORARY TABLE containers (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, container_name VARCHAR(160) NOT NULL, container_number VARCHAR(100) NOT NULL UNIQUE, status VARCHAR(32) NOT NULL, tracking_stage VARCHAR(32) NULL, supplier_id BIGINT UNSIGNED NULL, shipping_driver_id BIGINT UNSIGNED NULL, trip_reference VARCHAR(100) NULL, origin VARCHAR(160) NULL, destination VARCHAR(160) NULL, landed_cost_allocation_basis VARCHAR(20) NULL, estimated_departure DATE NULL, estimated_arrival DATE NULL, received_at DATETIME NULL, received_location_id BIGINT UNSIGNED NULL, current_location_id BIGINT UNSIGNED NULL, notes TEXT NULL, created_by_user_id BIGINT UNSIGNED NULL, received_by_user_id BIGINT UNSIGNED NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
            'container_lines' => 'CREATE TEMPORARY TABLE container_lines (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, container_id BIGINT UNSIGNED NOT NULL, line_number INT UNSIGNED NOT NULL, product_id BIGINT UNSIGNED NOT NULL, expected_quantity INT UNSIGNED NOT NULL, purchase_value_egp DECIMAL(19,4) NULL, received_quantity INT UNSIGNED NULL, purchase_unit_cost_egp DECIMAL(19,4) NULL, notes VARCHAR(500) NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
            'container_cost_type_settings' => 'CREATE TEMPORARY TABLE container_cost_type_settings (cost_type VARCHAR(80) NOT NULL PRIMARY KEY, include_in_inventory_cost TINYINT(1) NOT NULL, updated_by_user_id BIGINT UNSIGNED NULL, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
            'container_costs' => 'CREATE TEMPORARY TABLE container_costs (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, container_id BIGINT UNSIGNED NOT NULL, supplier_id BIGINT UNSIGNED NULL, cost_type VARCHAR(80) NOT NULL, description VARCHAR(500) NULL, amount_egp DECIMAL(19,4) NOT NULL, include_in_inventory_cost TINYINT(1) NOT NULL DEFAULT 0, original_amount_reference DECIMAL(19,4) NULL, exchange_rate_reference DECIMAL(19,8) NULL, original_currency_code_reference VARCHAR(16) NULL, cost_date DATE NULL, status VARCHAR(20) NOT NULL, created_by_user_id BIGINT UNSIGNED NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
            'container_receipts' => 'CREATE TEMPORARY TABLE container_receipts (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, container_id BIGINT UNSIGNED NOT NULL, inventory_movement_id BIGINT UNSIGNED NOT NULL, status VARCHAR(20) NOT NULL, received_at DATETIME NOT NULL, received_by_user_id BIGINT UNSIGNED NULL, costing_method_snapshot VARCHAR(32) NULL, allocation_basis_snapshot VARCHAR(20) NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
            'container_receipt_lines' => 'CREATE TEMPORARY TABLE container_receipt_lines (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, container_receipt_id BIGINT UNSIGNED NOT NULL, inventory_movement_id BIGINT UNSIGNED NOT NULL, container_id BIGINT UNSIGNED NOT NULL, container_line_id BIGINT UNSIGNED NOT NULL, product_id BIGINT UNSIGNED NOT NULL, expected_quantity INT UNSIGNED NOT NULL, received_quantity INT UNSIGNED NOT NULL, discrepancy_quantity BIGINT NOT NULL, discrepancy_reason VARCHAR(1000) NULL, condition_code VARCHAR(24) NOT NULL DEFAULT "good", received_at DATETIME NOT NULL, received_by_user_id BIGINT UNSIGNED NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
            'container_cost_revaluations' => 'CREATE TEMPORARY TABLE container_cost_revaluations (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, container_cost_id BIGINT UNSIGNED NOT NULL, container_receipt_line_id BIGINT UNSIGNED NOT NULL, product_id BIGINT UNSIGNED NOT NULL, location_id BIGINT UNSIGNED NOT NULL, quantity_on_hand_at_posting INT UNSIGNED NOT NULL DEFAULT 0, allocated_amount_egp DECIMAL(19,4) NOT NULL, capitalized_amount_egp DECIMAL(19,4) NOT NULL, unapplied_amount_egp DECIMAL(19,4) NOT NULL, created_by_user_id BIGINT UNSIGNED NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY uq_container_cost_revaluation_line (container_cost_id, container_receipt_line_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
            'container_cost_allocations' => 'CREATE TEMPORARY TABLE container_cost_allocations (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, container_cost_id BIGINT UNSIGNED NOT NULL, container_id BIGINT UNSIGNED NOT NULL, container_receipt_line_id BIGINT UNSIGNED NOT NULL, allocated_amount DECIMAL(19,4) NOT NULL, allocation_basis VARCHAR(20) NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
            'container_cost_payments' => 'CREATE TEMPORARY TABLE container_cost_payments (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, container_cost_id BIGINT UNSIGNED NOT NULL, treasury_entry_id BIGINT UNSIGNED NOT NULL UNIQUE, journal_entry_id BIGINT UNSIGNED NULL, amount_egp DECIMAL(19,4) NOT NULL, paid_at DATETIME NOT NULL, created_by_user_id BIGINT UNSIGNED NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
            'container_status_history' => 'CREATE TEMPORARY TABLE container_status_history (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, container_id BIGINT UNSIGNED NOT NULL, old_status VARCHAR(32) NULL, new_status VARCHAR(32) NOT NULL, changed_by_user_id BIGINT UNSIGNED NULL, reason VARCHAR(1000) NULL, changed_at DATETIME NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
            'container_tracking_events' => 'CREATE TEMPORARY TABLE container_tracking_events (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, container_id BIGINT UNSIGNED NOT NULL, event_type VARCHAR(24) NOT NULL, occurred_at DATETIME NOT NULL, reference_number VARCHAR(120) NULL, details VARCHAR(500) NULL, from_location_id BIGINT UNSIGNED NULL, to_location_id BIGINT UNSIGNED NULL, quantity INT UNSIGNED NULL, amount_egp DECIMAL(19,4) NULL, source_id BIGINT UNSIGNED NULL, created_by_user_id BIGINT UNSIGNED NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
        ];
        foreach ($definitions as $table => $sql) {
            DB::statement("DROP TEMPORARY TABLE IF EXISTS `{$table}`");
            DB::statement($sql);
        }
    }

    private function containerRequest(string $method, array $input): Request
    {
        $request = Request::create('/api/v1/containers/test', $method, $input);
        $request->attributes->set('authenticated_user', (object) ['id' => 1, 'display_name' => 'Test Owner']);
        $request->attributes->set('request_id', 'phase5-test');

        return $request;
    }

    private function responseDataId(JsonResponse $response): int
    {
        return (int) $response->getData(true)['data']['id'];
    }

    /** @param array<int, array{product_id: int, quantity: int, purchase_unit_cost_egp: string}> $lines */
    private function storeReceivedContainer(ContainerController $controller, string $number, int $warehouseId, array $lines): int
    {
        return $this->responseDataId($controller->store($this->containerRequest('POST', [
            'container_name' => 'Test container '.$number,
            'container_number' => $number,
            'received_location_id' => $warehouseId,
            'lines' => $lines,
        ])));
    }

    /**
     * @return array{0: int, 1: int}
     */
    private function createProductAndWarehouse(string $suffix, string $companyPrice = '0.00'): array
    {
        $categoryId = (int) DB::table('product_categories')->insertGetId(['name' => 'Test Category']);
        $warehouseId = (int) DB::table('locations')->insertGetId([
            'code' => 'LOC-'.$suffix,
            'name' => 'Warehouse '.$suffix,
            'location_type' => 'main',
        ]);
        $productId = (int) DB::table('products')->insertGetId([
            'sku' => 'SKU-'.$suffix,
            'name' => 'Product '.$suffix,
            'category_id' => $categoryId,
            'unit_code' => 'each',
            'company_price' => $companyPrice,
            'is_active' => true,
        ]);

        return [$productId, $warehouseId];
    }

    /**
     * @return array<string, int|string|null>
     */
    private function receive(int $productId, int $warehouseId, int $quantity, string $unitCost): array
    {
        return $this->inventory->receive(
            $productId,
            $warehouseId,
            $quantity,
            $unitCost,
            ['movement_type' => 'receipt'],
            $this->actorRequest(),
        );
    }

    /**
     * @return array<string, int|string|null>
     */
    private function issue(int $productId, int $warehouseId, int $quantity): array
    {
        return $this->inventory->issue(
            $productId,
            $warehouseId,
            $quantity,
            ['movement_type' => 'adjustment', 'reason' => 'test issue'],
            $this->actorRequest(),
        );
    }

    private function actorRequest(): Request
    {
        $request = Request::create('/api/v1/inventory/test', 'POST');
        $request->attributes->set('authenticated_user', (object) ['id' => 1, 'display_name' => 'Test Owner']);
        $request->attributes->set('request_id', 'phase4-test');

        return $request;
    }

    /**
     * @return array{token: string, csrf: string}
     */
    private function createIdentity(string $roleCode, string $username, string $displayName): array
    {
        $userId = (int) DB::table('users')->insertGetId([
            'username' => $username,
            'display_name' => $displayName,
            'password_hash' => Hash::make('inventory test password'),
            'is_active' => true,
        ]);
        $roleId = DB::table('roles')->where('code', $roleCode)->value('id');
        DB::table('user_roles')->insert(['user_id' => $userId, 'role_id' => $roleId]);

        $token = bin2hex(random_bytes(32));
        $csrf = bin2hex(random_bytes(32));
        DB::table('auth_sessions')->insert([
            'user_id' => $userId,
            'token_hash' => hash('sha256', $token, true),
            'csrf_token_hash' => hash('sha256', $csrf, true),
            'expires_at' => now()->addHours(12),
            'last_seen_at' => now(),
        ]);

        return ['token' => $token, 'csrf' => $csrf];
    }

    private function assertBalanceMatchesPostedMovementLines(int $productId, int $warehouseId): void
    {
        $ledgerValueCents = '0';
        $lines = DB::table('inventory_movement_lines as line')
            ->join('inventory_movements as movement', 'movement.id', '=', 'line.inventory_movement_id')
            ->where('movement.status', 'posted')
            ->where('line.product_id', $productId)
            ->get(['line.from_location_id', 'line.to_location_id', 'line.line_cost_egp_snapshot']);

        foreach ($lines as $line) {
            $lineCents = ExactMoney::toCents((string) $line->line_cost_egp_snapshot);

            if ((int) $line->to_location_id === $warehouseId) {
                $ledgerValueCents = ExactMoney::add($ledgerValueCents, $lineCents);
            }

            if ((int) $line->from_location_id === $warehouseId) {
                $ledgerValueCents = ExactMoney::subtract($ledgerValueCents, $lineCents);
            }
        }

        $balanceCents = ExactMoney::toCents((string) DB::table('inventory_balances')
            ->where('product_id', $productId)
            ->where('location_id', $warehouseId)
            ->value('inventory_value_egp'));

        self::assertSame($ledgerValueCents, $balanceCents);
    }
}
