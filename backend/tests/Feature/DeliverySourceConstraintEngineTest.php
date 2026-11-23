<?php

namespace Tests\Feature;

use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Test;
use RuntimeException;
use Tests\TestCase;

class DeliverySourceConstraintEngineTest extends TestCase
{
    private ?string $connection = null;

    protected function setUp(): void
    {
        parent::setUp();

        $connection = getenv('AUTH_TEST_CONNECTION');
        if (! is_string($connection) || ! in_array($connection, ['mysql_test', 'mariadb_test'], true)) {
            $this->markTestSkipped('Set AUTH_TEST_CONNECTION to mysql_test or mariadb_test to run delivery constraint coverage.');
        }
        $this->connection = $connection;
        config(['database.default' => $connection]);
        DB::setDefaultConnection($connection);
        DB::purge($connection);
        if (config("database.connections.{$connection}.database") !== 'erp_acceptance_tests'
            || (DB::selectOne('SELECT DATABASE() AS database_name')->database_name ?? null) !== 'erp_acceptance_tests') {
            throw new RuntimeException('Delivery constraint integration tests require the erp_acceptance_tests database.');
        }
    }

    protected function tearDown(): void
    {
        if ($this->connection !== null) {
            DB::purge($this->connection);
        }

        parent::tearDown();
    }

    #[Test]
    public function delivery_header_requires_exactly_one_source_on_the_selected_engine(): void
    {
        $this->expectException(QueryException::class);
        DB::table('deliveries')->insert([
            'delivery_number' => 'DEL-CHECK-'.bin2hex(random_bytes(8)),
            'status' => 'draft',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
