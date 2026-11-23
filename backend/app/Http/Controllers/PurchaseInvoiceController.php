<?php

namespace App\Http\Controllers;

use App\Support\ListQuery;
use App\Support\ExactMoney;
use App\Services\AuditLogService;
use App\Services\FinancialOutboxService;
use App\Services\InventoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PurchaseInvoiceController extends Controller
{
    public function __construct(
        private readonly AuditLogService $auditLog,
        private readonly InventoryService $inventory,
        private readonly FinancialOutboxService $outbox,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $filters = ListQuery::validate($request, ['invoice_date' => 'invoice_date', 'id' => 'id'], [
            'supplier_id' => ['sometimes', 'integer', 'min:1'],
            'status' => ['sometimes', 'in:draft,posted,cancelled'],
        ]);
        $query = DB::table('purchase_invoices as invoice')
            ->leftJoin('suppliers as supplier', 'supplier.id', '=', 'invoice.supplier_id')
            ->leftJoin('partners as seller_partner', 'seller_partner.id', '=', 'invoice.seller_partner_id')
            ->select('invoice.*', 'supplier.name as supplier_name', 'seller_partner.name as seller_partner_name')
            ->when(isset($filters['supplier_id']), fn ($q) => $q->where('invoice.supplier_id', $filters['supplier_id']))
            ->when(isset($filters['status']), fn ($q) => $q->where('invoice.status', $filters['status']));
        ListQuery::search($query, $filters, ['invoice.invoice_number', 'supplier.name']);
        ListQuery::sort($query, $filters, ['invoice_date' => 'invoice.invoice_date', 'id' => 'invoice.id'], 'invoice.id', 'invoice.id', 'desc');
        return response()->json(ListQuery::page($query->paginate($filters['per_page'] ?? 50)));
    }

    public function show(int $invoiceId): JsonResponse
    {
        $invoice = DB::table('purchase_invoices as invoice')
            ->leftJoin('partners as seller_partner', 'seller_partner.id', '=', 'invoice.seller_partner_id')
            ->where('invoice.id', $invoiceId)
            ->first(['invoice.*', 'seller_partner.name as seller_partner_name']);
        abort_if($invoice === null, 404);
        $invoicePaid = $invoice->status === 'posted'
            ? ExactMoney::toCents((string) DB::table('supplier_payments')
                ->where('purchase_invoice_id', $invoiceId)->where('status', 'approved')->sum('amount_egp'))
            : '0';
        $invoicePending = $invoice->status === 'posted'
            ? ExactMoney::toCents((string) DB::table('supplier_payments')
                ->where('purchase_invoice_id', $invoiceId)->where('status', 'draft')->sum('amount_egp'))
            : '0';
        $supplierInvoices = ExactMoney::toCents((string) DB::table('purchase_invoices')
            ->where('supplier_id', $invoice->supplier_id)->where('status', 'posted')->sum('total_egp'));
        $supplierPaid = ExactMoney::toCents((string) DB::table('supplier_payments as payment')
            ->join('purchase_invoices as posted_invoice', 'posted_invoice.id', '=', 'payment.purchase_invoice_id')
            ->where('payment.supplier_id', $invoice->supplier_id)
            ->where('posted_invoice.status', 'posted')
            ->where('payment.status', 'approved')
            ->sum('payment.amount_egp'));
        $sellerProfit = '0';
        $sellerPaid = '0';
        $sellerTotalProfit = '0';
        if ($invoice->seller_partner_id !== null && $invoice->status === 'posted') {
            $sellerProfit = ExactMoney::toCents((string) DB::table('partner_profit_ledger')
                ->where('purchase_invoice_id', $invoiceId)->where('entry_type', '<>', 'payout')->sum('amount_egp'));
            $sellerTotalProfit = ExactMoney::toCents((string) DB::table('partner_profit_ledger as ledger')
                ->leftJoin('purchase_invoices as purchase_invoice', 'purchase_invoice.id', '=', 'ledger.purchase_invoice_id')
                ->where('ledger.partner_id', $invoice->seller_partner_id)
                ->where('ledger.entry_type', '<>', 'payout')
                ->where(function ($query): void {
                    $query->whereNull('ledger.purchase_invoice_id')->orWhere('purchase_invoice.status', 'posted');
                })
                ->sum('ledger.amount_egp'));
            $sellerPaid = ExactMoney::toCents((string) DB::table('partner_profit_ledger')
                ->where('partner_id', $invoice->seller_partner_id)->where('entry_type', 'payout')->sum('amount_egp'));
        }
        $invoiceTotalCents = ExactMoney::toCents((string) $invoice->total_egp);
        $supplierTotalDue = $this->signedDifference($supplierInvoices, $supplierPaid);
        $invoiceDue = $invoice->status === 'posted'
            ? $this->signedDifference($invoiceTotalCents, $invoicePaid)
            : '0.00';
        return response()->json(['data' => [
            'invoice' => $invoice,
            'financial_summary' => [
                'invoice_supplier_paid_egp' => ExactMoney::fromCents($invoicePaid),
                'invoice_supplier_due_egp' => $invoiceDue,
                'invoice_supplier_pending_egp' => ExactMoney::fromCents($invoicePending),
                'invoice_supplier_available_egp' => $this->subtractFromSigned($invoiceDue, $invoicePending),
                'supplier_total_due_egp' => $supplierTotalDue,
                'seller_profit_egp' => ExactMoney::fromCents($sellerProfit),
                'seller_total_due_egp' => $this->signedDifference($sellerTotalProfit, $sellerPaid),
            ],
            'lines' => DB::table('purchase_invoice_lines as line')
                ->join('products as product', 'product.id', '=', 'line.product_id')
                ->where('line.purchase_invoice_id', $invoiceId)
                ->orderBy('line.line_number')
                ->get(['line.*', 'product.name as product_name']),
            'supplier_payments' => DB::table('supplier_payments as payment')
                ->leftJoin('treasury_accounts as account', 'account.id', '=', 'payment.treasury_account_id')
                ->where('payment.purchase_invoice_id', $invoiceId)
                ->orderByDesc('payment.id')
                ->get(['payment.*', 'account.name as treasury_account_name']),
        ]]);
    }

    public function store(Request $request): JsonResponse
    {
        $values = $this->validateInput($request);
        $invoice = DB::transaction(function () use ($values, $request): object {
            $invoice = $this->writeInvoice($values, $request);
            $this->auditLog->record($request, 'purchase_invoice.created', 'purchase_invoice', (int) $invoice->id, null, null, [
                'invoice_number' => $invoice->invoice_number,
                'supplier_id' => $invoice->supplier_id,
                'total_egp' => $invoice->total_egp,
                'status' => $invoice->status,
            ]);
            return $invoice;
        });
        return response()->json(['data' => ['invoice' => $invoice]], 201);
    }

    public function post(Request $request, int $invoiceId): JsonResponse
    {
        $result = DB::transaction(function () use ($request, $invoiceId): array {
            $invoice = DB::table('purchase_invoices')->where('id', $invoiceId)->lockForUpdate()->first();
            abort_if($invoice === null, 404);
            if ($invoice->status === 'posted') {
                return [
                    'invoice' => $invoice,
                    'inventory_movement_ids' => DB::table('inventory_movements')
                        ->where('source_type', 'purchase_invoice')
                        ->where('source_id', $invoiceId)
                        ->orderBy('id')
                        ->pluck('id')
                        ->map(fn ($id): int => (int) $id)
                        ->all(),
                ];
            }
            if ($invoice->status !== 'draft') {
                abort(409, 'Only a draft purchase invoice can be posted.');
            }
            if ($invoice->warehouse_id === null) {
                throw ValidationException::withMessages(['warehouse_id' => ['اختر المخزن قبل اعتماد الفاتورة لاستلام الأصناف.']]);
            }
            if (DB::table('inventory_movements')->where('source_type', 'purchase_invoice')->where('source_id', $invoiceId)->exists()) {
                abort(409, 'This purchase invoice already has inventory movements.');
            }

            $lines = DB::table('purchase_invoice_lines')->where('purchase_invoice_id', $invoiceId)->orderBy('line_number')->get();
            if ($lines->isEmpty()) {
                throw ValidationException::withMessages(['lines' => ['لا يمكن اعتماد فاتورة شراء بلا أصناف.']]);
            }
            $movementIds = [];
            foreach ($lines as $line) {
                $movement = $this->inventory->receive(
                    (int) $line->product_id,
                    (int) $invoice->warehouse_id,
                    (int) $line->quantity,
                    (string) $line->unit_cost_egp,
                    [
                        'movement_type' => 'receipt',
                        'movement_date' => (string) $invoice->invoice_date,
                        'source_type' => 'purchase_invoice',
                        'source_id' => $invoiceId,
                        'reason' => 'استلام فاتورة الشراء '.$invoice->invoice_number,
                    ],
                    $request,
                );
                $movementIds[] = (int) $movement['movement_id'];
                $averageCost = DB::table('inventory_balances')
                    ->where('product_id', $line->product_id)
                    ->where('location_id', $invoice->warehouse_id)
                    ->value('average_unit_cost_egp');
                DB::table('products')->where('id', $line->product_id)->update([
                    'purchase_cost_egp' => $averageCost,
                    'updated_at' => now(),
                ]);
            }

            DB::table('purchase_invoices')->where('id', $invoiceId)->update(['status' => 'posted', 'updated_at' => now()]);
            $this->accrueSellerProfit($invoiceId, $request);
            $after = DB::table('purchase_invoices')->where('id', $invoiceId)->first();
            $this->auditLog->record($request, 'purchase_invoice.posted', 'purchase_invoice', $invoiceId, null, [
                'status' => 'draft',
                'total_egp' => $invoice->total_egp,
            ], [
                'status' => 'posted',
                'total_egp' => $invoice->total_egp,
                'warehouse_id' => (int) $invoice->warehouse_id,
                'inventory_movement_ids' => $movementIds,
            ]);
            $this->outbox->recordPostedDocument('purchase_invoice', $invoiceId, [
                'invoice_number' => $invoice->invoice_number,
                'supplier_id' => (int) $invoice->supplier_id,
                'total_egp' => (string) $invoice->total_egp,
                'inventory_movement_ids' => $movementIds,
            ]);

            return ['invoice' => $after, 'inventory_movement_ids' => $movementIds];
        }, 5);

        return response()->json(['data' => $result]);
    }

    public function update(Request $request, int $invoiceId): JsonResponse
    {
        $values = $this->validateInput($request);
        $invoice = DB::transaction(function () use ($request, $invoiceId, $values): object {
            $current = DB::table('purchase_invoices')->where('id', $invoiceId)->lockForUpdate()->first();
            abort_if($current === null, 404);
            if ($current->status !== 'draft') abort(409, 'Only a draft purchase invoice can be edited.');
            if (DB::table('inventory_movements')->where('source_type', 'purchase_invoice')->where('source_id', $invoiceId)->exists()) {
                abort(409, 'A purchase invoice linked to inventory movements cannot be edited.');
            }
            if (DB::table('supplier_payments')->where('purchase_invoice_id', $invoiceId)->exists()) {
                abort(409, 'A purchase invoice linked to supplier payments cannot be edited.');
            }
            $updated = $this->writeInvoice($values, $request, $invoiceId);
            $this->auditLog->record($request, 'purchase_invoice.updated', 'purchase_invoice', $invoiceId, null,
                ['invoice_number' => $current->invoice_number, 'total_egp' => $current->total_egp],
                ['invoice_number' => $updated->invoice_number, 'total_egp' => $updated->total_egp, 'status' => 'draft']);
            return $updated;
        }, 5);
        return response()->json(['data' => ['invoice' => $invoice]]);
    }

    public function destroy(Request $request, int $invoiceId): JsonResponse
    {
        $values = $request->validate(['reason' => ['required', 'string', 'min:3', 'max:1000']]);
        DB::transaction(function () use ($request, $invoiceId, $values): void {
            $invoice = DB::table('purchase_invoices')->where('id', $invoiceId)->lockForUpdate()->first();
            abort_if($invoice === null, 404);
            if ($invoice->status !== 'draft') abort(409, 'Only an unposted draft purchase invoice can be deleted.');
            if (DB::table('inventory_movements')->where('source_type', 'purchase_invoice')->where('source_id', $invoiceId)->exists()) {
                abort(409, 'A purchase invoice linked to inventory movements cannot be deleted.');
            }
            if (DB::table('supplier_payments')->where('purchase_invoice_id', $invoiceId)->exists()) {
                abort(409, 'A purchase invoice linked to supplier payments cannot be deleted.');
            }
            $this->auditLog->record($request, 'purchase_invoice.deleted', 'purchase_invoice', $invoiceId, $values['reason'], [
                'invoice_number' => $invoice->invoice_number, 'supplier_id' => $invoice->supplier_id,
                'total_egp' => $invoice->total_egp, 'status' => $invoice->status,
            ], null);
            DB::table('purchase_invoice_lines')->where('purchase_invoice_id', $invoiceId)->delete();
            DB::table('partner_profit_ledger')->where('purchase_invoice_id', $invoiceId)->delete();
            DB::table('purchase_invoices')->where('id', $invoiceId)->delete();
        }, 5);
        return response()->json(['data' => ['id' => $invoiceId, 'deleted' => true]]);
    }

    /** @return array<string, mixed> */
    private function validateInput(Request $request): array
    {
        return $request->validate([
            'invoice_number' => ['required', 'string', 'max:64'],
            'supplier_id' => ['required', 'integer', 'exists:suppliers,id'],
            'seller_partner_id' => ['nullable', 'integer', 'exists:partners,id'],
            'warehouse_id' => ['nullable', 'integer', 'exists:locations,id'],
            'invoice_date' => ['required', 'date_format:Y-m-d'],
            'discount_egp' => ['nullable', 'decimal:0,4', 'min:0'],
            'tax_egp' => ['nullable', 'decimal:0,4', 'min:0'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'lines.*.quantity' => ['required', 'integer', 'min:1'],
            'lines.*.unit_cost_egp' => ['required', 'decimal:0,4', 'min:0'],
            'lines.*.company_price_egp' => ['nullable', 'decimal:0,4', 'min:0'],
        ]);
    }

    /** @param array<string, mixed> $values */
    private function writeInvoice(array $values, Request $request, ?int $invoiceId = null): object
    {
        return DB::transaction(function () use ($values, $request, $invoiceId): object {
            if (($values['seller_partner_id'] ?? null) !== null) {
                $sellerPartner = DB::table('partners')->where('id', $values['seller_partner_id'])
                    ->where('is_company_partner', true)->where('status', 'active')->exists();
                if (! $sellerPartner) {
                    throw ValidationException::withMessages(['seller_partner_id' => ['اختر شريك شركة نشطًا بصفته البائع.']]);
                }
            }
            $subtotal = '0.0000';
            foreach ($values['lines'] as $line) {
                $subtotal = bcadd($subtotal, bcmul((string) $line['quantity'], (string) $line['unit_cost_egp'], 4), 4);
            }
            $discount = (string) ($values['discount_egp'] ?? '0.0000');
            $tax = (string) ($values['tax_egp'] ?? '0.0000');
            $total = bcadd(bcsub($subtotal, $discount, 4), $tax, 4);
            $attributes = [
                'invoice_number' => $values['invoice_number'], 'supplier_id' => $values['supplier_id'],
                'seller_partner_id' => $values['seller_partner_id'] ?? null,
                'warehouse_id' => $values['warehouse_id'] ?? null, 'invoice_date' => $values['invoice_date'],
                'status' => 'draft', 'subtotal_egp' => $subtotal, 'discount_egp' => $discount,
                'tax_egp' => $tax, 'total_egp' => $total, 'notes' => $values['notes'] ?? null,
                'updated_at' => now(),
            ];
            if ($invoiceId === null) {
                $attributes['created_by_user_id'] = $request->attributes->get('authenticated_user')?->id;
                $attributes['created_at'] = now();
                $id = (int) DB::table('purchase_invoices')->insertGetId($attributes);
            } else {
                DB::table('purchase_invoice_lines')->where('purchase_invoice_id', $invoiceId)->delete();
                DB::table('purchase_invoices')->where('id', $invoiceId)->update($attributes);
                $id = $invoiceId;
            }
            foreach (array_values($values['lines']) as $index => $line) {
                $lineTotal = bcmul((string) $line['quantity'], (string) $line['unit_cost_egp'], 4);
                $companyPrice = $line['company_price_egp'] ?? DB::table('products')->where('id', $line['product_id'])->value('company_price');
                DB::table('purchase_invoice_lines')->insert([
                    'purchase_invoice_id' => $id, 'product_id' => $line['product_id'], 'quantity' => $line['quantity'],
                    'unit_cost_egp' => $line['unit_cost_egp'], 'company_price_egp' => $companyPrice,
                    'line_total_egp' => $lineTotal, 'line_number' => $index + 1,
                    'created_at' => now(), 'updated_at' => now(),
                ]);
            }
            DB::table('partner_profit_ledger')
                ->where('purchase_invoice_id', $id)
                ->where('entry_type', '<>', 'payout')
                ->delete();
            return DB::table('purchase_invoices')->where('id', $id)->first();
        }, 5);
    }

    private function accrueSellerProfit(int $invoiceId, Request $request): void
    {
        DB::table('partner_profit_ledger')
            ->where('purchase_invoice_id', $invoiceId)
            ->where('entry_type', '<>', 'payout')
            ->delete();
        $invoice = DB::table('purchase_invoices')
            ->where('id', $invoiceId)
            ->first(['seller_partner_id', 'invoice_date', 'invoice_number']);
        $values = ['invoice_number' => $invoice?->invoice_number];
        $partnerId = $invoice?->seller_partner_id;
        if ($partnerId === null) return;

        $profit = '0.0000';
        foreach (DB::table('purchase_invoice_lines')->where('purchase_invoice_id', $invoiceId)->get(['quantity', 'unit_cost_egp', 'company_price_egp']) as $line) {
            if ($line->company_price_egp === null) continue;
            $margin = bcsub((string) $line->unit_cost_egp, (string) $line->company_price_egp, 4);
            if (bccomp($margin, '0.0000', 4) > 0) {
                $profit = bcadd($profit, bcmul($margin, (string) $line->quantity, 4), 4);
            }
        }
        if (bccomp($profit, '0.0000', 4) <= 0) return;

        DB::table('partner_profit_ledger')->insert([
            'partner_id' => $partnerId,
            'purchase_invoice_id' => $invoiceId,
            'entry_type' => 'accrual',
            'amount_egp' => $profit,
            'effective_date' => $invoice->invoice_date,
            'source_key' => 'purchase-invoice-accrual:'.$invoiceId,
            'notes' => 'مستحق البائع من فاتورة شراء '.$values['invoice_number'],
            'created_by_user_id' => $request->attributes->get('authenticated_user')?->id,
            'created_at' => now(),
        ]);
    }

    private function signedDifference(string $leftCents, string $rightCents): string
    {
        if (ExactMoney::compare($leftCents, $rightCents) >= 0) {
            return ExactMoney::fromCents(ExactMoney::subtract($leftCents, $rightCents));
        }

        return '-'.ExactMoney::fromCents(ExactMoney::subtract($rightCents, $leftCents));
    }

    private function subtractFromSigned(string $leftAmount, string $rightCents): string
    {
        if (str_starts_with($leftAmount, '-')) {
            $leftCents = ExactMoney::toCents(substr($leftAmount, 1));

            return '-'.ExactMoney::fromCents(ExactMoney::add($leftCents, $rightCents));
        }

        return $this->signedDifference(ExactMoney::toCents($leftAmount), $rightCents);
    }
}
