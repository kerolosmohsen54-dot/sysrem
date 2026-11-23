import { useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError } from '../../shared/api/errors';
import { useAuth } from '../../shared/auth/AuthProvider';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import { getDelivery, updateDeliveryStatus, type DeliveryStatus } from './api';

const nextStatuses: Exclude<DeliveryStatus, 'draft'>[] = [
  'preparing',
  'in_transit',
  'delivered',
  'cancelled',
];

export function DeliveryDetailPage() {
  const { deliveryId = '' } = useParams();
  const validId = /^[1-9]\d*$/.test(deliveryId);
  const { user } = useAuth();
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
  const updateStatus = async (status: Exclude<DeliveryStatus, 'draft'>) => {
    setError('');
    setSuccess('');
    key.current ??= crypto.randomUUID();
    try {
      await updateDeliveryStatus(deliveryId, status, key.current);
      key.current = null;
      setSuccess(ar.common.actionSaved);
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
        <Link className="button button-secondary" to="/deliveries">
          {ar.common.back}
        </Link>
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
          <dd>{current.driver_name_snapshot || '—'}</dd>
        </div>
        <div>
          <dt>{ar.orders.vehiclePlate}</dt>
          <dd>{current.vehicle_plate || '—'}</dd>
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
      {canManage && current.status !== 'delivered' && current.status !== 'cancelled' && (
        <section aria-labelledby="delivery-status-actions-title">
          <h2 id="delivery-status-actions-title">{ar.orders.changeDeliveryStatus}</h2>
          {nextStatuses.map((status) => (
            <button
              className="button button-secondary"
              key={status}
              onClick={() => void updateStatus(status)}
              type="button"
            >
              {ar.orders.deliveryStatuses[status]}
            </button>
          ))}
        </section>
      )}
    </section>
  );
}
