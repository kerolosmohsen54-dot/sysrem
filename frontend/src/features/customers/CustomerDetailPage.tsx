import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ApiError, formatApiErrorDetails } from '../../shared/api/errors';
import { useAuth } from '../../shared/auth/AuthProvider';
import { DataTable, type DataColumn } from '../../shared/components/DataTable';
import { FormField } from '../../shared/components/FormField';
import { Modal } from '../../shared/components/Modal';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import { formatDate, formatMoney } from '../../shared/utils/format';
import type { ListQuery } from '../inventory/api';
import {
  deleteCustomerAttachment,
  getCustomer,
  getCustomerStatement,
  listCustomerAttachments,
  listCustomerInvoices,
  listCustomerOrders,
  listCustomerPayments,
  postCustomerOpeningBalance,
  uploadCustomerAttachment,
  type CustomerAttachment,
  type CustomerOpeningBalanceInput,
  type CustomerStatementRow,
} from './api';
import type { OrderRecord } from '../orders/api';
import type { CollectionReceipt, Invoice } from '../sales/api';

const pageSize = 10;
type TabId = 'overview' | 'orders' | 'invoices' | 'payments' | 'statement' | 'attachments';
const emptyQuery = (page: number): ListQuery => ({ page, perPage: pageSize, search: '' });

function Pager({ page, lastPage, onChange, label }: { page: number; lastPage: number; onChange: (page: number) => void; label: string }) {
  if (lastPage < 2) return null;
  return (
    <nav className="inventory-pagination" aria-label={label}>
      <button className="button button-secondary" disabled={page <= 1} onClick={() => onChange(page - 1)} type="button">{ar.common.previous}</button>
      <span>{ar.common.page} <bdi dir="ltr">{page}</bdi> {ar.common.of} <bdi dir="ltr">{lastPage}</bdi></span>
      <button className="button button-secondary" disabled={page >= lastPage} onClick={() => onChange(page + 1)} type="button">{ar.common.next}</button>
    </nav>
  );
}

function AttachmentPanel({ customerId, canManage }: { customerId: number; canManage: boolean }) {
  const client = useQueryClient();
  const [error, setError] = useState('');
  const attachments = useQuery({
    queryKey: ['/customers', customerId, 'attachments'],
    queryFn: () => listCustomerAttachments(customerId),
  });
  const upload = useMutation({
    mutationFn: (file: File) => uploadCustomerAttachment(customerId, file),
    onSuccess: async () => {
      setError('');
      await client.invalidateQueries({ queryKey: ['/customers', customerId, 'attachments'] });
    },
    onError: (cause) => setError(cause instanceof ApiError ? cause.message : ar.common.networkError),
  });
  const remove = useMutation({
    mutationFn: (id: number) => deleteCustomerAttachment(customerId, id),
    onSuccess: () => client.invalidateQueries({ queryKey: ['/customers', customerId, 'attachments'] }),
    onError: (cause) => setError(cause instanceof ApiError ? cause.message : ar.common.networkError),
  });

  if (attachments.isLoading) return <PageState kind="loading" />;
  if (attachments.isError) {
    const denied = attachments.error instanceof ApiError && attachments.error.status === 403;
    return <PageState kind={denied ? 'denied' : 'error'} message={denied ? ar.common.permissionDenied : ar.common.requestFailed} onRetry={() => void attachments.refetch()} />;
  }
  if (!attachments.data) return <PageState kind="loading" />;

  return (
    <section className="customer-attachments" aria-labelledby="customer-attachments-heading">
      <header className="customer-section-heading">
        <h2 id="customer-attachments-heading">مرفقات العميل</h2>
        <span>{attachments.data.length} ملف</span>
      </header>
      {canManage && (
        <label className="customer-upload-control">
          <span>رفع ملف PDF أو صورة JPG أو PNG (حد أقصى 10 MB)</span>
          <input
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            aria-label="رفع مرفق للعميل"
            disabled={upload.isPending}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) upload.mutate(file);
              event.currentTarget.value = '';
            }}
            type="file"
          />
        </label>
      )}
      {error && <p className="field-error" role="alert">{error}</p>}
      {upload.isPending && <PageState kind="loading" title="جارٍ رفع الملف" />}
      {attachments.data.length === 0 ? (
        <PageState kind="empty" title="لا توجد مرفقات لهذا العميل" />
      ) : (
        <ul className="customer-attachment-list">
          {attachments.data.map((attachment: CustomerAttachment) => (
            <li key={attachment.id}>
              <div>
                <strong>{attachment.original_name}</strong>
                <span><bdi dir="ltr">{formatBytes(attachment.size_bytes)}</bdi> · {attachment.created_at ? formatDate(attachment.created_at.slice(0, 10)) : '—'}</span>
              </div>
              <div className="row-actions">
                <a className="button button-secondary" href={`${attachment.content_url}?disposition=inline`} rel="noreferrer" target="_blank">عرض</a>
                <a className="button button-secondary" href={`${attachment.content_url}?disposition=attachment`}>تحميل</a>
                {canManage && <button className="button button-danger" disabled={remove.isPending} onClick={() => {
                  if (window.confirm(`حذف المرفق «${attachment.original_name}»؟`)) remove.mutate(attachment.id);
                }} type="button">حذف</button>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function formatBytes(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;
}

function localToday(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function OpeningBalanceDialog({ customerId, onClose, onSaved }: { customerId: number; onClose: () => void; onSaved: () => void }) {
  const client = useQueryClient();
  const [error, setError] = useState('');
  const create = useMutation({
    mutationFn: (input: CustomerOpeningBalanceInput) => postCustomerOpeningBalance(customerId, input),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['/customers'] }),
        client.invalidateQueries({ queryKey: ['/reports/customers', customerId] }),
        client.invalidateQueries({ queryKey: ['/reports/customer-balances'] }),
      ]);
      onSaved();
    },
  });
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    const values = new FormData(event.currentTarget);
    const amount = String(values.get('amount_egp') ?? '').trim();
    if (!/^(0|[1-9][0-9]{0,14})(\.[0-9]{1,2})?$/.test(amount) || /^0+(?:\.0{1,2})?$/.test(amount)) {
      setError(ar.customers.invalidOpeningBalanceAmount);
      return;
    }
    try {
      await create.mutateAsync({
        direction: String(values.get('direction')) as CustomerOpeningBalanceInput['direction'],
        amount_egp: amount,
        issue_date: String(values.get('issue_date') ?? ''),
        notes: String(values.get('notes') ?? '').trim() || null,
      });
    } catch (cause) {
      const details = cause instanceof ApiError ? formatApiErrorDetails(cause.details) : '';
      const stepUp = cause instanceof ApiError && cause.status === 428;
      const denied = cause instanceof ApiError && cause.status === 403;
      setError(stepUp ? ar.customers.openingBalanceStepUp : denied ? ar.common.permissionDenied : details || (cause instanceof ApiError ? cause.message : ar.customers.openingBalanceFailed));
    }
  };

  return (
    <Modal open title={ar.customers.openingBalance} onClose={() => { if (!create.isPending) onClose(); }}>
      <form className="stack-form" onSubmit={(event) => void submit(event)}>
        <label className="form-field" htmlFor="customer-opening-direction">
          <span>{ar.customers.openingBalanceDirection}</span>
          <select className="input" defaultValue="debit" id="customer-opening-direction" name="direction" required>
            <option value="debit">{ar.customers.openingBalanceDebit}</option>
            <option value="credit">{ar.customers.openingBalanceCredit}</option>
          </select>
        </label>
        <FormField id="customer-opening-amount" inputMode="decimal" label={ar.finance.amount} name="amount_egp" type="text" required />
        <FormField defaultValue={localToday()} id="customer-opening-date" label={ar.common.date} name="issue_date" required type="date" />
        <label className="form-field" htmlFor="customer-opening-notes"><span>{ar.customers.notes}</span><textarea className="input" id="customer-opening-notes" maxLength={2000} name="notes" rows={3} /></label>
        {error && <p className="field-error" role="alert">{error}</p>}
        <div className="modal-actions">
          <button className="button button-secondary" disabled={create.isPending} onClick={onClose} type="button">{ar.common.cancel}</button>
          <button className="button button-primary" disabled={create.isPending} type="submit">{create.isPending ? ar.app.loading : ar.common.save}</button>
        </div>
      </form>
    </Modal>
  );
}

export function CustomerDetailPage() {
  const { customerId = '' } = useParams();
  const id = Number(customerId);
  const validId = /^[1-9]\d*$/.test(customerId) && Number.isSafeInteger(id);
  const { user } = useAuth();
  const hasPermission = (permission: string) => Boolean(user?.permissions.includes('*') || user?.permissions.includes(permission));
  const canSeeAttachments = hasPermission('customer_attachments.view');
  const canManageAttachments = hasPermission('customer_attachments.manage');
  const canSeeOrders = hasPermission('orders.view');
  const canSeeInvoices = hasPermission('invoices.view');
  const canSeePayments = hasPermission('collections.view');
  const canSeeStatement = hasPermission('reports.customer_statement.view');
  const canSeeCustomerBalances = hasPermission('reports.customer_balances.view');
  const canCreateOpeningBalance = hasPermission('customers.opening_balance');
  const [tab, setTab] = useState<TabId>('overview');
  const [page, setPage] = useState(1);
  const [openingBalanceOpen, setOpeningBalanceOpen] = useState(false);
  const [openingBalanceSaved, setOpeningBalanceSaved] = useState(false);
  const customer = useQuery({ queryKey: ['/customers', customerId], queryFn: () => getCustomer(customerId), enabled: validId });
  const orders = useQuery({ queryKey: ['/customers', id, 'orders', page], queryFn: () => listCustomerOrders(id, emptyQuery(page)), enabled: validId && tab === 'orders' && canSeeOrders });
  const invoices = useQuery({ queryKey: ['/customers', id, 'invoices', page], queryFn: () => listCustomerInvoices(id, emptyQuery(page)), enabled: validId && tab === 'invoices' && canSeeInvoices });
  const payments = useQuery({ queryKey: ['/customers', id, 'payments', page], queryFn: () => listCustomerPayments(id, emptyQuery(page)), enabled: validId && tab === 'payments' && canSeePayments });
  const statement = useQuery({
    queryKey: ['/customers', id, 'statement', page],
    queryFn: () => getCustomerStatement(id, emptyQuery(page), {}),
    enabled: validId && tab === 'statement' && canSeeStatement,
  });

  if (!validId) return <PageState kind="error" title={ar.common.invalidIdentifier} />;
  if (customer.isLoading) return <PageState kind="loading" />;
  if (customer.isError || !customer.data) {
    const denied = customer.error instanceof ApiError && customer.error.status === 403;
    const stepUp = customer.error instanceof ApiError && customer.error.status === 428;
    return <PageState kind={denied ? 'denied' : 'error'} message={denied ? ar.common.permissionDenied : stepUp ? ar.customers.stepUpRequired : ar.common.requestFailed} onRetry={() => void customer.refetch()} />;
  }

  const current = customer.data;
  const optionalText = (
    key: 'phone' | 'email' | 'address' | 'salesperson' | 'tax_number' | 'payment_terms' | 'governorate' | 'notes' | 'last_invoice_number' | 'last_invoice_date',
    value: string | null | undefined,
    emptyValue: string = ar.customers.notRecorded,
  ) => Object.prototype.hasOwnProperty.call(current, key)
    ? value?.trim() || emptyValue
    : ar.common.notProvided;
  const balanceValue = Object.prototype.hasOwnProperty.call(current, 'balance')
    ? current.balance?.balance ? formatMoney(current.balance.balance) : ar.customers.notRecorded
    : ar.common.notProvided;
  const allTabs: { id: TabId; label: string; shown: boolean }[] = [
    { id: 'overview', label: 'البيانات', shown: true },
    { id: 'orders', label: 'الطلبات', shown: canSeeOrders },
    { id: 'invoices', label: 'الفواتير', shown: canSeeInvoices },
    { id: 'payments', label: 'المدفوعات', shown: canSeePayments },
    { id: 'statement', label: 'كشف الحساب', shown: canSeeStatement },
    { id: 'attachments', label: 'المرفقات', shown: canSeeAttachments },
  ];
  const tabs = allTabs.filter((item) => item.shown);
  const setActiveTab = (next: TabId) => { setTab(next); setPage(1); };
  const fields = [
    [ar.common.phone, current.phone ? <bdi dir="ltr">{current.phone}</bdi> : optionalText('phone', current.phone)],
    [ar.common.email, optionalText('email', current.email, ar.customers.emailNotRecorded)],
    [ar.common.address, optionalText('address', current.address)],
    [ar.customers.salesperson, optionalText('salesperson', current.salesperson)],
    [ar.customers.taxNumber, optionalText('tax_number', current.tax_number)],
    [ar.customers.paymentTerms, optionalText('payment_terms', current.payment_terms)],
    [ar.customers.governorate, optionalText('governorate', current.governorate)],
    [ar.customers.notes, optionalText('notes', current.notes)],
    [ar.common.status, current.status === 'blocked' ? 'محظور' : current.status === 'paused' ? 'موقوف' : ar.common.active],
    ...(canSeeInvoices ? [
      ['آخر فاتورة', optionalText('last_invoice_number', current.last_invoice_number, ar.customers.noInvoicesRecorded)],
      ['تاريخ آخر فاتورة', optionalText('last_invoice_date', current.last_invoice_date, ar.customers.noInvoicesRecorded)],
    ] as const : []),
    [ar.customers.creditLimit, Object.prototype.hasOwnProperty.call(current, 'credit_limit')
      ? current.credit_limit ? formatMoney(current.credit_limit) : ar.customers.creditLimitNotSet
      : ar.common.notProvided],
    ...(canSeeCustomerBalances ? [[ar.customers.balance, balanceValue]] as const : []),
  ] as const;
  const orderColumns: DataColumn<OrderRecord>[] = [
    { key: 'number', header: 'رقم الطلب', render: (row) => <Link to={`/orders/${row.id}`}><bdi dir="ltr">{row.order_number}</bdi></Link> },
    { key: 'date', header: ar.common.date, render: (row) => formatDate(row.order_date) },
    { key: 'status', header: ar.common.status, render: (row) => row.status },
    { key: 'total', header: ar.common.total, render: (row) => row.total_egp ? formatMoney(row.total_egp) : '—' },
  ];
  const invoiceColumns: DataColumn<Invoice>[] = [
    { key: 'number', header: 'رقم الفاتورة', render: (row) => <Link to={`/invoices/${row.id}`}><bdi dir="ltr">{row.invoice_number}</bdi></Link> },
    { key: 'date', header: ar.common.date, render: (row) => formatDate(row.issue_date) },
    { key: 'total', header: ar.common.total, render: (row) => row.total_egp ? formatMoney(row.total_egp) : '—' },
    { key: 'remaining', header: ar.sales.remaining, render: (row) => row.remaining_egp ? formatMoney(row.remaining_egp) : '—' },
  ];
  const paymentColumns: DataColumn<CollectionReceipt>[] = [
    { key: 'number', header: 'رقم السند', render: (row) => <Link to={`/collections?customer_id=${id}&receipt=${row.id}`}><bdi dir="ltr">{row.receipt_number}</bdi></Link> },
    { key: 'date', header: ar.common.date, render: (row) => formatDate(row.receipt_date) },
    { key: 'amount', header: ar.sales.receiptAmount, render: (row) => formatMoney(row.amount_egp) },
    { key: 'unallocated', header: ar.sales.unallocatedAmount, render: (row) => formatMoney(row.unallocated_egp) },
  ];
  const statementColumns: DataColumn<CustomerStatementRow>[] = [
    { key: 'date', header: ar.common.date, render: (row) => formatDate(row.document_date) },
    { key: 'type', header: ar.customers.documentType, render: (row) => Object.entries(ar.customers.documentTypes).find(([key]) => key === row.document_type)?.[1] ?? row.document_type },
    { key: 'reference', header: ar.common.reference, render: (row) => {
      const href = row.document_type === 'invoice' ? `/invoices/${row.id}` : row.document_type === 'collection' ? `/collections?customer_id=${id}&receipt=${row.id}` : `/customers/${id}/statement`;
      return <Link to={href}><bdi dir="ltr">{row.reference}</bdi></Link>;
    } },
    { key: 'debit', header: ar.customers.debit, render: (row) => formatMoney(row.debit_egp) },
    { key: 'credit', header: ar.customers.credit, render: (row) => formatMoney(row.credit_egp) },
  ];
  const activeQuery = tab === 'orders' ? orders : tab === 'invoices' ? invoices : tab === 'payments' ? payments : tab === 'statement' ? statement : null;
  const denied = (tab === 'orders' && !canSeeOrders) || (tab === 'invoices' && !canSeeInvoices) || (tab === 'payments' && !canSeePayments) || (tab === 'statement' && !canSeeStatement);

  return (
    <>
    <section className="page inventory-page customer-profile-page">
      <header className="page-heading">
        <div><h1>{current.name}</h1><p>{ar.customers.detailDescription}</p></div>
        <div className="row-actions">
          {canCreateOpeningBalance && current.is_active && <button className="button button-primary" onClick={() => { setOpeningBalanceSaved(false); setOpeningBalanceOpen(true); }} type="button">{ar.customers.openingBalance}</button>}
          {canSeeStatement && <Link className="button button-secondary" to={`/customers/${current.id}/statement`}>{ar.customers.openStatement}</Link>}
          {canSeeCustomerBalances && <Link className="button button-secondary" to={`/customers/${current.id}/liquidation`}>{ar.customers.liquidationTitle}</Link>}
          <Link className="button button-secondary" to="/customers">{ar.common.back}</Link>
        </div>
      </header>
      {openingBalanceSaved && <p className="success-message" role="status">{ar.customers.openingBalanceSaved}</p>}
      <nav aria-label="سجل العميل" className="customer-tabs" role="tablist">
        {tabs.map((item, index) => <button aria-controls={`customer-panel-${item.id}`} aria-selected={tab === item.id} className={tab === item.id ? 'customer-tab-active' : ''} id={`customer-tab-${item.id}`} key={item.id} onClick={() => setActiveTab(item.id)} onKeyDown={(event) => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
          const nextTab = tabs[nextIndex];
          setActiveTab(nextTab.id);
          document.getElementById(`customer-tab-${nextTab.id}`)?.focus();
        }} role="tab" tabIndex={tab === item.id ? 0 : -1} type="button">{item.label}</button>)}
      </nav>
      <section aria-labelledby={`customer-tab-${tab}`} className="customer-tab-panel" id={`customer-panel-${tab}`} role="tabpanel" tabIndex={0}>
        {tab === 'overview' && <dl className="invoice-detail-summary">{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
        {tab === 'attachments' && <AttachmentPanel canManage={canManageAttachments} customerId={id} />}
        {tab === 'statement' && <div className="customer-record-heading"><h2>{ar.customers.statement}</h2><Link className="button button-secondary" to={`/customers/${id}/statement`}>فتح كشف الحساب الكامل</Link></div>}
        {['orders', 'invoices', 'payments', 'statement'].includes(tab) && denied && <PageState kind="denied" message={ar.common.permissionDenied} />}
        {activeQuery && !denied && activeQuery.isLoading && <PageState kind="loading" />}
        {activeQuery && !denied && activeQuery.isError && <PageState kind="error" message={ar.common.requestFailed} onRetry={() => void activeQuery.refetch()} />}
        {tab === 'orders' && !denied && orders.data && <><DataTable columns={orderColumns} emptyMessage={ar.common.noResults} getRowKey={(row) => row.id} rows={orders.data.data} /><Pager label="صفحات طلبات العميل" lastPage={orders.data.meta.last_page} onChange={setPage} page={page} /></>}
        {tab === 'invoices' && !denied && invoices.data && <><DataTable columns={invoiceColumns} emptyMessage={ar.common.noResults} getRowKey={(row) => row.id} rows={invoices.data.data} /><Pager label="صفحات فواتير العميل" lastPage={invoices.data.meta.last_page} onChange={setPage} page={page} /></>}
        {tab === 'payments' && !denied && payments.data && <><DataTable columns={paymentColumns} emptyMessage={ar.common.noResults} getRowKey={(row) => row.id} rows={payments.data.data} /><Pager label="صفحات مدفوعات العميل" lastPage={payments.data.meta.last_page} onChange={setPage} page={page} /></>}
        {tab === 'statement' && !denied && statement.data && <><div className="customer-statement-summary"><strong>{ar.customers.balance}: {formatMoney(statement.data.summary.current_balance_egp)}</strong><strong>{ar.customers.unallocated}: {formatMoney(statement.data.summary.unallocated_collections_egp)}</strong></div><DataTable columns={statementColumns} emptyMessage={ar.customers.noStatementMovements} getRowKey={(row) => `${row.document_type}-${row.id}`} rows={statement.data.data} /><Pager label="صفحات كشف حساب العميل" lastPage={statement.data.meta.last_page} onChange={setPage} page={page} /></>}
      </section>
    </section>
    {openingBalanceOpen && <OpeningBalanceDialog customerId={id} onClose={() => setOpeningBalanceOpen(false)} onSaved={() => { setOpeningBalanceOpen(false); setOpeningBalanceSaved(true); }} />}
    </>
  );
}
