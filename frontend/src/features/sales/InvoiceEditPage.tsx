import { newIdempotencyKey } from '../../shared/api/http';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '../../shared/api/errors';
import { FormField } from '../../shared/components/FormField';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import { listGovernorates } from '../customers/api';
import type { Customer } from '../customers/api';
import { listAllResources, listResource, type ListQuery, type Warehouse } from '../inventory/api';
import { invalidateInventoryQueries } from '../inventory/cache';
import { listTreasuryAccounts } from '../finance/api';
import {
  getInvoice,
  getInvoiceIssuerOptions,
  listInvoiceProducts,
  reviseInvoice,
  type InvoiceInput,
} from './api';
import { formatMoney } from '../../shared/utils/format';
import { centsToMoney, moneyToCents, multiplyCents, percentOfCents, quantityAsBigInt } from '../../shared/utils/money';

type RevisionLine = {
  productId: string;
  description: string;
  warehouseId: string;
  quantity: string;
  unitPrice: string;
  discount: string;
};

const optionsQuery: ListQuery = { page: 1, perPage: 100, search: '' };
const amountPattern = /^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$/;
const emptyLine = (): RevisionLine => ({
  productId: '',
  description: '',
  warehouseId: '',
  quantity: '1',
  unitPrice: '',
  discount: '0',
});

function positiveId(value: string, field: string): number {
  if (!/^[1-9]\d*$/.test(value)) throw new Error(`اختر ${field} أولًا.`);
  const parsed = BigInt(value);
  if (parsed > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error(`قيمة ${field} غير صالحة.`);
  return Number(parsed);
}

export function InvoiceEditPage() {
  const { documentId = '' } = useParams();
  const validDocumentId = /^[1-9]\d*$/.test(documentId);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const initializedDocument = useRef('');
  const idempotency = useRef<{ payload: string; key: string } | null>(null);
  const [customerId, setCustomerId] = useState('');
  const [issuerType, setIssuerType] = useState<'company' | 'partner' | 'driver'>('company');
  const [issuerId, setIssuerId] = useState('');
  const [issuerCompany, setIssuerCompany] = useState('ماستر');
  const [paymentTerms, setPaymentTerms] = useState<'immediate' | 'deferred'>('deferred');
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [shippingDriverId, setShippingDriverId] = useState('');
  const [shippingDriverName, setShippingDriverName] = useState('');
  const [shippingCompany, setShippingCompany] = useState('');
  const [governorate, setGovernorate] = useState('');
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed');
  const [discountValue, setDiscountValue] = useState('0');
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');
  const [lines, setLines] = useState<RevisionLine[]>([emptyLine()]);
  const [paymentDestinations, setPaymentDestinations] = useState<Record<number, string>>({});
  const [formError, setFormError] = useState('');

  const invoice = useQuery({
    queryKey: ['/invoices', documentId],
    queryFn: () => getInvoice(documentId),
    enabled: validDocumentId,
  });
  const customers = useQuery({
    queryKey: ['/customers', 'invoice-revision-options'],
    queryFn: () => listResource<Customer>('/customers', optionsQuery),
  });
  const products = useQuery({
    queryKey: ['/products', 'invoice-revision-options', 'all'],
    queryFn: listInvoiceProducts,
  });
  const warehouses = useQuery({
    queryKey: ['/warehouses', 'invoice-revision-options'],
    queryFn: () => listAllResources<Warehouse>('/warehouses', optionsQuery),
  });
  const issuers = useQuery({
    queryKey: ['/invoice-issuers'],
    queryFn: getInvoiceIssuerOptions,
  });
  const governorates = useQuery({
    queryKey: ['/reference/governorates', 'invoice-revision-options'],
    queryFn: () => listGovernorates(optionsQuery),
  });
  const treasuryAccounts = useQuery({
    queryKey: ['/treasury/accounts', 'invoice-revision-options'],
    queryFn: () => listTreasuryAccounts(optionsQuery),
    enabled: (invoice.data?.payment_allocations?.length ?? 0) > 0,
  });

  useEffect(() => {
    const current = invoice.data;
    if (!current || initializedDocument.current === documentId) return;
    initializedDocument.current = documentId;
    setCustomerId(String(current.customer_id));
    setIssuerType(current.issuer_type ?? 'company');
    setIssuerId(String(current.issuer_partner_id ?? current.issuer_driver_id ?? ''));
    setIssuerCompany(current.issuer_company ?? 'ماستر');
    setPaymentTerms(current.payment_terms ?? 'deferred');
    setIssueDate(current.issue_date);
    setDueDate(current.due_date ?? '');
    setShippingDriverId(String(current.shipping_driver_id ?? ''));
    setShippingDriverName(current.shipping_driver_name ?? '');
    setShippingCompany(current.shipping_company ?? '');
    setGovernorate(current.governorate ?? current.customer_governorate ?? '');
    setDiscountType(current.discount_type ?? 'fixed');
    setDiscountValue(current.discount_value ?? '0');
    setNotes(current.notes ?? '');
    setPaymentDestinations(Object.fromEntries((current.payment_allocations ?? []).map((payment) => [
      payment.receipt_id,
      String(payment.treasury_account_id),
    ])));
    setLines(current.lines.map((line) => ({
      productId: String(line.product_id ?? ''),
      description: line.description ?? '',
      warehouseId: String(line.warehouse_id ?? line.location_id ?? ''),
      quantity: line.quantity,
      unitPrice: line.unit_price_egp,
      discount: line.manual_discount_amount_egp ?? line.discount_amount_egp ?? '0',
    })));
  }, [documentId, invoice.data]);

  const mutation = useMutation({
    mutationFn: ({ input, idempotencyKey }: { input: InvoiceInput & { reason: string; payment_account_changes?: { receipt_id: number; treasury_account_id: number }[] }; idempotencyKey: string }) =>
      reviseInvoice(documentId, input, idempotencyKey),
    onSuccess: async (updated) => {
      idempotency.current = null;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/invoices'] }),
        invalidateInventoryQueries(queryClient),
      ]);
      navigate(`/invoices/${updated.id}`, { state: { success: `تم حفظ المراجعة ${updated.invoice_number}` } });
    },
    onError: (error) => {
      setFormError(error instanceof ApiError ? error.message : 'تعذر حفظ تعديل الفاتورة. راجع البيانات وحاول مرة أخرى.');
    },
  });

  const addLine = () => {
    const defaultWarehouse = warehouses.data?.data.find((warehouse) => warehouse.is_active && warehouse.location_type === 'main')
      ?? warehouses.data?.data.find((warehouse) => warehouse.is_active && warehouse.location_type !== 'damaged');
    setLines((current) => [...current, { ...emptyLine(), warehouseId: defaultWarehouse ? String(defaultWarehouse.id) : '' }]);
  };
  const updateLine = (index: number, patch: Partial<RevisionLine>) => {
    setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line));
  };
  const changeProduct = (index: number, productId: string) => {
    const product = products.data?.data.find((item) => String(item.id) === productId);
    const current = lines[index];
    updateLine(index, {
      productId,
      description: product?.description ?? '',
      unitPrice: productId ? (current.productId === productId ? current.unitPrice : product?.company_price ?? '') : '',
      warehouseId: productId && product?.default_location_id
        && warehouses.data?.data.some((warehouse) => warehouse.id === product.default_location_id && warehouse.is_active && warehouse.location_type !== 'damaged')
        ? String(product.default_location_id)
        : current.warehouseId || String(warehouses.data?.data.find((warehouse) => warehouse.is_active && warehouse.location_type === 'main')?.id ?? ''),
    });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    try {
      if (!reason.trim()) throw new Error('اكتب سبب تعديل الفاتورة؛ سيظهر في سجل المراجعة.');
      if (issuerType !== 'company' && !issuerId) throw new Error('اختر شريك الشركة أو السائق الذي أصدر الفاتورة.');
      if (!lines.length) throw new Error('أضف صنفًا واحدًا على الأقل.');
      if (!amountPattern.test(discountValue || '0')) throw new Error('قيمة الخصم غير صحيحة.');
      if (discountType === 'percent' && moneyToCents(discountValue) > 10000n) throw new Error('نسبة الخصم لا يمكن أن تتجاوز 100٪.');

      const inputLines = lines.map((line) => {
        const productId = line.productId;
        if (!productId || !line.warehouseId) throw new Error('اختر الصنف وموقع الصرف لكل سطر.');
        if (!/^[1-9]\d*$/.test(line.quantity)) throw new Error('الكمية يجب أن تكون عددًا صحيحًا أكبر من صفر.');
        if (!amountPattern.test(line.unitPrice)) throw new Error('أدخل سعر بيع صحيحًا لكل صنف.');
        if (line.discount && !amountPattern.test(line.discount)) throw new Error('خصم الصنف غير صحيح.');
        return {
          product_id: positiveId(productId, 'الصنف'),
          warehouse_id: positiveId(line.warehouseId, 'المخزن'),
          quantity: positiveId(line.quantity, 'الكمية'),
          unit_price_egp: line.unitPrice,
          discount_amount_egp: line.discount || '0',
          ...(line.description.trim() ? { description: line.description.trim() } : {}),
        };
      });
      const input: InvoiceInput & {
        reason: string;
        payment_account_changes?: { receipt_id: number; treasury_account_id: number }[];
      } = {
        customer_id: positiveId(customerId, 'العميل'),
        issuer_type: issuerType,
        ...(issuerType === 'partner' ? { issuer_partner_id: positiveId(issuerId, 'الشريك') } : {}),
        ...(issuerType === 'driver' ? { issuer_driver_id: positiveId(issuerId, 'السائق') } : {}),
        issuer_company: issuerCompany || 'ماستر',
        payment_terms: paymentTerms,
        ...(shippingDriverId ? { shipping_driver_id: positiveId(shippingDriverId, 'السائق') } : {}),
        shipping_driver_name: shippingDriverName || null,
        shipping_company: shippingCompany || null,
        governorate: governorate || null,
        issue_date: issueDate,
        due_date: paymentTerms === 'immediate' ? issueDate : dueDate || null,
        notes: notes.trim() || null,
        discount_type: discountType,
        discount_value: discountValue || '0',
        lines: inputLines,
        reason: reason.trim(),
        payment_account_changes: String(customerId) === originalCustomerId
          ? (invoice.data?.payment_allocations ?? []).flatMap((payment) => {
              const destination = paymentDestinations[payment.receipt_id];
              return destination && Number(destination) !== payment.treasury_account_id
                ? [{ receipt_id: payment.receipt_id, treasury_account_id: positiveId(destination, 'حساب التحصيل') }]
                : [];
            })
          : [],
      };
      const payload = JSON.stringify(input);
      if (!idempotency.current || idempotency.current.payload !== payload) {
        idempotency.current = { payload, key: newIdempotencyKey() };
      }
      mutation.mutate({ input, idempotencyKey: idempotency.current.key });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'راجع بيانات الفاتورة.');
    }
  };

  if (!validDocumentId) return <PageState kind="error" title={ar.sales.invoiceNumberInvalid} />;
  if (invoice.isLoading || customers.isLoading || products.isLoading || warehouses.isLoading || issuers.isLoading || governorates.isLoading) {
    return <PageState kind="loading" />;
  }
  if (invoice.isError || !invoice.data || customers.isError || products.isError || warehouses.isError || issuers.isError || governorates.isError) {
    return <PageState kind="error" message={ar.common.requestFailed} onRetry={() => void invoice.refetch()} />;
  }
  if (!['issued', 'paid', 'partially_paid', 'overdue'].includes(invoice.data.status)) {
    return <PageState kind="error" title="لا يمكن تعديل هذه الفاتورة إلا بعد إصدارها." />;
  }

  const subtotalCents = lines.reduce((sum, line) => sum
    + multiplyCents(moneyToCents(line.unitPrice), quantityAsBigInt(line.quantity))
    - moneyToCents(line.discount), 0n);
  const invoiceDiscountCents = discountType === 'percent'
    ? percentOfCents(subtotalCents, discountValue || '0')
    : moneyToCents(discountValue);
  const totalCents = subtotalCents > invoiceDiscountCents ? subtotalCents - invoiceDiscountCents : 0n;
  const originalCustomerId = String(invoice.data.customer_id);
  const hasCompleteLineReferences = lines.length > 0 && lines.every((line) =>
    Boolean(line.productId && line.warehouseId),
  );

  return (
    <section className="page invoice-form">
      <header className="page-heading">
        <div>
          <h1>{ar.sales.reviseInvoiceTitle}: {invoice.data.invoice_number}</h1>
          <p>التعديل ينشئ إصدارًا جديدًا ويعكس حركة المخزون والتسويات السابقة بسجل مراجعة.</p>
        </div>
        <Link className="button button-secondary" to={`/invoices/${documentId}`}>← رجوع للفاتورة</Link>
      </header>

      {!hasCompleteLineReferences && (
        <div className="invoice-credit-alert" role="status">
          <strong>{ar.sales.revisionWaitingTitle}</strong>
          <p>{ar.sales.revisionWaitingMessage}</p>
        </div>
      )}

      {String(customerId) !== originalCustomerId && (
        <p className="invoice-credit-alert" role="status">
          التحصيلات السابقة ستظل رصيدًا غير مخصص للعميل السابق، وسيبدأ رصيد الفاتورة الجديدة من العميل المختار.
        </p>
      )}
      {formError && <p className="field-error" role="alert">{formError}</p>}

      <form className="invoice-form-layout" onSubmit={submit}>
        <div className="invoice-form-main">
          <section className="invoice-form-card">
            <header className="invoice-card-heading"><h2>العميل والمُصدر</h2></header>
            <div className="invoice-form-grid">
              <label className="form-field">
                <span>{ar.sales.invoiceCustomer} *</span>
                <select className="input" onChange={(event) => setCustomerId(event.currentTarget.value)} required value={customerId}>
                  <option value="">اختر العميل</option>
                  {customers.data?.data.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} — {customer.phone ?? ''}</option>)}
                </select>
              </label>
              <label className="form-field">
                <span>مين طلّع الفاتورة *</span>
                <select className="input" onChange={(event) => { setIssuerType(event.currentTarget.value as typeof issuerType); setIssuerId(''); }} value={issuerType}>
                  <option value="company">الشركة</option><option value="partner">شريك الشركة</option><option value="driver">سائق</option>
                </select>
              </label>
              {issuerType !== 'company' && (
                <label className="form-field">
                  <span>{issuerType === 'partner' ? 'شريك الشركة' : 'السائق'} *</span>
                  <select className="input" onChange={(event) => setIssuerId(event.currentTarget.value)} required value={issuerId}>
                    <option value="">اختر الاسم</option>
                    {((issuerType === 'partner' ? issuers.data?.partners : issuers.data?.drivers) ?? []).map((issuer) => <option key={issuer.id} value={issuer.id}>{issuer.name}</option>)}
                  </select>
                </label>
              )}
              <label className="form-field"><span>الشركة المُصدِرة</span><input className="input" onChange={(event) => setIssuerCompany(event.currentTarget.value)} value={issuerCompany} /></label>
              <label className="form-field"><span>المحافظة</span>
                <select className="input" onChange={(event) => setGovernorate(event.currentTarget.value)} value={governorate}>
                  <option value="">اختر المحافظة</option>
                  {governorates.data?.data.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
                </select>
              </label>
            </div>
          </section>

          <section className="invoice-form-card">
            <header className="invoice-card-heading"><h2>بيانات الفاتورة والدفع</h2></header>
            <div className="invoice-form-grid">
              <FormField id="revision-issue-date" label={ar.common.date} onChange={(event) => setIssueDate(event.currentTarget.value)} type="date" value={issueDate} />
              <label className="form-field"><span>شروط الدفع</span>
                <select className="input" onChange={(event) => setPaymentTerms(event.currentTarget.value as typeof paymentTerms)} value={paymentTerms}>
                  <option value="immediate">فوري</option><option value="deferred">آجل</option>
                </select>
              </label>
              {paymentTerms === 'deferred' && <FormField id="revision-due-date" label={ar.sales.dueDate} onChange={(event) => setDueDate(event.currentTarget.value)} type="date" value={dueDate} />}
              <label className="form-field"><span>السائق / المندوب</span>
                <select className="input" onChange={(event) => {
                  const selected = issuers.data?.drivers.find((driver) => String(driver.id) === event.currentTarget.value);
                  setShippingDriverId(event.currentTarget.value); setShippingDriverName(selected?.name ?? '');
                  if (selected?.shipping_company) setShippingCompany(selected.shipping_company);
                }} value={shippingDriverId}>
                  <option value="">بدون سائق</option>{issuers.data?.drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.name}</option>)}
                </select>
              </label>
              <label className="form-field"><span>شركة الشحن</span><input className="input" onChange={(event) => setShippingCompany(event.currentTarget.value)} value={shippingCompany} /></label>
            </div>
            {(invoice.data.payment_allocations?.length ?? 0) > 0 && treasuryAccounts.data && (
              <div className="invoice-payment-fields">
                <h3>تصحيح حسابات التحصيل</h3>
                <p className="invoice-account-hint">تغيير الحساب ينشئ تحويلًا بين الخزائن بنفس مبلغ الإيصال. لا يتغير الإيصال التاريخي.</p>
                {String(customerId) !== originalCustomerId && <p className="invoice-credit-alert">لا يمكن تغيير حساب التحصيل عند تغيير العميل.</p>}
                {invoice.data.payment_allocations!.map((payment) => (
                  <label className="form-field" key={payment.receipt_id}>
                    <span>إيصال {payment.receipt_id} — {formatMoney(payment.amount_egp)} — {payment.treasury_account_name}</span>
                    <select
                      className="input"
                      disabled={String(customerId) !== originalCustomerId}
                      onChange={(event) => {
                        const destinationId = event.currentTarget.value;
                        setPaymentDestinations((current) => ({ ...current, [payment.receipt_id]: destinationId }));
                      }}
                      value={paymentDestinations[payment.receipt_id] ?? String(payment.treasury_account_id)}
                    >
                      <option value={payment.treasury_account_id}>{payment.treasury_account_name} (الحساب الحالي)</option>
                      {treasuryAccounts.data.data.filter((account) => account.is_active && account.id !== payment.treasury_account_id).map((account) => (
                        <option key={account.id} value={account.id}>{account.name}</option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            )}
            {(invoice.data.payment_allocations?.length ?? 0) > 0 && treasuryAccounts.isError && (
              <p className="field-error" role="status">تعذر تحميل حسابات الخزينة؛ ستظل التحصيلات على حساباتها الحالية.</p>
            )}
          </section>

          <section className="invoice-form-card">
            <header className="invoice-card-heading">
              <h2>الأصناف</h2>
              <button className="button button-secondary button-sm" onClick={addLine} type="button">+ إضافة صنف</button>
            </header>
            <div className="invoice-line-list">
              {lines.map((line, index) => {
                const selectedProduct = products.data?.data.find((product) => String(product.id) === line.productId);
                const quantity = quantityAsBigInt(line.quantity);
                const priceSurplus = selectedProduct?.purchase_cost_egp != null && line.unitPrice !== ''
                  ? multiplyCents(moneyToCents(line.unitPrice), quantity) - moneyToCents(line.discount) - multiplyCents(moneyToCents(selectedProduct.purchase_cost_egp), quantity)
                  : null;
                const lineTotalCents = multiplyCents(moneyToCents(line.unitPrice), quantity) - moneyToCents(line.discount);
                return (
                  <fieldset className="invoice-line-editor" key={index}>
                    <legend>الصنف {index + 1}</legend>
                    <div className="invoice-line-primary-fields">
                      <label className="form-field invoice-line-product" htmlFor={`revision-product-${index}`}>
                        <span>المنتج *</span>
                        <select className="input" id={`revision-product-${index}`} onChange={(event) => changeProduct(index, event.currentTarget.value)} required value={line.productId}>
                          <option value="">اختر المنتج</option>
                          {products.data?.data.filter((product) => product.is_active).map((product) => <option key={product.id} value={product.id}>{product.name} — {product.sku}</option>)}
                        </select>
                        {selectedProduct && <small className="invoice-field-hint">الوحدة: {selectedProduct.unit_code} · المتاح: {selectedProduct.available_quantity ?? '—'}{selectedProduct.category_name ? ` · ${selectedProduct.category_name}` : ''}</small>}
                        {selectedProduct?.purchase_cost_egp != null && <small className="invoice-field-hint">تكلفة الشراء للوحدة: {formatMoney(selectedProduct.purchase_cost_egp)}</small>}
                        {selectedProduct?.company_price != null && <small className="invoice-field-hint">سعر الشركة: {formatMoney(selectedProduct.company_price)}</small>}
                      </label>
                      <FormField id={`revision-quantity-${index}`} inputMode="numeric" label="الكمية" min="1" onChange={(event) => updateLine(index, { quantity: event.currentTarget.value })} required value={line.quantity} />
                      <FormField id={`revision-price-${index}`} inputMode="decimal" label="سعر الوحدة *" onChange={(event) => updateLine(index, { unitPrice: event.currentTarget.value })} required value={line.unitPrice} />
                    </div>
                    {priceSurplus != null && <small className={priceSurplus < 0n ? 'invoice-field-hint invoice-profit-negative' : 'invoice-field-hint'}>صافي الربح بعد تكلفة الشراء: {formatMoney(centsToMoney(priceSurplus))} — يُسجل لمُصدر الفاتورة إذا كان شريكًا.</small>}
                    <div className="invoice-line-description">
                      <FormField id={`revision-description-${index}`} label="الوصف (اختياري)" maxLength={500} onChange={(event) => updateLine(index, { description: event.currentTarget.value })} value={line.description} />
                    </div>
                    <div className="invoice-line-actions">
                      <strong className="invoice-line-total">إجمالي الصنف: {formatMoney(centsToMoney(lineTotalCents))}</strong>
                      <details className="invoice-line-options">
                        <summary>تفاصيل إضافية للصنف</summary>
                        <div className="invoice-line-options-grid">
                          <label className="form-field"><span>المخزن *</span>
                            <select className="input" onChange={(event) => updateLine(index, { warehouseId: event.currentTarget.value })} required value={line.warehouseId}>
                              <option value="">اختر المخزن</option>{warehouses.data?.data.filter((warehouse) => warehouse.is_active && warehouse.location_type !== 'damaged').map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
                            </select>
                          </label>
                          <FormField id={`revision-line-discount-${index}`} inputMode="decimal" label="خصم الصنف (اختياري)" onChange={(event) => updateLine(index, { discount: event.currentTarget.value })} value={line.discount} />
                        </div>
                      </details>
                      {lines.length > 1 && <button className="button button-quiet button-sm" onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))} type="button">حذف الصنف</button>}
                    </div>
                  </fieldset>
                );
              })}
            </div>
          </section>

          <section className="invoice-form-card">
            <header className="invoice-card-heading"><h2>الخصم والملاحظات</h2></header>
            <div className="invoice-form-grid">
              <label className="form-field"><span>نوع الخصم العام</span>
                <select className="input" onChange={(event) => setDiscountType(event.currentTarget.value as typeof discountType)} value={discountType}>
                  <option value="fixed">مبلغ ثابت</option><option value="percent">نسبة مئوية</option>
                </select>
              </label>
              <FormField id="revision-discount-value" inputMode="decimal" label="قيمة الخصم" onChange={(event) => setDiscountValue(event.currentTarget.value)} value={discountValue} />
              <label className="form-field"><span>ملاحظات تظهر في الطباعة</span><textarea className="input" onChange={(event) => setNotes(event.currentTarget.value)} rows={3} value={notes} /></label>
              <label className="form-field"><span>سبب التعديل *</span><textarea className="input" onChange={(event) => setReason(event.currentTarget.value)} required rows={3} value={reason} /></label>
            </div>
          </section>
        </div>

        <aside className="invoice-form-summary">
          <h2>ملخص الفاتورة</h2>
          <dl>
            <div><dt>الإجمالي الفرعي</dt><dd>{formatMoney(centsToMoney(subtotalCents))}</dd></div>
            <div><dt>الخصم العام</dt><dd>{formatMoney(centsToMoney(invoiceDiscountCents))}</dd></div>
            <div className="invoice-grand-total-row"><dt>الإجمالي الجديد</dt><dd>{formatMoney(centsToMoney(totalCents))}</dd></div>
          </dl>
          <p className="invoice-account-hint">التحصيلات السابقة يعاد ربطها بالفاتورة الجديدة إذا بقي العميل كما هو.</p>
          <button className="button button-primary" disabled={mutation.isPending || !hasCompleteLineReferences} type="submit">
            {mutation.isPending ? 'جارٍ الحفظ…' : 'حفظ التعديل وإصدار النسخة الجديدة'}
          </button>
          <Link className="button button-quiet" to={`/invoices/${documentId}`}>إلغاء</Link>
        </aside>
      </form>
    </section>
  );
}
