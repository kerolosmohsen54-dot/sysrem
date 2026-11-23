<?php

namespace App\Http\Controllers;

use App\Models\InventoryCount;
use App\Services\AuditLogService;
use App\Services\InventoryService;
use App\Services\FinancialOutboxService;
use App\Support\ListQuery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class InventoryCountController extends Controller
{
    public function __construct(
        private readonly InventoryService $inventory,
        private readonly AuditLogService $auditLog,
        private readonly FinancialOutboxService $outbox,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $filters = ListQuery::validate($request, ['count_date' => 'count.count_date', 'status' => 'count.status', 'id' => 'count.id'], [
            'status' => ['sometimes', 'in:draft,approved,cancelled'], 'warehouse_id' => ['sometimes', 'integer', 'min:1'],
        ]);
        $query = DB::table('inventory_counts as count')
            ->join('locations as warehouse', 'warehouse.id', '=', 'count.warehouse_id')
            ->select('count.*', 'warehouse.name as warehouse_name')
            ->when(isset($filters['status']), fn ($q) => $q->where('count.status', $filters['status']))
            ->when(isset($filters['warehouse_id']), fn ($q) => $q->where('count.warehouse_id', $filters['warehouse_id']));
        ListQuery::search($query, $filters, ['count.count_number', 'count.reason', 'warehouse.name']);
        ListQuery::sort($query, $filters, ['count_date' => 'count.count_date', 'status' => 'count.status', 'id' => 'count.id'], 'count_date', 'count.id', 'desc');
        return response()->json(ListQuery::page($query->paginate($filters['per_page'] ?? 50)));
    }

    public function show(int $countId): JsonResponse
    {
        $count = DB::table('inventory_counts')->where('id', $countId)->first();
        abort_if($count === null, 404);
        $lines = DB::table('inventory_count_lines as line')->join('products', 'products.id', '=', 'line.product_id')
            ->leftJoin('inventory_movement_lines as movement_line', 'movement_line.inventory_movement_id', '=', 'line.inventory_movement_id')
            ->where('line.inventory_count_id', $countId)->orderBy('line.line_number')
            ->get(['line.*', 'products.sku', 'products.name as product_name', 'movement_line.id as movement_line_id']);
        return response()->json(['data' => ['count' => $count, 'lines' => $lines]]);
    }

    public function store(Request $request): JsonResponse
    {
        Gate::forUser($request->attributes->get('authenticated_user'))->authorize('countCreate', InventoryCount::class);
        $values = $request->validate([
            'warehouse_id' => ['required', 'integer', 'min:1', 'exists:locations,id'],
            'count_date' => ['required', 'date_format:Y-m-d'], 'reason' => ['required', 'string', 'max:1000'],
            'idempotency_key' => ['required', 'string', 'max:200'], 'lines' => ['required', 'array', 'min:1'],
            'lines.*.product_id' => ['required', 'integer', 'min:1', 'distinct', 'exists:products,id'],
            'lines.*.counted_quantity' => ['required', 'integer', 'between:0,2147483647'],
            'lines.*.difference_reason' => ['sometimes', 'nullable', 'in:shortage_damage,record_error,theft,unrecorded_increase,other'],
        ]);
        $existing = DB::table('inventory_counts')->where('idempotency_key', $values['idempotency_key'])->first();
        if ($existing !== null) return response()->json(['data' => ['count' => $existing, 'lines' => DB::table('inventory_count_lines')->where('inventory_count_id', $existing->id)->orderBy('line_number')->get()]], 200);
        $result = DB::transaction(function () use ($values, $request): array {
            $warehouse = DB::table('locations')->where('id', $values['warehouse_id'])->where('is_active', true)->lockForUpdate()->first(['id']);
            if ($warehouse === null) throw ValidationException::withMessages(['warehouse_id' => ['The selected warehouse is inactive.']]);
            $number = 'CNT-'.Str::upper(Str::random(12));
            $id = (int) DB::table('inventory_counts')->insertGetId([
                'count_number' => $number, 'warehouse_id' => $values['warehouse_id'], 'count_date' => $values['count_date'],
                'status' => 'draft', 'reason' => $values['reason'],
                'created_by_user_id' => $request->attributes->get('authenticated_user')->id,
                'idempotency_key' => $values['idempotency_key'], 'created_at' => now(), 'updated_at' => now(),
            ]);
            foreach ($values['lines'] as $index => $input) {
                $product = DB::table('products')->where('id', $input['product_id'])->where('is_active', true)->sharedLock()->first(['id']);
                if ($product === null) throw ValidationException::withMessages(["lines.{$index}.product_id" => ['The selected product is inactive.']]);
                $expected = (int) (DB::table('inventory_balances')->where('product_id', $input['product_id'])->where('location_id', $values['warehouse_id'])->lockForUpdate()->value('quantity_on_hand') ?? 0);
                DB::table('inventory_count_lines')->insert([
                    'inventory_count_id' => $id, 'line_number' => $index + 1, 'product_id' => $input['product_id'],
                    'expected_quantity' => $expected, 'counted_quantity' => $input['counted_quantity'],
                    'difference_quantity' => (int) $input['counted_quantity'] - $expected,
                    'difference_reason' => $input['difference_reason'] ?? null,
                    'created_at' => now(), 'updated_at' => now(),
                ]);
            }
            $this->auditLog->record($request, 'inventory_count.created', 'inventory_count', $id, $values['reason'], null,
                ['count_number' => $number, 'warehouse_id' => (int) $values['warehouse_id'], 'line_count' => count($values['lines'])]);
            return ['id' => $id, 'created' => true];
        }, 5);
        $count = DB::table('inventory_counts')->where('id', $result['id'])->first();
        return response()->json(['data' => ['count' => $count, 'lines' => DB::table('inventory_count_lines')->where('inventory_count_id', $result['id'])->orderBy('line_number')->get()]], 201);
    }

    public function approve(Request $request, int $countId): JsonResponse
    {
        Gate::forUser($request->attributes->get('authenticated_user'))->authorize('countApprove', InventoryCount::class);
        $result = DB::transaction(function () use ($request, $countId): array {
            $count = DB::table('inventory_counts')->where('id', $countId)->lockForUpdate()->first();
            abort_if($count === null, 404);
            if ($count->status !== 'draft') return ['conflict' => true, 'count' => $count];
            $lines = DB::table('inventory_count_lines')->where('inventory_count_id', $countId)->orderBy('line_number')->lockForUpdate()->get();
            foreach ($lines as $line) {
                DB::table('inventory_balances')->insertOrIgnore([
                    'product_id' => $line->product_id,
                    'location_id' => $count->warehouse_id,
                    'quantity_on_hand' => 0,
                    'quantity_reserved' => 0,
                    'average_unit_cost_egp' => null,
                    'inventory_value_egp' => '0.00',
                    'updated_at' => now(),
                ]);
                $balance = DB::table('inventory_balances')->where('product_id', $line->product_id)
                    ->where('location_id', $count->warehouse_id)->lockForUpdate()->first();
                $currentQuantity = (int) ($balance?->quantity_on_hand ?? 0);
                $difference = (int) $line->counted_quantity - $currentQuantity;
                DB::table('inventory_count_lines')->where('id', $line->id)->update([
                    'expected_quantity' => $currentQuantity,
                    'difference_quantity' => $difference,
                    'updated_at' => now(),
                ]);
                if ($difference === 0) continue;
                $source = ['movement_type' => 'count', 'movement_date' => $count->count_date,
                    'reason' => $count->reason, 'source_type' => 'inventory_count_line', 'source_id' => (int) $line->id];
                if ($difference > 0) {
                    $unitCost = $balance?->average_unit_cost_egp
                        ?? DB::table('products')->where('id', $line->product_id)->value('purchase_cost_egp');
                    if ($unitCost === null) {
                        throw ValidationException::withMessages(['unit_cost_egp' => ['A positive count variance needs a known average or recent purchase cost before approval.']]);
                    }
                    $movement = $this->inventory->receive((int) $line->product_id, (int) $count->warehouse_id, $difference,
                        (string) $unitCost, $source, $request);
                } else {
                    $movement = $this->inventory->issue((int) $line->product_id, (int) $count->warehouse_id, abs($difference), $source, $request);
                }
                DB::table('inventory_count_lines')->where('id', $line->id)->update(['inventory_movement_id' => $movement['movement_id'], 'updated_at' => now()]);
            }
            $actorId = (int) $request->attributes->get('authenticated_user')->id;
            DB::table('inventory_counts')->where('id', $countId)->update(['status' => 'approved', 'approved_by_user_id' => $actorId, 'approved_at' => now(), 'updated_at' => now()]);
            $approved = DB::table('inventory_counts')->where('id', $countId)->first();
            $this->auditLog->record($request, 'inventory_count.approved', 'inventory_count', $countId, $count->reason,
                ['status' => 'draft'], ['status' => 'approved', 'approved_by_user_id' => $actorId]);
            $this->outbox->recordPostedDocument('inventory_count', $countId, ['count_number' => $count->count_number]);
            return ['conflict' => false, 'count' => $approved];
        }, 5);
        if ($result['conflict']) return response()->json(['error' => ['code' => 'COUNT_NOT_DRAFT', 'message' => __('Only draft count sessions can be approved.')]], 409);
        return $this->show($countId);
    }
}
