import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DataTable, type DataColumn } from '../../shared/components/DataTable';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import type { ListQuery } from '../inventory/api';
import { listDeliveries, type DeliveryRecord, type DeliveryStatus } from './api';

const statuses: DeliveryStatus[] = ['draft', 'preparing', 'in_transit', 'delivered', 'cancelled'];
const statusFilters: (DeliveryStatus | '')[] = ['', ...statuses];

export function DeliveriesPage() {
  const [query, setQuery] = useState<ListQuery>({ page: 1, perPage: 10, search: '' });
  const [status, setStatus] = useState<DeliveryStatus | ''>('');
  const result = useQuery({
    queryKey: ['/deliveries', query, status],
    queryFn: () => listDeliveries(query, status ? { status } : {}),
  });
  const columns: DataColumn<DeliveryRecord>[] = [
    {
      key: 'number',
      header: ar.orders.deliveryNumber,
      render: (row) => <Link to={`/deliveries/${row.id}`}>{row.delivery_number}</Link>,
    },
    { key: 'source', header: ar.common.reference, render: (row) => row.source_number },
    { key: 'recipient', header: ar.orders.recipient, render: (row) => row.recipient_name || '—' },
    {
      key: 'driver',
      header: ar.orders.driverName,
      render: (row) => row.driver_name_snapshot || '—',
    },
    {
      key: 'status',
      header: ar.orders.deliveryStatus,
      render: (row) => ar.orders.deliveryStatuses[row.status],
    },
  ];

  return (
    <section className="page inventory-page">
      <header className="page-heading">
        <div>
          <h1>{ar.nav.deliveries}</h1>
          <p>{ar.orders.deliveryDescription}</p>
        </div>
        <div className="row-actions">
          <Link className="button button-secondary" to="/orders">
            {ar.nav.orders}
          </Link>
          <Link className="button button-primary" to="/deliveries/new">
            {ar.orders.newDelivery}
          </Link>
        </div>
      </header>
      <div aria-label={ar.orders.deliveryStatus} className="order-status-filters" role="group">
        {statusFilters.map((item) => (
          <button
            aria-pressed={status === item}
            className={status === item ? 'button button-primary' : 'button button-secondary'}
            key={item || 'all'}
            onClick={() => {
              setStatus(item);
              setQuery((current) => ({ ...current, page: 1 }));
            }}
            type="button"
          >
            {item ? ar.orders.deliveryStatuses[item] : ar.inventory.all}
          </button>
        ))}
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
