import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import { formatDate, formatMoney } from '../../shared/utils/format';
import type { ListQuery } from '../inventory/api';
import { getInvoice, listReturns, markReturnPrinted, type ReturnDocument } from './api';

const initialQuery: ListQuery = { page: 1, perPage: 10, search: '' };

function ReturnRows({ rows }: { rows: ReturnDocument[] }) {
  return rows.map((row) => (
    <tr key={row.id}>
      <td data-label="رقم المرتجع">
        <Link className="return-number-link" to={`/returns/${row.id}/print`}>
          {row.return_number}
        </Link>
      </td>
      <td data-label="التاريخ">{formatDate(row.issue_date)}</td>
      <td data-label="العميل">{row.customer_name}</td>
      <td data-label="الفاتورة الأصلية"><bdi dir="ltr">{row.original_invoice_number ?? '—'}</bdi></td>
      <td data-label="المنتج">{row.lines.map((line) => line.product_name).filter(Boolean).join('، ') || '—'}</td>
      <td data-label="الكمية"><bdi dir="ltr">{row.lines.reduce((sum, line) => sum + line.quantity, 0)}</bdi></td>
      <td data-label="المخزن">{[...new Set(row.lines.map((line) => line.warehouse_name).filter((name): name is string => Boolean(name)))].join('، ') || '—'}</td>
      <td data-label="الإصلاح">{[...new Set(row.lines.map((line) => line.return_condition === 'damaged' ? 'تالف' : line.return_condition === 'good' ? 'سليم' : '—'))].join('، ') || '—'}</td>
      <td className="invoice-amount-cell" data-label="القيمة">
        {row.amount_egp === null ? '—' : formatMoney(row.amount_egp)}
      </td>
    </tr>
  ));
}

export function ReturnsPage() {
  const [query, setQuery] = useState(initialQuery);
  const navigate = useNavigate();
  const result = useQuery({
    queryKey: ['/returns', query],
    queryFn: () => listReturns(query),
  });

  return (
    <section className="page inventory-page returns-page">
      <header className="page-heading">
        <div>
          <h1>المرتجعات</h1>
          <p>كل مرتجعات الفواتير مع المخزن المرتجع إليه وحالة الإصلاح.</p>
        </div>
        <button className="button button-primary" onClick={() => navigate('/returns/new')} type="button">
          + مرتجع جديد
        </button>
      </header>

      {result.isError ? (
        <PageState kind="error" message={ar.common.requestFailed} onRetry={() => void result.refetch()} />
      ) : result.data?.data.length === 0 ? (
        <section className="returns-table-card">
          <PageState kind="empty" title={ar.common.noResults} />
        </section>
      ) : (
        <section aria-label="جدول المرتجعات" className="returns-table-card">
          <div className="table-wrap returns-table-wrap" tabIndex={0}>
            <table className="returns-table">
              <thead>
                <tr>
                  <th scope="col">رقم المرتجع</th>
                  <th scope="col">التاريخ</th>
                  <th scope="col">العميل</th>
                  <th scope="col">الفاتورة الأصلية</th>
                  <th scope="col">المنتج</th>
                  <th scope="col">الكمية</th>
                  <th scope="col">المخزن</th>
                  <th scope="col">الإصلاح</th>
                  <th scope="col">القيمة</th>
                </tr>
              </thead>
              <tbody>
                {result.isLoading
                  ? Array.from({ length: 5 }, (_, index) => (
                      <tr aria-hidden="true" className="invoice-skeleton-row" key={index}>
                        {Array.from({ length: 9 }, (_, cell) => <td key={cell}><span /></td>)}
                      </tr>
                    ))
                  : result.data && <ReturnRows rows={result.data.data} />}
              </tbody>
            </table>
          </div>
          {result.data && result.data.data.length > 0 && (
            <footer className="invoice-table-footer">
              <span>{result.data.meta.total} سجل</span>
              <nav aria-label={ar.inventory.paginationLabel} className="invoice-pagination">
                <button aria-label="الصفحة السابقة" disabled={query.page <= 1} onClick={() => setQuery((current) => ({ ...current, page: current.page - 1 }))} type="button">‹</button>
                <button aria-current="page" className="invoice-page-current" type="button">{query.page}</button>
                <button aria-label="الصفحة التالية" disabled={query.page >= result.data.meta.last_page} onClick={() => setQuery((current) => ({ ...current, page: current.page + 1 }))} type="button">›</button>
              </nav>
            </footer>
          )}
        </section>
      )}
    </section>
  );
}

export function ReturnPrintPage() {
  const { documentId = '' } = useParams();
  const validId = /^[1-9]\d*$/.test(documentId);
  const query = useQuery({
    queryKey: ['/returns', 'print', documentId],
    queryFn: () => getInvoice(documentId, 'returns'),
    enabled: validId,
  });
  const printMutation = useMutation({ mutationFn: () => markReturnPrinted(documentId) });
  const document = query.data;

  if (!validId) {
    return <PageState kind="error" title={ar.sales.invoiceNumberInvalid} />;
  }
  if (query.isLoading) return <PageState kind="loading" />;
  if (query.isError || !document) {
    return <PageState kind="error" message={ar.common.requestFailed} onRetry={() => void query.refetch()} />;
  }

  return (
    <section className="page invoice-print-page">
      <header className="page-heading invoice-print-actions">
        <div>
          <h1>معاينة طباعة المرتجع</h1>
          <p>مرتجع <bdi dir="ltr">{document.invoice_number}</bdi></p>
        </div>
        <div className="row-actions">
          <Link className="button button-secondary" to="/returns">
            ← رجوع
          </Link>
          <button className="button button-primary" disabled={printMutation.isPending} onClick={() => { void printMutation.mutateAsync().then(() => window.print()).catch(() => undefined); }} type="button">
            {printMutation.isPending ? ar.app.loading : 'طباعة'}
          </button>
        </div>
      </header>
      {printMutation.isError && <p className="field-error" role="alert">تعذر تسجيل الطباعة. أعد المحاولة.</p>}
      <article className="invoice-print-paper return-print-paper" dir="rtl">
        <header className="invoice-print-heading">
          <div className="invoice-paper-brand">
            <h2>ماستر</h2>
            <p>مرتجع مبيعات</p>
          </div>
          <div className="invoice-paper-title">
            <h3>مرتجع مبيعات</h3>
            <dl className="invoice-paper-metadata">
              <div>
                <dt>رقم المرتجع</dt>
                <dd><bdi dir="ltr">{document.invoice_number}</bdi></dd>
              </div>
              <div>
                <dt>التاريخ</dt>
                <dd>{formatDate(document.issue_date)}</dd>
              </div>
              <div>
                <dt>الفاتورة الأصلية</dt>
                <dd><bdi dir="ltr">{document.original_invoice_number ?? '—'}</bdi></dd>
              </div>
            </dl>
          </div>
        </header>
        <section className="invoice-paper-customer">
          <h3>العميل</h3>
          <p>{document.customer_name}</p>
          <p>السبب: {document.return_reason || '—'}</p>
        </section>
        <table className="invoice-table">
          <thead><tr><th>الصنف</th><th>الكود</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead>
          <tbody>{document.lines.map((line) => <tr key={line.id}>
            <td>{line.product_name}</td><td><bdi dir="ltr">{line.sku ?? '—'}</bdi></td>
            <td><bdi dir="ltr">{line.quantity}</bdi></td>
            <td><bdi dir="ltr">{formatMoney(line.unit_price_egp)}</bdi></td>
            <td><bdi dir="ltr">{formatMoney(line.line_total_egp ?? '0.00')}</bdi></td>
          </tr>)}</tbody>
        </table>
        <section className="invoice-print-totals" aria-label="قيمة المرتجع">
          <dl>
            <dt>إجمالي المرتجع</dt>
            <dd className="invoice-paper-grand-total">
              {document.total_egp ? formatMoney(document.total_egp) : '—'}
            </dd>
          </dl>
        </section>
      </article>
    </section>
  );
}
