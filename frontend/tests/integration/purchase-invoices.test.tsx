import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app/App';
import { AppProviders } from '../../src/app/providers';
import { sessionStore } from '../../src/shared/auth/sessionStore';
import { server } from '../server';

const invoice = {
  id: 61,
  invoice_number: 'SUP-0061',
  supplier_id: 8,
  supplier_name: 'Vendor One',
  seller_partner_id: 9,
  seller_partner_name: 'Seller partner',
  warehouse_id: 3,
  invoice_date: '2026-10-14',
  status: 'draft',
  subtotal_egp: '25.00',
  discount_egp: '0.00',
  tax_egp: '0.00',
  total_egp: '25.00',
  notes: null,
};
const page = (data: unknown[]) => HttpResponse.json({ data, meta: { current_page: 1, per_page: 20, total: data.length, last_page: 1 } });

function authenticateOwner() {
  const user = { id: 1, username: 'owner-demo', name: 'Owner', role: 'owner', permissions: ['*'] };
  sessionStore.setUser(user);
  server.use(http.get('/api/v1/auth/me', () => HttpResponse.json({
    ...user,
  })));
}

function renderApp(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><AppProviders><App /></AppProviders></MemoryRouter>);
}

function provideOptionsAndList() {
  server.use(
    http.get('/api/v1/purchase-invoices', () => page([invoice])),
    http.get('/api/v1/suppliers', () => page([{ id: 8, name: 'Vendor One' }])),
    http.get('/api/v1/warehouses', () => page([{ id: 3, code: 'MAIN', name: 'Main Warehouse', location_type: 'main', parent_location_id: null, is_active: true, notes: null }])),
    http.get('/api/v1/products', () => page([{ id: 5, sku: 'ITEM-5', name: 'Sample item', is_active: true, company_price: '10.00', purchase_cost_egp: '11.00' }])),
    http.get('/api/v1/partners', () => page([{ id: 9, name: 'Seller partner', phone: null, status: 'active', profit_percentage: null }])),
  );
}

async function fillPurchaseForm(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole('heading', { name: 'إنشاء فاتورة شراء' });
  await user.type(document.querySelector<HTMLInputElement>('[name="invoice_number"]')!, 'SUP-TEST-9');
  await user.selectOptions(document.querySelector<HTMLSelectElement>('[name="supplier_id"]')!, '8');
  await user.selectOptions(document.querySelector<HTMLSelectElement>('[name="seller_partner_id"]')!, '9');
  await user.selectOptions(document.querySelector<HTMLSelectElement>('[name="warehouse_id"]')!, '3');
  await user.selectOptions(document.querySelector<HTMLSelectElement>('.invoice-line-editor select')!, '5');
  const cost = document.querySelector<HTMLInputElement>('[name="unit_cost-0"]')!;
  await user.clear(cost);
  await user.type(cost, '12.50');
}

describe('purchase invoices live UI contract', () => {
  it('loads the list, opens create, and saves a draft using decimal-string values', async () => {
    authenticateOwner();
    provideOptionsAndList();
    let submitted: Record<string, unknown> | undefined;
    let idempotency = '';
    server.use(http.post('/api/v1/purchase-invoices', async ({ request }) => {
      submitted = await request.json() as Record<string, unknown>;
      idempotency = request.headers.get('Idempotency-Key') ?? '';
      return HttpResponse.json({ data: { invoice } }, { status: 201 });
    }));
    const user = userEvent.setup();
    renderApp('/purchase-invoices');

    expect(await screen.findByRole('heading', { name: 'فواتير الشراء' })).toBeVisible();
    expect(await screen.findAllByRole('link', { name: 'SUP-0061' })).not.toHaveLength(0);
    expect(screen.getAllByRole('link', { name: 'SUP-0061' })[0]).toHaveAttribute('href', '/purchase-invoices/61');
    await user.click(screen.getByRole('link', { name: 'إنشاء فاتورة شراء' }));
    await fillPurchaseForm(user);
    await user.click(screen.getByRole('button', { name: 'حفظ كمسودة' }));

    expect(await screen.findByRole('status')).toHaveTextContent('25.00');
    expect(idempotency).not.toBe('');
    expect(submitted).toMatchObject({ invoice_number: 'SUP-TEST-9', supplier_id: 8, seller_partner_id: 9, warehouse_id: 3, lines: [{ product_id: 5, quantity: 1, unit_cost_egp: '12.50', company_price_egp: '10.00' }] });
  });

  it('shows validation details returned by the purchase invoice API', async () => {
    authenticateOwner();
    provideOptionsAndList();
    server.use(http.post('/api/v1/purchase-invoices', () => HttpResponse.json({ error: { code: 'VALIDATION_FAILED', details: { 'lines.0.unit_cost_egp': ['Invalid decimal cost'] } } }, { status: 422 })));
    const user = userEvent.setup();
    renderApp('/purchase-invoices/new');
    await fillPurchaseForm(user);
    await user.click(screen.getByRole('button', { name: 'حفظ كمسودة' }));

    expect((await screen.findAllByRole('alert')).some((alert) => /[\u0600-\u06FF]/u.test(alert.textContent ?? ''))).toBe(true);
  });

  it('loads invoice detail from its id route', async () => {
    authenticateOwner();
    server.use(http.get('/api/v1/purchase-invoices/61', () => HttpResponse.json({ data: {
      invoice,
      lines: [{ id: 4, purchase_invoice_id: 61, product_id: 5, product_name: 'Sample item', quantity: 2, unit_cost_egp: '12.50', line_total_egp: '25.00', line_number: 1 }],
      financial_summary: { invoice_supplier_paid_egp: '0.00', invoice_supplier_due_egp: '25.00', invoice_supplier_pending_egp: '0.00', invoice_supplier_available_egp: '25.00', supplier_total_due_egp: '25.00', seller_profit_egp: '5.00', seller_total_due_egp: '5.00' },
      supplier_payments: [],
    } })));
    renderApp('/purchase-invoices/61');
    expect(await screen.findByRole('heading', { name: 'SUP-0061' })).toBeVisible();
    expect(await screen.findAllByText(/25\.00/)).not.toHaveLength(0);
  });

  it('posts a draft purchase invoice only after confirmation and refreshes its state', async () => {
    authenticateOwner();
    let posted = false;
    let postRequestCount = 0;
    const detail = () => HttpResponse.json({ data: {
      invoice: { ...invoice, status: posted ? 'posted' : 'draft' },
      lines: [{ id: 4, purchase_invoice_id: 61, product_id: 5, product_name: 'Sample item', quantity: 2, unit_cost_egp: '12.50', company_price_egp: '10.00', line_total_egp: '25.00', line_number: 1 }],
      financial_summary: { invoice_supplier_paid_egp: '0.00', invoice_supplier_due_egp: posted ? '25.00' : '0.00', invoice_supplier_pending_egp: '0.00', invoice_supplier_available_egp: posted ? '25.00' : '0.00', supplier_total_due_egp: posted ? '25.00' : '0.00', seller_profit_egp: '0.00', seller_total_due_egp: '0.00' },
      supplier_payments: [],
    } });
    server.use(
      http.get('/api/v1/purchase-invoices/61', detail),
      http.post('/api/v1/purchase-invoices/61/post', () => {
        posted = true;
        postRequestCount += 1;
        return HttpResponse.json({ data: { invoice: { ...invoice, status: 'posted' }, inventory_movement_ids: [812] } });
      }),
    );
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    renderApp('/purchase-invoices/61');

    const postButton = await screen.findByRole('button', { name: 'اعتماد واستلام المخزون' });
    await user.click(postButton);

    expect(confirm).toHaveBeenCalledOnce();
    expect(postRequestCount).toBe(1);
    expect(await screen.queryByRole('button', { name: 'اعتماد واستلام المخزون' })).not.toBeInTheDocument();
    confirm.mockRestore();
  });

  it('records a supplier payment and refreshes the remaining balance after approval', async () => {
    authenticateOwner();
    let paid = 0;
    let due = 25;
    const payments: { id: number; supplier_id: number; purchase_invoice_id: number; treasury_account_id: number; treasury_account_name: string; treasury_entry_id: number | null; amount_egp: string; payment_date: string; status: 'draft' | 'approved'; notes: null }[] = [];
    server.use(
      http.get('/api/v1/purchase-invoices/61', () => HttpResponse.json({ data: {
        invoice: { ...invoice, status: 'posted' },
        lines: [{ id: 4, purchase_invoice_id: 61, product_id: 5, product_name: 'Sample item', quantity: 2, unit_cost_egp: '12.50', line_total_egp: '25.00', line_number: 1 }],
        financial_summary: { invoice_supplier_paid_egp: paid.toFixed(2), invoice_supplier_due_egp: due.toFixed(2), invoice_supplier_pending_egp: payments.filter(row => row.status === 'draft').reduce((sum, row) => sum + Number(row.amount_egp), 0).toFixed(2), invoice_supplier_available_egp: (due - payments.filter(row => row.status === 'draft').reduce((sum, row) => sum + Number(row.amount_egp), 0)).toFixed(2), supplier_total_due_egp: due.toFixed(2), seller_profit_egp: '5.00', seller_total_due_egp: '5.00' },
        supplier_payments: payments,
      } })),
      http.get('/api/v1/treasury/accounts', () => page([{ id: 3, code: 'CASH', name: 'الخزينة الرئيسية', account_type: 'cash', is_active: true, notes: null }])),
      http.post('/api/v1/supplier-payments', async ({ request }) => {
        const body = await request.json() as { purchase_invoice_id: number; treasury_account_id: number; amount_egp: string; payment_date: string };
        payments.push({ id: 71, supplier_id: 8, purchase_invoice_id: body.purchase_invoice_id, treasury_account_id: body.treasury_account_id, treasury_account_name: 'الخزينة الرئيسية', treasury_entry_id: null, amount_egp: body.amount_egp, payment_date: body.payment_date, status: 'draft', notes: null });
        return HttpResponse.json({ data: payments[0] }, { status: 201 });
      }),
      http.post('/api/v1/supplier-payments/71/approve', () => {
        paid += Number(payments[0].amount_egp);
        due -= Number(payments[0].amount_egp);
        payments[0].status = 'approved';
        payments[0].treasury_entry_id = 901;
        return HttpResponse.json({ data: payments[0] });
      }),
    );

    const user = userEvent.setup();
    renderApp('/purchase-invoices/61');
    await screen.findByRole('heading', { name: 'SUP-0061' });
    await user.selectOptions(document.querySelector<HTMLSelectElement>('[name="treasury_account_id"]')!, '3');
    const amount = document.querySelector<HTMLInputElement>('#supplier-payment-amount')!;
    await user.clear(amount);
    await user.type(amount, '5');
    await user.click(screen.getByRole('button', { name: 'حفظ الدفعة كمسودة' }));
    await user.click((await screen.findAllByRole('button', { name: 'اعتماد وتسجيل الدفعة' }))[0]);

    expect(await screen.findAllByText(/20\.00/)).not.toHaveLength(0);
    expect(screen.getAllByText('#901')).not.toHaveLength(0);
  });
});
