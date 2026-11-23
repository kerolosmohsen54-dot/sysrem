<?php

namespace Tests\Feature;

use App\Services\TreasuryService;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use PHPUnit\Framework\Attributes\Test;
use RuntimeException;
use Tests\TestCase;

class TreasuryEngineTest extends TestCase
{
    private ?string $connection = null;

    private TreasuryService $treasury;

    protected function setUp(): void
    {
        parent::setUp();
        $connection = getenv('AUTH_TEST_CONNECTION');
        if (! is_string($connection) || ! in_array($connection, ['mysql_test', 'mariadb_test'], true)) {
            $this->markTestSkipped('Set AUTH_TEST_CONNECTION to mysql_test or mariadb_test to run treasury integration coverage.');
        }
        $this->connection = $connection;
        config(['database.default' => $connection]);
        DB::setDefaultConnection($connection);
        DB::purge($connection);
        if (config("database.connections.{$connection}.database") !== 'erp_acceptance_tests'
            || (DB::selectOne('SELECT DATABASE() AS database_name')->database_name ?? null) !== 'erp_acceptance_tests') {
            throw new RuntimeException('Treasury integration tests require the erp_acceptance_tests database.');
        }

        $this->createTemporaryTables();
        $this->treasury = app(TreasuryService::class);
    }

    protected function tearDown(): void
    {
        if ($this->connection !== null) {
            foreach ([
                'financial_outbox_events',
                'treasury_transfer_entries',
                'treasury_transfers',
                'expenses',
                'expense_categories',
                'treasury_entries',
                'treasury_accounts',
                'audit_logs',
            ] as $table) {
                DB::statement("DROP TEMPORARY TABLE IF EXISTS `{$table}`");
            }
            DB::purge($this->connection);
        }
        parent::tearDown();
    }

    #[Test]
    public function cash_entries_round_exactly_and_balances_are_computed_from_posted_entries(): void
    {
        $accountId = $this->account('CASH-1');
        $this->seedEntry($accountId, 'in', '100.00', 'opening');

        $posted = $this->treasury->postCashEntry($this->request(), [
            'treasury_account_id' => $accountId,
            'direction' => 'in',
            'entry_date' => '2026-10-10',
            'amount_egp' => '10.005',
            'description' => 'Cash received',
        ]);
        self::assertSame('110.01', $posted['balance_egp']);
        self::assertSame('110.01', $this->treasury->balance($accountId)['balance_egp']);

        $withdrawal = $this->treasury->postCashEntry($this->request(), [
            'treasury_account_id' => $accountId,
            'direction' => 'out',
            'entry_date' => '2026-10-10',
            'amount_egp' => '10.001',
            'description' => 'Cash paid',
        ]);
        self::assertSame('100.01', $withdrawal['balance_egp']);
        self::assertSame('adjustment', DB::table('treasury_entries')->where('id', $withdrawal['entry_id'])->value('entry_type'));
        self::assertSame(2, DB::table('financial_outbox_events')->count());
        self::assertSame(2, DB::table('audit_logs')->count());

        try {
            $this->treasury->postCashEntry($this->request(), [
                'treasury_account_id' => $accountId,
                'direction' => 'out',
                'entry_date' => '2026-10-10',
                'amount_egp' => '101.00',
                'description' => 'Overdraw attempt',
            ]);
            self::fail('An outflow that exceeds the computed balance must fail.');
        } catch (ValidationException $exception) {
            self::assertArrayHasKey('amount_egp', $exception->errors());
        }

        self::assertSame('100.01', $this->treasury->balance($accountId)['balance_egp']);
        self::assertSame(2, DB::table('treasury_entries')->where('entry_type', 'adjustment')->count());

        try {
            $this->treasury->postCashEntry($this->request(), [
                'treasury_account_id' => $accountId,
                'direction' => 'in',
                'entry_date' => '2026-10-10',
                'amount_egp' => '999999999999999.9999',
                'description' => 'Out of range',
            ]);
            self::fail('Rounding beyond the supported DECIMAL range must fail.');
        } catch (ValidationException $exception) {
            self::assertArrayHasKey('amount_egp', $exception->errors());
        }
        self::assertSame(2, DB::table('treasury_entries')->where('entry_type', 'adjustment')->count());
    }

    #[Test]
    public function expenses_post_egp_only_and_reference_values_do_not_affect_the_treasury_amount(): void
    {
        $accountId = $this->account('CASH-EXPENSE');
        $this->seedEntry($accountId, 'in', '100.00', 'opening');
        $categoryId = (int) DB::table('expense_categories')->insertGetId([
            'name' => 'Freight',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $expenseId = $this->treasury->postExpense($this->request(), [
            'expense_date' => '2026-10-10',
            'treasury_account_id' => $accountId,
            'expense_category_id' => $categoryId,
            'amount_egp' => '12.345',
            'description' => 'Freight charge',
            'original_amount' => '5.1250',
            'exchange_rate' => '2.4000000000',
        ]);

        $expense = DB::table('expenses')->where('id', $expenseId)->first();
        self::assertSame('posted', $expense->status);
        self::assertSame('12.3500', $expense->amount);
        self::assertSame('5.1250', $expense->original_amount);
        self::assertSame('2.4000000000', $expense->exchange_rate);
        self::assertSame('12.3500', DB::table('treasury_entries')->where('id', $expense->treasury_entry_id)->value('amount'));
        self::assertSame('87.65', $this->treasury->balance($accountId)['balance_egp']);
        self::assertSame(1, DB::table('audit_logs')->where('action', 'expense.posted')->count());
        self::assertSame(1, DB::table('financial_outbox_events')->where('source_type', 'expense')->count());

        $referenceOnlyExpenseId = $this->treasury->postExpense($this->request(), [
            'expense_date' => '2026-10-10',
            'treasury_account_id' => $accountId,
            'expense_category_id' => $categoryId,
            'amount_egp' => '2.00',
            'description' => 'Reference amount without rate',
            'original_amount' => '1.00',
        ]);
        self::assertSame('1.0000', DB::table('expenses')->where('id', $referenceOnlyExpenseId)->value('original_amount'));
        self::assertNull(DB::table('expenses')->where('id', $referenceOnlyExpenseId)->value('exchange_rate'));
        self::assertSame('85.65', $this->treasury->balance($accountId)['balance_egp']);

        try {
            $this->treasury->postExpense($this->request(), [
                'expense_date' => '2026-10-10',
                'treasury_account_id' => $accountId,
                'expense_category_id' => $categoryId,
                'amount_egp' => '0.004',
                'description' => 'Rounded to zero',
            ]);
            self::fail('An amount rounding to zero cents must fail validation.');
        } catch (ValidationException $exception) {
            self::assertArrayHasKey('amount_egp', $exception->errors());
        }
        self::assertSame(2, DB::table('expenses')->count());
    }

    #[Test]
    public function transfers_create_both_legs_and_update_both_computed_balances_atomically(): void
    {
        $fromAccountId = $this->account('CASH-FROM');
        $toAccountId = $this->account('CASH-TO');
        $this->seedEntry($fromAccountId, 'in', '25.00', 'opening');

        $transferId = $this->treasury->postTransfer($this->request(), [
            'transfer_date' => '2026-10-10',
            'from_treasury_account_id' => $fromAccountId,
            'to_treasury_account_id' => $toAccountId,
            'amount_egp' => '4.20',
            'notes' => 'Move cash between accounts',
        ]);

        self::assertSame('20.80', $this->treasury->balance($fromAccountId)['balance_egp']);
        self::assertSame('4.20', $this->treasury->balance($toAccountId)['balance_egp']);
        self::assertSame(2, DB::table('treasury_transfer_entries')->where('treasury_transfer_id', $transferId)->count());
        self::assertSame(1, DB::table('audit_logs')->where('entity_type', 'treasury_transfer')->count());
        self::assertSame(1, DB::table('financial_outbox_events')->where('source_type', 'treasury_transfer')->count());
    }

    #[Test]
    public function a_failed_outbox_write_rolls_back_the_posting_and_its_audit_record(): void
    {
        $accountId = $this->account('CASH-ROLLBACK');
        DB::statement('ALTER TABLE financial_outbox_events MODIFY payload VARCHAR(1) NOT NULL');

        try {
            $this->treasury->postCashEntry($this->request(), [
                'treasury_account_id' => $accountId,
                'direction' => 'in',
                'entry_date' => '2026-10-10',
                'amount_egp' => '1.00',
                'description' => 'Should be rolled back',
            ]);
            self::fail('An outbox failure must fail the financial posting transaction.');
        } catch (QueryException) {
            self::assertSame(0, DB::table('treasury_entries')->count());
            self::assertSame(0, DB::table('audit_logs')->count());
            self::assertSame(0, DB::table('financial_outbox_events')->count());
        }
    }

    #[Test]
    public function a_failed_audit_write_rolls_back_the_posting_before_the_outbox_is_written(): void
    {
        $accountId = $this->account('CASH-AUDIT-ROLLBACK');
        DB::statement("ALTER TABLE audit_logs ADD CONSTRAINT chk_test_reject_treasury_audit CHECK (action <> 'treasury_entry.posted')");

        try {
            $this->treasury->postCashEntry($this->request(), [
                'treasury_account_id' => $accountId,
                'direction' => 'in',
                'entry_date' => '2026-10-10',
                'amount_egp' => '2.00',
                'description' => 'Audit failure',
            ]);
            self::fail('An audit failure must fail the financial posting transaction.');
        } catch (QueryException) {
            self::assertSame(0, DB::table('treasury_entries')->count());
            self::assertSame(0, DB::table('audit_logs')->count());
            self::assertSame(0, DB::table('financial_outbox_events')->count());
        }
    }

    private function createTemporaryTables(): void
    {
        $definitions = [
            'CREATE TEMPORARY TABLE audit_logs (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, actor_user_id BIGINT UNSIGNED NULL, actor_name_snapshot VARCHAR(160) NULL, action VARCHAR(100) NOT NULL, entity_type VARCHAR(100) NOT NULL, entity_id BIGINT UNSIGNED NULL, reason VARCHAR(1000) NULL, before_data LONGTEXT NULL, after_data LONGTEXT NULL, request_id VARCHAR(100) NULL, ip_address VARBINARY(16) NULL, user_agent VARCHAR(500) NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)',
            'CREATE TEMPORARY TABLE treasury_accounts (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, code VARCHAR(80) NOT NULL UNIQUE, name VARCHAR(160) NOT NULL, account_type VARCHAR(10) NOT NULL, is_active TINYINT(1) NOT NULL DEFAULT 1, notes VARCHAR(500) NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)',
            'CREATE TEMPORARY TABLE treasury_entries (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, treasury_account_id BIGINT UNSIGNED NOT NULL, entry_number VARCHAR(80) NOT NULL UNIQUE, entry_type VARCHAR(30) NOT NULL, direction VARCHAR(10) NOT NULL, entry_date DATE NOT NULL, amount DECIMAL(19,4) NOT NULL, source_type VARCHAR(80) NULL, source_id BIGINT UNSIGNED NULL, reversal_of_entry_id BIGINT UNSIGNED NULL, description VARCHAR(500) NULL, created_by_user_id BIGINT UNSIGNED NULL, posted_at DATETIME NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY uq_treasury_entries_source_once (source_type, source_id))',
            'CREATE TEMPORARY TABLE expense_categories (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, name VARCHAR(160) NOT NULL UNIQUE, is_active TINYINT(1) NOT NULL DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)',
            'CREATE TEMPORARY TABLE expenses (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, expense_number VARCHAR(80) NOT NULL UNIQUE, status VARCHAR(20) NOT NULL DEFAULT "draft", expense_date DATE NOT NULL, expense_category_id BIGINT UNSIGNED NULL, treasury_account_id BIGINT UNSIGNED NOT NULL, expense_account_id BIGINT UNSIGNED NULL, amount DECIMAL(19,4) NOT NULL, original_amount DECIMAL(19,4) NULL, exchange_rate DECIMAL(24,10) NULL, description VARCHAR(500) NOT NULL, reference VARCHAR(160) NULL, treasury_entry_id BIGINT UNSIGNED NULL, journal_entry_id BIGINT UNSIGNED NULL, created_by_user_id BIGINT UNSIGNED NULL, posted_by_user_id BIGINT UNSIGNED NULL, posted_at DATETIME NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY uq_expenses_treasury_entry (treasury_entry_id))',
            'CREATE TEMPORARY TABLE treasury_transfers (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, transfer_number VARCHAR(80) NOT NULL UNIQUE, status VARCHAR(20) NOT NULL, transfer_date DATE NOT NULL, from_treasury_account_id BIGINT UNSIGNED NOT NULL, to_treasury_account_id BIGINT UNSIGNED NOT NULL, amount_egp DECIMAL(19,4) NOT NULL, journal_entry_id BIGINT UNSIGNED NULL, notes VARCHAR(1000) NULL, created_by_user_id BIGINT UNSIGNED NULL, posted_by_user_id BIGINT UNSIGNED NULL, posted_at DATETIME NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)',
            'CREATE TEMPORARY TABLE treasury_transfer_entries (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, treasury_transfer_id BIGINT UNSIGNED NOT NULL, treasury_entry_id BIGINT UNSIGNED NOT NULL, transfer_leg VARCHAR(10) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY uq_transfer_leg (treasury_transfer_id, transfer_leg), UNIQUE KEY uq_transfer_entry (treasury_entry_id))',
            'CREATE TEMPORARY TABLE financial_outbox_events (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, event_type VARCHAR(100) NOT NULL, source_type VARCHAR(100) NOT NULL, source_id BIGINT UNSIGNED NOT NULL, payload LONGTEXT NOT NULL, attempts INT UNSIGNED NOT NULL DEFAULT 0, last_error TEXT NULL, occurred_at DATETIME NOT NULL, processed_at DATETIME NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY uq_financial_outbox_source_event (source_type, source_id, event_type))',
        ];
        foreach ($definitions as $sql) {
            DB::statement($sql.' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
        }
        $this->createTemporaryFinancialPostingTables();
    }

    private function account(string $code): int
    {
        return (int) DB::table('treasury_accounts')->insertGetId([
            'code' => $code,
            'name' => $code,
            'account_type' => 'cash',
            'is_active' => true,
        ]);
    }

    private function seedEntry(int $accountId, string $direction, string $amount, string $entryType): void
    {
        DB::table('treasury_entries')->insert([
            'treasury_account_id' => $accountId,
            'entry_number' => 'SEED-'.strtoupper(bin2hex(random_bytes(6))),
            'entry_type' => $entryType,
            'direction' => $direction,
            'entry_date' => '2026-10-10',
            'amount' => $amount,
            'created_by_user_id' => 1,
            'posted_at' => now(),
        ]);
    }

    private function request(): Request
    {
        $request = Request::create('/api/v1/treasury/test', 'POST');
        $request->attributes->set('authenticated_user', (object) ['id' => 1, 'display_name' => 'Treasury Test Owner']);
        $request->attributes->set('request_id', 'treasury-test-request');

        return $request;
    }
}
