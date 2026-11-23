import { ApiError, newIdempotencyKey } from '../api/http';

export type OutboxStatus = 'PENDING' | 'SENDING' | 'DONE' | 'FAILED';
export type OutboxOperation = {
  id: number;
  operationType: string;
  method: 'POST' | 'PATCH';
  path: string;
  payload: unknown;
  idempotencyKey: string;
  status: OutboxStatus;
  attempts: number;
  lastError: Record<string, unknown> | null;
  createdAt: number;
  nextAttemptAt: number;
};

export interface OutboxStore {
  enqueue(input: Omit<OutboxOperation, 'id' | 'status' | 'attempts' | 'lastError' | 'createdAt' | 'nextAttemptAt'>): Promise<OutboxOperation>;
  listReplayable(now: number): Promise<OutboxOperation[]>;
  listFailed(): Promise<OutboxOperation[]>;
  update(id: number, patch: Partial<Pick<OutboxOperation, 'status' | 'attempts' | 'lastError' | 'nextAttemptAt'>>): Promise<void>;
  retry(id: number, payload?: unknown): Promise<void>;
  getCursor(): Promise<string>;
  setCursor(cursor: string): Promise<void>;
  getLastSyncAt(): Promise<number | null>;
  setLastSyncAt(timestamp: number): Promise<void>;
  getOwner(): Promise<string | null>;
  setOwner(owner: string): Promise<void>;
  counts(): Promise<{ pending: number; failed: number }>;
}

type SqliteDatabase = {
  executeAsync: (sql: string, params?: any[]) => Promise<{ rows?: { _array?: any[] } }>;
};

export class SqliteOutboxStore implements OutboxStore {
  private ready: Promise<void>;
  constructor(private db: SqliteDatabase) {
    this.ready = this.initialize();
  }
  private async initialize() {
    await this.db.executeAsync('CREATE TABLE IF NOT EXISTS outbox (id INTEGER PRIMARY KEY AUTOINCREMENT, operation_type TEXT NOT NULL, method TEXT NOT NULL, path TEXT NOT NULL, payload_json TEXT NOT NULL, idempotency_key TEXT NOT NULL UNIQUE, status TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, last_error_json TEXT, created_at INTEGER NOT NULL, next_attempt_at INTEGER NOT NULL DEFAULT 0)');
    await this.db.executeAsync('CREATE TABLE IF NOT EXISTS sync_state (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
    await this.db.executeAsync("UPDATE outbox SET status='PENDING' WHERE status='SENDING'");
  }
  private async query(sql: string, params?: unknown[]) { await this.ready; return this.db.executeAsync(sql, params); }
  async enqueue(input: Omit<OutboxOperation, 'id' | 'status' | 'attempts' | 'lastError' | 'createdAt' | 'nextAttemptAt'>) {
    const now = Date.now();
    await this.query("INSERT OR IGNORE INTO outbox(operation_type,method,path,payload_json,idempotency_key,status,created_at,next_attempt_at) VALUES(?,?,?,?,?,'PENDING',?,0)", [input.operationType, input.method, input.path, JSON.stringify(input.payload), input.idempotencyKey, now]);
    const result = await this.query('SELECT * FROM outbox WHERE idempotency_key=?', [input.idempotencyKey]);
    return this.decode(result.rows?._array?.[0]);
  }
  async listReplayable(now: number) {
    const result = await this.query("SELECT * FROM outbox WHERE status='PENDING' AND next_attempt_at<=? ORDER BY id ASC", [now]);
    return (result.rows?._array ?? []).map(row => this.decode(row));
  }
  async listFailed() {
    const result = await this.query("SELECT * FROM outbox WHERE status='FAILED' ORDER BY id ASC");
    return (result.rows?._array ?? []).map(row => this.decode(row));
  }
  async update(id: number, patch: Partial<Pick<OutboxOperation, 'status' | 'attempts' | 'lastError' | 'nextAttemptAt'>>) {
    const fields: string[] = []; const params: unknown[] = [];
    if (patch.status !== undefined) { fields.push('status=?'); params.push(patch.status); }
    if (patch.attempts !== undefined) { fields.push('attempts=?'); params.push(patch.attempts); }
    if (patch.lastError !== undefined) { fields.push('last_error_json=?'); params.push(patch.lastError === null ? null : JSON.stringify(patch.lastError)); }
    if (patch.nextAttemptAt !== undefined) { fields.push('next_attempt_at=?'); params.push(patch.nextAttemptAt); }
    if (fields.length) await this.query(`UPDATE outbox SET ${fields.join(',')} WHERE id=?`, [...params, id]);
  }
  async retry(id: number, payload?: unknown) {
    if (payload !== undefined) await this.query("UPDATE outbox SET payload_json=?,status='PENDING',attempts=0,last_error_json=NULL,next_attempt_at=0 WHERE id=?", [JSON.stringify(payload), id]);
    else await this.query("UPDATE outbox SET status='PENDING',attempts=0,last_error_json=NULL,next_attempt_at=0 WHERE id=?", [id]);
  }
  async getCursor() {
    const result = await this.query("SELECT value FROM sync_state WHERE key='mobile_sync_cursor'");
    return result.rows?._array?.[0]?.value ?? '0';
  }
  async setCursor(cursor: string) { await this.query("INSERT INTO sync_state(key,value) VALUES('mobile_sync_cursor',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", [cursor]); }
  async getLastSyncAt() { const result = await this.query("SELECT value FROM sync_state WHERE key='last_sync_at'"); const value = result.rows?._array?.[0]?.value; return value === undefined ? null : Number(value); }
  async setLastSyncAt(timestamp: number) { await this.query("INSERT INTO sync_state(key,value) VALUES('last_sync_at',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", [String(timestamp)]); }
  async getOwner() { const result = await this.query("SELECT value FROM sync_state WHERE key='outbox_owner'"); return result.rows?._array?.[0]?.value ?? null; }
  async setOwner(owner: string) { await this.query("INSERT INTO sync_state(key,value) VALUES('outbox_owner',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", [owner]); }
  async counts() {
    const result = await this.query("SELECT status,COUNT(*) AS count FROM outbox WHERE status IN ('PENDING','SENDING','FAILED') GROUP BY status");
    const counts = Object.fromEntries((result.rows?._array ?? []).map(row => [row.status, Number(row.count)]));
    return { pending: Number(counts.PENDING ?? 0) + Number(counts.SENDING ?? 0), failed: Number(counts.FAILED ?? 0) };
  }
  private decode(row: any): OutboxOperation {
    if (!row) throw new Error('تعذر العثور على العملية المحفوظة للمزامنة.');
    return { id: Number(row.id), operationType: row.operation_type, method: row.method, path: row.path, payload: JSON.parse(row.payload_json), idempotencyKey: row.idempotency_key, status: row.status, attempts: Number(row.attempts), lastError: row.last_error_json ? JSON.parse(row.last_error_json) : null, createdAt: Number(row.created_at), nextAttemptAt: Number(row.next_attempt_at) };
  }
}

export class MemoryOutboxStore implements OutboxStore {
  rows: OutboxOperation[] = []; cursor = '0';
  async enqueue(input: Omit<OutboxOperation, 'id' | 'status' | 'attempts' | 'lastError' | 'createdAt' | 'nextAttemptAt'>) {
    const existing = this.rows.find(row => row.idempotencyKey === input.idempotencyKey);
    if (existing) return existing;
    const row = { ...input, id: this.rows.length + 1, status: 'PENDING' as const, attempts: 0, lastError: null, createdAt: Date.now(), nextAttemptAt: 0 };
    this.rows.push(row); return row;
  }
  async listReplayable(now: number) { return this.rows.filter(row => row.status === 'PENDING' && row.nextAttemptAt <= now).sort((a, b) => a.id - b.id); }
  async listFailed() { return this.rows.filter(row => row.status === 'FAILED').sort((a, b) => a.id - b.id); }
  async update(id: number, patch: Partial<Pick<OutboxOperation, 'status' | 'attempts' | 'lastError' | 'nextAttemptAt'>>) { Object.assign(this.rows.find(row => row.id === id)!, patch); }
  async retry(id: number, payload?: unknown) { const row = this.rows.find(item => item.id === id)!; row.status = 'PENDING'; row.attempts = 0; row.lastError = null; row.nextAttemptAt = 0; if (payload !== undefined) row.payload = payload; }
  async getCursor() { return this.cursor; }
  async setCursor(cursor: string) { this.cursor = cursor; }
  lastSyncAt: number | null = null;
  async getLastSyncAt() { return this.lastSyncAt; }
  async setLastSyncAt(timestamp: number) { this.lastSyncAt = timestamp; }
  owner: string | null = null;
  async getOwner() { return this.owner; }
  async setOwner(owner: string) { this.owner = owner; }
  async counts() { return { pending: this.rows.filter(row => row.status === 'PENDING' || row.status === 'SENDING').length, failed: this.rows.filter(row => row.status === 'FAILED').length }; }
}

type RawApi = { get: <T>(path: string) => Promise<T>; post: <T>(path: string, body: unknown, key?: string) => Promise<T>; patch: <T>(path: string, body: unknown, key?: string) => Promise<T>; delete: <T>(path: string) => Promise<T> };

function redactDiagnosticValue(value: unknown, key = ''): unknown {
  if (/(token|password|secret|authorization|payload|raw.?text)/i.test(key)) return '[محجوب]';
  if (Array.isArray(value)) return value.map(item => redactDiagnosticValue(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([childKey, child]) => [childKey, redactDiagnosticValue(child, childKey)]));
  }
  if (typeof value === 'string') return value.replace(/\bBearer\s+[^\s,;]+/gi, 'Bearer [محجوب]');
  return value;
}

export async function logFailedOutboxDiagnostics(store: Pick<OutboxStore, 'listFailed'>, log: (line: string) => void = console.info): Promise<void> {
  const operations = await store.listFailed();
  if (operations.length === 0) {
    log('ERP_OUTBOX_FAILED_DIAGNOSTIC {"count":0}');
    return;
  }
  for (const operation of operations) {
    const diagnostic = {
      type: operation.operationType,
      idempotencyKey: operation.idempotencyKey,
      status: operation.status,
      attempts: operation.attempts,
      lastError: redactDiagnosticValue(operation.lastError),
    };
    log(`ERP_OUTBOX_FAILED_DIAGNOSTIC ${JSON.stringify(diagnostic)}`);
  }
}

const QUEUED_WRITE = /^(POST \/mobile\/channels|PATCH \/mobile\/channels\/\d+|POST \/mobile\/messages\/capture|POST \/mobile\/messages\/\d+\/record-deposit|POST \/mobile\/manual-deposits|POST \/mobile\/messages\/\d+\/record-withdrawal|POST \/mobile\/customers|POST \/mobile\/withdrawal-categories)$/;

export function createQueueAwareApi(raw: RawApi, store: OutboxStore, isOnline: () => boolean) {
  const write = async <T>(method: 'POST' | 'PATCH', path: string, body: unknown, key?: string): Promise<T> => {
    if (!QUEUED_WRITE.test(`${method} ${path}`)) return method === 'POST' ? raw.post<T>(path, body, key) : raw.patch<T>(path, body, key);
    const row = await store.enqueue({ operationType: `${method} ${path.split('/').slice(1, 3).join('_')}`, method, path, payload: body, idempotencyKey: key ?? newIdempotencyKey() });
    if (!isOnline()) throw new ApiError(0, 'تم الحفظ على الجهاز وستتم المزامنة عند عودة الاتصال.', { outbox_status: 'PENDING', outbox_id: row.id });
    try {
      const response = method === 'POST' ? await raw.post<T>(path, body, row.idempotencyKey) : await raw.patch<T>(path, body, row.idempotencyKey);
      await store.update(row.id, { status: 'DONE', lastError: null });
      return response;
    } catch (error) {
      if (error instanceof ApiError && (error.status === 409 || (error.status === 422 && (String(error.message).toLowerCase().includes('duplicate') || String(error.details.code ?? '').toLowerCase().includes('duplicate'))))) {
        await store.update(row.id, { status: 'DONE', lastError: null });
        throw error;
      }
      if (error instanceof ApiError && error.status === 422) await store.update(row.id, { status: 'FAILED', lastError: { status: error.status, details: error.details } });
      else await store.update(row.id, { status: 'PENDING', nextAttemptAt: Date.now() + 1000 });
      throw error;
    }
  };
  return { get: raw.get, post: <T>(path: string, body: unknown, key?: string) => write<T>('POST', path, body, key), patch: <T>(path: string, body: unknown, key?: string) => write<T>('PATCH', path, body, key), delete: raw.delete };
}

export async function replayOutbox(raw: RawApi, store: OutboxStore, now = Date.now()) {
  let completed = 0;
  for (const operation of await store.listReplayable(now)) {
    await store.update(operation.id, { status: 'SENDING', attempts: operation.attempts + 1 });
    try {
      if (operation.method === 'POST') await raw.post(operation.path, operation.payload, operation.idempotencyKey);
      else await raw.patch(operation.path, operation.payload, operation.idempotencyKey);
      await store.update(operation.id, { status: 'DONE', lastError: null }); completed++;
    } catch (error) {
      if (error instanceof ApiError && (error.status === 409 || (error.status === 422 && String(error.details.code ?? '').toLowerCase().includes('duplicate')))) {
        await store.update(operation.id, { status: 'DONE', lastError: null }); completed++; continue;
      }
      if (error instanceof ApiError && error.status === 422) {
        await store.update(operation.id, { status: 'FAILED', lastError: { status: error.status, details: error.details } }); continue;
      }
      if (error instanceof ApiError && error.status === 401) {
        await store.update(operation.id, { status: 'PENDING', lastError: { status: 401 } }); break;
      }
      const attempts = operation.attempts + 1;
      await store.update(operation.id, { status: 'PENDING', lastError: { message: error instanceof Error ? error.message : String(error) }, nextAttemptAt: Date.now() + Math.min(300_000, 1000 * 2 ** Math.min(attempts, 8)) });
      break;
    }
  }
  return completed;
}

export async function pullMobileSync(raw: RawApi, store: OutboxStore) {
  const cursor = await store.getCursor();
  const response: any = await raw.get(`/mobile/sync?cursor=${encodeURIComponent(cursor)}&limit=500`);
  const next = response?.data?.cursor ?? response?.meta?.next_cursor ?? response?.next_cursor ?? response?.data?.next_cursor;
  if (next !== undefined && next !== null) await store.setCursor(String(next));
  await store.setLastSyncAt(Date.now());
  return response;
}
