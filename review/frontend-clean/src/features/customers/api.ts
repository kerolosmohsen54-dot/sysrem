import { apiRequest } from '../../shared/api/http';
import { listResource, type ApiPage, type ListQuery } from '../inventory/api';

export type Customer = {
  id: number;
  name: string;
  phone: string | null;
  email?: string | null;
  address?: string | null;
  salesperson?: string | null;
  tax_number?: string | null;
  payment_terms?: string | null;
  governorate: string | null;
  credit_limit: string | null;
  balance_egp?: string | null;
  unallocated_collection_egp?: string | null;
  is_active: boolean;
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
};

export type CustomerStatement = ApiPage<CustomerStatementRow> & {
  summary: {
    current_balance_egp: string;
    unallocated_collections_egp: string;
  };
};

export function listCustomers(query: ListQuery): Promise<ApiPage<Customer>> {
  return listResource<Customer>('/customers', query);
}

export function getCustomer(customerId: string): Promise<Customer> {
  return apiRequest<Customer>(`/customers/${encodeURIComponent(customerId)}`);
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
  return apiRequest<Customer>('/customers', { method: 'POST', body: input });
}

export function updateCustomer(customerId: number, input: CustomerInput): Promise<Customer> {
  return apiRequest<Customer>(`/customers/${customerId}`, { method: 'PATCH', body: input });
}
