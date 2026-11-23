import { useQuery } from '@tanstack/react-query';
import { useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError } from '../../shared/api/errors';
import { FormField } from '../../shared/components/FormField';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import type { ListQuery } from '../inventory/api';
import { listInvoices } from '../sales/api';
import { createDelivery, listOrders } from './api';

const optionsQuery: ListQuery = { page: 1, perPage: 100, search: '' };

function positiveInteger(value: string): number {
  if (!/^[1-9]\d*$/.test(value)) throw new Error(ar.common.quantityMustBeInteger);
  const parsed = BigInt(value);
  if (parsed > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error(ar.common.quantityMustBeInteger);
  return Number(parsed);
}

export function DeliveryFormPage() {
  const navigate = useNavigate();
  const key = useRef<string | null>(null);
  const [sourceType, setSourceType] = useState<'order' | 'invoice'>('order');
  const [error, setError] = useState('');
  const orders = useQuery({
    queryKey: ['/orders', 'delivery-sources'],
    queryFn: () => listOrders(optionsQuery, { status: 'fulfilled' }),
  });
  const invoices = useQuery({
    queryKey: ['/invoices', 'delivery-sources'],
    queryFn: () => listInvoices(optionsQuery),
  });

  if (orders.isLoading || invoices.isLoading) return <PageState kind="loading" />;
  if (orders.isError || invoices.isError || !orders.data || !invoices.data) {
    return (
      <PageState
        kind="error"
        message={ar.common.requestFailed}
        onRetry={() => {
          void orders.refetch();
          void invoices.refetch();
        }}
      />
    );
  }
  const eligibleOrders = orders.data.data;
  const eligibleInvoices = invoices.data.data.filter(
    (invoice) => invoice.status === 'issued' || invoice.status === 'paid',
  );
  const activeSourceType =
    sourceType === 'order' && eligibleOrders.length === 0 && eligibleInvoices.length > 0
      ? 'invoice'
      : sourceType;
  const noSources = eligibleOrders.length === 0 && eligibleInvoices.length === 0;
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    key.current ??= crypto.randomUUID();
    const values = new FormData(event.currentTarget);
    try {
      const sourceId = positiveInteger(String(values.get('source_id') ?? ''));
      const delivery = await createDelivery(
        {
          ...(activeSourceType === 'order'
            ? { sales_order_id: sourceId }
            : { sales_document_id: sourceId }),
          driver_user_id: null,
          driver_name_snapshot: String(values.get('driver_name_snapshot') ?? '').trim() || null,
          vehicle_plate: String(values.get('vehicle_plate') ?? '').trim() || null,
          delivery_address: String(values.get('delivery_address') ?? '').trim() || null,
          notes: String(values.get('notes') ?? '').trim() || null,
        },
        key.current,
      );
      key.current = null;
      navigate(`/deliveries/${delivery.id}`);
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : cause instanceof Error
            ? cause.message
            : ar.common.networkError,
      );
    }
  };

  return (
    <section className="page inventory-page">
      <header className="page-heading">
        <div>
          <h1>{ar.orders.newDelivery}</h1>
          <p>{ar.orders.deliveryDescription}</p>
        </div>
        <Link className="button button-secondary" to="/deliveries">
          {ar.common.cancel}
        </Link>
      </header>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      {noSources ? (
        <PageState kind="empty" title={ar.orders.deliverySourceUnavailable} />
      ) : (
        <form className="stack-form" onSubmit={submit}>
          <label className="form-field">
            <span>{ar.customers.documentType}</span>
            <select
              className="input"
              value={activeSourceType}
              onChange={(event) => {
                if (
                  event.currentTarget.value === 'order' ||
                  event.currentTarget.value === 'invoice'
                ) {
                  setSourceType(event.currentTarget.value);
                }
              }}
            >
              <option value="order">{ar.orders.sourceOrder}</option>
              <option value="invoice">{ar.orders.sourceInvoice}</option>
            </select>
          </label>
          <label className="form-field">
            <span>
              {activeSourceType === 'order' ? ar.orders.sourceOrder : ar.orders.sourceInvoice}
            </span>
            <select
              className="input"
              key={activeSourceType}
              name="source_id"
              required
              defaultValue=""
            >
              <option value="">{ar.common.select}</option>
              {(activeSourceType === 'order' ? eligibleOrders : eligibleInvoices).map((item) => (
                <option key={item.id} value={item.id}>
                  {'order_number' in item ? item.order_number : item.invoice_number} —{' '}
                  {item.customer_name}
                </option>
              ))}
            </select>
          </label>
          <FormField
            id="delivery-driver"
            label={ar.orders.driverName}
            name="driver_name_snapshot"
            maxLength={160}
          />
          <FormField
            id="delivery-vehicle"
            label={ar.orders.vehiclePlate}
            name="vehicle_plate"
            maxLength={40}
          />
          <FormField
            id="delivery-address"
            label={ar.orders.deliveryAddress}
            name="delivery_address"
            maxLength={500}
          />
          <FormField id="delivery-notes" label={ar.orders.deliveryNotes} name="notes" />
          <p className="inline-alert">{ar.orders.deliveryDescription}</p>
          <button className="button button-primary" type="submit">
            {ar.orders.newDelivery}
          </button>
        </form>
      )}
    </section>
  );
}
