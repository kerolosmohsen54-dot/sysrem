<?php

namespace App\Http\Controllers;

use App\Models\ExpenseBudget;
use App\Models\PartnerInstallmentPlan;
use App\Models\PendingFund;
use App\Models\RecurringExpenseTemplate;
use App\Services\FinancialPlanningService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class FinancialPlanningController extends Controller
{
    public function __construct(private readonly FinancialPlanningService $planning) {}

    public function planningOptions(Request $request): JsonResponse
    {
        $user = $request->attributes->get('authenticated_user');
        abort_unless(is_object($user), 401);
        Gate::forUser($user)->authorize('viewOptions', PendingFund::class);

        return response()->json(['data' => $this->planning->planningOptions()]);
    }

    public function pendingFunds(Request $request): JsonResponse
    {
        $this->authorizeFinance($request, 'viewPendingFunds', PendingFund::class);
        $filters = $request->validate([
            'search' => ['sometimes', 'nullable', 'string', 'max:160'], 'status' => ['sometimes', Rule::in(['pending', 'partially_received', 'received', 'cancelled'])],
            'partner_id' => ['sometimes', 'integer', 'min:1', 'exists:partners,id'], 'from_date' => ['sometimes', 'date_format:Y-m-d'],
            'to_date' => ['sometimes', 'date_format:Y-m-d', 'after_or_equal:from_date'], 'page' => ['sometimes', 'integer', 'min:1'], 'per_page' => ['sometimes', 'integer', 'between:1,100'],
        ]);
        return response()->json($this->planning->pendingFunds($filters));
    }

    public function createPendingFund(Request $request): JsonResponse
    {
        $this->authorizeFinance($request, 'managePendingFunds', PendingFund::class);
        $values = $request->validate([
            'partner_id' => ['required', 'integer', 'min:1', 'exists:partners,id'], 'source_label' => ['required', 'string', 'max:180'],
            'source_reference' => ['nullable', 'string', 'max:160'], 'description' => ['required', 'string', 'max:500'], 'due_date' => ['required', 'date_format:Y-m-d'],
            'amount' => ['required', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,4})?\z/'],
        ]);
        return response()->json(['data' => $this->planning->createPendingFund($request, $values)], 201);
    }

    public function showPendingFund(Request $request, int $id): JsonResponse
    {
        $this->authorizeFinance($request, 'viewPendingFunds', PendingFund::class);
        return response()->json(['data' => $this->planning->pendingFund($id)]);
    }

    public function receivePendingFund(Request $request, int $id): JsonResponse
    {
        $this->authorizeFinance($request, 'receivePendingFunds', PendingFund::class);
        $values = $request->validate([
            'treasury_account_id' => ['required', 'integer', 'min:1', 'exists:treasury_accounts,id'],
            'amount' => ['required', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,4})?\z/'],
            'received_date' => ['required', 'date_format:Y-m-d'], 'idempotency_key' => ['required', 'string', 'max:200'],
        ]);
        return response()->json(['data' => $this->planning->receivePendingFund($request, $id, $values)]);
    }

    public function cancelPendingFund(Request $request, int $id): JsonResponse
    {
        $this->authorizeFinance($request, 'managePendingFunds', PendingFund::class);
        $values = $request->validate(['reason' => ['required', 'string', 'min:3', 'max:500']]);
        return response()->json(['data' => $this->planning->cancelPendingFund($request, $id, $values['reason'])]);
    }

    public function partnerPlans(Request $request): JsonResponse
    {
        $this->authorizeFinance($request, 'viewPartnerInstallments', PartnerInstallmentPlan::class);
        $filters = $request->validate([
            'search' => ['sometimes', 'nullable', 'string', 'max:160'], 'container_partner_id' => ['sometimes', 'integer', 'min:1', 'exists:container_partners,id'],
            'status' => ['sometimes', Rule::in(['active', 'completed', 'stopped'])], 'page' => ['sometimes', 'integer', 'min:1'], 'per_page' => ['sometimes', 'integer', 'between:1,100'],
        ]);
        return response()->json($this->planning->partnerPlans($filters));
    }

    public function containerPartners(Request $request): JsonResponse
    {
        $this->authorizeFinance($request, 'viewPartnerInstallments', PartnerInstallmentPlan::class);
        return response()->json(['data' => $this->planning->containerPartners()]);
    }

    public function createContainerPartner(Request $request): JsonResponse
    {
        $this->authorizeFinance($request, 'managePartnerInstallments', PartnerInstallmentPlan::class);
        $values = $request->validate([
            'name' => ['required', 'string', 'max:160'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:80'],
        ]);
        return response()->json(['data' => $this->planning->createContainerPartner($request, $values)], 201);
    }

    public function createPartnerPlan(Request $request): JsonResponse
    {
        $this->authorizeFinance($request, 'managePartnerInstallments', PartnerInstallmentPlan::class);
        $values = $request->validate([
            'container_partner_id' => ['required', 'integer', 'min:1', 'exists:container_partners,id'],
            'container_id' => ['required', 'integer', 'min:1', 'exists:containers,id'],
            'reference' => ['nullable', 'string', 'max:160'], 'total_amount' => ['required', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,4})?\z/'],
            'contribution_mode' => ['sometimes', Rule::in(['manual', 'scheduled'])],
            'installment_amount' => ['required_if:contribution_mode,scheduled', 'nullable', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,4})?\z/'],
            'first_due_date' => ['required_if:contribution_mode,scheduled', 'nullable', 'date_format:Y-m-d'],
        ]);
        return response()->json(['data' => $this->planning->createPartnerPlan($request, $values)], 201);
    }

    public function showPartnerPlan(Request $request, int $id): JsonResponse
    {
        $this->authorizeFinance($request, 'viewPartnerInstallments', PartnerInstallmentPlan::class);
        return response()->json(['data' => $this->planning->partnerPlan($id)]);
    }

    public function payPartnerPlan(Request $request, int $id): JsonResponse
    {
        $this->authorizeFinance($request, 'receivePartnerInstallments', PartnerInstallmentPlan::class);
        $values = $request->validate([
            'treasury_account_id' => ['required', 'integer', 'min:1', 'exists:treasury_accounts,id'], 'amount' => ['required', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,4})?\z/'],
            'payment_date' => ['required', 'date_format:Y-m-d'], 'idempotency_key' => ['required', 'string', 'max:200'], 'notes' => ['nullable', 'string', 'max:500'],
        ]);
        return response()->json(['data' => $this->planning->payPartnerPlan($request, $id, $values)]);
    }

    public function expenseBudgets(Request $request): JsonResponse
    {
        $this->authorizeFinance($request, 'viewExpenseBudgets', ExpenseBudget::class);
        $values = $request->validate(['period' => ['required', 'date_format:Y-m']]);
        return response()->json($this->planning->expenseBudgets($values['period']));
    }

    public function saveExpenseBudget(Request $request, ?int $id = null): JsonResponse
    {
        $this->authorizeFinance($request, 'manageExpenseBudgets', ExpenseBudget::class);
        $values = $request->validate([
            'expense_category_id' => ['required', 'integer', 'min:1', 'exists:expense_categories,id'], 'period' => ['required', 'date_format:Y-m'],
            'budget_amount' => ['required', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,4})?\z/'], 'notes' => ['nullable', 'string', 'max:500'],
        ]);
        return response()->json(['data' => $this->planning->saveExpenseBudget($request, $values, $id)], $id === null ? 201 : 200);
    }

    public function recurringExpenses(Request $request): JsonResponse
    {
        $this->authorizeFinance($request, 'viewRecurringExpenses', RecurringExpenseTemplate::class);
        return response()->json($this->planning->recurringExpenses());
    }

    public function createRecurringExpense(Request $request): JsonResponse
    {
        $this->authorizeFinance($request, 'manageRecurringExpenses', RecurringExpenseTemplate::class);
        return response()->json(['data' => $this->planning->createRecurringExpense($request, $this->recurringValues($request))], 201);
    }

    public function updateRecurringExpense(Request $request, int $id): JsonResponse
    {
        $this->authorizeFinance($request, 'manageRecurringExpenses', RecurringExpenseTemplate::class);
        return response()->json(['data' => $this->planning->updateRecurringExpense($request, $id, $this->recurringValues($request, true))]);
    }

    public function stopRecurringExpense(Request $request, int $id): JsonResponse
    {
        $this->authorizeFinance($request, 'manageRecurringExpenses', RecurringExpenseTemplate::class);
        $values = $request->validate(['reason' => ['required', 'string', 'min:3', 'max:500']]);
        return response()->json(['data' => $this->planning->stopRecurringExpense($request, $id, $values['reason'])]);
    }

    public function materializeRecurringExpenses(Request $request): JsonResponse
    {
        $this->authorizeFinance($request, 'manageRecurringExpenses', RecurringExpenseTemplate::class);
        $values = $request->validate(['through_date' => ['sometimes', 'date_format:Y-m-d']]);
        return response()->json(['data' => ['created' => $this->planning->materializeRecurringExpenses($values['through_date'] ?? null)]]);
    }

    public function postRecurringOccurrence(Request $request, int $id, int $occurrenceId): JsonResponse
    {
        $this->authorizeFinance($request, 'manageRecurringExpenses', RecurringExpenseTemplate::class);
        abort_unless((int) $this->planning->occurrenceResource($occurrenceId)['template_id'] === $id, 404);
        $values = $request->validate(['treasury_account_id' => ['required', 'integer', 'min:1', 'exists:treasury_accounts,id']]);
        return response()->json(['data' => $this->planning->postRecurringOccurrence($request, $occurrenceId, $values)]);
    }

    public function monthlyComparison(Request $request): JsonResponse
    {
        $this->authorizeFinance($request, 'viewReports', ExpenseBudget::class);
        $values = $request->validate(['month_a' => ['required', 'date_format:Y-m'], 'month_b' => ['required', 'date_format:Y-m']]);
        return response()->json(['data' => $this->planning->monthlyComparison($values['month_a'], $values['month_b'])]);
    }

    public function cashForecast(Request $request): JsonResponse
    {
        $this->authorizeFinance($request, 'viewReports', ExpenseBudget::class);
        $values = $request->validate(['from_date' => ['required', 'date_format:Y-m-d'], 'weeks' => ['sometimes', 'integer', 'between:1,12']]);
        return response()->json(['data' => $this->planning->cashForecast($values['from_date'], (int) ($values['weeks'] ?? 8))]);
    }

    private function authorizeFinance(Request $request, string $ability, string $model): void
    {
        $user = $request->attributes->get('authenticated_user');
        abort_unless(is_object($user), 401);
        Gate::forUser($user)->authorize($ability, $model);
    }

    private function recurringValues(Request $request, bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';
        return $request->validate([
            'name' => [$required, 'string', 'max:180'], 'expense_category_id' => [$required, 'integer', 'min:1', 'exists:expense_categories,id'],
            'amount' => [$required, 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,4})?\z/'],
            'due_day' => [$required, 'integer', 'between:1,31'], 'start_date' => [$required, 'date_format:Y-m-d'], 'notes' => ['sometimes', 'nullable', 'string', 'max:500'],
        ]);
    }
}
