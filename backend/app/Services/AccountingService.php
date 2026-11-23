<?php

namespace App\Services;

use App\Models\ChartOfAccount;
use App\Models\FinancialAdjustment;
use App\Models\JournalEntry;
use App\Support\AccountingAmount;
use App\Support\ExactMoney;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class AccountingService
{
    public function __construct(
        private readonly AuditLogService $auditLog,
        private readonly TreasuryService $treasury,
        private readonly FinancialOutboxService $outbox,
        private readonly MobileSyncEventService $mobileSyncEvents,
    ) {}

    public function accountTree(): array
    {
        $accounts = ChartOfAccount::query()->orderBy('code')->get();
        $postedLines = DB::table('journal_lines as line')
            ->join('journal_entries as entry', 'entry.id', '=', 'line.journal_entry_id')
            ->where('entry.status', 'posted')
            ->groupBy('line.account_id')
            ->selectRaw('line.account_id, SUM(line.debit_amount) AS debit_total, SUM(line.credit_amount) AS credit_total, COUNT(*) AS posted_line_count')
            ->get()->keyBy('account_id');

        $children = [];
        foreach ($accounts as $account) {
            $children[$account->parent_account_id ?? 0][] = $account;
        }
        $build = function (int $parentId, array $path = []) use (&$build, $children, $postedLines): array {
            $rows = [];
            foreach ($children[$parentId] ?? [] as $account) {
                if (in_array((int) $account->id, $path, true)) {
                    continue;
                }
                $posted = $postedLines->get($account->id);
                $debits = $this->units((string) ($posted->debit_total ?? '0'));
                $credits = $this->units((string) ($posted->credit_total ?? '0'));
                $childRows = $build((int) $account->id, [...$path, (int) $account->id]);
                foreach ($childRows as $childRow) {
                    $debits = ExactMoney::add($debits, $this->units($childRow['total_debit']));
                    $credits = ExactMoney::add($credits, $this->units($childRow['total_credit']));
                }
                $normal = $account->normal_balance === 'debit'
                    ? $this->signedDifference($debits, $credits)
                    : $this->signedDifference($credits, $debits);
                $rows[] = [
                    'id' => (int) $account->id,
                    'parent_account_id' => $account->parent_account_id === null ? null : (int) $account->parent_account_id,
                    'code' => $account->code,
                    'name' => $account->name,
                    'description' => $account->description,
                    'account_type' => $account->account_type,
                    'normal_balance' => $account->normal_balance,
                    'is_control_account' => (bool) $account->is_control_account,
                    'is_active' => (bool) $account->is_active,
                    'balance_egp' => $this->formatSigned($normal),
                    'total_debit' => $this->formatUnits($debits),
                    'total_credit' => $this->formatUnits($credits),
                    'has_posted_entries' => (int) ($posted->posted_line_count ?? 0) > 0,
                    'posting_allowed' => $childRows === [] && ! $account->is_control_account && $account->is_active,
                    'children' => $childRows,
                ];
            }

            return $rows;
        };

        return [
            'data' => $build(0),
            'meta' => ['account_count' => $accounts->count(), 'currency' => 'EGP'],
        ];
    }

    public function createAccount(Request $request, array $values): array
    {
        return DB::transaction(function () use ($request, $values): array {
            $parent = $this->validateParent($values['parent_account_id'] ?? null, $values['account_type']);
            $account = ChartOfAccount::query()->create([
                'parent_account_id' => $parent?->id,
                'code' => trim($values['code']),
                'name' => trim($values['name']),
                'description' => $this->nullableTrim($values['description'] ?? null),
                'account_type' => $values['account_type'],
                'normal_balance' => $values['normal_balance'],
                'is_control_account' => (bool) ($values['is_control_account'] ?? false),
                'is_active' => (bool) ($values['is_active'] ?? true),
            ]);
            $this->auditLog->record($request, 'chart_of_accounts.created', 'chart_of_account', (int) $account->id, null, null, $account->toArray());

            return $this->accountDetail((int) $account->id);
        });
    }

    public function updateAccount(Request $request, int $accountId, array $values): array
    {
        return DB::transaction(function () use ($request, $accountId, $values): array {
            $account = ChartOfAccount::query()->lockForUpdate()->findOrFail($accountId);
            if ($this->accountHasPostedLines($accountId)) {
                throw ValidationException::withMessages(['account' => ['لا يمكن تعديل حساب سبق استخدامه في قيد مرحّل.']]);
            }
            $parent = $this->validateParent($values['parent_account_id'] ?? null, $values['account_type'], $accountId);
            if ($parent !== null && $this->accountHasPostedLines((int) $parent->id)) {
                throw ValidationException::withMessages(['parent_account_id' => ['لا يمكن إضافة فرع إلى حساب عليه قيود مرحّلة.']]);
            }
            if (DB::table('chart_of_accounts')->where('parent_account_id', $accountId)->exists()) {
                if (! empty($values['is_control_account'])) {
                    throw ValidationException::withMessages(['is_control_account' => ['لا يمكن جعل حساب ذي فروع حساباً رقابياً.']]);
                }
                $childTypeMismatch = DB::table('chart_of_accounts')
                    ->where('parent_account_id', $accountId)
                    ->where('account_type', '<>', $values['account_type'])
                    ->exists();
                if ($childTypeMismatch) {
                    throw ValidationException::withMessages(['account_type' => ['يجب أن يطابق نوع الحساب أنواع فروعه الحالية.']]);
                }
            }
            $before = $account->toArray();
            $account->fill([
                'parent_account_id' => $parent?->id,
                'code' => trim($values['code']),
                'name' => trim($values['name']),
                'description' => $this->nullableTrim($values['description'] ?? null),
                'account_type' => $values['account_type'],
                'normal_balance' => $values['normal_balance'],
                'is_control_account' => (bool) ($values['is_control_account'] ?? false),
                'is_active' => (bool) ($values['is_active'] ?? true),
            ])->save();
            $this->auditLog->record($request, 'chart_of_accounts.updated', 'chart_of_account', $accountId, null, $before, $account->fresh()->toArray());

            return $this->accountDetail($accountId);
        });
    }

    public function createJournal(Request $request, array $values): array
    {
        return DB::transaction(function () use ($request, $values): array {
            $lines = $this->normalizeJournalLines($values['lines']);
            $this->assertBalanced($lines);
            $actorId = $this->actorId($request);
            $entry = JournalEntry::query()->create([
                'entry_number' => $this->nextNumber('JE'),
                'status' => 'draft',
                'entry_date' => $values['entry_date'],
                'description' => trim($values['description']),
                'created_by_user_id' => $actorId,
            ]);
            $this->insertLines((int) $entry->id, $lines);
            $detail = $this->journalDetail((int) $entry->id);
            $this->auditLog->record($request, 'journal_entry.draft_created', 'journal_entry', (int) $entry->id, null, null, $detail);

            return $detail;
        });
    }

    public function updateDraftJournal(Request $request, int $entryId, array $values): array
    {
        return DB::transaction(function () use ($request, $entryId, $values): array {
            $entry = JournalEntry::query()->lockForUpdate()->findOrFail($entryId);
            if ($entry->status !== 'draft') {
                throw ValidationException::withMessages(['entry' => ['القيد المرحّل غير قابل للتعديل؛ أنشئ قيداً عكسياً للتصحيح.']]);
            }
            $lines = $this->normalizeJournalLines($values['lines']);
            $this->assertBalanced($lines);
            $before = $this->journalDetail($entryId);
            $entry->update([
                'entry_date' => $values['entry_date'],
                'description' => trim($values['description']),
            ]);
            DB::table('journal_lines')->where('journal_entry_id', $entryId)->delete();
            $this->insertLines($entryId, $lines);
            $after = $this->journalDetail($entryId);
            $this->auditLog->record($request, 'journal_entry.draft_updated', 'journal_entry', $entryId, null, $before, $after);

            return $after;
        });
    }

    public function postJournal(Request $request, int $entryId): array
    {
        return DB::transaction(function () use ($request, $entryId): array {
            $entry = JournalEntry::query()->lockForUpdate()->findOrFail($entryId);
            if ($entry->status === 'posted') {
                return $this->journalDetail($entryId);
            }
            if ($entry->status !== 'draft') {
                throw ValidationException::withMessages(['entry' => ['لا يمكن ترحيل هذا القيد بحالته الحالية.']]);
            }
            $lines = DB::table('journal_lines')->where('journal_entry_id', $entryId)->orderBy('line_number')->get()->map(fn (object $line): array => (array) $line)->all();
            $this->assertBalanced($lines);
            foreach ($lines as $line) {
                $this->assertPostingAccount((int) $line['account_id']);
            }
            $before = $this->journalDetail($entryId);
            $this->postTreasuryLines($request, $entryId, $entry->entry_date->format('Y-m-d'));
            $entry->update([
                'status' => 'posted',
                'posted_by_user_id' => $this->actorId($request),
                'posted_at' => now(),
            ]);
            $after = $this->journalDetail($entryId);
            $this->auditLog->record($request, 'journal_entry.posted', 'journal_entry', $entryId, null, $before, $after);

            return $after;
        });
    }

    public function reverseJournal(Request $request, int $entryId, string $reason, string $reversalDate): array
    {
        return DB::transaction(function () use ($request, $entryId, $reason, $reversalDate): array {
            $original = JournalEntry::query()->lockForUpdate()->findOrFail($entryId);
            if ($original->status !== 'posted' || $original->reversal_of_entry_id !== null) {
                throw ValidationException::withMessages(['entry' => ['يمكن عكس قيد مرحّل أصلي مرة واحدة فقط.']]);
            }
            $existingId = DB::table('journal_entries')->where('reversal_of_entry_id', $entryId)->value('id');
            if ($existingId !== null) {
                return $this->journalDetail((int) $existingId);
            }
            $originalLines = DB::table('journal_lines')->where('journal_entry_id', $entryId)->orderBy('line_number')->get();
            foreach ($originalLines as $line) {
                if ($line->treasury_account_id !== null && ! DB::table('treasury_entries')
                    ->where('source_type', 'accounting_journal_line')->where('source_id', $line->id)->exists()) {
                    throw ValidationException::withMessages(['entry' => ['اعكس حركة الخزينة من مستندها الأصلي قبل تصحيح هذا القيد.']]);
                }
            }
            $lines = $originalLines->map(static fn (object $line): array => [
                'account_id' => (int) $line->account_id,
                'debit_amount' => (string) $line->credit_amount,
                'credit_amount' => (string) $line->debit_amount,
                'description' => trim($reason),
                'treasury_account_id' => $line->treasury_account_id === null ? null : (int) $line->treasury_account_id,
            ])->all();
            $reversal = JournalEntry::query()->create([
                'entry_number' => $this->nextNumber('JE'),
                'status' => 'draft',
                'entry_date' => $reversalDate,
                'description' => mb_substr('عكس '.$original->entry_number.' — '.trim($reason), 0, 500),
                'source_type' => 'journal_reversal',
                'source_id' => $entryId,
                'reversal_of_entry_id' => $entryId,
                'created_by_user_id' => $this->actorId($request),
            ]);
            $this->insertLines((int) $reversal->id, $lines);
            $this->postTreasuryLines($request, (int) $reversal->id, $reversalDate);
            $reversal->update(['status' => 'posted', 'posted_by_user_id' => $this->actorId($request), 'posted_at' => now()]);
            $after = $this->journalDetail((int) $reversal->id);
            $this->auditLog->record($request, 'journal_entry.reversal_posted', 'journal_entry', (int) $reversal->id, trim($reason), $this->journalDetail($entryId), $after);

            return $after;
        });
    }

    public function journalDetail(int $entryId): array
    {
        $entry = JournalEntry::query()->findOrFail($entryId);
        $lines = DB::table('journal_lines as line')
            ->join('chart_of_accounts as account', 'account.id', '=', 'line.account_id')
            ->leftJoin('treasury_accounts as treasury', 'treasury.id', '=', 'line.treasury_account_id')
            ->leftJoin('partners as partner', 'partner.id', '=', 'line.partner_id')
            ->where('line.journal_entry_id', $entryId)
            ->orderBy('line.line_number')
            ->get([
                'line.id', 'line.line_number', 'line.account_id', 'account.code as account_code',
                'account.name as account_name', 'line.debit_amount', 'line.credit_amount',
                'line.description', 'line.partner_id', 'partner.name as partner_name',
                'line.treasury_account_id', 'treasury.name as treasury_account_name',
            ]);
        $debits = '0';
        $credits = '0';
        $lineData = [];
        foreach ($lines as $line) {
            $debits = ExactMoney::add($debits, $this->units((string) $line->debit_amount));
            $credits = ExactMoney::add($credits, $this->units((string) $line->credit_amount));
            $lineData[] = [
                'id' => (int) $line->id,
                'line_number' => (int) $line->line_number,
                'account_id' => (int) $line->account_id,
                'account_code' => $line->account_code,
                'account_name' => $line->account_name,
                'debit_amount' => $this->formatUnits($this->units((string) $line->debit_amount)),
                'credit_amount' => $this->formatUnits($this->units((string) $line->credit_amount)),
                'description' => $line->description,
                'treasury_account_id' => $line->treasury_account_id === null ? null : (int) $line->treasury_account_id,
                'treasury_account_name' => $line->treasury_account_name,
            ];
        }
        $reversal = DB::table('journal_entries')->where('reversal_of_entry_id', $entryId)->value('id');

        return [
            'id' => (int) $entry->id,
            'entry_number' => $entry->entry_number,
            'status' => $entry->status === 'posted' && $reversal !== null ? 'reversed' : $entry->status,
            'entry_date' => $entry->entry_date->format('Y-m-d'),
            'description' => $entry->description,
            'source_type' => $entry->source_type,
            'source_id' => $entry->source_id === null ? null : (int) $entry->source_id,
            'reversal_of_entry_id' => $entry->reversal_of_entry_id === null ? null : (int) $entry->reversal_of_entry_id,
            'reversal_entry_id' => $reversal === null ? null : (int) $reversal,
            'created_by_user_id' => $entry->created_by_user_id === null ? null : (int) $entry->created_by_user_id,
            'posted_by_user_id' => $entry->posted_by_user_id === null ? null : (int) $entry->posted_by_user_id,
            'posted_at' => $entry->posted_at?->toDateTimeString(),
            'lines' => $lineData,
            'total_debit' => $this->formatUnits($debits),
            'total_credit' => $this->formatUnits($credits),
            'is_balanced' => ExactMoney::compare($debits, $credits) === 0,
            'difference' => $this->formatSigned($this->signedDifference($debits, $credits)),
        ];
    }

    public function journalHasTreasuryLines(int $entryId): bool
    {
        return DB::table('journal_lines')->where('journal_entry_id', $entryId)->whereNotNull('treasury_account_id')->exists();
    }

    public function listJournals(array $filters): array
    {
        $totals = DB::table('journal_lines')->groupBy('journal_entry_id')->selectRaw(
            'journal_entry_id, SUM(debit_amount) AS debit_total, SUM(credit_amount) AS credit_total, COUNT(*) AS line_count',
        );
        $query = DB::table('journal_entries as entry')
            ->leftJoinSub($totals, 'totals', 'totals.journal_entry_id', '=', 'entry.id')
            ->select([
                'entry.id', 'entry.entry_number', 'entry.status', 'entry.entry_date', 'entry.description',
                'entry.source_type', 'entry.source_id', 'entry.reversal_of_entry_id', 'entry.posted_at',
                'totals.debit_total', 'totals.credit_total', 'totals.line_count',
            ]);
        $reversals = DB::table('journal_entries as reversal')
            ->selectRaw('COUNT(*)')
            ->whereColumn('reversal.reversal_of_entry_id', 'entry.id');
        $query->selectSub($reversals, 'reversal_count');
        if (! empty($filters['from_date'])) $query->whereDate('entry.entry_date', '>=', $filters['from_date']);
        if (! empty($filters['to_date'])) $query->whereDate('entry.entry_date', '<=', $filters['to_date']);
        if (($filters['status'] ?? null) === 'reversed') {
            $query->where('entry.status', 'posted')->whereExists(static function ($subquery): void {
                $subquery->selectRaw('1')->from('journal_entries as reversal')
                    ->whereColumn('reversal.reversal_of_entry_id', 'entry.id');
            });
        } elseif (($filters['status'] ?? null) === 'posted') {
            $query->where('entry.status', 'posted')->whereNotExists(static function ($subquery): void {
                $subquery->selectRaw('1')->from('journal_entries as reversal')
                    ->whereColumn('reversal.reversal_of_entry_id', 'entry.id');
            });
        } elseif (! empty($filters['status'])) {
            $query->where('entry.status', $filters['status']);
        }
        if (! empty($filters['search'])) {
            $search = trim($filters['search']);
            $query->where(static fn ($builder) => $builder->where('entry.entry_number', 'like', '%'.$search.'%')
                ->orWhere('entry.description', 'like', '%'.$search.'%'));
        }
        $sort = in_array($filters['sort_by'] ?? '', ['entry_date', 'entry_number', 'status', 'created_at'], true)
            ? $filters['sort_by'] : 'entry_date';
        $direction = ($filters['sort_direction'] ?? 'desc') === 'asc' ? 'asc' : 'desc';
        $paginator = $query->orderBy('entry.'.$sort, $direction)->orderBy('entry.id', $direction)
            ->paginate((int) ($filters['per_page'] ?? 25), ['*'], 'page', (int) ($filters['page'] ?? 1));
        $data = $paginator->getCollection()->map(function (object $row): array {
            $debits = $this->units((string) ($row->debit_total ?? '0'));
            $credits = $this->units((string) ($row->credit_total ?? '0'));

            return [
                'id' => (int) $row->id,
                'entry_number' => $row->entry_number,
                'status' => $row->status === 'posted' && (int) $row->reversal_count > 0 ? 'reversed' : $row->status,
                'entry_date' => (string) $row->entry_date,
                'description' => $row->description,
                'source_type' => $row->source_type,
                'source_id' => $row->source_id === null ? null : (int) $row->source_id,
                'reversal_of_entry_id' => $row->reversal_of_entry_id === null ? null : (int) $row->reversal_of_entry_id,
                'posted_at' => $row->posted_at,
                'line_count' => (int) ($row->line_count ?? 0),
                'total_debit' => $this->formatUnits($debits),
                'total_credit' => $this->formatUnits($credits),
                'is_balanced' => ExactMoney::compare($debits, $credits) === 0,
                'difference' => $this->formatSigned($this->signedDifference($debits, $credits)),
            ];
        })->values()->all();

        return [
            'data' => $data,
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
        ];
    }

    public function ledger(int $accountId, string $fromDate, string $toDate): array
    {
        $account = ChartOfAccount::query()->findOrFail($accountId);
        $opening = $this->accountTotals($accountId, null, date('Y-m-d', strtotime($fromDate.' -1 day')));
        $running = $account->normal_balance === 'debit'
            ? $this->signedDifference($this->units($opening['debit']), $this->units($opening['credit']))
            : $this->signedDifference($this->units($opening['credit']), $this->units($opening['debit']));
        $rows = DB::table('journal_lines as line')
            ->join('journal_entries as entry', 'entry.id', '=', 'line.journal_entry_id')
            ->where('line.account_id', $accountId)
            ->where('entry.status', 'posted')
            ->whereBetween('entry.entry_date', [$fromDate, $toDate])
            ->orderBy('entry.entry_date')->orderBy('entry.id')->orderBy('line.line_number')
            ->get([
                'entry.id as journal_entry_id', 'entry.entry_number', 'entry.entry_date', 'entry.description as entry_description',
                'entry.source_type', 'entry.source_id', 'line.line_number', 'line.debit_amount', 'line.credit_amount', 'line.description as line_description',
            ]);
        $ledgerLines = [];
        $periodDebit = '0';
        $periodCredit = '0';
        foreach ($rows as $row) {
            $debit = $this->units((string) $row->debit_amount);
            $credit = $this->units((string) $row->credit_amount);
            $periodDebit = ExactMoney::add($periodDebit, $debit);
            $periodCredit = ExactMoney::add($periodCredit, $credit);
            $movement = $account->normal_balance === 'debit'
                ? $this->signedDifference($debit, $credit)
                : $this->signedDifference($credit, $debit);
            $running = $this->addSigned($running, $movement);
            $ledgerLines[] = [
                'journal_entry_id' => (int) $row->journal_entry_id,
                'entry_number' => $row->entry_number,
                'entry_date' => (string) $row->entry_date,
                'description' => $row->line_description ?: $row->entry_description,
                'source_type' => $row->source_type,
                'source_id' => $row->source_id === null ? null : (int) $row->source_id,
                'debit_amount' => $this->formatUnits($debit),
                'credit_amount' => $this->formatUnits($credit),
                'running_balance' => $this->formatSigned($running),
            ];
        }

        return [
            'account' => $this->accountSummary($account),
            'period' => ['from_date' => $fromDate, 'to_date' => $toDate],
            'opening_balance' => $this->formatSigned($account->normal_balance === 'debit'
                ? $this->signedDifference($this->units($opening['debit']), $this->units($opening['credit']))
                : $this->signedDifference($this->units($opening['credit']), $this->units($opening['debit']))),
            'lines' => $ledgerLines,
            'closing_balance' => $this->formatSigned($running),
            'period_debit' => $this->formatUnits($periodDebit),
            'period_credit' => $this->formatUnits($periodCredit),
        ];
    }

    public function trialBalance(string $fromDate, string $toDate): array
    {
        $opening = $this->aggregateAccounts(null, date('Y-m-d', strtotime($fromDate.' -1 day')));
        $period = $this->aggregateAccounts($fromDate, $toDate);
        $periodDebit = $periodCredit = $closingDebit = $closingCredit = '0';
        $rows = [];
        foreach (ChartOfAccount::query()->orderBy('code')->get() as $account) {
            $before = $opening[$account->id] ?? ['debit' => '0', 'credit' => '0', 'entry_count' => 0];
            $movement = $period[$account->id] ?? ['debit' => '0', 'credit' => '0', 'entry_count' => 0];
            $debit = $this->units($movement['debit']);
            $credit = $this->units($movement['credit']);
            $net = $this->signedDifference(
                ExactMoney::add($this->units($before['debit']), $debit),
                ExactMoney::add($this->units($before['credit']), $credit),
            );
            $debitBalance = $net['sign'] > 0 ? $net['units'] : '0';
            $creditBalance = $net['sign'] < 0 ? $net['units'] : '0';
            $periodDebit = ExactMoney::add($periodDebit, $debit);
            $periodCredit = ExactMoney::add($periodCredit, $credit);
            $closingDebit = ExactMoney::add($closingDebit, $debitBalance);
            $closingCredit = ExactMoney::add($closingCredit, $creditBalance);
            $rows[] = $this->accountSummary($account) + [
                'opening_balance' => $this->formatSigned($this->signedDifference($this->units($before['debit']), $this->units($before['credit']))),
                'period_debit' => $this->formatUnits($debit),
                'period_credit' => $this->formatUnits($credit),
                'closing_debit' => $this->formatUnits($debitBalance),
                'closing_credit' => $this->formatUnits($creditBalance),
                'posted_entry_count' => $movement['entry_count'],
            ];
        }

        return [
            'period' => ['from_date' => $fromDate, 'to_date' => $toDate],
            'accounts' => $rows,
            'totals' => [
                'period_debit' => $this->formatUnits($periodDebit),
                'period_credit' => $this->formatUnits($periodCredit),
                'closing_debit' => $this->formatUnits($closingDebit),
                'closing_credit' => $this->formatUnits($closingCredit),
                'period_difference' => $this->formatSigned($this->signedDifference($periodDebit, $periodCredit)),
                'difference' => $this->formatSigned($this->signedDifference($closingDebit, $closingCredit)),
                'is_balanced' => ExactMoney::compare($periodDebit, $periodCredit) === 0
                    && ExactMoney::compare($closingDebit, $closingCredit) === 0,
            ],
        ];
    }

    public function financialStatements(string $fromDate, string $toDate): array
    {
        $accounts = ChartOfAccount::query()->orderBy('code')->get();
        $periodTotals = $this->aggregateAccounts($fromDate, $toDate);
        $asOfTotals = $this->aggregateAccounts(null, $toDate);
        $periodRevenue = $this->statementGroup($accounts, $periodTotals, 'revenue');
        $periodExpenses = $this->statementGroup($accounts, $periodTotals, 'expense');
        $assets = $this->statementGroup($accounts, $asOfTotals, 'asset');
        $liabilities = $this->statementGroup($accounts, $asOfTotals, 'liability');
        $equity = $this->statementGroup($accounts, $asOfTotals, 'equity');
        $allRevenue = $this->statementGroup($accounts, $asOfTotals, 'revenue');
        $allExpenses = $this->statementGroup($accounts, $asOfTotals, 'expense');
        $periodProfit = $this->addSigned($periodRevenue['total'], $this->negateSigned($periodExpenses['total']));
        $accumulatedProfit = $this->addSigned($allRevenue['total'], $this->negateSigned($allExpenses['total']));
        $totalEquity = $this->addSigned($equity['total'], $accumulatedProfit);
        $balanceDifference = $this->addSigned(
            $assets['total'],
            $this->negateSigned($this->addSigned($liabilities['total'], $totalEquity)),
        );

        return [
            'period' => ['from_date' => $fromDate, 'to_date' => $toDate],
            'income_statement' => [
                'revenues' => $periodRevenue['lines'],
                'expenses' => $periodExpenses['lines'],
                'total_revenue' => $this->formatSigned($periodRevenue['total']),
                'total_expenses' => $this->formatSigned($periodExpenses['total']),
                'net_income' => $this->formatSigned($periodProfit),
            ],
            'balance_sheet' => [
                'as_of' => $toDate,
                'assets' => $assets['lines'],
                'liabilities' => $liabilities['lines'],
                'equity' => $equity['lines'],
                'total_assets' => $this->formatSigned($assets['total']),
                'total_liabilities' => $this->formatSigned($liabilities['total']),
                'equity_accounts_total' => $this->formatSigned($equity['total']),
                'accumulated_income' => $this->formatSigned($accumulatedProfit),
                'total_equity' => $this->formatSigned($totalEquity),
                'difference' => $this->formatSigned($balanceDifference),
                'is_balanced' => $balanceDifference['sign'] === 0,
            ],
            'cash_flow' => $this->cashFlow($fromDate, $toDate),
        ];
    }

    private function statementGroup($accounts, array $totals, string $type): array
    {
        $sum = ['sign' => 0, 'units' => '0'];
        $lines = [];
        foreach ($accounts as $account) {
            if ($account->account_type !== $type || ! isset($totals[$account->id])) continue;
            $values = $totals[$account->id];
            $debit = $this->units($values['debit']);
            $credit = $this->units($values['credit']);
            $amount = in_array($type, ['asset', 'expense'], true)
                ? $this->signedDifference($debit, $credit)
                : $this->signedDifference($credit, $debit);
            $sum = $this->addSigned($sum, $amount);
            $lines[] = $this->accountSummary($account) + [
                'debit' => $this->formatUnits($debit),
                'credit' => $this->formatUnits($credit),
                'amount' => $this->formatSigned($amount),
                'posted_entry_count' => $values['entry_count'],
            ];
        }

        return ['lines' => $lines, 'total' => $sum];
    }

    private function cashFlow(string $fromDate, string $toDate): array
    {
        $rows = DB::table('journal_lines as line')
            ->join('journal_entries as entry', 'entry.id', '=', 'line.journal_entry_id')
            ->join('treasury_accounts as treasury', 'treasury.id', '=', 'line.treasury_account_id')
            ->where('entry.status', 'posted')
            ->whereDate('entry.entry_date', '<=', $toDate)
            ->orderBy('entry.entry_date')->orderBy('entry.id')->orderBy('line.line_number')
            ->get(['entry.entry_date', 'line.account_id', 'line.treasury_account_id',
                'treasury.name as treasury_name', 'line.debit_amount', 'line.credit_amount']);
        $accounts = [];
        $inflows = $outflows = '0';
        foreach ($rows as $row) {
            $id = (int) $row->treasury_account_id;
            $accounts[$id] ??= [
                'treasury_account_id' => $id, 'name' => $row->treasury_name, 'account_ids' => [],
                'opening_debit' => '0', 'opening_credit' => '0', 'period_debit' => '0', 'period_credit' => '0',
            ];
            $accounts[$id]['account_ids'][(int) $row->account_id] = (int) $row->account_id;
            $debit = $this->units((string) $row->debit_amount);
            $credit = $this->units((string) $row->credit_amount);
            $prefix = (string) $row->entry_date < $fromDate ? 'opening_' : 'period_';
            $accounts[$id][$prefix.'debit'] = ExactMoney::add($accounts[$id][$prefix.'debit'], $debit);
            $accounts[$id][$prefix.'credit'] = ExactMoney::add($accounts[$id][$prefix.'credit'], $credit);
            if ($prefix === 'period_') {
                $inflows = ExactMoney::add($inflows, $debit);
                $outflows = ExactMoney::add($outflows, $credit);
            }
        }
        $openingTotal = ['sign' => 0, 'units' => '0'];
        $accountRows = [];
        foreach ($accounts as $account) {
            $opening = $this->signedDifference($account['opening_debit'], $account['opening_credit']);
            $movement = $this->signedDifference($account['period_debit'], $account['period_credit']);
            $openingTotal = $this->addSigned($openingTotal, $opening);
            $accountRows[] = [
                'treasury_account_id' => $account['treasury_account_id'],
                'name' => $account['name'],
                'account_ids' => array_values($account['account_ids']),
                'opening_balance' => $this->formatSigned($opening),
                'period_debit' => $this->formatUnits($account['period_debit']),
                'period_credit' => $this->formatUnits($account['period_credit']),
                'closing_balance' => $this->formatSigned($this->addSigned($opening, $movement)),
            ];
        }
        $netFlow = $this->signedDifference($inflows, $outflows);

        return [
            'accounts' => $accountRows,
            'opening_balance' => $this->formatSigned($openingTotal),
            'inflows' => $this->formatUnits($inflows),
            'outflows' => $this->formatUnits($outflows),
            'net_cash_flow' => $this->formatSigned($netFlow),
            'closing_balance' => $this->formatSigned($this->addSigned($openingTotal, $netFlow)),
        ];
    }

    private function accountTotals(int $accountId, ?string $fromDate, ?string $toDate): array
    {
        return $this->aggregateAccounts($fromDate, $toDate)[$accountId]
            ?? ['debit' => '0', 'credit' => '0', 'entry_count' => 0];
    }

    private function aggregateAccounts(?string $fromDate, ?string $toDate): array
    {
        $query = DB::table('journal_lines as line')
            ->join('journal_entries as entry', 'entry.id', '=', 'line.journal_entry_id')
            ->where('entry.status', 'posted');
        if ($fromDate !== null) $query->whereDate('entry.entry_date', '>=', $fromDate);
        if ($toDate !== null) $query->whereDate('entry.entry_date', '<=', $toDate);
        $rows = $query->groupBy('line.account_id')->selectRaw(
            'line.account_id, SUM(line.debit_amount) AS debit_total, SUM(line.credit_amount) AS credit_total, COUNT(DISTINCT entry.id) AS entry_count',
        )->get();
        $totals = [];
        foreach ($rows as $row) {
            $totals[(int) $row->account_id] = [
                'debit' => (string) $row->debit_total,
                'credit' => (string) $row->credit_total,
                'entry_count' => (int) $row->entry_count,
            ];
        }

        return $totals;
    }

    public function createAdjustment(Request $request, array $values, string $idempotencyKey): array
    {
        $keyHash = hash('sha256', trim($idempotencyKey));
        $canonical = [
            'reference_number' => trim($values['reference_number']),
            'adjustment_type' => $values['adjustment_type'],
            'adjustment_date' => $values['adjustment_date'],
            'debit_account_id' => (int) $values['debit_account_id'],
            'credit_account_id' => (int) $values['credit_account_id'],
            'debit_treasury_account_id' => empty($values['debit_treasury_account_id']) ? null : (int) $values['debit_treasury_account_id'],
            'credit_treasury_account_id' => empty($values['credit_treasury_account_id']) ? null : (int) $values['credit_treasury_account_id'],
            'amount' => $this->formatUnits($this->units((string) $values['amount'])),
            'reason' => trim($values['reason']),
            'notes' => $this->nullableTrim($values['notes'] ?? null),
        ];
        $requestHash = hash('sha256', json_encode($canonical, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE));
        if ($canonical['debit_account_id'] === $canonical['credit_account_id']) {
            throw ValidationException::withMessages(['credit_account_id' => ['اختر حسابين مختلفين لطرفي التسوية.']]);
        }
        try {
            return DB::transaction(function () use ($request, $canonical, $keyHash, $requestHash): array {
                $existing = FinancialAdjustment::query()->where('idempotency_key', $keyHash)->lockForUpdate()->first();
                if ($existing !== null) {
                    if (! hash_equals($existing->request_hash, $requestHash)) {
                        abort(409, 'مفتاح التسوية مستخدم لبيانات مختلفة.');
                    }

                    return $this->adjustmentDetail((int) $existing->id);
                }
                $lines = $this->normalizeJournalLines([
                    ['account_id' => $canonical['debit_account_id'], 'debit_amount' => $canonical['amount'], 'credit_amount' => '0', 'treasury_account_id' => $canonical['debit_treasury_account_id']],
                    ['account_id' => $canonical['credit_account_id'], 'debit_amount' => '0', 'credit_amount' => $canonical['amount'], 'treasury_account_id' => $canonical['credit_treasury_account_id']],
                ]);
                $this->assertBalanced($lines);
                $actorId = $this->actorId($request);
                $entry = JournalEntry::query()->create([
                    'entry_number' => $this->nextNumber('JE'),
                    'status' => 'draft',
                    'entry_date' => $canonical['adjustment_date'],
                    'description' => mb_substr('تسوية '.$canonical['reference_number'].' — '.$canonical['reason'], 0, 500),
                    'created_by_user_id' => $actorId,
                ]);
                $this->insertLines((int) $entry->id, $lines);
                $adjustment = FinancialAdjustment::query()->create($canonical + [
                    'adjustment_number' => $this->nextNumber('ADJ'),
                    'journal_entry_id' => (int) $entry->id,
                    'created_by_user_id' => $actorId,
                    'idempotency_key' => $keyHash,
                    'request_hash' => $requestHash,
                ]);
                $entry->update([
                    'source_type' => 'financial_adjustment',
                    'source_id' => (int) $adjustment->id,
                ]);
                $this->postTreasuryLines($request, (int) $entry->id, $canonical['adjustment_date']);
                $entry->update([
                    'status' => 'posted',
                    'posted_by_user_id' => $actorId,
                    'posted_at' => now(),
                ]);
                $after = $this->adjustmentDetail((int) $adjustment->id);
                $this->auditLog->record($request, 'financial_adjustment.posted', 'financial_adjustment', (int) $adjustment->id, $canonical['reason'], null, $after);

                return $this->adjustmentDetail((int) $adjustment->id);
            });
        } catch (QueryException $exception) {
            $existing = FinancialAdjustment::query()->where('idempotency_key', $keyHash)->first();
            if ($existing !== null && hash_equals($existing->request_hash, $requestHash)) {
                return $this->adjustmentDetail((int) $existing->id);
            }
            if ($existing !== null) abort(409, 'مفتاح التسوية مستخدم لبيانات مختلفة.');
            throw $exception;
        }
    }

    public function adjustmentDetail(int $adjustmentId): array
    {
        $adjustment = FinancialAdjustment::query()->findOrFail($adjustmentId);
        $audit = DB::table('audit_logs')->where('entity_type', 'financial_adjustment')->where('entity_id', $adjustmentId)
            ->orderBy('id')->get(['id', 'actor_user_id', 'actor_name_snapshot', 'action', 'reason', 'created_at']);

        return [
            'id' => (int) $adjustment->id,
            'adjustment_number' => $adjustment->adjustment_number,
            'reference_number' => $adjustment->reference_number,
            'adjustment_type' => $adjustment->adjustment_type,
            'adjustment_date' => $adjustment->adjustment_date->format('Y-m-d'),
            'debit_account_id' => (int) $adjustment->debit_account_id,
            'credit_account_id' => (int) $adjustment->credit_account_id,
            'debit_treasury_account_id' => $adjustment->debit_treasury_account_id === null ? null : (int) $adjustment->debit_treasury_account_id,
            'credit_treasury_account_id' => $adjustment->credit_treasury_account_id === null ? null : (int) $adjustment->credit_treasury_account_id,
            'amount' => (string) $adjustment->amount,
            'reason' => $adjustment->reason,
            'notes' => $adjustment->notes,
            'created_by_user_id' => $adjustment->created_by_user_id === null ? null : (int) $adjustment->created_by_user_id,
            'created_at' => (string) $adjustment->created_at,
            'journal_entry' => $this->journalDetail((int) $adjustment->journal_entry_id),
            'audit' => $audit->map(static fn (object $row): array => (array) $row)->all(),
        ];
    }

    public function listAdjustments(array $filters): array
    {
        $query = DB::table('financial_adjustments as adjustment')
            ->join('journal_entries as entry', 'entry.id', '=', 'adjustment.journal_entry_id')
            ->join('chart_of_accounts as debit', 'debit.id', '=', 'adjustment.debit_account_id')
            ->join('chart_of_accounts as credit', 'credit.id', '=', 'adjustment.credit_account_id')
            ->select(['adjustment.id', 'adjustment.adjustment_number', 'adjustment.reference_number',
                'adjustment.adjustment_type', 'adjustment.adjustment_date', 'adjustment.amount', 'adjustment.reason',
                'adjustment.journal_entry_id', 'entry.entry_number', 'entry.status',
                'debit.name as debit_account_name', 'credit.name as credit_account_name']);
        if (! empty($filters['from_date'])) $query->whereDate('adjustment.adjustment_date', '>=', $filters['from_date']);
        if (! empty($filters['to_date'])) $query->whereDate('adjustment.adjustment_date', '<=', $filters['to_date']);
        if (! empty($filters['search'])) {
            $search = trim($filters['search']);
            $query->where(static fn ($builder) => $builder->where('adjustment.adjustment_number', 'like', '%'.$search.'%')
                ->orWhere('adjustment.reference_number', 'like', '%'.$search.'%')
                ->orWhere('adjustment.reason', 'like', '%'.$search.'%'));
        }
        $page = $query->orderByDesc('adjustment.adjustment_date')->orderByDesc('adjustment.id')
            ->paginate((int) ($filters['per_page'] ?? 25), ['*'], 'page', (int) ($filters['page'] ?? 1));

        return [
            'data' => $page->getCollection()->map(static fn (object $row): array => (array) $row)->all(),
            'meta' => ['current_page' => $page->currentPage(), 'per_page' => $page->perPage(), 'total' => $page->total(), 'last_page' => $page->lastPage()],
        ];
    }

    private function validateParent(?int $parentId, string $type, ?int $accountId = null): ?ChartOfAccount
    {
        if ($parentId === null) return null;
        $parent = ChartOfAccount::query()->lockForUpdate()->findOrFail($parentId);
        if (! $parent->is_active || $parent->is_control_account || $parent->account_type !== $type) {
            throw ValidationException::withMessages(['parent_account_id' => ['اختر حساباً أباً نشطاً من النوع نفسه وقابلاً لاحتواء فروع.']]);
        }
        if ($this->accountHasPostedLines($parentId)) {
            throw ValidationException::withMessages(['parent_account_id' => ['لا يمكن إضافة فرع إلى حساب عليه قيود مرحّلة.']]);
        }
        $visited = [];
        $cursor = $parent;
        while ($cursor !== null) {
            $id = (int) $cursor->id;
            if ($id === $accountId || isset($visited[$id])) {
                throw ValidationException::withMessages(['parent_account_id' => ['لا يمكن إنشاء حلقة في شجرة الحسابات.']]);
            }
            $visited[$id] = true;
            $cursor = $cursor->parent_account_id === null
                ? null
                : ChartOfAccount::query()->lockForUpdate()->findOrFail($cursor->parent_account_id);
        }

        return $parent;
    }

    private function accountHasPostedLines(int $accountId): bool
    {
        return DB::table('journal_lines as line')->join('journal_entries as entry', 'entry.id', '=', 'line.journal_entry_id')
            ->where('line.account_id', $accountId)->whereIn('entry.status', ['posted', 'reversed'])->exists();
    }

    private function assertPostingAccount(int $accountId): ChartOfAccount
    {
        $account = ChartOfAccount::query()->lockForUpdate()->findOrFail($accountId);
        if (! $account->is_active || $account->is_control_account
            || DB::table('chart_of_accounts')->where('parent_account_id', $accountId)->exists()) {
            throw ValidationException::withMessages(['lines' => ['اختر حساباً فرعياً نشطاً قابلاً للترحيل لكل سطر.']]);
        }
        return $account;
    }

    private function normalizeJournalLines(array $lines): array
    {
        if (count($lines) < 2) throw ValidationException::withMessages(['lines' => ['يتطلب القيد سطرين على الأقل.']]);
        $normalized = [];
        foreach ($lines as $index => $line) {
            $accountId = (int) ($line['account_id'] ?? 0);
            if ($accountId < 1) throw ValidationException::withMessages(["lines.{$index}.account_id" => ['اختر حساب السطر.']]);
            $account = $this->assertPostingAccount($accountId);
            $debitInput = (string) ($line['debit_amount'] ?? '0');
            $creditInput = (string) ($line['credit_amount'] ?? '0');
            if (! preg_match('/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,4})?\z/', $debitInput)
                || ! preg_match('/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,4})?\z/', $creditInput)) {
                throw ValidationException::withMessages(["lines.{$index}" => ['المبلغ خارج النطاق أو يحتوي على منازل عشرية زائدة.']]);
            }
            $debit = $this->units($debitInput);
            $credit = $this->units($creditInput);
            if (($debit === '0') === ($credit === '0')) {
                throw ValidationException::withMessages(["lines.{$index}" => ['أدخل مبلغاً موجباً في المدين أو الدائن فقط.']]);
            }
            $treasuryId = isset($line['treasury_account_id']) && $line['treasury_account_id'] !== '' ? (int) $line['treasury_account_id'] : null;
            if ($treasuryId !== null && ! DB::table('treasury_accounts')->where('id', $treasuryId)->where('is_active', true)->exists()) {
                throw ValidationException::withMessages(["lines.{$index}.treasury_account_id" => ['اختر خزينة نشطة.']]);
            }
            if ($treasuryId !== null && $account->account_type !== 'asset') {
                throw ValidationException::withMessages(["lines.{$index}.treasury_account_id" => ['يجب ربط الخزينة بحساب أصول.']]);
            }
            if ($treasuryId !== null) $this->assertTreasuryPrecision($debit === '0' ? $credit : $debit);
            $normalized[] = [
                'account_id' => $accountId,
                'debit_amount' => $this->formatUnits($debit),
                'credit_amount' => $this->formatUnits($credit),
                'description' => $this->nullableTrim($line['description'] ?? null),
                'treasury_account_id' => $treasuryId,
            ];
        }

        return $normalized;
    }

    private function assertBalanced(array $lines): void
    {
        if (count($lines) < 2) throw ValidationException::withMessages(['lines' => ['يتطلب القيد سطرين على الأقل.']]);
        $debits = $credits = '0';
        foreach ($lines as $line) {
            $debit = $this->units((string) ($line['debit_amount'] ?? '0'));
            $credit = $this->units((string) ($line['credit_amount'] ?? '0'));
            if (($debit === '0') === ($credit === '0')) {
                throw ValidationException::withMessages(['lines' => ['كل سطر يجب أن يحتوي على مدين أو دائن موجب واحد.']]);
            }
            $debits = ExactMoney::add($debits, $debit);
            $credits = ExactMoney::add($credits, $credit);
        }
        if ($debits === '0' || ExactMoney::compare($debits, $credits) !== 0) {
            $difference = $this->formatSigned($this->signedDifference($debits, $credits));
            throw ValidationException::withMessages(['lines' => ['القيد غير متوازن؛ الفرق '.$difference.' ج.م.']]);
        }
    }

    private function insertLines(int $entryId, array $lines): void
    {
        foreach (array_values($lines) as $index => $line) {
            DB::table('journal_lines')->insert([
                'journal_entry_id' => $entryId,
                'line_number' => $index + 1,
                'account_id' => $line['account_id'],
                'debit_amount' => $line['debit_amount'],
                'credit_amount' => $line['credit_amount'],
                'description' => $line['description'] ?? null,
                'treasury_account_id' => $line['treasury_account_id'] ?? null,
                'created_at' => now(),
            ]);
        }
    }

    private function postTreasuryLines(Request $request, int $entryId, string $entryDate): void
    {
        $lines = DB::table('journal_lines')->where('journal_entry_id', $entryId)
            ->whereNotNull('treasury_account_id')->orderBy('treasury_account_id')->orderBy('line_number')->get();
        if ($lines->isEmpty()) return;
        $accountIds = $lines->pluck('treasury_account_id')->map(static fn ($id): int => (int) $id)->unique()->sort()->values()->all();
        DB::table('treasury_accounts')->whereIn('id', $accountIds)->orderBy('id')->lockForUpdate()->get();
        $ordered = $lines->sortBy(fn (object $line): int => ($this->units((string) $line->debit_amount) === '0' ? 1 : 0));
        foreach ($ordered as $line) {
            if (DB::table('treasury_entries')->where('source_type', 'accounting_journal_line')->where('source_id', $line->id)->exists()) continue;
            $debit = $this->units((string) $line->debit_amount);
            $credit = $this->units((string) $line->credit_amount);
            $amount = $debit === '0' ? $credit : $debit;
            $this->assertTreasuryPrecision($amount);
            $direction = $debit === '0' ? 'out' : 'in';
            $treasuryEntryId = $this->treasury->postTransaction($request, [
                'treasury_account_id' => (int) $line->treasury_account_id,
                'entry_type' => 'adjustment',
                'direction' => $direction,
                'entry_date' => $entryDate,
                'amount_egp' => $this->formatUnits($amount),
                'source_type' => 'accounting_journal_line',
                'source_id' => (int) $line->id,
                'description' => 'قيد يومية رقم '.$entryId,
            ]);
            $effect = ['journal_entry_id' => $entryId, 'journal_line_id' => (int) $line->id,
                'treasury_account_id' => (int) $line->treasury_account_id, 'direction' => $direction,
                'entry_date' => $entryDate, 'amount_egp' => $this->formatUnits($amount)];
            $this->auditLog->record($request, 'treasury_entry.posted', 'treasury_entry', $treasuryEntryId, null, null, $effect);
            $this->outbox->recordPostedDocument('treasury_entry', $treasuryEntryId, $effect);
        }
        $this->mobileSyncEvents->recordChannelBalances($request, $accountIds);
    }

    private function assertTreasuryPrecision(string $units): void
    {
        if (substr(str_pad($units, 3, '0', STR_PAD_LEFT), -2) !== '00') {
            throw ValidationException::withMessages(['lines' => ['حركات الخزينة تُسجل بمنزلتين عشريتين كحد أقصى.']]);
        }
    }

    private function accountDetail(int $accountId): array
    {
        $find = function (array $rows) use (&$find, $accountId): ?array {
            foreach ($rows as $row) {
                if ($row['id'] === $accountId) return $row;
                $child = $find($row['children']);
                if ($child !== null) return $child;
            }
            return null;
        };

        return $find($this->accountTree()['data']) ?? throw new RuntimeException('Account is not reachable in the chart.');
    }

    private function accountSummary(ChartOfAccount $account): array
    {
        return ['id' => (int) $account->id, 'code' => $account->code, 'name' => $account->name,
            'account_type' => $account->account_type, 'normal_balance' => $account->normal_balance];
    }

    private function actorId(Request $request): int
    {
        $actor = $request->attributes->get('authenticated_user');
        if (! is_object($actor) || ! isset($actor->id)) throw new RuntimeException('An authenticated actor is required.');
        return (int) $actor->id;
    }

    private function nextNumber(string $prefix): string
    {
        return $prefix.'-'.now()->format('Ymd').'-'.Str::upper(Str::random(12));
    }

    private function nullableTrim(mixed $value): ?string
    {
        $trimmed = trim((string) ($value ?? ''));
        return $trimmed === '' ? null : $trimmed;
    }

    private function units(string $amount): string
    {
        try {
            return AccountingAmount::units($amount);
        } catch (\InvalidArgumentException) {
            throw ValidationException::withMessages(['amount' => ['أدخل مبلغاً غير سالب بأربع منازل عشرية كحد أقصى.']]);
        }
    }

    private function formatUnits(string $units): string
    {
        return AccountingAmount::format($units);
    }

    private function signedDifference(string $left, string $right): array
    {
        return AccountingAmount::difference($left, $right);
    }

    private function addSigned(array $left, array $right): array
    {
        return AccountingAmount::addSigned($left, $right);
    }

    private function negateSigned(array $amount): array
    {
        return AccountingAmount::negate($amount);
    }

    private function formatSigned(array $amount): string
    {
        return AccountingAmount::formatSigned($amount);
    }
}


