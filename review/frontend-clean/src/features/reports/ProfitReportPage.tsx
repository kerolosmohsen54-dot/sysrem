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

export function ProfitReportPage() {
  const { user } = useAuth();
  const allowed = Boolean(
    user?.permissions.includes('*') ||
      (user?.permissions.includes('profit.view') && user.permissions.includes('markup.view')),
  );
  const [query, setQuery] = useState<ListQuery>({ page: 1, perPage: 10, search: '' });
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
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
    { key: 'invoice', header: ar.sales.invoiceNumber, render: (row) => row.invoice_number },
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
      render: (row) =>
        row.snapshot_cost_egp === null ? ar.common.notProvided : formatMoney(row.snapshot_cost_egp),
    },
    {
      key: 'profit',
      header: ar.reports.provisionalProfit,
      render: (row) =>
        row.provisional_profit_egp === null
          ? ar.common.notProvided
          : formatMoney(row.provisional_profit_egp),
    },
    {
      key: 'markup',
      header: ar.reports.provisionalMarkup,
      render: (row) =>
        row.provisional_markup_percent === null
          ? ar.common.notProvided
          : `${row.provisional_markup_percent}%`,
    },
  ];

  if (!allowed) return <PageState kind="denied" />;
  return (
    <section className="page inventory-page">
      <header className="page-heading">
        <div>
          <h1>{ar.reports.invoiceProfit}</h1>
          <p>{ar.reports.provisionalWarning}</p>
        </div>
      </header>
      <div className="inventory-toolbar">
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
        <DataTable
          columns={columns}
          rows={result.data.data}
          getRowKey={(row) => row.id}
          emptyMessage={ar.common.noResults}
        />
      ) : null}
    </section>
  );
}
