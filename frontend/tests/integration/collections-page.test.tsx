import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { CollectionsPage } from '../../src/features/sales/CollectionsPage';
import { AuthProvider } from '../../src/shared/auth/AuthProvider';
import { ar } from '../../src/shared/i18n/ar';
import { server } from '../server';
import { listCollections } from '../../src/features/sales/api';

describe('collections screen', () => {
  it('normalizes the local demo receipt fields used by the mock API', async () => {
    const page = await listCollections({ page: 1, perPage: 10, search: '' });

    expect(page.data.length).toBeGreaterThan(0);
    expect(page.data[0].amount_egp).toMatch(/^\d+(\.\d+)?$/);
    expect(page.data[0].unallocated_egp).toMatch(/^\d+(\.\d+)?$/);
    expect(page.data[0].receipt_number).toEqual(expect.any(String));
  });
  it('calculates the allocated amount when the server only returns the unapplied remainder', async () => {
    server.use(http.get('/api/v1/collections', () => HttpResponse.json({
      data: [{
        id: 31,
        receipt_number: 'COL-2026-031',
        customer_id: 101,
        customer_name: 'Customer 101',
        treasury_account_id: 901,
        receipt_date: '2026-10-15',
        amount: '1500.0000',
        unapplied_amount: '500.0000',
      }],
      meta: { current_page: 1, last_page: 1, per_page: 10, total: 1 },
    })));

    const page = await listCollections({ page: 1, perPage: 10, search: '' });

    expect(page.data[0].allocated_egp).toBe('1000.0000');
    expect(page.data[0].unallocated_egp).toBe('500.0000');
  });
  it('records a decimal-string allocation and displays the server unallocated remainder', async () => {
    const user = userEvent.setup();
    let requestBody: unknown;
    let idempotencyKey = '';
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
      http.get('/api/v1/collections', () => HttpResponse.json({
        data: [{
          id: 21,
          receipt_number: 'COL-2026-021',
          customer_id: 101,
          customer_name: 'Customer 101',
          treasury_account_id: 901,
          receipt_date: '2026-10-15',
          amount: '1500.0000',
          unapplied_amount: '500.0000',
        }],
        meta: { current_page: 1, last_page: 1, per_page: 10, total: 1 },
      })),
      http.get('/api/v1/collections/summary', () => HttpResponse.json({ data: { receivables_egp: '2500.00', due_today_egp: '500.00', overdue_egp: '200.00', collected_this_month_egp: '900.00', as_of: '2026-10-15' } })),
      http.get('/api/v1/finance-planning-options', () => HttpResponse.json({ data: { partners: [], treasury: [{ id: 901, code: 'TR-901', name: 'Treasury 901', account_type: 'cash', notes: null, is_active: true }], categories: [] } })),
      http.post('/api/v1/collections', async ({ request }) => {
        requestBody = await request.json();
        idempotencyKey = request.headers.get('Idempotency-Key') ?? '';
        return HttpResponse.json(
          { data: { receipt: {
            id: 950,
            receipt_number: 'COL-TEST-950',
            customer_id: 101,
            customer_name: 'شركة النور لاستيراد السيارات',
            treasury_account_id: 901,
            receipt_date: '2026-10-15',
            amount: '1500.0000',
            unapplied_amount: '500.0000',
          } } },
          { status: 201 },
        );
      }),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <MemoryRouter>
        <QueryClientProvider client={client}>
          <AuthProvider>
            <CollectionsPage />
          </AuthProvider>
        </QueryClientProvider>
      </MemoryRouter>,
    );

    await screen.findAllByText('COL-2026-021');
    await user.click(screen.getByRole('button', { name: ar.sales.recordCollection }));
    await user.selectOptions(screen.getByLabelText(ar.common.customer), '101');
    await user.selectOptions(screen.getByLabelText(ar.sales.treasuryAccount), '901');
    await user.type(screen.getByLabelText(/مبلغ التحصيل/), '1500.0000');
    await user.selectOptions(await screen.findByLabelText(ar.sales.collectionInvoice), '701');
    await user.type(screen.getByLabelText(/المبلغ المخصص/), '1000.0000');
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: ar.sales.recordCollection,
      }),
    );

    expect(document.querySelector('.inline-success')).toHaveTextContent(/500\.0000 ج\.م/);
    expect(idempotencyKey).toMatch(/^[0-9a-f-]{36}$/i);
    expect(requestBody).toMatchObject({
      customer_id: 101,
      treasury_account_id: 901,
      amount_egp: '1500.0000',
      allocations: [{ document_id: 701, amount_egp: '1000.0000' }],
    });
  }, 15000);
});
