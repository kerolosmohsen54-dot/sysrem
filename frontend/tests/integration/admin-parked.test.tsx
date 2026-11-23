import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app/App';
import { AppProviders } from '../../src/app/providers';
import { ar } from '../../src/shared/i18n/ar';
import { displayRole } from '../../src/shared/utils/labels';
import { formatMoney } from '../../src/shared/utils/format';
import { server } from '../server';

function renderApp(path: string) {
  return render(
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      initialEntries={[path]}
    >
      <AppProviders>
        <App />
      </AppProviders>
    </MemoryRouter>,
  );
}

function authenticateOwner(permissions = ['*']) {
  server.use(
    http.get('/api/v1/auth/me', () =>
      HttpResponse.json({
        id: 1,
        username: 'owner-demo',
        name: 'مالك النظام',
        role: 'owner',
        permissions,
      }),
    ),
  );
}

describe('admin and parked screens', () => {
  it('renders backend role objects with localized role names', async () => {
    authenticateOwner();
    server.use(
      http.get('/api/v1/users', () =>
        HttpResponse.json({
          data: [{ id: 7, username: 'role-check', display_name: 'Role check', phone: null, email: null, is_active: true, roles: [{ code: 'admin', name: 'Administrator' }], permissions: [] }],
          meta: { current_page: 1, per_page: 10, total: 1, last_page: 1, active_user_count: 1, max_active_users: 10 },
        }),
      ),
    );

    renderApp('/admin/users');
    expect(await screen.findByRole('heading', { level: 1, name: ar.nav.users })).toBeVisible();
    expect((await screen.findAllByText('role-check')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(displayRole('admin'))).length).toBeGreaterThan(0);
  });

  it('loads sales-tax settings and updates them through the API', async () => {
    authenticateOwner();
    const user = userEvent.setup();
    renderApp('/admin/settings');

    expect(await screen.findByRole('heading', { level: 1, name: ar.nav.settings })).toBeVisible();
    expect(document.querySelector<HTMLInputElement>('#max-active-users')).toHaveValue(10);
    await user.type(screen.getByLabelText(ar.admin.companyName), 'شركة اختبارية');
    const accountLimit = document.querySelector<HTMLInputElement>('#max-active-users')!;
    await user.clear(accountLimit);
    await user.type(accountLimit, '12');
    await user.click(screen.getByRole('button', { name: ar.admin.saveGeneralSettings }));
    const statuses = await screen.findAllByRole('status');
    expect(statuses.at(-1)).toHaveTextContent(ar.common.actionSaved);
    expect(document.querySelector<HTMLInputElement>('#max-active-users')).toHaveValue(12);

    const enabled = await screen.findByRole('checkbox', { name: ar.admin.taxEnabled });
    expect(enabled).not.toBeChecked();
    await user.click(enabled);
    await user.type(screen.getByLabelText(/نسبة الضريبة/), '14.25');
    await user.selectOptions(screen.getByRole('combobox'), 'exclusive');
    await user.click(screen.getByRole('button', { name: ar.common.save }));

    const savedStatuses = await screen.findAllByRole('status');
    expect(savedStatuses.at(-1)).toHaveTextContent(ar.common.actionSaved);
  });

  it('shows only settings sections authorized by the current role', async () => {
    authenticateOwner(['sales_tax.manage']);
    const taxView = renderApp('/admin/settings');
    expect(await screen.findByLabelText(ar.admin.taxEnabled)).toBeVisible();
    expect(screen.queryByLabelText(ar.admin.companyName)).not.toBeInTheDocument();
    taxView.unmount();

    authenticateOwner(['users.manage']);
    renderApp('/admin/settings');
    expect(await screen.findByLabelText(ar.admin.companyName)).toBeVisible();
    expect(screen.queryByLabelText(ar.admin.taxEnabled)).not.toBeInTheDocument();
  });

  it('shows owner-only audit data and supports user administration', async () => {
    authenticateOwner();
    const auditView = renderApp('/admin/audit');
    expect(await screen.findByRole('heading', { level: 1, name: ar.nav.audit })).toBeVisible();
    expect(await screen.findByText(ar.common.noResults)).toBeVisible();
    expect(screen.getByLabelText(ar.admin.auditUserId)).toBeVisible();
    auditView.unmount();

    const user = userEvent.setup();
    renderApp('/admin/users');
    expect(await screen.findByRole('heading', { level: 1, name: ar.nav.users })).toBeVisible();
    expect(await screen.findAllByText('owner-demo')).not.toHaveLength(0);

    const editButtons = screen.getAllByRole('button', { name: ar.common.edit });
    await user.click(editButtons[editButtons.length - 1]);
    await screen.findByRole('dialog', { name: ar.admin.editUser });
    const displayName = document.querySelector<HTMLInputElement>('[name="display_name"]');
    expect(displayName).not.toBeNull();
    await user.clear(displayName!);
    await user.type(displayName!, 'مالك محدث');
    await user.click(screen.getByRole('button', { name: ar.common.save }));
    expect(await screen.findAllByText('مالك محدث')).not.toHaveLength(0);

    await user.click(screen.getByRole('button', { name: ar.admin.addUser }));
    const username = `warehouse-test-${Date.now()}`;
    await user.type(screen.getByLabelText(ar.auth.username, { exact: false }), username);
    await user.type(screen.getByLabelText(ar.admin.displayName, { exact: false }), 'مستخدم مخزن تجريبي');
    await user.type(
      screen.getByLabelText(ar.admin.userPassword, { exact: false }),
      'local-test-only-12',
    );
    await user.type(
      screen.getByLabelText(ar.admin.confirmPassword, { exact: false }),
      'local-test-only-12',
    );
    await user.selectOptions(screen.getByLabelText(ar.admin.roleCodes, { exact: false }), 'warehouse');
    await user.click(screen.getByRole('button', { name: ar.common.save }));
    expect(await screen.findAllByText(username)).not.toHaveLength(0);

    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const createdUserCell = screen.getAllByText(username).find((element) => element.closest('tr'));
    const createdUserRow = createdUserCell?.closest('tr');
    expect(createdUserRow).not.toBeNull();
    await user.click(within(createdUserRow!).getByRole('button', { name: 'حذف الحساب' }));
    expect(confirm).toHaveBeenCalledOnce();
    const updatedUserCell = (await screen.findAllByText(username)).find((element) => element.closest('tr'));
    expect(updatedUserCell?.closest('tr')).not.toBeNull();
    expect(within(updatedUserCell!.closest('tr')!).getByText(ar.common.inactive)).toBeVisible();
    confirm.mockRestore();
  }, 15000);

  it('keeps admin and audit search and sort values in the API query', async () => {
    authenticateOwner();
    const user = userEvent.setup();
    const userRequests: URL[] = [];
    server.use(
      http.get('/api/v1/users', ({ request }) => {
        userRequests.push(new URL(request.url));
        return HttpResponse.json({
          data: [],
          meta: { current_page: 1, per_page: 10, total: 0, last_page: 1, active_user_count: 0, max_active_users: 10 },
        });
      }),
      http.get('/api/v1/roles', () => HttpResponse.json({ data: [] })),
    );
    const usersView = renderApp('/admin/users');
    await screen.findByRole('heading', { level: 1, name: ar.nav.users });
    const userSearch = screen.getByRole('searchbox', { name: ar.common.search });
    await user.type(userSearch, 'sam');
    await waitFor(() => expect(userSearch).toHaveValue('sam'));
    await waitFor(() => expect(userRequests.some((request) => request.searchParams.get('search') === 'sam'), JSON.stringify(userRequests.map((request) => request.href))).toBe(true));
    usersView.unmount();

    const auditRequests: URL[] = [];
    server.use(http.get('/api/v1/audit-logs', ({ request }) => {
      auditRequests.push(new URL(request.url));
      return HttpResponse.json({ data: [], meta: { current_page: 1, per_page: 10, total: 0, last_page: 1 } });
    }));
    renderApp('/admin/audit');
    await screen.findByRole('heading', { level: 1, name: ar.nav.audit });
    await user.type(screen.getByRole('searchbox', { name: ar.common.search }), 'receipt');
    await user.selectOptions(screen.getByRole('combobox', { name: ar.inventory.sortDirection }), 'asc');
    await user.type(screen.getByLabelText('الإجراء'), 'update');
    await waitFor(() => {
      expect(auditRequests.some((request) =>
        request.searchParams.get('search') === 'receipt'
        && request.searchParams.get('sort_direction') === 'asc'
        && request.searchParams.get('action') === 'update',
      )).toBe(true);
    });
  });

  it('opens route search with the keyboard and navigates to the permitted users screen', async () => {
    authenticateOwner();
    server.use(http.get('/api/v1/search', () => HttpResponse.json({ data: [] })));
    const user = userEvent.setup();
    renderApp('/dashboard');

    const searchTrigger = await screen.findByRole('button', { name: ar.app.globalSearch });
    await user.keyboard('{Control>}k{/Control}');
    await screen.findByRole('dialog', { name: ar.app.globalSearch });
    await user.keyboard('{Escape}');
    await user.click(searchTrigger);
    const dialog = await screen.findByRole('dialog', { name: ar.app.globalSearch });
    await user.type(screen.getByRole('searchbox', { name: ar.app.searchRoutes }), ar.nav.users);
    await user.click(within(dialog).getByRole('link', { name: ar.nav.users }));

    expect(await screen.findByRole('heading', { level: 1, name: ar.nav.users })).toBeVisible();
    expect(dialog).not.toBeInTheDocument();
    expect(searchTrigger).toHaveFocus();
  });

  it('shows permission-appropriate quick actions and opens invoice creation', async () => {
    authenticateOwner();
    const user = userEvent.setup();
    renderApp('/dashboard');

    await user.click(await screen.findByText(ar.app.quickActions));
    const actions = screen.getByRole('navigation', { name: ar.app.quickActions });
    expect(within(actions).getByRole('link', { name: ar.app.createInvoice })).toHaveAttribute(
      'href',
      '/invoices/new',
    );
    expect(within(actions).getByRole('link', { name: ar.app.createOrder })).toHaveAttribute(
      'href',
      '/orders/new',
    );
    await user.click(within(actions).getByRole('link', { name: ar.app.createInvoice }));

    expect(await screen.findByRole('heading', { name: ar.sales.invoiceCreateTitle })).toBeVisible();
  });

  it('opens invoice creation with the N shortcut when the user is not typing', async () => {
    authenticateOwner();
    const user = userEvent.setup();
    renderApp('/dashboard');

    await screen.findByRole('heading', { level: 1, name: ar.nav.dashboard });
    await user.keyboard('n');

    expect(await screen.findByRole('heading', { name: ar.sales.invoiceCreateTitle })).toBeVisible();
  });

  it('opens the live chart, financial statements, currencies, and damaged stock screens', async () => {
    authenticateOwner();
    const chartView = renderApp('/finance/chart-of-accounts');
    server.use(http.get('/api/v1/accounting/accounts', () => HttpResponse.json({
      data: [{
        id: 1, parent_account_id: null, code: '1000', name: 'الأصول', description: null,
        account_type: 'asset', normal_balance: 'debit', is_control_account: true, is_active: true,
        balance_egp: '0.00', total_debit: '0.00', total_credit: '0.00', has_posted_entries: false,
        posting_allowed: false, children: [],
      }],
      meta: { account_count: 1, currency: 'EGP' },
    })));
    expect(await screen.findByRole('heading', { level: 1, name: ar.finance.chartOfAccounts })).toBeVisible();
    expect(await screen.findByText('1000')).toBeVisible();
    chartView.unmount();

    const currenciesView = renderApp('/finance/currencies');
    expect(await screen.findByRole('heading', { name: 'إضافة عملة مرجعية' })).toBeVisible();
    currenciesView.unmount();

    server.use(http.get('/api/v1/accounting/statements', () => HttpResponse.json({
      data: {
        period: { from_date: '2026-10-01', to_date: '2026-10-31' },
        income_statement: {
          total_revenue: '25.50', total_expenses: '5.00', net_income: '20.50',
          revenues: [{ id: 4, code: '4000', name: 'Sales revenue', amount: '25.50' }], expenses: [],
        },
        balance_sheet: {
          total_assets: '20.50', total_liabilities: '0.00', equity_accounts_total: '0.00',
          accumulated_income: '20.50', total_equity: '20.50', difference: '0.00', is_balanced: true,
          assets: [], liabilities: [], equity: [],
        },
        cash_flow: {
          opening_balance: '0.00', inflows: '7.00', outflows: '0.00', net_cash_flow: '7.00',
          closing_balance: '7.00', accounts: [{ treasury_account_id: 1, name: 'Cash', opening_balance: '0.00', period_debit: '7.00', period_credit: '0.00', closing_balance: '7.00' }],
        },
      },
    })));
    const reportView = renderApp('/reports');
    const sidebar = await screen.findByRole('navigation', { name: ar.app.name });
    const financialReportLink = within(sidebar).getByRole('link', { name: ar.finance.financialReport });
    expect(financialReportLink).toHaveAttribute('href', '/reports/financial');
    expect(financialReportLink).not.toHaveAttribute('aria-disabled', 'true');
    await userEvent.setup().click(financialReportLink);
    expect(await screen.findByRole('heading', { level: 1, name: ar.finance.financialReport })).toBeVisible();
    expect(await screen.findAllByText('Sales revenue')).not.toHaveLength(0);
    expect(await screen.findAllByText(formatMoney('25.50'))).not.toHaveLength(0);
    expect(screen.getByRole('tab', { name: 'قائمة الدخل' })).toHaveAttribute('aria-selected', 'true');
    reportView.unmount();

    renderApp('/inventory/damaged');
    expect(await screen.findByRole('heading', { level: 1, name: 'المخزون التالف المعتمد' })).toBeVisible();
  });
});
