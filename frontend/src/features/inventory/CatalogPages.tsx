import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { ApiError } from '../../shared/api/errors';
import { useAuth } from '../../shared/auth/AuthProvider';
import { DataTable, type DataColumn } from '../../shared/components/DataTable';
import { FormField } from '../../shared/components/FormField';
import { Modal } from '../../shared/components/Modal';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import { moneyToCents } from '../../shared/utils/money';
import { WarehousePicker } from './WarehousePicker';
import {
  createCategory,
  deleteCategory,
  deleteProduct,
  deleteWarehouse,
  createProduct,
  createWarehouse,
  getInventorySummary,
  listAllResources,
  listMinimumStock,
  listResource,
  updateCategory,
  updateProduct,
  updateWarehouse,
  type Category,
  type InventoryBalance,
  type ListQuery,
  type Product,
  type Warehouse,
  type ApiPage,
} from './api';

const initialQuery: ListQuery = { page: 1, perPage: 10, search: '' };

function formOptionalString(data: FormData, key: string): string | null {
  const raw = data.get(key);
  if (raw == null) return null;
  const value = String(raw).trim();
  return value || null;
}

function nonNegativeSafeInteger(value: string): number {
  if (!/^\d+$/.test(value)) throw new Error(ar.common.quantityMustBeInteger);
  const integer = BigInt(value);
  if (integer > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(ar.common.quantityMustBeInteger);
  }
  return Number(integer);
}

function PageFrame({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="page inventory-page">
      <header className="page-heading">
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function useCanViewCosts() {
  const { user } = useAuth();
  return Boolean(user?.permissions.includes('*') || user?.permissions.includes('costs.view'));
}
function SearchToolbar({
  value,
  onChange,
  sortBy,
  sortDirection,
  sortOptions,
  onSortChange,
}: {
  value: string;
  onChange: (value: string) => void;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  sortOptions?: { value: string; label: string }[];
  onSortChange?: (field: string, direction: 'asc' | 'desc') => void;
}) {
  return (
    <div className="inventory-toolbar">
      <label className="inventory-search">
        <span>{ar.common.search}</span>
        <input
          className="input"
          type="search"
          value={value}
          onChange={(event) => onChange(event.currentTarget.value)}
        />
      </label>
      {sortOptions && onSortChange && (
        <>
          <label className="form-field">
            <span>{ar.inventory.sortBy}</span>
            <select
              className="input"
              value={sortBy ?? ''}
              onChange={(event) => onSortChange(event.currentTarget.value, sortDirection ?? 'asc')}
            >
              <option value="">{ar.common.defaultOrder}</option>
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>{ar.inventory.sortDirection}</span>
            <select
              className="input"
              value={sortDirection ?? 'asc'}
              onChange={(event) =>
                onSortChange(sortBy ?? '', event.currentTarget.value as 'asc' | 'desc')
              }
              disabled={!sortBy}
            >
              <option value="asc">{ar.inventory.ascending}</option>
              <option value="desc">{ar.inventory.descending}</option>
            </select>
          </label>
        </>
      )}
    </div>
  );
}

function Pagination({
  page,
  lastPage,
  onPage,
}: {
  page: number;
  lastPage: number;
  onPage: (value: number) => void;
}) {
  return (
    <nav className="inventory-pagination" aria-label={ar.inventory.paginationLabel}>
      <button
        type="button"
        className="button button-secondary"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        {ar.common.previous}
      </button>
      <span>
        {ar.common.page} {page} {ar.common.of} {lastPage}
      </span>
      <button
        type="button"
        className="button button-secondary"
        disabled={page >= lastPage}
        onClick={() => onPage(page + 1)}
      >
        {ar.common.next}
      </button>
    </nav>
  );
}

function useCanCreate(permission: string) {
  const { user } = useAuth();
  return Boolean(user?.permissions.includes('*') || user?.permissions.includes(permission));
}

function CreateDialog({
  title,
  onClose,
  onSubmit,
  children,
}: {
  title: string;
  onClose: () => void;
  onSubmit: (data: FormData) => Promise<void>;
  children: ReactNode;
}) {
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await onSubmit(new FormData(event.currentTarget));
      onClose();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : ar.common.networkError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open title={title} onClose={onClose}>
      <form className="stack-form" onSubmit={handleSubmit}>
        {children}
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button type="button" className="button button-secondary" onClick={onClose}>
            {ar.common.cancel}
          </button>
          <button type="submit" className="button button-primary" disabled={submitting}>
            {submitting ? ar.app.loading : ar.common.save}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function DeactivateDialog({
  title,
  name,
  error,
  isPending,
  onClose,
  onConfirm,
}: {
  title: string;
  name: string;
  error: string;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal open title={title} onClose={onClose}>
      <div className="stack-form">
        <p>{ar.common.confirmDeactivate}</p>
        <strong>{name}</strong>
        {error && <p className="field-error" role="alert">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="button button-secondary" onClick={onClose}>
            {ar.common.cancel}
          </button>
          <button type="button" className="button button-primary" onClick={onConfirm} disabled={isPending}>
            {isPending ? ar.app.loading : ar.common.deactivate}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function useListQuery<T>(path: string, query: ListQuery, filters: Record<string, string> = {}) {
  return useQuery({
    queryKey: [path, query, filters],
    queryFn: () => listResource<T>(path, query, filters),
  });
}

function ResultContent<T>({
  result,
  columns,
  getRowKey,
  page,
  setPage,
  tableClassName,
}: {
  result: UseQueryResult<ApiPage<T>, Error>;
  columns: DataColumn<T>[];
  getRowKey: (row: T) => string | number;
  page: number;
  setPage: (page: number) => void;
  tableClassName?: string;
}) {
  if (result.isLoading) return <PageState kind="loading" />;
  if (result.isError) {
    return (
      <PageState
        kind="error"
        message={ar.common.requestFailed}
        onRetry={() => void result.refetch()}
      />
    );
  }
  if (!result.data) return <PageState kind="loading" />;
  return (
    <>
      <DataTable
        className={tableClassName}
        columns={columns}
        rows={result.data.data}
        getRowKey={getRowKey}
        emptyMessage={ar.common.noResults}
      />
      <Pagination page={page} lastPage={result.data.meta.last_page} onPage={setPage} />
    </>
  );
}

export function CategoriesPage() {
  const [query, setQuery] = useState(initialQuery);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deactivating, setDeactivating] = useState<Category | null>(null);
  const [deactivationError, setDeactivationError] = useState('');
  const client = useQueryClient();
  const canCreate = useCanCreate('products.manage');
  const result = useListQuery<Category>('/categories', query);
  const parentCategories = useQuery({
    queryKey: ['/categories', 'parent-picker'],
    queryFn: () => listAllResources<Category>('/categories', { ...initialQuery, perPage: 100 }),
  });
  const create = useMutation({
    mutationFn: (input: Parameters<typeof createCategory>[0]) =>
      editing ? updateCategory(editing.id, input) : createCategory(input),
    onSuccess: (updatedCategory) => {
      client.setQueriesData(
        { queryKey: ['/categories'] },
        (current: ApiPage<Category> | undefined) => {
          if (!current) return current;
          return {
            ...current,
            data: current.data.map((row) =>
              row.id === updatedCategory.id ? { ...row, ...updatedCategory } : row,
            ),
          };
        },
      );
      void client.invalidateQueries({ queryKey: ['/categories'] });
    },
  });
  const deactivate = useMutation({
    mutationFn: deleteCategory,
    onSuccess: async () => {
      setDeactivating(null);
      setDeactivationError('');
      await client.invalidateQueries({ queryKey: ['/categories'] });
    },
    onError: (cause: unknown) => setDeactivationError(cause instanceof Error ? cause.message : ar.common.requestFailed),
  });
  const columns: DataColumn<Category>[] = [
    { key: 'code', header: ar.common.code, render: (row) => row.code || '—' },
    { key: 'name', header: ar.common.name, render: (row) => row.name },
    {
      key: 'status',
      header: ar.common.status,
      render: (row) => (row.is_active ? ar.common.active : ar.common.inactive),
    },
    ...(canCreate
      ? [
          {
            key: 'actions',
            header: ar.common.actions,
            render: (row: Category) => (
              <div className="inventory-row-actions">
                <button className="button button-secondary" type="button" onClick={() => { setEditing(row); setDialog(true); }}>
                  {ar.common.edit}
                </button>
                {row.is_active && <button className="button button-secondary" type="button" onClick={() => { setDeactivationError(''); setDeactivating(row); }}>
                  {ar.common.deactivate}
                </button>}
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <PageFrame
      title={ar.nav.categories}
      description={ar.inventory.categoriesDescription}
      action={
        canCreate ? (
          <button className="button button-primary" type="button" onClick={() => setDialog(true)}>
            {ar.common.add} {ar.nav.categories}
          </button>
        ) : undefined
      }
    >
      <SearchToolbar
        value={query.search}
        onChange={(search) => setQuery((current) => ({ ...current, search, page: 1 }))}
        sortBy={query.sortBy}
        sortDirection={query.sortDirection}
        sortOptions={[
          { value: 'name', label: ar.common.name },
          { value: 'code', label: ar.common.code },
        ]}
        onSortChange={(sortBy, sortDirection) =>
          setQuery((current) => ({
            ...current,
            sortBy: sortBy || undefined,
            sortDirection: sortBy ? sortDirection : undefined,
            page: 1,
          }))
        }
      />
      <ResultContent
        result={result}
        columns={columns}
        getRowKey={(row) => row.id}
        page={query.page}
        setPage={(page) => setQuery((current) => ({ ...current, page }))}
      />
      {dialog && (
        <CreateDialog
          title={`${editing ? ar.common.edit : ar.common.add} ${ar.nav.categories}`}
          onClose={() => {
            setDialog(false);
            setEditing(null);
          }}
          onSubmit={async (data) => {
            await create.mutateAsync({
              name: String(data.get('name')).trim(),
              code: formOptionalString(data, 'code'),
              parent_category_id: data.get('parent_category_id')
                ? safeInteger(String(data.get('parent_category_id')), false)
                : null,
              is_active: data.get('is_active') === 'on',
            });
          }}
        >
          <FormField
            id="category-name"
            label={ar.common.name}
            name="name"
            defaultValue={editing?.name ?? ''}
            required
          />
          <FormField
            id="category-code"
            label={ar.common.code}
            name="code"
            defaultValue={editing?.code ?? ''}
          />
          <label className="form-field">
            <span>{ar.inventory.parentCategory}</span>
            <select className="input" name="parent_category_id" defaultValue={editing?.parent_category_id?.toString() ?? ''}>
              <option value="">{ar.inventory.all}</option>
              {(parentCategories.data?.data ?? []).filter(row => row.is_active && row.id !== editing?.id).map(row => (
                <option key={row.id} value={row.id}>{row.name}</option>
              ))}
            </select>
          </label>
          <label className="inventory-checkbox">
            <input type="checkbox" name="is_active" defaultChecked={editing?.is_active ?? true} />
            {ar.common.active}
          </label>
        </CreateDialog>
      )}
      {deactivating && <DeactivateDialog
        title={`${ar.common.deactivate} ${ar.nav.categories}`}
        name={deactivating.name}
        error={deactivationError}
        isPending={deactivate.isPending}
        onClose={() => { if (!deactivate.isPending) setDeactivating(null); }}
        onConfirm={() => deactivate.mutate(deactivating.id)}
      />}
    </PageFrame>
  );
}

export function ProductsPage() {
  const [query, setQuery] = useState(initialQuery);
  const [searchParams] = useSearchParams();
  const globalSearchTerm = searchParams.get('search') ?? '';
  useEffect(() => {
    if (globalSearchTerm) setQuery((current) => ({ ...current, page: 1, search: globalSearchTerm }));
  }, [globalSearchTerm]);
  const [categoryId, setCategoryId] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deactivating, setDeactivating] = useState<Product | null>(null);
  const [deactivationError, setDeactivationError] = useState('');
  const client = useQueryClient();
  const canCreate = useCanCreate('products.manage');
  const filters = {
    ...(categoryId ? { category_id: categoryId } : {}),
    ...(activeFilter ? { is_active: activeFilter } : {}),
  };
  const result = useListQuery<Product>('/products', query, filters);
  const lowStock = useQuery({
    queryKey: ['/inventory/minimum-stock', 'product-alert'],
    queryFn: () => listMinimumStock({ ...initialQuery, perPage: 1 }, true),
  });
  const categories = useQuery({
    queryKey: ['/categories', 'all'],
    queryFn: () => listAllResources<Category>('/categories', { ...initialQuery, perPage: 100 }),
  });
  const create = useMutation({
    mutationFn: (input: Parameters<typeof createProduct>[0]) =>
      editing ? updateProduct(editing.id, input) : createProduct(input),
    onSuccess: (updatedProduct) => {
      client.setQueriesData(
        { queryKey: ['/products'] },
        (current: ApiPage<Product> | undefined) => {
          if (!current) return current;
          return {
            ...current,
            data: current.data.map((row) =>
              row.id === updatedProduct.id ? { ...row, ...updatedProduct } : row,
            ),
          };
        },
      );
      void client.invalidateQueries({ queryKey: ['/products'] });
    },
  });
  const deactivate = useMutation({
    mutationFn: deleteProduct,
    onSuccess: async () => {
      setDeactivating(null);
      setDeactivationError('');
      await Promise.all([
        client.invalidateQueries({ queryKey: ['/products'] }),
        client.invalidateQueries({ queryKey: ['/inventory'] }),
        client.invalidateQueries({ queryKey: ['/inventory/minimum-stock'] }),
      ]);
    },
    onError: (cause: unknown) => setDeactivationError(cause instanceof Error ? cause.message : ar.common.requestFailed),
  });
  const canViewCosts = useCanViewCosts();
  const columns: DataColumn<Product>[] = [
    { key: 'sku', header: ar.common.sku, render: (row) => row.sku },
    { key: 'name', header: ar.common.name, render: (row) => row.name },
    { key: 'category', header: ar.common.category, render: (row) => row.category_name || ar.common.noCategories },
    { key: 'stock', header: ar.common.stock, render: (row) => row.quantity_on_hand ?? '0' },
    { key: 'reserved', header: ar.common.reserved, render: (row) => row.reserved_quantity ?? '0' },
    { key: 'available', header: ar.common.available, render: (row) => row.available_quantity ?? '0' },
    {
      key: 'sale-price',
      header: ar.common.companyPrice,
      render: (row) => {
        const belowCost = canViewCosts && row.company_price !== null && row.company_price !== undefined
          && row.purchase_cost_egp !== null && row.purchase_cost_egp !== undefined
          && moneyToCents(row.company_price) < moneyToCents(row.purchase_cost_egp);
        return <span className={belowCost ? 'field-error' : undefined}>
          {row.company_price ?? ar.common.notProvided}{belowCost ? ` - ${ar.inventory.companyPriceBelowCost}` : ''}
        </span>;
      },
    },
    {
      key: 'status',
      header: ar.common.status,
      render: (row) => {
        const available = Number(row.available_quantity ?? row.quantity_on_hand ?? 0);
        const minimum = row.minimum_stock == null ? null : Number(row.minimum_stock);
        const state = available <= 0 ? 'out'
          : minimum !== null && minimum > 0 && available <= minimum ? 'low'
            : 'available';
        const label = state === 'out' ? ar.inventory.stockOut
          : state === 'low' ? ar.inventory.stockLow : ar.inventory.stockAvailable;
        return <span className={`inventory-stock-status inventory-stock-status-${state}`}>{label}</span>;
      },
    },
    {
      key: 'movements',
      header: ar.common.movementType,
      render: (row) => <>
        <Link className="inventory-inline-link" to={`/inventory/movements?product_id=${row.id}`}>{ar.nav.inventoryMovements}</Link>
        {canViewCosts && <Link className="inventory-inline-link" to={`/products/${row.id}/cost-history`}>{ar.inventory.productCostHistory}</Link>}
      </>,
    },
    ...(canCreate ? [{
      key: 'actions',
      header: ar.common.actions,
      render: (row: Product) => <div className="inventory-row-actions">
        <button className="button button-secondary" type="button" onClick={() => { setEditing(row); setDialog(true); }}>{ar.common.edit}</button>
        {row.is_active && <button className="button button-secondary" type="button" onClick={() => { setDeactivationError(''); setDeactivating(row); }}>{ar.common.deactivate}</button>}
      </div>,
    }] : []),
  ];

  return (
    <PageFrame
      title={ar.nav.products}
      description={ar.inventory.productsDescription}
      action={
        canCreate ? (
          <button className="button button-primary" type="button" onClick={() => setDialog(true)}>
            {ar.common.add} {ar.nav.products}
          </button>
        ) : undefined
      }
    >
      <SearchToolbar
        value={query.search}
        onChange={(search) => setQuery((current) => ({ ...current, search, page: 1 }))}
        sortBy={query.sortBy}
        sortDirection={query.sortDirection}
        sortOptions={[
          { value: 'name', label: ar.common.name },
          { value: 'code', label: ar.common.code },
          { value: 'category_name', label: ar.common.category },
          { value: 'available_quantity', label: ar.common.available },
        ]}
        onSortChange={(sortBy, sortDirection) => setQuery((current) => ({
          ...current,
          sortBy: sortBy || undefined,
          sortDirection: sortBy ? sortDirection : undefined,
          page: 1,
        }))}
      />
      <div className="inventory-toolbar inventory-catalog-filters">
        <label className="form-field">
          <span>{ar.common.category}</span>
          <select className="input" value={categoryId} onChange={event => { setCategoryId(event.currentTarget.value); setQuery(current => ({ ...current, page: 1 })); }}>
            <option value="">{ar.inventory.all}</option>
            {(categories.data?.data ?? []).map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>
        <label className="form-field">
          <span>{ar.common.status}</span>
          <select className="input" value={activeFilter} onChange={event => { setActiveFilter(event.currentTarget.value); setQuery(current => ({ ...current, page: 1 })); }}>
            <option value="">{ar.inventory.all}</option>
            <option value="1">{ar.common.active}</option>
            <option value="0">{ar.common.inactive}</option>
          </select>
        </label>
      </div>
      {(lowStock.data?.meta.total ?? 0) > 0 && <p className="inventory-low-stock-alert" role="alert">{lowStock.data?.meta.total} {ar.inventory.lowStockAlerts} · <Link to="/inventory/minimum-stock">{ar.inventory.viewLowStock}</Link></p>}
      {categories.isError && (
        <PageState
          kind="error"
          message={ar.common.requestFailed}
          onRetry={() => void categories.refetch()}
        />
      )}
      <ResultContent
        result={result}
        columns={columns}
        tableClassName="inventory-products-table"
        getRowKey={(row) => row.id}
        page={query.page}
        setPage={(page) => setQuery((current) => ({ ...current, page }))}
      />
      {dialog && (
        <CreateDialog
          title={`${editing ? ar.common.edit : ar.common.add} ${ar.nav.products}`}
          onClose={() => {
            setDialog(false);
            setEditing(null);
          }}
          onSubmit={async (data) => {
            const minStock = String(data.get('minimum_stock') ?? '').trim();
            await create.mutateAsync({
              sku: String(data.get('sku')).trim(),
              barcode: formOptionalString(data, 'barcode'),
              name: String(data.get('name')).trim(),
              category_id: data.get('category_id')
                ? safeInteger(String(data.get('category_id')), false)
                : null,
              unit_code: String(data.get('unit_code')).trim(),
              company_price: formOptionalString(data, 'company_price'),
              default_location_id: data.get('default_location_id')
                ? safeInteger(String(data.get('default_location_id')), false)
                : null,
              minimum_stock: minStock ? nonNegativeSafeInteger(minStock) : null,
              description: formOptionalString(data, 'description'),
              default_tax_rate: formOptionalString(data, 'default_tax_rate'),
              ...(canViewCosts
                ? {
                    last_purchase_price_reference: formOptionalString(
                      data,
                      'last_purchase_price_reference',
                    ),
                  }
                : {}),
              is_active: data.get('is_active') === 'on',
            });
          }}
        >
          <FormField
            id="product-sku"
            label={ar.common.sku}
            name="sku"
            defaultValue={editing?.sku ?? ''}
            required
          />
          <FormField
            id="product-name"
            label={ar.common.name}
            name="name"
            defaultValue={editing?.name ?? ''}
            required
          />
          <FormField
            id="product-barcode"
            label={ar.common.barcode}
            name="barcode"
            defaultValue={editing?.barcode ?? ''}
          />
          <label className="form-field">
            <span>{ar.common.category}</span>
            <select
              className="input"
              name="category_id"
              defaultValue={editing?.category_id?.toString() ?? ''}
            >
              <option value="">{ar.common.noCategories}</option>
              {(categories.data?.data ?? []).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <WarehousePicker
            id="product-default-location"
            label={ar.inventory.defaultWarehouse}
            name="default_location_id"
            allowEmpty
            emptyLabel={ar.inventory.noDefaultWarehouse}
            defaultValue={editing?.default_location_id?.toString() ?? ''}
          />
          <FormField
            id="product-unit"
            label={ar.common.unit}
            name="unit_code"
            defaultValue={editing?.unit_code ?? ''}
            required
          />
          <FormField
            id="product-company-price"
            label={ar.common.companyPrice}
            name="company_price"
            defaultValue={editing?.company_price ?? ''}
            inputMode="decimal"
            pattern="^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$"
          />
          {canViewCosts && editing?.purchase_cost_egp && editing.company_price
            && moneyToCents(editing.company_price) < moneyToCents(editing.purchase_cost_egp)
            && <p className="field-error" role="alert">{ar.inventory.companyPriceBelowCost}</p>}
          <FormField
            id="product-minimum-stock"
            label={ar.common.minStock}
            name="minimum_stock"
            defaultValue={editing?.minimum_stock ?? ''}
            inputMode="numeric"
            pattern="[0-9]*"
          />
          <FormField
            id="product-description"
            label={ar.inventory.productDescription}
            name="description"
            defaultValue={editing?.description ?? ''}
          />
          <FormField
            id="product-default-tax-rate"
            label={ar.inventory.defaultTaxRate}
            name="default_tax_rate"
            defaultValue={editing?.default_tax_rate ?? ''}
            inputMode="decimal"
            pattern="^(0|[1-9][0-9]{0,2})(\\.[0-9]{1,6})?$"
          />
          {canViewCosts && (
            <FormField
              id="product-last-purchase-price"
              label={ar.inventory.lastPurchasePrice}
              name="last_purchase_price_reference"
              defaultValue={editing?.last_purchase_price_reference ?? ''}
              inputMode="decimal"
              pattern="^(0|[1-9][0-9]{0,14})(\\.[0-9]{1,4})?$"
            />
          )}
          <label className="inventory-checkbox">
            <input type="checkbox" name="is_active" defaultChecked={editing?.is_active ?? true} />
            {ar.common.active}
          </label>
        </CreateDialog>
      )}
      {deactivating && <DeactivateDialog
        title={`${ar.common.deactivate} ${ar.nav.products}`}
        name={deactivating.name}
        error={deactivationError}
        isPending={deactivate.isPending}
        onClose={() => { if (!deactivate.isPending) setDeactivating(null); }}
        onConfirm={() => deactivate.mutate(deactivating.id)}
      />}
    </PageFrame>
  );
}

export function WarehousesPage() {
  const [query, setQuery] = useState(initialQuery);
  const [locationType, setLocationType] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [deactivating, setDeactivating] = useState<Warehouse | null>(null);
  const [deactivationError, setDeactivationError] = useState('');
  const client = useQueryClient();
  const canCreate = useCanCreate('warehouses.manage');
  const result = useListQuery<Warehouse>('/warehouses', query, {
    ...(locationType ? { location_type: locationType } : {}),
    ...(activeFilter ? { is_active: activeFilter } : {}),
  });
  const create = useMutation({
    mutationFn: (input: Parameters<typeof createWarehouse>[0]) =>
      editing ? updateWarehouse(editing.id, input) : createWarehouse(input),
    onSuccess: (updatedWarehouse) => {
      client.setQueriesData(
        { queryKey: ['/warehouses'] },
        (current: ApiPage<Warehouse> | undefined) => {
          if (!current) return current;
          return {
            ...current,
            data: current.data.map((row) =>
              row.id === updatedWarehouse.id ? { ...row, ...updatedWarehouse } : row,
            ),
          };
        },
      );
      void client.invalidateQueries({ queryKey: ['/warehouses'] });
    },
  });
  const deactivate = useMutation({
    mutationFn: deleteWarehouse,
    onSuccess: async () => {
      setDeactivating(null);
      setDeactivationError('');
      await Promise.all([
        client.invalidateQueries({ queryKey: ['/warehouses'] }),
        client.invalidateQueries({ queryKey: ['/inventory'] }),
      ]);
    },
    onError: (cause: unknown) => setDeactivationError(cause instanceof Error ? cause.message : ar.common.requestFailed),
  });
  const typeLabels: Record<Warehouse['location_type'], string> = {
    main: ar.common.mainWarehouse,
    sub: ar.common.subWarehouse,
    vehicle: ar.common.vehicle,
    damaged: ar.common.damaged,
    other: ar.common.other,
  };
  const columns: DataColumn<Warehouse>[] = [
    { key: 'name', header: ar.common.name, render: (row) => row.name },
    { key: 'address', header: 'الموقع', render: (row) => row.address || '—' },
    { key: 'manager', header: ar.common.manager, render: (row) => row.manager_name ?? '—' },
    {
      key: 'item-count',
      header: ar.common.totalStock,
      render: (row) => row.item_count ?? '—',
    },
    {
      key: 'occupancy',
      header: ar.common.occupancy,
      render: (row) => row.occupancy_percentage ?? ar.common.notProvided,
    },
    {
      key: 'status',
      header: ar.common.status,
      render: (row) => (row.is_active ? ar.common.active : ar.common.inactive),
    },
    ...(canCreate
      ? [
          {
            key: 'actions',
            header: ar.common.actions,
            render: (row: Warehouse) => (
              <div className="inventory-row-actions">
                <button className="button button-secondary" type="button" onClick={() => { setEditing(row); setDialog(true); }}>
                  {ar.common.edit}
                </button>
                {row.is_active && <button className="button button-secondary" type="button" onClick={() => { setDeactivationError(''); setDeactivating(row); }}>
                  {ar.common.deactivate}
                </button>}
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <PageFrame
      title={ar.nav.warehouses}
      description={ar.inventory.warehousesDescription}
      action={
        canCreate ? (
          <button className="button button-primary" type="button" onClick={() => setDialog(true)}>
            {ar.common.add} {ar.nav.warehouses}
          </button>
        ) : undefined
      }
    >
      <SearchToolbar
        value={query.search}
        onChange={(search) => setQuery((current) => ({ ...current, search, page: 1 }))}
        sortBy={query.sortBy}
        sortDirection={query.sortDirection}
        sortOptions={[
          { value: 'name', label: ar.common.name },
          { value: 'code', label: ar.common.code },
          { value: 'location_type', label: ar.common.locationType },
        ]}
        onSortChange={(sortBy, sortDirection) => setQuery(current => ({
          ...current,
          sortBy: sortBy || undefined,
          sortDirection: sortBy ? sortDirection : undefined,
          page: 1,
        }))}
      />
      <div className="inventory-toolbar inventory-catalog-filters">
        <label className="form-field">
          <span>{ar.common.locationType}</span>
          <select className="input" value={locationType} onChange={event => { setLocationType(event.currentTarget.value); setQuery(current => ({ ...current, page: 1 })); }}>
            <option value="">{ar.inventory.all}</option>
            {Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="form-field">
          <span>{ar.common.status}</span>
          <select className="input" value={activeFilter} onChange={event => { setActiveFilter(event.currentTarget.value); setQuery(current => ({ ...current, page: 1 })); }}>
            <option value="">{ar.inventory.all}</option>
            <option value="1">{ar.common.active}</option>
            <option value="0">{ar.common.inactive}</option>
          </select>
        </label>
      </div>
      <ResultContent
        result={result}
        columns={columns}
        tableClassName="inventory-warehouses-table"
        getRowKey={(row) => row.id}
        page={query.page}
        setPage={(page) => setQuery((current) => ({ ...current, page }))}
      />
      {dialog && (
        <CreateDialog
          title={`${editing ? ar.common.edit : ar.common.add} ${ar.nav.warehouses}`}
          onClose={() => {
            setDialog(false);
            setEditing(null);
          }}
          onSubmit={async (data) => {
            await create.mutateAsync({
              code: String(data.get('code')).trim(),
              name: String(data.get('name')).trim(),
              location_type: String(data.get('location_type')) as Warehouse['location_type'],
              parent_location_id: data.get('parent_location_id')
                ? safeInteger(String(data.get('parent_location_id')), false)
                : null,
              is_active: data.get('is_active') === 'on',
              notes: formOptionalString(data, 'notes'),
              address: formOptionalString(data, 'address'),
              manager_name: formOptionalString(data, 'manager_name'),
              capacity_units: formOptionalString(data, 'capacity_units') ? nonNegativeSafeInteger(String(data.get('capacity_units'))) : null,
            });
          }}
        >
          <FormField
            id="warehouse-code"
            label={ar.common.code}
            name="code"
            defaultValue={editing?.code ?? ''}
            required
          />
          <FormField
            id="warehouse-name"
            label={ar.common.name}
            name="name"
            defaultValue={editing?.name ?? ''}
            required
          />
          <WarehousePicker
            id="warehouse-parent-location"
            label={ar.inventory.parentWarehouse}
            name="parent_location_id"
            allowEmpty
            emptyLabel={ar.inventory.all}
            defaultValue={editing?.parent_location_id?.toString() ?? ''}
            excludeId={editing?.id}
          />
          <FormField id="warehouse-address" label="الموقع" name="address" defaultValue={editing?.address ?? ''} />
          <FormField id="warehouse-manager" label={ar.common.manager} name="manager_name" defaultValue={editing?.manager_name ?? ''} />
          <FormField id="warehouse-capacity" label="السعة بالوحدات" name="capacity_units" defaultValue={editing?.capacity_units?.toString() ?? ''} inputMode="numeric" pattern="[0-9]+" />
          <label className="form-field">
            <span>{ar.common.locationType}</span>
            <select
              className="input"
              name="location_type"
              defaultValue={editing?.location_type ?? 'main'}
            >
              {(Object.entries(typeLabels) as [Warehouse['location_type'], string][]).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ),
              )}
            </select>
          </label>
          <label className="inventory-checkbox">
            <input type="checkbox" name="is_active" defaultChecked={editing?.is_active ?? true} />
            {ar.common.active}
          </label>
          <FormField
            id="warehouse-notes"
            label={ar.common.description}
            name="notes"
            defaultValue={editing?.notes ?? ''}
          />
        </CreateDialog>
      )}
      {deactivating && <DeactivateDialog
        title={`${ar.common.deactivate} ${ar.nav.warehouses}`}
        name={deactivating.name}
        error={deactivationError}
        isPending={deactivate.isPending}
        onClose={() => { if (!deactivate.isPending) setDeactivating(null); }}
        onConfirm={() => deactivate.mutate(deactivating.id)}
      />}
    </PageFrame>
  );
}

export function InventoryBalancesPage() {
  const [query, setQuery] = useState(initialQuery);
  const [warehouseId, setWarehouseId] = useState('');
  const [productId, setProductId] = useState('');
  const warehouses = useQuery({
    queryKey: ['/warehouses', 'balance-filter'],
    queryFn: () => listAllResources<Warehouse>('/warehouses', { ...initialQuery, perPage: 100 }),
  });
  const products = useQuery({
    queryKey: ['/products', 'balance-filter'],
    queryFn: () => listAllResources<Product>('/products', { ...initialQuery, perPage: 100 }),
  });
  const filters = {
    ...(warehouseId ? { warehouse_id: warehouseId } : {}),
    ...(productId ? { product_id: productId } : {}),
  };
  const result = useQuery({
    queryKey: ['/inventory/balances', query, filters],
    queryFn: () => listResource<InventoryBalance>('/inventory/balances', query, filters),
  });
  const summary = useQuery({ queryKey: ['/inventory/summary', filters], queryFn: () => getInventorySummary(filters) });
  const canViewCosts = useCanViewCosts();
  const columns: DataColumn<InventoryBalance>[] = [
    { key: 'sku', header: ar.common.sku, render: (row) => row.sku },
    { key: 'product', header: ar.common.product, render: (row) => row.product_name },
    { key: 'warehouse', header: ar.common.warehouse, render: (row) => row.warehouse_name },
    { key: 'quantity', header: ar.common.stock, render: (row) => row.quantity_on_hand },
    { key: 'minimum', header: ar.common.minStock, render: (row) => row.minimum_stock ?? '—' },
    ...(canViewCosts
      ? [
          {
            key: 'average-cost',
            header: ar.common.unitCost,
            render: (row: InventoryBalance) => row.average_unit_cost_egp ?? '—',
          },
        ]
      : []),
  ];

  return (
    <PageFrame title={ar.nav.inventory} description={ar.inventory.balancesDescription}>
      <div className="inventory-summary-grid" aria-label={ar.nav.inventory}>
        <SummaryCard
          label={ar.common.totalStock}
          value={summary.data?.quantity_on_hand ?? ar.app.loading}
        />
        {canViewCosts && <SummaryCard label={ar.common.stockValue} value={summary.data?.stock_value_egp ?? ar.app.loading} />}
        <SummaryCard label={ar.inventory.lowStockAlerts} value={summary.data?.below_minimum_count ?? ar.app.loading} />
        <SummaryCard
          label={ar.common.warehouseCount}
          value={summary.data?.warehouse_count ?? ar.app.loading}
        />
      </div>
      {(products.isError || warehouses.isError || summary.isError) && (
        <PageState
          kind="error"
          message={ar.common.requestFailed}
          onRetry={() => {
            void products.refetch();
            void warehouses.refetch();
            void summary.refetch();
          }}
        />
      )}
      <SearchToolbar
        value={query.search}
        onChange={(search) => setQuery((current) => ({ ...current, search, page: 1 }))}
        sortBy={query.sortBy}
        sortDirection={query.sortDirection}
        sortOptions={[
          { value: 'product_name', label: ar.common.product },
          { value: 'quantity_on_hand', label: ar.common.stock },
        ]}
        onSortChange={(sortBy, sortDirection) =>
          setQuery((current) => ({
            ...current,
            sortBy: sortBy || undefined,
            sortDirection: sortBy ? sortDirection : undefined,
            page: 1,
          }))
        }
      />
      <div className="inventory-toolbar inventory-catalog-filters">
        <WarehousePicker
          id="balance-warehouse-filter"
          label={ar.inventory.filterByWarehouse}
          name="balance_warehouse_filter"
          allowEmpty
          emptyLabel={ar.inventory.all}
          value={warehouseId}
          onChange={(value) => {
            setWarehouseId(value);
            setQuery((current) => ({ ...current, page: 1 }));
          }}
        />
        <label className="form-field">
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
      </div>
      <ResultContent
        result={result}
        columns={columns}
        getRowKey={(row) => `${row.product_id}-${row.warehouse_id}`}
        page={query.page}
        setPage={(page) => setQuery((current) => ({ ...current, page }))}
      />
    </PageFrame>
  );
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="inventory-summary-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function safeInteger(value: string, allowNegative = true): number {
  const pattern = allowNegative ? /^-?\d+$/ : /^\d+$/;
  if (!pattern.test(value)) throw new Error(ar.common.quantityMustBeInteger);
  const integer = BigInt(value);
  const min = allowNegative ? BigInt(Number.MIN_SAFE_INTEGER) : BigInt(0);
  if (integer < min || integer > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(ar.common.quantityMustBeInteger);
  }
  return Number(integer);
}
