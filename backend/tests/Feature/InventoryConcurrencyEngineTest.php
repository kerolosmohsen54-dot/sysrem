<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use PHPUnit\Framework\Attributes\Test;
use RuntimeException;
use Symfony\Component\Process\Process;
use Tests\TestCase;

class InventoryConcurrencyEngineTest extends TestCase
{
    private ?string $inventoryConnection = null;

    /** @var list<string> */
    private array $markerFiles = [];

    private int $actorId;

    private int $productId;

    private int $warehouseId;

    protected function setUp(): void
    {
        parent::setUp();

        $connection = getenv('AUTH_TEST_CONNECTION');
        if (! is_string($connection) || ! in_array($connection, ['mysql_test', 'mariadb_test'], true)) {
            $this->markTestSkipped('Set AUTH_TEST_CONNECTION to mysql_test or mariadb_test to run inventory concurrency coverage.');
        }

        $this->inventoryConnection = $connection;
        config(['database.default' => $connection]);
        DB::setDefaultConnection($connection);
        DB::purge($connection);

        if (config("database.connections.{$connection}.database") !== 'erp_acceptance_tests'
            || (DB::selectOne('SELECT DATABASE() AS database_name')->database_name ?? null) !== 'erp_acceptance_tests') {
            throw new RuntimeException('Inventory concurrency integration tests require erp_acceptance_tests.');
        }

        if (DB::table('users')->where('username', 'like', 'inventory-concurrency-%')->exists()) {
            throw new RuntimeException('A stale inventory concurrency fixture exists in erp_acceptance_tests; inspect it before rerunning this test.');
        }

        $suffix = strtoupper(bin2hex(random_bytes(6)));
        $this->actorId = (int) DB::table('users')->insertGetId([
            'username' => 'inventory-concurrency-'.$suffix,
            'display_name' => 'Inventory Concurrency Test',
            'password_hash' => Hash::make(bin2hex(random_bytes(24))),
            'is_active' => true,
        ]);
        $this->warehouseId = (int) DB::table('locations')->insertGetId([
            'code' => 'IC-LOC-'.$suffix,
            'name' => 'Inventory Concurrency Test Location',
            'location_type' => 'main',
        ]);
        $this->productId = (int) DB::table('products')->insertGetId([
            'sku' => 'IC-SKU-'.$suffix,
            'name' => 'Inventory Concurrency Test Product',
            'unit_code' => 'each',
            'created_by_user_id' => $this->actorId,
            'updated_by_user_id' => $this->actorId,
        ]);
        DB::table('inventory_balances')->insert([
            'product_id' => $this->productId,
            'location_id' => $this->warehouseId,
            'quantity_on_hand' => 0,
            'quantity_reserved' => 0,
            'average_unit_cost_egp' => null,
            'inventory_value_egp' => '0.00',
        ]);
    }

    protected function tearDown(): void
    {
        if ($this->inventoryConnection !== null) {
            $movementIds = DB::table('inventory_movements')
                ->where('created_by_user_id', $this->actorId)
                ->pluck('id');

            DB::table('audit_logs')->where('actor_user_id', $this->actorId)->delete();
            if ($movementIds->isNotEmpty()) {
                DB::table('inventory_movement_lines')->whereIn('inventory_movement_id', $movementIds)->delete();
                DB::table('inventory_movements')->whereIn('id', $movementIds)->delete();
            }

            DB::table('inventory_balances')->where('product_id', $this->productId)->delete();
            DB::table('products')->where('id', $this->productId)->delete();
            DB::table('locations')->where('id', $this->warehouseId)->delete();
            DB::table('users')->where('id', $this->actorId)->delete();

            foreach ($this->markerFiles as $markerFile) {
                if (is_file($markerFile)) {
                    unlink($markerFile);
                }
            }

            DB::purge($this->inventoryConnection);
        }

        parent::tearDown();
    }

    #[Test]
    public function concurrent_receipts_serialize_on_the_product_location_balance(): void
    {
        $markers = [
            sys_get_temp_dir().DIRECTORY_SEPARATOR.'inventory-worker-one-'.bin2hex(random_bytes(10)),
            sys_get_temp_dir().DIRECTORY_SEPARATOR.'inventory-worker-two-'.bin2hex(random_bytes(10)),
        ];
        $this->markerFiles = $markers;
        $workers = [];

        DB::beginTransaction();
        try {
            DB::table('inventory_balances')
                ->where('product_id', $this->productId)
                ->where('location_id', $this->warehouseId)
                ->lockForUpdate()
                ->first();

            $workers = [
                $this->worker(2, '1.00', $markers[0]),
                $this->worker(3, '2.00', $markers[1]),
            ];
            foreach ($workers as $worker) {
                $worker->start();
            }

            $this->waitForMarkers($markers);
            usleep(500000);
            DB::commit();

            foreach ($workers as $worker) {
                $worker->wait();
                self::assertSame(0, $worker->getExitCode(), $worker->getErrorOutput());
                self::assertSame("OK\n", $worker->getOutput());
            }
        } finally {
            if (DB::transactionLevel() > 0) {
                DB::rollBack();
            }

            foreach ($workers as $worker) {
                if ($worker->isRunning()) {
                    $worker->wait();
                }
            }
        }

        $balance = DB::table('inventory_balances')
            ->where('product_id', $this->productId)
            ->where('location_id', $this->warehouseId)
            ->first();

        self::assertSame(5, (int) $balance->quantity_on_hand);
        self::assertSame('1.6000', $balance->average_unit_cost_egp);
        self::assertSame('8.0000', $balance->inventory_value_egp);
        self::assertSame(2, DB::table('inventory_movements')->where('created_by_user_id', $this->actorId)->count());
    }

    private function worker(int $quantity, string $unitCost, string $markerPath): Process
    {
        $process = new Process([
            PHP_BINARY,
            base_path('tests/Support/InventoryReceiveWorker.php'),
            (string) $this->productId,
            (string) $this->warehouseId,
            (string) $this->actorId,
            (string) $quantity,
            $unitCost,
            $markerPath,
        ], base_path());
        $process->setTimeout(30);

        return $process;
    }

    /**
     * @param  list<string>  $markers
     */
    private function waitForMarkers(array $markers): void
    {
        $deadline = microtime(true) + 20;

        while (microtime(true) < $deadline) {
            if (count(array_filter($markers, 'is_file')) === count($markers)) {
                return;
            }

            usleep(25000);
        }

        throw new RuntimeException('Inventory concurrency workers did not become ready.');
    }
}
