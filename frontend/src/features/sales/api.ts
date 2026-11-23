import { apiRequest } from '../../shared/api/http';
import { listResource, type ApiPage, type ListQuery, type Product } from '../inventory/api';

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
  payment_status?: 'paid' | 'overdue' | 'partially_paid' | 'unpaid' | 'return';
  printed_at?: string | null;
  status: 'draft' | 'issued' | 'paid' | 'cancelled' | 'partially_paid' | 'overdue';
};

export type InvoiceLineInput = {
  product_id: number;
  warehouse_id: number;
  quantity: number;
  unit_price_egp: string;
  discount_amount_egp?: string;
  description?: string;
};

export type InvoiceInput = {
  customer_id: number;
  issuer_type: 'company' | 'partner' | 'driver';
  issuer_partner_id?: number;
  issuer_driver_id?: number;
  issuer_company?: string | null;
  payment_terms: 'immediate' | 'deferred';
  shipping_driver_id?: number;
  shipping_driver_name?: string | null;
  shipping_company?: string | null;
  governorate?: string | null;
  issue_date: string;
  due_date: string | null;
  notes: string | null;
  discount_type: 'fixed' | 'percent';
  discount_value: string;
  lines: InvoiceLineInput[];
};

export type InvoiceDraft = {
  id: number;
  invoice_number: string;
  status: 'draft' | 'issued';
};

export async function listInvoiceProducts(): Promise<ApiPage<Product>> {
  const query: ListQuery = { page: 1, perPage: 100, search: '' };
  const firstPage = await listResource<Product>('/products', query);
  const rows = [...firstPage.data];
  for (let page = 2; page <= firstPage.meta.last_page; page += 1) {
    const next = await listResource<Product>('/products', { ...query, page });
    rows.push(...next.data);
  }
  return { ...firstPage, data: rows };
}

type BackendInvoiceDocument = {
  id: number;
  document_number?: string;
  document_type?: 'invoice' | 'credit_note';
  invoice_number?: string;
  status: string;
  customer_id: number;
  customer_name?: string;
  customer_name_snapshot?: string | null;
  customer_phone?: string | null;
  customer_governorate?: string | null;
  issue_date: string;
  due_date: string | null;
  total_amount?: string;
  total_egp?: string | null;
  paid_egp?: string | null;
  remaining_egp?: string | null;
  issuer_name_snapshot?: string | null;
  issuer_type?: 'company' | 'partner' | 'driver' | null;
  issuer_company_snapshot?: string | null;
  issuer_partner_id?: number | null;
  issuer_driver_id?: number | null;
  shipping_driver_id?: number | null;
  payment_terms?: string | null;
  discount_type?: 'fixed' | 'percent' | null;
  discount_value?: string | null;
  customer_phone_snapshot?: string | null;
  customer_governorate_snapshot?: string | null;
  governorate_snapshot?: string | null;
  shipping_driver_name_snapshot?: string | null;
  shipping_company_snapshot?: string | null;
  return_reason?: string | null;
  original_invoice_number?: string | null;
  return_processing_type?: 'linked' | 'free' | null;
  subtotal?: string | null;
  discount_amount?: string | null;
  payment_status?: Invoice['payment_status'];
  is_overdue?: boolean;
  posted_at?: string | null;
  printed_at?: string | null;
  print_count?: number;
  issuer_name?: string;
  notes?: string | null;
};

function invoiceStatus(status: string): Invoice['status'] {
  if (status === 'posted') return 'issued';
  if (status === 'reversed') return 'cancelled';
  if (status === 'cancelled' || status === 'draft' || status === 'paid') return status;
  return 'issued';
}

function normalizeInvoiceDocument(document: BackendInvoiceDocument): Invoice {
  return {
    id: document.id,
    invoice_number: document.document_number ?? document.invoice_number ?? '',
    customer_id: document.customer_id,
    customer_name: document.customer_name_snapshot ?? document.customer_name ?? '',
    issue_date: document.issue_date,
    due_date: document.due_date,
    total_egp: document.total_amount ?? document.total_egp ?? null,
    paid_egp: document.paid_egp ?? null,
    remaining_egp: document.remaining_egp ?? null,
    issuer_name: document.issuer_name_snapshot ?? document.issuer_name ?? '',
    payment_status: document.payment_status,
    printed_at: document.printed_at ?? null,
    status: document.payment_status === 'paid'
      ? 'paid'
      : document.payment_status === 'overdue' || document.payment_status === 'partially_paid'
      ? document.payment_status
      : invoiceStatus(document.status),
  };
}

function normalizeInvoiceDraft(response: { document: BackendInvoiceDocument }): InvoiceDraft {
  return {
    id: response.document.id,
    invoice_number: response.document.document_number ?? response.document.invoice_number ?? '',
    status: response.document.status === 'draft' ? 'draft' : 'issued',
  };
}
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
  description?: string | null;
  warehouse_name?: string | null;
  category_name?: string | null;
  sku: string | null;
  quantity: string;
  unit_price_egp: string;
  discount_amount_egp: string | null;
  manual_discount_amount_egp?: string | null;
  line_total_egp: string | null;
  returned_quantity?: number;
  remaining_quantity?: number;
};

export type InvoiceDetail = Invoice & {
  customer_phone: string | null;
  document_type?: 'invoice' | 'credit_note';
  customer_governorate?: string | null;
  issuer_type?: 'company' | 'partner' | 'driver' | null;
  issuer_company?: string | null;
  issuer_partner_id?: number | null;
  issuer_driver_id?: number | null;
  shipping_driver_id?: number | null;
  payment_terms?: 'immediate' | 'deferred' | null;
  subtotal_egp?: string | null;
  discount_egp?: string | null;
  discount_type?: 'fixed' | 'percent' | null;
  discount_value?: string | null;
  shipping_driver_name?: string | null;
  shipping_company?: string | null;
  governorate?: string | null;
  posted_at?: string | null;
  print_count?: number;
  notes?: string | null;
  return_processing_type?: 'linked' | 'free' | null;
  return_reason?: string | null;
  original_invoice_number?: string | null;
  payment_allocations?: InvoicePaymentAllocation[];
  lines: InvoicePrintLine[];
};

export type InvoicePaymentAllocation = {
  receipt_id: number;
  receipt_number: string;
  receipt_date: string;
  treasury_account_id: number;
  treasury_account_name: string;
  amount_egp: string;
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
  issuer_type: 'company' | 'partner' | 'driver';
  issuer_partner_id?: number;
  issuer_driver_id?: number;
  issuer_company?: string | null;
  shipping_driver_id?: number;
  shipping_driver_name?: string | null;
  shipping_company?: string | null;
  governorate?: string | null;
  issue_date: string;
  original_document_id: number | null;
  return_reason: string;
  notes: string | null;
  lines: {
    warehouse_id: number;
    quantity: number;
    return_condition: 'good' | 'damaged';
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
  lines: {
    id: number;
    product_id: number;
    product_name: string;
    sku: string;
    quantity: number;
    unit_price: string;
    line_total: string;
    return_condition: 'good' | 'damaged' | null;
    warehouse_name: string | null;
  }[];
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
  allocated_egp: string | null;
  unallocated_egp: string;
};

export type CollectionDetail = {
  receipt: { id: number; receipt_number: string; customer_id: number; treasury_account_id: number; receipt_date: string; amount: string; status: string };
  allocations: { id: number; document_id: number; invoice_number: string; customer_name: string; amount_egp: string; reversed_egp: string; active_egp: string; reversals: { amount: string; reason: string; reversed_at: string }[] }[];
};

type BackendReceipt = {
  id: number;
  receipt_number: string;
  customer_id: number;
  customer_name?: string;
  treasury_account_id: number;
  receipt_date: string;
  amount?: string;
  amount_egp?: string;
  allocated_egp?: string | null;
  unapplied_amount?: string;
  unallocated_egp?: string;
};

function subtractReceiptMoney(amount: string, unapplied: string): string | null {
  const toTenThousandths = (value: string): bigint | null => {
    const match = /^(\d+)(?:\.(\d{1,4}))?$/.exec(value);
    if (!match) return null;
    return BigInt(match[1]) * 10_000n + BigInt((match[2] ?? '').padEnd(4, '0') || '0');
  };
  const amountUnits = toTenThousandths(amount);
  const unappliedUnits = toTenThousandths(unapplied);
  if (amountUnits === null || unappliedUnits === null || unappliedUnits > amountUnits) return null;
  const allocatedUnits = amountUnits - unappliedUnits;
  return `${allocatedUnits / 10_000n}.${String(allocatedUnits % 10_000n).padStart(4, '0')}`;
}

function normalizeCollectionReceipt(receipt: BackendReceipt): CollectionReceipt {
  const amount = receipt.amount ?? receipt.amount_egp ?? '0';
  const unapplied = receipt.unapplied_amount ?? receipt.unallocated_egp ?? '0';
  return {
    id: receipt.id,
    receipt_number: receipt.receipt_number,
    customer_id: receipt.customer_id,
    customer_name: receipt.customer_name ?? '',
    treasury_account_id: receipt.treasury_account_id,
    receipt_date: receipt.receipt_date,
    amount_egp: amount,
    allocated_egp: receipt.allocated_egp ?? subtractReceiptMoney(amount, unapplied),
    unallocated_egp: unapplied,
  };
}

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
  return listResource<BackendInvoiceDocument>('/invoices', query, filters).then((page) => ({
    ...page,
    data: page.data.map(normalizeInvoiceDocument),
  }));
}

export function getInvoice(invoiceId: string, resource: 'invoices' | 'returns' = 'invoices'): Promise<InvoiceDetail> {
  return apiRequest<Record<string, unknown>>('/' + resource + '/' + encodeURIComponent(invoiceId)).then((response) => {
    const envelope = response.data;
    if (envelope && typeof envelope === 'object' && 'document' in envelope) {
      const data = envelope as {
        document: BackendInvoiceDocument;
        lines: Record<string, unknown>[];
        payment_allocations?: Record<string, unknown>[];
      };
      return {
        ...normalizeInvoiceDocument(data.document),
        document_type: data.document.document_type,
        customer_phone: data.document.customer_phone_snapshot ?? data.document.customer_phone ?? null,
        customer_governorate: data.document.customer_governorate_snapshot ?? data.document.customer_governorate ?? null,
        issuer_type: data.document.issuer_type ?? null,
        issuer_company: data.document.issuer_company_snapshot ?? null,
        issuer_partner_id: data.document.issuer_partner_id ?? null,
        issuer_driver_id: data.document.issuer_driver_id ?? null,
        shipping_driver_id: data.document.shipping_driver_id ?? null,
        payment_terms: data.document.payment_terms === 'immediate' ? 'immediate' : 'deferred',
        subtotal_egp: data.document.subtotal ?? null,
        discount_egp: data.document.discount_amount ?? null,
        discount_type: data.document.discount_type ?? null,
        discount_value: data.document.discount_value ?? null,
        shipping_driver_name: data.document.shipping_driver_name_snapshot ?? null,
        shipping_company: data.document.shipping_company_snapshot ?? null,
        governorate: data.document.governorate_snapshot ?? null,
        posted_at: data.document.posted_at ?? null,
        print_count: data.document.print_count ?? 0,
        notes: data.document.notes ?? null,
        return_processing_type: data.document.return_processing_type ?? null,
        return_reason: data.document.return_reason ?? null,
        original_invoice_number: data.document.original_invoice_number ?? null,
        payment_allocations: Array.isArray(data.payment_allocations)
          ? data.payment_allocations.map((payment) => ({
              receipt_id: Number(payment.receipt_id),
              receipt_number: String(payment.receipt_number ?? `COL-${payment.receipt_id}`),
              receipt_date: String(payment.receipt_date ?? ''),
              treasury_account_id: Number(payment.treasury_account_id),
              treasury_account_name: String(payment.treasury_account_name ?? ''),
              amount_egp: String(payment.amount_egp ?? '0.00'),
            }))
          : [],
        lines: data.lines.map((line) => ({
          id: Number(line.id),
          product_id: Number(line.product_id),
          warehouse_id: Number(line.location_id),
          product_name: String(line.product_name ?? line.description_snapshot ?? ('الصنف رقم ' + line.product_id)),
          description: line.description == null ? null : String(line.description),
          warehouse_name: line.warehouse_name == null ? null : String(line.warehouse_name),
          category_name: line.product_category_snapshot == null ? null : String(line.product_category_snapshot),
          sku: line.sku_snapshot == null ? null : String(line.sku_snapshot),
          quantity: String(line.quantity ?? ''),
          unit_price_egp: String(line.unit_price ?? ''),
          discount_amount_egp: line.discount_amount == null ? null : String(line.discount_amount),
          manual_discount_amount_egp: line.manual_discount_amount == null
            ? (data.document.discount_type == null ? (line.discount_amount == null ? null : String(line.discount_amount)) : '0.00')
            : String(line.manual_discount_amount),
          line_total_egp: line.line_total == null ? null : String(line.line_total),
          returned_quantity: Number(line.returned_quantity ?? 0),
          remaining_quantity: Number(line.remaining_quantity ?? line.quantity ?? 0),
        })),
      };
    }
    return response as unknown as InvoiceDetail;
  });
}
export function listInvoiceHistory(
  invoiceId: string,
  query: ListQuery,
): Promise<ApiPage<InvoiceHistoryRow>> {
  return listResource<Record<string, unknown>>(
    `/invoices/${encodeURIComponent(invoiceId)}/history`,
    query,
  ).then((page) => ({
    ...page,
    data: page.data.map((row) => {
      const actor = row.actor && typeof row.actor === 'object'
        ? row.actor as Record<string, unknown>
        : {};
      return {
        id: Number(row.id),
        field_path: String(row.field_path ?? ''),
        old_value: row.old_value,
        new_value: row.new_value,
        reason: row.reason == null ? null : String(row.reason),
        actor_name: String(row.actor_name ?? actor.name ?? ''),
        changed_at: String(row.changed_at ?? row.created_at ?? ''),
      };
    }),
  }));
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
      lines: Array.isArray(row.lines) ? row.lines.map((line) => {
        const item = line as Record<string, unknown>;
        return {
          id: Number(item.id),
          product_id: Number(item.product_id),
          product_name: String(item.product_name ?? ''),
          sku: String(item.sku ?? ''),
          quantity: Number(item.quantity ?? 0),
          unit_price: String(item.unit_price ?? '0'),
          line_total: String(item.line_total ?? '0'),
          return_condition: item.return_condition === 'damaged' ? 'damaged' as const : item.return_condition === 'good' ? 'good' as const : null,
          warehouse_name: item.warehouse_name == null ? null : String(item.warehouse_name),
        };
      }) : [],
    })) as ReturnDocument[],
  }));
}

export function getReturn(returnId: string): Promise<InvoiceDetail> {
  return getInvoice(returnId, 'returns');
}

export function markReturnPrinted(returnId: string): Promise<void> {
  return apiRequest<unknown>('/returns/' + encodeURIComponent(returnId) + '/printed', {
    method: 'POST',
    body: {},
  }).then(() => undefined);
}

export function listCollections(
  query: ListQuery,
  filters: Record<string, string> = {},
): Promise<ApiPage<CollectionReceipt>> {
  return listResource<BackendReceipt>('/collections', query, filters).then((page) => ({
    ...page,
    data: page.data.map(normalizeCollectionReceipt),
  }));
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
  return apiRequest<{ data: { receipt: BackendReceipt } } | BackendReceipt>('/collections', {
    method: 'POST',
    body: input,
    idempotencyKey,
  }).then((response) =>
    normalizeCollectionReceipt('data' in response ? response.data.receipt : response),
  );
}

export function getCollection(receiptId: number): Promise<CollectionDetail> {
  return apiRequest<{ data: CollectionDetail }>(`/collections/${receiptId}`).then((result) => result.data);
}

export function allocateCollection(receiptId: number, allocations: CollectionAllocationInput[]) {
  return apiRequest<unknown>(`/collections/${receiptId}/allocations`, { method: 'POST', body: { allocations } });
}

export function reverseCollectionAllocation(receiptId: number, allocationId: number, amount_egp: string, reason: string) {
  return apiRequest<unknown>(`/collections/${receiptId}/allocations/${allocationId}/reverse`, { method: 'POST', body: { amount_egp, reason } });
}

export function createInvoiceDraft(input: InvoiceInput, idempotencyKey: string) {
  return apiRequest<{ data: { document: BackendInvoiceDocument } }>('/invoices', {
    method: 'POST',
    body: input,
    idempotencyKey,
  }).then((result) => normalizeInvoiceDraft(result.data));
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

export type InvoicePaymentInput = {
  treasury_account_id: number;
  amount_egp: string;
  payment_method?: string;
};

export function issueInvoice(
  invoiceId: number,
  idempotencyKey: string,
  payments: InvoicePaymentInput[] = [],
) {
  return apiRequest<{ data: { document: BackendInvoiceDocument } }>(`/invoices/${invoiceId}/issue`, {
    method: 'POST',
    body: payments.length ? { payments } : {},
    idempotencyKey,
  }).then((result) => normalizeInvoiceDraft(result.data));
}

export type InvoiceIssuerOptions = {
  company: { type: 'company'; name: string }[];
  partners: { id: number; name: string }[];
  drivers: { id: number; name: string; shipping_company: string | null }[];
};

export function getInvoiceIssuerOptions(): Promise<InvoiceIssuerOptions> {
  return apiRequest<{ data: InvoiceIssuerOptions }>('/invoice-issuers').then((response) => response.data);
}

export function getCustomerLastPrices(customerId: string): Promise<{
  product_id: number;
  unit_price_egp: string;
  invoice_number: string;
  issue_date: string;
}[]> {
  return apiRequest<{
    data: { product_id: number; unit_price_egp: string; invoice_number: string; issue_date: string }[];
  }>(`/customers/${encodeURIComponent(customerId)}/last-prices`).then((response) => response.data);
}

export function markInvoicePrinted(invoiceId: string): Promise<void> {
  return apiRequest(`/invoices/${encodeURIComponent(invoiceId)}/printed`, { method: 'POST' }).then(() => undefined);
}

export function reviseInvoice(
  invoiceId: string,
  input: InvoiceInput & {
    reason: string;
    payment_account_changes?: { receipt_id: number; treasury_account_id: number }[];
  },
  idempotencyKey: string,
): Promise<InvoiceMutationResult> {
  return apiRequest<{ data: { document: BackendInvoiceDocument } }>(`/invoices/${encodeURIComponent(invoiceId)}`, {
    method: 'PUT',
    body: input,
    idempotencyKey,
  }).then((response) => {
    const invoice = normalizeInvoiceDocument(response.data.document);
    return { id: invoice.id, invoice_number: invoice.invoice_number, status: invoice.status };
  });
}

export function cancelInvoice(invoiceId: string, reason: string, idempotencyKey: string) {
  return apiRequest<InvoiceMutationResult>(`/invoices/${encodeURIComponent(invoiceId)}/cancel`, {
    method: 'POST',
    body: { reason },
    idempotencyKey,
  });
}
