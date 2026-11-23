import { apiRequest } from '../../shared/api/http';
import { listResource, type ApiPage, type ListQuery, type Product, type Warehouse } from '../inventory/api';
import { listPartners, type Partner } from '../finance/api';

export type Supplier = { id: number; name: string };

export type PurchaseInvoice = {
  id: number;
  invoice_number: string;
  supplier_id: number;
  supplier_name?: string | null;
  seller_partner_id?: number | null;
  seller_partner_name?: string | null;
  warehouse_id: number | null;
  invoice_date: string;
  status: string;
  subtotal_egp?: string;
  discount_egp?: string;
  tax_egp?: string;
  total_egp: string;
  notes?: string | null;
};

export type PurchaseInvoiceLine = {
  id: number;
  purchase_invoice_id: number;
  product_id: number;
  quantity: number;
  unit_cost_egp: string;
  company_price_egp: string | null;
  line_total_egp: string;
  line_number: number;
  product_name?: string;
};

export type PurchaseInvoiceInput = {
  invoice_number: string;
  supplier_id: number;
  warehouse_id: number | null;
  invoice_date: string;
  discount_egp: string;
  tax_egp: string;
  notes: string | null;
  seller_partner_id?: number | null;
  lines: { product_id: number; quantity: number; unit_cost_egp: string; company_price_egp?: string | null }[];
};

export type PurchaseInvoiceDetail = {
  invoice: PurchaseInvoice;
  lines: PurchaseInvoiceLine[];
  financial_summary: {
    invoice_supplier_paid_egp: string;
    invoice_supplier_due_egp: string;
    invoice_supplier_pending_egp: string;
    invoice_supplier_available_egp: string;
    supplier_total_due_egp: string;
    seller_profit_egp: string;
    seller_total_due_egp: string;
  };
  supplier_payments: SupplierPayment[];
};

export type SupplierPayment = {
  id: number;
  supplier_id: number;
  purchase_invoice_id: number;
  treasury_account_id: number;
  treasury_account_name: string | null;
  treasury_entry_id: number | null;
  amount_egp: string;
  payment_date: string;
  status: 'draft' | 'approved' | 'cancelled';
  notes: string | null;
};

export function listSuppliers(query: ListQuery): Promise<ApiPage<Supplier>> {
  return listResource<Supplier>('/suppliers', query);
}

export function listPurchasePartners(query: ListQuery): Promise<ApiPage<Partner>> {
  return listPartners(query);
}

export function createSupplier(input: { name: string; phone: string | null }) {
  return apiRequest<{ data: Supplier }>('/suppliers', { method: 'POST', body: input });
}

export function listPurchaseInvoices(query: ListQuery): Promise<ApiPage<PurchaseInvoice>> {
  return listResource<PurchaseInvoice>('/purchase-invoices', query, { sort_by: 'id', sort_direction: 'desc' });
}

export function getPurchaseInvoice(invoiceId: string): Promise<{ data: PurchaseInvoiceDetail }> {
  return apiRequest<{ data: PurchaseInvoiceDetail }>(`/purchase-invoices/${encodeURIComponent(invoiceId)}`);
}

export function createPurchaseInvoice(input: PurchaseInvoiceInput, idempotencyKey: string) {
  return apiRequest<{ data: { invoice: PurchaseInvoice } }>('/purchase-invoices', {
    method: 'POST',
    body: input,
    idempotencyKey,
  });
}

export function postPurchaseInvoice(invoiceId: string) {
  return apiRequest<{ data: { invoice: PurchaseInvoice; inventory_movement_ids: number[] } }>(`/purchase-invoices/${encodeURIComponent(invoiceId)}/post`, {
    method: 'POST',
    body: {},
  });
}

export function updatePurchaseInvoice(invoiceId: string, input: PurchaseInvoiceInput) {
  return apiRequest<{ data: { invoice: PurchaseInvoice } }>(`/purchase-invoices/${encodeURIComponent(invoiceId)}`, {
    method: 'PUT',
    body: input,
  });
}

export function deletePurchaseInvoice(invoiceId: string, reason: string, idempotencyKey: string) {
  return apiRequest<{ data: { id: number; deleted: boolean } }>(`/purchase-invoices/${encodeURIComponent(invoiceId)}`, {
    method: 'DELETE',
    body: { reason },
    idempotencyKey,
  });
}

export function createSupplierPayment(input: {
  purchase_invoice_id: number;
  treasury_account_id: number;
  amount_egp: string;
  payment_date: string;
  notes: string | null;
  idempotency_key: string;
}) {
  return apiRequest<{ data: SupplierPayment }>('/supplier-payments', { method: 'POST', body: input, idempotencyKey: input.idempotency_key });
}

export function approveSupplierPayment(paymentId: number) {
  return apiRequest<{ data: SupplierPayment }>(`/supplier-payments/${paymentId}/approve`, { method: 'POST' });
}

export function cancelSupplierPayment(paymentId: number, idempotencyKey: string) {
  return apiRequest<{ data: { id: number; status: 'cancelled' } }>(`/supplier-payments/${paymentId}`, {
    method: 'DELETE', body: {}, idempotencyKey,
  });
}

export function listPurchaseWarehouses(query: ListQuery): Promise<ApiPage<Warehouse>> {
  return listResource<Warehouse>('/warehouses', query);
}

export function listPurchaseProducts(query: ListQuery): Promise<ApiPage<Product>> {
  return listResource<Product>('/products', query);
}
