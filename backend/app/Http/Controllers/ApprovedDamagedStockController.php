<?php

namespace App\Http\Controllers;

use App\Services\FinancialOutboxService;
use App\Services\InventoryService;
use App\Support\ListQuery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ApprovedDamagedStockController extends Controller
{
    public function __construct(
        private readonly InventoryService $inventory,
        private readonly FinancialOutboxService $outbox,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $sortable = [
            'id' => 'damaged.id',
            'approved_at' => 'damaged.approved_at',
            'product_name' => 'product.name',
            'warehouse_name' => 'warehouse.name',
        ];
        $filters = ListQuery::validate($request, $sortable);
        $query = DB::table('approved_damaged_stock as damaged')
            ->join('products as product', 'product.id', '=', 'damaged.product_id')
            ->join('locations as warehouse', 'warehouse.id', '=', 'damaged.warehouse_id')
            ->leftJoin('users as approver', 'approver.id', '=', 'damaged.approved_by_user_id')
            ->select([
                'damaged.id', 'damaged.product_id', 'product.sku', 'product.name as product_name',
                'damaged.warehouse_id', 'warehouse.name as warehouse_name', 'damaged.quantity',
                'damaged.cost_egp', 'damaged.status', 'damaged.approved_at',
                'damaged.approved_by_user_id', 'approver.display_name as approved_by_name',
                'damaged.created_at',
            ]);
        ListQuery::search($query, $filters, ['product.name', 'product.sku', 'warehouse.name', 'damaged.status']);
        ListQuery::sort($query, $filters, $sortable, 'id', 'damaged.id', 'desc');

        return response()->json(ListQuery::page($query->paginate($filters['per_page'] ?? 50)));
    }

    public function store(Request $request): JsonResponse
    {
        $values = $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'warehouse_id' => ['required', 'integer', 'exists:locations,id'],
            'quantity' => ['required', 'integer', 'min:1'],
            'cost_egp' => ['required', 'decimal:0,4', 'min:0'],
            'idempotency_key' => ['required', 'string', 'max:200'],
        ]);

        $existing = DB::table('approved_damaged_stock')
            ->where('idempotency_key', $values['idempotency_key'])
            ->first();
        if ($existing !== null) {
            return response()->json(['data' => ['item' => $existing]], 200);
        }

        $item = DB::transaction(function () use ($values, $request): object {
            $actor = $request->attributes->get('authenticated_user');
            $itemId = (int) DB::table('approved_damaged_stock')->insertGetId([
                ...$values,
                'status' => 'approved',
                'approved_by_user_id' => is_object($actor) ? $actor->id : null,
                'approved_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $movement = $this->inventory->issue(
                (int) $values['product_id'],
                (int) $values['warehouse_id'],
                (int) $values['quantity'],
                [
                    'movement_type' => 'damage',
                    'movement_date' => now()->toDateString(),
                    'source_type' => 'approved_damaged_stock',
                    'source_id' => $itemId,
                    'reason' => 'إعدام مخزون تالف رقم '.$itemId,
                ],
                $request,
            );

            $this->outbox->recordPostedDocument('approved_damaged_stock', $itemId, [
                'movement_id' => (int) $movement['movement_id'],
            ]);

            return DB::table('approved_damaged_stock')->where('id', $itemId)->first();
        }, 5);

        return response()->json(['data' => ['item' => $item]], 201);
    }
}
