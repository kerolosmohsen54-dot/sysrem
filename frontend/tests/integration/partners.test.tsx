import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/app/App';
import { AppProviders, queryClient } from '../../src/app/providers';
import { sessionStore } from '../../src/shared/auth/sessionStore';
import { ar } from '../../src/shared/i18n/ar';
import { server } from '../server';

function renderPartners() {
  return render(<MemoryRouter initialEntries={['/partners']}><AppProviders><App /></AppProviders></MemoryRouter>);
}

function renderPartnerAccount() {
  return render(<MemoryRouter initialEntries={['/partners/7']}><AppProviders><App /></AppProviders></MemoryRouter>);
}

function renderLegacyPartnerPaymentsRoute() {
  return render(<MemoryRouter initialEntries={['/partner-payments']}><AppProviders><App /></AppProviders></MemoryRouter>);
}

function owner() {
  queryClient.clear();
  sessionStore.setUser({ id: 1, username: 'owner', name: 'Owner', role: 'owner', permissions: ['partners.view', 'partners.manage', '*'] });
  server.use(http.get('/api/v1/auth/me', () => HttpResponse.json({ id: 1, username: 'owner', name: 'Owner', role: 'owner', permissions: ['partners.view', 'partners.manage', '*'] })));
}

function listHandler() {
  server.use(http.get('/api/v1/partners', () => HttpResponse.json({ data: [], meta: { current_page: 1, per_page: 20, total: 0, last_page: 1 } })));
}

describe('partners live integration', () => {
  it('opens a dedicated partner account page with profit and invoice lines', async () => {
    owner();
    server.use(http.get('/api/v1/partners/7', () => HttpResponse.json({ data: {
      partner: { id: 7, name: 'Peter', phone: null, status: 'active', profit_percentage: null },
      profit_summary: { invoice_count: 1, profit_egp: '100.00', unpriced_line_count: 0 },
      company_profit_from_drivers_egp: null,
      ledger: [{ id: 31, entry_type: 'accrual', amount_egp: '100.00', effective_date: '2026-10-16', notes: null, invoice_number: 'INV-7', reference_number: null, partner_payment_id: null }],
      invoices: [{ id: 7, invoice_number: 'INV-7', issue_date: '2026-10-16', issuer_name: 'Peter', customer_name: 'Customer', profit_egp: '100.00', lines: [{ product_name: 'Water pump', sku: 'WP-1', sold_quantity: 2, returned_quantity: 0, net_quantity: 2, company_price_egp: '150.00', purchase_cost_egp: '100.00', container_number: 'CONT-7', unit_price_egp: '200.00', markup_egp: '50.00', profit_egp: '100.00' }] }],
    } })));

    renderPartnerAccount();

    expect(await screen.findByRole('heading', { name: 'حساب الشريك: Peter' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'الفواتير والأرباح' })).toBeVisible();
    expect(screen.getByText('Water pump')).toBeVisible();
    expect(screen.getByText('الأرباح المسجلة')).toBeVisible();
    expect(screen.queryByText('المصروف')).not.toBeInTheDocument();
    expect(screen.queryByText('المستحق')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /صرف/ })).not.toBeInTheDocument();
  });

  it('loads and creates a company seller with a WhatsApp number without guessing its profit-share rule', async () => {
    owner();
    listHandler();
    server.use(http.post('/api/v1/partners', async ({ request }) => {
      const payload = await request.json() as { name: string; phone: string | null };
      expect(payload).toEqual({ name: 'Company Seller', phone: '01000000000' });
      return HttpResponse.json({ data: { id: 7, name: payload.name, phone: payload.phone, status: 'active', profit_percentage: null } }, { status: 201 });
    }));

    const user = userEvent.setup();
    renderPartners();
    expect(await screen.findByRole('heading', { name: ar.nav.partners }, { timeout: 10_000 })).toBeVisible();
    expect(screen.getByRole('button', { name: ar.finance.createPartner })).toBeVisible();
    await user.type(document.querySelector('input[name="name"]') as HTMLInputElement, 'Company Seller');
    await user.type(document.querySelector('input[name="phone"]') as HTMLInputElement, '01000000000');
    await user.click(screen.getByRole('button', { name: ar.finance.createPartner }));
    expect(await screen.findByText(ar.common.actionSaved)).toBeVisible();
  });

  it('updates a company partner profile and status through the partner API', async () => {
    owner();
    server.use(
      http.get('/api/v1/partners', () => HttpResponse.json({
        data: [{ id: 19, name: 'Old partner name', phone: '01000000000', status: 'active', profit_percentage: null }],
        meta: { current_page: 1, per_page: 20, total: 1, last_page: 1 },
      })),
      http.patch('/api/v1/partners/19', async ({ request }) => {
        expect(await request.json()).toEqual({ name: 'Updated partner', phone: '01011111111', status: 'inactive' });
        return HttpResponse.json({ data: { id: 19, name: 'Updated partner', phone: '01011111111', status: 'inactive', profit_percentage: null } });
      }),
    );

    const user = userEvent.setup();
    renderPartners();
    await screen.findByRole('row', { name: /Old partner name/ });
    await user.click(screen.getAllByRole('button', { name: 'تعديل' })[0]);
    const dialog = within(screen.getByRole('dialog'));
    await user.clear(dialog.getByRole('textbox', { name: ar.common.name }));
    await user.type(dialog.getByRole('textbox', { name: ar.common.name }), 'Updated partner');
    await user.clear(dialog.getByRole('textbox', { name: 'رقم واتساب' }));
    await user.type(dialog.getByRole('textbox', { name: 'رقم واتساب' }), '01011111111');
    await user.selectOptions(dialog.getByRole('combobox', { name: ar.common.status }), 'inactive');
    await user.click(dialog.getByRole('button', { name: 'حفظ التعديلات' }));

    expect(await screen.findByText(ar.common.actionSaved)).toBeVisible();
  });

  it('shows company partners in a profit-only view with the recorded seller profit', async () => {
    owner();
    server.use(http.get('/api/v1/partners', () => HttpResponse.json({
      data: [{ id: 12, name: 'Abanoub', phone: null, status: 'active', profit_percentage: null, profit_summary: { invoice_count: 1, profit_egp: '300000.00', unpriced_line_count: 0 } }],
      meta: { current_page: 1, per_page: 20, total: 1, last_page: 1 },
    })));

    const user = userEvent.setup();
    renderPartners();
    await screen.findByRole('heading', { name: ar.nav.partners });
    await user.click(screen.getByRole('button', { name: 'الأرباح فقط' }));

    expect(screen.getByRole('heading', { name: 'أرباح الشركاء فقط' })).toBeVisible();
    const row = screen.getByRole('row', { name: /Abanoub/ });
    expect(document.querySelector('.company-partners-profit-table')).toBeInTheDocument();
    expect(document.querySelector('.company-partners-profit-table + .table-cards')).toBeInTheDocument();
    expect(row).toHaveTextContent('300,000.00 ج.م');
    expect(row).not.toHaveTextContent('واتساب');
    expect(row).not.toHaveTextContent('عدد الفواتير');
  });

  it('shows no-permission state for a real API 403 response', async () => {
    owner();
    server.use(http.get('/api/v1/partners', () => HttpResponse.json({ error: { code: 'FORBIDDEN', details: {} } }, { status: 403 })));
    renderPartners();
    expect((await screen.findAllByText(ar.common.permissionDenied)).length).toBeGreaterThan(0);
  });

  it('shows field validation from error.details on partner creation', async () => {
    owner();
    listHandler();
    server.use(http.post('/api/v1/partners', () => HttpResponse.json({ error: { code: 'VALIDATION_FAILED', details: { name: ['Partner name is required'] } } }, { status: 422 })));
    const user = userEvent.setup();
    renderPartners();
    await screen.findByRole('heading', { name: ar.nav.partners });
    fireEvent.change(document.querySelector('input[name="name"]') as HTMLInputElement, { target: { value: 'Valid name' } });
    fireEvent.change(document.querySelector('input[name="phone"]') as HTMLInputElement, { target: { value: '01000000000' } });
    await user.click(screen.getByRole('button', { name: ar.finance.createPartner }));
    expect((await screen.findAllByRole('alert')).some((alert) => /[\u0600-\u06FF]/u.test(alert.textContent ?? ''))).toBe(true);
  });

  it('does not expose the retired company partner payout page', async () => {
    owner();
    renderLegacyPartnerPaymentsRoute();
    expect(await screen.findByText(ar.common.pageNotFound)).toBeVisible();
  });
});
