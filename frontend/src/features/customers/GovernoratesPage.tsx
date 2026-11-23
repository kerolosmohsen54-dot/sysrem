import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, formatApiErrorDetails } from '../../shared/api/errors';
import { useAuth } from '../../shared/auth/AuthProvider';
import { DataTable, type DataColumn } from '../../shared/components/DataTable';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import type { ListQuery } from '../inventory/api';
import { createGovernorate, deleteGovernorate, listGovernorates, updateGovernorate, type Governorate } from './api';

export function GovernoratesPage() {
  const { user } = useAuth();
  const client = useQueryClient();
  const canManage = Boolean(user?.permissions.includes('*') || user?.permissions.includes('governorates.manage'));
  const [search, setSearch] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState<unknown>(null);
  const query: ListQuery = { page: 1, perPage: 100, search, sortBy: 'sort_order', sortDirection: 'asc' };
  const result = useQuery({ queryKey: ['/reference/governorates', query, includeInactive], queryFn: () => listGovernorates(query, includeInactive) });
  const refresh = () => client.invalidateQueries({ queryKey: ['/reference/governorates'] });
  const create = useMutation({ mutationFn: createGovernorate, onSuccess: async () => { setError(null); const form = document.getElementById('governorate-create-form') as HTMLFormElement | null; form?.reset(); await refresh(); }, onError: setError });
  const update = useMutation({ mutationFn: ({ id, input }: { id: number; input: Partial<Pick<Governorate, 'name' | 'is_active'>> }) => updateGovernorate(id, input), onSuccess: async () => { setError(null); setEditingId(null); await refresh(); }, onError: setError });
  const remove = useMutation({ mutationFn: deleteGovernorate, onSuccess: async () => { setError(null); await refresh(); }, onError: setError });
  const columns: DataColumn<Governorate>[] = [
    { key: 'name', header: 'المحافظة', render: (row) => editingId === row.id ? <input aria-label={`اسم المحافظة ${row.name}`} autoFocus className="input governorate-edit-input" maxLength={120} onChange={(event) => setEditName(event.currentTarget.value)} value={editName} /> : row.name },
    { key: 'customers', header: 'عدد العملاء', render: (row) => <bdi dir="ltr">{row.customers_count}</bdi> },
    { key: 'status', header: ar.common.status, render: (row) => row.is_active ? ar.common.active : ar.common.inactive },
    ...(canManage ? [{ key: 'actions', header: ar.common.actions, render: (row: Governorate) => <div className="governorate-row-actions">
      {editingId === row.id ? <><button className="button button-primary" disabled={update.isPending || !editName.trim()} onClick={() => update.mutate({ id: row.id, input: { name: editName.trim() } })} type="button">{ar.common.save}</button><button className="button button-secondary" onClick={() => setEditingId(null)} type="button">{ar.common.cancel}</button></> : <button aria-label={`تعديل ${row.name}`} className="button button-quiet" onClick={() => { setEditingId(row.id); setEditName(row.name); setError(null); }} type="button">✎</button>}
      <button aria-label={row.is_active ? `تعطيل ${row.name}` : `تفعيل ${row.name}`} className="button button-quiet" disabled={update.isPending} onClick={() => update.mutate({ id: row.id, input: { is_active: !row.is_active } })} type="button">{row.is_active ? '⏸' : '▶'}</button>
      <button aria-label={`حذف ${row.name}`} className="button button-quiet" disabled={remove.isPending} onClick={() => { if (window.confirm(`نقل المحافظة «${row.name}» إلى سلة المحذوفات؟`)) remove.mutate(row.id); }} type="button">🗑</button>
    </div> }] : []),
  ];
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const name = String(new FormData(event.currentTarget).get('name') ?? '').trim(); if (name) create.mutate(name); };
  if (result.isLoading) return <PageState kind="loading" />;
  if (result.isError || !result.data) { const denied = result.error instanceof ApiError && result.error.status === 403; return <PageState kind={denied ? 'denied' : 'error'} message={denied ? ar.common.permissionDenied : ar.common.requestFailed} onRetry={() => void result.refetch()} />; }
  return <section className="page inventory-page governorates-page">
    <header className="page-heading governorates-heading"><div><h1>المحافظات</h1><p>إدارة المحافظات وعدد العملاء المسجلين في كل محافظة.</p></div>
      {canManage && <form className="governorate-create-form" id="governorate-create-form" onSubmit={submit}>
        <label className="form-field"><span>اسم محافظة جديدة</span><input className="input" maxLength={120} name="name" required /></label>
        <button className="button button-primary" disabled={create.isPending} type="submit">{create.isPending ? ar.app.loading : ar.common.add}</button>
      </form>}
    </header>
    <div className="governorate-toolbar"><label className="inventory-search"><span>{ar.common.search}</span><input className="input" onChange={(event) => setSearch(event.currentTarget.value)} type="search" value={search} /></label><label className="inventory-checkbox"><input checked={includeInactive} onChange={(event) => setIncludeInactive(event.currentTarget.checked)} type="checkbox" />عرض غير النشطة</label></div>
    {error !== null && <p className="field-error" role="alert">{error instanceof ApiError ? `${error.message}${error.details ? ` — ${String(formatApiErrorDetails(error.details))}` : ''}` : ar.common.requestFailed}</p>}
    <DataTable className="governorates-table" columns={columns} emptyMessage={ar.common.noResults} getRowKey={(row) => row.id} rows={result.data.data} />
  </section>;
}
