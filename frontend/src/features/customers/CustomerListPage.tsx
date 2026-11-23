import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError } from '../../shared/api/errors';
import { useAuth } from '../../shared/auth/AuthProvider';
import { DataTable, type DataColumn } from '../../shared/components/DataTable';
import { FormField } from '../../shared/components/FormField';
import { Modal } from '../../shared/components/Modal';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import { formatMoney } from '../../shared/utils/format';
import type { ListQuery } from '../inventory/api';
import { archiveCustomer, createCustomer, listCustomers, listGovernorates, updateCustomer, type Customer } from './api';
import { formatDate } from '../../shared/utils/format';
import { exportCsv, type ExportColumn } from '../reports/export';

const initialQuery: ListQuery = { page: 1, perPage: 10, search: '' };

function optionalField(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? '').trim();
  return text || null;
}

function CustomerDialog({ customer, onClose }: { customer: Customer | null; onClose: () => void }) {
  const client = useQueryClient();
  const { user } = useAuth();
  const canViewGovernorates = Boolean(user?.permissions.includes('*') || user?.permissions.includes('governorates.view'));
  const [governorate, setGovernorate] = useState(customer?.governorate ?? '');
  const availableGovernorates = useQuery({
    queryKey: ['/reference/governorates', 'customer-form-options', customer?.id ?? 'new'],
    queryFn: () => listGovernorates({ page: 1, perPage: 100, search: '' }, Boolean(customer)),
    enabled: canViewGovernorates,
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const create = useMutation({
    mutationFn: (input: Parameters<typeof createCustomer>[0]) =>
      customer ? updateCustomer(customer.id, input) : createCustomer(input),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['/customers'] });
      onClose();
    },
  });

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    const values = new FormData(event.currentTarget);
    const creditLimit = String(values.get('credit_limit') ?? '').trim();
    if (creditLimit && !/^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$/.test(creditLimit)) {
      setError(ar.customers.invalidCreditLimit);
      setSubmitting(false);
      return;
    }
    try {
      await create.mutateAsync({
        name: String(values.get('name') ?? '').trim(),
        phone: optionalField(values.get('phone')),
        email: optionalField(values.get('email')),
        address: optionalField(values.get('address')),
        salesperson: optionalField(values.get('salesperson')),
        tax_number: optionalField(values.get('tax_number')),
        payment_terms: optionalField(values.get('payment_terms')),
        governorate: optionalField(values.get('governorate')),
        ...(creditLimit ? { credit_limit: creditLimit } : {}),
        notes: optionalField(values.get('notes')),
        ...(customer ? { status: String(values.get('status')) as Customer['status'] } : {}),
      });
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : ar.common.networkError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open title={customer ? ar.customers.editTitle : ar.customers.addTitle} onClose={onClose}>
      <form className="stack-form" onSubmit={(event) => void submit(event)}>
        <div className="inventory-toolbar">
          <FormField
            defaultValue={customer?.name ?? ''}
            id="customer-name"
            label={ar.common.name}
            name="name"
            required
          />
          <FormField
            defaultValue={customer?.phone ?? ''}
            id="customer-phone"
            label={ar.common.phone}
            name="phone"
            type="tel"
          />
          <FormField
            defaultValue={customer?.email ?? ''}
            id="customer-email"
            label={ar.common.email}
            name="email"
            type="email"
          />
          <FormField
            defaultValue={customer?.address ?? ''}
            id="customer-address"
            label={ar.common.address}
            name="address"
          />
          <FormField
            defaultValue={customer?.salesperson ?? ''}
            id="customer-salesperson"
            label={ar.customers.salesperson}
            name="salesperson"
          />
          <FormField
            defaultValue={customer?.tax_number ?? ''}
            id="customer-tax-number"
            label={ar.customers.taxNumber}
            name="tax_number"
          />
          <FormField
            defaultValue={customer?.payment_terms ?? ''}
            id="customer-payment-terms"
            label={ar.customers.paymentTerms}
            name="payment_terms"
          />
          {canViewGovernorates && !availableGovernorates.isError ? (
            <label className="form-field" htmlFor="customer-governorate">
              <span>{ar.customers.governorate}</span>
              <select className="input" value={governorate} onChange={(event) => setGovernorate(event.currentTarget.value)} id="customer-governorate" name="governorate">
                <option value="">— اختر المحافظة —</option>
                {customer?.governorate && !availableGovernorates.data?.data.some((item) => item.name === customer.governorate) && <option value={customer.governorate}>{customer.governorate}</option>}
                {(availableGovernorates.data?.data ?? []).map((item) => <option key={item.id} value={item.name}>{item.name}{item.is_active ? '' : ' (معطلة)'}</option>)}
              </select>
            </label>
          ) : (
            <>
              <FormField defaultValue={customer?.governorate ?? ''} id="customer-governorate" label={ar.customers.governorate} name="governorate" />
              {canViewGovernorates && availableGovernorates.isError && <p className="field-error" role="alert">تعذر تحميل المحافظات. يمكنك إدخال اسم المحافظة يدويًا أو إعادة المحاولة. <button className="button button-secondary" onClick={() => void availableGovernorates.refetch()} type="button">{ar.common.retry}</button></p>}
            </>
          )}
          <FormField
            id="customer-credit-limit"
            label={ar.customers.creditLimit}
            name="credit_limit"
            defaultValue={customer?.credit_limit ?? ''}
            inputMode="decimal"
            pattern="^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$"
          />
          <FormField defaultValue={customer?.notes ?? ''} id="customer-notes" label={ar.customers.notes} name="notes" />
          {customer && (
            <label className="form-field" htmlFor="customer-status">
              <span>{ar.common.status}</span>
              <select className="input" defaultValue={customer.status ?? (customer.is_active ? 'active' : 'paused')} id="customer-status" name="status">
                <option value="active">{ar.common.active}</option>
                <option value="paused">موقوف</option>
                <option value="blocked">محظور</option>
              </select>
            </label>
          )}
        </div>
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button className="button button-secondary" onClick={onClose} type="button">
            {ar.common.cancel}
          </button>
          <button className="button button-primary" disabled={submitting} type="submit">
            {submitting ? ar.app.loading : ar.common.save}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function CustomerListPage() {
  const [query, setQuery] = useState(initialQuery);
  const [searchParams, setSearchParams] = useSearchParams();
  const createRequested = searchParams.get('create') === '1';
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerToArchive, setCustomerToArchive] = useState<Customer | null>(null);
  const [archiveError, setArchiveError] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'blocked'>('all');
  const [governorateFilter, setGovernorateFilter] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState<'all' | 'EGP' | 'USD'>('all');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const { user } = useAuth();
  const client = useQueryClient();
  const navigate = useNavigate();
  const canCreate = Boolean(user?.permissions.includes('*') || user?.permissions.includes('customers.create'));
  const canManage = Boolean(user?.permissions.includes('*') || user?.permissions.includes('customers.manage'));
  const canViewBalances = Boolean(user?.permissions.includes('*') || user?.permissions.includes('reports.customer_balances.view'));
  const canViewGovernorates = Boolean(user?.permissions.includes('*') || user?.permissions.includes('governorates.view'));
  const canViewTrash = Boolean(user?.permissions.includes('*') || user?.permissions.includes('trash.view'));
  const archive = useMutation({
    mutationFn: archiveCustomer,
    onSuccess: async () => {
      setArchiveError('');
      setCustomerToArchive(null);
      await client.invalidateQueries({ queryKey: ['/customers'] });
    },
    onError: () => setArchiveError(ar.customers.archiveFailed),
  });
  useEffect(() => {
    if (createRequested && canCreate) { setEditingCustomer(null); setDialogOpen(true); }
  }, [createRequested, canCreate]);
  const closeDialog = () => {
    setDialogOpen(false); setEditingCustomer(null);
    if (searchParams.has('create')) { const next = new URLSearchParams(searchParams); next.delete('create'); setSearchParams(next, { replace: true }); }
  };
  const openCreateDialog = () => {
    setEditingCustomer(null); setDialogOpen(true);
    const next = new URLSearchParams(searchParams); next.set('create', '1'); setSearchParams(next, { replace: true });
  };
  const filters = { ...(statusFilter !== 'all' ? { status: statusFilter } : {}), ...(governorateFilter ? { governorate: governorateFilter } : {}), ...(currencyFilter !== 'all' ? { currency: currencyFilter } : {}) };
  const result = useQuery({
    queryKey: ['/customers', query, statusFilter, governorateFilter, currencyFilter],
    queryFn: () => listCustomers(query, filters),
  });
  const governorates = useQuery({ queryKey: ['/reference/governorates', 'customer-list-options'], queryFn: () => listGovernorates({ page: 1, perPage: 100, search: '' }), enabled: canViewGovernorates });
  const columns: DataColumn<Customer>[] = [
    { key: 'name', header: ar.common.name, className: 'customer-mobile-column', render: (row) => <Link className="customer-row-link" onClick={(event) => event.stopPropagation()} to={`/customers/${row.id}`}>{row.name}</Link> },
    { key: 'phone', header: ar.common.phone, className: 'customer-mobile-column', render: (row) => <bdi dir="ltr">{row.phone || '—'}</bdi> },
    { key: 'email', header: ar.common.email, className: 'customer-mobile-column', render: (row) => row.email || ar.customers.emailNotRecorded },
    { key: 'status', header: ar.common.status, render: (row) => row.status === 'blocked' ? 'محظور' : row.status === 'paused' ? 'موقوف' : ar.common.active },
    { key: 'governorate', header: ar.customers.governorate, className: 'customer-mobile-column', render: (row) => row.governorate || '—' },
    ...(canViewBalances ? [
      { key: 'invoice-total', header: 'إجمالي الفواتير', className: 'customer-financial-column', render: (row: Customer) => formatMoney(row.invoices_total_egp ?? '0') },
      { key: 'paid-total', header: 'المدفوع', className: 'customer-financial-column', render: (row: Customer) => formatMoney(row.paid_total_egp ?? '0') },
      { key: 'remaining-total', header: 'المتبقي', className: 'customer-financial-column', render: (row: Customer) => formatMoney(row.remaining_total_egp ?? '0') },
    ] : []),
    { key: 'last-activity', header: 'آخر تعامل', className: 'customer-last-activity', render: (row) => row.last_activity_date ? formatDate(row.last_activity_date) : '—' },
    ...(canManage ? [{ key: 'edit', header: ar.common.actions, className: 'customer-actions-column', render: (row: Customer) => <div className="customer-row-action-buttons"><button className="button button-secondary" onClick={(event) => { event.stopPropagation(); setEditingCustomer(row); setDialogOpen(true); }} type="button">{ar.common.edit}</button><button className="button button-danger" onClick={(event) => { event.stopPropagation(); setArchiveError(''); setCustomerToArchive(row); }} type="button">{ar.common.delete}</button></div> }] : []),
  ];
  const rows = result.data?.data ?? [];
  const exportColumns: ExportColumn<Customer>[] = [
    { label: ar.common.name, value: (row) => row.name },
    { label: ar.common.phone, value: (row) => row.phone },
    { label: ar.common.email, value: (row) => row.email },
    { label: ar.customers.governorate, value: (row) => row.governorate },
    { label: ar.common.status, value: (row) => row.status },
    ...(canViewBalances ? [
      { label: 'إجمالي الفواتير', value: (row: Customer) => row.invoices_total_egp },
      { label: 'المدفوع', value: (row: Customer) => row.paid_total_egp },
      { label: 'المتبقي', value: (row: Customer) => row.remaining_total_egp },
    ] : []),
    { label: 'آخر تعامل', value: (row) => row.last_activity_date },
  ];
  const exportAll = async () => {
    setIsExporting(true); setExportError('');
    try {
      const exportRows: Customer[] = [];
      let page = 1; let lastPage = 1;
      do {
        const response = await listCustomers({ ...query, page, perPage: 100 }, filters);
        exportRows.push(...response.data); lastPage = response.meta.last_page; page += 1;
      } while (page <= lastPage);
      exportCsv('customers', exportColumns, exportRows);
    } catch {
      setExportError(ar.common.requestFailed);
    } finally {
      setIsExporting(false);
    }
  };
  return (
    <section className="page inventory-page customer-list-page">
      <header className="page-heading"><div><h1>{ar.nav.customers}</h1><p>إجمالي {result.data?.meta.customer_summary?.total_customers ?? result.data?.meta.total ?? '—'} عميل — {result.data?.meta.customer_summary?.active_customers ?? '—'} نشط</p></div><div className="customer-heading-actions"><button className="button button-secondary" disabled={isExporting || !result.data?.meta.total} onClick={() => void exportAll()} type="button">{isExporting ? ar.app.loading : 'تصدير CSV'}</button>{canCreate && <button className="button button-primary" onClick={openCreateDialog} type="button">{ar.common.add} {ar.nav.customers}</button>}</div></header>
      <nav aria-label="روابط العملاء" className="customer-shortcuts"><span aria-current="page">كل العملاء</span>{canViewGovernorates && <button onClick={() => navigate('/admin/governorates')} type="button">المحافظات</button>}{canViewTrash && <button onClick={() => navigate('/admin/trash')} type="button">سلة المحذوفات</button>}</nav>
      <div className="customer-filter-layout">
        <label className="inventory-search customer-main-search"><span>{ar.common.search}</span><input aria-label="ابحث بالاسم أو الهاتف أو المحافظة" className="input" placeholder="بحث بالاسم أو الهاتف أو المحافظة" onChange={(event) => { const search = event.currentTarget.value; setQuery((current) => ({ ...current, search, page: 1 })); }} type="search" value={query.search} /></label>
        <div aria-label="حالة العميل" className="customer-status-filters" role="group">{(['all', 'active', 'paused', 'blocked'] as const).map((status) => <button aria-pressed={statusFilter === status} className={statusFilter === status ? 'customer-tab-active' : ''} key={status} onClick={() => { setStatusFilter(status); setQuery((current) => ({ ...current, page: 1 })); }} type="button">{status === 'all' ? 'الكل' : status === 'active' ? ar.common.active : status === 'paused' ? 'موقوف' : 'محظور'}</button>)}</div>
        {canViewGovernorates && <label className="inventory-search customer-governorate-filter"><span>{ar.customers.governorate}</span><select className="select" onChange={(event) => { setGovernorateFilter(event.currentTarget.value); setQuery((current) => ({ ...current, page: 1 })); }} value={governorateFilter}><option value="">كل المحافظات</option>{(governorates.data?.data ?? []).map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label>}
        {canViewGovernorates && governorates.isError && <p className="field-error" role="alert">تعذر تحميل قائمة المحافظات. <button className="button button-secondary" onClick={() => void governorates.refetch()} type="button">{ar.common.retry}</button></p>}
        <label className="inventory-search customer-currency-filter"><span>العملة</span><select className="select" onChange={(event) => { setCurrencyFilter(event.currentTarget.value as typeof currencyFilter); setQuery((current) => ({ ...current, page: 1 })); }} value={currencyFilter}><option value="all">كل العملات</option><option value="EGP">ج.م</option><option value="USD">USD</option></select></label>
      </div>
      {exportError && <p className="field-error" role="alert">{exportError}</p>}
      {result.isLoading ? <PageState kind="loading" /> : result.isError ? <PageState kind="error" message={ar.common.requestFailed} onRetry={() => void result.refetch()} /> : result.data ? (
        <><DataTable className="customer-list-table" columns={columns} emptyMessage={ar.common.noResults} getRowKey={(row) => row.id} onRowClick={(row) => navigate(`/customers/${row.id}`)} rows={rows} /><nav aria-label={ar.inventory.paginationLabel} className="inventory-pagination"><button className="button button-secondary" disabled={query.page <= 1} onClick={() => setQuery((current) => ({ ...current, page: current.page - 1 }))} type="button">{ar.common.previous}</button><span>{ar.common.page} <bdi dir="ltr">{query.page}</bdi> {ar.common.of} <bdi dir="ltr">{result.data.meta.last_page}</bdi></span><button className="button button-secondary" disabled={query.page >= result.data.meta.last_page} onClick={() => setQuery((current) => ({ ...current, page: current.page + 1 }))} type="button">{ar.common.next}</button></nav></>
      ) : <PageState kind="loading" />}
      {dialogOpen && <CustomerDialog customer={editingCustomer} onClose={closeDialog} />}
      {customerToArchive && <Modal open title={ar.customers.archiveTitle} onClose={() => { if (!archive.isPending) { setCustomerToArchive(null); setArchiveError(''); } }}>
        <p>{ar.customers.archiveDescription}</p>
        <p><strong>{customerToArchive.name}</strong></p>
        {archiveError && <p className="field-error" role="alert">{archiveError}</p>}
        <div className="modal-actions">
          <button className="button button-secondary" disabled={archive.isPending} onClick={() => setCustomerToArchive(null)} type="button">{ar.common.cancel}</button>
          <button className="button button-danger" disabled={archive.isPending} onClick={() => archive.mutate(customerToArchive.id)} type="button">{archive.isPending ? ar.app.loading : ar.common.delete}</button>
        </div>
      </Modal>}
    </section>
  );
}
