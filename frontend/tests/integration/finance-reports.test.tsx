import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/app/App';
import { AppProviders } from '../../src/app/providers';
import { ar } from '../../src/shared/i18n/ar';
import { server } from '../server';
import { sessionStore } from '../../src/shared/auth/sessionStore';

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

function authenticateOwner() {
  sessionStore.setUser({ id: 1, username: 'owner-demo', name: 'Owner', role: 'owner', permissions: ['*'] });
  server.use(
    http.get('/api/v1/auth/me', () =>
      HttpResponse.json({
        id: 1,
        username: 'owner-demo',
        name: 'مالك النظام',
        role: 'owner',
        permissions: ['*'],
      }),
    ),
  );
}

describe('finance and reports screens', () => {
  it('organizes finance tasks and renders only figures returned by the server', async () => {
    authenticateOwner();
    server.use(http.get('/api/v1/reports/dashboard', () => HttpResponse.json({
      data: {
        today_sales_egp: '120.00',
        receivables_egp: '85.50',
        treasury_balances: [{ account_id: 1, code: 'CASH', name: 'الخزينة الرئيسية', balance_egp: '40.00' }],
      },
      meta: { as_of: '2026-10-29T00:00:00Z' },
    })));

    renderApp('/finance');

    expect(await screen.findByRole('heading', { level: 1, name: ar.nav.finance })).toBeVisible();
    expect(screen.getAllByRole('link', { name: /الصندوق الوارد/ })
      .some((link) => link.getAttribute('href') === '/finance/inbox')).toBe(true);
    expect(screen.getAllByRole('link', { name: /فواتير الشراء/ })
      .some((link) => link.getAttribute('href') === '/purchase-invoices')).toBe(true);
    expect(await screen.findByText('120.00 ج.م')).toBeVisible();
    expect(screen.getByText('85.50 ج.م')).toBeVisible();
    expect(screen.getByText('40.00 ج.م')).toBeVisible();
    expect(screen.getByText('الأموال المنتظرة')).toBeVisible();
  });

  it('routes to treasury and posts a server-owned decimal-string entry', async () => {
    authenticateOwner();
    const user = userEvent.setup();
    renderApp('/finance/treasury');

    expect(
      await screen.findByRole('heading', { level: 1, name: ar.finance.treasuryAccounts }),
    ).toBeVisible();
    const selects = await screen.findAllByRole('combobox');
    await user.selectOptions(selects[1], '901');
    await user.selectOptions(selects[2], 'in');
    await user.type(screen.getByLabelText(/تاريخ الحركة/), '2026-10-12');
    await user.type(screen.getByLabelText(/المبلغ/), '18.25');
    const descriptions = screen.getAllByLabelText(/الوصف/);
    await user.type(descriptions[descriptions.length - 1], 'إيداع تجريبي');
    await user.click(screen.getByRole('button', { name: ar.finance.postEntry }));

    expect(await screen.findByRole('status')).toHaveTextContent(ar.common.actionSaved);
    expect(await screen.findAllByText('إيداع تجريبي')).not.toHaveLength(0);
  });

  it('routes finance transfers and expenses to their screens', async () => {
    authenticateOwner();
    const transferView = renderApp('/finance/transfers');
    expect(await screen.findByRole('heading', { name: ar.finance.transfers })).toBeVisible();
    transferView.unmount();

    renderApp('/finance/expenses');
    expect(await screen.findByRole('heading', { name: ar.finance.expenses })).toBeVisible();
  });

  it('renders seeded sales, stock, and customer-balance reports through the app routes', async () => {
    authenticateOwner();
    const salesView = renderApp('/reports/sales');
    expect(await screen.findByRole('heading', { level: 1, name: ar.reports.sales })).toBeVisible();
    expect(await screen.findAllByText('INV-2026-1041')).not.toHaveLength(0);
    salesView.unmount();

    const stockView = renderApp('/reports/stock');
    expect(await screen.findByRole('heading', { name: ar.reports.stock })).toBeVisible();
    expect(await screen.findAllByText('فلتر زيت تويوتا')).not.toHaveLength(0);
    stockView.unmount();

    renderApp('/reports/customer-balances');
    expect(await screen.findByRole('heading', { name: ar.reports.customerBalances })).toBeVisible();
    expect(await screen.findAllByText(ar.reports.unallocatedCollections)).not.toHaveLength(0);
  });

  it('renders profit distribution totals and the reconciliation result from the API', async () => {
    authenticateOwner();
    server.use(http.get('/api/v1/reports/profit-distribution', () => HttpResponse.json({
      data: {
        invoices: [{
          id: 42,
          invoice_number: 'INV-PROFIT-42',
          issue_date: '2026-10-16',
          customer_name: 'عميل تجريبي',
          issuer_type: 'partner',
          issuer_name: 'كراس',
          sale_revenue_egp: '650.00',
          cogs_egp: '500.00',
          surplus_egp: '150.00',
          partner_profit_egp: '150.00',
          company_profit_egp: '0.00',
          total_profit_egp: '150.00',
          pricing_status: 'priced',
        }],
        containers: [{
          container_number: 'CONT-42',
          invoice_count: 1,
          sale_revenue_egp: '650.00',
          cogs_egp: '500.00',
          profit_egp: '150.00',
          cost_snapshot_complete: true,
        }],
        totals: {
          sale_revenue_egp: '650.00',
          cogs_egp: '500.00',
          partner_profit_egp: '150.00',
          company_profit_egp: '0.00',
          total_profit_egp: '150.00',
          reconciliation_difference_egp: '0.00',
          unpriced_invoice_count: 0,
        },
      },
      meta: { formula_status: 'complete', formula: 'صافي البيع − التكلفة', from_date: null, to_date: null },
    })));

    renderApp('/reports/profit-distribution');
    expect(await screen.findByRole('heading', { name: ar.reports.profitDistribution })).toBeVisible();
    expect(await screen.findAllByText('150.00 ج.م')).not.toHaveLength(0);
    expect(screen.getAllByText('0.00 ج.م').length).toBeGreaterThan(0);
    expect(screen.getAllByText('INV-PROFIT-42').length).toBeGreaterThan(0);
    expect(screen.getAllByText('CONT-42').length).toBeGreaterThan(0);
  });

  it('searches and paginates invoice profitability results from the server', async () => {
    authenticateOwner();
    const requests: URL[] = [];
    const rowsFor = (page: number) => Array.from({ length: page === 1 ? 10 : 1 }, (_, index) => {
      const id = (page - 1) * 10 + index + 1;
      return { id, document_number: `INV-PROFIT-${id}`, customer_name: 'Profit customer', issue_date: '2026-10-16', revenue_excluding_tax_egp: '100.00', cost_egp: '60.00', profit_egp: '40.00', markup_percent: '66.67', cost_snapshot_complete: true, formula_status: 'PROVISIONAL' };
    });
    server.use(http.get('/api/v1/reports/invoice-profit', ({ request }) => {
      const url = new URL(request.url);
      requests.push(url);
      const page = Number(url.searchParams.get('page') ?? '1');
      return HttpResponse.json({ data: rowsFor(page), meta: { current_page: page, per_page: 10, total: 11, last_page: 2, formula_status: 'PROVISIONAL' } });
    }));

    const user = userEvent.setup();
    renderApp('/reports/invoice-profit');
    expect(await screen.findAllByText('INV-PROFIT-1')).not.toHaveLength(0);
    await user.type(screen.getByRole('searchbox', { name: ar.common.search }), 'Needle');
    await waitFor(() => expect(requests.at(-1)?.searchParams.get('search')).toBe('Needle'));
    await user.click(screen.getByRole('button', { name: ar.common.next }));
    expect(await screen.findAllByText('INV-PROFIT-11')).not.toHaveLength(0);
    expect(requests.at(-1)?.searchParams.get('page')).toBe('2');
    expect(requests.at(-1)?.searchParams.get('search')).toBe('Needle');
    expect(within(screen.getByRole('navigation', { name: ar.inventory.paginationLabel })).getByText(`${ar.common.page} 2 ${ar.common.of} 2`)).toBeVisible();
  });

  it('keeps the sales grouping preset and sends search text to the backend', async () => {
    authenticateOwner();
    const requests: URL[] = [];
    server.use(http.get('/api/v1/reports/sales', ({ request }) => {
      requests.push(new URL(request.url));
      return HttpResponse.json({
        data: [],
        meta: { current_page: 1, per_page: 50, total: 0, last_page: 1 },
        summary: {
          total_sales_egp: '0.00', invoice_count: 0, average_invoice_value_egp: '0.00',
          total_discounts_egp: '0.00', top_employee_name: null, employees: [], group_by: 'employee', groups: [],
        },
      });
    }));

    const user = userEvent.setup();
    renderApp('/reports/sales?group_by=employee');
    await screen.findByRole('heading', { level: 1, name: ar.reports.sales });
    await user.type(screen.getByRole('searchbox', { name: ar.common.search }), 'Needle');
    await waitFor(() => {
      expect(requests.at(-1)?.searchParams.get('search')).toBe('Needle');
      expect(requests.at(-1)?.searchParams.get('group_by')).toBe('employee');
    });
  });

  it('sends customer balance and stock searches to their report endpoints', async () => {
    authenticateOwner();
    const customerRequests: URL[] = [];
    const stockRequests: URL[] = [];
    server.use(
      http.get('/api/v1/reports/customer-balances', ({ request }) => {
        customerRequests.push(new URL(request.url));
        return HttpResponse.json({ data: [], meta: { current_page: 1, per_page: 10, total: 0, last_page: 1 } });
      }),
      http.get('/api/v1/reports/stock', ({ request }) => {
        stockRequests.push(new URL(request.url));
        return HttpResponse.json({ data: [], meta: { current_page: 1, per_page: 10, total: 0, last_page: 1 }, summary: {
          balance_rows: 0, current_quantity: '0', current_stock_value_egp: '0.00', inventory_turnover: '0.00', stale_stock_count: 0, below_minimum_count: 0,
        } });
      }),
      http.get('/api/v1/warehouses', () => HttpResponse.json({ data: [], meta: { current_page: 1, per_page: 100, total: 0, last_page: 1 } })),
      http.get('/api/v1/categories', () => HttpResponse.json({ data: [], meta: { current_page: 1, per_page: 100, total: 0, last_page: 1 } })),
    );

    const user = userEvent.setup();
    const customers = renderApp('/reports/customer-balances');
    await screen.findByRole('heading', { level: 1, name: ar.reports.customerBalances });
    await user.type(screen.getByRole('searchbox', { name: ar.common.search }), 'Customer needle');
    await waitFor(() => expect(customerRequests.at(-1)?.searchParams.get('search')).toBe('Customer needle'));
    customers.unmount();

    renderApp('/reports/stock');
    await screen.findByRole('heading', { level: 1, name: ar.reports.stock });
    await user.type(screen.getByRole('searchbox', { name: ar.common.search }), 'Stock needle');
    await waitFor(() => expect(stockRequests.at(-1)?.searchParams.get('search')).toBe('Stock needle'));
  });

  it('filters container cost summaries by the selected backend status', async () => {
    authenticateOwner();
    const requests: URL[] = [];
    server.use(http.get('/api/v1/reports/container-costs', ({ request }) => {
      requests.push(new URL(request.url));
      return HttpResponse.json({ data: [{
        container: { id: 42, container_number: 'CONT-42', status: 'received', origin: null, destination: null },
        total_cost_egp: '25.00', paid_egp: '10.00', unpaid_egp: '15.00', allocated_to_inventory_egp: '20.00',
        costs: [{ id: 5, cost_type: 'customs', description: 'Customs inspection', status: 'paid', amount_egp: '25.00' }],
      }], meta: { current_page: 1, per_page: 10, total: 1, last_page: 1 } });
    }));

    const user = userEvent.setup();
    renderApp('/reports/container-costs');
    expect(await screen.findByRole('heading', { name: ar.reports.containerCosts })).toBeVisible();
    await user.selectOptions(screen.getByRole('combobox', { name: 'حالة بند التكلفة' }), 'paid');
    await waitFor(() => expect(requests.at(-1)?.searchParams.get('status')).toBe('paid'));
    expect(await screen.findAllByText('CONT-42')).not.toHaveLength(0);
    expect(screen.getAllByText(/Customs inspection/)).not.toHaveLength(0);
    expect(screen.getAllByText('20.00 ج.م')).not.toHaveLength(0);
  });

  it('renders dashboard analytics and timestamps returned by the backend', async () => {
    authenticateOwner();
    server.use(http.get('/api/v1/reports/dashboard', () => HttpResponse.json({
      data: {
        today_sales_egp: '200.00',
        sales_total_egp: '200.00',
        collections_total_egp: '50.00',
        expenses_total_egp: '20.00',
        net_profit_egp: '30.00',
        stock_count: '8',
        stock_value_egp: '400.00',
        low_stock_count: 1,
        pending_orders_count: 2,
        receivables_egp: '150.00',
        cash_balance_egp: '55.00',
        sales_trend: [{ date: '2026-10-15', sales_egp: '200.00' }],
        low_stock: [{ product_id: 1, product_name: 'Widget', sku: 'W1', warehouse_name: 'Main', quantity_on_hand: '1', minimum_quantity: '2' }],
        recent_activity: [{ movement_id: 1, reference: 'MOV-1', movement_type: 'receipt', movement_date: '2026-10-15', description: 'Widget', quantity: '5', user_name: 'Owner' }],
      },
      meta: { as_of: '2026-10-15T00:00:00Z' },
    })));
    renderApp('/dashboard');
    expect(await screen.findByText('إجمالي المبيعات')).toBeVisible();
    expect(await screen.findAllByText('200.00 ج.م')).not.toHaveLength(0);
    expect(await screen.findByText('50.00 ج.م')).toBeVisible();
    expect(await screen.findByText('20.00 ج.م')).toBeVisible();
    expect(await screen.findByText('30.00 ج.م')).toBeVisible();
    expect(screen.getByText('150.00 ج.م')).toBeVisible();
    expect(screen.getAllByText('55.00 ج.م').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'مسار المبيعات' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'منتجات المخزون المنخفض' })).toBeVisible();
    expect(screen.getByRole('heading', { name: ar.reports.dashboardRecentActivity })).toBeVisible();
    expect(screen.getAllByText('MOV-1').length).toBeGreaterThan(0);
  });
});
