import { apiRequest } from '../../shared/api/http';
import { listResource, type ApiPage, type ListQuery } from '../inventory/api';

export type SalesTaxSettings = {
  enabled: boolean;
  rate: string | null;
  calculation_method: 'inclusive' | 'exclusive' | null;
};

export type AuditLogEntry = {
  id: number;
  user_id: number;
  actor_name: string;
  action: string;
  entity_type: string;
  entity_id: number | null;
  created_at: string;
  before: unknown;
  after: unknown;
};

export type GeneralSettings = {
  company_name: string | null;
  company_address: string | null;
  company_phone: string | null;
  company_email: string | null;
  company_tax_number: string | null;
  invoice_number_prefix: string | null;
  order_number_prefix: string | null;
  container_number_prefix: string | null;
};

export type AdminUser = {
  id: number;
  username: string;
  display_name: string;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  roles: string[];
  permissions: string[];
};

export type CreateUserInput = {
  username: string;
  display_name: string;
  phone: string | null;
  email: string | null;
  password: string;
  password_confirmation: string;
  role_codes: string[];
};

export function getGeneralSettings(): Promise<GeneralSettings> {
  return apiRequest('/settings/general');
}

export function updateGeneralSettings(
  settings: Partial<GeneralSettings>,
): Promise<GeneralSettings> {
  return apiRequest<{ data: GeneralSettings }>('/settings/general', {
    method: 'PUT',
    body: settings,
  }).then((result) => result.data);
}

export function getSalesTaxSettings(): Promise<SalesTaxSettings> {
  return apiRequest('/settings/sales-tax');
}

export function listUsers(query: ListQuery): Promise<ApiPage<AdminUser>> {
  return listResource('/users', query);
}

export function createUser(input: CreateUserInput): Promise<AdminUser> {
  return apiRequest('/users', { method: 'POST', body: input });
}

export function updateUser(
  userId: number,
  input: Partial<Pick<AdminUser, 'username' | 'display_name' | 'phone' | 'email' | 'is_active'>>,
): Promise<AdminUser> {
  return apiRequest(`/users/${userId}`, { method: 'PUT', body: input });
}

export function assignUserRoles(userId: number, role_codes: string[]): Promise<AdminUser> {
  return apiRequest(`/users/${userId}/roles`, { method: 'PUT', body: { role_codes } });
}

export function updateSalesTaxSettings(settings: SalesTaxSettings): Promise<SalesTaxSettings> {
  return apiRequest('/settings/sales-tax', { method: 'PUT', body: settings });
}

export function listAuditLogs(
  query: ListQuery,
  filters: Record<string, string> = {},
): Promise<ApiPage<AuditLogEntry>> {
  return listResource('/audit-logs', query, filters);
}
