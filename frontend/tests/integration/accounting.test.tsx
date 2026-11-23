import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/app/App';
import { AppProviders, queryClient } from '../../src/app/providers';
import { sessionStore } from '../../src/shared/auth/sessionStore';
import { server } from '../server';

const owner = { id: 501, username: 'accounting-owner', name: 'Owner fixture', role: 'owner', permissions: ['*'] };
const accounts = [
  { id: 1, parent_account_id: null, code: '1000', name: 'Cash', description: null, account_type: 'asset', normal_balance: 'debit', is_control_account: false, is_active: true, balance_egp: '0.0000', total_debit: '0.0000', total_credit: '0.0000', has_posted_entries: false, posting_allowed: true, children: [] },
  { id: 2, parent_account_id: null, code: '3000', name: 'Equity', description: null, account_type: 'equity', normal_balance: 'credit', is_control_account: false, is_active: true, balance_egp: '0.0000', total_debit: '0.0000', total_credit: '0.0000', has_posted_entries: false, posting_allowed: true, children: [] },
];

function prepare(permissions: string[] = ['*']) {
  queryClient.clear();
  const user = { ...owner, permissions };
  sessionStore.setUser(user);
  server.use(http.get('/api/v1/auth/me', () => HttpResponse.json(user)));
}

function renderPath(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><AppProviders><App /></AppProviders></MemoryRouter>);
}

describe('accounting screens', () => {
  it('prevents an unbalanced draft, then sends balanced lines to the accounting API', async () => {
    prepare();
    let saved: Record<string, unknown> | null = null;
    server.use(
      http.get('/api/v1/accounting/accounts', () => HttpResponse.json({ data: accounts, meta: { account_count: 2, currency: 'EGP' } })),
      http.get('/api/v1/accounting/journals', () => HttpResponse.json({ data: [], meta: { current_page: 1, per_page: 20, total: 0, last_page: 1 } })),
      http.get('/api/v1/treasury/accounts', () => HttpResponse.json({ data: [], meta: { current_page: 1, per_page: 100, total: 0, last_page: 1 } })),
      http.post('/api/v1/accounting/journals', async ({ request }) => {
        saved = await request.json() as Record<string, unknown>;
        return HttpResponse.json({ data: { id: 77, entry_number: 'JE-FIXTURE-77' } }, { status: 201 });
      }),
      http.get('/api/v1/accounting/journals/77', () => HttpResponse.json({ data: {
        id: 77, entry_number: 'JE-FIXTURE-77', status: 'draft', entry_date: '2026-02-12', description: 'Fixture journal',
        source_type: null, source_id: null, reversal_of_entry_id: null, lines: [], total_debit: '25.0000', total_credit: '25.0000', is_balanced: true, difference: '0.0000',
      } })),
    );
    renderPath('/finance/journals');
    expect(await screen.findByRole('heading', { level: 1 })).toBeVisible();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'قيد جديد' }));
    expect(await screen.findByRole('dialog', { name: 'قيد يومية جديد' })).toBeVisible();
    const save = screen.getByRole('button', { name: 'حفظ كمسودة' });
    expect(save).toBeDisabled();
    await user.selectOptions(screen.getByLabelText('حساب السطر 1'), '1');
    await user.selectOptions(screen.getByLabelText('حساب السطر 2'), '2');
    await user.type(screen.getByLabelText('مدين السطر 1'), '25.00');
    await user.type(screen.getByLabelText('دائن السطر 2'), '20.00');
    expect(save).toBeDisabled();
    expect(screen.getByText(/الفرق/).parentElement).toHaveTextContent('5.0000');
    await user.clear(screen.getByLabelText('دائن السطر 2'));
    await user.type(screen.getByLabelText('دائن السطر 2'), '25.00');
    await user.type(screen.getByRole('textbox', { name: 'بيان القيد' }), 'Fixture journal');
    expect(save).toBeEnabled();
    await user.click(save);
    expect(await screen.findByRole('heading', { name: 'القيد JE-FIXTURE-77' })).toBeVisible();
    await waitFor(() => expect(saved).toMatchObject({ description: 'Fixture journal', lines: [
      { account_id: 1, debit_amount: '25.00', credit_amount: '0' },
      { account_id: 2, debit_amount: '0', credit_amount: '25.00' },
    ] }));
  }, 15000);

  it('shows the server trial-balance warning and keeps each account row visible', async () => {
    prepare(['accounting.reports.view']);
    server.use(http.get('/api/v1/accounting/trial-balance', () => HttpResponse.json({ data: {
      period: { from_date: '2026-02-01', to_date: '2026-02-28' },
      accounts: [{ id: 1, code: '1000', name: 'Cash', account_type: 'asset', opening_balance: '0.0000', period_debit: '9.0000', period_credit: '0.0000', closing_debit: '9.0000', closing_credit: '0.0000', posted_entry_count: 1 }],
      totals: { period_debit: '9.0000', period_credit: '0.0000', closing_debit: '9.0000', closing_credit: '0.0000', period_difference: '9.0000', difference: '9.0000', is_balanced: false },
    } })));
    renderPath('/finance/trial-balance');
    expect(await screen.findByRole('alert')).toHaveTextContent('غير متوازن');
    expect(screen.getAllByRole('link', { name: '1000' }).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Cash').length).toBeGreaterThan(0);
  });

  it('renders period based financial statements from the API for a reports-only accountant', async () => {
    prepare(['accounting.reports.view']);
    server.use(http.get('/api/v1/accounting/statements', () => HttpResponse.json({ data: {
      period: { from_date: '2026-02-01', to_date: '2026-02-28' },
      income_statement: { revenues: [{ id: 3, code: '4000', name: 'Sales', amount: '25.0000' }], expenses: [], total_revenue: '25.0000', total_expenses: '0.0000', net_income: '25.0000' },
      balance_sheet: { assets: [], liabilities: [], equity: [], total_assets: '125.0000', total_liabilities: '0.0000', equity_accounts_total: '100.0000', accumulated_income: '25.0000', total_equity: '125.0000', difference: '0.0000', is_balanced: true },
      cash_flow: { accounts: [], opening_balance: '100.0000', inflows: '25.0000', outflows: '0.0000', net_cash_flow: '25.0000', closing_balance: '125.0000' },
    } })));
    renderPath('/reports/financial');
    expect(await screen.findByRole('tab', { name: 'قائمة الدخل' })).toBeVisible();
    expect((await screen.findAllByText('Sales')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('25.0000 ج.م')).length).toBeGreaterThan(0);
    const user = userEvent.setup();
    await user.click(screen.getByRole('tab', { name: 'المركز المالي' }));
    expect((await screen.findAllByText('125.0000 ج.م')).length).toBeGreaterThan(0);
  });
});
