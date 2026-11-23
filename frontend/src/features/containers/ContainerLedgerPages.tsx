import { newIdempotencyKey } from '../../shared/api/http';
import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../shared/api/errors';
import { useAuth } from '../../shared/auth/AuthProvider';
import { DataTable, type DataColumn } from '../../shared/components/DataTable';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import { listResource, type ListQuery, type Product, type Warehouse } from '../inventory/api';
import {
  createContainerFundMovement,
  createContainerTransfer,
  getContainer,
  listContainerFunds,
  listContainerTransfers,
  listContainers,
  type ContainerFundMovement,
  type ContainerRecord,
  type ContainerTransfer,
} from './api';

const base: ListQuery = { page: 1, perPage: 50, search: '' };

function deniedOrError(errors: unknown[]) {
  const denied = errors.some((error) => error instanceof ApiError && error.status === 403);
  return <PageState kind={denied ? 'denied' : 'error'} message={denied ? ar.common.permissionDenied : ar.common.requestFailed} />;
}

function errorMessage(error: unknown) {
  if (error instanceof ApiError) return `${error.message} ${JSON.stringify(error.details)}`;
  if (error instanceof Error) return error.message;
  return ar.common.requestFailed;
}

export function ContainerTransfersPage() {
  const { user } = useAuth();
  const client = useQueryClient();
  const canCreate = Boolean(user?.permissions.includes('*') || user?.permissions.includes('inventory.manage'));
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);
  const transfers = useQuery({ queryKey: ['/container-transfers', base], queryFn: () => listContainerTransfers(base), retry: false });
  const products = useQuery({ queryKey: ['/products', 'container-transfer'], queryFn: () => listResource<Product>('/products', { ...base, perPage: 100 }), enabled: canCreate, retry: false });
  const warehouses = useQuery({ queryKey: ['/warehouses', 'container-transfer'], queryFn: () => listResource<Warehouse>('/warehouses', { ...base, perPage: 100 }), enabled: canCreate, retry: false });
  const containers = useQuery({ queryKey: ['/containers', 'container-transfer'], queryFn: () => listContainers({ ...base, perPage: 100 }), enabled: canCreate, retry: false });
  const create = useMutation({
    mutationFn: createContainerTransfer,
    onSuccess: async () => {
      setSaved(true);
      setError(null);
      await Promise.all([
        client.invalidateQueries({ queryKey: ['/container-transfers'] }),
        client.invalidateQueries({ queryKey: ['/containers'] }),
      ]);
    },
    onError: setError,
  });
  const columns: DataColumn<ContainerTransfer>[] = [
    { key: 'number', header: 'رقم النقل', render: (row) => row.transfer_number },
    { key: 'container', header: ar.inventory.containerNumber, render: (row) => row.container_number || '—' },
    { key: 'product', header: ar.nav.products, render: (row) => row.product_name },
    { key: 'from', header: 'من مخزن', render: (row) => row.source_location_name },
    { key: 'to', header: 'إلى مخزن', render: (row) => row.destination_location_name },
    { key: 'quantity', header: 'الكمية', render: (row) => String(row.quantity) },
    { key: 'date', header: ar.common.date, render: (row) => row.transfer_date },
    { key: 'reason', header: ar.common.reason, render: (row) => row.reason },
  ];
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setError(null);
    setSaved(false);
    create.mutate({
      product_id: Number(values.get('product_id')),
      container_id: Number(values.get('container_id')) || null,
      source_location_id: Number(values.get('source_location_id')),
      destination_location_id: Number(values.get('destination_location_id')),
      quantity: Number(values.get('quantity')),
      transfer_date: String(values.get('transfer_date') ?? ''),
      reason: String(values.get('reason') ?? '').trim(),
      idempotency_key: newIdempotencyKey(),
    });
  };

  if (transfers.isLoading || (canCreate && (products.isLoading || warehouses.isLoading))) return <PageState kind="loading" />;
  if (transfers.isError || !transfers.data || (canCreate && (products.isError || warehouses.isError || !products.data || !warehouses.data))) {
    return deniedOrError([transfers.error, products.error, warehouses.error]);
  }

  return (
    <section className="page inventory-page">
      <header className="page-heading"><div><h1>نقل مخزون مرتبط بالحاويات</h1><p>سجّل حركة المخزون بين المواقع، واربطها بالحاوية عند الحاجة لتظهر في سجل التتبع.</p></div></header>
      <DataTable columns={columns} rows={transfers.data.data} getRowKey={(row) => row.id} emptyMessage={ar.common.noResults} />
      {canCreate && <form className="stack-form" onSubmit={submit}>
        <h2>تسجيل نقل مخزون</h2>
        <label className="form-field"><span>{ar.inventory.selectProduct}</span><select className="input" name="product_id" required defaultValue=""><option value="">{ar.common.select}</option>{products.data?.data.map((product) => <option key={product.id} value={product.id}>{product.name} — {product.sku}</option>)}</select></label>
        {containers.data && <label className="form-field"><span>الحاوية المرتبطة (اختياري)</span><select className="input" name="container_id" defaultValue=""><option value="">بدون ربط بحاوية</option>{containers.data.data.map((container: ContainerRecord) => <option key={container.id} value={container.id}>{container.container_number}</option>)}</select></label>}
        {(['source_location_id', 'destination_location_id'] as const).map((field, index) => <label className="form-field" key={field}><span>{index ? 'إلى' : 'من'} {ar.inventory.selectWarehouse}</span><select className="input" name={field} required defaultValue=""><option value="">{ar.common.select}</option>{warehouses.data?.data.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}</select></label>)}
        <label className="form-field"><span>الكمية</span><input className="input" min="1" name="quantity" type="number" required /></label>
        <label className="form-field"><span>{ar.common.date}</span><input className="input" name="transfer_date" type="date" required /></label>
        <label className="form-field"><span>{ar.common.reason}</span><input className="input" name="reason" maxLength={1000} required /></label>
        {error !== null && <p className="field-error" role="alert">{errorMessage(error)}</p>}
        {saved && <p className="inline-success" role="status">{ar.common.actionSaved}</p>}
        <button className="button button-primary" disabled={create.isPending} type="submit">{ar.common.save}</button>
      </form>}
    </section>
  );
}

export function ContainerFundsPage() {
  const { user } = useAuth();
  const client = useQueryClient();
  const canManage = Boolean(user?.permissions.includes('*') || user?.permissions.includes('containers.manage'));
  const canViewCosts = Boolean(user?.permissions.includes('*') || user?.permissions.includes('costs.view'));
  const [containerId, setContainerId] = useState(0);
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);
  const containers = useQuery({ queryKey: ['/containers', 'fund-picker'], queryFn: () => listContainers({ ...base, perPage: 100 }), retry: false });
  const funds = useQuery({ queryKey: ['/container-funds', containerId], queryFn: () => listContainerFunds(containerId, base), enabled: containerId > 0, retry: false });
  const container = useQuery({ queryKey: ['/containers', containerId], queryFn: () => getContainer(String(containerId)), enabled: containerId > 0 && canViewCosts, retry: false });
  const create = useMutation({
    mutationFn: createContainerFundMovement,
    onSuccess: async () => {
      setSaved(true);
      setError(null);
      await client.invalidateQueries({ queryKey: ['/container-funds', containerId] });
    },
    onError: setError,
  });
  const columns: DataColumn<ContainerFundMovement>[] = [
    { key: 'date', header: ar.common.date, render: (row) => row.movement_date },
    { key: 'type', header: ar.common.status, render: (row) => row.movement_type === 'add' ? 'إضافة' : 'سحب' },
    { key: 'department', header: 'القسم', render: (row) => row.department },
    { key: 'reason', header: ar.common.reason, render: (row) => row.reason },
    { key: 'cost', header: 'مصروف الحاوية', render: (row) => row.container_cost_type || '—' },
    { key: 'amount', header: ar.finance.amount, render: (row) => row.amount_egp },
    { key: 'balance', header: 'الرصيد بعد الحركة', render: (row) => row.balance_after_egp },
    { key: 'reference', header: 'المرجع', render: (row) => row.reference || '—' },
  ];
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const amount = String(values.get('amount_egp') ?? '');
    if (!/^(0|[1-9]\d{0,14})(\.\d{1,2})?$/.test(amount)) {
      setError(new Error('أدخل مبلغاً صحيحاً حتى منزلتين عشريتين.'));
      return;
    }
    setError(null);
    setSaved(false);
    create.mutate({
      container_id: containerId,
      container_cost_id: Number(values.get('container_cost_id')) || null,
      movement_type: values.get('movement_type') as 'add' | 'withdraw',
      amount_egp: amount,
      department: String(values.get('department') ?? '').trim(),
      reason: String(values.get('reason') ?? '').trim(),
      reference: String(values.get('reference') ?? '').trim() || null,
      notes: String(values.get('notes') ?? '').trim() || null,
      movement_date: String(values.get('movement_date') ?? ''),
      idempotency_key: newIdempotencyKey(),
    });
  };

  if (containers.isLoading) return <PageState kind="loading" />;
  if (containers.isError || !containers.data) return deniedOrError([containers.error]);
  if (containerId > 0 && funds.isLoading) return <PageState kind="loading" />;
  if (containerId > 0 && (funds.isError || !funds.data)) return deniedOrError([funds.error]);

  return (
    <section className="page inventory-page">
      <header className="page-heading"><div><h1>أموال الحاويات</h1><p>متابعة الإضافات والسحوبات والرصيد لكل حاوية، مع ربط الحركة بمصروفها عند الحاجة.</p></div></header>
      <label className="form-field"><span>{ar.inventory.containerNumber}</span><select className="input" value={containerId || ''} onChange={(event) => { setContainerId(Number(event.currentTarget.value)); setError(null); setSaved(false); }}><option value="">{ar.common.select}</option>{containers.data.data.map((record: ContainerRecord) => <option key={record.id} value={record.id}>{record.container_number}</option>)}</select></label>
      {containerId > 0 && funds.data && <><p className="summary-card">الرصيد الحالي: <strong>{funds.data.meta.balance_egp}</strong></p><DataTable columns={columns} rows={funds.data.data} getRowKey={(row) => row.id} emptyMessage={ar.common.noResults} /></>}
      {canManage && containerId > 0 && <form className="stack-form" onSubmit={submit}>
        <h2>تسجيل حركة أموال</h2>
        <label className="form-field"><span>نوع الحركة</span><select className="input" name="movement_type"><option value="add">إضافة</option><option value="withdraw">سحب</option></select></label>
        <label className="form-field"><span>{ar.finance.amount}</span><input className="input" name="amount_egp" inputMode="decimal" required /></label>
        <label className="form-field"><span>القسم</span><input className="input" name="department" maxLength={160} required /></label>
        <label className="form-field"><span>{ar.common.reason}</span><input className="input" name="reason" maxLength={500} required /></label>
        {canViewCosts && container.data && <label className="form-field"><span>مصروف الحاوية المرتبط (اختياري)</span><select className="input" name="container_cost_id" defaultValue=""><option value="">بدون ربط بمصروف</option>{container.data.costs.map((cost) => <option key={cost.id} value={cost.id}>{cost.cost_type} — {cost.description || cost.amount_egp}</option>)}</select></label>}
        <label className="form-field"><span>{ar.common.date}</span><input className="input" name="movement_date" type="date" required /></label>
        <label className="form-field"><span>المرجع</span><input className="input" name="reference" maxLength={160} /></label>
        <label className="form-field"><span>ملاحظات</span><input className="input" name="notes" maxLength={2000} /></label>
        {error !== null && <p className="field-error" role="alert">{errorMessage(error)}</p>}
        {saved && <p className="inline-success" role="status">{ar.common.actionSaved}</p>}
        <button className="button button-primary" disabled={create.isPending} type="submit">{ar.common.save}</button>
      </form>}
    </section>
  );
}
