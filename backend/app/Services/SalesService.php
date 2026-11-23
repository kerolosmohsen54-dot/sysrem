<?php

namespace App\Services;

use App\Support\ExactMoney;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;
use RuntimeException;

class SalesService
{
    public function __construct(
        private readonly AuditLogService $auditLog,
        private readonly InventoryService $inventory,
        private readonly FinancialOutboxService $outbox,
        private readonly MobileSyncEventService $mobileSyncEvents,
        private readonly OrderReservationService $orderReservations,
        private readonly ReportsService $reports,
        private readonly TreasuryService $treasury,
    ) {}

    /**
     * @param  array{customer_id: int, issue_date: string, due_date?: string|null, notes?: string|null, lines: array<int, array{product_id: int, warehouse_id: int, quantity: int, unit_price_egp: string, discount_amount_egp?: string, description?: string|null}>}  $values
     * @return array<string, mixed>
     */
    public function previewInvoice(array $values): array
    {
        $values = $this->applyInvoiceDiscount($values);
        $customer = DB::table('customers')
            ->where('id', $values['customer_id'])
            ->where('is_active', true)
            ->first(['id', 'credit_limit']);
        if ($customer === null) {
            throw ValidationException::withMessages(['customer_id' => ['The selected customer does not exist or is inactive.']]);
        }
        $tax = $this->salesTaxSettings();
        $previewLines = [];
        $stockRequirements = [];
        foreach ($values['lines'] as $index => $input) {
            $product = DB::table('products')
                ->where('id', $input['product_id'])
                ->where('is_active', true)
                ->first(['id', 'sku', 'name']);
            if ($product === null) {
                throw ValidationException::withMessages(['lines' => ['Every invoice product must exist and be active.']]);
            }
            $warehouseExists = DB::table('locations')
                ->where('id', $input['warehouse_id'])
                ->where('is_active', true)
                ->exists();
            if (! $warehouseExists) {
                throw ValidationException::withMessages(['lines' => ['Every invoice warehouse must exist and be active.']]);
            }
            $lineId = $index + 1;
            $previewLines[] = (object) [
                'id' => $lineId,
                'product_id' => (int) $product->id,
                'sku' => $product->sku,
                'product_name' => $product->name,
                'warehouse_id' => (int) $input['warehouse_id'],
                'quantity' => (int) $input['quantity'],
                'unit_price' => $input['unit_price_egp'],
                'discount_amount' => $input['discount_amount_egp'] ?? '0',
                'description' => $input['description'] ?? $product->name,
            ];
            $stockKey = $product->id.':'.$input['warehouse_id'];
            $stockRequirements[$stockKey] ??= [
                'product_id' => (int) $product->id,
                'warehouse_id' => (int) $input['warehouse_id'],
                'quantity' => 0,
                'product_name' => $product->name,
            ];
            $stockRequirements[$stockKey]['quantity'] += (int) $input['quantity'];
        }
        $money = $this->calculateInvoiceAmounts($previewLines, $tax);
        $lines = [];
        foreach ($previewLines as $line) {
            $amount = $money['lines'][$line->id];
            $lines[] = [
                'line_number' => $line->id,
                'product_id' => $line->product_id,
                'sku' => $line->sku,
                'product_name' => $line->product_name,
                'warehouse_id' => $line->warehouse_id,
                'quantity' => $line->quantity,
                'unit_price_egp' => ExactMoney::fromCents($this->toCents($line->unit_price, 'lines')),
                'discount_amount_egp' => ExactMoney::fromCents($this->toCents($line->discount_amount, 'lines')),
                'tax_amount_egp' => $amount['tax_amount'],
                'line_total_egp' => $amount['line_total'],
            ];
        }
        $warnings = [];
        foreach ($stockRequirements as $requirement) {
            $available = (int) (DB::table('inventory_balances')
                ->where('product_id', $requirement['product_id'])
                ->where('location_id', $requirement['warehouse_id'])
                ->value(DB::raw('quantity_on_hand - quantity_reserved')) ?? 0);
            if ($available < $requirement['quantity']) {
                $warnings[] = [
                    'code' => 'insufficient_stock',
                    'product_id' => $requirement['product_id'],
                    'product_name' => $requirement['product_name'],
                    'warehouse_id' => $requirement['warehouse_id'],
                    'requested_quantity' => $requirement['quantity'],
                    'available_quantity' => max(0, $available),
                ];
            }
        }
        if ($customer->credit_limit !== null) {
            $balance = $this->reports->customerBalanceRows([(int) $customer->id])[(int) $customer->id]['balance'] ?? '0.00';
            $projectedBalance = ExactMoney::add(
                $this->toCents((string) $balance, 'balance'),
                $this->toCents($money['total'], 'total'),
            );
            if (ExactMoney::compare($projectedBalance, $this->toCents((string) $customer->credit_limit, 'credit_limit')) > 0) {
                $warnings[] = [
                    'code' => 'credit_limit_exceeded',
                    'credit_limit_egp' => ExactMoney::fromCents($this->toCents((string) $customer->credit_limit, 'credit_limit')),
                    'current_balance_egp' => ExactMoney::fromCents($this->toCents((string) $balance, 'balance')),
                ];
            }
        }

        return [
            'lines' => $lines,
            'subtotal_egp' => $money['subtotal'],
            'discount_amount_egp' => $money['discount'],
            'tax_enabled' => $tax['enabled'],
            'tax_rate' => $tax['enabled'] ? $tax['rate'] : '0.000000',
            'tax_calculation_method' => $tax['calculation_method'],
            'tax_amount_egp' => $money['tax'],
            'grand_total_egp' => $money['total'],
            'warnings' => $warnings,
        ];
    }

    /**
     * @param  array{customer_id: int, issue_date: string, due_date?: string|null, notes?: string|null, lines: array<int, array{product_id: int, warehouse_id: int, quantity: int, unit_price_egp: string, discount_amount_egp?: string, description?: string|null}>}  $values
     */
    public function createInvoice(Request $request, array $values): int
    {
        $values = $this->applyInvoiceDiscount($values);
        return DB::transaction(function () use ($request, $values): int {
            $customer = DB::table('customers')
                ->where('id', $values['customer_id'])
                ->where('is_active', true)
                ->lockForUpdate()
                ->first();
            if ($customer === null) {
                throw ValidationException::withMessages(['customer_id' => ['The selected customer does not exist or is inactive.']]);
            }

            $actor = $this->actor($request);
            $issuer = $this->resolveInvoiceIssuer($values, $actor);
            $documentId = (int) DB::table('sales_documents')->insertGetId([
                'document_number' => $this->nextDocumentNumber('invoice', 'INV', (string) $values['issue_date']),
                'document_type' => 'invoice',
                'status' => 'draft',
                'customer_id' => $customer->id,
                'issue_date' => $values['issue_date'],
                'due_date' => $values['due_date'] ?? null,
                'discount_type' => $values['discount_type'] ?? null,
                'discount_value' => isset($values['discount_value']) ? ExactMoney::fromCents($this->toCents((string) $values['discount_value'], 'discount_value')) : null,
                'issuer_type' => $issuer['type'],
                'issuer_partner_id' => $issuer['partner_id'],
                'issuer_driver_id' => $issuer['driver_id'],
                'issuer_company_snapshot' => $values['issuer_company'] ?? ($issuer['type'] === 'company' ? 'ماستر' : null),
                'issuer_name_snapshot' => $issuer['name'],
                'payment_terms' => $values['payment_terms'] ?? null,
                'shipping_driver_id' => $values['shipping_driver_id'] ?? null,
                'shipping_driver_name_snapshot' => $values['shipping_driver_name'] ?? null,
                'shipping_company_snapshot' => $values['shipping_company'] ?? null,
                'governorate_snapshot' => $values['governorate'] ?? null,
                'notes' => $values['notes'] ?? null,
                'created_by_user_id' => $actor->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $subtotalCents = '0';
            $discountCents = '0';
            foreach ($values['lines'] as $index => $input) {
                $product = DB::table('products')
                    ->where('id', $input['product_id'])
                    ->where('is_active', true)
                    ->sharedLock()
                    ->first(['id', 'sku', 'name', 'category_id']);
                if ($product === null) {
                    throw ValidationException::withMessages(['lines' => ['Every invoice product must exist and be active.']]);
                }
                $warehouse = DB::table('locations')
                    ->where('id', $input['warehouse_id'])
                    ->where('is_active', true)
                    ->sharedLock()
                    ->exists();
                if (! $warehouse) {
                    throw ValidationException::withMessages(['lines' => ['Every invoice warehouse must exist and be active.']]);
                }

                $unitPriceCents = $this->toCents($input['unit_price_egp'], 'lines');
                $discountLineCents = $this->toCents($input['discount_amount_egp'] ?? '0', 'lines');
                $grossCents = ExactMoney::multiply($unitPriceCents, (int) $input['quantity']);
                if (ExactMoney::compare($discountLineCents, $grossCents) > 0) {
                    throw ValidationException::withMessages(['lines' => ['A line discount cannot exceed its extended price.']]);
                }
                $subtotalCents = ExactMoney::add($subtotalCents, $grossCents);
                $discountCents = ExactMoney::add($discountCents, $discountLineCents);
                $lineTotal = ExactMoney::fromCents(ExactMoney::subtract($grossCents, $discountLineCents));

                DB::table('sales_document_lines')->insert([
                    'sales_document_id' => $documentId,
                    'line_number' => $index + 1,
                    'product_id' => $product->id,
                    'location_id' => $input['warehouse_id'],
                    'description_snapshot' => $input['description'] ?? $product->name,
                    'sku_snapshot' => $product->sku,
                    'product_category_snapshot' => $product->category_id === null
                        ? null
                        : DB::table('product_categories')->where('id', $product->category_id)->value('name'),
                    'quantity' => $input['quantity'],
                    'unit_price' => ExactMoney::fromCents($unitPriceCents),
                    'discount_amount' => ExactMoney::fromCents($discountLineCents),
                    'manual_discount_amount' => ExactMoney::fromCents($this->toCents((string) ($input['manual_discount_amount_egp'] ?? '0'), 'lines')),
                    'tax_amount' => '0.00',
                    'line_total' => $lineTotal,
                    'created_at' => now(),
                ]);
            }
            ExactMoney::fromCents($subtotalCents);
            ExactMoney::fromCents($discountCents);
            DB::table('sales_documents')->where('id', $documentId)->update([
                'subtotal' => ExactMoney::fromCents($subtotalCents),
                'discount_amount' => ExactMoney::fromCents($discountCents),
                'total_amount' => ExactMoney::fromCents(ExactMoney::subtract($subtotalCents, $discountCents)),
                'updated_at' => now(),
            ]);
            $this->auditLog->record($request, 'sales_document.invoice_drafted', 'sales_document', $documentId, null, null, [
                'document_number' => DB::table('sales_documents')->where('id', $documentId)->value('document_number'),
                'customer_id' => $customer->id,
                'line_count' => count($values['lines']),
            ]);

            return $documentId;
        }, 5);
    }

    /**
     * @param  array<int, array{order_line_id: int, warehouse_id: int}>  $lineLocations
     * @return array<string, mixed>
     */
    public function invoiceConfirmedOrder(Request $request, int $orderId, array $lineLocations): array
    {
        return $this->runIdempotent($request, 'sales_order', function () use ($request, $orderId, $lineLocations): array {
            $order = DB::table('sales_orders')->where('id', $orderId)->lockForUpdate()->first();
            abort_if($order === null, 404);
            if ($order->status !== 'confirmed') {
                abort(409, 'Only a confirmed sales order can be invoiced.');
            }
            $orderLines = DB::table('sales_order_lines')
                ->where('sales_order_id', $orderId)
                ->orderBy('line_number')
                ->lockForUpdate()
                ->get();
            if ($orderLines->isEmpty()) {
                throw ValidationException::withMessages(['lines' => ['An order requires at least one line.']]);
            }
            $locationMap = [];
            foreach ($lineLocations as $lineLocation) {
                $lineId = $lineLocation['order_line_id'];
                if (isset($locationMap[$lineId])) {
                    throw ValidationException::withMessages(['lines' => ['Each order line must appear exactly once.']]);
                }
                $locationMap[$lineId] = $lineLocation['warehouse_id'];
            }
            $expectedLineIds = $orderLines->pluck('id')->map(static fn ($id): int => (int) $id)->all();
            $providedLineIds = array_map('intval', array_keys($locationMap));
            sort($expectedLineIds);
            sort($providedLineIds);
            if ($expectedLineIds !== $providedLineIds) {
                throw ValidationException::withMessages(['lines' => ['An order must be invoiced in full; every order line must be included exactly once.']]);
            }

            $activeReservations = DB::table('sales_order_reservations as reservation')
                ->join('sales_order_lines as order_line', 'order_line.id', '=', 'reservation.sales_order_line_id')
                ->where('order_line.sales_order_id', $orderId)
                ->where('reservation.status', 'reserved')
                ->orderBy('reservation.id')
                ->lockForUpdate()
                ->get([
                    'reservation.id',
                    'reservation.sales_order_line_id',
                    'reservation.quantity',
                ]);
            $reservationIds = $activeReservations->pluck('id')->map(static fn ($id): int => (int) $id)->all();
            $activeAllocations = $reservationIds === [] ? collect() : DB::table('sales_order_reservation_allocations as allocation')
                ->join('sales_order_reservations as reservation', 'reservation.id', '=', 'allocation.reservation_id')
                ->whereIn('allocation.reservation_id', $reservationIds)
                ->orderBy('reservation.sales_order_line_id')
                ->orderBy('allocation.location_id')
                ->lockForUpdate()
                ->get([
                    'reservation.sales_order_line_id',
                    'allocation.location_id',
                    'allocation.quantity',
                ]);
            $reservationsByLine = $activeReservations->groupBy(static fn (object $reservation): int => (int) $reservation->sales_order_line_id);
            $allocationsByLine = $activeAllocations->groupBy(static fn (object $allocation): int => (int) $allocation->sales_order_line_id);
            foreach ($orderLines as $orderLine) {
                $lineId = (int) $orderLine->id;
                $lineReservations = $reservationsByLine->get($lineId, collect());
                $lineAllocations = $allocationsByLine->get($lineId, collect());
                if ($lineReservations->count() !== 1
                    || (int) $lineReservations->first()->quantity !== (int) $orderLine->quantity
                    || $lineAllocations->count() !== 1
                    || (int) $lineAllocations->first()->quantity !== (int) $orderLine->quantity) {
                    throw ValidationException::withMessages(['lines' => ['Every order line must have one active reservation for its full quantity before invoicing.']]);
                }
                if ((int) $locationMap[$lineId] !== (int) $lineAllocations->first()->location_id) {
                    throw ValidationException::withMessages(['lines' => ['An order must be invoiced from the warehouse that holds its reservation.']]);
                }
            }
            if (DB::table('sales_order_invoice_allocations as allocation')
                ->join('sales_order_lines as order_line', 'order_line.id', '=', 'allocation.sales_order_line_id')
                ->join('sales_document_lines as document_line', 'document_line.id', '=', 'allocation.sales_document_line_id')
                ->join('sales_documents as document', 'document.id', '=', 'document_line.sales_document_id')
                ->where('order_line.sales_order_id', $orderId)
                ->where('document.status', 'posted')
                ->exists()) {
                abort(409, 'The order has already been linked to an invoice.');
            }

            $invoiceLines = [];
            foreach ($orderLines as $orderLine) {
                $invoiceLines[] = [
                    'product_id' => (int) $orderLine->product_id,
                    'warehouse_id' => $locationMap[(int) $orderLine->id],
                    'quantity' => (int) $orderLine->quantity,
                    'unit_price_egp' => (string) $orderLine->unit_price,
                    'discount_amount_egp' => (string) $orderLine->discount_amount,
                    'description' => $orderLine->notes,
                ];
            }
            $documentId = $this->createInvoice($request, [
                'customer_id' => (int) $order->customer_id,
                'issue_date' => now()->toDateString(),
                'due_date' => null,
                'payment_terms' => $order->payment_method === 'deferred' ? 'deferred' : 'immediate',
                'discount_type' => (string) $order->discount_type,
                'discount_value' => (string) $order->discount_value,
                'notes' => $order->notes,
                'lines' => $invoiceLines,
            ]);
            $invoiceDocumentLines = DB::table('sales_document_lines')
                ->where('sales_document_id', $documentId)
                ->orderBy('line_number')
                ->get(['id', 'product_id', 'quantity']);
            foreach ($orderLines->values() as $index => $orderLine) {
                $invoiceLine = $invoiceDocumentLines[$index];
                DB::table('sales_order_invoice_allocations')->insert([
                    'sales_order_line_id' => $orderLine->id,
                    'sales_document_line_id' => $invoiceLine->id,
                    'product_id' => $orderLine->product_id,
                    'quantity' => $orderLine->quantity,
                    'created_at' => now(),
                ]);
            }

            $reservationConsumption = $this->orderReservations->release($request, $orderId, 'consumed');
            $response = $this->postInvoice($request, $documentId);
            $actor = $this->actor($request);
            DB::table('sales_orders')->where('id', $orderId)->update([
                'status' => 'fulfilled',
                'updated_at' => now(),
            ]);
            $this->auditLog->record($request, 'sales_order.invoiced', 'sales_order', $orderId, null, ['status' => 'confirmed'], [
                'status' => 'fulfilled',
                'sales_document_id' => $documentId,
                'confirmed_by_user_id' => $actor->id,
                'reservations_consumed' => $reservationConsumption,
            ]);
            $invoice = DB::table('sales_documents')->where('id', $documentId)->first([
                'id',
                'document_number',
                'total_amount',
                'status',
            ]);

            $order = DB::table('sales_orders')->where('id', $orderId)->first();
            $response['data']['sales_order'] = $order;
            $response['order'] = $order;
            $response['invoice'] = [
                'id' => (int) $invoice->id,
                'invoice_number' => $invoice->document_number,
                'total_egp' => (string) $invoice->total_amount,
                'status' => 'issued',
            ];

            return $response;
        });
    }

    /**
     * @return array<string, mixed>
     */
    public function issueInvoice(Request $request, int $documentId): array
    {
        return $this->runIdempotent(
            $request,
            'sales_document',
            fn (): array => $this->postInvoice($request, $documentId),
        );
    }

    /**
     * @param  array{direction: string, amount_egp: string, issue_date: string, notes?: string|null}  $values
     * @return array<string, mixed>
     */
    public function createOpeningBalance(Request $request, int $customerId, array $values): array
    {
        return $this->runIdempotent($request, 'sales_document', function () use ($request, $customerId, $values): array {
            $customer = DB::table('customers')
                ->where('id', $customerId)
                ->where('is_active', true)
                ->lockForUpdate()
                ->first(['id']);
            if ($customer === null) {
                throw ValidationException::withMessages(['customer_id' => ['The selected customer does not exist or is inactive.']]);
            }
            $amount = $this->toCents($values['amount_egp'], 'amount_egp');
            if ($amount === '0') {
                throw ValidationException::withMessages(['amount_egp' => ['An opening balance must be greater than zero.']]);
            }
            $actor = $this->actor($request);
            $documentId = (int) DB::table('sales_documents')->insertGetId([
                'document_number' => 'OB-'.strtoupper(str_replace('-', '', (string) Str::uuid())),
                'document_type' => 'opening_receivable',
                'opening_balance_direction' => $values['direction'],
                'status' => 'posted',
                'customer_id' => $customerId,
                'issue_date' => $values['issue_date'],
                'notes' => $values['notes'] ?? null,
                'subtotal' => ExactMoney::fromCents($amount),
                'discount_amount' => '0.00',
                'tax_amount' => '0.00',
                'total_amount' => ExactMoney::fromCents($amount),
                'created_by_user_id' => $actor->id,
                'posted_by_user_id' => $actor->id,
                'posted_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $this->auditLog->record($request, 'customer.opening_balance_posted', 'sales_document', $documentId, null, null, [
                'customer_id' => $customerId,
                'direction' => $values['direction'],
                'amount' => ExactMoney::fromCents($amount),
                'issue_date' => $values['issue_date'],
            ]);
            $this->outbox->recordPostedDocument('sales_document', $documentId, [
                'document_type' => 'opening_receivable',
                'customer_id' => $customerId,
                'issue_date' => $values['issue_date'],
                'total_amount_egp' => ExactMoney::fromCents($amount),
            ]);

            return ['data' => $this->invoiceResource($documentId, $request)];
        });
    }

    /**
     * @param  array{customer_id: int, issue_date: string, due_date?: string|null, notes?: string|null, lines: array<int, array{product_id: int, warehouse_id: int, quantity: int, unit_price_egp: string, discount_amount_egp?: string, description?: string|null}>, reason: string}  $values
     * @return array<string, mixed>
     */
    public function reviseInvoice(Request $request, int $documentId, array $values): array
    {
        return $this->runIdempotent($request, 'sales_document', function () use ($request, $documentId, $values): array {
            $original = DB::table('sales_documents')->where('id', $documentId)->lockForUpdate()->first();
            abort_if($original === null, 404);
            if ($original->document_type !== 'invoice' || $original->status !== 'posted') {
                abort(409, 'Only a posted invoice can be revised.');
            }
            if ($original->printed_at !== null) {
                abort(409, 'لا يمكن تعديل الفاتورة بعد طباعتها.');
            }
            if ($original->issuer_type === 'partner' && $original->issuer_partner_id !== null) {
                DB::table('partners')->where('id', $original->issuer_partner_id)->lockForUpdate()->first(['id']);
            }
            if (DB::table('sales_documents')->where('previous_revision_id', $documentId)->exists()) {
                abort(409, 'A newer invoice revision already exists.');
            }
            if (DB::table('sales_documents')
                ->where('original_document_id', $documentId)
                ->where('document_type', 'credit_note')
                ->where('status', 'posted')
                ->exists()) {
                abort(409, 'An invoice with posted returns cannot be revised.');
            }
            $orderAllocations = DB::table('sales_order_invoice_allocations as allocation')
                ->join('sales_order_lines as order_line', 'order_line.id', '=', 'allocation.sales_order_line_id')
                ->join('sales_document_lines as document_line', 'document_line.id', '=', 'allocation.sales_document_line_id')
                ->where('document_line.sales_document_id', $documentId)
                ->orderBy('order_line.line_number')
                ->lockForUpdate()
                ->get([
                    'allocation.id',
                    'allocation.sales_order_line_id',
                    'order_line.sales_order_id',
                    'order_line.product_id as order_product_id',
                    'order_line.quantity as order_quantity',
                ]);
            if ($orderAllocations->isNotEmpty()) {
                if ((int) $original->customer_id !== (int) $values['customer_id']) {
                    throw ValidationException::withMessages(['customer_id' => ['An invoice linked to a sales order must remain assigned to that order customer.']]);
                }
                $hasDelivery = DB::table('deliveries')
                    ->where('sales_document_id', $documentId)
                    ->orWhereIn('sales_order_id', $orderAllocations->pluck('sales_order_id')->unique())
                    ->exists();
                if ($hasDelivery) {
                    abort(409, 'An invoice linked to an order with a delivery cannot be revised.');
                }
                if (count($values['lines']) !== $orderAllocations->count()) {
                    throw ValidationException::withMessages(['lines' => ['A linked order invoice revision must preserve every ordered line and quantity.']]);
                }
                foreach ($orderAllocations as $index => $allocation) {
                    $line = $values['lines'][$index];
                    if ((int) $line['product_id'] !== (int) $allocation->order_product_id
                        || (int) $line['quantity'] !== (int) $allocation->order_quantity) {
                        throw ValidationException::withMessages(['lines' => ['A linked order invoice revision must preserve each ordered product and quantity in line order.']]);
                    }
                }
            } elseif (DB::table('deliveries')->where('sales_document_id', $documentId)->exists()) {
                abort(409, 'An invoice with a delivery cannot be revised.');
            }
            $originalLines = DB::table('sales_document_lines')
                ->where('sales_document_id', $documentId)
                ->orderBy('line_number')
                ->lockForUpdate()
                ->get();
            $posting = DB::table('sales_document_postings')
                ->where('sales_document_id', $documentId)
                ->lockForUpdate()
                ->first();
            if ($posting === null || $posting->inventory_movement_id === null) {
                throw new RuntimeException('The posted invoice has no inventory movement to reverse.');
            }
            $oldMovement = DB::table('inventory_movements')
                ->where('id', $posting->inventory_movement_id)
                ->lockForUpdate()
                ->first();
            if ($oldMovement === null || $oldMovement->status !== 'posted') {
                throw new RuntimeException('The invoice inventory movement is missing or has already been reversed.');
            }
            $oldMovementLines = DB::table('inventory_movement_lines')
                ->where('inventory_movement_id', $oldMovement->id)
                ->orderBy('line_number')
                ->lockForUpdate()
                ->get();
            if ($oldMovementLines->isEmpty()) {
                throw new RuntimeException('The invoice inventory movement has no lines to reverse.');
            }

            $actor = $this->actor($request);
            $reversalLines = [];
            foreach ($oldMovementLines as $movementLine) {
                if ($movementLine->from_location_id === null || $movementLine->unit_cost_egp_snapshot === null) {
                    throw new RuntimeException('An invoice inventory movement line cannot be safely reversed.');
                }
                $reversalLines[] = [
                    'sales_document_line_id' => (int) $movementLine->sales_document_line_id,
                    'product_id' => (int) $movementLine->product_id,
                    'warehouse_id' => (int) $movementLine->from_location_id,
                    'quantity' => (int) $movementLine->quantity,
                    'unit_cost_egp' => (string) $movementLine->unit_cost_egp_snapshot,
                    'reversal_of_movement_line_id' => (int) $movementLine->id,
                ];
            }
            $this->inventory->receiveSalesDocument(
                $documentId,
                $reversalLines,
                $values['issue_date'],
                'Invoice revision: '.$values['reason'],
                $request,
                'reversal',
                'sales_document_reversal',
                (int) $oldMovement->id,
            );
            DB::table('inventory_movements')->where('id', $oldMovement->id)->update([
                'status' => 'reversed',
                'updated_at' => now(),
            ]);
            DB::table('sales_documents')->where('id', $documentId)->update([
                'status' => 'reversed',
                'reversed_by_user_id' => $actor->id,
                'reversed_at' => now(),
                'reversal_reason' => $values['reason'],
                'updated_at' => now(),
            ]);
            $this->outbox->recordPostedDocument('sales_document_reversal', $documentId, [
                'reversal_date' => $values['issue_date'],
                'reason' => $values['reason'],
                'actor_id' => (int) $actor->id,
            ]);

            $invoiceValues = $values;
            unset($invoiceValues['reason']);
            $newDocumentId = $this->createInvoice($request, $invoiceValues);
            DB::table('sales_documents')->where('id', $newDocumentId)->update([
                'previous_revision_id' => $documentId,
                'revision_number' => (int) $original->revision_number + 1,
            ]);
            if ($orderAllocations->isNotEmpty()) {
                $newLines = DB::table('sales_document_lines')
                    ->where('sales_document_id', $newDocumentId)
                    ->orderBy('line_number')
                    ->get(['id']);
                foreach ($orderAllocations as $index => $allocation) {
                    DB::table('sales_order_invoice_allocations')
                        ->where('id', $allocation->id)
                        ->update(['sales_document_line_id' => $newLines[$index]->id]);
                }
            }
            $this->postInvoice($request, $newDocumentId, false);
            $this->reversePartnerInvoiceAccrual(
                $request,
                $documentId,
                $newDocumentId,
                'invoice-revision:'.$documentId.':'.$newDocumentId,
                $values['reason'],
            );

            $carriedAllocations = $this->reverseInvoiceAllocations($request, $documentId, $values['reason']);
            if ((int) $original->customer_id === (int) $values['customer_id']) {
                $this->correctInvoicePaymentAccounts($request, $documentId, $carriedAllocations, $values['payment_account_changes'] ?? []);
                $this->reapplyInvoiceAllocations($request, $newDocumentId, $carriedAllocations);
                $this->updatePaidAmountSnapshot($newDocumentId);
            } elseif (($values['payment_account_changes'] ?? []) !== []) {
                throw ValidationException::withMessages(['payment_account_changes' => ['Payment accounts can only be corrected when the invoice customer remains the same.']]);
            }
            $this->recordInvoiceFieldChanges($request, $newDocumentId, (array) $original, $originalLines, $values['reason']);
            $this->recordCreditLimitWarning($request, (int) $original->customer_id, $newDocumentId);
            $this->auditLog->record($request, 'sales_document.invoice_revised', 'sales_document', $newDocumentId, $values['reason'], [
                'previous_document_id' => $documentId,
                'previous_status' => 'posted',
            ], [
                'document_id' => $newDocumentId,
                'status' => 'posted',
                'revision_number' => (int) $original->revision_number + 1,
                'carried_allocation_count' => count($carriedAllocations),
            ]);

            return ['data' => $this->invoiceResource($newDocumentId, $request)];
        });
    }

    /**
     * @return array<string, mixed>
     */
    public function cancelInvoice(Request $request, int $documentId, string $reason): array
    {
        return $this->runIdempotent($request, 'sales_document', function () use ($request, $documentId, $reason): array {
            $document = DB::table('sales_documents')->where('id', $documentId)->lockForUpdate()->first();
            abort_if($document === null, 404);
            if ($document->document_type !== 'invoice' || $document->status !== 'posted') {
                abort(409, 'Only a posted invoice can be cancelled.');
            }
            if ($document->issuer_type === 'partner' && $document->issuer_partner_id !== null) {
                DB::table('partners')->where('id', $document->issuer_partner_id)->lockForUpdate()->first(['id']);
            }
            if (DB::table('sales_documents')
                ->where('original_document_id', $documentId)
                ->where('document_type', 'credit_note')
                ->where('status', 'posted')
                ->exists()) {
                abort(409, 'An invoice with posted returns cannot be cancelled.');
            }
            $linkedOrderIds = DB::table('sales_order_invoice_allocations as allocation')
                ->join('sales_order_lines as order_line', 'order_line.id', '=', 'allocation.sales_order_line_id')
                ->join('sales_document_lines as document_line', 'document_line.id', '=', 'allocation.sales_document_line_id')
                ->where('document_line.sales_document_id', $documentId)
                ->distinct()
                ->orderBy('order_line.sales_order_id')
                ->pluck('order_line.sales_order_id')
                ->map(static fn ($id): int => (int) $id)
                ->values();
            $reopenOrderIds = DB::table('sales_orders')
                ->whereIn('id', $linkedOrderIds)
                ->where('status', 'fulfilled')
                ->orderBy('id')
                ->lockForUpdate()
                ->pluck('id')
                ->map(static fn ($id): int => (int) $id)
                ->values();
            if (DB::table('deliveries')
                ->where('sales_document_id', $documentId)
                ->orWhereIn('sales_order_id', $linkedOrderIds)
                ->exists()) {
                abort(409, 'An invoice linked to a delivery cannot be cancelled.');
            }
            $posting = DB::table('sales_document_postings')
                ->where('sales_document_id', $documentId)
                ->lockForUpdate()
                ->first();
            if ($posting === null || $posting->inventory_movement_id === null) {
                throw new RuntimeException('The posted invoice has no inventory movement to reverse.');
            }
            $movement = DB::table('inventory_movements')
                ->where('id', $posting->inventory_movement_id)
                ->lockForUpdate()
                ->first();
            if ($movement === null || $movement->status !== 'posted') {
                throw new RuntimeException('The invoice inventory movement is missing or has already been reversed.');
            }
            $movementLines = DB::table('inventory_movement_lines')
                ->where('inventory_movement_id', $movement->id)
                ->orderBy('line_number')
                ->lockForUpdate()
                ->get();
            $reversalLines = [];
            foreach ($movementLines as $line) {
                if ($line->from_location_id === null || $line->unit_cost_egp_snapshot === null) {
                    throw new RuntimeException('An invoice inventory movement line cannot be safely reversed.');
                }
                $reversalLines[] = [
                    'sales_document_line_id' => (int) $line->sales_document_line_id,
                    'product_id' => (int) $line->product_id,
                    'warehouse_id' => (int) $line->from_location_id,
                    'quantity' => (int) $line->quantity,
                    'unit_cost_egp' => (string) $line->unit_cost_egp_snapshot,
                    'reversal_of_movement_line_id' => (int) $line->id,
                ];
            }
            $actor = $this->actor($request);
            $reversal = $this->inventory->receiveSalesDocument(
                $documentId,
                $reversalLines,
                now()->toDateString(),
                'Invoice cancellation: '.$reason,
                $request,
                'reversal',
                'sales_document_reversal',
                (int) $movement->id,
            );
            $this->reversePartnerInvoiceAccrual(
                $request,
                $documentId,
                $documentId,
                'invoice-cancel:'.$documentId,
                $reason,
            );
            DB::table('inventory_movements')->where('id', $movement->id)->update([
                'status' => 'reversed',
                'updated_at' => now(),
            ]);
            $carriedAllocations = $this->reverseInvoiceAllocations($request, $documentId, $reason);
            DB::table('sales_documents')->where('id', $documentId)->update([
                'status' => 'cancelled',
                'reversed_by_user_id' => $actor->id,
                'reversed_at' => now(),
                'reversal_reason' => $reason,
                'updated_at' => now(),
            ]);
            $this->outbox->recordPostedDocument('sales_document_reversal', $documentId, [
                'reversal_date' => now()->toDateString(),
                'reason' => $reason,
                'actor_id' => (int) $actor->id,
            ]);
            if ($reopenOrderIds->isNotEmpty()) {
                DB::table('sales_orders')
                    ->whereIn('id', $reopenOrderIds)
                    ->where('status', 'fulfilled')
                    ->update(['status' => 'confirmed', 'updated_at' => now()]);
                foreach ($reopenOrderIds as $linkedOrderId) {
                    $orderLines = DB::table('sales_order_lines')
                        ->where('sales_order_id', $linkedOrderId)
                        ->orderBy('line_number')
                        ->lockForUpdate()
                        ->get();
                    $reservation = $this->orderReservations->reserve($request, (int) $linkedOrderId, $orderLines);
                    $this->auditLog->record($request, 'sales_order.invoice_cancelled', 'sales_order', (int) $linkedOrderId, $reason, [
                        'status' => 'fulfilled',
                        'sales_document_id' => $documentId,
                    ], [
                        'status' => 'confirmed',
                        'sales_document_id' => $documentId,
                        'reservation_count' => $reservation['reservation_count'],
                        'quantity_reserved' => $reservation['quantity_reserved'],
                    ]);
                }
            }
            $this->auditLog->record($request, 'sales_document.invoice_cancelled', 'sales_document', $documentId, $reason, [
                'status' => 'posted',
                'inventory_movement_id' => $movement->id,
            ], [
                'status' => 'cancelled',
                'reversal_movement_id' => $reversal['movement_id'],
                'unapplied_allocation_count' => count($carriedAllocations),
            ]);

            return ['data' => $this->invoiceResource($documentId, $request)];
        });
    }

    /** Restore a cancelled invoice by posting a new linked revision; history is never deleted. */
    public function restoreInvoice(Request $request, int $documentId): array
    {
        return $this->runIdempotent($request, 'sales_document', function () use ($request, $documentId): array {
            $original = DB::table('sales_documents')->where('id', $documentId)->lockForUpdate()->first();
            abort_if($original === null, 404);
            if ($original->document_type !== 'invoice' || $original->status !== 'cancelled') {
                abort(409, 'Only a cancelled invoice can be restored.');
            }
            if (DB::table('sales_documents')->where('previous_revision_id', $documentId)->exists()) {
                abort(409, 'This invoice already has a restored revision.');
            }
            if ($original->issuer_type === 'partner' && $original->issuer_partner_id !== null) {
                DB::table('partners')->where('id', $original->issuer_partner_id)->lockForUpdate()->first(['id']);
            }
            $originalLines = DB::table('sales_document_lines')->where('sales_document_id', $documentId)->orderBy('line_number')->get();
            if ($originalLines->isEmpty()) {
                throw new RuntimeException('The cancelled invoice has no lines to restore.');
            }
            $newDocumentId = $this->createInvoice($request, [
                'customer_id' => (int) $original->customer_id,
                'issue_date' => (string) $original->issue_date,
                'due_date' => $original->due_date,
                'issuer_type' => (string) $original->issuer_type,
                'issuer_partner_id' => $original->issuer_partner_id === null ? null : (int) $original->issuer_partner_id,
                'issuer_driver_id' => $original->issuer_driver_id === null ? null : (int) $original->issuer_driver_id,
                'issuer_company' => $original->issuer_company_snapshot,
                'payment_terms' => $original->payment_terms,
                'shipping_driver_id' => $original->shipping_driver_id,
                'shipping_driver_name' => $original->shipping_driver_name_snapshot,
                'shipping_company' => $original->shipping_company_snapshot,
                'governorate' => $original->governorate_snapshot,
                'notes' => $original->notes,
                'lines' => $originalLines->map(static fn (object $line): array => [
                    'product_id' => (int) $line->product_id,
                    'warehouse_id' => (int) $line->location_id,
                    'quantity' => (int) $line->quantity,
                    'unit_price_egp' => (string) $line->unit_price,
                    // Preserve the effective issued discount, including any invoice-level
                    // discount allocation that was stored on this line.
                    'discount_amount_egp' => (string) $line->discount_amount,
                    'description' => (string) $line->description_snapshot,
                ])->all(),
            ]);
            DB::table('sales_documents')->where('id', $newDocumentId)->update([
                'previous_revision_id' => $documentId,
                'revision_number' => (int) $original->revision_number + 1,
            ]);
            $this->postInvoice($request, $newDocumentId);

            $carried = [];
            foreach (DB::table('sales_receipt_allocations as allocation')
                ->join('sales_receipts as receipt', 'receipt.id', '=', 'allocation.sales_receipt_id')
                ->where('allocation.sales_document_id', $documentId)
                ->where('receipt.receipt_type', 'collection')
                ->where('receipt.status', 'posted')
                ->orderBy('allocation.id')
                ->get(['allocation.id', 'allocation.sales_receipt_id', 'allocation.allocation_amount']) as $allocation) {
                $carried[] = [
                    'receipt_id' => (int) $allocation->sales_receipt_id,
                    'allocation_id' => (int) $allocation->id,
                    'amount_cents' => $this->toCents((string) $allocation->allocation_amount, 'allocation'),
                ];
            }
            if ($carried !== []) {
                $this->reapplyInvoiceAllocations($request, $newDocumentId, $carried);
                $this->updatePaidAmountSnapshot($newDocumentId);
            }
            $this->auditLog->record($request, 'sales_document.invoice_restored', 'sales_document', $newDocumentId, null, [
                'cancelled_document_id' => $documentId,
                'status' => 'cancelled',
            ], [
                'document_id' => $newDocumentId,
                'status' => 'posted',
                'revision_number' => (int) $original->revision_number + 1,
            ]);

            return ['data' => $this->invoiceResource($newDocumentId, $request)];
        });
    }

    /**
     * @param  array{customer_id: int, treasury_account_id: int, receipt_date: string, amount_egp: string, payment_method?: string|null, external_reference?: string|null, notes?: string|null, allocations: array<int, array{document_id: int, amount_egp: string}>}  $values
     * @return array<string, mixed>
     */
    public function recordCollection(Request $request, array $values): array
    {
        return $this->runIdempotent($request, 'sales_receipt', function () use ($request, $values): array {
            $actor = $this->actor($request);
            $customer = DB::table('customers')
                ->where('id', $values['customer_id'])
                ->where('is_active', true)
                ->lockForUpdate()
                ->first(['id']);
            if ($customer === null) {
                throw ValidationException::withMessages(['customer_id' => ['The selected customer does not exist or is inactive.']]);
            }
            $treasury = DB::table('treasury_accounts')
                ->where('id', $values['treasury_account_id'])
                ->where('is_active', true)
                ->lockForUpdate()
                ->first(['id']);
            if ($treasury === null) {
                throw ValidationException::withMessages(['treasury_account_id' => ['The selected treasury account does not exist or is inactive.']]);
            }
            $amountCents = $this->toCents($values['amount_egp'], 'amount_egp');
            if ($amountCents === '0') {
                throw ValidationException::withMessages(['amount_egp' => ['A collection amount must be greater than zero.']]);
            }
            $allocationCents = '0';
            foreach ($values['allocations'] as $allocation) {
                $amount = $this->toCents($allocation['amount_egp'], 'allocations');
                if ($amount === '0') {
                    throw ValidationException::withMessages(['allocations' => ['Allocation amounts must be greater than zero.']]);
                }
                $allocationCents = ExactMoney::add($allocationCents, $amount);
            }
            if (ExactMoney::compare($allocationCents, $amountCents) > 0) {
                throw ValidationException::withMessages(['allocations' => ['Allocations cannot exceed the collection amount.']]);
            }
            $this->assertAllocationsFitCustomerInvoices((int) $customer->id, $values['allocations']);

            $now = now();
            $receiptId = (int) DB::table('sales_receipts')->insertGetId([
                'receipt_number' => $this->nextDocumentNumber('collection', 'COL', (string) $values['receipt_date']),
                'receipt_type' => 'collection',
                'status' => 'posted',
                'customer_id' => $customer->id,
                'treasury_account_id' => $treasury->id,
                'receipt_date' => $values['receipt_date'],
                'amount' => ExactMoney::fromCents($amountCents),
                'unapplied_amount' => ExactMoney::fromCents(ExactMoney::subtract($amountCents, $allocationCents)),
                'payment_method' => $values['payment_method'] ?? null,
                'external_reference' => $values['external_reference'] ?? null,
                'notes' => $values['notes'] ?? null,
                'created_by_user_id' => $actor->id,
                'posted_by_user_id' => $actor->id,
                'posted_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            foreach ($values['allocations'] as $allocation) {
                DB::table('sales_receipt_allocations')->insert([
                    'sales_receipt_id' => $receiptId,
                    'sales_document_id' => $allocation['document_id'],
                    'allocation_amount' => ExactMoney::fromCents($this->toCents($allocation['amount_egp'], 'allocations')),
                    'created_at' => $now,
                ]);
            }
            $treasuryEntryId = $this->treasury->postTransaction($request, [
                'treasury_account_id' => (int) $treasury->id,
                'entry_type' => 'receipt',
                'direction' => 'in',
                'entry_date' => $values['receipt_date'],
                'amount_egp' => ExactMoney::fromCents($amountCents),
                'source_type' => 'sales_receipt',
                'source_id' => $receiptId,
                'description' => $values['notes'] ?? 'Customer collection',
            ]);
            DB::table('sales_receipt_postings')->insert([
                'sales_receipt_id' => $receiptId,
                'treasury_entry_id' => $treasuryEntryId,
                'created_at' => $now,
            ]);
            $this->auditLog->record($request, 'sales_receipt.collection_posted', 'sales_receipt', $receiptId, null, null, [
                'amount' => ExactMoney::fromCents($amountCents),
                'allocations' => $values['allocations'],
                'unapplied_amount' => ExactMoney::fromCents(ExactMoney::subtract($amountCents, $allocationCents)),
            ]);
            $this->outbox->recordPostedDocument('sales_receipt', $receiptId, [
                'receipt_type' => 'collection',
                'customer_id' => (int) $customer->id,
                'treasury_account_id' => (int) $treasury->id,
                'receipt_date' => $values['receipt_date'],
                'amount_egp' => ExactMoney::fromCents($amountCents),
                'unapplied_amount_egp' => ExactMoney::fromCents(ExactMoney::subtract($amountCents, $allocationCents)),
            ]);
            $this->mobileSyncEvents->recordChannelBalances($request, [(int) $treasury->id]);

            return ['data' => $this->receiptResource($receiptId)];
        });
    }

    /**
     * @param  array{allocations: array<int, array{document_id: int, amount_egp: string}>}  $values
     * @return array<string, mixed>
     */
    public function allocateCollection(Request $request, int $receiptId, array $values): array
    {
        return $this->runIdempotent($request, 'sales_receipt', function () use ($request, $receiptId, $values): array {
            $receipt = DB::table('sales_receipts')->where('id', $receiptId)->lockForUpdate()->first();
            abort_if($receipt === null, 404);
            if ($receipt->receipt_type !== 'collection' || $receipt->status !== 'posted') {
                abort(409, 'Only a posted collection can receive allocations.');
            }
            $allocationCents = '0';
            foreach ($values['allocations'] as $allocation) {
                $amount = $this->toCents($allocation['amount_egp'], 'allocations');
                if ($amount === '0') {
                    throw ValidationException::withMessages(['allocations' => ['Allocation amounts must be greater than zero.']]);
                }
                $allocationCents = ExactMoney::add($allocationCents, $amount);
            }
            if (ExactMoney::compare($allocationCents, $this->toCents((string) $receipt->unapplied_amount, 'unapplied_amount')) > 0) {
                throw ValidationException::withMessages(['allocations' => ['Allocations cannot exceed the receipt unapplied amount.']]);
            }
            $this->assertAllocationsFitCustomerInvoices((int) $receipt->customer_id, $values['allocations']);

            foreach ($values['allocations'] as $allocation) {
                $allocationId = (int) DB::table('sales_receipt_allocations')->insertGetId([
                    'sales_receipt_id' => $receiptId,
                    'sales_document_id' => $allocation['document_id'],
                    'allocation_amount' => ExactMoney::fromCents($this->toCents($allocation['amount_egp'], 'allocations')),
                    'created_at' => now(),
                ]);
                $this->outbox->recordPostedDocument('customer_receipt_allocation', $allocationId, [
                    'sales_receipt_id' => $receiptId,
                    'sales_document_id' => (int) $allocation['document_id'],
                ]);
            }
            DB::table('sales_receipts')->where('id', $receiptId)->update([
                'unapplied_amount' => ExactMoney::fromCents(ExactMoney::subtract(
                    $this->toCents((string) $receipt->unapplied_amount, 'unapplied_amount'),
                    $allocationCents,
                )),
                'updated_at' => now(),
            ]);
            $this->auditLog->record($request, 'sales_receipt.allocations_added', 'sales_receipt', $receiptId, null, [
                'unapplied_amount' => $receipt->unapplied_amount,
            ], [
                'allocations' => $values['allocations'],
                'unapplied_amount' => ExactMoney::fromCents(ExactMoney::subtract(
                    $this->toCents((string) $receipt->unapplied_amount, 'unapplied_amount'),
                    $allocationCents,
                )),
            ]);

            return ['data' => $this->receiptResource($receiptId)];
        });
    }

    /**
     * @return array<string, mixed>
     */
    public function reverseAllocation(Request $request, int $receiptId, int $allocationId, array $values): array
    {
        return $this->runIdempotent($request, 'sales_receipt', function () use ($request, $receiptId, $allocationId, $values): array {
            $receipt = DB::table('sales_receipts')->where('id', $receiptId)->lockForUpdate()->first();
            abort_if($receipt === null, 404);
            if ($receipt->receipt_type !== 'collection' || $receipt->status !== 'posted') {
                abort(409, 'Only a posted collection allocation can be reversed.');
            }
            $allocation = DB::table('sales_receipt_allocations')
                ->where('id', $allocationId)
                ->where('sales_receipt_id', $receiptId)
                ->lockForUpdate()
                ->first();
            abort_if($allocation === null, 404);

            $originalCents = $this->toCents((string) $allocation->allocation_amount, 'allocation');
            $reversedCents = '0';
            foreach (DB::table('sales_receipt_allocation_reversals')
                ->where('sales_receipt_allocation_id', $allocationId)
                ->lockForUpdate()
                ->get(['amount']) as $reversal) {
                $reversedCents = ExactMoney::add($reversedCents, $this->toCents((string) $reversal->amount, 'allocation'));
            }
            $remainingCents = ExactMoney::subtract($originalCents, $reversedCents);
            $reverseCents = isset($values['amount_egp'])
                ? $this->toCents($values['amount_egp'], 'amount_egp')
                : $remainingCents;
            if ($reverseCents === '0' || ExactMoney::compare($reverseCents, $remainingCents) > 0) {
                throw ValidationException::withMessages(['amount_egp' => ['The reversal amount must be positive and no greater than the active allocation.']]);
            }
            $unappliedBefore = $this->toCents((string) $receipt->unapplied_amount, 'unapplied_amount');
            $unappliedAfter = ExactMoney::add($unappliedBefore, $reverseCents);
            if (ExactMoney::compare($unappliedAfter, $this->toCents((string) $receipt->amount, 'amount')) > 0) {
                throw new RuntimeException('The allocation reversal would make unapplied amount exceed the receipt amount.');
            }
            $actor = $this->actor($request);
            $reversalId = (int) DB::table('sales_receipt_allocation_reversals')->insertGetId([
                'sales_receipt_allocation_id' => $allocationId,
                'amount' => ExactMoney::fromCents($reverseCents),
                'reason' => $values['reason'],
                'actor_user_id' => $actor->id,
                'reversed_at' => now(),
                'created_at' => now(),
            ]);
            $this->outbox->recordPostedDocument('customer_receipt_allocation_reversal', $reversalId, [
                'sales_receipt_id' => $receiptId,
                'allocation_id' => $allocationId,
                'reason' => $values['reason'],
            ]);
            DB::table('sales_receipts')->where('id', $receiptId)->update([
                'unapplied_amount' => ExactMoney::fromCents($unappliedAfter),
                'updated_at' => now(),
            ]);
            $this->auditLog->record($request, 'sales_receipt.allocation_reversed', 'sales_receipt', $receiptId, $values['reason'], [
                'allocation_id' => $allocationId,
                'unapplied_amount' => $receipt->unapplied_amount,
            ], [
                'reversed_amount' => ExactMoney::fromCents($reverseCents),
                'unapplied_amount' => ExactMoney::fromCents($unappliedAfter),
            ]);

            return ['data' => $this->receiptResource($receiptId)];
        });
    }

    /**
     * @param  array{customer_id: int, issue_date: string, original_document_id?: int|null, notes?: string|null, lines: array<int, array{warehouse_id: int, quantity: int, product_id?: int, original_document_line_id?: int|null, unit_price_egp?: string, discount_amount_egp?: string, unit_cost_egp?: string, description?: string|null}>}  $values
     * @return array<string, mixed>
     */
    public function createReturn(Request $request, array $values): array
    {
        return $this->runIdempotent($request, 'sales_document', function () use ($request, $values): array {
            $this->assertFreeReturnReason($values);
            $actor = $this->actor($request);
            $issuer = $this->resolveInvoiceIssuer($values, $actor);
            $customer = DB::table('customers')
                ->where('id', $values['customer_id'])
                ->where('is_active', true)
                ->lockForUpdate()
                ->first(['id']);
            if ($customer === null) {
                throw ValidationException::withMessages(['customer_id' => ['The selected customer does not exist or is inactive.']]);
            }
            $originalDocument = null;
            if (! empty($values['original_document_id'])) {
                $originalDocument = DB::table('sales_documents')
                    ->where('id', $values['original_document_id'])
                    ->lockForUpdate()
                    ->first();
                if ($originalDocument === null
                    || $originalDocument->document_type !== 'invoice'
                    || $originalDocument->status !== 'posted'
                    || (int) $originalDocument->customer_id !== (int) $customer->id) {
                    throw ValidationException::withMessages(['original_document_id' => ['A linked return must reference a posted invoice for this customer.']]);
                }
                if ($originalDocument->issuer_type === 'partner' && $originalDocument->issuer_partner_id !== null) {
                    DB::table('partners')->where('id', $originalDocument->issuer_partner_id)->lockForUpdate()->first(['id']);
                }
            }

            $tax = $originalDocument === null ? $this->salesTaxSettings() : null;
            $returnNumber = $this->nextDocumentNumber('return', 'RET', (string) $values['issue_date']);
            $returnId = (int) DB::table('sales_documents')->insertGetId([
                'document_number' => $returnNumber,
                'document_type' => 'credit_note',
                'status' => 'draft',
                'customer_id' => $customer->id,
                'original_document_id' => $originalDocument?->id,
                'issue_date' => $values['issue_date'],
                'issuer_type' => $issuer['type'],
                'issuer_partner_id' => $issuer['partner_id'],
                'issuer_driver_id' => $issuer['driver_id'],
                'issuer_company_snapshot' => $values['issuer_company'] ?? ($issuer['type'] === 'company' ? 'ماستر' : null),
                'issuer_name_snapshot' => $issuer['name'],
                'shipping_driver_id' => $values['shipping_driver_id'] ?? null,
                'shipping_driver_name_snapshot' => $values['shipping_driver_name'] ?? null,
                'shipping_company_snapshot' => $values['shipping_company'] ?? null,
                'governorate_snapshot' => $values['governorate'] ?? null,
                'return_reason' => $values['return_reason'] ?? null,
                'return_processing_type' => $originalDocument === null ? 'free' : 'linked',
                'notes' => $values['notes'] ?? null,
                'created_by_user_id' => $actor->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $movementLines = [];
            $subtotal = '0';
            $discountTotal = '0';
            $taxTotal = '0';
            $total = '0';
            foreach ($values['lines'] as $index => $input) {
                $warehouseId = (int) $input['warehouse_id'];
                $warehouseExists = DB::table('locations')
                    ->where('id', $warehouseId)
                    ->where('is_active', true)
                    ->sharedLock()
                    ->first(['id', 'location_type']);
                if (! $warehouseExists) {
                    throw ValidationException::withMessages(['lines' => ['Every return warehouse must exist and be active.']]);
                }
                $returnCondition = $input['return_condition'] ?? 'good';
                if (($returnCondition === 'damaged' && $warehouseExists->location_type !== 'damaged')
                    || ($returnCondition === 'good' && $warehouseExists->location_type === 'damaged')) {
                    throw ValidationException::withMessages(['lines' => ['Choose a warehouse whose type matches the returned product condition.']]);
                }

                if ($originalDocument !== null) {
                    if (isset($input['product_id'])
                        || isset($input['unit_price_egp'])
                        || isset($input['discount_amount_egp'])) {
                        throw ValidationException::withMessages(['lines' => ['Linked return product and price details are taken from the source invoice.']]);
                    }
                    $originalLine = DB::table('sales_document_lines')
                        ->where('id', $input['original_document_line_id'])
                        ->where('sales_document_id', $originalDocument->id)
                        ->lockForUpdate()
                        ->first();
                    if ($originalLine === null) {
                        throw ValidationException::withMessages(['lines' => ['A linked return line must reference a line on its source invoice.']]);
                    }
                    $productId = (int) $originalLine->product_id;
                    $returnedQuantity = (int) DB::table('sales_document_lines as return_line')
                        ->join('sales_documents as return_document', 'return_document.id', '=', 'return_line.sales_document_id')
                        ->where('return_line.original_document_line_id', $originalLine->id)
                        ->where('return_document.document_type', 'credit_note')
                        ->where('return_document.status', 'posted')
                        ->sum('return_line.quantity');
                    $warehouseReturnedQuantity = (int) DB::table('warehouse_return_lines as warehouse_line')
                        ->join('warehouse_returns as warehouse_return', 'warehouse_return.id', '=', 'warehouse_line.warehouse_return_id')
                        ->join('inventory_movement_lines as source_line', 'source_line.id', '=', 'warehouse_line.source_movement_line_id')
                        ->where('source_line.sales_document_line_id', $originalLine->id)
                        ->where('warehouse_return.status', 'approved')
                        ->sum('warehouse_line.quantity');
                    if ($returnedQuantity + $warehouseReturnedQuantity + (int) $input['quantity'] > (int) $originalLine->quantity) {
                        throw ValidationException::withMessages(['lines' => ['The returned quantity exceeds the quantity sold and not yet returned.']]);
                    }
                    $priorLines = DB::table('sales_document_lines as return_line')
                        ->join('sales_documents as return_document', 'return_document.id', '=', 'return_line.sales_document_id')
                        ->where('return_line.original_document_line_id', $originalLine->id)
                        ->where('return_document.document_type', 'credit_note')
                        ->where('return_document.status', 'posted')
                        ->get(['return_line.discount_amount', 'return_line.tax_amount']);
                    $priorDiscountCents = '0';
                    $priorTaxCents = '0';
                    foreach ($priorLines as $priorLine) {
                        $priorDiscountCents = ExactMoney::add($priorDiscountCents, $this->toCents((string) $priorLine->discount_amount, 'discount_amount'));
                        $priorTaxCents = ExactMoney::add($priorTaxCents, $this->toCents((string) $priorLine->tax_amount, 'tax_amount'));
                    }
                    $cumulativeQuantity = $returnedQuantity + (int) $input['quantity'];
                    $discountCents = $this->proratedCents(
                        $this->toCents((string) $originalLine->discount_amount, 'discount_amount'),
                        $cumulativeQuantity,
                        (int) $originalLine->quantity,
                    );
                    $discountCents = ExactMoney::subtract($discountCents, $priorDiscountCents);
                    $taxCents = $this->proratedCents(
                        $this->toCents((string) $originalLine->tax_amount, 'tax_amount'),
                        $cumulativeQuantity,
                        (int) $originalLine->quantity,
                    );
                    $taxCents = ExactMoney::subtract($taxCents, $priorTaxCents);
                    $unitPriceCents = $this->toCents((string) $originalLine->unit_price, 'unit_price');
                    $taxEnabled = (bool) $originalLine->tax_enabled_snapshot;
                    $taxRate = $originalLine->tax_rate_snapshot;
                    $taxMethod = $originalLine->tax_calculation_method_snapshot;
                    $unitCost = $originalLine->unit_cost_egp_snapshot;
                    if ($unitCost === null) {
                        throw new RuntimeException('The source invoice line does not contain its issue-time cost snapshot.');
                    }
                    $costMethod = 'sold_line';
                    if (isset($input['unit_cost_egp'])) {
                        throw ValidationException::withMessages(['lines' => ['A linked return must use its sold-line cost snapshot.']]);
                    }
                    $description = $input['description'] ?? $originalLine->description_snapshot;
                    $sku = $originalLine->sku_snapshot;
                } else {
                    if (isset($input['original_document_line_id'])) {
                        throw ValidationException::withMessages(['lines' => ['A free return cannot reference a source invoice line.']]);
                    }
                    $product = DB::table('products')
                        ->where('id', $input['product_id'])
                        ->where('is_active', true)
                        ->sharedLock()
                        ->first(['id', 'sku', 'name']);
                    if ($product === null) {
                        throw ValidationException::withMessages(['lines' => ['Every free-return product must exist and be active.']]);
                    }
                    $productId = (int) $product->id;
                    $unitPriceCents = $this->toCents($input['unit_price_egp'], 'unit_price_egp');
                    $discountCents = $this->toCents($input['discount_amount_egp'] ?? '0', 'discount_amount_egp');
                    $taxEnabled = $tax['enabled'];
                    $taxRate = $tax['enabled'] ? $tax['rate'] : '0.000000';
                    $taxMethod = $tax['enabled'] ? $tax['calculation_method'] : null;
                    $gross = ExactMoney::multiply($unitPriceCents, (int) $input['quantity']);
                    if (ExactMoney::compare($discountCents, $gross) > 0) {
                        throw ValidationException::withMessages(['lines' => ['A return discount cannot exceed its extended price.']]);
                    }
                    $taxable = ExactMoney::subtract($gross, $discountCents);
                    $taxCents = $taxEnabled
                        ? ExactMoney::divideRounded(
                            ExactMoney::multiply($taxable, $this->rateUnits((string) $taxRate)),
                            $taxMethod === 'inclusive' ? 100_000_000 + $this->rateUnits((string) $taxRate) : 100_000_000,
                        )
                        : '0';
                    $currentBalance = DB::table('inventory_balances')
                        ->where('product_id', $productId)
                        ->where('location_id', $warehouseId)
                        ->lockForUpdate()
                        ->first(['quantity_on_hand', 'average_unit_cost_egp']);
                    if ($currentBalance !== null && (int) $currentBalance->quantity_on_hand > 0) {
                        $unitCost = (string) $currentBalance->average_unit_cost_egp;
                        $costMethod = 'warehouse_current_average';
                        if (isset($input['unit_cost_egp'])) {
                            throw ValidationException::withMessages(['lines' => ['Manual cost is allowed only when the return warehouse has no cost history.']]);
                        }
                    } else {
                        $historicalCost = $this->lastHistoricalWarehouseAverage($productId, $warehouseId);
                        if ($historicalCost !== null) {
                            $unitCost = $historicalCost;
                            $costMethod = 'warehouse_historical_average';
                            if (isset($input['unit_cost_egp'])) {
                                throw ValidationException::withMessages(['lines' => ['Manual cost is allowed only when the return warehouse has no cost history.']]);
                            }
                        } else {
                            if (! isset($input['unit_cost_egp'])) {
                                throw ValidationException::withMessages(['lines' => ['An owner-entered unit cost is required when a free return has no warehouse cost history.']]);
                            }
                            $unitCost = ExactMoney::fromCents($this->toCents($input['unit_cost_egp'], 'unit_cost_egp'));
                            $costMethod = 'owner_entered';
                        }
                    }
                    $description = $input['description'] ?? $product->name;
                    $sku = $product->sku;
                }

                $grossCents = ExactMoney::multiply($unitPriceCents, (int) $input['quantity']);
                $taxableCents = ExactMoney::subtract($grossCents, $discountCents);
                $lineTotalCents = $taxEnabled && $taxMethod === 'exclusive'
                    ? ExactMoney::add($taxableCents, $taxCents)
                    : $taxableCents;
                $lineId = (int) DB::table('sales_document_lines')->insertGetId([
                    'sales_document_id' => $returnId,
                    'line_number' => $index + 1,
                    'product_id' => $productId,
                    'location_id' => $warehouseId,
                    'original_document_line_id' => $originalDocument === null ? null : $originalLine->id,
                    'return_cost_method_snapshot' => $costMethod,
                    'return_condition' => $returnCondition,
                    'unit_cost_egp_snapshot' => $unitCost,
                    'company_price_egp_snapshot' => $originalDocument === null ? null : $originalLine->company_price_egp_snapshot,
                    'container_number_snapshot' => $originalDocument === null ? null : $originalLine->container_number_snapshot,
                    'description_snapshot' => $description,
                    'sku_snapshot' => $sku,
                    'quantity' => $input['quantity'],
                    'unit_price' => ExactMoney::fromCents($unitPriceCents),
                    'discount_amount' => ExactMoney::fromCents($discountCents),
                    'tax_enabled_snapshot' => $taxEnabled,
                    'tax_rate_snapshot' => $taxRate,
                    'tax_calculation_method_snapshot' => $taxMethod,
                    'tax_amount' => ExactMoney::fromCents($taxCents),
                    'line_total' => ExactMoney::fromCents($lineTotalCents),
                    'created_at' => now(),
                ]);
                $subtotal = ExactMoney::add($subtotal, $grossCents);
                $discountTotal = ExactMoney::add($discountTotal, $discountCents);
                $taxTotal = ExactMoney::add($taxTotal, $taxCents);
                $total = ExactMoney::add($total, $lineTotalCents);
                $movementLines[] = [
                    'sales_document_line_id' => $lineId,
                    'product_id' => $productId,
                    'warehouse_id' => $warehouseId,
                    'quantity' => (int) $input['quantity'],
                    'unit_cost_egp' => $unitCost,
                ];
            }

            return $this->finishReturn(
                $request,
                $returnId,
                $returnNumber,
                $movementLines,
                $values['issue_date'],
                $originalDocument === null ? null : (int) $originalDocument->id,
                (int) $actor->id,
                $subtotal,
                $discountTotal,
                $taxTotal,
                $total,
            );
        });
    }

    /**
     * @param  array{customer_id: int, original_document_id?: int|null, lines: array<int, array<string, mixed>>}  $values
     * @return array<string, mixed>
     */
    public function previewReturn(array $values): array
    {
        $this->assertFreeReturnReason($values);
        $customerExists = DB::table('customers')
            ->where('id', $values['customer_id'])
            ->where('is_active', true)
            ->exists();
        if (! $customerExists) {
            throw ValidationException::withMessages(['customer_id' => ['The selected customer does not exist or is inactive.']]);
        }
        $originalDocument = null;
        if (! empty($values['original_document_id'])) {
            $originalDocument = DB::table('sales_documents')
                ->where('id', $values['original_document_id'])
                ->where('document_type', 'invoice')
                ->where('status', 'posted')
                ->where('customer_id', $values['customer_id'])
                ->first();
            if ($originalDocument === null) {
                throw ValidationException::withMessages(['original_document_id' => ['A linked return must reference a posted invoice for this customer.']]);
            }
        }
        $tax = $originalDocument === null ? $this->salesTaxSettings() : null;
        $subtotal = '0';
        $discountTotal = '0';
        $taxTotal = '0';
        $grandTotal = '0';
        $lines = [];
        foreach ($values['lines'] as $index => $input) {
            $warehouseExists = DB::table('locations')->where('id', $input['warehouse_id'])->where('is_active', true)->exists();
            if (! $warehouseExists) {
                throw ValidationException::withMessages(['lines' => ['Every return warehouse must exist and be active.']]);
            }
            if ($originalDocument !== null) {
                if (isset($input['product_id']) || isset($input['unit_price_egp']) || isset($input['discount_amount_egp']) || isset($input['unit_cost_egp'])) {
                    throw ValidationException::withMessages(['lines' => ['Linked return product and price details are taken from the source invoice.']]);
                }
                $source = DB::table('sales_document_lines')
                    ->where('id', $input['original_document_line_id'])
                    ->where('sales_document_id', $originalDocument->id)
                    ->first();
                if ($source === null) {
                    throw ValidationException::withMessages(['lines' => ['A linked return line must reference a line on its source invoice.']]);
                }
                $previous = DB::table('sales_document_lines as returned')
                    ->join('sales_documents as document', 'document.id', '=', 'returned.sales_document_id')
                    ->where('returned.original_document_line_id', $source->id)
                    ->where('document.document_type', 'credit_note')
                    ->where('document.status', 'posted')
                    ->get(['returned.quantity', 'returned.discount_amount', 'returned.tax_amount']);
                $returnedQuantity = 0;
                $priorDiscount = '0';
                $priorTax = '0';
                foreach ($previous as $row) {
                    $returnedQuantity += (int) $row->quantity;
                    $priorDiscount = ExactMoney::add($priorDiscount, $this->toCents((string) $row->discount_amount, 'discount_amount'));
                    $priorTax = ExactMoney::add($priorTax, $this->toCents((string) $row->tax_amount, 'tax_amount'));
                }
                $warehouseReturnedQuantity = (int) DB::table('warehouse_return_lines as warehouse_line')
                    ->join('warehouse_returns as warehouse_return', 'warehouse_return.id', '=', 'warehouse_line.warehouse_return_id')
                    ->join('inventory_movement_lines as source_line', 'source_line.id', '=', 'warehouse_line.source_movement_line_id')
                    ->where('source_line.sales_document_line_id', $source->id)
                    ->where('warehouse_return.status', 'approved')
                    ->sum('warehouse_line.quantity');
                if ($returnedQuantity + $warehouseReturnedQuantity + (int) $input['quantity'] > (int) $source->quantity) {
                    throw ValidationException::withMessages(['lines' => ['The returned quantity exceeds the quantity sold and not yet returned.']]);
                }
                $cumulative = $returnedQuantity + (int) $input['quantity'];
                $discount = ExactMoney::subtract(
                    $this->proratedCents($this->toCents((string) $source->discount_amount, 'discount_amount'), $cumulative, (int) $source->quantity),
                    $priorDiscount,
                );
                $lineTax = ExactMoney::subtract(
                    $this->proratedCents($this->toCents((string) $source->tax_amount, 'tax_amount'), $cumulative, (int) $source->quantity),
                    $priorTax,
                );
                $unitPrice = $this->toCents((string) $source->unit_price, 'unit_price');
                $productId = (int) $source->product_id;
                $sku = $source->sku_snapshot;
                $name = $source->description_snapshot;
                $taxEnabled = (bool) $source->tax_enabled_snapshot;
                $taxMethod = $source->tax_calculation_method_snapshot;
            } else {
                $product = DB::table('products')
                    ->where('id', $input['product_id'])
                    ->where('is_active', true)
                    ->first(['id', 'sku', 'name']);
                if ($product === null) {
                    throw ValidationException::withMessages(['lines' => ['Every free-return product must exist and be active.']]);
                }
                $unitPrice = $this->toCents($input['unit_price_egp'], 'unit_price_egp');
                $discount = $this->toCents($input['discount_amount_egp'] ?? '0', 'discount_amount_egp');
                $gross = ExactMoney::multiply($unitPrice, (int) $input['quantity']);
                if (ExactMoney::compare($discount, $gross) > 0) {
                    throw ValidationException::withMessages(['lines' => ['A return discount cannot exceed its extended price.']]);
                }
                $taxEnabled = $tax['enabled'];
                $taxMethod = $tax['enabled'] ? $tax['calculation_method'] : null;
                $rateUnits = $tax['enabled'] ? $this->rateUnits((string) $tax['rate']) : 0;
                $lineTax = $tax['enabled']
                    ? ExactMoney::divideRounded(
                        ExactMoney::multiply(ExactMoney::subtract($gross, $discount), $rateUnits),
                        $taxMethod === 'inclusive' ? 100_000_000 + $rateUnits : 100_000_000,
                    )
                    : '0';
                $productId = (int) $product->id;
                $sku = $product->sku;
                $name = $input['description'] ?? $product->name;
                $warehouseBalance = DB::table('inventory_balances')
                    ->where('product_id', $productId)
                    ->where('location_id', $input['warehouse_id'])
                    ->first(['quantity_on_hand']);
                if ($warehouseBalance !== null && (int) $warehouseBalance->quantity_on_hand > 0) {
                    if (isset($input['unit_cost_egp'])) {
                        throw ValidationException::withMessages(['lines' => ['Manual cost is allowed only when the return warehouse has no cost history.']]);
                    }
                } elseif ($this->lastHistoricalWarehouseAverage($productId, (int) $input['warehouse_id']) !== null) {
                    if (isset($input['unit_cost_egp'])) {
                        throw ValidationException::withMessages(['lines' => ['Manual cost is allowed only when the return warehouse has no cost history.']]);
                    }
                } elseif (! isset($input['unit_cost_egp'])) {
                    throw ValidationException::withMessages(['lines' => ['An owner-entered unit cost is required when a free return has no warehouse cost history.']]);
                } else {
                    $this->toCents($input['unit_cost_egp'], 'unit_cost_egp');
                }
            }
            $gross = ExactMoney::multiply($unitPrice, (int) $input['quantity']);
            if (ExactMoney::compare($discount, $gross) > 0) {
                throw ValidationException::withMessages(['lines' => ['A return discount cannot exceed its extended price.']]);
            }
            $lineTaxable = ExactMoney::subtract($gross, $discount);
            $lineTotal = $taxEnabled && $taxMethod === 'exclusive'
                ? ExactMoney::add($lineTaxable, $lineTax)
                : $lineTaxable;
            $subtotal = ExactMoney::add($subtotal, $gross);
            $discountTotal = ExactMoney::add($discountTotal, $discount);
            $taxTotal = ExactMoney::add($taxTotal, $lineTax);
            $grandTotal = ExactMoney::add($grandTotal, $lineTotal);
            $lines[] = [
                'line_number' => $index + 1,
                'product_id' => $productId,
                'sku' => $sku,
                'description' => $name,
                'warehouse_id' => (int) $input['warehouse_id'],
                'quantity' => (int) $input['quantity'],
                'unit_price_egp' => ExactMoney::fromCents($unitPrice),
                'discount_amount_egp' => ExactMoney::fromCents($discount),
                'tax_amount_egp' => ExactMoney::fromCents($lineTax),
                'line_total_egp' => ExactMoney::fromCents($lineTotal),
            ];
        }

        return [
            'lines' => $lines,
            'subtotal_egp' => ExactMoney::fromCents($subtotal),
            'discount_amount_egp' => ExactMoney::fromCents($discountTotal),
            'tax_amount_egp' => ExactMoney::fromCents($taxTotal),
            'grand_total_egp' => ExactMoney::fromCents($grandTotal),
            'warnings' => [],
        ];
    }

    /** @param array<string, mixed> $values */
    private function assertFreeReturnReason(array $values): void
    {
        if (! empty($values['original_document_id'])) return;
        $reason = trim((string) ($values['return_reason'] ?? ''));
        if (mb_strlen($reason) < 3 || mb_strlen($reason) > 500) {
            throw ValidationException::withMessages([
                'return_reason' => ['A free return requires a reason between 3 and 500 characters.'],
            ]);
        }
    }

    /**
     * @return array<int, array{receipt_id: int, allocation_id: int, amount_cents: string}>
     */
    private function reverseInvoiceAllocations(Request $request, int $documentId, string $reason): array
    {
        $actor = $this->actor($request);
        $allocations = DB::table('sales_receipt_allocations as allocation')
            ->join('sales_receipts as receipt', 'receipt.id', '=', 'allocation.sales_receipt_id')
            ->where('allocation.sales_document_id', $documentId)
            ->where('receipt.receipt_type', 'collection')
            ->where('receipt.status', 'posted')
            ->orderBy('receipt.id')
            ->orderBy('allocation.id')
            ->lockForUpdate()
            ->get(['allocation.id', 'allocation.sales_receipt_id', 'allocation.allocation_amount']);
        $carried = [];
        foreach ($allocations as $allocation) {
            $originalCents = $this->toCents((string) $allocation->allocation_amount, 'allocation');
            $alreadyReversed = '0';
            foreach (DB::table('sales_receipt_allocation_reversals')
                ->where('sales_receipt_allocation_id', $allocation->id)
                ->lockForUpdate()
                ->get(['amount']) as $reversal) {
                $alreadyReversed = ExactMoney::add($alreadyReversed, $this->toCents((string) $reversal->amount, 'allocation'));
            }
            if (ExactMoney::compare($alreadyReversed, $originalCents) > 0) {
                throw new RuntimeException('Receipt allocation reversals exceed the original allocation.');
            }
            $activeCents = ExactMoney::subtract($originalCents, $alreadyReversed);
            if ($activeCents === '0') {
                continue;
            }
            $receipt = DB::table('sales_receipts')->where('id', $allocation->sales_receipt_id)->lockForUpdate()->first();
            if ($receipt === null) {
                throw new RuntimeException('An allocated receipt disappeared while reversing an invoice.');
            }
            $unappliedBefore = $this->toCents((string) $receipt->unapplied_amount, 'unapplied_amount');
            $unappliedAfter = ExactMoney::add($unappliedBefore, $activeCents);
            if (ExactMoney::compare($unappliedAfter, $this->toCents((string) $receipt->amount, 'amount')) > 0) {
                throw new RuntimeException('Invoice allocation reversal would exceed the receipt amount.');
            }
            $reversalId = (int) DB::table('sales_receipt_allocation_reversals')->insertGetId([
                'sales_receipt_allocation_id' => $allocation->id,
                'amount' => ExactMoney::fromCents($activeCents),
                'reason' => $reason,
                'actor_user_id' => $actor->id,
                'reversed_at' => now(),
                'created_at' => now(),
            ]);
            $this->outbox->recordPostedDocument('customer_receipt_allocation_reversal', $reversalId, [
                'sales_receipt_id' => (int) $receipt->id,
                'allocation_id' => (int) $allocation->id,
                'reason' => $reason,
            ]);
            DB::table('sales_receipts')->where('id', $receipt->id)->update([
                'unapplied_amount' => ExactMoney::fromCents($unappliedAfter),
                'updated_at' => now(),
            ]);
            $this->auditLog->record($request, 'sales_receipt.allocation_reversed', 'sales_receipt', (int) $receipt->id, $reason, [
                'allocation_id' => (int) $allocation->id,
                'amount' => (string) $allocation->allocation_amount,
                'unapplied_amount' => (string) $receipt->unapplied_amount,
            ], [
                'reversed_amount' => ExactMoney::fromCents($activeCents),
                'unapplied_amount' => ExactMoney::fromCents($unappliedAfter),
            ]);
            $carried[] = [
                'receipt_id' => (int) $receipt->id,
                'allocation_id' => (int) $allocation->id,
                'amount_cents' => $activeCents,
            ];
        }

        return $carried;
    }

    /**
     * @param  array<int, array{receipt_id: int, allocation_id: int, amount_cents: string}>  $carried
     */
    private function reapplyInvoiceAllocations(Request $request, int $documentId, array $carried): void
    {
        $document = DB::table('sales_documents')->where('id', $documentId)->first(['customer_id', 'total_amount']);
        if ($document === null) {
            throw new RuntimeException('The revised invoice disappeared before allocations could be transferred.');
        }
        $remainingInvoice = $this->toCents((string) $document->total_amount, 'total_amount');
        foreach ($carried as $item) {
            $receipt = DB::table('sales_receipts')->where('id', $item['receipt_id'])->lockForUpdate()->first();
            if ($receipt === null || $receipt->status !== 'posted' || $receipt->receipt_type !== 'collection') {
                throw new RuntimeException('An invoice allocation source receipt is no longer available.');
            }
            $available = $this->toCents((string) $receipt->unapplied_amount, 'unapplied_amount');
            $amount = ExactMoney::compare($item['amount_cents'], $remainingInvoice) < 0
                ? $item['amount_cents']
                : $remainingInvoice;
            if (ExactMoney::compare($amount, $available) > 0) {
                throw new RuntimeException('A receipt does not have enough unapplied balance to restore an invoice allocation.');
            }
            if ($amount === '0') {
                continue;
            }
            $newAllocationId = (int) DB::table('sales_receipt_allocations')->insertGetId([
                'sales_receipt_id' => $receipt->id,
                'sales_document_id' => $documentId,
                'allocation_amount' => ExactMoney::fromCents($amount),
                'created_at' => now(),
            ]);
            $this->outbox->recordPostedDocument('customer_receipt_allocation', $newAllocationId, [
                'sales_receipt_id' => (int) $receipt->id,
                'sales_document_id' => $documentId,
            ]);
            $unappliedAfter = ExactMoney::subtract($available, $amount);
            DB::table('sales_receipts')->where('id', $receipt->id)->update([
                'unapplied_amount' => ExactMoney::fromCents($unappliedAfter),
                'updated_at' => now(),
            ]);
            $this->auditLog->record($request, 'sales_receipt.allocation_transferred', 'sales_receipt', (int) $receipt->id, null, [
                'previous_document_id' => $this->previousRevisionId($documentId),
                'unapplied_amount' => (string) $receipt->unapplied_amount,
            ], [
                'sales_document_id' => $documentId,
                'allocation_amount' => ExactMoney::fromCents($amount),
                'source_allocation_id' => $item['allocation_id'],
                'unapplied_amount' => ExactMoney::fromCents($unappliedAfter),
            ]);
            $remainingInvoice = ExactMoney::subtract($remainingInvoice, $amount);
        }
    }

    private function previousRevisionId(int $documentId): ?int
    {
        $previousId = DB::table('sales_documents')->where('id', $documentId)->value('previous_revision_id');

        return $previousId === null ? null : (int) $previousId;
    }

    /**
     * @param  array<string, mixed>  $original
     * @param  iterable<object>  $originalLines
     */
    private function recordInvoiceFieldChanges(Request $request, int $newDocumentId, array $original, iterable $originalLines, string $reason): void
    {
        $newDocument = (array) DB::table('sales_documents')->where('id', $newDocumentId)->first();
        $headerFields = [
            'customer_id', 'issue_date', 'due_date', 'notes', 'subtotal', 'discount_amount',
            'discount_type', 'discount_value', 'payment_terms', 'tax_amount', 'total_amount',
            'issuer_user_id', 'issuer_name_snapshot', 'issuer_type', 'issuer_partner_id',
            'issuer_driver_id', 'issuer_company_snapshot', 'shipping_driver_id',
            'shipping_driver_name_snapshot', 'shipping_company_snapshot', 'governorate_snapshot',
        ];
        $changes = [];
        foreach ($headerFields as $field) {
            if (($original[$field] ?? null) !== ($newDocument[$field] ?? null)) {
                $changes[] = [$field, $original[$field] ?? null, $newDocument[$field] ?? null];
            }
        }

        $oldByLine = [];
        foreach ($originalLines as $line) {
            $oldByLine[(int) $line->line_number] = (array) $line;
        }
        $newByLine = [];
        foreach (DB::table('sales_document_lines')->where('sales_document_id', $newDocumentId)->orderBy('line_number')->get() as $line) {
            $newByLine[(int) $line->line_number] = (array) $line;
        }
        $lineFields = [
            'product_id', 'location_id', 'original_document_line_id', 'return_cost_method_snapshot',
            'unit_cost_egp_snapshot', 'description_snapshot', 'sku_snapshot', 'quantity', 'unit_price',
            'discount_amount', 'manual_discount_amount', 'company_price_egp_snapshot',
            'product_category_snapshot', 'tax_enabled_snapshot', 'tax_rate_snapshot', 'tax_calculation_method_snapshot',
            'tax_amount', 'line_total',
        ];
        foreach (array_unique([...array_keys($oldByLine), ...array_keys($newByLine)]) as $lineNumber) {
            foreach ($lineFields as $field) {
                $oldValue = $oldByLine[$lineNumber][$field] ?? null;
                $newValue = $newByLine[$lineNumber][$field] ?? null;
                if ($oldValue !== $newValue) {
                    $changes[] = ["lines.{$lineNumber}.{$field}", $oldValue, $newValue];
                }
            }
        }
        if ($changes === []) {
            throw ValidationException::withMessages(['lines' => ['A revision must change at least one invoice field.']]);
        }

        $actor = $this->actor($request);
        foreach ($changes as [$field, $oldValue, $newValue]) {
            DB::table('audit_logs')->insert([
                'actor_user_id' => $actor->id,
                'actor_name_snapshot' => $actor->display_name,
                'sales_document_id' => $newDocumentId,
                'field_path' => $field,
                'old_value' => json_encode($oldValue, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE),
                'new_value' => json_encode($newValue, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE),
                'action' => 'sales_document.field_change',
                'entity_type' => 'sales_document',
                'entity_id' => $newDocumentId,
                'reason' => $reason,
                'request_id' => $request->attributes->get('request_id'),
                'created_at' => now(),
            ]);
        }
    }

    private function finishReturn(
        Request $request,
        int $returnId,
        string $returnNumber,
        array $movementLines,
        string $issueDate,
        ?int $originalDocumentId,
        int $actorId,
        string $subtotal,
        string $discountTotal,
        string $taxTotal,
        string $total,
    ): array {
        $movement = $this->inventory->receiveSalesDocument(
            $returnId,
            $movementLines,
            $issueDate,
            'Customer return '.$returnNumber,
            $request,
        );
        $now = now();
        DB::table('sales_document_postings')->insert([
            'sales_document_id' => $returnId,
            'inventory_movement_id' => $movement['movement_id'],
            'created_at' => $now,
        ]);
        DB::table('sales_documents')->where('id', $returnId)->update([
            'status' => 'posted',
            'subtotal' => ExactMoney::fromCents($subtotal),
            'discount_amount' => ExactMoney::fromCents($discountTotal),
            'tax_amount' => ExactMoney::fromCents($taxTotal),
            'total_amount' => ExactMoney::fromCents($total),
            'posted_by_user_id' => $actorId,
            'posted_at' => $now,
            'updated_at' => $now,
        ]);
        if ($originalDocumentId !== null) {
            $this->recordPartnerReturnReversal($request, $returnId, $originalDocumentId);
        }
        $this->auditLog->record($request, 'sales_document.return_posted', 'sales_document', $returnId, null, null, [
            'original_document_id' => $originalDocumentId,
            'inventory_movement_id' => $movement['movement_id'],
            'line_count' => count($movementLines),
            'total_amount' => ExactMoney::fromCents($total),
        ]);
        $this->outbox->recordPostedDocument('sales_document', $returnId, [
            'document_type' => 'return',
            'original_document_id' => $originalDocumentId,
            'issue_date' => $issueDate,
            'total_amount_egp' => ExactMoney::fromCents($total),
        ]);

        return ['data' => $this->invoiceResource($returnId, $request)];
    }

    /**
     * @return array<string, mixed>
     */
    public function invoiceResource(int $documentId, Request $request): array
    {
        $document = DB::table('sales_documents')->where('id', $documentId)->first();
        abort_if($document === null, 404);
        $customer = DB::table('customers')->where('id', $document->customer_id)->first(['name', 'phone', 'governorate']);
        $document->customer_name = $document->customer_name_snapshot ?? $customer?->name;
        $document->original_invoice_number = $document->original_document_id === null
            ? null
            : DB::table('sales_documents')->where('id', $document->original_document_id)->value('document_number');
        $document->customer_phone = $document->customer_phone_snapshot ?? $customer?->phone;
        $document->customer_governorate = $document->customer_governorate_snapshot ?? $customer?->governorate;
        $settlement = $this->invoiceSettlement($document);
        $document->paid_egp = $settlement['paid_egp'];
        $document->remaining_egp = $settlement['remaining_egp'];
        $document->payment_status = $settlement['payment_status'];
        $document->is_overdue = $settlement['is_overdue'];
        $lines = DB::table('sales_document_lines as line')
            ->leftJoin('products as product', 'product.id', '=', 'line.product_id')
            ->leftJoin('locations as location', 'location.id', '=', 'line.location_id')
            ->where('line.sales_document_id', $documentId)
            ->orderBy('line.line_number')
            ->get([
                'line.*',
                DB::raw("COALESCE(product.name, line.description_snapshot, CONCAT('Product ', line.product_id)) as product_name"),
                'location.name as warehouse_name',
            ]);
        if ($document->document_type === 'invoice' && $lines->isNotEmpty()) {
            $lineIds = $lines->pluck('id')->map(static fn ($id): int => (int) $id)->all();
            $returnedByLine = DB::table('sales_document_lines as return_line')
                ->join('sales_documents as return_document', 'return_document.id', '=', 'return_line.sales_document_id')
                ->whereIn('return_line.original_document_line_id', $lineIds)
                ->where('return_document.document_type', 'credit_note')
                ->where('return_document.status', 'posted')
                ->groupBy('return_line.original_document_line_id')
                ->selectRaw('return_line.original_document_line_id, SUM(return_line.quantity) as returned_quantity')
                ->pluck('returned_quantity', 'original_document_line_id');
            $warehouseReturnedByLine = DB::table('warehouse_return_lines as warehouse_line')
                ->join('warehouse_returns as warehouse_return', 'warehouse_return.id', '=', 'warehouse_line.warehouse_return_id')
                ->join('inventory_movement_lines as source_line', 'source_line.id', '=', 'warehouse_line.source_movement_line_id')
                ->whereIn('source_line.sales_document_line_id', $lineIds)
                ->where('warehouse_return.status', 'approved')
                ->groupBy('source_line.sales_document_line_id')
                ->selectRaw('source_line.sales_document_line_id, SUM(warehouse_line.quantity) as returned_quantity')
                ->pluck('returned_quantity', 'source_line.sales_document_line_id');
            $lines->each(static function (object $line) use ($returnedByLine, $warehouseReturnedByLine): void {
                $returned = (int) ($returnedByLine[$line->id] ?? 0) + (int) ($warehouseReturnedByLine[$line->id] ?? 0);
                $line->returned_quantity = $returned;
                $line->remaining_quantity = max(0, (int) $line->quantity - $returned);
            });
        }
        $paymentAllocations = $this->hasPermission($request, 'treasury.view')
            ? $this->invoicePaymentAllocations($documentId)
            : [];
        if (! $this->hasPermission($request, 'costs.view')) {
            $lines->each(static function (object $line): void {
                unset($line->unit_cost_egp_snapshot, $line->company_price_egp_snapshot);
            });
        }

        return [
            'document' => $document,
            'lines' => $lines,
            'payment_allocations' => $paymentAllocations,
            'customer_balance' => $this->customerBalance((int) $document->customer_id),
            'credit_limit_warning' => $this->creditLimitExceeded((int) $document->customer_id),
        ];
    }

    /** @return array<int, array{receipt_id: int, receipt_number: string, receipt_date: string, treasury_account_id: int, treasury_account_name: string, amount_egp: string}> */
    private function invoicePaymentAllocations(int $documentId): array
    {
        $allocations = DB::table('sales_receipt_allocations as allocation')
            ->join('sales_receipts as receipt', 'receipt.id', '=', 'allocation.sales_receipt_id')
            ->join('treasury_accounts as account', 'account.id', '=', 'receipt.treasury_account_id')
            ->where('allocation.sales_document_id', $documentId)
            ->where('receipt.receipt_type', 'collection')
            ->where('receipt.status', 'posted')
            ->orderBy('receipt.id')
            ->get([
                'allocation.id as allocation_id',
                'allocation.sales_receipt_id as receipt_id',
                'allocation.allocation_amount',
                'receipt.receipt_number',
                'receipt.receipt_date',
                'receipt.treasury_account_id',
                'account.name as treasury_account_name',
            ]);
        $byReceipt = [];
        foreach ($allocations as $allocation) {
            $reversed = '0';
            foreach (DB::table('sales_receipt_allocation_reversals')
                ->where('sales_receipt_allocation_id', $allocation->allocation_id)
                ->pluck('amount') as $amount) {
                $reversed = ExactMoney::add($reversed, $this->toCents((string) $amount, 'allocation_reversal'));
            }
            $active = ExactMoney::subtract(
                $this->toCents((string) $allocation->allocation_amount, 'allocation'),
                $reversed,
            );
            if (ExactMoney::compare($active, '0') <= 0) continue;
            $receiptId = (int) $allocation->receipt_id;
            $byReceipt[$receiptId] ??= [
                'receipt_id' => $receiptId,
                'receipt_number' => (string) $allocation->receipt_number,
                'receipt_date' => (string) $allocation->receipt_date,
                'treasury_account_id' => (int) $allocation->treasury_account_id,
                'treasury_account_name' => (string) $allocation->treasury_account_name,
                'amount_cents' => '0',
            ];
            $byReceipt[$receiptId]['amount_cents'] = ExactMoney::add($byReceipt[$receiptId]['amount_cents'], $active);
        }

        return array_map(static fn (array $item): array => [
            'receipt_id' => $item['receipt_id'],
            'receipt_number' => $item['receipt_number'],
            'receipt_date' => $item['receipt_date'],
            'treasury_account_id' => $item['treasury_account_id'],
            'treasury_account_name' => $item['treasury_account_name'],
            'amount_egp' => ExactMoney::fromCents($item['amount_cents']),
        ], array_values($byReceipt));
    }

    /**
     * Correct changed account selections with balanced treasury transfers. A receipt shared
     * with other invoices is rejected so this revision cannot move another invoice's cash.
     *
     * @param array<int, array{receipt_id: int, allocation_id: int, amount_cents: string}> $carried
     * @param array<int, array{receipt_id: int, treasury_account_id: int}> $changes
     */
    private function correctInvoicePaymentAccounts(Request $request, int $oldDocumentId, array $carried, array $changes): void
    {
        if ($changes === []) return;
        if (! $this->hasPermission($request, 'treasury.view')) {
            abort(403, 'The treasury.view permission is required to correct invoice payment accounts.');
        }
        $activeByReceipt = [];
        foreach ($carried as $allocation) {
            $receiptId = $allocation['receipt_id'];
            $activeByReceipt[$receiptId] = ExactMoney::add($activeByReceipt[$receiptId] ?? '0', $allocation['amount_cents']);
        }
        foreach ($changes as $change) {
            $receiptId = (int) $change['receipt_id'];
            if (! isset($activeByReceipt[$receiptId])) {
                throw ValidationException::withMessages(['payment_account_changes' => ['A payment account change must refer to an active receipt allocated to this invoice.']]);
            }
            $receipt = DB::table('sales_receipts')->where('id', $receiptId)->lockForUpdate()->first();
            abort_if($receipt === null || $receipt->status !== 'posted' || $receipt->receipt_type !== 'collection', 409);
            $amount = $this->toCents((string) $receipt->amount, 'receipt_amount');
            $unapplied = $this->toCents((string) $receipt->unapplied_amount, 'unapplied_amount');
            if (ExactMoney::compare($unapplied, $amount) !== 0
                || ExactMoney::compare($activeByReceipt[$receiptId], $amount) !== 0) {
                throw ValidationException::withMessages(['payment_account_changes' => ['A receipt shared with another invoice or with an unapplied remainder cannot change accounts here.']]);
            }
            $targetId = (int) $change['treasury_account_id'];
            if ((int) $receipt->treasury_account_id === $targetId) continue;
            $target = DB::table('treasury_accounts')->where('id', $targetId)->where('is_active', true)->lockForUpdate()->first(['id']);
            if ($target === null) {
                throw ValidationException::withMessages(['payment_account_changes' => ['Select an active treasury account.']]);
            }
            $this->treasury->postTransfer($request, [
                'transfer_date' => now()->toDateString(),
                'from_treasury_account_id' => (int) $receipt->treasury_account_id,
                'to_treasury_account_id' => $targetId,
                'amount_egp' => ExactMoney::fromCents($amount),
                'notes' => 'تصحيح حساب تحصيل الإيصال '.$receipt->receipt_number.' عند مراجعة الفاتورة '.$oldDocumentId,
            ]);
            DB::table('sales_receipts')->where('id', $receiptId)->update([
                'treasury_account_id' => $targetId,
                'updated_at' => now(),
            ]);
            unset($activeByReceipt[$receiptId]);
        }
    }

    /** @return array{paid_egp: string, remaining_egp: string, payment_status: string, is_overdue: bool} */
    public function invoiceSettlement(object $document): array
    {
        if ($document->document_type === 'credit_note') {
            return ['paid_egp' => '0.00', 'remaining_egp' => '0.00', 'payment_status' => 'return', 'is_overdue' => false];
        }
        if ($document->status !== 'posted') {
            return [
                'paid_egp' => '0.00',
                'remaining_egp' => ExactMoney::fromCents($this->toCents((string) ($document->total_amount ?? '0'), 'invoice_total')),
                'payment_status' => (string) $document->status,
                'is_overdue' => false,
            ];
        }

        $paid = '0';
        $allocations = DB::table('sales_receipt_allocations as allocation')
            ->join('sales_receipts as receipt', 'receipt.id', '=', 'allocation.sales_receipt_id')
            ->where('allocation.sales_document_id', $document->id)
            ->where('receipt.receipt_type', 'collection')
            ->where('receipt.status', 'posted')
            ->get(['allocation.id', 'allocation.allocation_amount']);
        foreach ($allocations as $allocation) {
            $reversed = '0';
            foreach (DB::table('sales_receipt_allocation_reversals')
                ->where('sales_receipt_allocation_id', $allocation->id)
                ->pluck('amount') as $amount) {
                $reversed = ExactMoney::add($reversed, $this->toCents((string) $amount, 'allocation_reversal'));
            }
            $activeAllocation = ExactMoney::subtract(
                $this->toCents((string) $allocation->allocation_amount, 'allocation'),
                $reversed,
            );
            if (ExactMoney::compare($activeAllocation, '0') < 0) {
                throw new RuntimeException('Receipt allocation reversals exceed the original allocation.');
            }
            $paid = ExactMoney::add($paid, $activeAllocation);
        }

        $returned = '0';
        foreach (DB::table('sales_documents')
            ->where('original_document_id', $document->id)
            ->where('document_type', 'credit_note')
            ->where('status', 'posted')
            ->pluck('total_amount') as $amount) {
            $returned = ExactMoney::add($returned, $this->toCents((string) $amount, 'return_amount'));
        }
        $total = $this->toCents((string) $document->total_amount, 'invoice_total');
        $settled = ExactMoney::add($paid, $returned);
        $remaining = ExactMoney::compare($settled, $total) >= 0
            ? '0'
            : ExactMoney::subtract($total, $settled);
        $isOverdue = ExactMoney::compare($remaining, '0') > 0
            && $document->due_date !== null
            && (string) $document->due_date < now()->toDateString();
        $status = ExactMoney::compare($remaining, '0') === 0
            ? 'paid'
            : ($isOverdue ? 'overdue' : (ExactMoney::compare($paid, '0') > 0 ? 'partially_paid' : 'unpaid'));

        return [
            'paid_egp' => ExactMoney::fromCents($paid),
            'remaining_egp' => ExactMoney::fromCents($remaining),
            'payment_status' => $status,
            'is_overdue' => $isOverdue,
        ];
    }

    /**
     * @param  array<int, array{document_id: int, amount_egp: string}>  $allocations
     */
    private function assertAllocationsFitCustomerInvoices(int $customerId, array $allocations): void
    {
        $requested = [];
        foreach ($allocations as $allocation) {
            $documentId = (int) $allocation['document_id'];
            $requested[$documentId] = ExactMoney::add(
                $requested[$documentId] ?? '0',
                $this->toCents($allocation['amount_egp'], 'allocations'),
            );
        }
        $documentIds = array_keys($requested);
        sort($documentIds);
        foreach ($documentIds as $documentId) {
            $invoice = DB::table('sales_documents')
                ->where('id', $documentId)
                ->where('customer_id', $customerId)
                ->where('document_type', 'invoice')
                ->where('status', 'posted')
                ->lockForUpdate()
                ->first(['id', 'total_amount']);
            if ($invoice === null) {
                throw ValidationException::withMessages(['allocations' => ['Allocations may target only a posted invoice for this customer.']]);
            }
            $returnedCents = '0';
            foreach (DB::table('sales_documents')
                ->where('original_document_id', $invoice->id)
                ->where('document_type', 'credit_note')
                ->where('status', 'posted')
                ->get(['total_amount']) as $creditNote) {
                $returnedCents = ExactMoney::add($returnedCents, $this->toCents((string) $creditNote->total_amount, 'balance'));
            }
            $allocatedCents = '0';
            foreach (DB::table('sales_receipt_allocations as allocation')
                ->join('sales_receipts as receipt', 'receipt.id', '=', 'allocation.sales_receipt_id')
                ->where('allocation.sales_document_id', $invoice->id)
                ->where('receipt.receipt_type', 'collection')
                ->where('receipt.status', 'posted')
                ->get(['allocation.id', 'allocation.allocation_amount']) as $existing) {
                $reversed = '0';
                foreach (DB::table('sales_receipt_allocation_reversals')
                    ->where('sales_receipt_allocation_id', $existing->id)
                    ->get(['amount']) as $reversal) {
                    $reversed = ExactMoney::add($reversed, $this->toCents((string) $reversal->amount, 'balance'));
                }
                $allocationAmount = $this->toCents((string) $existing->allocation_amount, 'balance');
                if (ExactMoney::compare($reversed, $allocationAmount) > 0) {
                    throw new RuntimeException('Receipt allocation reversals exceed the original allocation.');
                }
                $allocatedCents = ExactMoney::add($allocatedCents, ExactMoney::subtract($allocationAmount, $reversed));
            }
            $invoiceCents = $this->toCents((string) $invoice->total_amount, 'balance');
            $settledCents = ExactMoney::add($returnedCents, $allocatedCents);
            if (ExactMoney::compare($settledCents, $invoiceCents) > 0) {
                throw new RuntimeException('Invoice returns and active collection allocations exceed the invoice total.');
            }
            $outstanding = ExactMoney::subtract($invoiceCents, $settledCents);
            if (ExactMoney::compare($requested[$documentId], $outstanding) > 0) {
                throw ValidationException::withMessages(['allocations' => ['An allocation exceeds the invoice balance.']]);
            }
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function receiptResource(int $receiptId): array
    {
        $receipt = DB::table('sales_receipts')->where('id', $receiptId)->first();
        abort_if($receipt === null, 404);
        $allocations = DB::table('sales_receipt_allocations')
            ->where('sales_receipt_id', $receiptId)
            ->orderBy('id')
            ->get();
        $customerBalance = $this->customerBalance((int) $receipt->customer_id);

        return [
            'receipt' => $receipt,
            'allocations' => $allocations,
            'customer_balance' => $customerBalance,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function postInvoice(Request $request, int $documentId, bool $recordCreditWarning = true): array
    {
        $document = DB::table('sales_documents')->where('id', $documentId)->lockForUpdate()->first();
        abort_if($document === null, 404);
        if ($document->document_type !== 'invoice' || $document->status !== 'draft') {
            abort(409, 'Only a draft invoice can be issued.');
        }

        $lines = DB::table('sales_document_lines')
            ->where('sales_document_id', $documentId)
            ->orderBy('line_number')
            ->lockForUpdate()
            ->get();
        if ($lines->isEmpty()) {
            throw ValidationException::withMessages(['lines' => ['An invoice requires at least one line.']]);
        }
        $tax = $this->salesTaxSettings();
        $money = $this->calculateInvoiceAmounts($lines, $tax);
        $movementLines = [];
        foreach ($lines as $line) {
            $movementLines[] = [
                'sales_document_line_id' => (int) $line->id,
                'product_id' => (int) $line->product_id,
                'warehouse_id' => (int) $line->location_id,
                'quantity' => (int) $line->quantity,
            ];
        }
        $movement = $this->inventory->issueSalesDocument(
            $documentId,
            $movementLines,
            $document->issue_date,
            'Invoice '.$document->document_number.' — issuer: '.($document->issuer_name_snapshot ?? ''),
            $request,
        );

        foreach ($lines as $line) {
            $cost = $movement['lines'][(int) $line->id];
            $product = DB::table('products')->where('id', $line->product_id)->first(['company_price', 'category_id']);
            $category = $product?->category_id === null
                ? null
                : DB::table('product_categories')->where('id', $product->category_id)->value('name');
            DB::table('sales_document_lines')->where('id', $line->id)->update([
                'unit_cost_egp_snapshot' => $cost['unit_cost_egp'],
                'company_price_egp_snapshot' => $product?->company_price,
                'container_number_snapshot' => $this->unambiguousContainerNumberSnapshot((int) $line->product_id, (int) $line->location_id),
                'product_category_snapshot' => $category,
                'tax_enabled_snapshot' => $tax['enabled'],
                'tax_rate_snapshot' => $tax['enabled'] ? $tax['rate'] : '0.000000',
                'tax_calculation_method_snapshot' => $tax['enabled'] ? $tax['calculation_method'] : null,
                'tax_amount' => $money['lines'][(int) $line->id]['tax_amount'],
                'line_total' => $money['lines'][(int) $line->id]['line_total'],
            ]);
        }

        $actor = $this->actor($request);
        DB::table('sales_document_postings')->insert([
            'sales_document_id' => $documentId,
            'inventory_movement_id' => $movement['movement_id'],
            'created_at' => now(),
        ]);
        DB::table('sales_documents')->where('id', $documentId)->update([
            'status' => 'posted',
            'issuer_user_id' => $actor->id,
            'issuer_name_snapshot' => $document->issuer_name_snapshot ?: $actor->display_name,
            'customer_name_snapshot' => DB::table('customers')->where('id', $document->customer_id)->value('name'),
            'customer_phone_snapshot' => DB::table('customers')->where('id', $document->customer_id)->value('phone'),
            'customer_governorate_snapshot' => DB::table('customers')->where('id', $document->customer_id)->value('governorate'),
            'subtotal' => $money['subtotal'],
            'discount_amount' => $money['discount'],
            'tax_amount' => $money['tax'],
            'total_amount' => $money['total'],
            'posted_by_user_id' => $actor->id,
            'posted_at' => now(),
            'updated_at' => now(),
        ]);
        $profit = $this->invoiceProfitSnapshot($documentId, (string) ($document->issuer_type ?? 'company'));
        DB::table('sales_documents')->where('id', $documentId)->update([
            'cogs_egp_snapshot' => $profit['cogs_egp'],
            'surplus_egp_snapshot' => $profit['pricing_status'] === 'priced' ? $profit['surplus_egp'] : null,
            'partner_profit_egp_snapshot' => $profit['partner_pricing_status'] === 'priced' ? $profit['partner_profit_egp'] : null,
            'company_profit_egp_snapshot' => $profit['pricing_status'] === 'priced' ? $profit['company_profit_egp'] : null,
            'profit_pricing_status' => $profit['pricing_status'],
            'updated_at' => now(),
        ]);
        $this->recordPartnerInvoiceAccrual($request, $documentId, $profit, (string) $document->issue_date);
        if ($recordCreditWarning) {
            $this->recordInvoicePayments($request, $documentId, (int) $document->customer_id, (string) $document->issue_date);
        }
        $this->updatePaidAmountSnapshot($documentId);
        $this->auditLog->record($request, 'sales_document.invoice_issued', 'sales_document', $documentId, null, ['status' => 'draft'], [
            'status' => 'posted',
            'inventory_movement_id' => $movement['movement_id'],
            'subtotal' => $money['subtotal'],
            'discount_amount' => $money['discount'],
            'tax_amount' => $money['tax'],
            'total_amount' => $money['total'],
            'issuer_type' => $document->issuer_type,
            'issuer_name' => $document->issuer_name_snapshot,
        ]);
        $this->outbox->recordPostedDocument('sales_document', $documentId, [
            'document_type' => $document->document_type,
            'customer_id' => (int) $document->customer_id,
            'issue_date' => $document->issue_date,
            'subtotal_egp' => $money['subtotal'],
            'discount_amount_egp' => $money['discount'],
            'tax_amount_egp' => $money['tax'],
            'total_amount_egp' => $money['total'],
            'issuer_name' => $document->issuer_name_snapshot,
        ]);
        if ($recordCreditWarning) {
            $this->recordCreditLimitWarning($request, (int) $document->customer_id, $documentId);
        }

        return ['data' => $this->invoiceResource($documentId, $request)];
    }

    /** @return array{pricing_status: string, partner_pricing_status: string, cogs_egp: string, surplus_egp: string, partner_profit_egp: string, company_profit_egp: string} */
    private function invoiceProfitSnapshot(int $documentId, string $issuerType): array
    {
        $lines = DB::table('sales_document_lines')->where('sales_document_id', $documentId)->orderBy('line_number')->get([
            'quantity',
            'unit_price',
            'discount_amount',
            'unit_cost_egp_snapshot',
        ]);
        $cogs = '0';
        $grossProfit = '0';
        $companyProfit = '0';
        $partnerProfit = '0';
        $priced = $lines->isNotEmpty();
        $partnerPriced = $lines->isNotEmpty();

        foreach ($lines as $line) {
            $quantity = (int) $line->quantity;
            if ($line->unit_cost_egp_snapshot === null) {
                $priced = false;
                $partnerPriced = false;
                continue;
            }
            $unitCost = $this->toCents((string) $line->unit_cost_egp_snapshot, 'unit_cost');
            $lineCost = ExactMoney::multiply($unitCost, $quantity);
            $revenue = ExactMoney::subtract(
                ExactMoney::multiply($this->toCents((string) $line->unit_price, 'unit_price'), $quantity),
                $this->toCents((string) $line->discount_amount, 'discount_amount'),
            );
            $lineProfit = $this->signedDifference($revenue, $lineCost);
            $cogs = ExactMoney::add($cogs, $lineCost);
            $grossProfit = $this->addSignedCents($grossProfit, $lineProfit);
            if ($issuerType === 'partner') {
                $partnerProfit = $this->addSignedCents($partnerProfit, $lineProfit);
            } else {
                $companyProfit = $this->addSignedCents($companyProfit, $lineProfit);
            }
        }

        return [
            'pricing_status' => $priced ? 'priced' : 'unpriced',
            'partner_pricing_status' => $partnerPriced ? 'priced' : 'unpriced',
            'cogs_egp' => ExactMoney::fromCents($cogs),
            'surplus_egp' => $this->formatSignedCents($grossProfit),
            'partner_profit_egp' => $this->formatSignedCents($partnerProfit),
            'company_profit_egp' => $this->formatSignedCents($companyProfit),
        ];
    }

    private function recordPartnerInvoiceAccrual(Request $request, int $documentId, array $profit, string $issueDate): void
    {
        $document = DB::table('sales_documents')->where('id', $documentId)->first(['issuer_type', 'issuer_partner_id']);
        if ($document === null || $document->issuer_type !== 'partner' || $document->issuer_partner_id === null
            || $profit['partner_pricing_status'] !== 'priced') {
            return;
        }
        $amountCents = $this->toCents($this->absoluteAmount($profit['partner_profit_egp']), 'partner_profit');
        if (str_starts_with($profit['partner_profit_egp'], '-')) {
            $amountCents = '-'.$amountCents;
        }
        if ($amountCents === '0') {
            return;
        }
        DB::table('partner_profit_ledger')->insert([
            'partner_id' => $document->issuer_partner_id,
            'sales_document_id' => $documentId,
            'reference_document_id' => null,
            'partner_payment_id' => null,
            'entry_type' => 'accrual',
            'amount_egp' => $this->formatSignedCents($amountCents),
            'effective_date' => $issueDate,
            'source_key' => 'invoice-accrual:'.$documentId,
            'notes' => 'Profit accrual from invoice issue.',
            'created_by_user_id' => $this->actor($request)->id,
            'created_at' => now(),
        ]);
        $this->auditLog->record($request, 'partner_profit.accrued', 'sales_document', $documentId, null, null, [
            'partner_id' => (int) $document->issuer_partner_id,
            'amount_egp' => $this->formatSignedCents($amountCents),
        ]);
    }

    private function reversePartnerInvoiceAccrual(
        Request $request,
        int $invoiceId,
        int $referenceDocumentId,
        string $sourceKey,
        string $reason,
    ): void {
        $accrual = DB::table('partner_profit_ledger')
            ->where('sales_document_id', $invoiceId)
            ->where('entry_type', 'accrual')
            ->first(['partner_id', 'amount_egp']);
        if ($accrual === null) {
            return;
        }
        if (DB::table('partner_profit_ledger')->where('source_key', $sourceKey)->exists()) {
            return;
        }
        $amount = $this->toCents((string) $accrual->amount_egp, 'partner_profit');
        $reversal = str_starts_with($amount, '-') ? substr($amount, 1) : '-'.$amount;
        DB::table('partner_profit_ledger')->insert([
            'partner_id' => $accrual->partner_id,
            'sales_document_id' => $invoiceId,
            'reference_document_id' => $referenceDocumentId,
            'partner_payment_id' => null,
            'entry_type' => 'reversal',
            'amount_egp' => $this->formatSignedCents($reversal),
            'effective_date' => now()->toDateString(),
            'source_key' => $sourceKey,
            'notes' => $reason,
            'created_by_user_id' => $this->actor($request)->id,
            'created_at' => now(),
        ]);
        $this->auditLog->record($request, 'partner_profit.reversed', 'sales_document', $invoiceId, $reason, [
            'amount_egp' => (string) $accrual->amount_egp,
        ], [
            'amount_egp' => $this->formatSignedCents($reversal),
            'reference_document_id' => $referenceDocumentId,
        ]);
    }

    private function recordPartnerReturnReversal(Request $request, int $returnId, int $originalInvoiceId): void
    {
        $invoice = DB::table('sales_documents')->where('id', $originalInvoiceId)->first([
            'issuer_type', 'issuer_partner_id',
        ]);
        if ($invoice === null || $invoice->issuer_type !== 'partner' || $invoice->issuer_partner_id === null
            || ! DB::table('partner_profit_ledger')->where('sales_document_id', $originalInvoiceId)->where('entry_type', 'accrual')->exists()) {
            return;
        }
        $reversal = '0';
        foreach (DB::table('sales_document_lines')->where('sales_document_id', $returnId)->get([
            'original_document_line_id', 'quantity', 'unit_price', 'discount_amount',
        ]) as $returnLine) {
            if ($returnLine->original_document_line_id === null) {
                continue;
            }
            $sourceLine = DB::table('sales_document_lines')->where('id', $returnLine->original_document_line_id)
                ->first(['unit_cost_egp_snapshot']);
            if ($sourceLine === null || $sourceLine->unit_cost_egp_snapshot === null) {
                continue;
            }
            $quantity = (int) $returnLine->quantity;
            $revenue = ExactMoney::subtract(
                ExactMoney::multiply($this->toCents((string) $returnLine->unit_price, 'unit_price'), $quantity),
                $this->toCents((string) $returnLine->discount_amount, 'discount_amount'),
            );
            $costValue = ExactMoney::multiply($this->toCents((string) $sourceLine->unit_cost_egp_snapshot, 'unit_cost'), $quantity);
            $reversal = $this->addSignedCents($reversal, $this->signedDifference($costValue, $revenue));
        }
        if ($reversal === '0') {
            return;
        }
        DB::table('partner_profit_ledger')->insert([
            'partner_id' => $invoice->issuer_partner_id,
            'sales_document_id' => $originalInvoiceId,
            'reference_document_id' => $returnId,
            'partner_payment_id' => null,
            'entry_type' => 'reversal',
            'amount_egp' => $this->formatSignedCents($reversal),
            'effective_date' => DB::table('sales_documents')->where('id', $returnId)->value('issue_date'),
            'source_key' => 'return-profit-reversal:'.$returnId,
            'notes' => 'Partner profit reversed for returned quantities.',
            'created_by_user_id' => $this->actor($request)->id,
            'created_at' => now(),
        ]);
        $this->auditLog->record($request, 'partner_profit.return_reversed', 'sales_document', $returnId, null, null, [
            'invoice_id' => $originalInvoiceId,
            'partner_id' => (int) $invoice->issuer_partner_id,
            'amount_egp' => $this->formatSignedCents($reversal),
        ]);
    }

    private function updatePaidAmountSnapshot(int $documentId): void
    {
        $document = DB::table('sales_documents')->where('id', $documentId)->first();
        if ($document === null || $document->document_type !== 'invoice' || $document->status !== 'posted') {
            return;
        }
        $settlement = $this->invoiceSettlement($document);
        DB::table('sales_documents')->where('id', $documentId)->update([
            'paid_amount_snapshot' => $settlement['paid_egp'],
            'updated_at' => now(),
        ]);
    }

    private function unambiguousContainerNumberSnapshot(int $productId, int $locationId): ?string
    {
        $otherInboundExists = DB::table('inventory_movement_lines as line')
            ->join('inventory_movements as movement', 'movement.id', '=', 'line.inventory_movement_id')
            ->where('line.product_id', $productId)
            ->where('line.to_location_id', $locationId)
            ->whereNull('line.container_receipt_line_id')
            ->where('movement.status', 'posted')
            ->exists();
        if ($otherInboundExists) {
            return null;
        }
        $containers = DB::table('container_receipt_lines as line')
            ->join('container_receipts as receipt', 'receipt.id', '=', 'line.container_receipt_id')
            ->join('containers as container', 'container.id', '=', 'line.container_id')
            ->join('inventory_movement_lines as movement_line', 'movement_line.container_receipt_line_id', '=', 'line.id')
            ->where('line.product_id', $productId)
            ->where('movement_line.to_location_id', $locationId)
            ->where('receipt.status', 'posted')
            ->distinct()
            ->pluck('container.container_number');

        return $containers->count() === 1 ? (string) $containers->first() : null;
    }

    private function signedDifference(string $left, string $right): string
    {
        return ExactMoney::compare($left, $right) >= 0
            ? ExactMoney::subtract($left, $right)
            : '-'.ExactMoney::subtract($right, $left);
    }

    private function addSignedCents(string $left, string $right): string
    {
        $leftNegative = str_starts_with($left, '-');
        $rightNegative = str_starts_with($right, '-');
        $leftMagnitude = $leftNegative ? substr($left, 1) : $left;
        $rightMagnitude = $rightNegative ? substr($right, 1) : $right;
        if ($leftNegative === $rightNegative) {
            $sum = ExactMoney::add($leftMagnitude, $rightMagnitude);

            return $leftNegative && $sum !== '0' ? '-'.$sum : $sum;
        }
        $comparison = ExactMoney::compare($leftMagnitude, $rightMagnitude);
        if ($comparison === 0) {
            return '0';
        }
        $larger = $comparison > 0 ? $leftMagnitude : $rightMagnitude;
        $smaller = $comparison > 0 ? $rightMagnitude : $leftMagnitude;
        $magnitude = ExactMoney::subtract($larger, $smaller);
        $negative = $comparison > 0 ? $leftNegative : $rightNegative;

        return $negative ? '-'.$magnitude : $magnitude;
    }

    private function formatSignedCents(string $cents): string
    {
        return str_starts_with($cents, '-')
            ? '-'.ExactMoney::fromCents(substr($cents, 1))
            : ExactMoney::fromCents($cents);
    }

    private function absoluteAmount(string $amount): string
    {
        return str_starts_with($amount, '-') ? substr($amount, 1) : $amount;
    }

    /**
     * Post split invoice payments in the same transaction as stock issue and
     * invoice posting, so a failed treasury leg cannot leave a half-issued sale.
     *
     * @param  array<int, array{treasury_account_id: int, amount_egp: string, payment_method?: string|null}>  $payments
     */
    private function recordInvoicePayments(Request $request, int $documentId, int $customerId, string $receiptDate): void
    {
        $payments = $request->input('payments', []);
        if (! is_array($payments) || $payments === []) {
            return;
        }

        $document = DB::table('sales_documents')->where('id', $documentId)->lockForUpdate()->first();
        abort_if($document === null || $document->status !== 'posted', 409);
        $amountTotal = '0';
        foreach ($payments as $payment) {
            $amount = $this->toCents((string) ($payment['amount_egp'] ?? ''), 'payments');
            if (ExactMoney::compare($amount, '0') <= 0) {
                throw ValidationException::withMessages(['payments' => ['Each payment amount must be greater than zero.']]);
            }
            $amountTotal = ExactMoney::add($amountTotal, $amount);
        }
        if (ExactMoney::compare($amountTotal, $this->toCents((string) $document->total_amount, 'invoice_total')) > 0) {
            throw ValidationException::withMessages(['payments' => ['Total collections cannot exceed the invoice amount.']]);
        }
        $this->assertAllocationsFitCustomerInvoices($customerId, [[
            'document_id' => $documentId,
            'amount_egp' => ExactMoney::fromCents($amountTotal),
        ]]);

        $actor = $this->actor($request);
        $accountIds = [];
        foreach ($payments as $payment) {
            $amountCents = $this->toCents((string) $payment['amount_egp'], 'payments');
            $account = DB::table('treasury_accounts')
                ->where('id', (int) $payment['treasury_account_id'])
                ->where('is_active', true)
                ->lockForUpdate()
                ->first(['id']);
            if ($account === null) {
                throw ValidationException::withMessages(['payments' => ['Select an active treasury account for each payment.']]);
            }

            $now = now();
            $receiptId = (int) DB::table('sales_receipts')->insertGetId([
                'receipt_number' => $this->nextDocumentNumber('collection', 'COL', $receiptDate),
                'receipt_type' => 'collection',
                'status' => 'posted',
                'customer_id' => $customerId,
                'treasury_account_id' => $account->id,
                'receipt_date' => $receiptDate,
                'amount' => ExactMoney::fromCents($amountCents),
                'unapplied_amount' => '0.00',
                'payment_method' => $payment['payment_method'] ?? null,
                'notes' => 'Invoice '.$document->document_number,
                'created_by_user_id' => $actor->id,
                'posted_by_user_id' => $actor->id,
                'posted_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            DB::table('sales_receipt_allocations')->insert([
                'sales_receipt_id' => $receiptId,
                'sales_document_id' => $documentId,
                'allocation_amount' => ExactMoney::fromCents($amountCents),
                'created_at' => $now,
            ]);
            $entryId = $this->treasury->postTransaction($request, [
                'treasury_account_id' => (int) $account->id,
                'entry_type' => 'receipt',
                'direction' => 'in',
                'entry_date' => $receiptDate,
                'amount_egp' => ExactMoney::fromCents($amountCents),
                'source_type' => 'sales_receipt',
                'source_id' => $receiptId,
                'description' => 'Invoice '.$document->document_number,
            ]);
            DB::table('sales_receipt_postings')->insert([
                'sales_receipt_id' => $receiptId,
                'treasury_entry_id' => $entryId,
                'created_at' => $now,
            ]);
            $this->auditLog->record($request, 'sales_receipt.collection_posted', 'sales_receipt', $receiptId, null, null, [
                'invoice_id' => $documentId,
                'amount' => ExactMoney::fromCents($amountCents),
                'treasury_account_id' => (int) $account->id,
            ]);
            $this->outbox->recordPostedDocument('sales_receipt', $receiptId, [
                'receipt_type' => 'collection',
                'customer_id' => $customerId,
                'treasury_account_id' => (int) $account->id,
                'receipt_date' => $receiptDate,
                'amount_egp' => ExactMoney::fromCents($amountCents),
            ]);
            $accountIds[] = (int) $account->id;
        }
        $this->mobileSyncEvents->recordChannelBalances($request, array_values(array_unique($accountIds)));
    }

    private function proratedCents(string $totalCents, int $part, int $whole): string
    {
        if ($part < 0 || $whole < 1 || $part > $whole) {
            throw new RuntimeException('A return quantity cannot be prorated against an invalid sold quantity.');
        }

        return $part === $whole
            ? $totalCents
            : ExactMoney::divideRounded(ExactMoney::multiply($totalCents, $part), $whole);
    }

    private function lastHistoricalWarehouseAverage(int $productId, int $warehouseId): ?string
    {
        $quantity = 0;
        $value = '0';
        $lastAverage = null;
        $lines = DB::table('inventory_movement_lines as line')
            ->join('inventory_movements as movement', 'movement.id', '=', 'line.inventory_movement_id')
            ->whereIn('movement.status', ['posted', 'reversed'])
            ->where('line.product_id', $productId)
            ->where(function ($query) use ($warehouseId): void {
                $query->where('line.from_location_id', $warehouseId)
                    ->orWhere('line.to_location_id', $warehouseId);
            })
            ->orderBy('movement.movement_date')
            ->orderBy('movement.id')
            ->orderBy('line.line_number')
            ->orderBy('line.id')
            ->get([
                'line.from_location_id',
                'line.to_location_id',
                'line.quantity',
                'line.line_cost_egp_snapshot',
            ]);

        foreach ($lines as $line) {
            if ($line->line_cost_egp_snapshot === null) {
                throw new RuntimeException('Historical stock movement is missing its line-cost snapshot.');
            }
            $lineValue = $this->toCents((string) $line->line_cost_egp_snapshot, 'inventory_value');
            if ((int) $line->to_location_id === $warehouseId) {
                $quantity += (int) $line->quantity;
                $value = ExactMoney::add($value, $lineValue);
                $lastAverage = ExactMoney::fromCents(ExactMoney::divideRounded($value, $quantity));
            }
            if ((int) $line->from_location_id === $warehouseId) {
                if ($quantity < (int) $line->quantity) {
                    throw new RuntimeException('Historical stock movements would create a negative warehouse balance.');
                }
                $average = ExactMoney::divideRounded($value, $quantity);
                $quantityAfter = $quantity - (int) $line->quantity;
                $value = ExactMoney::subtract($value, $lineValue);
                if ($quantityAfter === 0) {
                    $lastAverage = ExactMoney::fromCents($average);
                } else {
                    $lastAverage = ExactMoney::fromCents(ExactMoney::divideRounded($value, $quantityAfter));
                }
                $quantity = $quantityAfter;
            }
        }

        if ($quantity !== 0) {
            throw new RuntimeException('Historical stock movements do not reconcile with the zero-stock projection.');
        }

        return $lastAverage;
    }

    /**
     * @return array<string, mixed>
     */
    private function runIdempotent(Request $request, string $resourceType, callable $operation): array
    {
        $key = $request->header('Idempotency-Key');
        if (! is_string($key) || trim($key) === '' || mb_strlen($key) > 200) {
            throw ValidationException::withMessages(['Idempotency-Key' => ['A unique Idempotency-Key of 1 to 200 characters is required.']]);
        }
        $actor = $this->actor($request);
        $requestHash = hash('sha256', json_encode(
            ['method' => $request->method(), 'path' => $request->path(), 'input' => $request->all()],
            JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_PRESERVE_ZERO_FRACTION,
        ), true);

        return DB::transaction(function () use ($resourceType, $operation, $key, $requestHash, $actor): array {
            DB::table('users')->where('id', $actor->id)->lockForUpdate()->first(['id']);
            $record = DB::table('idempotency_records')
                ->where('user_id', $actor->id)
                ->where('idempotency_key', $key)
                ->lockForUpdate()
                ->first();
            if ($record !== null) {
                if (! hash_equals((string) $record->request_hash, $requestHash)) {
                    abort(409, 'The idempotency key was already used with a different request.');
                }
                if ($record->state !== 'completed' || $record->response_body === null) {
                    abort(409, 'The previous idempotent request is not complete.');
                }
                $response = json_decode((string) $record->response_body, true, 512, JSON_THROW_ON_ERROR);
                if (! is_array($response)) {
                    throw new RuntimeException('The stored idempotency response is invalid.');
                }

                return $response;
            }

            $recordId = (int) DB::table('idempotency_records')->insertGetId([
                'user_id' => $actor->id,
                'idempotency_key' => $key,
                'request_hash' => $requestHash,
                'state' => 'processing',
                'created_at' => now(),
            ]);
            $response = $operation();
            DB::table('idempotency_records')->where('id', $recordId)->update([
                'http_status' => 200,
                'response_body' => json_encode($response, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE),
                'resource_type' => $resourceType,
                'resource_id' => $response['data']['document']->id
                    ?? $response['data']['receipt']->id
                    ?? $response['data']['id']
                    ?? null,
                'state' => 'completed',
                'completed_at' => now(),
            ]);

            return $response;
        }, 5);
    }

    /**
     * @param  iterable<object>  $lines
     * @param  array{enabled: bool, rate: ?string, calculation_method: ?string}  $tax
     * @return array{subtotal: string, discount: string, tax: string, total: string, lines: array<int, array{tax_amount: string, line_total: string}>}
     */
    private function calculateInvoiceAmounts(iterable $lines, array $tax): array
    {
        $subtotal = '0';
        $discountTotal = '0';
        $taxTotal = '0';
        $total = '0';
        $lineAmounts = [];
        foreach ($lines as $line) {
            $gross = ExactMoney::multiply($this->toCents((string) $line->unit_price, 'lines'), (int) $line->quantity);
            $discount = $this->toCents((string) $line->discount_amount, 'lines');
            if (ExactMoney::compare($discount, $gross) > 0) {
                throw ValidationException::withMessages(['lines' => ['A line discount cannot exceed its extended price.']]);
            }
            $taxableAmount = ExactMoney::subtract($gross, $discount);
            $lineTax = '0';
            if ($tax['enabled']) {
                $rateUnits = $this->rateUnits((string) $tax['rate']);
                $numerator = ExactMoney::multiply($taxableAmount, $rateUnits);
                $denominator = $tax['calculation_method'] === 'inclusive'
                    ? 100_000_000 + $rateUnits
                    : 100_000_000;
                $lineTax = ExactMoney::divideRounded($numerator, $denominator);
            }
            $lineTotal = $tax['enabled'] && $tax['calculation_method'] === 'exclusive'
                ? ExactMoney::add($taxableAmount, $lineTax)
                : $taxableAmount;
            $subtotal = ExactMoney::add($subtotal, $gross);
            $discountTotal = ExactMoney::add($discountTotal, $discount);
            $taxTotal = ExactMoney::add($taxTotal, $lineTax);
            $total = ExactMoney::add($total, $lineTotal);
            $lineAmounts[(int) $line->id] = [
                'tax_amount' => ExactMoney::fromCents($lineTax),
                'line_total' => ExactMoney::fromCents($lineTotal),
            ];
        }

        foreach ([$subtotal, $discountTotal, $taxTotal, $total] as $amount) {
            ExactMoney::fromCents($amount);
        }

        return [
            'subtotal' => ExactMoney::fromCents($subtotal),
            'discount' => ExactMoney::fromCents($discountTotal),
            'tax' => ExactMoney::fromCents($taxTotal),
            'total' => ExactMoney::fromCents($total),
            'lines' => $lineAmounts,
        ];
    }

    /**
     * Convert an invoice-wide fixed or percentage discount into stable
     * per-line discount snapshots. The persisted line sums remain the single
     * amount used by stock, receipts, statements, and the printed invoice.
     *
     * @param  array<string, mixed>  $values
     * @return array<string, mixed>
     */
    private function applyInvoiceDiscount(array $values): array
    {
        foreach ($values['lines'] as &$line) {
            $manualDiscount = $this->toCents(
                (string) ($line['manual_discount_amount_egp'] ?? $line['discount_amount_egp'] ?? '0'),
                'lines',
            );
            $line['manual_discount_amount_egp'] = ExactMoney::fromCents($manualDiscount);
        }
        unset($line);

        $type = $values['discount_type'] ?? null;
        if ($type === null || $type === '') {
            return $values;
        }
        if (! in_array($type, ['fixed', 'percent'], true)) {
            throw ValidationException::withMessages(['discount_type' => ['Choose a fixed amount or a percentage discount.']]);
        }
        if (! isset($values['discount_value']) || ! is_string($values['discount_value'])) {
            throw ValidationException::withMessages(['discount_value' => ['Enter the invoice discount amount.']]);
        }

        $bases = [];
        $subtotal = '0';
        foreach ($values['lines'] as $index => $line) {
            $gross = ExactMoney::multiply($this->toCents((string) $line['unit_price_egp'], 'lines'), (int) $line['quantity']);
            $lineDiscount = $this->toCents((string) $line['manual_discount_amount_egp'], 'lines');
            if (ExactMoney::compare($lineDiscount, $gross) > 0) {
                throw ValidationException::withMessages(['lines' => ['A line discount cannot exceed its extended price.']]);
            }
            $base = ExactMoney::subtract($gross, $lineDiscount);
            $bases[$index] = $base;
            $subtotal = ExactMoney::add($subtotal, $base);
        }

        $value = $this->toCents($values['discount_value'], 'discount_value');
        $discount = $value;
        if ($type === 'percent') {
            if (ExactMoney::compare($value, '10000') > 0) {
                throw ValidationException::withMessages(['discount_value' => ['A percentage discount cannot exceed 100%.']]);
            }
            $discount = $subtotal === '0'
                ? '0'
                : ExactMoney::divideRounded(ExactMoney::multiply($subtotal, $value), 10000);
        }
        if (ExactMoney::compare($discount, $subtotal) > 0) {
            throw ValidationException::withMessages(['discount_value' => ['The invoice discount cannot exceed the subtotal.']]);
        }
        if (ExactMoney::compare($discount, '0') === 0) {
            return $values;
        }

        $allocated = [];
        $allocatedTotal = '0';
        foreach ($bases as $index => $base) {
            $share = $subtotal === '0'
                ? '0'
                : ExactMoney::divideRounded(ExactMoney::multiply($discount, $base), (int) $subtotal);
            $allocated[$index] = $share;
            $allocatedTotal = ExactMoney::add($allocatedTotal, $share);
        }
        if (ExactMoney::compare($allocatedTotal, $discount) > 0) {
            $excess = ExactMoney::subtract($allocatedTotal, $discount);
            foreach (array_reverse(array_keys($allocated)) as $index) {
                $deduction = ExactMoney::compare($allocated[$index], $excess) >= 0 ? $excess : $allocated[$index];
                $allocated[$index] = ExactMoney::subtract($allocated[$index], $deduction);
                $excess = ExactMoney::subtract($excess, $deduction);
                if (ExactMoney::compare($excess, '0') === 0) {
                    break;
                }
            }
        } elseif (ExactMoney::compare($allocatedTotal, $discount) < 0) {
            $remainder = ExactMoney::subtract($discount, $allocatedTotal);
            foreach ($bases as $index => $base) {
                if (ExactMoney::compare($remainder, '0') === 0) {
                    break;
                }
                $capacity = ExactMoney::subtract($base, $allocated[$index]);
                $addition = ExactMoney::compare($capacity, $remainder) >= 0 ? $remainder : $capacity;
                $allocated[$index] = ExactMoney::add($allocated[$index], $addition);
                $remainder = ExactMoney::subtract($remainder, $addition);
            }
        }

        foreach ($values['lines'] as $index => &$line) {
            $lineDiscount = $this->toCents((string) $line['manual_discount_amount_egp'], 'lines');
            $line['discount_amount_egp'] = ExactMoney::fromCents(ExactMoney::add($lineDiscount, $allocated[$index]));
        }
        unset($line);

        return $values;
    }

    /**
     * Allocate the next human-readable document number while holding the
     * per-type, per-year sequence row. Existing numbers are scanned first so
     * a sequence created after legacy UUID documents cannot collide.
     */
    private function nextDocumentNumber(string $sequenceKey, string $prefix, string $issueDate): string
    {
        $year = \Carbon\CarbonImmutable::parse($issueDate)->format('Y');
        DB::table('document_sequences')->insertOrIgnore([
            'sequence_key' => $sequenceKey,
            'period_key' => $year,
            'next_number' => 1,
            'updated_at' => now(),
        ]);
        $sequence = DB::table('document_sequences')
            ->where('sequence_key', $sequenceKey)
            ->where('period_key', $year)
            ->lockForUpdate()
            ->first();
        if ($sequence === null) {
            throw new RuntimeException('The document sequence could not be locked.');
        }

        $highestExisting = 0;
        $pattern = '/\\A'.preg_quote($prefix.'-'.$year.'-', '/').'([0-9]+)\\z/';
        $numberQuery = $sequenceKey === 'collection'
            ? DB::table('sales_receipts')->where('receipt_number', 'like', $prefix.'-'.$year.'-%')->pluck('receipt_number')
            : DB::table('sales_documents')
                ->where('document_type', $sequenceKey === 'return' ? 'credit_note' : 'invoice')
                ->where('document_number', 'like', $prefix.'-'.$year.'-%')
                ->pluck('document_number');
        foreach ($numberQuery as $number) {
            if (preg_match($pattern, (string) $number, $matches) === 1) {
                $highestExisting = max($highestExisting, (int) $matches[1]);
            }
        }

        $next = max((int) $sequence->next_number, $highestExisting + 1);
        DB::table('document_sequences')->where('id', $sequence->id)->update([
            'next_number' => $next + 1,
            'updated_at' => now(),
        ]);

        return sprintf('%s-%s-%03d', $prefix, $year, $next);
    }

    /**
     * Resolve the visible invoice issuer separately from the authenticated
     * user who created and posted the record.
     *
     * @param  array<string, mixed>  $values
     * @return array{type: string, name: string, partner_id: ?int, driver_id: ?int}
     */
    private function resolveInvoiceIssuer(array $values, object $actor): array
    {
        $type = (string) ($values['issuer_type'] ?? 'company');
        if ($type === 'company') {
            $name = trim((string) ($values['issuer_name'] ?? 'ماستر'));
            if ($name === '') {
                throw ValidationException::withMessages(['issuer_name' => ['Select a company as the invoice issuer.']]);
            }

            return ['type' => 'company', 'name' => $name, 'partner_id' => null, 'driver_id' => null];
        }
        if ($type === 'partner') {
            $partnerId = (int) ($values['issuer_partner_id'] ?? 0);
            $partner = DB::table('partners')->where('id', $partnerId)->where('status', 'active')->where('is_company_partner', true)->lockForUpdate()->first(['id', 'name']);
            if ($partner === null) {
                throw ValidationException::withMessages(['issuer_partner_id' => ['Select an active partner as the invoice issuer.']]);
            }

            return ['type' => 'partner', 'name' => (string) $partner->name, 'partner_id' => (int) $partner->id, 'driver_id' => null];
        }
        if ($type === 'driver') {
            $driverId = (int) ($values['issuer_driver_id'] ?? 0);
            $driver = DB::table('shipping_drivers')->where('id', $driverId)->where('is_active', true)->first(['id', 'name']);
            if ($driver === null) {
                throw ValidationException::withMessages(['issuer_driver_id' => ['Select an active driver as the invoice issuer.']]);
            }

            return ['type' => 'driver', 'name' => (string) $driver->name, 'partner_id' => null, 'driver_id' => (int) $driver->id];
        }

        throw ValidationException::withMessages(['issuer_type' => ['The invoice issuer type is invalid.']]);
    }

    /**
     * @return array{enabled: bool, rate: ?string, calculation_method: ?string}
     */
    private function salesTaxSettings(): array
    {
        $value = DB::table('app_settings')->where('setting_key', 'sales_tax')->value('setting_value');
        if (! is_string($value)) {
            throw new RuntimeException('The sales_tax application setting has not been seeded.');
        }
        $setting = json_decode($value, true, 512, JSON_THROW_ON_ERROR);
        if (! is_array($setting) || ! is_bool($setting['enabled'] ?? null)) {
            throw new RuntimeException('The sales_tax application setting is malformed.');
        }
        if (! $setting['enabled']) {
            return ['enabled' => false, 'rate' => null, 'calculation_method' => null];
        }
        $rate = $setting['rate'] ?? null;
        $method = $setting['calculation_method'] ?? null;
        if (! is_string($rate) || ! in_array($method, ['inclusive', 'exclusive'], true)) {
            throw ValidationException::withMessages(['sales_tax' => ['Tax is enabled but its rate or calculation method is not configured.']]);
        }
        $this->rateUnits($rate);

        return ['enabled' => true, 'rate' => $rate, 'calculation_method' => $method];
    }

    private function rateUnits(string $rate): int
    {
        if (! preg_match('/\A(?:0|[1-9][0-9]{0,2})(?:\.([0-9]{1,6}))?\z/', $rate, $matches)) {
            throw ValidationException::withMessages(['rate' => ['Tax rate must be a decimal percentage from 0 to 999.999999.']]);
        }
        $parts = explode('.', $rate, 2);
        $whole = (int) $parts[0];
        $fraction = str_pad($parts[1] ?? '', 6, '0');
        $units = ($whole * 1_000_000) + (int) $fraction;
        if ($units > 999_999_999) {
            throw ValidationException::withMessages(['rate' => ['Tax rate exceeds the supported maximum.']]);
        }

        return $units;
    }

    private function recordCreditLimitWarning(Request $request, int $customerId, int $documentId): void
    {
        $customer = DB::table('customers')->where('id', $customerId)->first(['credit_limit']);
        if ($customer === null || $customer->credit_limit === null) {
            return;
        }
        if (! $this->creditLimitExceeded($customerId)) {
            return;
        }
        $balance = $this->customerBalance($customerId);
        $this->auditLog->record($request, 'sales_document.credit_warning', 'sales_document', $documentId, null, null, [
            'credit_limit' => $customer->credit_limit,
            'customer_balance' => $balance['balance'],
        ]);
    }

    private function creditLimitExceeded(int $customerId): bool
    {
        $creditLimit = DB::table('customers')->where('id', $customerId)->value('credit_limit');
        if ($creditLimit === null) {
            return false;
        }
        $balance = $this->customerBalance($customerId)['balance'];
        if (str_starts_with($balance, '-')) {
            return false;
        }

        return ExactMoney::compare(
            $this->toCents($balance, 'balance'),
            $this->toCents((string) $creditLimit, 'credit_limit'),
        ) > 0;
    }

    /**
     * @return array{balance: string, unapplied_receipts: string}
     */
    public function customerBalance(int $customerId): array
    {
        $debits = '0';
        $credits = '0';
        foreach (DB::table('sales_documents')
            ->where('customer_id', $customerId)
            ->where('status', 'posted')
            ->get(['document_type', 'opening_balance_direction', 'total_amount']) as $document) {
            $amount = $this->toCents((string) $document->total_amount, 'balance');
            $isDebit = match ($document->document_type) {
                'invoice' => true,
                'credit_note' => false,
                'opening_receivable' => $document->opening_balance_direction === 'debit',
                default => throw new RuntimeException('Unsupported posted sales document type.'),
            };
            if ($isDebit) {
                $debits = ExactMoney::add($debits, $amount);
            } else {
                $credits = ExactMoney::add($credits, $amount);
            }
        }
        $unapplied = '0';
        foreach (DB::table('sales_receipts')
            ->where('customer_id', $customerId)
            ->where('status', 'posted')
            ->where('receipt_type', 'collection')
            ->get(['id', 'amount', 'unapplied_amount']) as $receipt) {
            $receiptAllocated = '0';
            foreach (DB::table('sales_receipt_allocations')
                ->where('sales_receipt_id', $receipt->id)
                ->get(['allocation_amount', 'id']) as $allocation) {
                $allocationCents = $this->toCents((string) $allocation->allocation_amount, 'balance');
                $reversedCents = '0';
                foreach (DB::table('sales_receipt_allocation_reversals')
                    ->where('sales_receipt_allocation_id', $allocation->id)
                    ->get(['amount']) as $reversal) {
                    $reversedCents = ExactMoney::add($reversedCents, $this->toCents((string) $reversal->amount, 'balance'));
                }
                if (ExactMoney::compare($reversedCents, $allocationCents) > 0) {
                    throw new RuntimeException('Receipt allocation reversals exceed the original allocation.');
                }
                $activeAllocation = ExactMoney::subtract($allocationCents, $reversedCents);
                $receiptAllocated = ExactMoney::add($receiptAllocated, $activeAllocation);
            }
            $storedUnapplied = $this->toCents((string) $receipt->unapplied_amount, 'balance');
            if (ExactMoney::add($storedUnapplied, $receiptAllocated) !== $this->toCents((string) $receipt->amount, 'balance')) {
                throw new RuntimeException('The receipt unapplied amount does not reconcile with its active allocations.');
            }
            $unapplied = ExactMoney::add($unapplied, $storedUnapplied);
            $credits = ExactMoney::add($credits, $receiptAllocated);
        }

        return [
            'balance' => $this->signedMoney($debits, $credits),
            'unapplied_receipts' => ExactMoney::fromCents($unapplied),
        ];
    }

    private function signedMoney(string $debits, string $credits): string
    {
        if (ExactMoney::compare($debits, $credits) >= 0) {
            return ExactMoney::fromCents(ExactMoney::subtract($debits, $credits));
        }

        return '-'.ExactMoney::fromCents(ExactMoney::subtract($credits, $debits));
    }

    private function toCents(string $amount, string $field): string
    {
        try {
            return ExactMoney::toCents($amount);
        } catch (InvalidArgumentException $exception) {
            throw ValidationException::withMessages([$field => [$exception->getMessage()]]);
        }
    }

    private function actor(Request $request): object
    {
        $actor = $request->attributes->get('authenticated_user');
        if (! is_object($actor) || ! isset($actor->id, $actor->display_name)) {
            throw new RuntimeException('An authenticated user is required for sales operations.');
        }

        return $actor;
    }

    private function hasPermission(Request $request, string $permission): bool
    {
        $actor = $request->attributes->get('authenticated_user');
        if (! is_object($actor)) {
            return false;
        }
        if (in_array($permission, ['costs.view', 'profit.view', 'markup.view'], true)
            && DB::table('user_roles as user_role')
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
            ->where('p.code', $permission)
            ->exists();
    }
}
