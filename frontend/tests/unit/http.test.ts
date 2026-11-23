import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiRequest, configureHttpHandlers } from '../../src/shared/api/http';

describe('API client request policy', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.cookie = 'XSRF-TOKEN=; Max-Age=0; path=/';
  });

  it('sends credentials, CSRF, request and idempotency identifiers and reuses identifiers after step-up', async () => {
    document.cookie = 'XSRF-TOKEN=csrf%2Bvalue; path=/';
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { code: 'STEP_UP_REQUIRED' } }), {
          status: 428,
          headers: { 'content-type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ saved: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);
    const removeHandlers = configureHttpHandlers({
      onStepUpRequired: async () => true,
    });

    try {
      await expect(
        apiRequest<{ saved: boolean }>('/expenses', {
          method: 'POST',
          body: { amount: '12.50' },
        }),
      ).resolves.toEqual({ saved: true });
    } finally {
      removeHandlers();
    }

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const first = fetchMock.mock.calls[0][1];
    const retry = fetchMock.mock.calls[1][1];
    const firstHeaders = new Headers(first?.headers);
    const retryHeaders = new Headers(retry?.headers);
    expect(first?.credentials).toBe('include');
    expect(firstHeaders.get('Content-Type')).toBe('application/json');
    expect(firstHeaders.get('Idempotency-Key')).toBeTruthy();
    expect(firstHeaders.get('X-CSRF-Token')).toBe('csrf+value');
    expect(firstHeaders.get('X-Request-ID')).toBeTruthy();
    expect(retryHeaders.get('Idempotency-Key')).toBe(firstHeaders.get('Idempotency-Key'));
    expect(retryHeaders.get('X-Request-ID')).toBe(firstHeaders.get('X-Request-ID'));
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/expenses');
    expect(fetchMock.mock.calls[1][0]).toBe('/api/v1/expenses');
  });

  it('does not request a password again when a non-finance route unexpectedly returns 428', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { code: 'STEP_UP_REQUIRED' } }), {
        status: 428,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const onStepUpRequired = vi.fn(async () => true);
    vi.stubGlobal('fetch', fetchMock);
    const removeHandlers = configureHttpHandlers({ onStepUpRequired });

    try {
      await expect(apiRequest('/inventory/adjustments', { method: 'GET' }))
        .rejects.toMatchObject({ status: 428 });
    } finally {
      removeHandlers();
    }

    expect(onStepUpRequired).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reauthenticates before posting a customer opening balance', async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { code: 'STEP_UP_REQUIRED' } }), {
        status: 428,
        headers: { 'content-type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { id: 117 } }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      }));
    const onStepUpRequired = vi.fn(async () => true);
    vi.stubGlobal('fetch', fetchMock);
    const removeHandlers = configureHttpHandlers({ onStepUpRequired });

    try {
      await expect(apiRequest('/customers/99/opening-balance', { method: 'POST', body: { amount_egp: '12.50' } }))
        .resolves.toEqual({ data: { id: 117 } });
    } finally {
      removeHandlers();
    }

    expect(onStepUpRequired).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
