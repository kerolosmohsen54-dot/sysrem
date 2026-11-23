import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { FormField } from '../../shared/components/FormField';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import { formatDate, formatMoney, formatQuantity } from '../../shared/utils/format';
import { getInvoice } from './api';

export function InvoiceEditPage() {
  const { documentId = '' } = useParams();
  const validDocumentId = /^[1-9]\d*$/.test(documentId);
  const invoice = useQuery({
    queryKey: ['/invoices', documentId],
    queryFn: () => getInvoice(documentId),
    enabled: validDocumentId,
  });

  if (!validDocumentId) return <PageState kind="error" title={ar.sales.invoiceNumberInvalid} />;
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

  return (
    <section className="page invoice-form">
      <header className="page-heading">
        <div>
          <h1>
            {ar.sales.reviseInvoiceTitle}: {invoice.data.invoice_number}
          </h1>
          <p>{ar.sales.reviseInvoiceDescription}</p>
        </div>
        <Link className="button button-secondary" to={`/invoices/${documentId}`}>
          {ar.sales.backToInvoices}
        </Link>
      </header>

      <div className="invoice-preview-waiting" role="status">
        <h2>{ar.sales.revisionWaitingTitle}</h2>
        <p>{ar.sales.revisionWaitingMessage}</p>
      </div>

      <form className="stack-form" onSubmit={(event) => event.preventDefault()}>
        <div className="inventory-toolbar">
          <FormField
            id="revision-customer"
            label={ar.sales.invoiceCustomer}
            readOnly
            value={invoice.data.customer_name}
          />
          <FormField
            id="revision-date"
            label={ar.common.date}
            readOnly
            value={formatDate(invoice.data.issue_date)}
          />
          <FormField
            id="revision-due-date"
            label={ar.sales.dueDate}
            readOnly
            value={invoice.data.due_date ? formatDate(invoice.data.due_date) : '—'}
          />
        </div>

        {invoice.data.lines.length ? (
          <table className="invoice-print-table">
            <thead>
              <tr>
                <th scope="col">{ar.common.product}</th>
                <th scope="col">{ar.sales.invoiceQuantity}</th>
                <th scope="col">{ar.sales.invoiceLinePrice}</th>
                <th scope="col">{ar.sales.invoiceLineDiscount}</th>
              </tr>
            </thead>
            <tbody>
              {invoice.data.lines.map((line, index) => (
                <tr key={`${line.sku ?? line.product_name}-${index}`}>
                  <td>{line.sku ? `${line.product_name} — ${line.sku}` : line.product_name}</td>
                  <td>{formatQuantity(line.quantity)}</td>
                  <td>{formatMoney(line.unit_price_egp)}</td>
                  <td>
                    {line.discount_amount_egp === null
                      ? '—'
                      : formatMoney(line.discount_amount_egp)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="table-empty" role="status">
            {ar.sales.invoiceLinesUnavailable}
          </p>
        )}

        <button className="button button-primary" disabled type="submit">
          {ar.sales.submitRevision}
        </button>
      </form>
    </section>
  );
}
