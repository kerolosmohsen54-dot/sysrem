<?php

namespace App\Http\Controllers;

use App\Models\MinimumStockThreshold;
use App\Services\AuditLogService;
use App\Support\ListQuery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class MinimumStockController extends Controller
{
    public function __construct(private readonly AuditLogService $auditLog) {}

    public function index(Request $request): JsonResponse
    {
        $sortable = [
            'product_name' => 'product.name',
            'warehouse_name' => 'warehouse_name',
            'quantity_on_hand' => 'quantity_on_hand',
            'available_quantity' => 'available_quantity',
            'minimum_quantity' => 'minimum_quantity',
            'id' => 'product.id',
        ];
        $filters = ListQuery::validate($request, $sortable, [
            'below_only' => ['sometimes', 'boolean'],
            'scope' => ['sometimes', Rule::in(['product', 'warehouse'])],
            'warehouse_id' => ['sometimes', 'integer', 'min:1', 'exists:locations,id'],
            'product_id' => ['sometimes', 'integer', 'min:1', 'exists:products,id'],
        ]);

        if (($filters['scope'] ?? 'product') === 'warehouse') {
            return $this->warehouseThresholds($request, $filters, $sortable);
        }

        $stock = DB::table('inventory_balances as balance')
            ->join('locations as stock_location', 'stock_location.id', '=', 'balance.location_id')
            ->where('stock_location.location_type', '<>', 'damaged')
            ->where('stock_location.is_active', true)
            ->select('balance.product_id')
            ->selectRaw('COALESCE(SUM(balance.quantity_on_hand), 0) as quantity_on_hand')
            ->selectRaw('COALESCE(SUM(balance.quantity_on_hand - balance.quantity_reserved), 0) as available_quantity')
            ->groupBy('balance.product_id');
        $query = DB::table('products as product')
            ->leftJoinSub($stock, 'stock', 'stock.product_id', '=', 'product.id')
            ->where('product.is_active', true)
            ->when(isset($filters['product_id']), fn ($builder) => $builder->where('product.id', $filters['product_id']))
            ->selectRaw('-CAST(product.id AS SIGNED) as id')
            ->selectRaw("'product' as threshold_scope")
            ->addSelect([
                'product.id as product_id', 'product.sku', 'product.name as product_name',
                DB::raw('COALESCE(stock.quantity_on_hand, 0) as quantity_on_hand'),
                DB::raw('COALESCE(stock.available_quantity, 0) as available_quantity'),
                DB::raw('COALESCE(product.minimum_stock, 0) as minimum_quantity'),
                DB::raw('CASE WHEN COALESCE(product.minimum_stock, 0) > 0 AND COALESCE(stock.available_quantity, 0) <= product.minimum_stock THEN 1 ELSE 0 END as is_below_minimum'),
                'product.updated_at',
            ])
            ->selectRaw('NULL as warehouse_id')
            ->selectRaw("NULL as warehouse_code")
            ->selectRaw("NULL as warehouse_name");
        if (filter_var($filters['below_only'] ?? false, FILTER_VALIDATE_BOOLEAN)) {
            $query->where('product.minimum_stock', '>', 0)
                ->whereRaw('COALESCE(stock.available_quantity, 0) <= product.minimum_stock');
        }
        ListQuery::search($query, $filters, ['product.name', 'product.sku']);
        ListQuery::sort($query, $filters, $sortable, 'product_name', ['product.id']);
        $page = $query->paginate($filters['per_page'] ?? 50);
        $page->getCollection()->transform(static function (object $row): object {
            foreach (['id', 'product_id', 'minimum_quantity', 'quantity_on_hand', 'available_quantity'] as $field) {
                $row->{$field} = (int) $row->{$field};
            }
            $row->is_below_minimum = (bool) $row->is_below_minimum;

            return $row;
        });

        return response()->json(ListQuery::page($page));
    }

    /** @param array<string, mixed> $filters @param array<string, string> $sortable */
    private function warehouseThresholds(Request $request, array $filters, array $sortable): JsonResponse
    {
        $query = DB::table('product_location_minimum_stock as threshold')
            ->join('products as product', 'product.id', '=', 'threshold.product_id')
            ->join('locations as warehouse', 'warehouse.id', '=', 'threshold.location_id')
            ->leftJoin('inventory_balances as balance', function ($join): void {
                $join->on('balance.product_id', '=', 'threshold.product_id')
                    ->on('balance.location_id', '=', 'threshold.location_id');
            })
            ->where('product.is_active', true)
            ->where('warehouse.is_active', true)
            ->where('warehouse.location_type', '<>', 'damaged')
            ->when(isset($filters['warehouse_id']), fn ($builder) => $builder->where('threshold.location_id', $filters['warehouse_id']))
            ->when(isset($filters['product_id']), fn ($builder) => $builder->where('threshold.product_id', $filters['product_id']))
            ->select([
                'threshold.id',
                DB::raw("'warehouse' as threshold_scope"),
                'threshold.product_id',
                'product.sku',
                'product.name as product_name',
                'threshold.location_id as warehouse_id',
                'warehouse.code as warehouse_code',
                'warehouse.name as warehouse_name',
                'threshold.minimum_quantity',
                DB::raw('COALESCE(balance.quantity_on_hand, 0) as quantity_on_hand'),
                DB::raw('GREATEST(COALESCE(balance.quantity_on_hand, 0) - COALESCE(balance.quantity_reserved, 0), 0) as available_quantity'),
                DB::raw('CASE WHEN threshold.minimum_quantity > 0 AND GREATEST(COALESCE(balance.quantity_on_hand, 0) - COALESCE(balance.quantity_reserved, 0), 0) <= threshold.minimum_quantity THEN 1 ELSE 0 END as is_below_minimum'),
                'threshold.updated_at',
            ]);

        if (filter_var($filters['below_only'] ?? false, FILTER_VALIDATE_BOOLEAN)) {
            $query->where('threshold.minimum_quantity', '>', 0)
                ->whereRaw('GREATEST(COALESCE(balance.quantity_on_hand, 0) - COALESCE(balance.quantity_reserved, 0), 0) <= threshold.minimum_quantity');
        }
        ListQuery::search($query, $filters, ['product.name', 'product.sku', 'warehouse.name', 'warehouse.code']);
        ListQuery::sort($query, $filters, $sortable, 'product_name', ['threshold.product_id', 'threshold.location_id']);

        $page = $query->paginate($filters['per_page'] ?? 50);
        $page->getCollection()->transform(static function (object $row): object {
            foreach (['id', 'product_id', 'warehouse_id', 'minimum_quantity', 'quantity_on_hand', 'available_quantity'] as $field) {
                $row->{$field} = (int) $row->{$field};
            }
            $row->is_below_minimum = (bool) $row->is_below_minimum;

            return $row;
        });

        return response()->json(ListQuery::page($page));
    }

    public function update(Request $request): JsonResponse
    {
        Gate::forUser($request->attributes->get('authenticated_user'))->authorize('minimumUpdate', MinimumStockThreshold::class);
        $values = $request->validate([
            'product_id' => ['required', 'integer', 'min:1', 'exists:products,id'],
            'warehouse_id' => ['required', 'integer', 'min:1', 'exists:locations,id'],
            'minimum_quantity' => ['required', 'integer', 'between:0,2147483647'],
        ]);
        $warehouseIsEligible = DB::table('locations')->where('id', $values['warehouse_id'])
            ->where('is_active', true)->where('location_type', '<>', 'damaged')->exists();
        if (! $warehouseIsEligible) {
            throw ValidationException::withMessages(['warehouse_id' => ['Choose an active warehouse that can hold saleable stock.']]);
        }
        $actor = $request->attributes->get('authenticated_user');
        $row = DB::transaction(function () use ($values, $actor, $request): array {
            $before = DB::table('product_location_minimum_stock')->where('product_id', $values['product_id'])
                ->where('location_id', $values['warehouse_id'])->lockForUpdate()->first();
            DB::table('product_location_minimum_stock')->updateOrInsert(
                ['product_id' => $values['product_id'], 'location_id' => $values['warehouse_id']],
                ['minimum_quantity' => $values['minimum_quantity'], 'updated_by_user_id' => $actor->id,
                    'updated_at' => now(), 'created_at' => $before?->created_at ?? now()],
            );
            $after = DB::table('product_location_minimum_stock')->where('product_id', $values['product_id'])
                ->where('location_id', $values['warehouse_id'])->first();
            $this->auditLog->record($request, 'inventory.minimum_stock.updated', 'product_location_minimum_stock', (int) $after->id,
                'Per-location minimum stock threshold updated.', $before === null ? null : (array) $before, (array) $after);
            $balance = DB::table('inventory_balances')->where('product_id', $values['product_id'])
                ->where('location_id', $values['warehouse_id'])->first();
            $product = DB::table('products')->where('id', $values['product_id'])->first(['id', 'sku', 'name']);
            $warehouse = DB::table('locations')->where('id', $values['warehouse_id'])->first(['id', 'code', 'name']);
            return [
                'id' => (int) $after->id, 'threshold_scope' => 'warehouse', 'product_id' => (int) $product->id,
                'sku' => $product->sku, 'product_name' => $product->name, 'warehouse_id' => (int) $warehouse->id,
                'warehouse_code' => $warehouse->code, 'warehouse_name' => $warehouse->name,
                'minimum_quantity' => (int) $after->minimum_quantity,
                'quantity_on_hand' => (int) ($balance->quantity_on_hand ?? 0),
                'available_quantity' => max(0, (int) ($balance->quantity_on_hand ?? 0) - (int) ($balance->quantity_reserved ?? 0)),
                'is_below_minimum' => (bool) ((int) $after->minimum_quantity > 0 && max(0, (int) ($balance->quantity_on_hand ?? 0) - (int) ($balance->quantity_reserved ?? 0)) <= (int) $after->minimum_quantity),
                'updated_at' => $after->updated_at,
            ];
        }, 5);
        return response()->json(['data' => $row]);
    }
}
