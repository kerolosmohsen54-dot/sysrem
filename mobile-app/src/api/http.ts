export type ErrorDetails = Record<string, unknown>;

export class ApiError extends Error {
  status: number;
  details: ErrorDetails;

  constructor(status: number, message: string, details: ErrorDetails = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export type TokenProvider = () => Promise<string | null>;
export type TokenInvalidator = () => Promise<void>;

export function newIdempotencyKey(): string {
  return `erp-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export function createApiClient(
  baseUrl: string,
  tokenProvider: TokenProvider,
  tokenInvalidator: TokenInvalidator,
  fetcher: typeof fetch = fetch,
) {
  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
    idempotencyKey?: string,
  ): Promise<T> {
    const token = await tokenProvider();
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    if (method !== 'GET') headers['Idempotency-Key'] = idempotencyKey ?? newIdempotencyKey();

    let response: Response;
    try {
      response = await fetcher(`${baseUrl.replace(/\/$/, '')}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new ApiError(0, 'تعذر الاتصال بالخادم. تحقق من الشبكة وحاول مرة أخرى.');
    }

    let payload: any = {};
    try {
      payload = await response.json();
    } catch {
      payload = {};
    }

    if (response.status === 401) {
      await tokenInvalidator();
      throw new ApiError(401, payload.message ?? 'انتهت الجلسة. سجل الدخول مرة أخرى.', payload.error?.details ?? {});
    }
    if (!response.ok) {
      throw new ApiError(
        response.status,
        payload.message ?? 'تعذر إكمال الطلب.',
        payload.error?.details ?? payload.details ?? {},
      );
    }
    return payload as T;
  }

  return {
    get: <T>(path: string) => request<T>('GET', path),
    post: <T>(path: string, body: unknown, key?: string) => request<T>('POST', path, body, key),
    patch: <T>(path: string, body: unknown, key?: string) => request<T>('PATCH', path, body, key),
    delete: <T>(path: string) => request<T>('DELETE', path),
  };
}
