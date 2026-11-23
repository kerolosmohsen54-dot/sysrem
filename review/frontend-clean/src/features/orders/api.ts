import { apiRequest } from '../../shared/api/http';
import { listResource, type ApiPage, type ListQuery } from '../inventory/api';

export type OrderStatus = 'draft' | 'confirmed' | 'fulfilled' | 'cancelled';
export type DeliveryStatus = 'draft' | 'preparing' | 'in_transit' | 'delivered' | 'cancelled';

export type OrderRecord = {
  id: number;
  order_number: string;
  customer_id: number;
  customer_name: string;
  order_date: string;
  requested_delivery_date: string | null;
  status: OrderStatus;
  total_egp: string | null;
  line_count: number;
};

export type OrderLine = {
  id: number;
  product_id: number;
  product_name: string;
  sku: string;
  quantity: string;
  unit_price_egp: string;
};

export type OrderStockWarning = {
  product_id: number;
  product_name: string;
  available_quantity: string;
  requested_quantity: string;
};

export type OrderDetail = OrderRecord & {
  notes: string | null;
  lines: OrderLine[];
  stock_warnings: OrderStockWarning[];
  invoice_ids: number[];
  delivery_ids: number[];
};

export type OrderInput = {
  customer_id: number;
  order_date: string;
  requested_delivery_date: string | null;
  notes: string | null;
  lines: {
    product_id: number;
    quantity: number;
    unit_price_egp: string;
    notes: string | null;
  }[];
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
  }[];
  subtotal_egp: string;
  discount_amount_egp: string;
  tax_amount_egp: string;
  tax_applied: false;
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
  vehicle_plate: string | null;
  delivery_address: string | null;
  notes: string | null;
  status: DeliveryStatus;
};

export type DeliveryInput = {
  sales_order_id?: number;
  sales_document_id?: number;
  driver_user_id: number | null;
  driver_name_snapshot: string | null;
  vehicle_plate: string | null;
  delivery_address: string | null;
  notes: string | null;
};

export function listOrders(query: ListQuery, filters: Record<string, string> = {}) {
  return listResource<OrderRecord>('/orders', query, filters);
}

export function getOrder(orderId: string) {
  return apiRequest<OrderDetail>(`/orders/${encodeURIComponent(orderId)}`);
}

export function createOrder(input: OrderInput, idempotencyKey: string) {
  return apiRequest<OrderDetail>('/orders', {
    method: 'POST',
    body: input,
    idempotencyKey,
  });
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

export function listDeliveries(query: ListQuery, filters: Record<string, string> = {}) {
  return listResource<DeliveryRecord>('/deliveries', query, filters);
}

export function getDelivery(deliveryId: string) {
  return apiRequest<DeliveryRecord>(`/deliveries/${encodeURIComponent(deliveryId)}`);
}

export function createDelivery(input: DeliveryInput, idempotencyKey: string) {
  return apiRequest<DeliveryRecord>('/deliveries', {
    method: 'POST',
    body: input,
    idempotencyKey,
  });
}

export function updateDeliveryStatus(
  deliveryId: string,
  status: Exclude<DeliveryStatus, 'draft'>,
  idempotencyKey: string,
) {
  return apiRequest<DeliveryRecord>(`/deliveries/${encodeURIComponent(deliveryId)}/status`, {
    method: 'PATCH',
    body: { status },
    idempotencyKey,
  });
}

export type OrderPage = ApiPage<OrderRecord>;
