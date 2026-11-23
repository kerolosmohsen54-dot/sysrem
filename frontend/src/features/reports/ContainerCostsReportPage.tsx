import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataTable, type DataColumn } from '../../shared/components/DataTable';
import { FormField } from '../../shared/components/FormField';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import { displayStatus } from '../../shared/utils/labels';
import { formatMoney } from '../../shared/utils/format';
import type { ListQuery } from '../inventory/api';
import { listContainerCostReport, type ContainerCostReportRow } from './api';
import { exportCsv, exportExcel, type ExportColumn, printReport } from './export';

export function ContainerCostsReportPage() {
  const [query, setQuery] = useState<ListQuery>({ page: 1, perPage: 10, search: '' });
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [status, setStatus] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const filters = {
    ...(fromDate ? { from_date: fromDate } : {}),
    ...(toDate ? { to_date: toDate } : {}),
    ...(status ? { status } : {}),
  };
  const result = useQuery({
    queryKey: ['/reports/container-costs', query, filters],
    queryFn: () => listContainerCostReport(query, filters),
  });
  const columns: DataColumn<ContainerCostReportRow>[] = [
    { key: 'container', header: ar.reports.container, render: (row) => row.container.container_number },
    { key: 'status', header: 'حالة الحاوية', render: (row) => displayStatus(row.container.status) },
    {
      key: 'costs',
      header: ar.reports.recordedCosts,
      render: (row) => formatMoney(row.total_cost_egp),
    },
    {
      key: 'paid',
      header: ar.reports.paid,
      render: (row) => formatMoney(row.paid_egp),
    },
    {
      key: 'unpaid',
      header: ar.reports.unpaid,
      render: (row) => formatMoney(row.unpaid_egp),
    },
    {
      key: 'allocated',
      header: 'الموزع على المخزون',
      render: (row) => formatMoney(row.allocated_to_inventory_egp),
    },
    {
      key: 'cost-items',
      header: 'بنود التكلفة',
      render: (row) => row.costs.length ? <ul className="report-cost-items">{row.costs.map((cost) => <li key={cost.id}>{cost.description || cost.cost_type} · {displayStatus(cost.status)} · {formatMoney(cost.amount_egp)}</li>)}</ul> : ar.common.notProvided,
    },
  ];
  const exportColumns: ExportColumn<ContainerCostReportRow>[] = [
    { label: ar.reports.container, value: (row) => row.container.container_number },
    { label: ar.common.status, value: (row) => displayStatus(row.container.status) },
    { label: ar.reports.recordedCosts, value: (row) => row.total_cost_egp },
    { label: ar.reports.paid, value: (row) => row.paid_egp },
    { label: ar.reports.unpaid, value: (row) => row.unpaid_egp },
    { label: 'الموزع على المخزون', value: (row) => row.allocated_to_inventory_egp },
    { label: 'بنود التكلفة', value: (row) => row.costs.map((cost) => `${cost.description || cost.cost_type}: ${cost.amount_egp} (${displayStatus(cost.status)})`).join(' | ') },
  ];
  const exportAll = async (format: 'excel' | 'csv') => {
    setIsExporting(true);
    setExportError('');
    try {
      const rows: ContainerCostReportRow[] = [];
      let page = 1;
      let lastPage = 1;
      do {
        const response = await listContainerCostReport({ ...query, page, perPage: 100 }, filters);
        rows.push(...response.data);
        lastPage = response.meta.last_page;
        page += 1;
      } while (page <= lastPage);
      if (format === 'csv') exportCsv('container-cost-report', exportColumns, rows);
      else exportExcel('container-cost-report', exportColumns, rows);
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
          <h1>{ar.reports.containerCosts}</h1>
          <p>{ar.reports.reportsDescription}</p>
        </div>
      </header>
      <div className="report-actions" aria-label="تصدير تقرير تكاليف الحاويات">
        <button className="button button-secondary" disabled={!result.data?.meta.total || isExporting} onClick={() => void exportAll('excel')} type="button">{isExporting ? 'جارٍ التصدير…' : 'Excel'}</button>
        <button className="button button-secondary" disabled={!result.data?.meta.total || isExporting} onClick={() => void exportAll('csv')} type="button">CSV</button>
        <button className="button button-secondary" onClick={printReport} type="button">طباعة</button>
      </div>
      {exportError && <p role="alert" className="field-error">{exportError}</p>}
      <div className="inventory-toolbar">
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
        <label className="form-field" htmlFor="container-cost-status"><span>حالة بند التكلفة</span><select className="input" id="container-cost-status" value={status} onChange={(event) => { setStatus(event.currentTarget.value); setQuery((current) => ({ ...current, page: 1 })); }}>
          <option value="">كل الحالات</option><option value="estimated">تقديرية</option><option value="incurred">مستحقة</option><option value="paid">مدفوعة</option><option value="cancelled">ملغاة</option>
        </select></label>
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
            getRowKey={(row) => row.container.id}
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
