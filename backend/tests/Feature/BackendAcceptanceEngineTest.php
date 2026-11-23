<?php

namespace Tests\Feature;

use App\Http\Controllers\CatalogController;
use App\Http\Controllers\ContainerController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\ReportsController;
use App\Http\Controllers\SalesController;
use App\Services\InventoryService;
use App\Services\MasterDataService;
use App\Services\ReportsService;
use App\Services\SalesService;
use App\Services\TreasuryService;
use App\Support\ExactMoney;
use Database\Seeders\AppSettingsSeeder;
use Database\Seeders\RolePermissionMatrixSeeder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use PHPUnit\Framework\Attributes\Test;
use RuntimeException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class BackendAcceptanceEngineTest extends TestCase
{
    private ?string $connection = null;

    private object $owner;

    private object $driver;

    protected function setUp(): void
    {
        parent::setUp();
        $connection = getenv('AUTH_TEST_CONNECTION');
        if (! is_string($connection) || ! in_array($connection, ['mysql_test', 'mariadb_test'], true)) {
            $this->markTestSkipped('Set AUTH_TEST_CONNECTION to mysql_test or mariadb_test to run backend acceptance coverage.');
        }
        $this->connection = $connection;
        config(['database.default' => $connection]);
        DB::setDefaultConnection($connection);
        DB::purge($connection);
        if (config("database.connections.{$connection}.database") !== 'erp_acceptance_tests'
            || (DB::selectOne('SELECT DATABASE() AS database_name')->database_name ?? null) !== 'erp_acceptance_tests') {
            throw new RuntimeException('Backend acceptance tests require the erp_acceptance_tests database.');
        }

        DB::beginTransaction();
        app(RolePermissionMatrixSeeder::class)->run();
        app(AppSettingsSeeder::class)->run();
        $this->owner = $this->createUserWithRole('owner', 'Acceptance Owner');
        $this->driver = $this->createUserWithRole('driver', 'Acceptance Driver');
    }

    protected function tearDown(): void
    {
        if ($this->connection !== null) {
            if (DB::transactionLevel() > 0) {
                DB::rollBack();
            }
            DB::purge($this->connection);
        }
        parent::tearDown();
    }

    #[Test]
    public function landed_cost_sales_returns_collection_transfer_and_treasury_payment_reconcile_end_to_end(): void
    {
        $suffix = strtoupper(bin2hex(random_bytes(4)));
        $masterData = app(MasterDataService::class);
        $customerId = $masterData->createCustomer($this->request($this->owner, '/api/v1/customers', 'customer-'.$suffix), [
            'name' => 'Acceptance Customer '.$suffix,
            'phone' => '+201'.str_pad((string) hexdec(substr($suffix, 0, 6)), 9, '0', STR_PAD_LEFT),
        ]);
        $productOneId = $masterData->createProduct($this->request($this->owner, '/api/v1/products', 'product-one-'.$suffix), [
            'sku' => 'E2E-A-'.$suffix,
            'name' => 'Acceptance product A',
            'unit_code' => 'each',
            'company_price' => '4.00',
        ]);
        $productTwoId = $masterData->createProduct($this->request($this->owner, '/api/v1/products', 'product-two-'.$suffix), [
            'sku' => 'E2E-B-'.$suffix,
            'name' => 'Acceptance product B',
            'unit_code' => 'each',
            'company_price' => '8.00',
        ]);

        $catalog = app(CatalogController::class);
        $warehouseOneId = (int) $catalog->createWarehouse($this->request($this->owner, '/api/v1/warehouses', 'warehouse-one-'.$suffix, 'POST', [
            'code' => 'E2E-A-'.$suffix,
            'name' => 'Acceptance warehouse A',
            'location_type' => 'main',
        ]))->getData(true)['data']['id'];
        $warehouseTwoId = (int) $catalog->createWarehouse($this->request($this->owner, '/api/v1/warehouses', 'warehouse-two-'.$suffix, 'POST', [
            'code' => 'E2E-B-'.$suffix,
            'name' => 'Acceptance warehouse B',
            'location_type' => 'sub',
        ]))->getData(true)['data']['id'];

        $reports = app(ReportsService::class);
        $invoiceIds = [];
        $this->printSnapshot('catalog and warehouses created', [$productOneId, $productTwoId], [$warehouseOneId, $warehouseTwoId], $customerId, $invoiceIds, $reports);

        $containers = app(ContainerController::class);
        $containerNumber = 'E2E-'.$suffix;
        $containerResponse = $containers->store($this->request($this->owner, '/api/v1/containers', 'container-'.$suffix, 'POST', [
            'container_name' => 'Acceptance container '.$suffix,
            'container_number' => $containerNumber,
            'received_location_id' => $warehouseOneId,
            'supplier_id' => null,
            'origin' => 'Acceptance factory',
            'destination' => 'Acceptance warehouse',
            'lines' => [
                ['product_id' => $productOneId, 'quantity' => 2, 'purchase_unit_cost_egp' => '10.00'],
                ['product_id' => $productTwoId, 'quantity' => 2, 'purchase_unit_cost_egp' => '20.00'],
            ],
        ]));
        $containerId = (int) $containerResponse->getData(true)['data']['id'];
        self::assertSame(2, DB::table('container_lines')->where('container_id', $containerId)->count());
        self::assertSame(1, DB::table('container_receipts')->where('container_id', $containerId)->where('status', 'posted')->count());

        foreach (['freight', 'customs'] as $costType) {
            $containers->configureCostType($this->request($this->owner, '/api/v1/containers/cost-types/'.$costType, 'configure-'.$costType.'-'.$suffix, 'PUT', [
                'include_in_inventory_cost' => true,
            ]), $costType);
        }
        $freightCostId = (int) $containers->addCost($this->request($this->owner, '/api/v1/containers/'.$containerId.'/costs', 'freight-'.$suffix, 'POST', [
            'cost_type' => 'freight',
            'amount_egp' => '6.00',
        ]), $containerId)->getData(true)['data']['id'];
        $containers->addCost($this->request($this->owner, '/api/v1/containers/'.$containerId.'/costs', 'customs-'.$suffix, 'POST', [
            'cost_type' => 'customs',
            'amount_egp' => '4.00',
        ]), $containerId);
        self::assertSame('10.0000', (string) DB::table('container_cost_allocations')->where('container_id', $containerId)->sum('allocated_amount'));
        self::assertSame('70.0000', (string) DB::table('inventory_balances')
            ->whereIn('product_id', [$productOneId, $productTwoId])->sum('inventory_value_egp'));
        $this->printSnapshot('container created with two product lines; all quantities received and costs capitalized', [$productOneId, $productTwoId], [$warehouseOneId, $warehouseTwoId], $customerId, $invoiceIds, $reports);

        $inventory = app(InventoryService::class);
        $inventory->transfer($productTwoId, $warehouseOneId, $warehouseTwoId, 1, '2026-10-12', 'Acceptance warehouse distribution', $this->request($this->owner, '/api/v1/inventory/transfers', 'transfer-product-b-'.$suffix));
        $this->printSnapshot('one product B unit moved to warehouse B for the sale workflow', [$productOneId, $productTwoId], [$warehouseOneId, $warehouseTwoId], $customerId, $invoiceIds, $reports);
        $sales = app(SalesService::class);
        $invoiceOneId = $sales->createInvoice($this->request($this->owner, '/api/v1/invoices', 'draft-one-'.$suffix), [
            'customer_id' => $customerId,
            'issue_date' => '2026-10-13',
            'lines' => [[
                'product_id' => $productOneId,
                'warehouse_id' => $warehouseOneId,
                'quantity' => 1,
                'unit_price_egp' => '20.00',
            ]],
        ]);
        $sales->issueInvoice($this->request($this->owner, '/api/v1/invoices/'.$invoiceOneId.'/issue', 'issue-one-'.$suffix), $invoiceOneId);
        self::assertSame('20.0000', (string) DB::table('sales_documents')->where('id', $invoiceOneId)->value('total_amount'));
        $invoiceIds[] = $invoiceOneId;
        $this->printSnapshot('sale from warehouse A: product A, invoice 20.00', [$productOneId, $productTwoId], [$warehouseOneId, $warehouseTwoId], $customerId, $invoiceIds, $reports);

        $invoiceTwoId = $sales->createInvoice($this->request($this->owner, '/api/v1/invoices', 'draft-two-'.$suffix), [
            'customer_id' => $customerId,
            'issue_date' => '2026-10-13',
            'lines' => [[
                'product_id' => $productTwoId,
                'warehouse_id' => $warehouseTwoId,
                'quantity' => 1,
                'unit_price_egp' => '40.00',
            ]],
        ]);
        $sales->issueInvoice($this->request($this->owner, '/api/v1/invoices/'.$invoiceTwoId.'/issue', 'issue-two-'.$suffix), $invoiceTwoId);
        self::assertSame('40.0000', (string) DB::table('sales_documents')->where('id', $invoiceTwoId)->value('total_amount'));
        $invoiceIds[] = $invoiceTwoId;
        $this->printSnapshot('sale from warehouse B: product B, invoice 40.00', [$productOneId, $productTwoId], [$warehouseOneId, $warehouseTwoId], $customerId, $invoiceIds, $reports);

        $revision = $sales->reviseInvoice(
            $this->request($this->owner, '/api/v1/invoices/'.$invoiceOneId, 'revision-'.$suffix, 'PUT'),
            $invoiceOneId,
            [
                'customer_id' => $customerId,
                'issue_date' => '2026-10-13',
                'reason' => 'Acceptance price correction',
                'lines' => [[
                    'product_id' => $productOneId,
                    'warehouse_id' => $warehouseOneId,
                    'quantity' => 1,
                    'unit_price_egp' => '22.00',
                ]],
            ],
        );
        $revisedInvoiceId = (int) $revision['data']['document']->id;
        $invoiceIds[] = $revisedInvoiceId;
        self::assertSame('reversed', DB::table('sales_documents')->where('id', $invoiceOneId)->value('status'));
        self::assertSame('posted', DB::table('sales_documents')->where('id', $revisedInvoiceId)->value('status'));
        self::assertSame('22.0000', (string) DB::table('sales_documents')->where('id', $revisedInvoiceId)->value('total_amount'));
        $this->printSnapshot('invoice A edited: original retained reversed; replacement total 22.00', [$productOneId, $productTwoId], [$warehouseOneId, $warehouseTwoId], $customerId, $invoiceIds, $reports);

        $revisedLineId = (int) DB::table('sales_document_lines')
            ->where('sales_document_id', $revisedInvoiceId)
            ->value('id');
        $sales->createReturn($this->request($this->owner, '/api/v1/returns', 'linked-return-'.$suffix), [
            'customer_id' => $customerId,
            'issue_date' => '2026-10-14',
            'original_document_id' => $revisedInvoiceId,
            'lines' => [[
                'warehouse_id' => $warehouseOneId,
                'quantity' => 1,
                'original_document_line_id' => $revisedLineId,
            ]],
        ]);
        self::assertSame(1, DB::table('sales_documents')
            ->where('document_type', 'credit_note')
            ->where('original_document_id', $revisedInvoiceId)
            ->count());
        $this->printSnapshot('linked return: product A restored at sold-line cost snapshot', [$productOneId, $productTwoId], [$warehouseOneId, $warehouseTwoId], $customerId, $invoiceIds, $reports);

        $sales->createReturn($this->request($this->owner, '/api/v1/returns', 'free-return-'.$suffix), [
            'customer_id' => $customerId,
            'issue_date' => '2026-10-14',
            'return_reason' => 'Acceptance free return fixture',
            'lines' => [[
                'product_id' => $productOneId,
                'warehouse_id' => $warehouseOneId,
                'quantity' => 1,
                'unit_price_egp' => '10.00',
            ]],
        ]);
        $freeReturn = DB::table('sales_document_lines as line')
            ->join('sales_documents as document', 'document.id', '=', 'line.sales_document_id')
            ->where('document.document_type', 'credit_note')
            ->whereNull('document.original_document_id')
            ->where('line.product_id', $productOneId)
            ->orderByDesc('document.id')
            ->first(['line.unit_cost_egp_snapshot', 'line.return_cost_method_snapshot']);
        self::assertSame('warehouse_current_average', $freeReturn->return_cost_method_snapshot);
        self::assertSame('12.5000', (string) $freeReturn->unit_cost_egp_snapshot);
        $this->printSnapshot('free-form return: product A valued at warehouse A current average cost', [$productOneId, $productTwoId], [$warehouseOneId, $warehouseTwoId], $customerId, $invoiceIds, $reports);

        $accountId = app(TreasuryService::class)->createAccount($this->request($this->owner, '/api/v1/treasury/accounts', 'cash-account-'.$suffix), [
            'code' => 'E2E-CASH-'.$suffix,
            'name' => 'Acceptance cash account',
            'account_type' => 'cash',
        ]);
        $treasury = app(TreasuryService::class);
        $treasury->postCashEntry($this->request($this->owner, '/api/v1/treasury/entries', 'opening-cash-'.$suffix), [
            'treasury_account_id' => $accountId,
            'direction' => 'in',
            'entry_date' => '2026-10-11',
            'amount_egp' => '100.00',
            'description' => 'Acceptance opening cash',
        ]);
        $collection = $sales->recordCollection($this->request($this->owner, '/api/v1/collections', 'collection-'.$suffix), [
            'customer_id' => $customerId,
            'treasury_account_id' => $accountId,
            'receipt_date' => '2026-10-15',
            'amount_egp' => '50.00',
            'allocations' => [['document_id' => $invoiceTwoId, 'amount_egp' => '30.00']],
        ]);
        $receiptId = (int) $collection['data']['receipt']->id;
        self::assertSame('20.0000', (string) DB::table('sales_receipts')->where('id', $receiptId)->value('unapplied_amount'));
        self::assertSame('0.00', $sales->customerBalance($customerId)['balance']);
        self::assertSame('20.00', $sales->customerBalance($customerId)['unapplied_receipts']);
        $this->printSnapshot('partial collection: 30.00 allocated, 20.00 tracked unallocated', [$productOneId, $productTwoId], [$warehouseOneId, $warehouseTwoId], $customerId, $invoiceIds, $reports);

        $inventory = app(InventoryService::class);
        $inventory->transfer($productOneId, $warehouseOneId, $warehouseTwoId, 1, '2026-10-16', 'Acceptance warehouse transfer', $this->request($this->owner, '/api/v1/inventory/transfers', 'transfer-'.$suffix));
        $this->printSnapshot('transfer: one product A unit moved from warehouse A to B', [$productOneId, $productTwoId], [$warehouseOneId, $warehouseTwoId], $customerId, $invoiceIds, $reports);

        $cashPayment = $treasury->postCashEntry($this->request($this->owner, '/api/v1/treasury/entries', 'freight-payment-'.$suffix), [
            'treasury_account_id' => $accountId,
            'direction' => 'out',
            'entry_date' => '2026-10-16',
            'amount_egp' => '6.00',
            'description' => 'Acceptance container freight payment',
        ]);
        $containers->linkPayment($this->request($this->owner, '/api/v1/containers/costs/'.$freightCostId.'/payments', 'link-freight-'.$suffix, 'POST', [
            'treasury_entry_id' => $cashPayment['entry_id'],
            'amount_egp' => '6.00',
        ]), $freightCostId);
        self::assertSame('144.00', $cashPayment['balance_egp']);
        self::assertSame('144.00', $treasury->balance($accountId)['balance_egp']);
        self::assertSame('paid', DB::table('container_costs')->where('id', $freightCostId)->value('status'));
        $this->printSnapshot('treasury payment: freight 6.00 paid and linked to the container cost', [$productOneId, $productTwoId], [$warehouseOneId, $warehouseTwoId], $customerId, $invoiceIds, $reports);

        $this->assertNoNegativeStock();
        $this->assertOwnerAndDriverCostVisibility($productOneId, $productTwoId, $warehouseOneId, $warehouseTwoId, $revisedInvoiceId);
        self::assertSame('10.0000', (string) DB::table('container_cost_allocations')->where('container_id', $containerId)->sum('allocated_amount'));
        self::assertSame(1, DB::table('container_receipts')->where('container_id', $containerId)->count());
        self::assertSame(1, DB::table('container_cost_payments')->where('container_cost_id', $freightCostId)->count());
        self::assertGreaterThan(0, DB::table('audit_logs')->where('actor_user_id', $this->owner->id)->count());
    }

    #[Test]
    public function optional_master_data_fields_are_persisted_but_cost_references_remain_protected(): void
    {
        $suffix = strtoupper(bin2hex(random_bytes(4)));
        $catalog = app(CatalogController::class);
        $warehouseId = (int) $catalog->createWarehouse($this->request($this->owner, '/api/v1/warehouses', 'metadata-warehouse-'.$suffix, 'POST', [
            'code' => 'META-'.$suffix,
            'name' => 'Metadata warehouse',
            'location_type' => 'main',
        ]))->getData(true)['data']['id'];
        $product = $catalog->createProduct($this->request($this->owner, '/api/v1/products', 'metadata-product-'.$suffix, 'POST', [
            'sku' => 'META-'.$suffix,
            'name' => 'Metadata product',
            'unit_code' => 'each',
            'description' => 'Catalog description only',
            'default_location_id' => $warehouseId,
            'default_tax_rate' => '15.000000',
            'last_purchase_price_reference' => '123.45',
        ]))->getData(true)['data'];

        self::assertSame('Catalog description only', $product['description']);
        self::assertSame($warehouseId, (int) $product['default_location_id']);
        self::assertSame('15.000000', (string) $product['default_tax_rate']);
        self::assertSame('123.45', $product['last_purchase_price_reference']);

        $driverProduct = $catalog->product(
            $this->request($this->driver, '/api/v1/products/'.$product['id'], 'metadata-driver-product-'.$suffix, 'GET'),
            (int) $product['id'],
        )->getData(true)['data'];
        self::assertArrayHasKey('description', $driverProduct);
        self::assertArrayHasKey('default_location_id', $driverProduct);
        self::assertArrayNotHasKey('last_purchase_price_reference', $driverProduct);
        self::assertArrayHasKey('company_price', $driverProduct);
        self::assertArrayNotHasKey('purchase_cost_egp', $driverProduct);

        $customer = app(SalesController::class)->createCustomer($this->request($this->owner, '/api/v1/customers', 'metadata-customer-'.$suffix, 'POST', [
            'name' => 'Metadata customer',
            'email' => 'metadata-'.$suffix.'@example.invalid',
            'address' => 'Catalog address only',
            'salesperson' => 'Sales contact',
            'tax_number' => 'TAX-'.$suffix,
            'payment_terms' => '30 days',
        ]))->getData(true)['data'];
        self::assertSame('Catalog address only', $customer['address']);
        self::assertSame('Sales contact', $customer['salesperson']);
        self::assertSame('TAX-'.$suffix, $customer['tax_number']);
        self::assertSame('30 days', $customer['payment_terms']);
    }

    private function createUserWithRole(string $roleCode, string $displayName): object
    {
        $now = now();
        $id = (int) DB::table('users')->insertGetId([
            'username' => 'acceptance-'.strtolower($roleCode).'-'.bin2hex(random_bytes(6)),
            'display_name' => $displayName,
            'password_hash' => Hash::make('test-only-acceptance-password'),
            'is_active' => true,
            'password_changed_at' => $now,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        $roleId = DB::table('roles')->where('code', $roleCode)->where('is_active', true)->value('id');
        if ($roleId === null) {
            throw new RuntimeException('The seeded acceptance role is missing.');
        }
        DB::table('user_roles')->insert([
            'user_id' => $id,
            'role_id' => $roleId,
            'granted_at' => $now,
        ]);

        return (object) ['id' => $id, 'display_name' => $displayName];
    }

    /**
     * @param  array<string, mixed>  $input
     */
    private function request(object $actor, string $path, string $key, string $method = 'POST', array $input = []): Request
    {
        $request = Request::create($path, $method, $input);
        $request->attributes->set('authenticated_user', $actor);
        $request->headers->set('Idempotency-Key', 'acceptance-'.$key);

        return $request;
    }

    /**
     * @param  array<int, int>  $productIds
     * @param  array<int, int>  $warehouseIds
     * @param  array<int, int>  $invoiceIds
     */
    private function printSnapshot(
        string $step,
        array $productIds,
        array $warehouseIds,
        int $customerId,
        array $invoiceIds,
        ReportsService $reports,
    ): void {
        $stock = DB::table('inventory_balances as balance')
            ->join('products as product', 'product.id', '=', 'balance.product_id')
            ->join('locations as location', 'location.id', '=', 'balance.location_id')
            ->whereIn('balance.product_id', $productIds)
            ->whereIn('balance.location_id', $warehouseIds)
            ->orderBy('product.sku')
            ->orderBy('location.code')
            ->get([
                'product.sku',
                'location.code as warehouse',
                'balance.quantity_on_hand as quantity',
                'balance.average_unit_cost_egp as average_cost',
                'balance.inventory_value_egp as inventory_value',
            ])
            ->map(static fn (object $row): array => [
                'sku' => $row->sku,
                'warehouse' => $row->warehouse,
                'quantity' => (int) $row->quantity,
                'average_cost_egp' => $row->average_cost,
                'inventory_value_egp' => $row->inventory_value,
            ])->all();
        $invoices = $invoiceIds === [] ? [] : DB::table('sales_documents')
            ->whereIn('id', $invoiceIds)
            ->orderBy('id')
            ->get(['id', 'document_number', 'status', 'total_amount'])
            ->map(static fn (object $invoice): array => [
                'id' => (int) $invoice->id,
                'number' => $invoice->document_number,
                'status' => $invoice->status,
                'total_egp' => $invoice->total_amount,
            ])->all();
        $profitRows = $invoiceIds === [] ? [] : collect($reports->invoiceProfit(['per_page' => 100])['data'])
            ->whereIn('id', $invoiceIds)
            ->map(static fn (array $invoice): array => [
                'number' => $invoice['document_number'],
                'profit_egp' => $invoice['profit_egp'],
                'formula' => $invoice['formula_status'],
            ])->values()->all();
        $financials = [
            'customer_balance_egp' => app(SalesService::class)->customerBalance($customerId)['balance'],
            'unapplied_collections_egp' => app(SalesService::class)->customerBalance($customerId)['unapplied_receipts'],
        ];

        fwrite(STDERR, json_encode([
            'step' => $step,
            'stock' => $stock,
            'invoices' => $invoices,
            'customer' => $financials,
            'profit' => $profitRows,
        ], JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES).PHP_EOL);
    }

    /**
     * @param  array<int, int>  $productIds
     * @param  array<int, int>  $warehouseIds
     */
    private function assertOwnerAndDriverCostVisibility(
        int $productOneId,
        int $productTwoId,
        int $warehouseOneId,
        int $warehouseTwoId,
        int $invoiceId,
    ): void {
        $catalog = app(CatalogController::class);
        $inventory = app(InventoryController::class);
        $reports = app(ReportsController::class);

        $ownerProduct = $catalog->product($this->request($this->owner, '/api/v1/products/'.$productOneId, 'owner-product-read-'.$productOneId, 'GET'), $productOneId)->getData(true)['data'];
        self::assertArrayHasKey('company_price', $ownerProduct);
        $driverProduct = $catalog->product($this->request($this->driver, '/api/v1/products/'.$productOneId, 'driver-product-read-'.$productOneId, 'GET'), $productOneId)->getData(true)['data'];
        self::assertSame($ownerProduct['company_price'], $driverProduct['company_price']);

        $ownerStock = $inventory->balances($this->request($this->owner, '/api/v1/inventory/balances', 'owner-stock-read', 'GET'))->getData(true)['data'];
        self::assertNotEmpty(array_filter($ownerStock, static fn (array $row): bool => array_key_exists('average_unit_cost_egp', $row)));
        $driverStock = $inventory->balances($this->request($this->driver, '/api/v1/inventory/balances', 'driver-stock-read', 'GET'))->getData(true)['data'];
        self::assertNotEmpty($driverStock);
        self::assertNotEmpty(array_filter($driverStock, static fn (array $row): bool => ! array_key_exists('average_unit_cost_egp', $row)));

        $documentNumber = (string) DB::table('sales_documents')->where('id', $invoiceId)->value('document_number');
        $ownerProfit = $reports->invoiceProfit($this->request(
            $this->owner,
            '/api/v1/reports/invoice-profit',
            'owner-profit-read',
            'GET',
            ['search' => $documentNumber, 'per_page' => 100],
        ));
        $invoiceProfit = array_values(array_filter(
            $ownerProfit->getData(true)['data'],
            static fn (array $row): bool => (int) $row['id'] === $invoiceId,
        ));
        self::assertCount(1, $invoiceProfit);
        self::assertSame('9.50', $invoiceProfit[0]['profit_egp']);
        try {
            $reports->invoiceProfit($this->request($this->driver, '/api/v1/reports/invoice-profit', 'driver-profit-read', 'GET'));
            self::fail('The driver must not access owner-level invoice profit.');
        } catch (HttpException $exception) {
            self::assertSame(403, $exception->getStatusCode());
        }
        self::assertGreaterThan(0, $productTwoId);
        self::assertGreaterThan(0, $warehouseOneId);
        self::assertGreaterThan(0, $warehouseTwoId);
    }

    private function assertNoNegativeStock(): void
    {
        self::assertSame(0, DB::table('inventory_balances')
            ->whereIn('product_id', DB::table('products')->where('sku', 'like', 'E2E-%')->select('id'))
            ->where('quantity_on_hand', '<', 0)
            ->count());
    }
}
