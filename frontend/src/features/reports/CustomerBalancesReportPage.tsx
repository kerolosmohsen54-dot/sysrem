import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DataTable, type DataColumn } from '../../shared/components/DataTable';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import { formatMoney } from '../../shared/utils/format';
import type { ListQuery } from '../inventory/api';
import { listCustomerBalanceReport, type CustomerBalanceReportRow } from './api';
import { exportCsv, exportExcel, type ExportColumn, printReport } from './export';

export function CustomerBalancesReportPage() {
  const [query, setQuery] = useState<ListQuery>({ page: 1, perPage: 10, search: '' });
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState('');
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
  const exportColumns: ExportColumn<CustomerBalanceReportRow>[] = [
    { label: ar.reports.customer, value: (row) => row.customer_name },
    { label: ar.reports.customerBalance, value: (row) => row.balance_egp },
    { label: ar.reports.unallocatedCollections, value: (row) => row.unallocated_collection_egp },
  ];
  const exportAll = async (format: 'excel' | 'csv') => {
    setIsExporting(true);
    setExportError('');
    try {
      const rows: CustomerBalanceReportRow[] = [];
      let page = 1;
      let lastPage = 1;
      do {
        const response = await listCustomerBalanceReport({ ...query, page, perPage: 100 });
        rows.push(...response.data);
        lastPage = response.meta.last_page;
        page += 1;
      } while (page <= lastPage);
      if (format === 'csv') exportCsv('customer-balances-report', exportColumns, rows);
      else exportExcel('customer-balances-report', exportColumns, rows);
    } catch {
      setExportError(ar.common.requestFailed);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <section className="page inventory-page">
      <header className="page-heading">
        <div>
          <h1>{ar.reports.customerBalances}</h1>
          <p>{ar.reports.reportsDescription}</p>
        </div>
      </header>
      <div className="report-actions" aria-label="تصدير تقرير أرصدة العملاء">
        <button className="button button-secondary" disabled={!result.data?.meta.total || isExporting} onClick={() => void exportAll('excel')} type="button">{isExporting ? 'جارٍ التصدير…' : 'Excel'}</button>
        <button className="button button-secondary" disabled={!result.data?.meta.total || isExporting} onClick={() => void exportAll('csv')} type="button">CSV</button>
        <button className="button button-secondary" onClick={printReport} type="button">طباعة</button>
      </div>
      {exportError && <p role="alert" className="field-error">{exportError}</p>}
      <label className="inventory-search">
        <span>{ar.common.search}</span>
        <input
          aria-label={ar.common.search}
          className="input"
          type="search"
          value={query.search}
          onChange={(event) => { const search = event.currentTarget.value; setQuery((current) => ({ ...current, page: 1, search })); }}
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
