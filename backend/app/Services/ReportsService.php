<?php

namespace App\Services;

use App\Support\ExactMoney;
use App\Support\ListQuery;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use RuntimeException;

class ReportsService
{
    public const PROFIT_FORMULA = 'PROVISIONAL: revenue_egp = posted invoice total_amount - invoice tax_amount (therefore after stored discounts and excluding tax); cost_egp = sum(each quantity × its stored unit_cost_egp_snapshot, rounding each extended line cost to the nearest piastre half-up); profit_egp = revenue_egp - cost_egp; markup_percent = profit_egp / cost_egp × 100, rounded to two decimal places half-up. Credit notes, returns, operating expenses, and overhead are not netted. A missing cost snapshot makes profitability null; zero cost makes markup null. Cost-based markup and all formula assumptions are PROVISIONAL pending accountant confirmation.';

    public function customerBalances(array $filters): array
    {
        $sortable = ['name' => 'name', 'phone' => 'phone', 'id' => 'id'];
        $query = ListQuery::search(DB::table('customers'), $filters, ['name', 'phone']);
        ListQuery::sort($query, $filters, $sortable, 'name');
        $customers = $query->paginate($filters['per_page'] ?? 50);

        $balances = $this->customerBalanceRows($customers->getCollection()->pluck('id')->map(static fn ($id): int => (int) $id)->all());
        $customers->getCollection()->transform(function (object $customer) use ($balances): object {
            $customer->balance = $balances[(int) $customer->id]['balance'] ?? '0.00';
            $customer->unapplied_collections = $balances[(int) $customer->id]['unapplied_collections'] ?? '0.00';

            return $customer;
        });

        return $this->page($customers);
    }

    public function customerStatement(int $customerId, array $filters): array
    {
        $customer = DB::table('customers')->where('id', $customerId)->first(['id', 'name', 'phone']);
        abort_if($customer === null, 404);

        $documents = DB::table('sales_documents as document')
            ->where('document.customer_id', $customerId)
            ->where('document.status', 'posted')
            ->selectRaw(
                "document.issue_date AS activity_date, document.id AS entry_id, 'document' AS entry_type, document.document_number, document.document_type, document.opening_balance_direction, document.total_amount AS amount_egp, CAST(NULL AS DECIMAL(19,4)) AS unapplied_amount_egp, CAST(NULL AS CHAR(16)) COLLATE utf8mb4_unicode_ci AS recording_source, CAST(0 AS UNSIGNED) AS is_unverified_payment",
            );
        $receipts = DB::table('sales_receipts as receipt')
            ->where('receipt.customer_id', $customerId)
            ->where('receipt.status', 'posted')
            ->where('receipt.receipt_type', 'collection')
            ->selectRaw(
                "receipt.receipt_date AS activity_date, receipt.id AS entry_id, 'collection' AS entry_type, receipt.receipt_number AS document_number, 'collection' AS document_type, NULL AS opening_balance_direction, receipt.amount AS amount_egp, receipt.unapplied_amount AS unapplied_amount_egp, receipt.recording_source, receipt.is_unverified_payment",
            );
        $statement = DB::query()
            ->fromSub($documents->unionAll($receipts), 'statement')
            ->when(isset($filters['from_date']), fn ($query) => $query->where('activity_date', '>=', $filters['from_date']))
            ->when(isset($filters['to_date']), fn ($query) => $query->where('activity_date', '<=', $filters['to_date']));
        ListQuery::search($statement, $filters, ['document_number', 'document_type', 'entry_type']);
        ListQuery::sort($statement, $filters, [
            'activity_date' => 'activity_date',
            'document_number' => 'document_number',
            'entry_type' => 'entry_type',
            'id' => 'entry_id',
        ], 'activity_date', 'entry_id', 'desc');
        $statement = $statement->paginate($filters['per_page'] ?? 50);

        $statement->getCollection()->transform(function (object $entry): object {
            $amount = ExactMoney::toCents((string) $entry->amount_egp);
            $entry->amount_egp = ExactMoney::fromCents($amount);
            $entry->id = (int) $entry->entry_id;
            $entry->reference = $entry->document_number;
            $entry->document_date = $entry->activity_date;
            $entry->description = null;
            $entry->debit_egp = '0.00';
            $entry->credit_egp = '0.00';
            $entry->unallocated_egp = '0.00';
            if ($entry->entry_type === 'collection') {
                $entry->is_unverified_payment = (bool) $entry->is_unverified_payment;
                $unapplied = ExactMoney::toCents((string) $entry->unapplied_amount_egp);
                if (ExactMoney::compare($unapplied, $amount) > 0) {
                    throw new RuntimeException('A collection unapplied amount exceeds its received amount.');
                }
                $entry->applied_amount_egp = ExactMoney::fromCents(ExactMoney::subtract($amount, $unapplied));
                $entry->unapplied_amount_egp = ExactMoney::fromCents($unapplied);
                $entry->credit_egp = $entry->applied_amount_egp;
                $entry->unallocated_egp = $entry->unapplied_amount_egp;
            } else {
                $entry->recording_source = null;
                $entry->is_unverified_payment = false;
                $entry->unapplied_amount_egp = null;
                $entry->entry_direction = $entry->document_type === 'opening_receivable'
                    ? $entry->opening_balance_direction
                    : ($entry->document_type === 'invoice' ? 'debit' : 'credit');
                $entry->{$entry->entry_direction === 'debit' ? 'debit_egp' : 'credit_egp'} = $entry->amount_egp;
            }

            return $entry;
        });

        $balance = $this->customerBalanceRows([$customerId])[$customerId] ?? [
            'balance' => '0.00',
            'unapplied_collections' => '0.00',
        ];
        $balance['current_balance_egp'] = $balance['balance'];
        $balance['unallocated_collections_egp'] = $balance['unapplied_collections'];

        return [
            'customer' => $customer,
            'summary' => $balance,
            ...$this->page($statement),
        ];
    }

    public function stock(array $filters, bool $canViewCosts): array
    {
        $query = DB::table('inventory_balances as balance')
            ->join('products as product', 'product.id', '=', 'balance.product_id')
            ->join('locations as location', 'location.id', '=', 'balance.location_id')
            ->leftJoin('product_location_minimum_stock as minimum', function ($join): void {
                $join->on('minimum.product_id', '=', 'balance.product_id')->on('minimum.location_id', '=', 'balance.location_id');
            })
            ->select([
                'balance.product_id',
                'product.sku',
                'product.name as product_name',
                'balance.location_id as warehouse_id',
                'location.code as warehouse_code',
                'location.name as warehouse_name',
                'balance.quantity_on_hand',
                'balance.quantity_reserved',
                'minimum.minimum_quantity as minimum_stock',
                'balance.updated_at',
            ])
            ->when(isset($filters['product_id']), fn ($q) => $q->where('balance.product_id', $filters['product_id']))
            ->when(isset($filters['warehouse_id']), fn ($q) => $q->where('balance.location_id', $filters['warehouse_id']))
            ->when(isset($filters['category_id']), fn ($q) => $q->where('product.category_id', $filters['category_id']));

        if ($canViewCosts) {
            $query->addSelect('balance.average_unit_cost_egp', 'balance.inventory_value_egp as stock_value_egp');
        }

        ListQuery::search($query, $filters, ['product.name', 'product.sku', 'location.name', 'location.code']);
        $summaryQuery = clone $query;
        $summary = $summaryQuery->select([])->selectRaw(
            'COUNT(*) AS balance_rows, COALESCE(SUM(balance.quantity_on_hand), 0) AS current_quantity'.
            ($canViewCosts ? ', COALESCE(SUM(balance.inventory_value_egp), 0) AS current_stock_value' : ''),
        )->first();
        $minimumQuery = DB::table('product_location_minimum_stock as minimum')
            ->join('inventory_balances as balance', function ($join): void {
                $join->on('balance.product_id', '=', 'minimum.product_id')->on('balance.location_id', '=', 'minimum.location_id');
            })
            ->join('products as product', 'product.id', '=', 'minimum.product_id')
            ->when(isset($filters['warehouse_id']), fn ($q) => $q->where('minimum.location_id', $filters['warehouse_id']))
            ->when(isset($filters['category_id']), fn ($q) => $q->where('product.category_id', $filters['category_id']))
            ->whereColumn('balance.quantity_on_hand', '<', 'minimum.minimum_quantity');
        if (isset($filters['search'])) {
            $minimumQuery->where(function ($search) use ($filters): void {
                $search->where('product.name', 'like', '%'.$filters['search'].'%')
                    ->orWhere('product.sku', 'like', '%'.$filters['search'].'%');
            });
        }
        $belowMinimumIds = $minimumQuery->pluck('minimum.product_id')->map(static fn ($id): int => (int) $id)->all();
        if (! isset($filters['warehouse_id'])) {
            $globalBelowQuery = DB::table('products as product')
                ->leftJoinSub(
                    DB::table('inventory_balances')->select('product_id')->selectRaw('COALESCE(SUM(quantity_on_hand), 0) AS quantity_on_hand')->groupBy('product_id'),
                    'stock', 'stock.product_id', '=', 'product.id',
                )
                ->where('product.is_active', true)->whereNotNull('product.minimum_stock')
                ->whereRaw('COALESCE(stock.quantity_on_hand, 0) < product.minimum_stock')
                ->when(isset($filters['category_id']), fn ($q) => $q->where('product.category_id', $filters['category_id']))
                ->when(isset($filters['search']), fn ($q) => $q->where(function ($search) use ($filters): void {
                    $search->where('product.name', 'like', '%'.$filters['search'].'%')->orWhere('product.sku', 'like', '%'.$filters['search'].'%');
                }));
            $belowMinimumIds = [...$belowMinimumIds, ...$globalBelowQuery->pluck('product.id')->map(static fn ($id): int => (int) $id)->all()];
        }
        $belowMinimumCount = count(array_unique($belowMinimumIds));
        $staleQuery = DB::table('inventory_balances as balance')
            ->join('products as product', 'product.id', '=', 'balance.product_id')
            ->where('balance.quantity_on_hand', '>', 0)
            ->when(isset($filters['warehouse_id']), fn ($q) => $q->where('balance.location_id', $filters['warehouse_id']))
            ->when(isset($filters['category_id']), fn ($q) => $q->where('product.category_id', $filters['category_id']))
            ->whereNotExists(function ($movements): void {
                $movements->selectRaw('1')->from('inventory_movement_lines as line')
                    ->join('inventory_movements as movement', 'movement.id', '=', 'line.inventory_movement_id')
                    ->whereColumn('line.product_id', 'balance.product_id')
                    ->where('movement.status', 'posted')
                    ->where('movement.movement_date', '>=', now()->subDays(90)->toDateString())
                    ->where(function ($locations): void {
                        $locations->whereColumn('line.from_location_id', 'balance.location_id')
                            ->orWhereColumn('line.to_location_id', 'balance.location_id');
                    });
            });
        if (isset($filters['search'])) {
            $staleQuery->where(function ($search) use ($filters): void {
                $search->where('product.name', 'like', '%'.$filters['search'].'%')
                    ->orWhere('product.sku', 'like', '%'.$filters['search'].'%');
            });
        }
        $staleCount = (int) $staleQuery->count();
        $soldQuantity = DB::table('inventory_movement_lines as line')
            ->join('inventory_movements as movement', 'movement.id', '=', 'line.inventory_movement_id')
            ->join('products as product', 'product.id', '=', 'line.product_id')
            ->where('movement.movement_type', 'sale')
            ->where('movement.status', 'posted')
            ->where('movement.movement_date', '>=', now()->subYear()->toDateString())
            ->when(isset($filters['warehouse_id']), fn ($q) => $q->where('line.from_location_id', $filters['warehouse_id']))
            ->when(isset($filters['category_id']), fn ($q) => $q->where('product.category_id', $filters['category_id']))
            ->when(isset($filters['search']), fn ($q) => $q->where(function ($search) use ($filters): void {
                $search->where('product.name', 'like', '%'.$filters['search'].'%')->orWhere('product.sku', 'like', '%'.$filters['search'].'%');
            }))
            ->sum('line.quantity');
        $currentQuantity = (int) ($summary->current_quantity ?? 0);
        ListQuery::sort($query, $filters, [
            'product_name' => 'product.name',
            'product_code' => 'product.sku',
            'warehouse_name' => 'location.name',
            'warehouse_code' => 'location.code',
            'quantity' => 'balance.quantity_on_hand',
            'id' => 'balance.product_id',
        ], 'product_name', ['balance.product_id', 'balance.location_id']);
        $page = $query->paginate($filters['per_page'] ?? 50);
        if ($canViewCosts) {
            $page->getCollection()->transform(function (object $row): object {
                foreach (['average_unit_cost_egp', 'stock_value_egp'] as $field) {
                    $row->{$field} = $row->{$field} === null
                        ? null
                        : ExactMoney::fromCents(ExactMoney::toCents((string) $row->{$field}));
                }

                return $row;
            });
        }

        return [
            ...$this->page($page),
            'summary' => [
                'balance_rows' => (int) ($summary->balance_rows ?? 0),
                'current_quantity' => (string) $currentQuantity,
                'current_stock_value_egp' => $canViewCosts
                    ? ExactMoney::fromCents(ExactMoney::toCents((string) ($summary->current_stock_value ?? '0')))
                    : null,
                'inventory_turnover' => $currentQuantity === 0 ? '0.00' : number_format((float) $soldQuantity / $currentQuantity, 2, '.', ''),
                'stale_stock_count' => $staleCount,
                'below_minimum_count' => $belowMinimumCount,
            ],
        ];
    }

    public function stockMovements(array $filters, bool $canViewCosts): array
    {
        $query = DB::table('inventory_movement_lines as line')
            ->join('inventory_movements as movement', 'movement.id', '=', 'line.inventory_movement_id')
            ->join('products as product', 'product.id', '=', 'line.product_id')
            ->select([
                'movement.id as movement_id',
                'movement.movement_number',
                'movement.movement_type',
                'movement.status',
                'movement.movement_date',
                'movement.reason',
                'line.line_number',
                'line.product_id',
                'product.sku',
                'product.name as product_name',
                'line.from_location_id',
                'line.to_location_id',
                'line.quantity',
            ])
            ->when(isset($filters['product_id']), fn ($q) => $q->where('line.product_id', $filters['product_id']))
            ->when(isset($filters['warehouse_id']), function ($q) use ($filters): void {
                $q->where(function ($locations) use ($filters): void {
                    $locations->where('line.from_location_id', $filters['warehouse_id'])
                        ->orWhere('line.to_location_id', $filters['warehouse_id']);
                });
            })
            ->when(isset($filters['movement_type']), fn ($q) => $q->where('movement.movement_type', $filters['movement_type']))
            ->when(isset($filters['from_date']), fn ($q) => $q->where('movement.movement_date', '>=', $filters['from_date']))
            ->when(isset($filters['to_date']), fn ($q) => $q->where('movement.movement_date', '<=', $filters['to_date']));
        ListQuery::search($query, $filters, ['movement.movement_number', 'movement.reason', 'product.name', 'product.sku']);

        if ($canViewCosts) {
            $query->addSelect('line.unit_cost_egp_snapshot', 'line.line_cost_egp_snapshot');
        }

        ListQuery::sort($query, $filters, [
            'movement_date' => 'movement.movement_date',
            'movement_number' => 'movement.movement_number',
            'movement_type' => 'movement.movement_type',
            'product_name' => 'product.name',
            'product_code' => 'product.sku',
            'quantity' => 'line.quantity',
            'id' => 'movement.id',
        ], 'movement_date', ['movement.id', 'line.line_number'], 'desc');
        $query->orderBy('line.line_number');
        $page = $query->paginate($filters['per_page'] ?? 50);
        $locationIds = $page->getCollection()
            ->flatMap(static fn (object $row): array => array_filter([
                $row->from_location_id === null ? null : (int) $row->from_location_id,
                $row->to_location_id === null ? null : (int) $row->to_location_id,
            ], static fn (?int $id): bool => $id !== null))
            ->unique()
            ->values()
            ->all();
        $locationNames = $locationIds === []
            ? collect()
            : DB::table('locations')->whereIn('id', $locationIds)->pluck('name', 'id');
        $page->getCollection()->transform(function (object $row) use ($locationNames): object {
            $row->from_location_name = $row->from_location_id === null
                ? null
                : ($locationNames[$row->from_location_id] ?? null);
            $row->to_location_name = $row->to_location_id === null
                ? null
                : ($locationNames[$row->to_location_id] ?? null);

            return $row;
        });
        if ($canViewCosts) {
            $page->getCollection()->transform(function (object $row): object {
                foreach (['unit_cost_egp_snapshot', 'line_cost_egp_snapshot'] as $field) {
                    $row->{$field} = $row->{$field} === null
                        ? null
                        : ExactMoney::fromCents(ExactMoney::toCents((string) $row->{$field}));
                }

                return $row;
            });
        }

        return $this->page($page);
    }

    public function sales(array $filters): array
    {
        $query = DB::table('sales_documents as document')
            ->join('customers as customer', 'customer.id', '=', 'document.customer_id')
            ->leftJoin('users as poster', 'poster.id', '=', 'document.posted_by_user_id')
            ->where('document.document_type', 'invoice')
            ->where('document.status', 'posted')
            ->select([
                'document.id',
                'document.document_number',
                'document.document_type',
                'document.status',
                'document.customer_id',
                'customer.name as customer_name',
                'document.issue_date as document_date',
                'document.due_date',
                'document.subtotal',
                'document.discount_amount',
                'document.tax_amount',
                'document.total_amount as total_egp',
                'document.posted_by_user_id as salesperson_id',
                'poster.display_name as salesperson_name',
            ])
            ->when(isset($filters['customer_id']), fn ($q) => $q->where('document.customer_id', $filters['customer_id']))
            ->when(isset($filters['salesperson_id']), fn ($q) => $q->where('document.posted_by_user_id', $filters['salesperson_id']))
            ->when(isset($filters['from_date']), fn ($q) => $q->where('document.issue_date', '>=', $filters['from_date']))
            ->when(isset($filters['to_date']), fn ($q) => $q->where('document.issue_date', '<=', $filters['to_date']))
            ->when(isset($filters['document_number']), fn ($q) => $q->where('document.document_number', 'like', '%'.$filters['document_number'].'%'));
        ListQuery::search($query, $filters, ['document.document_number', 'customer.name']);
        $summaryQuery = clone $query;
        $summaryTotals = $summaryQuery->select([])->selectRaw('COUNT(document.id) AS invoice_count, COALESCE(SUM(document.total_amount), 0) AS total_sales, COALESCE(SUM(document.discount_amount), 0) AS total_discounts')->first();
        $invoiceCount = (int) ($summaryTotals->invoice_count ?? 0);
        $totalSales = ExactMoney::toCents((string) ($summaryTotals->total_sales ?? '0'));
        $employees = DB::table('sales_documents as document')
            ->leftJoin('users as poster', 'poster.id', '=', 'document.posted_by_user_id')
            ->where('document.document_type', 'invoice')
            ->where('document.status', 'posted')
            ->when(isset($filters['customer_id']), fn ($q) => $q->where('document.customer_id', $filters['customer_id']))
            ->when(isset($filters['salesperson_id']), fn ($q) => $q->where('document.posted_by_user_id', $filters['salesperson_id']))
            ->when(isset($filters['from_date']), fn ($q) => $q->where('document.issue_date', '>=', $filters['from_date']))
            ->when(isset($filters['to_date']), fn ($q) => $q->where('document.issue_date', '<=', $filters['to_date']))
            ->when(isset($filters['document_number']), fn ($q) => $q->where('document.document_number', 'like', '%'.$filters['document_number'].'%'))
            ->when(isset($filters['search']), fn ($q) => $q->where(function ($search) use ($filters): void {
                $search->where('document.document_number', 'like', '%'.$filters['search'].'%')
                    ->orWhere('poster.display_name', 'like', '%'.$filters['search'].'%')
                    ->orWhereExists(fn ($customers) => $customers->selectRaw('1')->from('customers')->whereColumn('customers.id', 'document.customer_id')->where('customers.name', 'like', '%'.$filters['search'].'%'));
            }))
            ->groupBy('document.posted_by_user_id', 'poster.display_name')
            ->orderByRaw('SUM(document.total_amount) DESC')
            ->get([
                'document.posted_by_user_id as salesperson_id',
                DB::raw("COALESCE(poster.display_name, 'غير محدد') AS salesperson_name"),
                DB::raw('COUNT(document.id) AS invoice_count'),
                DB::raw('SUM(document.discount_amount) AS discounts'),
                DB::raw('SUM(document.total_amount) AS total_sales'),
            ])
            ->map(static fn (object $row): array => [
                'salesperson_id' => $row->salesperson_id === null ? null : (int) $row->salesperson_id,
                'salesperson_name' => $row->salesperson_name,
                'invoice_count' => (int) $row->invoice_count,
                'discounts_egp' => ExactMoney::fromCents(ExactMoney::toCents((string) $row->discounts)),
                'total_sales_egp' => ExactMoney::fromCents(ExactMoney::toCents((string) $row->total_sales)),
            ])->all();
        $groupBy = $filters['group_by'] ?? 'month';
        $groupExpression = match ($groupBy) {
            'week' => "CONCAT(YEARWEEK(document.issue_date, 3), '')",
            'employee' => "COALESCE(poster.display_name, 'غير محدد')",
            'customer' => 'customer.name',
            'discounts' => "IF(document.discount_amount > 0, 'بخصم', 'بدون خصم')",
            default => "DATE_FORMAT(document.issue_date, '%Y-%m')",
        };
        $groupsQuery = DB::table('sales_documents as document')
            ->leftJoin('users as poster', 'poster.id', '=', 'document.posted_by_user_id')
            ->join('customers as customer', 'customer.id', '=', 'document.customer_id')
            ->where('document.document_type', 'invoice')
            ->where('document.status', 'posted')
            ->when(isset($filters['customer_id']), fn ($q) => $q->where('document.customer_id', $filters['customer_id']))
            ->when(isset($filters['salesperson_id']), fn ($q) => $q->where('document.posted_by_user_id', $filters['salesperson_id']))
            ->when(isset($filters['from_date']), fn ($q) => $q->where('document.issue_date', '>=', $filters['from_date']))
            ->when(isset($filters['to_date']), fn ($q) => $q->where('document.issue_date', '<=', $filters['to_date']))
            ->when(isset($filters['document_number']), fn ($q) => $q->where('document.document_number', 'like', '%'.$filters['document_number'].'%'))
            ->when(isset($filters['search']), fn ($q) => $q->where(function ($search) use ($filters): void {
                $search->where('document.document_number', 'like', '%'.$filters['search'].'%')
                    ->orWhere('poster.display_name', 'like', '%'.$filters['search'].'%')
                    ->orWhereExists(fn ($customers) => $customers->selectRaw('1')->from('customers')->whereColumn('customers.id', 'document.customer_id')->where('customers.name', 'like', '%'.$filters['search'].'%'));
            }))
            ->selectRaw("{$groupExpression} AS label, COUNT(document.id) AS invoice_count, SUM(document.total_amount) AS total_sales, SUM(document.discount_amount) AS total_discounts")
            ->groupByRaw($groupExpression)
            ->orderByRaw('MIN(document.issue_date)');
        $groups = $groupsQuery->get()->map(static fn (object $row): array => [
            'label' => (string) $row->label,
            'invoice_count' => (int) $row->invoice_count,
            'total_sales_egp' => ExactMoney::fromCents(ExactMoney::toCents((string) $row->total_sales)),
            'total_discounts_egp' => ExactMoney::fromCents(ExactMoney::toCents((string) $row->total_discounts)),
        ])->all();
        ListQuery::sort($query, $filters, [
            'issue_date' => 'document.issue_date',
            'document_number' => 'document.document_number',
            'customer' => 'customer.name',
            'total_amount' => 'document.total_amount',
            'id' => 'document.id',
        ], 'issue_date', 'document.id', 'desc');
        $page = $query->paginate($filters['per_page'] ?? 50);

        return [
            ...$this->page($page),
            'summary' => [
                'total_sales_egp' => ExactMoney::fromCents($totalSales),
                'invoice_count' => $invoiceCount,
                'average_invoice_value_egp' => $invoiceCount === 0 ? '0.00' : ExactMoney::fromCents($this->divideRounded($totalSales, (string) $invoiceCount)),
                'total_discounts_egp' => ExactMoney::fromCents(ExactMoney::toCents((string) ($summaryTotals->total_discounts ?? '0'))),
                'top_employee_name' => $employees[0]['salesperson_name'] ?? null,
                'employees' => $employees,
                'group_by' => $groupBy,
                'groups' => $groups,
            ],
        ];
    }

    public function containerCosts(array $filters): array
    {
        $containerQuery = DB::table('containers as container')
            ->select(['container.id', 'container.container_number', 'container.status', 'container.origin', 'container.destination'])
            ->when(isset($filters['container_id']), fn ($q) => $q->where('container.id', $filters['container_id']))
            ->when(isset($filters['from_date']) || isset($filters['to_date']) || isset($filters['status']), function ($q) use ($filters): void {
                $q->whereExists(function ($costs) use ($filters): void {
                    $costs->selectRaw('1')
                        ->from('container_costs as cost')
                        ->whereColumn('cost.container_id', 'container.id')
                        ->when(isset($filters['from_date']), fn ($sub) => $sub->where('cost.cost_date', '>=', $filters['from_date']))
                        ->when(isset($filters['to_date']), fn ($sub) => $sub->where('cost.cost_date', '<=', $filters['to_date']))
                        ->when(isset($filters['status']), fn ($sub) => $sub->where('cost.status', $filters['status']))
                        ->when(! isset($filters['status']), fn ($sub) => $sub->where('cost.status', '<>', 'cancelled'));
                });
            });
        ListQuery::search($containerQuery, $filters, ['container.container_number', 'container.origin', 'container.destination']);
        ListQuery::sort($containerQuery, $filters, [
            'container_number' => 'container.container_number',
            'status' => 'container.status',
            'origin' => 'container.origin',
            'destination' => 'container.destination',
            'id' => 'container.id',
        ], 'id', 'container.id', 'desc');
        $page = $containerQuery->paginate($filters['per_page'] ?? 50);
        $containerIds = $page->getCollection()->pluck('id')->map(static fn ($id): int => (int) $id)->all();
        if ($containerIds !== []) {
            $costs = DB::table('container_costs as cost')
                ->whereIn('cost.container_id', $containerIds)
                ->when(isset($filters['from_date']), fn ($q) => $q->where('cost.cost_date', '>=', $filters['from_date']))
                ->when(isset($filters['to_date']), fn ($q) => $q->where('cost.cost_date', '<=', $filters['to_date']))
                ->when(isset($filters['status']), fn ($q) => $q->where('cost.status', $filters['status']))
                ->when(! isset($filters['status']), fn ($q) => $q->where('cost.status', '<>', 'cancelled'))
                ->orderBy('cost.id')
                ->get(['cost.id', 'cost.container_id', 'cost.cost_type', 'cost.description', 'cost.amount_egp', 'cost.status']);
            $costIds = $costs->pluck('id')->map(static fn ($id): int => (int) $id)->all();
            $payments = $costIds === [] ? collect() : DB::table('container_cost_payments')
                ->whereIn('container_cost_id', $costIds)
                ->get(['container_cost_id', 'amount_egp']);
            $allocations = $costIds === [] ? collect() : DB::table('container_cost_allocations')
                ->whereIn('container_cost_id', $costIds)
                ->get(['container_cost_id', 'allocated_amount']);
            $paidByCost = [];
            foreach ($payments as $payment) {
                $id = (int) $payment->container_cost_id;
                $paidByCost[$id] = ExactMoney::add($paidByCost[$id] ?? '0', ExactMoney::toCents((string) $payment->amount_egp));
            }
            $allocatedByCost = [];
            foreach ($allocations as $allocation) {
                $id = (int) $allocation->container_cost_id;
                $allocatedByCost[$id] = ExactMoney::add($allocatedByCost[$id] ?? '0', ExactMoney::toCents((string) $allocation->allocated_amount));
            }
            $summary = [];
            foreach ($costs as $cost) {
                $containerId = (int) $cost->container_id;
                $costId = (int) $cost->id;
                $amount = ExactMoney::toCents((string) $cost->amount_egp);
                $summary[$containerId] ??= ['total' => '0', 'paid' => '0', 'allocated' => '0', 'costs' => []];
                $summary[$containerId]['total'] = ExactMoney::add($summary[$containerId]['total'], $amount);
                $summary[$containerId]['paid'] = ExactMoney::add($summary[$containerId]['paid'], $paidByCost[$costId] ?? '0');
                $summary[$containerId]['allocated'] = ExactMoney::add($summary[$containerId]['allocated'], $allocatedByCost[$costId] ?? '0');
                $summary[$containerId]['costs'][] = [
                    'id' => $costId,
                    'cost_type' => $cost->cost_type,
                    'description' => $cost->description,
                    'status' => $cost->status,
                    'amount_egp' => ExactMoney::fromCents($amount),
                ];
            }
            $page->getCollection()->transform(function (object $container) use ($summary): array {
                $totals = $summary[(int) $container->id] ?? ['total' => '0', 'paid' => '0', 'allocated' => '0', 'costs' => []];

                return [
                    'container' => $container,
                    'total_cost_egp' => ExactMoney::fromCents($totals['total']),
                    'paid_egp' => ExactMoney::fromCents($totals['paid']),
                    'unpaid_egp' => $this->signedMoney($totals['total'], $totals['paid']),
                    'allocated_to_inventory_egp' => ExactMoney::fromCents($totals['allocated']),
                    'costs' => $totals['costs'],
                ];
            });
        }

        return $this->page($page);
    }

    public function invoiceProfit(array $filters): array
    {
        $query = DB::table('sales_documents as document')
            ->join('customers as customer', 'customer.id', '=', 'document.customer_id')
            ->where('document.document_type', 'invoice')
            ->where('document.status', 'posted')
            ->select([
                'document.id',
                'document.document_number',
                'document.customer_id',
                'customer.name as customer_name',
                'document.issue_date',
                'document.total_amount',
                'document.tax_amount',
            ])
            ->when(isset($filters['customer_id']), fn ($q) => $q->where('document.customer_id', $filters['customer_id']))
            ->when(isset($filters['from_date']), fn ($q) => $q->where('document.issue_date', '>=', $filters['from_date']))
            ->when(isset($filters['to_date']), fn ($q) => $q->where('document.issue_date', '<=', $filters['to_date']));
        ListQuery::search($query, $filters, ['document.document_number', 'customer.name']);
        ListQuery::sort($query, $filters, [
            'issue_date' => 'document.issue_date',
            'document_number' => 'document.document_number',
            'customer' => 'customer.name',
            'revenue' => 'document.total_amount',
            'id' => 'document.id',
        ], 'issue_date', 'document.id', 'desc');
        $page = $query->paginate($filters['per_page'] ?? 50);

        $documentIds = $page->getCollection()->pluck('id')->map(static fn ($id): int => (int) $id)->all();
        $costs = [];
        $complete = [];
        if ($documentIds !== []) {
            foreach (DB::table('sales_document_lines')
                ->whereIn('sales_document_id', $documentIds)
                ->orderBy('sales_document_id')
                ->orderBy('line_number')
                ->get(['sales_document_id', 'quantity', 'unit_cost_egp_snapshot']) as $line) {
                $id = (int) $line->sales_document_id;
                if ($line->unit_cost_egp_snapshot === null) {
                    $complete[$id] = false;

                    continue;
                }
                $lineCost = $this->extendedSnapshotCostCents(
                    (string) $line->unit_cost_egp_snapshot,
                    (int) $line->quantity,
                );
                $costs[$id] = ExactMoney::add($costs[$id] ?? '0', $lineCost);
                $complete[$id] ??= true;
            }
        }

        $page->getCollection()->transform(function (object $invoice) use ($costs, $complete): array {
            $id = (int) $invoice->id;
            $hasCostSnapshot = ($complete[$id] ?? false) && array_key_exists($id, $costs);
            $revenue = ExactMoney::subtract(
                ExactMoney::toCents((string) $invoice->total_amount),
                ExactMoney::toCents((string) $invoice->tax_amount),
            );
            $cost = $costs[$id] ?? '0';
            $profit = $hasCostSnapshot ? $this->signedDifference($revenue, $cost) : null;

            return [
                'id' => $id,
                'document_number' => $invoice->document_number,
                'customer_id' => (int) $invoice->customer_id,
                'customer_name' => $invoice->customer_name,
                'issue_date' => $invoice->issue_date,
                'revenue_excluding_tax_egp' => ExactMoney::fromCents($revenue),
                'cost_egp' => $hasCostSnapshot ? ExactMoney::fromCents($cost) : null,
                'profit_egp' => $profit === null ? null : $this->signedAmount($profit),
                'markup_percent' => $hasCostSnapshot && $cost !== '0' && $profit !== null
                    ? $this->percentage($profit, $cost)
                    : null,
                'cost_snapshot_complete' => $hasCostSnapshot,
                'formula_status' => 'PROVISIONAL',
            ];
        });

        return [
            ...$this->page($page),
            'meta' => [
                ...$this->pageMeta($page),
                'formula_status' => 'PROVISIONAL',
                'formula' => self::PROFIT_FORMULA,
            ],
        ];
    }

    /**
     * Report the split between the company and invoice-issuing partner using
     * the immutable issue-time price and cost snapshots. Returns are applied
     * against the original line quantities and prices.
     *
     * @return array<string, mixed>
     */
    public function profitDistribution(array $filters): array
    {
        $documents = DB::table('sales_documents as document')
            ->leftJoin('customers as customer', 'customer.id', '=', 'document.customer_id')
            ->where('document.document_type', 'invoice')
            ->where('document.status', 'posted')
            ->when(isset($filters['from_date']), fn ($query) => $query->where('document.issue_date', '>=', $filters['from_date']))
            ->when(isset($filters['to_date']), fn ($query) => $query->where('document.issue_date', '<=', $filters['to_date']))
            ->orderBy('document.issue_date')
            ->orderBy('document.id')
            ->get([
                'document.id', 'document.document_number', 'document.issue_date', 'document.issuer_type',
                'document.issuer_partner_id', 'document.issuer_name_snapshot', 'document.profit_pricing_status',
                'customer.name as customer_name',
            ]);

        $invoiceRows = [];
        $containers = [];
        $totalRevenue = '0';
        $totalCogs = '0';
        $totalCompanyProfit = ['sign' => '+', 'amount' => '0'];
        $totalPartnerProfit = ['sign' => '+', 'amount' => '0'];
        $unpricedInvoiceCount = 0;
        $allCostsComplete = true;
        $allSplitsComplete = true;

        foreach ($documents as $document) {
            $lines = DB::table('sales_document_lines')
                ->where('sales_document_id', $document->id)
                ->orderBy('line_number')
                ->get([
                    'id', 'description_snapshot', 'sku_snapshot', 'quantity', 'unit_price', 'discount_amount',
                    'company_price_egp_snapshot', 'unit_cost_egp_snapshot', 'container_number_snapshot',
                ]);
            $invoiceRevenue = '0';
            $invoiceCogs = '0';
            $invoiceCompanyProfit = ['sign' => '+', 'amount' => '0'];
            $invoicePartnerProfit = ['sign' => '+', 'amount' => '0'];
            $invoiceSurplus = ['sign' => '+', 'amount' => '0'];
            $costsComplete = $lines->isNotEmpty();
            $splitComplete = $lines->isNotEmpty();
            $lineRows = [];

            foreach ($lines as $line) {
                $returnedQuantity = 0;
                $returnedRevenue = '0';
                foreach (DB::table('sales_document_lines as return_line')
                    ->join('sales_documents as return_document', 'return_document.id', '=', 'return_line.sales_document_id')
                    ->where('return_line.original_document_line_id', $line->id)
                    ->where('return_document.document_type', 'credit_note')
                    ->where('return_document.status', 'posted')
                    ->get(['return_line.quantity', 'return_line.unit_price', 'return_line.discount_amount']) as $returnLine) {
                    $quantity = (int) $returnLine->quantity;
                    $returnedQuantity += $quantity;
                    $returnedRevenue = ExactMoney::add(
                        $returnedRevenue,
                        ExactMoney::subtract(
                            ExactMoney::multiply(ExactMoney::toCents((string) $returnLine->unit_price), $quantity),
                            ExactMoney::toCents((string) $returnLine->discount_amount),
                        ),
                    );
                }

                $soldQuantity = (int) $line->quantity;
                $netQuantity = max(0, $soldQuantity - $returnedQuantity);
                $soldRevenue = ExactMoney::subtract(
                    ExactMoney::multiply(ExactMoney::toCents((string) $line->unit_price), $soldQuantity),
                    ExactMoney::toCents((string) $line->discount_amount),
                );
                $netRevenue = ExactMoney::subtract($soldRevenue, $returnedRevenue);
                $invoiceRevenue = ExactMoney::add($invoiceRevenue, $netRevenue);
                $containerNumber = (string) ($line->container_number_snapshot ?? 'غير محدد');
                $container = $containers[$containerNumber] ?? [
                    'container_number' => $containerNumber,
                    'revenue' => '0',
                    'cogs' => '0',
                    'profit' => ['sign' => '+', 'amount' => '0'],
                    'costs_complete' => true,
                    'invoice_count' => [],
                ];
                $container['revenue'] = ExactMoney::add($container['revenue'], $netRevenue);
                $container['invoice_count'][(int) $document->id] = true;

                $lineCogs = null;
                $lineSurplus = null;
                $lineCompanyProfit = null;
                if ($line->unit_cost_egp_snapshot === null) {
                    $costsComplete = false;
                    $container['costs_complete'] = false;
                    $allCostsComplete = false;
                } else {
                    $lineCogs = ExactMoney::multiply(ExactMoney::toCents((string) $line->unit_cost_egp_snapshot), $netQuantity);
                    $invoiceCogs = ExactMoney::add($invoiceCogs, $lineCogs);
                    $container['cogs'] = ExactMoney::add($container['cogs'], $lineCogs);
                }

                if ($line->company_price_egp_snapshot === null || $line->unit_cost_egp_snapshot === null) {
                    $splitComplete = false;
                    $allSplitsComplete = false;
                } else {
                    $companyValue = ExactMoney::multiply(ExactMoney::toCents((string) $line->company_price_egp_snapshot), $netQuantity);
                    $lineSurplus = $this->signedDifference($netRevenue, $companyValue);
                    $lineCompanyProfit = $this->signedDifference($companyValue, $lineCogs ?? '0');
                    $invoiceSurplus = $this->signedSum($invoiceSurplus, $lineSurplus);

                    if ($document->issuer_type === 'partner') {
                        $invoicePartnerProfit = $this->signedSum($invoicePartnerProfit, $lineSurplus);
                    } else {
                        $invoiceCompanyProfit = $this->signedSum($invoiceCompanyProfit, $lineCompanyProfit);
                        $invoiceCompanyProfit = $this->signedSum($invoiceCompanyProfit, $lineSurplus);
                    }
                }

                if ($document->issuer_type === 'partner' && $lineCompanyProfit !== null) {
                    $invoiceCompanyProfit = $this->signedSum($invoiceCompanyProfit, $lineCompanyProfit);
                }

                if ($lineCogs === null) {
                    $container['profit'] = null;
                } elseif ($container['profit'] !== null) {
                    $container['profit'] = $this->signedSum($container['profit'], $this->signedDifference($netRevenue, $lineCogs));
                }

                $lineRows[] = [
                    'product_name' => (string) $line->description_snapshot,
                    'sku' => $line->sku_snapshot,
                    'container_number' => $line->container_number_snapshot,
                    'sold_quantity' => $soldQuantity,
                    'returned_quantity' => $returnedQuantity,
                    'net_quantity' => $netQuantity,
                    'sale_revenue_egp' => ExactMoney::fromCents($netRevenue),
                    'company_price_egp' => $line->company_price_egp_snapshot === null ? null : (string) $line->company_price_egp_snapshot,
                    'purchase_cost_egp' => $line->unit_cost_egp_snapshot === null ? null : (string) $line->unit_cost_egp_snapshot,
                    'cogs_egp' => $lineCogs === null ? null : ExactMoney::fromCents($lineCogs),
                    'surplus_egp' => $lineSurplus === null ? null : $this->signedAmount($lineSurplus),
                    'company_profit_egp' => $lineCompanyProfit === null ? null : $this->signedAmount(
                        $document->issuer_type === 'partner'
                            ? $lineCompanyProfit
                            : $this->signedSum($lineCompanyProfit, $lineSurplus ?? ['sign' => '+', 'amount' => '0']),
                    ),
                ];
                $containers[$containerNumber] = $container;
            }

            $ledgerPartnerProfit = ['sign' => '+', 'amount' => '0'];
            foreach (DB::table('partner_profit_ledger')
                ->where('sales_document_id', $document->id)
                ->whereIn('entry_type', ['accrual', 'reversal'])
                ->get(['amount_egp']) as $entry) {
                $amount = (string) $entry->amount_egp;
                $ledgerPartnerProfit = $this->signedSum($ledgerPartnerProfit, [
                    'sign' => str_starts_with($amount, '-') ? '-' : '+',
                    'amount' => ExactMoney::toCents(ltrim($amount, '-')),
                ]);
            }
            if ($document->issuer_type === 'partner' && $splitComplete) {
                $invoicePartnerProfit = $ledgerPartnerProfit;
            }

            $invoiceTotalProfit = $this->signedSum($invoiceCompanyProfit, $invoicePartnerProfit);
            if (! $costsComplete || ! $splitComplete) {
                $unpricedInvoiceCount++;
            }
            $totalRevenue = ExactMoney::add($totalRevenue, $invoiceRevenue);
            if ($costsComplete) {
                $totalCogs = ExactMoney::add($totalCogs, $invoiceCogs);
            }
            if ($costsComplete && $splitComplete) {
                $totalCompanyProfit = $this->signedSum($totalCompanyProfit, $invoiceCompanyProfit);
                $totalPartnerProfit = $this->signedSum($totalPartnerProfit, $invoicePartnerProfit);
            }

            $invoiceRows[] = [
                'id' => (int) $document->id,
                'invoice_number' => (string) $document->document_number,
                'issue_date' => (string) $document->issue_date,
                'customer_name' => (string) ($document->customer_name ?? ''),
                'issuer_type' => (string) $document->issuer_type,
                'issuer_name' => (string) ($document->issuer_name_snapshot ?? ''),
                'sale_revenue_egp' => ExactMoney::fromCents($invoiceRevenue),
                'cogs_egp' => $costsComplete ? ExactMoney::fromCents($invoiceCogs) : null,
                'surplus_egp' => $splitComplete ? $this->signedAmount($invoiceSurplus) : null,
                'partner_profit_egp' => $costsComplete && $splitComplete
                    ? ($document->issuer_type === 'partner' ? $this->signedAmount($invoicePartnerProfit) : '0.00')
                    : null,
                'company_profit_egp' => $costsComplete && $splitComplete ? $this->signedAmount($invoiceCompanyProfit) : null,
                'total_profit_egp' => $costsComplete && $splitComplete ? $this->signedAmount($invoiceTotalProfit) : null,
                'pricing_status' => $costsComplete && $splitComplete ? 'priced' : 'unpriced',
                'lines' => $lineRows,
            ];
        }

        $containerRows = [];
        foreach ($containers as $container) {
            $containerRows[] = [
                'container_number' => $container['container_number'],
                'invoice_count' => count($container['invoice_count']),
                'sale_revenue_egp' => ExactMoney::fromCents($container['revenue']),
                'cogs_egp' => $container['costs_complete'] ? ExactMoney::fromCents($container['cogs']) : null,
                'profit_egp' => $container['profit'] === null ? null : $this->signedAmount($container['profit']),
                'cost_snapshot_complete' => $container['costs_complete'],
            ];
        }

        $totalProfit = $this->signedSum($totalCompanyProfit, $totalPartnerProfit);
        $expectedProfit = $this->signedDifference($totalRevenue, $totalCogs);
        $difference = $this->signedSum($totalProfit, [
            'sign' => $expectedProfit['sign'] === '+' ? '-' : '+',
            'amount' => $expectedProfit['amount'],
        ]);

        return [
            'data' => [
                'invoices' => $invoiceRows,
                'containers' => $containerRows,
                'totals' => [
                    'sale_revenue_egp' => ExactMoney::fromCents($totalRevenue),
                    'cogs_egp' => $allCostsComplete ? ExactMoney::fromCents($totalCogs) : null,
                    'partner_profit_egp' => $allSplitsComplete && $allCostsComplete ? $this->signedAmount($totalPartnerProfit) : null,
                    'company_profit_egp' => $allSplitsComplete && $allCostsComplete ? $this->signedAmount($totalCompanyProfit) : null,
                    'total_profit_egp' => $allSplitsComplete && $allCostsComplete ? $this->signedAmount($totalProfit) : null,
                    'reconciliation_difference_egp' => $allSplitsComplete && $allCostsComplete ? $this->signedAmount($difference) : null,
                    'unpriced_invoice_count' => $unpricedInvoiceCount,
                ],
            ],
            'meta' => [
                'formula_status' => 'SNAPSHOT_BASED',
                'formula' => 'Net sale revenue minus cost snapshots; company invoices assign all profit to the company, partner invoices split company cost margin and partner sale surplus. Posted returns reduce their original invoice using issue-time snapshots.',
                'from_date' => $filters['from_date'] ?? null,
                'to_date' => $filters['to_date'] ?? null,
            ],
        ];
    }

    /**
     * Dashboard values are only calculated for sections the caller is permitted to see.
     *
     * @param  list<string>  $permissions
     * @return array<string, mixed>
     */
    public function dashboard(array $permissions, string $period = 'month'): array
    {
        $data = [];
        $periodStart = match ($period) {
            'week' => now()->subDays(6)->toDateString(),
            'year' => now()->startOfYear()->toDateString(),
            default => now()->startOfMonth()->toDateString(),
        };
        $periodEnd = now()->toDateString();
        if (in_array('invoices.view', $permissions, true)) {
            $sales = '0';
            foreach (DB::table('sales_documents')
                ->where('document_type', 'invoice')
                ->where('status', 'posted')
                ->whereDate('issue_date', now()->toDateString())
                ->get(['total_amount']) as $document) {
                $sales = ExactMoney::add($sales, ExactMoney::toCents((string) $document->total_amount));
            }
            $data['today_sales_egp'] = ExactMoney::fromCents($sales);
            $periodSales = DB::table('sales_documents')
                ->where('document_type', 'invoice')->where('status', 'posted')
                ->whereBetween('issue_date', [$periodStart, $periodEnd])->sum('total_amount');
            $data['sales_total_egp'] = ExactMoney::fromCents(ExactMoney::toCents((string) $periodSales));

            $trendStart = match ($period) {
                'week' => now()->subDays(6)->toDateString(),
                'year' => now()->startOfYear()->toDateString(),
                default => now()->startOfMonth()->toDateString(),
            };
            $trendBucket = $period === 'year'
                ? "DATE_FORMAT(issue_date, '%Y-%m')"
                : 'issue_date';
            $trendRows = DB::table('sales_documents')
                ->where('document_type', 'invoice')
                ->where('status', 'posted')
                ->whereBetween('issue_date', [$trendStart, $periodEnd])
                ->groupByRaw($trendBucket)
                ->orderByRaw($trendBucket)
                ->get([DB::raw("{$trendBucket} AS bucket"), DB::raw('SUM(total_amount) AS total_sales')])
                ->keyBy(static fn (object $row): string => (string) $row->bucket);
            $data['sales_trend'] = [];
            $buckets = [];
            if ($period === 'year') {
                for ($month = 1; $month <= (int) now()->format('n'); $month++) {
                    $buckets[] = now()->startOfYear()->setMonth($month)->format('Y-m');
                }
            } else {
                $cursor = \Illuminate\Support\Carbon::parse($trendStart);
                while ($cursor->toDateString() <= $periodEnd) {
                    $buckets[] = $cursor->toDateString();
                    $cursor->addDay();
                }
            }
            foreach ($buckets as $bucket) {
                $row = $trendRows->get($bucket);
                $data['sales_trend'][] = [
                    'date' => $bucket,
                    'sales_egp' => ExactMoney::fromCents(ExactMoney::toCents((string) ($row->total_sales ?? '0'))),
                ];
            }
        }
        if (in_array('inventory.view', $permissions, true)) {
            $stockCount = '0';
            foreach (DB::table('inventory_balances')->get(['quantity_on_hand']) as $balance) {
                $stockCount = ExactMoney::add($stockCount, (string) max(0, (int) $balance->quantity_on_hand));
            }
            $data['stock_count'] = $stockCount;
            if (in_array('costs.view', $permissions, true)) {
                $stockValue = DB::table('inventory_balances')->sum('inventory_value_egp');
                $data['stock_value_egp'] = $stockValue === null
                    ? '0.00'
                    : ExactMoney::fromCents(ExactMoney::toCents((string) $stockValue));
            }

            $localLowStock = DB::table('product_location_minimum_stock as minimum')
                ->join('inventory_balances as balance', function ($join): void {
                    $join->on('balance.product_id', '=', 'minimum.product_id')->on('balance.location_id', '=', 'minimum.location_id');
                })
                ->join('products as product', function ($join): void {
                    $join->on('product.id', '=', 'minimum.product_id')->where('product.is_active', true);
                })
                ->join('locations as location', function ($join): void {
                    $join->on('location.id', '=', 'minimum.location_id')->where('location.is_active', true);
                })
                ->whereColumn('balance.quantity_on_hand', '<', 'minimum.minimum_quantity')
                ->orderBy('balance.quantity_on_hand')
                ->get([
                    'product.id as product_id', 'product.name as product_name', 'product.sku',
                    'location.name as warehouse_name', 'balance.quantity_on_hand', 'minimum.minimum_quantity',
                ])
                ->map(static fn (object $row): array => [
                    'product_id' => (int) $row->product_id,
                    'product_name' => $row->product_name,
                    'sku' => $row->sku,
                    'warehouse_name' => $row->warehouse_name,
                    'quantity_on_hand' => (string) $row->quantity_on_hand,
                    'minimum_quantity' => (string) $row->minimum_quantity,
                ]);
            $stockByProduct = DB::table('inventory_balances')
                ->select('product_id')->selectRaw('COALESCE(SUM(quantity_on_hand), 0) AS quantity_on_hand')->groupBy('product_id');
            $globalLowStock = DB::table('products as product')
                ->leftJoinSub($stockByProduct, 'stock', 'stock.product_id', '=', 'product.id')
                ->where('product.is_active', true)->whereNotNull('product.minimum_stock')
                ->whereRaw('COALESCE(stock.quantity_on_hand, 0) < product.minimum_stock')
                ->get(['product.id as product_id', 'product.name as product_name', 'product.sku', 'product.minimum_stock', DB::raw('COALESCE(stock.quantity_on_hand, 0) AS quantity_on_hand')])
                ->map(static fn (object $row): array => [
                    'product_id' => (int) $row->product_id,
                    'product_name' => $row->product_name,
                    'sku' => $row->sku,
                    'warehouse_name' => 'كل المخازن',
                    'quantity_on_hand' => (string) $row->quantity_on_hand,
                    'minimum_quantity' => (string) $row->minimum_stock,
                ]);
            $allLowStock = $localLowStock->concat($globalLowStock)->unique('product_id')->values();
            $data['low_stock_count'] = $allLowStock->count();
            $data['low_stock'] = $allLowStock->sortBy(static fn (array $row): int => (int) $row['quantity_on_hand'])->take(8)->values()->all();

            $data['recent_activity'] = DB::table('inventory_movements as movement')
                ->join('inventory_movement_lines as line', 'line.inventory_movement_id', '=', 'movement.id')
                ->join('products as product', 'product.id', '=', 'line.product_id')
                ->leftJoin('users as actor', 'actor.id', '=', 'movement.posted_by_user_id')
                ->where('movement.status', 'posted')
                ->orderByDesc('movement.movement_date')
                ->orderByDesc('movement.id')
                ->orderBy('line.line_number')
                ->limit(8)
                ->get([
                    'movement.id as movement_id', 'movement.movement_number', 'movement.movement_type',
                    'movement.movement_date', 'movement.reason', 'product.name as product_name',
                    'line.quantity', 'actor.display_name as user_name',
                ])
                ->map(static fn (object $row): array => [
                    'movement_id' => (int) $row->movement_id,
                    'reference' => $row->movement_number,
                    'movement_type' => $row->movement_type,
                    'movement_date' => (string) $row->movement_date,
                    'description' => $row->reason ?: $row->product_name,
                    'quantity' => (string) $row->quantity,
                    'user_name' => $row->user_name,
                ])->all();
        }
        if (in_array('reports.customer_balances.view', $permissions, true)) {
            $balances = $this->customerBalanceRows(null);
            $receivables = '0';
            foreach ($balances as $balance) {
                if (! str_starts_with($balance['balance'], '-')) {
                    $receivables = ExactMoney::add($receivables, ExactMoney::toCents($balance['balance']));
                }
            }
            $data['receivables_egp'] = ExactMoney::fromCents($receivables);
        }
        if (in_array('treasury.view', $permissions, true)) {
            $data['treasury_balances'] = $this->treasuryBalances();
            $cashBalance = '0';
            foreach ($data['treasury_balances'] as $account) {
                $cashBalance = ExactMoney::add($cashBalance, ExactMoney::toCents($account['balance_egp']));
            }
            $data['cash_balance_egp'] = ExactMoney::fromCents($cashBalance);
        }
        if (in_array('collections.view', $permissions, true)) {
            $collections = DB::table('sales_receipts')->where('status', 'posted')->where('receipt_type', 'collection')
                ->whereBetween('receipt_date', [$periodStart, $periodEnd])->sum('amount');
            $data['collections_total_egp'] = ExactMoney::fromCents(ExactMoney::toCents((string) $collections));
        }
        if (in_array('expenses.view', $permissions, true)) {
            $expenses = DB::table('expenses')->where('status', 'posted')
                ->whereBetween('expense_date', [$periodStart, $periodEnd])->sum('amount');
            $data['expenses_total_egp'] = ExactMoney::fromCents(ExactMoney::toCents((string) $expenses));
        }
        if (in_array('orders.view', $permissions, true)) {
            $data['pending_orders_count'] = (int) DB::table('sales_orders')
                ->whereIn('status', ['draft', 'confirmed'])->count();
        }
        if (in_array('accounting.reports.view', $permissions, true)) {
            $journalTotals = DB::table('journal_entries as entry')
                ->join('journal_lines as line', 'line.journal_entry_id', '=', 'entry.id')
                ->join('chart_of_accounts as account', 'account.id', '=', 'line.account_id')
                ->where('entry.status', 'posted')
                ->whereBetween('entry.entry_date', [$periodStart, $periodEnd])
                ->whereIn('account.account_type', ['revenue', 'expense'])
                ->groupBy('account.account_type')
                ->get([
                    'account.account_type',
                    DB::raw('SUM(line.debit_amount) AS debit_total'),
                    DB::raw('SUM(line.credit_amount) AS credit_total'),
                ]);
            $income = ['sign' => '+', 'amount' => '0'];
            foreach ($journalTotals as $total) {
                $debit = ExactMoney::toCents((string) $total->debit_total);
                $credit = ExactMoney::toCents((string) $total->credit_total);
                $income = $this->signedSum($income, $this->signedDifference($credit, $debit));
            }
            $data['net_profit_egp'] = $this->signedAmount($income);
        }

        $activities = collect($data['recent_activity'] ?? []);
        if (in_array('invoices.view', $permissions, true)) {
            $activities = $activities->merge(DB::table('sales_documents as document')
                ->join('customers as customer', 'customer.id', '=', 'document.customer_id')
                ->whereIn('document.document_type', ['invoice', 'credit_note'])
                ->where('document.status', 'posted')
                ->orderByDesc('document.issue_date')->orderByDesc('document.id')->limit(8)
                ->get(['document.id', 'document.document_number', 'document.document_type', 'document.issue_date', 'document.total_amount', 'customer.name as customer_name'])
                ->map(static fn (object $row): array => [
                    'movement_id' => (int) $row->id,
                    'reference' => $row->document_number,
                    'movement_type' => $row->document_type,
                    'movement_date' => (string) $row->issue_date,
                    'description' => $row->customer_name,
                    'quantity' => null,
                    'amount_egp' => ExactMoney::fromCents(ExactMoney::toCents((string) $row->total_amount)),
                    'user_name' => null,
                ]));
        }
        if (in_array('collections.view', $permissions, true)) {
            $activities = $activities->merge(DB::table('sales_receipts as receipt')
                ->join('customers as customer', 'customer.id', '=', 'receipt.customer_id')
                ->where('receipt.status', 'posted')->where('receipt.receipt_type', 'collection')
                ->orderByDesc('receipt.receipt_date')->orderByDesc('receipt.id')->limit(8)
                ->get(['receipt.id', 'receipt.receipt_number', 'receipt.receipt_date', 'receipt.amount', 'customer.name as customer_name'])
                ->map(static fn (object $row): array => [
                    'movement_id' => (int) $row->id,
                    'reference' => $row->receipt_number,
                    'movement_type' => 'collection',
                    'movement_date' => (string) $row->receipt_date,
                    'description' => $row->customer_name,
                    'quantity' => null,
                    'amount_egp' => ExactMoney::fromCents(ExactMoney::toCents((string) $row->amount)),
                    'user_name' => null,
                ]));
        }
        $data['recent_activity'] = $activities->sortByDesc('movement_date')->take(8)->values()->all();

        return ['data' => $data, 'meta' => ['as_of' => now()->toIso8601String(), 'period' => $period, 'from_date' => $periodStart, 'to_date' => $periodEnd]];
    }

    /**
     * @param  list<int>|null  $customerIds
     * @return array<int, array{balance: string, unapplied_collections: string}>
     */
    public function customerBalanceRows(?array $customerIds): array
    {
        $documents = DB::table('sales_documents')
            ->where('status', 'posted')
            ->when($customerIds !== null, fn ($q) => $q->whereIn('customer_id', $customerIds))
            ->get(['customer_id', 'document_type', 'opening_balance_direction', 'total_amount']);
        $debits = [];
        $credits = [];
        foreach ($documents as $document) {
            $id = (int) $document->customer_id;
            $amount = ExactMoney::toCents((string) $document->total_amount);
            $isDebit = match ($document->document_type) {
                'invoice' => true,
                'credit_note' => false,
                'opening_receivable' => $document->opening_balance_direction === 'debit',
                default => throw new RuntimeException('Unsupported posted sales document type.'),
            };
            if ($isDebit) {
                $debits[$id] = ExactMoney::add($debits[$id] ?? '0', $amount);
            } else {
                $credits[$id] = ExactMoney::add($credits[$id] ?? '0', $amount);
            }
        }

        $receipts = DB::table('sales_receipts')
            ->where('status', 'posted')
            ->where('receipt_type', 'collection')
            ->when($customerIds !== null, fn ($q) => $q->whereIn('customer_id', $customerIds))
            ->get(['id', 'customer_id', 'amount', 'unapplied_amount']);
        $receiptIds = $receipts->pluck('id')->map(static fn ($id): int => (int) $id)->all();
        $allocationTotals = [];
        if ($receiptIds !== []) {
            $reversals = DB::table('sales_receipt_allocation_reversals')
                ->select('sales_receipt_allocation_id')
                ->selectRaw('SUM(amount) AS reversed_amount')
                ->groupBy('sales_receipt_allocation_id');
            foreach (DB::table('sales_receipt_allocations as allocation')
                ->joinSub(DB::table('sales_receipts')->whereIn('id', $receiptIds)->select(['id', 'customer_id']), 'receipt', 'receipt.id', '=', 'allocation.sales_receipt_id')
                ->leftJoinSub($reversals, 'reversal', 'reversal.sales_receipt_allocation_id', '=', 'allocation.id')
                ->get([
                    'allocation.sales_receipt_id',
                    'receipt.customer_id',
                    'allocation.allocation_amount',
                    'reversal.reversed_amount',
                ]) as $allocation) {
                $original = ExactMoney::toCents((string) $allocation->allocation_amount);
                $reversed = ExactMoney::toCents((string) ($allocation->reversed_amount ?? '0'));
                if (ExactMoney::compare($reversed, $original) > 0) {
                    throw new RuntimeException('Receipt allocation reversals exceed the original allocation.');
                }
                $receiptId = (int) $allocation->sales_receipt_id;
                $allocationTotals[$receiptId] = ExactMoney::add(
                    $allocationTotals[$receiptId] ?? '0',
                    ExactMoney::subtract($original, $reversed),
                );
            }
        }
        $unapplied = [];
        foreach ($receipts as $receipt) {
            $id = (int) $receipt->customer_id;
            $amount = ExactMoney::toCents((string) $receipt->amount);
            $unappliedAmount = ExactMoney::toCents((string) $receipt->unapplied_amount);
            $unapplied[$id] = ExactMoney::add($unapplied[$id] ?? '0', $unappliedAmount);
            $receiptAllocated = $allocationTotals[(int) $receipt->id] ?? '0';
            $credits[$id] = ExactMoney::add($credits[$id] ?? '0', $receiptAllocated);
            if (ExactMoney::add($unappliedAmount, $receiptAllocated) !== $amount) {
                throw new RuntimeException('The receipt unapplied amount does not reconcile with its active allocations.');
            }
            unset($allocationTotals[(int) $receipt->id]);
        }
        if ($allocationTotals !== []) {
            throw new RuntimeException('Receipt allocations reference an unavailable posted collection.');
        }

        $ids = array_unique([...array_keys($debits), ...array_keys($credits), ...array_keys($unapplied), ...($customerIds ?? [])]);
        $result = [];
        foreach ($ids as $id) {
            $result[(int) $id] = [
                'balance' => $this->signedMoney($debits[$id] ?? '0', $credits[$id] ?? '0'),
                'unapplied_collections' => ExactMoney::fromCents($unapplied[$id] ?? '0'),
            ];
        }

        return $result;
    }

    /**
     * @return list<array{account_id: int, code: string, name: string, balance_egp: string}>
     */
    private function treasuryBalances(): array
    {
        $balances = [];
        foreach (DB::table('treasury_accounts')->orderBy('name')->orderBy('id')->get(['id', 'code', 'name']) as $account) {
            $balances[(int) $account->id] = [
                'account_id' => (int) $account->id,
                'code' => $account->code,
                'name' => $account->name,
                'in' => '0',
                'out' => '0',
            ];
        }
        foreach (DB::table('treasury_entries')->get(['treasury_account_id', 'direction', 'amount']) as $entry) {
            $id = (int) $entry->treasury_account_id;
            $key = $entry->direction === 'in' ? 'in' : 'out';
            $balances[$id][$key] = ExactMoney::add(
                $balances[$id][$key] ?? '0',
                ExactMoney::toCents((string) $entry->amount),
            );
        }

        return array_values(array_map(function (array $account): array {
            $account['balance_egp'] = $this->signedMoney($account['in'], $account['out']);
            unset($account['in'], $account['out']);

            return $account;
        }, $balances));
    }

    /**
     * @param  LengthAwarePaginator<object>  $page
     * @return array{data: mixed, meta: array<string, int>}
     */
    private function page(LengthAwarePaginator $page): array
    {
        return ListQuery::page($page);
    }

    /**
     * @param  LengthAwarePaginator<object>  $page
     * @return array{current_page: int, last_page: int, per_page: int, total: int}
     */
    private function pageMeta(LengthAwarePaginator $page): array
    {
        return [
            'current_page' => $page->currentPage(),
            'last_page' => $page->lastPage(),
            'per_page' => $page->perPage(),
            'total' => $page->total(),
        ];
    }

    /**
     * @return array{sign: string, amount: string}
     */
    private function signedDifference(string $left, string $right): array
    {
        if (ExactMoney::compare($left, $right) >= 0) {
            return ['sign' => '+', 'amount' => ExactMoney::subtract($left, $right)];
        }

        return ['sign' => '-', 'amount' => ExactMoney::subtract($right, $left)];
    }

    /** @param array{sign:string, amount:string} $left @param array{sign:string, amount:string} $right @return array{sign:string, amount:string} */
    private function signedSum(array $left, array $right): array
    {
        if ($left['amount'] === '0') {
            return $right;
        }
        if ($right['amount'] === '0') {
            return $left;
        }
        if ($left['sign'] === $right['sign']) {
            return ['sign' => $left['sign'], 'amount' => ExactMoney::add($left['amount'], $right['amount'])];
        }
        $comparison = ExactMoney::compare($left['amount'], $right['amount']);
        if ($comparison === 0) {
            return ['sign' => '+', 'amount' => '0'];
        }
        if ($comparison > 0) {
            return ['sign' => $left['sign'], 'amount' => ExactMoney::subtract($left['amount'], $right['amount'])];
        }

        return ['sign' => $right['sign'], 'amount' => ExactMoney::subtract($right['amount'], $left['amount'])];
    }

    private function signedMoney(string $debits, string $credits): string
    {
        $difference = $this->signedDifference($debits, $credits);

        return $this->signedAmount($difference);
    }

    /**
     * @param  array{sign: string, amount: string}  $amount
     */
    private function signedAmount(array $amount): string
    {
        return ($amount['sign'] === '-' && $amount['amount'] !== '0' ? '-' : '')
            .ExactMoney::fromCents($amount['amount']);
    }

    /**
     * @param  array{sign: string, amount: string}  $profit
     */
    private function percentage(array $profit, string $cost): string
    {
        $scaledProfit = ExactMoney::multiply($profit['amount'], 10000);
        $hundredths = $this->divideRounded($scaledProfit, $cost);
        if (strlen($hundredths) < 3) {
            $hundredths = str_pad($hundredths, 3, '0', STR_PAD_LEFT);
        }

        return ($profit['sign'] === '-' && $hundredths !== '0' ? '-' : '')
            .substr($hundredths, 0, -2).'.'.substr($hundredths, -2);
    }

    private function extendedSnapshotCostCents(string $unitCost, int $quantity): string
    {
        if (! preg_match('/\A(0|[1-9][0-9]{0,14})(?:\.([0-9]{1,4}))?\z/', $unitCost, $matches)) {
            throw new InvalidArgumentException('An invoice cost snapshot is outside the supported decimal range.');
        }
        $tenThousandths = ExactMoney::add(
            ExactMoney::multiply($matches[1], 10000),
            str_pad($matches[2] ?? '', 4, '0'),
        );

        return $this->divideRounded(ExactMoney::multiply($tenThousandths, $quantity), '100');
    }

    private function divideRounded(string $numerator, string $denominator): string
    {
        if (ExactMoney::compare($denominator, '0') <= 0) {
            throw new InvalidArgumentException('A positive denominator is required.');
        }
        $quotient = '';
        $remainder = '0';
        foreach (str_split($numerator) as $digit) {
            $remainder = ExactMoney::add(ExactMoney::multiply($remainder, 10), $digit);
            $quotientDigit = 0;
            for ($candidate = 9; $candidate >= 1; $candidate--) {
                $multiple = ExactMoney::multiply($denominator, $candidate);
                if (ExactMoney::compare($remainder, $multiple) >= 0) {
                    $quotientDigit = $candidate;
                    $remainder = ExactMoney::subtract($remainder, $multiple);
                    break;
                }
            }
            $quotient .= (string) $quotientDigit;
        }
        $quotient = ltrim($quotient, '0') ?: '0';
        if (ExactMoney::compare(ExactMoney::multiply($remainder, 2), $denominator) >= 0) {
            $quotient = ExactMoney::add($quotient, '1');
        }

        return $quotient;
    }
}
