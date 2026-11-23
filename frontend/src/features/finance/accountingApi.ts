import { apiRequest } from '../../shared/api/http';
import type { ApiPage } from '../inventory/api';

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
export type Account = {
  id: number; parent_account_id: number | null; code: string; name: string; description: string | null;
  account_type: AccountType; normal_balance: 'debit' | 'credit'; is_control_account: boolean;
  is_active: boolean; balance_egp: string; total_debit: string; total_credit: string;
  has_posted_entries: boolean; posting_allowed: boolean; children: Account[];
};
export type FinancialAccountMapping = {
  mapping_key: string; label: string; account_type: AccountType; normal_balance: 'debit' | 'credit';
  account_id: number; account_code: string; account_name: string;
};
export type PostingMappingOption = Pick<Account, 'id' | 'code' | 'name' | 'account_type' | 'normal_balance'>;
export type JournalLine = {
  id?: number; line_number?: number; account_id: number; account_code?: string; account_name?: string;
  debit_amount: string; credit_amount: string; description?: string | null;
  partner_id?: number | null; partner_name?: string | null;
  treasury_account_id?: number | null; treasury_account_name?: string | null;
};
export type Journal = {
  id: number; entry_number: string; status: 'draft' | 'posted' | 'reversed'; entry_date: string;
  description: string; source_type: string | null; source_id: number | null;
  reversal_of_entry_id: number | null; reversal_entry_id?: number | null; posted_at?: string | null;
  lines: JournalLine[]; total_debit: string; total_credit: string; is_balanced: boolean; difference: string;
};
export type JournalRow = Omit<Journal, 'lines'> & { line_count: number; lines?: undefined };
export type Period = { from_date: string; to_date: string };
export type Ledger = {
  account: Pick<Account, 'id' | 'code' | 'name' | 'account_type' | 'normal_balance'>; period: Period;
  opening_balance: string; closing_balance: string; period_debit: string; period_credit: string;
  lines: { journal_entry_id: number; entry_number: string; entry_date: string; description: string;
    debit_amount: string; credit_amount: string; running_balance: string }[];
};
export type TrialBalance = { period: Period; accounts: (Pick<Account, 'id' | 'code' | 'name' | 'account_type'> & {
  opening_balance: string; period_debit: string; period_credit: string; closing_debit: string;
  closing_credit: string; posted_entry_count: number;
})[]; totals: { period_debit: string; period_credit: string; closing_debit: string; closing_credit: string;
  period_difference: string; difference: string; is_balanced: boolean } };
export type StatementGroup = { total_revenue?: string; total_expenses?: string; net_income?: string;
  total_assets?: string; total_liabilities?: string; equity_accounts_total?: string; accumulated_income?: string;
  total_equity?: string; difference?: string; is_balanced?: boolean;
  revenues?: { id: number; code: string; name: string; amount: string }[];
  expenses?: { id: number; code: string; name: string; amount: string }[];
  assets?: { id: number; code: string; name: string; amount: string }[];
  liabilities?: { id: number; code: string; name: string; amount: string }[];
  equity?: { id: number; code: string; name: string; amount: string }[];
  opening_balance?: string; inflows?: string; outflows?: string; net_cash_flow?: string; closing_balance?: string;
  accounts?: { treasury_account_id: number; name: string; opening_balance: string; period_debit: string;
    period_credit: string; closing_balance: string }[] };
export type Statements = { period: Period; income_statement: StatementGroup; balance_sheet: StatementGroup; cash_flow: StatementGroup };
export type Adjustment = {
  id: number; adjustment_number: string; reference_number: string; adjustment_type: string;
  adjustment_date: string; debit_account_id: number; credit_account_id: number;
  debit_treasury_account_id: number | null; credit_treasury_account_id: number | null;
  amount: string; reason: string; notes: string | null; journal_entry: Journal;
  audit: { id: number; actor_name_snapshot: string; action: string; created_at: string }[];
};

function query(values: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => { if (value !== undefined && value !== '') search.set(key, String(value)); });
  return search.toString();
}

export const accountingApi = {
  accounts: () => apiRequest<{ data: Account[]; meta: { account_count: number; currency: string } }>('/accounting/accounts'),
  accountMappings: () => apiRequest<{ data: FinancialAccountMapping[]; accounts: PostingMappingOption[] }>('/accounting/auto-posting-mappings'),
  updateAccountMapping: (key: string, accountId: number) => apiRequest<{ data: FinancialAccountMapping }>(`/accounting/auto-posting-mappings/${encodeURIComponent(key)}`, { method: 'PUT', body: { account_id: accountId } }),
  createAccount: (body: Partial<Account>) => apiRequest<{ data: Account }>('/accounting/accounts', { method: 'POST', body }),
  updateAccount: (id: number, body: Partial<Account>) => apiRequest<{ data: Account }>(`/accounting/accounts/${id}`, { method: 'PUT', body }),
  journals: (filters: Record<string, string | number | undefined>) => apiRequest<ApiPage<JournalRow>>(`/accounting/journals?${query(filters)}`),
  journal: (id: number) => apiRequest<{ data: Journal }>(`/accounting/journals/${id}`),
  createJournal: (body: { entry_date: string; description: string; lines: JournalLine[] }) => apiRequest<{ data: Journal }>('/accounting/journals', { method: 'POST', body }),
  updateJournal: (id: number, body: { entry_date: string; description: string; lines: JournalLine[] }) => apiRequest<{ data: Journal }>(`/accounting/journals/${id}`, { method: 'PUT', body }),
  postJournal: (id: number) => apiRequest<{ data: Journal }>(`/accounting/journals/${id}/post`, { method: 'POST', body: {} }),
  reverseJournal: (id: number, body: { reason: string; reversal_date: string }) => apiRequest<{ data: Journal }>(`/accounting/journals/${id}/reverse`, { method: 'POST', body }),
  ledger: (accountId: number, period: Period) => apiRequest<{ data: Ledger }>(`/accounting/ledger?${query({ account_id: accountId, ...period })}`),
  trialBalance: (period: Period) => apiRequest<{ data: TrialBalance }>(`/accounting/trial-balance?${query(period)}`),
  statements: (period: Period) => apiRequest<{ data: Statements }>(`/accounting/statements?${query(period)}`),
  adjustments: (filters: Record<string, string | number | undefined>) => apiRequest<ApiPage<Record<string, unknown>>>(`/accounting/adjustments?${query(filters)}`),
  createAdjustment: (body: Record<string, unknown>, idempotencyKey: string) => apiRequest<{ data: Adjustment }>('/accounting/adjustments', { method: 'POST', body, idempotencyKey }),
  adjustment: (id: number) => apiRequest<{ data: Adjustment }>(`/accounting/adjustments/${id}`),
};
