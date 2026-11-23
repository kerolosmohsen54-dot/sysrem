import { apiRequest } from '../../shared/api/http';
import { listResource, type ApiPage, type ListQuery } from '../inventory/api';

export type Invoice = {
  id: number;
  invoice_number: string;
  customer_id: number;
  customer_name: string;
  issue_date: string;
  due_date: string | null;
  total_egp: string | null;
  paid_egp: string | null;
  remaining_egp: string | null;
  issuer_name: string;
  status: 'draft' | 'issued' | 'paid' | 'cancelled';
};

export type InvoiceLineInput = {
  product_id: number;
  warehouse_id: number;
  quantity: number;
  unit_price_egp: string;
  discount_amount_egp?: string;
};

export type InvoiceInput = {
  customer_id: number;
  issue_date: string;
  due_date: string | null;
  notes: string | null;
  lines: InvoiceLineInput[];
};

export type InvoiceDraft = {
  id: number;
  invoice_number: string;
  status: 'draft' | 'issued';
};

export type InvoiceMutationResult = {
  id: number;
  invoice_number: string;
  status: Invoice['status'];
};

export type InvoicePrintLine = {
  id?: number;
  product_id?: number;
  warehouse_id?: number;
  location_id?: number;
  product_name: string;
  sku: string | null;
  quantity: string;
  unit_price_egp: string;
  discount_amount_egp: string | null;
  line_total_egp: string | null;
};

export type InvoiceDetail = Invoice & {
  customer_phone: string | null;
  customer_governorate?: string | null;
  notes?: string | null;
  lines: InvoicePrintLine[];
};

export type InvoicePreview = {
  lines: {
    line_number: number;
    product_id: number;
    sku: string;
    product_name: string;
    warehouse_id: number;
    quantity: number;
    unit_price_egp: string;
    discount_amount_egp: string;
    tax_amount_egp: string;
    line_total_egp: string;
  }[];
  subtotal_egp: string;
  discount_amount_egp: string;
  tax_enabled: boolean;
  tax_rate: string;
  tax_calculation_method: 'inclusive' | 'exclusive' | null;
  tax_amount_egp: string;
  grand_total_egp: string;
  warnings: {
    code: string;
    product_id?: number;
    product_name?: string;
    available_quantity?: string;
    requested_quantity?: string;
  }[];
};

export type ReturnInput = {
  customer_id: number;
  issue_date: string;
  original_document_id: number | null;
  notes: string | null;
  lines: {
    warehouse_id: number;
    quantity: number;
    original_document_line_id?: number | null;
    product_id?: number;
    unit_price_egp?: string;
    discount_amount_egp?: string;
    unit_cost_egp?: string;
    description?: string | null;
  }[];
};

export type ReturnPreview = {
  lines: {
    line_number: number;
    product_id: number;
    sku: string | null;
    description: string | null;
    warehouse_id: number;
    quantity: number;
    unit_price_egp: string;
    discount_amount_egp: string;
    tax_amount_egp: string;
    line_total_egp: string;
  }[];
  subtotal_egp: string;
  discount_amount_egp: string;
  tax_amount_egp: string;
  grand_total_egp: string;
  warnings: {
    code: string;
    product_id?: number;
    product_name?: string;
    available_quantity?: string;
    requested_quantity?: string;
  }[];
};

export type InvoiceHistoryRow = {
  id: number;
  field_path: string;
  old_value: unknown;
  new_value: unknown;
  reason: string | null;
  actor_name: string;
  changed_at: string;
};

export type ReturnDocument = {
  id: number;
  return_number: string;
  original_document_id: number | null;
  original_invoice_number: string | null;
  customer_id: number;
  customer_name: string;
  issue_date: string;
  reason: string | null;
  processing_type: string | null;
  amount_egp: string | null;
  status: string;
};

export type CollectionAllocationInput = {
  document_id: number;
  amount_egp: string;
};

export type CollectionInput = {
  customer_id: number;
  treasury_account_id: number;
  receipt_date: string;
  amount_egp: string;
  allocations?: CollectionAllocationInput[];
};

export type CollectionReceipt = {
  id: number;
  receipt_number: string;
  customer_id: number;
  customer_name: string;
  treasury_account_id: number;
  receipt_date: string;
  amount_egp: string;
  allocated_egp: string;
  unallocated_egp: string;
};

export type TreasuryAccountOption = {
  id: number;
  code: string;
  name: string;
  account_type: 'cash' | 'bank' | 'other';
  is_active: boolean;
};

export function listInvoices(
  query: ListQuery,
  filters: Record<string, string> = {},
): Promise<ApiPage<Invoice>> {
  return listResource<Invoice>('/invoices', query, filters);
}

export function getInvoice(invoiceId: string): Promise<InvoiceDetail> {
  return apiRequest<InvoiceDetail>(`/invoices/${encodeURIComponent(invoiceId)}`);
}

export function listInvoiceHistory(
  invoiceId: string,
  query: ListQuery,
): Promise<ApiPage<InvoiceHistoryRow>> {
  return listResource<InvoiceHistoryRow>(
    `/invoices/${encodeURIComponent(invoiceId)}/history`,
    query,
  );
}

export function listReturns(
  query: ListQuery,
  filters: Record<string, string> = {},
): Promise<ApiPage<ReturnDocument>> {
  return listResource<Record<string, unknown>>('/returns', query, filters).then((page) => ({
    ...page,
    data: page.data.map((row) => ({
      ...row,
      id: Number(row.id),
      return_number: String(row.return_number ?? row.document_number ?? ''),
      original_invoice_number:
        row.original_invoice_number == null ? null : String(row.original_invoice_number),
      customer_id: Number(row.customer_id),
      customer_name: String(row.customer_name ?? ''),
      issue_date: String(row.issue_date ?? ''),
      reason: row.reason == null ? null : String(row.reason),
      processing_type: row.processing_type == null ? null : String(row.processing_type),
      amount_egp:
        row.amount_egp == null
          ? row.total_amount == null
            ? null
            : String(row.total_amount)
          : String(row.amount_egp),
      status: String(row.status ?? 'posted'),
    })) as ReturnDocument[],
  }));
}

export function listCollections(
  query: ListQuery,
  filters: Record<string, string> = {},
): Promise<ApiPage<CollectionReceipt>> {
  return listResource<CollectionReceipt>('/collections', query, filters);
}

export function listTreasuryAccountOptions(
  query: ListQuery,
): Promise<ApiPage<TreasuryAccountOption>> {
  return listResource<TreasuryAccountOption>('/treasury/accounts', query);
}

export function createCollection(
  input: CollectionInput,
  idempotencyKey: string,
): Promise<CollectionReceipt> {
  return apiRequest<CollectionReceipt>('/collections', {
    method: 'POST',
    body: input,
    idempotencyKey,
  });
}

export function createInvoiceDraft(input: InvoiceInput, idempotencyKey: string) {
  return apiRequest<InvoiceDraft | { data: InvoiceDraft }>('/invoices', {
    method: 'POST',
    body: input,
    idempotencyKey,
  }).then((result) => ('data' in result ? result.data : result));
}

export function previewInvoice(input: InvoiceInput): Promise<InvoicePreview> {
  return apiRequest<{ data: InvoicePreview }>('/invoices/preview', {
    method: 'POST',
    body: input,
  }).then((result) => result.data);
}

export function previewReturn(input: ReturnInput): Promise<ReturnPreview> {
  return apiRequest<{ data: ReturnPreview }>('/returns/preview', {
    method: 'POST',
    body: input,
  }).then((result) => result.data);
}

export function createReturn(input: ReturnInput, idempotencyKey: string) {
  return apiRequest<{
    data: {
      document: { id: number; document_number: string };
      lines: InvoicePrintLine[];
    };
  }>('/returns', {
    method: 'POST',
    body: input,
    idempotencyKey,
  }).then((result) => result.data);
}

export function issueInvoice(invoiceId: number, idempotencyKey: string) {
  return apiRequest<InvoiceDraft | { data: InvoiceDraft }>(`/invoices/${invoiceId}/issue`, {
    method: 'POST',
    idempotencyKey,
  }).then((result) => ('data' in result ? result.data : result));
}

export function cancelInvoice(invoiceId: string, reason: string, idempotencyKey: string) {
  return apiRequest<InvoiceMutationResult>(`/invoices/${encodeURIComponent(invoiceId)}/cancel`, {
    method: 'POST',
    body: { reason },
    idempotencyKey,
  });
}
