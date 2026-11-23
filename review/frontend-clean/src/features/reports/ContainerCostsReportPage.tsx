import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataTable, type DataColumn } from '../../shared/components/DataTable';
import { FormField } from '../../shared/components/FormField';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import { formatMoney } from '../../shared/utils/format';
import type { ListQuery } from '../inventory/api';
import { listContainerCostReport, type ContainerCostReportRow } from './api';

export function ContainerCostsReportPage() {
  const [query, setQuery] = useState<ListQuery>({ page: 1, perPage: 10, search: '' });
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const filters = {
    ...(fromDate ? { from_date: fromDate } : {}),
    ...(toDate ? { to_date: toDate } : {}),
  };
  const result = useQuery({
    queryKey: ['/reports/container-costs', query, filters],
    queryFn: () => listContainerCostReport(query, filters),
  });
  const columns: DataColumn<ContainerCostReportRow>[] = [
    { key: 'container', header: ar.reports.container, render: (row) => row.container_number },
    { key: 'status', header: ar.common.status, render: (row) => row.status },
    {
      key: 'costs',
      header: ar.reports.recordedCosts,
      render: (row) =>
        row.recorded_costs_egp === null
          ? ar.common.notProvided
          : formatMoney(row.recorded_costs_egp),
    },
    {
      key: 'paid',
      header: ar.reports.paid,
      render: (row) => (row.paid_egp === null ? ar.common.notProvided : formatMoney(row.paid_egp)),
    },
    {
      key: 'unpaid',
      header: ar.reports.unpaid,
      render: (row) =>
        row.unpaid_egp === null ? ar.common.notProvided : formatMoney(row.unpaid_egp),
    },
    {
      key: 'landed',
      header: ar.inventory.landedCost,
      render: (row) =>
        row.landed_cost_egp === null ? ar.common.notProvided : formatMoney(row.landed_cost_egp),
    },
  ];

  return (
    <section className="page inventory-page">
      <header className="page-heading">
        <div>
          <h1>{ar.reports.containerCosts}</h1>
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
          id="container-cost-report-from"
          label={ar.inventory.fromDate}
          type="date"
          value={fromDate}
          onChange={(event) => {
            setFromDate(event.currentTarget.value);
            setQuery((current) => ({ ...current, page: 1 }));
          }}
        />
        <FormField
          id="container-cost-report-to"
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
