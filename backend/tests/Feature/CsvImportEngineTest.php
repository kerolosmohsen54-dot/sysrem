<?php

namespace Tests\Feature;

use Database\Seeders\RolePermissionMatrixSeeder;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use PHPUnit\Framework\Attributes\Test;
use RuntimeException;
use Tests\TestCase;

class CsvImportEngineTest extends TestCase
{
    private ?string $connection = null;

    private int $ownerId;

    /** @var array<int, string> */
    private array $temporaryFiles = [];

    protected function setUp(): void
    {
        parent::setUp();
        $connection = getenv('AUTH_TEST_CONNECTION');
        if (! is_string($connection) || ! in_array($connection, ['mysql_test', 'mariadb_test'], true)) {
            $this->markTestSkipped('Set AUTH_TEST_CONNECTION to mysql_test or mariadb_test to run CSV import integration coverage.');
        }
        $this->connection = $connection;
        config(['database.default' => $connection]);
        DB::setDefaultConnection($connection);
        DB::purge($connection);

        if (config("database.connections.{$connection}.database") !== 'erp_acceptance_tests'
            || (DB::selectOne('SELECT DATABASE() AS database_name')->database_name ?? null) !== 'erp_acceptance_tests') {
            throw new RuntimeException('CSV import integration tests require the erp_acceptance_tests database.');
        }

        DB::beginTransaction();
        app(RolePermissionMatrixSeeder::class)->run();
        $now = now();
        $this->ownerId = (int) DB::table('users')->insertGetId([
            'username' => 'csv-import-'.bin2hex(random_bytes(6)),
            'display_name' => 'CSV Import Test Owner',
            'password_hash' => Hash::make('test-only-password'),
            'is_active' => true,
            'password_changed_at' => $now,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        $ownerRoleId = DB::table('roles')->where('code', 'owner')->value('id');
        DB::table('user_roles')->insert([
            'user_id' => $this->ownerId,
            'role_id' => $ownerRoleId,
            'granted_at' => $now,
        ]);
    }

    protected function tearDown(): void
    {
        foreach ($this->temporaryFiles as $file) {
            if (is_file($file)) {
                unlink($file);
            }
        }
        if ($this->connection !== null) {
            if (DB::transactionLevel() > 0) {
                DB::rollBack();
            }
            DB::purge($this->connection);
        }

        parent::tearDown();
    }

    #[Test]
    public function product_import_is_dry_run_by_default_and_rejects_duplicate_skus(): void
    {
        $existingProductAuditCount = DB::table('audit_logs')
            ->where('action', 'catalog.product_created')
            ->where('entity_type', 'product')
            ->count();
        $csv = $this->csv(
            "sku,name,unit_code,barcode,category_code,company_price,default_location_code,minimum_stock,description\n".
            "CSV-P-001,Imported part,each,,,,,0,Part\n",
        );
        $this->assertSame(0, Artisan::call('imports:products', ['file' => $csv]));
        $this->assertSame(0, DB::table('products')->where('sku', 'CSV-P-001')->count());
        $this->assertSame(0, Artisan::call('imports:products', [
            'file' => $csv,
            '--apply' => true,
            '--actor-id' => $this->ownerId,
        ]));
        $this->assertSame(1, DB::table('products')->where('sku', 'CSV-P-001')->count());
        $this->assertSame($existingProductAuditCount + 1, DB::table('audit_logs')
            ->where('action', 'catalog.product_created')
            ->where('entity_type', 'product')
            ->count());

        $duplicates = $this->csv(
            "sku,name,unit_code,barcode,category_code,company_price,default_location_code,minimum_stock,description\n".
            "CSV-P-002,First,each,,,,,,\n".
            "CSV-P-002,Second,each,,,,,,\n",
        );
        $this->assertSame(1, Artisan::call('imports:products', [
            'file' => $duplicates,
            '--apply' => true,
            '--actor-id' => $this->ownerId,
        ]));
        $this->assertSame(0, DB::table('products')->where('sku', 'CSV-P-002')->count());
        $this->assertStringContainsString('duplicate product sku', Artisan::output());
    }

    #[Test]
    public function customer_import_enforces_unique_phone_and_audits_the_owner(): void
    {
        $duplicateFile = $this->csv(
            "name,phone,email,address,governorate,credit_limit,notes\n".
            "First,+201000000101,,,,,\n".
            "Second,+201000000101,,,,,\n",
        );
        $this->assertSame(1, Artisan::call('imports:customers', [
            'file' => $duplicateFile,
            '--apply' => true,
            '--actor-id' => $this->ownerId,
        ]));
        $this->assertSame(0, DB::table('customers')->where('phone', '+201000000101')->count());

        $validFile = $this->csv(
            "name,phone,email,address,governorate,credit_limit,notes\n".
            "Imported buyer,+201000000102,,,,125.50,Customer import\n",
        );
        $this->assertSame(0, Artisan::call('imports:customers', [
            'file' => $validFile,
            '--apply' => true,
            '--actor-id' => $this->ownerId,
        ]));
        $this->assertSame(1, DB::table('customers')->where('phone', '+201000000102')->count());
        $this->assertSame(1, DB::table('audit_logs')
            ->where('action', 'customer.created')
            ->where('actor_user_id', $this->ownerId)
            ->count());
    }

    #[Test]
    public function opening_stock_import_posts_dated_movements_via_inventory_service(): void
    {
        [$productId, $warehouseId] = $this->productAndWarehouse('CSV-STOCK-001', 'CSV-STOCK-WH');
        $csv = $this->csv(
            "product_sku,warehouse_code,quantity,unit_cost_egp,movement_date,reason\n".
            "CSV-STOCK-001,CSV-STOCK-WH,5,3.25,2026-01-15,Stock migration\n",
        );
        $existingMovementCount = DB::table('inventory_movements')->count();
        $this->assertSame(0, Artisan::call('imports:opening-stock', ['file' => $csv]));
        $this->assertSame($existingMovementCount, DB::table('inventory_movements')->count());

        $this->assertSame(0, Artisan::call('imports:opening-stock', [
            'file' => $csv,
            '--apply' => true,
            '--actor-id' => $this->ownerId,
        ]));
        $movement = DB::table('inventory_movements')
            ->where('movement_type', 'opening')
            ->where('movement_date', '2026-01-15')
            ->orderByDesc('id')
            ->first();
        $this->assertNotNull($movement);
        $this->assertSame('opening', $movement->movement_type);
        $this->assertSame('2026-01-15', $movement->movement_date);
        $this->assertSame(5, (int) DB::table('inventory_balances')
            ->where('product_id', $productId)
            ->where('location_id', $warehouseId)
            ->value('quantity_on_hand'));
        $this->assertSame('3.2500', (string) DB::table('inventory_balances')
            ->where('product_id', $productId)
            ->where('location_id', $warehouseId)
            ->value('average_unit_cost_egp'));
    }

    #[Test]
    public function customer_opening_balance_import_creates_a_dated_document_via_sales_service(): void
    {
        $customerId = (int) DB::table('customers')->insertGetId([
            'name' => 'Opening balance customer',
            'phone' => '+201000000103',
            'is_active' => true,
        ]);
        $csv = $this->csv(
            "customer_phone,direction,amount_egp,issue_date,notes\n".
            "+201000000103,debit,250.00,2026-02-01,Legacy receivable\n",
        );
        $this->assertSame(0, Artisan::call('imports:customer-opening-balances', ['file' => $csv]));
        $this->assertSame(0, DB::table('sales_documents')->where('customer_id', $customerId)->count());

        $this->assertSame(0, Artisan::call('imports:customer-opening-balances', [
            'file' => $csv,
            '--apply' => true,
            '--actor-id' => $this->ownerId,
        ]));
        $document = DB::table('sales_documents')->where('customer_id', $customerId)->first();
        $this->assertSame('opening_receivable', $document->document_type);
        $this->assertSame('debit', $document->opening_balance_direction);
        $this->assertSame('2026-02-01', $document->issue_date);
        $this->assertSame('250.0000', (string) $document->total_amount);
    }

    private function csv(string $contents): string
    {
        $path = tempnam(sys_get_temp_dir(), 'erp-csv-import-');
        if ($path === false || file_put_contents($path, $contents) === false) {
            throw new RuntimeException('Could not create a temporary CSV fixture.');
        }
        $this->temporaryFiles[] = $path;

        return $path;
    }

    /**
     * @return array{0: int, 1: int}
     */
    private function productAndWarehouse(string $sku, string $warehouseCode): array
    {
        $productId = (int) DB::table('products')->insertGetId([
            'sku' => $sku,
            'name' => 'CSV opening-stock product',
            'unit_code' => 'each',
            'is_active' => true,
        ]);
        $warehouseId = (int) DB::table('locations')->insertGetId([
            'code' => $warehouseCode,
            'name' => 'CSV opening-stock warehouse',
            'location_type' => 'main',
            'is_active' => true,
        ]);

        return [$productId, $warehouseId];
    }
}
