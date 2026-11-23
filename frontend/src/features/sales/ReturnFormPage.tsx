import { newIdempotencyKey } from '../../shared/api/http';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FormField } from '../../shared/components/FormField';
import { Modal } from '../../shared/components/Modal';
import { PageState } from '../../shared/components/PageState';
import { useAuth } from '../../shared/auth/AuthProvider';
import { ar } from '../../shared/i18n/ar';
import type { Customer } from '../customers/api';
import { listAllResources, type ListQuery, type Product, type Warehouse } from '../inventory/api';
import { createReturn, getInvoice, getInvoiceIssuerOptions, listInvoices, previewReturn, type ReturnInput, type ReturnPreview } from './api';
import { formatMoney } from '../../shared/utils/format';
import { ApiError } from '../../shared/api/errors';

type ReturnMode = 'linked' | 'free';
type ReturnFormPageProps = { embedded?: boolean; onClose?: () => void };

const optionsQuery: ListQuery = { page: 1, perPage: 100, search: '' };

export function ReturnFormPage({ embedded = false, onClose }: ReturnFormPageProps = {}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const canCreateFreeReturn = Boolean(user?.permissions.includes('*') || user?.permissions.includes('returns.free.create'));
  const close = onClose ?? (() => navigate('/returns'));
  const wrap = (content: ReactNode) =>
    embedded ? (
      <Modal open title={ar.sales.returnCreateTitle} onClose={close}>
        {content}
      </Modal>
    ) : (
      <>{content}</>
    );
  const [mode, setMode] = useState<ReturnMode>('linked');
  const [customerId, setCustomerId] = useState('');
  const [issuerType, setIssuerType] = useState<'company' | 'partner' | 'driver'>('company');
  const [issuerId, setIssuerId] = useState('');
  const [returnReason, setReturnReason] = useState('damaged');
  const [returnCondition, setReturnCondition] = useState<'good' | 'damaged'>('good');
  const [warehouseId, setWarehouseId] = useState('');
  const [productId, setProductId] = useState('');
  const [invoiceId, setInvoiceId] = useState(() => searchParams.get('invoiceId') ?? '');
  const [sourceLineId, setSourceLineId] = useState('');
  const [preview, setPreview] = useState<ReturnPreview | null>(null);
  const [previewError, setPreviewError] = useState('');
  const [savedDocumentNumber, setSavedDocumentNumber] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const previewRequestVersion = useRef(0);
  const formRef = useRef<HTMLFormElement>(null);
  const idempotencyKey = useRef('');
  const invoices = useQuery({
    queryKey: ['/invoices', 'return-options'],
    queryFn: () => listInvoices(optionsQuery),
  });
  const sourceInvoice = useQuery({
    queryKey: ['/invoices', invoiceId, 'return-source'],
    queryFn: () => getInvoice(invoiceId),
    enabled: mode === 'linked' && /^[1-9]\d*$/.test(invoiceId),
  });
  const customers = useQuery({
    queryKey: ['/customers', 'return-options'],
    queryFn: () => listAllResources<Customer>('/customers', optionsQuery),
  });
  const warehouses = useQuery({
    queryKey: ['/warehouses', 'return-options'],
    queryFn: () => listAllResources<Warehouse>('/warehouses', optionsQuery),
  });
  const products = useQuery({
    queryKey: ['/products', 'return-options'],
    queryFn: () => listAllResources<Product>('/products', optionsQuery),
  });
  const issuers = useQuery({
    queryKey: ['/invoice-issuers'],
    queryFn: getInvoiceIssuerOptions,
  });
  const previewMutation = useMutation({
    mutationFn: previewReturn,
  });
  const createMutation = useMutation({ mutationFn: ({ input, key }: { input: ReturnInput; key: string }) => createReturn(input, key) });

  if (invoices.isLoading || customers.isLoading || warehouses.isLoading || products.isLoading || issuers.isLoading) {
    return wrap(<PageState kind="loading" />);
  }
  if (invoices.isError || customers.isError || warehouses.isError || products.isError || issuers.isError) {
    return wrap(
      <PageState
        kind="error"
        message={ar.common.requestFailed}
        onRetry={() => {
          void invoices.refetch();
          void customers.refetch();
          void warehouses.refetch();
          void products.refetch();
          void issuers.refetch();
          if (invoiceId) void sourceInvoice.refetch();
        }}
      />,
    );
  }

  const readInput = (form: HTMLFormElement): ReturnInput | null => {
    const values = new FormData(form);
    const quantity = String(values.get('quantity') ?? '');
    const unitPrice = String(values.get('unit_price_egp') ?? '');
    const unitCost = String(values.get('unit_cost_egp') ?? '').trim();
    const reason = String(values.get('return_reason') ?? '').trim();
    if (!/^[1-9]\d*$/.test(quantity)) {
      setPreviewError(ar.common.quantityMustBeInteger);
      return null;
    }
    const quantityValue = BigInt(quantity);
    if (quantityValue > BigInt(Number.MAX_SAFE_INTEGER)) {
      setPreviewError(ar.common.quantityMustBeInteger);
      return null;
    }
    const selectedInvoice = mode === 'linked' ? sourceInvoice.data : null;
    const sourceLine = selectedInvoice?.lines.find((line) => String(line.id) === sourceLineId);
    const resolvedCustomerId = mode === 'linked' ? selectedInvoice?.customer_id : Number(customerId);
    if (!resolvedCustomerId || (issuerType !== 'company' && !issuerId)) {
      setPreviewError('اختر العميل والفاتورة أو بيانات مصدر المرتجع قبل المتابعة.');
      return null;
    }
    if (!warehouseId || reason.length < 3) {
      setPreviewError('اختر المخزن واكتب سبباً واضحاً للمرتجع.');
      return null;
    }
    if (mode === 'linked' && (!selectedInvoice || !sourceLine)) {
      setPreviewError('اختر فاتورة وبنداً متاحاً للإرجاع.');
      return null;
    }
    if (mode === 'linked' && sourceLine && quantityValue > BigInt(Number(sourceLine.remaining_quantity ?? 0))) {
      setPreviewError('الكمية المرتجعة تتجاوز الكمية المباعة المتبقية بعد المرتجعات السابقة.');
      return null;
    }
    if (mode === 'free' && (!/^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$/.test(unitPrice) || !productId)) {
      setPreviewError(ar.common.invalidAmount);
      return null;
    }
    return {
      customer_id: Number(resolvedCustomerId),
      issuer_type: issuerType,
      ...(issuerType === 'partner' ? { issuer_partner_id: Number(issuerId) } : {}),
      ...(issuerType === 'driver' ? { issuer_driver_id: Number(issuerId) } : {}),
      issuer_company: 'ماستر',
      issue_date: String(values.get('issue_date') ?? ''),
      original_document_id: mode === 'linked' ? Number(invoiceId) : null,
      return_reason: reason,
      notes: String(values.get('notes') ?? '').trim() || null,
      lines: [mode === 'linked'
        ? {
            warehouse_id: Number(warehouseId),
            quantity: Number(quantityValue),
            return_condition: returnCondition,
            original_document_line_id: Number(sourceLineId),
          }
        : {
            warehouse_id: Number(warehouseId),
            quantity: Number(quantityValue),
            return_condition: returnCondition,
            product_id: Number(productId),
            unit_price_egp: unitPrice,
            ...(unitCost ? { unit_cost_egp: unitCost } : {}),
            description: String(values.get('description') ?? '').trim() || null,
          }],
    };
  };

  const requestPreview = async () => {
    const form = formRef.current;
    if (!form) return;
    const input = readInput(form);
    if (!input) return;
    const requestVersion = previewRequestVersion.current;
    setPreviewError('');
    setFieldErrors({});
    try {
      const result = await previewMutation.mutateAsync(input);
      if (requestVersion === previewRequestVersion.current) setPreview(result);
    } catch (cause) {
      if (requestVersion === previewRequestVersion.current) {
        setPreview(null);
        setPreviewError(cause instanceof Error ? cause.message : ar.common.requestFailed);
      }
    }
  };

  const submitReturn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input = readInput(event.currentTarget);
    if (!input) return;
    setPreviewError('');
    setFieldErrors({});
    try {
      if (!idempotencyKey.current) idempotencyKey.current = newIdempotencyKey();
      const result = await createMutation.mutateAsync({ input, key: idempotencyKey.current });
      idempotencyKey.current = '';
      setPreview(null);
      if (!embedded) {
        navigate(`/returns/${result.document.id}/print`);
        return;
      }
      setSavedDocumentNumber(result.document.document_number);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 422 && cause.details && typeof cause.details === 'object') {
        const details = cause.details as Record<string, unknown>;
        setFieldErrors(Object.fromEntries(Object.entries(details).map(([key, value]) => [key, Array.isArray(value) ? value.join(', ') : String(value)])));
        setPreviewError(ar.common.validation);
      } else {
        setPreviewError(cause instanceof Error ? cause.message : ar.common.requestFailed);
      }
    }
  };

  const changeMode = (nextMode: ReturnMode) => {
    if (nextMode === 'free' && !canCreateFreeReturn) return;
    previewRequestVersion.current += 1;
    setPreview(null);
    setPreviewError('');
    setFieldErrors({});
    setSavedDocumentNumber('');
    setMode(nextMode);
    setReturnReason(nextMode === 'linked' ? 'damaged' : '');
  };
  const eligibleInvoices =
    invoices.data?.data.filter(
      (invoice) => ['issued', 'paid', 'partially_paid', 'overdue'].includes(invoice.status),
    ) ?? [];

  const content = (
    <section className={embedded ? 'return-form-content' : 'page invoice-form'}>
      {!embedded && (
        <header className="page-heading">
          <div>
            <h1>{ar.sales.returnCreateTitle}</h1>
            <p>{ar.sales.returnCreateDescription}</p>
          </div>
          <Link className="button button-secondary" to="/returns">
            {ar.sales.backToReturns}
          </Link>
        </header>
      )}
      <form
        className="stack-form"
        ref={formRef}
        onSubmit={(event) => void submitReturn(event)}
        onChange={() => {
          previewRequestVersion.current += 1;
          setPreview(null);
          setPreviewError('');
          setFieldErrors({});
          setSavedDocumentNumber('');
          idempotencyKey.current = '';
        }}
      >
        <fieldset className="invoice-line-editor">
          <legend>{ar.sales.returnMode}</legend>
          <button
            aria-pressed={mode === 'linked'}
            className={mode === 'linked' ? 'button button-primary' : 'button button-secondary'}
            onClick={() => changeMode('linked')}
            type="button"
          >
            {ar.sales.linkedReturn}
          </button>
          {canCreateFreeReturn && <button
            aria-pressed={mode === 'free'}
            className={mode === 'free' ? 'button button-primary' : 'button button-secondary'}
            onClick={() => changeMode('free')}
            type="button"
          >
            {ar.sales.freeReturn}
          </button>}
        </fieldset>

        <div className="inventory-toolbar">
          <label className="inventory-search">
            <span>مين أصدر المرتجع *</span>
            <select className="input" onChange={(event) => { setIssuerType(event.currentTarget.value as typeof issuerType); setIssuerId(''); }} value={issuerType}>
              <option value="company">الشركة</option><option value="partner">شريك الشركة</option><option value="driver">سائق</option>
            </select>
          </label>
          {issuerType !== 'company' && (
            <label className="inventory-search">
              <span>{issuerType === 'partner' ? 'شريك الشركة' : 'السائق'} *</span>
              <select className="input" onChange={(event) => setIssuerId(event.currentTarget.value)} required value={issuerId}>
                <option value="">اختر الاسم</option>
                {((issuerType === 'partner' ? issuers.data?.partners : issuers.data?.drivers) ?? []).map((issuer) => <option key={issuer.id} value={issuer.id}>{issuer.name}</option>)}
              </select>
            </label>
          )}
          {mode === 'linked' && (
            <label className="inventory-search">
              <span>{ar.sales.returnSelectInvoice}</span>
              <select className="input" onChange={(event) => { setInvoiceId(event.currentTarget.value); setSourceLineId(''); }} value={invoiceId}>
                <option value="">{ar.sales.returnSelectInvoice}</option>
                {eligibleInvoices.map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.invoice_number} — {invoice.customer_name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {mode === 'free' && (
            <label className="inventory-search">
              <span>{ar.common.customer}</span>
              <select
                className="input"
                name="customer_id"
                onChange={(event) => setCustomerId(event.currentTarget.value)}
                required
                value={customerId}
              >
                <option value="">{ar.sales.selectCustomer}</option>
                {customers.data?.data.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {mode === 'linked' && sourceInvoice.data && (
            <div className="inline-alert" role="status">
              العميل: <strong>{sourceInvoice.data.customer_name}</strong>
            </div>
          )}
          <FormField
            id="return-date"
            label={ar.common.date}
            name="issue_date"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            required
          />
          {mode === 'free' ? (
            <FormField
              id="return-reason-free"
              label="سبب المرتجع الحر"
              name="return_reason"
              minLength={3}
              maxLength={500}
              required
              value={returnReason}
              onChange={(event) => setReturnReason(event.currentTarget.value)}
            />
          ) : (
            <label className="inventory-search">
              <span>سبب المرتجع *</span>
              <select className="input" name="return_reason" onChange={(event) => setReturnReason(event.currentTarget.value)} required value={returnReason}>
                <option value="damaged">تالف</option><option value="wrong_item">خطأ في الصنف</option><option value="not_as_ordered">غير مطابق للطلب</option>
              </select>
            </label>
          )}
          <label className="inventory-search">
            <span>{ar.sales.returnSelectWarehouse}</span>
            <select
              className="input"
              name="warehouse_id"
              onChange={(event) => setWarehouseId(event.currentTarget.value)}
              required
              value={warehouseId}
            >
              <option value="">{ar.sales.returnSelectWarehouse}</option>
              {warehouses.data?.data.filter((warehouse) => returnCondition === 'damaged'
                ? warehouse.location_type === 'damaged'
                : warehouse.location_type !== 'damaged').map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {mode === 'free' ? (
          <section className="invoice-line-editor" aria-labelledby="return-fields-heading">
            <h2 id="return-fields-heading">{ar.sales.returnItems}</h2>
            <label className="form-field">
              <span>{ar.common.product}</span>
              <select
                className="input"
                onChange={(event) => setProductId(event.currentTarget.value)}
                required
                value={productId}
              >
                <option value="">{ar.inventory.selectProduct}</option>
                {(products.data?.data ?? []).map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} — {product.sku}
                  </option>
                ))}
              </select>
            </label>
            <FormField
              id="return-quantity"
              label={ar.common.quantity}
              name="quantity"
              inputMode="numeric"
              min="1"
              pattern="[1-9][0-9]*"
              required
            />
            <FormField
              id="return-price"
              label={ar.sales.unitPrice}
              name="unit_price_egp"
              inputMode="decimal"
              pattern="^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$"
              required
            />
            <FormField
              id="return-unit-cost"
              label="تكلفة الوحدة (عند عدم وجود تكلفة سابقة بالمخزن)"
              name="unit_cost_egp"
              inputMode="decimal"
              pattern="^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$"
            />
            <label className="form-field">
              <span>حالة الصنف المرتجع *</span>
              <select className="input" onChange={(event) => { setReturnCondition(event.currentTarget.value as typeof returnCondition); setWarehouseId(''); }} value={returnCondition}>
                <option value="good">سليم</option><option value="damaged">تالف</option>
              </select>
            </label>
            <FormField
              id="return-description"
              label={ar.common.description}
              name="description"
              maxLength={500}
            />
          </section>
        ) : (
          <section className="invoice-line-editor" aria-labelledby="linked-return-lines-heading">
            <h2 id="linked-return-lines-heading">أصناف الفاتورة المرتجعة</h2>
            {!invoiceId && <PageState kind="empty" title={ar.sales.returnSelectInvoice} />}
            {invoiceId && sourceInvoice.isLoading && <PageState kind="loading" />}
            {invoiceId && sourceInvoice.isError && <PageState kind="error" message={ar.common.requestFailed} onRetry={() => void sourceInvoice.refetch()} />}
            {sourceInvoice.data && <>
              <label className="form-field">
                <span>بند الفاتورة</span>
                <select className="input" onChange={(event) => setSourceLineId(event.currentTarget.value)} required value={sourceLineId}>
                  <option value="">اختر الصنف</option>
                  {sourceInvoice.data.lines.filter((line) => Number(line.remaining_quantity ?? 0) > 0).map((line) => (
                    <option key={line.id} value={line.id}>{line.product_name} — {line.sku ?? ''} — متبقي {line.remaining_quantity}</option>
                  ))}
                </select>
              </label>
              {sourceInvoice.data.lines.filter((line) => String(line.id) === sourceLineId).map((line) => <div className="invoice-detail-summary" key={line.id}>
                <div><dt>المباع</dt><dd><bdi dir="ltr">{line.quantity}</bdi></dd></div>
                <div><dt>المرتجع سابقاً</dt><dd><bdi dir="ltr">{line.returned_quantity ?? 0}</bdi></dd></div>
                <div><dt>المتاح للإرجاع</dt><dd><bdi dir="ltr">{line.remaining_quantity ?? 0}</bdi></dd></div>
                <div><dt>سعر الوحدة</dt><dd><bdi dir="ltr">{formatMoney(line.unit_price_egp)}</bdi></dd></div>
              </div>)}
              <FormField id="return-linked-quantity" label={ar.common.quantity} name="quantity" type="number" min="1" max={sourceInvoice.data.lines.find((line) => String(line.id) === sourceLineId)?.remaining_quantity ?? 0} step="1" required />
              <label className="form-field">
                <span>حالة الصنف المرتجع *</span>
                <select className="input" onChange={(event) => { setReturnCondition(event.currentTarget.value as typeof returnCondition); setWarehouseId(''); }} value={returnCondition}>
                  <option value="good">سليم</option><option value="damaged">تالف</option>
                </select>
              </label>
            </>}
          </section>
        )}
        <FormField id="return-notes" label={ar.sales.notes} name="notes" maxLength={1000} />
        <section className="invoice-preview-waiting" aria-labelledby="return-preview-heading">
          <h2 id="return-preview-heading">{ar.sales.returnSubmissionWaiting}</h2>
          {previewError && (
            <p className="field-error" role="alert">
              {previewError}
            </p>
          )}
          {Object.entries(fieldErrors).length > 0 && (
            <ul className="field-error" aria-label={ar.common.validation}>
              {Object.entries(fieldErrors).map(([field, message]) => <li key={field}>{field}: {message}</li>)}
            </ul>
          )}
          {savedDocumentNumber && <p className="inline-alert" role="status">{ar.common.actionSaved}: {savedDocumentNumber}</p>}
          {preview && (
            <dl className="invoice-detail-summary">
              <div>
                <dt>{ar.sales.previewSubtotal}</dt>
                <dd>{formatMoney(preview.subtotal_egp)}</dd>
              </div>
              <div>
                <dt>{ar.sales.previewDiscount}</dt>
                <dd>{formatMoney(preview.discount_amount_egp)}</dd>
              </div>
              <div>
                <dt>{ar.sales.previewTax}</dt>
                <dd>{formatMoney(preview.tax_amount_egp)}</dd>
              </div>
              <div>
                <dt>{ar.sales.previewTotal}</dt>
                <dd>{formatMoney(preview.grand_total_egp)}</dd>
              </div>
            </dl>
          )}
          <button
            className="button button-secondary"
            type="button"
            onClick={() => void requestPreview()}
            disabled={previewMutation.isPending || (mode === 'linked' && sourceInvoice.isLoading)}
          >
            {previewMutation.isPending ? 'جارٍ احتساب المعاينة...' : ar.sales.previewWaiting}
          </button>
        </section>
        <div className="modal-actions">
          {embedded && (
            <button className="button button-secondary" onClick={close} type="button">
              {ar.common.cancel}
            </button>
          )}
          <button className="button button-primary" disabled={!preview || createMutation.isPending} type="submit">
            {createMutation.isPending ? 'جارٍ حفظ المرتجع...' : ar.sales.submitReturn}
          </button>
        </div>
      </form>
    </section>
  );
  return wrap(content);
}
