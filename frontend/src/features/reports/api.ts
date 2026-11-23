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
  total_amount?: string;
  discount_amount?: string;
  salesperson_id?: number | null;
  salesperson_name?: string | null;
};

export type SalesReport = ApiPage<SalesReportRow> & {
  summary?: {
    total_sales_egp: string;
    invoice_count: number;
    average_invoice_value_egp: string;
    total_discounts_egp: string;
    top_employee_name: string | null;
    employees: { salesperson_id: number | null; salesperson_name: string; invoice_count: number; discounts_egp: string; total_sales_egp: string }[];
    group_by: 'month' | 'week' | 'employee' | 'customer' | 'discounts';
    groups: { label: string; invoice_count: number; total_sales_egp: string; total_discounts_egp: string }[];
  };
};

export type ProfitReportRow = {
  id: number;
  document_number: string;
  customer_name: string;
  issue_date: string;
  revenue_excluding_tax_egp: string;
  cost_egp: string | null;
  profit_egp: string | null;
  markup_percent: string | null;
  cost_snapshot_complete: boolean;
  formula_status: string;
};

export type ProfitDistributionInvoice = {
  id: number;
  invoice_number: string;
  issue_date: string;
  customer_name: string;
  issuer_type: 'company' | 'partner' | 'driver';
  issuer_name: string;
  sale_revenue_egp: string;
  cogs_egp: string | null;
  surplus_egp: string | null;
  partner_profit_egp: string | null;
  company_profit_egp: string | null;
  total_profit_egp: string | null;
  pricing_status: 'priced' | 'unpriced';
};

export type ProfitDistributionContainer = {
  container_number: string;
  invoice_count: number;
  sale_revenue_egp: string;
  cogs_egp: string | null;
  profit_egp: string | null;
  cost_snapshot_complete: boolean;
};

export type ProfitDistributionReport = {
  data: {
    invoices: ProfitDistributionInvoice[];
    containers: ProfitDistributionContainer[];
    totals: {
      sale_revenue_egp: string;
      cogs_egp: string | null;
      partner_profit_egp: string | null;
      company_profit_egp: string | null;
      total_profit_egp: string | null;
      reconciliation_difference_egp: string | null;
      unpriced_invoice_count: number;
    };
  };
  meta: { formula_status: string; formula: string; from_date: string | null; to_date: string | null };
};

export type ContainerCostReportRow = {
  container: {
    id: number;
    container_number: string;
    status: string;
    origin: string | null;
    destination: string | null;
  };
  total_cost_egp: string;
  paid_egp: string;
  unpaid_egp: string;
  allocated_to_inventory_egp: string;
  costs: {
    id: number;
    cost_type: string;
    description: string | null;
    status: string;
    amount_egp: string;
  }[];
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
): Promise<SalesReport> {
  return listResource<SalesReportRow>('/reports/sales', query, filters) as Promise<SalesReport>;
}

export function listProfitReport(
  query: ListQuery,
  filters: Record<string, string> = {},
): Promise<ApiPage<ProfitReportRow>> {
  return listResource<ProfitReportRow>('/reports/invoice-profit', query, filters);
}

export function getProfitDistributionReport(filters: Record<string, string> = {}) {
  const query = new URLSearchParams(filters);
  return apiRequest<ProfitDistributionReport>(`/reports/profit-distribution${query.size ? `?${query}` : ''}`);
}

export type StockReportSummary = {
  balance_rows: number;
  current_quantity: string;
  current_stock_value_egp: string | null;
  inventory_turnover: string;
  stale_stock_count: number;
  below_minimum_count: number;
};

export function listStockReport(query: ListQuery, filters: Record<string, string> = {}) {
  return listResource<InventoryBalance>('/reports/stock', query, filters) as Promise<ApiPage<InventoryBalance> & { summary: StockReportSummary }>;
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

export type DashboardSummary = {
  data: {
    sales_total_egp?: string;
    today_sales_egp?: string;
    stock_count?: string;
    stock_value_egp?: string;
    low_stock_count?: number;
    pending_orders_count?: number;
    cash_balance_egp?: string;
    collections_total_egp?: string;
    expenses_total_egp?: string;
    net_profit_egp?: string;
    receivables_egp?: string;
    treasury_balances?: { account_id: number; code: string; name: string; balance_egp: string }[];
    sales_trend?: { date: string; sales_egp: string }[];
    low_stock?: { product_id: number; product_name: string; sku: string; warehouse_name: string; quantity_on_hand: string; minimum_quantity: string }[];
    recent_activity?: { movement_id: number; reference: string; movement_type: string; movement_date: string; description: string; quantity: string | null; amount_egp?: string | null; user_name: string | null }[];
  };
  meta: { as_of: string; period?: string; from_date?: string; to_date?: string };
};

export function getDashboardSummary(period = 'month'): Promise<DashboardSummary> {
  return apiRequest<DashboardSummary>(`/reports/dashboard?period=${encodeURIComponent(period)}`);
}
