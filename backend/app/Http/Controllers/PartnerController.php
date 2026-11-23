<?php

namespace App\Http\Controllers;

use App\Support\ExactMoney;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PartnerController extends Controller
{
    public function __construct(private readonly AuditLogService $auditLog) {}

    public function index(Request $request): JsonResponse
    {
        $this->denyDriver($request);
        $ownPartnerId = $this->partnerScopeId($request);
        $query = DB::table('partners')
            ->where('is_company_partner', true)
            ->when($request->filled('search'), fn ($builder) => $builder->where('name', 'like', '%'.$request->string('search')->toString().'%'))
            ->when($ownPartnerId !== null, fn ($builder) => $builder->where('id', $ownPartnerId))
            ->orderBy('name');
        $page = $query->paginate(min(100, max(1, (int) $request->input('per_page', 50))));
        $page->getCollection()->transform(function (object $partner): object {
            $partner->profit_summary = $this->partnerProfitSummary((int) $partner->id);

            return $partner;
        });

        return response()->json($page);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $this->denyDriver($request);
        $ownPartnerId = $this->partnerScopeId($request);
        abort_if($ownPartnerId !== null && $ownPartnerId !== $id, 404);
        $partner = DB::table('partners')->find($id);
        abort_if($partner === null || ! $partner->is_company_partner, 404);
        $summary = $this->partnerProfitSummary($id);

        $invoices = $this->partnerInvoices($id);
        if ($ownPartnerId !== null) {
            foreach ($invoices as &$invoice) {
                foreach ($invoice['lines'] as &$line) {
                    unset($line['purchase_cost_egp']);
                }
                unset($line);
            }
            unset($invoice);
        }

        return response()->json(['data' => [
            'partner' => $partner,
            'profit_summary' => $summary,
            'invoices' => $invoices,
            'ledger' => $this->partnerLedger($id),
            'company_profit_from_drivers_egp' => $ownPartnerId === null ? $this->driverProfit() : null,
        ]]);
    }

    public function store(Request $request): JsonResponse
    {
        $values = $request->validate([
            'name' => ['required', 'string', 'max:160'],
            'phone' => ['required', 'string', 'max:80'],
            'profit_percentage' => ['nullable', 'decimal:0,4', 'min:0', 'max:100'],
            'user_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id', 'unique:partners,user_id'],
        ]);
        $id = DB::transaction(function () use ($request, $values): int {
            $actor = $request->attributes->get('authenticated_user');
            $id = (int) DB::table('partners')->insertGetId([
                ...$values,
                'is_company_partner' => true,
                'status' => 'active',
                'created_by_user_id' => is_object($actor) ? $actor->id : null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            if (($values['user_id'] ?? null) !== null) {
                $this->linkPartnerAccount((int) $values['user_id']);
            }
            $this->auditLog->record($request, 'partner.created', 'partner', $id, null, null, $values);

            return $id;
        }, 5);

        return response()->json(['data' => DB::table('partners')->find($id)], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $values = $request->validate([
            'name' => ['sometimes', 'string', 'max:160'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:80'],
            'status' => ['sometimes', 'in:active,inactive'],
            'profit_percentage' => ['sometimes', 'nullable', 'decimal:0,4', 'min:0', 'max:100'],
            'user_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id', 'unique:partners,user_id,'.$id],
        ]);
        abort_if($values === [], 422);
        DB::transaction(function () use ($request, $id, $values): void {
            $before = DB::table('partners')->where('id', $id)->lockForUpdate()->first();
            abort_if($before === null || ! $before->is_company_partner, 404);
            DB::table('partners')->where('id', $id)->update([...$values, 'updated_at' => now()]);
            if (array_key_exists('user_id', $values) && $values['user_id'] !== $before->user_id) {
                if ($before->user_id !== null && ! DB::table('partners')->where('user_id', $before->user_id)->where('id', '<>', $id)->exists()) {
                    $partnerRoleId = DB::table('roles')->where('code', 'partner')->value('id');
                    if ($partnerRoleId !== null) {
                        DB::table('user_roles')->where('user_id', $before->user_id)->where('role_id', $partnerRoleId)->delete();
                    }
                }
                if ($values['user_id'] !== null) {
                    $this->linkPartnerAccount((int) $values['user_id']);
                }
            }
            $this->auditLog->record($request, 'partner.updated', 'partner', $id, null, (array) $before, $values);
        }, 5);

        return response()->json(['data' => DB::table('partners')->find($id)]);
    }

    /** @return array<string, mixed> */
    private function partnerProfitSummary(int $partnerId): array
    {
        $invoices = $this->partnerInvoices($partnerId);
        $unpriced = 0;
        foreach ($invoices as $invoice) {
            foreach ($invoice['lines'] as $line) {
                if ($line['company_price_egp'] === null) {
                    $unpriced++;
                }
            }
        }
        $ledgerProfit = '0';
        foreach (DB::table('partner_profit_ledger as ledger')
            ->leftJoin('purchase_invoices as purchase_invoice', 'purchase_invoice.id', '=', 'ledger.purchase_invoice_id')
            ->where('ledger.partner_id', $partnerId)
            ->where(function ($query): void {
                $query->whereNull('ledger.purchase_invoice_id')->orWhere('purchase_invoice.status', 'posted');
            })
            ->get(['ledger.entry_type', 'ledger.amount_egp']) as $entry) {
            $amount = $this->toSignedCents((string) $entry->amount_egp);
            if ($entry->entry_type !== 'payout') {
                $ledgerProfit = $this->addSigned($ledgerProfit, $amount);
            }
        }
        $profit = $ledgerProfit;

        return [
            'invoice_count' => count($invoices),
            'profit_egp' => $this->fromSigned($profit),
            'unpriced_line_count' => $unpriced,
        ];
    }

    /** @return array<int, array<string, mixed>> */
    private function partnerLedger(int $partnerId): array
    {
        return DB::table('partner_profit_ledger as ledger')
            ->leftJoin('sales_documents as invoice', 'invoice.id', '=', 'ledger.sales_document_id')
            ->leftJoin('purchase_invoices as purchase_invoice', 'purchase_invoice.id', '=', 'ledger.purchase_invoice_id')
            ->leftJoin('sales_documents as reference', 'reference.id', '=', 'ledger.reference_document_id')
            ->leftJoin('partner_payments as payment', 'payment.id', '=', 'ledger.partner_payment_id')
            ->where('ledger.partner_id', $partnerId)
            ->where(function ($query): void {
                $query->whereNull('ledger.purchase_invoice_id')->orWhere('purchase_invoice.status', 'posted');
            })
            ->orderBy('ledger.effective_date')
            ->orderBy('ledger.id')
            ->get([
                'ledger.id', 'ledger.entry_type', 'ledger.amount_egp', 'ledger.effective_date', 'ledger.notes',
                DB::raw('COALESCE(invoice.document_number, purchase_invoice.invoice_number) as invoice_number'),
                'reference.document_number as reference_number',
                'purchase_invoice.id as purchase_invoice_id',
                'payment.id as partner_payment_id',
            ])
            ->map(static fn (object $entry): array => (array) $entry)
            ->all();
    }

    /** @return array<int, array<string, mixed>> */
    private function partnerInvoices(int $partnerId): array
    {
        $documents = DB::table('sales_documents as document')
            ->leftJoin('customers as customer', 'customer.id', '=', 'document.customer_id')
            ->where('document.issuer_type', 'partner')
            ->where('document.issuer_partner_id', $partnerId)
            ->where('document.document_type', 'invoice')
            ->where('document.status', 'posted')
            ->orderByDesc('document.issue_date')
            ->orderByDesc('document.id')
            ->get([
                'document.id',
                'document.document_number',
                'document.issue_date',
                'document.issuer_name_snapshot',
                'document.customer_name_snapshot',
                'customer.name as current_customer_name',
            ]);
        $result = [];
        foreach ($documents as $document) {
            $lines = DB::table('sales_document_lines')
                ->where('sales_document_id', $document->id)
                ->orderBy('line_number')
            ->get(['id', 'description_snapshot', 'sku_snapshot', 'quantity', 'unit_price', 'discount_amount', 'company_price_egp_snapshot', 'unit_cost_egp_snapshot', 'container_number_snapshot']);
            $rows = [];
            foreach ($lines as $line) {
                $returns = DB::table('sales_document_lines as return_line')
                    ->join('sales_documents as return_document', 'return_document.id', '=', 'return_line.sales_document_id')
                    ->where('return_line.original_document_line_id', $line->id)
                    ->where('return_document.document_type', 'credit_note')
                    ->where('return_document.status', 'posted')
                    ->get(['return_line.quantity', 'return_line.unit_price', 'return_line.discount_amount']);
                $returned = 0;
                $returnedRevenue = '0';
                foreach ($returns as $returnLine) {
                    $returnQuantity = (int) $returnLine->quantity;
                    $returned += $returnQuantity;
                    $returnedRevenue = ExactMoney::add($returnedRevenue, ExactMoney::subtract(
                        ExactMoney::multiply(ExactMoney::toCents((string) $returnLine->unit_price), $returnQuantity),
                        ExactMoney::toCents((string) $returnLine->discount_amount),
                    ));
                }
                $netQuantity = max(0, (int) $line->quantity - $returned);
                $soldRevenue = ExactMoney::subtract(
                    ExactMoney::multiply(ExactMoney::toCents((string) $line->unit_price), (int) $line->quantity),
                    ExactMoney::toCents((string) $line->discount_amount),
                );
                $netRevenue = ExactMoney::subtract($soldRevenue, $returnedRevenue);
                $profit = $line->company_price_egp_snapshot === null
                    ? null
                    : $this->difference($netRevenue, ExactMoney::multiply(ExactMoney::toCents((string) $line->company_price_egp_snapshot), $netQuantity));
                $effectiveUnitPrice = $netQuantity > 0
                    ? ExactMoney::fromCents(ExactMoney::divideRounded($netRevenue, $netQuantity))
                    : null;
                $rows[] = [
                    'product_name' => (string) $line->description_snapshot,
                    'sku' => $line->sku_snapshot,
                    'sold_quantity' => (int) $line->quantity,
                    'returned_quantity' => $returned,
                    'net_quantity' => $netQuantity,
                    'company_price_egp' => $line->company_price_egp_snapshot === null ? null : (string) $line->company_price_egp_snapshot,
                    'purchase_cost_egp' => $line->unit_cost_egp_snapshot === null ? null : (string) $line->unit_cost_egp_snapshot,
                    'container_number' => $line->container_number_snapshot,
                    'unit_price_egp' => (string) $line->unit_price,
                    'effective_unit_sale_price_egp' => $effectiveUnitPrice,
                    'markup_egp' => $profit === null || $netQuantity === 0
                        ? null
                        : $this->fromSigned($this->divideSigned($profit, $netQuantity)),
                    'profit_egp' => $profit === null ? null : $this->fromSigned($profit),
                ];
            }
            $result[] = [
                'id' => (int) $document->id,
                'invoice_number' => (string) $document->document_number,
                'issue_date' => (string) $document->issue_date,
                'issuer_name' => (string) ($document->issuer_name_snapshot ?? ''),
                'customer_name' => (string) ($document->customer_name_snapshot ?? $document->current_customer_name ?? ''),
                'profit_egp' => $this->fromSigned($this->invoiceLineProfit($rows)),
                'lines' => $rows,
            ];
        }

        return $result;
    }

    /** @param array<int, array<string, mixed>> $lines */
    private function invoiceLineProfit(array $lines): string
    {
        $total = '0';
        foreach ($lines as $line) {
            if ($line['company_price_egp'] === null) {
                continue;
            }
            $total = $this->addSigned($total, $this->toSignedCents($line['profit_egp'] ?? '0.00'));
        }

        return $total;
    }

    private function driverProfit(): string
    {
        $total = '0';
        $lines = DB::table('sales_document_lines as line')
            ->join('sales_documents as document', 'document.id', '=', 'line.sales_document_id')
            ->where('document.issuer_type', 'driver')
            ->where('document.document_type', 'invoice')
            ->where('document.status', 'posted')
            ->get(['line.id', 'line.quantity', 'line.unit_price', 'line.discount_amount', 'line.company_price_egp_snapshot', 'line.unit_cost_egp_snapshot']);
        foreach ($lines as $line) {
            if ($line->company_price_egp_snapshot === null || $line->unit_cost_egp_snapshot === null) {
                continue;
            }
            $returned = (int) DB::table('sales_document_lines as return_line')
                ->join('sales_documents as return_document', 'return_document.id', '=', 'return_line.sales_document_id')
                ->where('return_line.original_document_line_id', $line->id)
                ->where('return_document.document_type', 'credit_note')
                ->where('return_document.status', 'posted')
                ->sum('return_line.quantity');
            $quantity = max(0, (int) $line->quantity - $returned);
            $returnRevenue = '0';
            foreach (DB::table('sales_document_lines as return_line')
                ->join('sales_documents as return_document', 'return_document.id', '=', 'return_line.sales_document_id')
                ->where('return_line.original_document_line_id', $line->id)
                ->where('return_document.document_type', 'credit_note')
                ->where('return_document.status', 'posted')
                ->get(['return_line.quantity', 'return_line.unit_price', 'return_line.discount_amount']) as $returnLine) {
                $returnRevenue = ExactMoney::add($returnRevenue, ExactMoney::subtract(
                    ExactMoney::multiply(ExactMoney::toCents((string) $returnLine->unit_price), (int) $returnLine->quantity),
                    ExactMoney::toCents((string) $returnLine->discount_amount),
                ));
            }
            $saleRevenue = ExactMoney::subtract(
                ExactMoney::multiply(ExactMoney::toCents((string) $line->unit_price), (int) $line->quantity),
                ExactMoney::toCents((string) $line->discount_amount),
            );
            $netRevenue = ExactMoney::subtract($saleRevenue, $returnRevenue);
            $costValue = ExactMoney::multiply(ExactMoney::toCents((string) $line->unit_cost_egp_snapshot), $quantity);
            $total = $this->addSigned($total, $this->difference($netRevenue, $costValue));
        }

        return $this->fromSigned($total);
    }

    private function difference(string $leftAmount, string $rightAmount): string
    {
        $left = ExactMoney::toCents($leftAmount);
        $right = ExactMoney::toCents($rightAmount);

        return ExactMoney::compare($left, $right) >= 0
            ? ExactMoney::subtract($left, $right)
            : '-'.ExactMoney::subtract($right, $left);
    }

    private function multiplySigned(string $value, int $quantity): string
    {
        return str_starts_with($value, '-')
            ? '-'.ExactMoney::multiply(substr($value, 1), $quantity)
            : ExactMoney::multiply($value, $quantity);
    }

    private function divideSigned(string $value, int $quantity): string
    {
        if ($quantity <= 0) {
            return '0';
        }

        return str_starts_with($value, '-')
            ? '-'.ExactMoney::divideRounded(substr($value, 1), $quantity)
            : ExactMoney::divideRounded($value, $quantity);
    }

    private function addSigned(string $left, string $right): string
    {
        $leftNegative = str_starts_with($left, '-');
        $rightNegative = str_starts_with($right, '-');
        $leftMagnitude = $leftNegative ? substr($left, 1) : $left;
        $rightMagnitude = $rightNegative ? substr($right, 1) : $right;
        if ($leftNegative === $rightNegative) {
            $sum = ExactMoney::add($leftMagnitude, $rightMagnitude);

            return $leftNegative && $sum !== '0' ? '-'.$sum : $sum;
        }
        $comparison = ExactMoney::compare($leftMagnitude, $rightMagnitude);
        if ($comparison === 0) {
            return '0';
        }
        if ($comparison > 0) {
            $difference = ExactMoney::subtract($leftMagnitude, $rightMagnitude);

            return $leftNegative ? '-'.$difference : $difference;
        }
        $difference = ExactMoney::subtract($rightMagnitude, $leftMagnitude);

        return $rightNegative ? '-'.$difference : $difference;
    }

    private function fromSigned(string $cents): string
    {
        return str_starts_with($cents, '-')
            ? '-'.ExactMoney::fromCents(substr($cents, 1))
            : ExactMoney::fromCents($cents);
    }

    private function toSignedCents(string $amount): string
    {
        return str_starts_with($amount, '-')
            ? '-'.ExactMoney::toCents(substr($amount, 1))
            : ExactMoney::toCents($amount);
    }

    private function partnerScopeId(Request $request): ?int
    {
        $actor = $request->attributes->get('authenticated_user');
        if (! is_object($actor) || ! isset($actor->id)) {
            return null;
        }
        $isPartner = DB::table('user_roles as user_role')
            ->join('roles as role', 'role.id', '=', 'user_role.role_id')
            ->where('user_role.user_id', $actor->id)
            ->where('role.code', 'partner')
            ->where('role.is_active', true)
            ->exists();
        if (! $isPartner) {
            return null;
        }
        $isAdmin = DB::table('user_roles as user_role')
            ->join('roles as role', 'role.id', '=', 'user_role.role_id')
            ->where('user_role.user_id', $actor->id)
            ->whereIn('role.code', ['owner', 'admin'])
            ->where('role.is_active', true)
            ->exists();
        if ($isAdmin) {
            return null;
        }
        $partnerId = DB::table('partners')->where('user_id', $actor->id)->value('id');
        abort_if($partnerId === null, 403, 'The partner account is not linked to a partner record.');

        return (int) $partnerId;
    }

    private function linkPartnerAccount(int $userId): void
    {
        $partnerRoleId = DB::table('roles')->where('code', 'partner')->value('id');
        abort_if($partnerRoleId === null, 500, 'The partner role has not been installed.');
        DB::table('user_roles')->insertOrIgnore([
            'user_id' => $userId,
            'role_id' => $partnerRoleId,
            'granted_at' => now(),
        ]);
    }

    private function denyDriver(Request $request): void
    {
        $actor = $request->attributes->get('authenticated_user');
        if (is_object($actor) && DB::table('user_roles as user_role')
            ->join('roles as role', 'role.id', '=', 'user_role.role_id')
            ->where('user_role.user_id', $actor->id)
            ->where('role.code', 'driver')
            ->where('role.is_active', true)
            ->exists()) {
            abort(403);
        }
    }
}
