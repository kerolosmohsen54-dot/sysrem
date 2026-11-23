import { apiRequest } from '../../shared/api/http';
import { listResource, type ApiPage, type ListQuery } from '../inventory/api';
import type { InventoryBalance, InventoryMovement } from '../inventory/api';

export type SalesReportRow = {
  id: number;
  document_number: string;
  customer_name: string;
  document_date: string;
  document_type: string;
  status: string;
  total_egp: string | null;
};

export type ProfitReportRow = {
  id: number;
  invoice_number: string;
  customer_name: string;
  issue_date: string;
  revenue_excluding_tax_egp: string;
  snapshot_cost_egp: string | null;
  provisional_profit_egp: string | null;
  provisional_markup_percent: string | null;
  formula: string;
  provisional: boolean;
};

export type ContainerCostReportRow = {
  id: number;
  container_number: string;
  status: string;
  recorded_costs_egp: string | null;
  paid_egp: string | null;
  unpaid_egp: string | null;
  landed_cost_egp: string | null;
};

export type CustomerBalanceReportRow = {
  id: number;
  customer_name: string;
  balance_egp: string;
  unallocated_collection_egp: string;
};

export function listSalesReport(
  query: ListQuery,
  filters: Record<string, string> = {},
): Promise<ApiPage<SalesReportRow>> {
  return listResource<SalesReportRow>('/reports/sales', query, filters);
}

export function listProfitReport(
  query: ListQuery,
  filters: Record<string, string> = {},
): Promise<ApiPage<ProfitReportRow>> {
  return listResource<ProfitReportRow>('/reports/invoice-profit', query, filters);
}

export function listStockReport(query: ListQuery, filters: Record<string, string> = {}) {
  return listResource<InventoryBalance>('/reports/stock', query, filters);
}

export function listStockMovementsReport(query: ListQuery, filters: Record<string, string> = {}) {
  return listResource<InventoryMovement>('/reports/stock-movements', query, filters);
}

export function listContainerCostReport(
  query: ListQuery,
  filters: Record<string, string> = {},
): Promise<ApiPage<ContainerCostReportRow>> {
  return listResource<ContainerCostReportRow>('/reports/container-costs', query, filters);
}

export function listCustomerBalanceReport(
  query: ListQuery,
): Promise<ApiPage<CustomerBalanceReportRow>> {
  return listResource<CustomerBalanceReportRow>('/reports/customer-balances', query);
}

export function getDashboardSummary() {
  return apiRequest<unknown>('/reports/dashboard');
}
