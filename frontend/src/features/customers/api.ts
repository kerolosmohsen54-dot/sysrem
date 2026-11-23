import { apiRequest } from '../../shared/api/http';
import { listResource, type ApiPage, type ListQuery } from '../inventory/api';
import type { OrderRecord } from '../orders/api';
import type { CollectionReceipt, Invoice } from '../sales/api';

export type Customer = {
  id: number;
  name: string;
  phone: string | null;
  email?: string | null;
  address?: string | null;
  salesperson?: string | null;
  tax_number?: string | null;
  payment_terms?: string | null;
  notes?: string | null;
  governorate: string | null;
  credit_limit: string | null;
  balance_egp?: string | null;
  balance?: { balance: string; unapplied_receipts?: string } | null;
  last_invoice_number?: string | null;
  last_invoice_date?: string | null;
  unallocated_collection_egp?: string | null;
  invoices_total_egp?: string;
  paid_total_egp?: string;
  remaining_total_egp?: string;
  last_activity_date?: string | null;
  is_active: boolean;
  status?: 'active' | 'paused' | 'blocked';
};

export type CustomerListPage = ApiPage<Customer> & {
  meta: ApiPage<Customer>['meta'] & {
    customer_summary?: { total_customers: number; active_customers: number };
  };
};

export type CustomerInput = {
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  salesperson?: string | null;
  tax_number?: string | null;
  payment_terms?: string | null;
  governorate: string | null;
  credit_limit?: string;
  notes: string | null;
  is_active?: boolean;
  status?: 'active' | 'paused' | 'blocked';
};

export type CustomerOpeningBalanceInput = {
  direction: 'debit' | 'credit';
  amount_egp: string;
  issue_date: string;
  notes?: string | null;
};

export type CustomerStatementRow = {
  id: number;
  document_type: string;
  reference: string;
  document_date: string;
  description: string | null;
  debit_egp: string;
  credit_egp: string;
  unallocated_egp: string;
  recording_source?: string | null;
};

export type CustomerStatement = ApiPage<CustomerStatementRow> & {
  customer?: Pick<Customer, 'id' | 'name' | 'phone'>;
  summary: {
    current_balance_egp: string;
    unallocated_collections_egp: string;
  };
};

export type CustomerLiquidation = {
  customer: Customer;
  invoices: Array<{ id: number; document_number?: string; issue_date?: string; total_amount: string; status: string }>;
  payments: Array<{ id: number; receipt_number?: string; receipt_date?: string; amount: string; status: string }>;
  returns: Array<{ id: number; document_number?: string; issue_date?: string; total_amount: string; status: string }>;
  invoice_total_egp: string;
  collection_total_egp: string;
  return_total_egp: string;
  balance_egp: string;
};

export type Governorate = { id: number; name: string; sort_order: number; is_active: boolean; customers_count: number };
export type CustomerAttachment = {
  id: number;
  customer_id: number;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string | null;
  content_url: string;
};

export function listGovernorates(query: ListQuery, includeInactive = false): Promise<ApiPage<Governorate>> {
  return listResource<Governorate>('/reference/governorates', query, includeInactive ? { include_inactive: 'true' } : {});
}

export function createGovernorate(name: string): Promise<{ data: Governorate }> {
  return apiRequest<{ data: Governorate }>('/reference/governorates', { method: 'POST', body: { name } });
}

export function updateGovernorate(id: number, input: Partial<Pick<Governorate, 'name' | 'is_active'>>): Promise<{ data: Governorate }> {
  return apiRequest<{ data: Governorate }>(`/reference/governorates/${id}`, { method: 'PATCH', body: input });
}

export function deleteGovernorate(id: number): Promise<{ data: Governorate }> {
  return apiRequest<{ data: Governorate }>(`/reference/governorates/${id}`, { method: 'DELETE' });
}

export function listCustomers(query: ListQuery, filters: Record<string, string> = {}): Promise<CustomerListPage> {
  return listResource<Customer>('/customers', query, filters) as Promise<CustomerListPage>;
}

export function getCustomer(customerId: string): Promise<Customer> {
  return apiRequest<{ data: Customer }>(`/customers/${encodeURIComponent(customerId)}`).then((result) => result.data);
}

export function getCustomerLiquidation(customerId: string): Promise<{ data: CustomerLiquidation }> {
  return apiRequest<{ data: CustomerLiquidation }>(
    `/customers/${encodeURIComponent(customerId)}/liquidation`,
  );
}

export function getCustomerStatement(
  customerId: number,
  query: ListQuery,
  dates: { fromDate?: string; toDate?: string },
): Promise<CustomerStatement> {
  const params = new URLSearchParams({
    page: String(query.page),
    per_page: String(query.perPage),
    ...(query.search ? { search: query.search } : {}),
    ...(query.sortBy ? { sort_by: query.sortBy } : {}),
    ...(query.sortDirection ? { sort_direction: query.sortDirection } : {}),
    ...(dates.fromDate ? { from_date: dates.fromDate } : {}),
    ...(dates.toDate ? { to_date: dates.toDate } : {}),
  });
  return apiRequest<CustomerStatement>(
    `/reports/customers/${customerId}/statement?${params.toString()}`,
  );
}

export function createCustomer(input: CustomerInput): Promise<Customer> {
  return apiRequest<{ data: Customer }>('/customers', { method: 'POST', body: input }).then((result) => result.data);
}

export function updateCustomer(customerId: number, input: CustomerInput): Promise<Customer> {
  return apiRequest<{ data: Customer }>(`/customers/${customerId}`, { method: 'PATCH', body: input }).then((result) => result.data);
}

export function postCustomerOpeningBalance(customerId: number, input: CustomerOpeningBalanceInput): Promise<void> {
  return apiRequest<unknown>(`/customers/${customerId}/opening-balance`, { method: 'POST', body: input }).then(() => undefined);
}

export function archiveCustomer(customerId: number): Promise<Customer> {
  return apiRequest<{ data: Customer }>(`/customers/${customerId}`, { method: 'DELETE' }).then((result) => result.data);
}

export function listCustomerOrders(customerId: number, query: ListQuery): Promise<ApiPage<OrderRecord>> {
  return listResource<OrderRecord>('/orders', query, { customer_id: String(customerId) });
}

export function listCustomerInvoices(customerId: number, query: ListQuery): Promise<ApiPage<Invoice>> {
  return listResource<Record<string, unknown>>('/invoices', query, { customer_id: String(customerId) }).then((page) => ({
    ...page,
    data: page.data.map((row) => ({
      id: Number(row.id), invoice_number: String(row.document_number ?? ''), customer_id: Number(row.customer_id),
      customer_name: String(row.customer_name ?? ''), issue_date: String(row.issue_date ?? ''),
      due_date: row.due_date == null ? null : String(row.due_date), total_egp: row.total_amount == null ? null : String(row.total_amount),
      paid_egp: row.paid_egp == null ? null : String(row.paid_egp), remaining_egp: row.remaining_egp == null ? null : String(row.remaining_egp),
      issuer_name: String(row.issuer_name_snapshot ?? ''), status: row.status === 'posted' ? 'issued' : row.status === 'reversed' ? 'cancelled' : 'draft',
    })) as Invoice[],
  }));
}

export function listCustomerPayments(customerId: number, query: ListQuery): Promise<ApiPage<CollectionReceipt>> {
  return listResource<Record<string, unknown>>('/collections', query, { customer_id: String(customerId) }).then((page) => ({
    ...page,
    data: page.data.map((row) => ({
      id: Number(row.id), receipt_number: String(row.receipt_number ?? ''), customer_id: Number(row.customer_id),
      customer_name: String(row.customer_name ?? ''), treasury_account_id: Number(row.treasury_account_id),
      receipt_date: String(row.receipt_date ?? ''), amount_egp: String(row.amount ?? row.amount_egp ?? '0'),
      allocated_egp: row.allocated_egp == null ? null : String(row.allocated_egp),
      unallocated_egp: String(row.unapplied_amount ?? row.unallocated_egp ?? '0'),
    })) as CollectionReceipt[],
  }));
}

export function listCustomerAttachments(customerId: number): Promise<CustomerAttachment[]> {
  return apiRequest<{ data: CustomerAttachment[] }>(`/customers/${customerId}/attachments`).then((result) => result.data);
}

export function uploadCustomerAttachment(customerId: number, file: File): Promise<CustomerAttachment> {
  const body = new FormData();
  body.append('file', file);
  return apiRequest<{ data: CustomerAttachment }>(`/customers/${customerId}/attachments`, { method: 'POST', body }).then((result) => result.data);
}

export function deleteCustomerAttachment(customerId: number, attachmentId: number): Promise<void> {
  return apiRequest<unknown>(`/customers/${customerId}/attachments/${attachmentId}`, { method: 'DELETE' }).then(() => undefined);
}
