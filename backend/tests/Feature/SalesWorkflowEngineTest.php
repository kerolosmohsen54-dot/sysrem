<?php

namespace Tests\Feature;

use App\Services\OrdersService;
use App\Services\SalesService;
use App\Models\SalesOrderReservation;
use App\Support\ExactMoney;
use Database\Seeders\AppSettingsSeeder;
use Database\Seeders\RolePermissionMatrixSeeder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;
use PHPUnit\Framework\Attributes\Test;
use RuntimeException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class SalesWorkflowEngineTest extends TestCase
{
    private ?string $salesConnection = null;

    private SalesService $sales;

    private OrdersService $orders;

    private object $actor;

    private int $customerId;

    private int $productId;

    private int $warehouseId;

    protected function setUp(): void
    {
        parent::setUp();

        $connection = getenv('AUTH_TEST_CONNECTION');
        if (! is_string($connection) || ! in_array($connection, ['mysql_test', 'mariadb_test'], true)) {
            $this->markTestSkipped('Set AUTH_TEST_CONNECTION to mysql_test or mariadb_test to run sales workflow engine coverage.');
        }
        $this->salesConnection = $connection;
        config(['database.default' => $connection]);
        DB::setDefaultConnection($connection);
        DB::purge($connection);
        $configuredDatabase = config("database.connections.{$connection}.database");
        $connectedDatabase = DB::selectOne('SELECT DATABASE() AS database_name')->database_name ?? null;
        if (! in_array($configuredDatabase, ['erp_acceptance_tests', 'erp_test'], true)
            || $connectedDatabase !== $configuredDatabase) {
            throw new RuntimeException('Sales workflow integration tests require the erp_acceptance_tests or erp_test database.');
        }

        $this->createTemporaryTables();
        app(RolePermissionMatrixSeeder::class)->run();
        app(AppSettingsSeeder::class)->run();
        DB::table('currency_references')->insert(['code' => 'EGP', 'name' => 'Egyptian Pound', 'symbol' => 'EGP', 'is_active' => true]);
        $this->actor = (object) ['id' => 1, 'display_name' => 'Sales Test Owner'];
        DB::table('users')->insert(['id' => 1, 'display_name' => $this->actor->display_name]);
        $ownerRoleId = DB::table('roles')->where('code', 'owner')->value('id');
        DB::table('user_roles')->insert(['user_id' => 1, 'role_id' => $ownerRoleId]);
        $this->customerId = (int) DB::table('customers')->insertGetId([
            'name' => 'Sales Test Customer',
            'is_active' => true,
            'credit_limit' => '1000.00',
        ]);
        $this->productId = (int) DB::table('products')->insertGetId([
            'sku' => 'SALES-TEST-1',
            'name' => 'Sales Test Product',
            'is_active' => true,
        ]);
        $this->warehouseId = (int) DB::table('locations')->insertGetId([
            'code' => 'SALES-TEST-LOC',
            'name' => 'Sales Test Warehouse',
            'is_active' => true,
        ]);
        DB::table('inventory_balances')->insert([
            'product_id' => $this->productId,
            'location_id' => $this->warehouseId,
            'quantity_on_hand' => 100,
            'quantity_reserved' => 0,
            'average_unit_cost_egp' => '2.00',
            'inventory_value_egp' => '200.00',
            'updated_at' => now(),
        ]);
        $this->sales = app(SalesService::class);
        $this->orders = app(OrdersService::class);
    }

    protected function tearDown(): void
    {
        if ($this->salesConnection !== null) {
            foreach ([
                'delivery_lines',
                'deliveries',
                'sales_order_invoice_allocations',
                'sales_order_reservation_allocations',
                'sales_order_reservations',
                'sales_order_lines',
                'sales_orders',
                'sales_receipt_allocation_reversals',
                'sales_receipt_allocations',
                'sales_receipts',
                'sales_receipt_postings',
                'treasury_entries',
                'treasury_accounts',
                'financial_outbox_events',
                'sales_document_postings',
                'partner_profit_ledger',
                'inventory_movement_lines',
                'inventory_movements',
                'inventory_balances',
                'sales_document_lines',
                'sales_documents',
                'idempotency_records',
                'app_settings',
                'audit_logs',
                'locations',
                'shipping_drivers',
                'partners',
                'products',
                'customers',
                'role_permissions',
                'user_roles',
                'permissions',
                'roles',
                'users',
                'currency_references',
            ] as $table) {
                DB::statement("DROP TEMPORARY TABLE IF EXISTS `{$table}`");
            }
            DB::purge($this->salesConnection);
        }

        parent::tearDown();
    }

    #[Test]
    public function opening_balance_is_a_dated_document_and_credit_limit_only_warns(): void
    {
        $opening = $this->sales->createOpeningBalance($this->request('/api/v1/customers/'.$this->customerId.'/opening-balance', 'opening-balance-1'), $this->customerId, [
            'direction' => 'debit',
            'amount_egp' => '950.00',
            'issue_date' => '2026-10-01',
        ]);
        $openingDocument = $opening['data']['document'];
        self::assertSame('opening_receivable', $openingDocument->document_type);
        self::assertSame('2026-10-01', $openingDocument->issue_date);
        self::assertSame('950.00', $this->sales->customerBalance($this->customerId)['balance']);

        $documentId = $this->createDraft('1', '100.00');
        $issued = $this->sales->issueInvoice($this->request('/api/v1/invoices/'.$documentId.'/issue', 'opening-balance-invoice'), $documentId);

        self::assertSame(1, DB::table('inventory_movements')->count());
        self::assertTrue($issued['data']['credit_limit_warning']);
        self::assertSame('1050.00', $issued['data']['customer_balance']['balance']);
    }

    #[Test]
    public function order_confirmation_reserves_stock_and_linked_invoice_consumes_the_reservation_once(): void
    {
        $orderId = $this->createOrder(101);
        try {
            $this->orders->confirmOrder($this->request('/api/v1/orders/'.$orderId.'/confirm', 'order-confirm-excess'), $orderId);
            self::fail('An order cannot reserve more than the available stock.');
        } catch (ValidationException) {
            self::assertSame('draft', DB::table('sales_orders')->where('id', $orderId)->value('status'));
        }
        self::assertSame(100, (int) DB::table('inventory_balances')->value('quantity_on_hand'));
        self::assertSame(0, (int) DB::table('inventory_balances')->value('quantity_reserved'));

        $smallOrderId = $this->createOrder(2);
        $confirmRequest = $this->request('/api/v1/orders/'.$smallOrderId.'/confirm', 'order-confirm-small');
        $smallOrder = $this->orders->confirmOrder($confirmRequest, $smallOrderId);
        self::assertCount(0, $smallOrder['stock_warnings']);
        self::assertSame(2, (int) DB::table('inventory_balances')->value('quantity_reserved'));
        self::assertSame(1, DB::table('sales_order_reservations')->where('status', 'reserved')->count());
        self::assertSame(2, (int) $smallOrder['reservations'][0]['quantity']);
        $retryConfirmation = $this->orders->confirmOrder($confirmRequest, $smallOrderId);
        self::assertCount(1, $retryConfirmation['reservations']);
        self::assertSame(1, DB::table('sales_order_reservations')->count());

        $lineId = (int) $smallOrder['lines'][0]->id;
        $request = $this->request('/api/v1/orders/'.$smallOrderId.'/invoice', 'order-invoice-small');
        $first = $this->sales->invoiceConfirmedOrder($request, $smallOrderId, [
            ['order_line_id' => $lineId, 'warehouse_id' => $this->warehouseId],
        ]);
        $retry = $this->sales->invoiceConfirmedOrder($request, $smallOrderId, [
            ['order_line_id' => $lineId, 'warehouse_id' => $this->warehouseId],
        ]);
        self::assertSame('fulfilled', DB::table('sales_orders')->where('id', $smallOrderId)->value('status'));
        self::assertSame(98, (int) DB::table('inventory_balances')->value('quantity_on_hand'));
        self::assertSame(0, (int) DB::table('inventory_balances')->value('quantity_reserved'));
        self::assertSame('consumed', DB::table('sales_order_reservations')->value('status'));
        self::assertSame(1, DB::table('inventory_movements')->count());
        self::assertJsonStringEqualsJsonString(json_encode($first, JSON_THROW_ON_ERROR), json_encode($retry, JSON_THROW_ON_ERROR));
        self::assertSame(1, DB::table('sales_order_invoice_allocations')->count());
    }

    #[Test]
    public function cancelling_a_confirmed_order_releases_its_reservation_once(): void
    {
        $orderId = $this->createOrder(3);
        $this->orders->confirmOrder($this->request('/api/v1/orders/'.$orderId.'/confirm', 'reservation-cancel-confirm'), $orderId);
        self::assertSame(3, (int) DB::table('inventory_balances')->value('quantity_reserved'));

        $cancelled = $this->orders->cancelOrder(
            $this->request('/api/v1/orders/'.$orderId.'/cancel', 'reservation-cancel'),
            $orderId,
            'Fixture cancellation',
        );

        self::assertSame('cancelled', $cancelled['data']->status);
        self::assertSame(0, (int) DB::table('inventory_balances')->value('quantity_reserved'));
        self::assertSame('released', DB::table('sales_order_reservations')->value('status'));
        self::assertSame(2, DB::table('audit_logs')->whereIn('action', [
            'sales_order.reservation.created',
            'sales_order.reservation.released',
        ])->count());
    }

    #[Test]
    public function released_order_quantity_can_be_reserved_again_and_consumed_by_the_next_invoice(): void
    {
        $cancelledOrderId = $this->createOrder(2);
        $this->orders->confirmOrder(
            $this->request('/api/v1/orders/'.$cancelledOrderId.'/confirm', 'reuse-confirm-first'),
            $cancelledOrderId,
        );
        self::assertSame(2, (int) DB::table('inventory_balances')->value('quantity_reserved'));

        $this->orders->cancelOrder(
            $this->request('/api/v1/orders/'.$cancelledOrderId.'/cancel', 'reuse-cancel-first'),
            $cancelledOrderId,
            'Acceptance fixture cancellation',
        );
        self::assertSame(0, (int) DB::table('inventory_balances')->value('quantity_reserved'));

        $replacementOrderId = $this->createOrder(2);
        $confirmed = $this->orders->confirmOrder(
            $this->request('/api/v1/orders/'.$replacementOrderId.'/confirm', 'reuse-confirm-second'),
            $replacementOrderId,
        );
        self::assertSame(2, (int) DB::table('inventory_balances')->value('quantity_reserved'));
        self::assertSame('reserved', DB::table('sales_order_reservations as reservation')
            ->join('sales_order_lines as line', 'line.id', '=', 'reservation.sales_order_line_id')
            ->where('line.sales_order_id', $replacementOrderId)
            ->value('reservation.status'));

        $this->sales->invoiceConfirmedOrder(
            $this->request('/api/v1/orders/'.$replacementOrderId.'/invoice', 'reuse-invoice-second'),
            $replacementOrderId,
            [[
                'order_line_id' => (int) $confirmed['lines'][0]->id,
                'warehouse_id' => $this->warehouseId,
            ]],
        );

        self::assertSame('cancelled', DB::table('sales_orders')->where('id', $cancelledOrderId)->value('status'));
        self::assertSame('fulfilled', DB::table('sales_orders')->where('id', $replacementOrderId)->value('status'));
        self::assertSame(98, (int) DB::table('inventory_balances')->value('quantity_on_hand'));
        self::assertSame(0, (int) DB::table('inventory_balances')->value('quantity_reserved'));
        self::assertSame('released', DB::table('sales_order_reservations as reservation')
            ->join('sales_order_lines as line', 'line.id', '=', 'reservation.sales_order_line_id')
            ->where('line.sales_order_id', $cancelledOrderId)
            ->value('reservation.status'));
        self::assertSame('consumed', DB::table('sales_order_reservations as reservation')
            ->join('sales_order_lines as line', 'line.id', '=', 'reservation.sales_order_line_id')
            ->where('line.sales_order_id', $replacementOrderId)
            ->value('reservation.status'));
        self::assertSame(1, DB::table('sales_order_invoice_allocations as allocation')
            ->join('sales_order_lines as line', 'line.id', '=', 'allocation.sales_order_line_id')
            ->where('line.sales_order_id', $replacementOrderId)
            ->count());
    }

    #[Test]
    public function reservation_policy_requires_server_permissions_for_sensitive_actions(): void
    {
        self::assertTrue(Gate::forUser($this->actor)->allows('confirm', SalesOrderReservation::class));
        self::assertTrue(Gate::forUser($this->actor)->allows('cancel', SalesOrderReservation::class));
        self::assertTrue(Gate::forUser($this->actor)->allows('invoice', SalesOrderReservation::class));
        self::assertFalse(Gate::forUser((object) ['id' => 999])->allows('confirm', SalesOrderReservation::class));
        self::assertFalse(Gate::forUser((object) ['id' => 999])->allows('invoice', SalesOrderReservation::class));
    }

    #[Test]
    public function order_invoice_requires_every_order_line_in_the_same_full_posting(): void
    {
        $orderId = $this->createOrder(1, 2);
        $confirmed = $this->orders->confirmOrder($this->request('/api/v1/orders/'.$orderId.'/confirm', 'order-confirm-multiline'), $orderId);
        $firstLineId = (int) $confirmed['lines'][0]->id;
        try {
            $this->sales->invoiceConfirmedOrder(
                $this->request('/api/v1/orders/'.$orderId.'/invoice', 'order-invoice-partial'),
                $orderId,
                [['order_line_id' => $firstLineId, 'warehouse_id' => $this->warehouseId]],
            );
            self::fail('Partial order invoicing must be rejected.');
        } catch (ValidationException) {
            self::assertSame('confirmed', DB::table('sales_orders')->where('id', $orderId)->value('status'));
            self::assertSame(0, DB::table('sales_documents')->count());
            self::assertSame(0, DB::table('inventory_movements')->count());
        }
    }

    #[Test]
    public function order_delivery_reuses_posted_movement_and_audits_status_flow_without_second_stock_issue(): void
    {
        $orderId = $this->createOrder(2);
        $confirmed = $this->orders->confirmOrder($this->request('/api/v1/orders/'.$orderId.'/confirm', 'delivery-order-confirm'), $orderId);
        $lineId = (int) $confirmed['lines'][0]->id;
        $this->sales->invoiceConfirmedOrder($this->request('/api/v1/orders/'.$orderId.'/invoice', 'delivery-order-invoice'), $orderId, [
            ['order_line_id' => $lineId, 'warehouse_id' => $this->warehouseId],
        ]);
        $movementId = (int) DB::table('inventory_movements')->value('id');
        $deliveryId = $this->orders->createDelivery($this->request('/api/v1/deliveries', 'delivery-order-create'), [
            'sales_order_id' => $orderId,
        ]);
        $deliveryLine = DB::table('delivery_lines')->where('delivery_id', $deliveryId)->first();
        self::assertSame($lineId, (int) $deliveryLine->sales_order_line_id);
        self::assertNull($deliveryLine->sales_document_line_id);
        self::assertSame($movementId, (int) DB::table('inventory_movement_lines')->where('id', $deliveryLine->inventory_movement_line_id)->value('inventory_movement_id'));
        self::assertSame(1, DB::table('inventory_movements')->count());

        $this->orders->changeDeliveryStatus($this->request('/api/v1/deliveries/'.$deliveryId.'/status', 'delivery-preparing', 'PATCH'), $deliveryId, 'preparing');
        $this->orders->changeDeliveryStatus($this->request('/api/v1/deliveries/'.$deliveryId.'/status', 'delivery-transit', 'PATCH'), $deliveryId, 'in_transit');
        $delivered = $this->orders->changeDeliveryStatus($this->request('/api/v1/deliveries/'.$deliveryId.'/status', 'delivery-delivered', 'PATCH'), $deliveryId, 'delivered');
        self::assertSame('delivered', $delivered['delivery']->status);
        self::assertNotNull($delivered['delivery']->delivered_at);
        self::assertSame(3, DB::table('audit_logs')->where('action', 'delivery.status_changed')->count());
        self::assertSame(98, (int) DB::table('inventory_balances')->value('quantity_on_hand'));
    }

    #[Test]
    public function linked_order_invoice_revision_updates_delivery_source_and_delivery_blocks_cancellation(): void
    {
        $orderId = $this->createOrder(2);
        $confirmed = $this->orders->confirmOrder($this->request('/api/v1/orders/'.$orderId.'/confirm', 'revision-order-confirm'), $orderId);
        $orderLineId = (int) $confirmed['lines'][0]->id;
        $this->sales->invoiceConfirmedOrder($this->request('/api/v1/orders/'.$orderId.'/invoice', 'revision-order-invoice'), $orderId, [
            ['order_line_id' => $orderLineId, 'warehouse_id' => $this->warehouseId],
        ]);
        $originalDocumentId = (int) DB::table('sales_order_invoice_allocations as allocation')
            ->join('sales_document_lines as line', 'line.id', '=', 'allocation.sales_document_line_id')
            ->value('line.sales_document_id');

        $revision = $this->sales->reviseInvoice(
            $this->request('/api/v1/invoices/'.$originalDocumentId, 'revision-order-linked', 'PUT'),
            $originalDocumentId,
            [
                'customer_id' => $this->customerId,
                'issue_date' => '2026-10-11',
                'reason' => 'Corrected order invoice price',
                'lines' => [[
                    'product_id' => $this->productId,
                    'warehouse_id' => $this->warehouseId,
                    'quantity' => 2,
                    'unit_price_egp' => '12.00',
                    'discount_amount_egp' => '0',
                ]],
            ],
        );
        $revisedDocumentId = (int) $revision['data']['document']->id;
        self::assertSame($revisedDocumentId, (int) DB::table('sales_order_invoice_allocations as allocation')
            ->join('sales_document_lines as line', 'line.id', '=', 'allocation.sales_document_line_id')
            ->value('line.sales_document_id'));

        $deliveryId = $this->orders->createDelivery($this->request('/api/v1/deliveries', 'revision-order-delivery'), [
            'sales_order_id' => $orderId,
        ]);
        $deliveryMovementId = DB::table('inventory_movement_lines')
            ->where('id', DB::table('delivery_lines')->where('delivery_id', $deliveryId)->value('inventory_movement_line_id'))
            ->value('inventory_movement_id');
        $revisedMovementId = DB::table('sales_document_postings')->where('sales_document_id', $revisedDocumentId)->value('inventory_movement_id');
        self::assertSame((int) $revisedMovementId, (int) $deliveryMovementId);

        try {
            $this->sales->cancelInvoice($this->request('/api/v1/invoices/'.$revisedDocumentId.'/cancel', 'revision-order-cancel'), $revisedDocumentId, 'Cannot cancel after delivery');
            self::fail('An invoice with a linked delivery must not be cancelled.');
        } catch (HttpException $exception) {
            self::assertSame(409, $exception->getStatusCode());
        }
        self::assertSame('posted', DB::table('sales_documents')->where('id', $revisedDocumentId)->value('status'));
    }

    #[Test]
    public function cancelling_an_order_invoice_before_delivery_allows_a_fresh_full_invoice(): void
    {
        $orderId = $this->createOrder(2);
        $confirmed = $this->orders->confirmOrder($this->request('/api/v1/orders/'.$orderId.'/confirm', 'cancel-order-confirm'), $orderId);
        $orderLineId = (int) $confirmed['lines'][0]->id;
        $this->sales->invoiceConfirmedOrder($this->request('/api/v1/orders/'.$orderId.'/invoice', 'cancel-order-invoice-first'), $orderId, [
            ['order_line_id' => $orderLineId, 'warehouse_id' => $this->warehouseId],
        ]);
        $firstDocumentId = (int) DB::table('sales_order_invoice_allocations as allocation')
            ->join('sales_document_lines as line', 'line.id', '=', 'allocation.sales_document_line_id')
            ->value('line.sales_document_id');

        $this->sales->cancelInvoice($this->request('/api/v1/invoices/'.$firstDocumentId.'/cancel', 'cancel-order-invoice'), $firstDocumentId, 'Correct and reissue');
        self::assertSame('confirmed', DB::table('sales_orders')->where('id', $orderId)->value('status'));
        self::assertSame(2, (int) DB::table('inventory_balances')->value('quantity_reserved'));
        self::assertSame(1, DB::table('sales_order_reservations')->where('status', 'reserved')->count());
        $second = $this->sales->invoiceConfirmedOrder($this->request('/api/v1/orders/'.$orderId.'/invoice', 'cancel-order-invoice-second'), $orderId, [
            ['order_line_id' => $orderLineId, 'warehouse_id' => $this->warehouseId],
        ]);
        $secondDocumentId = (int) $second['data']['document']->id;
        self::assertNotSame($firstDocumentId, $secondDocumentId);
        self::assertSame('fulfilled', DB::table('sales_orders')->where('id', $orderId)->value('status'));
        self::assertSame(0, (int) DB::table('inventory_balances')->value('quantity_reserved'));

        $deliveryId = $this->orders->createDelivery($this->request('/api/v1/deliveries', 'cancel-order-delivery'), [
            'sales_order_id' => $orderId,
        ]);
        $deliveryLine = DB::table('delivery_lines')->where('delivery_id', $deliveryId)->first();
        self::assertSame(
            (int) DB::table('sales_document_postings')->where('sales_document_id', $secondDocumentId)->value('inventory_movement_id'),
            (int) DB::table('inventory_movement_lines')->where('id', $deliveryLine->inventory_movement_line_id)->value('inventory_movement_id'),
        );
    }

    #[Test]
    public function invoice_preview_is_read_only_and_matches_posted_totals(): void
    {
        $this->configureTax(true, '15.000000', 'exclusive');
        $input = [
            'customer_id' => $this->customerId,
            'issue_date' => '2026-10-11',
            'lines' => [[
                'product_id' => $this->productId,
                'warehouse_id' => $this->warehouseId,
                'quantity' => 2,
                'unit_price_egp' => '100.00',
                'discount_amount_egp' => '5.00',
            ]],
        ];
        $before = [
            'documents' => DB::table('sales_documents')->count(),
            'audit_logs' => DB::table('audit_logs')->count(),
            'movements' => DB::table('inventory_movements')->count(),
            'quantity' => DB::table('inventory_balances')->value('quantity_on_hand'),
        ];

        $preview = $this->sales->previewInvoice($input);

        self::assertSame('200.00', $preview['subtotal_egp']);
        self::assertSame('5.00', $preview['discount_amount_egp']);
        self::assertSame('29.25', $preview['tax_amount_egp']);
        self::assertSame('224.25', $preview['grand_total_egp']);
        self::assertSame($before['documents'], DB::table('sales_documents')->count());
        self::assertSame($before['audit_logs'], DB::table('audit_logs')->count());
        self::assertSame($before['movements'], DB::table('inventory_movements')->count());
        self::assertSame($before['quantity'], DB::table('inventory_balances')->value('quantity_on_hand'));

        $documentId = $this->sales->createInvoice(
            $this->request('/api/v1/invoices', 'invoice-preview-match'),
            $input,
        );
        $this->sales->issueInvoice(
            $this->request('/api/v1/invoices/'.$documentId.'/issue', 'invoice-preview-match-issue'),
            $documentId,
        );

        $posted = DB::table('sales_documents')->where('id', $documentId)->first();
        self::assertSame($preview['grand_total_egp'], ExactMoney::fromCents(ExactMoney::toCents((string) $posted->total_amount)));
        self::assertSame($preview['tax_amount_egp'], ExactMoney::fromCents(ExactMoney::toCents((string) $posted->tax_amount)));
        self::assertSame('224.25', $preview['lines'][0]['line_total_egp']);
        self::assertSame('29.25', $preview['lines'][0]['tax_amount_egp']);
    }

    #[Test]
    public function order_preview_is_read_only_and_matches_created_order_total(): void
    {
        $input = [
            'customer_id' => $this->customerId,
            'order_date' => '2026-10-11',
            'lines' => [[
                'product_id' => $this->productId,
                'quantity' => 3,
                'unit_price_egp' => '12.50',
                'discount_percent' => '0.29',
            ]],
        ];
        $before = [
            'orders' => DB::table('sales_orders')->count(),
            'lines' => DB::table('sales_order_lines')->count(),
            'audit_logs' => DB::table('audit_logs')->count(),
        ];

        $preview = $this->orders->previewOrder($input);

        self::assertSame('37.39', $preview['grand_total_egp']);
        self::assertSame('0.11', $preview['lines'][0]['discount_amount_egp']);
        self::assertSame('0.29', $preview['lines'][0]['discount_percent']);
        self::assertSame($before['orders'], DB::table('sales_orders')->count());
        self::assertSame($before['lines'], DB::table('sales_order_lines')->count());
        self::assertSame($before['audit_logs'], DB::table('audit_logs')->count());
        $orderId = $this->orders->createOrder($this->request('/api/v1/orders', 'order-preview-match'), $input);
        $stored = DB::table('sales_order_lines')->where('sales_order_id', $orderId)->first();
        self::assertSame('37.50', ExactMoney::fromCents(
            ExactMoney::multiply(ExactMoney::toCents((string) $stored->unit_price), (int) $stored->quantity),
        ));
        self::assertSame('0.11', ExactMoney::fromCents(ExactMoney::toCents((string) $stored->discount_amount)));
    }

    #[Test]
    public function return_preview_is_read_only_and_matches_posted_total(): void
    {
        $input = [
            'customer_id' => $this->customerId,
            'issue_date' => '2026-10-11',
            'return_reason' => 'Customer return',
            'lines' => [[
                'product_id' => $this->productId,
                'warehouse_id' => $this->warehouseId,
                'quantity' => 2,
                'unit_price_egp' => '20.00',
                'discount_amount_egp' => '1.00',
            ]],
        ];
        $before = [
            'documents' => DB::table('sales_documents')->count(),
            'audit_logs' => DB::table('audit_logs')->count(),
            'movements' => DB::table('inventory_movements')->count(),
        ];

        $preview = $this->sales->previewReturn($input);

        self::assertSame('39.00', $preview['grand_total_egp']);
        self::assertSame($before['documents'], DB::table('sales_documents')->count());
        self::assertSame($before['audit_logs'], DB::table('audit_logs')->count());
        self::assertSame($before['movements'], DB::table('inventory_movements')->count());
        $posted = $this->sales->createReturn($this->request('/api/v1/returns', 'return-preview-match'), $input);
        $documentId = (int) $posted['data']['document']->id;
        $document = DB::table('sales_documents')->where('id', $documentId)->first();
        self::assertSame($preview['grand_total_egp'], ExactMoney::fromCents(ExactMoney::toCents((string) $document->total_amount)));
    }

    #[Test]
    public function free_return_requires_a_reason_before_preview_or_persistence(): void
    {
        $input = [
            'customer_id' => $this->customerId,
            'issue_date' => '2026-10-11',
            'lines' => [[
                'product_id' => $this->productId,
                'warehouse_id' => $this->warehouseId,
                'quantity' => 1,
                'unit_price_egp' => '20.00',
            ]],
        ];

        foreach ([
            fn () => $this->sales->previewReturn($input),
            fn () => $this->sales->createReturn($this->request('/api/v1/returns', 'free-return-no-reason'), $input),
        ] as $attempt) {
            try {
                $attempt();
                self::fail('A free return without a reason must be rejected.');
            } catch (ValidationException $exception) {
                self::assertArrayHasKey('return_reason', $exception->errors());
            }
        }
        self::assertSame(0, DB::table('sales_documents')->count());
        self::assertSame(0, DB::table('inventory_movements')->count());
    }

    #[Test]
    public function invoice_posting_is_idempotent_and_snapshots_cost_and_tax(): void
    {
        $this->configureTax(true, '15.000000', 'exclusive');
        $documentId = $this->createDraft('1', '100.00');
        $request = $this->request('/api/v1/invoices/'.$documentId.'/issue', 'invoice-issue-1');

        $first = $this->sales->issueInvoice($request, $documentId);
        $second = $this->sales->issueInvoice($request, $documentId);

        self::assertSame(1, DB::table('inventory_movements')->count());
        self::assertSame(1, DB::table('sales_document_postings')->count());
        self::assertSame('posted', DB::table('sales_documents')->where('id', $documentId)->value('status'));
        self::assertSame('115.0000', DB::table('sales_documents')->where('id', $documentId)->value('total_amount'));
        self::assertSame('15.0000', DB::table('sales_document_lines')->where('sales_document_id', $documentId)->value('tax_amount'));
        self::assertSame('2.0000', DB::table('sales_document_lines')->where('sales_document_id', $documentId)->value('unit_cost_egp_snapshot'));
        self::assertSame('exclusive', DB::table('sales_document_lines')->where('sales_document_id', $documentId)->value('tax_calculation_method_snapshot'));
        self::assertJsonStringEqualsJsonString(
            json_encode($first, JSON_THROW_ON_ERROR),
            json_encode($second, JSON_THROW_ON_ERROR),
        );
        self::assertSame(99, (int) DB::table('inventory_balances')->value('quantity_on_hand'));
    }

    #[Test]
    public function inclusive_tax_is_included_in_the_line_total_and_rounded_per_line(): void
    {
        $this->configureTax(true, '15.000000', 'inclusive');
        $documentId = $this->createDraft('1', '0.10');
        $this->sales->issueInvoice($this->request('/api/v1/invoices/'.$documentId.'/issue', 'invoice-inclusive-1'), $documentId);

        self::assertSame('0.0100', DB::table('sales_document_lines')->where('sales_document_id', $documentId)->value('tax_amount'));
        self::assertSame('0.1000', DB::table('sales_document_lines')->where('sales_document_id', $documentId)->value('line_total'));
        self::assertSame('0.1000', DB::table('sales_documents')->where('id', $documentId)->value('total_amount'));
    }

    #[Test]
    public function insufficient_stock_rolls_back_the_issue_and_idempotency_claim(): void
    {
        $documentId = $this->createDraft('101', '1.00');
        $request = $this->request('/api/v1/invoices/'.$documentId.'/issue', 'invoice-negative-1');
        try {
            $this->sales->issueInvoice($request, $documentId);
            self::fail('Issuing an invoice beyond available stock must fail.');
        } catch (ValidationException) {
            self::assertSame('draft', DB::table('sales_documents')->where('id', $documentId)->value('status'));
            self::assertSame(0, DB::table('inventory_movements')->count());
            self::assertSame(0, DB::table('idempotency_records')->count());
        }
    }

    #[Test]
    public function linked_returns_reconcile_quantities_and_restore_stock_at_the_sold_cost(): void
    {
        $documentId = $this->createDraft('2', '50.00');
        $this->sales->issueInvoice($this->request('/api/v1/invoices/'.$documentId.'/issue', 'invoice-return-source'), $documentId);
        $sourceLineId = (int) DB::table('sales_document_lines')->where('sales_document_id', $documentId)->value('id');
        $returnValues = [
            'customer_id' => $this->customerId,
            'issue_date' => '2026-10-11',
            'original_document_id' => $documentId,
            'lines' => [[
                'warehouse_id' => $this->warehouseId,
                'quantity' => 1,
                'original_document_line_id' => $sourceLineId,
            ]],
        ];
        $firstReturn = $this->sales->createReturn($this->request('/api/v1/returns', 'return-linked-1'), $returnValues);
        $returnId = (int) $firstReturn['data']['document']->id;
        $this->sales->createReturn($this->request('/api/v1/returns', 'return-linked-2'), $returnValues);

        self::assertSame(100, (int) DB::table('inventory_balances')->value('quantity_on_hand'));
        self::assertSame('sold_line', DB::table('sales_document_lines')->where('sales_document_id', $returnId)->value('return_cost_method_snapshot'));
        self::assertSame('2.0000', DB::table('sales_document_lines')->where('sales_document_id', $returnId)->value('unit_cost_egp_snapshot'));
        self::assertSame('0.00', $this->sales->customerBalance($this->customerId)['balance']);
        try {
            $this->sales->createReturn($this->request('/api/v1/returns', 'return-linked-3'), $returnValues);
            self::fail('The linked return must not exceed sold quantity.');
        } catch (ValidationException $exception) {
            self::assertArrayHasKey('lines', $exception->errors());
        }
    }

    #[Test]
    public function invoice_settlement_clamps_to_zero_when_return_exceeds_the_unpaid_balance(): void
    {
        $documentId = $this->createDraft('2', '50.00');
        $this->sales->issueInvoice($this->request('/api/v1/invoices/'.$documentId.'/issue', 'invoice-return-settlement-source'), $documentId);
        $sourceLineId = (int) DB::table('sales_document_lines')->where('sales_document_id', $documentId)->value('id');
        $treasuryId = (int) DB::table('treasury_accounts')->insertGetId(['is_active' => true]);
        $this->sales->recordCollection($this->request('/api/v1/collections', 'invoice-return-settlement-payment'), [
            'customer_id' => $this->customerId,
            'treasury_account_id' => $treasuryId,
            'receipt_date' => '2026-10-11',
            'amount_egp' => '30.00',
            'allocations' => [['document_id' => $documentId, 'amount_egp' => '30.00']],
        ]);
        $this->sales->createReturn($this->request('/api/v1/returns', 'invoice-return-settlement-return'), [
            'customer_id' => $this->customerId,
            'issue_date' => '2026-10-11',
            'original_document_id' => $documentId,
            'lines' => [[
                'warehouse_id' => $this->warehouseId,
                'quantity' => 2,
                'original_document_line_id' => $sourceLineId,
            ]],
        ]);

        $invoice = $this->sales->invoiceResource($documentId, $this->request('/api/v1/invoices/'.$documentId, 'invoice-return-settlement-detail', 'GET'));

        self::assertSame('30.00', $invoice['document']->paid_egp);
        self::assertSame('0.00', $invoice['document']->remaining_egp);
        self::assertSame('paid', $invoice['document']->payment_status);
    }

    #[Test]
    public function free_return_uses_current_or_historical_average_and_requires_cost_without_history(): void
    {
        $currentReturn = $this->sales->createReturn($this->request('/api/v1/returns', 'return-free-current'), [
            'customer_id' => $this->customerId,
            'issue_date' => '2026-10-11',
            'return_reason' => 'Customer return',
            'lines' => [[
                'product_id' => $this->productId,
                'warehouse_id' => $this->warehouseId,
                'quantity' => 1,
                'unit_price_egp' => '5.00',
            ]],
        ]);
        $currentReturnId = (int) $currentReturn['data']['document']->id;
        self::assertSame('warehouse_current_average', DB::table('sales_document_lines')->where('sales_document_id', $currentReturnId)->value('return_cost_method_snapshot'));

        $historyProduct = (int) DB::table('products')->insertGetId([
            'sku' => 'SALES-HISTORY-1',
            'name' => 'Sales History Product',
            'is_active' => true,
        ]);
        DB::table('inventory_balances')->insert([
            'product_id' => $historyProduct,
            'location_id' => $this->warehouseId,
            'quantity_on_hand' => 100,
            'quantity_reserved' => 0,
            'average_unit_cost_egp' => '2.00',
            'inventory_value_egp' => '200.00',
            'updated_at' => now(),
        ]);
        $receiptMovementId = (int) DB::table('inventory_movements')->insertGetId([
            'movement_number' => 'HISTORY-RECEIPT-1',
            'movement_type' => 'receipt',
            'status' => 'posted',
            'movement_date' => '2026-10-10',
            'created_by_user_id' => $this->actor->id,
            'posted_by_user_id' => $this->actor->id,
            'posted_at' => now(),
        ]);
        DB::table('inventory_movement_lines')->insert([
            'inventory_movement_id' => $receiptMovementId,
            'line_number' => 1,
            'product_id' => $historyProduct,
            'to_location_id' => $this->warehouseId,
            'quantity' => 100,
            'unit_cost_egp_snapshot' => '2.00',
            'line_cost_egp_snapshot' => '200.00',
        ]);
        $documentId = $this->createDraftForProduct($historyProduct, '100', '3.00');
        $this->sales->issueInvoice($this->request('/api/v1/invoices/'.$documentId.'/issue', 'invoice-history-source'), $documentId);
        $historicalReturn = $this->sales->createReturn($this->request('/api/v1/returns', 'return-free-history'), [
            'customer_id' => $this->customerId,
            'issue_date' => '2026-10-11',
            'return_reason' => 'Customer return',
            'lines' => [[
                'product_id' => $historyProduct,
                'warehouse_id' => $this->warehouseId,
                'quantity' => 1,
                'unit_price_egp' => '3.00',
            ]],
        ]);
        $historyReturnId = (int) $historicalReturn['data']['document']->id;
        self::assertSame('warehouse_historical_average', DB::table('sales_document_lines')->where('sales_document_id', $historyReturnId)->value('return_cost_method_snapshot'));
        self::assertSame('2.0000', DB::table('sales_document_lines')->where('sales_document_id', $historyReturnId)->value('unit_cost_egp_snapshot'));

        $newProduct = (int) DB::table('products')->insertGetId([
            'sku' => 'SALES-NO-HISTORY-1',
            'name' => 'Sales No History Product',
            'is_active' => true,
        ]);
        $input = [
            'customer_id' => $this->customerId,
            'issue_date' => '2026-10-11',
            'return_reason' => 'Customer return',
            'lines' => [[
                'product_id' => $newProduct,
                'warehouse_id' => $this->warehouseId,
                'quantity' => 1,
                'unit_price_egp' => '3.00',
            ]],
        ];
        try {
            $this->sales->createReturn($this->request('/api/v1/returns', 'return-free-missing-cost'), $input);
            self::fail('A free return without cost history requires an owner-entered cost.');
        } catch (ValidationException $exception) {
            self::assertArrayHasKey('lines', $exception->errors());
        }
        $input['lines'][0]['unit_cost_egp'] = '4.25';
        $enteredReturn = $this->sales->createReturn($this->request('/api/v1/returns', 'return-free-entered-cost'), $input);
        $enteredReturnId = (int) $enteredReturn['data']['document']->id;
        self::assertSame('owner_entered', DB::table('sales_document_lines')->where('sales_document_id', $enteredReturnId)->value('return_cost_method_snapshot'));
        self::assertSame('4.2500', DB::table('sales_document_lines')->where('sales_document_id', $enteredReturnId)->value('unit_cost_egp_snapshot'));
    }

    #[Test]
    public function collection_keeps_unapplied_amount_separate_and_allocation_reversal_restores_it(): void
    {
        $documentId = $this->createDraft('1', '100.00');
        $this->sales->issueInvoice($this->request('/api/v1/invoices/'.$documentId.'/issue', 'invoice-collection-source'), $documentId);
        $treasuryId = (int) DB::table('treasury_accounts')->insertGetId(['is_active' => true]);
        $collection = $this->sales->recordCollection($this->request('/api/v1/collections', 'collection-create'), [
            'customer_id' => $this->customerId,
            'treasury_account_id' => $treasuryId,
            'receipt_date' => '2026-10-11',
            'amount_egp' => '100.00',
            'allocations' => [[
                'document_id' => $documentId,
                'amount_egp' => '70.00',
            ]],
        ]);
        $receiptId = (int) $collection['data']['receipt']->id;
        $allocationId = (int) DB::table('sales_receipt_allocations')->where('sales_receipt_id', $receiptId)->value('id');
        self::assertSame('30.0000', DB::table('sales_receipts')->where('id', $receiptId)->value('unapplied_amount'));
        self::assertSame(1, DB::table('financial_outbox_events')->where('source_type', 'sales_receipt')->count());
        self::assertSame('30.00', $this->sales->customerBalance($this->customerId)['balance']);
        self::assertSame('30.00', $this->sales->customerBalance($this->customerId)['unapplied_receipts']);

        $this->sales->allocateCollection($this->request('/api/v1/collections/'.$receiptId.'/allocations', 'collection-allocate'), $receiptId, [
            'allocations' => [[
                'document_id' => $documentId,
                'amount_egp' => '30.00',
            ]],
        ]);
        self::assertSame('0.0000', DB::table('sales_receipts')->where('id', $receiptId)->value('unapplied_amount'));
        self::assertSame('0.00', $this->sales->customerBalance($this->customerId)['balance']);

        $this->sales->reverseAllocation($this->request('/api/v1/collections/'.$receiptId.'/allocations/'.$allocationId.'/reverse', 'collection-reverse'), $receiptId, $allocationId, [
            'amount_egp' => '20.00',
            'reason' => 'Allocation correction test',
        ]);
        self::assertSame('20.0000', DB::table('sales_receipts')->where('id', $receiptId)->value('unapplied_amount'));
        self::assertSame('20.00', $this->sales->customerBalance($this->customerId)['balance']);
        self::assertSame('20.00', $this->sales->customerBalance($this->customerId)['unapplied_receipts']);
    }

    #[Test]
    public function invoice_revision_reverses_and_reposts_stock_and_transfers_allocations_with_field_history(): void
    {
        $documentId = $this->createDraft('1', '100.00');
        $this->sales->issueInvoice($this->request('/api/v1/invoices/'.$documentId.'/issue', 'invoice-revision-source'), $documentId);
        $treasuryId = (int) DB::table('treasury_accounts')->insertGetId(['is_active' => true]);
        $this->sales->recordCollection($this->request('/api/v1/collections', 'revision-collection'), [
            'customer_id' => $this->customerId,
            'treasury_account_id' => $treasuryId,
            'receipt_date' => '2026-10-11',
            'amount_egp' => '70.00',
            'allocations' => [['document_id' => $documentId, 'amount_egp' => '70.00']],
        ]);

        $revision = $this->sales->reviseInvoice(
            $this->request('/api/v1/invoices/'.$documentId, 'invoice-revision-1', 'PUT'),
            $documentId,
            [
                'customer_id' => $this->customerId,
                'issue_date' => '2026-10-11',
                'reason' => 'Corrected unit price',
                'lines' => [[
                    'product_id' => $this->productId,
                    'warehouse_id' => $this->warehouseId,
                    'quantity' => 1,
                    'unit_price_egp' => '120.00',
                    'discount_amount_egp' => '0',
                ]],
            ],
        );
        $newDocumentId = (int) $revision['data']['document']->id;

        self::assertSame('reversed', DB::table('sales_documents')->where('id', $documentId)->value('status'));
        self::assertSame('posted', DB::table('sales_documents')->where('id', $newDocumentId)->value('status'));
        self::assertSame($documentId, (int) DB::table('sales_documents')->where('id', $newDocumentId)->value('previous_revision_id'));
        self::assertSame(2, (int) DB::table('sales_documents')->where('id', $newDocumentId)->value('revision_number'));
        self::assertSame(99, (int) DB::table('inventory_balances')->value('quantity_on_hand'));
        self::assertSame('0.0000', DB::table('sales_receipts')->value('unapplied_amount'));
        self::assertSame(1, DB::table('sales_receipt_allocations')->where('sales_document_id', $newDocumentId)->count());
        self::assertSame('50.00', $this->sales->customerBalance($this->customerId)['balance']);
        $changedFields = DB::table('audit_logs')
            ->where('action', 'sales_document.field_change')
            ->where('sales_document_id', $newDocumentId)
            ->orderBy('field_path')
            ->pluck('field_path')
            ->all();
        self::assertEqualsCanonicalizing(['subtotal', 'total_amount', 'lines.1.unit_price', 'lines.1.line_total'], $changedFields);
    }

    #[Test]
    public function cancellation_reverses_stock_and_returns_allocations_to_unapplied_balance_once(): void
    {
        $documentId = $this->createDraft('1', '100.00');
        $this->sales->issueInvoice($this->request('/api/v1/invoices/'.$documentId.'/issue', 'invoice-cancel-source'), $documentId);
        $treasuryId = (int) DB::table('treasury_accounts')->insertGetId(['is_active' => true]);
        $this->sales->recordCollection($this->request('/api/v1/collections', 'cancel-collection'), [
            'customer_id' => $this->customerId,
            'treasury_account_id' => $treasuryId,
            'receipt_date' => '2026-10-11',
            'amount_egp' => '40.00',
            'allocations' => [['document_id' => $documentId, 'amount_egp' => '40.00']],
        ]);
        $request = $this->request('/api/v1/invoices/'.$documentId.'/cancel', 'invoice-cancel-1');

        $this->sales->cancelInvoice($request, $documentId, 'Cancelled test invoice');
        $this->sales->cancelInvoice($request, $documentId, 'Cancelled test invoice');

        self::assertSame('cancelled', DB::table('sales_documents')->where('id', $documentId)->value('status'));
        self::assertSame(100, (int) DB::table('inventory_balances')->value('quantity_on_hand'));
        self::assertSame('40.0000', DB::table('sales_receipts')->value('unapplied_amount'));
        self::assertSame('0.00', $this->sales->customerBalance($this->customerId)['balance']);
        self::assertSame(2, DB::table('inventory_movements')->count());
        self::assertSame(1, DB::table('audit_logs')->where('action', 'sales_document.invoice_cancelled')->count());
        self::assertSame(1, DB::table('journal_entries')->where('source_type', 'auto_sales_document_reversal')->where('source_id', $documentId)->count());
        self::assertSame('reversed', DB::table('journal_entries')->where('source_type', 'auto_sales_document')->where('source_id', $documentId)->value('status'));
        self::assertSame('posted', DB::table('journal_entries')->where('source_type', 'auto_sales_document_reversal')->where('source_id', $documentId)->value('status'));
    }

    #[Test]
    public function partner_surplus_is_accrued_and_a_two_unit_return_reverses_only_sixty_egp(): void
    {
        $this->prepareProfitFixture('100.00', '100.00');
        $partnerId = $this->createProfitPartner();
        $invoiceId = $this->issueProfitInvoice('partner', $partnerId, '130.00');

        self::assertSame('150.0000', DB::table('sales_documents')->where('id', $invoiceId)->value('partner_profit_egp_snapshot'));
        self::assertSame('0.0000', DB::table('sales_documents')->where('id', $invoiceId)->value('company_profit_egp_snapshot'));
        self::assertSame('500.0000', DB::table('sales_documents')->where('id', $invoiceId)->value('cogs_egp_snapshot'));
        self::assertSame('150.0000', DB::table('partner_profit_ledger')->where('sales_document_id', $invoiceId)->where('entry_type', 'accrual')->value('amount_egp'));
        self::assertSame(0, DB::table('treasury_entries')->count(), 'A partner accrual is due, not cash in the drawer.');

        $lineId = (int) DB::table('sales_document_lines')->where('sales_document_id', $invoiceId)->value('id');
        $return = $this->sales->createReturn($this->request('/api/v1/returns', 'profit-return-two'), [
            'customer_id' => $this->customerId,
            'issuer_type' => 'partner',
            'issuer_partner_id' => $partnerId,
            'issue_date' => '2026-10-12',
            'original_document_id' => $invoiceId,
            'return_reason' => 'Two units returned',
            'lines' => [[
                'warehouse_id' => $this->warehouseId,
                'quantity' => 2,
                'return_condition' => 'good',
                'original_document_line_id' => $lineId,
            ]],
        ]);

        self::assertSame('-60.0000', DB::table('partner_profit_ledger')->where('entry_type', 'reversal')->value('amount_egp'));
        self::assertSame('90.00', $this->signedLedgerTotal($partnerId));
        self::assertSame(97, (int) DB::table('inventory_balances')->where('product_id', $this->productId)->value('quantity_on_hand'));
        self::assertSame('100.0000', DB::table('sales_document_lines')->where('id', $lineId)->value('unit_cost_egp_snapshot'));
        self::assertNull(DB::table('sales_document_lines')->where('sales_document_id', $invoiceId)->value('container_number_snapshot'));
        $returnId = (int) $return['data']['document']->id;
        $returnJournal = DB::table('journal_entries')->where('source_type', 'auto_sales_document')->where('source_id', $returnId)->first();
        self::assertNotNull($returnJournal);
        self::assertSame('posted', $returnJournal->status);
        self::assertSame(DB::table('journal_lines')->where('journal_entry_id', $returnJournal->id)->sum('debit_amount'), DB::table('journal_lines')->where('journal_entry_id', $returnJournal->id)->sum('credit_amount'));
        self::assertSame(1, DB::table('journal_entries')->where('source_type', 'auto_sales_document')->where('source_id', $returnId)->count());
    }

    #[Test]
    public function partner_profit_uses_the_inventory_cost_snapshot_even_when_the_product_purchase_price_is_missing(): void
    {
        $this->prepareProfitFixture('100.00', null);
        $partnerId = $this->createProfitPartner();
        $invoiceId = $this->issueProfitInvoice('partner', $partnerId, '150.00');

        self::assertNull(DB::table('products')->where('id', $this->productId)->value('purchase_cost_egp'));
        self::assertSame('priced', DB::table('sales_documents')->where('id', $invoiceId)->value('profit_pricing_status'));
        self::assertSame('250.0000', DB::table('sales_documents')->where('id', $invoiceId)->value('partner_profit_egp_snapshot'));
        self::assertSame('250.0000', DB::table('partner_profit_ledger')->where('sales_document_id', $invoiceId)->where('entry_type', 'accrual')->value('amount_egp'));

        $lineId = (int) DB::table('sales_document_lines')->where('sales_document_id', $invoiceId)->value('id');
        $this->sales->createReturn($this->request('/api/v1/returns', 'profit-return-without-cost'), [
            'customer_id' => $this->customerId,
            'issuer_type' => 'partner',
            'issuer_partner_id' => $partnerId,
            'issue_date' => '2026-10-12',
            'original_document_id' => $invoiceId,
            'return_reason' => 'Two units returned without purchase cost data',
            'lines' => [[
                'warehouse_id' => $this->warehouseId,
                'quantity' => 2,
                'return_condition' => 'good',
                'original_document_line_id' => $lineId,
            ]],
        ]);

        self::assertSame('-100.0000', DB::table('partner_profit_ledger')->where('entry_type', 'reversal')->value('amount_egp'));
        self::assertSame('150.00', $this->signedLedgerTotal($partnerId));
    }

    #[Test]
    public function partner_profit_is_not_guessed_when_the_issue_time_purchase_cost_snapshot_is_missing(): void
    {
        $this->prepareProfitFixture('100.00', '100.00');
        $partnerId = $this->createProfitPartner();
        $invoiceId = (int) DB::table('sales_documents')->insertGetId([
            'document_number' => 'COSTLESS-'.strtoupper(bin2hex(random_bytes(4))), 'document_type' => 'invoice',
            'status' => 'posted', 'customer_id' => $this->customerId, 'issue_date' => '2026-10-11',
            'issuer_type' => 'partner', 'issuer_partner_id' => $partnerId,
            'subtotal' => '750.00', 'discount_amount' => '0.00', 'tax_amount' => '0.00', 'total_amount' => '750.00',
        ]);
        DB::table('sales_document_lines')->insert([
            'sales_document_id' => $invoiceId, 'line_number' => 1, 'product_id' => $this->productId,
            'description_snapshot' => 'Costless partner margin fixture', 'quantity' => 5, 'unit_price' => '150.00',
            'discount_amount' => '0.00', 'line_total' => '750.00', 'unit_cost_egp_snapshot' => null,
            'company_price_egp_snapshot' => '100.00',
        ]);

        $service = app(SalesService::class);
        $snapshotMethod = new \ReflectionMethod($service, 'invoiceProfitSnapshot');
        $snapshotMethod->setAccessible(true);
        $profit = $snapshotMethod->invoke($service, $invoiceId, 'partner');

        self::assertSame('unpriced', $profit['pricing_status']);
        self::assertSame('unpriced', $profit['partner_pricing_status']);
        self::assertSame('0.00', $profit['partner_profit_egp']);

        $accrualMethod = new \ReflectionMethod($service, 'recordPartnerInvoiceAccrual');
        $accrualMethod->setAccessible(true);
        $accrualMethod->invoke($service, $this->request('/api/v1/invoices/'.$invoiceId.'/issue', 'costless-margin'), $invoiceId, $profit, '2026-10-11');
        self::assertSame(0, DB::table('partner_profit_ledger')->where('sales_document_id', $invoiceId)->where('entry_type', 'accrual')->count());
    }

    #[Test]
    public function driver_surplus_is_company_profit_and_uses_the_issue_time_price_snapshot(): void
    {
        $this->prepareProfitFixture('100.00', '100.00');
        $driverId = (int) DB::table('shipping_drivers')->insertGetId(['name' => 'Profit Test Driver', 'is_active' => true]);
        $invoiceId = $this->issueProfitInvoice('driver', $driverId, '130.00');

        self::assertSame('150.0000', DB::table('sales_documents')->where('id', $invoiceId)->value('company_profit_egp_snapshot'));
        self::assertSame('0.0000', DB::table('sales_documents')->where('id', $invoiceId)->value('partner_profit_egp_snapshot'));
        self::assertSame(0, DB::table('partner_profit_ledger')->count());

        DB::table('products')->where('id', $this->productId)->update(['company_price' => '125.00']);
        self::assertSame('100.0000', DB::table('sales_document_lines')->where('sales_document_id', $invoiceId)->value('company_price_egp_snapshot'));
        self::assertSame('150.0000', DB::table('sales_documents')->where('id', $invoiceId)->value('company_profit_egp_snapshot'));
    }

    #[Test]
    public function revising_a_partner_invoice_reverses_the_old_accrual_and_records_the_new_one(): void
    {
        $this->prepareProfitFixture('100.00', '100.00');
        $partnerId = $this->createProfitPartner();
        $invoiceId = $this->issueProfitInvoice('partner', $partnerId, '130.00');
        $revision = $this->sales->reviseInvoice($this->request('/api/v1/invoices/'.$invoiceId, 'profit-revision'), $invoiceId, [
            'customer_id' => $this->customerId,
            'issue_date' => '2026-10-11',
            'issuer_type' => 'partner',
            'issuer_partner_id' => $partnerId,
            'issuer_company' => 'Test company',
            'lines' => [[
                'product_id' => $this->productId,
                'warehouse_id' => $this->warehouseId,
                'quantity' => 5,
                'unit_price_egp' => '140.00',
                'discount_amount_egp' => '0.00',
            ]],
            'reason' => 'Corrected invoice sale price',
        ]);
        $newInvoiceId = (int) $revision['data']['document']->id;

        self::assertSame('reversed', DB::table('sales_documents')->where('id', $invoiceId)->value('status'));
        self::assertSame('-150.0000', DB::table('partner_profit_ledger')->where('entry_type', 'reversal')->value('amount_egp'));
        self::assertSame('200.0000', DB::table('sales_documents')->where('id', $newInvoiceId)->value('partner_profit_egp_snapshot'));
        self::assertSame('200.00', $this->signedLedgerTotal($partnerId));
        self::assertSame(3, DB::table('partner_profit_ledger')->where('partner_id', $partnerId)->count());
    }

    #[Test]
    public function cancel_then_restore_recreates_stock_customer_balance_and_partner_due(): void
    {
        $this->prepareProfitFixture('100.00', '100.00');
        $partnerId = $this->createProfitPartner();
        $invoiceId = $this->issueProfitInvoice('partner', $partnerId, '130.00');
        $beforeCustomerBalance = $this->sales->customerBalance($this->customerId)['balance'];
        $beforeStock = (int) DB::table('inventory_balances')->where('product_id', $this->productId)->value('quantity_on_hand');
        $beforeDue = $this->signedLedgerTotal($partnerId);

        $this->sales->cancelInvoice($this->request('/api/v1/invoices/'.$invoiceId.'/cancel', 'profit-cancel'), $invoiceId, 'Test delete');
        self::assertSame('0.00', $this->signedLedgerTotal($partnerId));
        self::assertSame(100, (int) DB::table('inventory_balances')->where('product_id', $this->productId)->value('quantity_on_hand'));

        $restored = $this->sales->restoreInvoice($this->request('/api/v1/invoices/'.$invoiceId.'/restore', 'profit-restore'), $invoiceId);
        self::assertSame($beforeCustomerBalance, $this->sales->customerBalance($this->customerId)['balance']);
        self::assertSame($beforeStock, (int) DB::table('inventory_balances')->where('product_id', $this->productId)->value('quantity_on_hand'));
        self::assertSame($beforeDue, $this->signedLedgerTotal($partnerId));
        self::assertSame('posted', $restored['data']['document']->status);
        self::assertSame(3, DB::table('partner_profit_ledger')->where('partner_id', $partnerId)->count());
    }

    #[Test]
    public function restoring_invoice_preserves_the_allocated_invoice_discount(): void
    {
        $this->prepareProfitFixture('100.00', '100.00');
        $partnerId = $this->createProfitPartner();
        $invoiceId = $this->sales->createInvoice($this->request('/api/v1/invoices', 'restore-discount-create'), [
            'customer_id' => $this->customerId,
            'issue_date' => '2026-10-12',
            'issuer_type' => 'partner',
            'issuer_partner_id' => $partnerId,
            'discount_type' => 'fixed',
            'discount_value' => '50.00',
            'lines' => [[
                'product_id' => $this->productId,
                'warehouse_id' => $this->warehouseId,
                'quantity' => 5,
                'unit_price_egp' => '130.00',
            ]],
        ]);
        $this->sales->issueInvoice($this->request('/api/v1/invoices/'.$invoiceId.'/issue', 'restore-discount-issue'), $invoiceId);
        $issuedTotal = (string) DB::table('sales_documents')->where('id', $invoiceId)->value('total_amount');
        self::assertSame('600.0000', $issuedTotal);
        self::assertSame('50.0000', (string) DB::table('sales_document_lines')->where('sales_document_id', $invoiceId)->value('discount_amount'));
        self::assertSame('0.0000', (string) DB::table('sales_document_lines')->where('sales_document_id', $invoiceId)->value('manual_discount_amount'));

        $this->sales->cancelInvoice($this->request('/api/v1/invoices/'.$invoiceId.'/cancel', 'restore-discount-cancel'), $invoiceId, 'Restore regression');
        $restored = $this->sales->restoreInvoice($this->request('/api/v1/invoices/'.$invoiceId.'/restore', 'restore-discount-restore'), $invoiceId);
        $newDocumentId = (int) $restored['data']['document']->id;

        self::assertSame($issuedTotal, (string) DB::table('sales_documents')->where('id', $newDocumentId)->value('total_amount'));
        self::assertSame('50.0000', (string) DB::table('sales_document_lines')->where('sales_document_id', $newDocumentId)->value('discount_amount'));
        self::assertSame('100.00', $this->signedLedgerTotal($partnerId));
    }

    #[Test]
    public function a_partner_sale_below_company_price_records_a_negative_accrual(): void
    {
        $this->prepareProfitFixture('100.00', '100.00');
        $partnerId = $this->createProfitPartner();
        $invoiceId = $this->issueProfitInvoice('partner', $partnerId, '90.00');

        self::assertSame('priced', DB::table('sales_documents')->where('id', $invoiceId)->value('profit_pricing_status'));
        self::assertSame('-50.0000', DB::table('sales_documents')->where('id', $invoiceId)->value('partner_profit_egp_snapshot'));
        self::assertSame('-50.0000', DB::table('partner_profit_ledger')->where('sales_document_id', $invoiceId)->value('amount_egp'));
        self::assertSame('-50.00', $this->signedLedgerTotal($partnerId));
    }

    #[Test]
    public function a_partner_invoice_credits_net_sales_above_the_container_purchase_cost_to_its_issuer(): void
    {
        $this->prepareProfitFixture('2500.00', '2000.00');
        $partnerId = $this->createProfitPartner();
        $invoiceId = $this->issueProfitInvoice('partner', $partnerId, '2700.00');

        self::assertSame('2500.0000', (string) DB::table('sales_document_lines')->where('sales_document_id', $invoiceId)->value('company_price_egp_snapshot'));
        self::assertSame('3500.0000', (string) DB::table('sales_documents')->where('id', $invoiceId)->value('partner_profit_egp_snapshot'));
        self::assertSame('0.0000', (string) DB::table('sales_documents')->where('id', $invoiceId)->value('company_profit_egp_snapshot'));
        self::assertSame('3500.0000', (string) DB::table('partner_profit_ledger')->where('sales_document_id', $invoiceId)->where('entry_type', 'accrual')->value('amount_egp'));
        $journal = DB::table('journal_entries')->where('source_type', 'auto_sales_document')->where('source_id', $invoiceId)->first();
        self::assertNotNull($journal);
        self::assertSame('posted', $journal->status);
        $partnerLiabilityAccountId = DB::table('financial_account_mappings')->where('mapping_key', 'partner_payables')->value('account_id');
        $salesRevenueAccountId = DB::table('financial_account_mappings')->where('mapping_key', 'sales_revenue')->value('account_id');
        self::assertSame('3500.0000', (string) DB::table('journal_lines')->where('journal_entry_id', $journal->id)->where('account_id', $partnerLiabilityAccountId)->where('partner_id', $partnerId)->value('credit_amount'));
        self::assertSame('10000.0000', (string) DB::table('journal_lines')->where('journal_entry_id', $journal->id)->where('account_id', $salesRevenueAccountId)->value('credit_amount'));
        self::assertSame(DB::table('journal_lines')->where('journal_entry_id', $journal->id)->sum('debit_amount'), DB::table('journal_lines')->where('journal_entry_id', $journal->id)->sum('credit_amount'));
    }

    #[Test]
    public function one_unit_sold_for_one_hundred_against_a_container_purchase_cost_of_fifty_accrues_fifty_to_its_issuer(): void
    {
        $this->prepareProfitFixture('80.00', '50.00');
        $partnerId = $this->createProfitPartner();
        $invoiceId = $this->issueProfitInvoice('partner', $partnerId, '100.00', 1);

        self::assertSame('80.0000', (string) DB::table('sales_document_lines')->where('sales_document_id', $invoiceId)->value('company_price_egp_snapshot'));
        self::assertSame('50.0000', (string) DB::table('sales_document_lines')->where('sales_document_id', $invoiceId)->value('unit_cost_egp_snapshot'));
        self::assertSame('100.0000', (string) DB::table('sales_document_lines')->where('sales_document_id', $invoiceId)->value('unit_price'));
        self::assertSame('50.0000', (string) DB::table('sales_documents')->where('id', $invoiceId)->value('partner_profit_egp_snapshot'));
        self::assertSame('50.0000', (string) DB::table('partner_profit_ledger')->where('sales_document_id', $invoiceId)->where('entry_type', 'accrual')->value('amount_egp'));
        self::assertSame('0.0000', (string) DB::table('sales_documents')->where('id', $invoiceId)->value('company_profit_egp_snapshot'));
        self::assertSame(0, DB::table('treasury_entries')->count(), 'The partner earns the surplus; it is not paid out automatically.');

        $lineId = (int) DB::table('sales_document_lines')->where('sales_document_id', $invoiceId)->value('id');
        $this->sales->createReturn($this->request('/api/v1/returns', 'profit-return-cost-basis'), [
            'customer_id' => $this->customerId,
            'issuer_type' => 'partner',
            'issuer_partner_id' => $partnerId,
            'issue_date' => '2026-10-12',
            'original_document_id' => $invoiceId,
            'return_reason' => 'Reverse the seller profit for the returned unit',
            'lines' => [[
                'warehouse_id' => $this->warehouseId,
                'quantity' => 1,
                'return_condition' => 'good',
                'original_document_line_id' => $lineId,
            ]],
        ]);
        self::assertSame('-50.0000', DB::table('partner_profit_ledger')->where('entry_type', 'reversal')->value('amount_egp'));
        self::assertSame('0.00', $this->signedLedgerTotal($partnerId));
    }

    private function prepareProfitFixture(string $companyPrice, ?string $purchaseCost): void
    {
        $inventoryCost = $purchaseCost ?? '100.00';
        DB::table('products')->where('id', $this->productId)->update([
            'company_price' => $companyPrice,
            'purchase_cost_egp' => $purchaseCost,
        ]);
        DB::table('inventory_balances')->where('product_id', $this->productId)->where('location_id', $this->warehouseId)->update([
            'average_unit_cost_egp' => $inventoryCost,
            'inventory_value_egp' => ExactMoney::fromCents(ExactMoney::multiply(ExactMoney::toCents($inventoryCost), 100)),
        ]);
    }

    private function createProfitPartner(): int
    {
        return (int) DB::table('partners')->insertGetId(['name' => 'Profit Test Partner', 'status' => 'active']);
    }

    private function issueProfitInvoice(string $issuerType, int $issuerId, string $salePrice, int $quantity = 5): int
    {
        $values = [
            'customer_id' => $this->customerId,
            'issue_date' => '2026-10-11',
            'issuer_type' => $issuerType,
            'issuer_company' => 'Test company',
            'lines' => [[
                'product_id' => $this->productId,
                'warehouse_id' => $this->warehouseId,
                'quantity' => $quantity,
                'unit_price_egp' => $salePrice,
                'discount_amount_egp' => '0.00',
            ]],
        ];
        $values[$issuerType === 'partner' ? 'issuer_partner_id' : 'issuer_driver_id'] = $issuerId;
        $invoiceId = $this->sales->createInvoice($this->request('/api/v1/invoices', 'profit-create-'.bin2hex(random_bytes(5))), $values);
        $this->sales->issueInvoice($this->request('/api/v1/invoices/'.$invoiceId.'/issue', 'profit-issue-'.bin2hex(random_bytes(5))), $invoiceId);

        return $invoiceId;
    }

    private function signedLedgerTotal(int $partnerId): string
    {
        $total = '0';
        foreach (DB::table('partner_profit_ledger')->where('partner_id', $partnerId)->get(['entry_type', 'amount_egp']) as $entry) {
            if ($entry->entry_type === 'payout') {
                continue;
            }
            $amount = (string) $entry->amount_egp;
            $isNegative = str_starts_with($amount, '-');
            $magnitude = ExactMoney::toCents($isNegative ? substr($amount, 1) : $amount);
            $total = $this->addSignedTestCents($total, $isNegative ? '-'.$magnitude : $magnitude);
        }

        return str_starts_with($total, '-')
            ? '-'.ExactMoney::fromCents(substr($total, 1))
            : ExactMoney::fromCents($total);
    }

    private function addSignedTestCents(string $left, string $right): string
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
        $difference = $comparison > 0
            ? ExactMoney::subtract($leftMagnitude, $rightMagnitude)
            : ExactMoney::subtract($rightMagnitude, $leftMagnitude);

        return ($comparison > 0 ? $leftNegative : $rightNegative) ? '-'.$difference : $difference;
    }

    private function createDraft(string $quantity, string $price): int
    {
        return $this->sales->createInvoice($this->request('/api/v1/invoices', 'unused'), [
            'customer_id' => $this->customerId,
            'issue_date' => '2026-10-11',
            'lines' => [[
                'product_id' => $this->productId,
                'warehouse_id' => $this->warehouseId,
                'quantity' => (int) $quantity,
                'unit_price_egp' => $price,
                'discount_amount_egp' => '0',
            ]],
        ]);
    }

    private function createDraftForProduct(int $productId, string $quantity, string $price): int
    {
        return $this->sales->createInvoice($this->request('/api/v1/invoices', 'unused-product'), [
            'customer_id' => $this->customerId,
            'issue_date' => '2026-10-11',
            'lines' => [[
                'product_id' => $productId,
                'warehouse_id' => $this->warehouseId,
                'quantity' => (int) $quantity,
                'unit_price_egp' => $price,
                'discount_amount_egp' => '0',
            ]],
        ]);
    }

    private function createOrder(int $quantity, int $lineCount = 1): int
    {
        $lines = [];
        for ($index = 0; $index < $lineCount; $index++) {
            $lines[] = [
                'product_id' => $this->productId,
                'quantity' => $quantity,
                'unit_price_egp' => '10.00',
            ];
        }

        return $this->orders->createOrder($this->request('/api/v1/orders', 'unused-order'), [
            'customer_id' => $this->customerId,
            'order_date' => '2026-10-11',
            'lines' => $lines,
        ]);
    }

    private function configureTax(bool $enabled, ?string $rate, ?string $method): void
    {
        DB::table('app_settings')->where('setting_key', 'sales_tax')->update([
            'setting_value' => json_encode([
                'enabled' => $enabled,
                'rate' => $rate,
                'calculation_method' => $method,
            ], JSON_THROW_ON_ERROR),
        ]);
    }

    private function request(string $path, string $key, string $method = 'POST'): Request
    {
        $request = Request::create($path, $method);
        $request->headers->set('Idempotency-Key', $key);
        $request->attributes->set('authenticated_user', $this->actor);

        return $request;
    }

    private function createTemporaryTables(): void
    {
        $tables = [
            'CREATE TEMPORARY TABLE users (id BIGINT UNSIGNED PRIMARY KEY, display_name VARCHAR(160) NOT NULL, is_active TINYINT(1) NOT NULL DEFAULT 1)',
            'CREATE TEMPORARY TABLE currency_references (code CHAR(3) PRIMARY KEY, name VARCHAR(120) NOT NULL, symbol VARCHAR(12) NOT NULL, is_active TINYINT(1) NOT NULL DEFAULT 1)',
            'CREATE TEMPORARY TABLE roles (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, code VARCHAR(80) NOT NULL UNIQUE, name VARCHAR(120) NOT NULL, description VARCHAR(500) NULL, is_system TINYINT(1) NOT NULL DEFAULT 0, is_active TINYINT(1) NOT NULL DEFAULT 1, updated_at TIMESTAMP NULL)',
            'CREATE TEMPORARY TABLE permissions (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, code VARCHAR(120) NOT NULL UNIQUE, description VARCHAR(500) NULL)',
            'CREATE TEMPORARY TABLE user_roles (user_id BIGINT UNSIGNED NOT NULL, role_id BIGINT UNSIGNED NOT NULL, granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (user_id, role_id))',
            'CREATE TEMPORARY TABLE role_permissions (role_id BIGINT UNSIGNED NOT NULL, permission_id BIGINT UNSIGNED NOT NULL, granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (role_id, permission_id))',
            'CREATE TEMPORARY TABLE customers (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, name VARCHAR(200) NOT NULL, phone VARCHAR(80) NULL, governorate VARCHAR(120) NULL, is_active TINYINT(1) NOT NULL DEFAULT 1, credit_limit DECIMAL(19,4) NULL)',
            'CREATE TEMPORARY TABLE products (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, sku VARCHAR(100) NOT NULL, name VARCHAR(200) NOT NULL, category_id BIGINT UNSIGNED NULL, company_price DECIMAL(19,4) NULL, purchase_cost_egp DECIMAL(19,4) NULL, is_active TINYINT(1) NOT NULL DEFAULT 1)',
            'CREATE TEMPORARY TABLE locations (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, code VARCHAR(80) NOT NULL, name VARCHAR(160) NOT NULL, location_type VARCHAR(20) NOT NULL DEFAULT \'warehouse\', is_active TINYINT(1) NOT NULL DEFAULT 1)',
            'CREATE TEMPORARY TABLE partners (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, name VARCHAR(160) NOT NULL, status VARCHAR(16) NOT NULL DEFAULT \'active\', is_company_partner TINYINT(1) NOT NULL DEFAULT 1)',
            'CREATE TEMPORARY TABLE shipping_drivers (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, name VARCHAR(160) NOT NULL, is_active TINYINT(1) NOT NULL DEFAULT 1)',
            'CREATE TEMPORARY TABLE sales_documents (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, document_number VARCHAR(80) NOT NULL UNIQUE, document_type VARCHAR(30) NOT NULL, opening_balance_direction VARCHAR(10) NULL, status VARCHAR(20) NOT NULL, customer_id BIGINT UNSIGNED NOT NULL, original_document_id BIGINT UNSIGNED NULL, previous_revision_id BIGINT UNSIGNED NULL, revision_number INT UNSIGNED NOT NULL DEFAULT 1, issue_date DATE NOT NULL, due_date DATE NULL, issuer_user_id BIGINT UNSIGNED NULL, issuer_type VARCHAR(20) NOT NULL DEFAULT \'company\', issuer_partner_id BIGINT UNSIGNED NULL, issuer_driver_id BIGINT UNSIGNED NULL, issuer_company_snapshot VARCHAR(160) NULL, issuer_name_snapshot VARCHAR(160) NULL, customer_name_snapshot VARCHAR(200) NULL, customer_phone_snapshot VARCHAR(80) NULL, customer_governorate_snapshot VARCHAR(120) NULL, payment_terms VARCHAR(16) NULL, shipping_driver_id BIGINT UNSIGNED NULL, shipping_driver_name_snapshot VARCHAR(160) NULL, shipping_company_snapshot VARCHAR(160) NULL, governorate_snapshot VARCHAR(120) NULL, return_reason VARCHAR(500) NULL, return_processing_type VARCHAR(16) NULL, discount_type VARCHAR(16) NULL, discount_value DECIMAL(19,4) NULL, paid_amount_snapshot DECIMAL(19,4) NULL, cogs_egp_snapshot DECIMAL(19,4) NULL, surplus_egp_snapshot DECIMAL(19,4) NULL, partner_profit_egp_snapshot DECIMAL(19,4) NULL, company_profit_egp_snapshot DECIMAL(19,4) NULL, profit_pricing_status VARCHAR(16) NOT NULL DEFAULT \'unpriced\', notes TEXT NULL, subtotal DECIMAL(19,4) NOT NULL DEFAULT 0, discount_amount DECIMAL(19,4) NOT NULL DEFAULT 0, tax_amount DECIMAL(19,4) NOT NULL DEFAULT 0, total_amount DECIMAL(19,4) NOT NULL DEFAULT 0, created_by_user_id BIGINT UNSIGNED NULL, posted_by_user_id BIGINT UNSIGNED NULL, reversed_by_user_id BIGINT UNSIGNED NULL, posted_at DATETIME NULL, printed_at DATETIME NULL, print_count INT UNSIGNED NOT NULL DEFAULT 0, reversed_at DATETIME NULL, reversal_reason VARCHAR(1000) NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)',
            'CREATE TEMPORARY TABLE sales_document_lines (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, sales_document_id BIGINT UNSIGNED NOT NULL, line_number INT UNSIGNED NOT NULL, product_id BIGINT UNSIGNED NOT NULL, location_id BIGINT UNSIGNED NULL, original_document_line_id BIGINT UNSIGNED NULL, return_cost_method_snapshot VARCHAR(40) NULL, unit_cost_egp_snapshot DECIMAL(19,4) NULL, company_price_egp_snapshot DECIMAL(19,4) NULL, container_number_snapshot VARCHAR(100) NULL, product_category_snapshot VARCHAR(160) NULL, description_snapshot VARCHAR(500) NOT NULL, sku_snapshot VARCHAR(100) NULL, quantity INT UNSIGNED NOT NULL, unit_price DECIMAL(19,4) NOT NULL, discount_amount DECIMAL(19,4) NOT NULL DEFAULT 0, manual_discount_amount DECIMAL(19,4) NOT NULL DEFAULT 0, return_condition VARCHAR(20) NULL, tax_enabled_snapshot TINYINT(1) NULL, tax_rate_snapshot DECIMAL(9,6) NULL, tax_calculation_method_snapshot VARCHAR(16) NULL, tax_amount DECIMAL(19,4) NOT NULL DEFAULT 0, line_total DECIMAL(19,4) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY (sales_document_id, line_number))',
            'CREATE TEMPORARY TABLE inventory_balances (product_id BIGINT UNSIGNED NOT NULL, location_id BIGINT UNSIGNED NOT NULL, quantity_on_hand INT NOT NULL, quantity_reserved INT NOT NULL DEFAULT 0, average_unit_cost_egp DECIMAL(19,4) NULL, inventory_value_egp DECIMAL(19,4) NOT NULL DEFAULT 0, updated_at TIMESTAMP NULL, PRIMARY KEY (product_id, location_id))',
            'CREATE TEMPORARY TABLE inventory_movements (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, movement_number VARCHAR(80) NOT NULL, movement_type VARCHAR(40) NOT NULL, status VARCHAR(20) NOT NULL, movement_date DATE NOT NULL, source_type VARCHAR(80) NULL, source_id BIGINT UNSIGNED NULL, reversal_of_movement_id BIGINT UNSIGNED NULL, reason VARCHAR(1000) NULL, created_by_user_id BIGINT UNSIGNED NULL, posted_by_user_id BIGINT UNSIGNED NULL, posted_at DATETIME NULL, created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL)',
            'CREATE TEMPORARY TABLE inventory_movement_lines (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, inventory_movement_id BIGINT UNSIGNED NOT NULL, line_number INT UNSIGNED NOT NULL, product_id BIGINT UNSIGNED NOT NULL, from_location_id BIGINT UNSIGNED NULL, to_location_id BIGINT UNSIGNED NULL, sales_document_line_id BIGINT UNSIGNED NULL, container_receipt_line_id BIGINT UNSIGNED NULL, reversal_of_movement_line_id BIGINT UNSIGNED NULL, quantity INT UNSIGNED NOT NULL, unit_cost_egp_snapshot DECIMAL(19,4) NULL, line_cost_egp_snapshot DECIMAL(19,4) NULL, notes VARCHAR(500) NULL, created_at TIMESTAMP NULL)',
            'CREATE TEMPORARY TABLE sales_document_postings (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, sales_document_id BIGINT UNSIGNED NOT NULL, inventory_movement_id BIGINT UNSIGNED NULL, created_at TIMESTAMP NULL)',
            'CREATE TEMPORARY TABLE sales_orders (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, order_number VARCHAR(80) NOT NULL UNIQUE, status VARCHAR(20) NOT NULL, customer_id BIGINT UNSIGNED NOT NULL, salesperson_id BIGINT UNSIGNED NULL, salesperson_name_snapshot VARCHAR(160) NULL, warehouse_id BIGINT UNSIGNED NULL, currency_code CHAR(3) NOT NULL DEFAULT \'EGP\', payment_method VARCHAR(40) NULL, payment_terms VARCHAR(120) NULL, discount_type VARCHAR(16) NOT NULL DEFAULT \'fixed\', discount_value DECIMAL(19,4) NOT NULL DEFAULT 0, subtotal DECIMAL(19,4) NOT NULL DEFAULT 0, discount_amount DECIMAL(19,4) NOT NULL DEFAULT 0, tax_amount DECIMAL(19,4) NOT NULL DEFAULT 0, shipping_amount DECIMAL(19,4) NOT NULL DEFAULT 0, total_amount DECIMAL(19,4) NOT NULL DEFAULT 0, order_date DATE NOT NULL, requested_delivery_date DATE NULL, notes TEXT NULL, created_by_user_id BIGINT UNSIGNED NULL, confirmed_by_user_id BIGINT UNSIGNED NULL, confirmed_at DATETIME NULL, printed_at DATETIME NULL, print_count INT UNSIGNED NOT NULL DEFAULT 0, created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL)',
            'CREATE TEMPORARY TABLE sales_order_lines (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, sales_order_id BIGINT UNSIGNED NOT NULL, line_number INT UNSIGNED NOT NULL, product_id BIGINT UNSIGNED NOT NULL, quantity INT UNSIGNED NOT NULL, unit_price DECIMAL(19,4) NOT NULL, discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0, discount_amount DECIMAL(19,4) NOT NULL DEFAULT 0, order_discount_amount DECIMAL(19,4) NOT NULL DEFAULT 0, tax_amount DECIMAL(19,4) NOT NULL DEFAULT 0, line_total DECIMAL(19,4) NOT NULL DEFAULT 0, notes VARCHAR(500) NULL, created_at TIMESTAMP NULL, UNIQUE KEY (sales_order_id, line_number))',
            'CREATE TEMPORARY TABLE sales_order_reservations (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, sales_order_line_id BIGINT UNSIGNED NOT NULL, cycle_number SMALLINT UNSIGNED NOT NULL DEFAULT 1, product_id BIGINT UNSIGNED NOT NULL, quantity INT UNSIGNED NOT NULL, status VARCHAR(20) NOT NULL, created_by_user_id BIGINT UNSIGNED NULL, reserved_at TIMESTAMP NULL, released_at TIMESTAMP NULL, consumed_at TIMESTAMP NULL, created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL, UNIQUE KEY (sales_order_line_id, cycle_number), KEY (product_id, status))',
            'CREATE TEMPORARY TABLE sales_order_reservation_allocations (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, reservation_id BIGINT UNSIGNED NOT NULL, location_id BIGINT UNSIGNED NOT NULL, quantity INT UNSIGNED NOT NULL, created_at TIMESTAMP NULL, UNIQUE KEY (reservation_id, location_id), KEY (location_id, reservation_id))',
            'CREATE TEMPORARY TABLE sales_order_invoice_allocations (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, sales_order_line_id BIGINT UNSIGNED NOT NULL, sales_document_line_id BIGINT UNSIGNED NOT NULL, product_id BIGINT UNSIGNED NOT NULL, quantity INT UNSIGNED NOT NULL, created_at TIMESTAMP NULL, UNIQUE KEY (sales_order_line_id, sales_document_line_id))',
            'CREATE TEMPORARY TABLE deliveries (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, delivery_number VARCHAR(80) NOT NULL UNIQUE, sales_order_id BIGINT UNSIGNED NULL, sales_document_id BIGINT UNSIGNED NULL, status VARCHAR(20) NOT NULL, driver_user_id BIGINT UNSIGNED NULL, shipping_driver_id BIGINT UNSIGNED NULL, delivery_date DATE NULL, source_location_id BIGINT UNSIGNED NULL, transport_method VARCHAR(64) NULL, driver_name_snapshot VARCHAR(160) NULL, vehicle_plate VARCHAR(40) NULL, delivery_address VARCHAR(500) NULL, delivered_at DATETIME NULL, notes TEXT NULL, created_by_user_id BIGINT UNSIGNED NULL, created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL)',
            'CREATE TEMPORARY TABLE delivery_lines (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, delivery_id BIGINT UNSIGNED NOT NULL, sales_order_line_id BIGINT UNSIGNED NULL, sales_document_line_id BIGINT UNSIGNED NULL, product_id BIGINT UNSIGNED NOT NULL, quantity INT UNSIGNED NOT NULL, inventory_movement_line_id BIGINT UNSIGNED NOT NULL, created_at TIMESTAMP NULL, UNIQUE KEY (inventory_movement_line_id))',
            'CREATE TEMPORARY TABLE idempotency_records (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, user_id BIGINT UNSIGNED NOT NULL, idempotency_key VARCHAR(200) NOT NULL, request_hash BINARY(32) NOT NULL, http_status SMALLINT UNSIGNED NULL, response_body LONGTEXT NULL, resource_type VARCHAR(80) NULL, resource_id BIGINT UNSIGNED NULL, state VARCHAR(20) NOT NULL, created_at TIMESTAMP NULL, completed_at DATETIME NULL, UNIQUE KEY (user_id, idempotency_key))',
            'CREATE TEMPORARY TABLE app_settings (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, setting_key VARCHAR(100) NOT NULL UNIQUE, setting_value LONGTEXT NOT NULL, description VARCHAR(500) NULL, updated_by_user_id BIGINT UNSIGNED NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)',
            'CREATE TEMPORARY TABLE financial_outbox_events (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, event_type VARCHAR(100) NOT NULL, source_type VARCHAR(100) NOT NULL, source_id BIGINT UNSIGNED NOT NULL, payload LONGTEXT NOT NULL, attempts INT UNSIGNED NOT NULL DEFAULT 0, last_error TEXT NULL, occurred_at DATETIME NOT NULL, processed_at DATETIME NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY uq_financial_outbox_source_event (source_type, source_id, event_type)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
            'CREATE TEMPORARY TABLE audit_logs (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, actor_user_id BIGINT UNSIGNED NULL, actor_name_snapshot VARCHAR(160) NULL, sales_document_id BIGINT UNSIGNED NULL, field_path VARCHAR(500) NULL, old_value LONGTEXT NULL, new_value LONGTEXT NULL, action VARCHAR(100) NOT NULL, entity_type VARCHAR(100) NOT NULL, entity_id BIGINT UNSIGNED NULL, reason VARCHAR(1000) NULL, before_data LONGTEXT NULL, after_data LONGTEXT NULL, request_id VARCHAR(100) NULL, ip_address VARBINARY(16) NULL, user_agent VARCHAR(500) NULL, created_at TIMESTAMP NULL)',
            'CREATE TEMPORARY TABLE sales_receipts (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, receipt_number VARCHAR(80) NOT NULL, receipt_type VARCHAR(20) NOT NULL, status VARCHAR(20) NOT NULL, customer_id BIGINT UNSIGNED NOT NULL, treasury_account_id BIGINT UNSIGNED NOT NULL, receipt_date DATE NOT NULL, amount DECIMAL(19,4) NOT NULL, unapplied_amount DECIMAL(19,4) NOT NULL DEFAULT 0, payment_method VARCHAR(40) NULL, external_reference VARCHAR(160) NULL, notes TEXT NULL, reversal_of_receipt_id BIGINT UNSIGNED NULL, created_by_user_id BIGINT UNSIGNED NULL, posted_by_user_id BIGINT UNSIGNED NULL, posted_at DATETIME NULL, created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL)',
            'CREATE TEMPORARY TABLE sales_receipt_allocations (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, sales_receipt_id BIGINT UNSIGNED NOT NULL, sales_document_id BIGINT UNSIGNED NOT NULL, allocation_amount DECIMAL(19,4) NOT NULL, created_at TIMESTAMP NULL)',
            'CREATE TEMPORARY TABLE sales_receipt_allocation_reversals (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, sales_receipt_allocation_id BIGINT UNSIGNED NOT NULL, amount DECIMAL(19,4) NOT NULL, reason VARCHAR(1000) NOT NULL, actor_user_id BIGINT UNSIGNED NULL, reversed_at DATETIME NOT NULL, created_at TIMESTAMP NULL)',
            'CREATE TEMPORARY TABLE sales_receipt_postings (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, sales_receipt_id BIGINT UNSIGNED NOT NULL, treasury_entry_id BIGINT UNSIGNED NULL, created_at TIMESTAMP NULL)',
            'CREATE TEMPORARY TABLE treasury_accounts (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, name VARCHAR(160) NOT NULL DEFAULT \'Test account\', is_active TINYINT(1) NOT NULL DEFAULT 1)',
            'CREATE TEMPORARY TABLE treasury_entries (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, treasury_account_id BIGINT UNSIGNED NOT NULL, entry_number VARCHAR(80) NOT NULL, entry_type VARCHAR(30) NOT NULL, direction VARCHAR(10) NOT NULL, entry_date DATE NOT NULL, amount DECIMAL(19,4) NOT NULL, source_type VARCHAR(80) NULL, source_id BIGINT UNSIGNED NULL, description VARCHAR(500) NULL, created_by_user_id BIGINT UNSIGNED NULL, posted_at DATETIME NOT NULL, created_at TIMESTAMP NULL)',
            'CREATE TEMPORARY TABLE partner_profit_ledger (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, partner_id BIGINT UNSIGNED NOT NULL, sales_document_id BIGINT UNSIGNED NULL, reference_document_id BIGINT UNSIGNED NULL, partner_payment_id BIGINT UNSIGNED NULL, entry_type VARCHAR(16) NOT NULL, amount_egp DECIMAL(19,4) NOT NULL, effective_date DATE NOT NULL, source_key VARCHAR(200) NOT NULL UNIQUE, notes VARCHAR(500) NULL, created_by_user_id BIGINT UNSIGNED NULL, created_at TIMESTAMP NULL)',
        ];
        foreach ($tables as $sql) {
            DB::statement($sql.' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
        }
        $this->createTemporaryFinancialPostingTables();
    }
}
