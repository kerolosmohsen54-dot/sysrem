<?php

namespace App\Http\Controllers;

use App\Models\SalesDocument;
use App\Services\AuditLogService;
use App\Services\MasterDataService;
use App\Services\MobileSyncEventService;
use App\Services\ReportsService;
use App\Services\SalesService;
use App\Services\TrashService;
use App\Support\ExactMoney;
use App\Support\ListQuery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

class SalesController extends Controller
{
    public function __construct(
        private readonly AuditLogService $auditLog,
        private readonly MasterDataService $masterData,
        private readonly MobileSyncEventService $mobileSyncEvents,
        private readonly ReportsService $reports,
        private readonly SalesService $sales,
        private readonly TrashService $trash,
    ) {}

    public function customers(Request $request): JsonResponse
    {
        $sortable = ['name' => 'name', 'phone' => 'phone', 'governorate' => 'governorate', 'id' => 'id', 'created_at' => 'created_at'];
        $filters = ListQuery::validate($request, $sortable, [
            'status' => ['sometimes', 'in:active,paused,blocked'],
            'governorate' => ['sometimes', 'string', 'max:120'],
            'currency' => ['sometimes', 'in:EGP,USD'],
        ]);
        $visibleCustomers = static fn () => DB::table('customers')->whereNotExists(function ($archived): void {
            $archived->selectRaw('1')->from('trash_items')
                ->where('entity_type', 'customer')
                ->whereColumn('trash_items.entity_id', 'customers.id')
                ->whereNull('restored_at')
                ->whereNull('permanently_deleted_at');
        });
        $query = ListQuery::search($visibleCustomers(), $filters, ['name', 'phone', 'governorate', 'address']);
        $query->when(isset($filters['status']), fn ($q) => $q->where('status', $filters['status']))
            ->when(isset($filters['governorate']) && $filters['governorate'] !== '', fn ($q) => $q->where('governorate', $filters['governorate']))
            ->when(isset($filters['currency']), fn ($q) => $q->whereExists(function ($orders) use ($filters): void {
                $orders->selectRaw('1')->from('sales_orders')
                    ->whereColumn('sales_orders.customer_id', 'customers.id')
                    ->where('sales_orders.currency_code', $filters['currency']);
            }));
        ListQuery::sort($query, $filters, $sortable, 'name');
        $customers = $query->paginate($filters['per_page'] ?? 50);
        $customerIds = $customers->getCollection()->pluck('id')->map(static fn ($id): int => (int) $id)->all();
        $user = $request->attributes->get('authenticated_user');
        $canViewBalances = is_object($user)
            && isset($user->id)
            && $this->hasPermission((int) $user->id, 'reports.customer_balances.view');
        $financials = [];
        $activity = [];
        foreach ($canViewBalances ? DB::table('sales_documents')->whereIn('customer_id', $customerIds)->where('document_type', 'invoice')->where('status', 'posted')->get() : [] as $invoice) {
            $financials[(int) $invoice->customer_id] ??= ['total' => '0', 'paid' => '0', 'remaining' => '0'];
            $settlement = $this->sales->invoiceSettlement($invoice);
            $financials[(int) $invoice->customer_id]['total'] = ExactMoney::add($financials[(int) $invoice->customer_id]['total'], ExactMoney::toCents((string) $invoice->total_amount));
            $financials[(int) $invoice->customer_id]['paid'] = ExactMoney::add($financials[(int) $invoice->customer_id]['paid'], ExactMoney::toCents($settlement['paid_egp']));
            $financials[(int) $invoice->customer_id]['remaining'] = ExactMoney::add($financials[(int) $invoice->customer_id]['remaining'], ExactMoney::toCents($settlement['remaining_egp']));
        }
        foreach ([
            DB::table('sales_documents')->whereIn('customer_id', $customerIds)->where('status', 'posted')->select('customer_id')->selectRaw('MAX(issue_date) AS activity_date')->groupBy('customer_id')->get(),
            DB::table('sales_receipts')->whereIn('customer_id', $customerIds)->where('status', 'posted')->select('customer_id')->selectRaw('MAX(receipt_date) AS activity_date')->groupBy('customer_id')->get(),
            DB::table('sales_orders')->whereIn('customer_id', $customerIds)->select('customer_id')->selectRaw('MAX(order_date) AS activity_date')->groupBy('customer_id')->get(),
        ] as $activityRows) {
            foreach ($activityRows as $row) {
                $id = (int) $row->customer_id;
                $date = (string) $row->activity_date;
                if (! isset($activity[$id]) || $date > $activity[$id]) $activity[$id] = $date;
            }
        }
        $balances = $canViewBalances ? $this->reports->customerBalanceRows($customerIds) : [];
        $customers->getCollection()->transform(function (object $customer) use ($balances, $canViewBalances, $financials, $activity): object {
            $customer->id = (int) $customer->id;
            $customer->is_active = (bool) $customer->is_active;
            $customer->last_activity_date = $activity[(int) $customer->id] ?? null;
            if (! $canViewBalances) {
                return $customer;
            }
            $financial = $financials[(int) $customer->id] ?? ['total' => '0', 'paid' => '0', 'remaining' => '0'];
            $customer->invoices_total_egp = ExactMoney::fromCents($financial['total']);
            $customer->paid_total_egp = ExactMoney::fromCents($financial['paid']);
            $customer->remaining_total_egp = ExactMoney::fromCents($financial['remaining']);
            $balance = $balances[(int) $customer->id] ?? ['balance' => '0.00', 'unapplied_collections' => '0.00'];
            $customer->balance = [
                'balance' => $balance['balance'],
                'unapplied_receipts' => $balance['unapplied_collections'],
            ];

            return $customer;
        });

        $response = ListQuery::page($customers);
        $response['meta']['customer_summary'] = [
            'total_customers' => (int) $visibleCustomers()->count(),
            'active_customers' => (int) $visibleCustomers()->where('status', 'active')->count(),
        ];

        return response()->json($response);
    }

    public function createCustomer(Request $request): JsonResponse
    {
        $values = $request->validate([
            'name' => ['required', 'string', 'max:200', 'unique:customers,name'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:32', 'unique:customers,phone'],
            'email' => ['sometimes', 'nullable', 'email', 'max:254'],
            'address' => ['sometimes', 'nullable', 'string', 'max:500'],
            'salesperson' => ['sometimes', 'nullable', 'string', 'max:160'],
            'tax_number' => ['sometimes', 'nullable', 'string', 'max:64'],
            'payment_terms' => ['sometimes', 'nullable', 'string', 'max:160'],
            'governorate' => ['sometimes', 'nullable', 'string', 'max:120'],
            'credit_limit' => ['sometimes', 'nullable', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,4})?\z/'],
            'notes' => ['sometimes', 'nullable', 'string'],
        ]);
        if (isset($values['credit_limit'])) {
            $values['credit_limit'] = $this->normalizedMoney($values['credit_limit'], 'credit_limit');
        }

        $customerId = $this->masterData->createCustomer($request, $values);

        return response()->json(['data' => DB::table('customers')->where('id', $customerId)->first()], 201);
    }

    public function customer(Request $request, int $customerId): JsonResponse
    {
        $customer = DB::table('customers')->where('id', $customerId)
            ->whereNotExists(function ($archived): void {
                $archived->selectRaw('1')->from('trash_items')
                    ->where('entity_type', 'customer')
                    ->whereColumn('trash_items.entity_id', 'customers.id')
                    ->whereNull('restored_at')
                    ->whereNull('permanently_deleted_at');
            })->first();
        abort_if($customer === null, 404);
        $user = $request->attributes->get('authenticated_user');
        if (is_object($user) && isset($user->id) && $this->hasPermission((int) $user->id, 'invoices.view')) {
            $lastInvoice = DB::table('sales_documents')
                ->where('customer_id', $customerId)
                ->where('document_type', 'invoice')
                ->where('status', 'posted')
                ->orderByDesc('issue_date')
                ->orderByDesc('id')
                ->first(['document_number', 'issue_date']);
            $customer->last_invoice_number = $lastInvoice?->document_number;
            $customer->last_invoice_date = $lastInvoice?->issue_date;
        }
        if (is_object($user) && isset($user->id) && $this->hasPermission((int) $user->id, 'reports.customer_balances.view')) {
            $balance = $this->reports->customerBalanceRows([$customerId])[$customerId]
                ?? ['balance' => '0.00', 'unapplied_collections' => '0.00'];
            $customer->balance = [
                'balance' => $balance['balance'],
                'unapplied_receipts' => $balance['unapplied_collections'],
            ];
        }

        return response()->json(['data' => $customer]);
    }

    public function updateCustomer(Request $request, int $customerId): JsonResponse
    {
        $values = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:200', 'unique:customers,name,'.$customerId],
            'phone' => ['sometimes', 'nullable', 'string', 'max:32', 'unique:customers,phone,'.$customerId],
            'email' => ['sometimes', 'nullable', 'email', 'max:254'],
            'address' => ['sometimes', 'nullable', 'string', 'max:500'],
            'salesperson' => ['sometimes', 'nullable', 'string', 'max:160'],
            'tax_number' => ['sometimes', 'nullable', 'string', 'max:64'],
            'payment_terms' => ['sometimes', 'nullable', 'string', 'max:160'],
            'governorate' => ['sometimes', 'nullable', 'string', 'max:120'],
            'credit_limit' => ['sometimes', 'nullable', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,4})?\z/'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
            'status' => ['sometimes', 'in:active,paused,blocked'],
        ]);
        abort_if($values === [], 422);
        $shouldArchive = array_key_exists('status', $values) === false
            && array_key_exists('is_active', $values)
            && $values['is_active'] === false;
        if (array_key_exists('credit_limit', $values) && $values['credit_limit'] !== null) {
            $values['credit_limit'] = $this->normalizedMoney($values['credit_limit'], 'credit_limit');
        }
        if (isset($values['status'])) {
            $values['is_active'] = $values['status'] === 'active';
        } elseif (array_key_exists('is_active', $values)) {
            $values['status'] = $values['is_active'] ? 'active' : 'paused';
        }
        DB::transaction(function () use ($request, $customerId, $values, $shouldArchive): void {
            $before = DB::table('customers')->where('id', $customerId)->lockForUpdate()->first();
            abort_if($before === null, 404);
            $actor = $this->actor($request);
            if ($shouldArchive && (bool) $before->is_active) {
                $this->trash->record($request, 'customer', $customerId, (string) $before->name, (array) $before);
            }
            DB::table('customers')->where('id', $customerId)->update([
                ...$values,
                'updated_by_user_id' => $actor->id,
                'updated_at' => now(),
            ]);
            $this->auditLog->record($request, 'customer.updated', 'customer', $customerId, null, (array) $before, $values);
            $this->mobileSyncEvents->record($request, 'customer', $customerId, 'updated');
        }, 5);

        $customer = DB::table('customers')->where('id', $customerId)->first();
        abort_if($customer === null, 404);
        $customer->id = (int) $customer->id;
        $customer->is_active = (bool) $customer->is_active;

        return response()->json(['data' => $customer]);
    }

    public function archiveCustomer(Request $request, int $customerId): JsonResponse
    {
        $customer = DB::transaction(function () use ($request, $customerId): object {
            $before = DB::table('customers')->where('id', $customerId)->lockForUpdate()->first();
            abort_if($before === null, 404);
            $alreadyArchived = DB::table('trash_items')->where('entity_type', 'customer')
                ->where('entity_id', $customerId)->whereNull('restored_at')->whereNull('permanently_deleted_at')->exists();
            abort_if($alreadyArchived, 409, 'This customer is already in the recycle bin.');

            $actor = $this->actor($request);
            $this->trash->record($request, 'customer', $customerId, (string) $before->name, (array) $before);
            DB::table('customers')->where('id', $customerId)->update([
                'is_active' => false,
                'status' => 'paused',
                'updated_by_user_id' => $actor->id,
                'updated_at' => now(),
            ]);
            $after = (array) DB::table('customers')->where('id', $customerId)->first();
            $after['id'] = (int) $after['id'];
            $after['is_active'] = (bool) $after['is_active'];
            $this->auditLog->record($request, 'customer.archived', 'customer', $customerId, null, (array) $before, $after);
            $this->mobileSyncEvents->record($request, 'customer', $customerId, 'updated');

            return (object) $after;
        }, 5);

        return response()->json(['data' => $customer]);
    }

    public function createOpeningBalance(Request $request, int $customerId): JsonResponse
    {
        $values = $request->validate([
            'direction' => ['required', 'in:debit,credit'],
            'amount_egp' => ['required', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,2})?\z/'],
            'issue_date' => ['required', 'date_format:Y-m-d'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ]);

        return response()->json($this->sales->createOpeningBalance($request, $customerId, $values), 201);
    }

    public function invoices(Request $request): JsonResponse
    {
        $sortable = [
            'document_number' => 'document.document_number',
            'customer' => 'customer.name',
            'issue_date' => 'document.issue_date',
            'total_amount' => 'document.total_amount',
            'id' => 'document.id',
        ];
        $filters = ListQuery::validate($request, $sortable, [
            'customer_id' => ['sometimes', 'integer', 'min:1'],
            'from_date' => ['sometimes', 'date_format:Y-m-d'],
            'to_date' => ['sometimes', 'date_format:Y-m-d', 'after_or_equal:from_date'],
            'status' => ['sometimes', 'in:draft,posted,reversed,cancelled'],
            'issuer_type' => ['sometimes', 'in:company,partner,driver'],
        ]);
        $query = DB::table('sales_documents as document')
            ->join('customers as customer', 'customer.id', '=', 'document.customer_id')
            ->where('document.document_type', 'invoice')
            ->select(['document.*', 'customer.name as customer_name'])
            ->when(isset($filters['customer_id']), fn ($q) => $q->where('document.customer_id', $filters['customer_id']))
            ->when(isset($filters['from_date']), fn ($q) => $q->where('document.issue_date', '>=', $filters['from_date']))
            ->when(isset($filters['to_date']), fn ($q) => $q->where('document.issue_date', '<=', $filters['to_date']));
        $query->when(isset($filters['status']), fn ($q) => $q->where('document.status', $filters['status']))
            ->when(isset($filters['issuer_type']), fn ($q) => $q->where('document.issuer_type', $filters['issuer_type']));
        ListQuery::search($query, $filters, ['document.document_number', 'customer.name']);
        ListQuery::sort($query, $filters, $sortable, 'issue_date', 'document.id', 'desc');

        $page = $query->paginate($filters['per_page'] ?? 50);
        $page->getCollection()->transform(function (object $document): object {
            $settlement = $this->sales->invoiceSettlement($document);
            $document->paid_egp = $settlement['paid_egp'];
            $document->remaining_egp = $settlement['remaining_egp'];
            $document->payment_status = $settlement['payment_status'];
            $document->is_overdue = $settlement['is_overdue'];

            return $document;
        });

        $monthlyRows = (clone $query)
            ->whereBetween('document.issue_date', [now()->startOfMonth()->toDateString(), now()->endOfMonth()->toDateString()])
            ->where('document.status', 'posted')
            ->get(['document.id', 'document.document_number', 'document.total_amount', 'document.due_date', 'document.status', 'document.document_type', 'document.issuer_name_snapshot']);
        $monthlyByIssuer = [];
        $monthlyTotal = '0.00';
        foreach ($monthlyRows as $document) {
            $issuerName = (string) ($document->issuer_name_snapshot ?: 'غير محدد');
            $monthlyByIssuer[$issuerName] ??= ['issuer_name' => $issuerName, 'invoice_count' => 0, 'total_egp' => '0.00'];
            $monthlyByIssuer[$issuerName]['invoice_count']++;
            $monthlyByIssuer[$issuerName]['total_egp'] = \App\Support\ExactMoney::fromCents(\App\Support\ExactMoney::add(
                \App\Support\ExactMoney::toCents($monthlyByIssuer[$issuerName]['total_egp']),
                \App\Support\ExactMoney::toCents((string) $document->total_amount),
            ));
            $monthlyTotal = \App\Support\ExactMoney::fromCents(\App\Support\ExactMoney::add(
                \App\Support\ExactMoney::toCents($monthlyTotal),
                \App\Support\ExactMoney::toCents((string) $document->total_amount),
            ));
        }

        return response()->json(array_merge(ListQuery::page($page), [
            'summary' => [
                'monthly_total_egp' => $monthlyTotal,
                'monthly_count' => count($monthlyRows),
                'by_issuer' => array_values($monthlyByIssuer),
            ],
        ]));
    }

    public function invoiceIssuers(): JsonResponse
    {
        return response()->json(['data' => [
            'company' => [['type' => 'company', 'name' => 'ماستر']],
            'partners' => DB::table('partners')->where('is_company_partner', true)->where('status', 'active')->orderBy('name')->get(['id', 'name']),
            'drivers' => DB::table('shipping_drivers')->where('is_active', true)->orderBy('name')->get(['id', 'name', 'shipping_company']),
        ]]);
    }

    public function customerLastPrices(int $customerId): JsonResponse
    {
        abort_if(! DB::table('customers')->where('id', $customerId)->exists(), 404);
        $rows = DB::table('sales_document_lines as line')
            ->join('sales_documents as document', 'document.id', '=', 'line.sales_document_id')
            ->where('document.customer_id', $customerId)
            ->where('document.document_type', 'invoice')
            ->where('document.status', 'posted')
            ->orderByDesc('document.issue_date')
            ->orderByDesc('document.id')
            ->orderByDesc('line.line_number')
            ->get(['line.product_id', 'line.unit_price', 'document.document_number', 'document.issue_date']);
        $prices = [];
        foreach ($rows as $row) {
            $prices[(int) $row->product_id] ??= [
                'product_id' => (int) $row->product_id,
                'unit_price_egp' => (string) $row->unit_price,
                'invoice_number' => (string) $row->document_number,
                'issue_date' => (string) $row->issue_date,
            ];
        }

        return response()->json(['data' => array_values($prices)]);
    }

    public function markInvoicePrinted(Request $request, int $documentId): JsonResponse
    {
        $user = $request->attributes->get('authenticated_user');
        abort_unless(is_object($user), 401);
        Gate::forUser($user)->authorize('print', SalesDocument::class);
        $result = DB::transaction(function () use ($request, $documentId): array {
            $document = DB::table('sales_documents')->where('id', $documentId)->lockForUpdate()->first();
            abort_if($document === null, 404);
            if (! in_array($document->document_type, ['invoice', 'credit_note'], true) || $document->status !== 'posted') {
                abort(409, 'Only a posted sales document can be marked as printed.');
            }
            DB::table('sales_documents')->where('id', $documentId)->update([
                'printed_at' => now(),
                'print_count' => DB::raw('print_count + 1'),
                'updated_at' => now(),
            ]);
            $this->auditLog->record($request, 'sales_document.printed', 'sales_document', $documentId, null, null, [
                'document_number' => $document->document_number,
                'print_count' => (int) $document->print_count + 1,
            ]);

            return $this->sales->invoiceResource($documentId, $request);
        }, 5);

        return response()->json(['data' => $result]);
    }

    public function invoice(Request $request, int $documentId): JsonResponse
    {
        return response()->json(['data' => $this->sales->invoiceResource($documentId, $request)]);
    }

    public function createInvoice(Request $request): JsonResponse
    {
        $user = $request->attributes->get('authenticated_user');
        abort_unless(is_object($user), 401);
        Gate::forUser($user)->authorize('createInvoice', SalesDocument::class);
        $values = $this->validateInvoiceInput($request);

        $documentId = $this->sales->createInvoice($request, $values);

        return response()->json(['data' => $this->sales->invoiceResource($documentId, $request)], 201);
    }

    public function previewInvoice(Request $request): JsonResponse
    {
        $values = $this->validateInvoiceInput($request);

        return response()->json(['data' => $this->sales->previewInvoice($values)]);
    }

    /**
     * @return array<string, mixed>
     */
    private function validateInvoiceInput(Request $request): array
    {
        return $request->validate([
            'customer_id' => ['required', 'integer', 'min:1', 'exists:customers,id'],
            'issuer_type' => ['required', 'in:company,partner,driver'],
            'issuer_partner_id' => ['required_if:issuer_type,partner', 'nullable', 'integer', 'exists:partners,id'],
            'issuer_driver_id' => ['required_if:issuer_type,driver', 'nullable', 'integer', 'exists:shipping_drivers,id'],
            'issuer_company' => ['sometimes', 'nullable', 'string', 'max:160'],
            'payment_terms' => ['sometimes', 'nullable', 'in:immediate,deferred'],
            'shipping_driver_id' => ['sometimes', 'nullable', 'integer', 'exists:shipping_drivers,id'],
            'shipping_driver_name' => ['sometimes', 'nullable', 'string', 'max:160'],
            'shipping_company' => ['sometimes', 'nullable', 'string', 'max:160'],
            'governorate' => ['sometimes', 'nullable', 'string', 'max:120'],
            'issue_date' => ['required', 'date'],
            'due_date' => ['sometimes', 'nullable', 'date', 'after_or_equal:issue_date'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'discount_type' => ['sometimes', 'nullable', 'in:fixed,percent'],
            'discount_value' => ['required_with:discount_type', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,4})?\z/'],
            'lines' => ['required', 'array', 'min:1', 'max:500'],
            'lines.*.product_id' => ['required', 'integer', 'min:1'],
            'lines.*.warehouse_id' => ['required', 'integer', 'min:1'],
            'lines.*.quantity' => ['required', 'integer', 'between:1,2147483647'],
            'lines.*.unit_price_egp' => ['required', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,4})?\z/'],
            'lines.*.discount_amount_egp' => ['sometimes', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,4})?\z/'],
            'lines.*.description' => ['sometimes', 'nullable', 'string', 'max:500'],
        ]);
    }

    public function issueInvoice(Request $request, int $documentId): JsonResponse
    {
        $user = $request->attributes->get('authenticated_user');
        abort_unless(is_object($user), 401);
        Gate::forUser($user)->authorize('issue', SalesDocument::class);
        $request->validate([
            'payments' => ['sometimes', 'array', 'max:20'],
            'payments.*.treasury_account_id' => ['required_with:payments', 'integer', 'min:1', 'exists:treasury_accounts,id'],
            'payments.*.amount_egp' => ['required_with:payments', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,4})?\z/'],
            'payments.*.payment_method' => ['sometimes', 'nullable', 'string', 'max:40'],
        ]);

        return response()->json($this->sales->issueInvoice($request, $documentId));
    }

    public function reviseInvoice(Request $request, int $documentId): JsonResponse
    {
        $user = $request->attributes->get('authenticated_user');
        abort_unless(is_object($user), 401);
        Gate::forUser($user)->authorize('revise', SalesDocument::class);
        $values = $request->validate([
            'customer_id' => ['required', 'integer', 'min:1', 'exists:customers,id'],
            'issuer_type' => ['required', 'in:company,partner,driver'],
            'issuer_partner_id' => ['required_if:issuer_type,partner', 'nullable', 'integer', 'exists:partners,id'],
            'issuer_driver_id' => ['required_if:issuer_type,driver', 'nullable', 'integer', 'exists:shipping_drivers,id'],
            'issuer_company' => ['sometimes', 'nullable', 'string', 'max:160'],
            'payment_terms' => ['sometimes', 'nullable', 'in:immediate,deferred'],
            'shipping_driver_id' => ['sometimes', 'nullable', 'integer', 'exists:shipping_drivers,id'],
            'shipping_driver_name' => ['sometimes', 'nullable', 'string', 'max:160'],
            'shipping_company' => ['sometimes', 'nullable', 'string', 'max:160'],
            'governorate' => ['sometimes', 'nullable', 'string', 'max:120'],
            'issue_date' => ['required', 'date'],
            'due_date' => ['sometimes', 'nullable', 'date', 'after_or_equal:issue_date'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'discount_type' => ['sometimes', 'nullable', 'in:fixed,percent'],
            'discount_value' => ['required_with:discount_type', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,4})?\z/'],
            'payment_account_changes' => ['sometimes', 'array', 'max:20'],
            'payment_account_changes.*.receipt_id' => ['required', 'integer', 'min:1', 'distinct', 'exists:sales_receipts,id'],
            'payment_account_changes.*.treasury_account_id' => ['required', 'integer', 'min:1', 'exists:treasury_accounts,id'],
            'reason' => ['required', 'string', 'max:1000'],
            'lines' => ['required', 'array', 'min:1', 'max:500'],
            'lines.*.product_id' => ['required', 'integer', 'min:1'],
            'lines.*.warehouse_id' => ['required', 'integer', 'min:1'],
            'lines.*.quantity' => ['required', 'integer', 'between:1,2147483647'],
            'lines.*.unit_price_egp' => ['required', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,4})?\z/'],
            'lines.*.discount_amount_egp' => ['sometimes', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,4})?\z/'],
            'lines.*.description' => ['sometimes', 'nullable', 'string', 'max:500'],
        ]);

        return response()->json($this->sales->reviseInvoice($request, $documentId, $values));
    }

    public function cancelInvoice(Request $request, int $documentId): JsonResponse
    {
        $user = $request->attributes->get('authenticated_user');
        abort_unless(is_object($user), 401);
        Gate::forUser($user)->authorize('cancel', SalesDocument::class);
        $values = $request->validate([
            'reason' => ['required', 'string', 'max:1000'],
        ]);

        return response()->json($this->sales->cancelInvoice($request, $documentId, $values['reason']));
    }

    public function restoreInvoice(Request $request, int $documentId): JsonResponse
    {
        $user = $request->attributes->get('authenticated_user');
        abort_unless(is_object($user), 401);
        Gate::forUser($user)->authorize('restore', SalesDocument::class);
        return response()->json($this->sales->restoreInvoice($request, $documentId));
    }

    public function returns(Request $request): JsonResponse
    {
        $sortable = [
            'document_number' => 'document.document_number',
            'customer' => 'customer.name',
            'issue_date' => 'document.issue_date',
            'total_amount' => 'document.total_amount',
            'id' => 'document.id',
        ];
        $filters = ListQuery::validate($request, $sortable, [
            'customer_id' => ['sometimes', 'integer', 'min:1'],
            'from_date' => ['sometimes', 'date_format:Y-m-d'],
            'to_date' => ['sometimes', 'date_format:Y-m-d', 'after_or_equal:from_date'],
            'status' => ['sometimes', 'in:draft,posted,reversed,cancelled'],
            'processing_type' => ['sometimes', 'in:linked,free'],
        ]);
        $query = DB::table('sales_documents as document')
            ->join('customers as customer', 'customer.id', '=', 'document.customer_id')
            ->leftJoin('sales_documents as original_document', 'original_document.id', '=', 'document.original_document_id')
            ->where('document.document_type', 'credit_note')
            ->select(['document.*', 'customer.name as customer_name', 'original_document.document_number as original_invoice_number'])
            ->when(isset($filters['customer_id']), fn ($q) => $q->where('document.customer_id', $filters['customer_id']))
            ->when(isset($filters['from_date']), fn ($q) => $q->where('document.issue_date', '>=', $filters['from_date']))
            ->when(isset($filters['to_date']), fn ($q) => $q->where('document.issue_date', '<=', $filters['to_date']));
        $query->when(isset($filters['status']), fn ($q) => $q->where('document.status', $filters['status']))
            ->when(isset($filters['processing_type']), fn ($q) => $q->where('document.return_processing_type', $filters['processing_type']));
        ListQuery::search($query, $filters, ['document.document_number', 'customer.name', 'original_document.document_number']);
        ListQuery::sort($query, $filters, $sortable, 'issue_date', 'document.id', 'desc');

        $page = $query->paginate($filters['per_page'] ?? 50);
        $documentIds = $page->getCollection()->pluck('id')->map(static fn ($id): int => (int) $id)->all();
        $linesByDocument = DB::table('sales_document_lines as line')
            ->join('products as product', 'product.id', '=', 'line.product_id')
            ->leftJoin('locations as location', 'location.id', '=', 'line.location_id')
            ->whereIn('line.sales_document_id', $documentIds)
            ->orderBy('line.line_number')
            ->get([
                'line.sales_document_id', 'line.id', 'line.product_id', 'line.quantity',
                'line.unit_price', 'line.line_total', 'line.return_condition',
                'product.name as product_name', 'product.sku', 'location.name as warehouse_name',
            ])
            ->groupBy('sales_document_id');
        $page->getCollection()->transform(function (object $document) use ($linesByDocument): object {
            $document->return_number = $document->document_number;
            $document->amount_egp = $document->total_amount;
            $document->reason = $document->return_reason;
            $document->processing_type = $document->return_processing_type
                ?? ($document->original_document_id === null ? 'free' : 'linked');
            $document->lines = $linesByDocument->get($document->id, collect())->values();

            return $document;
        });

        return response()->json(ListQuery::page($page));
    }

    public function return(Request $request, int $documentId): JsonResponse
    {
        $document = DB::table('sales_documents')->where('id', $documentId)->first();
        abort_if($document === null || $document->document_type !== 'credit_note', 404);

        return response()->json(['data' => $this->sales->invoiceResource($documentId, $request)]);
    }

    public function markReturnPrinted(Request $request, int $documentId): JsonResponse
    {
        $user = $request->attributes->get('authenticated_user');
        abort_unless(is_object($user), 401);
        Gate::forUser($user)->authorize('printReturn', SalesDocument::class);

        $result = DB::transaction(function () use ($request, $documentId): array {
            $document = DB::table('sales_documents')->where('id', $documentId)->lockForUpdate()->first();
            abort_if($document === null || $document->document_type !== 'credit_note' || $document->status !== 'posted', 404);
            DB::table('sales_documents')->where('id', $documentId)->update([
                'printed_at' => now(),
                'print_count' => DB::raw('print_count + 1'),
                'updated_at' => now(),
            ]);
            $this->auditLog->record($request, 'sales_return.printed', 'sales_document', $documentId, null, [
                'print_count' => (int) $document->print_count,
            ], [
                'print_count' => (int) $document->print_count + 1,
                'printed_at' => now()->toISOString(),
            ]);

            return $this->sales->invoiceResource($documentId, $request);
        }, 5);

        return response()->json(['data' => $result]);
    }

    public function createReturn(Request $request): JsonResponse
    {
        $values = $this->validateReturnInput($request);
        $user = $request->attributes->get('authenticated_user');
        abort_unless(is_object($user), 401);
        Gate::forUser($user)->authorize('createReturn', [SalesDocument::class, empty($values['original_document_id'])]);

        return response()->json($this->sales->createReturn($request, $values), 201);
    }

    public function previewReturn(Request $request): JsonResponse
    {
        $values = $this->validateReturnInput($request);
        $user = $request->attributes->get('authenticated_user');
        abort_unless(is_object($user), 401);
        Gate::forUser($user)->authorize('createReturn', [SalesDocument::class, empty($values['original_document_id'])]);

        return response()->json(['data' => $this->sales->previewReturn($values)]);
    }

    /**
     * @return array<string, mixed>
     */
    private function validateReturnInput(Request $request): array
    {
        return $request->validate([
            'customer_id' => ['required', 'integer', 'min:1', 'exists:customers,id'],
            'issuer_type' => ['required', 'in:company,partner,driver'],
            'issuer_partner_id' => ['required_if:issuer_type,partner', 'nullable', 'integer', 'exists:partners,id'],
            'issuer_driver_id' => ['required_if:issuer_type,driver', 'nullable', 'integer', 'exists:shipping_drivers,id'],
            'issuer_company' => ['sometimes', 'nullable', 'string', 'max:160'],
            'shipping_driver_id' => ['sometimes', 'nullable', 'integer', 'exists:shipping_drivers,id'],
            'shipping_driver_name' => ['sometimes', 'nullable', 'string', 'max:160'],
            'shipping_company' => ['sometimes', 'nullable', 'string', 'max:160'],
            'governorate' => ['sometimes', 'nullable', 'string', 'max:120'],
            'issue_date' => ['required', 'date'],
            'original_document_id' => ['sometimes', 'nullable', 'integer', 'min:1', 'exists:sales_documents,id'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'return_reason' => ['required', 'string', 'min:3', 'max:500'],
            'lines' => ['required', 'array', 'min:1', 'max:500'],
            'lines.*.warehouse_id' => ['required', 'integer', 'min:1'],
            'lines.*.quantity' => ['required', 'integer', 'between:1,2147483647'],
            'lines.*.return_condition' => ['required', 'in:good,damaged'],
            'lines.*.original_document_line_id' => ['sometimes', 'required_with:original_document_id', 'integer', 'min:1', 'distinct'],
            'lines.*.product_id' => ['sometimes', 'required_without:original_document_id', 'integer', 'min:1'],
            'lines.*.unit_price_egp' => ['sometimes', 'required_without:original_document_id', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,4})?\z/'],
            'lines.*.discount_amount_egp' => ['sometimes', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,4})?\z/'],
            'lines.*.unit_cost_egp' => ['sometimes', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,4})?\z/'],
            'lines.*.description' => ['sometimes', 'nullable', 'string', 'max:500'],
        ]);
    }

    public function collections(Request $request): JsonResponse
    {
        $sortable = [
            'receipt_number' => 'receipt.receipt_number',
            'customer' => 'customer.name',
            'receipt_date' => 'receipt.receipt_date',
            'amount' => 'receipt.amount',
            'id' => 'receipt.id',
        ];
        $filters = ListQuery::validate($request, $sortable, [
            'customer_id' => ['sometimes', 'integer', 'min:1'],
            'from_date' => ['sometimes', 'date_format:Y-m-d'],
            'to_date' => ['sometimes', 'date_format:Y-m-d', 'after_or_equal:from_date'],
        ]);
        $query = DB::table('sales_receipts as receipt')
            ->join('customers as customer', 'customer.id', '=', 'receipt.customer_id')
            ->where('receipt.receipt_type', 'collection')
            ->select(['receipt.*', 'customer.name as customer_name'])
            ->when(isset($filters['customer_id']), fn ($q) => $q->where('receipt.customer_id', $filters['customer_id']))
            ->when(isset($filters['from_date']), fn ($q) => $q->where('receipt.receipt_date', '>=', $filters['from_date']))
            ->when(isset($filters['to_date']), fn ($q) => $q->where('receipt.receipt_date', '<=', $filters['to_date']));
        ListQuery::search($query, $filters, ['receipt.receipt_number', 'customer.name']);
        ListQuery::sort($query, $filters, $sortable, 'receipt_date', 'receipt.id', 'desc');

        $page = $query->paginate($filters['per_page'] ?? 50);
        $page->getCollection()->transform(function (object $receipt): object {
            $amount = ExactMoney::toCents((string) $receipt->amount);
            $unapplied = ExactMoney::toCents((string) $receipt->unapplied_amount);
            abort_if(ExactMoney::compare($unapplied, $amount) > 0, 500, 'A collection unapplied amount exceeds its received amount.');
            $receipt->allocated_egp = ExactMoney::fromCents(ExactMoney::subtract($amount, $unapplied));

            return $receipt;
        });

        return response()->json(ListQuery::page($page));
    }

    public function collectionsSummary(): JsonResponse
    {
        $today = now()->toDateString();
        $monthStart = now()->startOfMonth()->toDateString();
        $receivables = $dueToday = $overdue = '0';
        $documents = DB::table('sales_documents')->where('document_type', 'invoice')->where('status', 'posted')->get();
        foreach ($documents as $document) {
            $settlement = $this->sales->invoiceSettlement($document);
            $remaining = ExactMoney::toCents($settlement['remaining_egp']);
            $receivables = ExactMoney::add($receivables, $remaining);
            if ($remaining !== '0' && $document->due_date !== null) {
                if ((string) $document->due_date === $today) $dueToday = ExactMoney::add($dueToday, $remaining);
                if ((string) $document->due_date < $today) $overdue = ExactMoney::add($overdue, $remaining);
            }
        }
        $collected = ExactMoney::toCents((string) DB::table('sales_receipts')->where('receipt_type', 'collection')->where('status', 'posted')->whereBetween('receipt_date', [$monthStart, $today])->sum('amount'));

        return response()->json(['data' => [
            'receivables_egp' => ExactMoney::fromCents($receivables), 'due_today_egp' => ExactMoney::fromCents($dueToday),
            'overdue_egp' => ExactMoney::fromCents($overdue), 'collected_this_month_egp' => ExactMoney::fromCents($collected),
            'as_of' => $today,
        ]]);
    }

    public function createCollection(Request $request): JsonResponse
    {
        $values = $request->validate([
            'customer_id' => ['required', 'integer', 'min:1', 'exists:customers,id'],
            'treasury_account_id' => ['required', 'integer', 'min:1', 'exists:treasury_accounts,id'],
            'receipt_date' => ['required', 'date'],
            'amount_egp' => ['required', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,4})?\z/'],
            'payment_method' => ['sometimes', 'nullable', 'string', 'max:40'],
            'external_reference' => ['sometimes', 'nullable', 'string', 'max:160'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'allocations' => ['sometimes', 'array', 'max:500'],
            'allocations.*.document_id' => ['required', 'integer', 'min:1', 'distinct'],
            'allocations.*.amount_egp' => ['required', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,4})?\z/'],
        ]);
        $values['allocations'] ??= [];

        return response()->json($this->sales->recordCollection($request, $values), 201);
    }

    public function showCollection(int $receiptId): JsonResponse
    {
        $receipt = DB::table('sales_receipts')
            ->where('id', $receiptId)
            ->where('receipt_type', 'collection')
            ->first();
        abort_if($receipt === null, 404);

        $allocations = DB::table('sales_receipt_allocations as allocation')
            ->join('sales_documents as document', 'document.id', '=', 'allocation.sales_document_id')
            ->where('allocation.sales_receipt_id', $receiptId)
            ->orderBy('allocation.id')
            ->get(['allocation.id', 'allocation.sales_document_id', 'allocation.allocation_amount', 'document.document_number', 'document.customer_name_snapshot']);
        $allocations = $allocations->map(function (object $allocation): array {
            $reversed = (string) DB::table('sales_receipt_allocation_reversals')->where('sales_receipt_allocation_id', $allocation->id)->sum('amount');
            $reversedCents = ExactMoney::toCents($reversed);
            $originalCents = ExactMoney::toCents((string) $allocation->allocation_amount);
            $active = ExactMoney::subtract($originalCents, $reversedCents);
            return [
                'id' => (int) $allocation->id, 'document_id' => (int) $allocation->sales_document_id,
                'invoice_number' => (string) $allocation->document_number, 'customer_name' => (string) $allocation->customer_name_snapshot,
                'amount_egp' => ExactMoney::fromCents($originalCents), 'reversed_egp' => ExactMoney::fromCents($reversedCents),
                'active_egp' => ExactMoney::fromCents($active),
                'reversals' => DB::table('sales_receipt_allocation_reversals')->where('sales_receipt_allocation_id', $allocation->id)->orderBy('id')->get()->toArray(),
            ];
        });

        return response()->json(['data' => [
            'receipt' => $receipt,
            'allocations' => $allocations,
        ]]);
    }

    public function allocateCollection(Request $request, int $receiptId): JsonResponse
    {
        $values = $request->validate([
            'allocations' => ['required', 'array', 'min:1', 'max:500'],
            'allocations.*.document_id' => ['required', 'integer', 'min:1', 'distinct'],
            'allocations.*.amount_egp' => ['required', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,4})?\z/'],
        ]);

        return response()->json($this->sales->allocateCollection($request, $receiptId, $values));
    }

    public function reverseCollectionAllocation(Request $request, int $receiptId, int $allocationId): JsonResponse
    {
        $values = $request->validate([
            'amount_egp' => ['sometimes', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,4})?\z/'],
            'reason' => ['required', 'string', 'max:1000'],
        ]);

        return response()->json($this->sales->reverseAllocation($request, $receiptId, $allocationId, $values));
    }

    public function taxSettings(): JsonResponse
    {
        $setting = DB::table('app_settings')->where('setting_key', 'sales_tax')->first(['setting_value', 'updated_at']);
        abort_if($setting === null, 503, 'Sales tax settings have not been initialized.');

        return response()->json(['data' => [
            ...json_decode((string) $setting->setting_value, true, 512, JSON_THROW_ON_ERROR),
            'updated_at' => $setting->updated_at,
        ]]);
    }

    public function updateTaxSettings(Request $request): JsonResponse
    {
        $values = $request->validate([
            'enabled' => ['required', 'boolean'],
            'rate' => ['nullable', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,2})(?:\.[0-9]{1,6})?\z/'],
            'calculation_method' => ['nullable', 'in:inclusive,exclusive'],
        ]);
        if ($values['enabled'] && (! isset($values['rate']) || ! isset($values['calculation_method']))) {
            throw ValidationException::withMessages(['sales_tax' => ['Enabling tax requires a rate and calculation method.']]);
        }
        $rate = $values['rate'] ?? null;
        $configuration = [
            'enabled' => (bool) $values['enabled'],
            'rate' => $rate,
            'calculation_method' => $values['calculation_method'] ?? null,
        ];
        DB::transaction(function () use ($request, $configuration): void {
            $actor = $this->actor($request);
            $before = DB::table('app_settings')->where('setting_key', 'sales_tax')->lockForUpdate()->value('setting_value');
            DB::table('app_settings')->updateOrInsert(
                ['setting_key' => 'sales_tax'],
                [
                    'setting_value' => json_encode($configuration, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES),
                    'description' => 'Sales tax configuration; every issued invoice line stores its calculation snapshot.',
                    'updated_by_user_id' => $actor->id,
                    'updated_at' => now(),
                ],
            );
            $this->auditLog->record(
                $request,
                'sales_tax.settings_updated',
                'app_setting',
                null,
                null,
                ['setting_value' => $before],
                ['setting_value' => $configuration],
            );
        }, 5);

        return response()->json(['data' => $configuration]);
    }

    private function normalizedMoney(string $amount, string $field): string
    {
        try {
            return ExactMoney::fromCents(ExactMoney::toCents($amount));
        } catch (InvalidArgumentException $exception) {
            throw ValidationException::withMessages([$field => [$exception->getMessage()]]);
        }
    }

    private function hasPermission(int $userId, string $permission): bool
    {
        return DB::table('role_permissions as role_permission')
            ->join('permissions', 'permissions.id', '=', 'role_permission.permission_id')
            ->join('user_roles as user_role', 'user_role.role_id', '=', 'role_permission.role_id')
            ->join('roles as role', 'role.id', '=', 'user_role.role_id')
            ->where('user_role.user_id', $userId)
            ->where('role.is_active', true)
            ->where('permissions.code', $permission)
            ->exists();
    }

    private function actor(Request $request): object
    {
        $actor = $request->attributes->get('authenticated_user');
        abort_if(! is_object($actor) || ! isset($actor->id, $actor->display_name), 401);

        return $actor;
    }
}
