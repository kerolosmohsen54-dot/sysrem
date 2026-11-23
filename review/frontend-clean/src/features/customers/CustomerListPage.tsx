import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '../../shared/api/errors';
import { useAuth } from '../../shared/auth/AuthProvider';
import { DataTable, type DataColumn } from '../../shared/components/DataTable';
import { FormField } from '../../shared/components/FormField';
import { Modal } from '../../shared/components/Modal';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import { formatMoney } from '../../shared/utils/format';
import type { ListQuery } from '../inventory/api';
import { createCustomer, listCustomers, updateCustomer, type Customer } from './api';

const initialQuery: ListQuery = { page: 1, perPage: 10, search: '' };

function optionalField(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? '').trim();
  return text || null;
}

function CustomerDialog({ customer, onClose }: { customer: Customer | null; onClose: () => void }) {
  const client = useQueryClient();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const create = useMutation({
    mutationFn: (input: Parameters<typeof createCustomer>[0]) =>
      customer ? updateCustomer(customer.id, input) : createCustomer(input),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['/customers'] });
      onClose();
    },
  });

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    const values = new FormData(event.currentTarget);
    const creditLimit = String(values.get('credit_limit') ?? '').trim();
    if (creditLimit && !/^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$/.test(creditLimit)) {
      setError(ar.customers.invalidCreditLimit);
      setSubmitting(false);
      return;
    }
    try {
      await create.mutateAsync({
        name: String(values.get('name') ?? '').trim(),
        phone: optionalField(values.get('phone')),
        email: optionalField(values.get('email')),
        address: optionalField(values.get('address')),
        salesperson: optionalField(values.get('salesperson')),
        tax_number: optionalField(values.get('tax_number')),
        payment_terms: optionalField(values.get('payment_terms')),
        governorate: optionalField(values.get('governorate')),
        ...(creditLimit ? { credit_limit: creditLimit } : {}),
        notes: optionalField(values.get('notes')),
        ...(customer ? { is_active: values.get('is_active') === 'on' } : {}),
      });
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : ar.common.networkError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open title={customer ? ar.customers.editTitle : ar.customers.addTitle} onClose={onClose}>
      <form className="stack-form" onSubmit={(event) => void submit(event)}>
        <div className="inventory-toolbar">
          <FormField
            defaultValue={customer?.name ?? ''}
            id="customer-name"
            label={ar.common.name}
            name="name"
            required
          />
          <FormField
            defaultValue={customer?.phone ?? ''}
            id="customer-phone"
            label={ar.common.phone}
            name="phone"
            type="tel"
          />
          <FormField
            defaultValue={customer?.email ?? ''}
            id="customer-email"
            label={ar.common.email}
            name="email"
            type="email"
          />
          <FormField
            defaultValue={customer?.address ?? ''}
            id="customer-address"
            label={ar.common.address}
            name="address"
          />
          <FormField
            defaultValue={customer?.salesperson ?? ''}
            id="customer-salesperson"
            label={ar.customers.salesperson}
            name="salesperson"
          />
          <FormField
            defaultValue={customer?.tax_number ?? ''}
            id="customer-tax-number"
            label={ar.customers.taxNumber}
            name="tax_number"
          />
          <FormField
            defaultValue={customer?.payment_terms ?? ''}
            id="customer-payment-terms"
            label={ar.customers.paymentTerms}
            name="payment_terms"
          />
          <FormField
            defaultValue={customer?.governorate ?? ''}
            id="customer-governorate"
            label={ar.customers.governorate}
            name="governorate"
          />
          <FormField
            id="customer-credit-limit"
            label={ar.customers.creditLimit}
            name="credit_limit"
            defaultValue={customer?.credit_limit ?? ''}
            inputMode="decimal"
            pattern="^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$"
          />
          <FormField defaultValue="" id="customer-notes" label={ar.customers.notes} name="notes" />
          {customer && (
            <label className="inventory-checkbox">
              <input defaultChecked={customer.is_active} name="is_active" type="checkbox" />
              {ar.common.active}
            </label>
          )}
        </div>
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button className="button button-secondary" onClick={onClose} type="button">
            {ar.common.cancel}
          </button>
          <button className="button button-primary" disabled={submitting} type="submit">
            {submitting ? ar.app.loading : ar.common.save}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function CustomerListPage() {
  const [query, setQuery] = useState(initialQuery);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [view, setView] = useState<'customers' | 'governorates' | 'trash'>('customers');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [governorateFilter, setGovernorateFilter] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();
  const canCreate = Boolean(
    user?.permissions.includes('*') || user?.permissions.includes('customers.create'),
  );
  const canManage = Boolean(
    user?.permissions.includes('*') || user?.permissions.includes('customers.manage'),
  );
  const result = useQuery({
    queryKey: ['/customers', query],
    queryFn: () => listCustomers(query),
  });
  const columns: DataColumn<Customer>[] = [
    {
      key: 'name',
      header: ar.common.name,
      render: (row) => (
        <button
          className="button button-quiet"
          onClick={() => navigate(`/customers/${row.id}`)}
          type="button"
        >
          {row.name}
        </button>
      ),
    },
    { key: 'phone', header: ar.common.phone, render: (row) => row.phone || '—' },
    {
      key: 'credit-limit',
      header: ar.customers.creditLimit,
      render: (row) => (row.credit_limit ? formatMoney(row.credit_limit) : '—'),
    },
    {
      key: 'balance',
      header: ar.customers.balance,
      render: (row) => (row.balance_egp ? formatMoney(row.balance_egp) : ar.common.notProvided),
    },
    {
      key: 'unallocated',
      header: ar.customers.unallocated,
      render: (row) =>
        row.unallocated_collection_egp
          ? formatMoney(row.unallocated_collection_egp)
          : ar.common.notProvided,
    },
    {
      key: 'status',
      header: ar.common.status,
      render: (row) => (row.is_active ? ar.common.active : ar.common.inactive),
    },
    {
      key: 'statement',
      header: ar.customers.statement,
      render: (row) => (
        <button
          className="button button-secondary"
          onClick={() => navigate(`/customers/${row.id}/statement`)}
          type="button"
        >
          {ar.customers.openStatement}
        </button>
      ),
    },
    ...(canManage
      ? [
          {
            key: 'edit',
            header: ar.common.actions,
            render: (row: Customer) => (
              <button
                className="button button-secondary"
                onClick={() => {
                  setEditingCustomer(row);
                  setDialogOpen(true);
                }}
                type="button"
              >
                {ar.common.edit}
              </button>
            ),
          },
        ]
      : []),
  ];

  const rows = (result.data?.data ?? []).filter((row) => {
    const statusMatches =
      statusFilter === 'all' || (statusFilter === 'active' ? row.is_active : !row.is_active);
    const governorateMatches =
      !governorateFilter || (row.governorate ?? '').includes(governorateFilter);
    return statusMatches && governorateMatches;
  });

  return (
    <section className="page inventory-page">
      <header className="page-heading">
        <div>
          <h1>{ar.nav.customers}</h1>
          <p>{ar.customers.description}</p>
        </div>
        {canCreate && (
          <button
            className="button button-primary"
            onClick={() => {
              setEditingCustomer(null);
              setDialogOpen(true);
            }}
            type="button"
          >
            {ar.common.add} {ar.nav.customers}
          </button>
        )}
      </header>
      <nav aria-label="قسم العملاء" className="customer-tabs">
        <button className={view === 'customers' ? 'customer-tab-active' : ''} onClick={() => setView('customers')} type="button">كل العملاء</button>
        <button className={view === 'governorates' ? 'customer-tab-active' : ''} onClick={() => setView('governorates')} type="button">المحافظات</button>
        <button className={view === 'trash' ? 'customer-tab-active' : ''} onClick={() => setView('trash')} type="button">سلة المحذوفات</button>
      </nav>
      {view !== 'customers' ? (
        <PageState
          kind="empty"
          title={view === 'governorates' ? 'المحافظات' : 'سلة المحذوفات'}
          message={
            view === 'governorates'
              ? 'لا يوجد عقد محافظات مستقل في الواجهة الحالية. سيتم تفعيل هذه الشاشة عند إضافة عقد API دون تغيير شاشة العملاء.'
              : 'لا يوجد حذف أو سلة محذوفات في عقد API الحالي؛ البيانات الحالية تظل محفوظة ولا يتم إخفاؤها من الواجهة.'
          }
        />
      ) : (
        <>
      <div className="inventory-toolbar">
        <label className="inventory-search">
          <span>{ar.common.search}</span>
          <input
            aria-label={ar.common.search}
            className="input"
            onChange={(event) =>
              setQuery((current) => ({
                ...current,
                search: event.currentTarget.value,
                page: 1,
              }))
            }
            type="search"
            value={query.search}
          />
        </label>
        <label className="inventory-search">
          <span>الحالة</span>
          <select className="select" onChange={(event) => setStatusFilter(event.currentTarget.value as typeof statusFilter)} value={statusFilter}>
            <option value="all">الكل</option>
            <option value="active">نشط</option>
            <option value="inactive">موقوف</option>
          </select>
        </label>
        <label className="inventory-search">
          <span>المحافظة</span>
          <input className="input" onChange={(event) => setGovernorateFilter(event.currentTarget.value)} placeholder="كل المحافظات" value={governorateFilter} />
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
      ) : result.data ? (
        <>
          <DataTable
            columns={columns}
            emptyMessage={ar.common.noResults}
            getRowKey={(row) => row.id}
            rows={rows}
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
      {dialogOpen && (
        <CustomerDialog
          customer={editingCustomer}
          onClose={() => {
            setDialogOpen(false);
            setEditingCustomer(null);
          }}
        />
      )}
        </>
      )}
    </section>
  );
}
