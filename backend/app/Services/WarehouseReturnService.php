<?php

namespace App\Services;

use App\Models\WarehouseReturn;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class WarehouseReturnService
{
    public function __construct(
        private readonly InventoryService $inventory,
        private readonly AuditLogService $audit,
        private readonly FinancialOutboxService $outbox,
    ) {}

    public function create(array $values, Request $request): WarehouseReturn
    {
        return DB::transaction(function () use ($values, $request): WarehouseReturn {
            $existing = WarehouseReturn::query()->where('idempotency_key', $values['idempotency_key'])->first();
            if ($existing) return $existing;
            $return = WarehouseReturn::query()->create([
                'warehouse_id' => $values['warehouse_id'], 'return_date' => $values['return_date'],
                'reason' => $values['reason'], 'status' => 'draft',
                'idempotency_key' => $values['idempotency_key'],
                'created_by_user_id' => $request->attributes->get('authenticated_user')->id,
            ]);
            foreach (array_values($values['lines']) as $index => $line) {
                DB::table('warehouse_return_lines')->insert([
                    'warehouse_return_id' => $return->id, 'product_id' => $line['product_id'],
                    'quantity' => $line['quantity'], 'unit_cost_egp' => $line['unit_cost_egp'],
                    'line_total_egp' => bcmul((string) $line['quantity'], (string) $line['unit_cost_egp'], 4),
                    'source_movement_line_id' => $line['source_movement_line_id'] ?? null,
                    'return_condition' => $line['return_condition'] ?? null,
                    'line_number' => $index + 1, 'created_at' => now(), 'updated_at' => now(),
                ]);
            }
            $this->audit->record($request, 'warehouse_return.created', 'warehouse_return', $return->id, $return->reason, null, $return->toArray());
            return $return;
        }, 5);
    }

    public function createFromMovement(array $values, Request $request): WarehouseReturn
    {
        return DB::transaction(function () use ($values, $request): WarehouseReturn {
            $existing = WarehouseReturn::query()->where('idempotency_key', $values['idempotency_key'])->first();
            if ($existing !== null) return $existing;
            $source = $this->returnableSource(
                (int) $values['source_movement_line_id'],
                (int) $values['quantity'],
                (int) $values['warehouse_id'],
                $values['return_condition'],
            );
            return $this->create([
                'warehouse_id' => (int) $values['warehouse_id'],
                'return_date' => $values['return_date'],
                'reason' => $values['reason'] ?? 'Return from '.$source->movement_number,
                'idempotency_key' => $values['idempotency_key'],
                'lines' => [[
                    'product_id' => (int) $source->product_id,
                    'quantity' => (int) $values['quantity'],
                    'unit_cost_egp' => (string) $source->unit_cost_egp_snapshot,
                    'source_movement_line_id' => (int) $source->id,
                    'return_condition' => $values['return_condition'],
                ]],
            ], $request);
        }, 5);
    }

    public function approve(WarehouseReturn $return, Request $request): WarehouseReturn
    {
        return DB::transaction(function () use ($return, $request): WarehouseReturn {
            $locked = WarehouseReturn::query()->whereKey($return->id)->lockForUpdate()->firstOrFail();
            if ($locked->status === 'approved') return $locked;
            if ($locked->status !== 'draft') {
                throw ValidationException::withMessages(['status' => ['Only a draft warehouse return can be approved.']]);
            }
            $before = $locked->toArray();
            $lines = DB::table('warehouse_return_lines')->where('warehouse_return_id', $locked->id)->orderBy('line_number')->get();
            foreach ($lines as $line) {
                $source = $line->source_movement_line_id === null ? null : $this->returnableSource(
                    (int) $line->source_movement_line_id,
                    (int) $line->quantity,
                    (int) $locked->warehouse_id,
                    (string) $line->return_condition,
                );
                if ($source !== null && $source->movement_type === 'transfer') {
                    $movement = $this->inventory->transfer(
                        (int) $line->product_id,
                        (int) $source->to_location_id,
                        (int) $locked->warehouse_id,
                        (int) $line->quantity,
                        $locked->return_date,
                        $locked->reason,
                        $request,
                    );
                    DB::table('inventory_movements')->where('id', $movement['movement_id'])->update([
                        'movement_type' => 'return', 'source_type' => 'warehouse_return',
                        'source_id' => $locked->id, 'updated_at' => now(),
                    ]);
                    $postedLine = DB::table('inventory_movement_lines')->where('inventory_movement_id', $movement['movement_id'])->first();
                    DB::table('warehouse_return_lines')->where('id', $line->id)->update([
                        'inventory_movement_id' => $movement['movement_id'],
                        'unit_cost_egp' => $postedLine->unit_cost_egp_snapshot,
                        'line_total_egp' => $postedLine->line_cost_egp_snapshot,
                        'updated_at' => now(),
                    ]);
                } else {
                    $movement = $this->inventory->receive(
                        (int) $line->product_id, (int) $locked->warehouse_id, (int) $line->quantity,
                        $source === null ? (string) $line->unit_cost_egp : (string) $source->unit_cost_egp_snapshot,
                        ['movement_type' => 'return', 'movement_date' => $locked->return_date,
                            'reason' => $locked->reason, 'source_type' => 'warehouse_return', 'source_id' => $locked->id],
                        $request,
                    );
                    DB::table('warehouse_return_lines')->where('id', $line->id)->update([
                        'inventory_movement_id' => $movement['movement_id'], 'updated_at' => now(),
                    ]);
                }
            }
            $locked->forceFill(['status' => 'approved', 'approved_by_user_id' => $request->attributes->get('authenticated_user')->id, 'approved_at' => now()])->save();
            $this->audit->record($request, 'warehouse_return.approved', 'warehouse_return', $locked->id, $locked->reason, $before, $locked->toArray());
            $this->outbox->recordPostedDocument('warehouse_return', (int) $locked->id, ['return_date' => $locked->return_date]);
            return $locked;
        }, 5);
    }

    private function returnableSource(int $sourceLineId, int $quantity, int $warehouseId, string $condition): object
    {
        $source = DB::table('inventory_movement_lines as line')
            ->join('inventory_movements as movement', 'movement.id', '=', 'line.inventory_movement_id')
            ->leftJoin('sales_documents as sale', function ($join): void {
                $join->on('sale.id', '=', 'movement.source_id')->where('movement.source_type', '=', 'sales_document');
            })
            ->where('line.id', $sourceLineId)
            ->lockForUpdate()
            ->first([
                'line.id', 'line.product_id', 'line.quantity', 'line.from_location_id', 'line.to_location_id',
                'line.sales_document_line_id', 'line.unit_cost_egp_snapshot',
                'movement.movement_type', 'movement.movement_number', 'movement.status',
                'sale.status as sales_document_status',
            ]);
        if ($source === null || $source->status !== 'posted'
            || ! in_array($source->movement_type, ['sale', 'transfer'], true)
            || $source->from_location_id === null
            || ($source->movement_type === 'transfer' && $source->to_location_id === null)
            || ($source->movement_type === 'sale' && $source->sales_document_status !== 'posted')
            || $source->unit_cost_egp_snapshot === null) {
            throw ValidationException::withMessages(['source_movement_line_id' => ['The source stock movement is not returnable.']]);
        }
        $warehouse = DB::table('locations')->where('id', $warehouseId)->where('is_active', true)->sharedLock()->first(['id', 'location_type']);
        if ($warehouse === null || ($condition === 'damaged' && $warehouse->location_type !== 'damaged')
            || ($condition === 'good' && $warehouse->location_type === 'damaged')
            || ! in_array($condition, ['good', 'damaged'], true)) {
            throw ValidationException::withMessages(['warehouse_id' => ['Choose an active receiving warehouse that matches the return condition.']]);
        }
        if ($source->movement_type === 'transfer' && (int) $source->to_location_id === $warehouseId) {
            throw ValidationException::withMessages(['warehouse_id' => ['A transfer return must move stock to another warehouse.']]);
        }
        if ($source->sales_document_line_id !== null) {
            DB::table('sales_document_lines')->where('id', $source->sales_document_line_id)->lockForUpdate()->first(['id']);
        }
        $returnedByWarehouse = (int) DB::table('warehouse_return_lines as return_line')
            ->join('warehouse_returns as return_doc', 'return_doc.id', '=', 'return_line.warehouse_return_id')
            ->where('return_line.source_movement_line_id', $sourceLineId)
            ->where('return_doc.status', 'approved')
            ->sum('return_line.quantity');
        $returnedByCredit = $source->sales_document_line_id === null ? 0 : (int) DB::table('sales_document_lines as return_line')
            ->join('sales_documents as return_doc', 'return_doc.id', '=', 'return_line.sales_document_id')
            ->where('return_line.original_document_line_id', $source->sales_document_line_id)
            ->where('return_doc.document_type', 'credit_note')
            ->where('return_doc.status', 'posted')
            ->sum('return_line.quantity');
        if ($quantity < 1 || $returnedByWarehouse + $returnedByCredit + $quantity > (int) $source->quantity) {
            throw ValidationException::withMessages(['quantity' => ['The returned quantity exceeds the amount still returnable from the source movement.']]);
        }
        return $source;
    }
}
