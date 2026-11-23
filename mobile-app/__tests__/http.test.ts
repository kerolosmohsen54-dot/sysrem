import { ApiError, createApiClient } from '../src/api/http';

describe('mobile API client', () => {
  const fetcher = jest.fn();
  const clear = jest.fn().mockResolvedValue(undefined);
  const client = createApiClient('https://erp.test/api/v1', async () => 'token-abc', clear, fetcher as any);
  beforeEach(() => { fetcher.mockReset(); clear.mockClear(); });

  it('sends bearer auth and returns a successful login payload', async () => {
    fetcher.mockResolvedValue({ ok: true, status: 200, json: async () => ({ data: { access_token: 'issued-token' } }) });
    const result = await client.post<any>('/mobile/auth/login', { username: 'owner', password: 'secret', device_name: 'test' }, 'login-1');
    expect(result.data.access_token).toBe('issued-token');
    expect(fetcher.mock.calls[0][1].headers.Authorization).toBe('Bearer token-abc');
    expect(fetcher.mock.calls[0][1].headers['Idempotency-Key']).toBe('login-1');
  });

  it('clears the stored token when the server returns 401', async () => {
    fetcher.mockResolvedValue({ ok: false, status: 401, json: async () => ({ message: 'Unauthenticated.' }) });
    await expect(client.get('/mobile/auth/me')).rejects.toMatchObject({ status: 401 });
    expect(clear).toHaveBeenCalledTimes(1);
  });

  it('exposes field validation from error.details on 422', async () => {
    fetcher.mockResolvedValue({ ok: false, status: 422, json: async () => ({ error: { details: { username: ['Required'] } } }) });
    await expect(client.post('/mobile/auth/login', {}, 'key-1')).rejects.toMatchObject({
      status: 422,
      details: { username: ['Required'] },
    });
  });

  it('reports a specific network failure without losing the request', async () => {
    fetcher.mockRejectedValue(new Error('offline'));
    await expect(client.get('/mobile/channels')).rejects.toBeInstanceOf(ApiError);
    await expect(client.get('/mobile/channels')).rejects.toMatchObject({ status: 0 });
  });
});