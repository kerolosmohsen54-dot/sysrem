import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError } from '../../shared/api/errors';
import { FormField } from '../../shared/components/FormField';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import { listCustomers } from '../customers/api';
import { listResource, type ListQuery, type Product } from '../inventory/api';
import { confirmOrder, createOrder, previewOrder, type OrderInput } from './api';
import { formatMoney } from '../../shared/utils/format';

const optionsQuery: ListQuery = { page: 1, perPage: 100, search: '' };
const amountPattern = /^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$/;

function positiveInteger(value: string): number {
  if (!/^[1-9]\d*$/.test(value)) throw new Error(ar.common.quantityMustBeInteger);
  const parsed = BigInt(value);
  if (parsed > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error(ar.common.quantityMustBeInteger);
  return Number(parsed);
}

export function OrderFormPage() {
  const navigate = useNavigate();
  const [lineIds, setLineIds] = useState([1]);
  const [error, setError] = useState('');
  const [previewInput, setPreviewInput] = useState<OrderInput | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const previewTimer = useRef<number | null>(null);
  const key = useRef<string | null>(null);
  const confirmKey = useRef<string | null>(null);
  const customers = useQuery({
    queryKey: ['/customers', 'order-options'],
    queryFn: () => listCustomers(optionsQuery),
  });
  const products = useQuery({
    queryKey: ['/products', 'order-options'],
    queryFn: () => listResource<Product>('/products', optionsQuery),
  });
  const preview = useQuery({
    queryKey: ['/orders/preview', previewInput],
    queryFn: () => {
      if (!previewInput) throw new Error(ar.common.requestFailed);
      return previewOrder(previewInput);
    },
    enabled: previewInput !== null,
  });

  useEffect(
    () => () => {
      if (previewTimer.current !== null) window.clearTimeout(previewTimer.current);
    },
    [],
  );

  const schedulePreview = () => {
    if (previewTimer.current !== null) window.clearTimeout(previewTimer.current);
    const form = formRef.current;
    if (!form?.checkValidity()) {
      setPreviewInput(null);
      return;
    }
    previewTimer.current = window.setTimeout(() => {
      const values = new FormData(form);
      try {
        setPreviewInput({
          customer_id: positiveInteger(String(values.get('customer_id') ?? '')),
          order_date: String(values.get('order_date') ?? ''),
          requested_delivery_date: String(values.get('requested_delivery_date') ?? '') || null,
          notes: String(values.get('notes') ?? '').trim() || null,
          lines: lineIds.map((id) => {
            const unitPrice = String(values.get(`unit_price_${id}`) ?? '');
            if (!amountPattern.test(unitPrice)) throw new Error(ar.inventory.invalidUnitCost);
            return {
              product_id: positiveInteger(String(values.get(`product_id_${id}`) ?? '')),
              quantity: positiveInteger(String(values.get(`quantity_${id}`) ?? '')),
              unit_price_egp: unitPrice,
              notes: String(values.get(`line_notes_${id}`) ?? '').trim() || null,
            };
          }),
        });
      } catch {
        setPreviewInput(null);
      }
    }, 300);
  };

  if (customers.isLoading || products.isLoading) return <PageState kind="loading" />;
  if (customers.isError || products.isError || !customers.data || !products.data) {
    return (
      <PageState
        kind="error"
        message={ar.common.requestFailed}
        onRetry={() => {
          void customers.refetch();
          void products.refetch();
        }}
      />
    );
  }

  const submit = async (confirmAfterSave = false) => {
    const form = formRef.current;
    if (!form?.reportValidity()) return;
    setError('');
    const values = new FormData(form);
    key.current ??= crypto.randomUUID();
    try {
      const lines = lineIds.map((id) => {
        const unitPrice = String(values.get(`unit_price_${id}`) ?? '');
        if (!amountPattern.test(unitPrice)) throw new Error(ar.inventory.invalidUnitCost);
        return {
          product_id: positiveInteger(String(values.get(`product_id_${id}`) ?? '')),
          quantity: positiveInteger(String(values.get(`quantity_${id}`) ?? '')),
          unit_price_egp: unitPrice,
          notes: String(values.get(`line_notes_${id}`) ?? '').trim() || null,
        };
      });
      const created = await createOrder(
        {
          customer_id: positiveInteger(String(values.get('customer_id') ?? '')),
          order_date: String(values.get('order_date') ?? ''),
          requested_delivery_date: String(values.get('requested_delivery_date') ?? '') || null,
          notes: String(values.get('notes') ?? '').trim() || null,
          lines,
        },
        key.current,
      );
      if (confirmAfterSave) {
        confirmKey.current ??= crypto.randomUUID();
        await confirmOrder(String(created.id), confirmKey.current);
      }
      key.current = null;
      confirmKey.current = null;
      navigate(`/orders/${created.id}`);
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
          <h1>{ar.orders.newOrder}</h1>
          <p>{ar.orders.serverPreviewWaiting}</p>
        </div>
        <Link className="button button-secondary" to="/orders">
          {ar.common.cancel}
        </Link>
      </header>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <form
        className="stack-form order-form"
        onChange={schedulePreview}
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        ref={formRef}
      >
        <section aria-label={ar.orders.newOrder} className="order-form-basics">
          <label className="form-field">
            <span>{ar.common.customer}</span>
            <select className="input" name="customer_id" required defaultValue="">
              <option value="">{ar.common.select}</option>
              {customers.data.data.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </label>
          <div className="form-grid">
            <FormField
              id="order-date"
              label={ar.orders.orderDate}
              name="order_date"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
            <FormField
              id="order-delivery-date"
              label={ar.orders.requestedDeliveryDate}
              name="requested_delivery_date"
              type="date"
            />
          </div>
          <FormField id="order-notes" label={ar.orders.orderNotes} name="notes" maxLength={1000} />
        </section>
        <section aria-labelledby="order-lines-title" className="order-lines-panel">
          <h2 id="order-lines-title">{ar.orders.orderLines}</h2>
          {lineIds.map((id) => (
            <fieldset className="invoice-line-editor" key={id}>
              <legend>
                {ar.orders.orderLines} {id}
              </legend>
              <label className="form-field">
                <span>{ar.common.product}</span>
                <select className="input" name={`product_id_${id}`} required defaultValue="">
                  <option value="">{ar.inventory.selectProduct}</option>
                  {products.data.data.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} — {product.sku}
                    </option>
                  ))}
                </select>
              </label>
              <FormField
                id={`order-quantity-${id}`}
                label={ar.common.quantity}
                name={`quantity_${id}`}
                inputMode="numeric"
                required
              />
              <FormField
                id={`order-price-${id}`}
                label={ar.orders.unitPrice}
                name={`unit_price_${id}`}
                inputMode="decimal"
                pattern="^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$"
                required
              />
              <FormField
                id={`order-line-notes-${id}`}
                label={ar.customers.notes}
                name={`line_notes_${id}`}
              />
              {lineIds.length > 1 && (
                <button
                  className="button button-quiet"
                  onClick={() => setLineIds((current) => current.filter((item) => item !== id))}
                  type="button"
                >
                  {ar.sales.removeLine}
                </button>
              )}
            </fieldset>
          ))}
          <button
            className="button button-secondary"
            onClick={() => setLineIds((current) => [...current, Math.max(...current) + 1])}
            type="button"
          >
            {ar.orders.addOrderLine}
          </button>
        </section>
        <section
          aria-labelledby="order-preview-heading"
          className="invoice-preview-waiting order-preview-panel"
        >
          <h2 id="order-preview-heading">{ar.orders.previewOrder}</h2>
          {preview.isFetching ? (
            <p role="status">{ar.app.loading}</p>
          ) : preview.isError ? (
            <p className="field-error" role="alert">
              {preview.error instanceof ApiError ? preview.error.message : ar.common.requestFailed}
            </p>
          ) : preview.data ? (
            <>
              <p>
                {ar.orders.orderPreviewTotal}: {formatMoney(preview.data.grand_total_egp)}
              </p>
              {preview.data.warnings.map((warning, index) => (
                <p className="inline-alert" key={`${warning.code}-${index}`} role="status">
                  {warning.product_name ?? warning.code}
                </p>
              ))}
            </>
          ) : (
            <p className="inline-alert">{ar.orders.noStockReservation}</p>
          )}
        </section>
        <div className="modal-actions order-form-actions">
          <button className="button button-secondary" type="submit">
            {ar.orders.saveDraft}
          </button>
          <button className="button button-primary" onClick={() => void submit(true)} type="button">
            {ar.orders.confirmOrder}
          </button>
        </div>
      </form>
    </section>
  );
}
