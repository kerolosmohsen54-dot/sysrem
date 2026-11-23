import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ApiError, formatApiErrorDetails } from '../../shared/api/errors';
import { useAuth } from '../../shared/auth/AuthProvider';
import { DataTable, type DataColumn } from '../../shared/components/DataTable';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import type { ListQuery } from '../inventory/api';
import { createDriver, listDrivers, listTrash, restoreTrashRecord, updateDriver, type ShippingDriver, type TrashRecord } from './referenceApi';

const query: ListQuery = { page: 1, perPage: 50, search: '' };
function errorState(error: unknown) { const denied = error instanceof ApiError && error.status === 403; return <PageState kind={denied ? 'denied' : 'error'} message={denied ? ar.common.permissionDenied : ar.common.requestFailed} />; }

export function ShippingDriversPage() {
  const { user } = useAuth(); const client = useQueryClient();
  const canManage = Boolean(user?.permissions.includes('*') || user?.permissions.includes('shipping_drivers.manage'));
  const [includeInactive, setIncludeInactive] = useState(false); const [search, setSearch] = useState(''); const [error, setError] = useState<unknown>(null);
  const driverQuery = { ...query, search };
  const result = useQuery({ queryKey: ['/drivers', includeInactive, search], queryFn: () => listDrivers(driverQuery, includeInactive), retry: false });
  const create = useMutation({ mutationFn: createDriver, onSuccess: () => client.invalidateQueries({ queryKey: ['/drivers'] }), onError: setError });
  const update = useMutation({ mutationFn: ({ id, active }: { id: number; active: boolean }) => updateDriver(id, { is_active: active }), onSuccess: () => client.invalidateQueries({ queryKey: ['/drivers'] }), onError: setError });
  const columns: DataColumn<ShippingDriver>[] = [
    { key: 'name', header: ar.common.name, render: row => row.name },
    { key: 'company', header: 'شركة الشحن', render: row => row.shipping_company ?? '—' },
    { key: 'containers', header: 'الحاويات', render: row => <Link to={`/containers?driverId=${row.id}`}>{row.containers_count}</Link> },
    { key: 'trips', header: 'الرحلات / أذونات التسليم', render: row => <Link to={`/deliveries?driverId=${row.id}`}>{row.trips_count}</Link> },
    { key: 'status', header: ar.common.status, render: row => row.is_active ? ar.common.active : ar.common.inactive },
    ...(canManage ? [{ key: 'actions', header: ar.common.actions, render: (row: ShippingDriver) => <button className="button button-secondary" onClick={() => update.mutate({ id: row.id, active: !row.is_active })} type="button">{row.is_active ? 'تعطيل' : 'تفعيل'}</button> }] : []),
  ];
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); create.mutate({ name: String(data.get('name') ?? '').trim(), shipping_company: String(data.get('shipping_company') ?? '').trim() || null }); };
  if (result.isLoading) return <PageState kind="loading" />;
  if (result.isError || !result.data) return errorState(result.error);
  return <section className="page inventory-page"><header className="page-heading"><div><h1>سائقو شركة الشحن</h1><p>إدارة السائقين وشركات الشحن المرتبطة بهم.</p></div></header>
    <label className="inventory-search"><span>{ar.common.search}</span><input className="input" type="search" value={search} onChange={e => setSearch(e.currentTarget.value)} /></label>
    <label className="inventory-checkbox"><input checked={includeInactive} onChange={e => setIncludeInactive(e.currentTarget.checked)} type="checkbox" />عرض غير النشطين</label>
    <DataTable columns={columns} emptyMessage={ar.common.noResults} getRowKey={row => row.id} rows={result.data.data} />
    <nav aria-label={ar.inventory.paginationLabel} className="inventory-pagination"><span>{ar.common.page} {result.data.meta.current_page} {ar.common.of} {result.data.meta.last_page}</span><span>{result.data.meta.total} سائق</span></nav>
    {canManage && <form className="stack-form" onSubmit={submit}><h2>إضافة سائق</h2><label className="form-field"><span>{ar.common.name}</span><input className="input" name="name" maxLength={160} required /></label><label className="form-field"><span>شركة الشحن</span><input className="input" name="shipping_company" maxLength={160} /></label>{error instanceof ApiError && <p className="field-error" role="alert">{error.message}{error.details ? ` — ${formatApiErrorDetails(error.details)}` : ''}</p>}<button className="button button-primary" disabled={create.isPending} type="submit">{ar.common.add}</button></form>}
  </section>;
}

export function RecycleBinPage() {
  const client = useQueryClient(); const [error, setError] = useState<unknown>(null);
  const result = useQuery({ queryKey: ['/admin/trash', query], queryFn: () => listTrash(query), retry: false });
  const restore = useMutation({ mutationFn: restoreTrashRecord, onSuccess: async () => { setError(null); await client.invalidateQueries({ queryKey: ['/admin/trash'] }); }, onError: setError });
  const columns: DataColumn<TrashRecord>[] = [
    { key: 'label', header: ar.common.name, render: row => row.label },
    { key: 'type', header: 'نوع السجل', render: row => row.entity_type },
    { key: 'deleted', header: 'تاريخ الأرشفة', render: row => row.deleted_at },
    { key: 'action', header: ar.common.actions, render: row => <button className="button button-secondary" disabled={restore.isPending} onClick={() => restore.mutate(row.id)} type="button">استعادة</button> },
  ];
  if (result.isLoading) return <PageState kind="loading" />;
  if (result.isError || !result.data) return errorState(result.error);
  return <section className="page inventory-page"><header className="page-heading"><div><h1>سلة المحذوفات</h1><p>استعادة السجلات المؤرشفة. الحذف النهائي غير متاح.</p></div></header>
    {error instanceof ApiError && <p className="field-error" role="alert">{error.message}</p>}
    <DataTable columns={columns} emptyMessage={ar.common.noResults} getRowKey={row => row.id} rows={result.data.data} />
    <nav aria-label={ar.inventory.paginationLabel} className="inventory-pagination"><span>{ar.common.page} {result.data.meta.current_page} {ar.common.of} {result.data.meta.last_page}</span></nav>
  </section>;
}
