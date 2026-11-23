import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { newIdempotencyKey } from '../../shared/api/http';
import { useAuth } from '../../shared/auth/AuthProvider';
import { DataTable, type DataColumn } from '../../shared/components/DataTable';
import { FormField } from '../../shared/components/FormField';
import { Modal } from '../../shared/components/Modal';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import { formatDate, formatMoney } from '../../shared/utils/format';
import type { ListQuery } from '../inventory/api';
import { listDrivers } from '../admin/referenceApi';
import { listSuppliers } from '../purchases/api';
import { archiveContainer, listContainers, type ContainerRecord, type ContainerStatus } from './api';
import { ContainerCreateForm } from './ContainerCreateForm';

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

export function ContainerListPage() {
  const { user } = useAuth();
  const client = useQueryClient();
  const navigate = useNavigate();
  const canManage = Boolean(
    user?.permissions.includes('*') || user?.permissions.includes('containers.manage'),
  );
  const canViewCosts = Boolean(
    user?.permissions.includes('*') || user?.permissions.includes('costs.view'),
  );
  const [query, setQuery] = useState(emptyQuery);
  const [searchParams, setSearchParams] = useSearchParams();
  const createRequested = searchParams.get('create') === '1';
  const [status, setStatus] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [open, setOpen] = useState(createRequested);
  const [actionError, setActionError] = useState('');
  const archive = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      archiveContainer(id, reason, newIdempotencyKey()),
    onSuccess: async () => {
      setActionError('');
      await Promise.all([
        client.invalidateQueries({ queryKey: ['/containers'] }),
        client.invalidateQueries({ queryKey: ['/admin/trash'] }),
      ]);
    },
    onError: (cause) => setActionError(cause instanceof Error ? cause.message : ar.common.requestFailed),
  });
  const result = useQuery({
    queryKey: ['/containers', query, status, supplierId, driverId, fromDate, toDate],
    queryFn: () =>
      listContainers(query, {
        ...(status ? { status } : {}),
        ...(supplierId ? { supplier_id: supplierId } : {}),
        ...(driverId ? { driver_id: driverId } : {}),
        ...(fromDate ? { from_date: fromDate } : {}),
        ...(toDate ? { to_date: toDate } : {}),
      }),
  });
  const supplierOptions = useQuery({ queryKey: ['/suppliers', 'container-filter'], queryFn: () => listSuppliers({ ...emptyQuery, perPage: 100 }), retry: false });
  const driverOptions = useQuery({ queryKey: ['/reference/shipping-drivers', 'container-filter'], queryFn: () => listDrivers({ ...emptyQuery, perPage: 100 }), retry: false });
  const columns: DataColumn<ContainerRecord>[] = [
    {
      key: 'name',
      header: 'اسم الحاوية',
      render: (row) => (
        <Link to={`/containers/${row.id}`}>
          {row.container_name || row.container_number}
        </Link>
      ),
    },
    { key: 'number', header: ar.inventory.containerNumber, render: (row) => row.container_number },
    {
      key: 'origin',
      header: 'جهة القدوم',
      render: (row) => row.origin || '—',
    },
    {
      key: 'arrival',
      header: ar.inventory.containerArrival,
      render: (row) => (row.estimated_arrival ? formatDate(row.estimated_arrival) : '—'),
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
    {
      key: 'actions',
      header: ar.common.actions,
      render: (row) => (
        <div className="row-actions">
          <Link className="button button-quiet button-sm" to={`/containers/${row.id}`}>فتح</Link>
          {canManage && row.status !== 'received' && row.status !== 'cancelled' && Number(row.posted_receipt_count ?? 0) === 0 && (
            <>
              <button className="button button-secondary button-sm" onClick={() => navigate(`/containers/${row.id}?edit=1`)} type="button">تعديل</button>
              <button className="button button-secondary button-sm" disabled={archive.isPending} onClick={() => {
                const reason = window.prompt(`اكتب سبب حذف الحاوية ${row.container_number}:`);
                if (!reason?.trim()) return;
                if (window.confirm(`سيتم نقل الحاوية ${row.container_number} إلى سلة المحذوفات. متابعة؟`)) {
                  archive.mutate({ id: row.id, reason: reason.trim() });
                }
              }} type="button">حذف</button>
            </>
          )}
          {canManage && row.status !== 'received' && row.status !== 'cancelled' && Number(row.posted_receipt_count ?? 0) > 0 && (
            <>
              <button className="button button-secondary button-sm" disabled title="اعكس الاستلام أولاً قبل تعديل بيانات الحاوية">تعديل</button>
              <button className="button button-secondary button-sm" disabled title="اعكس الاستلام أولاً للحفاظ على رصيد المخزون">حذف</button>
            </>
          )}
          {canManage && row.status === 'received' && <button className="button button-secondary button-sm" disabled title="اعكس الاستلام أولاً للحفاظ على رصيد المخزون">حذف</button>}
        </div>
      ),
    },
  ];

  const closeDialog = () => {
    setOpen(false);
    if (createRequested) {
      const next = new URLSearchParams(searchParams);
      next.delete('create');
      setSearchParams(next, { replace: true });
    }
  };

  const openCreateDialog = () => {
    setOpen(true);
    if (!createRequested) {
      const next = new URLSearchParams(searchParams);
      next.set('create', '1');
      setSearchParams(next, { replace: true });
    }
  };

  useEffect(() => {
    if (createRequested) setOpen(true);
  }, [createRequested]);

  return (
    <section className="page inventory-page">
      <header className="page-heading">
        <div>
          <h1>{ar.nav.containers}</h1>
          <p>{ar.inventory.containersDescription}</p>
        </div>
        {canManage && (
          <button className="button button-primary" onClick={openCreateDialog} type="button">
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
            placeholder={ar.inventory.containerSearchPlaceholder}
            type="search"
            value={query.search}
            onChange={(event) => { const search = event.currentTarget.value; setQuery((current) => ({ ...current, search, page: 1 })); }}
          />
        </label>
        {supplierOptions.data && <label className="inventory-search"><span>المورد</span><select className="input" value={supplierId} onChange={(event) => { setSupplierId(event.currentTarget.value); setQuery((current) => ({ ...current, page: 1 })); }}><option value="">{ar.inventory.all}</option>{supplierOptions.data.data.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label>}
        {driverOptions.data && <label className="inventory-search"><span>شركة/سائق الشحن</span><select className="input" value={driverId} onChange={(event) => { setDriverId(event.currentTarget.value); setQuery((current) => ({ ...current, page: 1 })); }}><option value="">{ar.inventory.all}</option>{driverOptions.data.data.map((driver) => <option key={driver.id} value={driver.id}>{driver.name}{driver.shipping_company ? ` — ${driver.shipping_company}` : ''}</option>)}</select></label>}
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
      {actionError && <p className="field-error" role="alert">{actionError}</p>}
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
            emptyMessage={ar.inventory.containersEmptyMessage}
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
        <ContainerCreateForm onClose={closeDialog} onCreated={() => void client.invalidateQueries({ queryKey: ['/containers'] })} />
      </Modal>
    </section>
  );
}
