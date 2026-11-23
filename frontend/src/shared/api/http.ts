import { ApiError, parseApiError } from './errors';

export type ApiRequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  idempotencyKey?: string;
  skipStepUp?: boolean;
  skipErrorEvent?: boolean;
};

type HttpHandlers = {
  onUnauthorized?: () => void;
  onStepUpRequired?: () => Promise<boolean>;
};

let handlers: HttpHandlers = {};

export function configureHttpHandlers(nextHandlers: HttpHandlers): () => void {
  handlers = { ...handlers, ...nextHandlers };
  return () => {
    handlers = {};
  };
}

function csrfToken(): string | null {
  const cookie = document.cookie.split('; ').find((part) => part.startsWith('XSRF-TOKEN='));
  if (!cookie) return null;
  return decodeURIComponent(cookie.slice('XSRF-TOKEN='.length));
}

function isMutating(method: string): boolean {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
}

function shouldUseIdempotency(path: string, method: string): boolean {
  if (['/auth/login', '/auth/logout', '/auth/reauth'].some((item) => path.includes(item))) {
    return false;
  }
  return (
    method === 'POST' ||
    (isMutating(method) && /finance|treasury|expense|invoice|collection/i.test(path))
  );
}

function isFinanceStepUpPath(path: string): boolean {
  const pathname = path.split('?', 1)[0];
  return [
    /^\/(?:accounting)(?:\/|$)/,
    /^\/(?:treasury|expenses|expense-categories|partners|partner-payments|currencies)(?:\/|$)/,
    /^\/purchase-invoices(?:\/|$)/,
    /^\/invoices(?:\/|$)/,
    /^\/invoice-issuers$/,
    /^\/customers\/\d+\/last-prices$/,
    /^\/(?:users|roles|audit-logs|settings|system\/backups|data\/imports|admin\/trash)(?:\/|$)/,
    /^\/customers\/\d+(?:\/(?:liquidation|opening-balance))?$/,
    /^\/reports\/customers\/\d+\/statement$/,
  ].some((pattern) => pattern.test(pathname));
}

export function newIdempotencyKey(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function responseValue(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) return response.json();
  return response.text();
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const headers = new Headers(options.headers);
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (options.body !== undefined && !isFormData) headers.set('Content-Type', 'application/json');
  if (!headers.has('X-Request-ID')) headers.set('X-Request-ID', newIdempotencyKey());
  const idempotencyKey =
    options.idempotencyKey ??
    (shouldUseIdempotency(path, method) ? newIdempotencyKey() : undefined);
  if (idempotencyKey) headers.set('Idempotency-Key', idempotencyKey);
  if (isMutating(method)) {
    const token = csrfToken();
    if (token) headers.set('X-CSRF-Token', token);
  }

  const { body, skipStepUp, skipErrorEvent, ...requestOptions } = options;
  const send = async (): Promise<Response> =>
    fetch(`/api/v1${path}`, {
      ...requestOptions,
      method,
      headers,
      credentials: 'include',
      body: body === undefined ? undefined : isFormData ? body as FormData : JSON.stringify(body),
    });

  let response = await send();
  let payload = await responseValue(response);

  if (
    response.status === 428 &&
    !skipStepUp &&
    isFinanceStepUpPath(path) &&
    handlers.onStepUpRequired
  ) {
    const verified = await handlers.onStepUpRequired();
    if (verified) {
      response = await send();
      payload = await responseValue(response);
    }
  }

  if (!response.ok) {
    const error = parseApiError(payload, response.status);
    if (response.status === 401) handlers.onUnauthorized?.();
    if (!skipErrorEvent) {
      window.dispatchEvent(new CustomEvent<ApiError>('api:error', { detail: error }));
    }
    throw error;
  }

  return payload as T;
}
