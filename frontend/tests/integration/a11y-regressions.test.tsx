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

function owner() {
  queryClient.clear();
  const user = { id: 1, username: 'owner', name: 'Owner', role: 'owner', permissions: ['*', 'users.view_self', 'invoices.create', 'treasury.view'] };
  sessionStore.setUser(user);
  server.use(http.get('/api/v1/auth/me', () => HttpResponse.json(user)));
}

function renderAt(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><AppProviders><App /></AppProviders></MemoryRouter>);
}

describe('accessibility regressions', () => {
  it('groups financial screens under clear section headings with descriptive links', async () => {
    owner();
    server.use(http.get('/api/v1/reports/dashboard', () => HttpResponse.json({
      data: {
        today_sales_egp: '0.00',
        receivables_egp: '0.00',
        treasury_balances: [{ account_id: 1, code: 'CASH', name: 'الصندوق الرئيسي', balance_egp: '0.00' }],
      },
      meta: { as_of: '2026-10-31T10:00:00Z' },
    })));
    renderAt('/finance');
    expect(await screen.findByRole('heading', { level: 1, name: ar.nav.finance })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'الصندوق والحسابات' })).toBeVisible();
    const treasuryLink = screen.getAllByRole('link').find((link) => link.getAttribute('href') === '/finance/treasury');
    expect(treasuryLink).toBeDefined();
  });

  it('opens the mobile menu while keeping primary navigation reachable', async () => {
    owner();
    renderAt('/dashboard');
    const toggle = await screen.findByRole('button', { name: ar.app.openMenu });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await userEvent.setup().click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const sidebar = within(await screen.findByRole('navigation', { name: ar.app.name }));
    const salesGroup = sidebar.getByText(ar.navGroups.sales).closest('summary');
    expect(salesGroup).not.toBeNull();
    if (!salesGroup!.parentElement!.hasAttribute('open')) await userEvent.setup().click(salesGroup!);
    expect(sidebar.getByRole('link', { name: ar.nav.dashboard })).toHaveAttribute('href', '/dashboard');
    expect(sidebar.getByRole('link', { name: ar.nav.orders })).toHaveAttribute('href', '/orders');
  });
});
