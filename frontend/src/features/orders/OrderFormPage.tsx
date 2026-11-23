import { newIdempotencyKey } from '../../shared/api/http';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '../../shared/api/errors';
import { FormField } from '../../shared/components/FormField';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import { listCustomers } from '../customers/api';
import { listAllResources, type ListQuery, type Product } from '../inventory/api';
import { confirmOrder, createOrder, getOrder, getOrderOptions, previewOrder, updateOrder, type OrderInput } from './api';
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
  const { orderId = '' } = useParams();
  const isEditing = /^[1-9]\d*$/.test(orderId);
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
    queryFn: () => listAllResources<Product>('/products', optionsQuery),
  });
  const options = useQuery({ queryKey: ['/orders/options'], queryFn: getOrderOptions });
  const existingOrder = useQuery({
    queryKey: ['/orders', orderId],
    queryFn: () => getOrder(orderId),
    enabled: isEditing,
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

  useEffect(() => {
    if (existingOrder.data) {
      setLineIds(existingOrder.data.lines.map((_, index) => index + 1));
    }
  }, [existingOrder.data]);

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
          salesperson_id: String(values.get('salesperson_id') ?? '') ? positiveInteger(String(values.get('salesperson_id'))) : null,
          warehouse_id: positiveInteger(String(values.get('warehouse_id') ?? '')),
          currency_code: String(values.get('currency_code') ?? 'EGP'),
          payment_method: String(values.get('payment_method') ?? 'cash') as OrderInput['payment_method'],
          payment_terms: String(values.get('payment_terms') ?? '').trim() || null,
          discount_type: String(values.get('discount_type') ?? 'fixed') as OrderInput['discount_type'],
          discount_value: String(values.get('discount_value') ?? '0') || '0',
          shipping_amount_egp: String(values.get('shipping_amount_egp') ?? '0') || '0',
          lines: lineIds.map((id) => {
            const unitPrice = String(values.get(`unit_price_${id}`) ?? '');
            if (!amountPattern.test(unitPrice)) throw new Error(ar.inventory.invalidUnitCost);
            return {
              product_id: positiveInteger(String(values.get(`product_id_${id}`) ?? '')),
              quantity: positiveInteger(String(values.get(`quantity_${id}`) ?? '')),
              unit_price_egp: unitPrice,
              discount_percent: String(values.get('discount_percent_' + id) ?? '0') || '0',
              notes: String(values.get(`line_notes_${id}`) ?? '').trim() || null,
            };
          }),
        });
      } catch {
        setPreviewInput(null);
      }
    }, 300);
  };

  if (customers.isLoading || products.isLoading || options.isLoading || (isEditing && existingOrder.isLoading)) return <PageState kind="loading" />;
  if (customers.isError || products.isError || options.isError || (isEditing && existingOrder.isError) || !customers.data || !products.data || !options.data) {
    return (
      <PageState
        kind="error"
        message={ar.common.requestFailed}
        onRetry={() => {
          void customers.refetch();
          void products.refetch();
          void options.refetch();
          if (isEditing) void existingOrder.refetch();
        }}
      />
    );
  }

  const order = isEditing ? existingOrder.data : undefined;
  if (isEditing && (!order || order.status !== 'draft')) {
    return <PageState kind="error" message={order ? 'لا يمكن تعديل إلا الطلبات غير المؤكدة.' : ar.common.requestFailed} />;
  }

  const submit = async (confirmAfterSave = false) => {
    const form = formRef.current;
    if (!form?.reportValidity()) return;
    setError('');
    const values = new FormData(form);
    key.current ??= newIdempotencyKey();
    try {
      const lines = lineIds.map((id) => {
        const unitPrice = String(values.get(`unit_price_${id}`) ?? '');
        if (!amountPattern.test(unitPrice)) throw new Error(ar.inventory.invalidUnitCost);
        return {
          product_id: positiveInteger(String(values.get(`product_id_${id}`) ?? '')),
          quantity: positiveInteger(String(values.get(`quantity_${id}`) ?? '')),
          unit_price_egp: unitPrice,
          discount_percent: String(values.get('discount_percent_' + id) ?? '0') || '0',
          notes: String(values.get(`line_notes_${id}`) ?? '').trim() || null,
        };
      });
      const input: OrderInput = {
          customer_id: positiveInteger(String(values.get('customer_id') ?? '')),
          order_date: String(values.get('order_date') ?? ''),
          requested_delivery_date: String(values.get('requested_delivery_date') ?? '') || null,
          notes: String(values.get('notes') ?? '').trim() || null,
          salesperson_id: String(values.get('salesperson_id') ?? '') ? positiveInteger(String(values.get('salesperson_id'))) : null,
          warehouse_id: positiveInteger(String(values.get('warehouse_id') ?? '')),
          currency_code: String(values.get('currency_code') ?? 'EGP'),
          payment_method: String(values.get('payment_method') ?? 'cash') as OrderInput['payment_method'],
          payment_terms: String(values.get('payment_terms') ?? '').trim() || null,
          discount_type: String(values.get('discount_type') ?? 'fixed') as OrderInput['discount_type'],
          discount_value: String(values.get('discount_value') ?? '0') || '0',
          shipping_amount_egp: String(values.get('shipping_amount_egp') ?? '0') || '0',
          lines,
        };
      const saved = order ? await updateOrder(orderId, input) : await createOrder(input, key.current ?? newIdempotencyKey());
      if (confirmAfterSave) {
        if (order) throw new Error('احفظ الطلب أولاً ثم أكّده من صفحة التفاصيل.');
        confirmKey.current ??= newIdempotencyKey();
        await confirmOrder(String(saved.id), confirmKey.current);
      }
      key.current = null;
      confirmKey.current = null;
      navigate(`/orders/${saved.id}`);
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
          <h1>{order ? 'تعديل الطلب' : ar.orders.newOrder}</h1>
          <p>{ar.orders.serverPreviewWaiting}</p>
        </div>
        <Link className="button button-secondary" to={order ? `/orders/${order.id}` : '/orders'}>
          {ar.common.cancel}
        </Link>
      </header>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <form
        key={order?.id ?? 'new-order'}
        className="stack-form order-form"
        onChange={schedulePreview}
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        ref={formRef}
      >
        <section aria-label={ar.orders.newOrder} className="order-form-basics">
          <p className="inline-alert">رقم الطلب: <bdi dir="ltr">يُنشأ تلقائياً عند الحفظ</bdi></p>
          <label className="form-field">
            <span>{ar.common.customer}</span>
            <select className="input" name="customer_id" required defaultValue={order?.customer_id ?? ''}>
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
              defaultValue={order?.order_date ?? new Date().toISOString().slice(0, 10)}
            />
            <FormField
              id="order-delivery-date"
              label={ar.orders.requestedDeliveryDate}
              name="requested_delivery_date"
              type="date"
              defaultValue={order?.requested_delivery_date ?? ''}
            />
          </div>
          <div className="form-grid">
            <label className="form-field">
              <span>المندوب</span>
              <select className="input" name="salesperson_id" defaultValue={order?.salesperson_id ?? ''}>
                <option value="">بدون مندوب</option>
                {options.data.salespeople.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
              </select>
            </label>
            <label className="form-field">
              <span>طريقة الدفع</span>
              <select className="input" name="payment_method" defaultValue={order?.payment_method ?? 'cash'} required>
                {options.data.payment_methods.map((method) => <option key={method.code} value={method.code}>{method.name}</option>)}
              </select>
            </label>
            <label className="form-field">
              <span>{ar.common.warehouse}</span>
              <select className="input" name="warehouse_id" defaultValue={order?.warehouse_id ?? ''} required>
                <option value="">{ar.common.select}</option>
                {options.data.warehouses.map((warehouse) => <option dir="auto" key={warehouse.id} value={warehouse.id}>{warehouse.name} ({warehouse.code})</option>)}
              </select>
            </label>
            <label className="form-field">
              <span>العملة</span>
              <select className="input" name="currency_code" defaultValue={order?.currency_code ?? 'EGP'} required>
                {options.data.currencies.map((currency) => <option dir="auto" key={currency.code} value={currency.code}>{currency.name} ({currency.code})</option>)}
              </select>
            </label>
            <FormField id="order-payment-terms" label="شروط الدفع" name="payment_terms" maxLength={120} defaultValue={order?.payment_terms ?? ''} />
            <label className="form-field">
              <span>نوع خصم الطلب</span>
              <select className="input" name="discount_type" defaultValue={order?.discount_type ?? 'fixed'}>
                <option value="fixed">مبلغ ثابت</option>
                <option value="percent">نسبة مئوية</option>
              </select>
            </label>
            <FormField id="order-discount-value" label="قيمة خصم الطلب" name="discount_value" inputMode="decimal" pattern="^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$" defaultValue={order?.discount_value ?? '0'} />
            <FormField id="order-shipping-amount" label="الشحن" name="shipping_amount_egp" inputMode="decimal" pattern="^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$" defaultValue={order?.shipping_amount_egp ?? '0'} />
          </div>
          <FormField id="order-notes" label={ar.orders.orderNotes} name="notes" maxLength={1000} defaultValue={order?.notes ?? ''} />
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
                <select className="input" name={`product_id_${id}`} required defaultValue={order?.lines[id - 1]?.product_id ?? ''}>
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
                defaultValue={order?.lines[id - 1]?.quantity ?? ''}
              />
              <FormField
                id={`order-price-${id}`}
                label={ar.orders.unitPrice}
                name={`unit_price_${id}`}
                inputMode="decimal"
                pattern="^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$"
                required
                defaultValue={order?.lines[id - 1]?.unit_price_egp ?? ''}
              />
              <FormField
                id={`order-line-notes-${id}`}
                label={ar.customers.notes}
                name={`line_notes_${id}`}
                defaultValue={order?.lines[id - 1]?.notes ?? ''}
              />
              <FormField
                id={'order-discount-' + id}
                label="الخصم %"
                name={'discount_percent_' + id}
                inputMode="decimal"
                min="0"
                max="100"
                step="0.01"
                pattern="^(100(\.0{1,2})?|[0-9]{1,2}(\.[0-9]{1,2})?)$"
                defaultValue={order?.lines[id - 1]?.discount_percent ?? '0'}
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
              <dl className="invoice-detail-summary">
                <div><dt>الإجمالي قبل الخصم</dt><dd>{formatMoney(preview.data.subtotal_egp)}</dd></div>
                <div><dt>الخصم</dt><dd>{formatMoney(preview.data.discount_amount_egp)}</dd></div>
                <div><dt>الضريبة</dt><dd>{formatMoney(preview.data.tax_amount_egp)}</dd></div>
                <div><dt>الشحن</dt><dd>{formatMoney(preview.data.shipping_amount_egp ?? '0.00')}</dd></div>
                <div><dt>{ar.orders.orderPreviewTotal}</dt><dd>{formatMoney(preview.data.grand_total_egp)}</dd></div>
              </dl>
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
          {!order && <button className="button button-primary" onClick={() => void submit(true)} type="button">
            {ar.orders.confirmOrder}
          </button>}
        </div>
      </form>
    </section>
  );
}
