<?php

namespace App\Http\Controllers;

use App\Services\AuditLogService;
use App\Services\IdempotencyService;
use App\Services\TreasuryService;
use App\Support\ExactMoney;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SupplierPaymentController extends Controller
{
    public function __construct(
        private readonly TreasuryService $treasury,
        private readonly AuditLogService $auditLog,
        private readonly IdempotencyService $idempotency,
    ) {}

    public function store(Request $request): JsonResponse
    {
        return $this->idempotency->execute($request, 'supplier_payment', function () use ($request): JsonResponse {
            $values = $request->validate([
                'purchase_invoice_id' => ['required', 'integer', 'exists:purchase_invoices,id'],
                'treasury_account_id' => ['required', 'integer', 'exists:treasury_accounts,id'],
                'amount_egp' => ['required', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,4})?\z/'],
                'payment_date' => ['required', 'date_format:Y-m-d'],
                'notes' => ['nullable', 'string', 'max:500'],
                'idempotency_key' => ['required', 'string', 'max:200'],
            ]);
            $headerKey = trim((string) $request->header('Idempotency-Key', ''));
            if ($headerKey !== '' && ! hash_equals($headerKey, $values['idempotency_key'])) {
                throw ValidationException::withMessages(['idempotency_key' => ['The body and header idempotency keys must match.']]);
            }
            $amountCents = ExactMoney::toCents($values['amount_egp']);
            if ($amountCents === '0') {
                throw ValidationException::withMessages(['amount_egp' => ['The payment amount must be greater than zero.']]);
            }

            $existing = DB::table('supplier_payments')->where('idempotency_key', $values['idempotency_key'])->lockForUpdate()->first();
            if ($existing !== null) {
                $this->assertSameRequest($existing, $values, $request);
                return response()->json(['data' => $existing]);
            }

            try {
                $id = DB::transaction(function () use ($request, $values, $amountCents): int {
                    $invoice = DB::table('purchase_invoices')->where('id', $values['purchase_invoice_id'])->lockForUpdate()->first();
                    abort_if($invoice === null, 404);
                    if ($invoice->status !== 'posted') {
                        throw ValidationException::withMessages(['purchase_invoice_id' => ['Post the purchase invoice before creating a supplier payment.']]);
                    }
                    $this->assertInvoiceBalance((int) $invoice->id, (string) $invoice->total_egp, $amountCents);
                    $actor = $request->attributes->get('authenticated_user');
                    $now = now();
                    $id = (int) DB::table('supplier_payments')->insertGetId([
                        'supplier_id' => $invoice->supplier_id,
                        'purchase_invoice_id' => $invoice->id,
                        'treasury_account_id' => $values['treasury_account_id'],
                        'amount_egp' => ExactMoney::fromCents($amountCents),
                        'payment_date' => $values['payment_date'],
                        'status' => 'draft',
                        'notes' => $values['notes'] ?? null,
                        'created_by_user_id' => is_object($actor) ? $actor->id : null,
                        'idempotency_key' => $values['idempotency_key'],
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                    $this->auditLog->record($request, 'supplier_payment.draft_created', 'supplier_payment', $id, null, null, [
                        'supplier_id' => (int) $invoice->supplier_id,
                        'purchase_invoice_id' => (int) $invoice->id,
                        'amount_egp' => ExactMoney::fromCents($amountCents),
                        'payment_date' => $values['payment_date'],
                    ]);

                    return $id;
                }, 5);
            } catch (QueryException $exception) {
                $existing = DB::table('supplier_payments')->where('idempotency_key', $values['idempotency_key'])->lockForUpdate()->first();
                if ($existing === null) throw $exception;
                $this->assertSameRequest($existing, $values, $request);
                return response()->json(['data' => $existing]);
            }

            return response()->json(['data' => DB::table('supplier_payments')->where('id', $id)->first()], 201);
        });
    }

    public function approve(Request $request, int $id): JsonResponse
    {
        return response()->json($this->treasury->postSupplierPayment($request, $id));
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        DB::transaction(function () use ($request, $id): void {
            $payment = DB::table('supplier_payments')->where('id', $id)->lockForUpdate()->first();
            abort_if($payment === null, 404);
            if ($payment->status !== 'draft') {
                abort(409, 'Only an unapproved supplier payment draft can be cancelled.');
            }
            DB::table('supplier_payments')->where('id', $id)->update(['status' => 'cancelled', 'updated_at' => now()]);
            $this->auditLog->record($request, 'supplier_payment.cancelled', 'supplier_payment', $id, null, (array) $payment, ['status' => 'cancelled']);
        }, 5);

        return response()->json(['data' => ['id' => $id, 'status' => 'cancelled']]);
    }

    private function assertInvoiceBalance(int $invoiceId, string $invoiceTotal, string $requestedCents): void
    {
        $reserved = DB::table('supplier_payments')->where('purchase_invoice_id', $invoiceId)->whereIn('status', ['draft', 'approved'])->sum('amount_egp');
        $dueCents = ExactMoney::subtract(ExactMoney::toCents($invoiceTotal), ExactMoney::toCents((string) $reserved));
        if (ExactMoney::compare($requestedCents, $dueCents) > 0) {
            throw ValidationException::withMessages(['amount_egp' => ['The payment exceeds the remaining amount due on the supplier invoice.']]);
        }
    }

    /** @param array<string, mixed> $values */
    private function assertSameRequest(object $existing, array $values, Request $request): void
    {
        $actor = $request->attributes->get('authenticated_user');
        $same = is_object($actor)
            && (int) $existing->created_by_user_id === (int) $actor->id
            && (int) $existing->purchase_invoice_id === (int) $values['purchase_invoice_id']
            && (int) $existing->treasury_account_id === (int) $values['treasury_account_id']
            && ExactMoney::compare(ExactMoney::toCents((string) $existing->amount_egp), ExactMoney::toCents($values['amount_egp'])) === 0
            && (string) $existing->payment_date === (string) $values['payment_date']
            && ($existing->notes ?? null) === ($values['notes'] ?? null);
        if (! $same) {
            abort(409, 'The supplier payment idempotency key was already used for a different payment.');
        }
    }
}
