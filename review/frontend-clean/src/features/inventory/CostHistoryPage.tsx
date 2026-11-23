import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../shared/auth/AuthProvider';
import { DataTable, type DataColumn } from '../../shared/components/DataTable';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import { formatDate, formatMoney } from '../../shared/utils/format';
import { listProductCostHistory, type InventoryMovement, type ListQuery } from './api';

export function CostHistoryPage() {
  const { productId = '' } = useParams();
  const validId = /^[1-9]\d*$/.test(productId);
  const { user } = useAuth();
  const canView = Boolean(
    user?.permissions.includes('*') || user?.permissions.includes('costs.view'),
  );
  const [query, setQuery] = useState<ListQuery>({ page: 1, perPage: 10, search: '' });
  const history = useQuery({
    queryKey: ['/products', productId, 'cost-history', query],
    queryFn: () => listProductCostHistory(Number(productId), query),
    enabled: validId && canView,
  });

  if (!validId) return <PageState kind="error" title={ar.common.invalidIdentifier} />;
  if (!canView) return <PageState kind="denied" />;
  if (history.isLoading) return <PageState kind="loading" />;
  if (history.isError || !history.data) {
    return (
      <PageState
        kind="error"
        message={ar.common.requestFailed}
        onRetry={() => void history.refetch()}
      />
    );
  }

  const columns: DataColumn<InventoryMovement>[] = [
    { key: 'date', header: ar.common.date, render: (row) => formatDate(row.movement_date) },
    { key: 'movement', header: ar.common.movementType, render: (row) => row.movement_type },
    { key: 'warehouse', header: ar.common.warehouse, render: (row) => row.warehouse_name },
    { key: 'quantity', header: ar.common.quantity, render: (row) => row.quantity },
    {
      key: 'unit-cost',
      header: ar.common.unitCost,
      render: (row) => (row.unit_cost_egp ? formatMoney(row.unit_cost_egp) : '—'),
    },
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
          onChange={(event) =>
            setQuery((current) => ({ ...current, page: 1, search: event.currentTarget.value }))
          }
        />
      </label>
      <DataTable
        columns={columns}
        rows={history.data.data}
        getRowKey={(row) => row.id}
        emptyMessage={ar.common.noResults}
      />
    </section>
  );
}
