import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { DataTable, type DataColumn } from '../../shared/components/DataTable';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import { formatDate, formatMoney } from '../../shared/utils/format';
import type { ListQuery } from '../inventory/api';
import { getCustomerStatement, type CustomerStatementRow } from './api';

export function CustomerStatementPage() {
  const { customerId: rawCustomerId } = useParams();
  const customerId = Number(rawCustomerId);
  const [query, setQuery] = useState<ListQuery>({ page: 1, perPage: 10, search: '' });
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const validCustomerId = Number.isSafeInteger(customerId) && customerId > 0;
  const result = useQuery({
    queryKey: ['/reports/customers', customerId, query, fromDate, toDate],
    queryFn: () =>
      getCustomerStatement(customerId, query, {
        ...(fromDate ? { fromDate } : {}),
        ...(toDate ? { toDate } : {}),
      }),
    enabled: validCustomerId,
  });
  const columns: DataColumn<CustomerStatementRow>[] = [
    {
      key: 'date',
      header: ar.common.date,
      render: (row) => formatDate(row.document_date),
    },
    {
      key: 'type',
      header: ar.customers.documentType,
      render: (row) =>
        Object.entries(ar.customers.documentTypes).find(
          ([key]) => key === row.document_type,
        )?.[1] ?? row.document_type,
    },
    {
      key: 'reference',
      header: ar.common.reference,
      render: (row) => row.reference,
    },
    {
      key: 'description',
      header: ar.common.description,
      render: (row) => row.description || '—',
    },
    {
      key: 'debit',
      header: ar.customers.debit,
      render: (row) => formatMoney(row.debit_egp),
    },
    {
      key: 'credit',
      header: ar.customers.credit,
      render: (row) => formatMoney(row.credit_egp),
    },
    {
      key: 'unallocated',
      header: ar.customers.unallocated,
      render: (row) => formatMoney(row.unallocated_egp),
    },
  ];

  if (!validCustomerId) {
    return <PageState kind="error" title={ar.common.pageNotFound} />;
  }
  if (result.isLoading) return <PageState kind="loading" />;
  if (result.isError) {
    return (
      <PageState
        kind="error"
        message={ar.common.requestFailed}
        onRetry={() => void result.refetch()}
      />
    );
  }
  if (!result.data) return <PageState kind="loading" />;

  return (
    <section className="page inventory-page">
      <header className="page-heading">
        <div>
          <h1>
            {ar.customers.statement} — {ar.common.customerNumber} {customerId}
          </h1>
          <p>{ar.customers.statementDescription}</p>
        </div>
        <Link className="button button-secondary" to="/customers">
          {ar.customers.backToCustomers}
        </Link>
      </header>
      <div className="inventory-toolbar">
        <label className="inventory-search">
          <span>{ar.inventory.fromDate}</span>
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
          <span>{ar.inventory.toDate}</span>
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
      </div>
      <div className="inventory-summary">
        <article className="summary-card">
          <span>{ar.customers.balance}</span>
          <strong>{formatMoney(result.data.summary.current_balance_egp)}</strong>
        </article>
        <article className="summary-card">
          <span>{ar.customers.unallocated}</span>
          <strong>{formatMoney(result.data.summary.unallocated_collections_egp)}</strong>
        </article>
      </div>
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
    </section>
  );
}
