<?php

namespace App\Http\Controllers;

use App\Services\AuditLogService;
use App\Services\FinancialOutboxService;
use App\Services\InventoryService;
use App\Services\TrashService;
use App\Support\ExactMoney;
use App\Support\ListQuery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;
use RuntimeException;

class ContainerController extends Controller
{
    public function __construct(
        private readonly AuditLogService $auditLog,
        private readonly InventoryService $inventory,
        private readonly FinancialOutboxService $outbox,
        private readonly TrashService $trash,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $sortable = [
            'container_name' => 'containers.container_name',
            'container_number' => 'containers.container_number',
            'status' => 'containers.status',
            'origin' => 'containers.origin',
            'destination' => 'containers.destination',
            'estimated_arrival' => 'containers.estimated_arrival',
            'id' => 'containers.id',
        ];
        $filters = ListQuery::validate($request, $sortable, [
            'status' => ['sometimes', 'in:draft,in_transit,at_port,receiving,received,cancelled'],
            'supplier_id' => ['sometimes', 'integer', 'min:1'],
            'driver_id' => ['sometimes', 'integer', 'min:1', 'exists:shipping_drivers,id'],
            'from_date' => ['sometimes', 'date_format:Y-m-d'],
            'to_date' => ['sometimes', 'date_format:Y-m-d', 'after_or_equal:from_date'],
        ]);
        $query = DB::table('containers')
            ->leftJoin('suppliers', 'suppliers.id', '=', 'containers.supplier_id')
            ->leftJoin('locations as current_location', 'current_location.id', '=', 'containers.current_location_id')
            ->leftJoin('shipping_drivers', 'shipping_drivers.id', '=', 'containers.shipping_driver_id')
            ->select([
                'containers.*', 'suppliers.name as supplier_name', 'current_location.name as current_location_name',
                'shipping_drivers.name as driver_name', 'shipping_drivers.shipping_company',
            ])
            ->selectSub(fn ($lines) => $lines->from('container_lines')->selectRaw('COUNT(DISTINCT product_id)')
                ->whereColumn('container_lines.container_id', 'containers.id'), 'line_count')
            ->selectSub(fn ($costs) => $costs->from('container_costs')->selectRaw('COALESCE(SUM(amount_egp), 0)')
                ->whereColumn('container_costs.container_id', 'containers.id')
                ->where('container_costs.status', '<>', 'cancelled'), 'expenses_egp')
            ->selectSub(fn ($receipts) => $receipts->from('container_receipts')->selectRaw('COUNT(*)')
                ->whereColumn('container_receipts.container_id', 'containers.id')->where('status', 'posted'), 'posted_receipt_count')
            ->whereNotExists(fn ($archived) => $archived->selectRaw('1')->from('trash_items as trash')
                ->where('trash.entity_type', 'container')->whereColumn('trash.entity_id', 'containers.id')
                ->whereNull('trash.restored_at')->whereNull('trash.permanently_deleted_at'))
            ->when(! isset($filters['status']), fn ($q) => $q->where('containers.status', '<>', 'cancelled'))
            ->when(isset($filters['status']), fn ($q) => $q->where('status', $filters['status']))
            ->when(isset($filters['supplier_id']), fn ($q) => $q->where('supplier_id', $filters['supplier_id']))
            ->when(isset($filters['driver_id']), fn ($q) => $q->where('containers.shipping_driver_id', $filters['driver_id']))
            ->when(isset($filters['from_date']), fn ($q) => $q->where('estimated_arrival', '>=', $filters['from_date']))
            ->when(isset($filters['to_date']), fn ($q) => $q->where('estimated_arrival', '<=', $filters['to_date']));
        ListQuery::search($query, $filters, ['containers.container_number', 'containers.container_name', 'containers.origin', 'containers.destination']);
        ListQuery::sort($query, $filters, $sortable, 'id', 'containers.id', 'desc');

        return response()->json(ListQuery::page($query->paginate($filters['per_page'] ?? 50)));
    }

    public function show(Request $request, int $containerId): JsonResponse
    {
        $container = DB::table('containers')
            ->leftJoin('suppliers', 'suppliers.id', '=', 'containers.supplier_id')
            ->leftJoin('shipping_drivers', 'shipping_drivers.id', '=', 'containers.shipping_driver_id')
            ->leftJoin('locations as current_location', 'current_location.id', '=', 'containers.current_location_id')
            ->where('containers.id', $containerId)
            ->whereNotExists(fn ($archived) => $archived->selectRaw('1')->from('trash_items as trash')
                ->where('trash.entity_type', 'container')->whereColumn('trash.entity_id', 'containers.id')
                ->whereNull('trash.restored_at')->whereNull('trash.permanently_deleted_at'))
            ->select(['containers.*', 'suppliers.name as supplier_name', 'shipping_drivers.name as driver_name', 'shipping_drivers.shipping_company', 'current_location.name as current_location_name'])
            ->first();
        abort_if($container === null, 404);

        $costs = DB::table('container_costs')->where('container_id', $containerId)->orderBy('id')->get();
        $canViewCosts = $this->canViewCosts($request);
        $lines = DB::table('container_lines as line')
            ->join('products', 'products.id', '=', 'line.product_id')
            ->where('line.container_id', $containerId)
            ->orderBy('line.line_number')
            ->get([
                'line.id', 'line.product_id', 'products.name as product_name', 'products.sku',
                'line.expected_quantity', DB::raw('COALESCE(line.received_quantity, 0) as received_quantity'), 'line.purchase_unit_cost_egp', 'products.company_price',
                'line.purchase_value_egp', 'line.notes',
            ]);
        $receipts = DB::table('container_receipts as receipt')
            ->join('inventory_movements as movement', 'movement.id', '=', 'receipt.inventory_movement_id')
            ->where('receipt.container_id', $containerId)
            ->orderBy('receipt.id')
            ->get([
                'receipt.id', 'receipt.inventory_movement_id', 'receipt.status', 'receipt.received_at',
                'movement.movement_number', 'movement.movement_date',
            ]);
        $receipts->each(function (object $receipt): void {
            $receipt->lines = DB::table('container_receipt_lines as receipt_line')
                ->join('inventory_movement_lines as movement_line', 'movement_line.container_receipt_line_id', '=', 'receipt_line.id')
                ->join('locations as warehouse', 'warehouse.id', '=', 'movement_line.to_location_id')
                ->join('products', 'products.id', '=', 'receipt_line.product_id')
                ->where('receipt_line.container_receipt_id', $receipt->id)
                ->orderBy('receipt_line.id')
                ->get([
                    'movement_line.id as movement_line_id', 'receipt_line.container_line_id', 'receipt_line.product_id', 'products.name as product_name',
                    'warehouse.id as warehouse_id', 'warehouse.name as warehouse_name',
                    'receipt_line.expected_quantity', 'receipt_line.received_quantity',
                    'receipt_line.discrepancy_quantity', 'movement_line.quantity',
                ]);
        });
        $statusHistory = DB::table('container_status_history as history')
            ->leftJoin('users', 'users.id', '=', 'history.changed_by_user_id')
            ->where('history.container_id', $containerId)
            ->orderBy('history.id')
            ->get(['history.id', 'history.old_status', 'history.new_status', 'history.reason', 'history.changed_at', 'users.display_name as actor_name']);
        $trackingEvents = DB::table('container_tracking_events as event')
            ->leftJoin('locations as from_location', 'from_location.id', '=', 'event.from_location_id')
            ->leftJoin('locations as to_location', 'to_location.id', '=', 'event.to_location_id')
            ->where('event.container_id', $containerId)
            ->orderBy('event.occurred_at')
            ->orderBy('event.id')
            ->get([
                'event.id', 'event.event_type', 'event.occurred_at', 'event.reference_number', 'event.details',
                'event.quantity', 'event.amount_egp', 'event.source_id',
                'event.from_location_id', 'from_location.name as from_location_name',
                'event.to_location_id', 'to_location.name as to_location_name',
            ]);
        if (! $canViewCosts) {
            $costs->each(function (object $cost): void {
                unset(
                    $cost->amount_egp,
                    $cost->include_in_inventory_cost,
                    $cost->original_amount_reference,
                    $cost->exchange_rate_reference,
                    $cost->original_currency_code_reference,
                );
            });
            $lines->each(function (object $line): void {
                unset($line->purchase_unit_cost_egp, $line->purchase_value_egp, $line->company_price);
            });
            $trackingEvents->each(function (object $event): void {
                unset($event->amount_egp);
            });
        }
        return response()->json([
            'data' => [
                'container' => $container,
                'lines' => $lines,
                'receipts' => $receipts,
                'status_history' => $statusHistory,
                'tracking_events' => $trackingEvents,
                'costs' => $costs,
                'cost_payments' => $canViewCosts
                    ? DB::table('container_cost_payments as payment')
                        ->join('container_costs as cost', 'cost.id', '=', 'payment.container_cost_id')
                        ->where('cost.container_id', $containerId)
                        ->orderBy('payment.id')
                        ->get(['payment.id', 'payment.container_cost_id', 'payment.treasury_entry_id', 'payment.amount_egp', 'payment.paid_at'])
                    : [],
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $values = $request->validate([
            'container_name' => ['required', 'string', 'max:160'],
            'container_number' => ['required', 'string', 'max:100'],
            'supplier_id' => ['sometimes', 'nullable', 'integer', 'min:1', 'exists:suppliers,id'],
            'shipping_driver_id' => ['sometimes', 'nullable', 'integer', 'min:1', 'exists:shipping_drivers,id'],
            'received_location_id' => ['required', 'integer', 'min:1', 'exists:locations,id'],
            'trip_reference' => ['sometimes', 'nullable', 'string', 'max:100'],
            'origin' => ['sometimes', 'nullable', 'string', 'max:160'],
            'destination' => ['sometimes', 'nullable', 'string', 'max:160'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'estimated_departure' => ['sometimes', 'nullable', 'date'],
            'estimated_arrival' => ['sometimes', 'nullable', 'date', 'after_or_equal:estimated_departure'],
            'lines' => ['required', 'array', 'min:1', 'max:100'],
            'lines.*.product_id' => ['required', 'integer', 'min:1', 'distinct', 'exists:products,id'],
            'lines.*.quantity' => ['required', 'integer', 'between:1,2147483647'],
            'lines.*.purchase_unit_cost_egp' => ['required', 'string', 'numeric', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,4})?\z/', 'gt:0'],
            'lines.*.company_price_egp' => ['sometimes', 'nullable', 'string', 'numeric', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,4})?\z/', 'gt:0'],
            'new_product_ids' => ['sometimes', 'array', 'max:100'],
            'new_product_ids.*' => ['required', 'integer', 'min:1', 'distinct', 'exists:products,id'],
        ]);

        $values['container_name'] = trim($values['container_name']);
        $values['container_number'] = trim($values['container_number']);
        if ($values['container_name'] === '') {
            throw ValidationException::withMessages(['container_name' => ['اسم الحاوية مطلوب.']]);
        }
        if ($values['container_number'] === '') {
            throw ValidationException::withMessages(['container_number' => ['رقم الحاوية مطلوب.']]);
        }

        $lineProductIds = array_map(static fn (array $line): int => (int) $line['product_id'], $values['lines']);
        $newProductIds = array_map('intval', $values['new_product_ids'] ?? []);
        if (array_diff($newProductIds, $lineProductIds) !== []) {
            throw ValidationException::withMessages(['new_product_ids' => ['Every product created from this container must be included in its product lines.']]);
        }

        $idempotencyKey = trim((string) $request->header('Idempotency-Key', ''));
        if (mb_strlen($idempotencyKey) > 200) {
            throw ValidationException::withMessages(['Idempotency-Key' => ['The idempotency key cannot exceed 200 characters.']]);
        }
        $requestHash = hash('sha256', json_encode(
            ['method' => $request->method(), 'path' => $request->path(), 'input' => $request->all()],
            JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_PRESERVE_ZERO_FRACTION,
        ), true);
        $actorId = $this->actorId($request);

        $result = DB::transaction(function () use ($request, $values, $newProductIds, $idempotencyKey, $requestHash, $actorId): array {
            $idempotencyRecordId = null;
            if ($idempotencyKey !== '' && DB::getSchemaBuilder()->hasTable('idempotency_records')) {
                DB::table('users')->where('id', $actorId)->lockForUpdate()->first(['id']);
                $existing = DB::table('idempotency_records')
                    ->where('user_id', $actorId)
                    ->where('idempotency_key', $idempotencyKey)
                    ->lockForUpdate()
                    ->first();
                if ($existing !== null) {
                    if (! hash_equals((string) $existing->request_hash, $requestHash)) {
                        abort(409, 'The idempotency key was already used with a different request.');
                    }
                    if ($existing->state !== 'completed' || $existing->response_body === null) {
                        abort(409, 'The previous idempotent request is not complete.');
                    }

                    return [
                        'payload' => json_decode((string) $existing->response_body, true, 512, JSON_THROW_ON_ERROR),
                        'status' => (int) ($existing->http_status ?: 201),
                    ];
                }
                $idempotencyRecordId = (int) DB::table('idempotency_records')->insertGetId([
                    'user_id' => $actorId,
                    'idempotency_key' => $idempotencyKey,
                    'request_hash' => $requestHash,
                    'state' => 'processing',
                    'created_at' => now(),
                ]);
            }

            $now = now();
            $lines = $values['lines'];
            $warehouseId = (int) $values['received_location_id'];
            unset($values['lines'], $values['new_product_ids']);
            if (DB::table('containers')->where('container_number', $values['container_number'])->exists()) {
                throw ValidationException::withMessages(['container_number' => ['رقم الحاوية مستخدم من قبل.']]);
            }
            $id = (int) DB::table('containers')->insertGetId([
                ...$values,
                'status' => 'received',
                'tracking_stage' => 'receipt',
                'landed_cost_allocation_basis' => 'quantity',
                'received_at' => $now,
                'received_location_id' => $warehouseId,
                'current_location_id' => $warehouseId,
                'received_by_user_id' => $actorId,
                'created_by_user_id' => $actorId,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $auditLines = [];
            $inventoryLines = [];
            foreach ($lines as $index => $line) {
                $product = DB::table('products')
                    ->where('id', $line['product_id'])
                    ->where('is_active', true)
                    ->lockForUpdate()
                    ->first(['id']);
                if ($product === null) {
                    throw ValidationException::withMessages(["lines.{$index}.product_id" => ['المنتج غير موجود أو غير نشط.']]);
                }

                $unitCost = (string) $line['purchase_unit_cost_egp'];
                $purchaseValue = $this->multiplyDecimalByInteger($unitCost, (int) $line['quantity']);
                $productUpdates = [
                    'purchase_cost_egp' => ExactMoney::fromCents(ExactMoney::toCents($unitCost)),
                    'updated_by_user_id' => $actorId,
                    'updated_at' => $now,
                ];
                if (array_key_exists('company_price_egp', $line) && $line['company_price_egp'] !== null) {
                    $productUpdates['company_price'] = ExactMoney::fromCents(ExactMoney::toCents((string) $line['company_price_egp']));
                }
                DB::table('products')->where('id', $line['product_id'])->update($productUpdates);
                $containerLineId = (int) DB::table('container_lines')->insertGetId([
                    'container_id' => $id,
                    'line_number' => $index + 1,
                    'product_id' => (int) $line['product_id'],
                    'expected_quantity' => (int) $line['quantity'],
                    'received_quantity' => (int) $line['quantity'],
                    'purchase_unit_cost_egp' => $unitCost,
                    'purchase_value_egp' => $purchaseValue,
                    'notes' => null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
                $inventoryLines[] = [
                    'container_line_id' => $containerLineId,
                    'product_id' => (int) $line['product_id'],
                    'quantity' => (int) $line['quantity'],
                    'unit_cost_egp' => $unitCost,
                    'line_cost_total_egp' => $purchaseValue,
                ];
                $auditLines[] = [
                    'container_line_id' => $containerLineId,
                    'product_id' => (int) $line['product_id'],
                    'quantity' => (int) $line['quantity'],
                    'purchase_unit_cost_egp' => $unitCost,
                    'company_price_egp' => $line['company_price_egp'] ?? null,
                ];
            }

            foreach ($newProductIds as $productId) {
                $product = DB::table('products')->where('id', $productId)->lockForUpdate()->first(['id', 'created_from_container_id', 'created_by_user_id']);
                if ($product === null || $product->created_from_container_id !== null || (int) $product->created_by_user_id !== $actorId) {
                    throw ValidationException::withMessages(['new_product_ids' => ['A product added from this form has already been assigned to another container.']]);
                }
                DB::table('products')->where('id', $productId)->update([
                    'created_from_container_id' => $id,
                    'updated_at' => $now,
                ]);
            }

            $movement = $this->inventory->receiveContainerBatch(
                $warehouseId,
                $inventoryLines,
                $now->toDateString(),
                'Container '.$values['container_number'].' receipt',
                $request,
            );
            $movementNumber = DB::table('inventory_movements')->where('id', $movement['movement_id'])->value('movement_number');
            $receiptId = (int) DB::table('container_receipts')->insertGetId([
                'container_id' => $id,
                'inventory_movement_id' => $movement['movement_id'],
                'status' => 'posted',
                'received_at' => $now,
                'received_by_user_id' => $actorId,
                'costing_method_snapshot' => 'weighted_average',
                'allocation_basis_snapshot' => null,
                'created_at' => $now,
            ]);
            foreach ($inventoryLines as $line) {
                $receiptLineId = (int) DB::table('container_receipt_lines')->insertGetId([
                    'container_receipt_id' => $receiptId,
                    'inventory_movement_id' => $movement['movement_id'],
                    'container_id' => $id,
                    'container_line_id' => $line['container_line_id'],
                    'product_id' => $line['product_id'],
                    'expected_quantity' => $line['quantity'],
                    'received_quantity' => $line['quantity'],
                    'discrepancy_quantity' => 0,
                    'discrepancy_reason' => null,
                    'condition_code' => 'good',
                    'received_at' => $now,
                    'received_by_user_id' => $actorId,
                    'created_at' => $now,
                ]);
                DB::table('inventory_movement_lines')
                    ->where('id', $movement['movement_line_ids'][$line['container_line_id']])
                    ->update(['container_receipt_line_id' => $receiptLineId]);
            }
            DB::table('inventory_movements')->where('id', $movement['movement_id'])->update([
                'source_type' => 'container_receipt',
                'source_id' => $receiptId,
                'updated_at' => $now,
            ]);
            DB::table('container_tracking_events')->insert([
                'container_id' => $id,
                'event_type' => 'receipt',
                'occurred_at' => $now,
                'reference_number' => $movementNumber,
                'details' => 'Container products were received into the selected warehouse.',
                'from_location_id' => null,
                'to_location_id' => $warehouseId,
                'quantity' => null,
                'amount_egp' => null,
                'source_id' => $receiptId,
                'created_by_user_id' => $actorId,
                'created_at' => $now,
            ]);

            $this->recordStatus($request, $id, null, 'received', 'Container created and stock received into warehouse.');
            $this->auditLog->record($request, 'container.created', 'container', $id, null, null, [
                ...$values,
                'lines' => $auditLines,
                'receipt_id' => $receiptId,
                'inventory_movement_id' => $movement['movement_id'],
                'warehouse_id' => $warehouseId,
            ]);
            $this->outbox->recordPostedDocument('container_receipt', $receiptId, [
                'container_id' => $id,
                'inventory_movement_id' => (int) $movement['movement_id'],
            ]);

            $payload = ['data' => DB::table('containers')
            ->leftJoin('suppliers', 'suppliers.id', '=', 'containers.supplier_id')
            ->leftJoin('locations as current_location', 'current_location.id', '=', 'containers.current_location_id')
            ->where('containers.id', $id)
            ->select(['containers.*', 'suppliers.name as supplier_name', 'current_location.name as current_location_name'])
            ->first()];
            if ($idempotencyRecordId !== null) {
                DB::table('idempotency_records')->where('id', $idempotencyRecordId)->update([
                    'http_status' => 201,
                    'response_body' => json_encode($payload, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE),
                    'resource_type' => 'container',
                    'resource_id' => $id,
                    'state' => 'completed',
                    'completed_at' => now(),
                ]);
            }

            return ['payload' => $payload, 'status' => 201];
        }, 5);

        return response()->json($result['payload'], $result['status']);
    }

    public function receipts(Request $request, int $containerId): JsonResponse
    {
        abort_unless(DB::table('containers')->where('id', $containerId)->exists(), 404);
        $filters = ListQuery::validate($request, [
            'received_at' => 'received_at',
            'status' => 'status',
            'id' => 'id',
        ], [
            'status' => ['sometimes', 'in:posted,reversed'],
        ]);
        $query = DB::table('container_receipts')
            ->where('container_id', $containerId)
            ->when(isset($filters['status']), fn ($builder) => $builder->where('status', $filters['status']));
        ListQuery::search($query, $filters, ['status']);
        ListQuery::sort($query, $filters, [
            'received_at' => 'received_at',
            'status' => 'status',
            'id' => 'id',
        ], 'received_at', 'id', 'desc');
        $receipts = $query->paginate($filters['per_page'] ?? 50);
        $receiptIds = $receipts->getCollection()->pluck('id')->map(static fn ($id): int => (int) $id)->all();
        $lines = DB::table('container_receipt_lines')
            ->whereIn('container_receipt_id', $receiptIds)
            ->orderBy('container_receipt_lines.id')
            ->get()
            ->groupBy('container_receipt_id');
        $canViewCosts = $this->canViewCosts($request);
        $movementCosts = collect();
        if ($canViewCosts) {
            $receiptLineIds = $lines->flatten(1)->pluck('id')->map(static fn ($id): int => (int) $id)->all();
            $movementCosts = DB::table('inventory_movement_lines')
                ->whereIn('container_receipt_line_id', $receiptLineIds)
                ->get(['container_receipt_line_id', 'unit_cost_egp_snapshot', 'line_cost_egp_snapshot'])
                ->keyBy('container_receipt_line_id');
        }
        $movementIds = $receipts->getCollection()
            ->pluck('inventory_movement_id')
            ->map(static fn ($id): int => (int) $id)
            ->all();
        $warehouseIds = DB::table('inventory_movement_lines')
            ->whereIn('inventory_movement_id', $movementIds)
            ->whereNotNull('to_location_id')
            ->select('inventory_movement_id')
            ->selectRaw('MIN(to_location_id) as warehouse_id')
            ->groupBy('inventory_movement_id')
            ->pluck('warehouse_id', 'inventory_movement_id');
        $receipts->getCollection()->transform(function (object $receipt) use ($lines, $canViewCosts, $movementCosts, $warehouseIds): array {
            $receiptLines = $lines->get($receipt->id, collect());
            if ($canViewCosts) {
                $receiptLines = $receiptLines->map(function (object $line) use ($movementCosts): object {
                    $movementLine = $movementCosts->get($line->id);
                    $line->unit_cost_egp_snapshot = $movementLine?->unit_cost_egp_snapshot;
                    $line->line_cost_egp_snapshot = $movementLine?->line_cost_egp_snapshot;

                    return $line;
                });
            }

            $receipt->warehouse_id = isset($warehouseIds[$receipt->inventory_movement_id])
                ? (int) $warehouseIds[$receipt->inventory_movement_id]
                : null;

            return ['receipt' => $receipt, 'lines' => $receiptLines->values()];
        });

        return response()->json(ListQuery::page($receipts));
    }

    public function receipt(Request $request, int $containerId, int $receiptId): JsonResponse
    {
        $receipt = DB::table('container_receipts')
            ->where('container_id', $containerId)
            ->where('id', $receiptId)
            ->first();
        abort_if($receipt === null, 404);
        $warehouseId = DB::table('inventory_movement_lines')
            ->where('inventory_movement_id', $receipt->inventory_movement_id)
            ->whereNotNull('to_location_id')
            ->value('to_location_id');
        $receipt->warehouse_id = $warehouseId === null ? null : (int) $warehouseId;
        $receipt->warehouse_name = $warehouseId === null ? null : DB::table('locations')->where('id', $warehouseId)->value('name');
        $lines = DB::table('container_receipt_lines')
            ->where('container_receipt_id', $receiptId)
            ->leftJoin('inventory_movement_lines', 'inventory_movement_lines.container_receipt_line_id', '=', 'container_receipt_lines.id')
            ->orderBy('id')
            ->select([
                'container_receipt_lines.*',
                'inventory_movement_lines.unit_cost_egp_snapshot',
                'inventory_movement_lines.line_cost_egp_snapshot',
            ])
            ->get();
        if (! $this->canViewCosts($request)) {
            $lines->each(function (object $line): void {
                unset($line->unit_cost_egp_snapshot, $line->line_cost_egp_snapshot);
            });
        }

        return response()->json(['data' => ['receipt' => $receipt, 'lines' => $lines]]);
    }

    public function previewReceipt(Request $request, int $containerId): JsonResponse
    {
        $values = $request->validate([
            'warehouse_id' => ['required', 'integer', 'min:1', 'exists:locations,id'],
            'received_at' => ['sometimes', 'date'],
            'movement_date' => ['sometimes', 'date'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.container_line_id' => ['required', 'integer', 'min:1', 'distinct'],
            'lines.*.expected_quantity' => ['required', 'integer', 'between:1,2147483647'],
            'lines.*.received_quantity' => ['required', 'integer', 'between:1,2147483647'],
            'manual_allocations' => ['sometimes', 'array'],
            'manual_allocations.*' => ['array'],
            'manual_allocations.*.*' => ['string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,2})?\z/'],
        ]);
        $container = DB::table('containers')->where('id', $containerId)->first();
        abort_if($container === null, 404);
        if (in_array($container->status, ['received', 'cancelled'], true)) {
            throw ValidationException::withMessages(['container_id' => ['This container cannot receive stock in its current status.']]);
        }
        if (! in_array($container->landed_cost_allocation_basis, ['value', 'quantity', 'manual'], true)) {
            throw ValidationException::withMessages(['allocation_basis' => ['Choose an allocation basis before receiving stock.']]);
        }
        if (! DB::table('locations')->where('id', $values['warehouse_id'])->where('is_active', true)->exists()) {
            throw ValidationException::withMessages(['warehouse_id' => ['The selected warehouse does not exist or is inactive.']]);
        }
        $lines = DB::table('container_lines')
            ->where('container_id', $containerId)
            ->orderBy('id')
            ->get()
            ->keyBy('id');
        $batch = [];
        foreach ($values['lines'] as $input) {
            $line = $lines->get($input['container_line_id']);
            if ($line === null) {
                throw ValidationException::withMessages(['lines' => ['Every receipt line must belong to this container.']]);
            }
            $receivedBefore = (int) ($line->received_quantity ?? 0);
            $remaining = (int) $line->expected_quantity - $receivedBefore;
            if ((int) $input['expected_quantity'] > $remaining || (int) $input['received_quantity'] > $remaining) {
                throw ValidationException::withMessages(['lines' => ['Receipt quantities cannot exceed the remaining expected quantity.']]);
            }
            if ($line->purchase_value_egp === null || $line->purchase_unit_cost_egp === null) {
                throw ValidationException::withMessages(['lines' => ['Every line needs a purchase value before receiving stock.']]);
            }
            $batch[] = ['line' => $line, 'input' => $input, 'received_before' => $receivedBefore];
        }
        $costs = DB::table('container_costs')
            ->where('container_id', $containerId)
            ->where('include_in_inventory_cost', true)
            ->where('status', '<>', 'cancelled')
            ->orderBy('id')
            ->get();
        $allocations = $this->calculateAllocations(
            $container->landed_cost_allocation_basis,
            $costs,
            $batch,
            $lines,
            $values['manual_allocations'] ?? [],
        );
        $allocatedByLine = [];
        foreach ($allocations as $lineAllocations) {
            foreach ($lineAllocations as $lineId => $amount) {
                $allocatedByLine[$lineId] = ExactMoney::add($allocatedByLine[$lineId] ?? '0', $amount);
            }
        }
        $previewLines = [];
        $canViewCosts = $this->canViewCosts($request);
        foreach ($batch as $item) {
            $line = $item['line'];
            $quantity = (int) $item['input']['received_quantity'];
            $purchaseValue = $this->linePurchaseValueCents($line);
            $beforeValue = ExactMoney::divideRounded(
                ExactMoney::multiply($purchaseValue, $item['received_before']),
                (int) $line->expected_quantity,
            );
            $afterQuantity = $item['received_before'] + $quantity;
            $afterValue = $afterQuantity === (int) $line->expected_quantity
                ? $purchaseValue
                : ExactMoney::divideRounded(
                    ExactMoney::multiply($purchaseValue, $afterQuantity),
                    (int) $line->expected_quantity,
                );
            $baseCost = ExactMoney::subtract($afterValue, $beforeValue);
            $landedCost = $allocatedByLine[(int) $line->id] ?? '0';
            $lineCost = ExactMoney::add($baseCost, $landedCost);
            $previewLine = [
                'container_line_id' => (int) $line->id,
                'product_id' => (int) $line->product_id,
                'warehouse_id' => (int) $values['warehouse_id'],
                'quantity' => $quantity,
            ];
            if ($canViewCosts) {
                $previewLine['purchase_cost_egp'] = ExactMoney::fromCents($baseCost);
                $previewLine['allocated_landed_cost_egp'] = ExactMoney::fromCents($landedCost);
                $previewLine['line_cost_egp'] = ExactMoney::fromCents($lineCost);
                $previewLine['unit_cost_egp'] = ExactMoney::fromCents(ExactMoney::divideRounded($lineCost, $quantity));
            }
            $previewLines[] = $previewLine;
        }

        return response()->json(['data' => [
            'allocation_basis' => $container->landed_cost_allocation_basis,
            'lines' => $previewLines,
            'total_landed_cost_allocated_egp' => $canViewCosts
                ? ExactMoney::fromCents(array_reduce(
                    $allocatedByLine,
                    static fn (string $sum, string $amount): string => ExactMoney::add($sum, $amount),
                    '0',
                ))
                : null,
        ]]);
    }

    public function addLine(Request $request, int $containerId): JsonResponse
    {
        $values = $request->validate([
            'product_id' => ['required', 'integer', 'min:1', 'exists:products,id'],
            'expected_quantity' => ['required', 'integer', 'between:1,2147483647'],
            'purchase_value_egp' => ['required', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,4})?\z/'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:500'],
        ]);
        $totalCents = $this->toCents($values['purchase_value_egp'], 'purchase_value_egp');
        $unitCents = ExactMoney::divideRounded($totalCents, (int) $values['expected_quantity']);

        $run = function () use ($request, $containerId, $values, $totalCents, $unitCents): array {
            $lineId = DB::transaction(function () use ($request, $containerId, $values, $totalCents, $unitCents): int {
            $container = $this->lockEditableContainer($containerId);
            $lineNumber = (int) DB::table('container_lines')->where('container_id', $containerId)->max('line_number') + 1;
            $lineId = (int) DB::table('container_lines')->insertGetId([
                'container_id' => $containerId,
                'line_number' => $lineNumber,
                'product_id' => $values['product_id'],
                'expected_quantity' => $values['expected_quantity'],
                'received_quantity' => 0,
                'purchase_value_egp' => ExactMoney::fromCents($totalCents),
                'purchase_unit_cost_egp' => ExactMoney::fromCents($unitCents),
                'notes' => $values['notes'] ?? null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $this->auditLog->record($request, 'container.line.created', 'container_line', $lineId, null, null, $values);

                return $lineId;
            });

            $line = DB::table('container_lines')->where('id', $lineId)->first();
            if (! $this->canViewCosts($request)) {
                unset($line->purchase_value_egp, $line->purchase_unit_cost_egp);
            }

            return ['data' => $line];
        };
        return $this->runIdempotent($request, 'container_line', $run, 201);
    }

    public function setAllocationBasis(Request $request, int $containerId): JsonResponse
    {
        $values = $request->validate([
            'allocation_basis' => ['required', 'in:value,quantity,manual'],
        ]);

        $run = function () use ($request, $containerId, $values): array {
            DB::transaction(function () use ($request, $containerId, $values): void {
            $container = DB::table('containers')->where('id', $containerId)->lockForUpdate()->first();
            abort_if($container === null, 404);
            if (DB::table('container_receipts')->where('container_id', $containerId)->where('status', 'posted')->exists()) {
                throw ValidationException::withMessages(['allocation_basis' => ['Allocation basis cannot change after a receipt is posted.']]);
            }
            DB::table('containers')->where('id', $containerId)->update([
                'landed_cost_allocation_basis' => $values['allocation_basis'],
                'updated_at' => now(),
            ]);
            $this->auditLog->record($request, 'container.allocation_basis.changed', 'container', $containerId, null, ['allocation_basis' => $container->landed_cost_allocation_basis], $values);
            });

            return ['data' => ['container_id' => $containerId, ...$values]];
        };
        return $this->runIdempotent($request, 'container_allocation_basis', $run, 200);
    }

    public function changeStatus(Request $request, int $containerId): JsonResponse
    {
        $values = $request->validate([
            'status' => ['required', 'in:in_transit,at_port,cancelled'],
            'reason' => ['required', 'string', 'min:1', 'max:1000'],
        ]);

        $run = function () use ($request, $containerId, $values): array {
            DB::transaction(function () use ($request, $containerId, $values): void {
            $container = DB::table('containers')->where('id', $containerId)->lockForUpdate()->first();
            abort_if($container === null, 404);
            $transitions = [
                'draft' => ['in_transit', 'cancelled'],
                'in_transit' => ['at_port', 'cancelled'],
                'at_port' => ['cancelled'],
            ];
            if (! in_array($values['status'], $transitions[$container->status] ?? [], true)) {
                throw ValidationException::withMessages(['status' => ['The requested container status transition is not allowed.']]);
            }
            if ($values['status'] === 'cancelled' && DB::table('container_receipts')->where('container_id', $containerId)->where('status', 'posted')->exists()) {
                throw ValidationException::withMessages(['status' => ['A container with posted receipts cannot be cancelled. Reverse its receipts first.']]);
            }
            $this->applyStatusChange($request, $containerId, $container->status, $values['status'], $values['reason']);
            });

            return ['data' => ['container_id' => $containerId, 'status' => $values['status']]];
        };
        return $this->runIdempotent($request, 'container_status', $run, 200);
    }

    public function receive(Request $request, int $containerId): JsonResponse
    {
        $values = $request->validate([
            'warehouse_id' => ['required', 'integer', 'min:1', 'exists:locations,id'],
            'received_at' => ['sometimes', 'date'],
            'movement_date' => ['sometimes', 'date'],
            'reason' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.container_line_id' => ['required', 'integer', 'min:1', 'distinct'],
            'lines.*.expected_quantity' => ['required', 'integer', 'between:1,2147483647'],
            'lines.*.received_quantity' => ['required', 'integer', 'between:1,2147483647'],
            'lines.*.discrepancy_reason' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'manual_allocations' => ['sometimes', 'array'],
            'manual_allocations.*' => ['array'],
            'manual_allocations.*.*' => ['string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,2})?\z/'],
        ]);

        $run = function () use ($request, $containerId, $values): array {
            $receiptIds = DB::transaction(function () use ($request, $containerId, $values): array {
            $container = DB::table('containers')->where('id', $containerId)->lockForUpdate()->first();
            abort_if($container === null, 404);
            if (in_array($container->status, ['received', 'cancelled'], true)) {
                throw ValidationException::withMessages(['container_id' => ['This container cannot receive stock in its current status.']]);
            }
            if (! in_array($container->landed_cost_allocation_basis, ['value', 'quantity', 'manual'], true)) {
                throw ValidationException::withMessages(['allocation_basis' => ['Choose an allocation basis before posting a receipt.']]);
            }
            if (! DB::table('locations')->where('id', $values['warehouse_id'])->where('is_active', true)->exists()) {
                throw ValidationException::withMessages(['warehouse_id' => ['The selected warehouse does not exist or is inactive.']]);
            }

            $lineInputs = collect($values['lines'])->sortBy('container_line_id')->values();
            $lineIds = $lineInputs->pluck('container_line_id')->all();
            $lines = DB::table('container_lines')
                ->where('container_id', $containerId)
                ->orderBy('id')
                ->lockForUpdate()
                ->get()
                ->keyBy('id');
            foreach ($lineIds as $lineId) {
                if (! $lines->has($lineId)) {
                    throw ValidationException::withMessages(['lines' => ['Every receipt line must belong to this container.']]);
                }
            }

            if ($lines->isEmpty()) {
                throw ValidationException::withMessages(['lines' => ['Every receipt line must belong to this container.']]);
            }

            $batch = [];
            foreach ($lineInputs as $input) {
                $line = $lines->get($input['container_line_id']);
                $receivedBefore = (int) ($line->received_quantity ?? 0);
                $openQuantity = (int) $line->expected_quantity - $receivedBefore;
                if ((int) $input['expected_quantity'] > $openQuantity || (int) $input['received_quantity'] > $openQuantity) {
                    throw ValidationException::withMessages(['lines' => ['Receipt quantities cannot exceed the remaining expected quantity.']]);
                }
                if ($line->purchase_value_egp === null || $line->purchase_unit_cost_egp === null) {
                    throw ValidationException::withMessages(['lines' => ['Every line needs a purchase value before receiving stock.']]);
                }
                $batch[] = ['line' => $line, 'input' => $input, 'received_before' => $receivedBefore];
            }

            $costs = DB::table('container_costs')
                ->where('container_id', $containerId)
                ->where('include_in_inventory_cost', true)
                ->where('status', '<>', 'cancelled')
                ->orderBy('id')
                ->lockForUpdate()
                ->get();
            $allocationsByCost = $this->calculateAllocations(
                $container->landed_cost_allocation_basis,
                $costs,
                $batch,
                $lines,
                $values['manual_allocations'] ?? [],
            );
            if ($container->landed_cost_allocation_basis !== 'manual' && ($values['manual_allocations'] ?? []) !== []) {
                throw ValidationException::withMessages(['manual_allocations' => ['Manual allocations are accepted only when the container uses the manual basis.']]);
            }
            $includedCostIds = $costs->pluck('id')->map(fn ($id): int => (int) $id)->all();
            $batchLineIds = array_map(
                static fn (array $item): int => (int) $item['line']->id,
                $batch,
            );
            foreach (array_keys($values['manual_allocations'] ?? []) as $manualCostId) {
                if (! in_array((int) $manualCostId, $includedCostIds, true)) {
                    throw ValidationException::withMessages(['manual_allocations' => ['An allocation refers to a cost that is not included in inventory cost.']]);
                }
                $manualLineIds = array_map('intval', array_keys($values['manual_allocations'][$manualCostId]));
                if (array_diff($manualLineIds, $batchLineIds) !== []) {
                    throw ValidationException::withMessages(['manual_allocations' => ['An allocation refers to a line outside the current receipt batch.']]);
                }
            }
            $allocationsByLine = [];
            foreach ($allocationsByCost as $lineAllocations) {
                foreach ($lineAllocations as $lineId => $allocatedCents) {
                    $allocationsByLine[$lineId] = ExactMoney::add($allocationsByLine[$lineId] ?? '0', $allocatedCents);
                }
            }

            $preparedBatch = [];
            $inventoryLines = [];
            $receivedAt = $values['received_at'] ?? now()->toDateTimeString();
            $movementDate = $values['movement_date'] ?? substr($receivedAt, 0, 10);
            foreach ($batch as $item) {
                $line = $item['line'];
                $input = $item['input'];
                $qty = (int) $input['received_quantity'];
                $expectedQty = (int) $line->expected_quantity;
                $totalPurchaseCents = $this->linePurchaseValueCents($line);
                $previousBaseCents = ExactMoney::divideRounded(
                    ExactMoney::multiply($totalPurchaseCents, $item['received_before']),
                    $expectedQty,
                );
                $afterQuantity = $item['received_before'] + $qty;
                $afterBaseCents = $afterQuantity === $expectedQty
                    ? $totalPurchaseCents
                    : ExactMoney::divideRounded(ExactMoney::multiply($totalPurchaseCents, $afterQuantity), $expectedQty);
                $batchBaseCents = ExactMoney::subtract($afterBaseCents, $previousBaseCents);
                $landedCents = $allocationsByLine[$line->id] ?? '0';
                $lineCostCents = ExactMoney::add($batchBaseCents, $landedCents);
                $unitCostCents = ExactMoney::divideRounded($lineCostCents, $qty);
                $unitCost = ExactMoney::fromCents($unitCostCents);
                $lineCost = ExactMoney::fromCents($lineCostCents);
                $preparedBatch[] = [
                    'line' => $line,
                    'input' => $input,
                    'quantity' => $qty,
                    'after_quantity' => $afterQuantity,
                    'base_cost_cents' => $batchBaseCents,
                    'landed_cost_cents' => $landedCents,
                    'line_cost' => $lineCost,
                ];
                $inventoryLines[] = [
                    'container_line_id' => (int) $line->id,
                    'product_id' => (int) $line->product_id,
                    'quantity' => $qty,
                    'unit_cost_egp' => $unitCost,
                    'line_cost_total_egp' => $lineCost,
                ];
            }

            $movement = $this->inventory->receiveContainerBatch(
                (int) $values['warehouse_id'],
                $inventoryLines,
                $movementDate,
                $values['reason'] ?? 'Container receipt',
                $request,
            );
            $receiptId = (int) DB::table('container_receipts')->insertGetId([
                'container_id' => $containerId,
                'inventory_movement_id' => $movement['movement_id'],
                'status' => 'posted',
                'received_at' => $receivedAt,
                'received_by_user_id' => $this->actorId($request),
                'allocation_basis_snapshot' => $container->landed_cost_allocation_basis,
                'created_at' => now(),
            ]);
            $auditReceiptLines = [];
            foreach ($preparedBatch as $item) {
                $line = $item['line'];
                $input = $item['input'];
                $qty = $item['quantity'];
                $receiptLineId = (int) DB::table('container_receipt_lines')->insertGetId([
                    'container_receipt_id' => $receiptId,
                    'inventory_movement_id' => $movement['movement_id'],
                    'container_id' => $containerId,
                    'container_line_id' => $line->id,
                    'product_id' => $line->product_id,
                    'expected_quantity' => $input['expected_quantity'],
                    'received_quantity' => $qty,
                    'discrepancy_quantity' => $qty - (int) $input['expected_quantity'],
                    'discrepancy_reason' => $input['discrepancy_reason'] ?? null,
                    'received_at' => $receivedAt,
                    'received_by_user_id' => $this->actorId($request),
                    'created_at' => now(),
                ]);
                DB::table('inventory_movement_lines')
                    ->where('id', $movement['movement_line_ids'][(int) $line->id])
                    ->update(['container_receipt_line_id' => $receiptLineId]);
                foreach ($costs as $cost) {
                    $allocated = $allocationsByCost[$cost->id][(int) $line->id] ?? '0';
                    if ($allocated !== '0') {
                        DB::table('container_cost_allocations')->insert([
                            'container_cost_id' => $cost->id,
                            'container_id' => $containerId,
                            'container_receipt_line_id' => $receiptLineId,
                            'allocated_amount' => ExactMoney::fromCents($allocated),
                            'allocation_basis' => $container->landed_cost_allocation_basis,
                            'created_at' => now(),
                        ]);
                    }
                }
                DB::table('container_lines')->where('id', $line->id)->update([
                    'received_quantity' => $item['after_quantity'],
                    'updated_at' => now(),
                ]);
                $auditReceiptLines[] = [
                    'container_line_id' => $line->id,
                    'product_id' => $line->product_id,
                    'warehouse_id' => $values['warehouse_id'],
                    'expected_quantity' => $input['expected_quantity'],
                    'received_quantity' => $qty,
                    'purchase_value_egp' => ExactMoney::fromCents($item['base_cost_cents']),
                    'included_landed_cost_egp' => ExactMoney::fromCents($item['landed_cost_cents']),
                    'line_cost_egp' => $item['line_cost'],
                ];
            }
            DB::table('inventory_movements')->where('id', $movement['movement_id'])->update([
                'source_type' => 'container_receipt',
                'source_id' => $receiptId,
                'updated_at' => now(),
            ]);
            $movementNumber = DB::table('inventory_movements')->where('id', $movement['movement_id'])->value('movement_number');
            DB::table('container_tracking_events')->insert([
                'container_id' => $containerId,
                'event_type' => 'receipt',
                'occurred_at' => $receivedAt,
                'reference_number' => $movementNumber,
                'details' => $values['reason'] ?? 'Container receipt',
                'from_location_id' => null,
                'to_location_id' => (int) $values['warehouse_id'],
                'quantity' => array_sum(array_column($inventoryLines, 'quantity')),
                'amount_egp' => null,
                'source_id' => $receiptId,
                'created_by_user_id' => $this->actorId($request),
                'created_at' => now(),
            ]);
            $this->auditLog->record(
                $request,
                'container.receipt.posted',
                'container_receipt',
                $receiptId,
                $values['reason'] ?? null,
                null,
                ['movement_id' => $movement['movement_id'], 'lines' => $auditReceiptLines],
            );

            $complete = DB::table('container_lines')
                ->where('container_id', $containerId)
                ->whereColumn('received_quantity', '<', 'expected_quantity')
                ->doesntExist();
            $newStatus = $complete ? 'received' : 'receiving';
            if ($complete) {
                DB::table('containers')->where('id', $containerId)->update([
                    'received_at' => $receivedAt,
                    'received_location_id' => $values['warehouse_id'],
                    'current_location_id' => $values['warehouse_id'],
                    'tracking_stage' => 'receipt',
                    'received_by_user_id' => $this->actorId($request),
                    'updated_at' => now(),
                ]);
            } else {
                DB::table('containers')->where('id', $containerId)->update([
                    'tracking_stage' => 'receipt',
                    'updated_at' => now(),
                ]);
            }
            $this->applyStatusChange($request, $containerId, $container->status, $newStatus, $values['reason'] ?? 'Stock receipt posted.');

            return [$receiptId];
            }, 5);
            return ['data' => ['receipt_ids' => $receiptIds]];
        };

        return $this->runIdempotent($request, 'container_receipt', $run, 201);
    }

    public function reverseReceipt(Request $request, int $containerId, int $receiptId): JsonResponse
    {
        $values = $request->validate([
            'reason' => ['required', 'string', 'min:1', 'max:1000'],
        ]);

        $run = function () use ($request, $containerId, $receiptId, $values): array {
            DB::transaction(function () use ($request, $containerId, $receiptId, $values): void {
            $receipt = DB::table('container_receipts')
                ->where('id', $receiptId)
                ->where('container_id', $containerId)
                ->lockForUpdate()
                ->first();
            abort_if($receipt === null, 404);
            if ($receipt->status !== 'posted') {
                throw ValidationException::withMessages(['receipt_id' => ['Only a posted receipt can be reversed.']]);
            }
            $lines = DB::table('container_receipt_lines')->where('container_receipt_id', $receiptId)->orderBy('id')->get();
            foreach ($lines as $line) {
                $movementLine = DB::table('inventory_movement_lines')
                    ->where('container_receipt_line_id', $line->id)
                    ->first();
                if ($movementLine === null || $movementLine->to_location_id === null) {
                    throw new RuntimeException('The original receipt movement line is missing.');
                }
                $reversal = $this->inventory->issue(
                    (int) $line->product_id,
                    (int) $movementLine->to_location_id,
                    (int) $line->received_quantity,
                    ['movement_type' => 'reversal', 'reason' => $values['reason']],
                    $request,
                );
                DB::table('inventory_movements')->where('id', $reversal['movement_id'])->update([
                    'reversal_of_movement_id' => $receipt->inventory_movement_id,
                ]);
                DB::table('container_lines')->where('id', $line->container_line_id)->decrement('received_quantity', (int) $line->received_quantity);
            }
            DB::table('container_receipts')->where('id', $receiptId)->update(['status' => 'reversed']);
            DB::table('inventory_movements')->where('id', $receipt->inventory_movement_id)->update(['status' => 'reversed']);
            $container = DB::table('containers')->where('id', $containerId)->lockForUpdate()->first();
            $reversedQuantity = (int) $lines->sum('received_quantity');
            $warehouseId = (int) DB::table('inventory_movement_lines')
                ->where('inventory_movement_id', $receipt->inventory_movement_id)
                ->whereNotNull('to_location_id')
                ->value('to_location_id');
            DB::table('container_tracking_events')->insert([
                'container_id' => $containerId,
                'event_type' => 'reversal',
                'occurred_at' => now(),
                'reference_number' => DB::table('inventory_movements')->where('id', $receipt->inventory_movement_id)->value('movement_number'),
                'details' => $values['reason'],
                'from_location_id' => $warehouseId,
                'to_location_id' => null,
                'quantity' => $reversedQuantity,
                'amount_egp' => null,
                'source_id' => $receiptId,
                'created_by_user_id' => $this->actorId($request),
                'created_at' => now(),
            ]);
            $hasPostedReceipts = DB::table('container_receipts')->where('container_id', $containerId)->where('status', 'posted')->exists();
            $fullyReceived = $hasPostedReceipts && DB::table('container_lines')
                ->where('container_id', $containerId)
                ->whereColumn('received_quantity', '<', 'expected_quantity')
                ->doesntExist();
            $nextStatus = $fullyReceived ? 'received' : 'receiving';
            $latestPostedReceipt = $hasPostedReceipts
                ? DB::table('container_receipts as receipt')
                    ->join('container_tracking_events as event', function ($join): void {
                        $join->on('event.source_id', '=', 'receipt.id')->where('event.event_type', '=', 'receipt');
                    })
                    ->where('receipt.container_id', $containerId)
                    ->where('receipt.status', 'posted')
                    ->orderByDesc('receipt.received_at')
                    ->orderByDesc('receipt.id')
                    ->first(['receipt.received_at', 'receipt.received_by_user_id', 'event.to_location_id'])
                : null;
            $latestLocation = $latestPostedReceipt?->to_location_id;
            DB::table('containers')->where('id', $containerId)->update([
                'current_location_id' => $latestLocation,
                'received_location_id' => $fullyReceived ? $latestLocation : null,
                'received_at' => $fullyReceived ? $latestPostedReceipt->received_at : null,
                'received_by_user_id' => $fullyReceived ? $latestPostedReceipt->received_by_user_id : null,
                'tracking_stage' => $hasPostedReceipts ? 'receipt' : 'shipping',
                'updated_at' => now(),
            ]);
            $this->applyStatusChange($request, $containerId, $container->status, $nextStatus, $values['reason']);
            $this->auditLog->record($request, 'container.receipt.reversed', 'container_receipt', $receiptId, $values['reason'], ['status' => 'posted'], ['status' => 'reversed']);
            }, 5);
            return ['data' => ['receipt_id' => $receiptId, 'status' => 'reversed']];
        };

        return $this->runIdempotent($request, 'container_receipt_reversal', $run, 200);
    }

    public function update(Request $request, int $containerId): JsonResponse
    {
        $values = $request->validate([
            'container_name' => ['sometimes', 'nullable', 'string', 'max:160'],
            'container_number' => ['required', 'string', 'max:100', 'unique:containers,container_number,'.$containerId],
            'supplier_id' => ['sometimes', 'nullable', 'integer', 'min:1', 'exists:suppliers,id'],
            'shipping_driver_id' => ['sometimes', 'nullable', 'integer', 'min:1', 'exists:shipping_drivers,id'],
            'trip_reference' => ['sometimes', 'nullable', 'string', 'max:100'],
            'origin' => ['sometimes', 'nullable', 'string', 'max:160'],
            'destination' => ['sometimes', 'nullable', 'string', 'max:160'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'estimated_departure' => ['sometimes', 'nullable', 'date'],
            'estimated_arrival' => ['sometimes', 'nullable', 'date', 'after_or_equal:estimated_departure'],
        ]);

        $container = DB::transaction(function () use ($request, $containerId, $values): object {
            $before = $this->lockEditableContainer($containerId);
            if (DB::table('container_receipts')->where('container_id', $containerId)->where('status', 'posted')->exists()) {
                throw ValidationException::withMessages(['container_id' => ['Reverse the posted receipt before editing container details.']]);
            }
            $changes = [...$values, 'updated_at' => now()];
            DB::table('containers')->where('id', $containerId)->update($changes);
            $after = DB::table('containers')->where('id', $containerId)->first();
            $this->auditLog->record($request, 'container.updated', 'container', $containerId, null, (array) $before, (array) $after);

            return $after;
        }, 5);

        return response()->json(['data' => $container]);
    }

    public function destroy(Request $request, int $containerId): JsonResponse
    {
        $values = $request->validate(['reason' => ['required', 'string', 'min:1', 'max:1000']]);
        $archived = DB::transaction(function () use ($request, $containerId, $values): object {
            $container = DB::table('containers')->where('id', $containerId)->lockForUpdate()->first();
            abort_if($container === null, 404);
            if (in_array($container->status, ['received', 'cancelled'], true)) {
                throw ValidationException::withMessages(['container_id' => ['Only an unreceived container can be deleted. Reverse all posted receipts first.']]);
            }
            if (DB::table('container_receipts')->where('container_id', $containerId)->where('status', 'posted')->exists()) {
                throw ValidationException::withMessages(['container_id' => ['Reverse all posted receipts before deleting this container.']]);
            }
            if (DB::table('container_cost_payments')->join('container_costs', 'container_costs.id', '=', 'container_cost_payments.container_cost_id')->where('container_costs.container_id', $containerId)->exists()
                || DB::table('container_fund_movements')->where('container_id', $containerId)->exists()
                || DB::table('container_location_transfers')->where('container_id', $containerId)->exists()) {
                throw ValidationException::withMessages(['container_id' => ['Reverse or resolve the linked payment, fund, and transfer records before deleting this container.']]);
            }

            $this->trash->record($request, 'container', $containerId, (string) ($container->container_name ?: $container->container_number), (array) $container);
            $this->auditLog->record($request, 'container.archived', 'container', $containerId, $values['reason'], (array) $container, ['archived' => true]);

            return (object) ['id' => $containerId, 'status' => 'archived'];
        }, 5);

        return response()->json(['data' => $archived]);
    }

    public function configureCostType(Request $request, string $costType): JsonResponse
    {
        $values = $request->validate([
            'include_in_inventory_cost' => ['required', 'boolean'],
        ]);
        $costType = trim($costType);
        if ($costType === '' || mb_strlen($costType) > 80) {
            throw ValidationException::withMessages(['cost_type' => ['Cost type must contain 1 to 80 characters.']]);
        }

        DB::transaction(function () use ($request, $costType, $values): void {
            $before = DB::table('container_cost_type_settings')->where('cost_type', $costType)->first();
            DB::table('container_cost_type_settings')->updateOrInsert(
                ['cost_type' => $costType],
                [
                    'include_in_inventory_cost' => $values['include_in_inventory_cost'],
                    'updated_by_user_id' => $this->actorId($request),
                    'updated_at' => now(),
                ],
            );
            $this->auditLog->record(
                $request,
                'container.cost_type.configured',
                'container_cost_type',
                null,
                null,
                $before === null ? null : (array) $before,
                ['cost_type' => $costType, ...$values],
            );
        });

        return response()->json(['data' => ['cost_type' => $costType, ...$values]]);
    }

    public function addCost(Request $request, int $containerId): JsonResponse
    {
        $values = $request->validate([
            'supplier_id' => ['sometimes', 'nullable', 'integer', 'min:1', 'exists:suppliers,id'],
            'cost_type' => ['required', 'string', 'min:1', 'max:80'],
            'description' => ['sometimes', 'nullable', 'string', 'max:500'],
            'amount_egp' => ['required', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,4})?\z/'],
            'original_amount_reference' => ['sometimes', 'nullable', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,4})?\z/'],
            'exchange_rate_reference' => ['sometimes', 'nullable', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,8})?\z/'],
            'original_currency_code_reference' => ['sometimes', 'nullable', 'string', 'max:16'],
            'cost_date' => ['sometimes', 'nullable', 'date'],
            'manual_allocations' => ['sometimes', 'array'],
            'manual_allocations.*' => ['string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,2})?\z/'],
        ]);
        $amount = ExactMoney::fromCents($this->toCents($values['amount_egp'], 'amount_egp'));
        $costType = trim($values['cost_type']);

        $run = function () use ($request, $containerId, $values, $amount, $costType): array {
            $costId = DB::transaction(function () use ($request, $containerId, $values, $amount, $costType): int {
            $container = $this->lockEditableContainer($containerId, allowReceiving: true);
            $configuredInclusion = DB::table('container_cost_type_settings')
                ->where('cost_type', $costType)
                ->value('include_in_inventory_cost');
            $costId = (int) DB::table('container_costs')->insertGetId([
                'container_id' => $containerId,
                'supplier_id' => $values['supplier_id'] ?? null,
                'cost_type' => $costType,
                'description' => $values['description'] ?? null,
                'amount_egp' => $amount,
                'include_in_inventory_cost' => (bool) $configuredInclusion,
                'original_amount_reference' => $values['original_amount_reference'] ?? null,
                'exchange_rate_reference' => $values['exchange_rate_reference'] ?? null,
                'original_currency_code_reference' => $values['original_currency_code_reference'] ?? null,
                'cost_date' => $values['cost_date'] ?? null,
                'status' => 'incurred',
                'created_by_user_id' => $this->actorId($request),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $this->auditLog->record(
                $request,
                'container.cost.created',
                'container_cost',
                $costId,
                null,
                null,
                ['container_id' => $containerId, ...$values, 'include_in_inventory_cost' => (bool) $configuredInclusion],
            );
            if ((bool) $configuredInclusion && $container->status === 'received') {
                $this->revalueRemainingContainerStock(
                    $request,
                    $containerId,
                    $costId,
                    $amount,
                    $container->landed_cost_allocation_basis,
                    $values['manual_allocations'] ?? [],
                );
            } elseif (($values['manual_allocations'] ?? []) !== []) {
                throw ValidationException::withMessages(['manual_allocations' => ['Manual allocations are accepted only for an included post-receipt cost using the manual basis.']]);
            }
            $this->outbox->recordPostedDocument('container_cost', $costId, [
                'container_id' => $containerId,
                'include_in_inventory_cost' => (bool) $configuredInclusion,
            ]);

                return $costId;
            });

            $cost = DB::table('container_costs')->where('id', $costId)->first();
            if (! $this->canViewCosts($request)) {
                unset(
                    $cost->amount_egp,
                    $cost->include_in_inventory_cost,
                    $cost->original_amount_reference,
                    $cost->exchange_rate_reference,
                    $cost->original_currency_code_reference,
                );
            }

            return ['data' => $cost];
        };
        return $this->runIdempotent($request, 'container_cost', $run, 201);
    }

    public function linkPayment(Request $request, int $costId): JsonResponse
    {
        $values = $request->validate([
            'treasury_entry_id' => ['required', 'integer', 'min:1', 'exists:treasury_entries,id'],
            'amount_egp' => ['required', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,4})?\z/'],
            'paid_at' => ['sometimes', 'date'],
        ]);

        $run = function () use ($request, $costId, $values): array {
            $paymentId = DB::transaction(function () use ($request, $costId, $values): int {
            $cost = DB::table('container_costs')->where('id', $costId)->lockForUpdate()->first();
            abort_if($cost === null, 404);
            $entry = DB::table('treasury_entries')->where('id', $values['treasury_entry_id'])->lockForUpdate()->first();
            if ($entry === null || $entry->direction !== 'out') {
                throw ValidationException::withMessages(['treasury_entry_id' => ['A posted treasury outflow is required.']]);
            }
            $amount = ExactMoney::fromCents($this->toCents($values['amount_egp'], 'amount_egp'));
            if (ExactMoney::toCents((string) $entry->amount) !== ExactMoney::toCents($amount)) {
                throw ValidationException::withMessages(['amount_egp' => ['The payment amount must match the linked treasury entry.']]);
            }
            $paidCents = '0';
            foreach (DB::table('container_cost_payments')->where('container_cost_id', $costId)->get(['amount_egp']) as $existingPayment) {
                $paidCents = ExactMoney::add($paidCents, ExactMoney::toCents((string) $existingPayment->amount_egp));
            }
            $paidAfterThis = ExactMoney::add($paidCents, ExactMoney::toCents($amount));
            if (ExactMoney::compare($paidAfterThis, ExactMoney::toCents((string) $cost->amount_egp)) > 0) {
                throw ValidationException::withMessages(['amount_egp' => ['Payments cannot exceed the recorded container cost.']]);
            }
            $paymentId = (int) DB::table('container_cost_payments')->insertGetId([
                'container_cost_id' => $costId,
                'treasury_entry_id' => $entry->id,
                'amount_egp' => $amount,
                'paid_at' => $values['paid_at'] ?? now()->toDateTimeString(),
                'created_by_user_id' => $this->actorId($request),
                'created_at' => now(),
            ]);
            $newStatus = ExactMoney::compare($paidAfterThis, ExactMoney::toCents((string) $cost->amount_egp)) >= 0 ? 'paid' : 'incurred';
            DB::table('container_costs')->where('id', $costId)->update(['status' => $newStatus, 'updated_at' => now()]);
            $this->auditLog->record($request, 'container.cost.payment_linked', 'container_cost_payment', $paymentId, null, null, [
                'container_cost_id' => $costId,
                'treasury_entry_id' => $entry->id,
                'amount_egp' => $amount,
            ]);
            $this->outbox->recordPostedDocument('container_cost_payment', $paymentId, [
                'container_cost_id' => $costId,
                'treasury_entry_id' => (int) $entry->id,
                'amount_egp' => $amount,
            ]);

                return $paymentId;
            });

            $payment = DB::table('container_cost_payments')->where('id', $paymentId)->first();
            if (! $this->canViewCosts($request)) {
                unset($payment->amount_egp);
            }

            return ['data' => $payment];
        };
        return $this->runIdempotent($request, 'container_cost_payment', $run, 201);
    }

    /**
     * @param  array<int, object>  $costs
     * @param  array<int, array{line: object, input: array, received_before: int}>  $batch
     * @param  array<int, object>  $lines
     * @param  array<int|string, mixed>  $manualAllocations
     * @return array<int, array<int, string>>
     */
    private function calculateAllocations(
        string $basis,
        iterable $costs,
        array $batch,
        iterable $lines,
        array $manualAllocations,
    ): array {
        $batchWeights = [];
        $remainingWeights = [];
        foreach ($lines as $line) {
            $remainingQuantity = (int) $line->expected_quantity - (int) ($line->received_quantity ?? 0);
            $unit = ExactMoney::toCents((string) $line->purchase_unit_cost_egp);
            $weightPerUnit = $basis === 'value' ? $unit : '1';
            $remainingWeights[$line->id] = ExactMoney::multiply($weightPerUnit, $remainingQuantity);
        }
        foreach ($batch as $item) {
            $line = $item['line'];
            $quantity = (int) $item['input']['received_quantity'];
            $weightPerUnit = $basis === 'value'
                ? ExactMoney::toCents((string) $line->purchase_unit_cost_egp)
                : '1';
            $batchWeights[$line->id] = ExactMoney::multiply($weightPerUnit, $quantity);
        }

        $totalBatchWeight = array_reduce($batchWeights, fn (string $sum, string $value): string => ExactMoney::add($sum, $value), '0');
        $totalRemainingWeight = array_reduce($remainingWeights, fn (string $sum, string $value): string => ExactMoney::add($sum, $value), '0');
        $isFinalBatch = true;
        foreach ($lines as $line) {
            $remaining = (int) $line->expected_quantity - (int) ($line->received_quantity ?? 0);
            foreach ($batch as $item) {
                if ((int) $item['line']->id === (int) $line->id) {
                    $remaining -= (int) $item['input']['received_quantity'];
                }
            }
            if ($remaining > 0) {
                $isFinalBatch = false;
                break;
            }
        }

        $result = [];
        foreach ($costs as $cost) {
            $costCents = ExactMoney::toCents((string) $cost->amount_egp);
            $allocatedBefore = '0';
            foreach (DB::table('container_cost_allocations as allocation')
                ->join('container_receipt_lines as receipt_line', 'receipt_line.id', '=', 'allocation.container_receipt_line_id')
                ->join('container_receipts as receipt', 'receipt.id', '=', 'receipt_line.container_receipt_id')
                ->where('allocation.container_cost_id', $cost->id)
                ->where('receipt.status', 'posted')
                ->get(['allocation.allocated_amount']) as $previous) {
                $allocatedBefore = ExactMoney::add($allocatedBefore, ExactMoney::toCents((string) $previous->allocated_amount));
            }
            $remainingCost = ExactMoney::subtract($costCents, $allocatedBefore);
            $result[(int) $cost->id] = array_fill_keys(array_map('intval', array_keys($batchWeights)), '0');
            if ($basis === 'manual') {
                $manual = $manualAllocations[$cost->id] ?? $manualAllocations[(string) $cost->id] ?? [];
                $manualTotal = '0';
                foreach ($batch as $item) {
                    $lineId = (string) $item['line']->id;
                    $amount = $manual[$lineId] ?? $manual[(int) $lineId] ?? '0';
                    if (! is_string($amount) || ! preg_match('/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,2})?\z/', $amount)) {
                        throw ValidationException::withMessages(['manual_allocations' => ['Manual amounts must be nonnegative EGP amounts with at most two decimal places.']]);
                    }
                    $cents = $this->toCents($amount, 'manual_allocations');
                    $manualTotal = ExactMoney::add($manualTotal, $cents);
                    $result[(int) $cost->id][(int) $item['line']->id] = $cents;
                }
                if (ExactMoney::compare($manualTotal, $remainingCost) > 0 || ($isFinalBatch && $manualTotal !== $remainingCost)) {
                    throw ValidationException::withMessages(['manual_allocations' => ['Manual allocations must not exceed the unallocated cost and must consume it all in the final receipt.']]);
                }

                continue;
            }

            if ($remainingCost === '0') {
                continue;
            }
            if ($totalRemainingWeight === '0' || $totalBatchWeight === '0') {
                throw ValidationException::withMessages(['lines' => ['Cannot allocate landed cost without a positive value or quantity basis.']]);
            }
            if (ExactMoney::compare($totalRemainingWeight, (string) PHP_INT_MAX) > 0
                || ExactMoney::compare($totalBatchWeight, (string) PHP_INT_MAX) > 0) {
                throw ValidationException::withMessages(['lines' => ['The allocation basis exceeds the supported exact integer range.']]);
            }
            $batchCost = $isFinalBatch
                ? $remainingCost
                : ExactMoney::divideRounded(ExactMoney::multiply($remainingCost, $totalBatchWeight), (int) $totalRemainingWeight);
            $lineIds = array_keys($batchWeights);
            $shares = ExactMoney::allocateProportionally($batchCost, $batchWeights);
            foreach ($lineIds as $lineId) {
                $result[(int) $cost->id][(int) $lineId] = $shares[$lineId];
            }
        }

        return $result;
    }

    /**
     * A post-receipt landed-cost change adjusts only the product/location inventory
     * value that still exists. Sold invoice cost snapshots are never rewritten.
     * The inventory uses weighted average, so the adjustment applies to the remaining
     * balance for that product/location rather than guessing a container lot.
     *
     * @param array<int|string, string> $manualAllocations Receipt-line id => EGP amount.
     */
    private function revalueRemainingContainerStock(
        Request $request,
        int $containerId,
        int $costId,
        string $costAmount,
        string $basis,
        array $manualAllocations,
    ): void {
        $receiptLines = DB::table('container_receipt_lines as receipt_line')
            ->join('container_receipts as receipt', 'receipt.id', '=', 'receipt_line.container_receipt_id')
            ->join('inventory_movement_lines as movement_line', 'movement_line.container_receipt_line_id', '=', 'receipt_line.id')
            ->where('receipt_line.container_id', $containerId)
            ->where('receipt.status', 'posted')
            ->orderBy('receipt_line.id')
            ->lockForUpdate()
            ->get([
                'receipt_line.id',
                'receipt_line.product_id',
                'receipt_line.received_quantity',
                'movement_line.to_location_id as location_id',
                'movement_line.line_cost_egp_snapshot',
            ]);
        if ($receiptLines->isEmpty()) {
            throw ValidationException::withMessages(['container_id' => ['A received container cost needs at least one active receipt line.']]);
        }

        $amountCents = $this->toCents($costAmount, 'amount_egp');
        $weights = [];
        $capitalizedTotal = '0';
        $unappliedTotal = '0';
        foreach ($receiptLines as $line) {
            $weights[(int) $line->id] = match ($basis) {
                'value' => $this->toCents((string) ($line->line_cost_egp_snapshot ?? '0.00'), 'allocation_basis'),
                'quantity' => (string) (int) $line->received_quantity,
                'manual' => '0',
                default => throw ValidationException::withMessages(['allocation_basis' => ['Choose a valid container allocation basis.']]),
            };
        }

        $shares = [];
        if ($basis === 'manual') {
            $shareTotal = '0';
            foreach ($receiptLines as $line) {
                $lineId = (int) $line->id;
                $value = $manualAllocations[$lineId] ?? $manualAllocations[(string) $lineId] ?? null;
                if (! is_string($value)) {
                    throw ValidationException::withMessages(['manual_allocations' => ['Enter a manual allocation for every active receipt line.']]);
                }
                $shares[$lineId] = $this->toCents($value, 'manual_allocations');
                $shareTotal = ExactMoney::add($shareTotal, $shares[$lineId]);
            }
            if (count($manualAllocations) !== $receiptLines->count() || ExactMoney::compare($shareTotal, $amountCents) !== 0) {
                throw ValidationException::withMessages(['manual_allocations' => ['Manual allocations must match the full recorded container cost.']]);
            }
        } else {
            if ($manualAllocations !== []) {
                throw ValidationException::withMessages(['manual_allocations' => ['Manual allocations are only accepted for containers using the manual basis.']]);
            }
            $totalWeight = array_reduce($weights, static fn (string $sum, string $weight): string => ExactMoney::add($sum, $weight), '0');
            if ($totalWeight === '0' || ExactMoney::compare($totalWeight, (string) PHP_INT_MAX) > 0) {
                throw ValidationException::withMessages(['allocation_basis' => ['The recorded cost cannot be distributed across the active receipt lines.']]);
            }
            $shares = ExactMoney::allocateProportionally($amountCents, $weights);
        }

        foreach ($receiptLines as $line) {
            $lineId = (int) $line->id;
            $share = $shares[$lineId];
            $balance = DB::table('inventory_balances')
                ->where('product_id', $line->product_id)
                ->where('location_id', $line->location_id)
                ->lockForUpdate()
                ->first(['quantity_on_hand', 'inventory_value_egp']);
            $quantity = (int) ($balance->quantity_on_hand ?? 0);
            $capitalized = $quantity > 0 ? $share : '0';
            $unapplied = ExactMoney::subtract($share, $capitalized);
            $capitalizedTotal = ExactMoney::add($capitalizedTotal, $capitalized);
            $unappliedTotal = ExactMoney::add($unappliedTotal, $unapplied);

            DB::table('container_cost_allocations')->insert([
                'container_cost_id' => $costId,
                'container_id' => $containerId,
                'container_receipt_line_id' => $lineId,
                'allocated_amount' => ExactMoney::fromCents($share),
                'allocation_basis' => $basis,
                'created_at' => now(),
            ]);

            if ($quantity > 0 && $balance !== null) {
                $newValue = ExactMoney::add($this->toCents((string) $balance->inventory_value_egp, 'inventory_value'), $share);
                $newAverage = ExactMoney::divideRounded($newValue, $quantity);
                DB::table('inventory_balances')
                    ->where('product_id', $line->product_id)
                    ->where('location_id', $line->location_id)
                    ->update([
                        'inventory_value_egp' => ExactMoney::fromCents($newValue),
                        'average_unit_cost_egp' => ExactMoney::fromCents($newAverage),
                        'updated_at' => now(),
                    ]);
                DB::table('products')->where('id', $line->product_id)->update([
                    'purchase_cost_egp' => ExactMoney::fromCents($newAverage),
                    'updated_at' => now(),
                ]);
            }

            DB::table('container_cost_revaluations')->insert([
                'container_cost_id' => $costId,
                'container_receipt_line_id' => $lineId,
                'product_id' => $line->product_id,
                'location_id' => $line->location_id,
                'quantity_on_hand_at_posting' => $quantity,
                'allocated_amount_egp' => ExactMoney::fromCents($share),
                'capitalized_amount_egp' => ExactMoney::fromCents($capitalized),
                'unapplied_amount_egp' => ExactMoney::fromCents($unapplied),
                'created_by_user_id' => $this->actorId($request),
                'created_at' => now(),
            ]);
        }

        $this->auditLog->record($request, 'container.cost.revalued_remaining_stock', 'container_cost', $costId, null, null, [
            'container_id' => $containerId,
            'amount_egp' => ExactMoney::fromCents($amountCents),
            'basis' => $basis,
            'receipt_line_count' => $receiptLines->count(),
            'capitalized_amount_egp' => ExactMoney::fromCents($capitalizedTotal),
            'unapplied_amount_egp' => ExactMoney::fromCents($unappliedTotal),
        ]);
    }

    /** @param array{sign:string, amount:string} $left @param array{sign:string, amount:string} $right @return array{sign:string, amount:string} */
    private function addSignedCents(array $left, array $right): array
    {
        if ($left['amount'] === '0') return $right;
        if ($right['amount'] === '0') return $left;
        if ($left['sign'] === $right['sign']) {
            return ['sign' => $left['sign'], 'amount' => ExactMoney::add($left['amount'], $right['amount'])];
        }
        $comparison = ExactMoney::compare($left['amount'], $right['amount']);
        if ($comparison === 0) return ['sign' => '+', 'amount' => '0'];
        if ($comparison > 0) {
            return ['sign' => $left['sign'], 'amount' => ExactMoney::subtract($left['amount'], $right['amount'])];
        }

        return ['sign' => $right['sign'], 'amount' => ExactMoney::subtract($right['amount'], $left['amount'])];
    }

    /** @return array{sign:string, amount:string} */
    private function signedDifferenceCents(string $left, string $right): array
    {
        return ExactMoney::compare($left, $right) >= 0
            ? ['sign' => '+', 'amount' => ExactMoney::subtract($left, $right)]
            : ['sign' => '-', 'amount' => ExactMoney::subtract($right, $left)];
    }

    private function linePurchaseValueCents(object $line): string
    {
        if ($line->purchase_value_egp !== null) {
            $total = ExactMoney::toCents((string) $line->purchase_value_egp);
        } else {
            $total = ExactMoney::multiply(ExactMoney::toCents((string) $line->purchase_unit_cost_egp), (int) $line->expected_quantity);
        }

        try {
            ExactMoney::fromCents($total);
        } catch (InvalidArgumentException $exception) {
            throw ValidationException::withMessages(['purchase_value_egp' => [$exception->getMessage()]]);
        }

        return $total;
    }

    private function lockEditableContainer(int $containerId, bool $allowReceiving = false): object
    {
        $container = DB::table('containers')->where('id', $containerId)->lockForUpdate()->first();
        abort_if($container === null, 404);
        $allowed = $allowReceiving
            ? ['draft', 'in_transit', 'at_port', 'receiving', 'received']
            : ['draft', 'in_transit', 'at_port', 'receiving'];
        if (! in_array($container->status, $allowed, true)) {
            throw ValidationException::withMessages(['container_id' => ['The container cannot be changed in its current status.']]);
        }

        return $container;
    }

    private function recordStatus(Request $request, int $containerId, ?string $oldStatus, string $newStatus, ?string $reason): void
    {
        DB::table('container_status_history')->insert([
            'container_id' => $containerId,
            'old_status' => $oldStatus,
            'new_status' => $newStatus,
            'changed_by_user_id' => $this->actorId($request),
            'reason' => $reason,
            'changed_at' => now(),
            'created_at' => now(),
        ]);
    }

    private function applyStatusChange(Request $request, int $containerId, string $oldStatus, string $newStatus, ?string $reason): void
    {
        if ($oldStatus === $newStatus) {
            return;
        }
        DB::table('containers')->where('id', $containerId)->update(['status' => $newStatus, 'updated_at' => now()]);
        $this->recordStatus($request, $containerId, $oldStatus, $newStatus, $reason);
        $this->auditLog->record($request, 'container.status.changed', 'container', $containerId, $reason, ['status' => $oldStatus], ['status' => $newStatus]);
    }

    /** @param callable(): array<string, mixed> $operation */
    private function runIdempotent(Request $request, string $resourceType, callable $operation, int $status): JsonResponse
    {
        $key = trim((string) $request->header('Idempotency-Key', ''));
        if ($key === '') {
            return response()->json($operation(), $status);
        }
        if (mb_strlen($key) > 200) {
            throw ValidationException::withMessages(['Idempotency-Key' => ['The idempotency key cannot exceed 200 characters.']]);
        }
        if (! DB::getSchemaBuilder()->hasTable('idempotency_records')) {
            return response()->json($operation(), $status);
        }
        $actorId = $this->actorId($request);
        $requestHash = hash('sha256', json_encode(
            ['method' => $request->method(), 'path' => $request->path(), 'input' => $request->all()],
            JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_PRESERVE_ZERO_FRACTION,
        ), true);
        $result = DB::transaction(function () use ($request, $operation, $resourceType, $status, $key, $requestHash, $actorId): array {
            DB::table('users')->where('id', $actorId)->lockForUpdate()->first(['id']);
            $existing = DB::table('idempotency_records')->where('user_id', $actorId)->where('idempotency_key', $key)->lockForUpdate()->first();
            if ($existing !== null) {
                if (! hash_equals((string) $existing->request_hash, $requestHash)) {
                    abort(409, 'The idempotency key was already used with a different request.');
                }
                if ($existing->state !== 'completed' || $existing->response_body === null) {
                    abort(409, 'The previous idempotent request is not complete.');
                }
                return ['payload' => json_decode((string) $existing->response_body, true, 512, JSON_THROW_ON_ERROR), 'status' => (int) ($existing->http_status ?: $status)];
            }
            $recordId = (int) DB::table('idempotency_records')->insertGetId([
                'user_id' => $actorId, 'idempotency_key' => $key, 'request_hash' => $requestHash,
                'state' => 'processing', 'created_at' => now(),
            ]);
            $payload = $operation();
            $data = $payload['data'] ?? null;
            $resourceId = is_array($data)
                ? ($data['id'] ?? $data['receipt_id'] ?? ($data['receipt_ids'][0] ?? null))
                : (is_object($data) ? ($data->id ?? null) : null);
            DB::table('idempotency_records')->where('id', $recordId)->update([
                'http_status' => $status, 'response_body' => json_encode($payload, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE),
                'resource_type' => $resourceType, 'resource_id' => $resourceId,
                'state' => 'completed', 'completed_at' => now(),
            ]);
            return ['payload' => $payload, 'status' => $status];
        }, 5);
        return response()->json($result['payload'], $result['status']);
    }

    private function actorId(Request $request): int
    {
        $actor = $request->attributes->get('authenticated_user');
        if (! is_object($actor) || ! isset($actor->id)) {
            throw new RuntimeException('An authenticated user is required for container changes.');
        }

        return (int) $actor->id;
    }

    private function toCents(string $amount, string $field): string
    {
        try {
            return ExactMoney::toCents($amount);
        } catch (InvalidArgumentException $exception) {
            throw ValidationException::withMessages([$field => [$exception->getMessage()]]);
        }
    }

    private function canViewCosts(Request $request): bool
    {
        $actor = $request->attributes->get('authenticated_user');
        if (! is_object($actor) || DB::table('user_roles as user_role')
            ->join('roles as role', 'role.id', '=', 'user_role.role_id')
            ->where('user_role.user_id', $actor->id)
            ->where('role.code', 'driver')
            ->where('role.is_active', true)
            ->exists()) {
            return false;
        }

        return DB::table('role_permissions as rp')
            ->join('permissions as p', 'p.id', '=', 'rp.permission_id')
            ->join('user_roles as ur', 'ur.role_id', '=', 'rp.role_id')
            ->join('roles as r', 'r.id', '=', 'ur.role_id')
            ->where('ur.user_id', $actor->id)
            ->where('r.is_active', true)
            ->where('p.code', 'costs.view')
            ->exists();
    }

    private function multiplyDecimalByInteger(string $amount, int $quantity): string
    {
        $parts = explode('.', $amount, 2);
        $fraction = str_pad($parts[1] ?? '', 4, '0');
        $scaled = ltrim($parts[0].substr($fraction, 0, 4), '0') ?: '0';
        $value = ExactMoney::multiply($scaled, $quantity);
        if (strlen($value) > 19) {
            throw ValidationException::withMessages(['lines' => ['إجمالي قيمة الصنف يتجاوز الحد المالي المسموح.']]);
        }
        $value = str_pad($value, 5, '0', STR_PAD_LEFT);

        return substr($value, 0, -4).'.'.substr($value, -4);
    }
}
