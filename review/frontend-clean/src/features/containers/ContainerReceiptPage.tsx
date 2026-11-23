import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError } from '../../shared/api/errors';
import { useAuth } from '../../shared/auth/AuthProvider';
import { FormField } from '../../shared/components/FormField';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import { listResource, type ListQuery, type Warehouse } from '../inventory/api';
import { getContainer, receiveContainer } from './api';

const optionsQuery: ListQuery = { page: 1, perPage: 100, search: '' };

function positiveInteger(value: string): number {
  if (!/^[1-9]\d*$/.test(value)) throw new Error(ar.common.quantityMustBeInteger);
  const integer = BigInt(value);
  if (integer > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error(ar.common.quantityMustBeInteger);
  return Number(integer);
}

export function ContainerReceiptPage() {
  const { containerId = '' } = useParams();
  const validId = /^[1-9]\d*$/.test(containerId);
  const client = useQueryClient();
  const { user } = useAuth();
  const canViewCosts = Boolean(
    user?.permissions.includes('*') || user?.permissions.includes('costs.view'),
  );
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const idempotencyKey = useRef<string | null>(null);
  const container = useQuery({
    queryKey: ['/containers', containerId],
    queryFn: () => getContainer(containerId),
    enabled: validId,
  });
  const warehouses = useQuery({
    queryKey: ['/warehouses', 'container-receipt-options'],
    queryFn: () => listResource<Warehouse>('/warehouses', optionsQuery),
    enabled: validId,
  });

  if (!validId) return <PageState kind="error" title={ar.common.invalidIdentifier} />;
  if (container.isLoading || warehouses.isLoading) return <PageState kind="loading" />;
  if (container.isError || warehouses.isError || !container.data || !warehouses.data) {
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
  const current = container.data;
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess(false);
    idempotencyKey.current ??= crypto.randomUUID();
    const values = new FormData(event.currentTarget);
    try {
      const lines = current.lines.map((line) => ({
        container_line_id: line.id,
        expected_quantity: positiveInteger(line.expected_quantity),
        received_quantity: positiveInteger(String(values.get(`received-${line.id}`) ?? '')),
        discrepancy_reason: String(values.get(`discrepancy-${line.id}`) ?? '').trim() || null,
      }));
      const manualAllocations: Record<string, Record<string, string>> = {};
      if (current.allocation_basis === 'manual' && canViewCosts) {
        for (const line of current.lines) {
          const costAllocations: Record<string, string> = {};
          for (const cost of current.costs) {
            const value = String(values.get(`allocation-${line.id}-${cost.id}`) ?? '');
            if (value) costAllocations[String(cost.id)] = value;
          }
          if (Object.keys(costAllocations).length) {
            manualAllocations[String(line.id)] = costAllocations;
          }
        }
      }
      await receiveContainer(
        containerId,
        {
          warehouse_id: positiveInteger(String(values.get('warehouse_id') ?? '')),
          movement_date: String(values.get('movement_date') ?? ''),
          reason: String(values.get('reason') ?? '').trim() || null,
          lines,
          ...(Object.keys(manualAllocations).length
            ? { manual_allocations: manualAllocations }
            : {}),
        },
        idempotencyKey.current,
      );
      idempotencyKey.current = null;
      setSuccess(true);
      await Promise.all([
        container.refetch(),
        client.invalidateQueries({ queryKey: ['/inventory/balances'] }),
        client.invalidateQueries({ queryKey: ['/inventory/movements'] }),
      ]);
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

  return (
    <section className="page inventory-page">
      <header className="page-heading">
        <div>
          <h1>
            {ar.inventory.containerReceipt}: {current.container_number}
          </h1>
          <p>{ar.inventory.containerReceiptDescription}</p>
        </div>
        <Link className="button button-secondary" to={`/containers/${containerId}`}>
          {ar.common.back}
        </Link>
      </header>
      {success && (
        <p className="inline-success" role="status">
          {ar.common.actionSaved}
        </p>
      )}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      {current.allocation_basis === 'manual' && !canViewCosts && (
        <PageState kind="denied" message={ar.inventory.manualAllocationPermissionRequired} />
      )}
      {!current.lines.length ? (
        <PageState
          kind="empty"
          title={ar.common.noResults}
          message={ar.inventory.containerLineDetailsUnavailable}
        />
      ) : (
        <form className="stack-form" onSubmit={submit}>
          <label className="form-field">
            <span>{ar.common.warehouse}</span>
            <select className="input" name="warehouse_id" required defaultValue="">
              <option value="">{ar.inventory.selectWarehouse}</option>
              {warehouses.data.data.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
          </label>
          <FormField
            id="container-receipt-date"
            label={ar.inventory.movementDate}
            name="movement_date"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            required
          />
          <FormField
            id="container-receipt-reason"
            label={ar.common.reason}
            name="reason"
            maxLength={1000}
          />
          {current.lines.map((line) => (
            <fieldset className="invoice-line-editor" key={line.id}>
              <legend>
                {line.product_name} — {ar.inventory.containerExpectedQuantity}:{' '}
                {line.expected_quantity}
              </legend>
              <FormField
                id={`received-${line.id}`}
                label={ar.inventory.containerReceivedQuantity}
                name={`received-${line.id}`}
                inputMode="numeric"
                required
              />
              <FormField
                id={`discrepancy-${line.id}`}
                label={ar.inventory.containerDiscrepancyReason}
                name={`discrepancy-${line.id}`}
                maxLength={1000}
              />
              {current.allocation_basis === 'manual' &&
                canViewCosts &&
                current.costs.map((cost) => (
                  <FormField
                    id={`allocation-${line.id}-${cost.id}`}
                    key={cost.id}
                    label={`${cost.cost_type} — ${ar.inventory.manualAllocationAmount}`}
                    name={`allocation-${line.id}-${cost.id}`}
                    inputMode="decimal"
                    pattern="^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$"
                  />
                ))}
            </fieldset>
          ))}
          <button
            className="button button-primary"
            type="submit"
            disabled={current.allocation_basis === 'manual' && !canViewCosts}
          >
            {ar.inventory.confirmContainerReceipt}
          </button>
        </form>
      )}
    </section>
  );
}
