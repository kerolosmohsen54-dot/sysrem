import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../shared/auth/AuthProvider';
import { DataTable, type DataColumn } from '../../shared/components/DataTable';
import { FormField } from '../../shared/components/FormField';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import { formatDate, formatMoney } from '../../shared/utils/format';
import type { ListQuery } from '../inventory/api';
import { listProfitReport, type ProfitReportRow } from './api';
import { exportCsv, exportExcel, type ExportColumn, printReport } from './export';

export function ProfitReportPage() {
  const { user } = useAuth();
  const allowed = Boolean(
    user?.permissions.includes('*') ||
      (user?.permissions.includes('profit.view') && user.permissions.includes('markup.view')),
  );
  const [query, setQuery] = useState<ListQuery>({ page: 1, perPage: 10, search: '' });
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const filters = {
    ...(fromDate ? { from_date: fromDate } : {}),
    ...(toDate ? { to_date: toDate } : {}),
  };
  const result = useQuery({
    queryKey: ['/reports/invoice-profit', query, filters],
    queryFn: () => listProfitReport(query, filters),
    enabled: allowed,
  });
  const columns: DataColumn<ProfitReportRow>[] = [
    { key: 'invoice', header: ar.sales.invoiceNumber, render: (row) => row.document_number },
    { key: 'customer', header: ar.reports.customer, render: (row) => row.customer_name },
    { key: 'date', header: ar.reports.date, render: (row) => formatDate(row.issue_date) },
    {
      key: 'revenue',
      header: ar.reports.revenueExcludingTax,
      render: (row) => formatMoney(row.revenue_excluding_tax_egp),
    },
    {
      key: 'cost',
      header: ar.reports.snapshotCost,
      render: (row) => row.cost_egp === null ? ar.common.notProvided : formatMoney(row.cost_egp),
    },
    {
      key: 'profit',
      header: ar.reports.provisionalProfit,
      render: (row) =>
        row.profit_egp === null
          ? ar.common.notProvided
          : formatMoney(row.profit_egp),
    },
    {
      key: 'markup',
      header: ar.reports.provisionalMarkup,
      render: (row) =>
        row.markup_percent === null
          ? ar.common.notProvided
          : `${row.markup_percent}%`,
    },
  ];
  const exportColumns: ExportColumn<ProfitReportRow>[] = [
    { label: ar.sales.invoiceNumber, value: (row) => row.document_number },
    { label: ar.reports.customer, value: (row) => row.customer_name },
    { label: ar.reports.date, value: (row) => row.issue_date },
    { label: ar.reports.revenueExcludingTax, value: (row) => row.revenue_excluding_tax_egp },
    { label: ar.reports.snapshotCost, value: (row) => row.cost_egp },
    { label: ar.reports.provisionalProfit, value: (row) => row.profit_egp },
    { label: ar.reports.provisionalMarkup, value: (row) => row.markup_percent },
    { label: 'حالة التكلفة', value: (row) => row.cost_snapshot_complete ? 'مكتملة' : 'ناقصة' },
  ];
  const exportAll = async (format: 'excel' | 'csv') => {
    setIsExporting(true);
    setExportError('');
    try {
      const rows: ProfitReportRow[] = [];
      let page = 1;
      let lastPage = 1;
      do {
        const response = await listProfitReport({ ...query, page, perPage: 100 }, filters);
        rows.push(...response.data);
        lastPage = response.meta.last_page;
        page += 1;
      } while (page <= lastPage);
      if (format === 'csv') exportCsv('invoice-profit-report', exportColumns, rows);
      else exportExcel('invoice-profit-report', exportColumns, rows);
    } catch {
      setExportError(ar.common.requestFailed);
    } finally {
      setIsExporting(false);
    }
  };

  if (!allowed) return <PageState kind="denied" />;
  return (
    <section className="page inventory-page">
      <header className="page-heading">
        <div>
          <h1>{ar.reports.invoiceProfit}</h1>
          <p>{ar.reports.provisionalWarning}</p>
        </div>
      </header>
      <div className="report-actions" aria-label="تصدير تقرير ربحية الفواتير">
        <button className="button button-secondary" disabled={!result.data?.meta.total || isExporting} onClick={() => void exportAll('excel')} type="button">{isExporting ? 'جارٍ التصدير…' : 'Excel'}</button>
        <button className="button button-secondary" disabled={!result.data?.meta.total || isExporting} onClick={() => void exportAll('csv')} type="button">CSV</button>
        <button className="button button-secondary" onClick={printReport} type="button">طباعة</button>
      </div>
      {exportError && <p role="alert" className="field-error">{exportError}</p>}
      <div className="inventory-toolbar">
        <label className="inventory-search">
          <span>{ar.common.search}</span>
          <input aria-label={ar.common.search} className="input" type="search" value={query.search} onChange={(event) => { const search = event.currentTarget.value; setQuery((current) => ({ ...current, page: 1, search })); }} />
        </label>
        <FormField
          id="profit-report-from"
          label={ar.inventory.fromDate}
          type="date"
          value={fromDate}
          onChange={(event) => {
            setFromDate(event.currentTarget.value);
            setQuery((current) => ({ ...current, page: 1 }));
          }}
        />
        <FormField
          id="profit-report-to"
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
          <DataTable columns={columns} rows={result.data.data} getRowKey={(row) => row.id} emptyMessage={ar.common.noResults} />
          <nav aria-label={ar.inventory.paginationLabel} className="inventory-pagination">
            <button className="button button-secondary" disabled={query.page <= 1} onClick={() => setQuery((current) => ({ ...current, page: current.page - 1 }))} type="button">{ar.common.previous}</button>
            <span>{ar.common.page} {query.page} {ar.common.of} {result.data.meta.last_page}</span>
            <button className="button button-secondary" disabled={query.page >= result.data.meta.last_page} onClick={() => setQuery((current) => ({ ...current, page: current.page + 1 }))} type="button">{ar.common.next}</button>
          </nav>
        </>
      ) : null}
    </section>
  );
}
