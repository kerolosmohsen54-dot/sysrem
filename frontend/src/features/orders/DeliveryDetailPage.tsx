import { newIdempotencyKey } from '../../shared/api/http';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError } from '../../shared/api/errors';
import { useAuth } from '../../shared/auth/AuthProvider';
import { PageState } from '../../shared/components/PageState';
import { DataTable, type DataColumn } from '../../shared/components/DataTable';
import { ar } from '../../shared/i18n/ar';
import { formatDate } from '../../shared/utils/format';
import { getDelivery, updateDeliveryStatus, type DeliveryLineRecord, type DeliveryStatus } from './api';

export function DeliveryDetailPage() {
  const { deliveryId = '' } = useParams();
  const validId = /^[1-9]\d*$/.test(deliveryId);
  const { user } = useAuth();
  const client = useQueryClient();
  const canManage = Boolean(
    user?.permissions.includes('*') || user?.permissions.includes('deliveries.manage'),
  );
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const key = useRef<string | null>(null);
  const delivery = useQuery({
    queryKey: ['/deliveries', deliveryId],
    queryFn: () => getDelivery(deliveryId),
    enabled: validId,
  });

  if (!validId) return <PageState kind="error" title={ar.common.invalidIdentifier} />;
  if (delivery.isLoading) return <PageState kind="loading" />;
  if (delivery.isError || !delivery.data) {
    return (
      <PageState
        kind="error"
        message={ar.common.requestFailed}
        onRetry={() => void delivery.refetch()}
      />
    );
  }
  const current = delivery.data;
  const availableStatuses: Exclude<DeliveryStatus, 'draft'>[] = current.status === 'draft'
    ? ['preparing', 'cancelled']
    : current.status === 'preparing'
      ? ['in_transit', 'cancelled']
      : current.status === 'in_transit'
        ? ['delivered']
        : [];
  const lineColumns: DataColumn<DeliveryLineRecord>[] = [
    { key: 'product', header: ar.nav.products, render: (row) => <>{row.product_name}<small className="field-hint">{row.sku}</small></> },
    { key: 'quantity', header: ar.common.quantity, render: (row) => String(row.quantity) },
    { key: 'warehouse', header: 'مخزن الخصم', render: (row) => row.source_location_name || '—' },
    { key: 'movement', header: 'حركة المخزون', render: (row) => <Link to={`/inventory/movements/${row.inventory_movement_id}`}>{row.movement_number}</Link> },
    { key: 'date', header: ar.common.date, render: (row) => formatDate(row.movement_date) },
  ];
  const updateStatus = async (status: Exclude<DeliveryStatus, 'draft'>) => {
    setError('');
    setSuccess('');
    key.current ??= newIdempotencyKey();
    try {
      await updateDeliveryStatus(deliveryId, status, key.current);
      key.current = null;
      setSuccess(ar.common.actionSaved);
      await Promise.all([
        client.invalidateQueries({ queryKey: ['/deliveries'] }),
        client.invalidateQueries({ queryKey: ['/inventory'] }),
        client.invalidateQueries({ queryKey: ['/inventory/movements'] }),
      ]);
      await delivery.refetch();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : ar.common.networkError);
    }
  };

  return (
    <section className="page inventory-page">
      <header className="page-heading">
        <div>
          <h1>
            {ar.orders.deliveryNumber}: {current.delivery_number}
          </h1>
          <p>{ar.orders.deliveryStatuses[current.status]}</p>
        </div>
        <div className="row-actions invoice-print-actions">
          <button className="button button-primary" onClick={() => window.print()} type="button">طباعة إذن التسليم</button>
          <Link className="button button-secondary" to="/deliveries">{ar.common.back}</Link>
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
      <dl className="invoice-detail-summary">
        <div>
          <dt>{ar.common.reference}</dt>
          <dd>{current.source_number}</dd>
        </div>
        <div>
          <dt>{ar.orders.recipient}</dt>
          <dd>{current.recipient_name || '—'}</dd>
        </div>
        <div>
          <dt>{ar.orders.driverName}</dt>
          <dd>{current.driver_name || current.driver_name_snapshot || '—'}</dd>
        </div>
        <div>
          <dt>{ar.orders.vehiclePlate}</dt>
          <dd>{current.vehicle_plate || '—'}</dd>
        </div>
        <div>
          <dt>{ar.common.date}</dt>
          <dd>{current.delivery_date ? formatDate(current.delivery_date) : '—'}</dd>
        </div>
        <div>
          <dt>مخزن الصرف</dt>
          <dd>{current.source_location_name || '—'}</dd>
        </div>
        <div>
          <dt>طريقة النقل</dt>
          <dd>{current.transport_method || '—'}</dd>
        </div>
        <div>
          <dt>{ar.orders.deliveryAddress}</dt>
          <dd>{current.delivery_address || '—'}</dd>
        </div>
        <div>
          <dt>{ar.orders.deliveryStatus}</dt>
          <dd>{ar.orders.deliveryStatuses[current.status]}</dd>
        </div>
      </dl>
      {current.sales_order_id !== null && (
        <p>
          <Link to={`/orders/${current.sales_order_id}`}>{ar.orders.orderDetails}</Link>
        </p>
      )}
      {current.sales_document_id !== null && (
        <p>
          <Link to={`/invoices/${current.sales_document_id}`}>{ar.sales.invoiceDetails}</Link>
        </p>
      )}
      {current.lines && <section aria-labelledby="delivery-lines-title"><h2 id="delivery-lines-title">الأصناف وحركات الخصم</h2><DataTable columns={lineColumns} rows={current.lines} getRowKey={(row) => row.id} emptyMessage={ar.common.noResults} /></section>}
      {canManage && availableStatuses.length > 0 && (
        <section aria-labelledby="delivery-status-actions-title">
          <h2 id="delivery-status-actions-title">{ar.orders.changeDeliveryStatus}</h2>
          {availableStatuses.map((status) => (
            <button
              className="button button-secondary"
              key={status}
              disabled={delivery.isFetching}
              onClick={() => void updateStatus(status)}
              type="button"
            >
              {status === 'in_transit' ? 'اعتماد وإرسال للشحن' : ar.orders.deliveryStatuses[status]}
            </button>
          ))}
        </section>
      )}
    </section>
  );
}
