<?php

namespace App\Services;

use App\Support\ExactMoney;
use App\Support\FinancialComparisonMath;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class FinancialPlanningService
{
    public function __construct(
        private readonly TreasuryService $treasury,
        private readonly AuditLogService $auditLog,
    ) {}

    public function planningOptions(): array
    {
        return [
            'partners' => DB::table('partners')->where('is_company_partner', true)->where('status', 'active')->orderBy('name')
                ->get(['id', 'name', 'status'])->toArray(),
            'treasury' => DB::table('treasury_accounts')->where('is_active', true)->orderBy('name')
                ->get(['id', 'name', 'is_active'])->toArray(),
            'categories' => DB::table('expense_categories')->where('is_active', true)->orderBy('name')
                ->get(['id', 'name', 'is_active'])->toArray(),
        ];
    }

    public function pendingFunds(array $filters): array
    {
        $query = DB::table('pending_funds as fund')
            ->join('partners as partner', 'partner.id', '=', 'fund.partner_id')
            ->select(['fund.*', 'partner.name as partner_name'])
            ->when(isset($filters['status']), fn ($q) => $q->where('fund.status', $filters['status']))
            ->when(isset($filters['from_date']), fn ($q) => $q->where('fund.due_date', '>=', $filters['from_date']))
            ->when(isset($filters['to_date']), fn ($q) => $q->where('fund.due_date', '<=', $filters['to_date']))
            ->when(isset($filters['partner_id']), fn ($q) => $q->where('fund.partner_id', $filters['partner_id']));
        if (! empty($filters['search'])) {
            $term = trim($filters['search']);
            $query->where(fn ($q) => $q->where('partner.name', 'like', "%{$term}%")
                ->orWhere('fund.source_label', 'like', "%{$term}%")
                ->orWhere('fund.source_reference', 'like', "%{$term}%")
                ->orWhere('fund.description', 'like', "%{$term}%"));
        }
        $page = $query->orderBy('fund.due_date')->orderByDesc('fund.id')->paginate($filters['per_page'] ?? 20);
        $page->getCollection()->transform(fn (object $row): array => $this->pendingFundResource($row));
        return $page->toArray();
    }

    public function createPendingFund(Request $request, array $values): array
    {
        $amount = $this->cashAmount($values['amount']);
        $id = DB::transaction(function () use ($request, $values, $amount): int {
            $partner = DB::table('partners')->where('id', $values['partner_id'])->lockForUpdate()->first();
            abort_if($partner === null || $partner->status !== 'active' || ! $partner->is_company_partner, 422, 'Select an active company partner.');
            $id = (int) DB::table('pending_funds')->insertGetId([
                'partner_id' => $partner->id,
                'source_label' => trim($values['source_label']),
                'source_reference' => trim((string) ($values['source_reference'] ?? '')) ?: null,
                'description' => trim($values['description']),
                'due_date' => $values['due_date'],
                'amount' => $amount,
                'received_amount' => '0.0000',
                'status' => 'pending',
                'created_by_user_id' => $this->actorId($request),
                'updated_by_user_id' => $this->actorId($request),
                'created_at' => now(), 'updated_at' => now(),
            ]);
            $this->auditLog->record($request, 'pending_fund.created', 'pending_fund', $id, null, null, $this->pendingFundData($id));
            return $id;
        }, 5);
        return $this->pendingFund($id);
    }

    public function pendingFund(int $id): array
    {
        $row = DB::table('pending_funds as fund')->join('partners as partner', 'partner.id', '=', 'fund.partner_id')
            ->where('fund.id', $id)->select(['fund.*', 'partner.name as partner_name'])->first();
        abort_if($row === null, 404);
        return $this->pendingFundResource($row) + ['receipts' => DB::table('pending_fund_receipts')->where('pending_fund_id', $id)->orderBy('id')->get()->toArray()];
    }

    public function receivePendingFund(Request $request, int $id, array $values): array
    {
        $amount = $this->cashAmount($values['amount']);
        $key = trim($values['idempotency_key']);
        return DB::transaction(function () use ($request, $id, $values, $amount, $key): array {
            $existing = DB::table('pending_fund_receipts')->where('idempotency_key', $key)->lockForUpdate()->first();
            if ($existing !== null) {
                if ((int) $existing->pending_fund_id !== $id
                    || (int) $existing->treasury_account_id !== (int) $values['treasury_account_id']
                    || $this->cents((string) $existing->amount) !== $this->cents($amount)
                    || (string) $existing->received_date !== (string) $values['received_date']) {
                    throw new ConflictHttpException('The idempotency key was already used for different receipt data.');
                }
                return $this->pendingFund($id);
            }
            $fund = DB::table('pending_funds')->where('id', $id)->lockForUpdate()->first();
            abort_if($fund === null, 404);
            if (! in_array($fund->status, ['pending', 'partially_received'], true)) {
                throw new ConflictHttpException('Only an open expected fund can be received.');
            }
            $remaining = ExactMoney::subtract($this->cents((string) $fund->amount), $this->cents((string) $fund->received_amount));
            $amountCents = $this->cents($amount);
            if (ExactMoney::compare($amountCents, $remaining) > 0) {
                throw ValidationException::withMessages(['amount' => ['The receipt cannot exceed the remaining expected amount.']]);
            }
            $receiptId = (int) DB::table('pending_fund_receipts')->insertGetId([
                'pending_fund_id' => $id, 'treasury_account_id' => $values['treasury_account_id'],
                'treasury_entry_id' => null, 'amount' => $amount, 'received_date' => $values['received_date'],
                'idempotency_key' => $key, 'created_by_user_id' => $this->actorId($request), 'created_at' => now(),
            ]);
            $treasuryEntryId = $this->treasury->postTransaction($request, [
                'treasury_account_id' => (int) $values['treasury_account_id'],
                'entry_type' => 'adjustment', 'direction' => 'in', 'entry_date' => $values['received_date'],
                'amount_egp' => $amount, 'source_type' => 'pending_fund_receipt', 'source_id' => $receiptId,
                'description' => 'استلام مبلغ منتظر: '.$fund->source_label.' — '.$fund->description,
            ]);
            DB::table('pending_fund_receipts')->where('id', $receiptId)->update(['treasury_entry_id' => $treasuryEntryId]);
            $newReceived = ExactMoney::add($this->cents((string) $fund->received_amount), $amountCents);
            $newStatus = ExactMoney::compare($newReceived, $this->cents((string) $fund->amount)) === 0 ? 'received' : 'partially_received';
            DB::table('pending_funds')->where('id', $id)->update([
                'received_amount' => ExactMoney::fromCents($newReceived), 'status' => $newStatus,
                'updated_by_user_id' => $this->actorId($request), 'updated_at' => now(),
            ]);
            $this->auditLog->record($request, 'pending_fund.received', 'pending_fund', $id, null,
                ['received_amount' => $fund->received_amount, 'status' => $fund->status],
                ['received_amount' => ExactMoney::fromCents($newReceived), 'status' => $newStatus, 'treasury_entry_id' => $treasuryEntryId]);
            return $this->pendingFund($id);
        }, 5);
    }

    public function cancelPendingFund(Request $request, int $id, string $reason): array
    {
        DB::transaction(function () use ($request, $id, $reason): void {
            $fund = DB::table('pending_funds')->where('id', $id)->lockForUpdate()->first();
            abort_if($fund === null, 404);
            if (in_array($fund->status, ['received', 'cancelled'], true)) throw new ConflictHttpException('This expected fund cannot be cancelled.');
            DB::table('pending_funds')->where('id', $id)->update(['status' => 'cancelled', 'cancelled_at' => now(), 'updated_by_user_id' => $this->actorId($request), 'updated_at' => now()]);
            $this->auditLog->record($request, 'pending_fund.cancelled', 'pending_fund', $id, trim($reason), (array) $fund, $this->pendingFundData($id));
        }, 5);
        return $this->pendingFund($id);
    }

    public function partnerPlans(array $filters): array
    {
        $query = DB::table('partner_installment_plans as plan')->join('container_partners as partner', 'partner.id', '=', 'plan.container_partner_id')
            ->leftJoin('containers as container', 'container.id', '=', 'plan.container_id')
            ->select(['plan.*', 'partner.name as partner_name', 'container.container_number'])
            ->when(isset($filters['container_partner_id']), fn ($q) => $q->where('plan.container_partner_id', $filters['container_partner_id']))
            ->when(isset($filters['status']), fn ($q) => $q->where('plan.status', $filters['status']));
        if (! empty($filters['search'])) $query->where(fn ($q) => $q->where('partner.name', 'like', '%'.trim($filters['search']).'%')->orWhere('plan.reference', 'like', '%'.trim($filters['search']).'%')->orWhere('container.container_number', 'like', '%'.trim($filters['search']).'%'));
        $page = $query->orderByDesc('plan.id')->paginate($filters['per_page'] ?? 20);
        $page->getCollection()->transform(fn (object $row): array => $this->planResource((int) $row->id, $row));
        return $page->toArray();
    }

    public function containerPartners(): array
    {
        return DB::table('container_partners')
            ->where('status', 'active')
            ->orderBy('name')
            ->orderBy('id')
            ->get(['id', 'name', 'phone', 'status'])
            ->map(static fn (object $partner): array => [
                'id' => (int) $partner->id,
                'name' => (string) $partner->name,
                'phone' => $partner->phone,
                'status' => (string) $partner->status,
            ])->all();
    }

    public function createContainerPartner(Request $request, array $values): array
    {
        $now = now();
        $id = (int) DB::table('container_partners')->insertGetId([
            'name' => trim($values['name']),
            'phone' => trim((string) ($values['phone'] ?? '')) ?: null,
            'status' => 'active',
            'created_by_user_id' => $this->actorId($request),
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        $after = DB::table('container_partners')->find($id);
        $this->auditLog->record($request, 'container_partner.created', 'container_partner', $id, null, null, (array) $after);

        return [
            'id' => (int) $after->id,
            'name' => (string) $after->name,
            'phone' => $after->phone,
            'status' => (string) $after->status,
        ];
    }

    public function createPartnerPlan(Request $request, array $values): array
    {
        $total = $this->cashAmount($values['total_amount']);
        if (ExactMoney::compare($this->cents($total), '0') <= 0) {
            throw ValidationException::withMessages(['total_amount' => ['Contribution must be greater than zero.']]);
        }
        $mode = $values['contribution_mode'] ?? 'manual';
        $scheduled = $mode === 'scheduled';
        $monthlyAmount = $scheduled ? $this->cashAmount((string) $values['installment_amount']) : $total;
        if (ExactMoney::compare($this->cents($monthlyAmount), '0') <= 0) {
            throw ValidationException::withMessages(['installment_amount' => ['Monthly installment must be greater than zero.']]);
        }
        if (ExactMoney::compare($this->cents($monthlyAmount), $this->cents($total)) > 0) {
            throw ValidationException::withMessages(['installment_amount' => ['Monthly installment cannot exceed the total contribution.']]);
        }
        $firstDueDate = $scheduled ? (string) $values['first_due_date'] : now()->toDateString();
        $id = DB::transaction(function () use ($request, $values, $total, $mode, $scheduled, $monthlyAmount, $firstDueDate): int {
            $partner = DB::table('container_partners')->where('id', $values['container_partner_id'])->lockForUpdate()->first();
            abort_if($partner === null || $partner->status !== 'active', 422, 'The selected partner is not active.');
            $now = now();
            $planId = (int) DB::table('partner_installment_plans')->insertGetId([
                'partner_id' => null, 'container_partner_id' => $partner->id, 'container_id' => $values['container_id'],
                'reference' => trim((string) ($values['reference'] ?? '')) ?: null,
                'total_amount' => $total, 'installment_amount' => $monthlyAmount,
                'first_due_date' => $firstDueDate, 'contribution_mode' => $mode, 'status' => 'active',
                'created_by_user_id' => $this->actorId($request), 'created_at' => $now, 'updated_at' => $now,
            ]);
            $remaining = $this->cents($total);
            $installmentCents = $this->cents($monthlyAmount);
            $firstDue = Carbon::parse($firstDueDate)->startOfDay();
            $dueDay = (int) $firstDue->day;
            $sequence = 1;
            while (ExactMoney::compare($remaining, '0') > 0) {
                if ($sequence > 600) {
                    throw ValidationException::withMessages(['installment_amount' => ['The monthly schedule cannot exceed 600 installments.']]);
                }
                $amount = ExactMoney::compare($remaining, $installmentCents) < 0 ? $remaining : $installmentCents;
                $dueDate = $firstDue->copy()->startOfMonth()->addMonthsNoOverflow($sequence - 1);
                $dueDate->day(min($dueDay, $dueDate->daysInMonth));
                DB::table('partner_installments')->insert([
                    'plan_id' => $planId, 'sequence_number' => $sequence, 'due_date' => $dueDate->toDateString(),
                    'amount' => ExactMoney::fromCents($amount), 'paid_amount' => '0.0000', 'created_at' => $now, 'updated_at' => $now,
                ]);
                $remaining = ExactMoney::subtract($remaining, $amount);
                $sequence++;
            }
            $this->auditLog->record($request, 'partner_installment_plan.created', 'partner_installment_plan', $planId, null, null, $this->planData($planId));
            return $planId;
        }, 5);
        return $this->partnerPlan($id);
    }

    public function partnerPlan(int $id): array
    {
        $plan = DB::table('partner_installment_plans as plan')->join('container_partners as partner', 'partner.id', '=', 'plan.container_partner_id')
            ->leftJoin('containers as container', 'container.id', '=', 'plan.container_id')
            ->where('plan.id', $id)->select(['plan.*', 'partner.name as partner_name', 'container.container_number'])->first();
        abort_if($plan === null, 404);
        return $this->planResource($id, $plan);
    }

    public function payPartnerPlan(Request $request, int $id, array $values): array
    {
        $amount = $this->cashAmount($values['amount']);
        $key = trim($values['idempotency_key']);
        return DB::transaction(function () use ($request, $id, $values, $amount, $key): array {
            $existing = DB::table('partner_installment_payments')->where('idempotency_key', $key)->lockForUpdate()->first();
            if ($existing !== null) {
                if ((int) $existing->plan_id !== $id
                    || (int) $existing->treasury_account_id !== (int) $values['treasury_account_id']
                    || $this->cents((string) $existing->amount) !== $this->cents($amount)
                    || (string) $existing->payment_date !== (string) $values['payment_date']
                    || trim((string) ($existing->notes ?? '')) !== trim((string) ($values['notes'] ?? ''))) {
                    throw new ConflictHttpException('The idempotency key was already used for different payment data.');
                }
                return $this->partnerPlan($id);
            }
            $plan = DB::table('partner_installment_plans')->where('id', $id)->lockForUpdate()->first();
            abort_if($plan === null, 404);
            if ($plan->status !== 'active') throw new ConflictHttpException('Only an active plan can receive payments.');
            $paid = DB::table('partner_installment_payments')->where('plan_id', $id)->sum('amount');
            $remaining = ExactMoney::subtract($this->cents((string) $plan->total_amount), $this->cents((string) $paid));
            $amountCents = $this->cents($amount);
            if (ExactMoney::compare($amountCents, $remaining) > 0) throw ValidationException::withMessages(['amount' => ['Payment cannot exceed the plan remaining amount.']]);
            $paymentId = (int) DB::table('partner_installment_payments')->insertGetId([
                'plan_id' => $id, 'treasury_account_id' => $values['treasury_account_id'], 'treasury_entry_id' => null,
                'amount' => $amount, 'payment_date' => $values['payment_date'], 'idempotency_key' => $key,
                'notes' => trim((string) ($values['notes'] ?? '')) ?: null, 'created_by_user_id' => $this->actorId($request), 'created_at' => now(),
            ]);
            $treasuryEntryId = $this->treasury->postTransaction($request, [
                'treasury_account_id' => (int) $values['treasury_account_id'], 'entry_type' => 'adjustment',
                'direction' => 'in', 'entry_date' => $values['payment_date'], 'amount_egp' => $amount,
                'source_type' => 'partner_installment_payment', 'source_id' => $paymentId,
                'description' => 'قسط شريك — خطة '.$id,
            ]);
            DB::table('partner_installment_payments')->where('id', $paymentId)->update(['treasury_entry_id' => $treasuryEntryId]);
            $left = $amountCents;
            foreach (DB::table('partner_installments')->where('plan_id', $id)->orderBy('sequence_number')->lockForUpdate()->get() as $installment) {
                if (ExactMoney::compare($left, '0') === 0) break;
                $due = ExactMoney::subtract($this->cents((string) $installment->amount), $this->cents((string) $installment->paid_amount));
                if (ExactMoney::compare($due, '0') <= 0) continue;
                $allocated = ExactMoney::compare($left, $due) < 0 ? $left : $due;
                $newPaid = ExactMoney::add($this->cents((string) $installment->paid_amount), $allocated);
                DB::table('partner_installments')->where('id', $installment->id)->update([
                    'paid_amount' => ExactMoney::fromCents($newPaid), 'paid_at' => ExactMoney::compare($newPaid, $this->cents((string) $installment->amount)) === 0 ? now() : null, 'updated_at' => now(),
                ]);
                $left = ExactMoney::subtract($left, $allocated);
            }
            $newPaidTotal = ExactMoney::add($this->cents((string) $paid), $amountCents);
            if (ExactMoney::compare($newPaidTotal, $this->cents((string) $plan->total_amount)) === 0) DB::table('partner_installment_plans')->where('id', $id)->update(['status' => 'completed', 'updated_at' => now()]);
            $this->auditLog->record($request, 'partner_installment.payment_received', 'partner_installment_plan', $id, trim((string) ($values['notes'] ?? '')) ?: null,
                ['paid_amount' => $paid, 'remaining_amount' => ExactMoney::fromCents($remaining)],
                ['paid_amount' => ExactMoney::fromCents($newPaidTotal), 'treasury_entry_id' => $treasuryEntryId]);
            return $this->partnerPlan($id);
        }, 5);
    }

    public function expenseBudgets(string $month): array
    {
        $start = Carbon::parse($month.'-01')->toDateString();
        $end = Carbon::parse($start)->endOfMonth()->toDateString();
        $categories = DB::table('expense_categories as category')->where('category.is_active', true)->orderBy('category.name')
            ->get(['category.id', 'category.name']);
        $rows = [];
        foreach ($categories as $category) {
            $budget = DB::table('expense_budgets')->where('expense_category_id', $category->id)->where('period_start', $start)->first();
            $actual = (string) DB::table('expenses')->where('expense_category_id', $category->id)->where('status', 'posted')->whereBetween('expense_date', [$start, $end])->sum('amount');
            $budgetUnits = $budget === null ? '0' : $this->cents((string) $budget->budget_amount);
            $actualUnits = $this->cents($actual);
            $difference = $budgetUnits === '0' ? null : $this->formatSignedCents(FinancialComparisonMath::difference($budgetUnits, $actualUnits));
            $rows[] = ['id' => $budget?->id, 'expense_category_id' => (int) $category->id, 'category_name' => $category->name,
                'period_start' => $start, 'budget_amount' => ExactMoney::fromCents($budgetUnits), 'actual_amount' => ExactMoney::fromCents($actualUnits),
                'remaining_amount' => $difference, 'usage_percent' => $budgetUnits === '0' ? null : FinancialComparisonMath::ratioPercent($actualUnits, $budgetUnits),
                'status' => $budgetUnits === '0' ? 'without_budget' : (ExactMoney::compare($actualUnits, $budgetUnits) >= 0 ? 'exceeded' : (ExactMoney::compare(ExactMoney::multiply($budgetUnits, '80'), ExactMoney::multiply($actualUnits, '100')) <= 0 ? 'near_limit' : 'normal')),
                'notes' => $budget?->notes];
        }
        return ['period_start' => $start, 'period_end' => $end, 'data' => $rows];
    }

    public function saveExpenseBudget(Request $request, array $values, ?int $id = null): array
    {
        $amount = $this->cashAmount($values['budget_amount'], true);
        $periodStart = Carbon::parse($values['period'].'-01')->toDateString();
        return DB::transaction(function () use ($request, $values, $id, $amount, $periodStart): array {
            $category = DB::table('expense_categories')->where('id', $values['expense_category_id'])->lockForUpdate()->first();
            abort_if($category === null || ! $category->is_active, 422, 'Select an active expense category.');
            $query = DB::table('expense_budgets')->where('expense_category_id', $category->id)->where('period_start', $periodStart);
            if ($id !== null) $query->where('id', $id);
            $before = $query->lockForUpdate()->first();
            if ($id !== null && $before === null) abort(404);
            $now = now();
            if ($before === null) {
                $id = (int) DB::table('expense_budgets')->insertGetId(['expense_category_id' => $category->id, 'period_start' => $periodStart, 'budget_amount' => $amount,
                    'notes' => trim((string) ($values['notes'] ?? '')) ?: null, 'created_by_user_id' => $this->actorId($request), 'updated_by_user_id' => $this->actorId($request), 'created_at' => $now, 'updated_at' => $now]);
                $action = 'expense_budget.created';
            } else {
                $id = (int) $before->id;
                DB::table('expense_budgets')->where('id', $id)->update(['budget_amount' => $amount, 'notes' => trim((string) ($values['notes'] ?? '')) ?: null, 'updated_by_user_id' => $this->actorId($request), 'updated_at' => $now]);
                $action = 'expense_budget.updated';
            }
            $after = (array) DB::table('expense_budgets')->where('id', $id)->first();
            $this->auditLog->record($request, $action, 'expense_budget', $id, null, $before === null ? null : (array) $before, $after);
            return $after;
        }, 5);
    }

    public function recurringExpenses(): array
    {
        $templates = DB::table('recurring_expense_templates as template')->join('expense_categories as category', 'category.id', '=', 'template.expense_category_id')
            ->select(['template.*', 'category.name as category_name'])->orderByDesc('template.id')->get();
        return ['data' => $templates->map(fn (object $template): array => $this->templateResource($template))->values()->all()];
    }

    public function createRecurringExpense(Request $request, array $values): array
    {
        $amount = $this->cashAmount($values['amount']);
        $id = DB::transaction(function () use ($request, $values, $amount): int {
            $category = DB::table('expense_categories')->where('id', $values['expense_category_id'])->lockForUpdate()->first();
            abort_if($category === null || ! $category->is_active, 422, 'Select an active expense category.');
            $now = now();
            $id = (int) DB::table('recurring_expense_templates')->insertGetId([
                'name' => trim($values['name']), 'expense_category_id' => $category->id, 'amount' => $amount,
                'due_day' => $values['due_day'], 'start_date' => $values['start_date'], 'status' => 'active',
                'notes' => trim((string) ($values['notes'] ?? '')) ?: null,
                'created_by_user_id' => $this->actorId($request), 'updated_by_user_id' => $this->actorId($request), 'created_at' => $now, 'updated_at' => $now,
            ]);
            $this->auditLog->record($request, 'recurring_expense_template.created', 'recurring_expense_template', $id, null, null, (array) DB::table('recurring_expense_templates')->where('id', $id)->first());
            return $id;
        }, 5);
        return $this->recurringExpense($id);
    }

    public function updateRecurringExpense(Request $request, int $id, array $values): array
    {
        return DB::transaction(function () use ($request, $id, $values): array {
            $template = DB::table('recurring_expense_templates')->where('id', $id)->lockForUpdate()->first();
            abort_if($template === null, 404);
            if ($template->status !== 'active') throw new ConflictHttpException('Only an active template can be updated.');
            if (DB::table('recurring_expense_occurrences')->where('template_id', $id)->exists()) throw new ConflictHttpException('A template cannot be changed after a cycle is generated. Stop it and create a new template.');
            $changes = [];
            foreach (['name', 'expense_category_id', 'due_day', 'start_date', 'notes'] as $field) if (array_key_exists($field, $values)) $changes[$field] = $values[$field];
            if (array_key_exists('amount', $values)) $changes['amount'] = $this->cashAmount($values['amount']);
            if (isset($changes['expense_category_id'])) {
                $category = DB::table('expense_categories')->where('id', $changes['expense_category_id'])->first();
                abort_if($category === null || ! $category->is_active, 422, 'Select an active expense category.');
            }
            DB::table('recurring_expense_templates')->where('id', $id)->update([...$changes, 'updated_by_user_id' => $this->actorId($request), 'updated_at' => now()]);
            $this->auditLog->record($request, 'recurring_expense_template.updated', 'recurring_expense_template', $id, null, (array) $template, (array) DB::table('recurring_expense_templates')->where('id', $id)->first());
            return $this->recurringExpense($id);
        }, 5);
    }

    public function stopRecurringExpense(Request $request, int $id, string $reason): array
    {
        DB::transaction(function () use ($request, $id, $reason): void {
            $template = DB::table('recurring_expense_templates')->where('id', $id)->lockForUpdate()->first();
            abort_if($template === null, 404);
            if ($template->status !== 'active') throw new ConflictHttpException('This recurring expense is already stopped.');
            DB::table('recurring_expense_templates')->where('id', $id)->update(['status' => 'stopped', 'stopped_at' => now(), 'updated_by_user_id' => $this->actorId($request), 'updated_at' => now()]);
            $this->auditLog->record($request, 'recurring_expense_template.stopped', 'recurring_expense_template', $id, trim($reason), (array) $template, (array) DB::table('recurring_expense_templates')->where('id', $id)->first());
        }, 5);
        return $this->recurringExpense($id);
    }

    public function recurringExpense(int $id): array
    {
        $template = DB::table('recurring_expense_templates as template')->join('expense_categories as category', 'category.id', '=', 'template.expense_category_id')
            ->where('template.id', $id)->select(['template.*', 'category.name as category_name'])->first();
        abort_if($template === null, 404);
        $resource = $this->templateResource($template);
        $resource['audit'] = DB::table('audit_logs')->where('entity_type', 'recurring_expense_template')->where('entity_id', $id)->orderBy('created_at')->get()->toArray();
        return $resource;
    }

    public function materializeRecurringExpenses(?string $throughDate = null): int
    {
        $date = Carbon::parse($throughDate ?? now()->toDateString())->startOfDay();
        return DB::transaction(function () use ($date): int {
            $created = 0;
            $templates = DB::table('recurring_expense_templates')->where('status', 'active')->whereDate('start_date', '<=', $date->toDateString())->orderBy('id')->lockForUpdate()->get();
            foreach ($templates as $template) {
                $month = Carbon::parse($template->start_date)->startOfMonth();
                $through = $date->copy()->startOfMonth();
                while ($month->lessThanOrEqualTo($through)) {
                    $dueDay = min((int) $template->due_day, $month->daysInMonth);
                    $dueDate = $month->copy()->day($dueDay);
                    if ($dueDate->lessThanOrEqualTo($date) && $dueDate->greaterThanOrEqualTo(Carbon::parse($template->start_date))) {
                        $periodStart = $month->toDateString();
                        $inserted = DB::table('recurring_expense_occurrences')->insertOrIgnore([
                            'template_id' => $template->id, 'period_start' => $periodStart, 'due_date' => $dueDate->toDateString(),
                            'amount' => $template->amount, 'status' => 'due', 'created_by_user_id' => null, 'created_at' => now(), 'updated_at' => now(),
                        ]);
                        if ($inserted > 0) {
                            $created++;
                            $occurrenceId = (int) DB::table('recurring_expense_occurrences')->where('template_id', $template->id)->where('period_start', $periodStart)->value('id');
                            $this->systemAudit('recurring_expense_occurrence.generated', 'recurring_expense_occurrence', $occurrenceId, null,
                                ['template_id' => (int) $template->id, 'period_start' => $periodStart, 'due_date' => $dueDate->toDateString(), 'amount' => $template->amount]);
                        }
                    }
                    $month->addMonthNoOverflow();
                }
            }
            return $created;
        }, 5);
    }

    public function postRecurringOccurrence(Request $request, int $occurrenceId, array $values): array
    {
        return DB::transaction(function () use ($request, $occurrenceId, $values): array {
            $occurrence = DB::table('recurring_expense_occurrences')->where('id', $occurrenceId)->lockForUpdate()->first();
            abort_if($occurrence === null, 404);
            if ($occurrence->status === 'posted' && $occurrence->expense_id !== null) return $this->occurrenceResource($occurrenceId);
            if ($occurrence->status !== 'due') throw new ConflictHttpException('Only a due occurrence can be posted.');
            $template = DB::table('recurring_expense_templates')->where('id', $occurrence->template_id)->first();
            $expenseId = $this->treasury->postExpense($request, [
                'expense_date' => $occurrence->due_date,
                'treasury_account_id' => $values['treasury_account_id'],
                'expense_category_id' => (int) $template->expense_category_id,
                'amount_egp' => (string) $occurrence->amount,
                'description' => $template->name,
                'reference' => 'REC-'.$template->id.'-'.$occurrence->period_start,
            ]);
            DB::table('recurring_expense_occurrences')->where('id', $occurrenceId)->update(['status' => 'posted', 'expense_id' => $expenseId, 'updated_at' => now()]);
            $this->auditLog->record($request, 'recurring_expense_occurrence.posted', 'recurring_expense_occurrence', $occurrenceId, null,
                (array) $occurrence, ['status' => 'posted', 'expense_id' => $expenseId]);
            return $this->occurrenceResource($occurrenceId);
        }, 5);
    }

    public function occurrenceResource(int $id): array
    {
        $row = DB::table('recurring_expense_occurrences as occurrence')->join('recurring_expense_templates as template', 'template.id', '=', 'occurrence.template_id')
            ->join('expense_categories as category', 'category.id', '=', 'template.expense_category_id')->leftJoin('expenses as expense', 'expense.id', '=', 'occurrence.expense_id')
            ->where('occurrence.id', $id)->select(['occurrence.*', 'template.name as template_name', 'category.name as category_name', 'expense.expense_number'])->first();
        abort_if($row === null, 404);
        return ['id' => (int) $row->id, 'template_id' => (int) $row->template_id, 'template_name' => $row->template_name,
            'expense_category_name' => $row->category_name, 'period_start' => (string) $row->period_start, 'due_date' => (string) $row->due_date,
            'amount' => (string) $row->amount, 'status' => $row->status, 'expense_id' => $row->expense_id === null ? null : (int) $row->expense_id,
            'expense_number' => $row->expense_number];
    }

    public function monthlyComparison(string $monthA, string $monthB): array
    {
        $a = $this->monthMetrics($monthA);
        $b = $this->monthMetrics($monthB);
        $metrics = [];
        foreach (['sales', 'expenses', 'profit'] as $key) {
            $delta = $this->formatSignedCents(FinancialComparisonMath::difference($a[$key.'_cents'], $b[$key.'_cents']));
            $baseline = $b[$key.'_cents'];
            $percent = FinancialComparisonMath::percentChange($a[$key.'_cents'], $baseline);
            $metrics[$key] = ['month_a' => $a[$key], 'month_b' => $b[$key], 'difference' => $delta, 'change_percent' => $percent];
        }
        return ['month_a' => $monthA, 'month_b' => $monthB, 'periods' => ['a' => $a['period'], 'b' => $b['period']], 'metrics' => $metrics];
    }

    public function cashForecast(string $fromDate, int $weeks = 8): array
    {
        $weeks = min(12, max(1, $weeks));
        $start = Carbon::parse($fromDate)->startOfDay();
        $end = $start->copy()->addDays($weeks * 7 - 1);
        $opening = '0';
        foreach (DB::table('treasury_entries')->whereDate('entry_date', '<', $start->toDateString())->get(['direction', 'amount']) as $entry) {
            $amount = $this->cents((string) $entry->amount);
            $opening = $entry->direction === 'in' ? $this->signedAdd($opening, $amount) : $this->signedAdd($opening, '-'.$amount);
        }

        $pending = DB::table('pending_funds')->whereIn('status', ['pending', 'partially_received'])->whereBetween('due_date', [$start->toDateString(), $end->toDateString()])->get();
        $installments = DB::table('partner_installments as installment')->join('partner_installment_plans as plan', 'plan.id', '=', 'installment.plan_id')
            ->where('plan.status', 'active')->where('plan.contribution_mode', 'scheduled')
            ->whereBetween('installment.due_date', [$start->toDateString(), $end->toDateString()])->get(['installment.*', 'plan.container_partner_id', 'plan.id as plan_id']);
        $occurrences = DB::table('recurring_expense_occurrences as occurrence')
            ->join('recurring_expense_templates as template', 'template.id', '=', 'occurrence.template_id')
            ->whereBetween('occurrence.due_date', [$start->toDateString(), $end->toDateString()])
            ->get(['occurrence.*', 'template.name as template_name']);
        $recurringObligations = $occurrences->where('status', 'due')->map(fn (object $row): object => (object) [
            'id' => (int) $row->id,
            'template_id' => (int) $row->template_id,
            'template_name' => $row->template_name,
            'period_start' => (string) $row->period_start,
            'due_date' => (string) $row->due_date,
            'amount' => (string) $row->amount,
            'projected' => false,
        ])->all();
        $materializedCycles = [];
        foreach ($occurrences as $occurrence) {
            $materializedCycles[(int) $occurrence->template_id.'|'.(string) $occurrence->period_start] = true;
        }
        $templates = DB::table('recurring_expense_templates')
            ->where('status', 'active')
            ->whereDate('start_date', '<=', $end->toDateString())
            ->orderBy('id')
            ->get(['id', 'name', 'amount', 'due_day', 'start_date']);
        $month = $start->copy()->startOfMonth();
        while ($month->lessThanOrEqualTo($end)) {
            $periodStart = $month->toDateString();
            foreach ($templates as $template) {
                if (isset($materializedCycles[(int) $template->id.'|'.$periodStart])) continue;
                $dueDate = $month->copy()->day(min((int) $template->due_day, $month->daysInMonth));
                if ($dueDate->lessThan($start) || $dueDate->greaterThan($end)
                    || $dueDate->lessThan(Carbon::parse($template->start_date))) continue;
                $recurringObligations[] = (object) [
                    'id' => (int) $template->id,
                    'template_id' => (int) $template->id,
                    'template_name' => $template->name,
                    'period_start' => $periodStart,
                    'due_date' => $dueDate->toDateString(),
                    'amount' => (string) $template->amount,
                    'projected' => true,
                ];
            }
            $month->addMonthNoOverflow();
        }
        $actualEntries = DB::table('treasury_entries')->whereDate('entry_date', '>=', $start->toDateString())->whereDate('entry_date', '<=', $end->toDateString())->orderBy('entry_date')->get(['direction', 'amount', 'entry_date', 'description']);
        $budgetByMonth = $this->forecastBudgetRemaining($start, $end, $recurringObligations);
        $weeksData = [];
        $running = $opening;
        for ($index = 0; $index < $weeks; $index++) {
            $weekStart = $index === 0 ? $start->copy() : $start->copy()->addDays($index * 7);
            $weekEnd = $weekStart->copy()->addDays(6);
            if ($weekEnd->greaterThan($end)) $weekEnd = $end->copy();
            $actualIn = $actualOut = $pendingIn = $partnerIn = $recurringOut = $budgetOut = '0';
            foreach ($actualEntries as $entry) {
                if ((string) $entry->entry_date < $weekStart->toDateString() || (string) $entry->entry_date > $weekEnd->toDateString()) continue;
                if ($entry->direction === 'in') $actualIn = ExactMoney::add($actualIn, $this->cents((string) $entry->amount));
                else $actualOut = ExactMoney::add($actualOut, $this->cents((string) $entry->amount));
            }
            $pendingSources = [];
            foreach ($pending as $fund) {
                if ((string) $fund->due_date < $weekStart->toDateString() || (string) $fund->due_date > $weekEnd->toDateString()) continue;
                $remaining = ExactMoney::subtract($this->cents((string) $fund->amount), $this->cents((string) $fund->received_amount));
                $pendingIn = ExactMoney::add($pendingIn, $remaining);
                $pendingSources[] = ['type' => 'pending_fund', 'id' => (int) $fund->id, 'source' => $fund->source_label, 'due_date' => (string) $fund->due_date, 'amount' => ExactMoney::fromCents($remaining)];
            }
            $partnerSources = [];
            foreach ($installments as $installment) {
                if ((string) $installment->due_date < $weekStart->toDateString() || (string) $installment->due_date > $weekEnd->toDateString()) continue;
                $remaining = ExactMoney::subtract($this->cents((string) $installment->amount), $this->cents((string) $installment->paid_amount));
                if (ExactMoney::compare($remaining, '0') <= 0) continue;
                $partnerIn = ExactMoney::add($partnerIn, $remaining);
                $partnerSources[] = ['type' => 'partner_installment', 'id' => (int) $installment->id, 'plan_id' => (int) $installment->plan_id, 'due_date' => (string) $installment->due_date, 'amount' => ExactMoney::fromCents($remaining)];
            }
            $recurringSources = [];
            foreach ($recurringObligations as $occurrence) {
                if ((string) $occurrence->due_date < $weekStart->toDateString() || (string) $occurrence->due_date > $weekEnd->toDateString()) continue;
                $recurringOut = ExactMoney::add($recurringOut, $this->cents((string) $occurrence->amount));
                $recurringSources[] = [
                    'type' => $occurrence->projected ? 'recurring_template' : 'recurring_expense',
                    'id' => (int) $occurrence->id,
                    'template_id' => (int) $occurrence->template_id,
                    'template_name' => $occurrence->template_name,
                    'period_start' => (string) $occurrence->period_start,
                    'due_date' => (string) $occurrence->due_date,
                    'amount' => (string) $occurrence->amount,
                    'projected' => $occurrence->projected,
                ];
            }
            $dayCursor = $weekStart->copy();
            while ($dayCursor->lessThanOrEqualTo($weekEnd)) {
                $key = $dayCursor->format('Y-m');
                $budgetOut = ExactMoney::add(
                    $budgetOut,
                    $this->cents($budgetByMonth[$key][$dayCursor->toDateString()] ?? '0.00'),
                );
                $dayCursor->addDay();
            }
            $in = ExactMoney::add(ExactMoney::add($actualIn, $pendingIn), $partnerIn);
            $out = ExactMoney::add(ExactMoney::add($actualOut, $recurringOut), $budgetOut);
            $net = ExactMoney::compare($in, $out) >= 0 ? ExactMoney::fromCents(ExactMoney::subtract($in, $out)) : '-'.ExactMoney::fromCents(ExactMoney::subtract($out, $in));
            $running = $this->signedAdd($running, ExactMoney::compare($in, $out) >= 0 ? ExactMoney::subtract($in, $out) : '-'.ExactMoney::subtract($out, $in));
            $weeksData[] = ['index' => $index + 1, 'from_date' => $weekStart->toDateString(), 'to_date' => $weekEnd->toDateString(),
                'actual_inflows' => ExactMoney::fromCents($actualIn), 'actual_outflows' => ExactMoney::fromCents($actualOut),
                'pending_funds' => ExactMoney::fromCents($pendingIn), 'partner_installments' => ExactMoney::fromCents($partnerIn),
                'recurring_expenses' => ExactMoney::fromCents($recurringOut), 'budgeted_expenses' => ExactMoney::fromCents($budgetOut),
                'net_flow' => $net, 'projected_closing_balance' => $this->formatSignedCents($running),
                'sources' => ['pending_funds' => $pendingSources, 'partner_installments' => $partnerSources, 'recurring_expenses' => $recurringSources]];
        }
        return ['as_of' => $start->toDateString(), 'weeks' => $weeksData, 'actual_opening_balance' => $this->formatSignedCents($opening), 'projected_closing_balance' => $this->formatSignedCents($running)];
    }

    private function forecastBudgetRemaining(Carbon $start, Carbon $end, array $recurringObligations): array
    {
        $result = [];
        $month = $start->copy()->startOfMonth();
        while ($month->lessThanOrEqualTo($end)) {
            $monthEnd = $month->copy()->endOfMonth();
            $monthKey = $month->format('Y-m');
            $budget = '0';
            foreach (DB::table('expense_budgets')->where('period_start', $month->toDateString())->get(['budget_amount']) as $row) $budget = ExactMoney::add($budget, $this->cents((string) $row->budget_amount));
            $actual = $this->cents((string) DB::table('expenses')->where('status', 'posted')->whereBetween('expense_date', [$month->toDateString(), $monthEnd->toDateString()])->sum('amount'));
            $planned = '0';
            foreach ($recurringObligations as $obligation) {
                if ((string) $obligation->due_date >= $month->toDateString() && (string) $obligation->due_date <= $monthEnd->toDateString()) {
                    $planned = ExactMoney::add($planned, $this->cents((string) $obligation->amount));
                }
            }
            $used = ExactMoney::add($actual, $planned);
            $remaining = ExactMoney::compare($budget, $used) > 0 ? ExactMoney::subtract($budget, $used) : '0';
            $firstFuture = $month->copy()->greaterThan($start) ? $month->copy() : $start->copy();
            if ($firstFuture->lessThanOrEqualTo($monthEnd)) {
                $days = (int) $firstFuture->diffInDays($monthEnd) + 1;
                $basePerDay = ExactMoney::divideRounded($remaining, $days);
                $allocated = ExactMoney::multiply($basePerDay, $days);
                if (ExactMoney::compare($allocated, $remaining) > 0) {
                    $basePerDay = ExactMoney::subtract($basePerDay, '1');
                    $allocated = ExactMoney::multiply($basePerDay, $days);
                }
                $extraDays = (int) ExactMoney::subtract($remaining, $allocated);
                $extraAccumulator = 0;
                $cursor = $firstFuture->copy();
                for ($day = 0; $day < $days; $day++) {
                    $extraAccumulator += $extraDays;
                    $dailyBudget = $basePerDay;
                    if ($extraAccumulator >= $days) {
                        $dailyBudget = ExactMoney::add($dailyBudget, '1');
                        $extraAccumulator -= $days;
                    }
                    $result[$monthKey][$cursor->toDateString()] = ExactMoney::fromCents(
                        $dailyBudget,
                    );
                    $cursor->addDay();
                }
            }
            $month->addMonthNoOverflow();
        }
        return $result;
    }

    private function monthMetrics(string $month): array
    {
        $start = Carbon::parse($month.'-01')->toDateString();
        $end = Carbon::parse($start)->endOfMonth()->toDateString();
        $sales = '0';
        foreach (DB::table('sales_documents')->where('status', 'posted')->whereIn('document_type', ['invoice', 'credit_note'])->whereBetween('issue_date', [$start, $end])->get(['document_type', 'total_amount']) as $document) {
            $cents = $this->cents((string) $document->total_amount);
            $sales = $this->signedAdd($sales, $document->document_type === 'credit_note' ? '-'.$cents : $cents);
        }
        $expenses = $this->cents((string) DB::table('expenses')->where('status', 'posted')->whereBetween('expense_date', [$start, $end])->sum('amount'));
        $profit = $this->signedAdd($sales, '-'.$expenses);
        return ['period' => ['from_date' => $start, 'to_date' => $end], 'sales' => $this->formatSignedCents($sales), 'sales_cents' => $sales,
            'expenses' => ExactMoney::fromCents($expenses), 'expenses_cents' => $expenses, 'profit' => $this->formatSignedCents($profit), 'profit_cents' => $profit];
    }

    private function planResource(int $id, ?object $summary = null): array
    {
        $plan = $summary ?? DB::table('partner_installment_plans as plan')->join('container_partners as partner', 'partner.id', '=', 'plan.container_partner_id')->leftJoin('containers as container', 'container.id', '=', 'plan.container_id')->where('plan.id', $id)->select(['plan.*', 'partner.name as partner_name', 'container.container_number'])->first();
        abort_if($plan === null, 404);
        $installments = DB::table('partner_installments')->where('plan_id', $id)->orderBy('sequence_number')->get();
        $payments = DB::table('partner_installment_payments')->where('plan_id', $id)->orderBy('payment_date')->orderBy('id')->get();
        $paid = '0'; $remaining = '0'; $next = null; $overdue = '0'; $today = now()->toDateString();
        foreach ($installments as $row) {
            $due = ExactMoney::subtract($this->cents((string) $row->amount), $this->cents((string) $row->paid_amount));
            $paid = ExactMoney::add($paid, $this->cents((string) $row->paid_amount));
            $remaining = ExactMoney::add($remaining, $due);
            if (ExactMoney::compare($due, '0') > 0 && $next === null) $next = ['id' => (int) $row->id, 'due_date' => (string) $row->due_date, 'amount' => ExactMoney::fromCents($due)];
            if ((string) $row->due_date < $today) $overdue = ExactMoney::add($overdue, $due);
        }
        $installmentData = [];
        $cumPaid = $paid;
        foreach ($installments as $row) {
            $amountDue = $this->cents((string) $row->amount); $amountPaid = $this->cents((string) $row->paid_amount);
            $status = ExactMoney::compare($amountPaid, $amountDue) === 0 ? 'paid' : ((string) $row->due_date < $today ? 'overdue' : 'upcoming');
            $installmentData[] = ['id' => (int) $row->id, 'sequence_number' => (int) $row->sequence_number, 'due_date' => (string) $row->due_date,
                'amount' => ExactMoney::fromCents($amountDue), 'paid_amount' => ExactMoney::fromCents($amountPaid),
                'remaining_amount' => ExactMoney::fromCents(ExactMoney::subtract($amountDue, $amountPaid)), 'status' => $status];
        }
        return ['id' => $id, 'partner_id' => $plan->partner_id === null ? null : (int) $plan->partner_id,
            'container_partner_id' => (int) $plan->container_partner_id, 'partner_name' => $plan->partner_name,
            'container_partner_name' => $plan->partner_name, 'container_id' => $plan->container_id === null ? null : (int) $plan->container_id,
            'container_number' => $plan->container_number, 'reference' => $plan->reference, 'total_amount' => ExactMoney::fromCents($this->cents((string) $plan->total_amount)),
            'contribution_mode' => $plan->contribution_mode ?? 'scheduled',
            'installment_amount' => ExactMoney::fromCents($this->cents((string) $plan->installment_amount)), 'first_due_date' => (string) $plan->first_due_date, 'status' => $plan->status,
            'paid_amount' => ExactMoney::fromCents($paid), 'remaining_amount' => ExactMoney::fromCents($remaining),
            'next_installment' => $next, 'overdue_amount' => ExactMoney::fromCents($overdue), 'installments' => $installmentData,
            'payments' => $payments->toArray()];
    }

    private function pendingFundResource(object $row): array
    {
        $amount = $this->cents((string) $row->amount); $received = $this->cents((string) $row->received_amount);
        return ['id' => (int) $row->id, 'partner_id' => (int) $row->partner_id, 'partner_name' => $row->partner_name,
            'source_label' => $row->source_label, 'source_reference' => $row->source_reference, 'description' => $row->description,
            'due_date' => (string) $row->due_date, 'amount' => ExactMoney::fromCents($amount), 'received_amount' => ExactMoney::fromCents($received),
            'remaining_amount' => ExactMoney::fromCents(ExactMoney::subtract($amount, $received)), 'status' => $row->status];
    }

    private function templateResource(object $template): array
    {
        $occurrences = DB::table('recurring_expense_occurrences as occurrence')->leftJoin('expenses as expense', 'expense.id', '=', 'occurrence.expense_id')
            ->where('occurrence.template_id', $template->id)->orderByDesc('occurrence.due_date')->limit(36)
            ->get(['occurrence.id', 'occurrence.period_start', 'occurrence.due_date', 'occurrence.amount', 'occurrence.status', 'occurrence.expense_id', 'expense.expense_number']);
        return ['id' => (int) $template->id, 'name' => $template->name, 'expense_category_id' => (int) $template->expense_category_id,
            'expense_category_name' => $template->category_name, 'amount' => (string) $template->amount, 'due_day' => (int) $template->due_day,
            'start_date' => (string) $template->start_date, 'status' => $template->status, 'notes' => $template->notes,
            'occurrences' => $occurrences->toArray()];
    }

    private function pendingFundData(int $id): array
    {
        return (array) DB::table('pending_funds')->where('id', $id)->first();
    }

    private function planData(int $id): array
    {
        return ['plan' => (array) DB::table('partner_installment_plans')->where('id', $id)->first(), 'installments' => DB::table('partner_installments')->where('plan_id', $id)->orderBy('sequence_number')->get()->toArray()];
    }

    private function cents(string $amount): string { return ExactMoney::toCents($amount); }
    private function cashAmount(string $amount, bool $allowZero = false): string
    {
        $cents = $this->cents($amount);
        if (! $allowZero && ExactMoney::compare($cents, '0') <= 0) throw ValidationException::withMessages(['amount' => ['The amount must be greater than zero.']]);
        return ExactMoney::fromCents($cents);
    }
    private function formatSignedCents(string $amount): string
    {
        if (! str_starts_with($amount, '-')) return ExactMoney::fromCents($amount);
        return '-'.ExactMoney::fromCents(substr($amount, 1));
    }
    private function signedAdd(string $left, string $right): string
    {
        $ln = str_starts_with($left, '-'); $rn = str_starts_with($right, '-');
        $lm = $ln ? substr($left, 1) : $left; $rm = $rn ? substr($right, 1) : $right;
        if ($ln === $rn) { $sum = ExactMoney::add($lm, $rm); return $ln && $sum !== '0' ? '-'.$sum : $sum; }
        $cmp = ExactMoney::compare($lm, $rm); if ($cmp === 0) return '0';
        if ($cmp > 0) { $diff = ExactMoney::subtract($lm, $rm); return $ln ? '-'.$diff : $diff; }
        $diff = ExactMoney::subtract($rm, $lm); return $rn ? '-'.$diff : $diff;
    }
    private function actorId(Request $request): ?int
    {
        $actor = $request->attributes->get('authenticated_user');
        return is_object($actor) && isset($actor->id) ? (int) $actor->id : null;
    }
    private function systemAudit(string $action, string $entity, int $id, ?string $reason, array $after): void
    {
        DB::table('audit_logs')->insert(['actor_user_id' => null, 'actor_name_snapshot' => 'Scheduler', 'action' => $action,
            'entity_type' => $entity, 'entity_id' => $id, 'reason' => $reason, 'before_data' => null,
            'after_data' => json_encode($after, JSON_THROW_ON_ERROR), 'created_at' => now()]);
    }
}
