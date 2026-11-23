import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../../shared/components/Icon';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import { formatDate, formatMoney } from '../../shared/utils/format';
import { shareText } from '../../shared/utils/share';
import { listCustomers } from '../customers/api';
import type { ListQuery } from '../inventory/api';
import { listInvoices, type Invoice } from './api';

const customerOptionsQuery: ListQuery = { page: 1, perPage: 100, search: '' };
const tablePageSize = 10;
const issuerNames = ['كراس', 'أبنوب', 'السائق'] as const;
const emptyInvoices: Invoice[] = [];
type InvoiceFilter = 'all' | 'draft' | 'unpaid' | 'overdue' | 'paid';

async function loadAllInvoices(search: string, filters: Record<string, string> = {}) {
  const firstPage = await listInvoices({ page: 1, perPage: 100, search }, filters);
  if (firstPage.meta.last_page <= 1) return firstPage.data;

  const remainingPages = await Promise.all(
    Array.from({ length: firstPage.meta.last_page - 1 }, (_, index) =>
      listInvoices({ page: index + 2, perPage: 100, search }, filters),
    ),
  );
  return [...firstPage.data, ...remainingPages.flatMap((page) => page.data)];
}

function moneyUnits(value: string | null): bigint {
  if (!value) return 0n;
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole) * 10000n + BigInt(fraction.padEnd(4, '0').slice(0, 4));
}

function formatMoneyUnits(value: bigint): string {
  const whole = value / 10000n;
  const fraction = String(value % 10000n).padStart(4, '0');
  const precision = fraction.endsWith('00') ? 2 : 4;
  return formatMoney(`${whole}.${fraction.slice(0, precision)}`);
}

function isOutstanding(invoice: Invoice) {
  return (
    invoice.status === 'issued' &&
    invoice.remaining_egp !== null &&
    moneyUnits(invoice.remaining_egp) > 0n
  );
}

function isPaid(invoice: Invoice) {
  return (
    invoice.status === 'paid' ||
    (invoice.status === 'issued' &&
      invoice.remaining_egp !== null &&
      moneyUnits(invoice.remaining_egp) <= 0n)
  );
}

function isOverdue(invoice: Invoice, today: string) {
  return isOutstanding(invoice) && invoice.due_date !== null && invoice.due_date < today;
}

function invoiceStatus(invoice: Invoice, today: string) {
  if (invoice.status === 'draft') return { label: 'مسودة', tone: 'neutral' };
  if (invoice.status === 'cancelled') return { label: 'ملغاة', tone: 'neutral' };
  if (isPaid(invoice)) return { label: 'مدفوعة', tone: 'success' };
  if (isOverdue(invoice, today)) return { label: 'متأخرة', tone: 'danger' };
  if (moneyUnits(invoice.paid_egp) > 0n) return { label: 'مدفوعة جزئيًا', tone: 'warning' };
  return { label: 'غير مدفوعة', tone: 'warning' };
}

function invoiceBelongsToIssuer(invoice: Invoice, issuer: string) {
  return invoice.issuer_name.toLocaleLowerCase('ar').includes(issuer.toLocaleLowerCase('ar'));
}

export function InvoiceListPage() {
  const [search, setSearch] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [date, setDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceFilter>('all');
  const [issuerFilter, setIssuerFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
  const [notice, setNotice] = useState('');
  const selectAllRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const customers = useQuery({
    queryKey: ['/customers', 'invoice-options'],
    queryFn: () => listCustomers(customerOptionsQuery),
  });
  const filters = {
    ...(customerId ? { customer_id: customerId } : {}),
    ...(date ? { from_date: date, to_date: date } : {}),
  };
  const result = useQuery({
    queryKey: ['/invoices', 'invoice-list', search, customerId, date],
    queryFn: () => loadAllInvoices(search, filters),
  });
  const summary = useQuery({
    queryKey: ['/invoices', 'invoice-list-summary'],
    queryFn: () => loadAllInvoices(''),
  });

  const currentDate = new Date();
  const today = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
  const currentMonth = today.slice(0, 7);
  const invoices = result.data ?? emptyInvoices;
  const selectedInvoices = invoices.filter((invoice) => selectedIds.has(invoice.id));

  const filteredInvoices = useMemo(
    () =>
      invoices.filter((invoice) => {
        const overdue = isOverdue(invoice, today);
        const matchesIssuer = !issuerFilter || invoiceBelongsToIssuer(invoice, issuerFilter);
        const matchesStatus =
          statusFilter === 'all' ||
          (statusFilter === 'draft' && invoice.status === 'draft') ||
          (statusFilter === 'unpaid' &&
            invoice.status === 'issued' &&
            !isPaid(invoice)) ||
          (statusFilter === 'overdue' && overdue) ||
          (statusFilter === 'paid' && isPaid(invoice));
        return matchesIssuer && matchesStatus;
      }),
    [invoices, issuerFilter, statusFilter, today],
  );
  const pageCount = Math.max(1, Math.ceil(filteredInvoices.length / tablePageSize));
  const visibleInvoices = filteredInvoices.slice((page - 1) * tablePageSize, page * tablePageSize);
  const allVisibleSelected =
    visibleInvoices.length > 0 && visibleInvoices.every((invoice) => selectedIds.has(invoice.id));
  const summaryInvoices = summary.data ?? [];
  const latestInvoice = [...summaryInvoices].sort((left, right) =>
    right.issue_date.localeCompare(left.issue_date),
  )[0];
  const overdueInvoices = summaryInvoices.filter((invoice) => isOverdue(invoice, today));
  const outstandingTotal = summaryInvoices
    .filter(isOutstanding)
    .reduce((total, invoice) => total + moneyUnits(invoice.remaining_egp), 0n);
  const monthInvoices = summaryInvoices.filter(
    (invoice) =>
      invoice.issue_date.startsWith(currentMonth) &&
      invoice.status !== 'draft' &&
      invoice.status !== 'cancelled',
  );
  const monthLabel = new Intl.DateTimeFormat('ar-EG', {
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = !allVisibleSelected && visibleInvoices.some((invoice) =>
        selectedIds.has(invoice.id),
      );
    }
  }, [allVisibleSelected, selectedIds, visibleInvoices]);

  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
  }, [search, customerId, date, statusFilter, issuerFilter]);

  useEffect(() => {
    if (!notice) return undefined;
    const timeout = window.setTimeout(() => setNotice(''), 3200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const changeSelection = (invoiceId: number, checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(invoiceId);
      else next.delete(invoiceId);
      return next;
    });
  };
  const setIssuer = (issuer: string) => {
    const nextIssuer = issuerFilter === issuer ? '' : issuer;
    setIssuerFilter(nextIssuer);
    if (nextIssuer) {
      setNotice(`فواتير ${nextIssuer} فقط — اضغط على الاسم مرة أخرى لإلغاء الفلتر`);
    } else {
      setNotice('');
    }
  };
  const shareInvoices = (rows: Invoice[]) => {
    if (rows.length === 0) return;
    const message = rows
      .map((invoice) => `${invoice.invoice_number} — ${invoice.customer_name} — ${formatMoney(invoice.total_egp ?? '0.00')}`)
      .join('\n');
    void shareText(message).then(
      (outcome) => {
        if (outcome === 'shared') setNotice('اختار واتساب من قائمة المشاركة لإرسال الفواتير.');
        else if (outcome === 'copied') setNotice('تم نسخ تفاصيل الفواتير — الصقها في واتساب.');
        else if (outcome === 'unsupported') setNotice('المشاركة غير مدعومة في هذا المتصفح.');
      },
      () => setNotice('تعذرت مشاركة الفواتير. حاول مرة أخرى.'),
    );
  };

  if (result.isError) {
    return (
      <section className="page inventory-page invoice-list-page">
        <PageState
          kind="error"
          message={ar.common.requestFailed}
          onRetry={() => void result.refetch()}
        />
      </section>
    );
  }

  return (
    <section className="page inventory-page invoice-list-page">
      <header className="page-heading invoice-list-heading">
        <div>
          <h1>{ar.nav.invoices}</h1>
          <p>
            إجمالي مستحقات:{' '}
            <bdi>
              {summary.isLoading
                ? '…'
                : `ج.م ${formatMoneyUnits(outstandingTotal).replace(' ج.م', '')}`}
            </bdi>
          </p>
        </div>
        <div className="invoice-heading-actions">
          <button
            className="button button-quiet button-sm"
            disabled={!latestInvoice}
            onClick={() => latestInvoice && navigate(`/invoices/${latestInvoice.id}/print`)}
            type="button"
          >
            معاينة طباعة
          </button>
          <button
            className="button button-quiet button-sm"
            disabled={!latestInvoice}
            onClick={() => latestInvoice && navigate(`/invoices/${latestInvoice.id}/print`)}
            type="button"
          >
            تصدير
          </button>
          <button
            className="button button-primary button-sm"
            onClick={() => navigate('/invoices/new')}
            type="button"
          >
            + إنشاء فاتورة
          </button>
        </div>
      </header>

      {summary.isError && (
        <p className="field-error" role="alert">
          تعذر تحميل إجمالي المستحقات وملخص الفواتير.
        </p>
      )}

      {overdueInvoices.length > 0 && (
        <div className="invoice-overdue-alert" role="status">
          <span aria-hidden="true">🔴</span>
          <span>
            <strong>{overdueInvoices.length}</strong> فاتورة متأخرة — مجموع:{' '}
            <bdi>ج.م {formatMoneyUnits(
              overdueInvoices.reduce((total, invoice) => total + moneyUnits(invoice.remaining_egp), 0n),
            ).replace(' ج.م', '')}</bdi>
          </span>
        </div>
      )}

      <section aria-labelledby="invoice-issuers-title" className="invoice-issuers-card">
        <header>
          <h2 id="invoice-issuers-title">مين طلّع الفواتير — {monthLabel}</h2>
          <span>إجمالي {summary.isLoading ? '…' : monthInvoices.length} فاتورة</span>
        </header>
        <div className="invoice-issuer-grid">
          {issuerNames.map((issuer) => {
            const issuerInvoices = monthInvoices.filter((invoice) =>
              invoiceBelongsToIssuer(invoice, issuer),
            );
            return (
              <button
                aria-pressed={issuerFilter === issuer}
                className={`invoice-issuer-card${issuerFilter === issuer ? ' invoice-issuer-card-active' : ''}`}
                key={issuer}
                onClick={() => setIssuer(issuer)}
                type="button"
              >
                <span className="invoice-issuer-name">{issuer}</span>
                <span className="invoice-issuer-count">
                  <strong>{summary.isLoading ? '…' : issuerInvoices.length}</strong>
                  <span>فاتورة</span>
                </span>
                <span className="invoice-issuer-total">
                  {summary.isLoading
                    ? '…'
                    : formatMoneyUnits(
                        issuerInvoices.reduce(
                          (total, invoice) => total + moneyUnits(invoice.total_egp),
                          0n,
                        ),
                      )}{' '}
                  إجمالي
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div aria-label="فلاتر الفواتير" className="invoice-filter-bar">
        <label className="invoice-search-field">
          <span className="visually-hidden">بحث برقم الفاتورة أو العميل</span>
          <Icon name="search" />
          <input
            aria-label="بحث برقم الفاتورة أو العميل"
            className="input"
            onChange={(event) => setSearch(event.currentTarget.value)}
            placeholder="بحث برقم الفاتورة أو العميل..."
            type="search"
            value={search}
          />
        </label>
        <label className="visually-hidden" htmlFor="invoice-customer-filter">
          كل العملاء
        </label>
        <select
          aria-label={ar.common.customer}
          className="input invoice-customer-filter"
          disabled={customers.isLoading}
          id="invoice-customer-filter"
          onChange={(event) => setCustomerId(event.currentTarget.value)}
          value={customerId}
        >
          <option value="">كل العملاء</option>
          {customers.data?.data.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))}
        </select>
        <label className="visually-hidden" htmlFor="invoice-date-filter">
          التاريخ
        </label>
        <input
          aria-label="التاريخ"
          className="input invoice-date-filter"
          id="invoice-date-filter"
          onChange={(event) => setDate(event.currentTarget.value)}
          type="date"
          value={date}
        />
        <span aria-hidden="true" className="invoice-filter-divider" />
        <div aria-label="حالة الفاتورة" className="invoice-status-filters" role="group">
          {([
            ['all', 'الكل'],
            ['draft', 'مسودة'],
            ['unpaid', 'غير مدفوعة'],
            ['overdue', 'متأخرة 🔴'],
            ['paid', 'مدفوعة'],
          ] as const).map(([filter, label]) => (
            <button
              aria-pressed={statusFilter === filter}
              className={`invoice-status-chip invoice-status-chip-${filter}${statusFilter === filter ? ' invoice-status-chip-active' : ''}`}
              key={filter}
              onClick={() => setStatusFilter(filter)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {customers.isError && (
        <p className="field-error" role="alert">
          {ar.common.requestFailed}
        </p>
      )}
      {notice && (
        <p className="invoice-list-notice" role="status">
          {notice}
        </p>
      )}

      {selectedIds.size > 0 && (
        <div aria-live="polite" className="invoice-bulk-actions">
          <strong>{selectedIds.size} فاتورة محددة</strong>
          <div>
            <button
              className="button button-quiet button-sm"
              onClick={() => selectedInvoices[0] && navigate(`/invoices/${selectedInvoices[0].id}/print`)}
              type="button"
            >
              🖨️ طباعة
            </button>
            <button
              className="button button-quiet button-sm"
              onClick={() => selectedInvoices[0] && navigate(`/invoices/${selectedInvoices[0].id}/print`)}
              type="button"
            >
              PDF
            </button>
            <button
              className="button button-primary button-sm"
              onClick={() => shareInvoices(selectedInvoices)}
              type="button"
            >
              📱 إرسال واتساب
            </button>
          </div>
        </div>
      )}

      <div className="invoice-table-card">
        <div className="table-wrap invoice-table-wrap">
          <table className="invoice-table">
            <thead>
              <tr>
                <th className="invoice-checkbox-column" scope="col">
                  <input
                    aria-label="تحديد كل الفواتير في الصفحة"
                    checked={allVisibleSelected}
                    onChange={(event) => {
                      const checked = event.currentTarget.checked;
                      setSelectedIds((current) => {
                        const next = new Set(current);
                        visibleInvoices.forEach((invoice) => {
                          if (checked) next.add(invoice.id);
                          else next.delete(invoice.id);
                        });
                        return next;
                      });
                    }}
                    ref={selectAllRef}
                    type="checkbox"
                  />
                </th>
                <th scope="col">رقم الفاتورة</th>
                <th scope="col">العميل</th>
                <th scope="col">التاريخ</th>
                <th scope="col">الاستحقاق</th>
                <th scope="col">الإجمالي</th>
                <th scope="col">المدفوع</th>
                <th scope="col">المتبقي</th>
                <th scope="col">طلّعها</th>
                <th scope="col">الحالة</th>
                <th scope="col">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {result.isLoading ? (
                Array.from({ length: 5 }, (_, index) => (
                  <tr aria-hidden="true" className="invoice-skeleton-row" key={index}>
                    {Array.from({ length: 11 }, (_, cell) => (
                      <td key={cell}>
                        <span />
                      </td>
                    ))}
                  </tr>
                ))
              ) : visibleInvoices.length > 0 ? (
                visibleInvoices.map((invoice) => {
                  const overdue = isOverdue(invoice, today);
                  const status = invoiceStatus(invoice, today);
                  return (
                    <tr className={overdue ? 'invoice-row-overdue' : undefined} key={invoice.id}>
                      <td className="invoice-checkbox-column">
                        <input
                          aria-label={`تحديد الفاتورة ${invoice.invoice_number}`}
                          checked={selectedIds.has(invoice.id)}
                          onChange={(event) => changeSelection(invoice.id, event.currentTarget.checked)}
                          type="checkbox"
                        />
                      </td>
                      <td>
                        <Link className="invoice-number-link" to={`/invoices/${invoice.id}/print`}>
                          {invoice.invoice_number}
                        </Link>
                      </td>
                      <td>{invoice.customer_name}</td>
                      <td className="invoice-date-cell">{formatDate(invoice.issue_date)}</td>
                      <td className={overdue ? 'invoice-due-overdue' : undefined}>
                        {invoice.due_date ? formatDate(invoice.due_date) : '—'}
                      </td>
                      <td className="invoice-amount-cell">
                        {invoice.total_egp ? formatMoney(invoice.total_egp) : '—'}
                      </td>
                      <td className="invoice-amount-cell">
                        {invoice.paid_egp ? formatMoney(invoice.paid_egp) : '—'}
                      </td>
                      <td className="invoice-amount-cell">
                        {invoice.remaining_egp ? formatMoney(invoice.remaining_egp) : '—'}
                      </td>
                      <td>
                        <span className="invoice-issuer-badge">{invoice.issuer_name || '—'}</span>
                      </td>
                      <td>
                        <span className={`badge invoice-status-badge invoice-status-${status.tone}`}>
                          {status.label}
                        </span>
                      </td>
                      <td>
                        <button
                          aria-label={`معاينة طباعة الفاتورة ${invoice.invoice_number}`}
                          className="icon-button invoice-print-button"
                          onClick={() => navigate(`/invoices/${invoice.id}/print`)}
                          title="معاينة الطباعة"
                          type="button"
                        >
                          🖨
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="invoice-empty-cell" colSpan={11}>
                    <span aria-hidden="true" className="invoice-empty-icon">▤</span>
                    <strong>لا توجد فواتير</strong>
                    <span>
                      اضغط{' '}
                      <button className="invoice-empty-create" onClick={() => navigate('/invoices/new')} type="button">
                        «+ إنشاء فاتورة»
                      </button>
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <footer className="invoice-table-footer">
          <span>{filteredInvoices.length} سجل</span>
          <nav aria-label="صفحات الفواتير" className="invoice-pagination">
            <button
              aria-label="الصفحة السابقة"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
              type="button"
            >
              ‹
            </button>
            {Array.from({ length: pageCount }, (_, index) => index + 1)
              .filter((pageNumber) => pageNumber === 1 || pageNumber === pageCount || Math.abs(pageNumber - page) <= 1)
              .map((pageNumber) => (
                <button
                  aria-current={pageNumber === page ? 'page' : undefined}
                  className={pageNumber === page ? 'invoice-page-current' : undefined}
                  key={pageNumber}
                  onClick={() => setPage(pageNumber)}
                  type="button"
                >
                  {pageNumber}
                </button>
              ))}
            <button
              aria-label="الصفحة التالية"
              disabled={page >= pageCount}
              onClick={() => setPage((current) => current + 1)}
              type="button"
            >
              ›
            </button>
          </nav>
        </footer>
      </div>
    </section>
  );
}
