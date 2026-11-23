import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../shared/api/errors';
import { useAuth } from '../../shared/auth/AuthProvider';
import { DataTable, type DataColumn } from '../../shared/components/DataTable';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import type { ListQuery } from '../inventory/api';
import { emptyTrash, listTrash, permanentlyDeleteTrashRecord, restoreTrashRecord, type TrashRecord } from './referenceApi';

export function RecycleBinPage() {
  const client = useQueryClient();
  const { user } = useAuth();
  const [query, setQuery] = useState<ListQuery>({ page: 1, perPage: 50, search: '' });
  const [entityType, setEntityType] = useState('');
  const [error, setError] = useState<unknown>(null);
  const filters: Record<string, string> = entityType ? { entity_type: entityType } : {};
  const result = useQuery({ queryKey: ['/admin/trash', query, filters], queryFn: () => listTrash(query, filters), retry: false });
  const canDelete = Boolean(user?.permissions.includes('*') || user?.permissions.includes('trash.delete'));
  const canEmpty = Boolean(user?.permissions.includes('*') || user?.permissions.includes('trash.empty'));
  const canRestore = Boolean(user?.permissions.includes('*') || user?.permissions.includes('trash.restore'));
  const invalidate = () => Promise.all([
    client.invalidateQueries({ queryKey: ['/admin/trash'] }),
    client.invalidateQueries({ queryKey: ['/containers'] }),
  ]);
  const restore = useMutation({ mutationFn: restoreTrashRecord, onSuccess: async () => { setError(null); await invalidate(); }, onError: setError });
  const remove = useMutation({ mutationFn: permanentlyDeleteTrashRecord, onSuccess: async () => { setError(null); await invalidate(); }, onError: setError });
  const empty = useMutation({ mutationFn: emptyTrash, onSuccess: async (response) => { setError(null); window.alert(`تم حذف ${response.data.deleted_count} سجل. المتعذر حذفها لارتباطها بسجلات أخرى: ${response.data.blocked_count}.`); await invalidate(); }, onError: setError });
  const columns: DataColumn<TrashRecord>[] = [
    { key: 'label', header: ar.common.name, render: row => row.label },
    { key: 'type', header: 'نوع السجل', render: row => row.entity_type },
    { key: 'user', header: 'المستخدم', render: row => row.deleted_by_name ?? '—' },
    { key: 'deleted', header: 'تاريخ الحذف', render: row => row.deleted_at },
    { key: 'actions', header: ar.common.actions, render: row => <div className="button-row">
      {canRestore && <button className="button button-secondary" disabled={restore.isPending} onClick={() => restore.mutate(row.id)} type="button">استعادة</button>}
      {canDelete && <button className="button button-secondary" disabled={remove.isPending} onClick={() => { if (window.confirm('سيُحذف السجل نهائياً ولا يمكن استعادته. متابعة؟')) remove.mutate(row.id); }} type="button">حذف نهائي</button>}
    </div> },
  ];
  if (result.isLoading) return <PageState kind="loading" />;
  if (result.isError || !result.data) {
    const denied = result.error instanceof ApiError && result.error.status === 403;
    return <PageState kind={denied ? 'denied' : 'error'} message={denied ? ar.common.permissionDenied : ar.common.requestFailed} />;
  }
  return <section className="page inventory-page">
    <header className="page-heading"><div><h1>سلة المحذوفات</h1><p>استعادة السجلات أو حذفها نهائياً بعد التأكيد.</p></div>
      {canEmpty && result.data.data.length > 0 && <button className="button button-secondary" disabled={empty.isPending} onClick={() => { if (window.confirm('سيتم حذف كل السجلات الممكن حذفها نهائياً. متابعة؟')) empty.mutate(); }} type="button">إفراغ السلة</button>}
    </header>
    <div className="filter-bar">
      <label className="form-field"><span>{ar.common.search}</span><input className="input" type="search" value={query.search} onChange={event => setQuery(current => ({ ...current, page: 1, search: event.currentTarget.value }))} /></label>
      <label className="form-field"><span>نوع السجل</span><select className="input" value={entityType} onChange={event => setEntityType(event.currentTarget.value)}><option value="">كل الأنواع</option>{['customer', 'product', 'category', 'warehouse', 'governorate', 'shipping_driver'].map(type => <option key={type} value={type}>{type}</option>)}</select></label>
    </div>
    {error instanceof ApiError && <p className="field-error" role="alert">{error.message}</p>}
    <DataTable columns={columns} emptyMessage={ar.common.noResults} getRowKey={row => row.id} rows={result.data.data} />
    <nav aria-label={ar.inventory.paginationLabel} className="inventory-pagination"><button className="button button-secondary" disabled={query.page <= 1} onClick={() => setQuery(current => ({ ...current, page: current.page - 1 }))} type="button">{ar.common.previous}</button><span>{ar.common.page} {query.page} {ar.common.of} {result.data.meta.last_page}</span><button className="button button-secondary" disabled={query.page >= result.data.meta.last_page} onClick={() => setQuery(current => ({ ...current, page: current.page + 1 }))} type="button">{ar.common.next}</button></nav>
  </section>;
}
