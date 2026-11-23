<?php

namespace App\Services;

use App\Support\ExactMoney;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;
use RuntimeException;

class InventoryService
{
    public function __construct(private readonly AuditLogService $auditLog) {}

    /**
     * @param  array{movement_type?: string, movement_date?: string, reason?: string|null, source_type?: string|null, source_id?: int|null}  $source
     * @return array<string, int|string|null>
     */
    public function receive(
        int $productId,
        int $warehouseId,
        int $quantity,
        string $unitCost,
        array $source,
        Request $request,
    ): array {
        $this->assertQuantity($quantity);

        try {
            $unitCostCents = ExactMoney::toCents($unitCost);
        } catch (InvalidArgumentException $exception) {
            throw ValidationException::withMessages(['unit_cost_egp' => [$exception->getMessage()]]);
        }

        return $this->postMovement(
            $productId,
            $warehouseId,
            $quantity,
            $unitCostCents,
            true,
            $source,
            $request,
        );
    }

    /**
     * @param  array<int, array{container_line_id: int, product_id: int, quantity: int, unit_cost_egp: string, line_cost_total_egp: string}>  $lines
     * @return array{movement_id: int, movement_line_ids: array<int, int>}
     */
    public function receiveContainerBatch(
        int $warehouseId,
        array $lines,
        string $movementDate,
        string $reason,
        Request $request,
    ): array {
        if ($lines === []) {
            throw ValidationException::withMessages(['lines' => ['At least one positive receipt line is required.']]);
        }

        usort($lines, fn (array $left, array $right): int => [$left['product_id'], $left['container_line_id']] <=> [$right['product_id'], $right['container_line_id']]);
        $prepared = [];
        foreach ($lines as $line) {
            $this->assertQuantity($line['quantity']);
            try {
                $unitCostCents = ExactMoney::toCents($line['unit_cost_egp']);
                $lineCostCents = ExactMoney::toCents($line['line_cost_total_egp']);
                ExactMoney::fromCents($lineCostCents);
            } catch (InvalidArgumentException $exception) {
                throw ValidationException::withMessages(['lines' => [$exception->getMessage()]]);
            }
            $prepared[] = [
                ...$line,
                'unit_cost_cents' => $unitCostCents,
                'line_cost_cents' => $lineCostCents,
            ];
        }

        return DB::transaction(function () use ($warehouseId, $prepared, $movementDate, $reason, $request): array {
            $warehouse = DB::table('locations')
                ->where('id', $warehouseId)
                ->where('is_active', true)
                ->sharedLock()
                ->first(['id', 'name']);
            if ($warehouse === null) {
                throw ValidationException::withMessages(['warehouse_id' => ['The selected warehouse does not exist or is inactive.']]);
            }

            $productIds = array_values(array_unique(array_column($prepared, 'product_id')));
            sort($productIds);
            $products = DB::table('products')
                ->whereIn('id', $productIds)
                ->where('is_active', true)
                ->orderBy('id')
                ->sharedLock()
                ->get(['id', 'name'])
                ->keyBy('id');
            if ($products->count() !== count($productIds)) {
                throw ValidationException::withMessages(['product_id' => ['Every receipt product must exist and be active.']]);
            }

            foreach ($productIds as $productId) {
                $exists = DB::table('inventory_balances')
                    ->where('product_id', $productId)
                    ->where('location_id', $warehouseId)
                    ->exists();
                if (! $exists) {
                    DB::table('inventory_balances')->insertOrIgnore([
                        'product_id' => $productId,
                        'location_id' => $warehouseId,
                        'quantity_on_hand' => 0,
                        'quantity_reserved' => 0,
                        'average_unit_cost_egp' => null,
                        'inventory_value_egp' => '0.00',
                        'updated_at' => now(),
                    ]);
                }
            }

            $balances = DB::table('inventory_balances')
                ->where('location_id', $warehouseId)
                ->whereIn('product_id', $productIds)
                ->orderBy('product_id')
                ->lockForUpdate()
                ->get()
                ->keyBy('product_id');
            if ($balances->count() !== count($productIds)) {
                throw new RuntimeException('The container receipt balances could not be locked.');
            }

            $movementId = (int) DB::table('inventory_movements')->insertGetId([
                'movement_number' => 'IM-'.Str::uuid(),
                'movement_type' => 'container_receipt',
                'status' => 'posted',
                'movement_date' => $movementDate,
                'reason' => $reason,
                'created_by_user_id' => $request->attributes->get('authenticated_user')->id,
                'posted_by_user_id' => $request->attributes->get('authenticated_user')->id,
                'posted_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $running = [];
            foreach ($productIds as $productId) {
                $balance = $balances->get($productId);
                $quantity = (int) $balance->quantity_on_hand;
                $valueCents = ExactMoney::toCents((string) $balance->inventory_value_egp);
                if (($quantity === 0 && $valueCents !== '0')
                    || ($quantity > 0 && $balance->average_unit_cost_egp === null)) {
                    throw new RuntimeException('The container receipt balance projection has inconsistent quantity and value data.');
                }
                $running[$productId] = [
                    'quantity' => $quantity,
                    'value_cents' => $valueCents,
                    'before' => [
                        'quantity_on_hand' => $quantity,
                        'inventory_value_egp' => (string) $balance->inventory_value_egp,
                    ],
                ];
            }
            $movementLineIds = [];
            $movementLineNumber = 0;
            $auditLines = [];
            foreach ($prepared as $line) {
                $productId = $line['product_id'];
                $before = $running[$productId];
                $afterQuantity = $before['quantity'] + $line['quantity'];
                if ($afterQuantity > 2147483647) {
                    throw ValidationException::withMessages(['quantity' => ['The resulting stock exceeds the supported quantity range.']]);
                }
                try {
                    $afterValue = ExactMoney::add($before['value_cents'], $line['line_cost_cents']);
                    $average = ExactMoney::divideRounded($afterValue, $afterQuantity);
                    $lineCost = ExactMoney::fromCents($line['line_cost_cents']);
                    $unitCost = ExactMoney::fromCents($line['unit_cost_cents']);
                    ExactMoney::fromCents($afterValue);
                    ExactMoney::fromCents($average);
                } catch (InvalidArgumentException $exception) {
                    throw ValidationException::withMessages(['lines' => [$exception->getMessage()]]);
                }
                $movementLineNumber++;
                $movementLineId = (int) DB::table('inventory_movement_lines')->insertGetId([
                    'inventory_movement_id' => $movementId,
                    'line_number' => $movementLineNumber,
                    'product_id' => $productId,
                    'to_location_id' => $warehouseId,
                    'quantity' => $line['quantity'],
                    'unit_cost_egp_snapshot' => $unitCost,
                    'line_cost_egp_snapshot' => $lineCost,
                    'created_at' => now(),
                ]);
                $movementLineIds[$line['container_line_id']] = $movementLineId;
                $running[$productId]['quantity'] = $afterQuantity;
                $running[$productId]['value_cents'] = $afterValue;
                $running[$productId]['average_cents'] = $average;
                $auditLines[] = [
                    'container_line_id' => $line['container_line_id'],
                    'product_id' => $productId,
                    'quantity' => $line['quantity'],
                    'unit_cost_egp' => $unitCost,
                    'line_cost_egp' => $lineCost,
                    'quantity_on_hand' => $afterQuantity,
                    'average_unit_cost_egp' => ExactMoney::fromCents($average),
                    'inventory_value_egp' => ExactMoney::fromCents($afterValue),
                ];
            }

            foreach ($productIds as $productId) {
                DB::table('inventory_balances')
                    ->where('product_id', $productId)
                    ->where('location_id', $warehouseId)
                    ->update([
                        'quantity_on_hand' => $running[$productId]['quantity'],
                        'average_unit_cost_egp' => ExactMoney::fromCents($running[$productId]['average_cents']),
                        'inventory_value_egp' => ExactMoney::fromCents($running[$productId]['value_cents']),
                        'updated_at' => now(),
                    ]);
            }

            $this->auditLog->record(
                $request,
                'inventory.container_receipt',
                'inventory_movement',
                $movementId,
                $reason,
                array_map(fn (array $balance): array => $balance['before'], $running),
                [
                    'movement_id' => $movementId,
                    'movement_date' => $movementDate,
                    'warehouse_id' => $warehouseId,
                    'lines' => $auditLines,
                ],
            );

            return ['movement_id' => $movementId, 'movement_line_ids' => $movementLineIds];
        }, 5);
    }

    /**
     * @param  array<int, array{sales_document_line_id: int, product_id: int, warehouse_id: int, quantity: int}>  $lines
     * @return array{movement_id: int, lines: array<int, array{movement_line_id: int, unit_cost_egp: string, line_cost_egp: string}>}
     */
    public function issueSalesDocument(
        int $salesDocumentId,
        array $lines,
        string $movementDate,
        string $reason,
        Request $request,
    ): array {
        return $this->postSalesDocumentMovement(
            $salesDocumentId,
            $lines,
            false,
            'sale',
            'sales_document',
            $movementDate,
            $reason,
            $request,
        );
    }

    /**
     * @param  array<int, array{sales_document_line_id: int, product_id: int, warehouse_id: int, quantity: int, unit_cost_egp: string}>  $lines
     * @return array{movement_id: int, lines: array<int, array{movement_line_id: int, unit_cost_egp: string, line_cost_egp: string}>}
     */
    public function receiveSalesDocument(
        int $salesDocumentId,
        array $lines,
        string $movementDate,
        string $reason,
        Request $request,
        string $movementType = 'return',
        string $sourceType = 'sales_document',
        ?int $reversalOfMovementId = null,
    ): array {
        return $this->postSalesDocumentMovement(
            $salesDocumentId,
            $lines,
            true,
            $movementType,
            $sourceType,
            $movementDate,
            $reason,
            $request,
            $reversalOfMovementId,
        );
    }

    /**
     * @param  array<int, array{sales_document_line_id: int, product_id: int, warehouse_id: int, quantity: int, unit_cost_egp?: string}>  $lines
     * @return array{movement_id: int, lines: array<int, array{movement_line_id: int, unit_cost_egp: string, line_cost_egp: string}>}
     */
    private function postSalesDocumentMovement(
        int $salesDocumentId,
        array $lines,
        bool $isReceipt,
        string $movementType,
        string $sourceType,
        string $movementDate,
        string $reason,
        Request $request,
        ?int $reversalOfMovementId = null,
    ): array {
        if ($lines === []) {
            throw ValidationException::withMessages(['lines' => ['At least one stock line is required.']]);
        }

        usort($lines, static fn (array $left, array $right): int => [
            $left['product_id'], $left['warehouse_id'], $left['sales_document_line_id'],
        ] <=> [
            $right['product_id'], $right['warehouse_id'], $right['sales_document_line_id'],
        ]);

        $prepared = [];
        $productIds = [];
        $warehouseIds = [];
        foreach ($lines as $line) {
            $this->assertQuantity($line['quantity']);
            if ($line['sales_document_line_id'] < 1 || $line['product_id'] < 1 || $line['warehouse_id'] < 1) {
                throw ValidationException::withMessages(['lines' => ['Stock lines require positive document-line, product, and warehouse IDs.']]);
            }
            if ($isReceipt) {
                try {
                    $line['unit_cost_cents'] = ExactMoney::toCents($line['unit_cost_egp'] ?? '');
                } catch (InvalidArgumentException $exception) {
                    throw ValidationException::withMessages(['lines' => [$exception->getMessage()]]);
                }
            }
            $prepared[] = $line;
            $productIds[] = $line['product_id'];
            $warehouseIds[] = $line['warehouse_id'];
        }
        $productIds = array_values(array_unique($productIds));
        $warehouseIds = array_values(array_unique($warehouseIds));
        sort($productIds);
        sort($warehouseIds);

        return DB::transaction(function () use (
            $salesDocumentId,
            $prepared,
            $productIds,
            $warehouseIds,
            $isReceipt,
            $movementType,
            $sourceType,
            $movementDate,
            $reason,
            $request,
            $reversalOfMovementId,
        ): array {
            $products = DB::table('products')
                ->whereIn('id', $productIds)
                ->where('is_active', true)
                ->orderBy('id')
                ->sharedLock()
                ->get(['id'])
                ->keyBy('id');
            if ($products->count() !== count($productIds)) {
                throw ValidationException::withMessages(['product_id' => ['Every sales product must exist and be active.']]);
            }
            $warehouses = DB::table('locations')
                ->whereIn('id', $warehouseIds)
                ->where('is_active', true)
                ->orderBy('id')
                ->sharedLock()
                ->get(['id'])
                ->keyBy('id');
            if ($warehouses->count() !== count($warehouseIds)) {
                throw ValidationException::withMessages(['warehouse_id' => ['Every sales warehouse must exist and be active.']]);
            }

            foreach ($prepared as $line) {
                $exists = DB::table('inventory_balances')
                    ->where('product_id', $line['product_id'])
                    ->where('location_id', $line['warehouse_id'])
                    ->exists();
                if (! $exists) {
                    DB::table('inventory_balances')->insertOrIgnore([
                        'product_id' => $line['product_id'],
                        'location_id' => $line['warehouse_id'],
                        'quantity_on_hand' => 0,
                        'quantity_reserved' => 0,
                        'average_unit_cost_egp' => null,
                        'inventory_value_egp' => '0.00',
                        'updated_at' => now(),
                    ]);
                }
            }

            $balances = DB::table('inventory_balances')
                ->whereIn('product_id', $productIds)
                ->whereIn('location_id', $warehouseIds)
                ->orderBy('product_id')
                ->orderBy('location_id')
                ->lockForUpdate()
                ->get()
                ->keyBy(static fn (object $balance): string => $balance->product_id.':'.$balance->location_id);
            $running = [];
            $initialBalances = [];
            foreach ($balances as $key => $balance) {
                $quantity = (int) $balance->quantity_on_hand;
                $valueCents = ExactMoney::toCents((string) $balance->inventory_value_egp);
                if (($quantity === 0 && $valueCents !== '0')
                    || ($quantity > 0 && $balance->average_unit_cost_egp === null)) {
                    throw new RuntimeException('The sales inventory balance has inconsistent quantity and value data.');
                }
                $running[$key] = [
                    'quantity' => $quantity,
                    'value_cents' => $valueCents,
                ];
                $initialBalances[$key] = [
                    'quantity_on_hand' => $quantity,
                    'inventory_value_egp' => (string) $balance->inventory_value_egp,
                ];
            }

            $actor = $request->attributes->get('authenticated_user');
            if (! is_object($actor) || ! isset($actor->id)) {
                throw new RuntimeException('An authenticated user is required to post sales inventory.');
            }
            $now = now();
            $movementId = (int) DB::table('inventory_movements')->insertGetId([
                'movement_number' => 'IM-'.Str::uuid(),
                'movement_type' => $movementType,
                'status' => 'posted',
                'movement_date' => $movementDate,
                'source_type' => $sourceType,
                'source_id' => $salesDocumentId,
                'reversal_of_movement_id' => $reversalOfMovementId,
                'reason' => $reason,
                'created_by_user_id' => $actor->id,
                'posted_by_user_id' => $actor->id,
                'posted_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            $movementLines = [];
            $auditLines = [];
            foreach ($prepared as $index => $line) {
                $key = $line['product_id'].':'.$line['warehouse_id'];
                $before = $running[$key] ?? throw new RuntimeException('A sales inventory balance could not be locked.');
                $quantityBefore = $before['quantity'];
                $valueBefore = $before['value_cents'];
                if (! $isReceipt && $line['quantity'] > $quantityBefore) {
                    throw ValidationException::withMessages(['lines' => ['The invoice would make stock negative.']]);
                }
                $quantityAfter = $isReceipt
                    ? $quantityBefore + $line['quantity']
                    : $quantityBefore - $line['quantity'];
                if ($quantityAfter > 2147483647) {
                    throw ValidationException::withMessages(['lines' => ['The resulting stock exceeds the supported quantity range.']]);
                }

                if ($isReceipt) {
                    $unitCostCents = $line['unit_cost_cents'];
                    $lineCostCents = ExactMoney::multiply($unitCostCents, $line['quantity']);
                    $valueAfter = ExactMoney::add($valueBefore, $lineCostCents);
                    $averageAfter = ExactMoney::divideRounded($valueAfter, $quantityAfter);
                } else {
                    if ($quantityBefore < 1) {
                        throw ValidationException::withMessages(['lines' => ['The product has no available stock in the selected warehouse.']]);
                    }
                    $unitCostCents = ExactMoney::divideRounded($valueBefore, $quantityBefore);
                    $lineCostCents = $line['quantity'] === $quantityBefore
                        ? $valueBefore
                        : ExactMoney::divideRounded(ExactMoney::multiply($valueBefore, $line['quantity']), $quantityBefore);
                    $valueAfter = ExactMoney::subtract($valueBefore, $lineCostCents);
                    $averageAfter = $quantityAfter === 0
                        ? null
                        : ExactMoney::divideRounded($valueAfter, $quantityAfter);
                }

                try {
                    $unitCost = ExactMoney::fromCents($unitCostCents);
                    $lineCost = ExactMoney::fromCents($lineCostCents);
                    ExactMoney::fromCents($valueAfter);
                    if ($averageAfter !== null) {
                        ExactMoney::fromCents($averageAfter);
                    }
                } catch (InvalidArgumentException $exception) {
                    throw ValidationException::withMessages(['lines' => [$exception->getMessage()]]);
                }

                $movementLineId = (int) DB::table('inventory_movement_lines')->insertGetId([
                    'inventory_movement_id' => $movementId,
                    'line_number' => $index + 1,
                    'product_id' => $line['product_id'],
                    'from_location_id' => $isReceipt ? null : $line['warehouse_id'],
                    'to_location_id' => $isReceipt ? $line['warehouse_id'] : null,
                    'sales_document_line_id' => $line['sales_document_line_id'],
                    'reversal_of_movement_line_id' => $line['reversal_of_movement_line_id'] ?? null,
                    'quantity' => $line['quantity'],
                    'unit_cost_egp_snapshot' => $unitCost,
                    'line_cost_egp_snapshot' => $lineCost,
                    'notes' => $reason,
                    'created_at' => $now,
                ]);
                DB::table('inventory_balances')
                    ->where('product_id', $line['product_id'])
                    ->where('location_id', $line['warehouse_id'])
                    ->update([
                        'quantity_on_hand' => $quantityAfter,
                        'average_unit_cost_egp' => $averageAfter === null ? null : ExactMoney::fromCents($averageAfter),
                        'inventory_value_egp' => ExactMoney::fromCents($valueAfter),
                        'updated_at' => $now,
                    ]);
                $running[$key] = ['quantity' => $quantityAfter, 'value_cents' => $valueAfter];
                $movementLines[$line['sales_document_line_id']] = [
                    'movement_line_id' => $movementLineId,
                    'unit_cost_egp' => $unitCost,
                    'line_cost_egp' => $lineCost,
                ];
                $auditLines[] = [
                    'sales_document_line_id' => $line['sales_document_line_id'],
                    'product_id' => $line['product_id'],
                    'warehouse_id' => $line['warehouse_id'],
                    'quantity' => $line['quantity'],
                    'unit_cost_egp' => $unitCost,
                    'line_cost_egp' => $lineCost,
                ];
            }

            $this->auditLog->record(
                $request,
                'inventory.sales_document_posted',
                'inventory_movement',
                $movementId,
                $reason,
                $initialBalances,
                ['sales_document_id' => $salesDocumentId, 'movement_type' => $movementType, 'lines' => $auditLines],
            );

            return ['movement_id' => $movementId, 'lines' => $movementLines];
        }, 5);
    }

    /**
     * @param  array{movement_type?: string, movement_date?: string, reason?: string|null, source_type?: string|null, source_id?: int|null}  $source
     * @return array<string, int|string|null>
     */
    public function issue(
        int $productId,
        int $warehouseId,
        int $quantity,
        array $source,
        Request $request,
    ): array {
        $this->assertQuantity($quantity);

        return $this->postMovement(
            $productId,
            $warehouseId,
            $quantity,
            null,
            false,
            $source,
            $request,
        );
    }

    /**
     * @return array<string, int|string|null>
     */
    public function transfer(
        int $productId,
        int $sourceWarehouseId,
        int $destinationWarehouseId,
        int $quantity,
        string $movementDate,
        string $reason,
        Request $request,
    ): array {
        $this->assertQuantity($quantity);

        if ($sourceWarehouseId === $destinationWarehouseId) {
            throw ValidationException::withMessages(['destination_warehouse_id' => ['Source and destination warehouses must be different.']]);
        }

        return DB::transaction(function () use (
            $productId,
            $sourceWarehouseId,
            $destinationWarehouseId,
            $quantity,
            $movementDate,
            $reason,
            $request,
        ): array {
            $product = DB::table('products')
                ->where('id', $productId)
                ->where('is_active', true)
                ->sharedLock()
                ->first(['id', 'name']);

            $warehouses = DB::table('locations')
                ->whereIn('id', [$sourceWarehouseId, $destinationWarehouseId])
                ->where('is_active', true)
                ->orderBy('id')
                ->sharedLock()
                ->get(['id', 'name'])
                ->keyBy('id');

            if ($product === null) {
                throw ValidationException::withMessages(['product_id' => ['The selected product does not exist or is inactive.']]);
            }

            if ($warehouses->count() !== 2) {
                throw ValidationException::withMessages(['warehouse_id' => ['Both warehouses must exist and be active.']]);
            }

            $locationIds = [$sourceWarehouseId, $destinationWarehouseId];
            sort($locationIds);
            foreach ($locationIds as $locationId) {
                $balanceQuery = DB::table('inventory_balances')
                    ->where('product_id', $productId)
                    ->where('location_id', $locationId);

                if (! $balanceQuery->exists()) {
                    DB::table('inventory_balances')->insertOrIgnore([
                        'product_id' => $productId,
                        'location_id' => $locationId,
                        'quantity_on_hand' => 0,
                        'quantity_reserved' => 0,
                        'average_unit_cost_egp' => null,
                        'inventory_value_egp' => '0.00',
                        'updated_at' => now(),
                    ]);
                }
            }

            $balances = DB::table('inventory_balances')
                ->where('product_id', $productId)
                ->whereIn('location_id', $locationIds)
                ->orderBy('location_id')
                ->lockForUpdate()
                ->get()
                ->keyBy('location_id');
            $sourceBalance = $balances->get($sourceWarehouseId);
            $destinationBalance = $balances->get($destinationWarehouseId);

            if ($sourceBalance === null || $destinationBalance === null) {
                throw new RuntimeException('The inventory transfer balances could not be locked.');
            }

            $sourceQuantity = (int) $sourceBalance->quantity_on_hand;
            $sourceAvailable = $sourceQuantity - (int) $sourceBalance->quantity_reserved;
            if ($quantity > $sourceAvailable) {
                throw ValidationException::withMessages(['quantity' => ['The transfer exceeds available source stock after reservations.']]);
            }

            if ($sourceBalance->average_unit_cost_egp === null) {
                throw new RuntimeException('A positive source balance has no weighted-average cost.');
            }

            $sourceAverageCost = ExactMoney::fromCents(ExactMoney::toCents((string) $sourceBalance->average_unit_cost_egp));
            $sourceValueCents = ExactMoney::toCents((string) $sourceBalance->inventory_value_egp);
            $transferValueCents = $quantity === $sourceQuantity
                ? $sourceValueCents
                : ExactMoney::divideRounded(ExactMoney::multiply($sourceValueCents, $quantity), $sourceQuantity);
            $sourceAfterQuantity = $sourceQuantity - $quantity;
            $sourceAfterValueCents = ExactMoney::subtract($sourceValueCents, $transferValueCents);
            $destinationQuantity = (int) $destinationBalance->quantity_on_hand;
            $destinationAfterQuantity = $destinationQuantity + $quantity;
            $destinationValueCents = ExactMoney::add(
                ExactMoney::toCents((string) $destinationBalance->inventory_value_egp),
                $transferValueCents,
            );

            if ($destinationAfterQuantity > 2147483647) {
                throw ValidationException::withMessages(['quantity' => ['The resulting stock exceeds the supported quantity range.']]);
            }

            $sourceAfterAverageCents = $sourceAfterQuantity === 0
                ? null
                : ExactMoney::divideRounded($sourceAfterValueCents, $sourceAfterQuantity);
            $destinationAfterAverageCents = ExactMoney::divideRounded($destinationValueCents, $destinationAfterQuantity);
            ExactMoney::fromCents($transferValueCents);
            ExactMoney::fromCents($destinationValueCents);

            $now = now();
            $movementId = (int) DB::table('inventory_movements')->insertGetId([
                'movement_number' => 'IM-'.Str::uuid(),
                'movement_type' => 'transfer',
                'status' => 'posted',
                'movement_date' => $movementDate,
                'reason' => $reason,
                'created_by_user_id' => $request->attributes->get('authenticated_user')->id,
                'posted_by_user_id' => $request->attributes->get('authenticated_user')->id,
                'posted_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            DB::table('inventory_movement_lines')->insert([
                'inventory_movement_id' => $movementId,
                'line_number' => 1,
                'product_id' => $productId,
                'from_location_id' => $sourceWarehouseId,
                'to_location_id' => $destinationWarehouseId,
                'quantity' => $quantity,
                'unit_cost_egp_snapshot' => $sourceAverageCost,
                'line_cost_egp_snapshot' => ExactMoney::fromCents($transferValueCents),
                'notes' => $reason,
                'created_at' => $now,
            ]);

            DB::table('inventory_balances')
                ->where('product_id', $productId)
                ->where('location_id', $sourceWarehouseId)
                ->update([
                    'quantity_on_hand' => $sourceAfterQuantity,
                    'average_unit_cost_egp' => $sourceAfterAverageCents === null ? null : ExactMoney::fromCents($sourceAfterAverageCents),
                    'inventory_value_egp' => ExactMoney::fromCents($sourceAfterValueCents),
                    'updated_at' => $now,
                ]);
            DB::table('inventory_balances')
                ->where('product_id', $productId)
                ->where('location_id', $destinationWarehouseId)
                ->update([
                    'quantity_on_hand' => $destinationAfterQuantity,
                    'average_unit_cost_egp' => ExactMoney::fromCents($destinationAfterAverageCents),
                    'inventory_value_egp' => ExactMoney::fromCents($destinationValueCents),
                    'updated_at' => $now,
                ]);

            $this->auditLog->record(
                $request,
                'inventory.transfer',
                'inventory_movement',
                $movementId,
                $reason,
                [
                    'source' => [
                        'location_id' => $sourceWarehouseId,
                        'quantity_on_hand' => $sourceQuantity,
                        'inventory_value_egp' => $sourceBalance->inventory_value_egp,
                    ],
                    'destination' => [
                        'location_id' => $destinationWarehouseId,
                        'quantity_on_hand' => $destinationQuantity,
                        'inventory_value_egp' => $destinationBalance->inventory_value_egp,
                    ],
                ],
                [
                    'movement_id' => $movementId,
                    'product_id' => $productId,
                    'quantity' => $quantity,
                    'unit_cost_egp' => $sourceAverageCost,
                    'line_cost_egp' => ExactMoney::fromCents($transferValueCents),
                    'source' => [
                        'location_id' => $sourceWarehouseId,
                        'quantity_on_hand' => $sourceAfterQuantity,
                        'inventory_value_egp' => ExactMoney::fromCents($sourceAfterValueCents),
                    ],
                    'destination' => [
                        'location_id' => $destinationWarehouseId,
                        'quantity_on_hand' => $destinationAfterQuantity,
                        'inventory_value_egp' => ExactMoney::fromCents($destinationValueCents),
                    ],
                ],
            );

            return [
                'movement_id' => $movementId,
                'quantity_transferred' => $quantity,
                'unit_cost_egp' => $sourceAverageCost,
                'line_cost_egp' => ExactMoney::fromCents($transferValueCents),
                'source_quantity_on_hand' => $sourceAfterQuantity,
                'destination_quantity_on_hand' => $destinationAfterQuantity,
                'destination_average_unit_cost_egp' => ExactMoney::fromCents($destinationAfterAverageCents),
            ];
        }, 5);
    }

    /**
     * @param  array{movement_type?: string, movement_date?: string, reason?: string|null, source_type?: string|null, source_id?: int|null}  $source
     * @return array<string, int|string|null>
     */
    private function postMovement(
        int $productId,
        int $warehouseId,
        int $quantity,
        ?string $incomingUnitCostCents,
        bool $isReceipt,
        array $source,
        Request $request,
    ): array {
        $movementType = $source['movement_type'] ?? ($isReceipt ? 'receipt' : 'adjustment');
        $allowedTypes = $isReceipt
            ? ['opening', 'receipt', 'return', 'adjustment', 'container_receipt', 'reversal', 'count']
            : ['sale', 'adjustment', 'damage', 'reversal', 'count'];

        if (! in_array($movementType, $allowedTypes, true)) {
            throw ValidationException::withMessages(['movement_type' => ['The movement type is not valid for this stock direction.']]);
        }

        $sourceType = $source['source_type'] ?? null;
        $sourceId = $source['source_id'] ?? null;

        if (($sourceType === null) !== ($sourceId === null)) {
            throw ValidationException::withMessages(['source' => ['Source type and source ID must be provided together.']]);
        }

        if ($sourceType !== null && (! is_string($sourceType) || $sourceType === '' || strlen($sourceType) > 80)) {
            throw ValidationException::withMessages(['source_type' => ['The source type must be between 1 and 80 characters.']]);
        }

        if ($sourceId !== null && (! is_int($sourceId) || $sourceId < 1)) {
            throw ValidationException::withMessages(['source_id' => ['The source ID must be a positive integer.']]);
        }

        $reason = $source['reason'] ?? null;
        $movementDate = $source['movement_date'] ?? now()->toDateString();

        return DB::transaction(function () use (
            $productId,
            $warehouseId,
            $quantity,
            $incomingUnitCostCents,
            $isReceipt,
            $movementType,
            $sourceType,
            $sourceId,
            $reason,
            $movementDate,
            $request,
        ): array {
            $product = DB::table('products')
                ->where('id', $productId)
                ->where('is_active', true)
                ->sharedLock()
                ->first(['id', 'name']);
            $warehouse = DB::table('locations')
                ->where('id', $warehouseId)
                ->where('is_active', true)
                ->sharedLock()
                ->first(['id', 'name']);

            if ($product === null) {
                throw ValidationException::withMessages(['product_id' => ['The selected product does not exist or is inactive.']]);
            }

            if ($warehouse === null) {
                throw ValidationException::withMessages(['warehouse_id' => ['The selected warehouse does not exist or is inactive.']]);
            }

            $balanceQuery = DB::table('inventory_balances')
                ->where('product_id', $productId)
                ->where('location_id', $warehouseId);

            if (! $balanceQuery->exists()) {
                DB::table('inventory_balances')->insertOrIgnore([
                    'product_id' => $productId,
                    'location_id' => $warehouseId,
                    'quantity_on_hand' => 0,
                    'quantity_reserved' => 0,
                    'average_unit_cost_egp' => null,
                    'inventory_value_egp' => '0.00',
                    'updated_at' => now(),
                ]);
            }

            $balance = DB::table('inventory_balances')
                ->where('product_id', $productId)
                ->where('location_id', $warehouseId)
                ->lockForUpdate()
                ->first();

            if ($balance === null) {
                throw new RuntimeException('The inventory balance could not be locked.');
            }

            $oldQuantity = (int) $balance->quantity_on_hand;
            $oldValueCents = ExactMoney::toCents((string) $balance->inventory_value_egp);

            if ($movementType === 'opening') {
                $hasHistory = DB::table('inventory_movement_lines as history_line')
                    ->join('inventory_movements as history', 'history.id', '=', 'history_line.inventory_movement_id')
                    ->where('history_line.product_id', $productId)
                    ->where(function ($locations) use ($warehouseId): void {
                        $locations->where('history_line.from_location_id', $warehouseId)
                            ->orWhere('history_line.to_location_id', $warehouseId);
                    })
                    ->where('history.status', 'posted')
                    ->exists();
                if ($hasHistory || $oldQuantity !== 0 || (int) $balance->quantity_reserved !== 0) {
                    throw ValidationException::withMessages(['product_id' => ['Opening stock is allowed only before the first stock movement for this product and warehouse.']]);
                }
            }

            if (($oldQuantity === 0 && $oldValueCents !== '0') || ($oldQuantity > 0 && $balance->average_unit_cost_egp === null)) {
                throw new RuntimeException('The inventory balance projection has inconsistent quantity and value data.');
            }

            $availableQuantity = $oldQuantity - (int) $balance->quantity_reserved;
            if (! $isReceipt && $quantity > $availableQuantity) {
                throw ValidationException::withMessages(['quantity' => ['The issue exceeds available stock after reservations.']]);
            }

            $newQuantity = $isReceipt ? $oldQuantity + $quantity : $oldQuantity - $quantity;

            if ($newQuantity > 2147483647) {
                throw ValidationException::withMessages(['quantity' => ['The resulting stock exceeds the supported quantity range.']]);
            }

            if ($isReceipt) {
                $incomingUnitCostCents ??= throw new RuntimeException('A receipt requires a unit cost.');
                $lineUnitCostCents = $incomingUnitCostCents;
                $lineCostCents = ExactMoney::multiply($lineUnitCostCents, $quantity);
                $inventoryValueCents = ExactMoney::add($oldValueCents, $lineCostCents);
                $averageCostCents = ExactMoney::divideRounded($inventoryValueCents, $newQuantity);
            } else {
                if ($balance->average_unit_cost_egp === null) {
                    throw new RuntimeException('A positive stock balance has no weighted-average cost.');
                }

                $lineUnitCostCents = ExactMoney::toCents((string) $balance->average_unit_cost_egp);
                $lineCostCents = $quantity === $oldQuantity
                    ? $oldValueCents
                    : ExactMoney::divideRounded(ExactMoney::multiply($oldValueCents, $quantity), $oldQuantity);
                $inventoryValueCents = ExactMoney::subtract($oldValueCents, $lineCostCents);
                $averageCostCents = $newQuantity === 0 ? null : $lineUnitCostCents;

                if ($newQuantity > 0) {
                    $averageCostCents = ExactMoney::divideRounded($inventoryValueCents, $newQuantity);
                }
            }

            try {
                ExactMoney::fromCents($lineCostCents);
                ExactMoney::fromCents($inventoryValueCents);
            } catch (InvalidArgumentException $exception) {
                throw ValidationException::withMessages(['unit_cost_egp' => [$exception->getMessage()]]);
            }

            $now = now();
            $movementId = (int) DB::table('inventory_movements')->insertGetId([
                'movement_number' => 'IM-'.Str::uuid(),
                'movement_type' => $movementType,
                'status' => 'posted',
                'movement_date' => $movementDate,
                'source_type' => $sourceType,
                'source_id' => $sourceId,
                'reason' => $reason,
                'created_by_user_id' => $request->attributes->get('authenticated_user')->id,
                'posted_by_user_id' => $request->attributes->get('authenticated_user')->id,
                'posted_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            DB::table('inventory_movement_lines')->insert([
                'inventory_movement_id' => $movementId,
                'line_number' => 1,
                'product_id' => $productId,
                'from_location_id' => $isReceipt ? null : $warehouseId,
                'to_location_id' => $isReceipt ? $warehouseId : null,
                'quantity' => $quantity,
                'unit_cost_egp_snapshot' => ExactMoney::fromCents($lineUnitCostCents),
                'line_cost_egp_snapshot' => ExactMoney::fromCents($lineCostCents),
                'created_at' => $now,
            ]);

            DB::table('inventory_balances')
                ->where('product_id', $productId)
                ->where('location_id', $warehouseId)
                ->update([
                    'quantity_on_hand' => $newQuantity,
                    'average_unit_cost_egp' => $averageCostCents === null ? null : ExactMoney::fromCents($averageCostCents),
                    'inventory_value_egp' => ExactMoney::fromCents($inventoryValueCents),
                    'updated_at' => $now,
                ]);

            $this->auditLog->record(
                $request,
                'inventory.'.$movementType,
                'inventory_movement',
                $movementId,
                $reason,
                [
                    'quantity_on_hand' => $oldQuantity,
                    'average_unit_cost_egp' => $balance->average_unit_cost_egp,
                    'inventory_value_egp' => $balance->inventory_value_egp,
                ],
                [
                    'movement_id' => $movementId,
                    'movement_date' => $movementDate,
                    'movement_type' => $movementType,
                    'product_id' => $productId,
                    'product_name' => $product->name,
                    'location_id' => $warehouseId,
                    'location_name' => $warehouse->name,
                    'quantity' => $quantity,
                    'unit_cost_egp' => ExactMoney::fromCents($lineUnitCostCents),
                    'line_cost_egp' => ExactMoney::fromCents($lineCostCents),
                    'quantity_on_hand' => $newQuantity,
                    'average_unit_cost_egp' => $averageCostCents === null ? null : ExactMoney::fromCents($averageCostCents),
                    'inventory_value_egp' => ExactMoney::fromCents($inventoryValueCents),
                ],
            );

            return [
                'movement_id' => $movementId,
                'quantity_on_hand' => $newQuantity,
                'average_unit_cost_egp' => $averageCostCents === null ? null : ExactMoney::fromCents($averageCostCents),
                'inventory_value_egp' => ExactMoney::fromCents($inventoryValueCents),
            ];
        }, 5);
    }

    private function assertQuantity(int $quantity): void
    {
        if ($quantity < 1 || $quantity > 2147483647) {
            throw ValidationException::withMessages(['quantity' => ['Quantity must be a positive whole number within the supported range.']]);
        }
    }
}
