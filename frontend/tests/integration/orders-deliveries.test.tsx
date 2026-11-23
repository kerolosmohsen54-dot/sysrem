import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { listResource, type InventoryBalance } from '../../src/features/inventory/api';
import { DeliveryDetailPage } from '../../src/features/orders/DeliveryDetailPage';
import { DeliveryFormPage } from '../../src/features/orders/DeliveryFormPage';
import { DeliveriesPage } from '../../src/features/orders/DeliveriesPage';
import { OrderDetailPage } from '../../src/features/orders/OrderDetailPage';
import { OrderFormPage } from '../../src/features/orders/OrderFormPage';
import { OrdersPage } from '../../src/features/orders/OrdersPage';
import {
  confirmOrder,
  createOrder,
  getOrder,
  invoiceOrder,
  listDeliveries,
  type OrderInput,
} from '../../src/features/orders/api';
import { AuthProvider } from '../../src/shared/auth/AuthProvider';
import { ar } from '../../src/shared/i18n/ar';
import { server } from '../server';

function renderOrderRoutes(initialPath: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <QueryClientProvider client={client}>
        <AuthProvider>
          <Routes>
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/orders/new" element={<OrderFormPage />} />
            <Route path="/orders/:orderId" element={<OrderDetailPage />} />
            <Route path="/deliveries" element={<DeliveriesPage />} />
            <Route path="/deliveries/new" element={<DeliveryFormPage />} />
            <Route path="/deliveries/:deliveryId" element={<DeliveryDetailPage />} />
            <Route path="/invoices/:invoiceId" element={<p>تم إصدار الفاتورة</p>} />
          </Routes>
        </AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

const ownerResponse = () =>
  HttpResponse.json({
    id: 1,
    username: 'owner-demo',
    name: 'مالك النظام',
    role: 'owner',
    permissions: ['*'],
  });

const orderInput: OrderInput = {
  customer_id: 101,
  order_date: '2026-10-11',
  requested_delivery_date: null,
  notes: null,
  salesperson_id: 1,
  warehouse_id: 401,
  currency_code: 'EGP',
  payment_method: 'cash',
  payment_terms: null,
  discount_type: 'fixed',
  discount_value: '0',
  shipping_amount_egp: '0',
  lines: [{ product_id: 201, quantity: 1, unit_price_egp: '650.00', discount_percent: '0', notes: null }],
};

describe('orders and deliveries', () => {
  it('loads the paginated order and delivery lists from their API routes', async () => {
    server.use(http.get('/api/v1/auth/me', ownerResponse));
    const orderView = renderOrderRoutes('/orders');
    expect(await screen.findByRole('heading', { name: ar.nav.orders })).toBeVisible();
    expect(await screen.findByText(ar.common.noResults)).toBeVisible();
    orderView.unmount();

    renderOrderRoutes('/deliveries');
    expect(await screen.findByRole('heading', { name: ar.nav.deliveries })).toBeVisible();
    expect(await screen.findByText(ar.common.noResults)).toBeVisible();
  });

  it('searches, filters, and sorts orders with the server query contract', async () => {
    const user = userEvent.setup();
    const requested: URL[] = [];
    const fixtureOrder = {
      id: 451,
      order_number: 'SO-FILTER-451',
      customer_id: 101,
      customer_name: 'عميل Fixture',
      order_date: '2026-10-20',
      requested_delivery_date: null,
      status: 'draft',
      total_egp: '300.00',
      subtotal: '300.00',
      discount_amount: '0.00',
      tax_amount: '0.00',
      salesperson_id: null,
      salesperson_name: null,
      warehouse_id: 401,
      warehouse_name: 'مخزن Fixture',
      currency_code: 'EGP',
      payment_method: 'cash',
      payment_terms: null,
      line_count: 1,
      quantity_reserved: 0,
    };
    server.use(
      http.get('/api/v1/auth/me', ownerResponse),
      http.get('/api/v1/orders/options', () => HttpResponse.json({ data: {
        salespeople: [], warehouses: [], currencies: [], payment_methods: [],
      } })),
      http.get('/api/v1/orders', ({ request }) => {
        requested.push(new URL(request.url));
        return HttpResponse.json({ data: [fixtureOrder], meta: { current_page: 1, per_page: 10, total: 1, last_page: 1 } });
      }),
    );
    renderOrderRoutes('/orders');

    await screen.findByRole('heading', { name: ar.nav.orders });
    expect((await screen.findAllByRole('link', { name: fixtureOrder.order_number })).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: fixtureOrder.order_number })[0]).toHaveAttribute('href', '/orders/451');
    await user.type(screen.getByRole('searchbox', { name: ar.common.search }), fixtureOrder.order_number);
    await user.click(screen.getByRole('button', { name: ar.orders.orderStatuses.draft }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'الترتيب' }), 'total');
    await user.click(screen.getByRole('button', { name: 'تغيير اتجاه الترتيب' }));
    await waitFor(() => {
      const latest = requested.at(-1);
      expect(latest?.searchParams.get('search')).toBe(fixtureOrder.order_number);
      expect(latest?.searchParams.get('status')).toBe('draft');
      expect(latest?.searchParams.get('sort_by')).toBe('total');
      expect(latest?.searchParams.get('sort_direction')).toBe('asc');
    });
    expect(screen.getByRole('button', { name: ar.orders.orderStatuses.draft })).toHaveAttribute('aria-pressed', 'true');
  });

  it('filters deliveries through the documented status query parameter', async () => {
    const user = userEvent.setup();
    let requestedStatus = '';
    server.use(
      http.get('/api/v1/auth/me', ownerResponse),
      http.get('/api/v1/deliveries', ({ request }) => {
        requestedStatus = new URL(request.url).searchParams.get('status') ?? '';
        return HttpResponse.json({
          data: [],
          meta: { current_page: 1, per_page: 10, total: 0, last_page: 1 },
        });
      }),
    );
    renderOrderRoutes('/deliveries');

    await screen.findByRole('heading', { name: ar.nav.deliveries });
    const filters = document.querySelector('.order-status-filters');
    const activeFilter = filters?.querySelectorAll('button')[2];
    if (!activeFilter) throw new Error('The active delivery filter is missing.');
    await user.click(activeFilter);
    await waitFor(() => expect(requestedStatus).toBe('active'));
    expect(activeFilter).toHaveAttribute('aria-pressed', 'true');
  });

  it('creates and confirms an order while showing its server reservation', async () => {
    const user = userEvent.setup();
    server.use(http.get('/api/v1/auth/me', ownerResponse));
    renderOrderRoutes('/orders/new');

    await screen.findByRole('heading', { name: ar.orders.newOrder });
    await user.selectOptions(screen.getByLabelText(ar.common.customer), '101');
    await user.selectOptions(screen.getByLabelText(ar.common.product), '201');
    await user.selectOptions(screen.getByLabelText(ar.common.warehouse), '401');
    await user.type(screen.getByLabelText(/الكمية/), '1');
    await user.type(screen.getByLabelText(/سعر الوحدة/), '650.00');
    await user.click(screen.getByRole('button', { name: ar.orders.saveDraft }));

    await screen.findByRole('heading', { name: new RegExp(ar.orders.orderDetails) });
    await user.click(screen.getByRole('button', { name: ar.orders.confirmOrder }));
    expect(await screen.findByText(ar.orders.orderStatuses.confirmed)).toBeVisible();
    await user.click(screen.getByRole('button', { name: ar.orders.orderReservationsTab }));
    expect((await screen.findAllByText(ar.orders.reservationStatuses.reserved)).length).toBeGreaterThan(0);
    expect(screen.getAllByText('فلتر زيت تويوتا').length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: ar.orders.orderDeliveriesTab }));
    expect(await screen.findByRole('heading', { name: ar.orders.relatedDeliveries })).toBeVisible();
    await user.click(screen.getByRole('button', { name: ar.orders.orderInvoicesTab }));
    expect(await screen.findByRole('heading', { name: ar.orders.relatedInvoices })).toBeVisible();
  });

  it('shows a released reservation after cancelling a confirmed order', async () => {
    const user = userEvent.setup();
    server.use(http.get('/api/v1/auth/me', ownerResponse));
    const created = await createOrder(orderInput, 'order-cancel-create');
    await confirmOrder(String(created.id), 'order-cancel-confirm');
    renderOrderRoutes(`/orders/${created.id}`);

    await screen.findByRole('heading', { name: new RegExp(ar.orders.orderDetails) });
    await user.click(screen.getByRole('button', { name: ar.orders.orderReservationsTab }));
    expect((await screen.findAllByText(ar.orders.reservationStatuses.reserved)).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: ar.orders.orderDataTab }));
    const cancelReason = document.querySelector('.inventory-toolbar #order-cancel-reason');
    if (!cancelReason) throw new Error('The order cancellation reason field is missing.');
    await user.type(cancelReason, 'اختبار إلغاء الحجز');
    await user.click(screen.getByRole('button', { name: ar.orders.cancelOrder }));
    expect(await screen.findByText(ar.orders.orderStatuses.cancelled)).toBeVisible();
    await user.click(screen.getByRole('button', { name: ar.orders.orderReservationsTab }));
    expect((await screen.findAllByText(ar.orders.reservationStatuses.released)).length).toBeGreaterThan(0);
  });

  it('issues the whole confirmed order from a selected warehouse without browser stock calculation', async () => {
    const user = userEvent.setup();
    server.use(http.get('/api/v1/auth/me', ownerResponse));
    const order = await createOrder(orderInput, 'order-invoice-create');
    await confirmOrder(String(order.id), 'order-invoice-confirm');
    const listQuery = { page: 1, perPage: 100, search: '' };
    const before = await listResource<InventoryBalance>('/inventory/balances', listQuery);
    const initialQuantity = BigInt(
      before.data.find((item) => item.product_id === 201 && item.warehouse_id === 401)
        ?.quantity_on_hand ?? '0',
    );

    renderOrderRoutes(`/orders/${order.id}`);
    await screen.findByRole('heading', { name: new RegExp(ar.orders.orderDetails) });
    await user.selectOptions(await screen.findByRole('combobox'), '401');
    await user.click(screen.getByRole('button', { name: ar.orders.invoiceOrder }));

    expect(await screen.findByText('تم إصدار الفاتورة')).toBeVisible();
    expect((await getOrder(String(order.id))).status).toBe('fulfilled');
    const after = await listResource<InventoryBalance>('/inventory/balances', listQuery);
    const finalQuantity = BigInt(
      after.data.find((item) => item.product_id === 201 && item.warehouse_id === 401)
        ?.quantity_on_hand ?? '0',
    );
    expect(initialQuantity - finalQuantity).toBe(1n);
    expect((await getOrder(String(order.id))).reservations[0]?.status).toBe('consumed');
  });

  it('creates a full delivery from a fulfilled order and updates its server status', async () => {
    const user = userEvent.setup();
    server.use(http.get('/api/v1/auth/me', ownerResponse));
    const createdOrder = await createOrder(orderInput, 'order-delivery-create');
    const confirmedOrder = await confirmOrder(String(createdOrder.id), 'order-delivery-confirm');
    const line = confirmedOrder.lines[0];
    expect(line).toBeDefined();
    const listQuery = { page: 1, perPage: 100, search: '' };
    const startingBalances = await listResource<InventoryBalance>('/inventory/balances', listQuery);
    const startingQuantity = BigInt(
      startingBalances.data.find((item) => item.product_id === 201 && item.warehouse_id === 401)
        ?.quantity_on_hand ?? '0',
    );
    await invoiceOrder(
      String(confirmedOrder.id),
      [{ order_line_id: line!.id, warehouse_id: 401 }],
      'order-delivery-invoice',
    );
    const afterInvoiceBalances = await listResource<InventoryBalance>(
      '/inventory/balances',
      listQuery,
    );
    const afterInvoiceQuantity = BigInt(
      afterInvoiceBalances.data.find((item) => item.product_id === 201 && item.warehouse_id === 401)
        ?.quantity_on_hand ?? '0',
    );
    expect(startingQuantity - afterInvoiceQuantity).toBe(1n);

    renderOrderRoutes('/deliveries/new');
    const sourceSelect = await screen.findByRole('combobox', { name: ar.orders.sourceOrder });
    await user.selectOptions(sourceSelect, String(confirmedOrder.id));
    await user.type(screen.getByLabelText(ar.orders.driverName), 'سائق التوصيل');
    await user.type(screen.getByLabelText(ar.orders.vehiclePlate), 'أ ب ج 123');
    await user.click(screen.getByRole('button', { name: ar.orders.newDelivery }));

    await screen.findByRole('heading', { name: new RegExp(ar.orders.deliveryNumber) });
    await user.click(screen.getByRole('button', { name: ar.orders.deliveryStatuses.preparing }));
    const deliveryStatusActions = document.querySelector('section[aria-labelledby="delivery-status-actions-title"]');
    const nextDeliveryStatus = deliveryStatusActions?.querySelector('button');
    if (!nextDeliveryStatus) throw new Error('The in-transit delivery action is missing.');
    await user.click(nextDeliveryStatus);
    await user.click(screen.getByRole('button', { name: ar.orders.deliveryStatuses.delivered }));
    expect(await screen.findByText(ar.common.actionSaved)).toBeVisible();
    const deliveries = await listDeliveries({ page: 1, perPage: 10, search: '' });
    const delivery = deliveries.data[0];
    expect(delivery).toBeDefined();
    expect(delivery?.status).toBe('delivered');
    expect(delivery?.sales_order_id).toBe(confirmedOrder.id);
    const afterDeliveryBalances = await listResource<InventoryBalance>(
      '/inventory/balances',
      listQuery,
    );
    const afterDeliveryQuantity = BigInt(
      afterDeliveryBalances.data.find(
        (item) => item.product_id === 201 && item.warehouse_id === 401,
      )?.quantity_on_hand ?? '0',
    );
    expect(afterDeliveryQuantity).toBe(afterInvoiceQuantity);
  });
});
