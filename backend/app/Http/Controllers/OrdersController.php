<?php

namespace App\Http\Controllers;

use App\Models\SalesOrderReservation;
use App\Models\SalesOrder;
use App\Services\OrdersService;
use App\Services\SalesService;
use App\Support\ListQuery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class OrdersController extends Controller
{
    public function __construct(
        private readonly OrdersService $orders,
        private readonly SalesService $sales,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $sortable = [
            'order_date' => 'sales_orders.order_date',
            'order_number' => 'sales_orders.order_number',
            'customer' => 'customer.name',
            'status' => 'sales_orders.status',
            'total' => 'sales_orders.total_amount',
            'salesperson' => 'salesperson.display_name',
            'warehouse' => 'warehouse.name',
            'payment_method' => 'sales_orders.payment_method',
            'id' => 'sales_orders.id',
        ];
        $filters = ListQuery::validate($request, $sortable, [
            'customer_id' => ['sometimes', 'integer', 'min:1'],
            'status' => ['sometimes', 'in:draft,confirmed,fulfilled,cancelled'],
            'from_date' => ['sometimes', 'date_format:Y-m-d'],
            'to_date' => ['sometimes', 'date_format:Y-m-d', 'after_or_equal:from_date'],
            'warehouse_id' => ['sometimes', 'integer', 'min:1'],
            'salesperson_id' => ['sometimes', 'integer', 'min:1'],
            'payment_method' => ['sometimes', 'string', 'max:40'],
        ]);
        $query = DB::table('sales_orders')
            ->join('customers as customer', 'customer.id', '=', 'sales_orders.customer_id')
            ->leftJoin('users as salesperson', 'salesperson.id', '=', 'sales_orders.salesperson_id')
            ->leftJoin('locations as warehouse', 'warehouse.id', '=', 'sales_orders.warehouse_id')
            ->select([
                'sales_orders.*', 'customer.name as customer_name',
                DB::raw('COALESCE(salesperson.display_name, sales_orders.salesperson_name_snapshot) as salesperson_name'),
                'warehouse.name as warehouse_name',
                DB::raw('sales_orders.total_amount as total_egp'),
                DB::raw('(SELECT COUNT(*) FROM sales_order_lines AS order_line WHERE order_line.sales_order_id = sales_orders.id) as line_count'),
                DB::raw('(SELECT COALESCE(SUM(reservation.quantity), 0) FROM sales_order_reservations AS reservation INNER JOIN sales_order_lines AS order_line ON order_line.id = reservation.sales_order_line_id WHERE order_line.sales_order_id = sales_orders.id AND reservation.status = \'reserved\') as quantity_reserved'),
            ])
            ->when(isset($filters['customer_id']), fn ($q) => $q->where('sales_orders.customer_id', $filters['customer_id']))
            ->when(isset($filters['status']), fn ($q) => $q->where('sales_orders.status', $filters['status']))
            ->when(isset($filters['from_date']), fn ($q) => $q->where('sales_orders.order_date', '>=', $filters['from_date']))
            ->when(isset($filters['to_date']), fn ($q) => $q->where('sales_orders.order_date', '<=', $filters['to_date']));
        $query->when(isset($filters['warehouse_id']), fn ($q) => $q->where('sales_orders.warehouse_id', $filters['warehouse_id']))
            ->when(isset($filters['salesperson_id']), fn ($q) => $q->where('sales_orders.salesperson_id', $filters['salesperson_id']))
            ->when(isset($filters['payment_method']), fn ($q) => $q->where('sales_orders.payment_method', $filters['payment_method']));
        ListQuery::search($query, $filters, ['sales_orders.order_number', 'customer.name']);
        ListQuery::sort($query, $filters, $sortable, 'order_date', 'sales_orders.id', 'desc');

        return response()->json(ListQuery::page($query->paginate($filters['per_page'] ?? 50)));
    }

    public function show(int $orderId): JsonResponse
    {
        return response()->json(['data' => $this->orders->orderDetail($orderId)]);
    }

    public function options(Request $request): JsonResponse
    {
        $salespeople = DB::table('users as user')
            ->join('user_roles as user_role', 'user_role.user_id', '=', 'user.id')
            ->join('roles as role', 'role.id', '=', 'user_role.role_id')
            ->join('role_permissions as role_permission', 'role_permission.role_id', '=', 'role.id')
            ->join('permissions as permission', 'permission.id', '=', 'role_permission.permission_id')
            ->where('user.is_active', true)
            ->where('role.is_active', true)
            ->where('permission.code', 'orders.manage')
            ->distinct()
            ->orderBy('user.display_name')
            ->get(['user.id', 'user.display_name as name']);

        return response()->json(['data' => [
            'salespeople' => $salespeople,
            'warehouses' => DB::table('locations')->where('is_active', true)->orderBy('name')->get(['id', 'name', 'code']),
            // Sales totals and inventory valuation are EGP-only until the ERP has managed FX rates.
            'currencies' => DB::table('currency_references')->where('is_active', true)->where('code', 'EGP')->get(['code', 'name', 'symbol']),
            'payment_methods' => [
                ['code' => 'cash', 'name' => 'نقدي'],
                ['code' => 'transfer', 'name' => 'تحويل بنكي'],
                ['code' => 'deferred', 'name' => 'آجل'],
            ],
        ]]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->attributes->get('authenticated_user');
        abort_unless(is_object($user), 401);
        Gate::forUser($user)->authorize('create', SalesOrder::class);
        $values = $this->validateOrderInput($request);
        $orderId = $this->orders->createOrder($request, $values);

        return response()->json(['data' => $this->orders->orderDetail($orderId)], 201);
    }

    public function update(Request $request, int $orderId): JsonResponse
    {
        $user = $request->attributes->get('authenticated_user');
        abort_unless(is_object($user), 401);
        Gate::forUser($user)->authorize('create', SalesOrder::class);
        $values = $this->validateOrderInput($request);
        $this->orders->updateDraftOrder($request, $orderId, $values);

        return response()->json(['data' => $this->orders->orderDetail($orderId)]);
    }

    public function preview(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->orders->previewOrder($this->validateOrderInput($request))]);
    }

    /**
     * @return array<string, mixed>
     */
    private function validateOrderInput(Request $request): array
    {
        return $request->validate([
            'customer_id' => ['required', 'integer', 'min:1', 'exists:customers,id'],
            'order_date' => ['required', 'date_format:Y-m-d'],
            'requested_delivery_date' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'salesperson_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'warehouse_id' => ['required', 'integer', 'exists:locations,id'],
            'currency_code' => ['required', 'string', 'size:3', 'in:EGP'],
            'payment_method' => ['required', 'string', 'in:cash,transfer,deferred'],
            'payment_terms' => ['sometimes', 'nullable', 'string', 'max:120'],
            'discount_type' => ['sometimes', 'string', 'in:fixed,percent'],
            'discount_value' => ['sometimes', 'string', 'regex:/\\A(?:0|[1-9][0-9]{0,14})(?:\\.[0-9]{1,4})?\\z/'],
            'shipping_amount_egp' => ['sometimes', 'string', 'regex:/\\A(?:0|[1-9][0-9]{0,14})(?:\\.[0-9]{1,4})?\\z/'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'lines' => ['required', 'array', 'min:1', 'max:500'],
            'lines.*.product_id' => ['required', 'integer', 'min:1', 'exists:products,id'],
            'lines.*.quantity' => ['required', 'integer', 'between:1,2147483647'],
            'lines.*.unit_price_egp' => ['required', 'string', 'regex:/\A(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,4})?\z/'],
            'lines.*.discount_percent' => ['sometimes', 'numeric', 'between:0,100', 'regex:/\A(?:100(?:\.0{1,2})?|[0-9]{1,2}(?:\.[0-9]{1,2})?)\z/'],
            'lines.*.notes' => ['sometimes', 'nullable', 'string', 'max:500'],
        ]);
    }

    public function confirm(Request $request, int $orderId): JsonResponse
    {
        $this->authorizeReservation($request, 'confirm');

        return response()->json(['data' => $this->orders->confirmOrder($request, $orderId)]);
    }

    public function markPrinted(Request $request, int $orderId): JsonResponse
    {
        $user = $request->attributes->get('authenticated_user');
        abort_unless(is_object($user), 401);
        Gate::forUser($user)->authorize('print', SalesOrder::class);

        return response()->json(['data' => $this->orders->markOrderPrinted($request, $orderId)]);
    }

    public function cancel(Request $request, int $orderId): JsonResponse
    {
        $this->authorizeReservation($request, 'cancel');
        $values = $request->validate([
            'reason' => ['required', 'string', 'max:1000'],
        ]);

        return response()->json($this->orders->cancelOrder($request, $orderId, $values['reason']));
    }

    public function invoice(Request $request, int $orderId): JsonResponse
    {
        $this->authorizeReservation($request, 'invoice');
        $values = $request->validate([
            'lines' => ['required', 'array', 'min:1', 'max:500'],
            'lines.*.order_line_id' => ['required', 'integer', 'min:1', 'distinct'],
            'lines.*.warehouse_id' => ['required', 'integer', 'min:1', 'exists:locations,id'],
        ]);

        return response()->json($this->sales->invoiceConfirmedOrder($request, $orderId, $values['lines']));
    }

    private function authorizeReservation(Request $request, string $ability): void
    {
        $user = $request->attributes->get('authenticated_user');
        abort_unless(is_object($user), 401);
        Gate::forUser($user)->authorize($ability, SalesOrderReservation::class);
    }

    public function deliveries(Request $request): JsonResponse
    {
        $sortable = [
            'delivery_number' => 'delivery_number',
            'status' => 'status',
            'driver' => 'driver_name_snapshot',
            'delivery_date' => 'delivery_date',
            'created_at' => 'created_at',
            'delivered_at' => 'delivered_at',
            'id' => 'id',
        ];
        $filters = ListQuery::validate($request, $sortable, [
            'status' => ['sometimes', 'in:draft,preparing,in_transit,delivered,cancelled,active'],
            'driver_id' => ['sometimes', 'integer', 'min:1', 'exists:shipping_drivers,id'],
            'from_date' => ['sometimes', 'date_format:Y-m-d'],
            'to_date' => ['sometimes', 'date_format:Y-m-d', 'after_or_equal:from_date'],
        ]);
        $query = DB::table('deliveries')
            ->leftJoin('sales_orders as sales_order', 'sales_order.id', '=', 'deliveries.sales_order_id')
            ->leftJoin('sales_documents as sales_document', 'sales_document.id', '=', 'deliveries.sales_document_id')
            ->leftJoin('customers as order_customer', 'order_customer.id', '=', 'sales_order.customer_id')
            ->leftJoin('customers as invoice_customer', 'invoice_customer.id', '=', 'sales_document.customer_id')
            ->leftJoin('shipping_drivers', 'shipping_drivers.id', '=', 'deliveries.shipping_driver_id')
            ->leftJoin('locations as source_location', 'source_location.id', '=', 'deliveries.source_location_id')
            ->select([
                'deliveries.*', 'shipping_drivers.name as linked_driver_name',
                'source_location.name as source_location_name',
                DB::raw('COALESCE(sales_order.order_number, sales_document.document_number) as source_number'),
                DB::raw('COALESCE(order_customer.name, invoice_customer.name) as recipient_name'),
                DB::raw('COALESCE(shipping_drivers.name, deliveries.driver_name_snapshot) as driver_name'),
            ])
            ->selectSub(fn ($lineQuery) => $lineQuery->from('delivery_lines')
                ->selectRaw('COALESCE(SUM(quantity), 0)')->whereColumn('delivery_lines.delivery_id', 'deliveries.id'), 'total_quantity')
            ->when(isset($filters['status']), function ($q) use ($filters): void {
                if ($filters['status'] === 'active') {
                    $q->whereIn('deliveries.status', ['preparing', 'in_transit']);
                } else {
                    $q->where('deliveries.status', $filters['status']);
                }
            })
            ->when(isset($filters['driver_id']), fn ($q) => $q->where('deliveries.shipping_driver_id', $filters['driver_id']))
            ->when(isset($filters['from_date']), fn ($q) => $q->whereDate('deliveries.delivery_date', '>=', $filters['from_date']))
            ->when(isset($filters['to_date']), fn ($q) => $q->whereDate('deliveries.delivery_date', '<=', $filters['to_date']));
        ListQuery::search($query, $filters, [
            'deliveries.delivery_number', 'sales_order.order_number', 'sales_document.document_number',
            'order_customer.name', 'invoice_customer.name', 'source_location.name',
            'deliveries.driver_name_snapshot', 'shipping_drivers.name', 'deliveries.vehicle_plate',
        ]);
        $sortColumns = array_map(static fn (string $column): string => 'deliveries.'.$column, $sortable);
        ListQuery::sort($query, $filters, $sortColumns, 'created_at', 'deliveries.id', 'desc');

        $summaryQuery = DB::table('deliveries')
            ->when(isset($filters['driver_id']), fn ($q) => $q->where('shipping_driver_id', $filters['driver_id']))
            ->when(isset($filters['from_date']), fn ($q) => $q->whereDate('delivery_date', '>=', $filters['from_date']))
            ->when(isset($filters['to_date']), fn ($q) => $q->whereDate('delivery_date', '<=', $filters['to_date']))
            ->selectRaw('COUNT(*) as total_count')
            ->selectRaw("SUM(CASE WHEN status <> 'cancelled' THEN 1 ELSE 0 END) as active_count")
            ->selectRaw("SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as pending_count")
            ->selectRaw("SUM(CASE WHEN status IN ('preparing', 'in_transit') THEN 1 ELSE 0 END) as preparing_count")
            ->selectRaw("SUM(CASE WHEN status = 'in_transit' THEN 1 ELSE 0 END) as in_transit_count")
            ->selectRaw("SUM(CASE WHEN status = 'delivered' AND DATE(delivered_at) = ? THEN 1 ELSE 0 END) as delivered_today_count", [now()->toDateString()])
            ->first();
        $response = ListQuery::page($query->paginate($filters['per_page'] ?? 50));
        $response['summary'] = $summaryQuery;

        return response()->json($response);
    }

    public function storeDelivery(Request $request): JsonResponse
    {
        $values = $request->validate([
            'sales_order_id' => ['sometimes', 'required_without:sales_document_id', 'integer', 'min:1', 'exists:sales_orders,id'],
            'sales_document_id' => ['sometimes', 'required_without:sales_order_id', 'integer', 'min:1', 'exists:sales_documents,id'],
            'driver_user_id' => ['sometimes', 'nullable', 'integer', 'min:1', 'exists:users,id'],
            'shipping_driver_id' => ['sometimes', 'nullable', 'integer', 'min:1', 'exists:shipping_drivers,id'],
            'delivery_date' => ['sometimes', 'date_format:Y-m-d'],
            'source_location_id' => ['required', 'integer', 'min:1', 'exists:locations,id'],
            'transport_method' => ['sometimes', 'nullable', 'string', 'max:64'],
            'driver_name_snapshot' => ['sometimes', 'nullable', 'string', 'max:160'],
            'vehicle_plate' => ['sometimes', 'nullable', 'string', 'max:40'],
            'delivery_address' => ['sometimes', 'nullable', 'string', 'max:500'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ]);
        if (isset($values['sales_order_id'], $values['sales_document_id'])) {
            abort(422, 'A delivery must reference an order or an invoice, not both.');
        }
        $deliveryId = $this->orders->createDelivery($request, $values);

        return response()->json(['data' => [
            'delivery' => DB::table('deliveries')->where('id', $deliveryId)->first(),
            'lines' => DB::table('delivery_lines')->where('delivery_id', $deliveryId)->orderBy('id')->get(),
        ]], 201);
    }

    public function showDelivery(int $deliveryId): JsonResponse
    {
        $delivery = DB::table('deliveries')
            ->leftJoin('sales_orders as sales_order', 'sales_order.id', '=', 'deliveries.sales_order_id')
            ->leftJoin('sales_documents as sales_document', 'sales_document.id', '=', 'deliveries.sales_document_id')
            ->leftJoin('customers as order_customer', 'order_customer.id', '=', 'sales_order.customer_id')
            ->leftJoin('customers as invoice_customer', 'invoice_customer.id', '=', 'sales_document.customer_id')
            ->leftJoin('shipping_drivers', 'shipping_drivers.id', '=', 'deliveries.shipping_driver_id')
            ->leftJoin('locations as source_location', 'source_location.id', '=', 'deliveries.source_location_id')
            ->where('deliveries.id', $deliveryId)
            ->select([
                'deliveries.*',
                'source_location.name as source_location_name',
                DB::raw('COALESCE(sales_order.order_number, sales_document.document_number) as source_number'),
                DB::raw('COALESCE(order_customer.name, invoice_customer.name) as recipient_name'),
                DB::raw('COALESCE(shipping_drivers.name, deliveries.driver_name_snapshot) as driver_name'),
                'shipping_drivers.shipping_company',
            ])
            ->first();
        abort_if($delivery === null, 404);
        $lines = DB::table('delivery_lines as delivery_line')
            ->join('products', 'products.id', '=', 'delivery_line.product_id')
            ->join('inventory_movement_lines as movement_line', 'movement_line.id', '=', 'delivery_line.inventory_movement_line_id')
            ->join('inventory_movements as movement', 'movement.id', '=', 'movement_line.inventory_movement_id')
            ->leftJoin('locations', 'locations.id', '=', 'movement_line.from_location_id')
            ->where('delivery_line.delivery_id', $deliveryId)->orderBy('delivery_line.id')
            ->get([
                'delivery_line.id', 'delivery_line.product_id', 'products.name as product_name', 'products.sku',
                'delivery_line.quantity', 'delivery_line.inventory_movement_line_id',
                'movement.id as inventory_movement_id', 'movement.movement_number', 'movement.movement_date',
                'movement.movement_type', 'movement.status as movement_status', 'locations.name as source_location_name',
            ]);

        return response()->json(['data' => [
            'delivery' => $delivery,
            'lines' => $lines,
        ]]);
    }

    public function changeDeliveryStatus(Request $request, int $deliveryId): JsonResponse
    {
        $values = $request->validate([
            'status' => ['required', 'in:preparing,in_transit,delivered,cancelled'],
        ]);

        return response()->json(['data' => $this->orders->changeDeliveryStatus($request, $deliveryId, $values['status'])]);
    }
}
