import { apiRequest } from '../../shared/api/http';
import { listRawPaginator, listResource, type ApiPage, type ListQuery } from '../inventory/api';

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
  source_type?: string | null;
  source_id?: number | null;
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

export type Partner = {
  id: number;
  user_id?: number | null;
  name: string;
  phone: string | null;
  status: 'active' | 'inactive';
  profit_percentage: string | null;
  profit_summary?: {
    invoice_count: number;
    profit_egp: string;
    paid_egp: string;
    due_egp: string;
    unpriced_line_count: number;
  };
};

export type PartnerProfitDetail = {
  partner: Partner;
  profit_summary: NonNullable<Partner['profit_summary']>;
  company_profit_from_drivers_egp: string | null;
  ledger: {
    id: number;
    entry_type: 'accrual' | 'payout' | 'reversal';
    amount_egp: string;
    effective_date: string;
    notes: string | null;
    invoice_number: string | null;
    purchase_invoice_id: number | null;
    reference_number: string | null;
    partner_payment_id: number | null;
  }[];
  invoices: {
    id: number;
    invoice_number: string;
    issue_date: string;
    issuer_name: string;
    customer_name: string;
    profit_egp: string;
    lines: {
      product_name: string;
      sku: string | null;
      sold_quantity: number;
      returned_quantity: number;
      net_quantity: number;
      company_price_egp: string | null;
      purchase_cost_egp: string | null;
      container_number: string | null;
      unit_price_egp: string;
      markup_egp: string | null;
      profit_egp: string | null;
    }[];
  }[];
};

export function listPartners(query: ListQuery): Promise<ApiPage<Partner>> {
  return listRawPaginator<Partner>('/partners', query);
}

export function getPartner(partnerId: number): Promise<PartnerProfitDetail> {
  return apiRequest<{ data: PartnerProfitDetail }>(`/partners/${partnerId}`).then((response) => response.data);
}

export function createPartner(input: { name: string; phone: string | null }) {
  return apiRequest<{ data: Partner }>('/partners', { method: 'POST', body: input });
}

export function updatePartner(partnerId: number, input: Pick<Partner, 'name' | 'phone' | 'status'>) {
  return apiRequest<{ data: Partner }>(`/partners/${partnerId}`, { method: 'PATCH', body: input });
}

export function listTreasuryAccounts(query: ListQuery) {
  return listResource<TreasuryAccount>('/treasury/accounts', query);
}

export function getTreasuryBalance(accountId: number) {
  return apiRequest<{ data: { balance_egp: string } }>(`/treasury/accounts/${accountId}/balance`)
    .then((response) => response.data);
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

export function updateTreasuryAccount(
  accountId: number,
  input: Pick<TreasuryAccount, 'code' | 'name' | 'account_type' | 'notes' | 'is_active'>,
) {
  return apiRequest<{ data: TreasuryAccount }>(`/treasury/accounts/${accountId}`, {
    method: 'PATCH',
    body: input,
  });
}

type TreasuryEntryResponse = Omit<TreasuryEntry, 'amount_egp' | 'reference'> & {
  amount?: string;
  amount_egp?: string;
  entry_number?: string | null;
  reference?: string | null;
};

export async function listTreasuryEntries(
  query: ListQuery,
  filters: Record<string, string> = {},
): Promise<ApiPage<TreasuryEntry>> {
  const page = await listResource<TreasuryEntryResponse>('/treasury/entries', query, filters);
  return {
    ...page,
    data: page.data.map((entry) => {
      const amount = entry.amount_egp ?? entry.amount;
      if (typeof amount !== 'string') {
        throw new TypeError('بيانات حركة الخزينة لا تتضمن مبلغاً رقمياً صالحاً.');
      }
      return {
        ...entry,
        amount_egp: amount,
        reference: entry.reference ?? entry.entry_number ?? null,
      };
    }),
  };
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
  return listResource<ExpenseCategory>('/expense-categories', query, { is_active: '1' });
}

export function createExpenseCategory(name: string, idempotencyKey: string) {
  return apiRequest<ExpenseCategory>('/expense-categories', {
    method: 'POST',
    body: { name },
    idempotencyKey,
  });
}

type BackendExpense = Omit<Expense, 'amount_egp' | 'expense_category_name'> & {
  amount: string;
  amount_egp?: string;
  category_name: string | null;
  expense_category_name?: string;
};

function normalizeExpense(expense: BackendExpense): Expense {
  return {
    ...expense,
    amount_egp: expense.amount_egp ?? expense.amount,
    expense_category_name: expense.expense_category_name ?? expense.category_name ?? '',
  };
}

export function listExpenses(
  query: ListQuery,
  filters: Record<string, string> = {},
): Promise<ApiPage<Expense>> {
  return listResource<BackendExpense>('/expenses', query, filters).then((result) => ({
    ...result,
    data: result.data.map(normalizeExpense),
  }));
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
