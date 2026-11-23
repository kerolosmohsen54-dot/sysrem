import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, formatApiErrorDetails } from '../../shared/api/errors';
import { useAuth } from '../../shared/auth/AuthProvider';
import { DataTable, type DataColumn } from '../../shared/components/DataTable';
import { FormField } from '../../shared/components/FormField';
import { Modal } from '../../shared/components/Modal';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import type { ListQuery } from '../inventory/api';
import { createPartner, getPartner, listPartners, updatePartner, type Partner } from './api';
import { formatMoney } from '../../shared/utils/format';
import { whatsappHref } from '../../shared/utils/whatsapp';

function FieldErrors({ error }: { error: unknown }) {
  if (!(error instanceof ApiError) || !error.details || typeof error.details !== 'object') return null;
  const details = formatApiErrorDetails(error.details);
  return details ? <p className="field-error" role="alert">{details}</p> : null;
}

export function PartnersPage() {
  const { user } = useAuth();
  const client = useQueryClient();
  const canCreate = Boolean(user?.permissions.includes('*') || user?.permissions.includes('partners.manage'));
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [formError, setFormError] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);
  const [selectedPartnerId, setSelectedPartnerId] = useState<number | null>(null);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [showProfitsOnly, setShowProfitsOnly] = useState(false);
  const query: ListQuery = { page, perPage: 20, search };
  const partners = useQuery({ queryKey: ['/partners', query], queryFn: () => listPartners(query), retry: false });
  const partnerDetails = useQuery({
    queryKey: ['/partners', selectedPartnerId, 'profit-details'],
    queryFn: () => getPartner(selectedPartnerId ?? 0),
    enabled: selectedPartnerId !== null,
    retry: false,
  });
  const create = useMutation({
    mutationFn: createPartner,
    onSuccess: async () => {
      setFormError(null);
      setSaved(true);
      await client.invalidateQueries({ queryKey: ['/partners'] });
    },
    onError: (error: unknown) => { setFormError(error); setSaved(false); },
  });
  const update = useMutation({
    mutationFn: ({ id, input }: { id: number; input: Pick<Partner, 'name' | 'phone' | 'status'> }) => updatePartner(id, input),
    onSuccess: async () => {
      setFormError(null);
      setSaved(true);
      setEditingPartner(null);
      await Promise.all([
        client.invalidateQueries({ queryKey: ['/partners'] }),
        client.invalidateQueries({ queryKey: ['/partners', editingPartner?.id, 'profit-details'] }),
      ]);
    },
    onError: (error: unknown) => { setFormError(error); setSaved(false); },
  });
  const columns: DataColumn<Partner>[] = [
    { key: 'name', header: ar.common.name, render: (row) => row.name },
    { key: 'phone', header: 'واتساب', render: (row) => { const href = whatsappHref(row.phone); return href ? <a href={href} rel="noreferrer" target="_blank" dir="ltr">{row.phone}</a> : ar.common.notProvided; } },
    { key: 'invoice_count', header: 'عدد الفواتير', render: (row) => row.profit_summary?.invoice_count ?? 0 },
    { key: 'profit', header: 'الأرباح المسجلة', render: (row) => formatMoney(row.profit_summary?.profit_egp ?? '0') },
    { key: 'status', header: ar.common.status, render: (row) => row.status === 'active' ? ar.common.active : ar.common.inactive },
    { key: 'details', header: 'التفاصيل', render: (row) => <div className="button-row"><button className="button button-secondary button-sm" onClick={() => setSelectedPartnerId(row.id)} type="button">الفواتير والربح</button><Link className="button button-secondary button-sm" to={`/partners/${row.id}`}>صفحة الحساب</Link>{canCreate && <button className="button button-secondary button-sm" onClick={() => { setFormError(null); setEditingPartner(row); }} type="button">تعديل</button>}</div> },
  ];
  const profitColumns: DataColumn<Partner>[] = [
    { key: 'name', header: ar.common.name, render: (row) => row.name },
    { key: 'profit', header: 'الربح فقط', render: (row) => <strong>{formatMoney(row.profit_summary?.profit_egp ?? '0')}</strong> },
  ];
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    create.mutate({
      name: String(values.get('name') ?? '').trim(),
      phone: String(values.get('phone') ?? '').trim() || null,
    });
  };
  const submitUpdate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingPartner || update.isPending) return;
    const values = new FormData(event.currentTarget);
    update.mutate({ id: editingPartner.id, input: {
      name: String(values.get('name') ?? '').trim(),
      phone: String(values.get('phone') ?? '').trim() || null,
      status: String(values.get('status')) as Partner['status'],
    } });
  };

  if (partners.isLoading) return <PageState kind="loading" />;
  if (partners.isError || !partners.data) {
    const denied = partners.error instanceof ApiError && partners.error.status === 403;
    return <PageState kind={denied ? 'denied' : 'error'} message={denied ? ar.common.permissionDenied : ar.common.requestFailed} onRetry={() => void partners.refetch()} />;
  }

  return (
    <section className="page inventory-page">
      <header className="page-heading"><div><h1>{ar.nav.partners}</h1><p>{ar.finance.partnerLedgerDescription}</p></div></header>
      <label className="inventory-search"><span>{ar.common.search}</span><input aria-label={ar.common.search} className="input" onChange={(event) => { setSearch(event.currentTarget.value); setPage(1); }} value={search} /></label>
      <div aria-label="طريقة عرض الشركاء" className="button-row company-partner-view-toggle" role="group">
        <button aria-pressed={!showProfitsOnly} className={showProfitsOnly ? 'button button-secondary' : 'button button-primary'} onClick={() => setShowProfitsOnly(false)} type="button">قائمة الشركاء</button>
        <button aria-pressed={showProfitsOnly} className={showProfitsOnly ? 'button button-primary' : 'button button-secondary'} onClick={() => setShowProfitsOnly(true)} type="button">الأرباح فقط</button>
      </div>
      {showProfitsOnly ? <section aria-label="أرباح الشركاء فقط" className="company-partner-profit-view"><h2>أرباح الشركاء فقط</h2><DataTable className="company-partners-profit-table" columns={profitColumns} rows={partners.data.data} getRowKey={(row) => row.id} emptyMessage={ar.common.noResults} /></section> : <DataTable columns={columns} rows={partners.data.data} getRowKey={(row) => row.id} emptyMessage={ar.common.noResults} />}
      {editingPartner && <Modal open title={`تعديل الشريك: ${editingPartner.name}`} onClose={() => setEditingPartner(null)}>
        <form className="stack-form" onSubmit={submitUpdate}>
          <FormField id="edit-partner-name" label={ar.common.name} name="name" defaultValue={editingPartner.name} required maxLength={160} />
          <FormField id="edit-partner-phone" label="رقم واتساب" name="phone" defaultValue={editingPartner.phone ?? ''} maxLength={80} />
          <label className="form-field"><span>{ar.common.status}</span><select className="input" defaultValue={editingPartner.status} name="status"><option value="active">{ar.common.active}</option><option value="inactive">{ar.common.inactive}</option></select></label>
          {formError instanceof ApiError && <p className="field-error" role="alert">{formError.message}</p>}
          <FieldErrors error={formError} />
          <div className="button-row"><button className="button button-primary" disabled={update.isPending} type="submit">حفظ التعديلات</button><button className="button button-secondary" disabled={update.isPending} onClick={() => setEditingPartner(null)} type="button">إلغاء</button></div>
        </form>
      </Modal>}
      {partnerDetails.data && (
        <Modal open title={`حساب الشريك: ${partnerDetails.data.partner.name}`} onClose={() => setSelectedPartnerId(null)}>
          <section className="stack-form">
            {whatsappHref(partnerDetails.data.partner.phone) && <a href={whatsappHref(partnerDetails.data.partner.phone)!} rel="noreferrer" target="_blank">مراسلة الشريك على واتساب</a>}
            <p>الفواتير: {partnerDetails.data.profit_summary.invoice_count}</p>
            <p>إجمالي الأرباح المسجلة: {formatMoney(partnerDetails.data.profit_summary.profit_egp)}</p>
            {partnerDetails.data.company_profit_from_drivers_egp !== null && <p>ربح الشركة من فواتير السائق: {formatMoney(partnerDetails.data.company_profit_from_drivers_egp)}</p>}
            {partnerDetails.data.profit_summary.unpriced_line_count > 0 && <p className="field-error">بنود بلا سعر شركة محفوظ: {partnerDetails.data.profit_summary.unpriced_line_count}</p>}
            {partnerDetails.data.invoices.map((invoice) => (
              <article className="invoice-form-card" key={invoice.id}>
                <h3>{invoice.invoice_number} — {invoice.customer_name} — {formatMoney(invoice.profit_egp)}</h3>
                <p>{invoice.issue_date} · أصدرها: {invoice.issuer_name}</p>
                {invoice.lines.map((line, index) => (
                  <p key={`${line.sku ?? line.product_name}-${index}`}>
                    {line.product_name} · سعر الشركة {line.company_price_egp ? formatMoney(line.company_price_egp) : 'غير مسجل'} · تكلفة الشراء {line.purchase_cost_egp ? formatMoney(line.purchase_cost_egp) : 'غير مسجلة'} · البيع {formatMoney(line.unit_price_egp)} · الزيادة {line.markup_egp ? formatMoney(line.markup_egp) : '—'} · الصافي {line.net_quantity} · الربح {line.profit_egp ? formatMoney(line.profit_egp) : '—'}
                  </p>
                ))}
              </article>
            ))}
            <h3>سجل حركات الشريك</h3>
            <table className="data-table"><thead><tr><th>التاريخ</th><th>النوع</th><th>الفاتورة / المرجع</th><th>المبلغ</th></tr></thead><tbody>
              {partnerDetails.data.ledger.map((entry) => <tr key={entry.id}><td>{entry.effective_date}</td><td>{entry.purchase_invoice_id ? 'ربح الشريك البائع' : entry.entry_type === 'accrual' ? 'ربح فاتورة' : entry.entry_type === 'payout' ? 'صرف سابق' : 'عكس الربح'}</td><td>{entry.purchase_invoice_id ? <Link to={`/purchase-invoices/${entry.purchase_invoice_id}`}>{entry.invoice_number}</Link> : entry.invoice_number ?? entry.reference_number ?? `#${entry.partner_payment_id ?? ''}`}</td><td>{formatMoney(entry.amount_egp)}</td></tr>)}
              {partnerDetails.data.ledger.length === 0 && <tr><td colSpan={4}>لا توجد حركات</td></tr>}
            </tbody></table>
          </section>
        </Modal>
      )}
      <nav aria-label={ar.inventory.paginationLabel} className="inventory-pagination">
        <button className="button button-secondary" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} type="button">{ar.common.previous}</button>
        <span>{ar.common.page} {page} {ar.common.of} {partners.data.meta.last_page}</span>
        <button className="button button-secondary" disabled={page >= partners.data.meta.last_page} onClick={() => setPage((value) => value + 1)} type="button">{ar.common.next}</button>
      </nav>
      {canCreate && <form className="stack-form" onSubmit={submit}>
        <h2>{ar.finance.createPartner}</h2>
        <FormField id="partner-name" label={ar.common.name} name="name" required maxLength={160} />
        <FormField id="partner-phone" label="رقم واتساب" name="phone" required maxLength={80} />
        {formError instanceof ApiError && <p className="field-error" role="alert">{formError.message}</p>}
        <FieldErrors error={formError} />
        {saved && <p className="inline-success" role="status">{ar.common.actionSaved}</p>}
        <button className="button button-primary" disabled={create.isPending} type="submit">{ar.finance.createPartner}</button>
      </form>}
    </section>
  );
}
