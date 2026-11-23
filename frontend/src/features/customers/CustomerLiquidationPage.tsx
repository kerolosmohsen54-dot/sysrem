import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ApiError, formatApiErrorDetails } from '../../shared/api/errors';
import { DataTable, type DataColumn } from '../../shared/components/DataTable';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import { displayStatus } from '../../shared/utils/labels';
import { formatDate, formatMoney } from '../../shared/utils/format';
import { getCustomerLiquidation, type CustomerLiquidation } from './api';

type DocumentRow = CustomerLiquidation['invoices'][number];
type PaymentRow = CustomerLiquidation['payments'][number];

function FieldErrors({ error }: { error: unknown }) {
  if (!(error instanceof ApiError) || !error.details) return null;
  const details = formatApiErrorDetails(error.details);
  return details ? <p className="field-error" role="alert">{details}</p> : null;
}

export function CustomerLiquidationPage() {
  const { customerId = '' } = useParams();
  const validId = /^[1-9]\d*$/.test(customerId);
  const result = useQuery({
    queryKey: ['/customers', customerId, 'liquidation'],
    queryFn: () => getCustomerLiquidation(customerId),
    enabled: validId,
    retry: false,
  });

  if (!validId) return <PageState kind="error" title={ar.common.invalidIdentifier} />;
  if (result.isLoading) return <PageState kind="loading" />;
  if (result.isError || !result.data) {
    const denied = result.error instanceof ApiError && result.error.status === 403;
    const stepUp = result.error instanceof ApiError && result.error.status === 428;
    return (
      <>
        <PageState kind={denied ? 'denied' : 'error'} message={denied ? ar.common.permissionDenied : stepUp ? ar.customers.stepUpRequired : ar.common.requestFailed} onRetry={() => void result.refetch()} />
        <FieldErrors error={result.error} />
      </>
    );
  }

  const liquidation = result.data.data;
  const invoiceColumns: DataColumn<DocumentRow>[] = [
    { key: 'number', header: ar.sales.invoiceNumber, render: (row) => row.document_number ?? `#${row.id}` },
    { key: 'date', header: ar.common.date, render: (row) => row.issue_date ? formatDate(row.issue_date) : ar.common.notProvided },
    { key: 'status', header: ar.common.status, render: (row) => displayStatus(row.status) },
    { key: 'amount', header: ar.finance.amount, render: (row) => formatMoney(row.total_amount) },
  ];
  const paymentColumns: DataColumn<PaymentRow>[] = [
    { key: 'number', header: ar.sales.collectionNumber, render: (row) => row.receipt_number ?? `#${row.id}` },
    { key: 'date', header: ar.common.date, render: (row) => row.receipt_date ? formatDate(row.receipt_date) : ar.common.notProvided },
    { key: 'status', header: ar.common.status, render: (row) => displayStatus(row.status) },
    { key: 'amount', header: ar.finance.amount, render: (row) => formatMoney(row.amount) },
  ];
  const customer = liquidation.customer;

  return (
    <section className="page inventory-page" data-testid="customer-liquidation">
      <header className="page-heading">
        <div>
          <h1>{ar.customers.liquidationTitle}</h1>
          <p>{customer.name} · {ar.customers.liquidationReadOnly}</p>
        </div>
        <div className="row-actions">
          <Link className="button button-secondary" to={`/customers/${customer.id}`}>{ar.customers.customerDetails}</Link>
          <Link className="button button-secondary" to="/customers">{ar.customers.backToCustomers}</Link>
        </div>
      </header>
      <dl className="invoice-detail-summary">
        <div><dt>{ar.common.phone}</dt><dd>{customer.phone || ar.common.notProvided}</dd></div>
        <div><dt>{ar.common.address}</dt><dd>{customer.address || ar.common.notProvided}</dd></div>
        <div><dt>{ar.customers.governorate}</dt><dd>{customer.governorate || ar.common.notProvided}</dd></div>
      </dl>
      <div className="summary-grid">
        <article className="summary-card"><span>{ar.customers.invoiceTotal}</span><strong>{formatMoney(liquidation.invoice_total_egp)}</strong></article>
        <article className="summary-card"><span>{ar.customers.collectionTotal}</span><strong>{formatMoney(liquidation.collection_total_egp)}</strong></article>
        <article className="summary-card"><span>{ar.customers.returnTotal}</span><strong>{formatMoney(liquidation.return_total_egp)}</strong></article>
        <article className="summary-card"><span>{ar.customers.balance}</span><strong>{formatMoney(liquidation.balance_egp)}</strong></article>
      </div>
      <section aria-labelledby="liquidation-invoices-title">
        <h2 id="liquidation-invoices-title">{ar.nav.invoices}</h2>
        <DataTable columns={invoiceColumns} rows={liquidation.invoices} getRowKey={(row) => row.id} emptyMessage={ar.common.noResults} />
      </section>
      <section aria-labelledby="liquidation-payments-title">
        <h2 id="liquidation-payments-title">{ar.nav.collections}</h2>
        <DataTable columns={paymentColumns} rows={liquidation.payments} getRowKey={(row) => row.id} emptyMessage={ar.common.noResults} />
      </section>
      <section aria-labelledby="liquidation-returns-title">
        <h2 id="liquidation-returns-title">{ar.nav.returns}</h2>
        <DataTable columns={invoiceColumns} rows={liquidation.returns} getRowKey={(row) => row.id} emptyMessage={ar.common.noResults} />
      </section>
    </section>
  );
}
