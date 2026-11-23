import { useState } from 'react';
import { useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../shared/auth/AuthProvider';
import { ApiError } from '../../shared/api/errors';
import { DataTable, type DataColumn } from '../../shared/components/DataTable';
import { Modal } from '../../shared/components/Modal';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import { formatDate, formatMoney, formatQuantity } from '../../shared/utils/format';
import type { ListQuery } from '../inventory/api';
import { cancelInvoice, getInvoice, listInvoiceHistory, type InvoiceHistoryRow } from './api';

function safeHistoryValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value) ?? '—';
}

export function InvoiceDetailPage() {
  const { documentId = '' } = useParams();
  const validDocumentId = /^[1-9]\d*$/.test(documentId);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const mayViewHistory =
    user?.permissions.includes('*') === true ||
    user?.permissions.includes('audit_logs.view') === true;
  const mayCancelInvoice =
    user?.permissions.includes('*') === true ||
    user?.permissions.includes('documents.cancel') === true;
  const mayReviseInvoice =
    user?.permissions.includes('*') === true ||
    user?.permissions.includes('documents.edit') === true;
  const [historyQuery, setHistoryQuery] = useState<ListQuery>({
    page: 1,
    perPage: 10,
    search: '',
    sortBy: 'id',
    sortDirection: 'desc',
  });
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [cancelSuccess, setCancelSuccess] = useState('');
  const cancelKey = useRef<{ reason: string; key: string } | null>(null);
  const invoice = useQuery({
    queryKey: ['/invoices', documentId],
    queryFn: () => getInvoice(documentId),
    enabled: validDocumentId,
  });
  const history = useQuery({
    queryKey: ['/invoices', documentId, 'history', historyQuery],
    queryFn: () => listInvoiceHistory(documentId, historyQuery),
    enabled: validDocumentId && mayViewHistory,
  });
  const cancelMutation = useMutation({
    mutationFn: ({ reason }: { reason: string }) => {
      if (!cancelKey.current || cancelKey.current.reason !== reason) {
        cancelKey.current = { reason, key: crypto.randomUUID() };
      }
      return cancelInvoice(documentId, reason, cancelKey.current.key);
    },
    onSuccess: async () => {
      setCancelDialogOpen(false);
      setCancelReason('');
      setCancelError('');
      setCancelSuccess(ar.sales.invoiceCancelled);
      cancelKey.current = null;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/invoices', documentId] }),
        queryClient.invalidateQueries({ queryKey: ['/invoices'] }),
      ]);
    },
  });
  const historyColumns: DataColumn<InvoiceHistoryRow>[] = [
    {
      key: 'field',
      header: ar.sales.invoiceHistoryField,
      render: (row) => row.field_path,
    },
    {
      key: 'old-value',
      header: ar.sales.invoiceHistoryOldValue,
      render: (row) => safeHistoryValue(row.old_value),
    },
    {
      key: 'new-value',
      header: ar.sales.invoiceHistoryNewValue,
      render: (row) => safeHistoryValue(row.new_value),
    },
    {
      key: 'reason',
      header: ar.sales.invoiceHistoryReason,
      render: (row) => row.reason || '—',
    },
    {
      key: 'actor',
      header: ar.sales.invoiceHistoryActor,
      render: (row) => row.actor_name,
    },
    {
      key: 'changed-at',
      header: ar.sales.invoiceHistoryChangedAt,
      render: (row) => formatDate(row.changed_at),
    },
  ];

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

  const amount = (value: string | null) => (value === null ? '—' : formatMoney(value));
  const closeCancelDialog = () => {
    setCancelDialogOpen(false);
    setCancelReason('');
    setCancelError('');
    cancelKey.current = null;
  };

  return (
    <section className="page inventory-page invoice-detail-page">
      <header className="page-heading">
        <div>
          <h1>
            {ar.sales.invoiceDetails}: {invoice.data.invoice_number}
          </h1>
          <p>{invoice.data.customer_name}</p>
        </div>
        <div className="row-actions">
          <Link className="button button-secondary" to="/invoices">
            ← رجوع
          </Link>
          {mayReviseInvoice && invoice.data.status !== 'cancelled' && (
            <Link className="button button-secondary" to={`/invoices/${documentId}/edit`}>
              {ar.sales.reviseInvoice}
            </Link>
          )}
          <Link className="button button-secondary" to={`/invoices/${documentId}/print`}>
            معاينة / طباعة
          </Link>
          {mayCancelInvoice && invoice.data.status !== 'cancelled' && (
            <button
              className="button button-secondary"
              onClick={() => setCancelDialogOpen(true)}
              type="button"
            >
              {ar.sales.cancelInvoice}
            </button>
          )}
        </div>
      </header>
      {cancelSuccess && (
        <p className="inline-success" role="status">
          {cancelSuccess}
        </p>
      )}
      <section aria-labelledby="invoice-detail-info-title" className="invoice-detail-card">
        <h2 id="invoice-detail-info-title">بيانات الفاتورة</h2>
        <dl className="invoice-detail-meta">
          <div>
            <dt>{ar.sales.invoiceNumber}</dt>
            <dd>{invoice.data.invoice_number}</dd>
          </div>
          <div>
            <dt>{ar.common.date}</dt>
            <dd>{formatDate(invoice.data.issue_date)}</dd>
          </div>
          <div>
            <dt>{ar.sales.invoiceCustomer}</dt>
            <dd>{invoice.data.customer_name}</dd>
          </div>
          {invoice.data.customer_governorate && (
            <div>
              <dt>المحافظة</dt>
              <dd>{invoice.data.customer_governorate}</dd>
            </div>
          )}
          <div>
            <dt>{ar.common.status}</dt>
            <dd>
              {invoice.data.status === 'draft'
                ? ar.sales.statusDraft
                : invoice.data.status === 'paid'
                  ? ar.sales.statusPaid
                  : invoice.data.status === 'cancelled'
                    ? ar.sales.statusCancelled
                    : ar.sales.statusIssued}
            </dd>
          </div>
          <div>
            <dt>{ar.sales.issuedBy}</dt>
            <dd>{invoice.data.issuer_name || '—'}</dd>
          </div>
          <div>
            <dt>{ar.sales.dueDate}</dt>
            <dd>{invoice.data.due_date ? formatDate(invoice.data.due_date) : '—'}</dd>
          </div>
          {invoice.data.notes && (
            <div>
              <dt>{ar.sales.notes}</dt>
              <dd>{invoice.data.notes}</dd>
            </div>
          )}
        </dl>
      </section>
      <dl className="invoice-detail-summary">
        <div>
          <dt>{ar.common.total}</dt>
          <dd>{amount(invoice.data.total_egp)}</dd>
        </div>
        <div>
          <dt>{ar.sales.paid}</dt>
          <dd>{amount(invoice.data.paid_egp)}</dd>
        </div>
        <div>
          <dt>{ar.sales.remaining}</dt>
          <dd>{amount(invoice.data.remaining_egp)}</dd>
        </div>
      </dl>
      {invoice.data.lines.length ? (
        <table className="invoice-print-table">
          <thead>
            <tr>
              <th scope="col">{ar.common.product}</th>
              <th scope="col">{ar.sales.invoiceQuantity}</th>
              <th scope="col">{ar.sales.invoiceLinePrice}</th>
              <th scope="col">{ar.sales.invoiceLineDiscount}</th>
              <th scope="col">{ar.sales.invoiceLineTotal}</th>
            </tr>
          </thead>
          <tbody>
            {invoice.data.lines.map((line, index) => (
              <tr key={`${line.sku ?? line.product_name}-${index}`}>
                <td>{line.sku ? `${line.product_name} — ${line.sku}` : line.product_name}</td>
                <td>{formatQuantity(line.quantity)}</td>
                <td>{formatMoney(line.unit_price_egp)}</td>
                <td>{amount(line.discount_amount_egp)}</td>
                <td>{amount(line.line_total_egp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="table-empty" role="status">
          {ar.sales.invoiceLinesUnavailable}
        </p>
      )}
      {mayViewHistory && (
        <section aria-labelledby="invoice-history-title" className="invoice-history">
          <header className="page-heading">
            <div>
              <h2 id="invoice-history-title">{ar.sales.invoiceHistory}</h2>
              <p>{ar.sales.invoiceHistoryDescription}</p>
            </div>
          </header>
          <label className="inventory-search">
            <span>{ar.sales.invoiceHistorySearch}</span>
            <input
              aria-label={ar.sales.invoiceHistorySearch}
              className="input"
              onChange={(event) => {
                const search = event.currentTarget.value;
                setHistoryQuery((current) => ({ ...current, page: 1, search }));
              }}
              type="search"
              value={historyQuery.search}
            />
          </label>
          {history.isLoading ? (
            <PageState kind="loading" />
          ) : history.isError ? (
            <PageState
              kind="error"
              message={ar.common.requestFailed}
              onRetry={() => void history.refetch()}
            />
          ) : history.data ? (
            <>
              <DataTable
                columns={historyColumns}
                emptyMessage={ar.sales.invoiceHistoryUnavailable}
                getRowKey={(row) => row.id}
                rows={history.data.data}
              />
              <nav aria-label={ar.inventory.paginationLabel} className="inventory-pagination">
                <button
                  className="button button-secondary"
                  disabled={historyQuery.page <= 1}
                  onClick={() =>
                    setHistoryQuery((current) => ({ ...current, page: current.page - 1 }))
                  }
                  type="button"
                >
                  {ar.common.previous}
                </button>
                <span>
                  {ar.common.page} {historyQuery.page} {ar.common.of} {history.data.meta.last_page}
                </span>
                <button
                  className="button button-secondary"
                  disabled={historyQuery.page >= history.data.meta.last_page}
                  onClick={() =>
                    setHistoryQuery((current) => ({ ...current, page: current.page + 1 }))
                  }
                  type="button"
                >
                  {ar.common.next}
                </button>
              </nav>
            </>
          ) : (
            <PageState kind="loading" />
          )}
        </section>
      )}
      <Modal
        open={cancelDialogOpen}
        title={ar.sales.cancelInvoiceTitle}
        onClose={closeCancelDialog}
      >
        <p>{ar.sales.cancelInvoiceDescription}</p>
        <form
          className="stack-form"
          onSubmit={(event) => {
            event.preventDefault();
            setCancelError('');
            void cancelMutation
              .mutateAsync({ reason: cancelReason.trim() })
              .catch((error: unknown) => {
                setCancelError(
                  error instanceof ApiError
                    ? error.message
                    : error instanceof Error
                      ? error.message
                      : ar.common.requestFailed,
                );
              });
          }}
        >
          <label className="form-field" htmlFor="invoice-cancel-reason">
            <span>{ar.sales.cancelInvoiceReason}</span>
            <textarea
              className="input"
              id="invoice-cancel-reason"
              maxLength={1000}
              onChange={(event) => setCancelReason(event.currentTarget.value)}
              required
              value={cancelReason}
            />
          </label>
          {cancelError && (
            <p className="field-error" role="alert">
              {cancelError}
            </p>
          )}
          <div className="modal-actions">
            <button className="button button-secondary" onClick={closeCancelDialog} type="button">
              {ar.common.cancel}
            </button>
            <button
              className="button button-primary"
              disabled={cancelMutation.isPending || !cancelReason.trim()}
              type="submit"
            >
              {cancelMutation.isPending ? ar.app.loading : ar.sales.confirmCancelInvoice}
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
