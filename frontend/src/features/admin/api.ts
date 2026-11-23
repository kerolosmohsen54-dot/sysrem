import { apiRequest } from '../../shared/api/http';
import { listResource, type ApiPage, type ListQuery } from '../inventory/api';

export type SalesTaxSettings = {
  enabled: boolean;
  rate: string | null;
  calculation_method: 'inclusive' | 'exclusive' | null;
};

export type AuditLogEntry = {
  id: number;
  actor: { user_id: number | null; name: string };
  sales_document_id: number | null;
  field_path: string | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  reason: string | null;
  created_at: string;
  old_value: unknown;
  new_value: unknown;
  before_data: unknown;
  after_data: unknown;
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
  daily_summary_reminder_enabled: boolean;
  daily_summary_reminder_time: string | null;
  daily_summary_whatsapp_phone: string | null;
  max_active_users: number;
  active_user_count: number;
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

type ApiAdminUser = Omit<AdminUser, 'roles'> & {
  roles: Array<string | { code?: unknown }>;
};

function normalizeAdminUser(user: ApiAdminUser): AdminUser {
  return {
    ...user,
    roles: user.roles.map((role) =>
      typeof role === 'string' ? role : typeof role.code === 'string' ? role.code : 'unknown',
    ),
  };
}

type ApiAdminUserResponse = ApiAdminUser | { data: ApiAdminUser };

function normalizeAdminUserResponse(response: ApiAdminUserResponse): AdminUser {
  const user = (response as { data?: ApiAdminUser }).data ?? (response as ApiAdminUser);
  return normalizeAdminUser(user);
}

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
  return apiRequest<{ data: GeneralSettings }>('/settings/general').then((result) => result.data);
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
  return apiRequest<{ data: SalesTaxSettings }>('/settings/sales-tax').then((result) => result.data);
}

export function listUsers(query: ListQuery): Promise<ApiPage<AdminUser>> {
  return listResource<ApiAdminUser>('/users', query).then((page) => ({
    ...page,
    data: page.data.map(normalizeAdminUser),
  }));
}

export type AdminUsersPage = ApiPage<AdminUser> & {
  meta: ApiPage<AdminUser>['meta'] & { active_user_count: number; max_active_users: number };
};

export function listUsersWithLimit(query: ListQuery): Promise<AdminUsersPage> {
  return listResource<ApiAdminUser>('/users', query).then((page) => ({
    ...page,
    data: page.data.map(normalizeAdminUser),
  }) as AdminUsersPage);
}

export function createUser(input: CreateUserInput): Promise<AdminUser> {
  return apiRequest<ApiAdminUserResponse>('/users', { method: 'POST', body: input }).then(
    normalizeAdminUserResponse,
  );
}

export function updateUser(
  userId: number,
  input: Partial<Pick<AdminUser, 'username' | 'display_name' | 'phone' | 'email' | 'is_active'>>,
): Promise<AdminUser> {
  return apiRequest<ApiAdminUserResponse>(`/users/${userId}`, { method: 'PUT', body: input }).then(
    normalizeAdminUserResponse,
  );
}

export function deleteUser(userId: number): Promise<{ id: number; deleted: boolean; is_active: false }> {
  return apiRequest<{ data: { id: number; deleted: boolean; is_active: false } }>(`/users/${userId}`, {
    method: 'DELETE',
    body: {},
  }).then((result) => result.data);
}

export function assignUserRoles(userId: number, role_codes: string[]): Promise<AdminUser> {
  return apiRequest<ApiAdminUserResponse>(`/users/${userId}/roles`, { method: 'PUT', body: { role_codes } }).then(
    normalizeAdminUserResponse,
  );
}

export function updateSalesTaxSettings(settings: SalesTaxSettings): Promise<SalesTaxSettings> {
  return apiRequest<{ data: SalesTaxSettings }>('/settings/sales-tax', { method: 'PUT', body: settings }).then((result) => result.data);
}

export function listAuditLogs(
  query: ListQuery,
  filters: Record<string, string> = {},
): Promise<ApiPage<AuditLogEntry>> {
  return listResource<AuditLogEntry>('/audit-logs', query, filters);
}

export type UserRole = { code: string; name: string };
export function listRoles(): Promise<UserRole[]> {
  return apiRequest<{ data: UserRole[] }>('/roles').then((result) => result.data);
}

export type SearchResult = { id: string; type: string; title: string; subtitle: string | null; target: string };
export function globalSearch(term: string): Promise<SearchResult[]> {
  return apiRequest<{ data: SearchResult[] }>(`/search?q=${encodeURIComponent(term)}`).then((result) => result.data);
}

export type AppNotification = {
  id: number;
  type: string;
  title: string;
  message: string;
  target_path: string | null;
  is_read: boolean;
  created_at: string;
};
export function listNotifications(): Promise<AppNotification[]> {
  return apiRequest<{ data: AppNotification[] }>('/notifications').then((result) => result.data);
}
export function markNotificationRead(id: number): Promise<void> {
  return apiRequest(`/notifications/${id}/read`, { method: 'POST', body: {} });
}
