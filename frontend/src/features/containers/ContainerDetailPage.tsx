import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type FormEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ApiError } from '../../shared/api/errors';
import { newIdempotencyKey } from '../../shared/api/http';
import { useAuth } from '../../shared/auth/AuthProvider';
import { DataTable, type DataColumn } from '../../shared/components/DataTable';
import { FormField } from '../../shared/components/FormField';
import { Modal } from '../../shared/components/Modal';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import { formatDate, formatMoney } from '../../shared/utils/format';
import { centsToMoney, moneyToCents } from '../../shared/utils/money';
import { listResource, type ListQuery, type Product } from '../inventory/api';
import { listDrivers } from '../admin/referenceApi';
import { listSuppliers } from '../purchases/api';
import {
  addContainerCost,
  addContainerLine,
  configureContainerCostType,
  getContainer,
  payContainerCost,
  setContainerAllocationBasis,
  updateContainerStatus,
  updateContainer,
  type ContainerCost,
  type ContainerCostPayment,
  type ContainerLine,
} from './api';

const optionsQuery: ListQuery = { page: 1, perPage: 100, search: '' };
const amountPattern = /^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$/;

function trackingEventLabel(type: string) {
  return ({
    receipt: 'استلام مخزون',
    reversal: 'عكس استلام',
    transfer: 'نقل بين المواقع',
    status: 'تحديث حالة',
  } as Record<string, string>)[type] ?? type;
}

async function listAllProducts() {
  const first = await listResource<Product>('/products', optionsQuery);
  if (first.meta.last_page <= 1) return first.data;
  const pages = await Promise.all(Array.from({ length: first.meta.last_page - 1 }, (_, index) =>
    listResource<Product>('/products', { ...optionsQuery, page: index + 2 }),
  ));
  return [...first.data, ...pages.flatMap((page) => page.data)];
}

type TreasuryEntry = {
  id: number;
  entry_date: string;
  description: string;
  amount: string;
  direction: 'in' | 'out';
};

export function ContainerDetailPage() {
  const { containerId = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const client = useQueryClient();
  const { user } = useAuth();
  const can = (permission: string) => Boolean(user?.permissions.includes('*') || user?.permissions.includes(permission));
  const canManage = can('containers.manage');
  const canManageCosts = can('costs.manage');
  const canPay = can('costs.pay') && can('treasury.view');
  const canViewCosts = can('costs.view');
  const canViewInventory = can('inventory.view');
  const validId = /^[1-9]\d*$/.test(containerId);
  const keys = useRef<Record<string, string>>({});
  const [editOpen, setEditOpen] = useState(searchParams.get('edit') === '1');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const container = useQuery({
    queryKey: ['/containers', containerId],
    queryFn: () => getContainer(containerId),
    enabled: validId,
  });
  const treasury = useQuery({
    queryKey: ['/treasury/entries', 'container-cost-payments'],
    queryFn: () => listResource<TreasuryEntry>('/treasury/entries', optionsQuery, { direction: 'out' }),
    enabled: validId && canPay && canViewCosts,
  });
  const suppliers = useQuery({
    queryKey: ['/suppliers', 'container-edit-options'],
    queryFn: () => listSuppliers(optionsQuery),
    enabled: validId && canManage && editOpen,
  });
  const drivers = useQuery({
    queryKey: ['/drivers', 'container-edit-options'],
    queryFn: () => listDrivers(optionsQuery),
    enabled: validId && canManage && editOpen,
  });
  const productOptions = useQuery({
    queryKey: ['/products', 'container-line-options'],
    queryFn: listAllProducts,
    enabled: validId && canManage && ['draft', 'in_transit', 'at_port', 'receiving'].includes(container.data?.status ?? ''),
  });

  const closeEdit = () => {
    setEditOpen(false);
    if (searchParams.has('edit')) {
      const next = new URLSearchParams(searchParams);
      next.delete('edit');
      setSearchParams(next, { replace: true });
    }
  };

  const submit = (action: string, operation: (values: FormData, key: string) => Promise<unknown>) => async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    const form = event.currentTarget;
    const key = keys.current[action] ??= newIdempotencyKey();
    try {
      await operation(new FormData(form), key);
      delete keys.current[action];
      setSuccess(ar.common.actionSaved);
      await Promise.all([
        container.refetch(),
        client.invalidateQueries({ queryKey: ['/containers'] }),
        client.invalidateQueries({ queryKey: ['/treasury/entries'] }),
      ]);
      if (action.startsWith('payment-') || action === 'cost' || action === 'container-line') form.reset();
      if (action === 'container-edit') closeEdit();
    } catch (cause) {
      setError(cause instanceof ApiError || cause instanceof Error ? cause.message : ar.common.networkError);
    }
  };

  if (!validId) return <PageState kind="error" title={ar.common.invalidIdentifier} />;
  if (container.isLoading) return <PageState kind="loading" />;
  if (container.isError || !container.data) {
    return <PageState kind="error" message={ar.common.requestFailed} onRetry={() => void container.refetch()} />;
  }

  const current = container.data;
  const nextStatuses = current.status === 'draft'
    ? ['in_transit', 'cancelled'] as const
    : current.status === 'in_transit'
      ? ['at_port', 'cancelled'] as const
      : current.status === 'at_port'
        ? ['cancelled'] as const
        : [] as const;
  const costColumns: DataColumn<ContainerCost>[] = [
    { key: 'type', header: ar.inventory.containerCostType, render: (row) => row.cost_type },
    { key: 'amount', header: ar.inventory.containerCostAmount, render: (row) => formatMoney(row.amount_egp) },
    { key: 'date', header: ar.common.date, render: (row) => row.cost_date ? formatDate(row.cost_date) : '—' },
    { key: 'description', header: ar.common.description, render: (row) => row.description || '—' },
    { key: 'paid', header: 'المدفوع', render: (row) => formatMoney(centsToMoney(row.payments.reduce((sum, payment) => sum + moneyToCents(payment.amount_egp), 0n))) },
  ];
  const paymentColumns: DataColumn<ContainerCostPayment>[] = [
    { key: 'entry', header: ar.inventory.treasuryEntry, render: (row) => String(row.treasury_entry_id) },
    { key: 'amount', header: ar.inventory.containerCostAmount, render: (row) => formatMoney(row.amount_egp) },
    { key: 'date', header: ar.common.date, render: (row) => formatDate(row.paid_at) },
  ];
  const lineColumns: DataColumn<ContainerLine>[] = [
    { key: 'product', header: ar.common.product, render: (row) => `${row.product_name} — ${row.sku ?? '—'}` },
    { key: 'quantity', header: 'الكمية المتوقعة', render: (row) => row.expected_quantity },
    { key: 'received', header: 'تم استلامه', render: (row) => row.received_quantity },
    ...(canViewCosts ? [{ key: 'unit-cost', header: 'سعر الوحدة', render: (row: ContainerLine) => row.purchase_unit_cost_egp ? formatMoney(row.purchase_unit_cost_egp) : '—' }] : []),
  ];
  const recordedCents = current.costs.reduce((sum, cost) => sum + moneyToCents(cost.amount_egp), 0n);
  const paidCents = current.costs.reduce((sum, cost) => sum + cost.payments.reduce((subtotal, payment) => subtotal + moneyToCents(payment.amount_egp), 0n), 0n);
  const remainingCents = recordedCents > paidCents ? recordedCents - paidCents : 0n;

  return (
    <section className="page inventory-page">
      <header className="page-heading">
        <div>
          <h1>{current.container_name || current.container_number}</h1>
          <p>{current.container_number} · {current.origin || '—'} ← {current.destination || '—'}</p>
        </div>
        <div className="row-actions">
          {canManage && ['draft', 'in_transit', 'at_port', 'receiving'].includes(current.status) && (
            <Link className="button button-primary" to={`/containers/${containerId}/receive`}>استلام دفعة</Link>
          )}
          {canManage && canViewCosts && (
            <Link className="button button-secondary" to={`/containers/${containerId}/landed-cost`}>معاينة التكلفة الواصلة</Link>
          )}
          {canManage && current.status !== 'received' && current.status !== 'cancelled' && (
            <button className="button button-secondary" onClick={() => setEditOpen(true)} type="button">تعديل بيانات الحاوية</button>
          )}
          <Link className="button button-secondary" to="/containers">{ar.common.back}</Link>
        </div>
      </header>
      {success && <p className="inline-success" role="status">{success}</p>}
      {error && <p className="field-error" role="alert">{error}</p>}
      <dl className="invoice-detail-summary">
        <div><dt>{ar.inventory.containerStatus}</dt><dd>{ar.inventory.containerStatuses[current.status]}</dd></div>
        <div><dt>المخزن الحالي</dt><dd>{current.current_location_name || '—'}</dd></div>
        <div><dt>المصنع / المورد</dt><dd>{current.supplier_name || '—'}</dd></div>
        <div><dt>مندوب الشحن</dt><dd>{current.driver_name || '—'}</dd></div>
        <div><dt>{ar.inventory.containerOrigin}</dt><dd>{current.origin || '—'}</dd></div>
        <div><dt>{ar.inventory.containerDestination}</dt><dd>{current.destination || '—'}</dd></div>
        <div><dt>{ar.inventory.containerDeparture}</dt><dd>{current.estimated_departure ? formatDate(current.estimated_departure) : '—'}</dd></div>
        <div><dt>{ar.inventory.containerArrival}</dt><dd>{current.estimated_arrival ? formatDate(current.estimated_arrival) : '—'}</dd></div>
        {canViewCosts && <div><dt>{ar.inventory.containerCosts}</dt><dd>{formatMoney(centsToMoney(recordedCents))}</dd></div>}
        {current.allocation_basis && <div><dt>أساس توزيع التكلفة</dt><dd>{current.allocation_basis === 'quantity' ? 'حسب الكمية' : current.allocation_basis === 'value' ? 'حسب قيمة الشراء' : 'يدوي'}</dd></div>}
      </dl>

      {canManage && nextStatuses.length > 0 && (
        <form className="inventory-toolbar" onSubmit={submit('container-status', (values, key) => updateContainerStatus(containerId, {
          status: String(values.get('status') ?? '') as 'in_transit' | 'at_port' | 'cancelled',
          reason: String(values.get('reason') ?? '').trim(),
        }, key))}>
          <label className="form-field"><span>تحديث حالة الحاوية</span><select className="input" name="status" defaultValue={nextStatuses[0]} required>{nextStatuses.map((status) => <option key={status} value={status}>{ar.inventory.containerStatuses[status]}</option>)}</select></label>
          <FormField id="container-status-reason" label={ar.common.reason} name="reason" maxLength={1000} required />
          <button className="button button-secondary" type="submit">تسجيل الحالة</button>
        </form>
      )}

      {current.status_history.length > 0 && (
        <section aria-labelledby="container-status-history-title">
          <h2 id="container-status-history-title">سجل حالات الحاوية</h2>
          <ol className="activity-list">
            {current.status_history.map((item) => <li key={item.id}>
              <strong>{ar.inventory.containerStatuses[item.status]}</strong> · {formatDate(item.changed_at)}
              {item.actor_name && <> · {item.actor_name}</>}{item.reason && <> · {item.reason}</>}
            </li>)}
          </ol>
        </section>
      )}

      {current.tracking_events.length > 0 && (
        <section aria-labelledby="container-tracking-title">
          <h2 id="container-tracking-title">تتبع الحاوية</h2>
          <ol className="activity-list">
            {current.tracking_events.map((event) => <li key={event.id}>
              <strong>{trackingEventLabel(event.event_type)}</strong> · {formatDate(event.occurred_at)}
              {event.reference_number && <> · <bdi>{event.reference_number}</bdi></>}
              {(event.from_location_name || event.to_location_name) && <> · من {event.from_location_name || '—'} إلى {event.to_location_name || '—'}</>}
              {event.quantity !== null && <> · الكمية {event.quantity}</>}
              {canViewCosts && event.amount_egp && <> · {formatMoney(event.amount_egp)}</>}
              {event.details && <> · {event.details}</>}
            </li>)}
          </ol>
        </section>
      )}

      {current.lines.length > 0 && (
        <section aria-labelledby="container-lines-title">
          <h2 id="container-lines-title">أصناف الحاوية</h2>
          <DataTable columns={lineColumns} rows={current.lines} getRowKey={(row) => row.id} emptyMessage={ar.common.noResults} />
        </section>
      )}

      {canManage && ['draft', 'in_transit', 'at_port', 'receiving'].includes(current.status) && (
        <section aria-labelledby="container-edit-lines-title">
          <h2 id="container-edit-lines-title">إدارة أصناف الحاوية</h2>
          {productOptions.isError ? <PageState kind="error" message="تعذر تحميل المنتجات لإضافة سطر." onRetry={() => void productOptions.refetch()} /> : productOptions.isLoading ? <PageState kind="loading" /> : <form className="inventory-toolbar" onSubmit={submit('container-line', (values, key) => {
            const quantity = String(values.get('expected_quantity') ?? '');
            const purchaseValue = String(values.get('purchase_value_egp') ?? '');
            if (!/^[1-9]\d*$/.test(quantity) || !amountPattern.test(purchaseValue)) throw new Error('أدخل كمية وإجمالي شراء صحيحين.');
            return addContainerLine(containerId, {
              product_id: Number(values.get('product_id')),
              expected_quantity: Number(quantity),
              purchase_value_egp: purchaseValue,
              notes: String(values.get('notes') ?? '').trim() || null,
            }, key);
          })}>
            <label className="form-field"><span>{ar.common.product}</span><select className="input" name="product_id" defaultValue="" required><option value="">{ar.common.select}</option>{productOptions.data?.filter((product) => product.is_active && !current.lines.some((line) => line.product_id === product.id)).map((product) => <option key={product.id} value={product.id}>{product.name} — {product.sku}</option>)}</select></label>
            <FormField id="container-line-quantity" label={ar.inventory.containerExpectedQuantity} name="expected_quantity" type="number" min="1" step="1" required />
            <FormField id="container-line-value" label={ar.inventory.containerPurchaseValue} name="purchase_value_egp" inputMode="decimal" pattern="^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$" required />
            <FormField id="container-line-notes" label={ar.customers.notes} name="notes" maxLength={500} />
            <button className="button button-secondary" type="submit">إضافة صنف</button>
          </form>}
          {canViewCosts && current.receipts.length === 0 && <form className="inventory-toolbar" onSubmit={submit('container-allocation-basis', (values, key) => setContainerAllocationBasis(containerId, String(values.get('allocation_basis')) as 'value' | 'quantity' | 'manual', key))}>
            <label className="form-field"><span>أساس توزيع المصروفات</span><select className="input" name="allocation_basis" defaultValue={current.allocation_basis ?? 'quantity'}><option value="quantity">حسب الكمية</option><option value="value">حسب قيمة الشراء</option><option value="manual">توزيع يدوي</option></select></label>
            <button className="button button-secondary" type="submit">حفظ أساس التوزيع</button>
          </form>}
        </section>
      )}

      {current.receipts.length > 0 && (
        <section aria-labelledby="container-receipts-title">
          <h2 id="container-receipts-title">استلام المخزون وحركاته</h2>
          {current.receipts.map((receipt) => (
            <article className="dashboard-panel" key={receipt.id}>
              <h3><Link to={`/containers/${containerId}/receipts/${receipt.id}`}><bdi>{receipt.movement_number || `#${receipt.inventory_movement_id}`}</bdi></Link></h3>
              <p>تاريخ الاستلام: {formatDate(receipt.movement_date || receipt.received_at)} · الحالة: {receipt.status === 'posted' ? 'مرحل' : 'معكوس'}</p>
              <ul>
                {receipt.lines.map((line) => (
                  <li key={`${receipt.id}-${line.container_line_id}`}>
                    {line.product_name || `الصنف ${line.product_id ?? line.container_line_id}`} — الكمية: {line.quantity ?? line.received_quantity} — المخزن: {line.warehouse_name || current.current_location_name || '—'}{' '}
                    {canViewInventory && line.movement_line_id && <Link to={`/inventory/movements/${line.movement_line_id}`}>تفاصيل حركة المخزون</Link>}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>
      )}

      <section aria-labelledby="container-costs-title">
        <h2 id="container-costs-title">{ar.inventory.containerCosts}</h2>
        {!canViewCosts ? <PageState kind="denied" /> : (
          <>
            <div className="dashboard-grid">
              <article className="stat-card"><span>إجمالي التكلفة الفعلية</span><strong>{formatMoney(centsToMoney(recordedCents))}</strong></article>
              <article className="stat-card"><span>المدفوع</span><strong>{formatMoney(centsToMoney(paidCents))}</strong></article>
              <article className="stat-card"><span>المتبقي</span><strong>{formatMoney(centsToMoney(remainingCents))}</strong></article>
            </div>
            <DataTable columns={costColumns} rows={current.costs} getRowKey={(row) => row.id} emptyMessage={ar.common.noResults} />
            {current.costs.map((cost) => (
              <div key={`payments-${cost.id}`}>
                <h3>{ar.inventory.costPayments}: {cost.cost_type}</h3>
                <DataTable columns={paymentColumns} rows={cost.payments} getRowKey={(row) => row.id} emptyMessage={ar.common.noResults} />
                {canPay && treasury.data && (
                  <form className="inventory-toolbar" onSubmit={submit(`payment-${cost.id}`, (values, key) => {
                    const amount = String(values.get('amount_egp') ?? '');
                    if (!amountPattern.test(amount)) throw new Error(ar.inventory.invalidUnitCost);
                    return payContainerCost(cost.id, {
                      treasury_entry_id: Number(values.get('treasury_entry_id')),
                      amount_egp: amount,
                    }, key);
                  })}>
                    <label className="form-field"><span>{ar.inventory.treasuryEntry}</span><select className="input" name="treasury_entry_id" defaultValue="" required><option value="">{ar.common.select}</option>{treasury.data.data.map((entry) => <option key={entry.id} value={entry.id}>{entry.entry_date} — {entry.description} — {formatMoney(entry.amount)}</option>)}</select></label>
                    <FormField id={`container-payment-amount-${cost.id}`} label={ar.inventory.containerCostAmount} name="amount_egp" inputMode="decimal" pattern="^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$" required />
                    <button className="button button-primary" type="submit">{ar.inventory.payContainerCost}</button>
                  </form>
                )}
              </div>
            ))}
            {canManageCosts && (
              <form className="stack-form" onSubmit={submit('cost', async (values, key) => {
                const amount = String(values.get('amount_egp') ?? '');
                if (!amountPattern.test(amount)) throw new Error(ar.inventory.invalidUnitCost);
                const costType = String(values.get('cost_type') ?? '').trim();
                const include = values.get('include_in_inventory_cost') === 'on';
                await configureContainerCostType(costType, include);
                return addContainerCost(containerId, {
                  cost_type: costType,
                  amount_egp: amount,
                  description: String(values.get('description') ?? '').trim() || null,
                  cost_date: String(values.get('cost_date') ?? '') || null,
                  include_in_inventory_cost: include,
                  supplier_id: null,
                  original_amount_reference: null,
                  exchange_rate_reference: null,
                  original_currency_code_reference: null,
                }, key);
              })}>
                <h3>{ar.inventory.addContainerCost}</h3>
                <FormField id="container-cost-type" label={ar.inventory.containerCostType} name="cost_type" required maxLength={80} />
                <FormField id="container-cost-amount" label={ar.inventory.containerCostAmount} name="amount_egp" inputMode="decimal" pattern="^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$" required />
                <FormField id="container-cost-date" label={ar.common.date} name="cost_date" type="date" />
                <FormField id="container-cost-description" label={ar.common.description} name="description" maxLength={500} />
                <label className="inventory-checkbox"><input type="checkbox" name="include_in_inventory_cost" />{ar.inventory.includeInInventoryCost}</label>
                <button className="button button-primary" type="submit">{ar.inventory.addContainerCost}</button>
              </form>
            )}
          </>
        )}
      </section>

      {canManage && (
        <Modal open={editOpen} title="تعديل بيانات الحاوية" onClose={closeEdit}>
          <form className="stack-form" onSubmit={submit('container-edit', async (values, key) => {
            await updateContainer(containerId, {
              container_name: String(values.get('container_name') ?? '').trim() || null,
              container_number: String(values.get('container_number') ?? '').trim(),
              supplier_id: String(values.get('supplier_id') ?? '') ? Number(values.get('supplier_id')) : null,
              shipping_driver_id: String(values.get('shipping_driver_id') ?? '') ? Number(values.get('shipping_driver_id')) : null,
              trip_reference: String(values.get('trip_reference') ?? '').trim() || null,
              origin: String(values.get('origin') ?? '').trim() || null,
              destination: String(values.get('destination') ?? '').trim() || null,
              notes: String(values.get('notes') ?? '').trim() || null,
              estimated_departure: String(values.get('estimated_departure') ?? '') || null,
              estimated_arrival: String(values.get('estimated_arrival') ?? '') || null,
            }, key);
          })}>
            <FormField id="container-edit-name" label="اسم الحاوية" name="container_name" defaultValue={current.container_name ?? ''} maxLength={160} required />
            <FormField id="container-edit-number" label={ar.inventory.containerNumber} name="container_number" defaultValue={current.container_number} maxLength={100} required />
            <label className="form-field"><span>المصنع / المورد</span><select className="input" name="supplier_id" defaultValue={current.supplier_id ?? ''}><option value="">{ar.common.select}</option>{suppliers.data?.data.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label>
            <label className="form-field"><span>مندوب الشحن</span><select className="input" name="shipping_driver_id" defaultValue={current.shipping_driver_id ?? ''}><option value="">{ar.common.select}</option>{drivers.data?.data.filter((driver) => driver.is_active).map((driver) => <option key={driver.id} value={driver.id}>{driver.name}{driver.shipping_company ? ` — ${driver.shipping_company}` : ''}</option>)}</select></label>
            <FormField id="container-edit-trip" label="مرجع الرحلة" name="trip_reference" defaultValue={current.trip_reference ?? ''} maxLength={100} />
            <FormField id="container-edit-origin" label={ar.inventory.containerOrigin} name="origin" defaultValue={current.origin ?? ''} maxLength={160} />
            <FormField id="container-edit-destination" label={ar.inventory.containerDestination} name="destination" defaultValue={current.destination ?? ''} maxLength={160} />
            <FormField id="container-edit-departure" label={ar.inventory.containerDeparture} name="estimated_departure" type="date" defaultValue={current.estimated_departure?.slice(0, 10) ?? ''} />
            <FormField id="container-edit-arrival" label={ar.inventory.containerArrival} name="estimated_arrival" type="date" defaultValue={current.estimated_arrival?.slice(0, 10) ?? ''} />
            <label className="form-field"><span>{ar.customers.notes}</span><textarea className="input" name="notes" rows={3} defaultValue={current.notes ?? ''} /></label>
            <div className="modal-actions"><button className="button button-secondary" onClick={closeEdit} type="button">{ar.common.cancel}</button><button className="button button-primary" type="submit">{ar.common.save}</button></div>
          </form>
        </Modal>
      )}
    </section>
  );
}
