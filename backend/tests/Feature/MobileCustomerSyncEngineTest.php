<?php

namespace Tests\Feature;

use Database\Seeders\MobileCategorySeeder;
use Database\Seeders\RolePermissionMatrixSeeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use PHPUnit\Framework\Attributes\Test;
use RuntimeException;
use Tests\TestCase;

class MobileCustomerSyncEngineTest extends TestCase
{
    private ?string $connection = null;

    private bool $transactionStarted = false;

    protected function setUp(): void
    {
        parent::setUp();

        $connection = getenv('AUTH_TEST_CONNECTION');
        if (! is_string($connection) || ! in_array($connection, ['mysql_test', 'mariadb_test'], true)) {
            $this->markTestSkipped('Set AUTH_TEST_CONNECTION to mysql_test or mariadb_test to run mobile customer and sync coverage.');
        }

        $this->connection = $connection;
        config(['database.default' => $connection]);
        DB::setDefaultConnection($connection);
        DB::purge($connection);
        if (config("database.connections.{$connection}.database") !== 'erp_acceptance_tests'
            || (DB::selectOne('SELECT DATABASE() AS database_name')->database_name ?? null) !== 'erp_acceptance_tests') {
            throw new RuntimeException('Mobile customer and sync integration tests require the erp_acceptance_tests database.');
        }

        DB::beginTransaction();
        $this->transactionStarted = true;
        app(RolePermissionMatrixSeeder::class)->run();
        app(MobileCategorySeeder::class)->run();
    }

    protected function tearDown(): void
    {
        if ($this->transactionStarted && $this->connection !== null
            && DB::connection($this->connection)->transactionLevel() > 0) {
            DB::rollBack();
        }

        if ($this->connection !== null) {
            DB::purge($this->connection);
        }
        parent::tearDown();
    }

    #[Test]
    public function mobile_customer_creation_is_validated_audited_and_idempotent_and_picker_is_shared(): void
    {
        $ownerId = $this->createUser('owner');
        $ownerToken = $this->login($ownerId, 'Customer picker owner');
        $phone = '01'.random_int(100000000, 999999999);
        $payload = ['name' => 'Mobile picker customer', 'phone' => $phone];
        $headers = ['Idempotency-Key' => 'customer-create-001'];

        $created = $this->withToken($ownerToken)->postJson('/api/v1/mobile/customers', $payload, $headers)
            ->assertCreated()
            ->assertJsonPath('data.name', $payload['name'])
            ->assertJsonPath('data.phone', $phone);
        self::assertIsBool($created->json('data.is_active'));
        $customerId = (int) $created->json('data.id');
        $this->withToken($ownerToken)->postJson('/api/v1/mobile/customers', $payload, $headers)
            ->assertCreated()->assertJsonPath('data.id', $customerId);
        self::assertSame(1, DB::table('customers')->where('phone', $phone)->count());
        self::assertSame(1, DB::table('audit_logs')->where('action', 'customer.created')->count());
        self::assertSame(1, DB::table('mobile_sync_events')
            ->where('entity_type', 'customer')->where('entity_id', $customerId)->count());

        $this->withToken($ownerToken)->getJson('/api/v1/customers?search=Mobile%20picker')
            ->assertOk()
            ->assertJsonPath('data.0.id', $customerId)
            ->assertJsonPath('data.0.balance.balance', '0.00');
        $this->withToken($ownerToken)->postJson('/api/v1/mobile/customers', [
            'name' => 'Duplicate phone',
            'phone' => $phone,
        ], ['Idempotency-Key' => 'customer-create-duplicate-phone'])->assertUnprocessable();
        self::assertSame(1, DB::table('customers')->where('phone', $phone)->count());

        $limitedId = $this->createLimitedMobileUser();
        $limitedToken = $this->login($limitedId, 'Limited customer picker');
        $this->withToken($limitedToken)->getJson('/api/v1/customers')
            ->assertOk()->assertJsonMissingPath('data.0.balance');
        $this->withToken($limitedToken)->postJson('/api/v1/mobile/customers', [
            'name' => 'Not permitted customer',
        ], ['Idempotency-Key' => 'limited-customer-create'])->assertForbidden();

        $sessionlessWebToken = $ownerToken;
        $this->withToken($sessionlessWebToken)->getJson('/api/v1/users')->assertUnauthorized();
    }

    #[Test]
    public function sync_returns_initial_snapshot_then_entity_and_financial_deltas_without_raw_text(): void
    {
        $userId = $this->createUser('owner');
        $token = $this->login($userId, 'Sync test phone');
        $channelId = $this->createChannel($token);
        $sourceId = $this->createSource($token, $channelId);

        $this->withToken($token)->getJson('/api/v1/mobile/ping')->assertOk()
            ->assertJsonStructure(['data' => ['cursor', 'server_time']]);
        $snapshot = $this->withToken($token)->getJson('/api/v1/mobile/sync?cursor=0')->assertOk()
            ->assertJsonPath('data.has_more', false)
            ->assertJsonPath('data.channels.0.id', $channelId)
            ->assertJsonPath('data.channels.0.balance_egp', '20.00')
            ->assertJsonPath('data.sources.0.id', $sourceId)
            ->assertJsonPath('data.sources.0.deposit_keywords.0', 'Deposit received')
            ->assertJsonPath('data.sources.0.parser_rule.version', 1);
        self::assertGreaterThanOrEqual(4, count($snapshot->json('data.categories')));
        self::assertIsBool($snapshot->json('data.sources.0.read_deposits'));
        self::assertIsBool($snapshot->json('data.categories.0.requires_notes'));
        $cursor = (int) $snapshot->json('data.cursor');

        $customer = $this->withToken($token)->postJson('/api/v1/mobile/customers', [
            'name' => 'Synced customer',
            'phone' => '01'.random_int(100000000, 999999999),
        ], ['Idempotency-Key' => 'sync-customer-create-01'])->assertCreated();
        $customerId = (int) $customer->json('data.id');
        $customerDelta = $this->withToken($token)->getJson('/api/v1/mobile/sync?cursor='.$cursor)->assertOk()
            ->assertJsonPath('data.customers.0.id', $customerId);
        $cursor = (int) $customerDelta->json('data.cursor');

        $messageResponse = $this->withToken($token)->postJson('/api/v1/mobile/messages/batch', [
            'messages' => [[
                'source_id' => $sourceId,
                'type' => 'deposit',
                'amount' => '5.00',
                'sender' => 'SyncSender',
                'received_at' => '2026-10-12T10:00:00Z',
                'raw_text' => 'Deposit received EGP 5.00',
            ]],
        ], ['Idempotency-Key' => 'sync-message-ingest-01'])->assertCreated();
        $messageId = (int) $messageResponse->json('data.results.0.message_id');
        $this->withToken($token)->postJson('/api/v1/mobile/messages/'.$messageId.'/register-deposit', [
            'customer_id' => $customerId,
        ], ['Idempotency-Key' => 'sync-message-deposit-01'])->assertCreated();

        $financialDelta = $this->withToken($token)->getJson('/api/v1/mobile/sync?cursor='.$cursor)->assertOk()
            ->assertJsonPath('data.channels.0.id', $channelId)
            ->assertJsonPath('data.channels.0.balance_egp', '25.00')
            ->assertJsonPath('data.messages.0.id', $messageId)
            ->assertJsonPath('data.messages.0.amount_egp', '5.00')
            ->assertJsonPath('data.messages.0.status', 'registered')
            ->assertJsonMissingPath('data.messages.0.amount')
            ->assertJsonMissingPath('data.messages.0.raw_text');

        $ownerRoleId = (int) DB::table('roles')->where('code', 'owner')->value('id');
        $balancePermissionId = (int) DB::table('permissions')->where('code', 'reports.customer_balances.view')->value('id');
        $mobileBalancePermissionId = (int) DB::table('permissions')->where('code', 'mobile.balances.view')->value('id');
        DB::table('role_permissions')->where('role_id', $ownerRoleId)
            ->whereIn('permission_id', [$balancePermissionId, $mobileBalancePermissionId])->delete();
        $this->withToken($token)->getJson('/api/v1/mobile/sync?cursor=0')->assertOk()
            ->assertJsonMissingPath('data.channels.0.balance_egp');
        $this->withToken($token)->getJson('/api/v1/customers')
            ->assertOk()->assertJsonMissingPath('data.0.balance');
        self::assertGreaterThanOrEqual(2, DB::table('mobile_sync_events')
            ->where('entity_type', 'channel')->where('entity_id', $channelId)->count());
        self::assertSame('25.0000', DB::table('treasury_entries')
            ->where('treasury_account_id', DB::table('mobile_channels')->where('id', $channelId)->value('treasury_account_id'))
            ->where('direction', 'in')->sum('amount'));
    }

    private function createChannel(string $token): int
    {
        $this->withToken($token)->postJson('/api/v1/mobile/auth/confirm-password', [
            'password' => 'Correct mobile password 123',
        ])->assertOk();

        return (int) $this->withToken($token)->postJson('/api/v1/mobile/channels', [
            'name' => 'Sync wallet',
            'channel_type' => 'wallet',
            'opening_balance_egp' => '20.00',
            'opening_date' => '2026-10-12',
        ], ['Idempotency-Key' => 'sync-channel-'.bin2hex(random_bytes(5))])->assertCreated()->json('data.id');
    }

    private function createSource(string $token, int $channelId): int
    {
        return (int) $this->withToken($token)->postJson('/api/v1/mobile/sources', [
            'channel_id' => $channelId,
            'source_kind' => 'sms',
            'sender_identifier' => 'SyncSender',
            'read_deposits' => true,
            'read_withdrawals' => true,
            'deposit_keywords' => ['Deposit received'],
            'withdrawal_keywords' => ['Payment sent'],
            'parser_rule_version' => 1,
            'parser_rule' => ['version' => 1],
        ], ['Idempotency-Key' => 'sync-source-'.bin2hex(random_bytes(5))])->assertCreated()->json('data.id');
    }

    private function createUser(string $role): int
    {
        $suffix = bin2hex(random_bytes(4));
        $userId = (int) DB::table('users')->insertGetId([
            'username' => 'mobile-sync-'.$suffix,
            'display_name' => 'Mobile Sync User',
            'password_hash' => Hash::make('Correct mobile password 123'),
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('user_roles')->insert([
            'user_id' => $userId,
            'role_id' => DB::table('roles')->where('code', $role)->value('id'),
            'granted_at' => now(),
        ]);

        return $userId;
    }

    private function createLimitedMobileUser(): int
    {
        $roleId = (int) DB::table('roles')->insertGetId([
            'code' => 'mobile_picker_limited',
            'name' => 'Limited mobile picker',
            'description' => 'Test role without customer creation or balance visibility.',
            'is_system' => false,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('role_permissions')->insert([
            'role_id' => $roleId,
            'permission_id' => DB::table('permissions')->where('code', 'mobile.use')->value('id'),
            'granted_at' => now(),
        ]);
        $userId = $this->createUser('mobile_picker_limited');

        return $userId;
    }

    private function login(int $userId, string $name): string
    {
        return $this->postJson('/api/v1/mobile/auth/login', [
            'username' => DB::table('users')->where('id', $userId)->value('username'),
            'password' => 'Correct mobile password 123',
            'device_name' => $name,
            'device_model' => 'Test model',
        ])->assertCreated()->json('data.access_token');
    }
}
