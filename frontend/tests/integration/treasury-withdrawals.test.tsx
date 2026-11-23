import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/app/App';
import { AppProviders, queryClient } from '../../src/app/providers';
import { sessionStore } from '../../src/shared/auth/sessionStore';
import { ar } from '../../src/shared/i18n/ar';
import { server } from '../server';

function renderWithdrawals() {
  return render(
    <MemoryRouter initialEntries={['/finance/withdrawals']}>
      <AppProviders><App /></AppProviders>
    </MemoryRouter>,
  );
}

function owner() {
  sessionStore.setUser({ id: 1, username: 'owner', name: 'Owner', role: 'owner', permissions: ['*'] });
  server.use(http.get('/api/v1/auth/me', () => HttpResponse.json({
    id: 1, username: 'owner', name: 'Owner', role: 'owner', permissions: ['*'],
  })));
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

describe('treasury withdrawals live integration', () => {
  it('loads only outgoing entries from the real treasury endpoint', async () => {
    queryClient.clear();
    owner();
    accountHandlers();
    server.use(http.get('/api/v1/treasury/entries', ({ request }) => {
      expect(new URL(request.url).searchParams.get('direction')).toBe('out');
      return HttpResponse.json({
        data: [{ id: 2, treasury_account_id: 901, direction: 'out', entry_date: '2026-10-13', amount_egp: '18.25', description: 'Withdrawal', reference: null }],
        meta: { current_page: 1, per_page: 10, total: 1, last_page: 1 },
      });
    }));

    renderWithdrawals();
    expect(await screen.findByRole('heading', { name: 'السحب' })).toBeVisible();
    expect((await screen.findAllByText('Withdrawal')).length).toBeGreaterThan(0);
  });

  it('shows a clear no-permission state when the API returns 403', async () => {
    queryClient.clear();
    owner();
    accountHandlers();
    server.use(http.get('/api/v1/treasury/entries', () => HttpResponse.json(
      { error: { code: 'FORBIDDEN', details: {} } }, { status: 403 },
    )));

    renderWithdrawals();
    expect((await screen.findAllByText(ar.common.permissionDenied)).length).toBeGreaterThan(0);
  });

  it('shows field validation from error.details after a rejected withdrawal', async () => {
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
    renderWithdrawals();
    await screen.findByRole('heading', { name: 'السحب' });
    fireEvent.change(document.querySelector('input[name="entry_date"]') as HTMLInputElement, { target: { value: '2026-10-13' } });
    fireEvent.change(document.querySelector('input[name="amount_egp"]') as HTMLInputElement, { target: { value: '9.50' } });
    fireEvent.change(document.querySelector('input[name="description"]') as HTMLInputElement, { target: { value: 'Withdrawal' } });
    await user.selectOptions(document.querySelector('select[name="treasury_account_id"]') as HTMLSelectElement, '901');
    await user.click(screen.getByRole('button', { name: ar.finance.postEntry }));

    expect((await screen.findAllByRole('alert')).some((alert) => /[\u0600-\u06FF]/u.test(alert.textContent ?? ''))).toBe(true);
  });
});
