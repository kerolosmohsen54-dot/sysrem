import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { InvoiceEditPage } from '../../src/features/sales/InvoiceEditPage';
import { ar } from '../../src/shared/i18n/ar';
import { server } from '../server';

describe('invoice revision screen', () => {
  it('prefills server values and allows revision when product and warehouse references are present', async () => {
    const page = (data: unknown[]) => HttpResponse.json({
      data,
      meta: { current_page: 1, per_page: 100, total: data.length, last_page: 1 },
    });
    server.use(
      http.get('/api/v1/invoices/701', () => HttpResponse.json({ data: {
        document: {
          id: 701,
          document_number: 'INV-701',
          document_type: 'invoice',
          status: 'posted',
          customer_id: 101,
          customer_name: 'Fixture customer',
          issue_date: '2026-10-20',
          due_date: null,
          total_amount: '250.00',
          issuer_company_snapshot: 'ماستر',
          notes: null,
        },
        lines: [{ id: 7011, product_id: 201, location_id: 401, product_name: 'Fixture product', sku: 'FIX-201', quantity: '1', unit_price: '250.00', discount_amount: '0.00', line_total: '250.00' }],
      } })),
      http.get('/api/v1/customers', () => page([{ id: 101, name: 'Fixture customer' }])),
      http.get('/api/v1/products', () => page([{ id: 201, name: 'Fixture product', sku: 'FIX-201', company_price: '200.00', is_active: true }])),
      http.get('/api/v1/warehouses', () => page([{ id: 401, name: 'Fixture warehouse', code: 'FIX-401' }])),
      http.get('/api/v1/invoice-issuers', () => HttpResponse.json({ data: { company: [{ type: 'company', name: 'ماستر' }], partners: [], drivers: [] } })),
      http.get('/api/v1/reference/governorates', () => page([])),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <MemoryRouter initialEntries={['/invoices/701/edit']}>
        <QueryClientProvider client={client}>
          <Routes>
            <Route path="/invoices/:documentId/edit" element={<InvoiceEditPage />} />
          </Routes>
        </QueryClientProvider>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('heading', { name: new RegExp(ar.sales.reviseInvoiceTitle) }),
    ).toBeVisible();
    expect(screen.getByRole('combobox', { name: /العميل/ })).toHaveValue('101');
    expect(screen.queryByText(ar.sales.revisionWaitingMessage)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /حفظ التعديل/ })).toBeEnabled();
  });
});
