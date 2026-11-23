import { newIdempotencyKey } from '../../shared/api/http';
import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, formatApiErrorDetails } from '../../shared/api/errors';
import { useAuth } from '../../shared/auth/AuthProvider';
import { DataTable, type DataColumn } from '../../shared/components/DataTable';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import { displayStatus } from '../../shared/utils/labels';
import { createApprovedDamagedStock, listAllResources, listApprovedDamagedStock, type ApprovedDamagedStock, type ListQuery, type Product, type Warehouse } from './api';
import { invalidateInventoryQueries } from './cache';

const query: ListQuery = { page: 1, perPage: 20, search: '' };
export function ApprovedDamagedStockPage() {
  const { user } = useAuth(); const client = useQueryClient();
  const canApprove = Boolean(user?.permissions.includes('*') || user?.permissions.includes('damaged_stock.approve'));
  const [page, setPage] = useState(1); const [recordSearch, setRecordSearch] = useState(''); const [error, setError] = useState<unknown>(null); const [saved, setSaved] = useState(false);
  const [productSearch, setProductSearch] = useState(''); const [warehouseSearch, setWarehouseSearch] = useState('');
  const listQuery = { ...query, page, search: recordSearch };
  const result = useQuery({ queryKey: ['/approved-damaged-stock', listQuery], queryFn: () => listApprovedDamagedStock(listQuery), retry: false });
  const warehouses = useQuery({ queryKey: ['/warehouses', 'damaged-picker', warehouseSearch], queryFn: () => listAllResources<Warehouse>('/warehouses', { ...query, perPage: 100, search: warehouseSearch }), enabled: canApprove, placeholderData: previous => previous, retry: false });
  const products = useQuery({ queryKey: ['/products', 'damaged-picker', productSearch], queryFn: () => listAllResources<Product>('/products', { ...query, perPage: 100, search: productSearch }), enabled: canApprove, placeholderData: previous => previous, retry: false });
  const create = useMutation({ mutationFn: createApprovedDamagedStock, onSuccess: async () => { setSaved(true); setError(null); await Promise.all([invalidateInventoryQueries(client), client.invalidateQueries({ queryKey: ['/approved-damaged-stock'] })]); }, onError: (cause: unknown) => { setSaved(false); setError(cause); } });
  const columns: DataColumn<ApprovedDamagedStock>[] = [
    { key: 'product', header: ar.nav.products, render: row => <>{row.product_name ?? String(row.product_id)} {row.sku && <bdi>({row.sku})</bdi>}</> },
    { key: 'warehouse', header: ar.nav.warehouses, render: row => row.warehouse_name ?? String(row.warehouse_id) },
    { key: 'quantity', header: 'الكمية', render: row => String(row.quantity) },
    { key: 'cost', header: 'التكلفة', render: row => row.cost_egp },
    { key: 'approved-by', header: ar.common.user, render: row => row.approved_by_name ?? ar.common.notProvided },
    { key: 'status', header: ar.common.status, render: row => displayStatus(row.status) },
  ];
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setError(null); setSaved(false); const values = new FormData(event.currentTarget); const quantity = Number(values.get('quantity')); const cost = String(values.get('cost_egp') ?? ''); if (!Number.isSafeInteger(quantity) || quantity < 1 || !/^(0|[1-9]\d{0,14})(\.\d{1,4})?$/.test(cost)) { setError(new Error('راجع الكمية والتكلفة.')); return; } create.mutate({ product_id: Number(values.get('product_id')), warehouse_id: Number(values.get('warehouse_id')), quantity, cost_egp: cost, idempotency_key: newIdempotencyKey() }); };
  if (result.isLoading || (canApprove && (warehouses.isLoading || products.isLoading))) return <PageState kind="loading" />;
  if (result.isError || !result.data || (canApprove && (warehouses.isError || products.isError || !warehouses.data || !products.data))) { const denied = [result.error, warehouses.error, products.error].some(cause => cause instanceof ApiError && cause.status === 403); return <PageState kind={denied ? 'denied' : 'error'} message={denied ? ar.common.permissionDenied : ar.common.requestFailed} onRetry={() => { void result.refetch(); void warehouses.refetch(); void products.refetch(); }} />; }
  return <section className="page inventory-page damaged-stock-page"><header className="page-heading"><div><h1>المخزون التالف المعتمد</h1><p>اعتماد وتوثيق المنتجات التالفة كما يرد من النظام.</p></div></header>
    <label className="inventory-search"><span>{ar.common.search}</span><input className="input" type="search" value={recordSearch} onChange={event => { setRecordSearch(event.currentTarget.value); setPage(1); }} /></label>
    <DataTable columns={columns} emptyMessage={ar.common.noResults} getRowKey={row => row.id} rows={result.data.data} />
    <nav aria-label={ar.inventory.paginationLabel} className="inventory-pagination"><button className="button button-secondary" disabled={page <= 1} onClick={() => setPage(x => x - 1)} type="button">{ar.common.previous}</button><span>{ar.common.page} {result.data.meta.current_page} {ar.common.of} {result.data.meta.last_page}</span><button className="button button-secondary" disabled={page >= result.data.meta.last_page} onClick={() => setPage(x => x + 1)} type="button">{ar.common.next}</button></nav>
    {canApprove && <form className="stack-form" onSubmit={submit}><h2>تسجيل اعتماد مخزون تالف</h2><label className="form-field"><span>{`${ar.common.search} ${ar.nav.products}`}</span><input aria-label={`${ar.common.search} ${ar.nav.products}`} className="input" onChange={event => setProductSearch(event.target.value)} placeholder={ar.common.search} type="search" value={productSearch} /></label><label className="form-field"><span>{ar.inventory.selectProduct}</span><select className="input" name="product_id" required defaultValue=""><option value="">{ar.common.select}</option>{products.data?.data.map(row => <option key={row.id} value={row.id}>{row.name} — {row.sku}</option>)}</select></label><label className="form-field"><span>{`${ar.common.search} ${ar.nav.warehouses}`}</span><input aria-label={`${ar.common.search} ${ar.nav.warehouses}`} className="input" onChange={event => setWarehouseSearch(event.target.value)} placeholder={ar.common.search} type="search" value={warehouseSearch} /></label><label className="form-field"><span>{ar.inventory.selectWarehouse}</span><select className="input" name="warehouse_id" required defaultValue=""><option value="">{ar.common.select}</option>{warehouses.data?.data.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label><label className="form-field"><span>الكمية</span><input className="input" min="1" name="quantity" type="number" required /></label><label className="form-field"><span>التكلفة</span><input className="input" inputMode="decimal" name="cost_egp" pattern="^(0|[1-9]\d{0,14})(\.\d{1,4})?$" required /></label>{error instanceof ApiError ? <p className="field-error" role="alert">{error.message} {error.details ? formatApiErrorDetails(error.details) : ''}</p> : error instanceof Error ? <p className="field-error" role="alert">{error.message}</p> : null}{saved && <p className="inline-success" role="status">{ar.common.actionSaved}</p>}<button className="button button-primary" disabled={create.isPending} type="submit">تسجيل الاعتماد</button></form>}
  </section>;
}
