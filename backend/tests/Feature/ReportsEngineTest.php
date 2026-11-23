<?php

namespace Tests\Feature;

use Database\Seeders\RolePermissionMatrixSeeder;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Test;
use RuntimeException;
use Tests\TestCase;

class ReportsEngineTest extends TestCase
{
    private ?string $testConnection = null;

    /** @var array<string, array{token: string, user_id: int}> */
    private array $sessions = [];

    protected function setUp(): void
    {
        parent::setUp();

        $connection = getenv('AUTH_TEST_CONNECTION');
        if (! is_string($connection) || ! in_array($connection, ['mysql_test', 'mariadb_test'], true)) {
            $this->markTestSkipped('Set AUTH_TEST_CONNECTION to mysql_test or mariadb_test to run report engine coverage.');
        }
        $this->testConnection = $connection;
        config(['database.default' => $connection]);
        DB::setDefaultConnection($connection);
        DB::purge($connection);
        if (config("database.connections.{$connection}.database") !== 'erp_acceptance_tests'
            || (DB::selectOne('SELECT DATABASE() AS database_name')->database_name ?? null) !== 'erp_acceptance_tests') {
            throw new RuntimeException('Reports integration tests require the erp_acceptance_tests database.');
        }

        $this->createTemporaryTables();
        app(RolePermissionMatrixSeeder::class)->run();
        foreach ([
            1 => ['Owner', 'owner'],
            2 => ['Driver', 'driver'],
            3 => ['Reader', 'read_only'],
        ] as $id => [$name, $roleCode]) {
            DB::table('users')->insert([
                'id' => $id,
                'display_name' => $name,
                'is_active' => true,
            ]);
            DB::table('user_roles')->insert([
                'user_id' => $id,
                'role_id' => DB::table('roles')->where('code', $roleCode)->value('id'),
            ]);
        }
    }

    protected function tearDown(): void
    {
        if ($this->testConnection !== null) {
            foreach ([
                'treasury_entries',
                'treasury_accounts',
                'container_cost_allocations',
                'container_cost_payments',
                'container_costs',
                'containers',
                'inventory_movement_lines',
                'inventory_movements',
                'inventory_balances',
                'locations',
                'products',
                'sales_receipt_allocation_reversals',
                'sales_receipt_allocations',
                'sales_receipts',
                'sales_document_lines',
                'sales_documents',
                'partner_profit_ledger',
                'customers',
                'auth_sessions',
                'role_permissions',
                'user_roles',
                'permissions',
                'roles',
                'users',
            ] as $table) {
                DB::statement("DROP TEMPORARY TABLE IF EXISTS `{$table}`");
            }
            DB::purge($this->testConnection);
        }

        parent::tearDown();
    }

    #[Test]
    public function reports_require_permissions_without_finance_step_up(): void
    {
        $customerId = $this->customer('Permission customer');
        $this->withCredentials()->withUnencryptedCookie('precision_slate_session', $this->makeSession('driver')['token'])
            ->getJson('/api/v1/reports/customer-balances')
            ->assertForbidden();

        $this->makeSession('owner', false);
        $this->withCredentials()->withUnencryptedCookie('precision_slate_session', $this->makeSession('owner', false)['token'])
            ->getJson('/api/v1/reports/customer-balances')
            ->assertOk();

        $this->withCredentials()->withUnencryptedCookie('precision_slate_session', $this->makeSession('owner')['token'])
            ->getJson('/api/v1/reports/customer-balances?per_page=5')
            ->assertOk()
            ->assertJsonPath('data.0.id', $customerId)
            ->assertJsonPath('meta.per_page', 5);
    }

    #[Test]
    public function customer_lists_search_sort_and_paginate_with_a_consistent_response_shape(): void
    {
        $this->customer('Store South');
        $northId = $this->customer('Store North');
        $token = $this->makeSession('owner')['token'];

        $this->withCredentials()->withUnencryptedCookie('precision_slate_session', $token)
            ->getJson('/api/v1/reports/customer-balances?search=Store&sort_by=name&sort_direction=asc&per_page=1&page=1')
            ->assertOk()
            ->assertJsonPath('data.0.id', $northId)
            ->assertJsonPath('meta.current_page', 1)
            ->assertJsonPath('meta.per_page', 1)
            ->assertJsonPath('meta.total', 2);

        $balanceQueryCount = 0;
        DB::listen(function (QueryExecuted $query) use (&$balanceQueryCount): void {
            if (str_contains($query->sql, 'sales_documents') || str_contains($query->sql, 'sales_receipts')) {
                $balanceQueryCount++;
            }
        });
        $this->withCredentials()->withUnencryptedCookie('precision_slate_session', $token)
            ->getJson('/api/v1/customers?search=Store&sort_by=name&sort_direction=asc&per_page=1&page=2')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Store South')
            ->assertJsonPath('meta.current_page', 2)
            ->assertJsonPath('meta.total', 2);
        self::assertSame(5, $balanceQueryCount);

        $this->withCredentials()->withUnencryptedCookie('precision_slate_session', $token)
            ->getJson('/api/v1/customers?page=0')
            ->assertUnprocessable()
            ->assertJsonPath('error.code', 'VALIDATION_FAILED')
            ->assertJsonStructure(['error' => ['details' => ['page']]]);

        $this->withCredentials()->withUnencryptedCookie('precision_slate_session', $token)
            ->getJson('/api/v1/customers?sort_by=name%20DESC')
            ->assertUnprocessable()
            ->assertJsonPath('error.code', 'VALIDATION_FAILED')
            ->assertJsonStructure(['error' => ['details' => ['sort_by']]]);
    }

    #[Test]
    public function stock_reports_filter_and_paginate_without_leaking_costs_to_drivers(): void
    {
        $first = $this->productAndWarehouse('RPT-1', 'WH-A', 3);
        $second = $this->productAndWarehouse('RPT-2', 'WH-B', 8);
        $this->grant('driver', 'costs.view');

        $this->withCredentials()->withUnencryptedCookie('precision_slate_session', $this->makeSession('driver')['token'])
            ->getJson('/api/v1/reports/stock?warehouse_id='.$first['warehouse_id'].'&per_page=1')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.quantity_on_hand', 3)
            ->assertJsonMissingPath('data.0.average_unit_cost_egp')
            ->assertJsonMissingPath('data.0.inventory_value_egp');

        $this->movement($first['product_id'], $first['warehouse_id'], '2026-10-02', '3.00');
        $this->movement($second['product_id'], $second['warehouse_id'], '2026-10-05', '8.00');
        $this->withCredentials()->withUnencryptedCookie('precision_slate_session', $this->makeSession('driver')['token'])
            ->getJson('/api/v1/reports/stock-movements?product_id='.$first['product_id'].'&from_date=2026-10-01&to_date=2026-10-03')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.product_id', $first['product_id'])
            ->assertJsonMissingPath('data.0.unit_cost_egp_snapshot');
    }

    #[Test]
    public function customer_statement_includes_dated_openings_and_unapplied_collections(): void
    {
        $customerId = $this->customer('Statement customer');
        $this->document($customerId, 'OB-1', 'opening_receivable', '2026-10-01', '100.00', 'debit');
        $this->document($customerId, 'INV-1', 'invoice', '2026-10-03', '50.00');
        $this->document($customerId, 'CN-1', 'credit_note', '2026-10-04', '5.00');
        DB::table('sales_receipts')->insert([
            'id' => 1,
            'receipt_number' => 'REC-1',
            'receipt_type' => 'collection',
            'status' => 'posted',
            'customer_id' => $customerId,
            'receipt_date' => '2026-10-02',
            'amount' => '80.00',
            'unapplied_amount' => '30.00',
        ]);
        DB::table('sales_receipt_allocations')->insert([
            'id' => 1,
            'sales_receipt_id' => 1,
            'sales_document_id' => 2,
            'allocation_amount' => '50.00',
        ]);

        $token = $this->makeSession('owner')['token'];
        $response = $this->withCredentials()->withUnencryptedCookie('precision_slate_session', $token)
            ->getJson("/api/v1/reports/customers/{$customerId}/statement?from_date=2026-10-02&to_date=2026-10-03&per_page=10")
            ->assertOk()
            ->assertJsonPath('summary.balance', '95.00')
            ->assertJsonPath('summary.unapplied_collections', '30.00')
            ->assertJsonPath('summary.current_balance_egp', '95.00')
            ->assertJsonPath('summary.unallocated_collections_egp', '30.00')
            ->assertJsonPath('data.0.reference', 'INV-1')
            ->assertJsonPath('data.0.document_date', '2026-10-03')
            ->assertJsonPath('data.0.debit_egp', '50.00')
            ->assertJsonPath('data.0.credit_egp', '0.00')
            ->assertJsonPath('data.1.reference', 'REC-1')
            ->assertJsonPath('data.1.debit_egp', '0.00')
            ->assertJsonPath('data.1.credit_egp', '50.00')
            ->assertJsonPath('data.1.unallocated_egp', '30.00')
            ->assertJsonPath('meta.total', 2);
        self::assertSame(
            ['document', 'collection'],
            collect($response->json('data'))->pluck('entry_type')->all(),
        );
        self::assertSame('50.00', $response->json('data.1.applied_amount_egp'));
        self::assertSame('30.00', $response->json('data.1.unapplied_amount_egp'));
        $this->withCredentials()->withUnencryptedCookie('precision_slate_session', $token)
            ->getJson('/api/v1/reports/customer-balances?search=Statement&per_page=5')
            ->assertOk()
            ->assertJsonPath('data.0.balance', '95.00')
            ->assertJsonPath('data.0.unapplied_collections', '30.00');

        $allRows = $this->withCredentials()->withUnencryptedCookie('precision_slate_session', $token)
            ->getJson("/api/v1/reports/customers/{$customerId}/statement?per_page=10")
            ->assertOk()
            ->json('data');
        self::assertContains('opening_receivable', collect($allRows)->pluck('document_type')->all());
    }

    #[Test]
    public function sales_filters_and_provisional_profit_use_invoice_cost_snapshots(): void
    {
        $customerId = $this->customer('Profit customer');
        $this->document($customerId, 'INV-PROFIT', 'invoice', '2026-10-05', '100.00', null, '0.00', 'posted');
        DB::table('sales_document_lines')->insert([
            'sales_document_id' => 1,
            'line_number' => 1,
            'quantity' => 2,
            'unit_cost_egp_snapshot' => '30.0050',
        ]);
        $this->document($customerId, 'INV-MISSING-COST', 'invoice', '2026-10-06', '20.00', null, '0.00', 'posted');
        DB::table('sales_document_lines')->insert([
            'sales_document_id' => 2,
            'line_number' => 1,
            'quantity' => 1,
            'unit_cost_egp_snapshot' => null,
        ]);
        $this->document($customerId, 'CN-EXCLUDED', 'credit_note', '2026-10-06', '300.00');
        $this->document($customerId, 'INV-DRAFT-EXCLUDED', 'invoice', '2026-10-06', '400.00', null, '0.00', 'draft');

        $token = $this->makeSession('owner')['token'];
        $sales = $this->withCredentials()->withUnencryptedCookie('precision_slate_session', $token)
            ->getJson('/api/v1/reports/sales?from_date=2026-10-06&status=posted&per_page=1')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('summary.invoice_count', 1)
            ->assertJsonPath('summary.total_sales_egp', '20.00')
            ->assertJsonPath('data.0.document_number', 'INV-MISSING-COST');

        $profit = $this->withCredentials()->withUnencryptedCookie('precision_slate_session', $token)
            ->getJson('/api/v1/reports/invoice-profit?from_date=2026-10-05&to_date=2026-10-06&per_page=10')
            ->assertOk()
            ->assertJsonPath('meta.formula_status', 'PROVISIONAL')
            ->assertJsonPath('data.1.cost_egp', '60.01')
            ->assertJsonPath('data.1.profit_egp', '39.99')
            ->assertJsonPath('data.1.markup_percent', '66.64')
            ->assertJsonPath('data.1.cost_snapshot_complete', true)
            ->assertJsonPath('data.0.cost_snapshot_complete', false);
        self::assertStringContainsString('pending accountant confirmation', $profit->json('meta.formula'));

        $this->withCredentials()->withUnencryptedCookie('precision_slate_session', $this->makeSession('driver')['token'])
            ->getJson('/api/v1/reports/invoice-profit')
            ->assertForbidden();
    }

    #[Test]
    public function profit_distribution_reconciles_partner_and_driver_sales_after_a_return(): void
    {
        $customerId = $this->customer('Profit split customer');
        $this->document($customerId, 'INV-PARTNER-SPLIT', 'invoice', '2026-10-05', '650.00', null, '0.00', 'posted');
        DB::table('sales_documents')->where('document_number', 'INV-PARTNER-SPLIT')->update([
            'issuer_type' => 'partner',
            'issuer_partner_id' => 20,
            'issuer_name_snapshot' => 'Partner Split',
        ]);
        $partnerLineId = (int) DB::table('sales_document_lines')->insertGetId([
            'sales_document_id' => 1,
            'line_number' => 1,
            'description_snapshot' => 'Partner product',
            'sku_snapshot' => 'SPLIT-1',
            'quantity' => 5,
            'unit_price' => '130.00',
            'discount_amount' => '0.00',
            'unit_cost_egp_snapshot' => '100.00',
            'company_price_egp_snapshot' => '100.00',
            'container_number_snapshot' => 'CONT-SPLIT',
        ]);
        $this->document($customerId, 'INV-DRIVER-SPLIT', 'invoice', '2026-10-05', '650.00', null, '0.00', 'posted');
        DB::table('sales_documents')->where('document_number', 'INV-DRIVER-SPLIT')->update([
            'issuer_type' => 'driver',
            'issuer_name_snapshot' => 'Driver Split',
        ]);
        DB::table('sales_document_lines')->insert([
            'sales_document_id' => 2,
            'line_number' => 1,
            'description_snapshot' => 'Driver product',
            'sku_snapshot' => 'SPLIT-2',
            'quantity' => 5,
            'unit_price' => '130.00',
            'discount_amount' => '0.00',
            'unit_cost_egp_snapshot' => '100.00',
            'company_price_egp_snapshot' => '100.00',
            'container_number_snapshot' => 'CONT-SPLIT',
        ]);
        $this->document($customerId, 'CN-PARTNER-SPLIT', 'credit_note', '2026-10-06', '260.00', null, '0.00', 'posted');
        DB::table('sales_document_lines')->insert([
            'sales_document_id' => 3,
            'line_number' => 1,
            'original_document_line_id' => $partnerLineId,
            'description_snapshot' => 'Partner product return',
            'sku_snapshot' => 'SPLIT-1',
            'quantity' => 2,
            'unit_price' => '130.00',
            'discount_amount' => '0.00',
        ]);
        DB::table('partner_profit_ledger')->insert([
            ['partner_id' => 20, 'sales_document_id' => 1, 'entry_type' => 'accrual', 'amount_egp' => '150.00'],
            ['partner_id' => 20, 'sales_document_id' => 1, 'entry_type' => 'reversal', 'amount_egp' => '-60.00'],
        ]);

        $response = $this->withCredentials()->withUnencryptedCookie('precision_slate_session', $this->makeSession('owner')['token'])
            ->getJson('/api/v1/reports/profit-distribution?from_date=2026-10-05&to_date=2026-10-06')
            ->assertOk()
            ->assertJsonPath('data.totals.sale_revenue_egp', '1040.00')
            ->assertJsonPath('data.totals.cogs_egp', '800.00')
            ->assertJsonPath('data.totals.partner_profit_egp', '90.00')
            ->assertJsonPath('data.totals.company_profit_egp', '150.00')
            ->assertJsonPath('data.totals.total_profit_egp', '240.00')
            ->assertJsonPath('data.totals.reconciliation_difference_egp', '0.00')
            ->assertJsonPath('data.invoices.0.partner_profit_egp', '90.00')
            ->assertJsonPath('data.invoices.0.company_profit_egp', '0.00')
            ->assertJsonPath('data.invoices.1.company_profit_egp', '150.00')
            ->assertJsonPath('data.containers.0.profit_egp', '240.00')
            ->assertJsonPath('data.containers.0.invoice_count', 2);
        self::assertSame(0, (int) $response->json('data.totals.unpriced_invoice_count'));
    }

    #[Test]
    public function container_cost_report_summarizes_payments_and_allocations_with_date_filters(): void
    {
        DB::table('containers')->insert([
            ['id' => 1, 'container_number' => 'CONT-A', 'status' => 'received'],
            ['id' => 2, 'container_number' => 'CONT-B', 'status' => 'received'],
        ]);
        DB::table('container_costs')->insert([
            ['id' => 1, 'container_id' => 1, 'cost_type' => 'freight', 'amount_egp' => '100.00', 'cost_date' => '2026-10-03', 'status' => 'incurred'],
            ['id' => 2, 'container_id' => 1, 'cost_type' => 'customs', 'amount_egp' => '40.00', 'cost_date' => '2026-10-05', 'status' => 'paid'],
            ['id' => 3, 'container_id' => 2, 'cost_type' => 'freight', 'amount_egp' => '25.00', 'cost_date' => '2026-10-05', 'status' => 'cancelled'],
        ]);
        DB::table('container_cost_payments')->insert([
            ['container_cost_id' => 1, 'amount_egp' => '30.00'],
            ['container_cost_id' => 2, 'amount_egp' => '40.00'],
        ]);
        DB::table('container_cost_allocations')->insert([
            ['container_cost_id' => 1, 'allocated_amount' => '15.00'],
            ['container_cost_id' => 2, 'allocated_amount' => '20.00'],
        ]);

        $this->withCredentials()->withUnencryptedCookie('precision_slate_session', $this->makeSession('owner')['token'])
            ->getJson('/api/v1/reports/container-costs?from_date=2026-10-03&to_date=2026-10-04')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.container.container_number', 'CONT-A')
            ->assertJsonPath('data.0.total_cost_egp', '100.00')
            ->assertJsonPath('data.0.paid_egp', '30.00')
            ->assertJsonPath('data.0.unpaid_egp', '70.00')
            ->assertJsonPath('data.0.allocated_to_inventory_egp', '15.00');
    }

    #[Test]
    public function dashboard_only_includes_sections_authorized_for_the_caller(): void
    {
        $customerId = $this->customer('Dashboard customer');
        $this->document($customerId, 'INV-TODAY', 'invoice', now()->toDateString(), '45.00', null, '0.00', 'posted');
        $product = $this->productAndWarehouse('RPT-DASH', 'WH-DASH', 7);
        DB::table('treasury_accounts')->insert(['id' => 1, 'code' => 'CASH', 'name' => 'Cash']);
        DB::table('treasury_entries')->insert([
            ['treasury_account_id' => 1, 'direction' => 'in', 'amount' => '50.00'],
            ['treasury_account_id' => 1, 'direction' => 'out', 'amount' => '5.00'],
        ]);

        $owner = $this->withCredentials()->withUnencryptedCookie('precision_slate_session', $this->makeSession('owner')['token'])
            ->getJson('/api/v1/reports/dashboard')
            ->assertOk()
            ->assertJsonPath('data.today_sales_egp', '45.00')
            ->assertJsonPath('data.stock_count', '7')
            ->assertJsonPath('data.receivables_egp', '45.00')
            ->assertJsonPath('data.treasury_balances.0.balance_egp', '45.00');
        self::assertSame($product['product_id'], (int) DB::table('inventory_balances')->value('product_id'));

        $reader = $this->withCredentials()->withUnencryptedCookie('precision_slate_session', $this->makeSession('reader')['token'])
            ->getJson('/api/v1/reports/dashboard')
            ->assertOk()
            ->assertJsonPath('data.today_sales_egp', '45.00');
        self::assertArrayNotHasKey('stock_count', $reader->json('data'));
        self::assertArrayNotHasKey('receivables_egp', $reader->json('data'));
        self::assertArrayNotHasKey('treasury_balances', $reader->json('data'));
        $this->withCredentials()->withUnencryptedCookie('precision_slate_session', $this->makeSession('driver')['token'])
            ->getJson('/api/v1/reports/dashboard')
            ->assertForbidden();
    }

    private function createTemporaryTables(): void
    {
        $definitions = [
            'users' => 'id BIGINT UNSIGNED PRIMARY KEY, display_name VARCHAR(160) NOT NULL, username VARCHAR(100) NULL, is_active BOOLEAN NOT NULL DEFAULT 1, password_changed_at DATETIME NULL',
            'auth_sessions' => 'id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, user_id BIGINT UNSIGNED NOT NULL, token_hash BINARY(32) NOT NULL, csrf_token_hash BINARY(32) NULL, expires_at DATETIME NOT NULL, last_seen_at DATETIME NULL, revoked_at DATETIME NULL, created_at DATETIME NOT NULL, step_up_verified_at DATETIME NULL',
            'roles' => 'id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, code VARCHAR(80) NOT NULL UNIQUE, name VARCHAR(120) NOT NULL, description VARCHAR(500) NULL, is_system BOOLEAN NOT NULL DEFAULT 0, is_active BOOLEAN NOT NULL DEFAULT 1, created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL',
            'permissions' => 'id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, code VARCHAR(120) NOT NULL UNIQUE, description VARCHAR(500) NULL, created_at TIMESTAMP NULL',
            'user_roles' => 'user_id BIGINT UNSIGNED NOT NULL, role_id BIGINT UNSIGNED NOT NULL, granted_by_user_id BIGINT UNSIGNED NULL, granted_at TIMESTAMP NULL, PRIMARY KEY (user_id, role_id)',
            'role_permissions' => 'role_id BIGINT UNSIGNED NOT NULL, permission_id BIGINT UNSIGNED NOT NULL, granted_at TIMESTAMP NULL, PRIMARY KEY (role_id, permission_id)',
            'customers' => 'id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, name VARCHAR(200) NOT NULL, phone VARCHAR(32) NULL, address VARCHAR(500) NULL, governorate VARCHAR(120) NULL, is_active TINYINT(1) NOT NULL DEFAULT 1, status VARCHAR(20) NOT NULL DEFAULT "active"',
            'sales_documents' => 'id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, document_number VARCHAR(80) NOT NULL, document_type VARCHAR(32) NOT NULL, opening_balance_direction VARCHAR(16) NULL, status VARCHAR(32) NOT NULL, customer_id BIGINT UNSIGNED NOT NULL, issue_date DATE NOT NULL, due_date DATE NULL, subtotal DECIMAL(19,4) NOT NULL DEFAULT 0, discount_amount DECIMAL(19,4) NOT NULL DEFAULT 0, tax_amount DECIMAL(19,4) NOT NULL DEFAULT 0, total_amount DECIMAL(19,4) NOT NULL DEFAULT 0, issuer_type VARCHAR(16) NULL, issuer_partner_id BIGINT UNSIGNED NULL, issuer_name_snapshot VARCHAR(160) NULL, profit_pricing_status VARCHAR(16) NULL, posted_by_user_id BIGINT UNSIGNED NULL',
            'sales_document_lines' => 'id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, sales_document_id BIGINT UNSIGNED NOT NULL, line_number INT NOT NULL, quantity INT NOT NULL, description_snapshot VARCHAR(500) NULL, sku_snapshot VARCHAR(100) NULL, unit_price DECIMAL(19,4) NULL, discount_amount DECIMAL(19,4) NOT NULL DEFAULT 0, original_document_line_id BIGINT UNSIGNED NULL, company_price_egp_snapshot DECIMAL(19,4) NULL, container_number_snapshot VARCHAR(100) NULL, unit_cost_egp_snapshot DECIMAL(19,4) NULL',
            'partner_profit_ledger' => 'id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, partner_id BIGINT UNSIGNED NOT NULL, sales_document_id BIGINT UNSIGNED NULL, entry_type VARCHAR(16) NOT NULL, amount_egp DECIMAL(19,4) NOT NULL',
            'sales_receipts' => 'id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, receipt_number VARCHAR(80) NOT NULL, receipt_type VARCHAR(32) NOT NULL, status VARCHAR(32) NOT NULL, customer_id BIGINT UNSIGNED NOT NULL, receipt_date DATE NOT NULL, amount DECIMAL(19,4) NOT NULL, unapplied_amount DECIMAL(19,4) NOT NULL, recording_source VARCHAR(16) NULL, is_unverified_payment BOOLEAN NOT NULL DEFAULT 0',
            'sales_receipt_allocations' => 'id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, sales_receipt_id BIGINT UNSIGNED NOT NULL, sales_document_id BIGINT UNSIGNED NOT NULL, allocation_amount DECIMAL(19,4) NOT NULL',
            'sales_receipt_allocation_reversals' => 'id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, sales_receipt_allocation_id BIGINT UNSIGNED NOT NULL, amount DECIMAL(19,4) NOT NULL',
            'products' => 'id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, sku VARCHAR(100) NOT NULL, name VARCHAR(200) NOT NULL, minimum_stock INT UNSIGNED NULL, is_active TINYINT(1) NOT NULL DEFAULT 1',
            'locations' => 'id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, code VARCHAR(80) NOT NULL, name VARCHAR(160) NOT NULL, location_type VARCHAR(20) NOT NULL DEFAULT "main", is_active TINYINT(1) NOT NULL DEFAULT 1',
            'inventory_balances' => 'product_id BIGINT UNSIGNED NOT NULL, location_id BIGINT UNSIGNED NOT NULL, quantity_on_hand INT NOT NULL, quantity_reserved INT NOT NULL, average_unit_cost_egp DECIMAL(19,4) NULL, inventory_value_egp DECIMAL(19,4) NULL, updated_at TIMESTAMP NULL, PRIMARY KEY (product_id, location_id)',
            'inventory_movements' => 'id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, movement_number VARCHAR(80) NOT NULL, movement_type VARCHAR(32) NOT NULL, status VARCHAR(32) NOT NULL, movement_date DATE NOT NULL, reason VARCHAR(1000) NULL, posted_by_user_id BIGINT UNSIGNED NULL',
            'inventory_movement_lines' => 'id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, inventory_movement_id BIGINT UNSIGNED NOT NULL, line_number INT NOT NULL, product_id BIGINT UNSIGNED NOT NULL, from_location_id BIGINT UNSIGNED NULL, to_location_id BIGINT UNSIGNED NULL, quantity INT NOT NULL, unit_cost_egp_snapshot DECIMAL(19,4) NULL, line_cost_egp_snapshot DECIMAL(19,4) NULL',
            'containers' => 'id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, container_number VARCHAR(100) NOT NULL, status VARCHAR(32) NOT NULL, origin VARCHAR(160) NULL, destination VARCHAR(160) NULL',
            'container_costs' => 'id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, container_id BIGINT UNSIGNED NOT NULL, cost_type VARCHAR(80) NOT NULL, description VARCHAR(500) NULL, amount_egp DECIMAL(19,4) NOT NULL, cost_date DATE NULL, status VARCHAR(32) NOT NULL',
            'container_cost_payments' => 'id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, container_cost_id BIGINT UNSIGNED NOT NULL, amount_egp DECIMAL(19,4) NOT NULL',
            'container_cost_allocations' => 'id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, container_cost_id BIGINT UNSIGNED NOT NULL, allocated_amount DECIMAL(19,4) NOT NULL',
            'treasury_accounts' => 'id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, code VARCHAR(80) NOT NULL, name VARCHAR(160) NOT NULL',
            'treasury_entries' => 'id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, treasury_account_id BIGINT UNSIGNED NOT NULL, direction VARCHAR(8) NOT NULL, amount DECIMAL(19,4) NOT NULL',
        ];
        foreach ($definitions as $table => $columns) {
            DB::statement("CREATE TEMPORARY TABLE `{$table}` ({$columns})");
        }
    }

    private function customer(string $name): int
    {
        return (int) DB::table('customers')->insertGetId(['name' => $name]);
    }

    private function document(
        int $customerId,
        string $number,
        string $type,
        string $date,
        string $total,
        ?string $openingDirection = null,
        string $tax = '0.00',
        string $status = 'posted',
    ): int {
        return (int) DB::table('sales_documents')->insertGetId([
            'document_number' => $number,
            'document_type' => $type,
            'opening_balance_direction' => $openingDirection,
            'status' => $status,
            'customer_id' => $customerId,
            'issue_date' => $date,
            'subtotal' => $total,
            'tax_amount' => $tax,
            'total_amount' => $total,
        ]);
    }

    /**
     * @return array{product_id: int, warehouse_id: int}
     */
    private function productAndWarehouse(string $sku, string $code, int $quantity): array
    {
        $productId = (int) DB::table('products')->insertGetId(['sku' => $sku, 'name' => $sku]);
        $warehouseId = (int) DB::table('locations')->insertGetId(['code' => $code, 'name' => $code]);
        DB::table('inventory_balances')->insert([
            'product_id' => $productId,
            'location_id' => $warehouseId,
            'quantity_on_hand' => $quantity,
            'quantity_reserved' => 0,
            'average_unit_cost_egp' => '3.00',
            'inventory_value_egp' => (string) (3 * $quantity).'.00',
        ]);

        return ['product_id' => $productId, 'warehouse_id' => $warehouseId];
    }

    private function movement(int $productId, int $warehouseId, string $date, string $cost): void
    {
        $movementId = (int) DB::table('inventory_movements')->insertGetId([
            'movement_number' => 'MOV-'.$date.'-'.$productId,
            'movement_type' => 'receipt',
            'status' => 'posted',
            'movement_date' => $date,
        ]);
        DB::table('inventory_movement_lines')->insert([
            'inventory_movement_id' => $movementId,
            'line_number' => 1,
            'product_id' => $productId,
            'to_location_id' => $warehouseId,
            'quantity' => 1,
            'unit_cost_egp_snapshot' => $cost,
            'line_cost_egp_snapshot' => $cost,
        ]);
    }

    private function grant(string $roleCode, string $permissionCode): void
    {
        DB::table('role_permissions')->insert([
            'role_id' => DB::table('roles')->where('code', $roleCode)->value('id'),
            'permission_id' => DB::table('permissions')->where('code', $permissionCode)->value('id'),
        ]);
    }

    /**
     * @return array{token: string, user_id: int}
     */
    private function makeSession(string $role, bool $stepUp = true): array
    {
        if (isset($this->sessions[$role.':'.(int) $stepUp])) {
            return $this->sessions[$role.':'.(int) $stepUp];
        }
        $userId = match ($role) {
            'owner' => 1,
            'driver' => 2,
            'reader' => 3,
        };
        $token = str_pad(dechex(count($this->sessions) + 1), 64, '0', STR_PAD_LEFT);
        DB::table('auth_sessions')->insert([
            'user_id' => $userId,
            'token_hash' => hash('sha256', $token, true),
            'expires_at' => now()->addHour(),
            'last_seen_at' => now(),
            'created_at' => now(),
            'step_up_verified_at' => $stepUp ? now() : null,
        ]);

        return $this->sessions[$role.':'.(int) $stepUp] = ['token' => $token, 'user_id' => $userId];
    }
}
