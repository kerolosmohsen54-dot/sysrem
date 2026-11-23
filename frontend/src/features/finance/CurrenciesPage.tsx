import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { ApiError, formatApiErrorDetails } from '../../shared/api/errors';
import { useAuth } from '../../shared/auth/AuthProvider';
import { DataTable, type DataColumn } from '../../shared/components/DataTable';
import { FormField } from '../../shared/components/FormField';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import { createCurrency, listCurrencies, updateCurrency, type CurrencyReference } from './currenciesApi';

const pageQuery = { page: 1, perPage: 100, search: '' };

export function CurrenciesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [includeInactive, setIncludeInactive] = useState(false);
  const [editing, setEditing] = useState<CurrencyReference | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<unknown>(null);
  const canManage = Boolean(user?.permissions.includes('*') || user?.permissions.includes('currencies.manage'));
  const currencies = useQuery({ queryKey: ['/currencies', includeInactive], queryFn: () => listCurrencies(pageQuery, includeInactive), retry: false });
  const refresh = async () => queryClient.invalidateQueries({ queryKey: ['/currencies'] });
  const create = useMutation({ mutationFn: createCurrency, onSuccess: async () => { setMessage(ar.common.actionSaved); setError(null); await refresh(); }, onError: setError });
  const update = useMutation({ mutationFn: ({ id, values }: { id: number; values: Parameters<typeof updateCurrency>[1] }) => updateCurrency(id, values), onSuccess: async () => { setEditing(null); setMessage(ar.common.actionSaved); setError(null); await refresh(); }, onError: setError });

  const columns: DataColumn<CurrencyReference>[] = [
    { key: 'code', header: 'رمز العملة', render: row => row.code },
    { key: 'name', header: ar.common.name, render: row => row.name },
    { key: 'symbol', header: 'الرمز', render: row => row.symbol ?? '—' },
    { key: 'decimal_places', header: 'المنازل العشرية', render: row => row.decimal_places },
    { key: 'status', header: ar.common.status, render: row => row.is_active ? ar.common.active : ar.common.inactive },
    ...(canManage ? [{ key: 'actions', header: ar.common.actions, render: (row: CurrencyReference) => <div className="inline-actions"><button className="button button-secondary" type="button" onClick={() => { setEditing(row); setMessage(''); setError(null); }}>تعديل</button><button className="button button-secondary" type="button" disabled={update.isPending} onClick={() => update.mutate({ id: row.id, values: { is_active: !row.is_active } })}>{row.is_active ? 'إيقاف' : 'تفعيل'}</button></div> }] : []),
  ];

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const input = { name: String(values.get('name') ?? '').trim(), symbol: String(values.get('symbol') ?? '').trim() || null, decimal_places: Number(values.get('decimal_places')) };
    setMessage('');
    if (editing) update.mutate({ id: editing.id, values: input });
    else create.mutate({ code: String(values.get('code') ?? '').trim().toUpperCase(), ...input });
  };

  if (currencies.isLoading) return <PageState kind="loading" />;
  if (currencies.isError || !currencies.data) {
    const denied = currencies.error instanceof ApiError && currencies.error.status === 403;
    return <PageState kind={denied ? 'denied' : 'error'} message={denied ? ar.common.permissionDenied : ar.common.requestFailed} onRetry={() => void currencies.refetch()} />;
  }

  return (
    <section className="page inventory-page">
      <header className="page-heading"><div><h1>{ar.finance.currencies}</h1><p>العملات هنا بيانات مرجعية فقط. تظل القيود والأرصدة المحاسبية بالجنيه المصري.</p></div></header>
      <label className="inventory-checkbox"><input type="checkbox" checked={includeInactive} onChange={event => setIncludeInactive(event.currentTarget.checked)} />عرض العملات الموقوفة</label>
      {message && <p className="inline-alert" role="status">{message}</p>}
      {error instanceof ApiError && <p className="field-error" role="alert">{error.message}{error.details ? ` — ${formatApiErrorDetails(error.details)}` : ''}</p>}
      <DataTable columns={columns} rows={currencies.data.data} getRowKey={row => row.id} emptyMessage={ar.common.noResults} />
      {canManage && <form className="stack-form" onSubmit={submit}>
        <h2>{editing ? 'تعديل العملة' : 'إضافة عملة مرجعية'}</h2>
        {!editing && <FormField id="currency-code" name="code" label="رمز العملة (3 أحرف لاتينية)" maxLength={3} pattern="[A-Za-z]{3}" required />}
        <FormField id="currency-name" name="name" label={ar.common.name} maxLength={100} defaultValue={editing?.name ?? ''} required />
        <FormField id="currency-symbol" name="symbol" label="الرمز" maxLength={8} defaultValue={editing?.symbol ?? ''} />
        <FormField id="currency-decimal-places" name="decimal_places" label="المنازل العشرية" type="number" min={0} max={4} step={1} defaultValue={editing?.decimal_places ?? 2} required />
        <div className="modal-actions"><button className="button button-primary" type="submit" disabled={create.isPending || update.isPending}>{ar.common.save}</button>{editing && <button className="button button-secondary" type="button" onClick={() => setEditing(null)}>إلغاء</button>}</div>
      </form>}
    </section>
  );
}
