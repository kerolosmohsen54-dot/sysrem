import { useMutation, useQuery } from '@tanstack/react-query';
import { useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DataTable, type DataColumn } from '../../shared/components/DataTable';
import { FormField } from '../../shared/components/FormField';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import { formatMoney, formatQuantity } from '../../shared/utils/format';
import {
  getContainer,
  previewLandedCost,
  type ContainerCost,
  type ContainerLine,
  type ContainerReceiptPreview,
} from './api';
import { listResource, type ListQuery, type Warehouse } from '../inventory/api';

const optionsQuery: ListQuery = { page: 1, perPage: 100, search: '' };

function safePositiveInteger(value: string): number {
  if (!/^[1-9]\d*$/.test(value)) throw new Error(ar.common.quantityMustBeInteger);
  const result = BigInt(value);
  if (result > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error(ar.common.quantityMustBeInteger);
  return Number(result);
}

export function LandedCostPage() {
  const { containerId = '' } = useParams();
  const validId = /^[1-9]\d*$/.test(containerId);
  const [preview, setPreview] = useState<ContainerReceiptPreview | null>(null);
  const [error, setError] = useState('');
  const previewRequestVersion = useRef(0);
  const container = useQuery({
    queryKey: ['/containers', containerId],
    queryFn: () => getContainer(containerId),
    enabled: validId,
  });
  const warehouses = useQuery({
    queryKey: ['/warehouses', 'landed-cost-preview'],
    queryFn: () => listResource<Warehouse>('/warehouses', optionsQuery),
    enabled: validId,
  });
  const previewRequest = useMutation({
    mutationFn: (input: Parameters<typeof previewLandedCost>[1]) =>
      previewLandedCost(containerId, input),
  });

  if (!validId) return <PageState kind="error" title={ar.common.invalidIdentifier} />;
  if (container.isLoading || warehouses.isLoading) return <PageState kind="loading" />;
  if (container.isError || !container.data || warehouses.isError || !warehouses.data) {
    return (
      <PageState
        kind="error"
        message={ar.common.requestFailed}
        onRetry={() => {
          void container.refetch();
          void warehouses.refetch();
        }}
      />
    );
  }

  const submitPreview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const requestVersion = previewRequestVersion.current;
    setError('');
    const values = new FormData(event.currentTarget);
    try {
      const lines = container.data.lines.map((line) => ({
        container_line_id: line.id,
        expected_quantity: safePositiveInteger(line.expected_quantity),
        received_quantity: safePositiveInteger(String(values.get(`received-${line.id}`) ?? '')),
      }));
      const result = await previewRequest.mutateAsync({
        warehouse_id: safePositiveInteger(String(values.get('warehouse_id') ?? '')),
        movement_date: String(values.get('movement_date') ?? ''),
        lines,
      });
      if (requestVersion === previewRequestVersion.current) setPreview(result);
    } catch (cause) {
      if (requestVersion === previewRequestVersion.current) {
        setPreview(null);
        setError(cause instanceof Error ? cause.message : ar.common.requestFailed);
      }
    }
  };

  const lines: DataColumn<ContainerLine>[] = [
    { key: 'product', header: ar.common.product, render: (row) => row.product_name },
    {
      key: 'quantity',
      header: ar.inventory.containerExpectedQuantity,
      render: (row) => row.expected_quantity,
    },
    {
      key: 'purchase',
      header: ar.inventory.containerPurchaseValue,
      render: (row) => formatMoney(row.purchase_value_egp),
    },
  ];
  const costs: DataColumn<ContainerCost>[] = [
    { key: 'type', header: ar.inventory.containerCostType, render: (row) => row.cost_type },
    {
      key: 'amount',
      header: ar.inventory.containerCostAmount,
      render: (row) => formatMoney(row.amount_egp),
    },
    {
      key: 'included',
      header: ar.inventory.containerAllocationBasis,
      render: (row) => (row.include_in_inventory_cost ? ar.common.yes : ar.common.no),
    },
  ];

  return (
    <section className="page inventory-page">
      <header className="page-heading">
        <div>
          <h1>
            {ar.inventory.landedCost}: {container.data.container_number}
          </h1>
          <p>{ar.inventory.containerAllocationServerOnly}</p>
        </div>
        <Link className="button button-secondary" to={`/containers/${containerId}`}>
          {ar.common.back}
        </Link>
      </header>
      <form
        className="stack-form"
        onChange={() => {
          previewRequestVersion.current += 1;
          setPreview(null);
          setError('');
        }}
        onSubmit={(event) => void submitPreview(event)}
      >
        <label className="form-field">
          <span>{ar.common.warehouse}</span>
          <select className="input" name="warehouse_id" required defaultValue="">
            <option value="">{ar.common.select}</option>
            {warehouses.data.data.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </option>
            ))}
          </select>
        </label>
        <FormField
          id="landed-cost-movement-date"
          label={ar.inventory.movementDate}
          name="movement_date"
          type="date"
          defaultValue={new Date().toISOString().slice(0, 10)}
          required
        />
        <section aria-labelledby="landed-cost-preview-lines">
          <h2 id="landed-cost-preview-lines">{ar.inventory.containerReceivedQuantity}</h2>
          {container.data.lines.map((line) => (
            <FormField
              id={`received-${line.id}`}
              key={line.id}
              label={`${line.product_name} — ${formatQuantity(line.expected_quantity)}`}
              name={`received-${line.id}`}
              inputMode="numeric"
              min="1"
              pattern="[1-9][0-9]*"
              defaultValue={line.expected_quantity}
              required
            />
          ))}
        </section>
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
        <button className="button button-primary" type="submit" disabled={previewRequest.isPending}>
          {ar.inventory.containerLandedCostPreview}
        </button>
      </form>
      {preview && (
        <section aria-labelledby="landed-cost-preview-result">
          <h2 id="landed-cost-preview-result">{ar.inventory.containerLandedCostPreview}</h2>
          <p>
            {ar.inventory.allocatedLandedCost}:{' '}
            {preview.total_landed_cost_allocated_egp
              ? formatMoney(preview.total_landed_cost_allocated_egp)
              : ar.common.notProvided}
          </p>
          <DataTable
            columns={[
              {
                key: 'product',
                header: ar.common.product,
                render: (row) =>
                  container.data.lines.find((line) => line.id === row.container_line_id)
                    ?.product_name ?? String(row.product_id),
              },
              {
                key: 'purchase-cost',
                header: ar.inventory.containerPurchaseValue,
                render: (row) => (row.purchase_cost_egp ? formatMoney(row.purchase_cost_egp) : '—'),
              },
              {
                key: 'landed-cost',
                header: ar.inventory.allocatedLandedCost,
                render: (row) =>
                  row.allocated_landed_cost_egp ? formatMoney(row.allocated_landed_cost_egp) : '—',
              },
              {
                key: 'unit-cost',
                header: ar.inventory.unitLandedCost,
                render: (row) => (row.unit_cost_egp ? formatMoney(row.unit_cost_egp) : '—'),
              },
            ]}
            rows={preview.lines}
            getRowKey={(row) => row.container_line_id}
            emptyMessage={ar.common.noResults}
          />
        </section>
      )}
      <section aria-labelledby="landed-cost-lines">
        <h2 id="landed-cost-lines">{ar.inventory.containerLines}</h2>
        <DataTable
          columns={lines}
          rows={container.data.lines}
          getRowKey={(row) => row.id}
          emptyMessage={ar.inventory.containerLineDetailsUnavailable}
        />
      </section>
      <section aria-labelledby="landed-cost-costs">
        <h2 id="landed-cost-costs">{ar.inventory.containerCosts}</h2>
        <DataTable
          columns={costs}
          rows={container.data.costs}
          getRowKey={(row) => row.id}
          emptyMessage={ar.common.noResults}
        />
      </section>
    </section>
  );
}
