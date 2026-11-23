import { apiRequest } from '../../shared/api/http';
import { listResource, type ListQuery } from '../inventory/api';

export type ContainerStatus = 'draft' | 'in_transit' | 'at_port' | 'receiving' | 'received' | 'cancelled';
export type AllocationBasis = 'value' | 'quantity' | 'manual';

export type ContainerRecord = {
  id: number;
  container_name?: string | null;
  container_number: string;
  supplier_id: number | null;
  supplier_name: string | null;
  origin: string | null;
  destination: string | null;
  status: ContainerStatus;
  landed_cost_allocation_basis?: AllocationBasis | null;
  received_location_id?: number | null;
  current_location_id?: number | null;
  current_location_name?: string | null;
  received_at?: string | null;
  estimated_departure: string | null;
  estimated_arrival: string | null;
  notes: string | null;
  posted_receipt_count?: number;
  expenses_egp?: string | null;
  shipping_driver_id?: number | null;
  driver_name?: string | null;
  shipping_company?: string | null;
  trip_reference?: string | null;
};

export type ContainerCostPayment = {
  id: number;
  treasury_entry_id: number;
  amount_egp: string;
  paid_at: string;
};

export type ContainerLine = {
  id: number;
  product_id: number;
  product_name: string;
  sku: string | null;
  expected_quantity: string;
  received_quantity: string;
  purchase_unit_cost_egp?: string | null;
  purchase_value_egp?: string | null;
  company_price?: string | null;
  notes: string | null;
};

export type ContainerReceiptLine = {
  container_line_id: number;
  expected_quantity: string;
  received_quantity: string;
  discrepancy_reason: string | null;
  movement_line_id?: number;
  product_id?: number;
  product_name?: string;
  warehouse_id?: number;
  warehouse_name?: string;
  discrepancy_quantity?: number;
  quantity?: number;
};

export type ContainerReceipt = {
  id: number;
  inventory_movement_id?: number;
  movement_number?: string;
  movement_date?: string;
  received_at: string;
  warehouse_id?: number;
  warehouse_name?: string | null;
  status: 'posted' | 'reversed';
  reason?: string | null;
  lines: ContainerReceiptLine[];
};

export type ContainerReceiptPreview = {
  allocation_basis: AllocationBasis;
  lines: {
    container_line_id: number;
    product_id: number;
    warehouse_id: number;
    quantity: number;
    purchase_cost_egp?: string;
    allocated_landed_cost_egp?: string;
    line_cost_egp?: string;
    unit_cost_egp?: string;
  }[];
  total_landed_cost_allocated_egp: string | null;
};

export type ContainerStatusHistory = {
  id: number;
  status: ContainerStatus;
  reason: string | null;
  changed_at: string;
  actor_name: string | null;
};

export type ContainerTrackingEvent = {
  id: number;
  event_type: string;
  occurred_at: string;
  reference_number: string | null;
  details: string | null;
  quantity: number | null;
  amount_egp?: string | null;
  source_id: number | null;
  from_location_id: number | null;
  from_location_name: string | null;
  to_location_id: number | null;
  to_location_name: string | null;
};

export type ContainerCost = {
  id: number;
  cost_type: string;
  amount_egp: string;
  description: string | null;
  cost_date: string | null;
  include_in_inventory_cost: boolean;
  payments: ContainerCostPayment[];
};

export type ContainerDetail = ContainerRecord & {
  line_count?: number;
  allocation_basis: AllocationBasis | null;
  lines: ContainerLine[];
  costs: ContainerCost[];
  receipts: ContainerReceipt[];
  status_history: ContainerStatusHistory[];
  tracking_events: ContainerTrackingEvent[];
};

type ContainerMetadataInput = {
  container_name: string;
  container_number: string;
  supplier_id: number | null;
  shipping_driver_id: number | null;
  trip_reference: string | null;
  origin: string | null;
  destination: string | null;
  notes: string | null;
  estimated_departure: string | null;
  estimated_arrival: string | null;
};

export type CreateContainerInput = ContainerMetadataInput & {
  received_location_id: number;
  lines: { product_id: number; quantity: number; purchase_unit_cost_egp: string; company_price_egp: string }[];
  new_product_ids?: number[];
};

export type UpdateContainerInput = Omit<ContainerMetadataInput, 'container_name'> & { container_name: string | null };

export function listContainers(query: ListQuery, filters: Record<string, string> = {}) {
  return listResource<ContainerRecord>('/containers', query, filters);
}

export function getContainer(containerId: string) {
  return apiRequest<ContainerDetail | ContainerDetailPayload>(
    `/containers/${encodeURIComponent(containerId)}`,
  ).then((response): ContainerDetail => {
    if (!('data' in response) || !('container' in response.data)) return response as ContainerDetail;
    const detail = response.data;
    return {
      ...detail.container,
      allocation_basis: detail.container.landed_cost_allocation_basis ?? null,
      lines: detail.lines,
      costs: detail.costs.map((cost) => ({
        ...cost,
        include_in_inventory_cost: Boolean(cost.include_in_inventory_cost),
        payments: detail.cost_payments
          .filter((payment) => payment.container_cost_id === cost.id)
          .map(({ id, treasury_entry_id, amount_egp, paid_at }) => ({ id, treasury_entry_id, amount_egp, paid_at })),
      })),
      receipts: detail.receipts ?? [],
      status_history: (detail.status_history ?? []).map((item) => ({
        id: item.id,
        status: item.status ?? item.new_status ?? detail.container.status,
        reason: item.reason ?? null,
        changed_at: item.changed_at,
        actor_name: item.actor_name ?? null,
      })),
      tracking_events: detail.tracking_events ?? [],
    };
  });
}

type ContainerDetailPayload = {
  data: {
    container: ContainerRecord;
    lines: ContainerLine[];
    receipts?: ContainerReceipt[];
    costs: Omit<ContainerCost, 'payments'>[];
    cost_payments: (ContainerCostPayment & { container_cost_id: number })[];
    status_history?: { id: number; status?: ContainerStatus; new_status?: ContainerStatus; reason: string | null; changed_at: string; actor_name?: string | null }[];
    tracking_events?: ContainerTrackingEvent[];
  };
};

export function createContainer(input: CreateContainerInput, idempotencyKey: string) {
  return apiRequest<ContainerRecord | { data: ContainerRecord }>('/containers', {
    method: 'POST', body: input, idempotencyKey,
  }).then((response) => ('data' in response ? response.data : response));
}

export function updateContainer(containerId: string, input: UpdateContainerInput, idempotencyKey: string) {
  return apiRequest<ContainerRecord | { data: ContainerRecord }>(`/containers/${encodeURIComponent(containerId)}`, {
    method: 'PUT', body: input, idempotencyKey,
  }).then((response) => ('data' in response ? response.data : response));
}

export function archiveContainer(containerId: number, reason: string, idempotencyKey: string) {
  return apiRequest<{ data: { id: number; status: 'archived' } }>(`/containers/${containerId}`, {
    method: 'DELETE', body: { reason }, idempotencyKey,
  });
}

export function configureContainerCostType(costType: string, include_in_inventory_cost: boolean) {
  return apiRequest<{ data: { cost_type: string; include_in_inventory_cost: boolean } }>(
    `/container-cost-types/${encodeURIComponent(costType)}`,
    { method: 'PUT', body: { include_in_inventory_cost } },
  );
}

export function addContainerCost(containerId: string, input: {
  cost_type: string;
  amount_egp: string;
  description: string | null;
  cost_date: string | null;
  include_in_inventory_cost: boolean;
  supplier_id: number | null;
  original_amount_reference: string | null;
  exchange_rate_reference: string | null;
  original_currency_code_reference: string | null;
}, idempotencyKey: string) {
  return apiRequest<ContainerCost>(`/containers/${encodeURIComponent(containerId)}/costs`, {
    method: 'POST', body: input, idempotencyKey,
  });
}

export function payContainerCost(costId: number, input: { treasury_entry_id: number; amount_egp: string }, idempotencyKey: string) {
  return apiRequest<ContainerCostPayment>(`/container-costs/${costId}/payments`, {
    method: 'POST', body: input, idempotencyKey,
  });
}

type ContainerReceiptListItem = ContainerReceipt | {
  receipt: Omit<ContainerReceipt, 'lines' | 'warehouse_id'> & { warehouse_id?: number | null };
  lines: (ContainerReceiptLine & { expected_quantity: number | string; received_quantity: number | string })[];
};

export function listContainerReceipts(containerId: string, query: ListQuery) {
  return listResource<ContainerReceiptListItem>(`/containers/${encodeURIComponent(containerId)}/receipts`, query).then((page) => ({
    ...page,
    data: page.data.map((item): ContainerReceipt => 'receipt' in item ? {
      ...item.receipt,
      warehouse_id: item.receipt.warehouse_id ?? undefined,
      lines: item.lines.map((line) => ({ ...line, expected_quantity: String(line.expected_quantity), received_quantity: String(line.received_quantity) })),
    } : item),
  }));
}

type ContainerReceiptDetailPayload = {
  data: {
    receipt: Omit<ContainerReceipt, 'lines'>;
    lines: (ContainerReceiptLine & { expected_quantity: number | string; received_quantity: number | string })[];
  };
};

export function getContainerReceipt(containerId: string, receiptId: string) {
  return apiRequest<ContainerReceipt | ContainerReceiptDetailPayload>(`/containers/${encodeURIComponent(containerId)}/receipts/${encodeURIComponent(receiptId)}`).then((response): ContainerReceipt => {
    if (!('data' in response) || !('receipt' in response.data)) return response as ContainerReceipt;
    return {
      ...response.data.receipt,
      lines: response.data.lines.map((line) => ({ ...line, expected_quantity: String(line.expected_quantity), received_quantity: String(line.received_quantity) })),
    };
  });
}

export function addContainerLine(containerId: string, input: {
  product_id: number;
  expected_quantity: number;
  purchase_value_egp: string;
  notes: string | null;
}, idempotencyKey: string) {
  return apiRequest<ContainerLine>(`/containers/${encodeURIComponent(containerId)}/lines`, {
    method: 'POST', body: input, idempotencyKey,
  });
}

export function setContainerAllocationBasis(containerId: string, allocation_basis: AllocationBasis, idempotencyKey: string) {
  return apiRequest<void>(`/containers/${encodeURIComponent(containerId)}/allocation-basis`, {
    method: 'PUT', body: { allocation_basis }, idempotencyKey,
  });
}

export function updateContainerStatus(containerId: string, input: { status: 'in_transit' | 'at_port' | 'cancelled'; reason: string }, idempotencyKey: string) {
  return apiRequest<ContainerRecord>(`/containers/${encodeURIComponent(containerId)}/status`, {
    method: 'PATCH', body: input, idempotencyKey,
  });
}

export function receiveContainer(containerId: string, input: {
  warehouse_id: number;
  movement_date: string;
  reason: string | null;
  lines: { container_line_id: number; expected_quantity: number; received_quantity: number; discrepancy_reason: string | null }[];
  manual_allocations?: Record<string, Record<string, string>>;
}, idempotencyKey: string) {
  return apiRequest<{ data: { receipt_ids: number[] } }>(`/containers/${encodeURIComponent(containerId)}/receipts`, {
    method: 'POST', body: input, idempotencyKey,
  });
}

export function previewLandedCost(containerId: string, input: {
  warehouse_id: number;
  received_at?: string;
  movement_date?: string;
  lines: { container_line_id: number; expected_quantity: number; received_quantity: number }[];
  manual_allocations?: Record<string, Record<string, string>>;
}) {
  return apiRequest<{ data: ContainerReceiptPreview }>(`/containers/${encodeURIComponent(containerId)}/landed-cost/preview`, {
    method: 'POST', body: input,
  }).then((response) => response.data);
}

export function reverseContainerReceipt(containerId: string, receiptId: number, reason: string, idempotencyKey: string) {
  return apiRequest<void>(`/containers/${encodeURIComponent(containerId)}/receipts/${receiptId}/reverse`, {
    method: 'POST', body: { reason }, idempotencyKey,
  });
}

export type ContainerTransfer = {
  id: number; transfer_number: string; product_id: number; product_name: string;
  source_location_id: number; source_location_name: string; destination_location_id: number;
  destination_location_name: string; container_id: number | null; container_number: string | null;
  quantity: number; transfer_date: string; reason: string;
};

export type ContainerFundMovement = {
  id: number; container_id: number; container_cost_id: number | null; container_cost_type?: string | null;
  movement_type: 'add' | 'withdraw'; amount_egp: string;
  balance_after_egp: string; department: string; reason: string; movement_date: string;
  reference: string | null; notes: string | null;
};

export function listContainerTransfers(query: ListQuery) {
  return listResource<ContainerTransfer>('/container-transfers', query);
}

export function createContainerTransfer(input: {
  product_id: number; container_id: number | null; source_location_id: number; destination_location_id: number;
  quantity: number; transfer_date: string; reason: string; idempotency_key: string;
}) {
  return apiRequest<{ data: { id: number; transfer_number: string; inventory_movement_id: number } }>('/container-transfers', {
    method: 'POST', body: input, idempotencyKey: input.idempotency_key,
  });
}

export function listContainerFunds(containerId: number, query: ListQuery) {
  return listResource<ContainerFundMovement>('/container-funds', query, { container_id: String(containerId) }) as Promise<{
    data: ContainerFundMovement[];
    meta: { current_page: number; last_page: number; per_page: number; total: number; balance_egp: string };
  }>;
}

export function createContainerFundMovement(input: {
  container_id: number; container_cost_id: number | null; movement_type: 'add' | 'withdraw'; amount_egp: string; department: string;
  reason: string; reference: string | null; notes: string | null; movement_date: string; idempotency_key: string;
}) {
  return apiRequest<{ data: ContainerFundMovement; meta: { balance_egp: string } }>('/container-funds', {
    method: 'POST', body: input, idempotencyKey: input.idempotency_key,
  });
}
