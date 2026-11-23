import { apiRequest } from '../../shared/api/http';
import { listResource, type ApiPage, type ListQuery } from '../inventory/api';

export type ContainerStatus =
  | 'draft'
  | 'in_transit'
  | 'at_port'
  | 'receiving'
  | 'received'
  | 'cancelled';
export type AllocationBasis = 'value' | 'quantity' | 'manual';

export type ContainerRecord = {
  id: number;
  container_number: string;
  supplier_id: number | null;
  supplier_name: string | null;
  origin: string | null;
  destination: string | null;
  status: ContainerStatus;
  estimated_departure: string | null;
  estimated_arrival: string | null;
  notes: string | null;
  line_count?: number;
  expenses_egp?: string | null;
};

export type ContainerLine = {
  id: number;
  product_id: number;
  product_name: string;
  sku: string | null;
  expected_quantity: string;
  received_quantity: string;
  purchase_value_egp: string;
  notes: string | null;
};

export type ContainerCostPayment = {
  id: number;
  treasury_entry_id: number;
  amount_egp: string;
  paid_at: string;
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

export type ContainerReceiptLine = {
  container_line_id: number;
  expected_quantity: string;
  received_quantity: string;
  discrepancy_reason: string | null;
};

export type ContainerReceipt = {
  id: number;
  received_at: string;
  warehouse_id: number;
  status: 'posted' | 'reversed';
  reason: string | null;
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

export type ContainerDetail = ContainerRecord & {
  allocation_basis: AllocationBasis | null;
  lines: ContainerLine[];
  costs: ContainerCost[];
  receipts: ContainerReceipt[];
  status_history: ContainerStatusHistory[];
};

export type CreateContainerInput = {
  container_number: string;
  supplier_id: number | null;
  origin: string | null;
  destination: string | null;
  notes: string | null;
  estimated_departure: string | null;
  estimated_arrival: string | null;
};

export function listContainers(query: ListQuery, filters: Record<string, string> = {}) {
  return listResource<ContainerRecord>('/containers', query, filters);
}

export function getContainer(containerId: string) {
  return apiRequest<ContainerDetail>(`/containers/${encodeURIComponent(containerId)}`);
}

export function listContainerReceipts(
  containerId: string,
  query: ListQuery,
): Promise<ApiPage<ContainerReceipt>> {
  return listResource(`/containers/${encodeURIComponent(containerId)}/receipts`, query);
}

export function getContainerReceipt(containerId: string, receiptId: string) {
  return apiRequest<ContainerReceipt>(
    `/containers/${encodeURIComponent(containerId)}/receipts/${encodeURIComponent(receiptId)}`,
  );
}

export function createContainer(input: CreateContainerInput, idempotencyKey: string) {
  return apiRequest<ContainerRecord>('/containers', {
    method: 'POST',
    body: input,
    idempotencyKey,
  });
}

export function addContainerLine(
  containerId: string,
  input: {
    product_id: number;
    expected_quantity: number;
    purchase_value_egp: string;
    notes: string | null;
  },
  idempotencyKey: string,
) {
  return apiRequest<ContainerLine>(`/containers/${encodeURIComponent(containerId)}/lines`, {
    method: 'POST',
    body: input,
    idempotencyKey,
  });
}

export function setContainerAllocationBasis(
  containerId: string,
  allocation_basis: AllocationBasis,
  idempotencyKey: string,
) {
  return apiRequest<void>(`/containers/${encodeURIComponent(containerId)}/allocation-basis`, {
    method: 'PUT',
    body: { allocation_basis },
    idempotencyKey,
  });
}

export function updateContainerStatus(
  containerId: string,
  input: { status: 'in_transit' | 'at_port' | 'cancelled'; reason: string },
  idempotencyKey: string,
) {
  return apiRequest<ContainerRecord>(`/containers/${encodeURIComponent(containerId)}/status`, {
    method: 'PATCH',
    body: input,
    idempotencyKey,
  });
}

export function addContainerCost(
  containerId: string,
  input: {
    cost_type: string;
    amount_egp: string;
    description: string | null;
    cost_date: string | null;
    include_in_inventory_cost: boolean;
    supplier_id: number | null;
    original_amount_reference: string | null;
    exchange_rate_reference: string | null;
    original_currency_code_reference: string | null;
  },
  idempotencyKey: string,
) {
  return apiRequest<ContainerCost>(`/containers/${encodeURIComponent(containerId)}/costs`, {
    method: 'POST',
    body: input,
    idempotencyKey,
  });
}

export function receiveContainer(
  containerId: string,
  input: {
    warehouse_id: number;
    movement_date: string;
    reason: string | null;
    lines: {
      container_line_id: number;
      expected_quantity: number;
      received_quantity: number;
      discrepancy_reason: string | null;
    }[];
    manual_allocations?: Record<string, Record<string, string>>;
  },
  idempotencyKey: string,
) {
  return apiRequest<ContainerReceipt>(`/containers/${encodeURIComponent(containerId)}/receipts`, {
    method: 'POST',
    body: input,
    idempotencyKey,
  });
}

export function previewLandedCost(
  containerId: string,
  input: {
    warehouse_id: number;
    received_at?: string;
    movement_date?: string;
    lines: {
      container_line_id: number;
      expected_quantity: number;
      received_quantity: number;
    }[];
    manual_allocations?: Record<string, Record<string, string>>;
  },
): Promise<ContainerReceiptPreview> {
  return apiRequest<{ data: ContainerReceiptPreview }>(
    `/containers/${encodeURIComponent(containerId)}/landed-cost/preview`,
    { method: 'POST', body: input },
  ).then((result) => result.data);
}

export function reverseContainerReceipt(
  containerId: string,
  receiptId: number,
  reason: string,
  idempotencyKey: string,
) {
  return apiRequest<void>(
    `/containers/${encodeURIComponent(containerId)}/receipts/${receiptId}/reverse`,
    { method: 'POST', body: { reason }, idempotencyKey },
  );
}

export function payContainerCost(
  costId: number,
  input: { treasury_entry_id: number; amount_egp: string },
  idempotencyKey: string,
) {
  return apiRequest<ContainerCostPayment>(`/container-costs/${costId}/payments`, {
    method: 'POST',
    body: input,
    idempotencyKey,
  });
}
