import { newIdempotencyKey } from '../../shared/api/http';
import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, formatApiErrorDetails } from '../../shared/api/errors';
import { useAuth } from '../../shared/auth/AuthProvider';
import { DataTable, type DataColumn } from '../../shared/components/DataTable';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import { displayStatus } from '../../shared/utils/labels';
import {
  listAllResources,
  type ListQuery,
  type Product,
  type Warehouse,
  type InventoryBalance,
  listMinimumStock,
  updateMinimumStock,
  updateProductMinimumStock,
  listInventoryCounts,
  getInventoryCount,
  createInventoryCount,
  approveInventoryCount,
  type MinimumStockRow,
  type InventoryCount,
  type InventoryCountLine,
} from './api';
import { invalidateInventoryQueries } from './cache';

const pageSize = 20;
const base: ListQuery = { page: 1, perPage: pageSize, search: '' };
const localDate = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};

function errorPage(error: unknown, onRetry?: () => void) {
  const denied = error instanceof ApiError && error.status === 403;
  return (
    <PageState
      kind={denied ? 'denied' : 'error'}
      message={denied ? ar.common.permissionDenied : ar.common.requestFailed}
      onRetry={onRetry}
    />
  );
}

function mutationError(error: unknown) {
  if (error instanceof ApiError) {
    return <p className="field-error" role="alert">{error.message} {formatApiErrorDetails(error.details)}</p>;
  }
  if (error instanceof Error) return <p className="field-error" role="alert">{error.message}</p>;
  return null;
}

export function MinimumStockPage() {
  const { user } = useAuth();
  const client = useQueryClient();
  const canManageProducts = Boolean(user?.permissions.includes('*') || user?.permissions.includes('products.manage'));
  const canManageInventory = Boolean(user?.permissions.includes('*') || user?.permissions.includes('inventory.manage'));
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [productId, setProductId] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);
  const [minimumDrafts, setMinimumDrafts] = useState<Record<number, string>>({});
  const [newWarehouseProductId, setNewWarehouseProductId] = useState('');
  const [newWarehouseId, setNewWarehouseId] = useState('');
  const [newWarehouseMinimum, setNewWarehouseMinimum] = useState('');
  const query = { ...base, page, search };
  const productFilters = {
    scope: 'product',
    ...(productId ? { product_id: productId } : {}),
  };
  const warehouseFilters = {
    scope: 'warehouse',
    ...(warehouseId ? { warehouse_id: warehouseId } : {}),
    ...(productId ? { product_id: productId } : {}),
  };
  const rows = useQuery({
    queryKey: ['/inventory/minimum-stock', query, productFilters],
    queryFn: () => listMinimumStock(query, false, productFilters),
    retry: false,
  });
  const warehouseRows = useQuery({
    queryKey: ['/inventory/minimum-stock', query, warehouseFilters],
    queryFn: () => listMinimumStock(query, false, warehouseFilters),
    retry: false,
  });
  const alerts = useQuery({
    queryKey: ['/inventory/minimum-stock', 'alerts', productFilters],
    queryFn: () => listMinimumStock({ ...base, perPage: 100, search: '' }, true, productFilters),
    retry: false,
  });
  const warehouseAlerts = useQuery({
    queryKey: ['/inventory/minimum-stock', 'warehouse-alerts', warehouseFilters],
    queryFn: () => listMinimumStock({ ...base, perPage: 100, search: '' }, true, warehouseFilters),
    retry: false,
  });
  const products = useQuery({
    queryKey: ['/products', 'minimum-stock'],
    queryFn: () => listAllResources<Product>('/products', { ...base, perPage: 100 }),
    retry: false,
  });
  const warehouses = useQuery({
    queryKey: ['/warehouses', 'minimum-stock'],
    queryFn: () => listAllResources<Warehouse>('/warehouses', { ...base, perPage: 100 }),
    retry: false,
  });
  const updateMinimum = useMutation({
    mutationFn: ({ productId, quantity }: { productId: number; quantity: number }) => updateProductMinimumStock(productId, quantity),
    onSuccess: async () => { setError(null); setSaved(true); await invalidateInventoryQueries(client); },
    onError: setError,
  });
  const updateWarehouseMinimum = useMutation({
    mutationFn: updateMinimumStock,
    onSuccess: async () => { setError(null); setSaved(true); await invalidateInventoryQueries(client); },
    onError: setError,
  });
  const alertColumns: DataColumn<MinimumStockRow>[] = [
    { key: 'product', header: ar.common.product, render: row => `${row.product_name} (${row.sku})` },
    { key: 'warehouse', header: ar.nav.warehouses, render: row => row.warehouse_name ?? ar.inventory.all },
    { key: 'available', header: ar.common.available, render: row => <strong className="inventory-low-stock-quantity">{row.available_quantity}</strong> },
    { key: 'minimum', header: ar.common.minStock, render: row => String(row.minimum_quantity) },
    { key: 'status', header: ar.common.status, render: () => <span className="inventory-stock-status inventory-stock-status-low">{ar.inventory.stockLow}</span> },
  ];
  const columns: DataColumn<MinimumStockRow>[] = [
    { key: 'product', header: ar.common.product, render: row => `${row.product_name} (${row.sku})` },
    { key: 'available', header: ar.common.available, render: row => String(row.available_quantity) },
    { key: 'minimum', header: ar.common.minStock, render: row => canManageProducts ? <form className="inventory-minimum-editor" onSubmit={event => {
      event.preventDefault(); setError(null); setSaved(false);
      const quantity = Number(minimumDrafts[row.product_id] ?? row.minimum_quantity);
      if (!Number.isSafeInteger(quantity) || quantity < 0) { setError(new Error(ar.common.quantityMustBeInteger)); return; }
      updateMinimum.mutate({ productId: row.product_id, quantity });
    }}><input className="input" type="number" min="0" step="1" aria-label={`${ar.common.minStock} ${row.product_name}`} value={minimumDrafts[row.product_id] ?? String(row.minimum_quantity)} onChange={event => { const value = event.currentTarget.value; setMinimumDrafts(current => ({ ...current, [row.product_id]: value })); }} /><button className="button button-secondary" type="submit" disabled={updateMinimum.isPending}>{ar.common.save}</button></form> : String(row.minimum_quantity) },
  ];

  const warehouseColumns: DataColumn<MinimumStockRow>[] = [
    { key: 'product', header: ar.common.product, render: row => `${row.product_name} (${row.sku})` },
    { key: 'warehouse', header: ar.nav.warehouses, render: row => row.warehouse_name ?? String(row.warehouse_id ?? '') },
    { key: 'available', header: ar.common.available, render: row => String(row.available_quantity) },
    { key: 'minimum', header: ar.common.minStock, render: row => canManageInventory && row.warehouse_id !== null ? <form className="inventory-minimum-editor" onSubmit={event => {
      event.preventDefault(); setError(null); setSaved(false);
      const quantity = Number(minimumDrafts[row.id] ?? row.minimum_quantity);
      if (!Number.isSafeInteger(quantity) || quantity < 0) { setError(new Error(ar.common.quantityMustBeInteger)); return; }
      updateWarehouseMinimum.mutate({ product_id: row.product_id, warehouse_id: Number(row.warehouse_id), minimum_quantity: quantity });
    }}><input className="input" type="number" min="0" step="1" aria-label={`${ar.common.minStock} ${row.product_name} ${row.warehouse_name ?? ''}`} value={minimumDrafts[row.id] ?? String(row.minimum_quantity)} onChange={event => { const value = event.currentTarget.value; setMinimumDrafts(current => ({ ...current, [row.id]: value })); }} /><button className="button button-secondary" type="submit" disabled={updateWarehouseMinimum.isPending}>{ar.common.save}</button></form> : String(row.minimum_quantity) },
  ];

  if (rows.isLoading || warehouseRows.isLoading || products.isLoading || warehouses.isLoading) return <PageState kind="loading" />;
  if (rows.isError || warehouseRows.isError || alerts.isError || warehouseAlerts.isError || products.isError || warehouses.isError || !rows.data || !warehouseRows.data || !products.data || !warehouses.data) {
    return errorPage(rows.error ?? warehouseRows.error ?? alerts.error ?? warehouseAlerts.error ?? products.error ?? warehouses.error, () => {
      void rows.refetch(); void warehouseRows.refetch(); void alerts.refetch(); void warehouseAlerts.refetch(); void products.refetch(); void warehouses.refetch();
    });
  }
  return (
    <section className="page inventory-page">
      <header className="page-heading"><div><h1>{ar.nav.minimumStock}</h1><p>{ar.inventory.minimumStockDescription}</p></div></header>
      {(alerts.data?.meta.total ?? 0) + (warehouseAlerts.data?.meta.total ?? 0) > 0
        ? <p className="inventory-low-stock-alert" role="alert">{(alerts.data?.meta.total ?? 0) + (warehouseAlerts.data?.meta.total ?? 0)} {ar.inventory.lowStockAlerts}</p>
        : <p className="inline-success" role="status">{ar.inventory.noLowStockAlerts}</p>}
      <div className="inventory-toolbar inventory-catalog-filters">
        <label className="inventory-search"><span>{ar.common.search}</span><input className="input" type="search" value={search} onChange={event => { setSearch(event.currentTarget.value); setPage(1); }} /></label>
        <label className="form-field"><span>{ar.inventory.filterByWarehouse}</span><select className="input" value={warehouseId} onChange={event => { setWarehouseId(event.currentTarget.value); setPage(1); }}><option value="">{ar.inventory.all}</option>{warehouses.data.data.filter(row => row.is_active && row.location_type !== 'damaged').map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
        <label className="form-field"><span>{ar.inventory.filterByProduct}</span><select className="input" value={productId} onChange={event => { setProductId(event.currentTarget.value); setPage(1); }}><option value="">{ar.inventory.all}</option>{products.data.data.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
      </div>
      <section className="inventory-minimum-section">
        <h2>{ar.inventory.lowStockAlerts} ({alerts.data?.meta.total ?? 0})</h2>
        <DataTable columns={alertColumns} rows={alerts.data?.data ?? []} getRowKey={row => row.id} emptyMessage={ar.inventory.noLowStockAlerts} />
      </section>
      <section className="inventory-minimum-section">
        <h2>{ar.inventory.configureProductMinimumStock}</h2>
        <DataTable columns={columns} rows={rows.data.data} getRowKey={row => row.id} emptyMessage={ar.common.noResults} />
        <nav className="inventory-pagination" aria-label={ar.inventory.paginationLabel}>
          <button className="button button-secondary" type="button" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>{ar.common.previous}</button>
          <span>{ar.common.page} {rows.data.meta.current_page} {ar.common.of} {rows.data.meta.last_page}</span>
          <button className="button button-secondary" type="button" disabled={page >= rows.data.meta.last_page} onClick={() => setPage(value => value + 1)}>{ar.common.next}</button>
        </nav>
      </section>
      <section className="inventory-minimum-section">
        <h2>{ar.nav.warehouses} · {ar.common.minStock} ({warehouseAlerts.data?.meta.total ?? 0})</h2>
        <DataTable columns={alertColumns} rows={warehouseAlerts.data?.data ?? []} getRowKey={row => row.id} emptyMessage={ar.inventory.noLowStockAlerts} />
        <DataTable columns={warehouseColumns} rows={warehouseRows.data.data} getRowKey={row => row.id} emptyMessage={ar.common.noResults} />
        <nav className="inventory-pagination" aria-label={ar.inventory.paginationLabel}>
          <button className="button button-secondary" type="button" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>{ar.common.previous}</button>
          <span>{ar.common.page} {warehouseRows.data.meta.current_page} {ar.common.of} {warehouseRows.data.meta.last_page}</span>
          <button className="button button-secondary" type="button" disabled={page >= warehouseRows.data.meta.last_page} onClick={() => setPage(value => value + 1)}>{ar.common.next}</button>
        </nav>
        {canManageInventory && <form className="stack-form" onSubmit={event => {
          event.preventDefault(); setError(null); setSaved(false);
          const quantity = Number(newWarehouseMinimum);
          const selectedProductId = Number(newWarehouseProductId);
          const selectedWarehouseId = Number(newWarehouseId);
          if (!Number.isSafeInteger(quantity) || quantity < 0 || selectedProductId < 1 || selectedWarehouseId < 1) {
            setError(new Error(ar.common.quantityMustBeInteger)); return;
          }
          updateWarehouseMinimum.mutate({ product_id: selectedProductId, warehouse_id: selectedWarehouseId, minimum_quantity: quantity });
        }}>
          <h3>{ar.common.add} {ar.common.minStock} {ar.nav.warehouses}</h3>
          <label className="form-field"><span>{ar.inventory.selectProduct}</span><select className="input" value={newWarehouseProductId} onChange={event => setNewWarehouseProductId(event.currentTarget.value)} required><option value="">{ar.common.select}</option>{products.data.data.filter(row => row.is_active).map(row => <option key={row.id} value={row.id}>{row.name} ({row.sku})</option>)}</select></label>
          <label className="form-field"><span>{ar.inventory.selectWarehouse}</span><select className="input" value={newWarehouseId} onChange={event => setNewWarehouseId(event.currentTarget.value)} required><option value="">{ar.common.select}</option>{warehouses.data.data.filter(row => row.is_active && row.location_type !== 'damaged').map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
          <label className="form-field"><span>{ar.common.minStock}</span><input className="input" type="number" min="0" step="1" value={newWarehouseMinimum} onChange={event => setNewWarehouseMinimum(event.currentTarget.value)} required /></label>
          <button className="button button-primary" type="submit" disabled={updateWarehouseMinimum.isPending}>{ar.common.save}</button>
        </form>}
      </section>
      {mutationError(error)}{saved && <p className="inline-success" role="status">{ar.common.actionSaved}</p>}
    </section>
  );
}

type DraftCountLine = { key: number; product_id: string; counted_quantity: string; difference_reason: string };
const countReasons = [
  ['shortage_damage', ar.inventory.countShortageDamage],
  ['record_error', ar.inventory.countRecordError],
  ['theft', ar.inventory.countTheft],
  ['unrecorded_increase', ar.inventory.countUnrecordedIncrease],
  ['other', ar.inventory.countOther],
] as const;
const newCountLine = (key: number): DraftCountLine => ({ key, product_id: '', counted_quantity: '', difference_reason: '' });

export function PeriodicCountPage() {
  const { user } = useAuth();
  const client = useQueryClient();
  const canCreate = Boolean(user?.permissions.includes('*') || user?.permissions.includes('inventory_counts.manage'));
  const canApprove = Boolean(user?.permissions.includes('*') || user?.permissions.includes('inventory_counts.approve'));
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [countWarehouseId, setCountWarehouseId] = useState('');
  const [lines, setLines] = useState<DraftCountLine[]>([newCountLine(1)]);
  const [nextLineKey, setNextLineKey] = useState(2);
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);
  const query = { ...base, page, search };
  const filters = {
    ...(status ? { status } : {}),
    ...(warehouseFilter ? { warehouse_id: warehouseFilter } : {}),
  };
  const counts = useQuery({
    queryKey: ['/inventory/counts', query, filters],
    queryFn: () => listInventoryCounts(query, filters),
    retry: false,
  });
  const products = useQuery({
    queryKey: ['/products', 'count'],
    queryFn: () => listAllResources<Product>('/products', { ...base, perPage: 100 }),
    enabled: canCreate,
    retry: false,
  });
  const warehouses = useQuery({
    queryKey: ['/warehouses', 'count'],
    queryFn: () => listAllResources<Warehouse>('/warehouses', { ...base, perPage: 100 }),
    retry: false,
  });
  const currentBalances = useQuery({
    queryKey: ['/inventory/balances', 'count-current', countWarehouseId],
    queryFn: () => listAllResources<InventoryBalance>('/inventory/balances', { ...base, perPage: 100 }, { warehouse_id: countWarehouseId }),
    enabled: canCreate && countWarehouseId !== '',
    retry: false,
  });
  const create = useMutation({
    mutationFn: createInventoryCount,
    onSuccess: async () => {
      setSaved(true); setError(null); setLines([newCountLine(nextLineKey)]); setNextLineKey(value => value + 1);
      await client.invalidateQueries({ queryKey: ['/inventory/counts'] });
    },
    onError: setError,
  });
  const approve = useMutation({
    mutationFn: approveInventoryCount,
    onSuccess: async () => { await Promise.all([invalidateInventoryQueries(client), client.invalidateQueries({ queryKey: ['/inventory/counts'] })]); },
    onError: setError,
  });
  const columns: DataColumn<InventoryCount>[] = [
    { key: 'number', header: 'رقم الجرد', render: row => <Link to={`/inventory/counts/${row.id}`}><bdi>{row.count_number}</bdi></Link> },
    { key: 'warehouse', header: ar.nav.warehouses, render: row => row.warehouse_name ?? String(row.warehouse_id) },
    { key: 'date', header: ar.common.date, render: row => row.count_date },
    { key: 'status', header: ar.common.status, render: row => displayStatus(row.status) },
    ...(canApprove ? [{ key: 'approve', header: ar.common.actions, render: (row: InventoryCount) => row.status === 'draft' ? <button className="button button-secondary" disabled={approve.isPending} onClick={() => approve.mutate(row.id)} type="button">اعتماد</button> : null }] : []),
  ];
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(null); setSaved(false);
    const values = new FormData(event.currentTarget);
    const parsedLines: { product_id: number; counted_quantity: number; difference_reason: string }[] = [];
    const seenProducts = new Set<number>();
    for (const line of lines) {
      const productId = Number(line.product_id);
      const quantity = Number(line.counted_quantity);
      if (!Number.isSafeInteger(productId) || productId < 1 || !Number.isSafeInteger(quantity) || quantity < 0 || !line.difference_reason) {
        setError(new Error('اختر صنفاً وأدخل كميته الفعلية كعدد صحيح غير سالب لكل سطر.'));
        return;
      }
      if (seenProducts.has(productId)) { setError(new Error('لا تكرر الصنف داخل جلسة الجرد نفسها.')); return; }
      seenProducts.add(productId);
      parsedLines.push({ product_id: productId, counted_quantity: quantity, difference_reason: line.difference_reason });
    }
    create.mutate({
      warehouse_id: Number(values.get('warehouse_id')),
      count_date: String(values.get('count_date') ?? ''),
      reason: String(values.get('reason') ?? '').trim(),
      idempotency_key: newIdempotencyKey(),
      lines: parsedLines,
    });
  };

  if (counts.isLoading || (canCreate && (products.isLoading || warehouses.isLoading)) || (!canCreate && warehouses.isLoading)) return <PageState kind="loading" />;
  if (counts.isError || (canCreate && (products.isError || warehouses.isError || (countWarehouseId !== '' && currentBalances.isError))) || warehouses.isError || !counts.data || !warehouses.data || (canCreate && !products.data)) {
    return errorPage(counts.error ?? products.error ?? warehouses.error ?? currentBalances.error, () => { void counts.refetch(); void products.refetch(); void warehouses.refetch(); void currentBalances.refetch(); });
  }
  return (
    <section className="page inventory-page">
      <header className="page-heading"><div><h1>{ar.nav.periodicCount}</h1><p>{ar.inventory.periodicCountDescription}</p></div></header>
      <div className="inventory-toolbar inventory-catalog-filters">
        <label className="inventory-search"><span>{ar.common.search}</span><input className="input" type="search" value={search} onChange={event => { setSearch(event.currentTarget.value); setPage(1); }} /></label>
        <label className="form-field"><span>{ar.common.status}</span><select className="input" value={status} onChange={event => { setStatus(event.currentTarget.value); setPage(1); }}><option value="">{ar.inventory.all}</option><option value="draft">مسودة</option><option value="approved">معتمد</option><option value="cancelled">ملغي</option></select></label>
        <label className="form-field"><span>{ar.inventory.selectWarehouse}</span><select className="input" value={warehouseFilter} onChange={event => { setWarehouseFilter(event.currentTarget.value); setPage(1); }}><option value="">{ar.inventory.all}</option>{warehouses.data.data.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
      </div>
      <DataTable columns={columns} rows={counts.data.data} getRowKey={row => row.id} emptyMessage={ar.common.noResults} />
      <nav className="inventory-pagination" aria-label={ar.inventory.paginationLabel}>
        <button className="button button-secondary" type="button" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>{ar.common.previous}</button>
        <span>{ar.common.page} {counts.data.meta.current_page} {ar.common.of} {counts.data.meta.last_page}</span>
        <button className="button button-secondary" type="button" disabled={page >= counts.data.meta.last_page} onClick={() => setPage(value => value + 1)}>{ar.common.next}</button>
      </nav>
      {canCreate && <form className="stack-form" onSubmit={submit}>
        <h2>{ar.inventory.createInventoryCount}</h2>
        <label className="form-field"><span>{ar.inventory.selectWarehouse}</span><select className="input" name="warehouse_id" required value={countWarehouseId} onChange={event => setCountWarehouseId(event.currentTarget.value)}><option value="">{ar.common.select}</option>{warehouses.data.data.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
        <label className="form-field"><span>{ar.common.date}</span><input className="input" name="count_date" type="date" defaultValue={localDate()} required /></label>
        <section className="invoice-line-editor">
          <header className="page-heading"><h3>الأصناف والكميات الفعلية</h3><button className="button button-secondary" type="button" onClick={() => { setLines(current => [...current, newCountLine(nextLineKey)]); setNextLineKey(value => value + 1); }}>إضافة صنف</button></header>
          {lines.map((line, index) => {
            const current = currentBalances.data?.data.find(row => row.product_id === Number(line.product_id));
            const balanceReady = countWarehouseId !== '' && !currentBalances.isFetching && !currentBalances.isError;
            const systemQuantity = balanceReady ? Number(current?.quantity_on_hand ?? 0) : null;
            const countedQuantity = line.counted_quantity === '' ? null : Number(line.counted_quantity);
            const difference = countedQuantity === null || systemQuantity === null ? null : countedQuantity - systemQuantity;
            return <div className="inventory-count-line" key={line.key}>
              <label className="form-field"><span>{ar.common.product} {index + 1}</span><select className="input" value={line.product_id} onChange={event => { const value = event.currentTarget.value; setLines(current => current.map(row => row.key === line.key ? { ...row, product_id: value } : row)); }} required><option value="">{ar.common.select}</option>{products?.data?.data.map(product => <option key={product.id} value={product.id}>{product.name} ({product.sku})</option>)}</select></label>
              <div className="form-field"><span>{ar.inventory.countSystemQuantity}</span><output>{systemQuantity === null ? (countWarehouseId ? ar.app.loading : ar.common.notProvided) : systemQuantity}</output></div>
              <label className="form-field"><span>{ar.inventory.countActualQuantity}</span><input className="input" min="0" step="1" type="number" value={line.counted_quantity} onChange={event => { const value = event.currentTarget.value; setLines(current => current.map(row => row.key === line.key ? { ...row, counted_quantity: value } : row)); }} required /></label>
              <div className="form-field"><span>{ar.inventory.countDifference}</span><output className={difference !== null && difference < 0 ? 'field-error' : undefined}>{difference === null ? ar.common.notProvided : difference > 0 ? `+${difference}` : difference}</output></div>
              <label className="form-field"><span>{ar.common.reason}</span><select className="input" value={line.difference_reason} onChange={event => { const value = event.currentTarget.value; setLines(current => current.map(row => row.key === line.key ? { ...row, difference_reason: value } : row)); }} required><option value="">{ar.common.select}</option>{countReasons.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              {lines.length > 1 && <button className="button button-secondary" type="button" onClick={() => setLines(current => current.filter(row => row.key !== line.key))}>{ar.inventory.removeCountLine}</button>}
            </div>;
          })}
        </section>
        <label className="form-field"><span>{ar.common.reason}</span><input className="input" name="reason" maxLength={1000} required /></label>
        {mutationError(error)}{saved && <p className="inline-success" role="status">{ar.common.actionSaved}</p>}
        <button className="button button-primary" disabled={create.isPending} type="submit">{ar.common.save}</button>
      </form>}
    </section>
  );
}

export function PeriodicCountDetailPage() {
  const { countId = '' } = useParams();
  const id = Number(countId);
  const valid = /^[1-9]\d*$/.test(countId);
  const { user } = useAuth();
  const client = useQueryClient();
  const canApprove = Boolean(user?.permissions.includes('*') || user?.permissions.includes('inventory_counts.approve'));
  const result = useQuery({ queryKey: ['/inventory/counts', id], queryFn: () => getInventoryCount(id), enabled: valid, retry: false });
  const approval = useMutation({
    mutationFn: () => approveInventoryCount(id),
    onSuccess: async () => { await Promise.all([invalidateInventoryQueries(client), client.invalidateQueries({ queryKey: ['/inventory/counts'] })]); },
  });
  if (!valid) return <PageState kind="error" title={ar.common.invalidIdentifier} />;
  if (result.isLoading) return <PageState kind="loading" />;
  if (result.isError || !result.data) return <PageState kind="error" message={ar.common.requestFailed} onRetry={() => void result.refetch()} />;
  const { count, lines } = result.data;
  const columns: DataColumn<InventoryCountLine>[] = [
    { key: 'product', header: ar.common.product, render: line => `${line.product_name ?? ''} (${line.sku ?? line.product_id})` },
    { key: 'expected', header: ar.inventory.countSystemQuantity, render: line => <bdi>{line.expected_quantity}</bdi> },
    { key: 'counted', header: ar.inventory.countActualQuantity, render: line => <bdi>{line.counted_quantity}</bdi> },
    { key: 'difference', header: ar.inventory.countDifference, render: line => <bdi>{line.difference_quantity > 0 ? `+${line.difference_quantity}` : line.difference_quantity}</bdi> },
    { key: 'reason', header: ar.common.reason, render: line => countReasons.find(([value]) => value === line.difference_reason)?.[1] ?? ar.common.notProvided },
    { key: 'movement', header: ar.common.movementType, render: line => line.movement_line_id ? <Link to={`/inventory/movements/${line.movement_line_id}`}>{ar.nav.inventoryMovements}</Link> : ar.common.notProvided },
  ];
  return (
    <section className="page inventory-page">
      <header className="page-heading"><div><h1>تفاصيل الجرد الدوري</h1><p><bdi>{count.count_number}</bdi> · {count.count_date} · {displayStatus(count.status)}</p></div><Link className="button button-secondary" to="/inventory/counts">{ar.common.back}</Link></header>
      <p>{count.reason}</p>
      <DataTable columns={columns} rows={lines} getRowKey={line => line.id} emptyMessage={ar.common.noResults} />
      {mutationError(approval.error)}
      {canApprove && count.status === 'draft' && <button className="button button-primary" type="button" disabled={approval.isPending} onClick={() => approval.mutate()}>اعتماد الفروق</button>}
    </section>
  );
}
