<?php

namespace App\Http\Controllers;

use App\Models\InventoryBalance;
use App\Services\InventoryService;
use App\Services\FinancialOutboxService;
use App\Support\ExactMoney;
use App\Support\ListQuery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class InventoryController extends Controller
{
    public function __construct(private readonly InventoryService $inventory, private readonly FinancialOutboxService $outbox) {}

    public function balances(Request $request): JsonResponse
    {
        $sortable = [
            'product_name' => 'p.name',
            'product_code' => 'p.sku',
            'warehouse_name' => 'l.name',
            'warehouse_code' => 'l.code',
            'quantity_on_hand' => 'b.quantity_on_hand',
            'updated_at' => 'b.updated_at',
            'id' => 'b.product_id',
        ];
        $filters = ListQuery::validate($request, $sortable, [
            'product_id' => ['sometimes', 'integer', 'min:1'],
            'warehouse_id' => ['sometimes', 'integer', 'min:1'],
        ]);
        $query = DB::table('inventory_balances as b')
            ->join('products as p', 'p.id', '=', 'b.product_id')
            ->join('locations as l', 'l.id', '=', 'b.location_id')
            ->select([
                'b.product_id',
                'p.sku',
                'p.name as product_name',
                'b.location_id as warehouse_id',
                'l.code as warehouse_code',
                'l.name as warehouse_name',
                'b.quantity_on_hand',
                'b.quantity_reserved',
                'p.minimum_stock as minimum_stock',
                'b.average_unit_cost_egp',
                'b.inventory_value_egp',
                'b.updated_at',
            ]);

        if (isset($filters['product_id'])) {
            $query->where('b.product_id', $filters['product_id']);
        }

        if (isset($filters['warehouse_id'])) {
            $query->where('b.location_id', $filters['warehouse_id']);
        }

        ListQuery::search($query, $filters, ['p.name', 'p.sku', 'l.name', 'l.code']);
        ListQuery::sort($query, $filters, $sortable, 'product_name', ['b.product_id', 'b.location_id']);
        $balances = $query->paginate($filters['per_page'] ?? 50);

        if ($this->canViewCosts($request)) {
            $balances->getCollection()->transform(function (object $balance): object {
                foreach (['average_unit_cost_egp', 'inventory_value_egp'] as $field) {
                    if ($balance->{$field} !== null) {
                        $balance->{$field} = ExactMoney::fromCents(ExactMoney::toCents((string) $balance->{$field}));
                    }
                }

                return $balance;
            });
        } else {
            $balances->getCollection()->transform(function (object $balance): object {
                unset($balance->average_unit_cost_egp, $balance->inventory_value_egp);

                return $balance;
            });
        }

        return response()->json(ListQuery::page($balances));
    }

    public function summary(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'warehouse_id' => ['sometimes', 'integer', 'min:1', 'exists:locations,id'],
            'product_id' => ['sometimes', 'integer', 'min:1', 'exists:products,id'],
        ]);
        $balances = DB::table('inventory_balances as balance')
            ->when(isset($filters['warehouse_id']), fn ($query) => $query->where('balance.location_id', $filters['warehouse_id']))
            ->when(isset($filters['product_id']), fn ($query) => $query->where('balance.product_id', $filters['product_id']))
            ->first([
                DB::raw('COUNT(DISTINCT balance.product_id) as product_count'),
                DB::raw('COUNT(DISTINCT balance.location_id) as warehouse_count'),
                DB::raw('COALESCE(SUM(balance.quantity_on_hand), 0) as quantity_on_hand'),
                DB::raw('COALESCE(SUM(balance.quantity_reserved), 0) as quantity_reserved'),
                DB::raw('COALESCE(SUM(balance.inventory_value_egp), 0) as stock_value_egp'),
            ]);
        $stock = DB::table('inventory_balances as balance')
            ->join('locations as stock_location', 'stock_location.id', '=', 'balance.location_id')
            ->where('stock_location.location_type', '<>', 'damaged')
            ->where('stock_location.is_active', true)
            ->when(isset($filters['warehouse_id']), fn ($query) => $query->where('balance.location_id', $filters['warehouse_id']))
            ->select('balance.product_id')
            ->selectRaw('COALESCE(SUM(balance.quantity_on_hand - balance.quantity_reserved), 0) as available_quantity')
            ->groupBy('balance.product_id');
        $belowMinimumCount = DB::table('products as product')
            ->leftJoinSub($stock, 'stock', 'stock.product_id', '=', 'product.id')
            ->where('product.is_active', true)
            ->where('product.minimum_stock', '>', 0)
            ->whereRaw('COALESCE(stock.available_quantity, 0) <= product.minimum_stock')
            ->when(isset($filters['product_id']), fn ($query) => $query->where('product.id', $filters['product_id']))
            ->count();
        $balances->below_minimum_count = $belowMinimumCount;
        if (! $this->canViewCosts($request)) unset($balances->stock_value_egp);
        return response()->json(['data' => $balances]);
    }

    public function movements(Request $request): JsonResponse
    {
        $sortable = [
            'movement_date' => 'movement.movement_date',
            'movement_number' => 'movement.movement_number',
            'movement_type' => 'movement.movement_type',
            'product_name' => 'product.name',
            'product_code' => 'product.sku',
            'quantity' => 'line.quantity',
            'id' => 'movement.id',
        ];
        $filters = ListQuery::validate($request, $sortable, [
            'product_id' => ['sometimes', 'integer', 'min:1'],
            'warehouse_id' => ['sometimes', 'integer', 'min:1'],
            'movement_type' => ['sometimes', 'string', 'in:opening,receipt,sale,return,transfer,adjustment,damage,container_receipt,reversal,count'],
            'from_date' => ['sometimes', 'date'],
            'to_date' => ['sometimes', 'date', 'after_or_equal:from_date'],
        ]);
        $query = DB::table('inventory_movement_lines as line')
            ->join('inventory_movements as movement', 'movement.id', '=', 'line.inventory_movement_id')
            ->join('products as product', 'product.id', '=', 'line.product_id')
            ->leftJoin('locations as source_location', 'source_location.id', '=', 'line.from_location_id')
            ->leftJoin('locations as target_location', 'target_location.id', '=', 'line.to_location_id')
            ->leftJoin('users as movement_creator', 'movement_creator.id', '=', 'movement.created_by_user_id')
            ->leftJoin('sales_documents as source_sales', function ($join): void {
                $join->on('source_sales.id', '=', 'movement.source_id')->where('movement.source_type', '=', 'sales_document');
            })
            ->leftJoin('sales_documents as source_original_sales', 'source_original_sales.id', '=', 'source_sales.original_document_id')
            ->leftJoin('purchase_invoices as source_purchase', function ($join): void {
                $join->on('source_purchase.id', '=', 'movement.source_id')->where('movement.source_type', '=', 'purchase_invoice');
            })
            ->leftJoin('inventory_count_lines as source_count_line', function ($join): void {
                $join->on('source_count_line.id', '=', 'movement.source_id')->where('movement.source_type', '=', 'inventory_count_line');
            })
            ->leftJoin('inventory_counts as source_count', 'source_count.id', '=', 'source_count_line.inventory_count_id')
            ->leftJoin('container_receipts as source_receipt', function ($join): void {
                $join->on('source_receipt.id', '=', 'movement.source_id')->where('movement.source_type', '=', 'container_receipt');
            })
            ->leftJoin('containers as source_container', 'source_container.id', '=', 'source_receipt.container_id')
            ->leftJoin('warehouse_returns as source_return', function ($join): void {
                $join->on('source_return.id', '=', 'movement.source_id')->where('movement.source_type', '=', 'warehouse_return');
            })
            ->leftJoin('delivery_lines as source_delivery_line', 'source_delivery_line.inventory_movement_line_id', '=', 'line.id')
            ->leftJoin('deliveries as source_delivery', 'source_delivery.id', '=', 'source_delivery_line.delivery_id')
            ->where('movement.status', 'posted')
            ->select([
                'line.id as id',
                'movement.id as movement_id',
                'movement.movement_number',
                DB::raw("COALESCE(CASE WHEN source_sales.document_type = 'credit_note' AND source_original_sales.document_number IS NOT NULL THEN CONCAT(source_sales.document_number, ' ← ', source_original_sales.document_number) ELSE source_sales.document_number END, source_purchase.invoice_number, source_count.count_number, source_container.container_number, CONCAT('RET-', source_return.id), movement.movement_number) as reference"),
                DB::raw("COALESCE(CASE WHEN source_sales.document_type = 'credit_note' AND source_original_sales.document_number IS NOT NULL THEN CONCAT(source_sales.document_number, ' ← ', source_original_sales.document_number) ELSE source_sales.document_number END, source_purchase.invoice_number, source_count.count_number, source_container.container_number, CONCAT('RET-', source_return.id), movement.movement_number) as source_reference"),
                'movement.movement_type',
                'movement.status',
                'movement.movement_date',
                'movement.reason',
                'movement.source_type',
                'movement.source_id',
                'source_delivery.id as delivery_id',
                'source_delivery.delivery_number',
                'source_count_line.difference_reason as variance_reason',
                'line.line_number',
                'line.product_id',
                'product.sku',
                'product.name as product_name',
                'line.from_location_id',
                'source_location.name as from_location_name',
                'line.to_location_id',
                'target_location.name as to_location_name',
                DB::raw('COALESCE(target_location.name, source_location.name) as warehouse_name'),
                'line.quantity',
                'line.unit_cost_egp_snapshot',
                'line.unit_cost_egp_snapshot as unit_cost_egp',
                'line.line_cost_egp_snapshot',
                'movement_creator.display_name as created_by_name',
            ]);

        if (isset($filters['product_id'])) {
            $query->where('line.product_id', $filters['product_id']);
        }

        if (isset($filters['warehouse_id'])) {
            $query->where(function ($locations) use ($filters): void {
                $locations->where('line.from_location_id', $filters['warehouse_id'])
                    ->orWhere('line.to_location_id', $filters['warehouse_id']);
            });
        }

        if (isset($filters['movement_type'])) {
            $query->where('movement.movement_type', $filters['movement_type']);
        }

        if (isset($filters['from_date'])) {
            $query->where('movement.movement_date', '>=', $filters['from_date']);
        }

        if (isset($filters['to_date'])) {
            $query->where('movement.movement_date', '<=', $filters['to_date']);
        }

        ListQuery::search($query, $filters, [
            'movement.movement_number',
            'movement.reason',
            'product.name',
            'product.sku',
            'source_sales.document_number',
            'source_original_sales.document_number',
            'source_purchase.invoice_number',
            'source_count.count_number',
            'source_container.container_number',
            'source_return.id',
            'source_delivery.delivery_number',
        ]);
        ListQuery::sort($query, $filters, $sortable, 'movement_date', ['movement.id', 'line.line_number'], 'desc');
        $history = $query->paginate($filters['per_page'] ?? 50);

        if ($this->canViewCosts($request)) {
            $history->getCollection()->transform(function (object $line): object {
                foreach (['unit_cost_egp_snapshot', 'unit_cost_egp', 'line_cost_egp_snapshot'] as $field) {
                    if ($line->{$field} !== null) {
                        $line->{$field} = ExactMoney::fromCents(ExactMoney::toCents((string) $line->{$field}));
                    }
                }

                return $line;
            });
        } else {
            $history->getCollection()->transform(function (object $line): object {
                unset($line->unit_cost_egp_snapshot, $line->unit_cost_egp, $line->line_cost_egp_snapshot);

                return $line;
            });
        }

        return response()->json(ListQuery::page($history));
    }

    public function adjustments(Request $request): JsonResponse
    {
        $request->merge(['movement_type' => 'adjustment']);

        return $this->movements($request);
    }

    public function movement(Request $request, int $lineId): JsonResponse
    {
        $line = DB::table('inventory_movement_lines as line')
            ->join('inventory_movements as movement', 'movement.id', '=', 'line.inventory_movement_id')
            ->join('products as product', 'product.id', '=', 'line.product_id')
            ->leftJoin('locations as source_location', 'source_location.id', '=', 'line.from_location_id')
            ->leftJoin('locations as target_location', 'target_location.id', '=', 'line.to_location_id')
            ->leftJoin('users as creator', 'creator.id', '=', 'movement.created_by_user_id')
            ->leftJoin('sales_documents as source_sales', function ($join): void {
                $join->on('source_sales.id', '=', 'movement.source_id')->where('movement.source_type', '=', 'sales_document');
            })
            ->leftJoin('sales_documents as source_original_sales', 'source_original_sales.id', '=', 'source_sales.original_document_id')
            ->leftJoin('purchase_invoices as source_purchase', function ($join): void {
                $join->on('source_purchase.id', '=', 'movement.source_id')->where('movement.source_type', '=', 'purchase_invoice');
            })
            ->leftJoin('inventory_count_lines as source_count_line', function ($join): void {
                $join->on('source_count_line.id', '=', 'movement.source_id')->where('movement.source_type', '=', 'inventory_count_line');
            })
            ->leftJoin('inventory_counts as source_count', 'source_count.id', '=', 'source_count_line.inventory_count_id')
            ->leftJoin('container_receipts as source_receipt', function ($join): void {
                $join->on('source_receipt.id', '=', 'movement.source_id')->where('movement.source_type', '=', 'container_receipt');
            })
            ->leftJoin('containers as source_container', 'source_container.id', '=', 'source_receipt.container_id')
            ->leftJoin('warehouse_returns as source_return', function ($join): void {
                $join->on('source_return.id', '=', 'movement.source_id')->where('movement.source_type', '=', 'warehouse_return');
            })
            ->leftJoin('delivery_lines as source_delivery_line', 'source_delivery_line.inventory_movement_line_id', '=', 'line.id')
            ->leftJoin('deliveries as source_delivery', 'source_delivery.id', '=', 'source_delivery_line.delivery_id')
            ->where('line.id', $lineId)
            ->first([
                'line.id', 'movement.id as movement_id', 'movement.movement_number', 'movement.movement_type',
                'movement.status', 'movement.movement_date', 'movement.source_type', 'movement.source_id',
                'source_delivery.id as delivery_id', 'source_delivery.delivery_number',
                DB::raw("COALESCE(CASE WHEN source_sales.document_type = 'credit_note' AND source_original_sales.document_number IS NOT NULL THEN CONCAT(source_sales.document_number, ' ← ', source_original_sales.document_number) ELSE source_sales.document_number END, source_purchase.invoice_number, source_count.count_number, source_container.container_number, CONCAT('RET-', source_return.id), movement.movement_number) as source_reference"),
                'movement.reason', 'movement.posted_at', 'creator.display_name as created_by_name',
                'source_count_line.difference_reason as variance_reason',
                'product.id as product_id', 'product.sku', 'product.name as product_name',
                'line.from_location_id', 'source_location.name as from_location_name',
                'line.to_location_id', 'target_location.name as to_location_name',
                'line.quantity', 'line.unit_cost_egp_snapshot', 'line.line_cost_egp_snapshot',
            ]);
        abort_if($line === null, 404);
        if (! $this->canViewCosts($request)) {
            unset($line->unit_cost_egp_snapshot, $line->line_cost_egp_snapshot);
        }
        return response()->json(['data' => $line]);
    }

    public function adjust(Request $request): JsonResponse
    {
        Gate::forUser($request->attributes->get('authenticated_user'))->authorize('manage', InventoryBalance::class);
        $values = $request->validate([
            'product_id' => ['required', 'integer', 'min:1'],
            'warehouse_id' => ['required', 'integer', 'min:1'],
            'quantity' => ['required', 'integer', 'between:-2147483647,2147483647', 'not_in:0'],
            'unit_cost_egp' => ['sometimes', 'nullable', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,4})?\z/'],
            'movement_date' => ['sometimes', 'date'],
            'reason' => ['required', 'string', 'max:1000'],
        ]);
        $quantity = (int) $values['quantity'];
        $source = [
            'movement_type' => 'adjustment',
            'movement_date' => $values['movement_date'] ?? now()->toDateString(),
            'reason' => $values['reason'],
        ];

        $result = DB::transaction(function () use ($quantity, $values, $source, $request): array {
            if ($quantity > 0) {
                if (! isset($values['unit_cost_egp'])) {
                    throw ValidationException::withMessages(['unit_cost_egp' => ['A positive adjustment requires a unit cost.']]);
                }
                $movement = $this->inventory->receive(
                    (int) $values['product_id'], (int) $values['warehouse_id'], $quantity,
                    $values['unit_cost_egp'], $source, $request,
                );
            } else {
                $movement = $this->inventory->issue(
                    (int) $values['product_id'], (int) $values['warehouse_id'], abs($quantity), $source, $request,
                );
            }
            $this->outbox->recordPostedDocument('inventory_adjustment', (int) $movement['movement_id'], [
                'reason' => $values['reason'],
            ]);
            return $movement;
        }, 5);

        return response()->json(['data' => $result], 201);
    }

    public function open(Request $request): JsonResponse
    {
        Gate::forUser($request->attributes->get('authenticated_user'))->authorize('manage', InventoryBalance::class);
        $values = $request->validate([
            'product_id' => ['required', 'integer', 'min:1'],
            'warehouse_id' => ['required', 'integer', 'min:1'],
            'quantity' => ['required', 'integer', 'between:1,2147483647'],
            'unit_cost_egp' => ['required', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,4})?\z/'],
            'movement_date' => ['required', 'date'],
            'reason' => ['required', 'string', 'max:1000'],
        ]);
        $result = DB::transaction(function () use ($values, $request): array {
            $movement = $this->inventory->receive(
                (int) $values['product_id'], (int) $values['warehouse_id'], (int) $values['quantity'],
                $values['unit_cost_egp'], [
                    'movement_type' => 'opening', 'movement_date' => $values['movement_date'], 'reason' => $values['reason'],
                ], $request,
            );
            $this->outbox->recordPostedDocument('inventory_opening', (int) $movement['movement_id'], [
                'reason' => $values['reason'],
            ]);
            return $movement;
        }, 5);

        return response()->json(['data' => $result], 201);
    }

    public function transfer(Request $request): JsonResponse
    {
        Gate::forUser($request->attributes->get('authenticated_user'))->authorize('manage', InventoryBalance::class);
        $values = $request->validate([
            'product_id' => ['required', 'integer', 'min:1'],
            'source_warehouse_id' => ['required', 'integer', 'min:1'],
            'destination_warehouse_id' => ['required', 'integer', 'min:1', 'different:source_warehouse_id'],
            'quantity' => ['required', 'integer', 'min:1', 'max:2147483647'],
            'movement_date' => ['sometimes', 'date'],
            'reason' => ['required', 'string', 'max:1000'],
        ]);

        $result = $this->inventory->transfer(
            (int) $values['product_id'],
            (int) $values['source_warehouse_id'],
            (int) $values['destination_warehouse_id'],
            (int) $values['quantity'],
            $values['movement_date'] ?? now()->toDateString(),
            $values['reason'],
            $request,
        );

        return response()->json(['data' => $result], 201);
    }

    private function canViewCosts(Request $request): bool
    {
        $actor = $request->attributes->get('authenticated_user');

        return is_object($actor) && DB::table('role_permissions as rp')
            ->join('permissions as p', 'p.id', '=', 'rp.permission_id')
            ->join('user_roles as ur', 'ur.role_id', '=', 'rp.role_id')
            ->join('roles as r', 'r.id', '=', 'ur.role_id')
            ->where('ur.user_id', $actor->id)
            ->where('r.is_active', true)
            ->where('p.code', 'costs.view')
            ->exists();
    }
}
