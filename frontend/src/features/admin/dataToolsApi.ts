import { apiRequest } from '../../shared/api/http';

export type ImportType = 'products' | 'customers' | 'opening-stock' | 'customer-opening-balances';
export type ImportPreview = {
  stage_id: string;
  type: ImportType;
  checksum: string;
  row_count: number;
  valid: boolean;
  duplicate: boolean;
  errors: Record<string, string[]>;
  rows: Array<{ line: number; values: Record<string, string | null> }>;
};
export function previewImport(type: ImportType, file: File): Promise<{ data: ImportPreview }> {
  const body = new FormData();
  body.set('type', type);
  body.set('file', file);
  return apiRequest('/data/imports/preview', { method: 'POST', body });
}
export function applyImport(stage_id: string): Promise<{ data: { duplicate: boolean; row_count: number; imported: number; applied_at: string } }> {
  return apiRequest('/data/imports/apply', { method: 'POST', body: { stage_id, confirmed: true } });
}

export type DailySummary = {
  date: string;
  invoice_count: number;
  sales_egp: string;
  collections_egp: string;
  expenses_egp: string;
  sales_profit_egp: string | null;
  sales_profit_complete: boolean;
  net_profit_egp: string;
  whatsapp_phone: string | null;
  reminder_enabled: boolean;
  reminder_time: string;
  updated_at: string;
};
export function getDailySummary(): Promise<{ data: DailySummary }> {
  return apiRequest('/data/daily-summary');
}
