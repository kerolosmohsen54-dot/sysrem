<?php

namespace Tests\Feature;

use Database\Seeders\RolePermissionMatrixSeeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use PHPUnit\Framework\Attributes\Test;
use RuntimeException;
use Tests\TestCase;

class MobileSchemaEngineTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $connection = getenv('AUTH_TEST_CONNECTION');
        if (! is_string($connection) || ! in_array($connection, ['mysql_test', 'mariadb_test'], true)) {
            $this->markTestSkipped('Set AUTH_TEST_CONNECTION to mysql_test or mariadb_test to run mobile schema coverage.');
        }

        config(['database.default' => $connection]);
        DB::setDefaultConnection($connection);
        DB::purge($connection);
        if (config("database.connections.{$connection}.database") !== 'erp_acceptance_tests'
            || (DB::selectOne('SELECT DATABASE() AS database_name')->database_name ?? null) !== 'erp_acceptance_tests') {
            throw new RuntimeException('Mobile schema integration tests require the erp_acceptance_tests database.');
        }
    }

    #[Test]
    public function reseeding_role_permissions_preserves_mobile_capture_grants(): void
    {
        app(RolePermissionMatrixSeeder::class)->run();

        $ownerId = DB::table('roles')->where('code', 'owner')->value('id');
        $grants = DB::table('role_permissions as rp')
            ->join('permissions as p', 'p.id', '=', 'rp.permission_id')
            ->where('rp.role_id', $ownerId)
            ->whereIn('p.code', ['mobile.channels.view', 'mobile.messages.capture', 'mobile.messages.record'])
            ->pluck('p.code')->all();

        self::assertEqualsCanonicalizing(['mobile.channels.view', 'mobile.messages.capture', 'mobile.messages.record'], $grants);
    }
    #[Test]
    public function mobile_schema_and_permission_grants_are_present_for_owners_and_absent_for_the_driver(): void
    {
        foreach ([
            'mobile_devices',
            'mobile_channels',
            'mobile_sources',
            'mobile_device_sources',
            'mobile_categories',
            'mobile_messages',
            'mobile_sync_events',
            'mobile_idempotency_records',
        ] as $table) {
            self::assertTrue(Schema::hasTable($table), "The {$table} table must exist.");
        }

        self::assertTrue(Schema::hasColumns('mobile_messages', [
            'amount',
            'raw_text',
            'text_hash',
            'duplicate_hash',
            'status',
            'registered_document_type',
            'registered_document_id',
        ]));
        self::assertTrue(Schema::hasColumns('mobile_sources', [
            'default_read_deposits',
            'default_read_withdrawals',
        ]));
        self::assertTrue(Schema::hasColumns('mobile_device_sources', [
            'device_id',
            'source_id',
            'is_enabled',
            'read_deposits',
            'read_withdrawals',
        ]));
        $messageType = DB::selectOne("SHOW COLUMNS FROM mobile_messages LIKE 'message_type'");
        self::assertNotNull($messageType);
        self::assertStringContainsString("'ambiguous'", (string) $messageType->Type);

        $mobilePermissions = [
            'mobile.use',
            'mobile.balances.view',
            'mobile.messages.view',
            'mobile.deposits.register',
            'mobile.withdrawals.register',
            'mobile.channels.manage',
            'mobile.categories.manage',
            'mobile.customers.create',
            'mobile.devices.manage',
        ];

        $grants = DB::table('role_permissions as rp')
            ->join('permissions as p', 'p.id', '=', 'rp.permission_id')
            ->join('roles as r', 'r.id', '=', 'rp.role_id')
            ->whereIn('r.code', ['owner', 'driver'])
            ->whereIn('p.code', $mobilePermissions)
            ->get(['r.code as role_code', 'p.code as permission_code'])
            ->groupBy('role_code')
            ->map(fn ($rows) => $rows->pluck('permission_code')->all());

        self::assertEqualsCanonicalizing($mobilePermissions, $grants->get('owner', []));
        self::assertSame([], $grants->get('driver', []));
    }
}
