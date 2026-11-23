import { apiRequest } from '../../shared/api/http';
import { listResource, type ApiPage, type ListQuery } from '../inventory/api';

export type TreasuryAccount = {
  id: number;
  code: string;
  name: string;
  account_type: 'cash' | 'bank' | 'other';
  notes: string | null;
  is_active: boolean;
};

export type TreasuryEntry = {
  id: number;
  treasury_account_id: number;
  direction: 'in' | 'out';
  entry_date: string;
  amount_egp: string;
  description: string;
  reference: string | null;
};

export type TreasuryTransfer = {
  id: number;
  transfer_date: string;
  from_treasury_account_id: number;
  from_account_name: string;
  to_treasury_account_id: number;
  to_account_name: string;
  amount_egp: string;
  notes: string | null;
};

export type ExpenseCategory = {
  id: number;
  name: string;
  is_active: boolean;
};

export type Expense = {
  id: number;
  expense_date: string;
  treasury_account_id: number;
  treasury_account_name: string;
  expense_category_id: number;
  expense_category_name: string;
  amount_egp: string;
  description: string;
  reference: string | null;
};

export function listTreasuryAccounts(query: ListQuery) {
  return listResource<TreasuryAccount>('/treasury/accounts', query);
}

export function getTreasuryBalance(accountId: number) {
  return apiRequest<{ balance_egp: string }>(`/treasury/accounts/${accountId}/balance`);
}

export function createTreasuryAccount(
  input: Pick<TreasuryAccount, 'code' | 'name' | 'account_type' | 'notes'>,
  idempotencyKey: string,
) {
  return apiRequest<TreasuryAccount>('/treasury/accounts', {
    method: 'POST',
    body: input,
    idempotencyKey,
  });
}

export function listTreasuryEntries(
  query: ListQuery,
  filters: Record<string, string> = {},
): Promise<ApiPage<TreasuryEntry>> {
  return listResource<TreasuryEntry>('/treasury/entries', query, filters);
}

export function postTreasuryEntry(
  input: {
    treasury_account_id: number;
    direction: 'in' | 'out';
    entry_date: string;
    amount_egp: string;
    description: string;
  },
  idempotencyKey: string,
) {
  return apiRequest<TreasuryEntry>('/treasury/entries', {
    method: 'POST',
    body: input,
    idempotencyKey,
  });
}

export function listTreasuryTransfers(query: ListQuery, filters: Record<string, string> = {}) {
  return listResource<TreasuryTransfer>('/treasury/transfers', query, filters);
}

export function postTreasuryTransfer(
  input: {
    transfer_date: string;
    from_treasury_account_id: number;
    to_treasury_account_id: number;
    amount_egp: string;
    notes: string | null;
  },
  idempotencyKey: string,
) {
  return apiRequest<TreasuryTransfer>('/treasury/transfers', {
    method: 'POST',
    body: input,
    idempotencyKey,
  });
}

export function listExpenseCategories(query: ListQuery) {
  return listResource<ExpenseCategory>('/expense-categories', query, { is_active: 'true' });
}

export function createExpenseCategory(name: string, idempotencyKey: string) {
  return apiRequest<ExpenseCategory>('/expense-categories', {
    method: 'POST',
    body: { name },
    idempotencyKey,
  });
}

export function listExpenses(query: ListQuery, filters: Record<string, string> = {}) {
  return listResource<Expense>('/expenses', query, filters);
}

export function postExpense(
  input: {
    expense_date: string;
    treasury_account_id: number;
    expense_category_id: number;
    amount_egp: string;
    description: string;
    reference: string | null;
  },
  idempotencyKey: string,
) {
  return apiRequest<Expense>('/expenses', {
    method: 'POST',
    body: input,
    idempotencyKey,
  });
}
