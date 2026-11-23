<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Test;
use Tests\Concerns\AuthenticatesApi;
use Tests\TestCase;

final class FinancialPlanningApiTest extends TestCase
{
    use AuthenticatesApi;

    private array $owner;
    private int $partnerId;
    private int $containerId;
    private int $treasuryId;
    private int $categoryId;
    private int $customerId;

    protected function setUp(): void
    {
        parent::setUp();
        DB::beginTransaction();
        $this->owner = $this->actingAsApiUser('owner', true);
        $now = now();
        $this->partnerId = (int) DB::table('partners')->insertGetId([
            'name' => 'Finance fixture partner '.bin2hex(random_bytes(3)), 'status' => 'active',
            'created_by_user_id' => $this->owner['user_id'], 'created_at' => $now, 'updated_at' => $now,
        ]);
        $this->containerId = (int) DB::table('containers')->insertGetId([
            'container_number' => 'FP-'.strtoupper(bin2hex(random_bytes(5))), 'status' => 'draft',
            'created_at' => $now, 'updated_at' => $now,
        ]);
        $this->treasuryId = (int) DB::table('treasury_accounts')->insertGetId([
            'code' => 'FP-'.strtoupper(bin2hex(random_bytes(4))), 'name' => 'Finance fixture treasury',
            'account_type' => 'cash', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now,
        ]);
        $this->categoryId = (int) DB::table('expense_categories')->insertGetId([
            'name' => 'Finance fixture category '.bin2hex(random_bytes(3)), 'is_active' => true, 'created_at' => $now, 'updated_at' => $now,
        ]);
        $this->customerId = (int) DB::table('customers')->insertGetId([
            'name' => 'Finance fixture customer '.bin2hex(random_bytes(3)), 'is_active' => true,
            'created_by_user_id' => $this->owner['user_id'], 'updated_by_user_id' => $this->owner['user_id'], 'created_at' => $now, 'updated_at' => $now,
        ]);
    }

    protected function tearDown(): void
    {
        if (DB::connection()->transactionLevel() > 0) DB::rollBack();
        parent::tearDown();
    }

    #[Test]
    public function planning_reference_options_are_session_protected_and_readable_without_mutation_step_up(): void
    {
        $this->getJson('/api/v1/finance-planning-options')->assertUnauthorized();
        $response = $this->req($this->owner, 'GET', '/api/v1/finance-planning-options')->assertOk();
        self::assertSame($this->partnerId, collect($response->json('data.partners'))->firstWhere('id', $this->partnerId)['id']);
        self::assertSame($this->treasuryId, collect($response->json('data.treasury'))->firstWhere('id', $this->treasuryId)['id']);
        self::assertSame($this->categoryId, collect($response->json('data.categories'))->firstWhere('id', $this->categoryId)['id']);
    }

    #[Test]
    public function expected_funds_are_traceable_and_their_receipts_move_to_actual_treasury_once(): void
    {
        $forecastStart = now()->addYears(5)->toDateString();
        $due = now()->addYears(5)->addDays(2)->toDateString();
        $fund = $this->req($this->owner, 'POST', '/api/v1/pending-funds', [
            'partner_id' => $this->partnerId, 'source_label' => 'Partner transfer', 'source_reference' => 'WIRE-77',
            'description' => 'Expected collection fixture', 'due_date' => $due, 'amount' => '100.00',
        ])->assertCreated()->json('data');
        self::assertSame('100.00', $fund['remaining_amount']);

        $forecast = $this->req($this->owner, 'GET', '/api/v1/finance-reports/cash-forecast?from_date='.$forecastStart.'&weeks=1')->assertOk();
        self::assertSame('100.00', $forecast->json('data.weeks.0.pending_funds'));
        self::assertSame('0.00', $forecast->json('data.weeks.0.actual_inflows'));

        $body = ['treasury_account_id' => $this->treasuryId, 'amount' => '25.00', 'received_date' => now()->toDateString(), 'idempotency_key' => 'fund-receipt-'.$fund['id']];
        $first = $this->req($this->owner, 'POST', "/api/v1/pending-funds/{$fund['id']}/receive", $body, ['Idempotency-Key' => $body['idempotency_key']])->assertOk()->json('data');
        $retry = $this->req($this->owner, 'POST', "/api/v1/pending-funds/{$fund['id']}/receive", $body, ['Idempotency-Key' => $body['idempotency_key']])->assertOk()->json('data');
        self::assertSame('75.00', $first['remaining_amount']);
        self::assertSame($first['received_amount'], $retry['received_amount']);
        $changedReceipt = [...$body, 'received_date' => now()->addDay()->toDateString()];
        $this->req($this->owner, 'POST', "/api/v1/pending-funds/{$fund['id']}/receive", $changedReceipt, ['Idempotency-Key' => $body['idempotency_key']])->assertStatus(409);
        self::assertSame(1, DB::table('pending_fund_receipts')->where('pending_fund_id', $fund['id'])->count());
        self::assertSame(1, DB::table('treasury_entries')->where('source_type', 'pending_fund_receipt')->whereIn('source_id', DB::table('pending_fund_receipts')->where('pending_fund_id', $fund['id'])->pluck('id'))->count());
        self::assertSame('25.0000', (string) DB::table('treasury_entries')->where('source_type', 'pending_fund_receipt')->whereIn('source_id', DB::table('pending_fund_receipts')->where('pending_fund_id', $fund['id'])->pluck('id'))->value('amount'));

        $settled = $this->req($this->owner, 'POST', "/api/v1/pending-funds/{$fund['id']}/receive", [
            'treasury_account_id' => $this->treasuryId, 'amount' => '75.00', 'received_date' => now()->toDateString(), 'idempotency_key' => 'fund-receipt-final-'.$fund['id'],
        ])->assertOk()->json('data');
        self::assertSame('received', $settled['status']);
        self::assertSame('100.00', $settled['received_amount']);
        self::assertSame('100.00', $this->req($this->owner, 'GET', "/api/v1/treasury/accounts/{$this->treasuryId}/balance")->assertOk()->json('data.balance_egp'));
    }

    #[Test]
    public function container_contribution_records_manual_payments_without_a_forecast_schedule(): void
    {
        $containerPartner = $this->req($this->owner, 'POST', '/api/v1/container-partners', [
            'name' => 'Container investor fixture', 'phone' => '+201000000000',
        ])->assertCreated()->json('data');
        self::assertSame('Container investor fixture', $containerPartner['name']);
        self::assertSame(1, DB::table('container_partners')->where('id', $containerPartner['id'])->count());

        $options = $this->req($this->owner, 'GET', '/api/v1/container-partners')->assertOk()->json('data');
        self::assertSame($containerPartner['id'], collect($options)->firstWhere('id', $containerPartner['id'])['id']);
        self::assertNull(collect($options)->firstWhere('id', $this->partnerId));
        $companyPartners = $this->req($this->owner, 'GET', '/api/v1/partners')->assertOk()->json('data');
        self::assertNull(collect($companyPartners)->firstWhere('name', $containerPartner['name']));

        $plan = $this->req($this->owner, 'POST', '/api/v1/partner-installment-plans', [
            'container_partner_id' => $containerPartner['id'], 'container_id' => $this->containerId,
            'reference' => 'CONTRIBUTION-FIXTURE', 'total_amount' => '120.00',
        ])->assertCreated()->json('data');
        self::assertSame('manual', $plan['contribution_mode']);
        self::assertCount(1, $plan['installments']);
        self::assertSame('120.00', $plan['installments'][0]['amount']);
        self::assertSame($containerPartner['id'], $plan['container_partner_id']);
        self::assertSame($this->containerId, $plan['container_id']);
        self::assertSame($containerPartner['id'], (int) DB::table('partner_installment_plans')->where('id', $plan['id'])->value('container_partner_id'));
        self::assertSame($this->containerId, (int) DB::table('partner_installment_plans')->where('id', $plan['id'])->value('container_id'));
        self::assertNull(DB::table('partner_installment_plans')->where('id', $plan['id'])->value('partner_id'));
        self::assertSame('manual', DB::table('partner_installment_plans')->where('id', $plan['id'])->value('contribution_mode'));

        $forecast = $this->req($this->owner, 'GET', '/api/v1/finance-reports/cash-forecast', [
            'from_date' => now()->toDateString(), 'weeks' => 1,
        ])->assertOk()->json('data');
        self::assertNotContains($plan['id'], array_column($forecast['weeks'][0]['sources']['partner_installments'], 'plan_id'));

        $paid = $this->req($this->owner, 'POST', "/api/v1/partner-installment-plans/{$plan['id']}/payments", [
            'treasury_account_id' => $this->treasuryId, 'amount' => '60.00', 'payment_date' => now()->toDateString(), 'idempotency_key' => 'installment-payment-'.$plan['id'],
        ], ['Idempotency-Key' => 'installment-payment-'.$plan['id']])->assertOk()->json('data');
        self::assertSame('60.00', $paid['paid_amount']);
        self::assertSame('60.00', $paid['remaining_amount']);
        self::assertSame('60.00', $paid['installments'][0]['paid_amount']);
        self::assertCount(1, $paid['payments']);
        self::assertSame(1, DB::table('partner_installment_payments')->where('plan_id', $plan['id'])->count());
        self::assertSame(1, DB::table('treasury_entries')->where('source_type', 'partner_installment_payment')->whereIn('source_id', DB::table('partner_installment_payments')->where('plan_id', $plan['id'])->pluck('id'))->count());

        $replayed = $this->req($this->owner, 'POST', "/api/v1/partner-installment-plans/{$plan['id']}/payments", [
            'treasury_account_id' => $this->treasuryId, 'amount' => '60.00', 'payment_date' => now()->toDateString(), 'idempotency_key' => 'installment-payment-'.$plan['id'],
        ], ['Idempotency-Key' => 'installment-payment-'.$plan['id']])->assertOk()->json('data');
        self::assertCount(1, $replayed['payments']);
        $changedPayment = ['treasury_account_id' => $this->treasuryId, 'amount' => '60.00', 'payment_date' => now()->addDay()->toDateString(), 'idempotency_key' => 'installment-payment-'.$plan['id']];
        $this->req($this->owner, 'POST', "/api/v1/partner-installment-plans/{$plan['id']}/payments", $changedPayment, ['Idempotency-Key' => 'installment-payment-'.$plan['id']])->assertStatus(409);
        self::assertSame(1, DB::table('treasury_entries')->where('source_type', 'partner_installment_payment')->whereIn('source_id', DB::table('partner_installment_payments')->where('plan_id', $plan['id'])->pluck('id'))->count());

        $settled = $this->req($this->owner, 'POST', "/api/v1/partner-installment-plans/{$plan['id']}/payments", [
            'treasury_account_id' => $this->treasuryId, 'amount' => '60.00', 'payment_date' => now()->toDateString(), 'idempotency_key' => 'installment-payment-second-'.$plan['id'],
        ], ['Idempotency-Key' => 'installment-payment-second-'.$plan['id']])->assertOk()->json('data');
        self::assertSame('completed', $settled['status']);
        self::assertSame('120.00', $settled['paid_amount']);
        self::assertSame(2, DB::table('partner_installment_payments')->where('plan_id', $plan['id'])->count());
    }

    #[Test]
    public function container_contribution_can_schedule_monthly_payments_and_updates_the_forecast(): void
    {
        $containerPartner = $this->req($this->owner, 'POST', '/api/v1/container-partners', [
            'name' => 'Monthly container investor',
        ])->assertCreated()->json('data');
        $firstDueDate = '2099-01-31';
        $plan = $this->req($this->owner, 'POST', '/api/v1/partner-installment-plans', [
            'container_partner_id' => $containerPartner['id'], 'container_id' => $this->containerId,
            'reference' => 'MONTHLY-CONTRIBUTION', 'total_amount' => '170.00', 'contribution_mode' => 'scheduled',
            'installment_amount' => '60.00', 'first_due_date' => $firstDueDate,
        ])->assertCreated()->json('data');

        self::assertSame('scheduled', $plan['contribution_mode']);
        self::assertSame('60.00', $plan['installment_amount']);
        self::assertSame('170.00', $plan['remaining_amount']);
        self::assertSame(['60.00', '60.00', '50.00'], array_column($plan['installments'], 'amount'));
        self::assertSame(['2099-01-31', '2099-02-28', '2099-03-31'], array_column($plan['installments'], 'due_date'));
        self::assertSame('50.0000', (string) DB::table('partner_installments')->where('plan_id', $plan['id'])->where('sequence_number', 3)->value('amount'));

        $forecast = $this->req($this->owner, 'GET', '/api/v1/finance-reports/cash-forecast', [
            'from_date' => $firstDueDate, 'weeks' => 1,
        ])->assertOk()->json('data');
        self::assertSame('60.00', $forecast['weeks'][0]['partner_installments']);
        self::assertSame($plan['id'], $forecast['weeks'][0]['sources']['partner_installments'][0]['plan_id']);

        $paid = $this->req($this->owner, 'POST', "/api/v1/partner-installment-plans/{$plan['id']}/payments", [
            'treasury_account_id' => $this->treasuryId, 'amount' => '30.00', 'payment_date' => $firstDueDate,
            'idempotency_key' => 'monthly-installment-first-'.$plan['id'],
        ])->assertOk()->json('data');
        self::assertSame('30.00', $paid['paid_amount']);
        self::assertSame('140.00', $paid['remaining_amount']);
        self::assertSame('30.00', $paid['installments'][0]['remaining_amount']);

        $updatedForecast = $this->req($this->owner, 'GET', '/api/v1/finance-reports/cash-forecast', [
            'from_date' => $firstDueDate, 'weeks' => 1,
        ])->assertOk()->json('data');
        self::assertSame('30.00', $updatedForecast['weeks'][0]['partner_installments']);
    }

    #[Test]
    public function budget_comparison_monthly_zero_periods_and_recurring_cycles_are_safe_and_idempotent(): void
    {
        // Keep this transaction deterministic even when the shared acceptance
        // database contains active plans from earlier E2E runs.
        DB::table('recurring_expense_templates')->where('status', 'active')->update(['status' => 'stopped']);
        $this->seedOpeningCash('500.00');
        // Keep this comparison period away from seeded/demo dates so month B is truly empty.
        $fixtureDate = '2099-01-15';
        $fixtureMonth = substr($fixtureDate, 0, 7);
        $this->req($this->owner, 'POST', '/api/v1/expenses', [
            'expense_date' => $fixtureDate, 'treasury_account_id' => $this->treasuryId,
            'expense_category_id' => $this->categoryId, 'amount_egp' => '30.00', 'description' => 'Fixture posted expense', 'reference' => 'FP-EXP-1',
        ])->assertCreated();
        $budget = $this->req($this->owner, 'POST', '/api/v1/expense-budgets', [
            'expense_category_id' => $this->categoryId, 'period' => $fixtureMonth, 'budget_amount' => '25.00', 'notes' => 'Fixture cap',
        ])->assertCreated()->json('data');
        $currentBudgets = $this->req($this->owner, 'GET', '/api/v1/expense-budgets?period='.$fixtureMonth)->assertOk()->json('data');
        $fixtureBudget = collect($currentBudgets)->firstWhere('expense_category_id', $this->categoryId);
        self::assertSame('-5.00', $fixtureBudget['remaining_amount']);
        self::assertSame('exceeded', $fixtureBudget['status']);
        self::assertSame(120.0, (float) $fixtureBudget['usage_percent']);
        self::assertGreaterThan(0, $budget['id']);

        $this->insertPostedDocument('invoice', '70.00', $fixtureDate);
        $credit = $this->insertPostedDocument('credit_note', '10.00', $fixtureDate);
        DB::table('sales_documents')->where('id', $credit)->update(['original_document_id' => DB::table('sales_documents')->where('document_type', 'invoice')->value('id')]);
        $previousMonth = \Illuminate\Support\Carbon::parse($fixtureDate)->subMonth()->format('Y-m');
        $comparison = $this->req($this->owner, 'GET', '/api/v1/finance-reports/monthly-comparison?month_a='.$fixtureMonth.'&month_b='.$previousMonth)->assertOk();
        self::assertSame('60.00', $comparison->json('data.metrics.sales.month_a'));
        self::assertSame('30.00', $comparison->json('data.metrics.expenses.month_a'));
        self::assertSame('30.00', $comparison->json('data.metrics.profit.month_a'));
        self::assertNull($comparison->json('data.metrics.sales.change_percent'));
        $empty = $this->req($this->owner, 'GET', '/api/v1/finance-reports/monthly-comparison?month_a=2020-01&month_b=2020-02')->assertOk();
        self::assertSame('0.00', $empty->json('data.metrics.sales.difference'));
        self::assertNull($empty->json('data.metrics.sales.change_percent'));

        $template = $this->req($this->owner, 'POST', '/api/v1/recurring-expenses', [
            'name' => 'Fixture rent', 'expense_category_id' => $this->categoryId, 'amount' => '40.00', 'due_day' => 1,
            'start_date' => now()->startOfMonth()->toDateString(),
        ])->assertCreated()->json('data');
        self::assertSame(0, DB::table('recurring_expense_occurrences')->where('template_id', $template['id'])->count());
        self::assertSame(0, Artisan::call('finance:recurring-expenses:materialize', ['--through' => now()->toDateString()]));
        self::assertSame(0, Artisan::call('finance:recurring-expenses:materialize', ['--through' => now()->toDateString()]));
        self::assertSame(1, DB::table('recurring_expense_occurrences')->where('template_id', $template['id'])->count());
        $stopped = $this->req($this->owner, 'POST', "/api/v1/recurring-expenses/{$template['id']}/stop", ['reason' => 'Fixture schedule ended'])->assertOk()->json('data');
        self::assertSame('stopped', $stopped['status']);
        self::assertSame(1, DB::table('audit_logs')->where('entity_type', 'recurring_expense_template')->where('entity_id', $template['id'])->where('action', 'recurring_expense_template.stopped')->count());

        $forecastMonth = now()->addYears(5)->startOfMonth()->addMonths(3);
        $forecastStart = $forecastMonth->toDateString();
        DB::table('expense_budgets')->where('period_start', $forecastMonth->toDateString())->delete();
        $forecastTemplate = $this->req($this->owner, 'POST', '/api/v1/recurring-expenses', [
            'name' => 'Forecast rent', 'expense_category_id' => $this->categoryId, 'amount' => '0.02', 'due_day' => 7,
            'start_date' => $forecastStart,
        ])->assertCreated()->json('data');
        $this->req($this->owner, 'POST', '/api/v1/expense-budgets', [
            'expense_category_id' => $this->categoryId, 'period' => $forecastMonth->format('Y-m'), 'budget_amount' => '0.05',
        ])->assertCreated();
        self::assertSame(0, DB::table('recurring_expense_occurrences')->where('template_id', $forecastTemplate['id'])->count());
        $forecast = $this->req($this->owner, 'GET', '/api/v1/finance-reports/cash-forecast?from_date='.$forecastStart.'&weeks=5')->assertOk()->json('data');
        $projectedTemplate = collect($forecast['weeks'][0]['sources']['recurring_expenses'])
            ->firstWhere('template_id', $forecastTemplate['id']);
        self::assertNotNull($projectedTemplate, 'The forecast must include the newly created recurring template.');
        self::assertSame('0.0200', $projectedTemplate['amount']);
        self::assertSame(true, $projectedTemplate['projected']);
        self::assertSame(['0.00', '0.01', '0.01', '0.00', '0.01'], array_column($forecast['weeks'], 'budgeted_expenses'));
        $openingCents = \App\Support\ExactMoney::toCents($forecast['actual_opening_balance']);
        $expectedClosing = \App\Support\ExactMoney::fromCents(\App\Support\ExactMoney::subtract($openingCents, '5'));
        self::assertSame($expectedClosing, $forecast['projected_closing_balance']);
    }

    #[Test]
    public function collection_summary_allocation_and_reversal_use_real_receipt_records(): void
    {
        $summaryBefore = $this->req($this->owner, 'GET', '/api/v1/collections/summary')->assertOk()->json('data');
        $documentId = $this->insertPostedDocument('invoice', '100.00', now()->addYears(5)->toDateString());
        DB::table('sales_documents')->where('id', $documentId)->update(['due_date' => now()->toDateString()]);
        $receipt = $this->req($this->owner, 'POST', '/api/v1/collections', [
            'customer_id' => $this->customerId, 'treasury_account_id' => $this->treasuryId, 'receipt_date' => now()->toDateString(), 'amount_egp' => '40.00',
            'allocations' => [['document_id' => $documentId, 'amount_egp' => '30.00']],
        ], ['Idempotency-Key' => 'collection-fixture-'.bin2hex(random_bytes(4))])->assertCreated()->json('data.receipt');
        $summary = $this->req($this->owner, 'GET', '/api/v1/collections/summary')->assertOk();
        self::assertSame('70.00', number_format((float) $summary->json('data.receivables_egp') - (float) $summaryBefore['receivables_egp'], 2, '.', ''));
        self::assertSame('40.00', number_format((float) $summary->json('data.collected_this_month_egp') - (float) $summaryBefore['collected_this_month_egp'], 2, '.', ''));

        $allocationId = (int) DB::table('sales_receipt_allocations')->where('sales_receipt_id', $receipt['id'])->value('id');
        $this->req($this->owner, 'POST', "/api/v1/collections/{$receipt['id']}/allocations/{$allocationId}/reverse", ['amount_egp' => '5.00', 'reason' => 'Fixture allocation correction'], ['Idempotency-Key' => 'reverse-fixture-'.bin2hex(random_bytes(4))])->assertOk();
        self::assertSame(1, DB::table('sales_receipt_allocation_reversals')->where('sales_receipt_allocation_id', $allocationId)->count());
        $detail = $this->req($this->owner, 'GET', "/api/v1/collections/{$receipt['id']}")->assertOk();
        self::assertSame('25.00', $detail->json('data.allocations.0.active_egp'));
    }

    private function insertPostedDocument(string $type, string $amount, string $date): int
    {
        return (int) DB::table('sales_documents')->insertGetId([
            'document_number' => 'FP-'.strtoupper(bin2hex(random_bytes(5))), 'document_type' => $type,
            'status' => 'posted', 'customer_id' => $this->customerId, 'issue_date' => $date, 'due_date' => $date,
            'issuer_name_snapshot' => $type === 'invoice' ? 'Finance test issuer' : null,
            'subtotal' => $amount, 'discount_amount' => '0', 'tax_amount' => '0', 'total_amount' => $amount,
            'created_by_user_id' => $this->owner['user_id'], 'posted_by_user_id' => $this->owner['user_id'], 'posted_at' => now(), 'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    private function seedOpeningCash(string $amount): void
    {
        $this->req($this->owner, 'POST', '/api/v1/treasury/entries', [
            'treasury_account_id' => $this->treasuryId, 'direction' => 'in', 'entry_date' => now()->toDateString(),
            'amount_egp' => $amount, 'description' => 'Finance feature test opening cash',
        ], ['Idempotency-Key' => 'opening-cash-'.bin2hex(random_bytes(4))])->assertCreated();
    }

    private function req(array $actor, string $method, string $url, array $body = [], array $headers = [])
    {
        return $this->withCredentials()->withUnencryptedCookie($this->apiCookieName(), $actor['token'])
            ->json($method, $url, $body, [$this->apiCsrfHeader() => $actor['csrf']] + $headers);
    }
}
