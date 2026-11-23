import { apiRequest } from '../../shared/api/http';
import type { ExpenseCategory, Partner, TreasuryAccount } from './api';

export type PendingFund = {
  id: number; partner_id: number; partner_name: string; source_label: string; source_reference: string | null; description: string;
  due_date: string; amount: string; received_amount: string; remaining_amount: string; status: 'pending' | 'partially_received' | 'received' | 'cancelled';
};
export type Installment = { id: number; sequence_number: number; due_date: string; amount: string; paid_amount: string; remaining_amount: string; status: 'paid' | 'overdue' | 'upcoming' };
export type InstallmentPlan = {
  id: number; partner_id: number | null; partner_name: string; container_partner_id: number; container_partner_name: string;
  container_id: number | null; container_number: string | null; reference: string | null;
  total_amount: string; contribution_mode: 'manual' | 'scheduled'; installment_amount: string; first_due_date: string; status: 'active' | 'completed' | 'stopped';
  paid_amount: string; remaining_amount: string; overdue_amount: string; next_installment: { id: number; due_date: string; amount: string } | null;
  installments: Installment[]; payments: { id: number; amount: string; payment_date: string; treasury_account_id: number; treasury_entry_id: number; notes: string | null }[];
};
export type ContainerPartner = { id: number; name: string; phone: string | null; status: 'active' | 'inactive' };
export type BudgetRow = { id: number | null; expense_category_id: number; category_name: string; period_start: string; budget_amount: string; actual_amount: string; remaining_amount: string | null; usage_percent: number | null; status: 'without_budget' | 'normal' | 'near_limit' | 'exceeded'; notes: string | null };
export type RecurringOccurrence = { id: number; period_start: string; due_date: string; amount: string; status: 'due' | 'posted'; expense_id: number | null; expense_number: string | null };
export type RecurringTemplate = { id: number; name: string; expense_category_id: number; expense_category_name: string; amount: string; due_day: number; start_date: string; status: 'active' | 'stopped'; notes: string | null; occurrences: RecurringOccurrence[] };
export type MonthComparison = { month_a: string; month_b: string; periods: { a: { from_date: string; to_date: string }; b: { from_date: string; to_date: string } }; metrics: Record<'sales' | 'expenses' | 'profit', { month_a: string; month_b: string; difference: string; change_percent: number | null }> };
export type ForecastWeek = { index: number; from_date: string; to_date: string; actual_inflows: string; actual_outflows: string; pending_funds: string; partner_installments: string; recurring_expenses: string; budgeted_expenses: string; net_flow: string; projected_closing_balance: string; sources: { pending_funds: { id: number; source: string; due_date: string; amount: string }[]; partner_installments: { id: number; plan_id: number; due_date: string; amount: string }[]; recurring_expenses: { type: 'recurring_expense' | 'recurring_template'; id: number; template_id: number; template_name: string; period_start: string; due_date: string; amount: string; projected: boolean }[] } };
export type CashForecast = { as_of: string; weeks: ForecastWeek[]; actual_opening_balance: string; projected_closing_balance: string };

export type FinancialPlanningOptions = { partners: Partner[]; treasury: TreasuryAccount[]; categories: ExpenseCategory[] };
export function financeOptions() {
  return apiRequest<{ data: FinancialPlanningOptions }>('/finance-planning-options').then((response) => response.data);
}
export function listPendingFunds(filters: Record<string, string> = {}) { return apiRequest<{ data: PendingFund[] }>('/pending-funds?'+new URLSearchParams(filters)); }
export function createPendingFund(input: Omit<PendingFund, 'id'|'partner_name'|'received_amount'|'remaining_amount'|'status'>) { return apiRequest<{ data: PendingFund }>('/pending-funds', { method: 'POST', body: input }); }
export function receivePendingFund(id: number, input: { treasury_account_id: number; amount: string; received_date: string; idempotency_key: string }) { return apiRequest<{ data: PendingFund }>(`/pending-funds/${id}/receive`, { method: 'POST', body: input, idempotencyKey: input.idempotency_key }); }
export function cancelPendingFund(id: number, reason: string) { return apiRequest<{ data: PendingFund }>(`/pending-funds/${id}/cancel`, { method: 'POST', body: { reason } }); }
export function listContainerPartners() { return apiRequest<{ data: ContainerPartner[] }>('/container-partners').then((response) => response.data); }
export function createContainerPartner(input: { name: string; phone: string | null }) { return apiRequest<{ data: ContainerPartner }>('/container-partners', { method: 'POST', body: input }); }
export function listInstallmentPlans() { return apiRequest<{ data: InstallmentPlan[] }>('/partner-installment-plans'); }
export function createInstallmentPlan(input: { container_partner_id: number; container_id: number; reference: string; total_amount: string; contribution_mode: 'manual' | 'scheduled'; installment_amount?: string; first_due_date?: string }) { return apiRequest<{ data: InstallmentPlan }>('/partner-installment-plans', { method: 'POST', body: input }); }
export function receiveInstallmentPayment(id: number, input: { treasury_account_id: number; amount: string; payment_date: string; idempotency_key: string }) { return apiRequest<{ data: InstallmentPlan }>(`/partner-installment-plans/${id}/payments`, { method: 'POST', body: input, idempotencyKey: input.idempotency_key }); }
export function getExpenseBudgets(period: string) { return apiRequest<{ data: BudgetRow[] }>(`/expense-budgets?period=${encodeURIComponent(period)}`); }
export function saveExpenseBudget(input: { expense_category_id: number; period: string; budget_amount: string; notes?: string }, id: number | null) { return apiRequest<{ data: BudgetRow }>(id === null ? '/expense-budgets' : `/expense-budgets/${id}`, { method: id === null ? 'POST' : 'PUT', body: input }); }
export function listRecurringExpenses() { return apiRequest<{ data: RecurringTemplate[] }>('/recurring-expenses'); }
export function createRecurringExpense(input: { name: string; expense_category_id: number; amount: string; due_day: number; start_date: string }) { return apiRequest<{ data: RecurringTemplate }>('/recurring-expenses', { method: 'POST', body: input }); }
export function stopRecurringExpense(id: number, reason: string) { return apiRequest<{ data: RecurringTemplate }>(`/recurring-expenses/${id}/stop`, { method: 'POST', body: { reason } }); }
export function postRecurringOccurrence(templateId: number, occurrenceId: number, treasury_account_id: number) { return apiRequest<{ data: RecurringOccurrence }>(`/recurring-expenses/${templateId}/occurrences/${occurrenceId}/post`, { method: 'POST', body: { treasury_account_id } }); }
export function monthlyComparison(monthA: string, monthB: string) { return apiRequest<{ data: MonthComparison }>(`/finance-reports/monthly-comparison?month_a=${encodeURIComponent(monthA)}&month_b=${encodeURIComponent(monthB)}`); }
export function cashForecast(fromDate: string, weeks = 8) { return apiRequest<{ data: CashForecast }>(`/finance-reports/cash-forecast?from_date=${encodeURIComponent(fromDate)}&weeks=${weeks}`); }
export function collectionSummary() { return apiRequest<{ data: { receivables_egp: string; due_today_egp: string; overdue_egp: string; collected_this_month_egp: string; as_of: string } }>('/collections/summary'); }
