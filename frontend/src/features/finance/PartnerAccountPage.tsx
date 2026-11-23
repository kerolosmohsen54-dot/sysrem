import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ApiError } from '../../shared/api/errors';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import { formatMoney } from '../../shared/utils/format';
import { whatsappHref } from '../../shared/utils/whatsapp';
import { getPartner } from './api';

export function PartnerAccountPage() {
  const { partnerId = '' } = useParams();
  const id = /^[1-9]\d*$/.test(partnerId) ? Number(partnerId) : 0;
  const account = useQuery({
    queryKey: ['/partners', id, 'account-page'],
    queryFn: () => getPartner(id),
    enabled: id > 0,
    retry: false,
  });

  if (id < 1) return <PageState kind="error" message={ar.common.requestFailed} />;
  if (account.isLoading) return <PageState kind="loading" />;
  if (account.isError || !account.data) {
    const denied = account.error instanceof ApiError && account.error.status === 403;
    return <PageState kind={denied ? 'denied' : 'error'} message={denied ? ar.common.permissionDenied : ar.common.requestFailed} onRetry={() => void account.refetch()} />;
  }

  const data = account.data;
  return (
    <section className="page inventory-page">
      <header className="page-heading">
        <div><h1>حساب الشريك: {data.partner.name}</h1><p>{whatsappHref(data.partner.phone) ? <a href={whatsappHref(data.partner.phone)!} rel="noreferrer" target="_blank" dir="ltr">{data.partner.phone}</a> : ar.common.notProvided}</p></div>
        <div className="button-row">
          <Link className="button button-secondary" to="/partners">{ar.nav.partners}</Link>
        </div>
      </header>
      <section aria-label="ملخص حساب الشريك" className="dashboard-grid">
        <article className="stat-card"><span>عدد الفواتير</span><strong>{data.profit_summary.invoice_count}</strong></article>
        <article className="stat-card"><span>الأرباح المسجلة</span><strong>{formatMoney(data.profit_summary.profit_egp)}</strong></article>
      </section>
      {data.company_profit_from_drivers_egp !== null && <p>ربح الشركة من فواتير السائق: {formatMoney(data.company_profit_from_drivers_egp)}</p>}
      {data.profit_summary.unpriced_line_count > 0 && <p className="field-error" role="status">بنود بلا سعر شركة محفوظ: {data.profit_summary.unpriced_line_count}</p>}
      <section aria-labelledby="partner-account-invoices">
        <h2 id="partner-account-invoices">الفواتير والأرباح</h2>
        {data.invoices.map((invoice) => (
          <article className="invoice-form-card" key={invoice.id}>
            <h3>{invoice.invoice_number} — {invoice.customer_name} — {formatMoney(invoice.profit_egp)}</h3>
            <p>{invoice.issue_date} · أصدرها: {invoice.issuer_name}</p>
            <div className="table-wrap" tabIndex={0}><table className="data-table"><thead><tr><th>المنتج</th><th>{ar.sales.quantity}</th><th>سعر الشركة</th><th>سعر البيع</th><th>الزيادة</th><th>الربح</th><th>{ar.reports.container}</th></tr></thead><tbody>
              {invoice.lines.map((line, index) => <tr key={`${invoice.id}-${line.sku ?? line.product_name}-${index}`}><td>{line.product_name}</td><td>{line.net_quantity} / {line.sold_quantity}</td><td>{line.company_price_egp ? formatMoney(line.company_price_egp) : ar.common.notProvided}</td><td>{formatMoney(line.unit_price_egp)}</td><td>{line.markup_egp === null ? ar.common.notProvided : formatMoney(line.markup_egp)}</td><td>{line.profit_egp === null ? ar.common.notProvided : formatMoney(line.profit_egp)}</td><td>{line.container_number ?? ar.common.notProvided}</td></tr>)}
              {invoice.lines.length === 0 && <tr><td colSpan={7}>{ar.common.noResults}</td></tr>}
            </tbody></table></div>
          </article>
        ))}
        {data.invoices.length === 0 && <p>{ar.common.noResults}</p>}
      </section>
      <section aria-labelledby="partner-account-ledger">
        <h2 id="partner-account-ledger">سجل حركات الشريك</h2>
        <table className="data-table"><thead><tr><th>{ar.common.date}</th><th>نوع الحركة</th><th>الفاتورة / المرجع</th><th>{ar.finance.amount}</th></tr></thead><tbody>
          {data.ledger.map((entry) => <tr key={entry.id}><td>{entry.effective_date}</td><td>{entry.purchase_invoice_id ? 'ربح الشريك البائع' : entry.entry_type === 'accrual' ? 'ربح فاتورة' : entry.entry_type === 'payout' ? 'صرف سابق' : 'عكس الربح'}</td><td>{entry.purchase_invoice_id ? <Link to={`/purchase-invoices/${entry.purchase_invoice_id}`}>{entry.invoice_number}</Link> : entry.invoice_number ?? entry.reference_number ?? `#${entry.partner_payment_id ?? ''}`}</td><td>{formatMoney(entry.amount_egp)}</td></tr>)}
          {data.ledger.length === 0 && <tr><td colSpan={4}>{ar.common.noResults}</td></tr>}
        </tbody></table>
      </section>
    </section>
  );
}
