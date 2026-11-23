import { newIdempotencyKey } from '../../shared/api/http';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '../../shared/api/errors';
import { useAuth } from '../../shared/auth/AuthProvider';
import { DataTable, type DataColumn } from '../../shared/components/DataTable';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import { formatDate, formatMoney, formatQuantity } from '../../shared/utils/format';
import { listAllResources, type ListQuery, type Warehouse } from '../inventory/api';
import { FormField } from '../../shared/components/FormField';
import { cancelOrder, confirmOrder, getOrder, invoiceOrder, type OrderLine } from './api';

const optionsQuery: ListQuery = { page: 1, perPage: 100, search: '' };
const detailTabs = [
  { id: 'data', label: ar.orders.orderDataTab },
  { id: 'items', label: ar.orders.orderItemsTab },
  { id: 'reservations', label: ar.orders.orderReservationsTab },
  { id: 'deliveries', label: ar.orders.orderDeliveriesTab },
  { id: 'invoices', label: ar.orders.orderInvoicesTab },
] as const;
type OrderDetailTab = (typeof detailTabs)[number]['id'];

export function OrderDetailPage() {
  const navigate = useNavigate();
  const { orderId = '' } = useParams();
  const validId = /^[1-9]\d*$/.test(orderId);
  const { user } = useAuth();
  const client = useQueryClient();
  const canManage = Boolean(
    user?.permissions.includes('*') || user?.permissions.includes('orders.manage'),
  );
  const canCreateInvoice = Boolean(
    user?.permissions.includes('*') || user?.permissions.includes('invoices.create'),
  );
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [activeTab, setActiveTab] = useState<OrderDetailTab>('data');
  const confirmKey = useRef<string | null>(null);
  const invoiceKey = useRef<string | null>(null);
  const cancelKey = useRef<string | null>(null);
  const order = useQuery({
    queryKey: ['/orders', orderId],
    queryFn: () => getOrder(orderId),
    enabled: validId,
  });
  const warehouses = useQuery({
    queryKey: ['/warehouses', 'order-invoice-options'],
    queryFn: () => listAllResources<Warehouse>('/warehouses', optionsQuery),
    enabled: validId && canManage && canCreateInvoice,
  });

  if (!validId) return <PageState kind="error" title={ar.common.invalidIdentifier} />;
  if (order.isLoading) return <PageState kind="loading" />;
  if (order.isError || !order.data) {
    return (
      <PageState
        kind="error"
        message={ar.common.requestFailed}
        onRetry={() => void order.refetch()}
      />
    );
  }
  const current = order.data;
  const reservedLocationsByLine = new Map(current.lines.map((line) => [
    line.id,
    current.reservations
      .filter((reservation) => reservation.order_line_id === line.id && reservation.status === 'reserved')
      .flatMap((reservation) => reservation.allocations),
  ]));
  const canInvoiceReservedLines = current.lines.length > 0 && current.lines.every((line) => {
    const allocations = reservedLocationsByLine.get(line.id) ?? [];
    return allocations.length === 1 && allocations[0].quantity === Number(line.quantity);
  });
  const columns: DataColumn<OrderLine>[] = [
    { key: 'product', header: ar.common.product, render: (row) => row.product_name },
    { key: 'sku', header: ar.common.sku, render: (row) => row.sku },
    { key: 'quantity', header: ar.common.quantity, render: (row) => formatQuantity(row.quantity) },
    { key: 'price', header: ar.orders.unitPrice, render: (row) => formatMoney(row.unit_price_egp) },
    { key: 'discount', header: 'الخصم %', render: (row) => <bdi dir="ltr">{row.discount_percent}%</bdi> },
    { key: 'line_total', header: ar.common.total, render: (row) => formatMoney(row.line_total_egp) },
  ];
  const reservationColumns: DataColumn<(typeof current.reservations)[number]>[] = [
    { key: 'product', header: ar.common.product, render: (row) => row.product_name },
    { key: 'sku', header: ar.common.sku, render: (row) => <bdi dir="ltr">{row.sku}</bdi> },
    {
      key: 'quantity',
      header: ar.common.quantity,
      render: (row) => <bdi dir="ltr">{formatQuantity(String(row.quantity))}</bdi>,
    },
    {
      key: 'locations',
      header: ar.common.warehouse,
      render: (row) => row.allocations.map((allocation) => (
        <bdi dir="auto" key={allocation.location_id}>
          {allocation.location_name} (<span dir="ltr">{formatQuantity(String(allocation.quantity))}</span>)
        </bdi>
      )),
    },
    {
      key: 'status',
      header: ar.orders.reservationStatus,
      render: (row) => ar.orders.reservationStatuses[row.status],
    },
  ];

  const confirm = async () => {
    setError('');
    setSuccess('');
    confirmKey.current ??= newIdempotencyKey();
    try {
      await confirmOrder(orderId, confirmKey.current);
      confirmKey.current = null;
      setSuccess(ar.common.actionSaved);
      await order.refetch();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : ar.common.networkError);
    }
  };

  const cancel = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    cancelKey.current ??= newIdempotencyKey();
    try {
      await cancelOrder(orderId, cancelReason.trim(), cancelKey.current);
      cancelKey.current = null;
      setCancelReason('');
      setSuccess(ar.common.actionSaved);
      await order.refetch();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : ar.common.networkError);
    }
  };

  const createInvoice = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    invoiceKey.current ??= newIdempotencyKey();
    const values = new FormData(event.currentTarget);
    try {
      const result = await invoiceOrder(
        orderId,
        current.lines.map((line) => ({
          order_line_id: line.id,
          warehouse_id: safePositiveInteger(String(values.get(`warehouse-${line.id}`) ?? '')),
        })),
        invoiceKey.current,
      );
      invoiceKey.current = null;
      await client.invalidateQueries({ queryKey: ['/orders'] });
      navigate(`/invoices/${result.invoice.id}`);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : ar.common.networkError);
    }

    function safePositiveInteger(value: string): number {
      if (!/^[1-9]\d*$/.test(value)) throw new Error(ar.common.quantityMustBeInteger);
      const integer = BigInt(value);
      if (integer > BigInt(Number.MAX_SAFE_INTEGER))
        throw new Error(ar.common.quantityMustBeInteger);
      return Number(integer);
    }
  };

  return (
    <section className="page inventory-page order-detail-page">
      <header className="page-heading">
        <div>
          <h1>
            {ar.orders.orderDetails}: {current.order_number}
          </h1>
          <p>
            {ar.common.customer}: {current.customer_name} ·{' '}
            {ar.orders.orderStatuses[current.status]}
          </p>
        </div>
        <div className="row-actions">
          <Link className="button button-secondary" to="/orders">
            {ar.common.back}
          </Link>
          {canManage && current.status === 'draft' && (
            <Link className="button button-secondary" to={`/orders/${current.id}/edit`}>
              {ar.common.edit}
            </Link>
          )}
          {current.status === 'fulfilled' && (
            <Link className="button button-secondary" to={'/deliveries/new?orderId=' + current.id}>
              {ar.orders.newDelivery}
            </Link>
          )}
          <Link className="button button-secondary" to={'/orders/' + current.id + '/print'}>
            طباعة الطلب
          </Link>
        </div>
      </header>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="inline-success" role="status">
          {success}
        </p>
      )}
      <div className="order-detail-tabs" role="group" aria-label={ar.orders.orderDetails}>
        {detailTabs.map((tab) => (
          <button
            aria-pressed={activeTab === tab.id}
            className={`order-detail-tab${activeTab === tab.id ? ' is-active' : ''}`}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === 'data' && (
        <>
          <dl className="invoice-detail-summary">
            <div>
              <dt>{ar.orders.orderNumber}</dt>
              <dd>{current.order_number}</dd>
            </div>
            <div>
              <dt>{ar.common.customer}</dt>
              <dd>{current.customer_name}</dd>
            </div>
            {current.customer_phone && <div><dt>رقم الهاتف</dt><dd><bdi dir="ltr">{current.customer_phone}</bdi></dd></div>}
            {current.customer_address && <div><dt>عنوان التسليم</dt><dd>{current.customer_address}</dd></div>}
            {current.customer_governorate && <div><dt>المحافظة</dt><dd>{current.customer_governorate}</dd></div>}
            <div>
              <dt>{ar.orders.orderDate}</dt>
              <dd>{formatDate(current.order_date)}</dd>
            </div>
            <div><dt>{ar.orders.requestedDeliveryDate}</dt><dd>{current.requested_delivery_date ? formatDate(current.requested_delivery_date) : '—'}</dd></div>
            <div><dt>المندوب</dt><dd>{current.salesperson_name ?? '—'}</dd></div>
            <div><dt>{ar.common.warehouse}</dt><dd>{current.warehouse_name ?? '—'}</dd></div>
            <div><dt>طريقة الدفع</dt><dd>{current.payment_method ?? '—'}</dd></div>
            <div><dt>شروط الدفع</dt><dd>{current.payment_terms ?? '—'}</dd></div>
            <div><dt>العملة</dt><dd><bdi dir="ltr">{current.currency_code ?? 'EGP'}</bdi></dd></div>
            <div>
              <dt>{ar.orders.orderStatus}</dt>
              <dd>{ar.orders.orderStatuses[current.status]}</dd>
            </div>
            <div>
              <dt>{ar.common.total}</dt>
              <dd>
                {current.total_egp === null
                  ? ar.common.notProvided
                  : formatMoney(current.total_egp)}
              </dd>
            </div>
            <div><dt>الإجمالي قبل الخصم</dt><dd>{formatMoney(current.subtotal_egp ?? '0.00')}</dd></div>
            <div><dt>الخصم</dt><dd>{formatMoney(current.discount_amount_egp ?? '0.00')}</dd></div>
            <div><dt>الضريبة</dt><dd>{formatMoney(current.tax_amount_egp ?? '0.00')}</dd></div>
          </dl>
          {current.notes && <p className="inline-alert">{ar.orders.orderNotes}: {current.notes}</p>}
          <section aria-labelledby="order-detail-lines-title">
            <h2 id="order-detail-lines-title">{ar.orders.orderLines}</h2>
            <DataTable
              columns={columns}
              rows={current.lines}
              getRowKey={(row) => row.id}
              emptyMessage={ar.common.noResults}
            />
          </section>
        </>
      )}
      {activeTab === 'items' && (
        <section aria-labelledby="order-detail-items-title">
          <h2 id="order-detail-items-title">{ar.orders.orderLines}</h2>
          <DataTable
            columns={columns}
            rows={current.lines}
            getRowKey={(row) => row.id}
            emptyMessage={ar.common.noResults}
          />
        </section>
      )}
      {activeTab === 'data' && canManage && ['draft', 'confirmed'].includes(current.status) && (
        <form className="inventory-toolbar" onSubmit={(event) => void cancel(event)}>
          <FormField
            id="order-cancel-reason"
            label={ar.orders.cancelOrderReason}
            onChange={(event) => setCancelReason(event.currentTarget.value)}
            required
            maxLength={1000}
            value={cancelReason}
          />
          <button className="button button-secondary" type="submit">
            {ar.orders.cancelOrder}
          </button>
        </form>
      )}
      {activeTab === 'reservations' && (
        <section aria-labelledby="order-detail-fulfillment-title">
          <h2 id="order-detail-fulfillment-title">{ar.orders.orderReservationsTab}</h2>
          {current.reservations.length ? (
            <DataTable
              columns={reservationColumns}
              rows={current.reservations}
              getRowKey={(row) => row.id}
              emptyMessage={ar.orders.noStockReservation}
            />
          ) : (
            <PageState kind="empty" title={ar.orders.noStockReservation} />
          )}
        </section>
      )}
      {activeTab === 'data' && (
        <section aria-labelledby="order-detail-actions-title">
          <h2 id="order-detail-actions-title">{ar.common.actions}</h2>
          {canManage && current.status === 'draft' && (
            <button className="button button-primary" onClick={() => void confirm()} type="button">
              {ar.orders.confirmOrder}
            </button>
          )}
          {canManage && current.status === 'confirmed' && canCreateInvoice && (
            <>
              {warehouses.isLoading && <PageState kind="loading" />}
              {warehouses.isError && (
                <PageState
                  kind="error"
                  message={ar.common.requestFailed}
                  onRetry={() => void warehouses.refetch()}
                />
              )}
              {warehouses.data && (
                <form className="stack-form" onSubmit={createInvoice}>
                  <h3>{ar.orders.invoiceOrder}</h3>
                  <p>{ar.orders.selectWarehouseForLines}</p>
                  {!canInvoiceReservedLines && <p className="field-error" role="alert">لا يمكن إصدار الفاتورة قبل وجود حجز نشط كامل لكل بند.</p>}
                  {current.lines.map((line) => (
                    <label className="form-field" key={line.id}>
                      <span>
                        {line.product_name} — {ar.common.warehouse}
                      </span>
                      <select
                        className="input"
                        name={`warehouse-${line.id}`}
                        required
                        disabled={!canInvoiceReservedLines}
                        defaultValue={String(reservedLocationsByLine.get(line.id)?.[0]?.location_id ?? '')}
                      >
                        {warehouses.data.data.filter((warehouse) => reservedLocationsByLine.get(line.id)?.some((allocation) => allocation.location_id === warehouse.id)).map((warehouse) => (
                          <option key={warehouse.id} value={warehouse.id}>
                            {warehouse.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                  <button className="button button-primary" disabled={!canInvoiceReservedLines} type="submit">
                    {ar.orders.invoiceOrder}
                  </button>
                </form>
              )}
            </>
          )}
        </section>
      )}
      {activeTab === 'deliveries' && (
        <section aria-labelledby="order-detail-deliveries-title">
          <h2 id="order-detail-deliveries-title">{ar.orders.relatedDeliveries}</h2>
          {current.delivery_ids.length ? (
            <ul>
              {current.delivery_ids.map((id) => (
                <li key={id}>
                  <Link to={`/deliveries/${id}`}>
                    {ar.orders.deliveryNumber} {id}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <PageState kind="empty" title={ar.common.noResults} />
          )}
        </section>
      )}
      {activeTab === 'invoices' && (
        <section aria-labelledby="order-detail-invoices-title">
          <h2 id="order-detail-invoices-title">{ar.orders.relatedInvoices}</h2>
          {current.invoice_ids.length ? (
            <ul>
              {current.invoice_ids.map((id) => (
                <li key={id}>
                  <Link to={`/invoices/${id}`}>
                    {ar.sales.invoiceDetails} {id}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <PageState kind="empty" title={ar.common.noResults} />
          )}
        </section>
      )}
    </section>
  );
}
