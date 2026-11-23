import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { DataTable, type DataColumn } from '../../shared/components/DataTable';
import { FormField } from '../../shared/components/FormField';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import { formatMoney } from '../../shared/utils/format';
import {
  getProfitDistributionReport,
  type ProfitDistributionContainer,
  type ProfitDistributionInvoice,
} from './api';
import { exportCsv, exportExcel, type ExportColumn, printReport } from './export';

type ProfitDistributionExportRow = {
  record_type: string;
  reference: string;
  date: string;
  customer_or_invoice_count: string;
  issuer: string;
  revenue_egp: string;
  cogs_egp: string | null;
  partner_profit_egp: string | null;
  company_profit_egp: string | null;
  total_profit_egp: string | null;
  cost_snapshot: string;
};

export function ProfitDistributionReportPage() {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const filters = {
    ...(fromDate ? { from_date: fromDate } : {}),
    ...(toDate ? { to_date: toDate } : {}),
  };
  const result = useQuery({
    queryKey: ['/reports/profit-distribution', filters],
    queryFn: () => getProfitDistributionReport(filters),
    retry: false,
  });
  const invoiceColumns: DataColumn<ProfitDistributionInvoice>[] = [
    { key: 'invoice', header: ar.sales.invoiceNumber, render: (row) => row.invoice_number },
    { key: 'date', header: ar.reports.date, render: (row) => row.issue_date },
    { key: 'customer', header: ar.reports.customer, render: (row) => row.customer_name },
    { key: 'issuer', header: 'المُصدر', render: (row) => `${row.issuer_type === 'partner' ? 'شريك' : row.issuer_type === 'driver' ? 'سائق' : 'الشركة'} · ${row.issuer_name}` },
    { key: 'revenue', header: 'صافي البيع', render: (row) => formatMoney(row.sale_revenue_egp) },
    { key: 'cost', header: 'تكلفة البضاعة', render: (row) => row.cogs_egp === null ? ar.common.notProvided : formatMoney(row.cogs_egp) },
    { key: 'surplus', header: 'الزيادة', render: (row) => row.surplus_egp === null ? ar.common.notProvided : formatMoney(row.surplus_egp) },
    { key: 'partner', header: 'ربح الشريك', render: (row) => row.partner_profit_egp === null ? ar.common.notProvided : formatMoney(row.partner_profit_egp) },
    { key: 'company', header: 'ربح الشركة', render: (row) => row.company_profit_egp === null ? ar.common.notProvided : formatMoney(row.company_profit_egp) },
    { key: 'profit', header: 'إجمالي الربح', render: (row) => row.total_profit_egp === null ? ar.common.notProvided : formatMoney(row.total_profit_egp) },
  ];
  const containerColumns: DataColumn<ProfitDistributionContainer>[] = [
    { key: 'container', header: ar.reports.container, render: (row) => row.container_number },
    { key: 'invoices', header: 'عدد الفواتير', render: (row) => row.invoice_count },
    { key: 'revenue', header: 'صافي البيع', render: (row) => formatMoney(row.sale_revenue_egp) },
    { key: 'cost', header: 'تكلفة البضاعة', render: (row) => row.cogs_egp === null ? ar.common.notProvided : formatMoney(row.cogs_egp) },
    { key: 'profit', header: 'ربحية الحاوية', render: (row) => row.profit_egp === null ? ar.common.notProvided : formatMoney(row.profit_egp) },
  ];

  if (result.isLoading) return <PageState kind="loading" />;
  if (result.isError || !result.data) {
    return <PageState kind="error" message={ar.common.requestFailed} onRetry={() => void result.refetch()} />;
  }

  const { totals } = result.data.data;
  const exportRows: ProfitDistributionExportRow[] = [
    ...result.data.data.invoices.map((invoice) => ({
      record_type: 'فاتورة', reference: invoice.invoice_number, date: invoice.issue_date,
      customer_or_invoice_count: invoice.customer_name,
      issuer: `${invoice.issuer_type === 'partner' ? 'شريك' : invoice.issuer_type === 'driver' ? 'سائق' : 'الشركة'} · ${invoice.issuer_name}`,
      revenue_egp: invoice.sale_revenue_egp, cogs_egp: invoice.cogs_egp,
      partner_profit_egp: invoice.partner_profit_egp, company_profit_egp: invoice.company_profit_egp,
      total_profit_egp: invoice.total_profit_egp, cost_snapshot: invoice.pricing_status === 'priced' ? 'مكتملة' : 'ناقصة',
    })),
    ...result.data.data.containers.map((container) => ({
      record_type: 'حاوية', reference: container.container_number, date: '',
      customer_or_invoice_count: `${container.invoice_count} فاتورة`, issuer: '',
      revenue_egp: container.sale_revenue_egp, cogs_egp: container.cogs_egp,
      partner_profit_egp: null, company_profit_egp: null,
      total_profit_egp: container.profit_egp, cost_snapshot: container.cost_snapshot_complete ? 'مكتملة' : 'ناقصة',
    })),
  ];
  const exportColumns: ExportColumn<ProfitDistributionExportRow>[] = [
    { label: 'نوع السجل', value: (row) => row.record_type },
    { label: 'رقم الفاتورة / الحاوية', value: (row) => row.reference },
    { label: 'التاريخ', value: (row) => row.date },
    { label: 'العميل / عدد الفواتير', value: (row) => row.customer_or_invoice_count },
    { label: 'المُصدر', value: (row) => row.issuer },
    { label: 'صافي البيع', value: (row) => row.revenue_egp },
    { label: 'تكلفة البضاعة', value: (row) => row.cogs_egp },
    { label: 'ربح الشريك', value: (row) => row.partner_profit_egp },
    { label: 'ربح الشركة', value: (row) => row.company_profit_egp },
    { label: 'إجمالي الربح', value: (row) => row.total_profit_egp },
    { label: 'اكتمال التكلفة', value: (row) => row.cost_snapshot },
  ];
  return (
    <section className="page inventory-page">
      <header className="page-heading">
        <div>
          <h1>{ar.reports.profitDistribution}</h1>
          <p>{result.data.meta.formula}</p>
        </div>
      </header>
      <div className="report-actions" aria-label="تصدير تقرير توزيع الأرباح">
        <button className="button button-secondary" disabled={!exportRows.length} onClick={() => exportExcel('profit-distribution-report', exportColumns, exportRows)} type="button">Excel</button>
        <button className="button button-secondary" disabled={!exportRows.length} onClick={() => exportCsv('profit-distribution-report', exportColumns, exportRows)} type="button">CSV</button>
        <button className="button button-secondary" onClick={printReport} type="button">طباعة</button>
      </div>
      <div className="inventory-toolbar">
        <FormField id="profit-distribution-from" label={ar.sales.fromDate} type="date" value={fromDate} onChange={(event) => setFromDate(event.currentTarget.value)} />
        <FormField id="profit-distribution-to" label={ar.sales.toDate} type="date" value={toDate} onChange={(event) => setToDate(event.currentTarget.value)} />
      </div>
      <section aria-label="ملخص الأرباح" className="dashboard-grid">
        <article className="stat-card"><span>صافي المبيعات</span><strong>{formatMoney(totals.sale_revenue_egp)}</strong></article>
        <article className="stat-card"><span>تكلفة البضاعة</span><strong>{totals.cogs_egp === null ? ar.common.notProvided : formatMoney(totals.cogs_egp)}</strong></article>
        <article className="stat-card"><span>مستحقات الشركاء</span><strong>{totals.partner_profit_egp === null ? ar.common.notProvided : formatMoney(totals.partner_profit_egp)}</strong></article>
        <article className="stat-card"><span>ربح الشركة</span><strong>{totals.company_profit_egp === null ? ar.common.notProvided : formatMoney(totals.company_profit_egp)}</strong></article>
        <article className="stat-card"><span>إجمالي الربح</span><strong>{totals.total_profit_egp === null ? ar.common.notProvided : formatMoney(totals.total_profit_egp)}</strong></article>
        <article className="stat-card"><span>فرق المطابقة</span><strong>{totals.reconciliation_difference_egp === null ? ar.common.notProvided : formatMoney(totals.reconciliation_difference_egp)}</strong></article>
      </section>
      {totals.unpriced_invoice_count > 0 && (
        <p className="field-error" role="status">فواتير مستبعدة من تقسيم الربح لعدم اكتمال لقطات السعر أو التكلفة: {totals.unpriced_invoice_count}</p>
      )}
      <section aria-labelledby="profit-distribution-invoices">
        <h2 id="profit-distribution-invoices">توزيع الأرباح حسب الفاتورة</h2>
        <DataTable columns={invoiceColumns} rows={result.data.data.invoices} getRowKey={(row) => row.id} emptyMessage={ar.common.noResults} />
      </section>
      <section aria-labelledby="profit-distribution-containers">
        <h2 id="profit-distribution-containers">ربحية الحاويات</h2>
        <DataTable columns={containerColumns} rows={result.data.data.containers} getRowKey={(row) => row.container_number} emptyMessage={ar.common.noResults} />
      </section>
    </section>
  );
}
