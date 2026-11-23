import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type FormEvent } from 'react';
import { ApiError } from '../../shared/api/errors';
import { useAuth } from '../../shared/auth/AuthProvider';
import { DataTable, type DataColumn } from '../../shared/components/DataTable';
import { FormField } from '../../shared/components/FormField';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import { formatDate, formatMoney } from '../../shared/utils/format';
import type { ListQuery } from '../inventory/api';
import {
  createExpenseCategory,
  listExpenseCategories,
  listExpenses,
  listTreasuryAccounts,
  postExpense,
  type Expense,
} from './api';

const amountPattern = /^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$/;

function safeInteger(value: string): number {
  if (!/^[1-9]\d*$/.test(value)) throw new Error(ar.common.quantityMustBeInteger);
  const integer = BigInt(value);
  if (integer > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error(ar.common.quantityMustBeInteger);
  return Number(integer);
}

export function ExpensePage() {
  const { user } = useAuth();
  const client = useQueryClient();
  const canPost = Boolean(
    user?.permissions.includes('*') || user?.permissions.includes('expenses.post'),
  );
  const canManageCategories = Boolean(
    user?.permissions.includes('*') || user?.permissions.includes('expense_categories.manage'),
  );
  const [page, setPage] = useState(1);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const expenseKey = useRef<string | null>(null);
  const categoryKey = useRef<string | null>(null);
  const query: ListQuery = { page, perPage: 10, search: '' };
  const filters = {
    ...(fromDate ? { date_from: fromDate } : {}),
    ...(toDate ? { date_to: toDate } : {}),
  };
  const expenses = useQuery({
    queryKey: ['/expenses', query, filters],
    queryFn: () => listExpenses(query, filters),
  });
  const accounts = useQuery({
    queryKey: ['/treasury/accounts', 'expense-options'],
    queryFn: () => listTreasuryAccounts({ page: 1, perPage: 100, search: '' }),
  });
  const categories = useQuery({
    queryKey: ['/expense-categories', 'active'],
    queryFn: () => listExpenseCategories({ page: 1, perPage: 100, search: '' }),
  });
  const columns: DataColumn<Expense>[] = [
    { key: 'date', header: ar.finance.expenseDate, render: (row) => formatDate(row.expense_date) },
    {
      key: 'category',
      header: ar.finance.expenseCategory,
      render: (row) => row.expense_category_name,
    },
    {
      key: 'account',
      header: ar.finance.treasuryAccounts,
      render: (row) => row.treasury_account_name,
    },
    { key: 'description', header: ar.common.description, render: (row) => row.description },
    { key: 'amount', header: ar.finance.amount, render: (row) => formatMoney(row.amount_egp) },
    { key: 'reference', header: ar.common.reference, render: (row) => row.reference || '—' },
  ];

  const submitExpense = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const amount = String(values.get('amount_egp') ?? '');
    if (!amountPattern.test(amount)) {
      setError(ar.common.invalidAmount);
      return;
    }
    expenseKey.current ??= crypto.randomUUID();
    setError('');
    setSuccess('');
    try {
      await postExpense(
        {
          expense_date: String(values.get('expense_date') ?? ''),
          treasury_account_id: safeInteger(String(values.get('treasury_account_id') ?? '')),
          expense_category_id: safeInteger(String(values.get('expense_category_id') ?? '')),
          amount_egp: amount,
          description: String(values.get('description') ?? '').trim(),
          reference: String(values.get('reference') ?? '').trim() || null,
        },
        expenseKey.current,
      );
      expenseKey.current = null;
      setSuccess(ar.common.actionSaved);
      await client.invalidateQueries({ queryKey: ['/expenses'] });
      form.reset();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : ar.common.networkError);
    }
  };

  const submitCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    categoryKey.current ??= crypto.randomUUID();
    setError('');
    try {
      await createExpenseCategory(String(values.get('name') ?? '').trim(), categoryKey.current);
      categoryKey.current = null;
      setSuccess(ar.common.actionSaved);
      await client.invalidateQueries({ queryKey: ['/expense-categories'] });
      form.reset();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : ar.common.networkError);
    }
  };

  if (expenses.isLoading || accounts.isLoading || categories.isLoading)
    return <PageState kind="loading" />;
  if (
    expenses.isError ||
    accounts.isError ||
    categories.isError ||
    !expenses.data ||
    !accounts.data ||
    !categories.data
  ) {
    return (
      <PageState
        kind="error"
        message={ar.common.requestFailed}
        onRetry={() => {
          void expenses.refetch();
          void accounts.refetch();
          void categories.refetch();
        }}
      />
    );
  }

  return (
    <section className="page inventory-page">
      <header className="page-heading">
        <div>
          <h1>{ar.finance.expenses}</h1>
          <p>{ar.finance.financeDescription}</p>
        </div>
      </header>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="inline-success" role="status">
          {success}
        </p>
      )}
      <div className="inventory-toolbar">
        <FormField
          id="expense-from-date"
          label={ar.inventory.fromDate}
          type="date"
          value={fromDate}
          onChange={(event) => {
            setFromDate(event.currentTarget.value);
            setPage(1);
          }}
        />
        <FormField
          id="expense-to-date"
          label={ar.inventory.toDate}
          type="date"
          value={toDate}
          onChange={(event) => {
            setToDate(event.currentTarget.value);
            setPage(1);
          }}
        />
      </div>
      <DataTable
        columns={columns}
        rows={expenses.data.data}
        getRowKey={(row) => row.id}
        emptyMessage={ar.common.noResults}
      />
      <nav aria-label={ar.inventory.paginationLabel} className="inventory-pagination">
        <button
          className="button button-secondary"
          disabled={page <= 1}
          onClick={() => setPage((current) => current - 1)}
          type="button"
        >
          {ar.common.previous}
        </button>
        <span>
          {ar.common.page} {page} {ar.common.of} {expenses.data.meta.last_page}
        </span>
        <button
          className="button button-secondary"
          disabled={page >= expenses.data.meta.last_page}
          onClick={() => setPage((current) => current + 1)}
          type="button"
        >
          {ar.common.next}
        </button>
      </nav>
      {canManageCategories && (
        <form className="inventory-toolbar" onSubmit={submitCategory}>
          <FormField
            id="expense-category-name"
            label={ar.finance.expenseCategory}
            name="name"
            required
            maxLength={160}
          />
          <button className="button button-secondary" type="submit">
            {ar.common.add}
          </button>
        </form>
      )}
      {canPost && accounts.data.data.length > 0 && categories.data.data.length > 0 && (
        <form className="stack-form" onSubmit={submitExpense}>
          <h2>{ar.finance.recordExpense}</h2>
          <FormField
            id="expense-date"
            label={ar.finance.expenseDate}
            name="expense_date"
            type="date"
            required
          />
          <label className="form-field">
            <span>{ar.finance.treasuryAccounts}</span>
            <select className="input" name="treasury_account_id" required defaultValue="">
              <option value="">{ar.common.select}</option>
              {accounts.data.data.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>{ar.finance.expenseCategory}</span>
            <select className="input" name="expense_category_id" required defaultValue="">
              <option value="">{ar.common.select}</option>
              {categories.data.data.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <FormField
            id="expense-amount"
            label={ar.finance.amount}
            name="amount_egp"
            inputMode="decimal"
            pattern="^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$"
            required
          />
          <FormField
            id="expense-description"
            label={ar.finance.expenseDescription}
            name="description"
            required
            maxLength={500}
          />
          <FormField
            id="expense-reference"
            label={ar.finance.expenseReference}
            name="reference"
            maxLength={160}
          />
          <button className="button button-primary" type="submit">
            {ar.finance.recordExpense}
          </button>
        </form>
      )}
      {canPost && categories.data.data.length === 0 && !canManageCategories && (
        <PageState kind="empty" title={ar.common.noResults} />
      )}
    </section>
  );
}
