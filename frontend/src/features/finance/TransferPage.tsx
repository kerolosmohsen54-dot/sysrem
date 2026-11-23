import { newIdempotencyKey } from '../../shared/api/http';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type FormEvent } from 'react';
import { ApiError } from '../../shared/api/errors';
import { DataTable, type DataColumn } from '../../shared/components/DataTable';
import { FormField } from '../../shared/components/FormField';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import { formatDate, formatMoney } from '../../shared/utils/format';
import type { ListQuery } from '../inventory/api';
import { listTreasuryAccounts } from './api';
import { listTreasuryTransfers, postTreasuryTransfer, type TreasuryTransfer } from './api';

const amountPattern = /^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$/;

function safeInteger(value: string): number {
  if (!/^[1-9]\d*$/.test(value)) throw new Error(ar.common.quantityMustBeInteger);
  const integer = BigInt(value);
  if (integer > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error(ar.common.quantityMustBeInteger);
  return Number(integer);
}

export function TransferPage() {
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const key = useRef<string | null>(null);
  const query: ListQuery = { page, perPage: 10, search: '' };
  const accounts = useQuery({
    queryKey: ['/treasury/accounts', 'transfer-options'],
    queryFn: () => listTreasuryAccounts({ page: 1, perPage: 100, search: '' }),
  });
  const transfers = useQuery({
    queryKey: ['/treasury/transfers', query],
    queryFn: () => listTreasuryTransfers(query),
  });
  const columns: DataColumn<TreasuryTransfer>[] = [
    {
      key: 'date',
      header: ar.finance.transferDate,
      render: (row) => formatDate(row.transfer_date),
    },
    { key: 'from', header: ar.finance.fromAccount, render: (row) => row.from_account_name },
    { key: 'to', header: ar.finance.toAccount, render: (row) => row.to_account_name },
    { key: 'amount', header: ar.finance.amount, render: (row) => formatMoney(row.amount_egp) },
  ];

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const amount = String(values.get('amount_egp') ?? '');
    if (!amountPattern.test(amount)) {
      setError(ar.common.invalidAmount);
      return;
    }
    let fromId: number;
    let toId: number;
    try {
      fromId = safeInteger(String(values.get('from_treasury_account_id') ?? ''));
      toId = safeInteger(String(values.get('to_treasury_account_id') ?? ''));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : ar.common.requestFailed);
      return;
    }
    if (fromId === toId) {
      setError(ar.finance.sameAccountError);
      return;
    }
    key.current ??= newIdempotencyKey();
    setError('');
    setSuccess('');
    try {
      await postTreasuryTransfer(
        {
          transfer_date: String(values.get('transfer_date') ?? ''),
          from_treasury_account_id: fromId,
          to_treasury_account_id: toId,
          amount_egp: amount,
          notes: String(values.get('notes') ?? '').trim() || null,
        },
        key.current,
      );
      key.current = null;
      setSuccess(ar.common.actionSaved);
      await client.invalidateQueries({ queryKey: ['/treasury/transfers'] });
      await client.invalidateQueries({ queryKey: ['/treasury/accounts'] });
      form.reset();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : ar.common.networkError);
    }
  };

  if (accounts.isLoading || transfers.isLoading) return <PageState kind="loading" />;
  if (accounts.isError || transfers.isError || !accounts.data || !transfers.data) {
    return (
      <PageState
        kind="error"
        message={ar.common.requestFailed}
        onRetry={() => {
          void accounts.refetch();
          void transfers.refetch();
        }}
      />
    );
  }

  return (
    <section className="page inventory-page">
      <header className="page-heading">
        <div>
          <h1>{ar.finance.transfers}</h1>
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
      <DataTable
        columns={columns}
        rows={transfers.data.data}
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
          {ar.common.page} {page} {ar.common.of} {transfers.data.meta.last_page}
        </span>
        <button
          className="button button-secondary"
          disabled={page >= transfers.data.meta.last_page}
          onClick={() => setPage((current) => current + 1)}
          type="button"
        >
          {ar.common.next}
        </button>
      </nav>
      <form className="stack-form" onChange={() => { key.current = null; }} onSubmit={submit}>
        <h2>{ar.finance.createTransfer}</h2>
        <FormField
          id="transfer-date"
          label={ar.finance.transferDate}
          name="transfer_date"
          type="date"
          required
        />
        <label className="form-field">
          <span>{ar.finance.fromAccount}</span>
          <select className="input" name="from_treasury_account_id" required defaultValue="">
            <option value="">{ar.common.select}</option>
            {accounts.data.data.filter((account) => account.is_active).map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </label>
        <label className="form-field">
          <span>{ar.finance.toAccount}</span>
          <select className="input" name="to_treasury_account_id" required defaultValue="">
            <option value="">{ar.common.select}</option>
            {accounts.data.data.filter((account) => account.is_active).map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </label>
        <FormField
          id="transfer-amount"
          label={ar.finance.amount}
          name="amount_egp"
          inputMode="decimal"
          pattern="^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$"
          required
        />
        <FormField id="transfer-notes" label={ar.finance.notes} name="notes" maxLength={1000} />
        <button className="button button-primary" type="submit">
          {ar.finance.createTransfer}
        </button>
      </form>
    </section>
  );
}
