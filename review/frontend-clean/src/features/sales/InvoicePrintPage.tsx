import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import { formatDate, formatMoney, formatQuantity } from '../../shared/utils/format';
import { shareText } from '../../shared/utils/share';
import { getInvoice } from './api';

export function InvoicePrintPage() {
  const { documentId = '' } = useParams();
  const [shareNotice, setShareNotice] = useState('');
  const validDocumentId = /^[1-9]\d*$/.test(documentId);
  const invoice = useQuery({
    queryKey: ['/invoices', documentId],
    queryFn: () => getInvoice(documentId),
    enabled: validDocumentId,
  });

  if (!validDocumentId) {
    return <PageState kind="error" title={ar.sales.invoiceNumberInvalid} />;
  }
  if (invoice.isLoading) return <PageState kind="loading" />;
  if (invoice.isError || !invoice.data) {
    return (
      <PageState
        kind="error"
        message={ar.common.requestFailed}
        onRetry={() => void invoice.refetch()}
      />
    );
  }

  const rowAmount = (value: string | null) => (value === null ? '—' : formatMoney(value));
  const shareInvoice = () => {
    const message = `${invoice.data.invoice_number} — ${invoice.data.customer_name} — ${rowAmount(invoice.data.total_egp)}`;
    void shareText(message).then(
      (outcome) => {
        if (outcome === 'shared') setShareNotice('اختار واتساب من قائمة المشاركة لإرسال الفاتورة.');
        else if (outcome === 'copied') setShareNotice('تم نسخ تفاصيل الفاتورة — الصقها في واتساب.');
        else if (outcome === 'unsupported') setShareNotice('المشاركة غير مدعومة في هذا المتصفح.');
      },
      () => setShareNotice('تعذرت مشاركة الفاتورة. حاول مرة أخرى.'),
    );
  };

  return (
    <section className="page invoice-print-page">
      <header className="page-heading invoice-print-actions">
        <div>
          <h1>معاينة الطباعة</h1>
          <p>فاتورة #{invoice.data.invoice_number}</p>
        </div>
        <div className="row-actions">
          <Link className="button button-secondary" to="/invoices">
            ← رجوع
          </Link>
          <button className="button button-secondary" onClick={shareInvoice} type="button">
            📱 واتساب
          </button>
          <button className="button button-secondary" onClick={() => window.print()} type="button">
            تحميل PDF
          </button>
          <button className="button button-primary" onClick={() => window.print()} type="button">
            {ar.sales.printInvoice}
          </button>
        </div>
      </header>
      {shareNotice && (
        <p className="invoice-list-notice" role="status">
          {shareNotice}
        </p>
      )}
      <article className="invoice-print-paper" dir="rtl">
        <header className="invoice-print-heading">
          <div className="invoice-paper-brand">
            <h2>MASTER</h2>
            <p>{invoice.data.issuer_name || ar.app.subtitle}</p>
            <span>فاتورة بيع</span>
          </div>
          <div className="invoice-paper-title">
            <h3>فـاتـورة مبيعات</h3>
            <dl className="invoice-paper-metadata">
              <div>
                <dt>{ar.sales.invoiceNumber}</dt>
                <dd>{invoice.data.invoice_number}</dd>
              </div>
              <div>
                <dt>{ar.common.date}</dt>
                <dd>{formatDate(invoice.data.issue_date)}</dd>
              </div>
              <div>
                <dt>طلّعها</dt>
                <dd>{invoice.data.issuer_name || '—'}</dd>
              </div>
              {invoice.data.due_date && (
                <div>
                  <dt>{ar.sales.dueDate}</dt>
                  <dd>{formatDate(invoice.data.due_date)}</dd>
                </div>
              )}
            </dl>
          </div>
        </header>
        <section aria-label={ar.sales.invoiceCustomer} className="invoice-print-parties">
          <div className="invoice-paper-customer">
            <h3>{ar.sales.invoiceCustomer}</h3>
            <p>{invoice.data.customer_name}</p>
            {invoice.data.customer_phone && (
              <p>
                {ar.sales.invoiceCustomerPhone}: {invoice.data.customer_phone}
              </p>
            )}
            {invoice.data.customer_governorate && <p>{invoice.data.customer_governorate}</p>}
          </div>
        </section>
        <table className="invoice-print-table">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">{ar.common.product}</th>
              <th scope="col">الفئة</th>
              <th scope="col">{ar.sales.invoiceQuantity}</th>
              <th scope="col">{ar.sales.invoiceLinePrice}</th>
              <th scope="col">{ar.sales.invoiceLineDiscount}</th>
              <th scope="col">{ar.sales.invoiceLineTotal}</th>
            </tr>
          </thead>
          {invoice.data.lines.length > 0 && (
            <tbody>
              {invoice.data.lines.map((line, index) => (
                <tr key={`${line.sku ?? line.product_name}-${index}`}>
                  <td>{index + 1}</td>
                  <td>
                    {line.product_name}
                  </td>
                  <td>{line.sku || '—'}</td>
                  <td>{formatQuantity(line.quantity)}</td>
                  <td>{formatMoney(line.unit_price_egp)}</td>
                  <td>{rowAmount(line.discount_amount_egp)}</td>
                  <td>{rowAmount(line.line_total_egp)}</td>
                </tr>
              ))}
            </tbody>
          )}
        </table>
        {invoice.data.lines.length === 0 && (
          <p className="visually-hidden" role="status">
            {ar.sales.invoiceLinesUnavailable}
          </p>
        )}
        <section aria-label={ar.sales.invoiceTotal} className="invoice-print-totals">
          <dl>
            <dt>{ar.sales.invoiceTotal}</dt>
            <dd className="invoice-paper-grand-total">{rowAmount(invoice.data.total_egp)}</dd>
            <dt>{ar.sales.paid}</dt>
            <dd>{rowAmount(invoice.data.paid_egp)}</dd>
            <dt>{ar.sales.remaining}</dt>
            <dd>{rowAmount(invoice.data.remaining_egp)}</dd>
          </dl>
        </section>
        {invoice.data.notes && (
          <section className="invoice-paper-notes">
            <strong>ملاحظات:</strong>
            <p>{invoice.data.notes}</p>
          </section>
        )}
        <footer className="invoice-print-signatures">
          <p>توقيع البائع</p>
          <p>{ar.sales.invoiceCustomerSignature}</p>
        </footer>
      </article>
    </section>
  );
}
