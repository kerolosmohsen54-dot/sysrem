import { newIdempotencyKey } from '../../shared/api/http';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError } from '../../shared/api/errors';
import { FormField } from '../../shared/components/FormField';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import type { ListQuery, Warehouse } from '../inventory/api';
import { listResource } from '../inventory/api';
import { getInvoice, listInvoices, type InvoiceDetail } from '../sales/api';
import { listDrivers } from '../admin/referenceApi';
import { createDelivery, getOrder, listOrders, type OrderDetail } from './api';

const optionsQuery: ListQuery = { page: 1, perPage: 100, search: '' };

function positiveInteger(value: string): number {
  if (!/^[1-9]\d*$/.test(value)) throw new Error(ar.common.quantityMustBeInteger);
  const parsed = BigInt(value);
  if (parsed > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error(ar.common.quantityMustBeInteger);
  return Number(parsed);
}

function today(): string {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

type DeliverySourceLine = {
  id: number;
  productName: string;
  sku: string;
  quantity: number;
  sourceWarehouseId: number | null;
};

export function DeliveryFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId') ?? '';
  const [sourceId, setSourceId] = useState(orderId);
  const [warehouseId, setWarehouseId] = useState('');
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
  const drivers = useQuery({
    queryKey: ['/drivers', 'delivery-form'],
    queryFn: () => listDrivers(optionsQuery),
  });
  const warehouses = useQuery({
    queryKey: ['/warehouses', 'delivery-form'],
    queryFn: () => listResource<Warehouse>('/warehouses', optionsQuery),
  });
  const eligibleOrders = orders.data?.data ?? [];
  const eligibleInvoices = (invoices.data?.data ?? []).filter(
    (invoice) => invoice.status === 'issued' || invoice.status === 'paid',
  );

  useEffect(() => {
    if (orders.isSuccess && invoices.isSuccess && sourceType === 'order' && eligibleOrders.length === 0 && eligibleInvoices.length > 0) {
      setSourceType('invoice');
      setSourceId('');
      setWarehouseId('');
    }
  }, [orders.isSuccess, invoices.isSuccess, sourceType, eligibleOrders.length, eligibleInvoices.length]);

  const sourceDetails = useQuery<OrderDetail | InvoiceDetail>({
    queryKey: ['/delivery-source', sourceType, sourceId],
    queryFn: async (): Promise<OrderDetail | InvoiceDetail> => sourceType === 'order' ? getOrder(sourceId) : getInvoice(sourceId),
    enabled: sourceId.length > 0,
  });

  if (orders.isLoading || invoices.isLoading || drivers.isLoading || warehouses.isLoading) return <PageState kind="loading" />;
  if (orders.isError || invoices.isError || drivers.isError || warehouses.isError || !orders.data || !invoices.data || !drivers.data || !warehouses.data) {
    return (
      <PageState
        kind="error"
        message={ar.common.requestFailed}
        onRetry={() => {
          void orders.refetch();
          void invoices.refetch();
          void drivers.refetch();
          void warehouses.refetch();
        }}
      />
    );
  }

  const activeSourceType = sourceType;
  const noSources = eligibleOrders.length === 0 && eligibleInvoices.length === 0;
  const orderDetail = activeSourceType === 'order' ? sourceDetails.data as OrderDetail | undefined : undefined;
  const invoiceDetail = activeSourceType === 'invoice' ? sourceDetails.data as InvoiceDetail | undefined : undefined;
  const sourceLines: DeliverySourceLine[] = activeSourceType === 'order'
    ? (orderDetail?.lines ?? []).map((line) => ({
        id: line.id,
        productName: line.product_name,
        sku: line.sku,
        quantity: Number(line.quantity),
        sourceWarehouseId: orderDetail?.reservations
          .find((reservation) => reservation.order_line_id === line.id)?.allocations[0]?.location_id
          ?? orderDetail?.warehouse_id
          ?? null,
      }))
    : (invoiceDetail?.lines ?? []).map((line) => ({
        id: line.id ?? line.product_id ?? 0,
        productName: line.product_name,
        sku: line.sku || '',
        quantity: Number(line.quantity),
        sourceWarehouseId: line.warehouse_id ?? line.location_id ?? null,
      }));
  const sourceWarehouseIds = [...new Set([
    ...sourceLines.map((line) => line.sourceWarehouseId),
    ...(orderDetail?.reservations ?? []).flatMap((reservation) => reservation.allocations.map((allocation) => allocation.location_id)),
  ].filter((id): id is number => id !== null))];
  const sourceWarehouseOptions = warehouses.data.data.filter((warehouse) => sourceWarehouseIds.includes(warehouse.id));
  const chosenWarehouseId = warehouseId || (sourceWarehouseIds.length === 1 ? String(sourceWarehouseIds[0]) : '');
  const customerName = orderDetail?.customer_name ?? invoiceDetail?.customer_name ?? '';
  const sourceNumber = orderDetail?.order_number ?? invoiceDetail?.invoice_number ?? '';
  const totalQuantity = sourceLines.reduce((total, line) => total + line.quantity, 0);
  const sourceReady = Boolean(sourceId && sourceDetails.data && sourceLines.length > 0);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    key.current ??= newIdempotencyKey();
    const values = new FormData(event.currentTarget);
    try {
      const selectedSourceId = positiveInteger(String(values.get('source_id') ?? ''));
      const selectedWarehouseId = positiveInteger(String(values.get('source_location_id') ?? ''));
      const delivery = await createDelivery(
        {
          ...(activeSourceType === 'order'
            ? { sales_order_id: selectedSourceId }
            : { sales_document_id: selectedSourceId }),
          driver_user_id: null,
          shipping_driver_id: values.get('shipping_driver_id') ? positiveInteger(String(values.get('shipping_driver_id'))) : null,
          driver_name_snapshot: String(values.get('driver_name_snapshot') ?? '').trim() || null,
          vehicle_plate: String(values.get('vehicle_plate') ?? '').trim() || null,
          delivery_address: String(values.get('delivery_address') ?? '').trim() || null,
          delivery_date: String(values.get('delivery_date') ?? ''),
          source_location_id: selectedWarehouseId,
          transport_method: String(values.get('transport_method') ?? '').trim() || null,
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
        <Link className="button button-secondary" to="/deliveries">{ar.common.cancel}</Link>
      </header>
      {error && <p className="field-error" role="alert">{error}</p>}
      {noSources ? (
        <PageState kind="empty" title={ar.orders.deliverySourceUnavailable} />
      ) : (
        <form className="stack-form delivery-form" onSubmit={submit}>
          <div className="delivery-form-grid">
            <label className="form-field">
              <span>{ar.customers.documentType}</span>
              <select
                className="input"
                value={activeSourceType}
                onChange={(event) => {
                  const nextType = event.currentTarget.value;
                  if (nextType === 'order' || nextType === 'invoice') {
                    setSourceType(nextType);
                    setSourceId('');
                    setWarehouseId('');
                  }
                }}
              >
                <option disabled={eligibleOrders.length === 0} value="order">{ar.orders.sourceOrder}</option>
                <option disabled={eligibleInvoices.length === 0} value="invoice">{ar.orders.sourceInvoice}</option>
              </select>
            </label>
            <label className="form-field">
              <span>{activeSourceType === 'order' ? ar.orders.sourceOrder : ar.orders.sourceInvoice}</span>
              <select
                className="input"
                name="source_id"
                required
                value={sourceId}
                onChange={(event) => {
                  setSourceId(event.currentTarget.value);
                  setWarehouseId('');
                }}
              >
                <option value="">{ar.common.select}</option>
                {(activeSourceType === 'order' ? eligibleOrders : eligibleInvoices).map((item) => (
                  <option key={item.id} value={item.id}>
                    {'order_number' in item ? item.order_number : item.invoice_number} — {item.customer_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>مخزن الصرف</span>
              <select
                className="input"
                name="source_location_id"
                required
                value={chosenWarehouseId}
                disabled={!sourceReady || sourceWarehouseOptions.length === 0}
                onChange={(event) => setWarehouseId(event.currentTarget.value)}
              >
                <option value="">{sourceWarehouseOptions.length ? ar.common.select : 'اختر الفاتورة أولاً'}</option>
                {sourceWarehouseOptions.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
              </select>
            </label>
            <FormField id="delivery-date" label={ar.common.date} name="delivery_date" type="date" required defaultValue={today()} />
            <label className="form-field">
              <span>{ar.orders.driverName}</span>
              <select className="input" name="shipping_driver_id" defaultValue="">
                <option value="">بدون سائق مسجل</option>
                {drivers.data.data.filter((driver) => driver.is_active).map((driver) => <option key={driver.id} value={driver.id}>{driver.name}{driver.shipping_company ? ` — ${driver.shipping_company}` : ''}</option>)}
              </select>
            </label>
            <FormField id="delivery-driver-name" label="اسم سائق غير مسجل (اختياري)" name="driver_name_snapshot" maxLength={160} />
            <FormField id="delivery-vehicle" label={ar.orders.vehiclePlate} name="vehicle_plate" maxLength={40} />
            <FormField id="delivery-method" label="طريقة النقل" name="transport_method" maxLength={64} />
          </div>

          <section className="card delivery-source-card" aria-label="بيانات المصدر">
            <div><span className="field-hint">المستلم</span><strong>{customerName || (sourceId ? 'جارٍ تحميل المصدر…' : '—')}</strong></div>
            <div><span className="field-hint">مرجع البيع</span><strong>{sourceNumber || '—'}</strong></div>
            <div><span className="field-hint">إجمالي الكمية المطلوبة</span><strong>{totalQuantity}</strong></div>
          </section>
          {sourceDetails.isError && <p className="field-error" role="alert">تعذر تحميل بيانات مصدر إذن التسليم.</p>}
          {sourceDetails.isLoading && sourceId && <PageState kind="loading" />}
          {sourceWarehouseIds.length > 1 && <p className="field-error" role="alert">مصدر البيع موزع على أكثر من مخزن. يلزم إصدار فاتورة منفصلة لكل مخزن قبل إنشاء إذن التسليم.</p>}
          <label className="form-field">
            <span>{ar.orders.deliveryAddress}</span>
            <input className="input" id="delivery-address" name="delivery_address" maxLength={500} defaultValue={orderDetail?.customer_address ?? ''} />
          </label>
          {sourceReady && (
            <section aria-labelledby="delivery-source-lines-title">
              <h2 id="delivery-source-lines-title">أصناف إذن التسليم</h2>
              <div className="table-scroll"><table className="data-table">
                <thead><tr><th>{ar.nav.products}</th><th>SKU</th><th>الكمية المطلوبة</th><th>مخزن حركة البيع</th></tr></thead>
                <tbody>{sourceLines.map((line) => (
                  <tr key={`${line.id}-${line.sourceWarehouseId ?? 'none'}`}>
                    <td>{line.productName}</td><td>{line.sku || '—'}</td><td>{line.quantity}</td>
                    <td>{warehouses.data.data.find((warehouse) => warehouse.id === line.sourceWarehouseId)?.name ?? '—'}</td>
                  </tr>
                ))}</tbody>
              </table></div>
            </section>
          )}
          <label className="form-field">
            <span>{ar.orders.deliveryNotes}</span>
            <textarea className="input" id="delivery-notes" name="notes" maxLength={2000} rows={3} />
          </label>
          <p className="delivery-warning" role="note">يُعتمد الإذن على حركات خصم الفاتورة المرحلة، ويعرض مرجع كل حركة لتجنب خصم المخزون مرتين.</p>
          <button className="button button-primary" disabled={!sourceReady || sourceDetails.isLoading || sourceWarehouseOptions.length !== 1 || sourceWarehouseIds.length !== 1} type="submit">
            {ar.orders.newDelivery}
          </button>
        </form>
      )}
    </section>
  );
}
