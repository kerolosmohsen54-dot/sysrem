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
import { formatMoney } from '../../shared/utils/format';
import {
  approveWarehouseReturn,
  createWarehouseReturn,
  getWarehouseReturn,
  listAllResources,
  listWarehouseReturns,
  listWarehouseReturnCandidates,
  returnWarehouseMovement,
  type ListQuery,
  type Product,
  type Warehouse,
  type WarehouseReturn,
  type WarehouseReturnLine,
  type WarehouseReturnCandidate,
} from './api';
import { invalidateInventoryQueries } from './cache';

const pageSize = 20;
const decimal = /^(0|[1-9]\d{0,14})(\.\d{1,4})?$/;
const localDate = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};
type DraftLine = { key: number; product_id: string; quantity: string; unit_cost_egp: string };
const newLine = (key: number): DraftLine => ({ key, product_id: '', quantity: '', unit_cost_egp: '' });

function mutationError(error: unknown) {
  if (error instanceof ApiError) return <p className="field-error" role="alert">{error.message} {formatApiErrorDetails(error.details)}</p>;
  return error instanceof Error ? <p className="field-error" role="alert">{error.message}</p> : null;
}

export function WarehouseReturnsPage() {
  const { user } = useAuth();
  const client = useQueryClient();
  const canCreate = Boolean(user?.permissions.includes('*') || user?.permissions.includes('warehouse_returns.manage'));
  const canApprove = Boolean(user?.permissions.includes('*') || user?.permissions.includes('warehouse_returns.approve'));
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([newLine(1)]);
  const [nextLineKey, setNextLineKey] = useState(2);
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);
  const [candidatePage, setCandidatePage] = useState(1);
  const [candidateSearch, setCandidateSearch] = useState('');
  const [candidateQuantity, setCandidateQuantity] = useState<Record<number, string>>({});
  const [candidateWarehouse, setCandidateWarehouse] = useState<Record<number, string>>({});
  const [candidateCondition, setCandidateCondition] = useState<Record<number, 'good' | 'damaged'>>({});
  const listQuery: ListQuery = { page, perPage: pageSize, search, sortBy: 'return_date', sortDirection: 'desc' };
  const filters = { ...(status ? { status } : {}), ...(warehouseId ? { warehouse_id: warehouseId } : {}) };
  const result = useQuery({ queryKey: ['/warehouse-returns', listQuery, filters], queryFn: () => listWarehouseReturns(listQuery, filters), retry: false });
  const candidateQuery: ListQuery = { page: candidatePage, perPage: pageSize, search: candidateSearch, sortBy: 'movement_date', sortDirection: 'desc' };
  const candidates = useQuery({ queryKey: ['/warehouse-returns/candidates', candidateQuery], queryFn: () => listWarehouseReturnCandidates(candidateQuery), retry: false });
  const warehouses = useQuery({ queryKey: ['/warehouses', 'return-picker'], queryFn: () => listAllResources<Warehouse>('/warehouses', { page: 1, perPage: 100, search: '' }), retry: false });
  const products = useQuery({ queryKey: ['/products', 'return-picker'], queryFn: () => listAllResources<Product>('/products', { page: 1, perPage: 100, search: '' }), enabled: canCreate, retry: false });
  const create = useMutation({
    mutationFn: createWarehouseReturn,
    onSuccess: async () => { setError(null); setSaved(true); setLines([newLine(nextLineKey)]); setNextLineKey(value => value + 1); await client.invalidateQueries({ queryKey: ['/warehouse-returns'] }); },
    onError: cause => { setError(cause); setSaved(false); },
  });
  const approve = useMutation({
    mutationFn: approveWarehouseReturn,
    onSuccess: async () => { setError(null); await Promise.all([invalidateInventoryQueries(client), client.invalidateQueries({ queryKey: ['/warehouse-returns'] })]); },
    onError: setError,
  });
  const postCandidate = useMutation({
    mutationFn: returnWarehouseMovement,
    onSuccess: async () => { setError(null); setSaved(true); await invalidateInventoryQueries(client); },
    onError: cause => { setError(cause); setSaved(false); },
  });
  const candidateColumns: DataColumn<WarehouseReturnCandidate>[] = [
    { key: 'product', header: ar.common.product, render: row => <>{row.product_name} <bdi>{row.sku}</bdi></> },
    { key: 'issued', header: 'الكمية الصادرة', render: row => row.issued_quantity },
    { key: 'returned', header: 'مرتجع سابق', render: row => row.returned_quantity },
    { key: 'available', header: 'المتاح للإرجاع', render: row => row.available_quantity },
    { key: 'source', header: 'المصدر', render: row => row.movement_type === 'transfer' ? `${row.source_warehouse_name} ← ${row.current_warehouse_name ?? ''}` : row.source_warehouse_name },
    { key: 'reference', header: ar.common.reference, render: row => <bdi>{row.source_reference}</bdi> },
    { key: 'date', header: ar.common.date, render: row => <bdi>{row.movement_date}</bdi> },
    { key: 'quantity', header: 'كمية المرتجع', render: row => <input className="input" aria-label={`كمية مرتجع ${row.sku}`} type="number" min="1" max={row.available_quantity} step="1" value={candidateQuantity[row.id] ?? ''} onChange={event => { const value = event.currentTarget.value; setCandidateQuantity(current => ({ ...current, [row.id]: value })); }} /> },
    { key: 'condition', header: 'الحالة', render: row => <select className="input" aria-label={`حالة مرتجع ${row.sku}`} value={candidateCondition[row.id] ?? 'good'} onChange={event => { const condition = event.currentTarget.value as 'good' | 'damaged'; const eligible = (warehouses.data?.data ?? []).filter(location => location.is_active && (condition === 'damaged' ? location.location_type === 'damaged' : location.location_type !== 'damaged') && (row.movement_type !== 'transfer' || location.id !== row.current_warehouse_id)); setCandidateCondition(current => ({ ...current, [row.id]: condition })); setCandidateWarehouse(current => ({ ...current, [row.id]: String(condition === 'good' && eligible.some(location => location.id === row.source_warehouse_id) ? row.source_warehouse_id : eligible[0]?.id ?? '') })); }}><option value="good">سليم</option><option value="damaged">تالف</option></select> },
    { key: 'warehouse', header: 'المخزن المستلم', render: row => <select className="input" aria-label={`المخزن المستلم ${row.sku}`} value={candidateWarehouse[row.id] ?? String(row.source_warehouse_id)} onChange={event => { const value = event.currentTarget.value; setCandidateWarehouse(current => ({ ...current, [row.id]: value })); }}><option value="">{ar.common.select}</option>{(warehouses.data?.data ?? []).filter(location => location.is_active && ((candidateCondition[row.id] ?? 'good') === 'damaged' ? location.location_type === 'damaged' : location.location_type !== 'damaged') && (row.movement_type !== 'transfer' || location.id !== row.current_warehouse_id)).map(location => <option key={location.id} value={location.id}>{location.name}</option>)}</select> },
    ...(canCreate && canApprove ? [{ key: 'approve', header: ar.common.actions, render: (row: WarehouseReturnCandidate) => <button className="button button-primary" type="button" disabled={postCandidate.isPending} onClick={() => { const quantity = Number(candidateQuantity[row.id]); const condition = candidateCondition[row.id] ?? 'good'; const eligible = (warehouses.data?.data ?? []).filter(location => location.is_active && (condition === 'damaged' ? location.location_type === 'damaged' : location.location_type !== 'damaged') && (row.movement_type !== 'transfer' || location.id !== row.current_warehouse_id)); const warehouse = Number(candidateWarehouse[row.id] ?? (condition === 'good' ? row.source_warehouse_id : eligible[0]?.id)); if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > row.available_quantity || !eligible.some(location => location.id === warehouse)) { setError(new Error('أدخل كمية صحيحة واختر مخزناً مستلماً مناسباً.')); return; } setSaved(false); postCandidate.mutate({ source_movement_line_id: row.id, warehouse_id: warehouse, quantity, return_condition: condition, return_date: localDate(), idempotency_key: newIdempotencyKey() }); }}>اعتماد المرتجع</button> }] : []),
  ];
  const columns: DataColumn<WarehouseReturn>[] = [
    { key: 'reference', header: ar.common.reference, render: row => <Link to={`/warehouse-returns/${row.id}`}><bdi>RET-{row.id}</bdi></Link> },
    { key: 'source-reference', header: 'مرجع المصدر', render: row => <bdi>{row.source_reference ?? '—'}</bdi> },
    { key: 'date', header: ar.common.date, render: row => <bdi>{row.return_date}</bdi> },
    { key: 'products', header: ar.common.product, render: row => row.product_names ?? '—' },
    { key: 'warehouse', header: ar.common.warehouse, render: row => row.warehouse_name ?? String(row.warehouse_id) },
    { key: 'quantity', header: ar.common.quantity, render: row => <bdi>{row.total_quantity ?? 0}</bdi> },
    { key: 'status', header: ar.common.status, render: row => displayStatus(row.status) },
    ...(canApprove ? [{ key: 'approve', header: ar.common.actions, render: (row: WarehouseReturn) => row.status === 'draft' ? <button className="button button-secondary" type="button" disabled={approve.isPending} onClick={() => approve.mutate(row.id)}>{ar.common.confirm}</button> : null }] : []),
  ];
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(null); setSaved(false);
    const values = new FormData(event.currentTarget);
    const warehouse = Number(values.get('warehouse_id'));
    const parsedLines: { product_id: number; quantity: number; unit_cost_egp: string }[] = [];
    const seenProducts = new Set<number>();
    for (const line of lines) {
      const product = Number(line.product_id);
      const quantity = Number(line.quantity);
      if (!Number.isSafeInteger(product) || product < 1 || !Number.isSafeInteger(quantity) || quantity < 1 || !decimal.test(line.unit_cost_egp)) {
        setError(new Error('اختر صنفاً وأدخل كمية وتكلفة صحيحتين لكل سطر.')); return;
      }
      if (seenProducts.has(product)) { setError(new Error('لا تكرر الصنف نفسه في المرتجع.')); return; }
      seenProducts.add(product);
      parsedLines.push({ product_id: product, quantity, unit_cost_egp: line.unit_cost_egp });
    }
    if (!Number.isSafeInteger(warehouse) || warehouse < 1) { setError(new Error(ar.inventory.selectWarehouse)); return; }
    create.mutate({ warehouse_id: warehouse, return_date: String(values.get('return_date') ?? ''), reason: String(values.get('reason') ?? '').trim(), idempotency_key: newIdempotencyKey(), lines: parsedLines });
  };

  if (result.isLoading || warehouses.isLoading || (canCreate && products.isLoading)) return <PageState kind="loading" />;
  if (result.isError || warehouses.isError || (canCreate && products.isError) || !result.data || !warehouses.data || (canCreate && !products.data)) {
    const cause = result.error ?? warehouses.error ?? products.error;
    const denied = cause instanceof ApiError && cause.status === 403;
    return <PageState kind={denied ? 'denied' : 'error'} message={denied ? ar.common.permissionDenied : ar.common.requestFailed} onRetry={() => { void result.refetch(); void warehouses.refetch(); void products.refetch(); }} />;
  }
  return <section className="page inventory-page">
    <header className="page-heading"><div><h1>مرتجعات المخازن</h1><p>راجع تفاصيل المرتجع، ثم اعتمده لإضافة الكميات إلى رصيد المخزن وتسجيل حركة واردة.</p></div></header>
    <h2>حركات قابلة للإرجاع</h2>
    <label className="inventory-search"><span>{ar.common.search}</span><input className="input" type="search" value={candidateSearch} onChange={event => { setCandidateSearch(event.currentTarget.value); setCandidatePage(1); }} /></label>
    {candidates.isLoading ? <PageState kind="loading" /> : candidates.isError || !candidates.data ? <PageState kind="error" message={ar.common.requestFailed} onRetry={() => void candidates.refetch()} /> : <><DataTable columns={candidateColumns} rows={candidates.data.data} getRowKey={row => row.id} emptyMessage={ar.common.noResults} /><nav aria-label="صفحات الحركات القابلة للإرجاع" className="inventory-pagination"><button className="button button-secondary" type="button" disabled={candidatePage <= 1} onClick={() => setCandidatePage(value => value - 1)}>{ar.common.previous}</button><span>{ar.common.page} {candidates.data.meta.current_page} {ar.common.of} {candidates.data.meta.last_page}</span><button className="button button-secondary" type="button" disabled={candidatePage >= candidates.data.meta.last_page} onClick={() => setCandidatePage(value => value + 1)}>{ar.common.next}</button></nav></>}
    {mutationError(error)}{saved && <p className="inline-success" role="status">{ar.common.actionSaved}</p>}
    <h2>سجل مرتجعات المخازن</h2>
    <div className="inventory-toolbar inventory-catalog-filters">
      <label className="inventory-search"><span>{ar.common.search}</span><input className="input" type="search" value={search} onChange={event => { setSearch(event.currentTarget.value); setPage(1); }} /></label>
      <label className="form-field"><span>{ar.common.warehouse}</span><select className="input" value={warehouseId} onChange={event => { setWarehouseId(event.currentTarget.value); setPage(1); }}><option value="">{ar.inventory.all}</option>{warehouses.data.data.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
      <label className="form-field"><span>{ar.common.status}</span><select className="input" value={status} onChange={event => { setStatus(event.currentTarget.value); setPage(1); }}><option value="">{ar.inventory.all}</option><option value="draft">مسودة</option><option value="approved">معتمد</option></select></label>
    </div>
    <DataTable columns={columns} emptyMessage={ar.common.noResults} getRowKey={row => row.id} rows={result.data.data} />
    <nav aria-label={ar.inventory.paginationLabel} className="inventory-pagination"><button className="button button-secondary" disabled={page <= 1} onClick={() => setPage(value => value - 1)} type="button">{ar.common.previous}</button><span>{ar.common.page} {result.data.meta.current_page} {ar.common.of} {result.data.meta.last_page}</span><button className="button button-secondary" disabled={page >= result.data.meta.last_page} onClick={() => setPage(value => value + 1)} type="button">{ar.common.next}</button></nav>
    {canCreate && <form className="stack-form" onSubmit={submit}>
      <h2>إنشاء مرتجع مخزني</h2>
      <label className="form-field"><span>{ar.inventory.selectWarehouse}</span><select className="input" name="warehouse_id" required defaultValue=""><option value="">{ar.common.select}</option>{warehouses.data.data.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
      <label className="form-field"><span>{ar.common.date}</span><input className="input" name="return_date" type="date" defaultValue={localDate()} required /></label>
      <section className="invoice-line-editor">
        <header className="page-heading"><h3>الأصناف والكميات المرتجعة</h3><button className="button button-secondary" type="button" onClick={() => { setLines(current => [...current, newLine(nextLineKey)]); setNextLineKey(value => value + 1); }}>إضافة صنف</button></header>
        {lines.map((line, index) => <div className="inventory-toolbar" key={line.key}>
          <label className="form-field"><span>{ar.common.product} {index + 1}</span><select className="input" value={line.product_id} onChange={event => { const value = event.currentTarget.value; setLines(current => current.map(item => item.key === line.key ? { ...item, product_id: value } : item)); }} required><option value="">{ar.common.select}</option>{products?.data?.data.map(row => <option key={row.id} value={row.id}>{row.name} — {row.sku}</option>)}</select></label>
          <label className="form-field"><span>{ar.common.quantity}</span><input className="input" name={`quantity_${line.key}`} min="1" step="1" type="number" value={line.quantity} onChange={event => { const value = event.currentTarget.value; setLines(current => current.map(item => item.key === line.key ? { ...item, quantity: value } : item)); }} required /></label>
          <label className="form-field"><span>{ar.common.unitCost}</span><input className="input" name={`unit_cost_egp_${line.key}`} inputMode="decimal" pattern="^(0|[1-9]\d{0,14})(\.\d{1,4})?$" value={line.unit_cost_egp} onChange={event => { const value = event.currentTarget.value; setLines(current => current.map(item => item.key === line.key ? { ...item, unit_cost_egp: value } : item)); }} required /></label>
          {lines.length > 1 && <button className="button button-secondary" type="button" onClick={() => setLines(current => current.filter(item => item.key !== line.key))}>حذف</button>}
        </div>)}
      </section>
      <label className="form-field"><span>{ar.common.reason}</span><input className="input" maxLength={500} name="reason" required /></label>
      {mutationError(error)}{saved && <p className="inline-success" role="status">{ar.common.actionSaved}</p>}
      <button className="button button-primary" disabled={create.isPending} type="submit">{ar.common.save}</button>
    </form>}
  </section>;
}

export function WarehouseReturnDetailPage() {
  const { returnId = '' } = useParams();
  const id = Number(returnId);
  const valid = /^[1-9]\d*$/.test(returnId);
  const { user } = useAuth();
  const client = useQueryClient();
  const canApprove = Boolean(user?.permissions.includes('*') || user?.permissions.includes('warehouse_returns.approve'));
  const result = useQuery({ queryKey: ['/warehouse-returns', id], queryFn: () => getWarehouseReturn(id), enabled: valid, retry: false });
  const approve = useMutation({ mutationFn: () => approveWarehouseReturn(id), onSuccess: async () => { await Promise.all([invalidateInventoryQueries(client), client.invalidateQueries({ queryKey: ['/warehouse-returns'] })]); } });
  if (!valid) return <PageState kind="error" title={ar.common.invalidIdentifier} />;
  if (result.isLoading) return <PageState kind="loading" />;
  if (result.isError || !result.data) return <PageState kind="error" message={ar.common.requestFailed} onRetry={() => void result.refetch()} />;
  const { return: record, lines } = result.data;
  const columns: DataColumn<WarehouseReturnLine>[] = [
    { key: 'product', header: ar.common.product, render: row => <>{row.product_name} <bdi>{row.sku}</bdi></> },
    { key: 'source', header: 'حركة المصدر', render: row => row.source_movement_line_id ? <Link to={`/inventory/movements/${row.source_movement_line_id}`}>عرض حركة المصدر</Link> : '—' },
    { key: 'condition', header: 'الحالة', render: row => row.return_condition === 'damaged' ? 'تالف' : row.return_condition === 'good' ? 'سليم' : '—' },
    { key: 'quantity', header: ar.common.quantity, render: row => <bdi>{row.quantity}</bdi> },
    { key: 'unit-cost', header: ar.common.unitCost, render: row => formatMoney(row.unit_cost_egp) },
    { key: 'total', header: ar.common.total, render: row => formatMoney(row.line_total_egp) },
    { key: 'movement', header: ar.common.movementType, render: row => row.movement_line_id ? <Link to={`/inventory/movements/${row.movement_line_id}`}>عرض الحركة</Link> : '—' },
  ];
  return <section className="page inventory-page">
    <header className="page-heading"><div><h1>تفاصيل المرتجع <bdi>RET-{record.id}</bdi></h1><p>{record.status === 'approved' ? 'تم اعتماد المرتجع وإضافته إلى رصيد المخزون.' : 'المسودة لا تغير الرصيد حتى اعتمادها.'}</p></div><Link className="button button-secondary" to="/warehouse-returns">{ar.common.back}</Link></header>
    <dl className="inventory-movement-detail">
      <div><dt>{ar.common.reference}</dt><dd><bdi>RET-{record.id}</bdi></dd></div><div><dt>{ar.common.date}</dt><dd><bdi>{record.return_date}</bdi></dd></div>
      <div><dt>{ar.common.warehouse}</dt><dd>{record.warehouse_name ?? record.warehouse_id}</dd></div><div><dt>{ar.common.status}</dt><dd>{displayStatus(record.status)}</dd></div>
      <div><dt>{ar.common.user}</dt><dd>{record.created_by_name ?? '—'}</dd></div><div><dt>{ar.common.reason}</dt><dd>{record.reason}</dd></div>
    </dl>
    <DataTable columns={columns} rows={lines} getRowKey={row => row.id} emptyMessage={ar.common.noResults} />
    {canApprove && record.status === 'draft' && <div className="modal-actions"><button className="button button-primary" type="button" disabled={approve.isPending} onClick={() => approve.mutate()}>{ar.common.confirm}</button>{mutationError(approve.error)}</div>}
  </section>;
}
