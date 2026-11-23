import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../shared/auth/AuthProvider';
import { DataTable, type DataColumn } from '../../shared/components/DataTable';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import { formatDate, formatMoney } from '../../shared/utils/format';
import { displayMovementType } from '../../shared/utils/labels';
import { listAllResources, listProductCostHistory, type InventoryMovement, type ListQuery, type Warehouse } from './api';

export function CostHistoryPage() {
  const { productId = '' } = useParams();
  const validId = /^[1-9]\d*$/.test(productId);
  const { user } = useAuth();
  const canView = Boolean(
    user?.permissions.includes('*') || user?.permissions.includes('costs.view'),
  );
  const [query, setQuery] = useState<ListQuery>({ page: 1, perPage: 10, search: '', sortBy: 'movement_date', sortDirection: 'desc' });
  const [warehouseId, setWarehouseId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const warehouses = useQuery({ queryKey: ['/warehouses', 'cost-history-filter'], queryFn: () => listAllResources<Warehouse>('/warehouses', { page: 1, perPage: 100, search: '' }), enabled: validId && canView });
  const history = useQuery({
    queryKey: ['/products', productId, 'cost-history', query, warehouseId, fromDate, toDate],
    queryFn: () => listProductCostHistory(Number(productId), query, {
      ...(warehouseId ? { warehouse_id: warehouseId } : {}),
      ...(fromDate ? { from_date: fromDate } : {}),
      ...(toDate ? { to_date: toDate } : {}),
    }),
    enabled: validId && canView,
  });

  if (!validId) return <PageState kind="error" title={ar.common.invalidIdentifier} />;
  if (!canView) return <PageState kind="denied" />;
  if (history.isLoading || warehouses.isLoading) return <PageState kind="loading" />;
  if (history.isError || warehouses.isError || !history.data || !warehouses.data) {
    return (
      <PageState
        kind="error"
        message={ar.common.requestFailed}
        onRetry={() => { void history.refetch(); void warehouses.refetch(); }}
      />
    );
  }

  const columns: DataColumn<InventoryMovement>[] = [
    { key: 'date', header: ar.common.date, render: (row) => formatDate(row.movement_date) },
    { key: 'movement', header: ar.common.movementType, render: (row) => row.source_type === 'warehouse_return' ? ar.nav.stockReturns : displayMovementType(row.movement_type) },
    { key: 'warehouse', header: ar.common.warehouse, render: (row) => row.warehouse_name },
    { key: 'quantity', header: ar.common.quantity, render: (row) => <bdi>{row.quantity}</bdi> },
    {
      key: 'unit-cost',
      header: ar.common.unitCost,
      render: (row) => (row.unit_cost_egp !== null && row.unit_cost_egp !== undefined ? formatMoney(row.unit_cost_egp) : '—'),
    },
    { key: 'source', header: ar.common.reference, render: row => <Link to={`/inventory/movements/${row.id}`}><bdi>{row.source_reference ?? row.movement_number ?? row.reference}</bdi></Link> },
  ];

  return (
    <section className="page inventory-page">
      <header className="page-heading">
        <div>
          <h1>{ar.inventory.productCostHistory}</h1>
          <p>{ar.inventory.lastPurchasePrice}</p>
        </div>
        <Link className="button button-secondary" to="/products">
          {ar.common.back}
        </Link>
      </header>
      <label className="inventory-search">
        <span>{ar.common.search}</span>
        <input
          className="input"
          type="search"
          value={query.search}
          onChange={(event) => {
            const search = event.currentTarget.value;
            setQuery((current) => ({ ...current, page: 1, search }));
          }}
        />
      </label>
      <div className="inventory-toolbar inventory-catalog-filters">
        <label className="form-field"><span>{ar.inventory.filterByWarehouse}</span><select className="input" value={warehouseId} onChange={event => { setWarehouseId(event.currentTarget.value); setQuery(current => ({ ...current, page: 1 })); }}><option value="">{ar.inventory.all}</option>{warehouses.data.data.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
        <label className="form-field"><span>{ar.inventory.fromDate}</span><input className="input" type="date" value={fromDate} onChange={event => { setFromDate(event.currentTarget.value); setQuery(current => ({ ...current, page: 1 })); }} /></label>
        <label className="form-field"><span>{ar.inventory.toDate}</span><input className="input" type="date" value={toDate} onChange={event => { setToDate(event.currentTarget.value); setQuery(current => ({ ...current, page: 1 })); }} /></label>
      </div>
      <DataTable
        columns={columns}
        rows={history.data.data}
        getRowKey={(row) => row.id}
        emptyMessage={ar.common.noResults}
      />
      <nav className="inventory-pagination" aria-label={ar.inventory.paginationLabel}><button className="button button-secondary" type="button" disabled={query.page <= 1} onClick={() => setQuery(current => ({ ...current, page: current.page - 1 }))}>{ar.common.previous}</button><span>{ar.common.page} {history.data.meta.current_page} {ar.common.of} {history.data.meta.last_page}</span><button className="button button-secondary" type="button" disabled={query.page >= history.data.meta.last_page} onClick={() => setQuery(current => ({ ...current, page: current.page + 1 }))}>{ar.common.next}</button></nav>
    </section>
  );
}
