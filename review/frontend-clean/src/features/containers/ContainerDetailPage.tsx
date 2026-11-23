import { useQuery } from '@tanstack/react-query';
import { useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError } from '../../shared/api/errors';
import { useAuth } from '../../shared/auth/AuthProvider';
import { DataTable, type DataColumn } from '../../shared/components/DataTable';
import { FormField } from '../../shared/components/FormField';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import { formatDate, formatMoney, formatQuantity } from '../../shared/utils/format';
import { listResource, type ListQuery, type Product, type Warehouse } from '../inventory/api';
import {
  addContainerCost,
  addContainerLine,
  getContainer,
  listContainerReceipts,
  payContainerCost,
  reverseContainerReceipt,
  setContainerAllocationBasis,
  updateContainerStatus,
  type AllocationBasis,
  type ContainerCost,
  type ContainerCostPayment,
  type ContainerLine,
  type ContainerReceipt,
  type ContainerStatus,
} from './api';

const optionsQuery: ListQuery = { page: 1, perPage: 100, search: '' };
const amountPattern = /^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$/;

type TreasuryEntry = {
  id: number;
  entry_date: string;
  description: string;
  amount_egp: string;
  direction: 'in' | 'out';
};

function safeInteger(value: string): number {
  if (!/^[1-9]\d*$/.test(value)) throw new Error(ar.common.quantityMustBeInteger);
  const parsed = BigInt(value);
  if (parsed > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error(ar.common.quantityMustBeInteger);
  return Number(parsed);
}

function statusLabel(status: ContainerStatus) {
  return ar.inventory.containerStatuses[status];
}

function usePermissions() {
  const { user } = useAuth();
  const has = (permission: string) =>
    Boolean(user?.permissions.includes('*') || user?.permissions.includes(permission));
  return {
    canManage: has('containers.manage'),
    canManageCosts: has('costs.manage'),
    canPay: has('costs.pay') && has('treasury.view'),
    canReverseReceipts: has('inventory.manage'),
    canViewCosts: has('costs.view'),
  };
}

export function ContainerDetailPage() {
  const { containerId = '' } = useParams();
  const validId = /^[1-9]\d*$/.test(containerId);
  const { canManage, canManageCosts, canPay, canReverseReceipts, canViewCosts } = usePermissions();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const keys = useRef<Record<string, string>>({});
  const container = useQuery({
    queryKey: ['/containers', containerId],
    queryFn: () => getContainer(containerId),
    enabled: validId,
  });
  const receipts = useQuery({
    queryKey: ['/containers', containerId, 'receipts'],
    queryFn: () => listContainerReceipts(containerId, { page: 1, perPage: 100, search: '' }),
    enabled: validId,
  });
  const products = useQuery({
    queryKey: ['/products', 'container-line-options'],
    queryFn: () => listResource<Product>('/products', optionsQuery),
    enabled: validId && canManage,
  });
  const warehouses = useQuery({
    queryKey: ['/warehouses', 'container-receipt-options'],
    queryFn: () => listResource<Warehouse>('/warehouses', optionsQuery),
    enabled: validId && canManage,
  });
  const treasury = useQuery({
    queryKey: ['/treasury/entries', 'container-cost-payments'],
    queryFn: () =>
      listResource<TreasuryEntry>('/treasury/entries', optionsQuery, { direction: 'out' }),
    enabled: validId && canPay && canViewCosts,
  });

  const submit =
    (action: string, operation: (values: FormData, key: string) => Promise<unknown>) =>
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setError('');
      setSuccess('');
      const values = new FormData(event.currentTarget);
      const key = (keys.current[action] ??= crypto.randomUUID());
      try {
        await operation(values, key);
        delete keys.current[action];
        setSuccess(ar.common.actionSaved);
        await container.refetch();
        await receipts.refetch();
      } catch (cause) {
        setError(
          cause instanceof ApiError
            ? cause.message
            : cause instanceof Error
              ? cause.message
              : ar.common.networkError,
        );
      }
    };

  if (!validId) return <PageState kind="error" title={ar.common.invalidIdentifier} />;
  if (container.isLoading || receipts.isLoading) return <PageState kind="loading" />;
  if (container.isError || !container.data || receipts.isError || !receipts.data) {
    return (
      <PageState
        kind="error"
        message={ar.common.requestFailed}
        onRetry={() => {
          void container.refetch();
          void receipts.refetch();
        }}
      />
    );
  }

  const current = container.data;
  const lineColumns: DataColumn<ContainerLine>[] = [
    { key: 'product', header: ar.common.product, render: (row) => row.product_name },
    { key: 'sku', header: ar.common.sku, render: (row) => row.sku || '—' },
    {
      key: 'expected',
      header: ar.inventory.containerExpectedQuantity,
      render: (row) => formatQuantity(row.expected_quantity),
    },
    {
      key: 'received',
      header: ar.inventory.containerReceivedQuantity,
      render: (row) => formatQuantity(row.received_quantity),
    },
    ...(canViewCosts
      ? [
          {
            key: 'purchase',
            header: ar.inventory.containerPurchaseValue,
            render: (row: ContainerLine) => formatMoney(row.purchase_value_egp),
          },
        ]
      : []),
  ];
  const costColumns: DataColumn<ContainerCost>[] = [
    { key: 'type', header: ar.inventory.containerCostType, render: (row) => row.cost_type },
    {
      key: 'amount',
      header: ar.inventory.containerCostAmount,
      render: (row) => formatMoney(row.amount_egp),
    },
    {
      key: 'date',
      header: ar.common.date,
      render: (row) => (row.cost_date ? formatDate(row.cost_date) : '—'),
    },
    {
      key: 'included',
      header: ar.inventory.containerAllocationBasis,
      render: (row) => (row.include_in_inventory_cost ? ar.common.yes : ar.common.no),
    },
  ];
  const paymentColumns: DataColumn<ContainerCostPayment>[] = [
    {
      key: 'entry',
      header: ar.inventory.treasuryEntry,
      render: (row) => String(row.treasury_entry_id),
    },
    {
      key: 'amount',
      header: ar.inventory.containerCostAmount,
      render: (row) => formatMoney(row.amount_egp),
    },
    { key: 'paid-at', header: ar.common.date, render: (row) => formatDate(row.paid_at) },
  ];
  const receiptColumns: DataColumn<ContainerReceipt>[] = [
    { key: 'date', header: ar.common.date, render: (row) => formatDate(row.received_at) },
    {
      key: 'warehouse',
      header: ar.common.warehouse,
      render: (row) =>
        warehouses.data?.data.find((item) => item.id === row.warehouse_id)?.name ?? '—',
    },
    {
      key: 'status',
      header: ar.common.status,
      render: (row) => (row.status === 'posted' ? ar.common.posted : ar.common.reversed),
    },
    {
      key: 'details',
      header: ar.common.actions,
      render: (row) => (
        <Link
          className="button button-secondary"
          to={`/containers/${containerId}/receipts/${row.id}`}
        >
          {ar.common.details}
        </Link>
      ),
    },
  ];

  return (
    <section className="page inventory-page">
      <header className="page-heading">
        <div>
          <h1>
            {ar.inventory.containerNumber}: {current.container_number}
          </h1>
          <p>
            {current.origin || '—'} ← {current.destination || '—'} · {statusLabel(current.status)}
          </p>
        </div>
        <div className="row-actions">
          {canViewCosts && (
            <Link className="button button-secondary" to={`/containers/${containerId}/landed-cost`}>
              {ar.inventory.landedCost}
            </Link>
          )}
          {canManage && (
            <Link className="button button-primary" to={`/containers/${containerId}/receive`}>
              {ar.inventory.containerReceipt}
            </Link>
          )}
          <Link className="button button-secondary" to="/containers">
            {ar.common.back}
          </Link>
        </div>
      </header>
      {success && (
        <p className="inline-success" role="status">
          {success}
        </p>
      )}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}

      <dl className="invoice-detail-summary">
        <div>
          <dt>{ar.inventory.containerSupplier}</dt>
          <dd>{current.supplier_name || '—'}</dd>
        </div>
        <div>
          <dt>{ar.inventory.containerOrigin}</dt>
          <dd>{current.origin || '—'}</dd>
        </div>
        <div>
          <dt>{ar.inventory.containerDestination}</dt>
          <dd>{current.destination || '—'}</dd>
        </div>
        <div>
          <dt>{ar.inventory.containerDeparture}</dt>
          <dd>{current.estimated_departure ? formatDate(current.estimated_departure) : '—'}</dd>
        </div>
        <div>
          <dt>{ar.inventory.containerArrival}</dt>
          <dd>{current.estimated_arrival ? formatDate(current.estimated_arrival) : '—'}</dd>
        </div>
        {canViewCosts && (
          <div>
            <dt>{ar.inventory.containerCosts}</dt>
            <dd>{current.expenses_egp == null ? '—' : formatMoney(current.expenses_egp)}</dd>
          </div>
        )}
      </dl>

      <section aria-labelledby="container-lines-title">
        <h2 id="container-lines-title">{ar.inventory.containerLines}</h2>
        {canManage && (products.isLoading || warehouses.isLoading) && <PageState kind="loading" />}
        {canManage && (products.isError || warehouses.isError) && (
          <PageState
            kind="error"
            message={ar.common.requestFailed}
            onRetry={() => {
              void products.refetch();
              void warehouses.refetch();
            }}
          />
        )}
        {current.lines.length ? (
          <DataTable
            columns={lineColumns}
            rows={current.lines}
            getRowKey={(row) => row.id}
            emptyMessage={ar.common.noResults}
          />
        ) : (
          <p className="table-empty" role="status">
            {ar.inventory.containerLineDetailsUnavailable}
          </p>
        )}
        {canManage && products.data && (
          <form
            className="stack-form"
            onSubmit={submit('line', (values, key) => {
              const purchaseValue = String(values.get('purchase_value_egp') ?? '');
              if (!amountPattern.test(purchaseValue)) throw new Error(ar.inventory.invalidUnitCost);
              return addContainerLine(
                containerId,
                {
                  product_id: safeInteger(String(values.get('product_id') ?? '')),
                  expected_quantity: safeInteger(String(values.get('expected_quantity') ?? '')),
                  purchase_value_egp: purchaseValue,
                  notes: String(values.get('notes') ?? '').trim() || null,
                },
                key,
              );
            })}
          >
            <h3>{ar.inventory.addContainerLine}</h3>
            <label className="form-field">
              <span>{ar.common.product}</span>
              <select className="input" name="product_id" required defaultValue="">
                <option value="">{ar.inventory.selectProduct}</option>
                {products.data.data.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>
            <FormField
              id="container-line-quantity"
              label={ar.inventory.containerExpectedQuantity}
              name="expected_quantity"
              inputMode="numeric"
              required
            />
            <FormField
              id="container-line-value"
              label={ar.inventory.containerPurchaseValue}
              name="purchase_value_egp"
              inputMode="decimal"
              pattern="^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$"
              required
            />
            <FormField id="container-line-notes" label={ar.customers.notes} name="notes" />
            <button className="button button-primary" type="submit">
              {ar.common.add}
            </button>
          </form>
        )}
      </section>

      <section aria-labelledby="container-allocation-title">
        <h2 id="container-allocation-title">{ar.inventory.containerAllocationBasis}</h2>
        <p>{ar.inventory.containerAllocationServerOnly}</p>
        {canManage && (
          <form
            className="inventory-toolbar"
            onSubmit={submit('allocation-basis', (values, key) =>
              setContainerAllocationBasis(
                containerId,
                String(values.get('allocation_basis')) as AllocationBasis,
                key,
              ),
            )}
          >
            <label className="form-field">
              <span>{ar.inventory.containerAllocationBasis}</span>
              <select
                className="input"
                name="allocation_basis"
                defaultValue={current.allocation_basis ?? ''}
                required
              >
                <option value="">{ar.common.select}</option>
                <option value="value">{ar.inventory.allocationByValue}</option>
                <option value="quantity">{ar.inventory.allocationByQuantity}</option>
                <option value="manual">{ar.inventory.allocationManual}</option>
              </select>
            </label>
            <button className="button button-secondary" type="submit">
              {ar.common.save}
            </button>
          </form>
        )}
      </section>

      <section aria-labelledby="container-costs-title">
        <h2 id="container-costs-title">{ar.inventory.containerCosts}</h2>
        {!canViewCosts ? (
          <PageState kind="denied" />
        ) : current.costs.length ? (
          <DataTable
            columns={costColumns}
            rows={current.costs}
            getRowKey={(row) => row.id}
            emptyMessage={ar.common.noResults}
          />
        ) : (
          <PageState kind="empty" title={ar.common.noResults} />
        )}
        {canViewCosts && canPay && treasury.isError && (
          <PageState
            kind="error"
            message={ar.common.requestFailed}
            onRetry={() => void treasury.refetch()}
          />
        )}
        {canViewCosts && canPay && treasury.isLoading && <PageState kind="loading" />}
        {canViewCosts && canPay && treasury.data?.data.length === 0 && (
          <PageState kind="empty" title={ar.inventory.noOutgoingTreasuryEntries} />
        )}
        {canViewCosts &&
          current.costs.map((cost) => (
            <div key={`payments-${cost.id}`}>
              <h3>
                {ar.inventory.costPayments}: {cost.cost_type}
              </h3>
              <DataTable
                columns={paymentColumns}
                rows={cost.payments}
                getRowKey={(row) => row.id}
                emptyMessage={ar.common.noResults}
              />
            </div>
          ))}
        {canViewCosts && canManageCosts && (
          <form
            className="stack-form"
            onSubmit={submit('cost', (values, key) => {
              const amount = String(values.get('amount_egp') ?? '');
              if (!amountPattern.test(amount)) throw new Error(ar.inventory.invalidUnitCost);
              return addContainerCost(
                containerId,
                {
                  cost_type: String(values.get('cost_type') ?? '').trim(),
                  amount_egp: amount,
                  description: String(values.get('description') ?? '').trim() || null,
                  cost_date: String(values.get('cost_date') ?? '') || null,
                  include_in_inventory_cost: values.get('include_in_inventory_cost') === 'on',
                  supplier_id: null,
                  original_amount_reference: null,
                  exchange_rate_reference: null,
                  original_currency_code_reference: null,
                },
                key,
              );
            })}
          >
            <h3>{ar.inventory.addContainerCost}</h3>
            <FormField
              id="container-cost-type"
              label={ar.inventory.containerCostType}
              name="cost_type"
              required
              maxLength={80}
            />
            <FormField
              id="container-cost-amount"
              label={ar.inventory.containerCostAmount}
              name="amount_egp"
              inputMode="decimal"
              pattern="^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$"
              required
            />
            <FormField
              id="container-cost-date"
              label={ar.common.date}
              name="cost_date"
              type="date"
            />
            <FormField
              id="container-cost-description"
              label={ar.common.description}
              name="description"
              maxLength={500}
            />
            <label className="inventory-checkbox">
              <input type="checkbox" name="include_in_inventory_cost" defaultChecked />
              {ar.inventory.includeInInventoryCost}
            </label>
            <button className="button button-primary" type="submit">
              {ar.inventory.addContainerCost}
            </button>
          </form>
        )}
      </section>

      {canPay &&
        canViewCosts &&
        treasury.data &&
        current.costs.map((cost) => (
          <section aria-labelledby={`container-cost-payment-${cost.id}`} key={cost.id}>
            <h3 id={`container-cost-payment-${cost.id}`}>
              {ar.inventory.payContainerCost} — {cost.cost_type}
            </h3>
            <form
              className="inventory-toolbar"
              onSubmit={submit(`payment-${cost.id}`, (values, key) => {
                const amount = String(values.get('amount_egp') ?? '');
                if (!amountPattern.test(amount)) throw new Error(ar.inventory.invalidUnitCost);
                return payContainerCost(
                  cost.id,
                  {
                    treasury_entry_id: safeInteger(String(values.get('treasury_entry_id') ?? '')),
                    amount_egp: amount,
                  },
                  key,
                );
              })}
            >
              <label className="form-field">
                <span>{ar.inventory.treasuryEntry}</span>
                <select className="input" name="treasury_entry_id" required defaultValue="">
                  <option value="">{ar.common.select}</option>
                  {treasury.data.data.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.entry_date} — {entry.description} — {formatMoney(entry.amount_egp)}
                    </option>
                  ))}
                </select>
              </label>
              <FormField
                id={`container-payment-amount-${cost.id}`}
                label={ar.inventory.containerCostAmount}
                name="amount_egp"
                inputMode="decimal"
                pattern="^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$"
                required
              />
              <button className="button button-primary" type="submit">
                {ar.inventory.payContainerCost}
              </button>
            </form>
          </section>
        ))}

      <section aria-labelledby="container-status-title">
        <h2 id="container-status-title">{ar.inventory.containerStatus}</h2>
        <p>{statusLabel(current.status)}</p>
        {canManage && (
          <form
            className="inventory-toolbar"
            onSubmit={submit('status', (values, key) =>
              updateContainerStatus(
                containerId,
                {
                  status: String(values.get('status')) as 'in_transit' | 'at_port' | 'cancelled',
                  reason: String(values.get('reason') ?? '').trim(),
                },
                key,
              ),
            )}
          >
            <label className="form-field">
              <span>{ar.inventory.containerStatus}</span>
              <select className="input" name="status" required defaultValue="">
                <option value="">{ar.common.select}</option>
                {(['in_transit', 'at_port', 'cancelled'] as const).map((item) => (
                  <option key={item} value={item}>
                    {statusLabel(item)}
                  </option>
                ))}
              </select>
            </label>
            <FormField
              id="container-status-reason"
              label={ar.common.reason}
              name="reason"
              maxLength={1000}
              required
            />
            <button className="button button-secondary" type="submit">
              {ar.inventory.updateContainerStatus}
            </button>
          </form>
        )}
      </section>

      <section aria-labelledby="container-receipts-title">
        <h2 id="container-receipts-title">{ar.inventory.containerReceipts}</h2>
        <DataTable
          columns={receiptColumns}
          rows={receipts.data.data}
          getRowKey={(row) => row.id}
          emptyMessage={ar.common.noResults}
        />
        {canReverseReceipts &&
          receipts.data.data
            .filter((receipt) => receipt.status === 'posted')
            .map((receipt) => (
              <form
                className="inventory-toolbar"
                key={receipt.id}
                onSubmit={submit(`reverse-${receipt.id}`, (values, key) =>
                  reverseContainerReceipt(
                    containerId,
                    receipt.id,
                    String(values.get('reason') ?? '').trim(),
                    key,
                  ),
                )}
              >
                <FormField
                  id={`reverse-reason-${receipt.id}`}
                  label={ar.inventory.reverseReceiptReason}
                  name="reason"
                  maxLength={1000}
                  required
                />
                <button className="button button-secondary" type="submit">
                  {ar.inventory.reverseReceipt}
                </button>
              </form>
            ))}
      </section>

      <section aria-labelledby="container-history-title">
        <h2 id="container-history-title">{ar.inventory.containerHistory}</h2>
        {current.status_history.length ? (
          <DataTable
            columns={[
              {
                key: 'status',
                header: ar.inventory.containerStatus,
                render: (row) => statusLabel(row.status),
              },
              { key: 'reason', header: ar.common.reason, render: (row) => row.reason || '—' },
              { key: 'actor', header: ar.common.user, render: (row) => row.actor_name || '—' },
              { key: 'date', header: ar.common.date, render: (row) => formatDate(row.changed_at) },
            ]}
            rows={current.status_history}
            getRowKey={(row) => row.id}
            emptyMessage={ar.common.noResults}
          />
        ) : (
          <PageState kind="empty" title={ar.common.noResults} />
        )}
      </section>
    </section>
  );
}
