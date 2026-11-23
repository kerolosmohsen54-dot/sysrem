import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { DataTable, type DataColumn } from '../../shared/components/DataTable';
import { FormField } from '../../shared/components/FormField';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import { formatDate, formatMoney } from '../../shared/utils/format';
import type { ListQuery } from '../inventory/api';
import { listSalesReport, type SalesReportRow } from './api';
import { exportCsv, exportExcel, type ExportColumn, printReport } from './export';

export function SalesReportPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState<ListQuery>({ page: 1, perPage: 50, search: '' });
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [salespersonId, setSalespersonId] = useState('');
  const requestedGroup = searchParams.get('group_by');
  const groupBy: 'month' | 'week' | 'employee' | 'customer' | 'discounts' =
    requestedGroup === 'week' || requestedGroup === 'employee' || requestedGroup === 'customer' || requestedGroup === 'discounts'
      ? requestedGroup
      : 'month';
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const filters = {
    ...(fromDate ? { from_date: fromDate } : {}),
    ...(toDate ? { to_date: toDate } : {}),
    ...(salespersonId ? { salesperson_id: salespersonId } : {}),
    group_by: groupBy,
  };
  const result = useQuery({
    queryKey: ['/reports/sales', query, filters],
    queryFn: () => listSalesReport(query, filters),
  });
  const columns: DataColumn<SalesReportRow>[] = [
    { key: 'number', header: ar.reports.documentNumber, render: (row) => row.document_number },
    { key: 'customer', header: ar.reports.customer, render: (row) => row.customer_name },
    { key: 'date', header: ar.reports.date, render: (row) => formatDate(row.document_date) },
    { key: 'employee', header: 'الموظف', render: (row) => row.salesperson_name || 'غير محدد' },
    {
      key: 'total',
      header: ar.reports.total,
      render: (row) =>
        row.total_egp === null ? ar.common.notProvided : formatMoney(row.total_egp),
    },
  ];
  const exportColumns: ExportColumn<SalesReportRow>[] = [
    { label: ar.reports.documentNumber, value: (row) => row.document_number },
    { label: ar.reports.customer, value: (row) => row.customer_name },
    { label: ar.reports.date, value: (row) => row.document_date },
    { label: 'الموظف', value: (row) => row.salesperson_name },
    { label: ar.reports.total, value: (row) => row.total_egp },
  ];
  const exportAll = async (format: 'excel' | 'csv') => {
    setIsExporting(true);
    setExportError('');
    try {
      const rows: SalesReportRow[] = [];
      let page = 1;
      let lastPage = 1;
      do {
        const response = await listSalesReport({ ...query, page, perPage: 100 }, filters);
        rows.push(...response.data);
        lastPage = response.meta.last_page;
        page += 1;
      } while (page <= lastPage);
      if (format === 'csv') exportCsv('sales-report', exportColumns, rows);
      else exportExcel('sales-report', exportColumns, rows);
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
          <h1>{ar.reports.sales}</h1>
          <p>{ar.reports.reportsDescription}</p>
        </div>
      </header>
      <div className="report-actions" aria-label="تصدير تقرير المبيعات">
        <button className="button button-secondary" disabled={!result.data?.meta.total || isExporting} onClick={() => void exportAll('excel')} type="button">{isExporting ? 'جارٍ التصدير…' : 'Excel'}</button>
        <button className="button button-secondary" disabled={!result.data?.meta.total || isExporting} onClick={() => void exportAll('csv')} type="button">CSV</button>
        <button className="button button-secondary" onClick={printReport} type="button">طباعة</button>
      </div>
      {exportError && <p role="alert" className="field-error">{exportError}</p>}
      {result.data?.summary && (
        <section className="report-summary-grid" aria-label="ملخص المبيعات">
          <article className="summary-card"><span>إجمالي المبيعات</span><strong dir="ltr">{formatMoney(result.data.summary.total_sales_egp)}</strong></article>
          <article className="summary-card"><span>عدد الفواتير المعتمدة</span><strong>{result.data.summary.invoice_count}</strong></article>
          <article className="summary-card"><span>متوسط قيمة الفاتورة</span><strong dir="ltr">{formatMoney(result.data.summary.average_invoice_value_egp)}</strong></article>
          <article className="summary-card"><span>إجمالي الخصومات</span><strong dir="ltr">{formatMoney(result.data.summary.total_discounts_egp)}</strong></article>
          <article className="summary-card"><span>أفضل موظف</span><strong>{result.data.summary.top_employee_name || '—'}</strong></article>
        </section>
      )}
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
        <label className="form-field" htmlFor="sales-report-employee">
          <span>الموظف</span>
          <select className="input" id="sales-report-employee" value={salespersonId} onChange={(event) => { setSalespersonId(event.currentTarget.value); setQuery((current) => ({ ...current, page: 1 })); }}>
            <option value="">كل الموظفين</option>
            {(result.data?.summary?.employees ?? []).filter((employee) => employee.salesperson_id !== null).map((employee) => <option key={employee.salesperson_id} value={employee.salesperson_id ?? ''}>{employee.salesperson_name}</option>)}
          </select>
        </label>
        <label className="form-field" htmlFor="sales-report-group">
          <span>التجميع</span>
          <select className="input" id="sales-report-group" value={groupBy} onChange={(event) => { const value = event.currentTarget.value; setSearchParams((current) => { const next = new URLSearchParams(current); next.set('group_by', value); return next; }); setQuery((current) => ({ ...current, page: 1 })); }}>
            <option value="month">شهري</option><option value="week">أسبوعي</option><option value="employee">حسب الموظف</option><option value="customer">حسب العميل</option><option value="discounts">الخصومات</option>
          </select>
        </label>
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
          {result.data.summary && <section className="report-group-summary" aria-label="تفصيل المبيعات">
              <h2>{groupBy === 'employee' ? 'المبيعات حسب الموظف' : groupBy === 'customer' ? 'المبيعات حسب العميل' : groupBy === 'discounts' ? 'المبيعات حسب الخصم' : groupBy === 'week' ? 'المبيعات حسب الأسبوع' : 'المبيعات حسب الشهر'}</h2>
              {result.data.summary.groups.length ? (
                <div className="report-group-list">{result.data.summary.groups.map((group) => <article className="report-group-row" key={group.label}><span>{group.label}</span><span>{group.invoice_count} فاتورة · خصم {formatMoney(group.total_discounts_egp)}</span><strong dir="ltr">{formatMoney(group.total_sales_egp)} · {Number(result.data?.summary?.total_sales_egp ?? 0) ? new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 1 }).format(Number(group.total_sales_egp) / Number(result.data?.summary?.total_sales_egp) * 100) : '0'}%</strong></article>)}</div>
              ) : <p className="table-empty">لا توجد بيانات للفترة المحددة.</p>}
            </section>}
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
