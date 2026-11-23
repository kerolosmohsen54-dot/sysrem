import { apiRequest } from '../../shared/api/http';
import type { Warehouse } from '../inventory/api';
import type { ContainerRecord } from './api';

export type ContainerIntakeLineInput = {
  product_id?: number;
  new_product?: {
    name: string;
    sku: string | null;
    category_id: number | null;
    unit_code: string;
    minimum_stock: number | null;
    description?: string | null;
  };
  quantity: number;
  purchase_unit_cost_egp?: string;
  purchase_value_egp?: string;
  company_price_egp?: string;
};

export type ContainerIntakeInput = {
  container_name: string;
  container_number: string;
  supplier_id?: number | null;
  shipping_driver_id?: number | null;
  trip_reference?: string | null;
  origin: string;
  destination: string | null;
  notes: string | null;
  estimated_departure?: string | null;
  estimated_arrival?: string | null;
  warehouse_id: number;
  allocation_basis: 'value' | 'quantity';
  movement_date: string;
  lines: ContainerIntakeLineInput[];
  costs: { cost_type: string; amount_egp: string; description: string | null }[];
};

export type ContainerIntakeResult = {
  container: ContainerRecord & { container_name: string };
  receipt_ids: number[];
  created_products: { id: number; name: string; sku: string }[];
  warehouse: Pick<Warehouse, 'id' | 'name' | 'location_type'>;
  total_quantity: number;
  goods_value_egp: string;
  additional_costs_egp: string;
  total_landed_cost_egp: string;
  average_unit_cost_egp: string;
};

export function createContainerIntake(input: ContainerIntakeInput, idempotencyKey: string) {
  return apiRequest<{ data: ContainerIntakeResult }>('/containers/intake', {
    method: 'POST',
    body: input,
    idempotencyKey,
  }).then((response) => response.data);
}

export function createContainerQuickWarehouse(input: {
  name: string;
  location_type: 'main' | 'sub' | 'vehicle';
  address: string | null;
}) {
  return apiRequest<{ data: Warehouse }>('/containers/quick-warehouses', {
    method: 'POST',
    body: input,
  }).then((response) => response.data);
}
