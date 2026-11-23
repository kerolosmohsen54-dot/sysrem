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
  createTreasuryAccount,
  getTreasuryBalance,
  listTreasuryAccounts,
  listTreasuryEntries,
  postTreasuryEntry,
  type TreasuryAccount,
  type TreasuryEntry,
} from './api';

const amountPattern = /^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$/;

function safeInteger(value: string): number {
  if (!/^[1-9]\d*$/.test(value)) throw new Error(ar.common.quantityMustBeInteger);
  const integer = BigInt(value);
  if (integer > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error(ar.common.quantityMustBeInteger);
  return Number(integer);
}

function AccountBalance({ accountId }: { accountId: number }) {
  const balance = useQuery({
    queryKey: ['/treasury/accounts', accountId, 'balance'],
    queryFn: () => getTreasuryBalance(accountId),
  });
  if (balance.isLoading) return <span>{ar.app.loading}</span>;
  if (balance.isError || !balance.data) {
    return <span role="alert">{ar.common.requestFailed}</span>;
  }
  return <span>{formatMoney(balance.data.balance_egp)}</span>;
}

export function TreasuryPage() {
  const { user } = useAuth();
  const client = useQueryClient();
  const canManage = Boolean(
    user?.permissions.includes('*') || user?.permissions.includes('treasury.manage'),
  );
  const canPost = Boolean(
    user?.permissions.includes('*') || user?.permissions.includes('treasury.post'),
  );
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const accountKey = useRef<string | null>(null);
  const entryKey = useRef<string | null>(null);
  const query: ListQuery = { page, perPage: 10, search: '' };
  const accounts = useQuery({
    queryKey: ['/treasury/accounts', query],
    queryFn: () => listTreasuryAccounts(query),
  });
  const entries = useQuery({
    queryKey: ['/treasury/entries', query],
    queryFn: () => listTreasuryEntries(query),
  });
  const accountColumns: DataColumn<TreasuryAccount>[] = [
    { key: 'code', header: ar.finance.accountCode, render: (row) => row.code },
    { key: 'name', header: ar.finance.accountName, render: (row) => row.name },
    {
      key: 'type',
      header: ar.finance.accountType,
      render: (row) => ar.finance.accountTypes[row.account_type],
    },
    {
      key: 'balance',
      header: ar.finance.accountBalance,
      render: (row) => <AccountBalance accountId={row.id} />,
    },
  ];
  const entryColumns: DataColumn<TreasuryEntry>[] = [
    { key: 'date', header: ar.common.date, render: (row) => formatDate(row.entry_date) },
    {
      key: 'direction',
      header: ar.finance.entryDirection,
      render: (row) => ar.finance.directions[row.direction],
    },
    { key: 'description', header: ar.common.description, render: (row) => row.description },
    { key: 'amount', header: ar.finance.amount, render: (row) => formatMoney(row.amount_egp) },
  ];

  const createAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    accountKey.current ??= crypto.randomUUID();
    setError('');
    setSuccess('');
    try {
      await createTreasuryAccount(
        {
          code: String(values.get('code') ?? '').trim(),
          name: String(values.get('name') ?? '').trim(),
          account_type: String(values.get('account_type')) as TreasuryAccount['account_type'],
          notes: String(values.get('notes') ?? '').trim() || null,
        },
        accountKey.current,
      );
      accountKey.current = null;
      setSuccess(ar.common.actionSaved);
      await client.invalidateQueries({ queryKey: ['/treasury/accounts'] });
      form.reset();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : ar.common.networkError);
    }
  };

  const submitEntry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const amount = String(values.get('amount_egp') ?? '');
    if (!amountPattern.test(amount)) {
      setError(ar.common.invalidAmount);
      return;
    }
    entryKey.current ??= crypto.randomUUID();
    setError('');
    setSuccess('');
    try {
      await postTreasuryEntry(
        {
          treasury_account_id: safeInteger(String(values.get('treasury_account_id') ?? '')),
          direction: String(values.get('direction')) as 'in' | 'out',
          entry_date: String(values.get('entry_date') ?? ''),
          amount_egp: amount,
          description: String(values.get('description') ?? '').trim(),
        },
        entryKey.current,
      );
      entryKey.current = null;
      setSuccess(ar.common.actionSaved);
      await Promise.all([
        client.invalidateQueries({ queryKey: ['/treasury/entries'] }),
        client.invalidateQueries({ queryKey: ['/treasury/accounts'] }),
      ]);
      form.reset();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : ar.common.networkError);
    }
  };

  if (accounts.isLoading || entries.isLoading) return <PageState kind="loading" />;
  if (accounts.isError || entries.isError || !accounts.data || !entries.data) {
    return (
      <PageState
        kind="error"
        message={ar.common.requestFailed}
        onRetry={() => {
          void accounts.refetch();
          void entries.refetch();
        }}
      />
    );
  }

  return (
    <section className="page inventory-page">
      <header className="page-heading">
        <div>
          <h1>{ar.finance.treasuryAccounts}</h1>
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
      <section aria-labelledby="treasury-accounts-title">
        <h2 id="treasury-accounts-title">{ar.finance.treasuryAccounts}</h2>
        <DataTable
          columns={accountColumns}
          rows={accounts.data.data}
          getRowKey={(row) => row.id}
          emptyMessage={ar.common.noResults}
        />
      </section>
      {canManage && (
        <form className="stack-form" onSubmit={createAccount}>
          <h2>{ar.finance.createAccount}</h2>
          <FormField
            id="treasury-code"
            label={ar.finance.accountCode}
            name="code"
            required
            maxLength={80}
          />
          <FormField
            id="treasury-name"
            label={ar.finance.accountName}
            name="name"
            required
            maxLength={160}
          />
          <label className="form-field">
            <span>{ar.finance.accountType}</span>
            <select className="input" name="account_type" required defaultValue="">
              <option value="">{ar.common.select}</option>
              {(['cash', 'bank', 'other'] as const).map((type) => (
                <option key={type} value={type}>
                  {ar.finance.accountTypes[type]}
                </option>
              ))}
            </select>
          </label>
          <FormField
            id="treasury-notes"
            label={ar.common.description}
            name="notes"
            maxLength={500}
          />
          <button className="button button-secondary" type="submit">
            {ar.finance.createAccount}
          </button>
        </form>
      )}
      <section aria-labelledby="treasury-entries-title">
        <h2 id="treasury-entries-title">{ar.finance.treasuryEntries}</h2>
        <DataTable
          columns={entryColumns}
          rows={entries.data.data}
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
            {ar.common.page} {page} {ar.common.of} {entries.data.meta.last_page}
          </span>
          <button
            className="button button-secondary"
            disabled={page >= entries.data.meta.last_page}
            onClick={() => setPage((current) => current + 1)}
            type="button"
          >
            {ar.common.next}
          </button>
        </nav>
      </section>
      {canPost && accounts.data.data.length > 0 && (
        <form className="stack-form" onSubmit={submitEntry}>
          <h2>{ar.finance.postEntry}</h2>
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
            <span>{ar.finance.entryDirection}</span>
            <select className="input" name="direction" required defaultValue="">
              <option value="">{ar.common.select}</option>
              <option value="in">{ar.finance.directions.in}</option>
              <option value="out">{ar.finance.directions.out}</option>
            </select>
          </label>
          <FormField
            id="treasury-entry-date"
            label={ar.finance.entryDate}
            name="entry_date"
            type="date"
            required
          />
          <FormField
            id="treasury-entry-amount"
            label={ar.finance.amount}
            name="amount_egp"
            inputMode="decimal"
            pattern="^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$"
            required
          />
          <FormField
            id="treasury-entry-description"
            label={ar.common.description}
            name="description"
            maxLength={500}
            required
          />
          <button className="button button-primary" type="submit">
            {ar.finance.postEntry}
          </button>
        </form>
      )}
    </section>
  );
}
