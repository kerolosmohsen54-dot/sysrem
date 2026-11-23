<?php

namespace App\Services;

use App\Support\ExactMoney;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;
use RuntimeException;

class TreasuryService
{
    public function __construct(
        private readonly AuditLogService $auditLog,
        private readonly FinancialOutboxService $outbox,
        private readonly MobileSyncEventService $mobileSyncEvents,
    ) {}

    /**
     * @param  array{code: string, name: string, account_type: string, notes?: string|null}  $values
     */
    public function createAccount(Request $request, array $values): int
    {
        return DB::transaction(function () use ($request, $values): int {
            $now = now();
            $id = (int) DB::table('treasury_accounts')->insertGetId([
                ...$values,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $this->auditLog->record($request, 'treasury_account.created', 'treasury_account', $id, null, null, $values);

            return $id;
        }, 5);
    }

    /**
     * @param  array<string, mixed>  $values
     */
    public function updateAccount(Request $request, int $accountId, array $values): void
    {
        DB::transaction(function () use ($request, $accountId, $values): void {
            $before = DB::table('treasury_accounts')->where('id', $accountId)->lockForUpdate()->first();
            abort_if($before === null, 404);
            DB::table('treasury_accounts')->where('id', $accountId)->update([...$values, 'updated_at' => now()]);
            $this->auditLog->record($request, 'treasury_account.updated', 'treasury_account', $accountId, null, (array) $before, $values);
            $this->mobileSyncEvents->recordChannelBalances($request, [$accountId]);
        }, 5);
    }

    public function balance(int $accountId): array
    {
        $account = DB::table('treasury_accounts')->where('id', $accountId)->first(['id', 'code', 'name', 'account_type', 'is_active']);
        abort_if($account === null, 404);
        $totals = DB::table('treasury_entries')
            ->where('treasury_account_id', $accountId)
            ->selectRaw("COALESCE(SUM(CASE WHEN direction = 'in' THEN amount ELSE 0 END), 0) AS total_in")
            ->selectRaw("COALESCE(SUM(CASE WHEN direction = 'out' THEN amount ELSE 0 END), 0) AS total_out")
            ->first();
        $inCents = $this->toCents((string) $totals->total_in, 'balance_egp');
        $outCents = $this->toCents((string) $totals->total_out, 'balance_egp');

        $isNegative = ExactMoney::compare($inCents, $outCents) < 0;
        $balanceCents = $isNegative
            ? ExactMoney::subtract($outCents, $inCents)
            : ExactMoney::subtract($inCents, $outCents);

        return [
            'account' => $account,
            'balance_egp' => ($isNegative && $balanceCents !== '0' ? '-' : '').ExactMoney::fromCents($balanceCents),
        ];
    }

    /**
     * The shared treasury posting primitive used by all financial documents.
     * The caller owns the surrounding database transaction and the source record.
     *
     * @param array{treasury_account_id:int, entry_type:string, direction:string, entry_date:string, amount_egp:string, source_type:string, source_id?:int|null, description:string} $values
     */
    public function postTransaction(Request $request, array $values): int
    {
        if (! in_array($values['direction'] ?? null, ['in', 'out'], true)) {
            throw new InvalidArgumentException('A treasury transaction direction must be in or out.');
        }
        $amountCents = $this->positiveAmount($values['amount_egp'], 'amount_egp');
        $account = DB::table('treasury_accounts')
            ->where('id', $values['treasury_account_id'])
            ->lockForUpdate()
            ->first();
        if ($account === null || ! $account->is_active) {
            throw ValidationException::withMessages(['treasury_account_id' => ['The selected treasury account must exist and be active.']]);
        }
        if ($values['direction'] === 'out') {
            $this->assertSufficientBalance((int) $account->id, $amountCents);
        }

        $sourceType = $values['source_type'];
        $sourceId = $values['source_id'] ?? null;
        if ($sourceType === 'treasury_entry' && $sourceId === null) {
            // A source-less manual/opening entry cannot refer to its own id until after insert.
            // Keep both source columns null so the source-pair database constraint is satisfied.
            $sourceType = null;
        }

        $entryId = (int) DB::table('treasury_entries')->insertGetId([
            'treasury_account_id' => $account->id,
            'entry_number' => $this->documentNumber('TE'),
            'entry_type' => $values['entry_type'],
            'direction' => $values['direction'],
            'entry_date' => $values['entry_date'],
            'amount' => ExactMoney::fromCents($amountCents),
            'source_type' => $sourceType,
            'source_id' => $sourceId,
            'description' => $values['description'],
            'created_by_user_id' => $this->actorId($request),
            'posted_at' => now(),
            'created_at' => now(),
        ]);
        return $entryId;
    }

    /**
     * @param  array{treasury_account_id: int, direction: string, entry_date: string, amount_egp: string, description: string, entry_type?: string}  $values
     * @return array{entry_id: int, entry_number: string, balance_egp: string}
     */
    public function postCashEntry(Request $request, array $values): array
    {
        $amountCents = $this->positiveAmount($values['amount_egp'], 'amount_egp');
        $entryType = $values['entry_type'] ?? 'adjustment';
        if (! in_array($entryType, ['adjustment', 'opening'], true)) {
            throw new InvalidArgumentException('Unsupported treasury entry type.');
        }

        return DB::transaction(function () use ($request, $values, $amountCents, $entryType): array {
            $account = DB::table('treasury_accounts')->where('id', $values['treasury_account_id'])->lockForUpdate()->first();
            if ($account === null || ! $account->is_active) {
                throw ValidationException::withMessages(['treasury_account_id' => ['The selected treasury account does not exist or is inactive.']]);
            }
            if ($values['direction'] === 'out') {
                $this->assertSufficientBalance((int) $account->id, $amountCents);
            }

            $actorId = $this->actorId($request);
            $now = now();
            $entryNumber = $this->documentNumber('TE');
            $entryId = $this->postTransaction($request, [
                'treasury_account_id' => (int) $account->id,
                'entry_type' => $entryType,
                'direction' => $values['direction'],
                'entry_date' => $values['entry_date'],
                'amount_egp' => ExactMoney::fromCents($amountCents),
                'source_type' => 'treasury_entry',
                'description' => $values['description'],
            ]);
            $entryNumber = (string) DB::table('treasury_entries')->where('id', $entryId)->value('entry_number');
            $afterBalance = $this->balance((int) $account->id)['balance_egp'];
            $after = [
                'entry_number' => $entryNumber,
                'treasury_account_id' => (int) $account->id,
                'entry_type' => $entryType,
                'direction' => $values['direction'],
                'entry_date' => $values['entry_date'],
                'amount_egp' => ExactMoney::fromCents($amountCents),
                'description' => $values['description'],
                'balance_egp' => $afterBalance,
            ];
            $this->auditLog->record($request, 'treasury_entry.posted', 'treasury_entry', $entryId, null, null, $after);
            $this->outbox->recordPostedDocument('treasury_entry', $entryId, $after);
            $this->mobileSyncEvents->recordChannelBalances($request, [(int) $account->id]);

            return ['entry_id' => $entryId, 'entry_number' => $entryNumber, 'balance_egp' => $afterBalance];
        }, 5);
    }

    /**
     * @param  array{expense_date: string, treasury_account_id: int, expense_category_id: int, amount_egp: string, description: string, reference?: string|null, original_amount?: string|null, exchange_rate?: string|null}  $values
     */
    public function postExpense(Request $request, array $values): int
    {
        $amountCents = $this->positiveAmount($values['amount_egp'], 'amount_egp');
        $originalAmount = $values['original_amount'] ?? null;
        $exchangeRate = $values['exchange_rate'] ?? null;
        $originalAmount = $originalAmount === null ? null : $this->referenceDecimal($originalAmount, 'original_amount', 4);
        $exchangeRate = $exchangeRate === null ? null : $this->referenceDecimal($exchangeRate, 'exchange_rate', 10, 14);

        return DB::transaction(function () use ($request, $values, $amountCents, $originalAmount, $exchangeRate): int {
            $account = DB::table('treasury_accounts')->where('id', $values['treasury_account_id'])->lockForUpdate()->first();
            if ($account === null || ! $account->is_active) {
                throw ValidationException::withMessages(['treasury_account_id' => ['The selected treasury account does not exist or is inactive.']]);
            }
            $category = DB::table('expense_categories')->where('id', $values['expense_category_id'])->lockForUpdate()->first();
            if ($category === null || ! $category->is_active) {
                throw ValidationException::withMessages(['expense_category_id' => ['The selected expense category does not exist or is inactive.']]);
            }
            $this->assertSufficientBalance((int) $account->id, $amountCents);

            $actorId = $this->actorId($request);
            $now = now();
            $expenseNumber = $this->documentNumber('EXP');
            $expenseId = (int) DB::table('expenses')->insertGetId([
                'expense_number' => $expenseNumber,
                'status' => 'posted',
                'expense_date' => $values['expense_date'],
                'expense_category_id' => $category->id,
                'treasury_account_id' => $account->id,
                'amount' => ExactMoney::fromCents($amountCents),
                'original_amount' => $originalAmount,
                'exchange_rate' => $exchangeRate,
                'description' => $values['description'],
                'reference' => $values['reference'] ?? null,
                'created_by_user_id' => $actorId,
                'posted_by_user_id' => $actorId,
                'posted_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $entryId = $this->postTransaction($request, [
                'treasury_account_id' => (int) $account->id,
                'entry_type' => 'expense',
                'direction' => 'out',
                'entry_date' => $values['expense_date'],
                'amount_egp' => ExactMoney::fromCents($amountCents),
                'source_type' => 'expense',
                'source_id' => $expenseId,
                'description' => $values['description'],
            ]);
            DB::table('expenses')->where('id', $expenseId)->update(['treasury_entry_id' => $entryId]);
            $after = [
                'expense_number' => $expenseNumber,
                'status' => 'posted',
                'expense_date' => $values['expense_date'],
                'expense_category_id' => (int) $category->id,
                'treasury_account_id' => (int) $account->id,
                'amount_egp' => ExactMoney::fromCents($amountCents),
                'original_amount' => $originalAmount,
                'exchange_rate' => $exchangeRate,
                'treasury_entry_id' => $entryId,
            ];
            $this->auditLog->record($request, 'expense.posted', 'expense', $expenseId, null, null, $after);
            $this->outbox->recordPostedDocument('expense', $expenseId, $after);
            $this->mobileSyncEvents->recordChannelBalances($request, [(int) $account->id]);

            return $expenseId;
        }, 5);
    }

    /** Post a partner profit payout as a treasury outflow without classifying it as an operating expense. */
    public function postPartnerPayment(Request $request, int $paymentId): array
    {
        return DB::transaction(function () use ($request, $paymentId): array {
            $payment = DB::table('partner_payments')->where('id', $paymentId)->lockForUpdate()->first();
            abort_if($payment === null, 404);
            if ($payment->status !== 'draft') {
                abort(409, 'Only a draft partner payment can be approved.');
            }
            if ($payment->treasury_account_id === null) {
                throw ValidationException::withMessages(['treasury_account_id' => ['Select a treasury account before approval.']]);
            }
            $account = DB::table('treasury_accounts')
                ->where('id', $payment->treasury_account_id)
                ->lockForUpdate()
                ->first();
            if ($account === null || ! $account->is_active) {
                throw ValidationException::withMessages(['treasury_account_id' => ['The selected treasury account must exist and be active.']]);
            }
            $amountCents = $this->positiveAmount((string) $payment->amount_egp, 'amount_egp');
            $this->assertSufficientBalance((int) $account->id, $amountCents);

            $actorId = $this->actorId($request);
            $now = now();
            $entryId = $this->postTransaction($request, [
                'treasury_account_id' => (int) $account->id,
                'entry_type' => 'adjustment',
                'direction' => 'out',
                'entry_date' => (string) $payment->payment_date,
                'amount_egp' => ExactMoney::fromCents($amountCents),
                'source_type' => 'partner_payment',
                'source_id' => $paymentId,
                'description' => 'Partner profit payout #'.$paymentId,
            ]);
            DB::table('partner_profit_ledger')->insert([
                'partner_id' => (int) $payment->partner_id,
                'sales_document_id' => null,
                'reference_document_id' => null,
                'partner_payment_id' => $paymentId,
                'entry_type' => 'payout',
                'amount_egp' => ExactMoney::fromCents($amountCents),
                'effective_date' => $payment->payment_date,
                'source_key' => 'partner-payout:'.$paymentId,
                'notes' => 'Partner profit payout.',
                'created_by_user_id' => $actorId,
                'created_at' => $now,
            ]);
            DB::table('partner_payments')->where('id', $paymentId)->update([
                'status' => 'approved',
                'treasury_entry_id' => $entryId,
                'approved_by_user_id' => $actorId,
                'approved_at' => $now,
                'updated_at' => $now,
            ]);
            $after = [
                'partner_id' => (int) $payment->partner_id,
                'amount_egp' => ExactMoney::fromCents($amountCents),
                'treasury_account_id' => (int) $account->id,
                'treasury_entry_id' => $entryId,
                'status' => 'approved',
            ];
            $this->auditLog->record($request, 'partner_payment.approved', 'partner_payment', $paymentId, null, (array) $payment, $after);
            $this->outbox->recordPostedDocument('partner_payment', $paymentId, $after);
            $this->mobileSyncEvents->recordChannelBalances($request, [(int) $account->id]);

            return ['data' => DB::table('partner_payments')->where('id', $paymentId)->first()];
        }, 5);
    }

    /** Post a supplier settlement against one purchase invoice. */
    public function postSupplierPayment(Request $request, int $paymentId): array
    {
        return DB::transaction(function () use ($request, $paymentId): array {
            $payment = DB::table('supplier_payments')->where('id', $paymentId)->lockForUpdate()->first();
            abort_if($payment === null, 404);
            if ($payment->status === 'approved' && $payment->treasury_entry_id !== null) {
                $entryExists = DB::table('treasury_entries')
                    ->where('id', $payment->treasury_entry_id)
                    ->where('source_type', 'supplier_payment')
                    ->where('source_id', $paymentId)
                    ->exists();
                if ($entryExists) {
                    return ['data' => DB::table('supplier_payments')->where('id', $paymentId)->first()];
                }
                abort(409, 'The approved supplier payment has no matching treasury entry.');
            }
            if ($payment->status !== 'draft') {
                abort(409, 'Only a draft supplier payment can be approved.');
            }
            $invoice = DB::table('purchase_invoices')->where('id', $payment->purchase_invoice_id)->lockForUpdate()->first();
            abort_if($invoice === null || $invoice->status !== 'posted' || (int) $invoice->supplier_id !== (int) $payment->supplier_id, 409);
            $paid = DB::table('supplier_payments')
                ->where('purchase_invoice_id', $invoice->id)
                ->where('status', 'approved')
                ->sum('amount_egp');
            $dueCents = ExactMoney::subtract(ExactMoney::toCents((string) $invoice->total_egp), ExactMoney::toCents((string) $paid));
            $amountCents = ExactMoney::toCents((string) $payment->amount_egp);
            if (ExactMoney::compare($amountCents, $dueCents) > 0) {
                throw ValidationException::withMessages(['amount_egp' => ['The payment exceeds the remaining amount due on this purchase invoice.']]);
            }
            $account = DB::table('treasury_accounts')->where('id', $payment->treasury_account_id)->lockForUpdate()->first();
            if ($account === null || ! $account->is_active) {
                throw ValidationException::withMessages(['treasury_account_id' => ['Select an active treasury account.']]);
            }

            $actorId = $this->actorId($request);
            $entryId = $this->postTransaction($request, [
                'treasury_account_id' => (int) $account->id,
                'entry_type' => 'adjustment',
                'direction' => 'out',
                'entry_date' => (string) $payment->payment_date,
                'amount_egp' => ExactMoney::fromCents($amountCents),
                'source_type' => 'supplier_payment',
                'source_id' => $paymentId,
                'description' => 'Supplier payment for purchase invoice '.$invoice->invoice_number,
            ]);
            DB::table('supplier_payments')->where('id', $paymentId)->update([
                'status' => 'approved',
                'treasury_entry_id' => $entryId,
                'approved_by_user_id' => $actorId,
                'approved_at' => now(),
                'updated_at' => now(),
            ]);
            $after = [
                'supplier_id' => (int) $payment->supplier_id,
                'purchase_invoice_id' => (int) $invoice->id,
                'amount_egp' => ExactMoney::fromCents($amountCents),
                'treasury_account_id' => (int) $account->id,
                'treasury_entry_id' => $entryId,
                'status' => 'approved',
            ];
            $this->auditLog->record($request, 'supplier_payment.approved', 'supplier_payment', $paymentId, null, (array) $payment, $after);
            $this->outbox->recordPostedDocument('supplier_payment', $paymentId, $after);
            $this->mobileSyncEvents->recordChannelBalances($request, [(int) $account->id]);

            return ['data' => DB::table('supplier_payments')->where('id', $paymentId)->first()];
        }, 5);
    }

    /**
     * @param  array{transfer_date: string, from_treasury_account_id: int, to_treasury_account_id: int, amount_egp: string, notes?: string|null}  $values
     */
    public function postTransfer(Request $request, array $values): int
    {
        $amountCents = $this->positiveAmount($values['amount_egp'], 'amount_egp');
        if ((int) $values['from_treasury_account_id'] === (int) $values['to_treasury_account_id']) {
            throw ValidationException::withMessages(['to_treasury_account_id' => ['A transfer requires two distinct treasury accounts.']]);
        }

        return DB::transaction(function () use ($request, $values, $amountCents): int {
            $accountIds = [(int) $values['from_treasury_account_id'], (int) $values['to_treasury_account_id']];
            sort($accountIds);
            $accounts = DB::table('treasury_accounts')->whereIn('id', $accountIds)->orderBy('id')->lockForUpdate()->get()->keyBy('id');
            if ($accounts->count() !== 2 || ! $accounts[$accountIds[0]]->is_active || ! $accounts[$accountIds[1]]->is_active) {
                throw ValidationException::withMessages(['from_treasury_account_id' => ['Both selected treasury accounts must exist and be active.']]);
            }
            $from = $accounts[(int) $values['from_treasury_account_id']];
            $to = $accounts[(int) $values['to_treasury_account_id']];
            $this->assertSufficientBalance((int) $from->id, $amountCents);

            $actorId = $this->actorId($request);
            $now = now();
            $transferNumber = $this->documentNumber('TR');
            $transferId = (int) DB::table('treasury_transfers')->insertGetId([
                'transfer_number' => $transferNumber,
                'status' => 'posted',
                'transfer_date' => $values['transfer_date'],
                'from_treasury_account_id' => $from->id,
                'to_treasury_account_id' => $to->id,
                'amount_egp' => ExactMoney::fromCents($amountCents),
                'notes' => $values['notes'] ?? null,
                'created_by_user_id' => $actorId,
                'posted_by_user_id' => $actorId,
                'posted_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $outEntryId = $this->postTransaction($request, [
                'treasury_account_id' => (int) $from->id,
                'entry_type' => 'transfer_out',
                'direction' => 'out',
                'entry_date' => $values['transfer_date'],
                'amount_egp' => ExactMoney::fromCents($amountCents),
                'source_type' => 'treasury_transfer_out',
                'source_id' => $transferId,
                'description' => 'Transfer transfer_out',
            ]);
            $inEntryId = $this->postTransaction($request, [
                'treasury_account_id' => (int) $to->id,
                'entry_type' => 'transfer_in',
                'direction' => 'in',
                'entry_date' => $values['transfer_date'],
                'amount_egp' => ExactMoney::fromCents($amountCents),
                'source_type' => 'treasury_transfer_in',
                'source_id' => $transferId,
                'description' => 'Transfer transfer_in',
            ]);
            DB::table('treasury_transfer_entries')->insert([
                ['treasury_transfer_id' => $transferId, 'treasury_entry_id' => $outEntryId, 'transfer_leg' => 'outflow', 'created_at' => $now],
                ['treasury_transfer_id' => $transferId, 'treasury_entry_id' => $inEntryId, 'transfer_leg' => 'inflow', 'created_at' => $now],
            ]);
            $after = [
                'transfer_number' => $transferNumber,
                'status' => 'posted',
                'transfer_date' => $values['transfer_date'],
                'from_treasury_account_id' => (int) $from->id,
                'to_treasury_account_id' => (int) $to->id,
                'amount_egp' => ExactMoney::fromCents($amountCents),
                'treasury_entry_ids' => [$outEntryId, $inEntryId],
            ];
            $this->auditLog->record($request, 'treasury_transfer.posted', 'treasury_transfer', $transferId, null, null, $after);
            $this->outbox->recordPostedDocument('treasury_transfer', $transferId, $after);
            $this->mobileSyncEvents->recordChannelBalances($request, [(int) $from->id, (int) $to->id]);

            return $transferId;
        }, 5);
    }

    private function assertSufficientBalance(int $accountId, string $requiredCents): void
    {
        $balance = $this->balance($accountId)['balance_egp'];
        if (str_starts_with($balance, '-') || ExactMoney::compare($this->toCents($balance, 'balance_egp'), $requiredCents) < 0) {
            throw ValidationException::withMessages(['amount_egp' => ['The treasury account does not have enough available funds.']]);
        }
    }

    private function positiveAmount(string $amount, string $field): string
    {
        $cents = $this->toCents($amount, $field);
        if ($cents === '0') {
            throw ValidationException::withMessages([$field => ['The amount must be greater than zero.']]);
        }

        return $cents;
    }

    private function toCents(string $amount, string $field): string
    {
        try {
            return ExactMoney::toCents($amount);
        } catch (InvalidArgumentException $exception) {
            throw ValidationException::withMessages([$field => [$exception->getMessage()]]);
        }
    }

    private function referenceDecimal(string $value, string $field, int $scale, int $maxIntegerDigits = 15): string
    {
        $pattern = '/\A(?:0|[1-9][0-9]{0,'.($maxIntegerDigits - 1).'})(?:\.[0-9]{1,'.$scale.'})?\z/';
        if (! preg_match($pattern, $value)) {
            throw ValidationException::withMessages([$field => ['The value is outside the supported reference range.']]);
        }
        if (preg_match('/\A0(?:\.0+)?\z/', $value)) {
            throw ValidationException::withMessages([$field => ['The value must be greater than zero.']]);
        }
        $parts = explode('.', $value, 2);

        return $parts[0].'.'.str_pad($parts[1] ?? '', $scale, '0');
    }

    private function actorId(Request $request): int
    {
        $actor = $request->attributes->get('authenticated_user');
        if (! is_object($actor) || ! isset($actor->id)) {
            throw new RuntimeException('An authenticated actor is required for financial posting.');
        }

        return (int) $actor->id;
    }

    private function documentNumber(string $prefix): string
    {
        return $prefix.'-'.strtoupper(str_replace('-', '', (string) Str::uuid()));
    }
}
