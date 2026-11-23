<?php

namespace App\Services;

use App\Support\ExactMoney;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class OrdersService
{
    public function __construct(
        private readonly AuditLogService $auditLog,
        private readonly OrderReservationService $reservations,
        private readonly ReportsService $reports,
    ) {}

    /**
     * @param  array{customer_id: int, lines: array<int, array{product_id: int, quantity: int, unit_price_egp: string, notes?: string|null}>}  $values
     * @return array<string, mixed>
     */
    public function previewOrder(array $values): array
    {
        $customer = DB::table('customers')
            ->where('id', $values['customer_id'])
            ->where('is_active', true)
            ->first(['id', 'credit_limit']);
        if ($customer === null) {
            throw ValidationException::withMessages(['customer_id' => ['The selected customer does not exist or is inactive.']]);
        }
        $lines = [];
        $lineBases = [];
        $requirements = [];
        foreach ($values['lines'] as $index => $input) {
            $product = DB::table('products')
                ->where('id', $input['product_id'])
                ->where('is_active', true)
                ->first(['id', 'sku', 'name']);
            if ($product === null) {
                throw ValidationException::withMessages(['lines' => ['Every order product must exist and be active.']]);
            }
            $this->validateMoney($input['unit_price_egp']);
            $priceCents = ExactMoney::toCents($input['unit_price_egp']);
            $grossCents = ExactMoney::multiply($priceCents, (int) $input['quantity']);
            $discountPercent = (string) ($input['discount_percent'] ?? '0');
            $discountBasisPoints = $this->discountBasisPoints($discountPercent);
            $discountCents = ExactMoney::divideRounded(ExactMoney::multiply($grossCents, $discountBasisPoints), 10000);
            $lines[] = [
                'line_number' => $index + 1,
                'product_id' => (int) $product->id,
                'sku' => $product->sku,
                'product_name' => $product->name,
                'quantity' => (int) $input['quantity'],
                'unit_price_egp' => ExactMoney::fromCents($priceCents),
                'discount_percent' => $this->formatDiscountPercent($discountPercent),
                'discount_amount_egp' => ExactMoney::fromCents($discountCents),
                'line_total_egp' => '0.00',
            ];
            $lineBases[] = ExactMoney::subtract($grossCents, $discountCents);
            $requirements[(int) $product->id] ??= [
                'product_id' => (int) $product->id,
                'product_name' => $product->name,
                'quantity' => 0,
            ];
            $requirements[(int) $product->id]['quantity'] += (int) $input['quantity'];
        }
        $warnings = [];
        foreach ($requirements as $requirement) {
            $available = (int) DB::table('inventory_balances')
                ->where('product_id', $requirement['product_id'])
                ->when(isset($values['warehouse_id']) && $values['warehouse_id'] !== null, fn ($query) => $query->where('location_id', $values['warehouse_id']))
                ->selectRaw('COALESCE(SUM(quantity_on_hand - quantity_reserved), 0) AS available_quantity')
                ->value('available_quantity');
            if ($available < $requirement['quantity']) {
                $warnings[] = [
                    'code' => 'insufficient_stock',
                    'product_id' => $requirement['product_id'],
                    'product_name' => $requirement['product_name'],
                    'requested_quantity' => $requirement['quantity'],
                    'available_quantity' => max(0, $available),
                ];
            }
        }
        $lineSubtotal = '0';
        foreach ($lineBases as $base) $lineSubtotal = ExactMoney::add($lineSubtotal, $base);
        $headerDiscountValue = (string) ($values['discount_value'] ?? '0');
        $this->validateMoney($headerDiscountValue);
        $headerDiscountCents = ExactMoney::toCents($headerDiscountValue);
        if (($values['discount_type'] ?? 'fixed') === 'percent') {
            if (ExactMoney::compare($headerDiscountCents, '10000') > 0) {
                throw ValidationException::withMessages(['discount_value' => ['The percentage discount cannot exceed 100%.']]);
            }
            $headerDiscountCents = $lineSubtotal === '0' ? '0' : ExactMoney::divideRounded(ExactMoney::multiply($lineSubtotal, $headerDiscountCents), 10000);
        }
        if (ExactMoney::compare($headerDiscountCents, $lineSubtotal) > 0) {
            throw ValidationException::withMessages(['discount_value' => ['The order discount cannot exceed the line total.']]);
        }
        $allocatedDiscounts = $this->allocateHeaderDiscount($lineBases, $lineSubtotal, $headerDiscountCents);
        $taxSetting = json_decode((string) DB::table('app_settings')->where('setting_key', 'sales_tax')->value('setting_value'), true);
        $taxEnabled = is_array($taxSetting) && ($taxSetting['enabled'] ?? false) === true;
        $taxRate = $taxEnabled ? (string) ($taxSetting['rate'] ?? '0') : '0.000000';
        $taxMethod = $taxEnabled ? (string) ($taxSetting['calculation_method'] ?? 'exclusive') : null;
        $rateUnits = $taxEnabled ? $this->rateUnits($taxRate) : 0;
        $grossSubtotal = '0';
        $discountTotal = $headerDiscountCents;
        $taxTotal = '0';
        $orderTotal = '0';
        foreach ($lines as $index => &$line) {
            $gross = ExactMoney::multiply(ExactMoney::toCents($line['unit_price_egp']), (int) $line['quantity']);
            $lineDiscount = ExactMoney::add(ExactMoney::toCents($line['discount_amount_egp']), $allocatedDiscounts[$index]);
            $taxable = ExactMoney::subtract($gross, $lineDiscount);
            $lineTax = $taxEnabled
                ? ExactMoney::divideRounded(ExactMoney::multiply($taxable, $rateUnits), $taxMethod === 'inclusive' ? 100_000_000 + $rateUnits : 100_000_000)
                : '0';
            $lineTotal = $taxEnabled && $taxMethod === 'exclusive' ? ExactMoney::add($taxable, $lineTax) : $taxable;
            $grossSubtotal = ExactMoney::add($grossSubtotal, $gross);
            $discountTotal = ExactMoney::add($discountTotal, ExactMoney::toCents($line['discount_amount_egp']));
            $taxTotal = ExactMoney::add($taxTotal, $lineTax);
            $orderTotal = ExactMoney::add($orderTotal, $lineTotal);
            $line['discount_amount_egp'] = ExactMoney::fromCents($lineDiscount);
            $line['line_discount_amount_egp'] = ExactMoney::fromCents(ExactMoney::subtract(
                ExactMoney::toCents($line['discount_amount_egp']),
                $allocatedDiscounts[$index],
            ));
            $line['order_discount_amount_egp'] = ExactMoney::fromCents($allocatedDiscounts[$index]);
            $line['tax_amount_egp'] = ExactMoney::fromCents($lineTax);
            $line['line_total_egp'] = ExactMoney::fromCents($lineTotal);
        }
        unset($line);
        $shippingCents = ExactMoney::toCents((string) ($values['shipping_amount_egp'] ?? '0'));
        $grandTotal = ExactMoney::add($orderTotal, $shippingCents);
        if ($customer->credit_limit !== null) {
            $balance = $this->reports->customerBalanceRows([(int) $customer->id])[(int) $customer->id]['balance'] ?? '0.00';
            $projected = ExactMoney::add(ExactMoney::toCents((string) $balance), $grandTotal);
            if (ExactMoney::compare($projected, ExactMoney::toCents((string) $customer->credit_limit)) > 0) {
                $warnings[] = [
                    'code' => 'credit_limit_exceeded',
                    'credit_limit_egp' => ExactMoney::fromCents(ExactMoney::toCents((string) $customer->credit_limit)),
                    'current_balance_egp' => ExactMoney::fromCents(ExactMoney::toCents((string) $balance)),
                ];
            }
        }

        return [
            'lines' => $lines,
            'subtotal_egp' => ExactMoney::fromCents($grossSubtotal),
            'discount_amount_egp' => ExactMoney::fromCents($discountTotal),
            'tax_amount_egp' => ExactMoney::fromCents($taxTotal),
            'tax_applied' => $taxEnabled,
            'tax_rate' => $taxRate,
            'tax_calculation_method' => $taxMethod,
            'shipping_amount_egp' => ExactMoney::fromCents($shippingCents),
            'grand_total_egp' => ExactMoney::fromCents($grandTotal),
            'warnings' => $warnings,
        ];
    }

    /**
     * @param  array{customer_id: int, order_date: string, requested_delivery_date?: string|null, notes?: string|null, lines: array<int, array{product_id: int, quantity: int, unit_price_egp: string, notes?: string|null}>}  $values
     */
    public function createOrder(Request $request, array $values): int
    {
        return DB::transaction(function () use ($request, $values): int {
            $customerExists = DB::table('customers')
                ->where('id', $values['customer_id'])
                ->where('is_active', true)
                ->exists();
            if (! $customerExists) {
                throw ValidationException::withMessages(['customer_id' => ['The selected customer does not exist or is inactive.']]);
            }
            if ($values['lines'] === []) {
                throw ValidationException::withMessages(['lines' => ['An order requires at least one line.']]);
            }
            if (isset($values['warehouse_id']) && ! DB::table('locations')->where('id', $values['warehouse_id'])->where('is_active', true)->exists()) {
                throw ValidationException::withMessages(['warehouse_id' => ['Choose an active warehouse.']]);
            }
            if (isset($values['salesperson_id']) && ! DB::table('users')->where('id', $values['salesperson_id'])->where('is_active', true)->exists()) {
                throw ValidationException::withMessages(['salesperson_id' => ['Choose an active salesperson.']]);
            }
            if (! DB::table('currency_references')->where('code', $values['currency_code'] ?? 'EGP')->where('is_active', true)->exists()) {
                throw ValidationException::withMessages(['currency_code' => ['Choose an active supported currency.']]);
            }

            $actor = $this->actor($request);
            $now = now();
            $orderId = (int) DB::table('sales_orders')->insertGetId([
                'order_number' => 'SO-'.strtoupper(str_replace('-', '', (string) Str::uuid())),
                'status' => 'draft',
                'customer_id' => $values['customer_id'],
                'salesperson_id' => $values['salesperson_id'] ?? null,
                'salesperson_name_snapshot' => isset($values['salesperson_id'])
                    ? DB::table('users')->where('id', $values['salesperson_id'])->value('display_name')
                    : null,
                'warehouse_id' => $values['warehouse_id'] ?? null,
                'currency_code' => $values['currency_code'] ?? 'EGP',
                'payment_method' => $values['payment_method'] ?? null,
                'payment_terms' => $values['payment_terms'] ?? null,
                'discount_type' => $values['discount_type'] ?? 'fixed',
                'discount_value' => $values['discount_value'] ?? '0',
                'order_date' => $values['order_date'],
                'requested_delivery_date' => $values['requested_delivery_date'] ?? null,
                'notes' => $values['notes'] ?? null,
                'created_by_user_id' => $actor->id,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            foreach ($values['lines'] as $index => $line) {
                $productExists = DB::table('products')
                    ->where('id', $line['product_id'])
                    ->where('is_active', true)
                    ->exists();
                if (! $productExists) {
                    throw ValidationException::withMessages(['lines' => ['Every order product must exist and be active.']]);
                }
                $this->validateMoney($line['unit_price_egp']);
                $grossCents = ExactMoney::multiply(ExactMoney::toCents($line['unit_price_egp']), (int) $line['quantity']);
                $discountPercent = (string) ($line['discount_percent'] ?? '0');
                $discountBasisPoints = $this->discountBasisPoints($discountPercent);
                $discountCents = ExactMoney::divideRounded(ExactMoney::multiply($grossCents, $discountBasisPoints), 10000);
                $lineTotalCents = ExactMoney::subtract($grossCents, $discountCents);
                DB::table('sales_order_lines')->insert([
                    'sales_order_id' => $orderId,
                    'line_number' => $index + 1,
                    'product_id' => $line['product_id'],
                    'quantity' => $line['quantity'],
                    'unit_price' => $line['unit_price_egp'],
                    'discount_percent' => $this->formatDiscountPercent($discountPercent),
                    'discount_amount' => ExactMoney::fromCents($discountCents),
                    'order_discount_amount' => '0.00',
                    'tax_amount' => '0.00',
                    'line_total' => ExactMoney::fromCents($lineTotalCents),
                    'notes' => $line['notes'] ?? null,
                    'created_at' => $now,
                ]);
            }
            $preview = $this->previewOrder($values);
            foreach ($preview['lines'] as $index => $previewLine) {
                DB::table('sales_order_lines')
                    ->where('sales_order_id', $orderId)
                    ->where('line_number', $index + 1)
                    ->update([
                        'order_discount_amount' => $previewLine['order_discount_amount_egp'],
                        'tax_amount' => $previewLine['tax_amount_egp'],
                        'line_total' => $previewLine['line_total_egp'],
                    ]);
            }
            DB::table('sales_orders')->where('id', $orderId)->update([
                'subtotal' => $preview['subtotal_egp'],
                'discount_amount' => $preview['discount_amount_egp'],
                'tax_amount' => $preview['tax_amount_egp'],
                'shipping_amount' => $preview['shipping_amount_egp'],
                'total_amount' => $preview['grand_total_egp'],
                'updated_at' => $now,
            ]);
            $this->auditLog->record($request, 'sales_order.created', 'sales_order', $orderId, null, null, [
                'customer_id' => $values['customer_id'],
                'line_count' => count($values['lines']),
                'order_date' => $values['order_date'],
                'salesperson_id' => $values['salesperson_id'] ?? null,
                'warehouse_id' => $values['warehouse_id'] ?? null,
                'currency_code' => $values['currency_code'] ?? 'EGP',
                'payment_method' => $values['payment_method'] ?? null,
                'total_amount' => $preview['grand_total_egp'],
            ]);

            return $orderId;
        }, 5);
    }

    /** Update an unreserved draft order without changing any posted stock or accounting history. */
    public function updateDraftOrder(Request $request, int $orderId, array $values): int
    {
        return DB::transaction(function () use ($request, $orderId, $values): int {
            $order = DB::table('sales_orders')->where('id', $orderId)->lockForUpdate()->first();
            abort_if($order === null, 404);
            if ($order->status !== 'draft') {
                abort(409, 'Only a draft sales order can be edited.');
            }
            if (DB::table('sales_order_reservations as reservation')
                ->join('sales_order_lines as line', 'line.id', '=', 'reservation.sales_order_line_id')
                ->where('line.sales_order_id', $orderId)->exists()
                || DB::table('sales_order_invoice_allocations as allocation')
                    ->join('sales_order_lines as line', 'line.id', '=', 'allocation.sales_order_line_id')
                    ->where('line.sales_order_id', $orderId)->exists()
                || DB::table('deliveries')->where('sales_order_id', $orderId)->exists()) {
                abort(409, 'An order with reservations, invoices, or deliveries cannot be edited.');
            }
            if (! DB::table('customers')->where('id', $values['customer_id'])->where('is_active', true)->exists()) {
                throw ValidationException::withMessages(['customer_id' => ['The selected customer does not exist or is inactive.']]);
            }
            if ($values['lines'] === []) {
                throw ValidationException::withMessages(['lines' => ['An order requires at least one line.']]);
            }
            if (! DB::table('locations')->where('id', $values['warehouse_id'])->where('is_active', true)->exists()) {
                throw ValidationException::withMessages(['warehouse_id' => ['Choose an active warehouse.']]);
            }
            if (isset($values['salesperson_id']) && ! DB::table('users')->where('id', $values['salesperson_id'])->where('is_active', true)->exists()) {
                throw ValidationException::withMessages(['salesperson_id' => ['Choose an active salesperson.']]);
            }

            $preview = $this->previewOrder($values);
            $now = now();
            DB::table('sales_order_lines')->where('sales_order_id', $orderId)->delete();
            foreach ($values['lines'] as $index => $line) {
                if (! DB::table('products')->where('id', $line['product_id'])->where('is_active', true)->exists()) {
                    throw ValidationException::withMessages(['lines' => ['Every order product must exist and be active.']]);
                }
                $calculated = $preview['lines'][$index];
                DB::table('sales_order_lines')->insert([
                    'sales_order_id' => $orderId,
                    'line_number' => $index + 1,
                    'product_id' => $line['product_id'],
                    'quantity' => $line['quantity'],
                    'unit_price' => $line['unit_price_egp'],
                    'discount_percent' => $line['discount_percent'] ?? '0',
                    'discount_amount' => $calculated['line_discount_amount_egp'],
                    'order_discount_amount' => $calculated['order_discount_amount_egp'],
                    'tax_amount' => $calculated['tax_amount_egp'],
                    'line_total' => $calculated['line_total_egp'],
                    'notes' => $line['notes'] ?? null,
                    'created_at' => $now,
                ]);
            }
            DB::table('sales_orders')->where('id', $orderId)->update([
                'customer_id' => $values['customer_id'],
                'salesperson_id' => $values['salesperson_id'] ?? null,
                'salesperson_name_snapshot' => isset($values['salesperson_id'])
                    ? DB::table('users')->where('id', $values['salesperson_id'])->value('display_name') : null,
                'warehouse_id' => $values['warehouse_id'],
                'currency_code' => $values['currency_code'] ?? 'EGP',
                'payment_method' => $values['payment_method'] ?? null,
                'payment_terms' => $values['payment_terms'] ?? null,
                'discount_type' => $values['discount_type'] ?? 'fixed',
                'discount_value' => $values['discount_value'] ?? '0',
                'order_date' => $values['order_date'],
                'requested_delivery_date' => $values['requested_delivery_date'] ?? null,
                'notes' => $values['notes'] ?? null,
                'subtotal' => $preview['subtotal_egp'],
                'discount_amount' => $preview['discount_amount_egp'],
                'tax_amount' => $preview['tax_amount_egp'],
                'shipping_amount' => $preview['shipping_amount_egp'],
                'total_amount' => $preview['grand_total_egp'],
                'updated_at' => $now,
            ]);
            $this->auditLog->record($request, 'sales_order.updated', 'sales_order', $orderId, null,
                ['status' => $order->status, 'total_amount' => $order->total_amount],
                ['status' => 'draft', 'total_amount' => $preview['grand_total_egp'], 'line_count' => count($values['lines'])]);

            return $orderId;
        }, 5);
    }

    /**
     * @return array{order: object, lines: mixed}
     */
    public function confirmOrder(Request $request, int $orderId): array
    {
        return DB::transaction(function () use ($request, $orderId): array {
            $order = DB::table('sales_orders')->where('id', $orderId)->lockForUpdate()->first();
            abort_if($order === null, 404);
            if ($order->status !== 'draft') {
                if ($order->status === 'confirmed'
                    && DB::table('sales_order_reservations as reservation')
                        ->join('sales_order_lines as order_line', 'order_line.id', '=', 'reservation.sales_order_line_id')
                        ->where('order_line.sales_order_id', $orderId)
                        ->exists()) {
                    return [
                        'order' => $order,
                        'lines' => DB::table('sales_order_lines')->where('sales_order_id', $orderId)->orderBy('line_number')->get(),
                        'stock_warnings' => [],
                        'reservations' => $this->reservations->forOrder($orderId),
                    ];
                }
                abort(409, 'Only a draft sales order can be confirmed.');
            }
            $lines = DB::table('sales_order_lines')
                ->where('sales_order_id', $orderId)
                ->orderBy('line_number')
                ->lockForUpdate()
                ->get();
            if ($lines->isEmpty()) {
                throw ValidationException::withMessages(['lines' => ['An order requires at least one line before confirmation.']]);
            }

            $reservation = $this->reservations->reserve($request, $orderId, $lines);

            $actor = $this->actor($request);
            DB::table('sales_orders')->where('id', $orderId)->update([
                'status' => 'confirmed',
                'confirmed_by_user_id' => $actor->id,
                'confirmed_at' => now(),
                'updated_at' => now(),
            ]);
            $this->auditLog->record($request, 'sales_order.confirmed', 'sales_order', $orderId, null, ['status' => 'draft'], [
                'status' => 'confirmed',
                'reservation_count' => $reservation['reservation_count'],
                'quantity_reserved' => $reservation['quantity_reserved'],
            ]);

            return [
                'order' => DB::table('sales_orders')->where('id', $orderId)->first(),
                'lines' => $lines,
                'stock_warnings' => [],
                'reservations' => $this->reservations->forOrder($orderId),
            ];
        }, 5);
    }

    public function cancelOrder(Request $request, int $orderId, string $reason): array
    {
        return DB::transaction(function () use ($request, $orderId, $reason): array {
            $order = DB::table('sales_orders')->where('id', $orderId)->lockForUpdate()->first();
            abort_if($order === null, 404);
            if (! in_array($order->status, ['draft', 'confirmed'], true)) {
                abort(409, 'Only a draft or confirmed order without an issued invoice can be cancelled.');
            }
            $hasInvoice = DB::table('sales_order_invoice_allocations as allocation')
                ->join('sales_order_lines as line', 'line.id', '=', 'allocation.sales_order_line_id')
                ->where('line.sales_order_id', $orderId)
                ->exists();
            $hasDelivery = DB::table('deliveries')->where('sales_order_id', $orderId)->exists();
            if ($hasInvoice || $hasDelivery) {
                abort(409, 'An order with an issued invoice or delivery cannot be cancelled.');
            }

            $reservationRelease = $this->reservations->release($request, $orderId);

            DB::table('sales_orders')->where('id', $orderId)->update([
                'status' => 'cancelled',
                'updated_at' => now(),
            ]);
            $this->auditLog->record($request, 'sales_order.cancelled', 'sales_order', $orderId, $reason, [
                'status' => $order->status,
            ], [
                'status' => 'cancelled',
                'reservation_release' => $reservationRelease,
            ]);

            return ['data' => DB::table('sales_orders')->where('id', $orderId)->first()];
        }, 5);
    }

    /** @return array<string, mixed> */
    public function orderDetail(int $orderId): array
    {
        $order = DB::table('sales_orders')
            ->join('customers as customer', 'customer.id', '=', 'sales_orders.customer_id')
            ->leftJoin('users as salesperson', 'salesperson.id', '=', 'sales_orders.salesperson_id')
            ->leftJoin('locations as warehouse', 'warehouse.id', '=', 'sales_orders.warehouse_id')
            ->where('sales_orders.id', $orderId)
            ->first([
                'sales_orders.*',
                'customer.name as customer_name',
                'customer.phone as customer_phone',
                'customer.address as customer_address',
                'customer.governorate as customer_governorate',
                'salesperson.display_name as salesperson_name',
                'warehouse.name as warehouse_name',
            ]);
        abort_if($order === null, 404);

        $lines = DB::table('sales_order_lines as order_line')
            ->join('products as product', 'product.id', '=', 'order_line.product_id')
            ->where('order_line.sales_order_id', $orderId)
            ->orderBy('order_line.line_number')
            ->get([
                'order_line.id',
                'order_line.product_id',
                'product.name as product_name',
                'product.sku',
                'order_line.quantity',
                'order_line.unit_price as unit_price_egp',
                'order_line.discount_percent',
                DB::raw('order_line.discount_amount + order_line.order_discount_amount as discount_amount_egp'),
                'order_line.tax_amount as tax_amount_egp',
                'order_line.line_total as line_total_egp',
                'order_line.notes',
            ]);
        $invoiceIds = DB::table('sales_order_invoice_allocations as allocation')
            ->join('sales_order_lines as order_line', 'order_line.id', '=', 'allocation.sales_order_line_id')
            ->join('sales_document_lines as document_line', 'document_line.id', '=', 'allocation.sales_document_line_id')
            ->where('order_line.sales_order_id', $orderId)
            ->orderBy('document_line.sales_document_id')
            ->distinct()
            ->pluck('document_line.sales_document_id')
            ->map(static fn ($id): int => (int) $id)
            ->values()
            ->all();

        return array_merge((array) $order, [
            'line_count' => $lines->count(),
            'total_egp' => (string) $order->total_amount,
            'subtotal_egp' => (string) $order->subtotal,
            'discount_amount_egp' => (string) $order->discount_amount,
            'tax_amount_egp' => (string) $order->tax_amount,
            'shipping_amount_egp' => (string) $order->shipping_amount,
            'lines' => $lines,
            'stock_warnings' => [],
            'reservations' => $this->reservations->forOrder($orderId),
            'invoice_ids' => $invoiceIds,
            'delivery_ids' => DB::table('deliveries')->where('sales_order_id', $orderId)->orderBy('id')->pluck('id')->map(static fn ($id): int => (int) $id)->all(),
        ]);
    }

    /**
     * @param  array{sales_order_id?: int|null, sales_document_id?: int|null, driver_user_id?: int|null, shipping_driver_id?: int|null, delivery_date?: string, source_location_id?: int, transport_method?: string|null, driver_name_snapshot?: string|null, vehicle_plate?: string|null, delivery_address?: string|null, notes?: string|null}  $values
     */
    public function createDelivery(Request $request, array $values): int
    {
        return DB::transaction(function () use ($request, $values): int {
            $orderId = $values['sales_order_id'] ?? null;
            $documentId = $values['sales_document_id'] ?? null;
            if (($orderId === null) === ($documentId === null)) {
                throw ValidationException::withMessages(['source' => ['A delivery must reference exactly one sales order or posted invoice.']]);
            }

            if ($orderId !== null) {
                $order = DB::table('sales_orders')->where('id', $orderId)->lockForUpdate()->first();
                abort_if($order === null, 404);
                if ($order->status !== 'fulfilled') {
                    throw ValidationException::withMessages(['sales_order_id' => ['Only a fully invoiced order can be delivered.']]);
                }
                $sourceLines = $this->orderDeliveryLines($orderId);
            } else {
                $document = DB::table('sales_documents')->where('id', $documentId)->lockForUpdate()->first();
                abort_if($document === null, 404);
                if ($document->document_type !== 'invoice' || $document->status !== 'posted') {
                    throw ValidationException::withMessages(['sales_document_id' => ['Only a posted invoice can be delivered.']]);
                }
                $sourceLines = $this->invoiceDeliveryLines((int) $documentId);
            }
            if ($sourceLines === []) {
                throw ValidationException::withMessages(['source' => ['The selected source has no posted stock lines to deliver.']]);
            }
            if (! isset($values['source_location_id'])) {
                $sourceLocationIds = array_values(array_unique(array_column($sourceLines, 'warehouse_id')));
                if (count($sourceLocationIds) !== 1) {
                    throw ValidationException::withMessages(['source_location_id' => ['Choose a warehouse because the sale contains lines from more than one warehouse.']]);
                }
                $values['source_location_id'] = (int) $sourceLocationIds[0];
            }
            $sourceLocationId = (int) $values['source_location_id'];
            $sourceLocationLines = array_values(array_filter(
                $sourceLines,
                static fn (array $line): bool => $line['warehouse_id'] === $sourceLocationId,
            ));
            if ($sourceLocationLines === []) {
                throw ValidationException::withMessages(['source_location_id' => ['The selected warehouse does not contain a source line from the selected sale.']]);
            }
            if (count($sourceLocationLines) !== count($sourceLines)) {
                throw ValidationException::withMessages(['source_location_id' => ['The sale source contains lines from more than one warehouse. Create a source invoice per warehouse before issuing its delivery permit.']]);
            }
            $sourceMovementLineIds = array_column($sourceLocationLines, 'inventory_movement_line_id');
            if (DB::table('delivery_lines')->whereIn('inventory_movement_line_id', $sourceMovementLineIds)->exists()) {
                throw ValidationException::withMessages(['source' => ['One or more posted sale movements are already assigned to a delivery permit.']]);
            }

            $shippingDriver = null;
            if (! empty($values['shipping_driver_id'])) {
                $shippingDriver = DB::table('shipping_drivers')->where('id', $values['shipping_driver_id'])->lockForUpdate()->first();
                if ($shippingDriver === null || ! (bool) $shippingDriver->is_active) {
                    throw ValidationException::withMessages(['shipping_driver_id' => ['The selected shipping driver does not exist or is inactive.']]);
                }
            }

            if (isset($values['driver_user_id']) && ! DB::table('users')->where('id', $values['driver_user_id'])->exists()) {
                throw ValidationException::withMessages(['driver_user_id' => ['The selected driver does not exist.']]);
            }

            $actor = $this->actor($request);
            $now = now();
            $deliveryId = (int) DB::table('deliveries')->insertGetId([
                'delivery_number' => 'DEL-'.strtoupper(str_replace('-', '', (string) Str::uuid())),
                'sales_order_id' => $orderId,
                'sales_document_id' => $documentId,
                'status' => 'draft',
                'driver_user_id' => $values['driver_user_id'] ?? null,
                'shipping_driver_id' => $shippingDriver?->id,
                'delivery_date' => $values['delivery_date'] ?? now()->toDateString(),
                'source_location_id' => $values['source_location_id'] ?? null,
                'transport_method' => $values['transport_method'] ?? null,
                'driver_name_snapshot' => $shippingDriver?->name ?? ($values['driver_name_snapshot'] ?? null),
                'vehicle_plate' => $values['vehicle_plate'] ?? null,
                'delivery_address' => $values['delivery_address'] ?? null,
                'notes' => $values['notes'] ?? null,
                'created_by_user_id' => $actor->id,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            foreach ($sourceLocationLines as $line) {
                DB::table('delivery_lines')->insert([
                    'delivery_id' => $deliveryId,
                    'sales_order_line_id' => $orderId === null ? null : $line['sales_order_line_id'],
                    'sales_document_line_id' => $documentId === null ? null : $line['sales_document_line_id'],
                    'product_id' => $line['product_id'],
                    'quantity' => $line['quantity'],
                    'inventory_movement_line_id' => $line['inventory_movement_line_id'],
                    'created_at' => $now,
                ]);
            }
            $this->auditLog->record($request, 'delivery.created', 'delivery', $deliveryId, null, null, [
                'sales_order_id' => $orderId,
                'sales_document_id' => $documentId,
                'line_count' => count($sourceLocationLines),
                'source_location_id' => $sourceLocationId,
            ]);

            return $deliveryId;
        }, 5);
    }

    /**
     * @return array{delivery: object, lines: mixed}
     */
    public function changeDeliveryStatus(Request $request, int $deliveryId, string $status): array
    {
        return DB::transaction(function () use ($request, $deliveryId, $status): array {
            $delivery = DB::table('deliveries')->where('id', $deliveryId)->lockForUpdate()->first();
            abort_if($delivery === null, 404);
            $allowed = match ($delivery->status) {
                'draft' => ['preparing', 'cancelled'],
                'preparing' => ['in_transit', 'cancelled'],
                'in_transit' => ['delivered'],
                default => [],
            };
            if (! in_array($status, $allowed, true)) {
                throw ValidationException::withMessages(['status' => ['The requested delivery status transition is not allowed.']]);
            }
            $stockMovementIds = [];
            if ($status === 'in_transit') {
                $invalidMovementLineExists = DB::table('delivery_lines as delivery_line')
                    ->join('inventory_movement_lines as movement_line', 'movement_line.id', '=', 'delivery_line.inventory_movement_line_id')
                    ->join('inventory_movements as movement', 'movement.id', '=', 'movement_line.inventory_movement_id')
                    ->where('delivery_line.delivery_id', $deliveryId)
                    ->where(function ($query) use ($delivery): void {
                        $query->where('movement.status', '<>', 'posted')
                            ->orWhereColumn('movement_line.quantity', '<>', 'delivery_line.quantity');
                        if ($delivery->source_location_id !== null) {
                            $query->orWhere('movement_line.from_location_id', '<>', (int) $delivery->source_location_id);
                        }
                    })
                    ->exists();
                $postedLines = DB::table('delivery_lines as delivery_line')
                    ->join('inventory_movement_lines as movement_line', 'movement_line.id', '=', 'delivery_line.inventory_movement_line_id')
                    ->join('inventory_movements as movement', 'movement.id', '=', 'movement_line.inventory_movement_id')
                    ->where('delivery_line.delivery_id', $deliveryId)
                    ->where('movement.status', 'posted')
                    ->orderBy('movement.id')->pluck('movement.id')->map(static fn ($id): int => (int) $id)->all();
                $deliveryLineCount = DB::table('delivery_lines')->where('delivery_id', $deliveryId)->count();
                if ($deliveryLineCount === 0 || count($postedLines) < $deliveryLineCount || $invalidMovementLineExists) {
                    throw ValidationException::withMessages(['status' => ['Delivery approval requires every line to match a posted sale movement from the selected source warehouse.']]);
                }
                $stockMovementIds = array_values(array_unique($postedLines));
            }
            $now = now();
            DB::table('deliveries')->where('id', $deliveryId)->update([
                'status' => $status,
                'delivered_at' => $status === 'delivered' ? $now : $delivery->delivered_at,
                'updated_at' => $now,
            ]);
            $this->auditLog->record($request, 'delivery.status_changed', 'delivery', $deliveryId, null, [
                'status' => $delivery->status,
            ], [
                'status' => $status,
                'inventory_movement_ids' => $stockMovementIds,
            ]);

            return [
                'delivery' => DB::table('deliveries')->where('id', $deliveryId)->first(),
                'lines' => DB::table('delivery_lines')->where('delivery_id', $deliveryId)->orderBy('id')->get(),
            ];
        }, 5);
    }

    public function markOrderPrinted(Request $request, int $orderId): array
    {
        return DB::transaction(function () use ($request, $orderId): array {
            $order = DB::table('sales_orders')->where('id', $orderId)->lockForUpdate()->first();
            abort_if($order === null, 404);
            DB::table('sales_orders')->where('id', $orderId)->update([
                'printed_at' => now(),
                'print_count' => (int) $order->print_count + 1,
                'updated_at' => now(),
            ]);
            $this->auditLog->record($request, 'sales_order.printed', 'sales_order', $orderId, null, [
                'print_count' => (int) $order->print_count,
            ], [
                'print_count' => (int) $order->print_count + 1,
                'printed_at' => now()->toISOString(),
            ]);

            return $this->orderDetail($orderId);
        }, 5);
    }

    private function allocateHeaderDiscount(array $bases, string $subtotal, string $discount): array
    {
        $allocated = [];
        $total = '0';
        foreach ($bases as $index => $base) {
            $allocated[$index] = $subtotal === '0' ? '0' : ExactMoney::divideRounded(ExactMoney::multiply($discount, $base), (int) $subtotal);
            $total = ExactMoney::add($total, $allocated[$index]);
        }
        if (ExactMoney::compare($total, $discount) > 0) {
            $remainder = ExactMoney::subtract($total, $discount);
            foreach (array_reverse(array_keys($allocated)) as $index) {
                $deduction = ExactMoney::compare($allocated[$index], $remainder) >= 0 ? $remainder : $allocated[$index];
                $allocated[$index] = ExactMoney::subtract($allocated[$index], $deduction);
                $remainder = ExactMoney::subtract($remainder, $deduction);
                if ($remainder === '0') break;
            }
        } elseif (ExactMoney::compare($total, $discount) < 0) {
            $remainder = ExactMoney::subtract($discount, $total);
            foreach ($bases as $index => $base) {
                if ($remainder === '0') break;
                $capacity = ExactMoney::subtract($base, $allocated[$index]);
                $addition = ExactMoney::compare($capacity, $remainder) >= 0 ? $remainder : $capacity;
                $allocated[$index] = ExactMoney::add($allocated[$index], $addition);
                $remainder = ExactMoney::subtract($remainder, $addition);
            }
        }

        return $allocated;
    }

    private function rateUnits(string $rate): int
    {
        if (! preg_match('/\A(?:0|[1-9][0-9]{0,2})(?:\.([0-9]{1,6}))?\z/', $rate, $matches)) {
            throw ValidationException::withMessages(['sales_tax' => ['The configured tax rate is invalid.']]);
        }
        $parts = explode('.', $rate, 2);

        return ((int) $parts[0] * 1_000_000) + (int) str_pad($parts[1] ?? '', 6, '0');
    }

    /**
     * @return array<int, array{sales_order_line_id: int, sales_document_line_id: int, product_id: int, quantity: int, inventory_movement_line_id: int, warehouse_id: int}>
     */
    private function orderDeliveryLines(int $orderId): array
    {
        return DB::table('sales_order_invoice_allocations as allocation')
            ->join('sales_order_lines as order_line', 'order_line.id', '=', 'allocation.sales_order_line_id')
            ->join('sales_document_lines as document_line', 'document_line.id', '=', 'allocation.sales_document_line_id')
            ->join('sales_documents as document', 'document.id', '=', 'document_line.sales_document_id')
            ->join('sales_document_postings as posting', 'posting.sales_document_id', '=', 'document_line.sales_document_id')
            ->join('inventory_movement_lines as movement_line', function ($join): void {
                $join->on('movement_line.inventory_movement_id', '=', 'posting.inventory_movement_id')
                    ->on('movement_line.sales_document_line_id', '=', 'document_line.id');
            })
            ->join('inventory_movements as movement', 'movement.id', '=', 'posting.inventory_movement_id')
            ->where('order_line.sales_order_id', $orderId)
            ->where('document.status', 'posted')
            ->where('movement.status', 'posted')
            ->whereColumn('document_line.quantity', 'allocation.quantity')
            ->orderBy('order_line.line_number')
            ->get([
                'order_line.id as sales_order_line_id',
                'document_line.id as sales_document_line_id',
                'allocation.product_id',
                'allocation.quantity',
                'movement_line.id as inventory_movement_line_id',
                'movement_line.from_location_id as warehouse_id',
            ])
            ->map(static fn (object $line): array => [
                'sales_order_line_id' => (int) $line->sales_order_line_id,
                'sales_document_line_id' => (int) $line->sales_document_line_id,
                'product_id' => (int) $line->product_id,
                'quantity' => (int) $line->quantity,
                'inventory_movement_line_id' => (int) $line->inventory_movement_line_id,
                'warehouse_id' => (int) $line->warehouse_id,
            ])
            ->all();
    }

    /**
     * @return array<int, array{sales_order_line_id: null, sales_document_line_id: int, product_id: int, quantity: int, inventory_movement_line_id: int, warehouse_id: int}>
     */
    private function invoiceDeliveryLines(int $documentId): array
    {
        return DB::table('sales_document_lines as document_line')
            ->join('sales_document_postings as posting', 'posting.sales_document_id', '=', 'document_line.sales_document_id')
            ->join('inventory_movement_lines as movement_line', function ($join): void {
                $join->on('movement_line.inventory_movement_id', '=', 'posting.inventory_movement_id')
                    ->on('movement_line.sales_document_line_id', '=', 'document_line.id');
            })
            ->join('inventory_movements as movement', 'movement.id', '=', 'posting.inventory_movement_id')
            ->where('document_line.sales_document_id', $documentId)
            ->where('movement.status', 'posted')
            ->orderBy('document_line.line_number')
            ->get([
                'document_line.id as sales_document_line_id',
                'document_line.product_id',
                'document_line.quantity',
                'movement_line.id as inventory_movement_line_id',
                'movement_line.from_location_id as warehouse_id',
            ])
            ->map(static fn (object $line): array => [
                'sales_order_line_id' => null,
                'sales_document_line_id' => (int) $line->sales_document_line_id,
                'product_id' => (int) $line->product_id,
                'quantity' => (int) $line->quantity,
                'inventory_movement_line_id' => (int) $line->inventory_movement_line_id,
                'warehouse_id' => (int) $line->warehouse_id,
            ])
            ->all();
    }

    private function validateMoney(string $amount): void
    {
        if (! preg_match('/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,4})?\z/', $amount)) {
            throw ValidationException::withMessages(['unit_price_egp' => ['The unit price must be a non-negative decimal amount.']]);
        }
    }

    private function discountBasisPoints(string $percent): int
    {
        if (! preg_match('/\A(?:100(?:\.0{1,2})?|[0-9]{1,2}(?:\.[0-9]{1,2})?)\z/', $percent)) {
            throw ValidationException::withMessages(['discount_percent' => ['The discount percentage must be between 0 and 100 with up to two decimal places.']]);
        }

        [$whole, $fraction] = array_pad(explode('.', $percent, 2), 2, '');

        return ((int) $whole * 100) + (int) str_pad($fraction, 2, '0');
    }

    private function formatDiscountPercent(string $percent): string
    {
        [$whole, $fraction] = array_pad(explode('.', $percent, 2), 2, '');

        return $whole.'.'.str_pad($fraction, 2, '0');
    }

    private function actor(Request $request): object
    {
        $actor = $request->attributes->get('authenticated_user');
        abort_if(! is_object($actor) || ! isset($actor->id, $actor->display_name), 401);

        return $actor;
    }
}
