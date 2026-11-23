<?php

namespace App\Http\Controllers;

use App\Models\WarehouseReturn;
use App\Services\WarehouseReturnService;
use App\Support\ListQuery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class WarehouseReturnController extends Controller
{
    public function __construct(private readonly WarehouseReturnService $returns) {}

    public function index(Request $request): JsonResponse
    {
        Gate::forUser($request->attributes->get('authenticated_user'))->authorize('viewAny', WarehouseReturn::class);
        $filters = ListQuery::validate($request, ['return_date' => 'warehouse_returns.return_date', 'id' => 'warehouse_returns.id'], [
            'warehouse_id' => ['sometimes', 'integer', 'min:1'], 'status' => ['sometimes', 'in:draft,approved'],
        ]);
        $query = DB::table('warehouse_returns')->join('locations', 'locations.id', '=', 'warehouse_returns.warehouse_id')
            ->leftJoin('users as creator', 'creator.id', '=', 'warehouse_returns.created_by_user_id')
            ->select('warehouse_returns.*', 'locations.name as warehouse_name', 'creator.display_name as created_by_name')
            ->selectSub(function ($sub): void {
                $sub->from('warehouse_return_lines')->whereColumn('warehouse_return_id', 'warehouse_returns.id')
                    ->selectRaw('COALESCE(SUM(quantity), 0)');
            }, 'total_quantity')
            ->selectSub(function ($sub): void {
                $sub->from('warehouse_return_lines as line')->join('products as product', 'product.id', '=', 'line.product_id')
                    ->whereColumn('line.warehouse_return_id', 'warehouse_returns.id')
                    ->selectRaw("GROUP_CONCAT(product.name ORDER BY line.line_number SEPARATOR ', ')");
            }, 'product_names')
            ->selectSub(function ($sub): void {
                $sub->from('warehouse_return_lines as return_line')
                    ->join('inventory_movement_lines as source_line', 'source_line.id', '=', 'return_line.source_movement_line_id')
                    ->join('inventory_movements as source_movement', 'source_movement.id', '=', 'source_line.inventory_movement_id')
                    ->leftJoin('sales_documents as sale', function ($join): void {
                        $join->on('sale.id', '=', 'source_movement.source_id')->where('source_movement.source_type', '=', 'sales_document');
                    })
                    ->whereColumn('return_line.warehouse_return_id', 'warehouse_returns.id')
                    ->orderBy('return_line.line_number')
                    ->limit(1)
                    ->selectRaw('COALESCE(sale.document_number, source_movement.movement_number)');
            }, 'source_reference');
        if (isset($filters['warehouse_id'])) $query->where('warehouse_returns.warehouse_id', $filters['warehouse_id']);
        if (isset($filters['status'])) $query->where('warehouse_returns.status', $filters['status']);
        ListQuery::search($query, $filters, ['locations.name', 'warehouse_returns.reason']);
        ListQuery::sort($query, $filters, ['return_date' => 'warehouse_returns.return_date', 'id' => 'warehouse_returns.id'], 'return_date', 'warehouse_returns.id', 'desc');
        return response()->json(ListQuery::page($query->paginate($filters['per_page'] ?? 50)));
    }

    public function candidates(Request $request): JsonResponse
    {
        Gate::forUser($request->attributes->get('authenticated_user'))->authorize('viewAny', WarehouseReturn::class);
        $sortable = ['movement_date' => 'movement.movement_date', 'product_name' => 'product.name', 'id' => 'line.id'];
        $filters = ListQuery::validate($request, $sortable);
        $warehouseReturned = DB::table('warehouse_return_lines as return_line')
            ->join('warehouse_returns as return_doc', 'return_doc.id', '=', 'return_line.warehouse_return_id')
            ->where('return_doc.status', 'approved')
            ->whereNotNull('return_line.source_movement_line_id')
            ->select('return_line.source_movement_line_id')
            ->selectRaw('SUM(return_line.quantity) as returned_quantity')
            ->groupBy('return_line.source_movement_line_id');
        $creditReturned = DB::table('sales_document_lines as return_line')
            ->join('sales_documents as return_doc', 'return_doc.id', '=', 'return_line.sales_document_id')
            ->where('return_doc.document_type', 'credit_note')
            ->where('return_doc.status', 'posted')
            ->whereNotNull('return_line.original_document_line_id')
            ->select('return_line.original_document_line_id')
            ->selectRaw('SUM(return_line.quantity) as returned_quantity')
            ->groupBy('return_line.original_document_line_id');
        $query = DB::table('inventory_movement_lines as line')
            ->join('inventory_movements as movement', 'movement.id', '=', 'line.inventory_movement_id')
            ->join('products as product', 'product.id', '=', 'line.product_id')
            ->join('locations as source_location', 'source_location.id', '=', 'line.from_location_id')
            ->leftJoin('locations as current_location', 'current_location.id', '=', 'line.to_location_id')
            ->leftJoin('sales_documents as sale', function ($join): void {
                $join->on('sale.id', '=', 'movement.source_id')->where('movement.source_type', '=', 'sales_document');
            })
            ->leftJoinSub($warehouseReturned, 'warehouse_returned', 'warehouse_returned.source_movement_line_id', '=', 'line.id')
            ->leftJoinSub($creditReturned, 'credit_returned', 'credit_returned.original_document_line_id', '=', 'line.sales_document_line_id')
            ->where('movement.status', 'posted')
            ->where('product.is_active', true)
            ->whereIn('movement.movement_type', ['sale', 'transfer'])
            ->where(function ($builder): void {
                $builder->where('movement.movement_type', 'transfer')->orWhere('sale.status', 'posted');
            })
            ->whereRaw('line.quantity > COALESCE(warehouse_returned.returned_quantity, 0) + COALESCE(credit_returned.returned_quantity, 0)')
            ->select([
                'line.id', 'line.product_id', 'product.sku', 'product.name as product_name',
                'line.from_location_id as source_warehouse_id', 'source_location.name as source_warehouse_name',
                'line.to_location_id as current_warehouse_id', 'current_location.name as current_warehouse_name',
                'movement.movement_type', 'movement.movement_date', 'movement.movement_number',
                DB::raw('COALESCE(sale.document_number, movement.movement_number) as source_reference'),
                'line.quantity as issued_quantity',
                DB::raw('COALESCE(warehouse_returned.returned_quantity, 0) + COALESCE(credit_returned.returned_quantity, 0) as returned_quantity'),
                DB::raw('line.quantity - COALESCE(warehouse_returned.returned_quantity, 0) - COALESCE(credit_returned.returned_quantity, 0) as available_quantity'),
            ]);
        ListQuery::search($query, $filters, ['product.name', 'product.sku', 'movement.movement_number', 'sale.document_number', 'source_location.name', 'current_location.name']);
        ListQuery::sort($query, $filters, $sortable, 'movement_date', 'line.id', 'desc');
        return response()->json(ListQuery::page($query->paginate($filters['per_page'] ?? 20)));
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $return = WarehouseReturn::query()->findOrFail($id);
        Gate::forUser($request->attributes->get('authenticated_user'))->authorize('view', $return);
        $return->setAttribute('warehouse_name', DB::table('locations')->where('id', $return->warehouse_id)->value('name'));
        $return->setAttribute('created_by_name', DB::table('users')->where('id', $return->created_by_user_id)->value('display_name'));
        return response()->json(['data' => ['return' => $return,
            'lines' => DB::table('warehouse_return_lines as line')->join('products as product', 'product.id', '=', 'line.product_id')
                ->leftJoin('inventory_movement_lines as movement_line', function ($join): void {
                    $join->on('movement_line.inventory_movement_id', '=', 'line.inventory_movement_id')
                        ->on('movement_line.product_id', '=', 'line.product_id');
                })
                ->where('line.warehouse_return_id', $id)->orderBy('line.line_number')
                ->get(['line.*', 'product.sku', 'product.name as product_name', 'movement_line.id as movement_line_id'])]]);
    }

    public function store(Request $request): JsonResponse
    {
        Gate::forUser($request->attributes->get('authenticated_user'))->authorize('create', WarehouseReturn::class);
        $values = $request->validate([
            'warehouse_id' => ['required', 'integer', 'exists:locations,id'],
            'return_date' => ['required', 'date_format:Y-m-d'], 'reason' => ['required', 'string', 'max:500'],
            'idempotency_key' => ['required', 'string', 'max:200'], 'lines' => ['required', 'array', 'min:1'],
            'lines.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'lines.*.quantity' => ['required', 'integer', 'min:1'],
            'lines.*.unit_cost_egp' => ['required', 'decimal:0,4', 'min:0'],
        ]);
        $existing = WarehouseReturn::query()->where('idempotency_key', $values['idempotency_key'])->first();
        $return = $this->returns->create($values, $request);
        return response()->json(['data' => ['return' => $return]], $existing ? 200 : 201);
    }

    public function returnMovement(Request $request): JsonResponse
    {
        Gate::forUser($request->attributes->get('authenticated_user'))->authorize('create', WarehouseReturn::class);
        $values = $request->validate([
            'source_movement_line_id' => ['required', 'integer', 'min:1', 'exists:inventory_movement_lines,id'],
            'warehouse_id' => ['required', 'integer', 'min:1', 'exists:locations,id'],
            'quantity' => ['required', 'integer', 'between:1,2147483647'],
            'return_condition' => ['required', 'in:good,damaged'],
            'return_date' => ['required', 'date_format:Y-m-d'],
            'reason' => ['sometimes', 'nullable', 'string', 'max:500'],
            'idempotency_key' => ['required', 'string', 'max:200'],
        ]);
        $existing = WarehouseReturn::query()->where('idempotency_key', $values['idempotency_key'])->exists();
        $approved = DB::transaction(function () use ($values, $request): WarehouseReturn {
            $return = $this->returns->createFromMovement($values, $request);
            Gate::forUser($request->attributes->get('authenticated_user'))->authorize('approve', $return);
            return $this->returns->approve($return, $request);
        }, 5);
        return response()->json(['data' => ['return' => $approved]], $existing ? 200 : 201);
    }

    public function approve(Request $request, int $id): JsonResponse
    {
        $return = WarehouseReturn::query()->findOrFail($id);
        Gate::forUser($request->attributes->get('authenticated_user'))->authorize('approve', $return);
        $approved = $this->returns->approve($return, $request);
        return response()->json(['data' => ['return' => $approved,
            'lines' => DB::table('warehouse_return_lines')->where('warehouse_return_id', $id)->orderBy('line_number')->get()]]);
    }
}
