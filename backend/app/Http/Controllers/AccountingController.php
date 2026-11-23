<?php

namespace App\Http\Controllers;

use App\Models\ChartOfAccount;
use App\Models\FinancialAdjustment;
use App\Models\JournalEntry;
use App\Services\AccountingService;
use App\Services\FinancialAccountMappingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class AccountingController extends Controller
{
    public function __construct(
        private readonly AccountingService $accounting,
        private readonly FinancialAccountMappingService $accountMappings,
    ) {}

    public function accounts(Request $request): JsonResponse
    {
        $this->authorizeAccounting($request, 'viewChart', ChartOfAccount::class);
        return response()->json($this->accounting->accountTree());
    }

    public function createAccount(Request $request): JsonResponse
    {
        $this->authorizeAccounting($request, 'manageChart', ChartOfAccount::class);
        return response()->json(['data' => $this->accounting->createAccount($request, $this->accountValues($request))], 201);
    }

    public function updateAccount(Request $request, int $accountId): JsonResponse
    {
        $this->authorizeAccounting($request, 'manageChart', ChartOfAccount::class);
        return response()->json(['data' => $this->accounting->updateAccount($request, $accountId, $this->accountValues($request, $accountId))]);
    }

    public function accountMappings(Request $request): JsonResponse
    {
        $this->authorizeAccounting($request, 'viewChart', ChartOfAccount::class);
        return response()->json($this->accountMappings->index());
    }

    public function updateAccountMapping(Request $request, string $mappingKey): JsonResponse
    {
        $this->authorizeAccounting($request, 'manageChart', ChartOfAccount::class);
        $values = $request->validate([
            'account_id' => ['required', 'integer', 'min:1', Rule::exists('chart_of_accounts', 'id')],
        ]);
        return response()->json(['data' => $this->accountMappings->update($request, $mappingKey, (int) $values['account_id'])]);
    }

    public function journals(Request $request): JsonResponse
    {
        $this->authorizeAccounting($request, 'viewJournals', JournalEntry::class);
        $values = $request->validate([
            'search' => ['sometimes', 'nullable', 'string', 'max:160'],
            'status' => ['sometimes', 'nullable', Rule::in(['draft', 'posted', 'reversed'])],
            'from_date' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'to_date' => ['sometimes', 'nullable', 'date_format:Y-m-d', 'after_or_equal:from_date'],
            'sort_by' => ['sometimes', Rule::in(['entry_date', 'entry_number', 'status', 'created_at'])],
            'sort_direction' => ['sometimes', Rule::in(['asc', 'desc'])],
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'between:1,100'],
        ]);
        return response()->json($this->accounting->listJournals($values));
    }

    public function showJournal(Request $request, int $entryId): JsonResponse
    {
        $this->authorizeAccounting($request, 'viewJournals', JournalEntry::class);
        return response()->json(['data' => $this->accounting->journalDetail($entryId)]);
    }

    public function createJournal(Request $request): JsonResponse
    {
        $this->authorizeAccounting($request, 'createJournal', JournalEntry::class);
        return response()->json(['data' => $this->accounting->createJournal($request, $this->journalValues($request))], 201);
    }

    public function updateJournal(Request $request, int $entryId): JsonResponse
    {
        $this->authorizeAccounting($request, 'editDraft', JournalEntry::class);
        return response()->json(['data' => $this->accounting->updateDraftJournal($request, $entryId, $this->journalValues($request))]);
    }

    public function postJournal(Request $request, int $entryId): JsonResponse
    {
        $this->authorizeAccounting($request, 'postJournal', JournalEntry::class);
        if ($this->accounting->journalHasTreasuryLines($entryId)) $this->authorizeAccounting($request, 'postTreasury', JournalEntry::class);
        return response()->json(['data' => $this->accounting->postJournal($request, $entryId)]);
    }

    public function reverseJournal(Request $request, int $entryId): JsonResponse
    {
        $this->authorizeAccounting($request, 'reverseJournal', JournalEntry::class);
        if ($this->accounting->journalHasTreasuryLines($entryId)) $this->authorizeAccounting($request, 'postTreasury', JournalEntry::class);
        $values = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
            'reversal_date' => ['required', 'date_format:Y-m-d'],
        ]);
        return response()->json(['data' => $this->accounting->reverseJournal($request, $entryId, $values['reason'], $values['reversal_date'])]);
    }

    public function ledger(Request $request): JsonResponse
    {
        $this->authorizeAccounting($request, 'viewReports', JournalEntry::class);
        $values = $request->validate($this->periodRules() + [
            'account_id' => ['required', 'integer', 'min:1', Rule::exists('chart_of_accounts', 'id')],
        ]);
        return response()->json(['data' => $this->accounting->ledger((int) $values['account_id'], $values['from_date'], $values['to_date'])]);
    }

    public function trialBalance(Request $request): JsonResponse
    {
        $this->authorizeAccounting($request, 'viewReports', JournalEntry::class);
        $values = $request->validate($this->periodRules());
        return response()->json(['data' => $this->accounting->trialBalance($values['from_date'], $values['to_date'])]);
    }

    public function statements(Request $request): JsonResponse
    {
        $this->authorizeAccounting($request, 'viewReports', JournalEntry::class);
        $values = $request->validate($this->periodRules());
        return response()->json(['data' => $this->accounting->financialStatements($values['from_date'], $values['to_date'])]);
    }

    public function adjustments(Request $request): JsonResponse
    {
        $this->authorizeAccounting($request, 'viewAdjustments', FinancialAdjustment::class);
        $values = $request->validate([
            'search' => ['sometimes', 'nullable', 'string', 'max:160'],
            'from_date' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'to_date' => ['sometimes', 'nullable', 'date_format:Y-m-d', 'after_or_equal:from_date'],
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'between:1,100'],
        ]);
        return response()->json($this->accounting->listAdjustments($values));
    }

    public function showAdjustment(Request $request, int $adjustmentId): JsonResponse
    {
        $this->authorizeAccounting($request, 'viewAdjustments', FinancialAdjustment::class);
        return response()->json(['data' => $this->accounting->adjustmentDetail($adjustmentId)]);
    }

    public function createAdjustment(Request $request): JsonResponse
    {
        $this->authorizeAccounting($request, 'createAdjustment', FinancialAdjustment::class);
        $values = $request->validate([
            'reference_number' => ['required', 'string', 'max:160'],
            'adjustment_type' => ['required', Rule::in(['add', 'deduct', 'expense', 'revenue', 'settlement', 'correction'])],
            'adjustment_date' => ['required', 'date_format:Y-m-d'],
            'debit_account_id' => ['required', 'integer', 'min:1', Rule::exists('chart_of_accounts', 'id')],
            'credit_account_id' => ['required', 'integer', 'min:1', Rule::exists('chart_of_accounts', 'id')],
            'debit_treasury_account_id' => ['sometimes', 'nullable', 'integer', 'min:1', Rule::exists('treasury_accounts', 'id')],
            'credit_treasury_account_id' => ['sometimes', 'nullable', 'integer', 'min:1', Rule::exists('treasury_accounts', 'id')],
            'amount' => ['required', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,4})?\z/'],
            'reason' => ['required', 'string', 'max:500'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ]);
        $key = trim((string) $request->header('Idempotency-Key', ''));
        if ($key === '' || mb_strlen($key) > 200) {
            throw \Illuminate\Validation\ValidationException::withMessages(['idempotency_key' => ['مفتاح منع التكرار مطلوب ولا يتجاوز 200 حرف.']]);
        }
        if (! empty($values['debit_treasury_account_id']) || ! empty($values['credit_treasury_account_id'])) {
            $this->authorizeAccounting($request, 'postTreasury', JournalEntry::class);
        }
        return response()->json(['data' => $this->accounting->createAdjustment($request, $values, $key)], 201);
    }

    private function accountValues(Request $request, ?int $accountId = null): array
    {
        return $request->validate([
            'code' => ['required', 'string', 'max:80', 'regex:/\A[A-Za-z0-9][A-Za-z0-9._-]*\z/', Rule::unique('chart_of_accounts', 'code')->ignore($accountId)],
            'name' => ['required', 'string', 'max:160'],
            'description' => ['sometimes', 'nullable', 'string', 'max:500'],
            'parent_account_id' => ['sometimes', 'nullable', 'integer', 'min:1', Rule::exists('chart_of_accounts', 'id')],
            'account_type' => ['required', Rule::in(['asset', 'liability', 'equity', 'revenue', 'expense'])],
            'normal_balance' => ['required', Rule::in(['debit', 'credit'])],
            'is_control_account' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
    }

    private function journalValues(Request $request): array
    {
        return $request->validate([
            'entry_date' => ['required', 'date_format:Y-m-d'],
            'description' => ['required', 'string', 'max:500'],
            'lines' => ['required', 'array', 'min:2', 'max:500'],
            'lines.*.account_id' => ['required', 'integer', 'min:1', Rule::exists('chart_of_accounts', 'id')],
            'lines.*.debit_amount' => ['required', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,4})?\z/'],
            'lines.*.credit_amount' => ['required', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,4})?\z/'],
            'lines.*.description' => ['sometimes', 'nullable', 'string', 'max:500'],
            'lines.*.treasury_account_id' => ['sometimes', 'nullable', 'integer', 'min:1', Rule::exists('treasury_accounts', 'id')],
        ]);
    }

    private function periodRules(): array
    {
        return [
            'from_date' => ['required', 'date_format:Y-m-d'],
            'to_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:from_date'],
        ];
    }

    private function authorizeAccounting(Request $request, string $ability, string $model): void
    {
        $user = $request->attributes->get('authenticated_user');
        abort_unless(is_object($user), 401);
        Gate::forUser($user)->authorize($ability, $model);
    }
}
