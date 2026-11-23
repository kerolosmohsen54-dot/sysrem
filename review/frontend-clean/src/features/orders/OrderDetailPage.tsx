import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '../../shared/api/errors';
import { useAuth } from '../../shared/auth/AuthProvider';
import { DataTable, type DataColumn } from '../../shared/components/DataTable';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import { formatDate, formatMoney, formatQuantity } from '../../shared/utils/format';
import { listResource, type ListQuery, type Warehouse } from '../inventory/api';
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
    queryFn: () => listResource<Warehouse>('/warehouses', optionsQuery),
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
  const columns: DataColumn<OrderLine>[] = [
    { key: 'product', header: ar.common.product, render: (row) => row.product_name },
    { key: 'sku', header: ar.common.sku, render: (row) => row.sku },
    { key: 'quantity', header: ar.common.quantity, render: (row) => formatQuantity(row.quantity) },
    { key: 'price', header: ar.orders.unitPrice, render: (row) => formatMoney(row.unit_price_egp) },
  ];

  const confirm = async () => {
    setError('');
    setSuccess('');
    confirmKey.current ??= crypto.randomUUID();
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
    cancelKey.current ??= crypto.randomUUID();
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
    invoiceKey.current ??= crypto.randomUUID();
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
          {current.status === 'fulfilled' && (
            <Link className="button button-secondary" to="/deliveries/new">
              {ar.orders.newDelivery}
            </Link>
          )}
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
            <div>
              <dt>{ar.orders.orderDate}</dt>
              <dd>{formatDate(current.order_date)}</dd>
            </div>
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
          </dl>
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
          <h2 id="order-detail-fulfillment-title">{ar.orders.reservationsUnavailable}</h2>
          <p>{ar.orders.noStockReservation}</p>
          {current.stock_warnings.map((warning) => (
            <p className="inline-alert" key={warning.product_id} role="status">
              {ar.orders.stockWarning}: {warning.product_name} —{' '}
              {formatQuantity(warning.available_quantity)} /{' '}
              {formatQuantity(warning.requested_quantity)}
            </p>
          ))}
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
                  {current.lines.map((line) => (
                    <label className="form-field" key={line.id}>
                      <span>
                        {line.product_name} — {ar.common.warehouse}
                      </span>
                      <select
                        className="input"
                        name={`warehouse-${line.id}`}
                        required
                        defaultValue=""
                      >
                        <option value="">{ar.common.select}</option>
                        {warehouses.data.data.map((warehouse) => (
                          <option key={warehouse.id} value={warehouse.id}>
                            {warehouse.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                  <button className="button button-primary" type="submit">
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
