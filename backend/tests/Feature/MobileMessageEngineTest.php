<?php

namespace Tests\Feature;

use Database\Seeders\MobileCategorySeeder;
use Database\Seeders\RolePermissionMatrixSeeder;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use PHPUnit\Framework\Attributes\Test;
use RuntimeException;
use Tests\TestCase;

class MobileMessageEngineTest extends TestCase
{
    private ?string $connection = null;

    private bool $transactionStarted = false;

    protected function setUp(): void
    {
        parent::setUp();

        $connection = getenv('AUTH_TEST_CONNECTION');
        if (! is_string($connection) || ! in_array($connection, ['mysql_test', 'mariadb_test'], true)) {
            $this->markTestSkipped('Set AUTH_TEST_CONNECTION to mysql_test or mariadb_test to run mobile message coverage.');
        }

        $this->connection = $connection;
        config(['database.default' => $connection]);
        DB::setDefaultConnection($connection);
        DB::purge($connection);
        if (config("database.connections.{$connection}.database") !== 'erp_acceptance_tests'
            || (DB::selectOne('SELECT DATABASE() AS database_name')->database_name ?? null) !== 'erp_acceptance_tests') {
            throw new RuntimeException('Mobile message integration tests require the erp_acceptance_tests database.');
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
    public function ingestion_is_source_checked_otp_blocked_duplicate_safe_and_hides_raw_text_without_permission(): void
    {
        $userId = $this->createOwner();
        $first = $this->login($userId, 'First phone');
        $second = $this->login($userId, 'Second phone');
        $firstToken = $first['data']['access_token'];
        $secondToken = $second['data']['access_token'];
        $channelId = $this->createChannel($firstToken);
        $firstSource = $this->createSmsSource($firstToken, $channelId);
        $secondSource = $this->createSmsSource($secondToken, $channelId);
        $rawText = 'Deposit received EGP 51.25';
        $payload = [
            'messages' => [[
                'source_id' => $firstSource,
                'type' => 'deposit',
                'amount' => '51.25',
                'sender' => 'WalletSender',
                'received_at' => '2026-10-13T12:30:00Z',
                'raw_text' => $rawText,
            ]],
        ];
        $headers = ['Idempotency-Key' => 'message-batch-first-device'];
        $created = $this->withToken($firstToken)->postJson('/api/v1/mobile/messages/batch', $payload, $headers)
            ->assertCreated()
            ->assertJsonPath('data.results.0.status', 'new')
            ->assertJsonPath('data.accepted_count', 1);
        $messageId = (int) $created->json('data.results.0.message_id');
        $this->withToken($firstToken)->postJson('/api/v1/mobile/messages/batch', $payload, $headers)
            ->assertCreated()
            ->assertJsonPath('data.results.0.message_id', $messageId);

        $crossDevicePayload = $payload;
        $crossDevicePayload['messages'][0]['source_id'] = $secondSource;
        $this->withToken($secondToken)->postJson('/api/v1/mobile/messages/batch', $crossDevicePayload, [
            'Idempotency-Key' => 'message-batch-second-device',
        ])->assertCreated()
            ->assertJsonPath('data.results.0.status', 'duplicate')
            ->assertJsonPath('data.results.0.existing_message_id', $messageId);
        self::assertSame(1, DB::table('mobile_messages')->count());

        foreach ([
            'Deposit received: رمز التحقق 123456',
            'Deposit received: كود 123456',
            'Deposit received: OTP 123456',
            'Deposit received: Verification code 123456',
        ] as $index => $verificationText) {
            $this->withToken($firstToken)->postJson('/api/v1/mobile/messages/batch', [
                'messages' => [[...$payload['messages'][0], 'raw_text' => $verificationText]],
            ], ['Idempotency-Key' => 'message-batch-otp-'.$index])->assertUnprocessable();
        }
        $this->withToken($firstToken)->postJson('/api/v1/mobile/messages/batch', [
            'messages' => [[...$payload['messages'][0], 'source_id' => 999999]],
        ], ['Idempotency-Key' => 'message-batch-unknown-source'])->assertUnprocessable();
        $this->withToken($firstToken)->postJson('/api/v1/mobile/messages/batch', [
            'messages' => [[...$payload['messages'][0], 'type' => 'withdrawal']],
        ], ['Idempotency-Key' => 'message-batch-disabled-direction'])->assertUnprocessable();
        self::assertSame(1, DB::table('mobile_messages')->count());
        self::assertStringNotContainsString($rawText, (string) DB::table('audit_logs')
            ->where('action', 'mobile.message.ingested')->value('after_data'));

        $this->withToken($firstToken)->getJson('/api/v1/mobile/messages')
            ->assertOk()
            ->assertJsonPath('data.0.raw_text', $rawText);
        $ownerRoleId = (int) DB::table('roles')->where('code', 'owner')->value('id');
        $viewPermissionId = (int) DB::table('permissions')->where('code', 'mobile.messages.view')->value('id');
        DB::table('role_permissions')->where('role_id', $ownerRoleId)
            ->where('permission_id', $viewPermissionId)->delete();
        $this->withToken($firstToken)->getJson('/api/v1/mobile/messages')
            ->assertOk()
            ->assertJsonMissingPath('data.0.raw_text');
    }

    #[Test]
    public function unclear_message_amount_requires_review_before_it_returns_to_the_new_list(): void
    {
        $userId = $this->createOwner();
        $login = $this->login($userId);
        $token = $login['data']['access_token'];
        $channelId = $this->createChannel($token);
        $sourceId = $this->createSmsSource($token, $channelId);
        $message = $this->withToken($token)->postJson('/api/v1/mobile/messages/batch', [
            'messages' => [[
                'source_id' => $sourceId,
                'type' => 'deposit',
                'amount' => null,
                'sender' => 'WalletSender',
                'received_at' => '2026-10-13T12:30:00Z',
                'raw_text' => 'Deposit received, amount unclear',
            ]],
        ], ['Idempotency-Key' => 'message-batch-needs-review'])->assertCreated()
            ->assertJsonPath('data.results.0.status', 'needs_review')
            ->json('data.results.0.message_id');

        $this->withToken($token)->patchJson('/api/v1/mobile/messages/'.$message.'/amount', [
            'amount_egp' => '9.80',
        ], ['Idempotency-Key' => 'message-review-amount'])
            ->assertOk()
            ->assertJsonPath('data.status', 'new')
            ->assertJsonPath('data.amount_egp', '9.80');
        self::assertSame(1, DB::table('audit_logs')->where('action', 'mobile.message.amount_reviewed')->count());
    }

    #[Test]
    public function ingestion_classifies_by_keywords_normalizes_senders_and_rejects_unmatched_messages(): void
    {
        $userId = $this->createOwner();
        $token = $this->login($userId)['data']['access_token'];
        $channelId = $this->createChannel($token);
        $sourceId = $this->createSmsSource($token, $channelId, [
            'sender_identifier' => '010 1234-5678',
            'read_withdrawals' => true,
            'withdrawal_keywords' => ['Withdrawal completed'],
        ]);

        $cases = [
            ['sender' => '+20 10 1234-5678', 'text' => 'DEPOSIT received EGP 1.00', 'type' => 'deposit'],
            ['sender' => '0020-10-1234-5678', 'text' => 'Withdrawal completed EGP 2.00', 'type' => 'withdrawal'],
            ['sender' => '0 10 1234 5678', 'text' => 'Deposit received EGP 3.00', 'type' => 'deposit'],
        ];
        foreach ($cases as $index => $case) {
            $this->withToken($token)->postJson('/api/v1/mobile/messages/batch', [
                'messages' => [[
                    'source_id' => $sourceId,
                    'amount' => (string) ($index + 1).'.00',
                    'sender' => $case['sender'],
                    'received_at' => '2026-10-13T13:0'.$index.':00Z',
                    'raw_text' => $case['text'],
                ]],
            ], ['Idempotency-Key' => 'message-sender-format-'.$index])->assertCreated()
                ->assertJsonPath('data.results.0.type', $case['type'])
                ->assertJsonPath('data.results.0.status', 'new');
        }

        $nameSourceId = $this->createSmsSource($token, $channelId, [
            'sender_identifier' => 'WalletSender',
        ]);
        $this->withToken($token)->postJson('/api/v1/mobile/messages/batch', [
            'messages' => [[
                'source_id' => $nameSourceId,
                'amount' => '4.00',
                'sender' => 'walletsender',
                'received_at' => '2026-10-13T13:10:00Z',
                'raw_text' => 'deposit received EGP 4.00',
            ]],
        ], ['Idempotency-Key' => 'message-sender-name-case'])->assertCreated()
            ->assertJsonPath('data.results.0.type', 'deposit');

        $ambiguous = $this->withToken($token)->postJson('/api/v1/mobile/messages/batch', [
            'messages' => [[
                'source_id' => $sourceId,
                'amount' => '5.00',
                'sender' => '+20 10 1234-5678',
                'received_at' => '2026-10-13T13:11:00Z',
                'raw_text' => 'Deposit received and Withdrawal completed EGP 5.00',
            ]],
        ], ['Idempotency-Key' => 'message-both-keywords'])->assertCreated()
            ->assertJsonPath('data.results.0.type', 'ambiguous')
            ->assertJsonPath('data.results.0.status', 'needs_review');

        $beforeRejected = DB::table('mobile_messages')->count();
        $this->withToken($token)->postJson('/api/v1/mobile/messages/batch', [
            'messages' => [[
                'source_id' => $sourceId,
                'amount' => '6.00',
                'sender' => '+20 10 1234-5678',
                'received_at' => '2026-10-13T13:12:00Z',
                'raw_text' => 'An unrelated notification EGP 6.00',
            ]],
        ], ['Idempotency-Key' => 'message-no-keyword-match'])->assertUnprocessable();
        self::assertSame($beforeRejected, DB::table('mobile_messages')->count());

        $unfilteredSourceId = $this->createSmsSource($token, $channelId, [
            'deposit_keywords' => [],
        ]);
        $this->withToken($token)->postJson('/api/v1/mobile/messages/batch', [
            'messages' => [[
                'source_id' => $unfilteredSourceId,
                'amount' => '7.00',
                'sender' => 'WalletSender',
                'received_at' => '2026-10-13T13:13:00Z',
                'raw_text' => 'Deposit received EGP 7.00 without configured filters',
            ]],
        ], ['Idempotency-Key' => 'message-empty-keyword-set'])->assertUnprocessable();
        self::assertSame($beforeRejected, DB::table('mobile_messages')->count());
    }

    #[Test]
    public function ten_owners_can_register_from_two_devices_and_duplicates_are_global(): void
    {
        $this->withoutMiddleware(ThrottleRequests::class);
        $owners = [];
        $firstMessage = null;
        for ($ownerIndex = 0; $ownerIndex < 10; $ownerIndex++) {
            $userId = $this->createOwner();
            $firstToken = $this->login($userId, 'Owner '.$ownerIndex.' first phone')['data']['access_token'];
            $secondToken = $this->login($userId, 'Owner '.$ownerIndex.' second phone')['data']['access_token'];
            $channelId = $this->createChannel($firstToken);
            $sourceId = $this->createSmsSource($firstToken, $channelId);
            $this->withToken($secondToken)->patchJson('/api/v1/mobile/sources/'.$sourceId, [
                'is_enabled' => true,
                'read_deposits' => true,
                'read_withdrawals' => false,
            ], ['Idempotency-Key' => 'owner-'.$ownerIndex.'-second-device-source'])->assertOk();
            $owners[] = ['first_token' => $firstToken, 'second_token' => $secondToken, 'source_id' => $sourceId];

            foreach (['first_token', 'second_token'] as $deviceIndex => $tokenKey) {
                $amount = (string) ($ownerIndex + 1).($deviceIndex === 0 ? '.11' : '.22');
                $message = [
                    'source_id' => $sourceId,
                    'type' => 'deposit',
                    'amount' => $amount,
                    'sender' => 'WalletSender',
                    'received_at' => '2026-10-13T14:'.str_pad((string) $ownerIndex, 2, '0', STR_PAD_LEFT).':'.($deviceIndex === 0 ? '00' : '01').'Z',
                    'raw_text' => 'Deposit received EGP '.$amount.' owner '.$ownerIndex.' device '.$deviceIndex,
                ];
                if ($ownerIndex === 0 && $deviceIndex === 0) {
                    $firstMessage = $message;
                }
                $this->withToken($owners[$ownerIndex][$tokenKey])->postJson('/api/v1/mobile/messages/batch', [
                    'messages' => [$message],
                ], ['Idempotency-Key' => 'owner-'.$ownerIndex.'-device-'.$deviceIndex.'-message'])->assertCreated()
                    ->assertJsonPath('data.results.0.status', 'new');
            }
        }

        self::assertSame(20, DB::table('mobile_messages')->count());
        self::assertIsArray($firstMessage);
        $duplicate = $firstMessage;
        $duplicate['source_id'] = $owners[1]['source_id'];
        $this->withToken($owners[1]['second_token'])->postJson('/api/v1/mobile/messages/batch', [
            'messages' => [$duplicate],
        ], ['Idempotency-Key' => 'cross-user-cross-device-duplicate'])->assertCreated()
            ->assertJsonPath('data.results.0.status', 'duplicate');
        self::assertSame(20, DB::table('mobile_messages')->count());
        self::assertSame(1, DB::table('audit_logs')->where('action', 'mobile.message.duplicate_ignored')->count());
        self::assertStringNotContainsString('Deposit received', (string) DB::table('audit_logs')
            ->where('action', 'mobile.message.duplicate_ignored')->value('after_data'));
    }

    #[Test]
    public function ignoring_a_message_is_audited_synchronized_and_idempotent(): void
    {
        $userId = $this->createOwner();
        $login = $this->login($userId);
        $token = $login['data']['access_token'];
        $channelId = $this->createChannel($token);
        $sourceId = $this->createSmsSource($token, $channelId);
        $messageId = (int) $this->withToken($token)->postJson('/api/v1/mobile/messages/batch', [
            'messages' => [[
                'source_id' => $sourceId,
                'type' => 'deposit',
                'amount' => '7.25',
                'sender' => 'WalletSender',
                'received_at' => '2026-10-13T12:30:00Z',
                'raw_text' => 'Deposit received EGP 7.25',
            ]],
        ], ['Idempotency-Key' => 'message-ignore-ingest'])->assertCreated()
            ->json('data.results.0.message_id');

        $headers = ['Idempotency-Key' => 'message-ignore'];
        $this->withToken($token)->postJson('/api/v1/mobile/messages/'.$messageId.'/ignore', [], $headers)
            ->assertOk()
            ->assertJsonPath('data.id', $messageId)
            ->assertJsonPath('data.status', 'ignored');
        $this->withToken($token)->postJson('/api/v1/mobile/messages/'.$messageId.'/ignore', [], $headers)
            ->assertOk()
            ->assertJsonPath('data.status', 'ignored');

        self::assertSame('ignored', DB::table('mobile_messages')->where('id', $messageId)->value('status'));
        self::assertSame(1, DB::table('audit_logs')->where('action', 'mobile.message.ignored')->count());
        self::assertSame(2, DB::table('mobile_sync_events')
            ->where('entity_type', 'message')
            ->where('entity_id', $messageId)
            ->count());
        self::assertStringNotContainsString('Deposit received', (string) DB::table('audit_logs')
            ->where('action', 'mobile.message.ignored')->value('after_data'));
    }

    private function createChannel(string $token): int
    {
        $this->withToken($token)->postJson('/api/v1/mobile/auth/confirm-password', [
            'password' => 'Correct mobile password 123',
        ])->assertOk();

        return (int) $this->withToken($token)->postJson('/api/v1/mobile/channels', [
            'name' => 'Message channel',
            'channel_type' => 'wallet',
        ], ['Idempotency-Key' => 'message-channel-'.bin2hex(random_bytes(5))])
            ->assertCreated()
            ->json('data.id');
    }

    private function createSmsSource(string $token, int $channelId, array $overrides = []): int
    {
        return (int) $this->withToken($token)->postJson('/api/v1/mobile/sources', array_merge([
            'channel_id' => $channelId,
            'source_kind' => 'sms',
            'sender_identifier' => 'WalletSender',
            'read_deposits' => true,
            'read_withdrawals' => false,
            'deposit_keywords' => ['Deposit received'],
        ], $overrides), ['Idempotency-Key' => 'message-source-'.bin2hex(random_bytes(5))])
            ->assertCreated()
            ->json('data.id');
    }

    private function login(int $userId, string $deviceName = 'Message test phone'): array
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
            'username' => 'mobile-message-owner-'.$suffix,
            'display_name' => 'Mobile Message Owner',
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
