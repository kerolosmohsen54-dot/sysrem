import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError } from '../../shared/api/errors';
import { useAuth } from '../../shared/auth/AuthProvider';
import { DataTable, type DataColumn } from '../../shared/components/DataTable';
import { FormField } from '../../shared/components/FormField';
import { Modal } from '../../shared/components/Modal';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import { formatDate, formatMoney } from '../../shared/utils/format';
import type { ListQuery } from '../inventory/api';
import {
  createContainer,
  listContainers,
  type ContainerRecord,
  type ContainerStatus,
  type CreateContainerInput,
} from './api';

const emptyQuery: ListQuery = { page: 1, perPage: 10, search: '' };
const statuses: ContainerStatus[] = [
  'draft',
  'in_transit',
  'at_port',
  'receiving',
  'received',
  'cancelled',
];

function statusLabel(status: ContainerStatus) {
  return ar.inventory.containerStatuses[status];
}

function numericId(value: string): number {
  if (!/^[1-9]\d*$/.test(value)) throw new Error(ar.common.quantityMustBeInteger);
  const parsed = BigInt(value);
  if (parsed > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error(ar.common.quantityMustBeInteger);
  return Number(parsed);
}

export function ContainerListPage() {
  const { user } = useAuth();
  const canManage = Boolean(
    user?.permissions.includes('*') || user?.permissions.includes('containers.manage'),
  );
  const canViewCosts = Boolean(
    user?.permissions.includes('*') || user?.permissions.includes('costs.view'),
  );
  const navigate = useNavigate();
  const client = useQueryClient();
  const [query, setQuery] = useState(emptyQuery);
  const [status, setStatus] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const createKey = useRef<string | null>(null);
  const result = useQuery({
    queryKey: ['/containers', query, status, fromDate, toDate],
    queryFn: () =>
      listContainers(query, {
        ...(status ? { status } : {}),
        ...(fromDate ? { from_date: fromDate } : {}),
        ...(toDate ? { to_date: toDate } : {}),
      }),
  });
  const create = useMutation({
    mutationFn: (input: CreateContainerInput) => {
      createKey.current ??= crypto.randomUUID();
      return createContainer(input, createKey.current);
    },
    onSuccess: async (container) => {
      createKey.current = null;
      setOpen(false);
      await client.invalidateQueries({ queryKey: ['/containers'] });
      navigate(`/containers/${container.id}`);
    },
    onError: (cause) => {
      setFormError(cause instanceof ApiError ? cause.message : ar.common.networkError);
    },
  });
  const columns: DataColumn<ContainerRecord>[] = [
    {
      key: 'number',
      header: ar.inventory.containerNumber,
      render: (row) => <Link to={`/containers/${row.id}`}>{row.container_number}</Link>,
    },
    {
      key: 'supplier',
      header: ar.inventory.containerSupplier,
      render: (row) => row.supplier_name || '—',
    },
    {
      key: 'origin',
      header: ar.inventory.containerOrigin,
      render: (row) => row.origin || '—',
    },
    {
      key: 'arrival',
      header: ar.inventory.containerArrival,
      render: (row) => (row.estimated_arrival ? formatDate(row.estimated_arrival) : '—'),
    },
    {
      key: 'lines',
      header: ar.inventory.containerLines,
      render: (row) => (row.line_count === undefined ? '—' : String(row.line_count)),
    },
    ...(canViewCosts
      ? [
          {
            key: 'expenses',
            header: ar.inventory.containerCosts,
            render: (row: ContainerRecord) =>
              row.expenses_egp == null ? '—' : formatMoney(row.expenses_egp),
          },
        ]
      : []),
    {
      key: 'status',
      header: ar.inventory.containerStatus,
      render: (row) => statusLabel(row.status),
    },
  ];

  const closeDialog = () => {
    setOpen(false);
    setFormError('');
    createKey.current = null;
  };
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    const values = new FormData(event.currentTarget);
    try {
      create.mutate({
        container_number: String(values.get('container_number') ?? '').trim(),
        supplier_id: values.get('supplier_id')
          ? numericId(String(values.get('supplier_id')))
          : null,
        origin: String(values.get('origin') ?? '').trim() || null,
        destination: String(values.get('destination') ?? '').trim() || null,
        notes: String(values.get('notes') ?? '').trim() || null,
        estimated_departure: String(values.get('estimated_departure') ?? '') || null,
        estimated_arrival: String(values.get('estimated_arrival') ?? '') || null,
      });
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : ar.common.requestFailed);
    }
  };

  return (
    <section className="page inventory-page">
      <header className="page-heading">
        <div>
          <h1>{ar.nav.containers}</h1>
          <p>{ar.inventory.containersDescription}</p>
        </div>
        {canManage && (
          <button className="button button-primary" onClick={() => setOpen(true)} type="button">
            {ar.inventory.createContainer}
          </button>
        )}
      </header>
      <div className="inventory-toolbar">
        <label className="inventory-search">
          <span>{ar.common.search}</span>
          <input
            aria-label={ar.common.search}
            className="input"
            type="search"
            value={query.search}
            onChange={(event) =>
              setQuery((current) => ({ ...current, search: event.currentTarget.value, page: 1 }))
            }
          />
        </label>
        <label className="inventory-search">
          <span>{ar.inventory.containerStatus}</span>
          <select
            className="input"
            value={status}
            onChange={(event) => {
              setStatus(event.currentTarget.value);
              setQuery((current) => ({ ...current, page: 1 }));
            }}
          >
            <option value="">{ar.inventory.all}</option>
            {statuses.map((item) => (
              <option key={item} value={item}>
                {statusLabel(item)}
              </option>
            ))}
          </select>
        </label>
        <FormField
          id="container-from-date"
          label={ar.inventory.fromDate}
          type="date"
          value={fromDate}
          onChange={(event) => {
            setFromDate(event.currentTarget.value);
            setQuery((current) => ({ ...current, page: 1 }));
          }}
        />
        <FormField
          id="container-to-date"
          label={ar.inventory.toDate}
          type="date"
          value={toDate}
          onChange={(event) => {
            setToDate(event.currentTarget.value);
            setQuery((current) => ({ ...current, page: 1 }));
          }}
        />
      </div>
      {result.isLoading ? (
        <PageState kind="loading" />
      ) : result.isError ? (
        <PageState
          kind="error"
          message={ar.common.requestFailed}
          onRetry={() => void result.refetch()}
        />
      ) : result.data ? (
        <>
          <DataTable
            columns={columns}
            rows={result.data.data}
            getRowKey={(row) => row.id}
            emptyMessage={ar.common.noResults}
          />
          <nav aria-label={ar.inventory.paginationLabel} className="inventory-pagination">
            <button
              className="button button-secondary"
              disabled={query.page <= 1}
              onClick={() => setQuery((current) => ({ ...current, page: current.page - 1 }))}
              type="button"
            >
              {ar.common.previous}
            </button>
            <span>
              {ar.common.page} {query.page} {ar.common.of} {result.data.meta.last_page}
            </span>
            <button
              className="button button-secondary"
              disabled={query.page >= result.data.meta.last_page}
              onClick={() => setQuery((current) => ({ ...current, page: current.page + 1 }))}
              type="button"
            >
              {ar.common.next}
            </button>
          </nav>
        </>
      ) : (
        <PageState kind="loading" />
      )}

      <Modal open={open} title={ar.inventory.createContainer} onClose={closeDialog}>
        <form className="stack-form" onSubmit={submit}>
          <FormField
            id="container-number"
            label={ar.inventory.containerNumber}
            name="container_number"
            required
            maxLength={100}
          />
          <p className="field-hint">{ar.inventory.containerSupplierUnavailable}</p>
          <FormField id="container-origin" label={ar.inventory.containerOrigin} name="origin" />
          <FormField
            id="container-destination"
            label={ar.inventory.containerDestination}
            name="destination"
          />
          <FormField
            id="container-departure"
            label={ar.inventory.containerDeparture}
            name="estimated_departure"
            type="date"
          />
          <FormField
            id="container-arrival"
            label={ar.inventory.containerArrival}
            name="estimated_arrival"
            type="date"
          />
          <label className="form-field" htmlFor="container-notes">
            <span>{ar.customers.notes}</span>
            <textarea className="input" id="container-notes" maxLength={1000} name="notes" />
          </label>
          {formError && (
            <p className="field-error" role="alert">
              {formError}
            </p>
          )}
          <div className="modal-actions">
            <button className="button button-secondary" onClick={closeDialog} type="button">
              {ar.common.cancel}
            </button>
            <button className="button button-primary" disabled={create.isPending} type="submit">
              {create.isPending ? ar.app.loading : ar.common.save}
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
