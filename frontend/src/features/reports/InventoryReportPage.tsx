import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../shared/auth/AuthProvider';
import { DataTable, type DataColumn } from '../../shared/components/DataTable';
import { FormField } from '../../shared/components/FormField';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import { formatMoney, formatQuantity } from '../../shared/utils/format';
import { listResource, type Category, type InventoryBalance, type InventoryMovement, type ListQuery, type Warehouse } from '../inventory/api';
import { listStockMovementsReport, listStockReport } from './api';
import { exportExcel, type ExportColumn, printReport } from './export';

export function InventoryReportPage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMovementReport = location.pathname.endsWith('/stock-movements');
  const movementType = searchParams.get('movement_type') ?? '';
  const { user } = useAuth();
  const canListCatalog = Boolean(user?.permissions.includes('*') || user?.permissions.includes('products.view'));
  const canViewCosts = Boolean(
    user?.permissions.includes('*') || user?.permissions.includes('costs.view'),
  );
  const [query, setQuery] = useState<ListQuery>({ page: 1, perPage: 10, search: '' });
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const optionQuery: ListQuery = { page: 1, perPage: 100, search: '' };
  const warehouses = useQuery({ queryKey: ['/warehouses', 'report-options'], queryFn: () => listResource<Warehouse>('/warehouses', optionQuery), enabled: canListCatalog });
  const categories = useQuery({ queryKey: ['/categories', 'report-options'], queryFn: () => listResource<Category>('/categories', optionQuery), enabled: canListCatalog });
  const filters = {
    ...(fromDate ? { from_date: fromDate } : {}),
    ...(toDate ? { to_date: toDate } : {}),
    ...(warehouseId ? { warehouse_id: warehouseId } : {}),
    ...(categoryId && !isMovementReport ? { category_id: categoryId } : {}),
    ...(isMovementReport && movementType ? { movement_type: movementType } : {}),
  };
  const stock = useQuery({
    queryKey: ['/reports/stock', query, filters],
    queryFn: () => listStockReport(query, filters),
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
    { key: 'status', header: ar.common.status, render: (row) => row.minimum_stock !== null && Number(row.quantity_on_hand) < Number(row.minimum_stock) ? 'أقل من الحد الأدنى' : 'طبيعي' },
    ...(canViewCosts
      ? [
          {
            key: 'average-cost',
            header: ar.common.unitCost,
            render: (row: InventoryBalance) => row.average_unit_cost_egp == null ? ar.common.notProvided : formatMoney(row.average_unit_cost_egp),
          },
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
  const exportColumns: ExportColumn<InventoryBalance>[] = [
    { label: ar.common.product, value: (row) => row.product_name },
    { label: ar.common.sku, value: (row) => row.sku },
    { label: ar.common.warehouse, value: (row) => row.warehouse_name },
    { label: ar.common.quantity, value: (row) => row.quantity_on_hand },
    { label: ar.common.status, value: (row) => row.minimum_stock !== null && Number(row.quantity_on_hand) < Number(row.minimum_stock) ? 'أقل من الحد الأدنى' : 'طبيعي' },
    ...(canViewCosts ? [{ label: ar.common.unitCost, value: (row: InventoryBalance) => row.average_unit_cost_egp }] : []),
    ...(canViewCosts ? [{ label: ar.common.stockValue, value: (row: InventoryBalance) => row.stock_value_egp }] : []),
  ];
  const exportAll = async () => {
    setIsExporting(true);
    setExportError('');
    try {
      const rows: InventoryBalance[] = [];
      const movementRows: InventoryMovement[] = [];
      let page = 1;
      let lastPage = 1;
      do {
        if (isMovementReport) {
          const response = await listStockMovementsReport({ ...query, page, perPage: 100 }, filters);
          movementRows.push(...response.data);
          lastPage = response.meta.last_page;
        } else {
          const response = await listStockReport({ ...query, page, perPage: 100 }, filters);
          rows.push(...response.data);
          lastPage = response.meta.last_page;
        }
        page += 1;
      } while (page <= lastPage);
      if (isMovementReport) {
        exportExcel('inventory-movements-report', [
          { label: ar.common.date, value: (row) => row.movement_date },
          { label: ar.common.movementType, value: (row) => row.movement_type },
          { label: ar.common.product, value: (row) => row.product_name },
          { label: ar.common.warehouse, value: (row) => row.warehouse_name },
          { label: ar.common.quantity, value: (row) => row.quantity },
          { label: ar.common.reference, value: (row) => row.reference },
          ...(canViewCosts ? [{ label: ar.common.unitCost, value: (row: InventoryMovement) => row.unit_cost_egp }] : []),
        ], movementRows);
      } else {
        exportExcel('inventory-report', exportColumns, rows);
      }
    } catch {
      setExportError(ar.common.requestFailed);
    } finally {
      setIsExporting(false);
    }
  };
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
          <p>{isMovementReport ? ar.reports.reportsDescription : 'الأرصدة والقيمة وحالة الحد الأدنى من المخزون الحالي.'}</p>
        </div>
      </header>
      <div className="report-actions"><button className="button button-secondary" disabled={!(isMovementReport ? movements.data?.meta.total : stock.data?.meta.total) || isExporting} onClick={() => void exportAll()} type="button">{isExporting ? 'جارٍ التصدير…' : 'Excel'}</button><button className="button button-secondary" onClick={printReport} type="button">طباعة</button></div>
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
        {canListCatalog && <>
          <label className="form-field" htmlFor="inventory-report-warehouse"><span>{ar.common.warehouse}</span><select className="input" id="inventory-report-warehouse" value={warehouseId} onChange={(event) => { setWarehouseId(event.currentTarget.value); setQuery((current) => ({ ...current, page: 1 })); }}><option value="">كل المخازن</option>{(warehouses.data?.data ?? []).map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}</select></label>
          {!isMovementReport && <label className="form-field" htmlFor="inventory-report-category"><span>الفئة</span><select className="input" id="inventory-report-category" value={categoryId} onChange={(event) => { setCategoryId(event.currentTarget.value); setQuery((current) => ({ ...current, page: 1 })); }}><option value="">كل الفئات</option>{(categories.data?.data ?? []).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>}
        </>}
        {isMovementReport && (
          <>
            <label className="form-field" htmlFor="movement-report-type"><span>{ar.common.movementType}</span><select className="input" id="movement-report-type" value={movementType} onChange={(event) => { const value = event.currentTarget.value; setSearchParams((current) => { const next = new URLSearchParams(current); if (value) next.set('movement_type', value); else next.delete('movement_type'); return next; }); setQuery((current) => ({ ...current, page: 1 })); }}><option value="">كل الحركات</option><option value="opening">رصيد افتتاحي</option><option value="receipt">استلام شراء</option><option value="container_receipt">استلام حاوية</option><option value="sale">بيع</option><option value="return">مرتجع</option><option value="transfer">تحويل</option><option value="adjustment">تسوية</option><option value="damage">تالف</option><option value="reversal">عكس حركة</option></select></label>
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
      {!isMovementReport && stock.data?.summary && <div className="report-summary-grid">
        {canViewCosts && <article className="summary-card"><span>قيمة المخزون الحالية</span><strong dir="ltr">{stock.data.summary.current_stock_value_egp === null ? ar.common.notProvided : formatMoney(stock.data.summary.current_stock_value_egp)}</strong></article>}
        <article className="summary-card"><span>دوران المخزون خلال سنة</span><strong>{stock.data.summary.inventory_turnover}</strong></article>
        <article className="summary-card"><span>أصناف راكدة لأكثر من 90 يومًا</span><strong>{stock.data.summary.stale_stock_count}</strong></article>
        <article className="summary-card"><span>أصناف أقل من الحد الأدنى</span><strong>{stock.data.summary.below_minimum_count}</strong></article>
      </div>}
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
