import { apiRequest } from '../../shared/api/http';
import { listResource, type ApiPage, type ListQuery } from '../inventory/api';

export type CurrencyReference = {
  id: number;
  code: string;
  name: string;
  symbol: string | null;
  decimal_places: number;
  is_active: boolean;
};

export function listCurrencies(query: ListQuery, includeInactive = false): Promise<ApiPage<CurrencyReference>> {
  return listResource<CurrencyReference>('/currencies', query, includeInactive ? { include_inactive: '1' } : {});
}

export function createCurrency(input: Pick<CurrencyReference, 'code' | 'name' | 'symbol' | 'decimal_places'>) {
  return apiRequest<{ data: CurrencyReference }>('/currencies', { method: 'POST', body: input });
}

export function updateCurrency(id: number, input: Partial<Pick<CurrencyReference, 'name' | 'symbol' | 'decimal_places' | 'is_active'>>) {
  return apiRequest<{ data: CurrencyReference }>(`/currencies/${id}`, { method: 'PATCH', body: input });
}
