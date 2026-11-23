import { ApiError } from '../src/api/http';
import { createQueueAwareApi, logFailedOutboxDiagnostics, MemoryOutboxStore, pullMobileSync, replayOutbox } from '../src/offline/outbox';

function rawApi(post: jest.Mock, patch = jest.fn(), get = jest.fn()) {
  return { post, patch, get } as any;
}

describe('durable write outbox', () => {
  test('stores offline operation then replays it once with the same idempotency key', async () => {
    const store = new MemoryOutboxStore();
    const post = jest.fn().mockResolvedValue({ data: { id: 44 } });
    const api = createQueueAwareApi(rawApi(post), store, () => false);
    await expect(api.post('/mobile/manual-deposits', { amount: '12.30' }, 'manual-44')).rejects.toMatchObject({ status: 0, details: { outbox_status: 'PENDING' } });
    expect(store.rows).toHaveLength(1);
    expect(store.rows[0].payload).toEqual({ amount: '12.30' });
    expect(await replayOutbox(rawApi(post), store)).toBe(1);
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith('/mobile/manual-deposits', { amount: '12.30' }, 'manual-44');
    expect(store.rows[0].status).toBe('DONE');
  });

  test('queues captured message writes through the same persistence path', async () => {
    const store = new MemoryOutboxStore();
    const post = jest.fn();
    const api = createQueueAwareApi(rawApi(post), store, () => false);
    await expect(api.post('/mobile/messages/capture', { channel_id: 2, amount: '8.25' }, 'dedupe-hash')).rejects.toMatchObject({ details: { outbox_status: 'PENDING' } });
    expect(store.rows[0]).toMatchObject({ path: '/mobile/messages/capture', idempotencyKey: 'dedupe-hash', payload: { channel_id: 2, amount: '8.25' } });
    expect(post).not.toHaveBeenCalled();
  });

  test('retained operation replays after store reconstruction and 409 becomes success', async () => {
    const store = new MemoryOutboxStore();
    await store.enqueue({ operationType: 'record-deposit', method: 'POST', path: '/mobile/messages/5/record-deposit', payload: { customer_id: 7 }, idempotencyKey: 'message-5' });
    const restoredStore = store;
    const post = jest.fn().mockRejectedValue(new ApiError(409, 'Already recorded'));
    await replayOutbox(rawApi(post), restoredStore);
    expect(post).toHaveBeenCalledTimes(1);
    expect(restoredStore.rows[0].status).toBe('DONE');
  });

  test('keeps 422 details editable and stops at 401 while preserving later work', async () => {
    const store = new MemoryOutboxStore();
    const first = await store.enqueue({ operationType: 'manual-deposit', method: 'POST', path: '/mobile/manual-deposits', payload: { amount: '1.00' }, idempotencyKey: 'first' });
    const second = await store.enqueue({ operationType: 'record-deposit', method: 'POST', path: '/mobile/messages/9/record-deposit', payload: { customer_id: 3 }, idempotencyKey: 'second' });
    const post = jest.fn().mockRejectedValueOnce(new ApiError(422, 'Invalid', { amount: ['invalid'] }));
    await replayOutbox(rawApi(post), store);
    expect(store.rows[0]).toMatchObject({ status: 'FAILED', lastError: { status: 422, details: { amount: ['invalid'] } } });
    await store.retry(first.id, { amount: '1.25' });
    expect(store.rows[0]).toMatchObject({ status: 'PENDING', payload: { amount: '1.25' }, attempts: 0 });
    await store.retry(second.id);
    const authPost = jest.fn().mockRejectedValue(new ApiError(401, 'Unauthenticated'));
    await replayOutbox(rawApi(authPost), store);
    expect(authPost).toHaveBeenCalledTimes(1);
    expect(store.rows.map(row => row.status)).toEqual(['PENDING', 'PENDING']);
  });

  test('persists the mobile sync cursor returned by the backend', async () => {
    const store = new MemoryOutboxStore();
    const get = jest.fn().mockResolvedValue({ data: { cursor: 18, has_more: false } });
    await pullMobileSync(rawApi(jest.fn(), jest.fn(), get), store);
    expect(get).toHaveBeenCalledWith('/mobile/sync?cursor=0&limit=500');
    expect(await store.getCursor()).toBe('18');
    expect(await store.getLastSyncAt()).toEqual(expect.any(Number));
  });

  test('retains the ERP account owner alongside the local queue', async () => {
    const store = new MemoryOutboxStore();
    await store.setOwner('manual_owner');
    await store.enqueue({ operationType: 'capture', method: 'POST', path: '/mobile/messages/capture', payload: { amount: '1.00' }, idempotencyKey: 'owner-key' });
    expect(await store.getOwner()).toBe('manual_owner');
    expect(await store.counts()).toMatchObject({ pending: 1, failed: 0 });
  });

  test('prints failed operation diagnostics without payloads or secrets', async () => {
    const store = new MemoryOutboxStore();
    const row = await store.enqueue({ operationType: 'POST mobile_messages', method: 'POST', path: '/mobile/messages/capture', payload: { password: 'never-log-this' }, idempotencyKey: 'safe-key-1' });
    await store.update(row.id, { status: 'FAILED', attempts: 3, lastError: { status: 422, details: { password: 'secret', message: 'Bearer hidden-token' } } });
    const lines: string[] = [];

    await logFailedOutboxDiagnostics(store, line => lines.push(line));

    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('ERP_OUTBOX_FAILED_DIAGNOSTIC');
    expect(lines[0]).toContain('safe-key-1');
    expect(lines[0]).toContain('"status":"FAILED"');
    expect(lines[0]).toContain('"attempts":3');
    expect(lines[0]).not.toContain('never-log-this');
    expect(lines[0]).not.toContain('hidden-token');
    expect(lines[0]).toContain('[محجوب]');
  });
});
