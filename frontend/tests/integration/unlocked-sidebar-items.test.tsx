import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/app/App';
import { AppProviders, queryClient } from '../../src/app/providers';
import { sessionStore } from '../../src/shared/auth/sessionStore';
import { ar } from '../../src/shared/i18n/ar';
import { server } from '../server';

const owner = {
  id: 1,
  username: 'owner',
  name: 'Owner',
  role: 'owner',
  permissions: ['*'],
};
const emptyPage = {
  data: [],
  meta: { current_page: 1, per_page: 50, total: 0, last_page: 1 },
};

const unlockedItems = [
  { label: ar.app.createInvoice, href: '/invoices/new', api: '/api/v1/customers' },
  { label: ar.app.createCustomer, href: '/customers', api: '/api/v1/customers' },
  { label: '\u062d\u0633\u0627\u0628 \u0627\u0644\u0639\u0645\u064a\u0644', href: '/reports/customer-balances', api: '/api/v1/reports/customer-balances' },
  { label: ar.nav.governorates, href: '/admin/governorates', api: '/api/v1/reference/governorates' },
  { label: '\u0625\u0636\u0627\u0641\u0629 \u0625\u0644\u0649 \u0627\u0644\u0645\u062e\u0632\u0648\u0646', href: '/inventory/opening-stock', api: '/api/v1/products' },
  { label: ar.nav.warehouseReturns, href: '/warehouse-returns', api: '/api/v1/warehouse-returns' },
  { label: ar.inventory.containerReceipt, href: '/containers', api: '/api/v1/containers' },
  { label: ar.inventory.landedCost, href: '/containers', api: '/api/v1/containers' },
  { label: ar.nav.containerPartners, href: '/finance/partner-installments', api: '/api/v1/partner-installment-plans' },
  { label: ar.reports.sales, href: '/reports/sales', api: '/api/v1/reports/sales' },
  { label: ar.reports.invoiceProfit, href: '/reports/invoice-profit', api: '/api/v1/reports/invoice-profit' },
  { label: ar.reports.stock, href: '/reports/stock', api: '/api/v1/reports/stock' },
  { label: ar.nav.settings, href: '/admin/settings', api: '/api/v1/settings/general' },
  { label: '\u062a\u062a\u0628\u0639 \u0627\u0644\u062d\u0627\u0648\u064a\u0627\u062a', href: '/containers', api: '/api/v1/containers' },
  { label: ar.nav.minimumStock, href: '/inventory/minimum-stock', api: '/api/v1/inventory/minimum-stock' },
  { label: ar.nav.periodicCount, href: '/inventory/counts', api: '/api/v1/inventory/counts' },
  { label: ar.inventory.productCostHistory, href: '/products', api: '/api/v1/products' },
  ].filter((item) => ![ar.inventory.containerReceipt, ar.inventory.landedCost, ar.inventory.productCostHistory, 'تتبع الحاويات'].includes(item.label));

describe('verified sidebar entries', () => {
  it.each(unlockedItems)('$label is an unlocked route that loads its API-backed screen', async (item) => {
    queryClient.clear();
    sessionStore.setUser(owner);
    const requested: string[] = [];
    server.use(
      http.all(/\/api\/v1\/.*/, ({ request }) => {
        const path = new URL(request.url).pathname;
        requested.push(path);
        if (path.endsWith('/auth/me')) return HttpResponse.json({ data: { user: owner } });
        if (path === '/api/v1/invoice-issuers') return HttpResponse.json({ data: {
          company: [{ type: 'company', name: 'ماستر' }],
          partners: [],
          drivers: [],
        } });
        if (path === '/api/v1/products') return HttpResponse.json({
          data: [{ id: 7, sku: 'P7', barcode: null, name: 'Widget', category_id: null, unit_code: 'pcs', minimum_stock: '2', is_active: true }],
          meta: { current_page: 1, per_page: 50, total: 1, last_page: 1 },
        });
        if (path === '/api/v1/containers') return HttpResponse.json({
          data: [{ id: 8, container_number: 'CNT-8', supplier_id: null, supplier_name: null, origin: null, destination: null, status: 'in_transit', estimated_departure: null, estimated_arrival: null, notes: null }],
          meta: { current_page: 1, per_page: 50, total: 1, last_page: 1 },
        });
        if (path === '/api/v1/containers/8') return HttpResponse.json({
          id: 8, container_number: 'CNT-8', supplier_id: null, supplier_name: null,
          origin: null, destination: null, status: 'in_transit', estimated_departure: null,
          estimated_arrival: null, notes: null, allocation_basis: null,
          lines: [{ id: 9, product_id: 7, product_name: 'Widget', sku: 'P7', expected_quantity: '2', received_quantity: '0', purchase_value_egp: '12.50', notes: null }],
          costs: [], receipts: [], status_history: [],
        });
        if (path === '/api/v1/finance-planning-options') return HttpResponse.json({ data: { partners: [], treasury: [], categories: [] } });
        if (path === '/api/v1/partner-installment-plans') return HttpResponse.json(emptyPage);
        if (path === '/api/v1/container-partners') return HttpResponse.json({ data: [] });
        if (path.endsWith('/settings/general')) {
          return HttpResponse.json({ data: {
            company_name: 'Test ERP', company_address: null, company_phone: null,
            company_email: null, company_tax_number: null, invoice_number_prefix: 'INV',
            order_number_prefix: 'ORD', container_number_prefix: 'CNT',
          } });
        }
        if (path.endsWith('/settings/sales-tax')) {
          return HttpResponse.json({ data: { enabled: false, rate: null, calculation_method: null } });
        }
        return HttpResponse.json(emptyPage);
      }),
    );
    render(
      <MemoryRouter initialEntries={['/admin/users']}>
        <AppProviders><App /></AppProviders>
      </MemoryRouter>,
    );
    const user = userEvent.setup();
    const sidebar = within(await screen.findByRole('navigation', { name: ar.app.name }));
    const groupLabel = item.href.startsWith('/reports')
      ? ar.navGroups.reports
      : item.href.startsWith('/containers')
        ? ar.navGroups.containers
        : item.href.startsWith('/customers') || item.href.startsWith('/reports/customer')
          ? ar.navGroups.customers
          : item.href.startsWith('/finance/partner-installments')
            ? ar.navGroups.containerPartners
            : item.href.startsWith('/admin')
              ? ar.navGroups.admin
            : item.label === ar.app.createInvoice
              ? ar.navGroups.sales
              : ar.navGroups.inventory;
    const groupSummary = sidebar
      .getAllByText(groupLabel, { exact: true })
      .find((element) => element.closest('summary'));
    expect(groupSummary).toBeDefined();
    if (!groupSummary.closest('details')?.open) await user.click(groupSummary);
    const link = sidebar.getByRole('link', { name: item.label });
    expect(link).toHaveAttribute('href', item.href);
    expect(link).not.toHaveClass('nav-link-locked');
    await user.click(link);
    await waitFor(() => expect(requested).toContain(item.api));
    if (item.label === ar.inventory.containerReceipt || item.label === ar.inventory.landedCost) {
      const main = within(screen.getByRole('main'));
      await user.click((await main.findAllByRole('link', { name: 'CNT-8' }))[0]);
      const action = await within(screen.getByRole('main')).findByRole('link', { name: item.label });
      await user.click(action);
      await screen.findByRole('heading', { name: new RegExp(item.label) });
    }
    if (item.label === ar.inventory.productCostHistory) {
      const historyLink = (await within(screen.getByRole('main')).findAllByRole('link', { name: item.label }))
        .find((candidate) => candidate.getAttribute('href') === '/products/7/cost-history');
      expect(historyLink).toBeDefined();
      await user.click(historyLink!);
      await waitFor(() => expect(requested).toContain('/api/v1/products/7/cost-history'));
    }
  });
  it('keeps retired container links and local mock controls out of the live sidebar', async () => {
    queryClient.clear();
    sessionStore.setUser(owner);
    server.use(http.all(/\/api\/v1\/.*/, ({ request }) => {
      const path = new URL(request.url).pathname;
      if (path.endsWith('/auth/me')) return HttpResponse.json({ data: { user: owner } });
      return HttpResponse.json(emptyPage);
    }));
    render(
      <MemoryRouter initialEntries={['/admin/users']}>
        <AppProviders><App /></AppProviders>
      </MemoryRouter>,
    );
    const sidebar = await screen.findByRole('navigation', { name: ar.app.name });
    expect(sidebar).not.toHaveTextContent(ar.inventory.containerReceipt);
    expect(sidebar).not.toHaveTextContent(ar.inventory.landedCost);
    expect(sidebar).not.toHaveTextContent('تتبع الحاويات');
    expect(document.querySelector('[data-ui="local-mock"]')).toBeNull();
  });
});
