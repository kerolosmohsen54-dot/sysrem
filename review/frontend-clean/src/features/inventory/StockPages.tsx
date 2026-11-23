import { useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../shared/api/errors';
import { useAuth } from '../../shared/auth/AuthProvider';
import { DataTable, type DataColumn } from '../../shared/components/DataTable';
import { FormField } from '../../shared/components/FormField';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import { WarehousePicker } from './WarehousePicker';
import {
  listResource,
  listInventoryAdjustments,
  postStockAction,
  type InventoryMovement,
  type ListQuery,
  type Product,
  type StockActionInput,
} from './api';

const defaultListQuery: ListQuery = { page: 1, perPage: 100, search: '' };
const movementLabels: Record<string, string> = {
  opening: ar.common.openingReason,
  receipt: ar.inventory.received,
  sale: ar.inventory.sale,
  return: ar.inventory.return,
  transfer: ar.inventory.transfer,
  adjustment: ar.inventory.adjustment,
  damage: ar.inventory.damagedMovement,
  container_receipt: ar.inventory.containerReceipt,
  reversal: ar.inventory.reversal,
};

export function InventoryMovementsPage() {
  const [query, setQuery] = useState<ListQuery>({ ...defaultListQuery, perPage: 10 });
  const [warehouseId, setWarehouseId] = useState('');
  const [productId, setProductId] = useState('');
  const [movementType, setMovementType] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const products = useQuery({
    queryKey: ['/products', 'movement-filter'],
    queryFn: () => listResource<Product>('/products', defaultListQuery),
  });
  const { user } = useAuth();
  const canViewCosts = Boolean(
    user?.permissions.includes('*') || user?.permissions.includes('costs.view'),
  );
  const result = useQuery({
    queryKey: [
      '/inventory/movements',
      query,
      warehouseId,
      productId,
      movementType,
      fromDate,
      toDate,
    ],
    queryFn: () =>
      listResource<InventoryMovement>('/inventory/movements', query, {
        ...(warehouseId ? { warehouse_id: warehouseId } : {}),
        ...(productId ? { product_id: productId } : {}),
        ...(movementType ? { movement_type: movementType } : {}),
        ...(fromDate ? { from_date: fromDate } : {}),
        ...(toDate ? { to_date: toDate } : {}),
      }),
  });
  const columns: DataColumn<InventoryMovement>[] = [
    {
      key: 'date',
      header: ar.common.date,
      render: (row) =>
        new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium' }).format(
          new Date(`${row.movement_date}T00:00:00`),
        ),
    },
    {
      key: 'type',
      header: ar.common.movementType,
      render: (row) => movementLabels[row.movement_type] ?? row.movement_type,
    },
    { key: 'product', header: ar.common.product, render: (row) => row.product_name },
    { key: 'warehouse', header: ar.common.warehouse, render: (row) => row.warehouse_name },
    { key: 'quantity', header: ar.common.quantity, render: (row) => row.quantity },
    { key: 'reference', header: ar.common.reference, render: (row) => row.reference || '—' },
    { key: 'user', header: ar.common.user, render: (row) => row.created_by_name ?? '—' },
    ...(canViewCosts
      ? [
          {
            key: 'unit-cost',
            header: ar.common.unitCost,
            render: (row: InventoryMovement) => row.unit_cost_egp ?? '—',
          },
        ]
      : []),
  ];
  return (
    <section className="page inventory-page">
      <header className="page-heading">
        <div>
          <h1>{ar.nav.inventoryMovements}</h1>
          <p>{ar.inventory.movementsDescription}</p>
        </div>
      </header>
      <div className="inventory-toolbar">
        <label className="inventory-search">
          <span>{ar.common.search}</span>
          <input
            className="input"
            type="search"
            value={query.search}
            onChange={(event) =>
              setQuery((current) => ({ ...current, search: event.currentTarget.value, page: 1 }))
            }
          />
        </label>
        <WarehousePicker
          id="movement-warehouse-filter"
          label={ar.inventory.filterByWarehouse}
          name="movement_warehouse_filter"
          allowEmpty
          emptyLabel={ar.inventory.all}
          value={warehouseId}
          onChange={(value) => {
            setWarehouseId(value);
            setQuery((current) => ({ ...current, page: 1 }));
          }}
        />
        <label className="inventory-search">
          <span>{ar.inventory.filterByProduct}</span>
          <select
            className="input"
            value={productId}
            onChange={(event) => {
              setProductId(event.currentTarget.value);
              setQuery((current) => ({ ...current, page: 1 }));
            }}
          >
            <option value="">{ar.inventory.all}</option>
            {(products.data?.data ?? []).map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </label>
        <label className="inventory-search">
          <span>{ar.inventory.filterByMovement}</span>
          <select
            className="input"
            value={movementType}
            onChange={(event) => {
              setMovementType(event.currentTarget.value);
              setQuery((current) => ({ ...current, page: 1 }));
            }}
          >
            <option value="">{ar.inventory.all}</option>
            {Object.entries(movementLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="inventory-search">
          <span>{ar.inventory.fromDate}</span>
          <input
            className="input"
            type="date"
            value={fromDate}
            onChange={(event) => {
              setFromDate(event.currentTarget.value);
              setQuery((current) => ({ ...current, page: 1 }));
            }}
          />
        </label>
        <label className="inventory-search">
          <span>{ar.inventory.toDate}</span>
          <input
            className="input"
            type="date"
            value={toDate}
            onChange={(event) => {
              setToDate(event.currentTarget.value);
              setQuery((current) => ({ ...current, page: 1 }));
            }}
          />
        </label>
        <label className="inventory-search">
          <span>{ar.inventory.sortBy}</span>
          <select
            className="input"
            value={query.sortBy ?? ''}
            onChange={(event) =>
              setQuery((current) => ({
                ...current,
                sortBy: event.currentTarget.value || undefined,
                sortDirection: event.currentTarget.value
                  ? (current.sortDirection ?? 'desc')
                  : undefined,
                page: 1,
              }))
            }
          >
            <option value="">{ar.common.defaultOrder}</option>
            <option value="movement_date">{ar.common.date}</option>
            <option value="product_name">{ar.common.product}</option>
          </select>
        </label>
        <label className="inventory-search">
          <span>{ar.inventory.sortDirection}</span>
          <select
            className="input"
            value={query.sortDirection ?? 'desc'}
            disabled={!query.sortBy}
            onChange={(event) =>
              setQuery((current) => ({
                ...current,
                sortDirection: event.currentTarget.value as 'asc' | 'desc',
                page: 1,
              }))
            }
          >
            <option value="asc">{ar.inventory.ascending}</option>
            <option value="desc">{ar.inventory.descending}</option>
          </select>
        </label>
      </div>
      {result.isLoading ? (
        <PageState kind="loading" />
      ) : result.isError ? (
        <PageState
          kind="error"
          message={ar.common.requestFailed}
          onRetry={() => void result.refetch()}
        />
      ) : !result.data ? (
        <PageState kind="loading" />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={result.data.data}
            getRowKey={(row) => row.id}
            emptyMessage={ar.common.noResults}
          />
          <nav className="inventory-pagination" aria-label={ar.inventory.paginationLabel}>
            <button
              className="button button-secondary"
              type="button"
              disabled={query.page <= 1}
              onClick={() => setQuery((current) => ({ ...current, page: current.page - 1 }))}
            >
              {ar.common.previous}
            </button>
            <span>
              {ar.common.page} {query.page} {ar.common.of} {result.data.meta.last_page}
            </span>
            <button
              className="button button-secondary"
              type="button"
              disabled={query.page >= result.data.meta.last_page}
              onClick={() => setQuery((current) => ({ ...current, page: current.page + 1 }))}
            >
              {ar.common.next}
            </button>
          </nav>
        </>
      )}
    </section>
  );
}

type ActionMode = 'adjustment' | 'opening-stock' | 'transfer';

function safeInteger(value: string, allowNegative: boolean): number {
  const pattern = allowNegative ? /^-?\d+$/ : /^\d+$/;
  if (!pattern.test(value)) throw new Error(ar.common.quantityMustBeInteger);
  const integer = BigInt(value);
  const min = allowNegative ? BigInt(Number.MIN_SAFE_INTEGER) : BigInt(1);
  if (integer < min || integer > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(ar.common.quantityMustBeInteger);
  }
  return Number(integer);
}

function AdjustmentHistory() {
  const { user } = useAuth();
  const [query, setQuery] = useState<ListQuery>({ page: 1, perPage: 10, search: '' });
  const canView = Boolean(
    user?.permissions.includes('*') ||
      user?.permissions.includes('products.view') ||
      user?.permissions.includes('inventory.view'),
  );
  const result = useQuery({
    queryKey: ['/inventory/movements', 'adjustments', query],
    queryFn: () => listInventoryAdjustments(query),
    enabled: canView,
  });
  if (!canView) return <PageState kind="denied" />;
  if (result.isLoading) return <PageState kind="loading" />;
  if (result.isError || !result.data) {
    return (
      <PageState
        kind="error"
        message={ar.common.requestFailed}
        onRetry={() => void result.refetch()}
      />
    );
  }

  const columns: DataColumn<InventoryMovement>[] = [
    {
      key: 'date',
      header: ar.common.date,
      render: (row) =>
        new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium' }).format(
          new Date(`${row.movement_date}T00:00:00`),
        ),
    },
    { key: 'product', header: ar.common.product, render: (row) => row.product_name },
    { key: 'warehouse', header: ar.common.warehouse, render: (row) => row.warehouse_name },
    { key: 'quantity', header: ar.common.quantity, render: (row) => row.quantity },
    { key: 'reference', header: ar.common.reference, render: (row) => row.reference || '—' },
    { key: 'user', header: ar.common.user, render: (row) => row.created_by_name ?? '—' },
  ];
  return (
    <section aria-labelledby="adjustment-history-title">
      <h2 id="adjustment-history-title">{ar.inventory.adjustmentHistory}</h2>
      <div className="inventory-toolbar">
        <label className="inventory-search">
          <span>{ar.common.search}</span>
          <input
            className="input"
            type="search"
            value={query.search}
            onChange={(event) => {
              const search = event.currentTarget.value;
              setQuery((current) => ({ ...current, search, page: 1 }));
            }}
          />
        </label>
        <label className="form-field">
          <span>{ar.inventory.sortBy}</span>
          <select
            className="input"
            value={query.sortBy ?? ''}
            onChange={(event) =>
              setQuery((current) => ({
                ...current,
                sortBy: event.currentTarget.value || undefined,
                sortDirection: event.currentTarget.value
                  ? (current.sortDirection ?? 'desc')
                  : undefined,
                page: 1,
              }))
            }
          >
            <option value="">{ar.common.defaultOrder}</option>
            <option value="movement_date">{ar.common.date}</option>
            <option value="product_name">{ar.common.product}</option>
          </select>
        </label>
        <label className="form-field">
          <span>{ar.inventory.sortDirection}</span>
          <select
            className="input"
            value={query.sortDirection ?? 'desc'}
            disabled={!query.sortBy}
            onChange={(event) =>
              setQuery((current) => ({
                ...current,
                sortDirection: event.currentTarget.value as 'asc' | 'desc',
                page: 1,
              }))
            }
          >
            <option value="asc">{ar.inventory.ascending}</option>
            <option value="desc">{ar.inventory.descending}</option>
          </select>
        </label>
      </div>
      <DataTable
        columns={columns}
        rows={result.data.data}
        getRowKey={(row) => row.id}
        emptyMessage={ar.common.noResults}
      />
      <nav className="inventory-pagination" aria-label={ar.inventory.paginationLabel}>
        <button
          type="button"
          className="button button-secondary"
          disabled={query.page <= 1}
          onClick={() => setQuery((current) => ({ ...current, page: current.page - 1 }))}
        >
          {ar.common.previous}
        </button>
        <span>
          {ar.common.page} {query.page} {ar.common.of} {result.data.meta.last_page}
        </span>
        <button
          type="button"
          className="button button-secondary"
          disabled={query.page >= result.data.meta.last_page}
          onClick={() => setQuery((current) => ({ ...current, page: current.page + 1 }))}
        >
          {ar.common.next}
        </button>
      </nav>
    </section>
  );
}

function ActionForm({ mode }: { mode: ActionMode }) {
  const { user } = useAuth();
  const client = useQueryClient();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const idempotencyKey = useRef<string | undefined>(undefined);
  const canSubmit = Boolean(
    user?.permissions.includes('*') || user?.permissions.includes('inventory.manage'),
  );
  const products = useQuery({
    queryKey: ['/products', 'stock-action-options'],
    queryFn: () => listResource<Product>('/products', defaultListQuery),
    enabled: canSubmit,
  });
  const mutation = useMutation({
    mutationFn: ({ input, key }: { input: StockActionInput; key: string }) =>
      postStockAction(input, key),
    onSuccess: async () => {
      idempotencyKey.current = undefined;
      setSuccess(true);
      await Promise.all([
        client.invalidateQueries({ queryKey: ['/inventory/balances'] }),
        client.invalidateQueries({ queryKey: ['/inventory/movements'] }),
      ]);
    },
    onError: (cause) => {
      setError(cause instanceof ApiError ? cause.message : ar.common.networkError);
    },
  });

  if (!canSubmit) {
    return (
      <>
        <PageState kind="denied" />
        {mode === 'adjustment' && <AdjustmentHistory />}
      </>
    );
  }
  if (products.isLoading) return <PageState kind="loading" />;
  if (products.isError) {
    return (
      <PageState kind="error" title={ar.common.requestFailed} message={ar.common.networkError} />
    );
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess(false);
    try {
      const values = new FormData(event.currentTarget);
      const productId = safeInteger(String(values.get('product_id') ?? ''), false);
      const quantity = safeInteger(String(values.get('quantity') ?? ''), mode === 'adjustment');
      if (mode === 'adjustment' && quantity === 0) {
        setError(ar.common.quantityMustBeInteger);
        return;
      }
      const date = String(values.get('movement_date') ?? '');
      const reason = String(values.get('reason') ?? '').trim();
      let input: StockActionInput;
      if (mode === 'transfer') {
        const source = safeInteger(String(values.get('source_warehouse_id') ?? ''), false);
        const destination = safeInteger(
          String(values.get('destination_warehouse_id') ?? ''),
          false,
        );
        if (source === destination) {
          setError(ar.common.distinctWarehouses);
          return;
        }
        input = {
          action: mode,
          product_id: productId,
          source_warehouse_id: source,
          destination_warehouse_id: destination,
          quantity,
          movement_date: date,
          reason,
        };
      } else {
        const warehouseId = safeInteger(String(values.get('warehouse_id') ?? ''), false);
        const unitCost = String(values.get('unit_cost_egp') ?? '').trim();
        if (mode === 'opening-stock' && !/^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$/.test(unitCost)) {
          setError(ar.inventory.invalidUnitCost);
          return;
        }
        input =
          mode === 'opening-stock'
            ? {
                action: mode,
                product_id: productId,
                warehouse_id: warehouseId,
                quantity,
                unit_cost_egp: unitCost,
                movement_date: date,
                reason,
              }
            : {
                action: mode,
                product_id: productId,
                warehouse_id: warehouseId,
                quantity,
                movement_date: date,
                reason,
              };
      }
      idempotencyKey.current ??= crypto.randomUUID();
      await mutation.mutateAsync({ input, key: idempotencyKey.current });
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : cause instanceof Error && cause.message === ar.common.quantityMustBeInteger
            ? cause.message
            : ar.common.networkError,
      );
    }
  };

  const title =
    mode === 'adjustment'
      ? ar.nav.inventoryAdjustments
      : mode === 'opening-stock'
        ? ar.nav.openingStock
        : ar.nav.inventoryTransfers;

  return (
    <section className="page inventory-page">
      <header className="page-heading">
        <div>
          <h1>{title}</h1>
          <p>{ar.inventory.actionDescription}</p>
        </div>
      </header>
      <form className="inventory-action-form" onSubmit={(event) => void submit(event)}>
        <label className="form-field">
          <span>{ar.common.product}</span>
          <select className="input" name="product_id" required defaultValue="">
            <option value="" disabled>
              {ar.inventory.selectProduct}
            </option>
            {products.data?.data.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} — {product.sku}
              </option>
            ))}
          </select>
        </label>
        {mode === 'transfer' ? (
          <>
            <WarehousePicker
              id="source-warehouse"
              name="source_warehouse_id"
              label={ar.common.sourceWarehouse}
            />
            <WarehousePicker
              id="destination-warehouse"
              name="destination_warehouse_id"
              label={ar.common.destinationWarehouse}
            />
          </>
        ) : (
          <WarehousePicker
            id="stock-action-warehouse"
            name="warehouse_id"
            label={ar.common.warehouse}
          />
        )}
        <FormField
          id="stock-action-quantity"
          label={ar.common.quantity}
          name="quantity"
          inputMode="numeric"
          pattern={mode === 'adjustment' ? '-?[0-9]+' : '[0-9]+'}
          required
        />
        {mode === 'opening-stock' && (
          <FormField
            id="stock-action-cost"
            label={ar.common.unitCost}
            name="unit_cost_egp"
            inputMode="decimal"
            pattern="^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$"
            required
          />
        )}
        <FormField
          id="stock-action-date"
          label={ar.common.date}
          name="movement_date"
          type="date"
          defaultValue={new Date().toISOString().slice(0, 10)}
          required
        />
        <FormField id="stock-action-reason" label={ar.common.reason} name="reason" required />
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="inline-success" role="status">
            {ar.common.actionSaved}
          </p>
        )}
        <div className="modal-actions">
          <button type="submit" className="button button-primary" disabled={mutation.isPending}>
            {mutation.isPending ? ar.app.loading : ar.common.confirm}
          </button>
        </div>
      </form>
      {mode === 'adjustment' && <AdjustmentHistory />}
    </section>
  );
}

export function InventoryAdjustmentPage() {
  return <ActionForm mode="adjustment" />;
}

export function OpeningStockPage() {
  return <ActionForm mode="opening-stock" />;
}

export function InventoryTransferPage() {
  return <ActionForm mode="transfer" />;
}
