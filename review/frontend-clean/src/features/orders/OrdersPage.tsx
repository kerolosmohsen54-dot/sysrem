import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DataTable, type DataColumn } from '../../shared/components/DataTable';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import { formatDate, formatMoney } from '../../shared/utils/format';
import type { ListQuery } from '../inventory/api';
import { listOrders, type OrderRecord, type OrderStatus } from './api';

const statuses: OrderStatus[] = ['draft', 'confirmed', 'fulfilled', 'cancelled'];

export function OrdersPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState<ListQuery>({ page: 1, perPage: 10, search: '' });
  const [status, setStatus] = useState('');
  const result = useQuery({
    queryKey: ['/orders', query, status],
    queryFn: () => listOrders(query, status ? { status } : {}),
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
    {
      key: 'status',
      header: ar.orders.orderStatus,
      render: (row) => ar.orders.orderStatuses[row.status],
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
          <button
            className="button button-primary"
            onClick={() => navigate('/orders/new')}
            type="button"
          >
            {ar.orders.createOrder}
          </button>
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
            onChange={(event) =>
              setQuery((current) => ({ ...current, search: event.currentTarget.value, page: 1 }))
            }
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
      </div>
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
