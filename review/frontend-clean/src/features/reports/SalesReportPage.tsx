import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataTable, type DataColumn } from '../../shared/components/DataTable';
import { FormField } from '../../shared/components/FormField';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import { formatDate, formatMoney } from '../../shared/utils/format';
import type { ListQuery } from '../inventory/api';
import { listSalesReport, type SalesReportRow } from './api';

export function SalesReportPage() {
  const [query, setQuery] = useState<ListQuery>({ page: 1, perPage: 10, search: '' });
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const filters = {
    ...(fromDate ? { from_date: fromDate } : {}),
    ...(toDate ? { to_date: toDate } : {}),
  };
  const result = useQuery({
    queryKey: ['/reports/sales', query, filters],
    queryFn: () => listSalesReport(query, filters),
  });
  const columns: DataColumn<SalesReportRow>[] = [
    { key: 'number', header: ar.reports.documentNumber, render: (row) => row.document_number },
    { key: 'customer', header: ar.reports.customer, render: (row) => row.customer_name },
    { key: 'type', header: ar.reports.documentType, render: (row) => row.document_type },
    { key: 'date', header: ar.reports.date, render: (row) => formatDate(row.document_date) },
    {
      key: 'total',
      header: ar.reports.total,
      render: (row) =>
        row.total_egp === null ? ar.common.notProvided : formatMoney(row.total_egp),
    },
    { key: 'status', header: ar.common.status, render: (row) => row.status },
  ];

  return (
    <section className="page inventory-page">
      <header className="page-heading">
        <div>
          <h1>{ar.reports.sales}</h1>
          <p>{ar.reports.reportsDescription}</p>
        </div>
      </header>
      <div className="inventory-toolbar">
        <label className="inventory-search">
          <span>{ar.common.search}</span>
          <input
            aria-label={ar.common.search}
            className="input"
            type="search"
            value={query.search}
            onChange={(event) =>
              setQuery((current) => ({ ...current, page: 1, search: event.currentTarget.value }))
            }
          />
        </label>
        <FormField
          id="sales-report-from"
          label={ar.inventory.fromDate}
          type="date"
          value={fromDate}
          onChange={(event) => {
            setFromDate(event.currentTarget.value);
            setQuery((current) => ({ ...current, page: 1 }));
          }}
        />
        <FormField
          id="sales-report-to"
          label={ar.inventory.toDate}
          type="date"
          value={toDate}
          onChange={(event) => {
            setToDate(event.currentTarget.value);
            setQuery((current) => ({ ...current, page: 1 }));
          }}
        />
      </div>
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
            rows={result.data.data}
            getRowKey={(row) => row.id}
            emptyMessage={ar.common.noResults}
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
      ) : null}
    </section>
  );
}
