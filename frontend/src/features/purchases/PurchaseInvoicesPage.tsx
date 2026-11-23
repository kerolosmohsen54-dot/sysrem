import { newIdempotencyKey } from '../../shared/api/http';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '../../shared/api/errors';
import { DataTable, type DataColumn } from '../../shared/components/DataTable';
import { FormField } from '../../shared/components/FormField';
import { PageState } from '../../shared/components/PageState';
import { useAuth } from '../../shared/auth/AuthProvider';
import { ar } from '../../shared/i18n/ar';
import { displayStatus } from '../../shared/utils/labels';
import { formatDate, formatMoney } from '../../shared/utils/format';
import { centsToMoney, isPositiveMoney, moneyToCents, multiplyCents, quantityAsBigInt } from '../../shared/utils/money';
import { listTreasuryAccounts } from '../finance/api';
import type { ListQuery } from '../inventory/api';
import {
  createPurchaseInvoice,
  createSupplierPayment,
  approveSupplierPayment,
  cancelSupplierPayment,
  deletePurchaseInvoice,
  getPurchaseInvoice,
  listPurchaseInvoices,
  listPurchaseProducts,
  listPurchasePartners,
  listPurchaseWarehouses,
  postPurchaseInvoice,
  listSuppliers,
  type PurchaseInvoiceInput,
} from './api';

const pageSize = 20;

export function PurchaseInvoicesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { user } = useAuth();
  const query: ListQuery = useMemo(() => ({ page, perPage: pageSize, search }), [page, search]);
  const invoices = useQuery({ queryKey: ['/purchase-invoices', page, search], queryFn: () => listPurchaseInvoices(query) });
  const canCreate = !!user && (user.permissions.includes('*') || user.permissions.includes('purchases.manage'));
  const columns: DataColumn<NonNullable<typeof invoices.data>['data'][number]>[] = [
    { key: 'invoice_number', header: 'رقم الفاتورة', render: row => <Link to={`/purchase-invoices/${row.id}`}>{row.invoice_number}</Link> },
    { key: 'supplier_name', header: 'المورد', render: row => row.supplier_name ?? `#${row.supplier_id}` },
    { key: 'seller_partner_name', header: 'الشريك البائع', render: row => row.seller_partner_name ?? '—' },
    { key: 'invoice_date', header: 'التاريخ', render: row => formatDate(row.invoice_date) },
    { key: 'status', header: 'الحالة', render: row => displayStatus(row.status) },
    { key: 'total_egp', header: 'الإجمالي (ج.م)', render: row => formatMoney(row.total_egp) },
  ];

  return (
    <section className="page inventory-page">
      <header className="page-heading">
        <div><h1>فواتير الشراء</h1><p>عرض مسودات فواتير الموردين وإجمالياتها المسجلة في النظام.</p></div>
        {canCreate && <Link className="button button-primary" to="/purchase-invoices/new">إنشاء فاتورة شراء</Link>}
      </header>
      <label className="inventory-search">
        <span>{ar.common.search}</span>
        <input className="input" type="search" value={search} onChange={event => { setSearch(event.currentTarget.value); setPage(1); }} />
      </label>
      {invoices.isLoading ? <PageState kind="loading" /> : invoices.isError ? (
        <PageState kind="error" message={ar.common.requestFailed} onRetry={() => void invoices.refetch()} />
      ) : (
        <>
          <DataTable columns={columns} rows={invoices.data?.data ?? []} getRowKey={row => row.id} emptyMessage={ar.common.noResults} />
          <nav className="table-pagination" aria-label="صفحات فواتير الشراء">
            <button className="button button-secondary" type="button" disabled={page <= 1} onClick={() => setPage(value => Math.max(1, value - 1))}>السابق</button>
            <span>{page} / {invoices.data?.meta.last_page ?? 1}</span>
            <button className="button button-secondary" type="button" disabled={page >= (invoices.data?.meta.last_page ?? 1)} onClick={() => setPage(value => value + 1)}>التالي</button>
          </nav>
        </>
      )}
    </section>
  );
}

type DraftLine = { productId: string; quantity: string; unitCost: string; companyPrice: string };
const blankLine = (): DraftLine => ({ productId: '', quantity: '1', unitCost: '', companyPrice: '' });
const moneyPattern = /^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$/;

export function PurchaseInvoiceCreatePage() {
  const [lines, setLines] = useState<DraftLine[]>([blankLine()]);
  const [details, setDetails] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [saved, setSaved] = useState<{ id: number; number: string; total: string } | null>(null);
  const idempotencyKey = useRef('');
  const optionsQuery: ListQuery = { page: 1, perPage: 100, search: '' };
  const suppliers = useQuery({ queryKey: ['/suppliers', 'purchase-form'], queryFn: () => listSuppliers(optionsQuery) });
  const partners = useQuery({ queryKey: ['/partners', 'purchase-form'], queryFn: () => listPurchasePartners(optionsQuery) });
  const warehouses = useQuery({ queryKey: ['/warehouses', 'purchase-form'], queryFn: () => listPurchaseWarehouses(optionsQuery) });
  const products = useQuery({ queryKey: ['/products', 'purchase-form'], queryFn: () => listPurchaseProducts(optionsQuery) });
  const create = useMutation({ mutationFn: ({ input, key }: { input: PurchaseInvoiceInput; key: string }) => createPurchaseInvoice(input, key) });

  if (suppliers.isLoading || partners.isLoading || warehouses.isLoading || products.isLoading) return <PageState kind="loading" />;
  if (suppliers.isError || partners.isError || warehouses.isError || products.isError) return <PageState kind="error" message={ar.common.requestFailed} onRetry={() => { void suppliers.refetch(); void partners.refetch(); void warehouses.refetch(); void products.refetch(); }} />;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const nextDetails: Record<string, string> = {};
    const invoiceNumber = String(values.get('invoice_number') ?? '').trim();
    const invoiceDate = String(values.get('invoice_date') ?? '');
    const supplierId = Number(values.get('supplier_id'));
    const warehouseValue = String(values.get('warehouse_id') ?? '');
    const discount = String(values.get('discount_egp') ?? '0');
    const tax = String(values.get('tax_egp') ?? '0');
    if (lines.some(line => line.companyPrice && !moneyPattern.test(line.companyPrice))) {
      nextDetails.company_price_egp = 'أدخل سعر شركة صحيحًا.';
    }
    lines.forEach((line, index) => {
      if (!line.productId) nextDetails[`lines.${index}.product_id`] = 'اختر المنتج.';
      if (!/^[1-9]\d*$/.test(line.quantity)) nextDetails[`lines.${index}.quantity`] = 'أدخل كمية صحيحة أكبر من صفر.';
      if (!moneyPattern.test(line.unitCost)) nextDetails[`lines.${index}.unit_cost_egp`] = 'أدخل تكلفة عشرية صحيحة.';
    });
    if (!moneyPattern.test(discount)) nextDetails.discount_egp = 'أدخل خصماً عشرياً صحيحاً.';
    if (!moneyPattern.test(tax)) nextDetails.tax_egp = 'أدخل ضريبة عشرية صحيحة.';
    if (Object.keys(nextDetails).length) { setDetails(nextDetails); return; }
    const input: PurchaseInvoiceInput = {
      invoice_number: invoiceNumber,
      supplier_id: supplierId,
      seller_partner_id: String(values.get('seller_partner_id') ?? '') ? Number(values.get('seller_partner_id')) : null,
      warehouse_id: warehouseValue ? Number(warehouseValue) : null,
      invoice_date: invoiceDate,
      discount_egp: discount,
      tax_egp: tax,
      notes: String(values.get('notes') ?? '').trim() || null,
      lines: lines.map(line => ({ product_id: Number(line.productId), quantity: Number(line.quantity), unit_cost_egp: line.unitCost, company_price_egp: line.companyPrice || null })),
    };
    setDetails({}); setMessage('');
    if (!idempotencyKey.current) idempotencyKey.current = newIdempotencyKey();
    try {
      const response = await create.mutateAsync({ input, key: idempotencyKey.current });
      const invoice = response.data.invoice;
      setSaved({ id: invoice.id, number: invoice.invoice_number, total: invoice.total_egp });
      idempotencyKey.current = '';
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 422 && cause.details && typeof cause.details === 'object') {
        const raw = cause.details as Record<string, unknown>;
        setDetails(Object.fromEntries(Object.entries(raw).map(([field, value]) => [field, Array.isArray(value) ? value.join(', ') : String(value)])));
        setMessage(ar.common.validation);
      } else setMessage(cause instanceof Error ? cause.message : ar.common.requestFailed);
    }
  };

  if (saved) return (
    <section className="page inventory-page">
      <header className="page-heading"><div><h1>تم حفظ مسودة فاتورة الشراء</h1><p>{saved.number}</p></div></header>
      <article className="summary-card" role="status"><span>الإجمالي المسجل من الخادم</span><strong>{saved.total} ج.م</strong></article>
      <div className="modal-actions"><Link className="button button-primary" to={`/purchase-invoices/${saved.id}`}>فتح الفاتورة</Link><Link className="button button-secondary" to="/purchase-invoices">قائمة الفواتير</Link></div>
    </section>
  );

  return (
    <section className="page invoice-form">
      <header className="page-heading"><div><h1>إنشاء فاتورة شراء</h1><p>إنشاء مسودة جديدة من بيانات المورد والأصناف المسجلة.</p></div><Link className="button button-secondary" to="/purchase-invoices">العودة للقائمة</Link></header>
      <form className="stack-form" onChange={() => { setSaved(null); setDetails({}); idempotencyKey.current = ''; }} onSubmit={event => void submit(event)}>
        {message && <p className="field-error" role="alert">{message}</p>}
        {Object.entries(details).length > 0 && <ul className="field-error" aria-label={ar.common.validation}>{Object.entries(details).map(([field, text]) => <li key={field}>{field}: {text}</li>)}</ul>}
        <label className="form-field"><span>الشريك البائع (اختياري)</span><select className="input" name="seller_partner_id" defaultValue=""><option value="">لا يوجد شريك بائع</option>{(partners.data?.data ?? []).filter(partner => partner.status === 'active').map(partner => <option key={partner.id} value={partner.id}>{partner.name}</option>)}</select></label>
        <div className="inventory-toolbar">
          <FormField id="purchase-invoice-number" label="رقم فاتورة المورد" name="invoice_number" required maxLength={64} />
          <label className="form-field"><span>المورد</span><select className="input" name="supplier_id" required defaultValue=""><option value="">اختر المورد</option>{(suppliers.data?.data ?? []).map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label>
          <label className="form-field"><span>المخزن</span><select className="input" name="warehouse_id" defaultValue=""><option value="">بدون مخزن</option>{(warehouses.data?.data ?? []).map(warehouse => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}</select></label>
          <FormField id="purchase-invoice-date" label="تاريخ الفاتورة" name="invoice_date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
        </div>
        <section className="invoice-line-editor"><header className="page-heading"><h2>الأصناف</h2><button className="button button-secondary" type="button" onClick={() => setLines(value => [...value, blankLine()])}>إضافة صنف</button></header>
          {lines.map((line, index) => <div className="inventory-toolbar" key={index}>
            <label className="form-field"><span>المنتج</span><select className="input" required value={line.productId} onChange={event => { const productId = event.currentTarget.value; const product = products.data?.data.find(row => String(row.id) === productId); setLines(value => value.map((item, row) => row === index ? { ...item, productId, companyPrice: product?.company_price ?? '', unitCost: product?.purchase_cost_egp ?? '' } : item)); }}><option value="">اختر المنتج</option>{(products.data?.data ?? []).map(product => <option key={product.id} value={product.id}>{product.name} — {product.sku}</option>)}</select></label>
            <FormField id={`purchase-quantity-${index}`} label="الكمية" name={`quantity-${index}`} type="number" min="1" step="1" required value={line.quantity} onChange={event => { const quantity = event.currentTarget.value; setLines(value => value.map((item, row) => row === index ? { ...item, quantity } : item)); }} />
            <FormField id={`purchase-unit-cost-${index}`} label="سعر الشراء الفعلي للوحدة (ج.م)" name={`unit_cost-${index}`} inputMode="decimal" required value={line.unitCost} onChange={event => { const unitCost = event.currentTarget.value; setLines(value => value.map((item, row) => row === index ? { ...item, unitCost } : item)); }} />
            <FormField id={`purchase-company-price-${index}`} label="سعر الشركة للوحدة (ج.م)" name={`company_price-${index}`} inputMode="decimal" value={line.companyPrice} onChange={event => { const companyPrice = event.currentTarget.value; setLines(value => value.map((item, row) => row === index ? { ...item, companyPrice } : item)); }} />
            {line.unitCost && line.companyPrice && <p className="invoice-field-hint">زيادة البائع لهذا السطر: {formatMoney(centsToMoney(multiplyCents(moneyToCents(line.unitCost) > moneyToCents(line.companyPrice) ? moneyToCents(line.unitCost) - moneyToCents(line.companyPrice) : 0n, quantityAsBigInt(line.quantity))))}</p>}
            {lines.length > 1 && <button className="button button-secondary" type="button" aria-label={`حذف الصنف ${index + 1}`} onClick={() => setLines(value => value.filter((_, row) => row !== index))}>حذف</button>}
          </div>)}
        </section>
        <div className="inventory-toolbar"><FormField id="purchase-discount" label="الخصم (ج.م)" name="discount_egp" inputMode="decimal" defaultValue="0" required /><FormField id="purchase-tax" label="الضريبة (ج.م)" name="tax_egp" inputMode="decimal" defaultValue="0" required /><FormField id="purchase-notes" label={ar.sales.notes} name="notes" /></div>
        <div className="modal-actions"><button className="button button-primary" type="submit" disabled={create.isPending}>{create.isPending ? 'جارٍ الحفظ...' : 'حفظ كمسودة'}</button></div>
      </form>
    </section>
  );
}

export function PurchaseInvoiceDetailPage() {
  const { invoiceId = '' } = useParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const { user } = useAuth();
  const canManage = Boolean(user?.permissions.includes('*') || user?.permissions.includes('purchases.manage'));
  const canApprovePayments = Boolean(user?.permissions.includes('*') || user?.permissions.includes('purchases.payments.approve'));
  const [paymentError, setPaymentError] = useState<unknown>(null);
  const [invoiceActionError, setInvoiceActionError] = useState<unknown>(null);
  const supplierPaymentKey = useRef<string | null>(null);
  const accounts = useQuery({
    queryKey: ['/treasury/accounts', 'supplier-payment-options'],
    queryFn: () => listTreasuryAccounts({ page: 1, perPage: 100, search: '' }),
    enabled: canManage,
  });
  const refreshInvoice = async () => {
    await client.invalidateQueries({ queryKey: ['/purchase-invoices', invoiceId] });
    await client.invalidateQueries({ queryKey: ['/purchase-invoices'] });
  };
  const createPayment = useMutation({
    mutationFn: createSupplierPayment,
    onSuccess: async () => { supplierPaymentKey.current = null; await refreshInvoice(); },
    onError: setPaymentError,
  });
  const approvePayment = useMutation({ mutationFn: approveSupplierPayment, onSuccess: refreshInvoice, onError: setPaymentError });
  const cancelPayment = useMutation({ mutationFn: (paymentId: number) => cancelSupplierPayment(paymentId, newIdempotencyKey()), onSuccess: refreshInvoice, onError: setPaymentError });
  const postInvoice = useMutation({ mutationFn: () => postPurchaseInvoice(invoiceId), onSuccess: async () => { setInvoiceActionError(null); await refreshInvoice(); }, onError: setInvoiceActionError });
  const remove = useMutation({
    mutationFn: (reason: string) => deletePurchaseInvoice(invoiceId, reason, newIdempotencyKey()),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['/purchase-invoices'] });
      navigate('/purchase-invoices');
    },
  });
  const query = useQuery({ queryKey: ['/purchase-invoices', invoiceId], queryFn: () => getPurchaseInvoice(invoiceId), enabled: Boolean(invoiceId) });
  if (query.isLoading || (canManage && accounts.isLoading)) return <PageState kind="loading" />;
  if (query.isError) return <PageState kind="error" message={query.error instanceof ApiError && query.error.status === 404 ? ar.common.notFound : ar.common.requestFailed} onRetry={() => void query.refetch()} />;
  const detail = query.data?.data;
  if (!detail || (canManage && accounts.isError)) return <PageState kind="error" message={ar.common.requestFailed} onRetry={() => { void query.refetch(); void accounts.refetch(); }} />;
  const { invoice, lines, financial_summary: summary, supplier_payments: payments } = detail;
  const submitSupplierPayment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const accountId = Number(values.get('treasury_account_id'));
    const amount = String(values.get('amount_egp') ?? '').trim();
    const date = String(values.get('payment_date') ?? '');
    if (!Number.isSafeInteger(accountId) || accountId < 1 || !moneyPattern.test(amount) || !date || !isPositiveMoney(amount)) {
      setPaymentError(new Error(ar.common.validation));
      return;
    }
    setPaymentError(null);
    createPayment.mutate({
      purchase_invoice_id: invoice.id,
      treasury_account_id: accountId,
      amount_egp: amount,
      payment_date: date,
      notes: String(values.get('notes') ?? '').trim() || null,
      idempotency_key: supplierPaymentKey.current ?? (supplierPaymentKey.current = newIdempotencyKey()),
    });
  };
  return (
    <section className="page inventory-page">
      <header className="page-heading"><div><h1>{invoice.invoice_number}</h1><p>{invoice.supplier_name ?? `#${invoice.supplier_id}`} · البائع: {invoice.seller_partner_name ?? 'الشركة'} · {formatDate(invoice.invoice_date)} · {displayStatus(invoice.status)}</p></div><Link className="button button-secondary" to="/purchase-invoices">العودة للقائمة</Link>{canManage && invoice.status === 'draft' && <><Link className="button button-secondary" to={`/purchase-invoices/${invoice.id}/edit`}>{ar.common.edit}</Link><button className="button button-danger" disabled={remove.isPending} onClick={() => { const reason = window.prompt('\u0627\u0643\u062a\u0628 \u0633\u0628\u0628 \u062d\u0630\u0641 \u0645\u0633\u0648\u062f\u0629 \u0641\u0627\u062a\u0648\u0631\u0629 \u0627\u0644\u0634\u0631\u0627\u0621:'); if (reason && reason.trim().length >= 3 && window.confirm('\u0633\u064a\u062a\u0645 \u062d\u0630\u0641 \u0627\u0644\u0645\u0633\u0648\u062f\u0629 \u0648\u0628\u0646\u0648\u062f\u0647\u0627 \u0646\u0647\u0627\u0626\u064a\u0627\u064b. \u0645\u062a\u0627\u0628\u0639\u0629\u061f')) remove.mutate(reason.trim()); }} type="button">\u062d\u0630\u0641 \u0627\u0644\u0645\u0633\u0648\u062f\u0629</button></>}</header>
      {canManage && invoice.status === 'draft' && <div className="button-row"><button className="button button-primary" type="button" disabled={postInvoice.isPending || remove.isPending} onClick={() => { if (window.confirm('سيتم استلام الكميات في المخزن وإثبات رصيد المورد وربح الشريك مرة واحدة. متابعة؟')) postInvoice.mutate(); }}>{postInvoice.isPending ? 'جارٍ الاعتماد...' : 'اعتماد واستلام المخزون'}</button></div>}
      {invoiceActionError instanceof Error && <p className="field-error" role="alert">{invoiceActionError.message}</p>}
      {invoice.status === 'draft' && <p role="status">المسودة لا تغيّر رصيد المخزون أو ذمم المورد والشريك حتى اعتمادها.</p>}
      {remove.isError && <p className="field-error" role="alert">{remove.error instanceof Error ? remove.error.message : ar.common.requestFailed}</p>}
      <div className="summary-card"><span>الإجمالي</span><strong>{formatMoney(invoice.total_egp)}</strong></div>
      <div className="inventory-summary-grid">
        <article className="inventory-summary-card"><span>المدفوع للمورد في هذه الفاتورة</span><strong>{formatMoney(summary.invoice_supplier_paid_egp)}</strong></article>
        <article className="inventory-summary-card"><span>{summary.invoice_supplier_due_egp.startsWith('-') ? 'رصيد للمورد علينا في هذه الفاتورة' : 'المتبقي للمورد في هذه الفاتورة'}</span><strong>{formatMoney(summary.invoice_supplier_due_egp)}</strong></article>
        <article className="inventory-summary-card"><span>{summary.supplier_total_due_egp.startsWith('-') ? 'المورد مدين لنا' : 'إجمالي المتبقي للمورد'}</span><strong>{formatMoney(summary.supplier_total_due_egp)}</strong></article>
        <article className="inventory-summary-card"><span>ربح الشريك البائع من هذه الفاتورة</span><strong>{formatMoney(summary.seller_profit_egp)}</strong></article>
        {invoice.seller_partner_id && <article className="inventory-summary-card"><span>{summary.seller_total_due_egp.startsWith('-') ? 'مبالغ مصروفة بالزيادة عن مستحق الشريك' : 'إجمالي المستحق للشريك البائع'}</span><strong>{formatMoney(summary.seller_total_due_egp)}</strong></article>}
      </div>
      {isPositiveMoney(summary.invoice_supplier_pending_egp) && <p role="status">دفعات بانتظار الاعتماد: {formatMoney(summary.invoice_supplier_pending_egp)}</p>}
      {canManage && invoice.status === 'posted' && isPositiveMoney(summary.invoice_supplier_available_egp) && <form className="inventory-toolbar" onChange={() => { supplierPaymentKey.current = null; }} onSubmit={submitSupplierPayment}>
        <h2>تسجيل دفعة للمورد</h2>
        <label className="form-field"><span>حساب الخزينة</span><select className="input" name="treasury_account_id" required defaultValue=""><option value="">{ar.common.select}</option>{(accounts.data?.data ?? []).filter(account => account.is_active).map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
        <FormField id="supplier-payment-date" label={ar.common.date} name="payment_date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
        <FormField id="supplier-payment-amount" label="مبلغ الدفعة" name="amount_egp" inputMode="decimal" max={summary.invoice_supplier_available_egp} defaultValue={summary.invoice_supplier_available_egp} required />
        <FormField id="supplier-payment-notes" label={ar.finance.notes} name="notes" maxLength={500} />
        {paymentError instanceof Error && <p className="field-error" role="alert">{paymentError.message}</p>}
        {paymentError instanceof ApiError && Boolean(paymentError.details) ? <p className="field-error" role="alert">{String(JSON.stringify(paymentError.details))}</p> : null}
        <button className="button button-primary" type="submit" disabled={createPayment.isPending}>{createPayment.isPending ? 'جارٍ الحفظ...' : 'حفظ الدفعة كمسودة'}</button>
      </form>}
      {payments.length > 0 && <section className="page-section"><h2>دفعات المورد</h2><DataTable columns={[
        { key: 'date', header: ar.common.date, render: payment => payment.payment_date },
        { key: 'account', header: 'حساب الخزينة', render: payment => payment.treasury_account_name ?? `#${payment.treasury_account_id}` },
        { key: 'amount', header: 'المبلغ', render: payment => formatMoney(payment.amount_egp) },
        { key: 'status', header: ar.common.status, render: payment => displayStatus(payment.status) },
        ...(canManage || canApprovePayments ? [{ key: 'action', header: ar.common.actions, render: (payment: (typeof payments)[number]) => payment.status === 'draft' ? <div className="button-row">{invoice.status === 'posted' && canApprovePayments && <button className="button button-secondary button-sm" type="button" disabled={approvePayment.isPending} onClick={() => approvePayment.mutate(payment.id)}>اعتماد وتسجيل الدفعة</button>}{canManage && <button className="button button-danger button-sm" type="button" disabled={cancelPayment.isPending} onClick={() => { if (window.confirm('إلغاء مسودة الدفعة؟')) cancelPayment.mutate(payment.id); }}>إلغاء المسودة</button>}</div> : payment.treasury_entry_id ? `#${payment.treasury_entry_id}` : displayStatus(payment.status) }] : []),
      ]} rows={payments} getRowKey={payment => payment.id} emptyMessage={ar.common.noResults} />
      {paymentError instanceof Error && <p className="field-error" role="alert">{paymentError.message}</p>}</section>}
      <DataTable columns={[
        { key: 'line_number', header: '#', render: line => line.line_number },
        { key: 'product', header: 'المنتج', render: line => line.product_name ?? `#${line.product_id}` },
        { key: 'quantity', header: 'الكمية', render: line => line.quantity },
        { key: 'company_price_egp', header: 'سعر الشركة للوحدة', render: line => line.company_price_egp == null ? '—' : formatMoney(line.company_price_egp) },
        { key: 'unit_cost_egp', header: 'تكلفة الوحدة', render: line => formatMoney(line.unit_cost_egp) },
        { key: 'seller_profit_egp', header: 'ربح الشريك البائع', render: line => line.company_price_egp == null ? '—' : formatMoney(centsToMoney(multiplyCents(moneyToCents(line.unit_cost_egp) > moneyToCents(line.company_price_egp) ? moneyToCents(line.unit_cost_egp) - moneyToCents(line.company_price_egp) : 0n, BigInt(line.quantity)))) },
        { key: 'line_total_egp', header: 'الإجمالي', render: line => formatMoney(line.line_total_egp) },
      ]} rows={lines} getRowKey={line => line.id} emptyMessage={ar.common.noResults} />
    </section>
  );
}
