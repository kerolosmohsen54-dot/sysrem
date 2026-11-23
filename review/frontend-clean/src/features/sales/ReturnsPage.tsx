import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import { formatDate, formatMoney } from '../../shared/utils/format';
import type { ListQuery } from '../inventory/api';
import { listReturns, type ReturnDocument } from './api';

const initialQuery: ListQuery = { page: 1, perPage: 10, search: '' };

function processingLabel(value: string | null) {
  if (!value) return 'رصيد للعميل';
  const labels: Record<string, string> = {
    refund: 'استرداد نقدي للعميل',
    cash_refund: 'استرداد نقدي للعميل',
    credit: 'إضافة كرصيد دائن للعميل',
    customer_credit: 'إضافة كرصيد دائن للعميل',
    replacement: 'استبدال بمنتج آخر',
  };
  return labels[value] ?? value;
}

function ReturnRows({ rows }: { rows: ReturnDocument[] }) {
  if (!rows.length) {
    return (
      <tr>
        <td className="returns-empty-cell" colSpan={7}>
          <span aria-hidden="true">↩</span>
          <strong>لا توجد مرتجعات — تُسجَّل من صفحة إنشاء الفاتورة</strong>
          <Link className="button button-primary button-sm" to="/invoices/new?mode=return">
            + إنشاء مرتجع
          </Link>
        </td>
      </tr>
    );
  }

  return rows.map((row) => (
    <tr key={row.id}>
      <td>
        <Link className="return-number-link" to={`/returns/${row.id}/print`}>
          {row.return_number}
        </Link>
      </td>
      <td>{row.original_invoice_number ?? '—'}</td>
      <td>{row.customer_name}</td>
      <td>{row.reason || '—'}</td>
      <td>{processingLabel(row.processing_type)}</td>
      <td className="invoice-amount-cell">
        {row.amount_egp === null ? '—' : formatMoney(row.amount_egp)}
      </td>
      <td>
        <span className="badge badge-success">
          {row.status === 'posted' ? 'مكتمل' : row.status}
        </span>
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
          <h1>مرتجعات المبيعات</h1>
          <p>إدارة إرجاعات العملاء ومعالجتها</p>
        </div>
        <button
          className="button button-primary"
          onClick={() => navigate('/invoices/new?mode=return')}
          type="button"
        >
          + إنشاء مرتجع
        </button>
      </header>

      {result.isError ? (
        <PageState
          kind="error"
          message={ar.common.requestFailed}
          onRetry={() => void result.refetch()}
        />
      ) : (
        <section aria-labelledby="returns-table-title" className="returns-table-card">
          <header className="returns-table-toolbar">
            <h2 id="returns-table-title">المرتجعات</h2>
            {result.data && <span>{result.data.meta.total} سجل</span>}
          </header>
          <div className="table-wrap returns-table-wrap">
            <table className="returns-table">
              <thead>
                <tr>
                  <th scope="col">رقم المرتجع</th>
                  <th scope="col">الفاتورة</th>
                  <th scope="col">العميل</th>
                  <th scope="col">السبب</th>
                  <th scope="col">نوع المعالجة</th>
                  <th scope="col">المبلغ</th>
                  <th scope="col">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {result.isLoading
                  ? Array.from({ length: 5 }, (_, index) => (
                      <tr aria-hidden="true" className="invoice-skeleton-row" key={index}>
                        {Array.from({ length: 7 }, (_, cell) => (
                          <td key={cell}>
                            <span />
                          </td>
                        ))}
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
                <button
                  aria-label="الصفحة السابقة"
                  disabled={query.page <= 1}
                  onClick={() => setQuery((current) => ({ ...current, page: current.page - 1 }))}
                  type="button"
                >
                  ‹
                </button>
                <button aria-current="page" className="invoice-page-current" type="button">
                  {query.page}
                </button>
                <button
                  aria-label="الصفحة التالية"
                  disabled={query.page >= result.data.meta.last_page}
                  onClick={() => setQuery((current) => ({ ...current, page: current.page + 1 }))}
                  type="button"
                >
                  ›
                </button>
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
  const query = useQuery({
    queryKey: ['/returns', 'print', documentId],
    queryFn: () => listReturns({ page: 1, perPage: 100, search: '' }),
    enabled: /^[1-9]\d*$/.test(documentId),
  });
  const document = query.data?.data.find((row) => String(row.id) === documentId);

  if (!/^[1-9]\d*$/.test(documentId)) {
    return <PageState kind="error" title={ar.sales.invoiceNumberInvalid} />;
  }
  if (query.isLoading) return <PageState kind="loading" />;
  if (query.isError || !document) {
    return <PageState kind="error" message={ar.common.requestFailed} />;
  }

  return (
    <section className="page invoice-print-page">
      <header className="page-heading invoice-print-actions">
        <div>
          <h1>معاينة طباعة المرتجع</h1>
          <p>مرتجع #{document.return_number}</p>
        </div>
        <div className="row-actions">
          <Link className="button button-secondary" to="/returns">
            ← رجوع
          </Link>
          <button className="button button-primary" onClick={() => window.print()} type="button">
            طباعة
          </button>
        </div>
      </header>
      <article className="invoice-print-paper return-print-paper" dir="rtl">
        <header className="invoice-print-heading">
          <div className="invoice-paper-brand">
            <h2>MASTER</h2>
            <p>مرتجع مبيعات</p>
          </div>
          <div className="invoice-paper-title">
            <h3>مرتجع مبيعات</h3>
            <dl className="invoice-paper-metadata">
              <div>
                <dt>رقم المرتجع</dt>
                <dd>{document.return_number}</dd>
              </div>
              <div>
                <dt>التاريخ</dt>
                <dd>{formatDate(document.issue_date)}</dd>
              </div>
              <div>
                <dt>الفاتورة الأصلية</dt>
                <dd>{document.original_invoice_number ?? '—'}</dd>
              </div>
            </dl>
          </div>
        </header>
        <section className="invoice-paper-customer">
          <h3>العميل</h3>
          <p>{document.customer_name}</p>
          <p>السبب: {document.reason || '—'}</p>
        </section>
        <section className="invoice-print-totals" aria-label="قيمة المرتجع">
          <dl>
            <dt>إجمالي المرتجع</dt>
            <dd className="invoice-paper-grand-total">
              {document.amount_egp ? formatMoney(document.amount_egp) : '—'}
            </dd>
          </dl>
        </section>
      </article>
    </section>
  );
}
