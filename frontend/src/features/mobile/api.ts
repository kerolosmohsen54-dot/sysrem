import { ApiError, formatApiErrorDetails, parseApiError } from '../../shared/api/errors';

export type MobileApiOptions = { method?: string; body?: unknown; idempotencyKey?: string };
function requestId(): string { return typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`; }

export async function mobileApiRequest<T>(token: string | null, path: string, options: MobileApiOptions = {}): Promise<T> {
  const headers = new Headers({ 'X-Request-ID': requestId() });
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body !== undefined) headers.set('Content-Type', 'application/json');
  if (options.idempotencyKey) headers.set('Idempotency-Key', options.idempotencyKey);
  const response = await fetch(`/api/v1${path}`, { method: options.method ?? 'GET', credentials: 'include', headers, body: options.body === undefined ? undefined : JSON.stringify(options.body) });
  const contentType = response.headers.get('content-type') ?? '';
  const payload = response.status === 204 ? undefined : contentType.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) throw parseApiError(payload, response.status);
  return payload as T;
}

export type MobileApiUser = { id: number; username: string; display_name: string; permissions: string[] };
export type MobileChannel = { id: number; name: string; type: 'wallet' | 'bank' | 'instapay' | 'postal' | 'other'; number: string; sender_filter: string; deposit_keywords: string[]; withdrawal_keywords: string[]; deposit_enabled: boolean; withdrawal_enabled: boolean; paused: boolean; balance: string };
export type MobileCapturedMessage = { id: number; channel_id: number; direction: 'DEPOSIT' | 'WITHDRAWAL' | 'NEEDS_REVIEW'; amount: string | null; raw_text?: string; sender: string; received_at: string; status: 'NEW' | 'RECORDED' | 'NEEDS_REVIEW' | 'IGNORED'; recorded_as: string | null; recorded_ref_id: number | null; archived_at: string | null };

export function mobileErrorDetails(error: unknown): string[] {
  if (!(error instanceof ApiError) || !error.details || typeof error.details !== 'object') return [];
  const details = formatApiErrorDetails(error.details);
  return details ? [details] : [];
}
