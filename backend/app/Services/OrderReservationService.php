<?php

namespace App\Services;

use App\Support\OrderReservationAllocator;
use App\Support\InsufficientOrderStock;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class OrderReservationService
{
    public function __construct(
        private readonly AuditLogService $auditLog,
        private readonly OrderReservationAllocator $allocator,
    ) {}

    /**
     * @param  iterable<object>  $lines
     * @return array<string, mixed>
     */
    public function reserve(Request $request, int $orderId, iterable $lines): array
    {
        $orderLines = collect($lines)->map(static fn (object $line): array => [
            'id' => (int) $line->id,
            'product_id' => (int) $line->product_id,
            'quantity' => (int) $line->quantity,
        ])->values()->all();
        $lineIds = array_column($orderLines, 'id');
        if ($lineIds === []) {
            return ['reservation_count' => 0, 'quantity_reserved' => 0];
        }
        if (DB::table('sales_order_reservations')
            ->whereIn('sales_order_line_id', $lineIds)
            ->where('status', 'reserved')
            ->exists()) {
            abort(409, 'An order line already has an active reservation.');
        }

        $productIds = array_values(array_unique(array_column($orderLines, 'product_id')));
        sort($productIds);
        $warehouseId = DB::table('sales_orders')->where('id', $orderId)->value('warehouse_id');
        $balances = DB::table('inventory_balances')
            ->whereIn('product_id', $productIds)
            ->when($warehouseId !== null, fn ($query) => $query->where('location_id', $warehouseId))
            ->orderBy('product_id')
            ->orderBy('location_id')
            ->lockForUpdate()
            ->get(['product_id', 'location_id', 'quantity_on_hand', 'quantity_reserved']);
        $balanceRows = $balances->map(static fn (object $balance): array => [
            'product_id' => (int) $balance->product_id,
            'location_id' => (int) $balance->location_id,
            'quantity_on_hand' => (int) $balance->quantity_on_hand,
            'quantity_reserved' => (int) $balance->quantity_reserved,
        ])->all();
        try {
            $allocationsByLine = $this->allocator->allocate($orderLines, $balanceRows);
        } catch (InsufficientOrderStock $exception) {
            throw ValidationException::withMessages(['lines' => [$exception->getMessage()]]);
        }

        $actor = $request->attributes->get('authenticated_user');
        $now = now();
        $quantityReserved = 0;
        $reservedByBalance = [];
        $auditLines = [];
        foreach ($orderLines as $line) {
            $cycleNumber = (int) DB::table('sales_order_reservations')
                ->where('sales_order_line_id', $line['id'])
                ->max('cycle_number') + 1;
            $reservationId = (int) DB::table('sales_order_reservations')->insertGetId([
                'sales_order_line_id' => $line['id'],
                'cycle_number' => $cycleNumber,
                'product_id' => $line['product_id'],
                'quantity' => $line['quantity'],
                'status' => 'reserved',
                'created_by_user_id' => is_object($actor) ? $actor->id : null,
                'reserved_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $quantityReserved += $line['quantity'];
            foreach ($allocationsByLine[$line['id']] as $allocation) {
                DB::table('sales_order_reservation_allocations')->insert([
                    'reservation_id' => $reservationId,
                    'location_id' => $allocation['location_id'],
                    'quantity' => $allocation['quantity'],
                    'created_at' => $now,
                ]);
                $key = $line['product_id'].':'.$allocation['location_id'];
                $reservedByBalance[$key] ??= [
                    'product_id' => $line['product_id'],
                    'location_id' => $allocation['location_id'],
                    'quantity' => 0,
                ];
                $reservedByBalance[$key]['quantity'] += $allocation['quantity'];
                $auditLines[] = [
                    'order_line_id' => $line['id'],
                    'reservation_id' => $reservationId,
                    'product_id' => $line['product_id'],
                    'location_id' => $allocation['location_id'],
                    'quantity' => $allocation['quantity'],
                ];
            }
        }

        $before = [];
        $after = [];
        foreach ($reservedByBalance as $reservation) {
            $balance = $balances->first(fn (object $row): bool =>
                (int) $row->product_id === $reservation['product_id']
                && (int) $row->location_id === $reservation['location_id']);
            if ($balance === null) {
                throw new RuntimeException('A locked inventory balance disappeared during reservation.');
            }
            $before[] = [
                'product_id' => $reservation['product_id'],
                'location_id' => $reservation['location_id'],
                'quantity_reserved' => (int) $balance->quantity_reserved,
            ];
            DB::table('inventory_balances')
                ->where('product_id', $reservation['product_id'])
                ->where('location_id', $reservation['location_id'])
                ->increment('quantity_reserved', $reservation['quantity'], ['updated_at' => $now]);
            $after[] = [
                'product_id' => $reservation['product_id'],
                'location_id' => $reservation['location_id'],
                'quantity_reserved' => (int) $balance->quantity_reserved + $reservation['quantity'],
            ];
        }

        $this->auditLog->record($request, 'sales_order.reservation.created', 'sales_order', $orderId, null, [
            'reservations' => [],
            'inventory_balances' => $before,
        ], [
            'status' => 'reserved',
            'reservations' => $auditLines,
            'inventory_balances' => $after,
        ]);

        return [
            'reservation_count' => count($orderLines),
            'quantity_reserved' => $quantityReserved,
            'allocations' => $auditLines,
        ];
    }

    /**
     * Release reserved quantities once. Invoice conversion uses `consumed` after
     * releasing the hold in the same outer transaction that posts the invoice.
     *
     * @return array<string, mixed>
     */
    public function release(Request $request, int $orderId, string $targetStatus = 'released'): array
    {
        if (! in_array($targetStatus, ['released', 'consumed'], true)) {
            throw new RuntimeException('A reservation can only be released or consumed.');
        }
        $reservations = DB::table('sales_order_reservations as reservation')
            ->join('sales_order_lines as order_line', 'order_line.id', '=', 'reservation.sales_order_line_id')
            ->where('order_line.sales_order_id', $orderId)
            ->where('reservation.status', 'reserved')
            ->orderBy('order_line.product_id')
            ->orderBy('order_line.id')
            ->lockForUpdate()
            ->get([
                'reservation.id',
                'reservation.sales_order_line_id',
                'reservation.product_id',
                'reservation.quantity',
            ]);
        if ($reservations->isEmpty()) {
            return ['reservation_count' => 0, 'quantity_released' => 0, 'status' => $targetStatus];
        }

        $reservationIds = $reservations->pluck('id')->map(static fn ($id): int => (int) $id)->all();
        $allocations = DB::table('sales_order_reservation_allocations as allocation')
            ->join('sales_order_reservations as reservation', 'reservation.id', '=', 'allocation.reservation_id')
            ->whereIn('allocation.reservation_id', $reservationIds)
            ->orderBy('reservation.product_id')
            ->orderBy('allocation.location_id')
            ->lockForUpdate()
            ->get([
                'allocation.reservation_id',
                'allocation.location_id',
                'allocation.quantity',
                'reservation.product_id',
            ]);
        $productIds = $allocations->pluck('product_id')->map(static fn ($id): int => (int) $id)->unique()->sort()->values()->all();
        $locationIds = $allocations->pluck('location_id')->map(static fn ($id): int => (int) $id)->unique()->sort()->values()->all();
        $balances = DB::table('inventory_balances')
            ->whereIn('product_id', $productIds)
            ->whereIn('location_id', $locationIds)
            ->orderBy('product_id')
            ->orderBy('location_id')
            ->lockForUpdate()
            ->get(['product_id', 'location_id', 'quantity_reserved']);
        $balanceByKey = $balances->keyBy(static fn (object $balance): string => $balance->product_id.':'.$balance->location_id);

        $releaseByBalance = [];
        $auditLines = [];
        $quantityReleased = 0;
        foreach ($allocations as $allocation) {
            $productId = (int) $allocation->product_id;
            $locationId = (int) $allocation->location_id;
            $quantity = (int) $allocation->quantity;
            $key = $productId.':'.$locationId;
            $releaseByBalance[$key] ??= [
                'product_id' => $productId,
                'location_id' => $locationId,
                'quantity' => 0,
            ];
            $releaseByBalance[$key]['quantity'] += $quantity;
            $quantityReleased += $quantity;
            $auditLines[] = [
                'reservation_id' => (int) $allocation->reservation_id,
                'product_id' => $productId,
                'location_id' => $locationId,
                'quantity' => $quantity,
            ];
        }

        $before = [];
        $after = [];
        foreach ($releaseByBalance as $key => $release) {
            $balance = $balanceByKey->get($key);
            if ($balance === null || (int) $balance->quantity_reserved < $release['quantity']) {
                throw new RuntimeException('The inventory reservation projection is inconsistent.');
            }
            $before[] = [
                'product_id' => $release['product_id'],
                'location_id' => $release['location_id'],
                'quantity_reserved' => (int) $balance->quantity_reserved,
            ];
            DB::table('inventory_balances')
                ->where('product_id', $release['product_id'])
                ->where('location_id', $release['location_id'])
                ->decrement('quantity_reserved', $release['quantity'], ['updated_at' => now()]);
            $after[] = [
                'product_id' => $release['product_id'],
                'location_id' => $release['location_id'],
                'quantity_reserved' => (int) $balance->quantity_reserved - $release['quantity'],
            ];
        }

        $now = now();
        DB::table('sales_order_reservations')->whereIn('id', $reservationIds)->update([
            'status' => $targetStatus,
            'released_at' => $now,
            'consumed_at' => $targetStatus === 'consumed' ? $now : null,
            'updated_at' => $now,
        ]);
        $this->auditLog->record($request, 'sales_order.reservation.'.$targetStatus, 'sales_order', $orderId, null, [
            'status' => 'reserved',
            'reservations' => $auditLines,
            'inventory_balances' => $before,
        ], [
            'status' => $targetStatus,
            'reservations' => $auditLines,
            'inventory_balances' => $after,
        ]);

        return [
            'reservation_count' => $reservations->count(),
            'quantity_released' => $quantityReleased,
            'status' => $targetStatus,
            'allocations' => $auditLines,
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function forOrder(int $orderId): array
    {
        $rows = DB::table('sales_order_reservations as reservation')
            ->join('sales_order_lines as order_line', 'order_line.id', '=', 'reservation.sales_order_line_id')
            ->join('products as product', 'product.id', '=', 'reservation.product_id')
            ->leftJoin('sales_order_reservation_allocations as allocation', 'allocation.reservation_id', '=', 'reservation.id')
            ->leftJoin('locations as location', 'location.id', '=', 'allocation.location_id')
            ->where('order_line.sales_order_id', $orderId)
            ->orderBy('order_line.line_number')
            ->orderBy('reservation.id')
            ->orderBy('allocation.location_id')
            ->get([
                'reservation.id as reservation_id',
                'reservation.sales_order_line_id as order_line_id',
                'reservation.cycle_number',
                'reservation.product_id',
                'product.name as product_name',
                'product.sku',
                'reservation.quantity',
                'reservation.status',
                'reservation.reserved_at',
                'reservation.released_at',
                'reservation.consumed_at',
                'allocation.location_id',
                'location.name as location_name',
                'allocation.quantity as allocated_quantity',
            ]);

        return $rows->groupBy('reservation_id')->map(static function ($allocations): array {
            $first = $allocations->first();

            return [
                'id' => (int) $first->reservation_id,
                'order_line_id' => (int) $first->order_line_id,
                'cycle_number' => (int) $first->cycle_number,
                'product_id' => (int) $first->product_id,
                'product_name' => $first->product_name,
                'sku' => $first->sku,
                'quantity' => (int) $first->quantity,
                'status' => $first->status,
                'reserved_at' => $first->reserved_at,
                'released_at' => $first->released_at,
                'consumed_at' => $first->consumed_at,
                'allocations' => $allocations->filter(static fn (object $row): bool => $row->location_id !== null)
                    ->map(static fn (object $row): array => [
                        'location_id' => (int) $row->location_id,
                        'location_name' => $row->location_name,
                        'quantity' => (int) $row->allocated_quantity,
                    ])->values()->all(),
            ];
        })->values()->all();
    }
}
