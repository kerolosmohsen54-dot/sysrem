import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../shared/auth/AuthProvider';
import { DataTable, type DataColumn } from '../../shared/components/DataTable';
import { FormField } from '../../shared/components/FormField';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import { formatMoney, formatQuantity } from '../../shared/utils/format';
import type { InventoryBalance, InventoryMovement, ListQuery } from '../inventory/api';
import { listStockMovementsReport, listStockReport } from './api';

export function InventoryReportPage() {
  const location = useLocation();
  const isMovementReport = location.pathname.endsWith('/stock-movements');
  const { user } = useAuth();
  const canViewCosts = Boolean(
    user?.permissions.includes('*') || user?.permissions.includes('costs.view'),
  );
  const [query, setQuery] = useState<ListQuery>({ page: 1, perPage: 10, search: '' });
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const filters = {
    ...(fromDate ? { from_date: fromDate } : {}),
    ...(toDate ? { to_date: toDate } : {}),
  };
  const stock = useQuery({
    queryKey: ['/reports/stock', query],
    queryFn: () => listStockReport(query),
    enabled: !isMovementReport,
  });
  const movements = useQuery({
    queryKey: ['/reports/stock-movements', query, filters],
    queryFn: () => listStockMovementsReport(query, filters),
    enabled: isMovementReport,
  });
  const stockColumns: DataColumn<InventoryBalance>[] = [
    { key: 'product', header: ar.common.product, render: (row) => row.product_name },
    { key: 'sku', header: ar.common.sku, render: (row) => row.sku },
    { key: 'warehouse', header: ar.common.warehouse, render: (row) => row.warehouse_name },
    {
      key: 'quantity',
      header: ar.common.quantity,
      render: (row) => formatQuantity(row.quantity_on_hand),
    },
    ...(canViewCosts
      ? [
          {
            key: 'value',
            header: ar.common.stockValue,
            render: (row: InventoryBalance) =>
              row.stock_value_egp == null
                ? ar.common.notProvided
                : formatMoney(row.stock_value_egp),
          },
        ]
      : []),
  ];
  const movementColumns: DataColumn<InventoryMovement>[] = [
    { key: 'date', header: ar.common.date, render: (row) => row.movement_date },
    { key: 'type', header: ar.common.movementType, render: (row) => row.movement_type },
    { key: 'product', header: ar.common.product, render: (row) => row.product_name },
    { key: 'warehouse', header: ar.common.warehouse, render: (row) => row.warehouse_name },
    { key: 'quantity', header: ar.common.quantity, render: (row) => formatQuantity(row.quantity) },
    { key: 'reference', header: ar.common.reference, render: (row) => row.reference || '—' },
    ...(canViewCosts
      ? [
          {
            key: 'cost',
            header: ar.common.unitCost,
            render: (row: InventoryMovement) =>
              row.unit_cost_egp == null ? ar.common.notProvided : formatMoney(row.unit_cost_egp),
          },
        ]
      : []),
  ];
  const data = isMovementReport ? movements.data : stock.data;
  const error = isMovementReport ? movements.isError : stock.isError;
  const loading = isMovementReport ? movements.isLoading : stock.isLoading;
  const refetch = () => void (isMovementReport ? movements.refetch() : stock.refetch());

  return (
    <section className="page inventory-page">
      <header className="page-heading">
        <div>
          <h1>{isMovementReport ? ar.reports.stockMovements : ar.reports.stock}</h1>
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
        {isMovementReport && (
          <>
            <FormField
              id="movement-report-from"
              label={ar.inventory.fromDate}
              type="date"
              value={fromDate}
              onChange={(event) => {
                setFromDate(event.currentTarget.value);
                setQuery((current) => ({ ...current, page: 1 }));
              }}
            />
            <FormField
              id="movement-report-to"
              label={ar.inventory.toDate}
              type="date"
              value={toDate}
              onChange={(event) => {
                setToDate(event.currentTarget.value);
                setQuery((current) => ({ ...current, page: 1 }));
              }}
            />
          </>
        )}
      </div>
      {loading ? (
        <PageState kind="loading" />
      ) : error || !data ? (
        <PageState kind="error" message={ar.common.requestFailed} onRetry={refetch} />
      ) : isMovementReport && movements.data ? (
        <DataTable
          columns={movementColumns}
          rows={movements.data.data}
          getRowKey={(row) => row.id}
          emptyMessage={ar.common.noResults}
        />
      ) : !isMovementReport && stock.data ? (
        <DataTable
          columns={stockColumns}
          rows={stock.data.data}
          getRowKey={(row) => `${row.product_id}-${row.warehouse_id}`}
          emptyMessage={ar.common.noResults}
        />
      ) : null}
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
          {ar.common.page} {query.page} {ar.common.of} {data?.meta.last_page ?? 1}
        </span>
        <button
          className="button button-secondary"
          disabled={query.page >= (data?.meta.last_page ?? 1)}
          onClick={() => setQuery((current) => ({ ...current, page: current.page + 1 }))}
          type="button"
        >
          {ar.common.next}
        </button>
      </nav>
    </section>
  );
}
