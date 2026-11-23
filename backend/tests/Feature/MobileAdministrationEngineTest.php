<?php

namespace Tests\Feature;

use App\Services\TreasuryService;
use Database\Seeders\MobileCategorySeeder;
use Database\Seeders\RolePermissionMatrixSeeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use PHPUnit\Framework\Attributes\Test;
use RuntimeException;
use Tests\TestCase;

class MobileAdministrationEngineTest extends TestCase
{
    private ?string $connection = null;

    private bool $transactionStarted = false;

    protected function setUp(): void
    {
        parent::setUp();

        $connection = getenv('AUTH_TEST_CONNECTION');
        if (! is_string($connection) || ! in_array($connection, ['mysql_test', 'mariadb_test'], true)) {
            $this->markTestSkipped('Set AUTH_TEST_CONNECTION to mysql_test or mariadb_test to run mobile administration coverage.');
        }

        $this->connection = $connection;
        config(['database.default' => $connection]);
        DB::setDefaultConnection($connection);
        DB::purge($connection);
        if (config("database.connections.{$connection}.database") !== 'erp_acceptance_tests'
            || (DB::selectOne('SELECT DATABASE() AS database_name')->database_name ?? null) !== 'erp_acceptance_tests') {
            throw new RuntimeException('Mobile administration integration tests require the erp_acceptance_tests database.');
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
    public function channel_opening_balance_is_audited_and_idempotent_after_step_up(): void
    {
        $userId = $this->createOwner();
        $login = $this->login($userId);
        $token = $login['data']['access_token'];

        $this->withToken($token)->postJson('/api/v1/mobile/channels', [
            'name' => 'Wallet test',
            'channel_type' => 'wallet',
        ], ['Idempotency-Key' => 'channel-stepup-required'])
            ->assertStatus(428)
            ->assertJsonPath('error.code', 'PASSWORD_CONFIRMATION_REQUIRED');
        self::assertSame(0, DB::table('mobile_channels')->where('identifier', 'W-01')->count());

        $this->withToken($token)->postJson('/api/v1/mobile/auth/confirm-password', [
            'password' => 'Correct mobile password 123',
        ])->assertOk();

        $payload = [
            'name' => 'Wallet test',
            'channel_type' => 'wallet',
            'identifier' => 'W-01',
            'opening_balance_egp' => '250.75',
            'opening_date' => '2026-10-12',
        ];
        $headers = ['Idempotency-Key' => 'channel-create-wallet-01'];
        $created = $this->withToken($token)->postJson('/api/v1/mobile/channels', $payload, $headers)
            ->assertCreated()
            ->assertJsonPath('data.name', 'Wallet test')
            ->assertJsonMissingPath('data.balance_egp');
        $channelId = (int) $created->json('data.id');
        $accountId = (int) $created->json('data.treasury_account_id');

        $this->withToken($token)->postJson('/api/v1/mobile/channels', $payload, $headers)->assertCreated();
        self::assertSame(1, DB::table('mobile_channels')->where('id', $channelId)->count());
        self::assertSame(1, DB::table('treasury_entries')
            ->where('treasury_account_id', $accountId)
            ->where('entry_type', 'opening')
            ->count());
        self::assertSame('250.75', app(TreasuryService::class)->balance($accountId)['balance_egp']);
        $this->withToken($token)->getJson('/api/v1/mobile/channels')
            ->assertJsonPath('data.0.balance_egp', '250.75');
        $ownerRoleId = (int) DB::table('roles')->where('code', 'owner')->value('id');
        $balancePermissionId = (int) DB::table('permissions')->where('code', 'mobile.balances.view')->value('id');
        DB::table('role_permissions')->where('role_id', $ownerRoleId)
            ->where('permission_id', $balancePermissionId)->delete();
        $this->withToken($token)->getJson('/api/v1/mobile/channels')
            ->assertOk()
            ->assertJsonMissingPath('data.0.balance_egp');
        self::assertSame(1, DB::table('audit_logs')->where('action', 'mobile.channel.created')->count());
        self::assertSame(2, DB::table('mobile_sync_events')->where('entity_type', 'channel')->count());

        $this->withToken($token)->postJson('/api/v1/mobile/channels', [
            ...$payload,
            'name' => 'Different wallet',
        ], $headers)->assertConflict();
    }

    #[Test]
    public function sixty_channels_are_listed_and_synced_without_per_channel_queries(): void
    {
        $token = $this->login($this->createOwner())['data']['access_token'];
        $this->withToken($token)->postJson('/api/v1/mobile/auth/confirm-password', [
            'password' => 'Correct mobile password 123',
        ])->assertOk();
        for ($channelNumber = 1; $channelNumber <= 60; $channelNumber++) {
            $this->withToken($token)->postJson('/api/v1/mobile/channels', [
                'name' => 'Scale channel '.$channelNumber,
                'channel_type' => 'wallet',
            ], ['Idempotency-Key' => 'scale-channel-'.$channelNumber])->assertCreated();
        }

        $captureQueries = false;
        $queryCount = 0;
        DB::listen(static function ($query) use (&$captureQueries, &$queryCount): void {
            if ($captureQueries) {
                $queryCount++;
            }
        });

        $captureQueries = true;
        $list = $this->withToken($token)->getJson('/api/v1/mobile/channels?per_page=100')->assertOk();
        $captureQueries = false;
        $list->assertJsonPath('meta.total', 60);
        self::assertCount(60, $list->json('data'));
        self::assertLessThanOrEqual(12, $queryCount, 'Channel listing should use a bounded number of queries.');

        $queryCount = 0;
        $captureQueries = true;
        $sync = $this->withToken($token)->getJson('/api/v1/mobile/sync?cursor=0')->assertOk();
        $captureQueries = false;
        self::assertCount(60, $sync->json('data.channels'));
        self::assertLessThanOrEqual(20, $queryCount, 'Initial sync should not issue one query per channel.');
    }

    #[Test]
    public function source_definitions_are_shared_while_capture_settings_remain_device_local(): void
    {
        $userId = $this->createOwner();
        $firstLogin = $this->login($userId, 'First phone');
        $firstToken = $firstLogin['data']['access_token'];
        $this->withToken($firstToken)->postJson('/api/v1/mobile/auth/confirm-password', [
            'password' => 'Correct mobile password 123',
        ])->assertOk();
        $channel = $this->withToken($firstToken)->postJson('/api/v1/mobile/channels', [
            'name' => 'Bank sample',
            'channel_type' => 'bank',
        ], ['Idempotency-Key' => 'source-channel-create-01'])->assertCreated()->json('data');

        $source = $this->withToken($firstToken)->postJson('/api/v1/mobile/sources', [
            'channel_id' => $channel['id'],
            'source_kind' => 'sms',
            'sender_identifier' => '12345',
            'read_deposits' => true,
            'read_withdrawals' => false,
            'deposit_keywords' => ['تم إيداع'],
            'parser_rule_version' => 1,
            'parser_rule' => ['amount_pattern' => 'sample'],
            'redacted_sample_message' => 'تم إيداع مبلغ [REDACTED]',
        ], ['Idempotency-Key' => 'source-create-01'])
            ->assertCreated()
            ->json('data');
        self::assertSame($firstLogin['data']['device']['id'], $source['device_id']);
        self::assertTrue($source['is_enabled']);
        self::assertSame(['تم إيداع'], $source['deposit_keywords']);
        self::assertSame(1, DB::table('audit_logs')->where('action', 'mobile.source.created')->count());
        self::assertSame(1, DB::table('audit_logs')->where('action', 'mobile.source.device_settings_created')->count());
        $this->withToken($firstToken)->patchJson('/api/v1/mobile/sources/'.$source['id'], [
            'parser_rule_version' => null,
        ], ['Idempotency-Key' => 'source-parser-version-required'])->assertUnprocessable();
        $rawText = 'Private original transaction message';
        $messageId = (int) DB::table('mobile_messages')->insertGetId([
            'device_id' => $source['device_id'],
            'source_id' => $source['id'],
            'channel_id' => $channel['id'],
            'message_type' => 'deposit',
            'amount' => '12.34',
            'sender_identifier' => '12345',
            'received_at' => now(),
            'server_received_at' => now(),
            'raw_text' => $rawText,
            'text_hash' => hash('sha256', $rawText),
            'duplicate_hash' => hash('sha256', 'unique mobile test message'),
            'status' => 'new',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $secondUserId = $this->createOwner();
        $secondToken = $this->login($secondUserId, "Second owner's phone")['data']['access_token'];
        $this->withToken($secondToken)->getJson('/api/v1/mobile/sources')->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $source['id'])
            ->assertJsonPath('data.0.is_enabled', false)
            ->assertJsonPath('data.0.read_deposits', false)
            ->assertJsonPath('data.0.default_read_deposits', true);
        $sync = $this->withToken($secondToken)->getJson('/api/v1/mobile/sync?cursor=0')->assertOk()
            ->assertJsonPath('data.sources.0.id', $source['id'])
            ->assertJsonPath('data.sources.0.is_enabled', false);
        $syncCursor = (int) $sync->json('data.cursor');

        $this->withToken($firstToken)->patchJson('/api/v1/mobile/sources/'.$source['id'], [
            'deposit_keywords' => ['Deposit complete'],
        ], ['Idempotency-Key' => 'source-shared-definition-update'])->assertOk();
        $this->withToken($secondToken)->getJson('/api/v1/mobile/sync?cursor='.$syncCursor)->assertOk()
            ->assertJsonPath('data.sources.0.deposit_keywords.0', 'Deposit complete')
            ->assertJsonPath('data.sources.0.is_enabled', false);

        $this->withToken($secondToken)->patchJson('/api/v1/mobile/sources/'.$source['id'], [
            'is_enabled' => true,
            'read_deposits' => true,
            'read_withdrawals' => false,
        ], ['Idempotency-Key' => 'second-device-source-enable'])->assertOk()
            ->assertJsonPath('data.is_enabled', true);
        $this->withToken($firstToken)->getJson('/api/v1/mobile/sources')
            ->assertJsonPath('data.0.is_enabled', true)
            ->assertJsonPath('data.0.deposit_keywords.0', 'Deposit complete');

        $this->withToken($secondToken)->patchJson('/api/v1/mobile/sources/'.$source['id'], [
            'read_deposits' => false,
            'read_withdrawals' => true,
        ], ['Idempotency-Key' => 'second-device-source-disable-deposits'])->assertOk()
            ->assertJsonPath('data.read_deposits', false)
            ->assertJsonPath('data.read_withdrawals', true);

        $this->withToken($firstToken)->patchJson('/api/v1/mobile/channels/'.$channel['id'], [
            'status' => 'paused',
        ], ['Idempotency-Key' => 'channel-pause-01'])->assertOk();
        $this->withToken($firstToken)->getJson('/api/v1/mobile/sources')
            ->assertJsonPath('data.0.channel_status', 'paused');
        $channelCountBeforeDelete = DB::table('mobile_channels')->count();
        $this->withToken($firstToken)->deleteJson('/api/v1/mobile/channels/'.$channel['id'], [], [
            'Idempotency-Key' => 'channel-archive-01',
        ])->assertStatus(405)->assertJsonPath('error.code', 'METHOD_NOT_ALLOWED');
        self::assertSame($channelCountBeforeDelete, DB::table('mobile_channels')->count());
        self::assertSame('paused', DB::table('mobile_channels')->where('id', $channel['id'])->value('status'));
        self::assertNull(DB::table('mobile_channels')->where('id', $channel['id'])->value('deleted_at'));
        self::assertSame('active', DB::table('mobile_sources')->where('id', $source['id'])->value('status'));
        self::assertSame('new', DB::table('mobile_messages')->where('id', $messageId)->value('status'));
    }

    #[Test]
    public function canonical_categories_seed_and_category_crud_reuse_expense_category(): void
    {
        $other = DB::table('mobile_categories')->where('name', 'مصاريف أخرى')->first();
        $drawer = DB::table('mobile_categories')->where('name', 'الدرج')->first();
        self::assertNotNull($other);
        self::assertTrue((bool) $other->requires_notes);
        self::assertSame('transfer', $drawer->category_kind);
        self::assertNotNull($drawer->target_treasury_account_id);

        $userId = $this->createOwner();
        $token = $this->login($userId)['data']['access_token'];
        $categoryPage = $this->withToken($token)->getJson('/api/v1/mobile/categories')
            ->assertOk()
            ->assertJsonPath('meta.total', 4);
        self::assertIsBool($categoryPage->json('data.0.requires_notes'));
        self::assertIsBool($categoryPage->json('data.0.is_active'));
        $this->withToken($token)->postJson('/api/v1/mobile/categories', [
            'name' => 'Travel',
            'category_kind' => 'expense',
            'requires_notes' => true,
        ], ['Idempotency-Key' => 'category-stepup-required'])
            ->assertStatus(428);
        $this->withToken($token)->postJson('/api/v1/mobile/auth/confirm-password', [
            'password' => 'Correct mobile password 123',
        ])->assertOk();
        $this->withToken($token)->patchJson('/api/v1/mobile/categories/'.$other->id, [
            'requires_notes' => false,
        ], ['Idempotency-Key' => 'other-category-notes-required'])->assertUnprocessable();

        $category = $this->withToken($token)->postJson('/api/v1/mobile/categories', [
            'name' => 'Travel',
            'category_kind' => 'expense',
            'requires_notes' => true,
        ], ['Idempotency-Key' => 'category-create-travel'])
            ->assertCreated()
            ->assertJsonPath('data.expense_category_name', 'Travel')
            ->json('data');
        self::assertSame(1, DB::table('expense_categories')->where('name', 'Travel')->count());
        $this->withToken($token)->patchJson('/api/v1/mobile/categories/'.$category['id'], [
            'name' => 'Travel expenses',
        ], ['Idempotency-Key' => 'category-rename-travel'])->assertOk()
            ->assertJsonPath('data.expense_category_name', 'Travel expenses');
        $this->withToken($token)->deleteJson('/api/v1/mobile/categories/'.$category['id'], [], [
            'Idempotency-Key' => 'category-archive-travel',
        ])->assertOk()
            ->assertJsonPath('data.is_active', false);
        self::assertSame(1, DB::table('audit_logs')->where('action', 'mobile.category.archived')->count());
    }

    private function login(int $userId, string $deviceName = 'Administration test phone'): array
    {
        return $this->postJson('/api/v1/mobile/auth/login', [
            'username' => DB::table('users')->where('id', $userId)->value('username'),
            'password' => 'Correct mobile password 123',
            'device_name' => $deviceName,
            'device_model' => 'Test model',
        ])->assertCreated()->json();
    }

    private function createOwner(): int
    {
        $suffix = bin2hex(random_bytes(4));
        $userId = (int) DB::table('users')->insertGetId([
            'username' => 'mobile-owner-'.$suffix,
            'display_name' => 'Mobile Owner',
            'password_hash' => Hash::make('Correct mobile password 123'),
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('user_roles')->insert([
            'user_id' => $userId,
            'role_id' => DB::table('roles')->where('code', 'owner')->value('id'),
            'granted_at' => now(),
        ]);

        return $userId;
    }
}
