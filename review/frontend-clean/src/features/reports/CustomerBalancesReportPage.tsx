import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DataTable, type DataColumn } from '../../shared/components/DataTable';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import { formatMoney } from '../../shared/utils/format';
import type { ListQuery } from '../inventory/api';
import { listCustomerBalanceReport, type CustomerBalanceReportRow } from './api';

export function CustomerBalancesReportPage() {
  const [query, setQuery] = useState<ListQuery>({ page: 1, perPage: 10, search: '' });
  const result = useQuery({
    queryKey: ['/reports/customer-balances', query],
    queryFn: () => listCustomerBalanceReport(query),
  });
  const columns: DataColumn<CustomerBalanceReportRow>[] = [
    {
      key: 'customer',
      header: ar.reports.customer,
      render: (row) => <Link to={`/customers/${row.id}/statement`}>{row.customer_name}</Link>,
    },
    {
      key: 'balance',
      header: ar.reports.customerBalance,
      render: (row) => formatMoney(row.balance_egp),
    },
    {
      key: 'unallocated',
      header: ar.reports.unallocatedCollections,
      render: (row) => formatMoney(row.unallocated_collection_egp),
    },
  ];

  return (
    <section className="page inventory-page">
      <header className="page-heading">
        <div>
          <h1>{ar.reports.customerBalances}</h1>
          <p>{ar.reports.reportsDescription}</p>
        </div>
      </header>
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
