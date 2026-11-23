<?php

namespace Tests\Feature;

use App\Services\ReportsService;
use App\Services\TreasuryService;
use Database\Seeders\MobileCategorySeeder;
use Database\Seeders\RolePermissionMatrixSeeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use PHPUnit\Framework\Attributes\Test;
use RuntimeException;
use Tests\TestCase;

class MobileFinanceEngineTest extends TestCase
{
    private ?string $connection = null;

    private bool $transactionStarted = false;

    protected function setUp(): void
    {
        parent::setUp();

        $connection = getenv('AUTH_TEST_CONNECTION');
        if (! is_string($connection) || ! in_array($connection, ['mysql_test', 'mariadb_test'], true)) {
            $this->markTestSkipped('Set AUTH_TEST_CONNECTION to mysql_test or mariadb_test to run mobile finance coverage.');
        }

        $this->connection = $connection;
        config(['database.default' => $connection]);
        DB::setDefaultConnection($connection);
        DB::purge($connection);
        if (config("database.connections.{$connection}.database") !== 'erp_acceptance_tests'
            || (DB::selectOne('SELECT DATABASE() AS database_name')->database_name ?? null) !== 'erp_acceptance_tests') {
            throw new RuntimeException('Mobile finance integration tests require the erp_acceptance_tests database.');
        }

        DB::beginTransaction();
        $this->transactionStarted = true;
        app(RolePermissionMatrixSeeder::class)->run();
        app(MobileCategorySeeder::class)->run();
        $ownerId = DB::table('roles')->where('code', 'owner')->value('id');
        foreach (['mobile.channels.view', 'mobile.messages.capture', 'mobile.messages.record', 'mobile.customers.create'] as $code) {
            DB::table('role_permissions')->insertOrIgnore([
                'role_id' => $ownerId,
                'permission_id' => DB::table('permissions')->where('code', $code)->value('id'),
                'granted_at' => now(),
            ]);
        }
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
    public function message_and_manual_deposits_post_unapplied_collections_with_provenance_idempotently(): void
    {
        $userId = $this->createOwner();
        $token = $this->login($userId);
        $customer = $this->withToken($token)->postJson('/api/v1/mobile/customers', [
            'name' => 'E2E-TEST phone customer '.bin2hex(random_bytes(3)), 'phone' => null,
        ], ['Idempotency-Key' => 'direction-review-customer'])->assertCreated()->json('data');
        $customerId = (int) $customer['id'];
        self::assertSame(1, DB::table('customers')->where('id', $customerId)->where('name', $customer['name'])->count());
        $this->withToken($token)->getJson('/api/v1/customers?search='.urlencode($customer['name']))
            ->assertOk()->assertJsonPath('data.0.id', $customerId);
        $walletId = $this->createChannel($token, 'wallet', 'Wallet channel', '10.00');
        $sourceId = $this->createSource($token, $walletId);
        $messageId = $this->ingest($token, $sourceId, 'deposit', '27.40', 'Deposit received EGP 27.40');
        $payload = ['customer_id' => $customerId, 'notes' => 'Wallet receipt'];
        $headers = ['Idempotency-Key' => 'finance-message-deposit-01'];
        $deposit = $this->withToken($token)->postJson(
            '/api/v1/mobile/messages/'.$messageId.'/register-deposit',
            $payload,
            $headers,
        )->assertCreated()
            ->assertJsonPath('data.amount_egp', '27.40')
            ->assertJsonPath('data.recording_source', 'sms')
            ->assertJsonPath('data.is_unverified_payment', true)
            ->assertJsonPath('data.receipt.unapplied_amount', '27.4000');
        $receiptId = (int) $deposit->json('data.id');
        $this->withToken($token)->postJson(
            '/api/v1/mobile/messages/'.$messageId.'/register-deposit',
            $payload,
            $headers,
        )->assertCreated()->assertJsonPath('data.id', $receiptId);
        self::assertSame(1, DB::table('sales_receipts')->where('id', $receiptId)->count());
        self::assertSame(1, DB::table('treasury_entries')
            ->where('source_type', 'sales_receipt')->where('source_id', $receiptId)->count());
        self::assertSame('registered', DB::table('mobile_messages')->where('id', $messageId)->value('status'));
        self::assertSame('sales_receipt', DB::table('mobile_messages')->where('id', $messageId)->value('registered_document_type'));
        self::assertSame('37.40', app(TreasuryService::class)->balance(
            (int) DB::table('mobile_channels')->where('id', $walletId)->value('treasury_account_id'),
        )['balance_egp']);

        $postOfficeId = $this->createChannel($token, 'post_office', 'Post office');
        $manualPayload = [
            'channel_id' => $postOfficeId,
            'customer_id' => $customerId,
            'amount_egp' => '8.25',
            'receipt_date' => '2026-10-12',
            'notes' => 'Manual post-office deposit',
        ];
        $manualHeaders = ['Idempotency-Key' => 'finance-manual-deposit-01'];
        $manual = $this->withToken($token)->postJson(
            '/api/v1/mobile/deposits/manual',
            $manualPayload,
            $manualHeaders,
        )->assertCreated()
            ->assertJsonPath('data.recording_source', 'manual')
            ->assertJsonPath('data.is_unverified_payment', false);
        $manualId = (int) $manual->json('data.id');
        $this->withToken($token)->postJson('/api/v1/mobile/deposits/manual', $manualPayload, $manualHeaders)
            ->assertCreated()->assertJsonPath('data.id', $manualId);
        self::assertSame(2, DB::table('sales_receipts')->where('customer_id', $customerId)->count());
        self::assertSame('manual', DB::table('sales_receipts')->where('id', $manualId)->value('recording_source'));
        self::assertFalse((bool) DB::table('sales_receipts')->where('id', $manualId)->value('is_unverified_payment'));

        $statement = app(ReportsService::class)->customerStatement($customerId, []);
        $reportedReceipt = collect($statement['data'])->firstWhere('entry_id', $receiptId);
        self::assertSame('sms', $reportedReceipt->recording_source);
        self::assertTrue((bool) $reportedReceipt->is_unverified_payment);
        $reportedManual = collect($statement['data'])->firstWhere('entry_id', $manualId);
        self::assertSame('manual', $reportedManual->recording_source);
        self::assertFalse((bool) $reportedManual->is_unverified_payment);
    }

    #[Test]
    public function message_withdrawals_reuse_expense_and_transfer_services_and_require_fallback_notes(): void
    {
        $userId = $this->createOwner();
        $token = $this->login($userId);
        $channelId = $this->createChannel($token, 'wallet', 'Withdrawal wallet', '100.00');
        $sourceId = $this->createSource($token, $channelId);
        $payroll = DB::table('mobile_categories')->where('name', 'الرواتب')->first();
        $drawer = DB::table('mobile_categories')->where('name', 'الدرج')->first();
        $other = DB::table('mobile_categories')->where('name', 'مصاريف أخرى')->first();

        $expenseMessageId = $this->ingest($token, $sourceId, 'withdrawal', '12.50', 'Payment sent EGP 12.50');
        $expense = $this->withToken($token)->postJson(
            '/api/v1/mobile/messages/'.$expenseMessageId.'/register-withdrawal',
            ['category_id' => (int) $payroll->id, 'notes' => 'Payroll transfer fee'],
            ['Idempotency-Key' => 'finance-expense-withdrawal-01'],
        )->assertCreated()
            ->assertJsonPath('data.document_type', 'expense')
            ->assertJsonPath('data.amount_egp', '12.50');
        $expenseId = (int) $expense->json('data.id');
        self::assertSame(1, DB::table('expenses')->where('id', $expenseId)->count());
        self::assertSame('expense', DB::table('mobile_messages')->where('id', $expenseMessageId)->value('registered_document_type'));

        $transferMessageId = $this->ingest($token, $sourceId, 'withdrawal', '7.25', 'Payment sent EGP 7.25');
        $transfer = $this->withToken($token)->postJson(
            '/api/v1/mobile/messages/'.$transferMessageId.'/register-withdrawal',
            ['category_id' => (int) $drawer->id],
            ['Idempotency-Key' => 'finance-transfer-withdrawal-01'],
        )->assertCreated()->assertJsonPath('data.document_type', 'treasury_transfer');
        $transferId = (int) $transfer->json('data.id');
        self::assertSame(1, DB::table('treasury_transfers')->where('id', $transferId)->count());
        self::assertSame('80.25', app(TreasuryService::class)->balance(
            (int) DB::table('mobile_channels')->where('id', $channelId)->value('treasury_account_id'),
        )['balance_egp']);

        $otherMessageId = $this->ingest($token, $sourceId, 'withdrawal', '5.00', 'Payment sent EGP 5.00');
        $this->withToken($token)->postJson(
            '/api/v1/mobile/messages/'.$otherMessageId.'/register-withdrawal',
            ['category_id' => (int) $other->id],
            ['Idempotency-Key' => 'finance-other-notes-required'],
        )->assertUnprocessable();
        self::assertSame('new', DB::table('mobile_messages')->where('id', $otherMessageId)->value('status'));
        $this->withToken($token)->postJson(
            '/api/v1/mobile/messages/'.$otherMessageId.'/register-withdrawal',
            ['category_id' => (int) $other->id, 'notes' => 'Uncategorized wallet expense'],
            ['Idempotency-Key' => 'finance-other-with-notes'],
        )->assertCreated()->assertJsonPath('data.document_type', 'expense');
        self::assertSame(2, DB::table('expenses')->count());
        self::assertSame(3, DB::table('audit_logs')->where('action', 'mobile.message.withdrawal_registered')->count());
    }

    #[Test]
    public function end_to_end_mobile_flow_syncs_a_message_deposit_and_withdrawal(): void
    {
        $userId = $this->createOwner();
        $token = $this->login($userId);
        $cursor = (int) $this->withToken($token)->getJson('/api/v1/mobile/ping')->assertOk()->json('data.cursor');
        $channelId = $this->createChannel($token, 'wallet', 'End-to-end wallet', '100.00');
        $sourceId = $this->createSource($token, $channelId);
        $customerId = $this->createCustomer();
        $depositMessageId = $this->ingest($token, $sourceId, 'deposit', '20.25', 'Deposit received EGP 20.25');
        $this->withToken($token)->postJson('/api/v1/mobile/messages/'.$depositMessageId.'/register-deposit', [
            'customer_id' => $customerId,
        ], ['Idempotency-Key' => 'finance-e2e-deposit'])
            ->assertCreated()
            ->assertJsonPath('data.recording_source', 'sms')
            ->assertJsonPath('data.is_unverified_payment', true);

        $withdrawalMessageId = $this->ingest($token, $sourceId, 'withdrawal', '10.00', 'Payment sent EGP 10.00');
        $payrollCategoryId = (int) DB::table('mobile_categories')->where('name', 'الرواتب')->value('id');
        $this->withToken($token)->postJson('/api/v1/mobile/messages/'.$withdrawalMessageId.'/register-withdrawal', [
            'category_id' => $payrollCategoryId,
            'notes' => 'End-to-end payroll payment',
        ], ['Idempotency-Key' => 'finance-e2e-withdrawal'])
            ->assertCreated()
            ->assertJsonPath('data.document_type', 'expense');

        $this->withToken($token)->getJson('/api/v1/mobile/sync?cursor='.$cursor)
            ->assertOk()
            ->assertJsonPath('data.channels.0.id', $channelId)
            ->assertJsonPath('data.channels.0.balance_egp', '110.25')
            ->assertJsonCount(2, 'data.messages')
            ->assertJsonPath('data.messages.0.id', $depositMessageId)
            ->assertJsonPath('data.messages.0.amount_egp', '20.25')
            ->assertJsonPath('data.messages.0.status', 'registered')
            ->assertJsonPath('data.messages.1.id', $withdrawalMessageId)
            ->assertJsonPath('data.messages.1.amount_egp', '10.00')
            ->assertJsonPath('data.messages.1.status', 'registered');
    }

    #[Test]
    public function capture_api_deduplicates_records_finance_and_paginates_channels(): void
    {
        $userId = $this->createOwner();
        $token = $this->login($userId);
        $this->withToken($token)->postJson('/api/v1/mobile/auth/confirm-password', [
            'password' => 'Correct mobile password 123',
        ])->assertOk();
        $missingChannel = $this->withToken($token)->postJson('/api/v1/mobile/channels', ['sender_filter' => 'X'], [
            'Idempotency-Key' => 'capture-channel-missing-fields',
        ])->assertUnprocessable();
        foreach (['name', 'type', 'number'] as $field) self::assertArrayHasKey($field, $missingChannel->json('error.details'));
        $this->withToken($token)->postJson('/api/v1/mobile/channels', [
            'name' => 'Invalid channel', 'type' => 'carrier-pigeon', 'number' => '1', 'sender_filter' => 'X',
            'deposit_keywords' => ['in'],
        ], ['Idempotency-Key' => 'capture-channel-invalid-type'])->assertUnprocessable();
        self::assertArrayHasKey('type', $this->withToken($token)->postJson('/api/v1/mobile/channels', [
            'name' => 'Invalid channel', 'type' => 'carrier-pigeon', 'number' => '1', 'sender_filter' => 'X', 'deposit_keywords' => ['in'],
        ], ['Idempotency-Key' => 'capture-channel-invalid-type-repeat'])->assertUnprocessable()->json('error.details'));
        $channel = $this->withToken($token)->postJson('/api/v1/mobile/channels', [
            'name' => 'Capture wallet', 'type' => 'wallet', 'number' => '01000000000', 'sender_filter' => 'CaptureSender',
            'notification_package_names' => ['com.example.wallet'],
            'deposit_keywords' => ['received'], 'withdrawal_keywords' => ['sent'],
        ], ['Idempotency-Key' => 'capture-channel-'.bin2hex(random_bytes(4))])->assertCreated()
            ->assertJsonPath('data.notification_package_names', ['com.example.wallet'])->json('data');
        self::assertSame('0.00', $channel['balance']);
        $this->withToken($token)->patchJson('/api/v1/mobile/channels/'.$channel['id'], [
            'notification_package_names' => ['com.example.wallet', 'com.example.bank'],
        ], ['Idempotency-Key' => 'capture-channel-notification-packages-update'])->assertOk()
            ->assertJsonPath('data.notification_package_names', ['com.example.wallet', 'com.example.bank']);

        $customerId = $this->createCustomer();
        $depositId = $this->captureMessage($token, (int) $channel['id'], '10.25', 'Payment received EGP 10.25', 'deposit-first');
        $duplicate = $this->captureMessageResponse($token, (int) $channel['id'], '10.25', 'Payment received EGP 10.25', 'deposit-duplicate');
        $duplicate->assertOk()->assertJsonPath('data.id', $depositId)->assertJsonPath('data.duplicate', true);
        self::assertSame(1, DB::table('mobile_captured_messages')->where('dedupe_key', $duplicate->json('data.dedupe_key'))->count());
        $this->resolveCapturedMessage($token, $depositId, 'DEPOSIT');
        $this->withToken($token)->postJson('/api/v1/mobile/messages/'.$depositId.'/record-deposit', [
            'customer_id' => $customerId,
        ], ['Idempotency-Key' => 'capture-deposit-record'])->assertCreated()
            ->assertJsonPath('data.recorded_as', 'CUSTOMER_COLLECTION');
        $depositAgain = $this->withToken($token)->postJson('/api/v1/mobile/messages/'.$depositId.'/record-deposit', [
            'customer_id' => $customerId,
        ], ['Idempotency-Key' => 'capture-deposit-record-again'])->assertUnprocessable();
        self::assertArrayHasKey('status', $depositAgain->json('error.details'));

        $withdrawalId = $this->captureMessage($token, (int) $channel['id'], '2.10', 'Payment sent EGP 2.10', 'withdrawal');
        $this->resolveCapturedMessage($token, $withdrawalId, 'WITHDRAWAL');
        $notDeposit = $this->withToken($token)->postJson('/api/v1/mobile/messages/'.$withdrawalId.'/record-deposit', [
            'customer_id' => $customerId,
        ], ['Idempotency-Key' => 'capture-wrong-deposit'])->assertUnprocessable();
        self::assertArrayHasKey('direction', $notDeposit->json('error.details'));
        $category = $this->withToken($token)->postJson('/api/v1/mobile/withdrawal-categories', ['name' => 'other'], [
            'Idempotency-Key' => 'capture-category-other',
        ])->assertCreated()->json('data.id');
        $missingNotes = $this->withToken($token)->postJson('/api/v1/mobile/messages/'.$withdrawalId.'/record-withdrawal', [
            'category_id' => $category,
        ], ['Idempotency-Key' => 'capture-withdrawal-missing-notes'])->assertUnprocessable();
        self::assertArrayHasKey('notes', $missingNotes->json('error.details'));
        $this->withToken($token)->postJson('/api/v1/mobile/messages/'.$withdrawalId.'/record-withdrawal', [
            'category_id' => $category, 'notes' => 'Drawer cash expense',
        ], ['Idempotency-Key' => 'capture-withdrawal-record'])->assertCreated()
            ->assertJsonPath('data.recorded_as', 'TREASURY_TRANSFER');
        $withdrawalAgain = $this->withToken($token)->postJson('/api/v1/mobile/messages/'.$withdrawalId.'/record-withdrawal', [
            'category_id' => $category, 'notes' => 'Duplicate attempt',
        ], ['Idempotency-Key' => 'capture-withdrawal-again'])->assertUnprocessable();
        self::assertArrayHasKey('status', $withdrawalAgain->json('error.details'));
        self::assertSame('8.15', $this->withToken($token)->getJson('/api/v1/mobile/channels?type=wallet')->assertOk()->json('data.0.balance'));
        $channelCountBeforePause = DB::table('mobile_payment_channels')->count();
        $this->withToken($token)->patchJson('/api/v1/mobile/channels/'.$channel['id'], ['paused' => true], [
            'Idempotency-Key' => 'capture-channel-pause',
        ])->assertOk()->assertJsonPath('data.paused', true);
        self::assertSame(1, DB::table('mobile_payment_channels')->where('id', $channel['id'])->count());
        self::assertSame($channelCountBeforePause, DB::table('mobile_payment_channels')->count());
        $this->withToken($token)->postJson('/api/v1/mobile/messages/capture', [
            'channel_id' => $channel['id'], 'amount' => '1.00', 'raw_text' => 'Payment received EGP 1.00',
            'sender' => 'CaptureSender', 'received_at' => '2026-10-13T10:20:00Z',
            'dedupe_key' => hash('sha256', implode('|', ['CaptureSender', '1.00', '2026-10-13 10:20', hash('sha256', 'Payment received EGP 1.00')])),
        ], ['Idempotency-Key' => 'capture-paused-channel'])->assertUnprocessable();
        self::assertArrayHasKey('channel_id', $this->withToken($token)->postJson('/api/v1/mobile/messages/capture', [
            'channel_id' => $channel['id'], 'amount' => '1.00', 'raw_text' => 'Payment received EGP 1.00',
            'sender' => 'CaptureSender', 'received_at' => '2026-10-13T10:20:00Z',
            'dedupe_key' => hash('sha256', implode('|', ['CaptureSender', '1.00', '2026-10-13 10:20', hash('sha256', 'Payment received EGP 1.00')])),
        ], ['Idempotency-Key' => 'capture-paused-channel-repeat'])->assertUnprocessable()->json('error.details'));

        $wrongSenderText = 'Payment received EGP 1.00';
        $wrongSender = 'UnmatchedSender';
        $wrongHash = hash('sha256', $wrongSenderText);
        $wrongDedupe = hash('sha256', implode('|', [$wrongSender, '1.00', '2026-10-13 10:20', $wrongHash]));
        $unmatched = $this->withToken($token)->postJson('/api/v1/mobile/messages/capture', [
            'channel_id' => $channel['id'], 'amount' => '1.00', 'raw_text' => $wrongSenderText, 'sender' => $wrongSender,
            'received_at' => '2026-10-13T10:20:00Z', 'dedupe_key' => $wrongDedupe,
        ], ['Idempotency-Key' => 'capture-unmatched'])->assertUnprocessable();
        self::assertArrayHasKey('channel_id', $unmatched->json('error.details'));

        $postal = $this->withToken($token)->postJson('/api/v1/mobile/channels', [
            'name' => 'Postal channel', 'type' => 'postal', 'number' => 'POSTAL-1', 'sender_filter' => 'Postal', 'deposit_keywords' => ['deposit'],
        ], ['Idempotency-Key' => 'capture-postal-channel'])->assertCreated()->json('data.id');
        $this->withToken($token)->postJson('/api/v1/mobile/manual-deposits', [
            'channel_id' => $postal, 'customer_id' => $customerId, 'amount' => '12.34', 'date' => '2026-10-13', 'note' => 'Postal deposit',
        ], ['Idempotency-Key' => 'capture-manual-deposit'])->assertCreated()
            ->assertJsonPath('data.source', 'MANUAL')
            ->assertJsonPath('data.recorded_as', 'CUSTOMER_COLLECTION')
            ->assertJsonPath('data.amount', '12.34');

        for ($index = 0; $index < 49; $index++) {
            $this->withToken($token)->postJson('/api/v1/mobile/channels', [
                'name' => 'Paged channel '.$index, 'type' => 'wallet', 'number' => 'W-'.$index,
                'sender_filter' => 'PagedSender', 'deposit_keywords' => ['received'],
            ], ['Idempotency-Key' => 'capture-page-'.$index])->assertCreated();
        }
        $this->withToken($token)->getJson('/api/v1/mobile/channels?type=wallet&per_page=20&page=1')->assertOk()
            ->assertJsonCount(20, 'data')->assertJsonPath('meta.total', 50);
        $this->withToken($token)->getJson('/api/v1/mobile/channels?type=wallet&per_page=20&page=2')->assertOk()
            ->assertJsonCount(20, 'data')->assertJsonPath('meta.total', 50);
        $this->withToken($token)->getJson('/api/v1/mobile/channels?type=wallet&per_page=20&page=3')->assertOk()
            ->assertJsonCount(10, 'data')->assertJsonPath('meta.total', 50);
        $ownerRole = (int) DB::table('roles')->where('code', 'owner')->value('id');
        $channelsView = (int) DB::table('permissions')->where('code', 'mobile.channels.view')->value('id');
        DB::table('role_permissions')->where('role_id', $ownerRole)->where('permission_id', $channelsView)->delete();
        $this->withToken($token)->getJson('/api/v1/mobile/channels?type=wallet')->assertForbidden();
    }

    #[Test]
    public function captured_deposit_posts_one_unapplied_collection_and_inbound_entry(): void
    {
        $userId = $this->createOwner();
        $token = $this->login($userId);
        $this->withToken($token)->postJson('/api/v1/mobile/auth/confirm-password', ['password' => 'Correct mobile password 123'])->assertOk();
        $channel = $this->withToken($token)->postJson('/api/v1/mobile/channels', [
            'name' => 'Deposit test channel', 'type' => 'wallet', 'number' => '01000000001', 'sender_filter' => 'CaptureSender',
            'deposit_keywords' => ['received'], 'withdrawal_keywords' => ['sent'],
        ], ['Idempotency-Key' => 'deposit-test-channel'])->assertCreated()->json('data');
        $customerId = $this->createCustomer();
        $messageId = $this->captureMessage($token, (int) $channel['id'], '14.75', 'Payment received EGP 14.75', 'deposit-posting');
        $this->resolveCapturedMessage($token, $messageId, 'DEPOSIT');
        $record = $this->withToken($token)->postJson('/api/v1/mobile/messages/'.$messageId.'/record-deposit', [
            'customer_id' => $customerId,
        ], ['Idempotency-Key' => 'deposit-test-record'])->assertCreated()->json('data');
        $receipt = DB::table('sales_receipts')->where('id', $record['recorded_ref_id'])->first();
        self::assertSame('collection', $receipt->receipt_type);
        self::assertSame((string) $customerId, (string) $receipt->customer_id);
        self::assertSame('14.7500', (string) $receipt->amount);
        self::assertSame(1, DB::table('treasury_entries')->where('source_type', 'sales_receipt')
            ->where('source_id', $receipt->id)->where('direction', 'in')->count());
        self::assertSame('RECORDED', DB::table('mobile_captured_messages')->where('id', $messageId)->value('status'));
    }

    #[Test]
    public function capture_accepts_a_whitelisted_notification_package_and_rejects_an_unlisted_one(): void
    {
        $userId = $this->createOwner();
        $token = $this->login($userId);
        DB::table('mobile_devices')->where('token_hash', hash('sha256', $token))
            ->update(['password_confirmed_at' => now()]);
        $channel = $this->withToken($token)->postJson('/api/v1/mobile/channels', [
            'name' => 'Notification capture test channel', 'type' => 'wallet', 'number' => 'NOTIFY-1',
            'sender_filter' => 'CaptureSender', 'notification_package_names' => ['com.allowed.wallet'],
            'deposit_keywords' => ['deposit'], 'withdrawal_keywords' => ['withdraw'],
        ], ['Idempotency-Key' => 'notification-capture-test-channel'])->assertCreated()->json('data');

        $acceptedText = 'deposit 4.25 E2E-TEST notification allowed';
        $acceptedSender = 'com.allowed.wallet';
        $receivedAt = '2026-10-16T10:20:45Z';
        $acceptedHash = hash('sha256', $acceptedText);
        $acceptedKey = hash('sha256', implode('|', [$acceptedSender, '4.25', '2026-10-16 10:20', $acceptedHash]));
        $accepted = $this->withToken($token)->postJson('/api/v1/mobile/messages/capture', [
            'channel_id' => $channel['id'], 'amount' => '4.25', 'raw_text' => $acceptedText,
            'sender' => $acceptedSender, 'received_at' => $receivedAt, 'dedupe_key' => $acceptedKey,
        ], ['Idempotency-Key' => 'notification-capture-accepted'])
            ->assertCreated()
            ->assertJsonPath('data.direction', 'NEEDS_REVIEW')
            ->assertJsonPath('data.status', 'NEEDS_REVIEW')
            ->assertJsonPath('data.sender', $acceptedSender);

        $unlistedText = 'deposit 5.25 E2E-TEST notification unlisted';
        $unlistedSender = 'com.unlisted.wallet';
        $unlistedHash = hash('sha256', $unlistedText);
        $unlistedKey = hash('sha256', implode('|', [$unlistedSender, '5.25', '2026-10-16 10:20', $unlistedHash]));
        $rejected = $this->withToken($token)->postJson('/api/v1/mobile/messages/capture', [
            'channel_id' => $channel['id'], 'amount' => '5.25', 'raw_text' => $unlistedText,
            'sender' => $unlistedSender, 'received_at' => $receivedAt, 'dedupe_key' => $unlistedKey,
        ], ['Idempotency-Key' => 'notification-capture-unlisted'])->assertUnprocessable();
        self::assertArrayHasKey('channel_id', $rejected->json('error.details'));

        self::assertSame(1, DB::table('mobile_captured_messages')->where('id', $accepted->json('data.id'))->count());
        self::assertSame(0, DB::table('mobile_captured_messages')->where('dedupe_key', $unlistedKey)->count());
    }

    #[Test]
    public function ambiguous_phone_message_can_be_resolved_then_recorded_as_customer_deposit_or_drawer_withdrawal(): void
    {
        $userId = $this->createOwner();
        $token = $this->login($userId);
        DB::table('mobile_devices')->where('token_hash', hash('sha256', $token))
            ->update(['password_confirmed_at' => now()]);

        $channel = $this->withToken($token)->postJson('/api/v1/mobile/channels', [
            'name' => 'E2E-TEST Direction review channel', 'type' => 'wallet', 'number' => 'E2E-TEST-REVIEW-1',
            'sender_filter' => 'CaptureSender',
            'deposit_keywords' => [], 'withdrawal_keywords' => [],
        ], ['Idempotency-Key' => 'direction-review-channel'])->assertCreated()->json('data');
        $channelAccountId = (int) DB::table('mobile_payment_channels')->where('id', $channel['id'])->value('treasury_account_id');
        $customer = $this->withToken($token)->postJson('/api/v1/mobile/customers', [
            'name' => 'E2E-TEST direction review customer '.bin2hex(random_bytes(3)), 'phone' => null,
        ], ['Idempotency-Key' => 'direction-review-mobile-customer'])->assertCreated()->json('data');
        $customerId = (int) $customer['id'];
        self::assertSame(1, DB::table('customers')->where('id', $customerId)->where('name', $customer['name'])->count());
        $this->withToken($token)->getJson('/api/v1/customers?search='.urlencode($customer['name']))
            ->assertOk()->assertJsonPath('data.0.id', $customerId);

        $depositText = 'E2E-TEST Wallet transfer reference 50.00 EGP';
        $depositKey = $this->captureKey('CaptureSender', '50.00', '2026-10-16T10:20:45Z', $depositText);
        $depositMessage = $this->withToken($token)->postJson('/api/v1/mobile/messages/capture', [
            'channel_id' => $channel['id'], 'amount' => '50.00', 'raw_text' => $depositText,
            'sender' => 'CaptureSender', 'received_at' => '2026-10-16T10:20:45Z', 'dedupe_key' => $depositKey,
        ], ['Idempotency-Key' => 'direction-review-capture-deposit'])->assertCreated()
            ->assertJsonPath('data.direction', 'NEEDS_REVIEW')->assertJsonPath('data.status', 'NEEDS_REVIEW');
        $depositMessageId = (int) $depositMessage->json('data.id');
        $this->withToken($token)->postJson('/api/v1/mobile/messages/'.$depositMessageId.'/resolve-direction', [
            'direction' => 'DEPOSIT',
        ], ['Idempotency-Key' => 'direction-review-resolve-deposit'])->assertOk()
            ->assertJsonPath('data.direction', 'DEPOSIT')->assertJsonPath('data.amount', '50.0000')
            ->assertJsonPath('data.status', 'NEW');
        $recordDepositBody = ['customer_id' => $customerId];
        $recordDepositKey = ['Idempotency-Key' => 'direction-review-record-deposit'];
        $depositResponse = $this->withToken($token)->postJson('/api/v1/mobile/messages/'.$depositMessageId.'/record-deposit', $recordDepositBody, $recordDepositKey)->assertCreated();
        $deposit = $depositResponse->json('data');
        $this->withToken($token)->postJson('/api/v1/mobile/messages/'.$depositMessageId.'/record-deposit', $recordDepositBody, $recordDepositKey)
            ->assertCreated()->assertJsonPath('data.recorded_ref_id', $deposit['recorded_ref_id']);
        self::assertSame('RECORDED', DB::table('mobile_captured_messages')->where('id', $depositMessageId)->value('status'));
        self::assertSame('50.0000', (string) DB::table('sales_receipts')->where('id', $deposit['recorded_ref_id'])->value('amount'));
        self::assertSame(1, DB::table('sales_receipts')->where('id', $deposit['recorded_ref_id'])
            ->where('customer_id', $customerId)->where('receipt_type', 'collection')->count());
        self::assertSame(1, DB::table('treasury_entries')->where('source_type', 'sales_receipt')->where('source_id', $deposit['recorded_ref_id'])->count());

        $withdrawalText = 'E2E-TEST Wallet transfer reference 5.00 EGP';
        $withdrawalKey = $this->captureKey('CaptureSender', '5.00', '2026-10-16T10:21:45Z', $withdrawalText);
        $withdrawalMessage = $this->withToken($token)->postJson('/api/v1/mobile/messages/capture', [
            'channel_id' => $channel['id'], 'amount' => '5.00', 'raw_text' => $withdrawalText,
            'sender' => 'CaptureSender', 'received_at' => '2026-10-16T10:21:45Z', 'dedupe_key' => $withdrawalKey,
        ], ['Idempotency-Key' => 'direction-review-capture-withdrawal'])->assertCreated()
            ->assertJsonPath('data.direction', 'NEEDS_REVIEW')->assertJsonPath('data.status', 'NEEDS_REVIEW');
        $withdrawalMessageId = (int) $withdrawalMessage->json('data.id');
        $this->withToken($token)->postJson('/api/v1/mobile/messages/'.$withdrawalMessageId.'/resolve-direction', [
            'direction' => 'WITHDRAWAL', 'amount' => '5.00',
        ], ['Idempotency-Key' => 'direction-review-resolve-withdrawal'])->assertOk()
            ->assertJsonPath('data.direction', 'WITHDRAWAL')->assertJsonPath('data.amount', '5.0000')
            ->assertJsonPath('data.status', 'NEW');
        $other = DB::table('mobile_categories')->where('name', 'مصاريف أخرى')->first();
        $drawerAccountId = (int) DB::table('mobile_categories')->where('name', 'الدرج')->value('target_treasury_account_id');
        $channelBefore = app(TreasuryService::class)->balance($channelAccountId)['balance_egp'];
        $drawerBefore = app(TreasuryService::class)->balance($drawerAccountId)['balance_egp'];
        $withdrawalBody = ['category_id' => $other->id, 'notes' => 'E2E-TEST confirmed wallet withdrawal'];
        $withdrawalKey = ['Idempotency-Key' => 'direction-review-record-withdrawal'];
        $withdrawalResponse = $this->withToken($token)->postJson('/api/v1/mobile/messages/'.$withdrawalMessageId.'/record-withdrawal', $withdrawalBody, $withdrawalKey)->assertCreated()
            ->assertJsonPath('data.recorded_as', 'TREASURY_TRANSFER');
        $withdrawal = $withdrawalResponse->json('data');
        $this->withToken($token)->postJson('/api/v1/mobile/messages/'.$withdrawalMessageId.'/record-withdrawal', $withdrawalBody, $withdrawalKey)
            ->assertCreated()->assertJsonPath('data.recorded_ref_id', $withdrawal['recorded_ref_id']);
        self::assertSame('RECORDED', DB::table('mobile_captured_messages')->where('id', $withdrawalMessageId)->value('status'));
        self::assertSame(1, DB::table('treasury_transfers')->where('id', $withdrawal['recorded_ref_id'])->count());
        self::assertSame(0, DB::table('expenses')->where('reference', 'mobile-captured:'.$withdrawalMessageId)->count());
        $channelAfter = app(TreasuryService::class)->balance($channelAccountId)['balance_egp'];
        $drawerAfter = app(TreasuryService::class)->balance($drawerAccountId)['balance_egp'];
        self::assertSame(-500, $this->balanceCents($channelAfter) - $this->balanceCents($channelBefore));
        self::assertSame(500, $this->balanceCents($drawerAfter) - $this->balanceCents($drawerBefore));
        $legs = DB::table('treasury_entries')->whereIn('source_type', ['treasury_transfer_out', 'treasury_transfer_in'])
            ->where('source_id', $withdrawal['recorded_ref_id'])->get();
        self::assertCount(2, $legs);
        $out = $legs->firstWhere('direction', 'out');
        $in = $legs->firstWhere('direction', 'in');
        self::assertNotNull($out);
        self::assertNotNull($in);
        self::assertSame('5.0000', (string) $out->amount);
        self::assertSame('5.0000', (string) $in->amount);
        self::assertSame($channelAccountId, (int) $out->treasury_account_id);
        self::assertSame($drawerAccountId, (int) $in->treasury_account_id);
    }

    #[Test]
    public function captured_withdrawal_posts_an_expense_and_treasury_outflow(): void
    {
        $userId = $this->createOwner();
        $token = $this->login($userId);
        $this->withToken($token)->postJson('/api/v1/mobile/auth/confirm-password', ['password' => 'Correct mobile password 123'])->assertOk();
        $channel = $this->withToken($token)->postJson('/api/v1/mobile/channels', [
            'name' => 'Withdrawal test channel', 'type' => 'wallet', 'number' => '01000000002', 'sender_filter' => 'CaptureSender',
            'deposit_keywords' => ['received'], 'withdrawal_keywords' => ['sent'],
        ], ['Idempotency-Key' => 'withdrawal-test-channel'])->assertCreated()->json('data');
        $customerId = $this->createCustomer();
        $depositId = $this->captureMessage($token, (int) $channel['id'], '5.00', 'Payment received EGP 5.00', 'withdrawal-funding');
        $this->resolveCapturedMessage($token, $depositId, 'DEPOSIT');
        $this->withToken($token)->postJson('/api/v1/mobile/messages/'.$depositId.'/record-deposit', [
            'customer_id' => $customerId,
        ], ['Idempotency-Key' => 'withdrawal-funding-record'])->assertCreated();
        $messageId = $this->captureMessage($token, (int) $channel['id'], '2.00', 'Payment sent EGP 2.00', 'withdrawal-posting');
        $this->resolveCapturedMessage($token, $messageId, 'WITHDRAWAL');
        $category = DB::table('mobile_categories')->where('category_kind', 'expense')->first();
        $record = $this->withToken($token)->postJson('/api/v1/mobile/messages/'.$messageId.'/record-withdrawal', [
            'category_id' => $category->id, 'notes' => 'Documented mobile withdrawal',
        ], ['Idempotency-Key' => 'withdrawal-test-record'])->assertCreated()->json('data');
        $expense = DB::table('expenses')->where('id', $record['recorded_ref_id'])->first();
        self::assertSame('posted', $expense->status);
        self::assertSame((string) $category->expense_category_id, (string) $expense->expense_category_id);
        self::assertSame(1, DB::table('treasury_entries')->where('source_type', 'expense')
            ->where('source_id', $expense->id)->where('direction', 'out')->count());
        self::assertSame('RECORDED', DB::table('mobile_captured_messages')->where('id', $messageId)->value('status'));
    }

    #[Test]
    public function other_withdrawal_category_transfers_exact_amount_to_drawer_without_creating_expense(): void
    {
        $userId = $this->createOwner();
        $token = $this->login($userId);
        $this->withToken($token)->postJson('/api/v1/mobile/auth/confirm-password', ['password' => 'Correct mobile password 123'])->assertOk();
        $channel = $this->withToken($token)->postJson('/api/v1/mobile/channels', [
            'name' => 'Other withdrawal test channel', 'type' => 'wallet', 'number' => '01000000004', 'sender_filter' => 'CaptureSender',
            'deposit_keywords' => ['received'], 'withdrawal_keywords' => ['sent'],
        ], ['Idempotency-Key' => 'other-withdrawal-test-channel'])->assertCreated()->json('data');
        $channelAccountId = (int) DB::table('mobile_payment_channels')->where('id', $channel['id'])->value('treasury_account_id');
        $drawerCategory = DB::table('mobile_categories')->where('name', 'الدرج')->where('category_kind', 'transfer')->first();
        self::assertNotNull($drawerCategory);
        $drawerAccountId = (int) $drawerCategory->target_treasury_account_id;

        $category = DB::table('mobile_categories')->where('name', 'مصاريف أخرى')->first();
        self::assertNotNull($category);
        $listedCategories = $this->withToken($token)->getJson('/api/v1/mobile/withdrawal-categories')->assertOk()->json('data');
        $listedOther = collect($listedCategories)->firstWhere('id', (int) $category->id);
        self::assertSame('transfer', $listedOther['category_kind']);
        self::assertNull($listedOther['expense_category_id']);
        self::assertSame($drawerAccountId, (int) $listedOther['target_treasury_account_id']);
        $adminCategories = $this->withToken($token)->getJson('/api/v1/mobile/categories')->assertOk()->json('data');
        $adminOther = collect($adminCategories)->firstWhere('id', (int) $category->id);
        self::assertSame('transfer', $adminOther['category_kind']);
        self::assertSame($drawerAccountId, (int) $adminOther['target_treasury_account_id']);
        $expenseCategories = $this->withToken($token)->getJson('/api/v1/mobile/categories?category_kind=expense')->assertOk()->json('data');
        self::assertNull(collect($expenseCategories)->firstWhere('id', (int) $category->id));
        $transferCategories = $this->withToken($token)->getJson('/api/v1/mobile/categories?category_kind=transfer')->assertOk()->json('data');
        self::assertNotNull(collect($transferCategories)->firstWhere('id', (int) $category->id));

        $customerId = $this->createCustomer();
        $fundingId = $this->captureMessage($token, (int) $channel['id'], '10.00', 'E2E-TEST Payment received EGP 10.00', 'other-withdrawal-funding');
        $this->resolveCapturedMessage($token, $fundingId, 'DEPOSIT');
        $this->withToken($token)->postJson('/api/v1/mobile/messages/'.$fundingId.'/record-deposit', [
            'customer_id' => $customerId,
        ], ['Idempotency-Key' => 'other-withdrawal-funding-record'])->assertCreated();

        $channelBefore = app(TreasuryService::class)->balance($channelAccountId)['balance_egp'];
        $drawerBefore = app(TreasuryService::class)->balance($drawerAccountId)['balance_egp'];
        $expensesBefore = DB::table('expenses')->count();
        $messageId = $this->captureMessage($token, (int) $channel['id'], '6.50', 'E2E-TEST Payment sent EGP 6.50', 'other-withdrawal-650');
        $this->resolveCapturedMessage($token, $messageId, 'WITHDRAWAL');
        $record = $this->withToken($token)->postJson('/api/v1/mobile/messages/'.$messageId.'/record-withdrawal', [
            'category_id' => $category->id,
            'notes' => 'E2E-TEST withdrawal to drawer',
        ], ['Idempotency-Key' => 'other-withdrawal-record-650'])->assertCreated()
            ->assertJsonPath('data.recorded_as', 'TREASURY_TRANSFER')->json('data');

        $channelAfter = app(TreasuryService::class)->balance($channelAccountId)['balance_egp'];
        $drawerAfter = app(TreasuryService::class)->balance($drawerAccountId)['balance_egp'];
        self::assertSame(-650, $this->balanceCents($channelAfter) - $this->balanceCents($channelBefore));
        self::assertSame(650, $this->balanceCents($drawerAfter) - $this->balanceCents($drawerBefore));
        self::assertSame($expensesBefore, DB::table('expenses')->count());
        self::assertSame(0, DB::table('expenses')->where('reference', 'mobile-captured:'.$messageId)->count());

        $legs = DB::table('treasury_entries')->where('source_id', $record['recorded_ref_id'])
            ->whereIn('source_type', ['treasury_transfer_out', 'treasury_transfer_in'])->get();
        self::assertCount(2, $legs);
        self::assertSame(1, $legs->where('treasury_account_id', $channelAccountId)->where('direction', 'out')->count());
        self::assertSame(1, $legs->where('treasury_account_id', $drawerAccountId)->where('direction', 'in')->count());
        self::assertSame(['6.5000', '6.5000'], $legs->pluck('amount')->sort()->values()->all());
    }

    #[Test]
    public function drawer_category_transfers_a_withdrawal_from_channel_to_drawer(): void
    {
        $userId = $this->createOwner();
        $token = $this->login($userId);
        $this->withToken($token)->postJson('/api/v1/mobile/auth/confirm-password', ['password' => 'Correct mobile password 123'])->assertOk();
        $channel = $this->withToken($token)->postJson('/api/v1/mobile/channels', [
            'name' => 'Drawer test channel', 'type' => 'wallet', 'number' => '01000000003', 'sender_filter' => 'CaptureSender',
            'deposit_keywords' => ['received'], 'withdrawal_keywords' => ['sent'],
        ], ['Idempotency-Key' => 'drawer-test-channel'])->assertCreated()->json('data');
        $customerId = $this->createCustomer();
        $fundingId = $this->captureMessage($token, (int) $channel['id'], '5.00', 'Payment received EGP 5.00', 'drawer-funding');
        $this->resolveCapturedMessage($token, $fundingId, 'DEPOSIT');
        $this->withToken($token)->postJson('/api/v1/mobile/messages/'.$fundingId.'/record-deposit', [
            'customer_id' => $customerId,
        ], ['Idempotency-Key' => 'drawer-funding-record'])->assertCreated();
        $messageId = $this->captureMessage($token, (int) $channel['id'], '1.25', 'Payment sent EGP 1.25', 'drawer-transfer');
        $this->resolveCapturedMessage($token, $messageId, 'WITHDRAWAL');
        $category = DB::table('mobile_categories')->where('category_kind', 'transfer')->first();
        $channelAccountId = (int) DB::table('mobile_payment_channels')->where('id', $channel['id'])->value('treasury_account_id');
        $drawerAccountId = (int) $category->target_treasury_account_id;
        $channelBefore = app(TreasuryService::class)->balance($channelAccountId)['balance_egp'];
        $drawerBefore = app(TreasuryService::class)->balance($drawerAccountId)['balance_egp'];
        $record = $this->withToken($token)->postJson('/api/v1/mobile/messages/'.$messageId.'/record-withdrawal', [
            'category_id' => $category->id,
        ], ['Idempotency-Key' => 'drawer-transfer-record'])->assertCreated()->json('data');
        $legs = DB::table('treasury_entries')->where('source_id', $record['recorded_ref_id'])
            ->whereIn('source_type', ['treasury_transfer_out', 'treasury_transfer_in'])->get();
        self::assertCount(2, $legs);
        self::assertSame(1, $legs->where('treasury_account_id', $channelAccountId)->where('direction', 'out')->count());
        self::assertSame(1, $legs->where('treasury_account_id', $category->target_treasury_account_id)->where('direction', 'in')->count());
        self::assertSame('EXPENSE', $record['recorded_as']);
        $channelAfter = app(TreasuryService::class)->balance($channelAccountId)['balance_egp'];
        $drawerAfter = app(TreasuryService::class)->balance($drawerAccountId)['balance_egp'];
        self::assertSame(-125, $this->balanceCents($channelAfter) - $this->balanceCents($channelBefore));
        self::assertSame(125, $this->balanceCents($drawerAfter) - $this->balanceCents($drawerBefore));
    }

    #[Test]
    public function capture_write_permissions_validation_and_category_filters_are_enforced_over_http(): void
    {
        $ownerId = $this->createOwner();
        $token = $this->login($ownerId);
        $this->withToken($token)->postJson('/api/v1/mobile/auth/confirm-password', [
            'password' => 'Correct mobile password 123',
        ])->assertOk();
        $valid = [
            'name' => 'Permission channel', 'type' => 'wallet', 'number' => '01000000009',
            'sender_filter' => 'CaptureSender', 'deposit_keywords' => ['received'],
        ];
        foreach ([
            ['name', array_diff_key($valid, ['name' => true])],
            ['type', [...$valid, 'type' => 'invalid']],
            ['sender_filter', array_diff_key($valid, ['sender_filter' => true])],
            ['deposit_keywords', [...$valid, 'deposit_keywords' => 'received']],
        ] as [$field, $payload]) {
            $response = $this->withToken($token)->postJson('/api/v1/mobile/channels', $payload, [
                'Idempotency-Key' => 'invalid-'.$field,
            ])->assertUnprocessable();
            self::assertArrayHasKey($field, $response->json('error.details'));
        }

        $channel = $this->withToken($token)->postJson('/api/v1/mobile/channels', $valid, [
            'Idempotency-Key' => 'permission-channel',
        ])->assertCreated()->json('data');
        $this->withToken($token)->postJson('/api/v1/mobile/channels', $valid, [
            'Idempotency-Key' => 'permission-channel',
        ])->assertCreated()->assertJsonPath('data.id', $channel['id']);
        self::assertSame(1, DB::table('mobile_payment_channels')->where('name', $valid['name'])->count());
        $categoryName = 'Unique audit category';
        $this->withToken($token)->postJson('/api/v1/mobile/withdrawal-categories', [
            'name' => $categoryName,
        ], ['Idempotency-Key' => 'category-audit-first'])->assertCreated();
        $duplicate = $this->withToken($token)->postJson('/api/v1/mobile/withdrawal-categories', [
            'name' => $categoryName,
        ], ['Idempotency-Key' => 'category-audit-second'])->assertUnprocessable();
        self::assertArrayHasKey('name', $duplicate->json('error.details'));
        DB::table('mobile_categories')->where('name', $categoryName)->update(['is_active' => false]);
        $categories = $this->withToken($token)->getJson('/api/v1/mobile/withdrawal-categories')->assertOk()->json('data');
        self::assertNotContains($categoryName, array_column($categories, 'name'));

        $ownerRoleId = DB::table('roles')->where('code', 'owner')->value('id');
        $managePermissionId = DB::table('permissions')->where('code', 'mobile.channels.manage')->value('id');
        DB::table('role_permissions')->where('role_id', $ownerRoleId)->where('permission_id', $managePermissionId)->delete();
        $this->withToken($token)->postJson('/api/v1/mobile/channels', $valid, [
            'Idempotency-Key' => 'permission-channel-denied',
        ])->assertForbidden();
        self::assertSame(1, DB::table('mobile_payment_channels')->where('id', $channel['id'])->count());
    }

    #[Test]
    public function read_only_role_is_forbidden_on_every_capture_write_endpoint(): void
    {
        $ownerId = $this->createOwner();
        $ownerToken = $this->login($ownerId);
        $this->withToken($ownerToken)->postJson('/api/v1/mobile/auth/confirm-password', [
            'password' => 'Correct mobile password 123',
        ])->assertOk();
        $channel = $this->withToken($ownerToken)->postJson('/api/v1/mobile/channels', [
            'name' => 'Read-only target', 'type' => 'wallet', 'number' => '01000000008',
            'sender_filter' => 'CaptureSender', 'deposit_keywords' => ['received'],
            'withdrawal_keywords' => ['sent'],
        ], ['Idempotency-Key' => 'read-only-target'])->assertCreated()->json('data');
        $messageId = $this->captureMessage($ownerToken, (int) $channel['id'], '1.00', 'Payment received EGP 1.00', 'read-only');

        $readerRoleId = DB::table('roles')->where('code', 'read_only')->value('id');
        DB::table('role_permissions')->insertOrIgnore([
            'role_id' => $readerRoleId,
            'permission_id' => DB::table('permissions')->where('code', 'mobile.use')->value('id'),
            'granted_at' => now(),
        ]);
        $readerId = $this->createOwner();
        DB::table('user_roles')->where('user_id', $readerId)->update(['role_id' => $readerRoleId]);
        $readerToken = $this->login($readerId);
        foreach ([
            ['POST', '/api/v1/mobile/channels', ['name' => 'No']],
            ['PATCH', '/api/v1/mobile/channels/'.$channel['id'], ['paused' => true]],
            ['POST', '/api/v1/mobile/messages/capture', []],
            ['POST', '/api/v1/mobile/messages/'.$messageId.'/record-deposit', []],
            ['POST', '/api/v1/mobile/messages/'.$messageId.'/record-withdrawal', []],
            ['POST', '/api/v1/mobile/manual-deposits', []],
            ['POST', '/api/v1/mobile/withdrawal-categories', ['name' => 'No']],
        ] as [$method, $path, $payload]) {
            $this->withToken($readerToken)->json($method, $path, $payload, [
                'Idempotency-Key' => 'read-only-check',
            ])->assertForbidden();
        }
        self::assertSame('NEEDS_REVIEW', DB::table('mobile_captured_messages')->where('id', $messageId)->value('status'));
    }

    #[Test]
    public function delete_channel_is_rejected_and_capture_channel_row_remains(): void
    {
        $ownerId = $this->createOwner();
        $token = $this->login($ownerId);
        $this->withToken($token)->postJson('/api/v1/mobile/auth/confirm-password', [
            'password' => 'Correct mobile password 123',
        ])->assertOk();
        $channel = $this->withToken($token)->postJson('/api/v1/mobile/channels', [
            'name' => 'Nondeletable capture channel', 'type' => 'wallet', 'number' => '01000000007',
            'sender_filter' => 'CaptureSender', 'deposit_keywords' => ['received'],
        ], ['Idempotency-Key' => 'nondeletable-channel'])->assertCreated()->json('data');
        $countBeforeDelete = DB::table('mobile_payment_channels')->count();

        $this->withToken($token)->deleteJson('/api/v1/mobile/channels/'.$channel['id'])
            ->assertStatus(405)->assertJsonPath('error.code', 'METHOD_NOT_ALLOWED');
        self::assertSame($countBeforeDelete, DB::table('mobile_payment_channels')->count());
        self::assertSame(1, DB::table('mobile_payment_channels')->where('id', $channel['id'])->count());
        self::assertSame(0, DB::table('mobile_payment_channels')->where('id', $channel['id'])->where('paused', true)->count());
    }

    #[Test]
    public function capture_accepts_an_authorized_mobile_token_for_inbox_ingest_without_cookie_csrf(): void
    {
        $ownerId = $this->createOwner();
        $token = $this->login($ownerId);
        $this->withToken($token)->postJson('/api/v1/mobile/auth/confirm-password', [
            'password' => 'Correct mobile password 123',
        ])->assertOk();
        $channel = $this->withToken($token)->postJson('/api/v1/mobile/channels', [
            'name' => 'Capture guard probe', 'type' => 'wallet', 'number' => '01000000006',
            'sender_filter' => 'CaptureSender', 'deposit_keywords' => ['received'],
        ], ['Idempotency-Key' => 'capture-guard-probe-channel'])->assertCreated()->json('data');
        DB::table('mobile_devices')->where('token_hash', hash('sha256', $token))
            ->update(['password_confirmed_at' => null]);

        $messageId = $this->captureMessageResponse($token, (int) $channel['id'], '1.00',
            'Payment received EGP 1.00', 'without-csrf-or-step-up')
            ->assertCreated()->assertJsonPath('data.direction', 'NEEDS_REVIEW')
            ->assertJsonPath('data.status', 'NEEDS_REVIEW')->json('data.id');
        self::assertSame(1, DB::table('mobile_captured_messages')->where('id', $messageId)->count());
    }

    #[Test]
    public function capture_rejects_missing_and_invalid_bearer_tokens(): void
    {
        $this->postJson('/api/v1/mobile/messages/capture', [])
            ->assertUnauthorized()->assertJsonPath('error.code', 'UNAUTHENTICATED');
        $this->withToken(str_repeat('a', 64))->postJson('/api/v1/mobile/messages/capture', [])
            ->assertUnauthorized()->assertJsonPath('error.code', 'UNAUTHENTICATED');
        self::assertSame(0, DB::table('mobile_captured_messages')->count());
    }

    #[Test]
    public function capture_rejects_valid_token_without_capture_permission(): void
    {
        $ownerId = $this->createOwner();
        $token = $this->login($ownerId);
        $ownerRoleId = DB::table('roles')->where('code', 'owner')->value('id');
        $capturePermissionId = DB::table('permissions')->where('code', 'mobile.messages.capture')->value('id');
        DB::table('role_permissions')->where('role_id', $ownerRoleId)
            ->where('permission_id', $capturePermissionId)->delete();

        $this->withToken($token)->getJson('/api/v1/mobile/auth/me')->assertOk();
        $this->withToken($token)->postJson('/api/v1/mobile/messages/capture', [])
            ->assertForbidden();
        self::assertSame(0, DB::table('mobile_captured_messages')->count());
    }

    #[Test]
    public function capture_rejects_revoked_device_token(): void
    {
        $ownerId = $this->createOwner();
        $token = $this->login($ownerId);
        DB::table('mobile_devices')->where('token_hash', hash('sha256', $token))
            ->update(['revoked_at' => now()]);

        $this->withToken($token)->postJson('/api/v1/mobile/messages/capture', [])
            ->assertUnauthorized()->assertJsonPath('error.code', 'UNAUTHENTICATED');
        self::assertSame(0, DB::table('mobile_captured_messages')->count());
    }

    private function captureMessage(string $token, int $channelId, string $amount, string $text, string $suffix): int
    {
        return (int) $this->captureMessageResponse($token, $channelId, $amount, $text, $suffix)
            ->assertCreated()->json('data.id');
    }

    private function resolveCapturedMessage(string $token, int $messageId, string $direction): void
    {
        $this->withToken($token)->postJson('/api/v1/mobile/messages/'.$messageId.'/resolve-direction', [
            'direction' => $direction,
        ], ['Idempotency-Key' => 'resolve-'.bin2hex(random_bytes(8))])
            ->assertOk()
            ->assertJsonPath('data.direction', $direction)
            ->assertJsonPath('data.status', 'NEW');
    }

    private function captureKey(string $sender, string $amount, string $receivedAt, string $text): string
    {
        return hash('sha256', implode('|', [
            $sender,
            $amount,
            \Carbon\Carbon::parse($receivedAt)->utc()->startOfMinute()->format('Y-m-d H:i'),
            hash('sha256', $text),
        ]));
    }

    private function captureMessageResponse(string $token, int $channelId, string $amount, string $text, string $suffix): \Illuminate\Testing\TestResponse
    {
        $sender = 'CaptureSender';
        $receivedAt = '2026-10-13T10:20:45Z';
        $textHash = hash('sha256', $text);
        $dedupeKey = hash('sha256', implode('|', [$sender, $amount, '2026-10-13 10:20', $textHash]));
        return $this->withToken($token)->postJson('/api/v1/mobile/messages/capture', [
            'channel_id' => $channelId, 'amount' => $amount, 'raw_text' => $text, 'sender' => $sender,
            'received_at' => $receivedAt, 'dedupe_key' => $dedupeKey,
        ], ['Idempotency-Key' => 'capture-'.$suffix]);
    }

    private function createChannel(string $token, string $type, string $name, ?string $opening = null): int
    {
        $this->withToken($token)->postJson('/api/v1/mobile/auth/confirm-password', [
            'password' => 'Correct mobile password 123',
        ])->assertOk();
        $payload = [
            'name' => $name,
            'channel_type' => $type,
        ];
        if ($opening !== null) {
            $payload['opening_balance_egp'] = $opening;
            $payload['opening_date'] = '2026-10-12';
        }

        return (int) $this->withToken($token)->postJson('/api/v1/mobile/channels', $payload, [
            'Idempotency-Key' => 'finance-channel-'.bin2hex(random_bytes(5)),
        ])->assertCreated()->json('data.id');
    }

    private function createSource(string $token, int $channelId): int
    {
        return (int) $this->withToken($token)->postJson('/api/v1/mobile/sources', [
            'channel_id' => $channelId,
            'source_kind' => 'sms',
            'sender_identifier' => 'FinanceSender',
            'read_deposits' => true,
            'read_withdrawals' => true,
            'deposit_keywords' => ['Deposit received'],
            'withdrawal_keywords' => ['Payment sent'],
        ], ['Idempotency-Key' => 'finance-source-'.bin2hex(random_bytes(5))])
            ->assertCreated()
            ->json('data.id');
    }

    private function ingest(string $token, int $sourceId, string $type, string $amount, string $text): int
    {
        return (int) $this->withToken($token)->postJson('/api/v1/mobile/messages/batch', [
            'messages' => [[
                'source_id' => $sourceId,
                'type' => $type,
                'amount' => $amount,
                'sender' => 'FinanceSender',
                'received_at' => '2026-10-12T10:00:00Z',
                'raw_text' => $text,
            ]],
        ], ['Idempotency-Key' => 'finance-message-'.bin2hex(random_bytes(5))])
            ->assertCreated()
            ->json('data.results.0.message_id');
    }

    private function createCustomer(): int
    {
        return (int) DB::table('customers')->insertGetId([
            'name' => 'Mobile finance customer',
            'is_active' => true,
            'credit_limit' => null,
        ]);
    }

    private function login(int $userId): string
    {
        $response = $this->postJson('/api/v1/mobile/auth/login', [
            'username' => DB::table('users')->where('id', $userId)->value('username'),
            'password' => 'Correct mobile password 123',
            'device_name' => 'Finance test phone',
            'device_model' => 'Test model',
        ])->assertCreated();

        return $response->json('data.access_token');
    }

    private function createOwner(): int
    {
        $suffix = bin2hex(random_bytes(4));
        $userId = (int) DB::table('users')->insertGetId([
            'username' => 'mobile-finance-owner-'.$suffix,
            'display_name' => 'Mobile Finance Owner',
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

    private function balanceCents(string $amount): int
    {
        $negative = str_starts_with($amount, '-');
        $normalized = ltrim($amount, '-');
        [$whole, $fraction] = array_pad(explode('.', $normalized, 2), 2, '0');
        $cents = ((int) $whole * 100) + (int) str_pad(substr($fraction, 0, 2), 2, '0');

        return $negative ? -$cents : $cents;
    }
}
