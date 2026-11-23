import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { InvoiceDetailPage } from '../../src/features/sales/InvoiceDetailPage';
import { listInvoiceHistory } from '../../src/features/sales/api';
import { AuthProvider } from '../../src/shared/auth/AuthProvider';
import { ar } from '../../src/shared/i18n/ar';
import { server } from '../server';

describe('invoice detail screen', () => {

  it('maps backend invoice-history timestamps and actor names into the screen contract', async () => {
    server.use(
      http.get('/api/v1/invoices/814/history', () => HttpResponse.json({
        data: [{
          id: 8,
          invoice_id: 814,
          field_path: 'notes',
          old_value: null,
          new_value: 'Revision note',
          reason: 'Acceptance revision',
          actor: { user_id: 1, name: 'Owner' },
          created_at: '2026-10-17T08:00:00Z',
        }],
        meta: { current_page: 1, per_page: 50, total: 1, last_page: 1 },
      })),
    );

    const page = await listInvoiceHistory('814', { page: 1, perPage: 50 });

    expect(page.data[0]).toMatchObject({
      id: 8,
      field_path: 'notes',
      actor_name: 'Owner',
      changed_at: '2026-10-17T08:00:00Z',
    });
  });

  it('normalizes the backend invoice detail and line contract', async () => {
    server.use(
      http.get('/api/v1/auth/me', () =>
        HttpResponse.json({
          id: 1,
          username: 'owner-demo',
          name: 'Owner',
          role: 'owner',
          permissions: ['*'],
        }),
      ),
      http.get('/api/v1/invoices/812', () => HttpResponse.json({
        data: {
          document: {
            id: 812,
            document_number: 'INV-BACKEND-812',
            status: 'posted',
            customer_id: 101,
            customer_name: 'Backend Customer',
            issue_date: '2026-10-15',
            due_date: null,
            total_amount: '85.0000',
            issuer_name_snapshot: 'Owner',
            notes: 'Backend note',
          },
          lines: [{
            id: 1,
            product_id: 501,
            location_id: 3,
            description_snapshot: 'Backend Product',
            sku_snapshot: 'SKU-501',
            quantity: '1',
            unit_price: '85.0000',
            discount_amount: '0.0000',
            line_total: '85.0000',
          }],
        },
      })),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <MemoryRouter initialEntries={['/invoices/812']}>
        <QueryClientProvider client={client}>
          <AuthProvider>
            <Routes>
              <Route path="/invoices/:documentId" element={<InvoiceDetailPage />} />
            </Routes>
          </AuthProvider>
        </QueryClientProvider>
      </MemoryRouter>,
    );

    expect(await screen.findAllByText(/INV-BACKEND-812/)).not.toHaveLength(0);
    expect(screen.getByText(/Backend Product/)).toBeVisible();
    expect(screen.getByText('Backend note')).toBeVisible();
    expect(await screen.findAllByText((text) => text.startsWith('85.0000'))).not.toHaveLength(0);
  });

  it('locks a printed invoice against editing in the detail screen', async () => {
    server.use(
      http.get('/api/v1/auth/me', () => HttpResponse.json({
        id: 1,
        username: 'owner-demo',
        name: 'Owner',
        role: 'owner',
        permissions: ['*'],
      })),
      http.get('/api/v1/invoices/813', () => HttpResponse.json({
        data: {
          document: {
            id: 813,
            document_number: 'INV-PRINTED-813',
            status: 'posted',
            customer_id: 101,
            customer_name: 'Backend Customer',
            issue_date: '2026-10-17',
            due_date: null,
            total_amount: '10.0000',
            paid_egp: '0.0000',
            remaining_egp: '10.0000',
            printed_at: '2026-10-17T10:00:00Z',
          },
          lines: [],
        },
      })),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <MemoryRouter initialEntries={['/invoices/813']}>
        <QueryClientProvider client={client}>
          <AuthProvider>
            <Routes>
              <Route path="/invoices/:documentId" element={<InvoiceDetailPage />} />
            </Routes>
          </AuthProvider>
        </QueryClientProvider>
      </MemoryRouter>,
    );

    expect(await screen.findAllByText(/INV-PRINTED-813/)).not.toHaveLength(0);
    expect(screen.getByText('تم طباعة الفاتورة؛ لا يمكن تعديلها.')).toBeVisible();
    expect(screen.queryByRole('link', { name: ar.sales.reviseInvoice })).not.toBeInTheDocument();
  });
  it('loads server invoice values and owner-only change history', async () => {
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
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <MemoryRouter initialEntries={['/invoices/701']}>
        <QueryClientProvider client={client}>
          <AuthProvider>
            <Routes>
              <Route path="/invoices/:documentId" element={<InvoiceDetailPage />} />
            </Routes>
          </AuthProvider>
        </QueryClientProvider>
      </MemoryRouter>,
    );

    expect(await screen.findAllByText(/INV-2026-1041/)).not.toHaveLength(0);
    expect(screen.getByText('7,800.00 ج.م')).toBeVisible();
    expect(await screen.findByRole('heading', { name: ar.sales.invoiceHistory })).toBeVisible();
    expect(await screen.findByText(ar.sales.invoiceHistoryUnavailable)).toBeVisible();
    expect(screen.getByRole('link', { name: 'معاينة الطباعة' })).toHaveAttribute(
      'href',
      '/invoices/701/print',
    );
    expect(screen.getByRole('link', { name: 'تنزيل PDF' })).toHaveAttribute(
      'href',
      '/invoices/701/pdf',
    );
    expect(screen.getByRole('link', { name: ar.sales.reviseInvoice })).toHaveAttribute(
      'href',
      '/invoices/701/edit',
    );
  });

  it('does not request or render history for a driver', async () => {
    server.use(
      http.get('/api/v1/auth/me', () =>
        HttpResponse.json({
          id: 3,
          username: 'driver-demo',
          name: 'السائق',
          role: 'driver',
          permissions: ['invoices.view'],
        }),
      ),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <MemoryRouter initialEntries={['/invoices/701']}>
        <QueryClientProvider client={client}>
          <AuthProvider>
            <Routes>
              <Route path="/invoices/:documentId" element={<InvoiceDetailPage />} />
            </Routes>
          </AuthProvider>
        </QueryClientProvider>
      </MemoryRouter>,
    );

    await screen.findAllByText(/INV-2026-1041/);
    expect(
      screen.queryByRole('heading', { name: ar.sales.invoiceHistory }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: ar.sales.reviseInvoice })).not.toBeInTheDocument();
  });

  it('cancels with a reason and sends an idempotency key', async () => {
    const user = userEvent.setup();
    const keys: string[] = [];
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
      http.post('/api/v1/invoices/:documentId/cancel', ({ request }) => {
        keys.push(request.headers.get('Idempotency-Key') ?? '');
        return HttpResponse.json({
          id: 701,
          invoice_number: 'INV-2026-1041',
          status: 'cancelled',
        });
      }),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <MemoryRouter initialEntries={['/invoices/701']}>
        <QueryClientProvider client={client}>
          <AuthProvider>
            <Routes>
              <Route path="/invoices/:documentId" element={<InvoiceDetailPage />} />
            </Routes>
          </AuthProvider>
        </QueryClientProvider>
      </MemoryRouter>,
    );

    await screen.findAllByText(/INV-2026-1041/);
    await user.click(screen.getByRole('button', { name: ar.sales.cancelInvoice }));
    await user.type(
      screen.getByLabelText(ar.sales.cancelInvoiceReason),
      'تم إدخال بيانات غير صحيحة',
    );
    await user.click(screen.getByRole('button', { name: ar.sales.confirmCancelInvoice }));

    expect(await screen.findByText(ar.sales.invoiceCancelled)).toBeVisible();
    await waitFor(() => expect(keys).toHaveLength(1));
    expect(keys[0]).toMatch(/^[0-9a-f-]{36}$/i);
  });
});
