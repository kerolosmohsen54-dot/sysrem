<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Test;
use Tests\Concerns\AuthenticatesApi;
use Tests\TestCase;

final class FinancialAccountMappingsTest extends TestCase
{
    use AuthenticatesApi;

    private array $owner;

    protected function setUp(): void
    {
        parent::setUp();
        DB::beginTransaction();
        $this->owner = $this->actingAsApiUser('owner', true);
    }

    protected function tearDown(): void
    {
        if (DB::connection()->transactionLevel() > 0) DB::rollBack();
        parent::tearDown();
    }

    private function request(array $actor, string $method, string $uri, array $body = [], bool $csrf = true)
    {
        $headers = $csrf ? ['X-CSRF-Token' => $actor['csrf']] : [];
        return $this->withCredentials()
            ->withUnencryptedCookie($this->apiCookieName(), $actor['token'])
            ->json($method, $uri, $body, $headers);
    }

    #[Test]
    public function owner_can_read_and_change_a_unique_compatible_leaf_mapping_with_audit(): void
    {
        $list = $this->request($this->owner, 'GET', '/api/v1/accounting/auto-posting-mappings')->assertOk();
        self::assertGreaterThanOrEqual(20, count($list->json('data')));
        self::assertNotEmpty($list->json('accounts'));

        $accountId = (int) DB::table('chart_of_accounts')->insertGetId([
            'parent_account_id' => null,
            'code' => 'TEST-CASH-'.strtoupper(bin2hex(random_bytes(4))),
            'name' => 'Test mapped cash account',
            'description' => 'Feature-test mapping candidate',
            'account_type' => 'asset',
            'normal_balance' => 'debit',
            'is_control_account' => false,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $auditCountBefore = DB::table('audit_logs')
            ->where('action', 'financial_account_mapping.updated')
            ->where('reason', 'cash')
            ->count();

        $this->request($this->owner, 'PUT', '/api/v1/accounting/auto-posting-mappings/cash', ['account_id' => $accountId])
            ->assertOk()
            ->assertJsonPath('data.account_id', $accountId);
        self::assertSame($accountId, (int) DB::table('financial_account_mappings')->where('mapping_key', 'cash')->value('account_id'));
        self::assertSame($auditCountBefore + 1, DB::table('audit_logs')->where('action', 'financial_account_mapping.updated')->where('reason', 'cash')->count());

        $inventoryAccountId = (int) DB::table('financial_account_mappings')->where('mapping_key', 'inventory')->value('account_id');
        $this->request($this->owner, 'PUT', '/api/v1/accounting/auto-posting-mappings/cash', ['account_id' => $inventoryAccountId])
            ->assertStatus(422)
            ->assertJsonStructure(['error' => ['details' => ['account_id']]]);
        self::assertSame($accountId, (int) DB::table('financial_account_mappings')->where('mapping_key', 'cash')->value('account_id'));

        $revenueAccountId = (int) DB::table('financial_account_mappings')->where('mapping_key', 'sales_revenue')->value('account_id');
        $this->request($this->owner, 'PUT', '/api/v1/accounting/auto-posting-mappings/cash', ['account_id' => $revenueAccountId])
            ->assertStatus(422);
    }

    #[Test]
    public function restricted_users_cannot_change_mappings_and_mutations_require_step_up(): void
    {
        $reader = $this->actingAsApiUser('accountant', true);
        $this->request($reader, 'GET', '/api/v1/accounting/auto-posting-mappings')->assertOk();
        $cashId = (int) DB::table('financial_account_mappings')->where('mapping_key', 'cash')->value('account_id');
        $this->request($reader, 'PUT', '/api/v1/accounting/auto-posting-mappings/cash', ['account_id' => $cashId])
            ->assertForbidden();

        $withoutStepUp = $this->actingAsApiUser('owner', false);
        $this->request($withoutStepUp, 'PUT', '/api/v1/accounting/auto-posting-mappings/cash', ['account_id' => $cashId])
            ->assertStatus(428);
    }
}
