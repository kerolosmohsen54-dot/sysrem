import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ReturnFormPage } from '../../src/features/sales/ReturnFormPage';
import { ReturnPrintPage } from '../../src/features/sales/ReturnsPage';
import { AuthProvider } from '../../src/shared/auth/AuthProvider';
import { ar } from '../../src/shared/i18n/ar';
import { server } from '../server';

function renderPage() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <MemoryRouter initialEntries={['/returns/new']}>
        <QueryClientProvider client={client}>
          <AuthProvider>
            <Routes>
              <Route path="/returns/new" element={<ReturnFormPage />} />
              <Route path="/returns/:documentId/print" element={<ReturnPrintPage />} />
            </Routes>
          </AuthProvider>
        </QueryClientProvider>
      </MemoryRouter>,
    );

}

function provideReturnOptions() {
  const page = (items: unknown[]) => HttpResponse.json({ data: items, meta: { current_page: 1, per_page: 100, total: items.length, last_page: 1 } });
  server.use(
    http.get('/api/v1/auth/me', () => HttpResponse.json({
      id: 1,
      username: 'owner-demo',
      name: 'Owner',
      role: 'owner',
      permissions: ['*'],
    })),
    http.get('/api/v1/invoices', () => page([])),
    http.get('/api/v1/customers', () => page([{ id: 2, name: 'Test customer' }])),
    http.get('/api/v1/warehouses', () => page([{ id: 3, code: 'MAIN', name: 'Main warehouse', location_type: 'main', parent_location_id: null, is_active: true, notes: null }])),
    http.get('/api/v1/products', () => page([{ id: 4, sku: 'P-4', name: 'Test product', is_active: true }])),
    http.post('/api/v1/returns/preview', () => HttpResponse.json({ data: { lines: [], subtotal_egp: '10.00', discount_amount_egp: '0.00', tax_amount_egp: '0.00', grand_total_egp: '10.00', warnings: [] } })),
    http.get('/api/v1/returns/:returnId', ({ params }) => {
      const returnId = Number(params.returnId);
      return HttpResponse.json({ data: {
        document: {
          id: returnId,
          document_number: `RET-${String(returnId).padStart(4, '0')}`,
          document_type: 'credit_note',
          status: 'posted',
          customer_id: 2,
          customer_name: 'Test customer',
          issue_date: '2026-10-20',
          due_date: null,
          total_amount: '10.00',
          return_reason: 'Damaged item',
          original_invoice_number: returnId === 56 ? 'INV-55' : null,
        },
        lines: [{ id: returnId * 10, product_id: 4, location_id: 3, quantity: '2', unit_price: '5.00', line_total: '10.00' }],
      } });
    }),
  );
}

async function fillReturnForm() {
  const user = userEvent.setup();
  await screen.findByRole('heading', { name: ar.sales.returnCreateTitle });
  await user.click(screen.getByRole('button', { name: ar.sales.freeReturn }));
  await user.selectOptions(screen.getByLabelText(ar.common.customer), '2');
  await user.selectOptions(screen.getByLabelText(ar.sales.returnSelectWarehouse), '3');
  await user.selectOptions(screen.getByLabelText(ar.common.product), '4');
  await user.type(document.querySelector('input[name="quantity"]') as HTMLInputElement, '2');
  await user.type(document.querySelector('input[name="unit_price_egp"]') as HTMLInputElement, '5.00');
  const reason = document.querySelector('input[name="return_reason"]');
  if (!(reason instanceof HTMLInputElement)) throw new Error('The free return reason field is missing.');
  await user.clear(reason);
  await user.type(reason, 'Damaged item');
  await user.click(screen.getByRole('button', { name: ar.sales.previewWaiting }));
  expect(await screen.findAllByText(/10\.00 ج\.م/)).toHaveLength(2);
  return user;
}

describe('return creation API workflow', () => {
  it('previews and saves a return with an idempotency key, then opens its database print view', async () => {
    provideReturnOptions();
    let key = '';
    let postedBody: unknown;
    server.use(http.post('/api/v1/returns', async ({ request }) => {
      key = request.headers.get('Idempotency-Key') ?? '';
      postedBody = await request.json();
      return HttpResponse.json({ data: { document: { id: 45, document_number: 'RET-0045' }, lines: [] } }, { status: 201 });
    }));
    renderPage();
    const user = await fillReturnForm();
    await user.click(screen.getByRole('button', { name: ar.sales.submitReturn }));

    expect(await screen.findByRole('heading', { name: 'معاينة طباعة المرتجع' })).toBeVisible();
    expect(screen.getByText('رقم المرتجع', { exact: true }).parentElement).toHaveTextContent('RET-0045');
    expect(screen.getByText('الفاتورة الأصلية', { exact: true }).parentElement).toHaveTextContent('—');
    expect(key).not.toBe('');
    expect(postedBody).toMatchObject({ customer_id: 2, lines: [{ warehouse_id: 3, product_id: 4, quantity: 2, unit_price_egp: '5.00' }] });
    expect(postedBody).toMatchObject({ return_reason: 'Damaged item', original_document_id: null });
  });

  it('shows error.details field errors from a 422 response', async () => {
    provideReturnOptions();
    server.use(http.post('/api/v1/returns', () => HttpResponse.json({ error: { code: 'VALIDATION_FAILED', details: { 'lines.0.quantity': ['Quantity exceeds available amount'] } } }, { status: 422 })));
    renderPage();
    const user = await fillReturnForm();
    await user.click(screen.getByRole('button', { name: ar.sales.submitReturn }));

    expect((await screen.findAllByRole('alert')).some((alert) => /[\u0600-\u06FF]/u.test(alert.textContent ?? ''))).toBe(true);
  });

  it('uses the selected invoice line and blocks quantities above the remaining sold amount', async () => {
    const page = (items: unknown[]) => HttpResponse.json({ data: items, meta: { current_page: 1, per_page: 100, total: items.length, last_page: 1 } });
    provideReturnOptions();
    let postedBody: unknown;
    server.use(
      http.get('/api/v1/invoices', () => page([{
        id: 55,
        document_number: 'INV-55',
        customer_id: 2,
        customer_name: 'Test customer',
        issue_date: '2026-10-20',
        due_date: null,
        total_amount: '10.00',
        issuer_name_snapshot: 'Company',
        status: 'posted',
      }])),
      http.get('/api/v1/invoices/55', () => HttpResponse.json({ data: {
        document: {
          id: 55,
          document_number: 'INV-55',
          document_type: 'invoice',
          customer_id: 2,
          customer_name: 'Test customer',
          issue_date: '2026-10-20',
          due_date: null,
          total_amount: '10.00',
          issuer_name_snapshot: 'Company',
          status: 'posted',
          payment_status: 'unpaid',
        },
        lines: [{
          id: 550,
          product_id: 4,
          product_name: 'Test product',
          sku: 'P-4',
          quantity: '2',
          location_id: 3,
          unit_price: '5.00',
          discount_amount: '0.00',
          line_total: '10.00',
          returned_quantity: 1,
          remaining_quantity: 1,
        }],
      } })),
      http.post('/api/v1/returns/preview', () => HttpResponse.json({ data: { lines: [], subtotal_egp: '5.00', discount_amount_egp: '0.00', tax_amount_egp: '0.00', grand_total_egp: '5.00', warnings: [] } })),
      http.post('/api/v1/returns', async ({ request }) => {
        postedBody = await request.json();
        return HttpResponse.json({ data: { document: { id: 56, document_number: 'RET-0056' }, lines: [] } }, { status: 201 });
      }),
    );
    renderPage();
    const user = userEvent.setup();
    await screen.findByRole('heading', { name: ar.sales.returnCreateTitle });
    await user.selectOptions(screen.getByLabelText(ar.sales.returnSelectInvoice), '55');
    await screen.findByText('Test customer');
    await user.selectOptions(screen.getByLabelText(ar.sales.returnSelectWarehouse), '3');
    const linePicker = document.querySelector('section[aria-labelledby="linked-return-lines-heading"] select');
    if (!(linePicker instanceof HTMLSelectElement)) throw new Error('The source invoice line field is missing.');
    await user.selectOptions(linePicker, '550');
    const quantity = document.querySelector('input[name="quantity"]') as HTMLInputElement;
    await user.type(quantity, '2');
    await user.click(screen.getByRole('button', { name: ar.sales.previewWaiting }));
    expect(await screen.findByRole('alert')).toBeVisible();
    expect(screen.getByRole('button', { name: ar.sales.submitReturn })).toBeDisabled();

    await user.clear(quantity);
    await user.type(quantity, '1');
    await user.click(screen.getByRole('button', { name: ar.sales.previewWaiting }));
    await waitFor(() => expect(document.querySelector('.invoice-preview-waiting dl')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: ar.sales.submitReturn }));
    expect(await screen.findByRole('heading', { name: 'معاينة طباعة المرتجع' })).toBeVisible();
    expect(screen.getByText('رقم المرتجع', { exact: true }).parentElement).toHaveTextContent('RET-0056');
    expect(screen.getByText('الفاتورة الأصلية', { exact: true }).parentElement).toHaveTextContent('INV-55');
    expect(postedBody).toMatchObject({
      customer_id: 2,
      original_document_id: 55,
      return_reason: 'damaged',
      lines: [{ warehouse_id: 3, quantity: 1, original_document_line_id: 550 }],
    });
  });
});
