<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Test;
use Tests\Concerns\AuthenticatesApi;
use Tests\TestCase;

final class AccountingApiTest extends TestCase
{
    use AuthenticatesApi;

    private array $owner;
    private int $cash;
    private int $equity;
    private int $revenue;
    private int $expense;
    private int $treasury;

    protected function setUp(): void
    {
        parent::setUp();
        DB::beginTransaction();
        $this->owner = $this->actingAsApiUser('owner', true);
        $suffix = strtoupper(bin2hex(random_bytes(4)));
        $this->cash = $this->account("T{$suffix}A", 'asset', 'debit');
        $this->equity = $this->account("T{$suffix}E", 'equity', 'credit');
        $this->revenue = $this->account("T{$suffix}R", 'revenue', 'credit');
        $this->expense = $this->account("T{$suffix}X", 'expense', 'debit');
        $this->treasury = (int) DB::table('treasury_accounts')->insertGetId([
            'code' => "T{$suffix}", 'name' => 'Accounting API fixture', 'account_type' => 'cash',
            'is_active' => true, 'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    protected function tearDown(): void
    {
        if (DB::connection()->transactionLevel() > 0) DB::rollBack();
        parent::tearDown();
    }

    #[Test]
    public function chart_is_a_tree_and_posted_accounts_cannot_be_changed(): void
    {
        $parent = $this->account("TREE".bin2hex(random_bytes(3)), 'asset', 'debit');
        $child = $this->account("LEAF".bin2hex(random_bytes(3)), 'asset', 'debit', $parent);
        $this->req($this->owner, 'PUT', "/api/v1/accounting/accounts/{$parent}", [
            'code' => DB::table('chart_of_accounts')->where('id', $parent)->value('code'),
            'name' => 'Invalid cycle', 'account_type' => 'asset', 'normal_balance' => 'debit', 'parent_account_id' => $child,
        ])->assertStatus(422);

        $posted = $this->createJournal('2026-02-01', [
            $this->line($this->cash, '10.00', '0', $this->treasury),
            $this->line($this->equity, '0', '10.00'),
        ]);
        $this->req($this->owner, 'POST', "/api/v1/accounting/journals/{$posted}/post")->assertOk();
        $this->req($this->owner, 'PUT', "/api/v1/accounting/accounts/{$this->cash}", [
            'code' => DB::table('chart_of_accounts')->where('id', $this->cash)->value('code'),
            'name' => 'Changed posted account', 'account_type' => 'asset', 'normal_balance' => 'debit',
        ])->assertStatus(422);
    }

    #[Test]
    public function journal_requires_balance_and_posting_is_idempotent(): void
    {
        $bad = $this->req($this->owner, 'POST', '/api/v1/accounting/journals', [
            'entry_date' => '2026-02-03', 'description' => 'Unbalanced fixture',
            'lines' => [$this->line($this->cash, '12.00', '0'), $this->line($this->equity, '0', '10.00')],
        ])->assertStatus(422)->json();
        self::assertStringContainsString('2.0000', json_encode($bad, JSON_THROW_ON_ERROR));
        self::assertSame(0, DB::table('journal_entries')->where('description', 'Unbalanced fixture')->count());

        $entryId = $this->createJournal('2026-02-03', [
            $this->line($this->cash, '20.00', '0', $this->treasury), $this->line($this->equity, '0', '20.00'),
        ]);
        $this->req($this->owner, 'POST', "/api/v1/accounting/journals/{$entryId}/post")->assertOk()->assertJsonPath('data.status', 'posted');
        $lineIds = DB::table('journal_lines')->where('journal_entry_id', $entryId)->pluck('id');
        $firstTreasuryCount = DB::table('treasury_entries')->where('source_type', 'accounting_journal_line')->whereIn('source_id', $lineIds)->count();
        $this->req($this->owner, 'POST', "/api/v1/accounting/journals/{$entryId}/post")->assertOk()->assertJsonPath('data.id', $entryId);
        self::assertSame(1, $firstTreasuryCount);
        self::assertSame($firstTreasuryCount, DB::table('treasury_entries')->where('source_type', 'accounting_journal_line')->whereIn('source_id', $lineIds)->count());
        $accountant = $this->actingAsApiUser('accountant', true);
        $this->req($accountant, 'POST', "/api/v1/accounting/journals/{$entryId}/post")->assertForbidden();
        $this->req($this->owner, 'PUT', "/api/v1/accounting/journals/{$entryId}", [
            'entry_date' => '2026-02-03', 'description' => 'Changed posted',
            'lines' => [$this->line($this->cash, '20.00', '0'), $this->line($this->equity, '0', '20.00')],
        ])->assertStatus(422);
    }

    #[Test]
    public function ledger_trial_balance_statements_and_reversal_use_the_same_posted_period(): void
    {
        $opening = $this->createJournal('2026-01-01', [
            $this->line($this->cash, '100.00', '0', $this->treasury), $this->line($this->equity, '0', '100.00'),
        ]);
        $this->req($this->owner, 'POST', "/api/v1/accounting/journals/{$opening}/post")->assertOk();
        $sale = $this->createJournal('2026-02-10', [
            $this->line($this->cash, '25.00', '0', $this->treasury), $this->line($this->revenue, '0', '25.00'),
        ]);
        $this->req($this->owner, 'POST', "/api/v1/accounting/journals/{$sale}/post")->assertOk();

        $ledger = $this->req($this->owner, 'GET', "/api/v1/accounting/ledger?account_id={$this->cash}&from_date=2026-02-01&to_date=2026-02-28")->assertOk();
        $ledger->assertJsonPath('data.opening_balance', '100.0000')->assertJsonPath('data.closing_balance', '125.0000');
        $trial = $this->req($this->owner, 'GET', '/api/v1/accounting/trial-balance?from_date=2026-02-01&to_date=2026-02-28')->assertOk();
        $trial->assertJsonPath('data.totals.period_debit', '25.0000')->assertJsonPath('data.totals.period_credit', '25.0000')
            ->assertJsonPath('data.totals.is_balanced', true);
        $statements = $this->req($this->owner, 'GET', '/api/v1/accounting/statements?from_date=2026-02-01&to_date=2026-02-28')->assertOk();
        $statements->assertJsonPath('data.income_statement.net_income', '25.0000')
            ->assertJsonPath('data.balance_sheet.total_assets', '125.0000')
            ->assertJsonPath('data.cash_flow.inflows', '25.0000')
            ->assertJsonPath('data.cash_flow.closing_balance', '125.0000');

        $reverse = fn () => $this->req($this->owner, 'POST', "/api/v1/accounting/journals/{$sale}/reverse", [
            'reason' => 'Fixture correction', 'reversal_date' => '2026-02-20',
        ])->assertOk();
        $reversed = $reverse()->json('data');
        self::assertSame('posted', DB::table('journal_entries')->where('id', $sale)->value('status'));
        $again = $reverse()->json('data');
        self::assertSame($reversed['id'], $again['id']);
        self::assertSame(1, DB::table('journal_entries')->where('reversal_of_entry_id', $sale)->count());
        $ledgerAfter = $this->req($this->owner, 'GET', "/api/v1/accounting/ledger?account_id={$this->cash}&from_date=2026-02-01&to_date=2026-02-28")->assertOk();
        $ledgerAfter->assertJsonPath('data.closing_balance', '100.0000');
        $statementsAfter = $this->req($this->owner, 'GET', '/api/v1/accounting/statements?from_date=2026-02-01&to_date=2026-02-28')->assertOk();
        $statementsAfter->assertJsonPath('data.income_statement.net_income', '0.0000')
            ->assertJsonPath('data.balance_sheet.total_assets', '100.0000')
            ->assertJsonPath('data.balance_sheet.is_balanced', true)
            ->assertJsonPath('data.cash_flow.closing_balance', '100.0000');
    }

    #[Test]
    public function adjustment_posts_once_with_audit_and_a_mismatched_retry_is_rejected(): void
    {
        $opening = $this->createJournal('2026-01-01', [
            $this->line($this->cash, '50.00', '0', $this->treasury), $this->line($this->equity, '0', '50.00'),
        ]);
        $this->req($this->owner, 'POST', "/api/v1/accounting/journals/{$opening}/post")->assertOk();
        $body = [
            'reference_number' => 'FIXTURE-ADJ-1', 'adjustment_type' => 'expense', 'adjustment_date' => '2026-02-11',
            'debit_account_id' => $this->expense, 'credit_account_id' => $this->cash,
            'credit_treasury_account_id' => $this->treasury, 'amount' => '12.50', 'reason' => 'Fixture expense',
        ];
        $key = bin2hex(random_bytes(20));
        $first = $this->req($this->owner, 'POST', '/api/v1/accounting/adjustments', $body, ['Idempotency-Key' => $key])->assertCreated()->json('data');
        $second = $this->req($this->owner, 'POST', '/api/v1/accounting/adjustments', $body, ['Idempotency-Key' => $key])->assertCreated()->json('data');
        self::assertSame($first['id'], $second['id']);
        self::assertSame(1, DB::table('financial_adjustments')->where('id', $first['id'])->count());
        self::assertSame(1, DB::table('audit_logs')->where('entity_type', 'financial_adjustment')->where('entity_id', $first['id'])->count());
        $changed = [...$body, 'amount' => '13.00'];
        $this->req($this->owner, 'POST', '/api/v1/accounting/adjustments', $changed, ['Idempotency-Key' => $key])->assertStatus(409);
    }

    #[Test]
    public function trial_balance_keeps_visible_rows_and_warns_for_an_imbalanced_legacy_entry(): void
    {
        $entryId = (int) DB::table('journal_entries')->insertGetId([
            'entry_number' => 'LEGACY-'.strtoupper(bin2hex(random_bytes(4))), 'status' => 'posted',
            'entry_date' => '2026-02-12', 'description' => 'Legacy one-sided fixture', 'created_by_user_id' => $this->owner['user_id'],
            'posted_by_user_id' => $this->owner['user_id'], 'posted_at' => now(), 'created_at' => now(), 'updated_at' => now(),
        ]);
        DB::table('journal_lines')->insert([
            'journal_entry_id' => $entryId, 'line_number' => 1, 'account_id' => $this->expense,
            'debit_amount' => '9.0000', 'credit_amount' => '0.0000', 'description' => 'Legacy fixture',
            'created_at' => now(),
        ]);

        $trial = $this->req($this->owner, 'GET', '/api/v1/accounting/trial-balance?from_date=2026-02-01&to_date=2026-02-28')->assertOk();
        $trial->assertJsonPath('data.totals.is_balanced', false)
            ->assertJsonPath('data.totals.period_difference', '9.0000')
            ->assertJsonPath('data.totals.difference', '9.0000');
        self::assertNotEmpty($trial->json('data.accounts'));
    }

    private function account(string $code, string $type, string $normal, ?int $parentId = null): int
    {
        return (int) DB::table('chart_of_accounts')->insertGetId([
            'parent_account_id' => $parentId, 'code' => $code, 'name' => "Fixture {$code}", 'description' => null,
            'account_type' => $type, 'normal_balance' => $normal, 'is_control_account' => false, 'is_active' => true,
            'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    private function line(int $accountId, string $debit, string $credit, ?int $treasuryId = null): array
    {
        return ['account_id' => $accountId, 'debit_amount' => $debit, 'credit_amount' => $credit,
            'description' => 'Accounting test fixture', 'treasury_account_id' => $treasuryId];
    }

    private function createJournal(string $date, array $lines): int
    {
        $response = $this->req($this->owner, 'POST', '/api/v1/accounting/journals', [
            'entry_date' => $date, 'description' => 'Accounting test fixture', 'lines' => $lines,
        ])->assertCreated();
        return (int) $response->json('data.id');
    }

    private function req(array $actor, string $method, string $url, array $body = [], array $headers = [])
    {
        return $this->withCredentials()
            ->withUnencryptedCookie($this->apiCookieName(), $actor['token'])
            ->json($method, $url, $body, [$this->apiCsrfHeader() => $actor['csrf']] + $headers);
    }
}
