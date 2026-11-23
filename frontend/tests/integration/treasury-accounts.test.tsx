import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/app/App';
import { AppProviders, queryClient } from '../../src/app/providers';
import { sessionStore } from '../../src/shared/auth/sessionStore';
import { ar } from '../../src/shared/i18n/ar';
import { server } from '../server';

describe('treasury account management', () => {
  it('edits an account and deactivates it through the treasury API', async () => {
    queryClient.clear();
    sessionStore.setUser({ id: 1, username: 'owner', name: 'Owner', role: 'owner', permissions: ['*'] });
    server.use(
      http.get('/api/v1/auth/me', () => HttpResponse.json({ id: 1, username: 'owner', name: 'Owner', role: 'owner', permissions: ['*'] })),
      http.get('/api/v1/treasury/accounts', () => HttpResponse.json({
        data: [{ id: 901, code: 'CASH', name: 'Main cash', account_type: 'cash', notes: null, is_active: true }],
        meta: { current_page: 1, per_page: 100, total: 1, last_page: 1 },
      })),
      http.get('/api/v1/treasury/accounts/901/balance', () => HttpResponse.json({ data: { balance_egp: '18.25' } })),
      http.get('/api/v1/treasury/entries', () => HttpResponse.json({ data: [], meta: { current_page: 1, per_page: 10, total: 0, last_page: 1 } })),
      http.patch('/api/v1/treasury/accounts/901', async ({ request }) => {
        expect(await request.json()).toEqual({ code: 'CASH-1', name: 'Updated cash', account_type: 'bank', notes: 'Updated notes', is_active: false });
        return HttpResponse.json({ data: { id: 901, code: 'CASH-1', name: 'Updated cash', account_type: 'bank', notes: 'Updated notes', is_active: false } });
      }),
    );

    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={['/finance/treasury']}><AppProviders><App /></AppProviders></MemoryRouter>);
    await screen.findByRole('row', { name: /Main cash/ });
    await user.click(screen.getAllByRole('button', { name: 'تعديل' })[0]);
    const dialog = within(screen.getByRole('dialog'));
    await user.clear(dialog.getByRole('textbox', { name: ar.finance.accountCode }));
    await user.type(dialog.getByRole('textbox', { name: ar.finance.accountCode }), 'CASH-1');
    await user.clear(dialog.getByRole('textbox', { name: ar.finance.accountName }));
    await user.type(dialog.getByRole('textbox', { name: ar.finance.accountName }), 'Updated cash');
    await user.selectOptions(dialog.getByRole('combobox', { name: ar.finance.accountType }), 'bank');
    await user.type(dialog.getByRole('textbox', { name: ar.common.description }), 'Updated notes');
    await user.click(dialog.getByRole('checkbox', { name: 'الحساب نشط' }));
    await user.click(dialog.getByRole('button', { name: 'حفظ التعديلات' }));

    expect(await screen.findByText(ar.common.actionSaved)).toBeVisible();
  });
});
