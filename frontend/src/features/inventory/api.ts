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
  purchase_cost_egp?: string | null;
  minimum_stock: string | null;
  created_from_container_id?: number | null;
  created_from_container_number?: string | null;
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
  address?: string | null;
  location_type: 'main' | 'sub' | 'vehicle' | 'damaged' | 'other';
  parent_location_id: number | null;
  is_active: boolean;
  notes: string | null;
  capacity_units?: number | null;
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
  reserved_quantity?: string;
  minimum_stock: string | null;
  average_unit_cost_egp?: string | null;
  stock_value_egp?: string | null;
};

export type InventorySummary = { product_count: number; warehouse_count: number; quantity_on_hand: number; quantity_reserved: number; below_minimum_count: number; stock_value_egp?: string };
export function getInventorySummary(filters: Record<string, string> = {}) {
  const params = new URLSearchParams(filters);
  return apiRequest<{ data: InventorySummary }>(`/inventory/summary?${params}`).then(response => response.data);
}

export type InventoryMovement = {
  id: number;
  movement_type: string;
  product_id: number;
  product_name: string;
  sku?: string;
  warehouse_id: number;
  warehouse_name: string;
  quantity: string;
  reference: string | null;
  movement_date: string;
  unit_cost_egp?: string | null;
  line_cost_egp_snapshot?: string | null;
  created_by_name?: string | null;
  movement_id?: number;
  movement_number?: string;
  delivery_id?: number | null;
  delivery_number?: string | null;
  source_type?: string | null;
  source_id?: number | null;
  source_reference?: string | null;
  from_location_id?: number | null;
  to_location_id?: number | null;
  from_location_name?: string | null;
  to_location_name?: string | null;
  reason?: string | null;
  variance_reason?: string | null;
  status?: string;
};

export function getInventoryMovement(lineId: number) {
  return apiRequest<{ data: InventoryMovement }>(`/inventory/movements/${lineId}`).then(response => response.data);
}

export type WarehouseReturn = { id: number; warehouse_id: number; warehouse_name?: string; return_date: string; status: string; reason: string; product_names?: string; total_quantity?: number; source_reference?: string | null; created_by_user_id?: number | null; created_by_name?: string | null };
export type WarehouseReturnLine = { id: number; product_id: number; product_name?: string; sku?: string; quantity: number; unit_cost_egp: string; line_total_egp: string; line_number: number; inventory_movement_id?: number | null; movement_line_id?: number | null; source_movement_line_id?: number | null; return_condition?: 'good' | 'damaged' | null };
export type WarehouseReturnCandidate = { id: number; product_id: number; sku: string; product_name: string; source_warehouse_id: number; source_warehouse_name: string; current_warehouse_id: number | null; current_warehouse_name: string | null; movement_type: 'sale' | 'transfer'; movement_date: string; movement_number: string; source_reference: string; issued_quantity: number; returned_quantity: number; available_quantity: number };
export type ApprovedDamagedStock = { id: number; product_id: number; sku?: string; product_name?: string; warehouse_id: number; warehouse_name?: string; quantity: number; cost_egp: string; status: string; approved_at: string | null; approved_by_name?: string | null };
export type MinimumStockRow = { id: number; threshold_scope: 'product' | 'warehouse'; product_id: number; sku: string; product_name: string; warehouse_id: number | null; warehouse_code: string | null; warehouse_name: string | null; minimum_quantity: number; quantity_on_hand: number; available_quantity: number; is_below_minimum: boolean; updated_at: string };
export type InventoryCount = { id: number; count_number: string; warehouse_id: number; warehouse_name?: string; count_date: string; status: 'draft' | 'approved' | 'cancelled'; reason: string };
export type InventoryCountLine = { id: number; product_id: number; product_name?: string; sku?: string; expected_quantity: number; counted_quantity: number; difference_quantity: number; difference_reason?: string | null; inventory_movement_id?: number | null; movement_line_id?: number | null };

export function listWarehouseReturns(query: ListQuery, filters: Record<string, string> = {}): Promise<ApiPage<WarehouseReturn>> { return listResource<WarehouseReturn>('/warehouse-returns', query, filters); }
export function listWarehouseReturnCandidates(query: ListQuery): Promise<ApiPage<WarehouseReturnCandidate>> { return listResource<WarehouseReturnCandidate>('/warehouse-returns/candidates', query); }
export function returnWarehouseMovement(input: { source_movement_line_id: number; warehouse_id: number; quantity: number; return_condition: 'good' | 'damaged'; return_date: string; reason?: string; idempotency_key: string }) { return apiRequest<{ data: { return: WarehouseReturn } }>('/warehouse-returns/from-movement', { method: 'POST', body: input, idempotencyKey: input.idempotency_key }); }
export function getWarehouseReturn(returnId: number) { return apiRequest<{ data: { return: WarehouseReturn; lines: WarehouseReturnLine[] } }>(`/warehouse-returns/${returnId}`).then(response => response.data); }
export function approveWarehouseReturn(returnId: number) { return apiRequest<{ data: { return: WarehouseReturn; lines: WarehouseReturnLine[] } }>(`/warehouse-returns/${returnId}/approve`, { method: 'POST' }); }
export function createWarehouseReturn(input: { warehouse_id: number; return_date: string; reason: string; idempotency_key: string; lines: { product_id: number; quantity: number; unit_cost_egp: string }[] }) {
  return apiRequest<{ data: { return: WarehouseReturn; lines?: WarehouseReturnLine[] } }>('/warehouse-returns', { method: 'POST', body: input, idempotencyKey: input.idempotency_key });
}
export function listApprovedDamagedStock(query: ListQuery): Promise<ApiPage<ApprovedDamagedStock>> { return listResource<ApprovedDamagedStock>('/approved-damaged-stock', query); }
export function createApprovedDamagedStock(input: { product_id: number; warehouse_id: number; quantity: number; cost_egp: string; idempotency_key: string }) {
  return apiRequest<{ data: { item: ApprovedDamagedStock } }>('/approved-damaged-stock', { method: 'POST', body: input, idempotencyKey: input.idempotency_key });
}
export function listMinimumStock(query: ListQuery, belowOnly = false, filters: Record<string, string> = {}): Promise<ApiPage<MinimumStockRow>> { return listResource<MinimumStockRow>('/inventory/minimum-stock', query, { ...(belowOnly ? { below_only: '1' } : {}), ...filters }); }
export function updateMinimumStock(input: { product_id: number; warehouse_id: number; minimum_quantity: number }) { return apiRequest<{ data: MinimumStockRow }>('/inventory/minimum-stock', { method: 'PUT', body: input }); }
export function updateProductMinimumStock(productId: number, minimumStock: number) { return apiRequest<{ data: Product }>(`/products/${productId}`, { method: 'PATCH', body: { minimum_stock: minimumStock } }); }
export function listInventoryCounts(query: ListQuery, filters: Record<string, string> = {}): Promise<ApiPage<InventoryCount>> { return listResource<InventoryCount>('/inventory/counts', query, filters); }
export function getInventoryCount(countId: number) { return apiRequest<{ data: { count: InventoryCount; lines: InventoryCountLine[] } }>(`/inventory/counts/${countId}`).then(response => response.data); }
export function createInventoryCount(input: { warehouse_id: number; count_date: string; reason: string; idempotency_key: string; lines: { product_id: number; counted_quantity: number; difference_reason?: string }[] }) { return apiRequest<{ data: { count: InventoryCount; lines: InventoryCountLine[] } }>('/inventory/counts', { method: 'POST', body: input, idempotencyKey: input.idempotency_key }); }
export function approveInventoryCount(countId: number) { return apiRequest<{ data: { count: InventoryCount; lines: InventoryCountLine[] } }>(`/inventory/counts/${countId}/approve`, { method: 'POST' }); }

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

/** Loads every server page for selectors that must be able to resolve any catalog record. */
export async function listAllResources<T>(
  path: string,
  query: ListQuery,
  filters: Record<string, string> = {},
): Promise<ApiPage<T>> {
  const firstPage = await listResource<T>(path, query, filters);
  if (firstPage.meta.last_page <= 1) return firstPage;

  const remainingPages = await Promise.all(
    Array.from({ length: firstPage.meta.last_page - 1 }, (_, index) =>
      listResource<T>(path, { ...query, page: index + 2 }, filters),
    ),
  );

  return { ...firstPage, data: [...firstPage.data, ...remainingPages.flatMap((page) => page.data)] };
}

export async function listRawPaginator<T>(path: string, query: ListQuery): Promise<ApiPage<T>> {
  const params = new URLSearchParams({
    page: String(query.page),
    per_page: String(query.perPage),
    ...(query.search ? { search: query.search } : {}),
  });
  const page = await apiRequest<{ data: T[]; current_page: number; per_page: number; total: number; last_page: number }>(`${path}?${params}`);
  return {
    data: page.data,
    meta: {
      current_page: page.current_page,
      per_page: page.per_page,
      total: page.total,
      last_page: page.last_page,
    },
  };
}

export type CreateCategoryInput = {
  code: string | null;
  name: string;
  parent_category_id: number | null;
  is_active: boolean;
};

export function createCategory(input: CreateCategoryInput) {
  return apiRequest<Category | { data: Category }>('/categories', { method: 'POST', body: input }).then(unwrapData);
}

export function updateCategory(categoryId: number, input: CreateCategoryInput) {
  return apiRequest<Category | { data: Category }>(`/categories/${categoryId}`, { method: 'PATCH', body: input }).then(unwrapData);
}

export function deleteCategory(categoryId: number) {
  return apiRequest<{ data: { status: string } }>(`/categories/${categoryId}`, { method: 'DELETE' });
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
  return apiRequest<Product | { data: Product }>('/products', { method: 'POST', body: input }).then(
    (response) => ('data' in response ? response.data : response),
  );
}

export function updateProduct(productId: number, input: CreateProductInput) {
  return apiRequest<Product | { data: Product }>(`/products/${productId}`, {
    method: 'PATCH',
    body: input,
  }).then((response) => ('data' in response ? response.data : response));
}

export function deleteProduct(productId: number) {
  return apiRequest<{ data: { status: string } }>(`/products/${productId}`, { method: 'DELETE' });
}

export type CreateWarehouseInput = {
  code: string;
  name: string;
  location_type: Warehouse['location_type'];
  parent_location_id: number | null;
  is_active: boolean;
  notes: string | null;
  address: string | null;
  manager_name: string | null;
  capacity_units: number | null;
};

export function createWarehouse(input: CreateWarehouseInput) {
  return apiRequest<Warehouse | { data: Warehouse }>('/warehouses', { method: 'POST', body: input }).then(
    (response) => ('data' in response ? response.data : response),
  );
}

export function updateWarehouse(warehouseId: number, input: CreateWarehouseInput) {
  return apiRequest<Warehouse | { data: Warehouse }>(`/warehouses/${warehouseId}`, { method: 'PATCH', body: input }).then(unwrapData);
}

export function deleteWarehouse(warehouseId: number) {
  return apiRequest<{ data: { status: string } }>(`/warehouses/${warehouseId}`, { method: 'DELETE' });
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

function unwrapData<T>(response: T | { data: T }): T {
  return typeof response === 'object' && response !== null && 'data' in response
    ? response.data
    : response;
}
