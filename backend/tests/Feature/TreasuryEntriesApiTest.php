<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Test;
use RuntimeException;
use Tests\Concerns\AuthenticatesApi;
use Tests\TestCase;

final class TreasuryEntriesApiTest extends TestCase
{
    use AuthenticatesApi;

    private string $connection;
    private bool $transactionStarted = false;

    protected function setUp(): void
    {
        parent::setUp();
        $connection = getenv('AUTH_TEST_CONNECTION');
        if (! is_string($connection) || ! in_array($connection, ['mysql_test', 'mariadb_test'], true)) {
            $this->markTestSkipped('Set AUTH_TEST_CONNECTION to mysql_test or mariadb_test.');
        }
        $this->connection = $connection;
        config(['database.default' => $connection]);
        DB::setDefaultConnection($connection);
        DB::purge($connection);
        if ((DB::selectOne('SELECT DATABASE() AS database_name')->database_name ?? null) !== 'erp_acceptance_tests') {
            throw new RuntimeException('Treasury API tests require erp_acceptance_tests.');
        }
        DB::beginTransaction();
        $this->transactionStarted = true;
    }

    protected function tearDown(): void
    {
        if ($this->transactionStarted) {
            DB::rollBack();
            DB::purge($this->connection);
        }
        parent::tearDown();
    }

    private function requestAs(array $actor, string $method, string $url, array $body = [], bool $csrf = true, array $headers = [])
    {
        return $this->withCredentials()->withUnencryptedCookie($this->apiCookieName(), $actor['token'])
            ->json($method, $url, $body, array_merge($csrf ? [$this->apiCsrfHeader() => $actor['csrf']] : [], $headers));
    }

    private function account(): int
    {
        return (int) DB::table('treasury_accounts')->insertGetId([
            'code' => 'TREASURY-API-'.bin2hex(random_bytes(6)),
            'name' => 'Treasury API fixture',
            'account_type' => 'cash',
            'is_active' => true,
            'notes' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function entryPayload(int $accountId, string $direction, string $amount = '12.3500'): array
    {
        return [
            'treasury_account_id' => $accountId,
            'direction' => $direction,
            'entry_date' => '2026-10-13',
            'amount_egp' => $amount,
            'description' => 'Treasury API verification',
        ];
    }

    #[Test]
    public function inbox_and_movements_are_real_paginated_http_lists_with_direction_filters(): void
    {
        $accountId = $this->account();
        $owner = $this->actingAsApiUser('owner', true);
        $in = $this->requestAs($owner, 'POST', '/api/v1/treasury/entries', $this->entryPayload($accountId, 'in'))->assertCreated();
        self::assertSame('12.35', $in->json('data.balance_egp'));
        $out = $this->entryPayload($accountId, 'out', '2.3500');
        $this->requestAs($owner, 'POST', '/api/v1/treasury/entries', $out)->assertCreated();

        $this->requestAs($owner, 'GET', '/api/v1/treasury/entries?direction=in&treasury_account_id='.$accountId)
            ->assertOk()->assertJsonPath('data.0.direction', 'in')->assertJsonPath('data.0.amount', '12.3500');
        $this->requestAs($owner, 'GET', '/api/v1/treasury/entries?direction=out&treasury_account_id='.$accountId)
            ->assertOk()->assertJsonPath('data.0.direction', 'out')->assertJsonPath('data.0.amount', '2.3500');
        $this->requestAs($owner, 'GET', '/api/v1/treasury/entries?per_page=1&treasury_account_id='.$accountId)
            ->assertOk()->assertJsonPath('meta.per_page', 1)->assertJsonPath('meta.total', 2);
    }

    #[Test]
    public function treasury_entry_writes_enforce_permission_csrf_step_up_and_decimal_validation(): void
    {
        $accountId = $this->account();
        $payload = $this->entryPayload($accountId, 'in');
        $reader = $this->actingAsApiUser('read_only', true);
        $this->requestAs($reader, 'GET', '/api/v1/treasury/entries')->assertForbidden();
        $this->requestAs($reader, 'POST', '/api/v1/treasury/entries', $payload)->assertForbidden();
        $owner = $this->actingAsApiUser('owner', true);
        $this->requestAs($owner, 'POST', '/api/v1/treasury/entries', $payload, false)->assertStatus(419);
        $stepUpMissing = $this->actingAsApiUser('owner', false);
        $this->requestAs($stepUpMissing, 'POST', '/api/v1/treasury/entries', $payload)->assertStatus(428);
        $payload['amount_egp'] = '12.34567';
        $this->requestAs($owner, 'POST', '/api/v1/treasury/entries', $payload)
            ->assertStatus(422)->assertJsonStructure(['error' => ['details' => ['amount_egp']]]);
    }

    #[Test]
    public function treasury_entries_and_transfers_replay_exact_idempotent_requests_without_duplicate_ledger_rows(): void
    {
        $sourceAccountId = $this->account();
        $destinationAccountId = $this->account();
        $owner = $this->actingAsApiUser('owner', true);

        $entryKey = ['Idempotency-Key' => 'treasury-entry-replay-'.bin2hex(random_bytes(6))];
        $entryPayload = $this->entryPayload($sourceAccountId, 'in', '100.00');
        $entry = $this->requestAs($owner, 'POST', '/api/v1/treasury/entries', $entryPayload, true, $entryKey)->assertCreated();
        $entryRetry = $this->requestAs($owner, 'POST', '/api/v1/treasury/entries', $entryPayload, true, $entryKey)->assertCreated();
        self::assertSame($entry->json('data.entry_id'), $entryRetry->json('data.entry_id'));
        self::assertSame(1, DB::table('treasury_entries')->where('treasury_account_id', $sourceAccountId)->count());

        $transferPayload = [
            'transfer_date' => '2026-10-13',
            'from_treasury_account_id' => $sourceAccountId,
            'to_treasury_account_id' => $destinationAccountId,
            'amount_egp' => '25.00',
            'notes' => 'Idempotency check',
        ];
        $transferKey = ['Idempotency-Key' => 'treasury-transfer-replay-'.bin2hex(random_bytes(6))];
        $transfer = $this->requestAs($owner, 'POST', '/api/v1/treasury/transfers', $transferPayload, true, $transferKey)->assertCreated();
        $transferRetry = $this->requestAs($owner, 'POST', '/api/v1/treasury/transfers', $transferPayload, true, $transferKey)->assertCreated();
        self::assertSame($transfer->json('data.id'), $transferRetry->json('data.id'));
        self::assertSame(1, DB::table('treasury_transfers')->count());
        self::assertSame(2, DB::table('treasury_transfer_entries')->count());

        $transferPayload['notes'] = 'Changed request';
        $this->requestAs($owner, 'POST', '/api/v1/treasury/transfers', $transferPayload, true, $transferKey)->assertStatus(409);
        self::assertSame(1, DB::table('treasury_transfers')->count());
        self::assertSame('75.00', app(\App\Services\TreasuryService::class)->balance($sourceAccountId)['balance_egp']);
        self::assertSame('25.00', app(\App\Services\TreasuryService::class)->balance($destinationAccountId)['balance_egp']);
    }
}
