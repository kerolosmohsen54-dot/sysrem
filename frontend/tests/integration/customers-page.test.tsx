import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { CustomerListPage } from '../../src/features/customers/CustomerListPage';
import { CustomerStatementPage } from '../../src/features/customers/CustomerStatementPage';
import { AuthProvider } from '../../src/shared/auth/AuthProvider';
import { ar } from '../../src/shared/i18n/ar';
import { server } from '../server';

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <AuthProvider>
          <CustomerListPage />
        </AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

function renderStatement() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={['/customers/102/statement']}>
      <QueryClientProvider client={client}>
        <AuthProvider>
          <Routes>
            <Route element={<CustomerStatementPage />} path="/customers/:customerId/statement" />
          </Routes>
        </AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('customer list screen', () => {
  it('shows the server-provided invoice totals, balance, and customer filters', async () => {
    server.use(http.get('/api/v1/auth/me', () => HttpResponse.json({ id: 1, username: 'owner-demo', name: 'Owner', role: 'owner', permissions: ['*'] })));
    renderPage();

    expect(await screen.findAllByText('شركة النور لاستيراد السيارات')).not.toHaveLength(0);
    expect(screen.getAllByText('7,800.00 ج.م')).not.toHaveLength(0);
    expect(screen.getAllByText('3,000.00 ج.م')).not.toHaveLength(0);
    expect(screen.getAllByText('4,800.00 ج.م')).not.toHaveLength(0);
    expect(screen.getByRole('searchbox', { name: 'ابحث بالاسم أو الهاتف أو المحافظة' })).toBeVisible();
    expect(screen.getByRole('combobox', { name: 'العملة' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'الكل' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'نشط' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'موقوف' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'محظور' })).toBeVisible();
  });

  it('shows statement totals from the API and keeps unapplied collections distinct', async () => {
    renderStatement();

    expect(await screen.findByText('كشف الحساب — رقم العميل 102')).toBeVisible();
    expect(screen.getAllByText('3,500.00 ج.م')).not.toHaveLength(0);
    expect(screen.getAllByText('1,500.00 ج.م')).not.toHaveLength(0);
    expect(screen.getAllByText('تحصيلات غير مخصصة')).not.toHaveLength(0);
  });

  it('keeps customer statement filters available while their API requests refresh', async () => {
    const requests: URL[] = [];
    server.use(http.get('/api/v1/reports/customers/102/statement', ({ request }) => {
      requests.push(new URL(request.url));
      return HttpResponse.json({
        customer: { id: 102, name: 'Customer 102', phone: null },
        summary: { current_balance_egp: '3500.00', unallocated_collections_egp: '1500.00' },
        data: [],
        meta: { current_page: 1, last_page: 1, per_page: 10, total: 0 },
      });
    }));
    const user = userEvent.setup();
    renderStatement();

    const search = await screen.findByRole('searchbox', { name: ar.common.search });
    await user.type(search, 'INV-102');
    await waitFor(() => expect(search).toHaveValue('INV-102'));
    await waitFor(() => expect(requests.some((request) => request.searchParams.get('search') === 'INV-102')).toBe(true));

    const fromDate = screen.getByLabelText(ar.inventory.fromDate);
    const toDate = screen.getByLabelText(ar.inventory.toDate);
    await user.clear(search);
    fireEvent.change(fromDate, { target: { value: '2026-11-01' } });
    fireEvent.change(toDate, { target: { value: '2026-11-10' } });
    await waitFor(() => expect(requests.some((request) =>
      request.searchParams.get('from_date') === '2026-11-01'
      && request.searchParams.get('to_date') === '2026-11-10',
    )).toBe(true));
    expect(screen.getByLabelText(ar.inventory.fromDate)).toHaveValue('2026-11-01');
    expect(screen.getByLabelText(ar.inventory.toDate)).toHaveValue('2026-11-10');
    expect(screen.getByText(ar.customers.noStatementMovements)).toBeVisible();
  });

  it('creates a customer with only fields supported by the current input contract', async () => {
    server.use(
      http.get('/api/v1/auth/me', () =>
        HttpResponse.json({
          id: 1,
          username: 'owner-demo',
          name: 'مالك',
          role: 'owner',
          permissions: ['*'],
        }),
      ),
    );
    renderPage();
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole('button', { name: `${ar.common.add} ${ar.nav.customers}` }),
    );
    const dialog = screen.getByRole('dialog', { name: ar.customers.addTitle });
    await user.type(within(dialog).getByLabelText(/الاسم/), 'عميل جديد');
    await user.type(within(dialog).getByLabelText(ar.common.phone), '01000000000');
    await user.type(within(dialog).getByLabelText(ar.customers.creditLimit), '25000.00');
    await user.click(within(dialog).getByRole('button', { name: ar.common.save }));

    expect(await screen.findAllByText('عميل جديد')).not.toHaveLength(0);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  }, 10_000);

  it('moves a customer to the recycle bin through DELETE and removes it from the list', async () => {
    const customer = {
      id: 309,
      name: 'Archive test customer',
      phone: '01000000309',
      email: null,
      address: null,
      governorate: 'Ø§Ù„Ù‚Ø§Ù‡Ø±Ø©',
      credit_limit: null,
      is_active: true,
      status: 'active',
    };
    let archived = false;
    server.use(
      http.get('/api/v1/auth/me', () => HttpResponse.json({
        id: 1,
        username: 'owner-demo',
        name: 'Ù…Ø§Ù„Ùƒ',
        role: 'owner',
        permissions: ['*'],
      })),
      http.get('/api/v1/customers', () => HttpResponse.json({
        data: archived ? [] : [customer],
        meta: { current_page: 1, last_page: 1, per_page: 10, total: archived ? 0 : 1, customer_summary: { total_customers: archived ? 0 : 1, active_customers: archived ? 0 : 1 } },
      })),
      http.delete('/api/v1/customers/309', () => {
        archived = true;
        return HttpResponse.json({ data: { ...customer, is_active: false, status: 'paused' } });
      }),
    );
    renderPage();
    const user = userEvent.setup();
    await screen.findAllByText(customer.name);
    await user.click(screen.getAllByRole('button', { name: ar.common.delete })[0]);

    const dialog = screen.getByRole('dialog', { name: ar.customers.archiveTitle });
    expect(within(dialog).getByText(ar.customers.archiveDescription)).toBeVisible();
    await user.click(within(dialog).getByRole('button', { name: ar.common.delete }));

    await waitFor(() => expect(archived).toBe(true));
    await waitFor(() => expect(screen.queryAllByText(customer.name)).toHaveLength(0));
  });

  it('updates customer data through the contract PATCH route', async () => {
    server.use(
      http.get('/api/v1/auth/me', () =>
        HttpResponse.json({
          id: 1,
          username: 'owner-demo',
          name: 'مالك',
          role: 'owner',
          permissions: ['*'],
        }),
      ),
    );
    renderPage();
    const user = userEvent.setup();
    await user.click(
      await screen.findAllByRole('button', { name: ar.common.edit }).then((buttons) => buttons[0]),
    );

    const dialog = screen.getByRole('dialog', { name: ar.customers.editTitle });
    const name = within(dialog).getByLabelText(/الاسم/);
    await user.clear(name);
    await user.type(name, 'شركة النور - محدث');
    await user.click(within(dialog).getByRole('button', { name: ar.common.save }));

    expect(await screen.findAllByText('شركة النور - محدث')).not.toHaveLength(0);
  });

  it('preserves customer notes and blocked status when editing profile fields', async () => {
    const customer = {
      id: 712, name: 'Blocked fixture', phone: '01000000712', email: null, address: null,
      salesperson: null, tax_number: null, payment_terms: null, governorate: 'Cairo',
      credit_limit: null, notes: 'Keep this note', is_active: false, status: 'blocked',
    };
    let saved: typeof customer = customer;
    let updateBody: Record<string, unknown> | undefined;
    server.use(
      http.get('/api/v1/auth/me', () => HttpResponse.json({ id: 1, username: 'owner-demo', name: 'Owner', role: 'owner', permissions: ['*'] })),
      http.get('/api/v1/customers', () => HttpResponse.json({ data: [saved], meta: { current_page: 1, last_page: 1, per_page: 10, total: 1, customer_summary: { total_customers: 1, active_customers: 0 } } })),
      http.patch('/api/v1/customers/712', async ({ request }) => {
        updateBody = await request.json() as Record<string, unknown>;
        saved = { ...saved, ...updateBody } as typeof customer;
        return HttpResponse.json({ data: saved });
      }),
    );
    renderPage();
    const user = userEvent.setup();
    await screen.findAllByText('Blocked fixture');
    await user.click(screen.getAllByRole('button', { name: ar.common.edit })[0]);
    const dialog = screen.getByRole('dialog', { name: ar.customers.editTitle });
    expect(within(dialog).getByLabelText(ar.customers.notes)).toHaveValue('Keep this note');
    expect(within(dialog).getByLabelText(ar.common.status)).toHaveValue('blocked');
    await user.clear(within(dialog).getByLabelText(/الاسم/));
    await user.type(within(dialog).getByLabelText(/الاسم/), 'Blocked fixture updated');
    await user.click(within(dialog).getByRole('button', { name: ar.common.save }));

    await waitFor(() => expect(updateBody).toMatchObject({ notes: 'Keep this note', status: 'blocked' }));
    expect(updateBody).not.toHaveProperty('is_active');
  });
});
