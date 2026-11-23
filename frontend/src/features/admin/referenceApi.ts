import { apiRequest } from '../../shared/api/http';
import { listResource, type ApiPage, type ListQuery } from '../inventory/api';

export type ShippingDriver = { id: number; name: string; shipping_company: string | null; is_active: boolean; containers_count: number; trips_count: number };
export type TrashRecord = { id: number; entity_type: string; entity_id: number; label: string; deleted_at: string; deleted_by_name: string | null; snapshot: Record<string, unknown> };

export function listDrivers(query: ListQuery, includeInactive = false): Promise<ApiPage<ShippingDriver>> {
  return listResource<ShippingDriver>('/drivers', query, includeInactive ? { include_inactive: 'true' } : {});
}
export function createDriver(input: { name: string; shipping_company: string | null }) {
  return apiRequest<{ data: ShippingDriver }>('/drivers', { method: 'POST', body: input });
}
export function updateDriver(id: number, input: Partial<Pick<ShippingDriver, 'name' | 'shipping_company' | 'is_active'>>) {
  return apiRequest<{ data: ShippingDriver }>(`/drivers/${id}`, { method: 'PATCH', body: input });
}
export function listTrash(query: ListQuery, filters: Record<string, string> = {}): Promise<ApiPage<TrashRecord>> {
  return listResource<TrashRecord>('/admin/trash', query, filters);
}
export function restoreTrashRecord(id: number) {
  return apiRequest<{ data: { id: number; entity_type: string; entity_id: number; status: 'restored' } }>(`/admin/trash/${id}/restore`, { method: 'POST', body: {} });
}
export function permanentlyDeleteTrashRecord(id: number) {
  return apiRequest<{ data: { id: number; status: 'permanently_deleted' } }>(`/admin/trash/${id}`, { method: 'DELETE' });
}
export function emptyTrash() {
  return apiRequest<{ data: { deleted_count: number; blocked_count: number } }>('/admin/trash', { method: 'DELETE' });
}
