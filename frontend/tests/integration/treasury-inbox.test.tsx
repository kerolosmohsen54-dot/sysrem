import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/app/App';
import { AppProviders, queryClient } from '../../src/app/providers';
import { sessionStore } from '../../src/shared/auth/sessionStore';
import { ar } from '../../src/shared/i18n/ar';
import { formatMoney } from '../../src/shared/utils/format';
import { server } from '../server';

function renderInbox() {
  return render(
    <MemoryRouter initialEntries={['/finance/inbox']}>
      <AppProviders><App /></AppProviders>
    </MemoryRouter>,
  );
}

function owner() {
  sessionStore.setUser({
    id: 1, username: 'owner', name: 'Owner', role: 'owner', permissions: ['*'],
  });
  server.use(http.get('/api/v1/auth/me', () => HttpResponse.json({
    id: 1, username: 'owner', name: 'Owner', role: 'owner', permissions: ['*'],
  })),
  http.post('/api/v1/mobile/auth/login', () => HttpResponse.json({ data: { access_token: 'a'.repeat(64) } }, { status: 201 })),
  http.get('/api/v1/mobile/auth/me', () => HttpResponse.json({ data: { user: { id: 1, username: 'owner', display_name: 'Owner', permissions: ['mobile.use', 'mobile.messages.view'] } } })));
}

function accountHandlers() {
  server.use(
    http.get('/api/v1/treasury/accounts', () => HttpResponse.json({
      data: [{ id: 901, code: 'CASH', name: 'Main cash', account_type: 'cash', notes: null, is_active: true }],
      meta: { current_page: 1, per_page: 10, total: 1, last_page: 1 },
    })),
    http.get('/api/v1/treasury/accounts/901/balance', () => HttpResponse.json({ data: { balance_egp: '18.25' } })),
  );
}

describe('treasury inbox live integration', () => {
  it('loads only incoming entries from the real treasury endpoint', async () => {
    queryClient.clear();
    owner();
    accountHandlers();
    server.use(http.get('/api/v1/treasury/entries', ({ request }) => {
      expect(new URL(request.url).searchParams.get('direction')).toBe('in');
      return HttpResponse.json({
        data: [{ id: 1, treasury_account_id: 901, entry_number: 'TE-E2E-01', entry_type: 'manual', direction: 'in', entry_date: '2026-10-13', amount_egp: '18.25', description: 'Deposit', source_type: 'sales_receipt', source_id: 88 }],
        meta: { current_page: 1, per_page: 10, total: 1, last_page: 1 },
      });
    }),
    http.get('/api/v1/mobile/messages', () => HttpResponse.json({ data: [{ id: 31, channel_id: 4, direction: 'DEPOSIT', amount: '18.25', sender: 'Wallet', received_at: '2026-10-13T12:30:00Z', status: 'RECORDED', recorded_as: 'CUSTOMER_COLLECTION', recorded_ref_id: 88 }], meta: { current_page: 1, last_page: 1, per_page: 100, total: 1 } })),
  );

    renderInbox();
    const connect = await screen.findByRole('button', { name: 'ربط بيانات الهاتف' });
    await userEvent.setup().click(connect);
    await userEvent.setup().type(await screen.findByLabelText('كلمة المرور'), 'synthetic-test-password');
    await userEvent.setup().click(screen.getByRole('button', { name: 'ربط بيانات الهاتف' }));
    expect(await screen.findByRole('heading', { name: 'الصندوق الوارد' })).toBeVisible();
    expect((await screen.findAllByText('Deposit')).length).toBeGreaterThan(0);
    expect(screen.getAllByText(formatMoney('18.25'))).not.toHaveLength(0);
    expect((await screen.findAllByText(ar.finance.treasuryEntries)).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('الهاتف')).length).toBeGreaterThan(0);
  });

  it('shows a clear no-permission state when the API returns 403', async () => {
    queryClient.clear();
    owner();
    accountHandlers();
    server.use(http.get('/api/v1/treasury/entries', () => HttpResponse.json(
      { error: { code: 'FORBIDDEN', details: {} } }, { status: 403 },
    )));

    renderInbox();
    await waitFor(() => expect(document.querySelector('main')?.textContent).not.toContain(ar.app.loading));
    expect(document.querySelector('main')?.textContent).toContain(ar.common.permissionDenied);
  });

  it('shows field validation from error.details after a rejected deposit', async () => {
    queryClient.clear();
    owner();
    accountHandlers();
    server.use(
      http.get('/api/v1/treasury/entries', () => HttpResponse.json({ data: [], meta: { current_page: 1, per_page: 10, total: 0, last_page: 1 } })),
      http.post('/api/v1/treasury/entries', () => HttpResponse.json(
        { error: { code: 'VALIDATION_FAILED', details: { amount_egp: ['Invalid amount from API'] } } },
        { status: 422 },
      )),
    );

    const user = userEvent.setup();
    renderInbox();
    await screen.findByRole('heading', { name: 'الصندوق الوارد' });
    fireEvent.change(document.querySelector('input[name="entry_date"]') as HTMLInputElement, { target: { value: '2026-10-13' } });
    fireEvent.change(document.querySelector('input[name="amount_egp"]') as HTMLInputElement, { target: { value: '9.50' } });
    fireEvent.change(document.querySelector('input[name="description"]') as HTMLInputElement, { target: { value: 'Deposit' } });
    await user.selectOptions(document.querySelector('select[name="treasury_account_id"]') as HTMLSelectElement, '901');
    await user.click(screen.getByRole('button', { name: ar.finance.postEntry }));

    expect((await screen.findAllByRole('alert')).some((alert) => /[\u0600-\u06FF]/u.test(alert.textContent ?? ''))).toBe(true);
  });
});
