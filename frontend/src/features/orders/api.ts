import { apiRequest } from '../../shared/api/http';
import { listResource, type ApiPage, type ListQuery } from '../inventory/api';

export type OrderStatus = 'draft' | 'confirmed' | 'fulfilled' | 'cancelled';
export type DeliveryStatus = 'draft' | 'preparing' | 'in_transit' | 'delivered' | 'cancelled';

export type OrderRecord = {
  id: number;
  order_number: string;
  customer_id: number;
  customer_name: string;
  customer_phone?: string | null;
  customer_address?: string | null;
  customer_governorate?: string | null;
  order_date: string;
  requested_delivery_date: string | null;
  status: OrderStatus;
  total_egp: string | null;
  subtotal: string | null;
  discount_amount: string | null;
  tax_amount: string | null;
  salesperson_id: number | null;
  salesperson_name: string | null;
  warehouse_id: number | null;
  warehouse_name: string | null;
  currency_code: string;
  payment_method: 'cash' | 'transfer' | 'deferred' | null;
  payment_terms: string | null;
  discount_type?: 'fixed' | 'percent';
  discount_value?: string;
  printed_at?: string | null;
  print_count?: number;
  line_count: number;
  quantity_reserved?: number;
};

export type OrderLine = {
  id: number;
  product_id: number;
  product_name: string;
  sku: string;
  quantity: string;
  unit_price_egp: string;
  discount_percent: string;
  discount_amount_egp: string;
  line_total_egp: string;
  notes?: string | null;
};

export type OrderStockWarning = {
  product_id: number;
  product_name: string;
  available_quantity: string;
  requested_quantity: string;
};

export type OrderReservation = {
  id: number;
  order_line_id: number;
  product_id: number;
  product_name: string;
  sku: string;
  quantity: number;
  status: 'reserved' | 'released' | 'consumed';
  reserved_at: string;
  released_at: string | null;
  consumed_at: string | null;
  allocations: {
    location_id: number;
    location_name: string;
    quantity: number;
  }[];
};

export type OrderDetail = OrderRecord & {
  notes: string | null;
  salesperson_id?: number | null;
  salesperson_name?: string | null;
  warehouse_id?: number | null;
  warehouse_name?: string | null;
  currency_code: string;
  payment_method: 'cash' | 'transfer' | 'deferred' | null;
  payment_terms: string | null;
  subtotal_egp?: string;
  discount_amount_egp?: string;
  tax_amount_egp?: string;
  shipping_amount_egp?: string;
  lines: OrderLine[];
  stock_warnings: OrderStockWarning[];
  reservations: OrderReservation[];
  invoice_ids: number[];
  delivery_ids: number[];
};

export type OrderInput = {
  customer_id: number;
  order_date: string;
  requested_delivery_date: string | null;
  notes: string | null;
  salesperson_id: number | null;
  warehouse_id: number | null;
  currency_code: string;
  payment_method: 'cash' | 'transfer' | 'deferred' | null;
  payment_terms: string | null;
  discount_type: 'fixed' | 'percent';
  discount_value: string;
  shipping_amount_egp: string;
  lines: {
    product_id: number;
    quantity: number;
    unit_price_egp: string;
    notes: string | null;
    discount_percent: string;
  }[];
};

export type OrderOptions = {
  salespeople: { id: number; name: string }[];
  warehouses: { id: number; name: string; code: string }[];
  currencies: { code: string; name: string; symbol: string }[];
  payment_methods: { code: 'cash' | 'transfer' | 'deferred'; name: string }[];
};

export type OrderPreview = {
  lines: {
    line_number: number;
    product_id: number;
    sku: string;
    product_name: string;
    quantity: number;
    unit_price_egp: string;
    line_total_egp: string;
    discount_percent?: string;
    discount_amount_egp?: string;
    tax_amount_egp?: string;
  }[];
  subtotal_egp: string;
  discount_amount_egp: string;
  tax_amount_egp: string;
  tax_applied: boolean;
  tax_rate?: string;
  tax_calculation_method?: 'inclusive' | 'exclusive' | null;
  shipping_amount_egp?: string;
  grand_total_egp: string;
  warnings: {
    code: string;
    product_id?: number;
    product_name?: string;
    available_quantity?: string;
    requested_quantity?: string;
  }[];
};

export type OrderInvoiceResult = {
  order: OrderDetail;
  invoice: {
    id: number;
    invoice_number: string;
    total_egp: string | null;
    status: 'issued';
  };
};

export type DeliveryRecord = {
  id: number;
  delivery_number: string;
  sales_order_id: number | null;
  sales_document_id: number | null;
  source_number: string;
  recipient_name: string | null;
  driver_name_snapshot: string | null;
  driver_name?: string | null;
  shipping_driver_id?: number | null;
  vehicle_plate: string | null;
  delivery_address: string | null;
  delivery_date?: string | null;
  source_location_id?: number | null;
  source_location_name?: string | null;
  transport_method?: string | null;
  total_quantity?: number | string;
  notes: string | null;
  status: DeliveryStatus;
  created_at?: string;
  delivered_at?: string | null;
  lines?: DeliveryLineRecord[];
};

export type DeliveryLineRecord = {
  id: number;
  product_id: number;
  product_name: string;
  sku: string;
  quantity: number;
  inventory_movement_line_id: number;
  inventory_movement_id: number;
  movement_number: string;
  movement_date: string;
  movement_type: string;
  movement_status: string;
  source_location_name: string | null;
};

export type DeliverySummary = {
  total_count: number;
  active_count: number;
  pending_count: number;
  preparing_count: number;
  in_transit_count: number;
  delivered_today_count: number;
};
export type DeliveryPage = ApiPage<DeliveryRecord> & { summary?: DeliverySummary };

export type DeliveryInput = {
  sales_order_id?: number;
  sales_document_id?: number;
  driver_user_id: number | null;
  shipping_driver_id?: number | null;
  delivery_date: string;
  source_location_id: number;
  transport_method: string | null;
  driver_name_snapshot: string | null;
  vehicle_plate: string | null;
  delivery_address: string | null;
  notes: string | null;
};

export function listOrders(query: ListQuery, filters: Record<string, string> = {}) {
  return listResource<OrderRecord>('/orders', query, filters);
}

export function getOrderOptions(): Promise<OrderOptions> {
  return apiRequest<{ data: OrderOptions }>('/orders/options').then((response) => response.data);
}

export function getOrder(orderId: string) {
  return apiRequest<{ data: OrderDetail }>(`/orders/${encodeURIComponent(orderId)}`).then(
    (response) => response.data,
  );
}

export function createOrder(input: OrderInput, idempotencyKey: string) {
  return apiRequest<{ data: OrderDetail }>('/orders', {
    method: 'POST',
    body: input,
    idempotencyKey,
  }).then((response) => response.data);
}

export function updateOrder(orderId: string, input: OrderInput) {
  return apiRequest<{ data: OrderDetail }>(`/orders/${encodeURIComponent(orderId)}`, {
    method: 'PUT',
    body: input,
  }).then((response) => response.data);
}

export function previewOrder(input: OrderInput): Promise<OrderPreview> {
  return apiRequest<{ data: OrderPreview }>('/orders/preview', {
    method: 'POST',
    body: input,
  }).then((result) => result.data);
}

export function cancelOrder(orderId: string, reason: string, idempotencyKey: string) {
  return apiRequest<OrderDetail>(`/orders/${encodeURIComponent(orderId)}/cancel`, {
    method: 'POST',
    body: { reason },
    idempotencyKey,
  });
}

export function confirmOrder(orderId: string, idempotencyKey: string) {
  return apiRequest<OrderDetail>(`/orders/${encodeURIComponent(orderId)}/confirm`, {
    method: 'POST',
    idempotencyKey,
  });
}

export function invoiceOrder(
  orderId: string,
  lines: { order_line_id: number; warehouse_id: number }[],
  idempotencyKey: string,
) {
  return apiRequest<OrderInvoiceResult>(`/orders/${encodeURIComponent(orderId)}/invoice`, {
    method: 'POST',
    body: { lines },
    idempotencyKey,
  });
}

export function markOrderPrinted(orderId: string) {
  return apiRequest<{ data: OrderDetail }>(`/orders/${encodeURIComponent(orderId)}/printed`, {
    method: 'POST',
    body: {},
  }).then((response) => response.data);
}

export function listDeliveries(query: ListQuery, filters: Record<string, string> = {}) {
  return listResource<DeliveryRecord>('/deliveries', query, filters) as Promise<DeliveryPage>;
}

export function getDelivery(deliveryId: string) {
  return apiRequest<DeliveryRecord | { data: { delivery: DeliveryRecord; lines: DeliveryLineRecord[] } }>(`/deliveries/${encodeURIComponent(deliveryId)}`)
    .then(normalizeDelivery);
}

export function createDelivery(input: DeliveryInput, idempotencyKey: string) {
  return apiRequest<DeliveryRecord | { data: { delivery: DeliveryRecord; lines: DeliveryLineRecord[] } }>('/deliveries', {
    method: 'POST',
    body: input,
    idempotencyKey,
  }).then(normalizeDelivery);
}

export function updateDeliveryStatus(
  deliveryId: string,
  status: Exclude<DeliveryStatus, 'draft'>,
  idempotencyKey: string,
) {
  return apiRequest<DeliveryRecord | { data: { delivery: DeliveryRecord; lines: DeliveryLineRecord[] } }>(`/deliveries/${encodeURIComponent(deliveryId)}/status`, {
    method: 'PATCH',
    body: { status },
    idempotencyKey,
  }).then(normalizeDelivery);
}

function normalizeDelivery(value: DeliveryRecord | { data: { delivery: DeliveryRecord; lines: DeliveryLineRecord[] } }): DeliveryRecord {
  if ('data' in value) return { ...value.data.delivery, lines: value.data.lines };
  return value as DeliveryRecord;
}

export type OrderPage = ApiPage<OrderRecord>;
