# API Client Specification (frontend, TypeScript) [PROPOSED]
Illustrative code to be placed in `apps/web/src/shared/api/`. Not yet implemented in any repo.

## http.ts
```ts
export interface ApiErrorBody { error: { code: string; message: string; fields?: Record<string,string>; details?: {field:string; issue:string}[] }; meta?: { request_id?: string } }

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string,
              public fields: Record<string,string> = {}, public requestId?: string) { super(message) }
}

const BASE = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'
let csrfToken: string | null = null            // memory only (mode A/B)

export async function http<T>(method: string, path: string, opts: {
  params?: Record<string, string|number|undefined>, body?: unknown, idempotencyKey?: string, signal?: AbortSignal } = {}): Promise<T> {
  const url = new URL(BASE + path, window.location.origin)
  Object.entries(opts.params ?? {}).forEach(([k,v]) => v !== undefined && v !== '' && url.searchParams.set(k, String(v)))
  const requestId = crypto.randomUUID()
  const headers: Record<string,string> = { 'Accept':'application/json', 'Accept-Language':'ar', 'X-Request-Id': requestId }
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'
  if (opts.idempotencyKey) headers['Idempotency-Key'] = opts.idempotencyKey
  if (csrfToken && method !== 'GET') headers['X-CSRF-Token'] = csrfToken
  let res: Response
  try { res = await fetch(url, { method, headers, credentials: 'include', signal: opts.signal,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined }) }
  catch { throw new ApiError(0, 'NETWORK_ERROR', 'تعذر الاتصال بالخادم', {}, requestId) }
  if (res.status === 204) return undefined as T
  const json = await res.json().catch(() => null)
  if (!res.ok) {
    const e = (json as ApiErrorBody | null)?.error
    if (res.status === 401) onSessionExpired()          // clear user, redirect /login?next=
    throw new ApiError(res.status, e?.code ?? 'UNKNOWN', e?.message ?? 'حدث خطأ غير متوقع', e?.fields, json?.meta?.request_id ?? requestId)
  }
  return json as T
}
```
Notes: no tokens in `localStorage`; the response `X-CSRF-Token` (login/me) is kept in memory; `credentials:'include'` only matters in topology B.

## Idempotency key hook
```ts
export function useIdempotencyKey() {            // one key per form-open; reused on retry; new key after success/reset
  const ref = useRef(crypto.randomUUID()); return { key: ref.current, reset: () => { ref.current = crypto.randomUUID() } }
}
```
Sent on: invoice post/reverse/returns, receipts, transfers (stock + treasury), adjustments, expenses, void, container receive/costs.
Server answers `409 IDEMPOTENCY_REPLAY_MISMATCH` if the same key carries a different body.

## Error → UI mapping (single place)
| Status/code | UI |
|---|---|
| 0 NETWORK_ERROR | retry banner, keep form |
| 400 VALIDATION_FAILED | map `fields` into React-Hook-Form `setError` |
| 401 | clear session → `/login?next=` |
| 403 FORBIDDEN | 403 panel inside shell |
| 404 | not-found panel |
| 409 DUPLICATE_DOCUMENT / ALREADY_POSTED / ALREADY_RECEIVED | open the existing document + toast |
| 422 INSUFFICIENT_STOCK | inline error on the offending line (`fields["lines.N.qty"]`) |
| 422 CREDIT_LIMIT_EXCEEDED | blocking dialog (only if D4 = block) |
| 422 OVER_RETURN / OVER_ALLOCATION / UNBALANCED_ENTRY | inline message |
| 429 TOO_MANY_ATTEMPTS | login lockout message |
| 5xx | generic message + "رقم الطلب: {requestId}" for support |

## Feature service pattern
```ts
export const invoicesApi = {
  list:   (p: InvoiceListParams) => http<Paged<InvoiceSummary>>('GET', '/sales/invoices', { params: p }),
  get:    (id: string)           => http<{data: Invoice}>('GET', `/sales/invoices/${id}`),
  createDraft: (b: InvoiceDraftInput) => http<{data: Invoice}>('POST', '/sales/invoices', { body: b, idempotencyKey: b.clientKey }),
  post:   (id: string, key: string) => http<{data: Invoice}>('POST', `/sales/invoices/${id}/post`, { body: {}, idempotencyKey: key }),
}
```
`Paged<T> = { data: T[]; meta: { page:number; limit:number; total:number; request_id:string } }`

## Auth bootstrap
`GET /auth/me` on boot → store `{user, permissions[]}` in the session store; router guards read permissions; **server still enforces**. Idle timer shows the warning dialog from the Settings values; server session lifetime is authoritative.
