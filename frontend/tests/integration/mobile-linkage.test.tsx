import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../../src/app/App';
import { AppProviders, queryClient } from '../../src/app/providers';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../../src/shared/auth/AuthProvider';
import { CustomerStatementPage } from '../../src/features/customers/CustomerStatementPage';
import { resetMobileApiAccess } from '../../src/features/mobile/MobileApiAccess';
import { sessionStore } from '../../src/shared/auth/sessionStore';
import { ar } from '../../src/shared/i18n/ar';
import { server } from '../server';

const mobilePermissions = ['mobile.use', 'mobile.messages.view', 'mobile.messages.record', 'mobile.channels.view', 'mobile.channels.manage'];
const loginResponse = { data: { access_token: 'a'.repeat(64), token_type: 'Bearer', expires_at: '2026-10-15T00:00:00Z', device: { id: 51, name: 'ERP web linkage', model: 'Browser' } } };
const mobileMe = { data: { user: { id: 1, username: 'owner', display_name: 'Owner', permissions: mobilePermissions }, device: { id: 51, name: 'ERP web linkage', model: 'Browser' } } };
const channels = { data: [{ id: 4, name: 'E2E Vodafone', type: 'wallet', number: '01000000000', sender_filter: 'Vodafone', deposit_keywords: ['deposit'], withdrawal_keywords: ['withdraw'], deposit_enabled: true, withdrawal_enabled: true, paused: false, balance: '125.50' }], meta: { current_page: 1, last_page: 1, per_page: 100, total: 1 } };
const messages = { data: [{ id: 31, channel_id: 4, direction: 'WITHDRAWAL', amount: '10.25', sender: 'Vodafone', received_at: '2026-10-13T12:30:00Z', status: 'RECORDED', recorded_as: 'EXPENSE', recorded_ref_id: 77 }], meta: { current_page: 1, last_page: 1, per_page: 100, total: 1 } };

function renderAt(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><AppProviders><App /></AppProviders></MemoryRouter>);
}
function owner() {
  sessionStore.setUser({ id: 1, username: 'owner', name: 'Owner', role: 'owner', permissions: ['*'] });
  server.use(http.get('/api/v1/auth/me', () => HttpResponse.json({ id: 1, username: 'owner', name: 'Owner', role: 'owner', permissions: ['*'] })));
  server.use(
    http.post('/api/v1/mobile/auth/login', () => HttpResponse.json(loginResponse, { status: 201 })),
    http.get('/api/v1/mobile/auth/me', () => HttpResponse.json(mobileMe)),
  );
}
async function connectMobile() {
  let password = screen.queryByLabelText('كلمة المرور');
  if (!password) {
    const connect = await screen.findByRole('button', { name: 'ربط بيانات الهاتف' }).catch(() => null);
    if (connect) await userEvent.setup().click(connect);
    password = await screen.findByLabelText('كلمة المرور').catch(() => null);
  }
  if (!password) return;
  const user = userEvent.setup();
  await user.type(password, 'synthetic-test-password');
  await user.click(screen.getByRole('button', { name: 'ربط بيانات الهاتف' }));
}
function treasuryHandlers(entryStatus = 200, entryPayload = { data: [{ id: 901, treasury_account_id: 9, direction: 'out', entry_date: '2026-10-13', amount_egp: '10.25', description: 'Mobile withdrawal', reference: 'mobile-captured:31', source_type: 'expense', source_id: 77 }], meta: { current_page: 1, per_page: 10, total: 1, last_page: 1 } }) {
  server.use(
    http.get('/api/v1/treasury/accounts', () => HttpResponse.json({ data: [{ id: 9, code: 'MPC-9', name: 'Vodafone', account_type: 'cash', notes: null, is_active: true }], meta: { current_page: 1, per_page: 10, total: 1, last_page: 1 } })),
    http.get('/api/v1/treasury/accounts/9/balance', () => HttpResponse.json({ data: { balance_egp: '125.50' } })),
    http.get('/api/v1/treasury/entries', () => HttpResponse.json(entryPayload, { status: entryStatus })),
    http.get('/api/v1/mobile/messages', () => HttpResponse.json(messages)),
  );
}

beforeEach(() => { queryClient.clear(); sessionStore.clear(); resetMobileApiAccess(); });

describe('mobile capture inbox linkage', () => {
  it('shows captured message channel, amount, and server status', async () => {
    owner();
    server.use(http.get('/api/v1/mobile/messages', () => HttpResponse.json(messages)), http.get('/api/v1/mobile/channels', () => HttpResponse.json(channels)));
    renderAt('/finance/mobile-inbox');
    await connectMobile();
    expect(await screen.findByRole('heading', { name: ar.nav.mobileInbox })).toBeVisible();
    expect(screen.getByText('E2E Vodafone')).toBeVisible();
    expect(screen.getByText('مسجل في المالية')).toBeVisible();
  });
  it('resolves an ambiguous message and records its deposit against the selected customer', async () => {
    owner();
    const message = {
      id: 51, channel_id: 4, direction: 'NEEDS_REVIEW', amount: '12.00', raw_text: 'Wallet transfer 12.00 EGP',
      sender: 'Vodafone', received_at: '2026-10-13T12:30:00Z', status: 'NEEDS_REVIEW', recorded_as: null,
      recorded_ref_id: null, archived_at: null,
    };
    let status = 'NEEDS_REVIEW';
    server.use(
      http.get('/api/v1/mobile/messages', () => HttpResponse.json({
        data: [{ ...message, status, direction: status === 'RECORDED' ? 'DEPOSIT' : message.direction }],
        meta: { current_page: 1, last_page: 1, per_page: 50, total: 1 },
      })),
      http.get('/api/v1/mobile/channels', () => HttpResponse.json(channels)),
      http.get('/api/v1/customers', () => HttpResponse.json({
        data: [{ id: 92, name: 'Test customer', phone: '01000000000', is_active: true }],
        meta: { current_page: 1, last_page: 1, per_page: 100, total: 1 },
      })),
      http.post('/api/v1/mobile/messages/51/resolve-direction', async ({ request }) => {
        expect(request.headers.get('Idempotency-Key')).toBeTruthy();
        const body = await request.json() as { direction: string; amount: string };
        expect(body).toEqual({ direction: 'DEPOSIT', amount: '12.00' });
        return HttpResponse.json({ data: { ...message, direction: 'DEPOSIT', status: 'NEW' } });
      }),
      http.post('/api/v1/mobile/messages/51/record-deposit', async ({ request }) => {
        expect(request.headers.get('Idempotency-Key')).toBeTruthy();
        expect(await request.json()).toEqual({ customer_id: 92 });
        status = 'RECORDED';
        return HttpResponse.json({ data: { id: 51, status: 'RECORDED', recorded_as: 'CUSTOMER_COLLECTION', recorded_ref_id: 715 } }, { status: 201 });
      }),
    );
    renderAt('/finance/mobile-inbox');
    await connectMobile();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'مراجعة وتسجيل' }));
    await user.selectOptions(screen.getByLabelText('نوع العملية'), 'DEPOSIT');
    await screen.findByRole('option', { name: /Test customer/ });
    await user.selectOptions(screen.getByLabelText('العميل'), '92');
    await user.click(screen.getByRole('button', { name: 'تسجيل الحركة المالية' }));
    expect(await screen.findByText('تم تسجيل الرسالة وربطها بالحركة المالية.')).toBeVisible();
    expect(status).toBe('RECORDED');
  });
  it('shows a 403 from the mobile messages endpoint', async () => {
    owner();
    server.use(http.get('/api/v1/mobile/messages', () => HttpResponse.json({ error: { code: 'FORBIDDEN', details: {} } }, { status: 403 })), http.get('/api/v1/mobile/channels', () => HttpResponse.json(channels)));
    renderAt('/finance/mobile-inbox');
    await connectMobile();
    expect(await screen.findByText('ليست لديك صلاحية عرض رسائل الهاتف.')).toBeVisible();
  });
  it('shows error.details from a 422 message-list response', async () => {
    owner();
    server.use(http.get('/api/v1/mobile/messages', () => HttpResponse.json({ error: { code: 'VALIDATION_FAILED', details: { per_page: ['Unsupported page size'] } } }, { status: 422 })), http.get('/api/v1/mobile/channels', () => HttpResponse.json(channels)));
    renderAt('/finance/mobile-inbox');
    await connectMobile();
    expect((await screen.findAllByRole('alert')).some((alert) => /[\u0600-\u06FF]/u.test(alert.textContent ?? ''))).toBe(true);
  });
});

describe('mobile channels linkage', () => {
  it('lists channels and pauses then resumes through PATCH', async () => {
    owner();
    let paused = false;
    server.use(
      http.get('/api/v1/mobile/channels', () => HttpResponse.json({ ...channels, data: channels.data.map((channel) => ({ ...channel, paused })) })),
      http.post('/api/v1/mobile/auth/confirm-password', () => HttpResponse.json({ data: { confirmed: true } })),
      http.patch('/api/v1/mobile/channels/4', async ({ request }) => { const body = await request.json() as { paused: boolean }; paused = body.paused; return HttpResponse.json({ data: { ...channels.data[0], paused } }); }),
    );
    renderAt('/finance/mobile-channels');
    await connectMobile();
    expect(await screen.findByText('E2E Vodafone')).toBeVisible();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'إيقاف مؤقت' }));
    const pauseDialog = await screen.findByRole('dialog', { name: 'إيقاف القناة مؤقتاً' });
    await user.type(within(pauseDialog).getByLabelText('كلمة المرور للتأكيد'), 'synthetic-test-password');
    await user.click(within(pauseDialog).getByRole('button', { name: 'تأكيد الإجراء' }));
    expect(await screen.findByRole('status')).toHaveTextContent('تم إيقاف القناة مؤقتاً.');
    await user.click(screen.getByRole('button', { name: 'استئناف' }));
    const resumeDialog = await screen.findByRole('dialog', { name: 'استئناف القناة' });
    await user.type(within(resumeDialog).getByLabelText('كلمة المرور للتأكيد'), 'synthetic-test-password');
    await user.click(within(resumeDialog).getByRole('button', { name: 'تأكيد الإجراء' }));
    expect(await screen.findByRole('status')).toHaveTextContent('تم استئناف القناة.');
    expect(paused).toBe(false);
  });
  it('edits a payment channel after password confirmation', async () => {
    owner();
    server.use(
      http.get('/api/v1/mobile/channels', () => HttpResponse.json(channels)),
      http.post('/api/v1/mobile/auth/confirm-password', () => HttpResponse.json({ data: { confirmed: true } })),
      http.patch('/api/v1/mobile/channels/4', async ({ request }) => {
        expect(request.headers.get('Idempotency-Key')).toBeTruthy();
        const body = await request.json() as { name: string; deposit_keywords: string[] };
        expect(body.name).toBe('Updated wallet');
        expect(body.deposit_keywords).toEqual(['received', 'deposit']);
        return HttpResponse.json({ data: { ...channels.data[0], ...body } });
      }),
    );
    renderAt('/finance/mobile-channels');
    await connectMobile();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'تعديل' }));
    const dialog = await screen.findByRole('dialog', { name: 'تعديل قناة الدفع' });
    const name = within(dialog).getByLabelText('الاسم');
    await user.clear(name);
    await user.type(name, 'Updated wallet');
    const keywords = within(dialog).getByLabelText('كلمات مفتاحية للإيداع (افصل بينها بفواصل)');
    await user.clear(keywords);
    await user.type(keywords, 'received, deposit');
    await user.type(within(dialog).getByLabelText('كلمة المرور للتأكيد'), 'synthetic-test-password');
    await user.click(within(dialog).getByRole('button', { name: 'حفظ التعديلات' }));
    expect(await screen.findByRole('status')).toHaveTextContent('تم تحديث القناة Updated wallet.');
  });
  it('creates a channel with step-up and an idempotency key', async () => {
    owner();
    server.use(http.get('/api/v1/mobile/channels', () => HttpResponse.json(channels)), http.post('/api/v1/mobile/auth/confirm-password', () => HttpResponse.json({ data: { confirmed: true } })), http.post('/api/v1/mobile/channels', async ({ request }) => { expect(request.headers.get('Idempotency-Key')).toBeTruthy(); const body = await request.json() as { name: string; type: string; deposit_keywords: string[] }; expect(body.type).toBe('wallet'); expect(body.deposit_keywords).toEqual(['deposit']); return HttpResponse.json({ data: channels.data[0] }, { status: 201 }); }));
    renderAt('/finance/mobile-channels');
    await connectMobile();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('الاسم'), 'New wallet');
    await user.type(screen.getByLabelText('الرقم'), '01000000001');
    await user.type(screen.getByLabelText('مرشح المرسل'), 'Wallet SMS');
    await user.type(screen.getByLabelText('كلمات مفتاحية للإيداع (افصل بينها بفواصل)'), 'deposit');
    await user.type(screen.getByLabelText('أكد كلمة المرور لإضافة القناة'), 'synthetic-test-password');
    await user.click(screen.getByRole('button', { name: 'إضافة القناة' }));
    expect(await screen.findByRole('status')).toHaveTextContent('تم حفظ القناة E2E Vodafone.');
  });
  it('shows 403 from channel list', async () => {
    owner();
    server.use(http.get('/api/v1/mobile/channels', () => HttpResponse.json({ error: { code: 'FORBIDDEN', details: {} } }, { status: 403 })));
    renderAt('/finance/mobile-channels');
    await connectMobile();
    expect(await screen.findByText('ليست لديك صلاحية عرض قنوات الهاتف.')).toBeVisible();
  });
  it('shows channel create error.details on 422', async () => {
    owner();
    server.use(http.get('/api/v1/mobile/channels', () => HttpResponse.json(channels)), http.post('/api/v1/mobile/auth/confirm-password', () => HttpResponse.json({ data: { confirmed: true } })), http.post('/api/v1/mobile/channels', () => HttpResponse.json({ error: { code: 'VALIDATION_FAILED', details: { sender_filter: ['Sender is required'] } } }, { status: 422 })));
    renderAt('/finance/mobile-channels');
    await connectMobile();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('الاسم'), 'New wallet');
    await user.type(screen.getByLabelText('الرقم'), '01000000001');
    await user.type(screen.getByLabelText('مرشح المرسل'), 'Wallet SMS');
    await user.type(screen.getByLabelText('كلمات مفتاحية للإيداع (افصل بينها بفواصل)'), 'deposit');
    await user.type(screen.getByLabelText('أكد كلمة المرور لإضافة القناة'), 'synthetic-test-password');
    await user.click(screen.getByRole('button', { name: 'إضافة القناة' }));
    expect((await screen.findAllByRole('alert')).some((alert) => /[\u0600-\u06FF]/u.test(alert.textContent ?? ''))).toBe(true);
  });
});

describe.each([
  ['/finance/withdrawals', 'out'],
  ['/finance/movements', 'all'],
] as const)('%s mobile source linkage', (path) => {
  it('marks a ledger entry linked to a recorded mobile message', async () => {
    owner(); treasuryHandlers();
    renderAt(path);
    await connectMobile();
    expect((await screen.findAllByText('الهاتف')).length).toBeGreaterThan(0);
  });
  it('marks a mobile withdrawal drawer-transfer leg as phone sourced', async () => {
    owner(); treasuryHandlers();
    const transferMessages = {
      ...messages,
      data: messages.data.map((message) => ({ ...message, recorded_as: 'TREASURY_TRANSFER' })),
    };
    const transferEntry = {
      data: [{ id: 902, treasury_account_id: 9, direction: 'out', entry_date: '2026-10-16', amount_egp: '1.25', description: 'Mobile drawer transfer', reference: 'mobile-captured:31', source_type: 'treasury_transfer_outflow', source_id: 77 }],
      meta: { current_page: 1, per_page: 10, total: 1, last_page: 1 },
    };
    server.use(
      http.get('/api/v1/treasury/entries', () => HttpResponse.json(transferEntry)),
      http.get('/api/v1/mobile/messages', () => HttpResponse.json(transferMessages)),
    );
    renderAt(path);
    await connectMobile();
    expect((await screen.findAllByText('الهاتف')).length).toBeGreaterThan(0);
  });
  it('shows 403 from treasury entries', async () => {
    owner(); treasuryHandlers(403, { error: { code: 'FORBIDDEN', details: {} } });
    renderAt(path);
    await connectMobile();
    await waitFor(() => expect(document.querySelector('main')?.textContent).not.toContain('Loading'));
    expect(document.querySelector('main')?.textContent).toContain(ar.common.permissionDenied);
  });
  it('shows error.details from a 422 treasury list response', async () => {
    owner(); treasuryHandlers(422, { error: { code: 'VALIDATION_FAILED', details: { direction: ['Unsupported direction filter'] } } });
    renderAt(path);
    await connectMobile();
    expect((await screen.findAllByRole('alert')).some((alert) => /[\u0600-\u06FF]/u.test(alert.textContent ?? ''))).toBe(true);
  });
});

describe('customer statement mobile provenance', () => {
  function renderStatement() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(<MemoryRouter initialEntries={['/customers/102/statement']}><QueryClientProvider client={client}><AuthProvider><Routes><Route path="/customers/:customerId/statement" element={<CustomerStatementPage />} /></Routes></AuthProvider></QueryClientProvider></MemoryRouter>);
  }
  it('marks an app-recorded collection as MOBILE from the statement API', async () => {
    owner();
    server.use(http.get('/api/v1/reports/customers/102/statement', () => HttpResponse.json({ customer: { id: 102 }, summary: { current_balance_egp: '10.25', unallocated_collections_egp: '10.25' }, data: [{ id: 1, document_type: 'collection', reference: 'RC-MOBILE', document_date: '2026-10-13', description: 'mobile deposit', debit_egp: '0.00', credit_egp: '10.25', unallocated_egp: '10.25', recording_source: 'sms' }], meta: { current_page: 1, last_page: 1, per_page: 10, total: 1 } })));
    renderStatement();
    expect((await screen.findAllByText('الهاتف')).length).toBeGreaterThan(0);
  });
  it('shows 403 on customer statement', async () => {
    owner();
    server.use(http.get('/api/v1/reports/customers/102/statement', () => HttpResponse.json({ error: { code: 'FORBIDDEN', details: {} } }, { status: 403 })));
    renderStatement();
    expect((await screen.findAllByText(ar.common.permissionDenied)).length).toBeGreaterThan(0);
  });
  it('shows error.details on customer statement 422', async () => {
    owner();
    server.use(http.get('/api/v1/reports/customers/102/statement', () => HttpResponse.json({ error: { code: 'VALIDATION_FAILED', details: { from_date: ['Invalid statement date'] } } }, { status: 422 })));
    renderStatement();
    expect((await screen.findAllByRole('alert')).some((alert) => /[\u0600-\u06FF]/u.test(alert.textContent ?? ''))).toBe(true);
  });
});
