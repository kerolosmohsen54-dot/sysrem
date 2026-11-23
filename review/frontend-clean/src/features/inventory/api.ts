import { apiRequest } from '../../shared/api/http';

export type ApiPage<T> = {
  data: T[];
  meta: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
};

export type ListQuery = {
  page: number;
  perPage: number;
  search: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
};

export type Category = {
  id: number;
  code: string | null;
  name: string;
  parent_category_id: number | null;
  is_active: boolean;
};

export type Product = {
  id: number;
  sku: string;
  barcode: string | null;
  name: string;
  category_id: number | null;
  category_name?: string | null;
  default_location_id?: number | null;
  description?: string | null;
  default_tax_rate?: string | null;
  last_purchase_price_reference?: string | null;
  unit_code: string;
  company_price?: string | null;
  minimum_stock: string | null;
  quantity_on_hand?: string;
  reserved_quantity?: string;
  available_quantity?: string;
  average_unit_cost_egp?: string | null;
  is_active: boolean;
};

export type Warehouse = {
  id: number;
  code: string;
  name: string;
  location_type: 'main' | 'sub' | 'vehicle' | 'damaged' | 'other';
  parent_location_id: number | null;
  is_active: boolean;
  notes: string | null;
  item_count?: number;
  on_hand_units?: string;
  manager_name?: string | null;
  occupancy_percentage?: string | null;
};

export type InventoryBalance = {
  product_id: number;
  product_name: string;
  sku: string;
  warehouse_id: number;
  warehouse_name: string;
  quantity_on_hand: string;
  minimum_stock: string | null;
  average_unit_cost_egp?: string | null;
  stock_value_egp?: string | null;
};

export type InventoryMovement = {
  id: number;
  movement_type: string;
  product_id: number;
  product_name: string;
  warehouse_id: number;
  warehouse_name: string;
  quantity: string;
  reference: string | null;
  movement_date: string;
  unit_cost_egp?: string | null;
  created_by_name?: string | null;
};

export async function listResource<T>(
  path: string,
  query: ListQuery,
  filters: Record<string, string> = {},
): Promise<ApiPage<T>> {
  const params = new URLSearchParams({
    page: String(query.page),
    per_page: String(query.perPage),
    ...(query.search ? { search: query.search } : {}),
    ...(query.sortBy ? { sort_by: query.sortBy } : {}),
    ...(query.sortDirection ? { sort_direction: query.sortDirection } : {}),
    ...filters,
  });
  return apiRequest<ApiPage<T>>(`${path}?${params.toString()}`);
}

export type CreateCategoryInput = {
  code: string | null;
  name: string;
  parent_category_id: number | null;
  is_active: boolean;
};

export function createCategory(input: CreateCategoryInput) {
  return apiRequest<Category>('/categories', { method: 'POST', body: input });
}

export function updateCategory(categoryId: number, input: CreateCategoryInput) {
  return apiRequest<Category>(`/categories/${categoryId}`, { method: 'PATCH', body: input });
}

export type CreateProductInput = {
  sku: string;
  barcode: string | null;
  name: string;
  category_id: number | null;
  unit_code: string;
  company_price?: string | null;
  default_location_id: number | null;
  minimum_stock: number | null;
  description: string | null;
  default_tax_rate: string | null;
  last_purchase_price_reference?: string | null;
  is_active: boolean;
};

export function createProduct(input: CreateProductInput) {
  return apiRequest<Product>('/products', { method: 'POST', body: input });
}

export function updateProduct(productId: number, input: CreateProductInput) {
  return apiRequest<Product>(`/products/${productId}`, { method: 'PATCH', body: input });
}

export type CreateWarehouseInput = {
  code: string;
  name: string;
  location_type: Warehouse['location_type'];
  parent_location_id: number | null;
  is_active: boolean;
  notes: string | null;
};

export function createWarehouse(input: CreateWarehouseInput) {
  return apiRequest<Warehouse>('/warehouses', { method: 'POST', body: input });
}

export function updateWarehouse(warehouseId: number, input: CreateWarehouseInput) {
  return apiRequest<Warehouse>(`/warehouses/${warehouseId}`, { method: 'PATCH', body: input });
}

export type StockActionInput =
  | {
      action: 'adjustment';
      product_id: number;
      warehouse_id: number;
      quantity: number;
      unit_cost_egp?: string;
      movement_date: string;
      reason: string;
    }
  | {
      action: 'opening-stock';
      product_id: number;
      warehouse_id: number;
      quantity: number;
      unit_cost_egp: string;
      movement_date: string;
      reason: string;
    }
  | {
      action: 'transfer';
      product_id: number;
      source_warehouse_id: number;
      destination_warehouse_id: number;
      quantity: number;
      movement_date: string;
      reason: string;
    };

export function postStockAction(input: StockActionInput, idempotencyKey: string) {
  const { action, ...body } = input;
  const path =
    action === 'adjustment'
      ? '/inventory/adjustments'
      : action === 'opening-stock'
        ? '/inventory/opening-stock'
        : '/inventory/transfers';
  return apiRequest<unknown>(path, { method: 'POST', body, idempotencyKey });
}

export function listInventoryAdjustments(
  query: ListQuery,
  filters: Record<string, string> = {},
): Promise<ApiPage<InventoryMovement>> {
  return listResource<InventoryMovement>('/inventory/adjustments', query, filters);
}

export function listProductCostHistory(
  productId: number,
  query: ListQuery,
  filters: Record<string, string> = {},
): Promise<ApiPage<InventoryMovement>> {
  return listResource<InventoryMovement>(`/products/${productId}/cost-history`, query, filters);
}
