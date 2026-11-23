import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DataTable, type DataColumn } from '../../shared/components/DataTable';
import { PageState } from '../../shared/components/PageState';
import { useAuth } from '../../shared/auth/AuthProvider';
import { ar } from '../../shared/i18n/ar';
import { formatDate, formatMoney } from '../../shared/utils/format';
import type { ListQuery } from '../inventory/api';
import { getOrderOptions, listOrders, type OrderRecord, type OrderStatus } from './api';

const statuses: OrderStatus[] = ['draft', 'confirmed', 'fulfilled', 'cancelled'];

export function OrdersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = Boolean(user?.permissions.includes('*') || user?.permissions.includes('orders.manage'));
  const canDeliver = Boolean(user?.permissions.includes('*') || user?.permissions.includes('deliveries.manage'));
  const [query, setQuery] = useState<ListQuery>({ page: 1, perPage: 10, search: '' });
  const [status, setStatus] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [salespersonId, setSalespersonId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sortBy, setSortBy] = useState('order_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const options = useQuery({ queryKey: ['/orders/options'], queryFn: getOrderOptions });
  const result = useQuery({
    queryKey: ['/orders', query, status, warehouseId, salespersonId, paymentMethod, fromDate, toDate, sortBy, sortDirection],
    queryFn: () => listOrders(
      { ...query, sortBy, sortDirection },
      {
        ...(status ? { status } : {}),
        ...(warehouseId ? { warehouse_id: warehouseId } : {}),
        ...(salespersonId ? { salesperson_id: salespersonId } : {}),
        ...(paymentMethod ? { payment_method: paymentMethod } : {}),
        ...(fromDate ? { from_date: fromDate } : {}),
        ...(toDate ? { to_date: toDate } : {}),
      },
    ),
  });
  const columns: DataColumn<OrderRecord>[] = [
    {
      key: 'number',
      header: ar.orders.orderNumber,
      render: (row) => <Link to={`/orders/${row.id}`}>{row.order_number}</Link>,
    },
    { key: 'customer', header: ar.common.customer, render: (row) => row.customer_name },
    { key: 'date', header: ar.common.date, render: (row) => formatDate(row.order_date) },
    {
      key: 'total',
      header: ar.common.total,
      render: (row) =>
        row.total_egp === null ? ar.common.notProvided : formatMoney(row.total_egp),
    },
    { key: 'lines', header: ar.orders.orderLines, render: (row) => String(row.line_count) },
    { key: 'reserved', header: 'المحجوز', render: (row) => <bdi dir="ltr">{String(row.quantity_reserved ?? 0)}</bdi> },
    {
      key: 'status',
      header: ar.orders.orderStatus,
      render: (row) => ar.orders.orderStatuses[row.status],
    },
    {
      key: 'delivery',
      header: 'إذن التسليم',
      render: (row) => row.status === 'fulfilled' && canDeliver
        ? <Link className="button button-quiet button-sm" to={'/deliveries/new?orderId=' + row.id}>إنشاء إذن</Link>
        : <span>—</span>,
    },
  ];

  return (
    <section className="page inventory-page">
      <header className="page-heading">
        <div>
          <h1>{ar.nav.orders}</h1>
          <p>{ar.orders.ordersDescription}</p>
        </div>
        <div className="row-actions">
          <Link className="button button-secondary" to="/deliveries">
            {ar.nav.deliveries}
          </Link>
          {canManage && <button className="button button-primary" onClick={() => navigate('/orders/new')} type="button">{ar.orders.createOrder}</button>}
        </div>
      </header>
      <div className="orders-toolbar">
        <label className="inventory-search">
          <span>{ar.common.search}</span>
          <input
            aria-label={ar.common.search}
            className="input"
            type="search"
            value={query.search}
            onChange={(event) => {
              const search = event.currentTarget.value;
              setQuery((current) => ({ ...current, search, page: 1 }));
            }}
          />
        </label>
        <div aria-label={ar.orders.orderStatus} className="order-status-filters" role="group">
          <button
            aria-pressed={status === ''}
            className={`order-filter-button${status === '' ? ' is-active' : ''}`}
            onClick={() => {
              setStatus('');
              setQuery((current) => ({ ...current, page: 1 }));
            }}
            type="button"
          >
            {ar.inventory.all}
          </button>
          {statuses.map((item) => (
            <button
              aria-pressed={status === item}
              className={`order-filter-button${status === item ? ' is-active' : ''}`}
              key={item}
              onClick={() => {
                setStatus(item);
                setQuery((current) => ({ ...current, page: 1 }));
              }}
              type="button"
            >
              {ar.orders.orderStatuses[item]}
            </button>
          ))}
        </div>
        <label className="inventory-search">
          <span>{ar.common.warehouse}</span>
          <select className="input" value={warehouseId} onChange={(event) => { setWarehouseId(event.currentTarget.value); setQuery((current) => ({ ...current, page: 1 })); }}>
            <option value="">{ar.inventory.all}</option>
            {options.data?.warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
          </select>
        </label>
        <label className="inventory-search">
          <span>المندوب</span>
          <select className="input" value={salespersonId} onChange={(event) => { setSalespersonId(event.currentTarget.value); setQuery((current) => ({ ...current, page: 1 })); }}>
            <option value="">{ar.inventory.all}</option>
            {options.data?.salespeople.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
          </select>
        </label>
        <label className="inventory-search">
          <span>طريقة الدفع</span>
          <select className="input" value={paymentMethod} onChange={(event) => { setPaymentMethod(event.currentTarget.value); setQuery((current) => ({ ...current, page: 1 })); }}>
            <option value="">{ar.inventory.all}</option>
            {options.data?.payment_methods.map((method) => <option key={method.code} value={method.code}>{method.name}</option>)}
          </select>
        </label>
        <label className="inventory-search">
          <span>من تاريخ</span>
          <input className="input" type="date" value={fromDate} onChange={(event) => { setFromDate(event.currentTarget.value); setQuery((current) => ({ ...current, page: 1 })); }} />
        </label>
        <label className="inventory-search">
          <span>إلى تاريخ</span>
          <input className="input" type="date" value={toDate} onChange={(event) => { setToDate(event.currentTarget.value); setQuery((current) => ({ ...current, page: 1 })); }} />
        </label>
        <label className="inventory-search">
          <span>الترتيب</span>
          <select className="input" value={sortBy} onChange={(event) => setSortBy(event.currentTarget.value)}>
            <option value="order_date">{ar.common.date}</option><option value="order_number">{ar.orders.orderNumber}</option><option value="customer">{ar.common.customer}</option><option value="total">{ar.common.total}</option><option value="status">{ar.orders.orderStatus}</option>
          </select>
        </label>
        <button className="button button-secondary" aria-label="تغيير اتجاه الترتيب" onClick={() => setSortDirection((direction) => direction === 'asc' ? 'desc' : 'asc')} type="button">
          {sortDirection === 'asc' ? 'تصاعدي ↑' : 'تنازلي ↓'}
        </button>
      </div>
      {options.isError && <PageState kind="error" message={ar.common.requestFailed} onRetry={() => void options.refetch()} />}
      {result.isLoading ? (
        <PageState kind="loading" />
      ) : result.isError ? (
        <PageState
          kind="error"
          message={ar.common.requestFailed}
          onRetry={() => void result.refetch()}
        />
      ) : result.data ? (
        <>
          <DataTable
            columns={columns}
            rows={result.data.data}
            getRowKey={(row) => row.id}
            emptyMessage={ar.common.noResults}
            showHeadersWhenEmpty
          />
          <nav aria-label={ar.inventory.paginationLabel} className="inventory-pagination">
            <button
              className="button button-secondary"
              disabled={query.page <= 1}
              onClick={() => setQuery((current) => ({ ...current, page: current.page - 1 }))}
              type="button"
            >
              {ar.common.previous}
            </button>
            <span>
              {ar.common.page} {query.page} {ar.common.of} {result.data.meta.last_page}
            </span>
            <button
              className="button button-secondary"
              disabled={query.page >= result.data.meta.last_page}
              onClick={() => setQuery((current) => ({ ...current, page: current.page + 1 }))}
              type="button"
            >
              {ar.common.next}
            </button>
          </nav>
        </>
      ) : null}
    </section>
  );
}
