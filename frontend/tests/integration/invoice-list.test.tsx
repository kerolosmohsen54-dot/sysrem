import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { InvoiceListPage } from '../../src/features/sales/InvoiceListPage';
import { AuthProvider } from '../../src/shared/auth/AuthProvider';
import { ar } from '../../src/shared/i18n/ar';
import { server } from '../server';

describe('invoice list screen', () => {
  it('renders API fixture totals and status without calculating amounts in the UI', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <MemoryRouter>
        <QueryClientProvider client={client}>
          <AuthProvider>
            <InvoiceListPage />
          </AuthProvider>
        </QueryClientProvider>
      </MemoryRouter>,
    );

    expect(await screen.findAllByText('INV-2026-1041')).not.toHaveLength(0);
    expect(screen.getAllByText('شركة النور لاستيراد السيارات')).not.toHaveLength(0);
    expect(screen.getAllByText('7,800.00 ج.م')).not.toHaveLength(0);
    expect(screen.getAllByText('4,800.00 ج.م')).not.toHaveLength(0);
    expect(screen.getAllByText(ar.sales.statusPaid)).not.toHaveLength(0);
    expect(screen.getByRole('button', { name: 'معاينة طباعة الفاتورة INV-2026-1041' })).toBeInTheDocument();
  });

  it('normalizes the backend invoice document contract', async () => {
    server.use(http.get('/api/v1/invoices', () => HttpResponse.json({
      data: [{
        id: 801,
        document_number: 'INV-BACKEND-801',
        status: 'posted',
        customer_id: 101,
        customer_name: 'Backend Customer',
        issue_date: '2026-10-15',
        due_date: null,
        total_amount: '1200.0000',
        issuer_name_snapshot: 'Owner',
      }],
      meta: { current_page: 1, per_page: 10, total: 1, last_page: 1 },
    })));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <MemoryRouter>
        <QueryClientProvider client={client}>
          <AuthProvider>
            <InvoiceListPage />
          </AuthProvider>
        </QueryClientProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('button', { name: 'معاينة طباعة الفاتورة INV-BACKEND-801' })).toBeInTheDocument();
    expect(screen.getByText((text) => text.startsWith('1,200.0000'))).toBeVisible();
  });
  it('filters invoices using the supported customer_id query parameter', async () => {
    const user = userEvent.setup();
    let requestedCustomerId = '';
    server.use(
      http.get('/api/v1/invoices', ({ request }) => {
        requestedCustomerId = new URL(request.url).searchParams.get('customer_id') ?? '';
        return HttpResponse.json({
          data: [],
          meta: { current_page: 1, per_page: 10, total: 0, last_page: 1 },
        });
      }),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <MemoryRouter>
        <QueryClientProvider client={client}>
          <AuthProvider>
            <InvoiceListPage />
          </AuthProvider>
        </QueryClientProvider>
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: ar.nav.invoices });
    await user.selectOptions(await screen.findByLabelText(ar.common.customer), '101');
    await waitFor(() => expect(requestedCustomerId).toBe('101'));
  });

  it('filters overdue invoices and exposes bulk actions after selecting a row', async () => {
    const user = userEvent.setup();
    const today = new Date();
    const issueDate = today.toISOString().slice(0, 10);
    today.setDate(today.getDate() - 1);
    const overdueDate = today.toISOString().slice(0, 10);
    server.use(
      http.get('/api/v1/invoices', () =>
        HttpResponse.json({
          data: [
            {
              id: 901,
              invoice_number: 'INV-OVERDUE-1',
              customer_id: 101,
              customer_name: 'عميل متأخر',
              issue_date: issueDate,
              due_date: overdueDate,
              total_egp: '1500.00',
              paid_egp: '500.00',
              remaining_egp: '1000.00',
              issuer_name: 'أبنوب',
              status: 'issued',
            },
            {
              id: 902,
              invoice_number: 'INV-PAID-1',
              customer_id: 102,
              customer_name: 'عميل مدفوع',
              issue_date: issueDate,
              due_date: overdueDate,
              total_egp: '700.00',
              paid_egp: '700.00',
              remaining_egp: '0.00',
              issuer_name: 'كراس',
              status: 'paid',
            },
          ],
          meta: { current_page: 1, per_page: 100, total: 2, last_page: 1 },
        }),
      ),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <MemoryRouter>
        <QueryClientProvider client={client}>
          <AuthProvider>
            <InvoiceListPage />
          </AuthProvider>
        </QueryClientProvider>
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole('button', { name: 'متأخرة 🔴' }));
    expect(await screen.findByText('INV-OVERDUE-1')).toBeInTheDocument();
    expect(screen.queryByText('INV-PAID-1')).not.toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'تحديد الفاتورة INV-OVERDUE-1' }));
    expect(screen.getByText('1 فاتورة محددة')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '📱 إرسال واتساب' })).toBeInTheDocument();
  });
});
