import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DataTable, type DataColumn } from '../../shared/components/DataTable';
import { useAuth } from '../../shared/auth/AuthProvider';
import { FormField } from '../../shared/components/FormField';
import { Modal } from '../../shared/components/Modal';
import { PageState } from '../../shared/components/PageState';
import { ApiError } from '../../shared/api/errors';
import { ar } from '../../shared/i18n/ar';
import { formatDate, formatMoney } from '../../shared/utils/format';
import { listCustomers } from '../customers/api';
import type { ListQuery } from '../inventory/api';
import {
  createCollection,
  listCollections,
  listInvoices,
  listTreasuryAccountOptions,
  type CollectionInput,
  type CollectionReceipt,
  type Invoice,
} from './api';

const optionsQuery: ListQuery = { page: 1, perPage: 100, search: '' };
const amountPattern = /^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$/;

export function CollectionsPage() {
  const client = useQueryClient();
  const { user } = useAuth();
  const mayCreate =
    user?.permissions.includes('*') === true ||
    user?.permissions.includes('collections.create') === true;
  const [query, setQuery] = useState<ListQuery>({ page: 1, perPage: 10, search: '' });
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [treasuryId, setTreasuryId] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [amount, setAmount] = useState('');
  const [allocationAmount, setAllocationAmount] = useState('');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().slice(0, 10));
  const [invoiceQuery, setInvoiceQuery] = useState<ListQuery>({
    page: 1,
    perPage: 10,
    search: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const idempotencyKey = useRef<string | null>(null);
  const result = useQuery({
    queryKey: ['/collections', query, fromDate, toDate],
    queryFn: () =>
      listCollections(query, {
        ...(fromDate ? { from_date: fromDate } : {}),
        ...(toDate ? { to_date: toDate } : {}),
      }),
  });
  const invoiceLedger = useQuery({
    queryKey: ['/invoices', 'collections-ledger', invoiceQuery],
    queryFn: () => listInvoices(invoiceQuery),
  });
  const customers = useQuery({
    queryKey: ['/customers', 'collection-options'],
    queryFn: () => listCustomers(optionsQuery),
    enabled: dialogOpen,
  });
  const treasury = useQuery({
    queryKey: ['/treasury/accounts', 'collection-options'],
    queryFn: () => listTreasuryAccountOptions(optionsQuery),
    enabled: dialogOpen,
  });
  const invoices = useQuery({
    queryKey: ['/invoices', 'collection-options', customerId],
    queryFn: () => listInvoices(optionsQuery, customerId ? { customer_id: customerId } : {}),
    enabled: dialogOpen && Boolean(customerId),
  });
  const mutation = useMutation({
    mutationFn: (input: CollectionInput) => {
      idempotencyKey.current ??= crypto.randomUUID();
      return createCollection(input, idempotencyKey.current);
    },
    onSuccess: async (collection) => {
      idempotencyKey.current = null;
      setSuccess(
        `${ar.sales.collectionSaved} ${ar.sales.unallocatedAmount}: ${formatMoney(collection.unallocated_egp)}`,
      );
      setDialogOpen(false);
      setCustomerId('');
      setTreasuryId('');
      setInvoiceId('');
      setAmount('');
      setAllocationAmount('');
      await client.invalidateQueries({ queryKey: ['/collections'] });
      await client.invalidateQueries({ queryKey: ['/customers'] });
    },
  });
  const columns: DataColumn<CollectionReceipt>[] = [
    { key: 'number', header: ar.sales.collectionNumber, render: (row) => row.receipt_number },
    { key: 'customer', header: ar.common.customer, render: (row) => row.customer_name },
    { key: 'date', header: ar.common.date, render: (row) => formatDate(row.receipt_date) },
    { key: 'amount', header: ar.sales.receiptAmount, render: (row) => formatMoney(row.amount_egp) },
    {
      key: 'allocated',
      header: ar.sales.allocatedAmount,
      render: (row) => formatMoney(row.allocated_egp),
    },
    {
      key: 'unallocated',
      header: ar.sales.unallocatedAmount,
      render: (row) => formatMoney(row.unallocated_egp),
    },
  ];
  const invoiceColumns: DataColumn<Invoice>[] = [
    {
      key: 'number',
      header: ar.sales.invoiceNumber,
      render: (row) => row.invoice_number,
    },
    { key: 'customer', header: ar.common.customer, render: (row) => row.customer_name },
    {
      key: 'due-date',
      header: ar.sales.dueDate,
      render: (row) => (row.due_date ? formatDate(row.due_date) : '—'),
    },
    {
      key: 'total',
      header: ar.common.total,
      render: (row) => (row.total_egp ? formatMoney(row.total_egp) : '—'),
    },
    {
      key: 'paid',
      header: ar.sales.paid,
      render: (row) => (row.paid_egp ? formatMoney(row.paid_egp) : '—'),
    },
    {
      key: 'remaining',
      header: ar.sales.remaining,
      render: (row) => (row.remaining_egp ? formatMoney(row.remaining_egp) : '—'),
    },
    {
      key: 'status',
      header: ar.common.status,
      render: (row) => ({
        draft: ar.sales.statusDraft,
        issued: ar.sales.statusIssued,
        paid: ar.sales.statusPaid,
        cancelled: ar.sales.statusCancelled,
      })[row.status],
    },
  ];
  const invoicePage = invoiceLedger.data?.meta;
  const closeDialog = () => {
    setDialogOpen(false);
    setError('');
    idempotencyKey.current = null;
  };
  const invoiceLedgerContent = (
    <section aria-labelledby="collection-invoices-heading" className="dashboard-panel">
      <h2 id="collection-invoices-heading">{ar.nav.invoices}</h2>
      {invoiceLedger.isLoading ? (
        <PageState kind="loading" />
      ) : invoiceLedger.isError ? (
        <PageState
          kind="error"
          message={ar.common.requestFailed}
          onRetry={() => void invoiceLedger.refetch()}
        />
      ) : invoiceLedger.data ? (
        <>
          <DataTable
            columns={invoiceColumns}
            emptyMessage={ar.common.noResults}
            getRowKey={(row) => row.id}
            rows={invoiceLedger.data.data}
          />
          <nav
            aria-label={`${ar.nav.invoices} ${ar.inventory.paginationLabel}`}
            className="inventory-pagination"
          >
            <button
              className="button button-secondary"
              disabled={invoiceQuery.page <= 1}
              onClick={() =>
                setInvoiceQuery((current) => ({ ...current, page: current.page - 1 }))
              }
              type="button"
            >
              {ar.common.previous}
            </button>
            <span>
              {ar.common.page} {invoiceQuery.page} {ar.common.of} {invoicePage?.last_page ?? 1}
            </span>
            <button
              className="button button-secondary"
              disabled={invoiceQuery.page >= (invoicePage?.last_page ?? 1)}
              onClick={() =>
                setInvoiceQuery((current) => ({ ...current, page: current.page + 1 }))
              }
              type="button"
            >
              {ar.common.next}
            </button>
          </nav>
        </>
      ) : null}
    </section>
  );

  return (
    <section className="page inventory-page">
      <header className="page-heading">
        <div>
          <h1>{ar.nav.collections}</h1>
          <p>{ar.sales.collectionsDescription}</p>
        </div>
        {mayCreate && (
          <button
            className="button button-primary"
            onClick={() => {
              setSuccess('');
              setDialogOpen(true);
            }}
            type="button"
          >
            {ar.sales.recordCollection}
          </button>
        )}
      </header>
      {success && (
        <p className="inline-success" role="status">
          {success}
        </p>
      )}
      <div className="inventory-toolbar">
        <label className="inventory-search">
          <span>{ar.common.search}</span>
          <input
            aria-label={ar.common.search}
            className="input"
            onChange={(event) => {
              const search = event.currentTarget.value;
              setQuery((current) => ({ ...current, search, page: 1 }));
            }}
            type="search"
            value={query.search}
          />
        </label>
        <label className="inventory-search">
          <span>{ar.sales.fromDate}</span>
          <input
            className="input"
            onChange={(event) => {
              setFromDate(event.currentTarget.value);
              setQuery((current) => ({ ...current, page: 1 }));
            }}
            type="date"
            value={fromDate}
          />
        </label>
        <label className="inventory-search">
          <span>{ar.sales.toDate}</span>
          <input
            className="input"
            onChange={(event) => {
              setToDate(event.currentTarget.value);
              setQuery((current) => ({ ...current, page: 1 }));
            }}
            type="date"
            value={toDate}
          />
        </label>
      </div>
      {invoiceLedgerContent}
      {result.isLoading ? (
        <PageState kind="loading" />
      ) : result.isError ? (
        <PageState
          kind="error"
          message={ar.common.requestFailed}
          onRetry={() => void result.refetch()}
        />
      ) : result.data ? (
        <>
          <DataTable
            columns={columns}
            emptyMessage={ar.common.noResults}
            getRowKey={(row) => row.id}
            rows={result.data.data}
          />
          <nav aria-label={ar.inventory.paginationLabel} className="inventory-pagination">
            <button
              className="button button-secondary"
              disabled={query.page <= 1}
              onClick={() => setQuery((current) => ({ ...current, page: current.page - 1 }))}
              type="button"
            >
              {ar.common.previous}
            </button>
            <span>
              {ar.common.page} {query.page} {ar.common.of} {result.data.meta.last_page}
            </span>
            <button
              className="button button-secondary"
              disabled={query.page >= result.data.meta.last_page}
              onClick={() => setQuery((current) => ({ ...current, page: current.page + 1 }))}
              type="button"
            >
              {ar.common.next}
            </button>
          </nav>
        </>
      ) : (
        <PageState kind="loading" />
      )}
      <Modal
        open={dialogOpen && mayCreate}
        title={ar.sales.collectionDialogTitle}
        onClose={closeDialog}
      >
        {customers.isLoading || treasury.isLoading ? (
          <PageState kind="loading" />
        ) : customers.isError || treasury.isError ? (
          <PageState kind="error" message={ar.common.requestFailed} />
        ) : (
          <form
            className="stack-form"
            onSubmit={(event) => {
              event.preventDefault();
              setError('');
              if (
                !amountPattern.test(amount) ||
                (allocationAmount && !amountPattern.test(allocationAmount))
              ) {
                setError(ar.common.invalidAmount);
                return;
              }
              const input: CollectionInput = {
                customer_id: Number(customerId),
                treasury_account_id: Number(treasuryId),
                receipt_date: receiptDate,
                amount_egp: amount,
                ...(invoiceId && allocationAmount
                  ? {
                      allocations: [
                        { document_id: Number(invoiceId), amount_egp: allocationAmount },
                      ],
                    }
                  : {}),
              };
              void mutation.mutateAsync(input).catch((cause: unknown) => {
                setError(cause instanceof ApiError ? cause.message : ar.sales.collectionSaveFailed);
              });
            }}
          >
            <label className="form-field">
              <span>{ar.common.customer}</span>
              <select
                className="input"
                onChange={(event) => {
                  setCustomerId(event.currentTarget.value);
                  setInvoiceId('');
                }}
                required
                value={customerId}
              >
                <option disabled value="">
                  {ar.sales.selectCustomer}
                </option>
                {customers.data?.data.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>{ar.sales.treasuryAccount}</span>
              <select
                className="input"
                onChange={(event) => setTreasuryId(event.currentTarget.value)}
                required
                value={treasuryId}
              >
                <option disabled value="">
                  {ar.common.selectOption}
                </option>
                {treasury.data?.data
                  .filter((account) => account.is_active)
                  .map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
              </select>
            </label>
            <FormField
              id="collection-date"
              label={ar.common.date}
              onChange={(event) => setReceiptDate(event.currentTarget.value)}
              required
              type="date"
              value={receiptDate}
            />
            <FormField
              id="collection-amount"
              inputMode="decimal"
              label={ar.sales.receiptAmount}
              onChange={(event) => setAmount(event.currentTarget.value)}
              pattern="^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$"
              required
              value={amount}
            />
            <label className="form-field">
              <span>{ar.sales.collectionInvoice}</span>
              <select
                className="input"
                disabled={!customerId || invoices.isLoading}
                onChange={(event) => setInvoiceId(event.currentTarget.value)}
                value={invoiceId}
              >
                <option value="">{ar.sales.noInvoiceAllocation}</option>
                {invoices.data?.data
                  .filter((invoice) => invoice.status !== 'cancelled')
                  .map((invoice) => (
                    <option key={invoice.id} value={invoice.id}>
                      {invoice.invoice_number} — {invoice.customer_name}
                    </option>
                  ))}
              </select>
            </label>
            {invoiceId && (
              <FormField
                id="collection-allocation-amount"
                inputMode="decimal"
                label={ar.sales.allocatedAmount}
                onChange={(event) => setAllocationAmount(event.currentTarget.value)}
                pattern="^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$"
                required
                value={allocationAmount}
              />
            )}
            {invoices.isError && (
              <p role="alert" className="field-error">
                {ar.common.requestFailed}
              </p>
            )}
            {error && (
              <p role="alert" className="field-error">
                {error}
              </p>
            )}
            <p className="field-hint">
              {ar.sales.unallocatedAmount}: {ar.common.serverCalculatesAfterPosting}
            </p>
            <div className="modal-actions">
              <button className="button button-secondary" onClick={closeDialog} type="button">
                {ar.common.cancel}
              </button>
              <button
                className="button button-primary"
                disabled={mutation.isPending || !customerId || !treasuryId}
                type="submit"
              >
                {mutation.isPending ? ar.app.loading : ar.sales.recordCollection}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </section>
  );
}
