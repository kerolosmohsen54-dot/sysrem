import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { server } from '../server';
import { ar } from '../../src/shared/i18n/ar';
import { CustomerDetailPage } from '../../src/features/customers/CustomerDetailPage';

vi.mock('../../src/shared/auth/AuthProvider', () => ({
  useAuth: () => ({ user: { permissions: ['*'] } }),
}));

const page = <T,>(data: T[]) => ({ data, meta: { current_page: 1, per_page: 10, total: data.length, last_page: 1 } });

function renderDetail() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/customers/99']}><Routes><Route element={<CustomerDetailPage />} path="/customers/:customerId" /></Routes></MemoryRouter></QueryClientProvider>);
}

describe('CustomerDetailPage record tabs', () => {
  it('distinguishes customer fields not recorded from fields missing in the server response', async () => {
    server.use(http.get('/api/v1/customers/99', () => HttpResponse.json({ data: {
      id: 99,
      name: 'Fixture customer',
      phone: '+20 12 72311223',
      email: null,
      address: null,
      salesperson: null,
      tax_number: null,
      payment_terms: null,
      governorate: null,
      notes: null,
      credit_limit: null,
      last_invoice_number: null,
      last_invoice_date: null,
      balance: { balance: '0.00', unapplied_receipts: '0.00' },
      is_active: true,
      status: 'active',
    } })));
    renderDetail();

    expect(await screen.findByRole('heading', { name: 'Fixture customer' })).toBeVisible();
    expect(screen.getByText('+20 12 72311223').closest('bdi')).toHaveAttribute('dir', 'ltr');
    expect(screen.getAllByText(ar.customers.notRecorded)).toHaveLength(7);
    expect(screen.getAllByText(ar.customers.noInvoicesRecorded)).toHaveLength(2);
    expect(screen.getByText(ar.customers.creditLimitNotSet)).toBeVisible();
    expect(screen.queryByText(ar.common.notProvided)).not.toBeInTheDocument();
  });

  it('shows real API records and links each tab row to its detail route', async () => {
    server.use(
      http.get('/api/v1/customers/99', () => HttpResponse.json({ data: { id: 99, name: 'Fixture customer', phone: '01012345678', is_active: true, governorate: 'Cairo', balance: { balance: '25.00' } } })),
      http.get('/api/v1/orders', () => HttpResponse.json(page([{ id: 7, order_number: 'SO-FIX-7', customer_id: 99, customer_name: 'Fixture customer', order_date: '2026-10-01', requested_delivery_date: null, status: 'draft', total_egp: '25.00', subtotal: '25.00', discount_amount: '0.00', tax_amount: '0.00', salesperson_id: null, salesperson_name: null, warehouse_id: null, warehouse_name: null, currency_code: 'EGP', payment_method: 'cash', payment_terms: null, line_count: 1 }]))),
      http.get('/api/v1/invoices', () => HttpResponse.json(page([{ id: 8, document_number: 'INV-FIX-8', customer_id: 99, customer_name: 'Fixture customer', issue_date: '2026-10-02', due_date: null, total_amount: '25.00', paid_egp: '0.00', remaining_egp: '25.00', issuer_name_snapshot: 'MASTER', status: 'posted' }]))),
      http.get('/api/v1/collections', () => HttpResponse.json(page([{ id: 9, receipt_number: 'COL-FIX-9', customer_id: 99, customer_name: 'Fixture customer', treasury_account_id: 1, receipt_date: '2026-10-03', amount: '5.00', allocated_egp: '5.00', unapplied_amount: '0.00' }]))),
      http.get('/api/v1/reports/customers/99/statement', () => HttpResponse.json({ ...page([
        { id: 8, document_type: 'invoice', reference: 'INV-FIX-8', document_date: '2026-10-02', description: null, debit_egp: '25.00', credit_egp: '0.00', unallocated_egp: '0.00' },
        { id: 117, document_type: 'opening_receivable', reference: 'OB-FIX-117', document_date: '2026-10-03', description: null, debit_egp: '0.00', credit_egp: '4.00', unallocated_egp: '0.00' },
      ]), summary: { current_balance_egp: '21.00', unallocated_collections_egp: '0.00' } })),
      http.get('/api/v1/customers/99/attachments', () => HttpResponse.json({ data: [{ id: 10, customer_id: 99, original_name: 'account.pdf', mime_type: 'application/pdf', size_bytes: 100, created_at: '2026-10-04T10:00:00Z', content_url: '/api/v1/customers/99/attachments/10/content' }] })),
    );
    renderDetail();
    expect(await screen.findByRole('heading', { name: 'Fixture customer' })).toBeVisible();
    expect(screen.getByText('01012345678').closest('bdi')).toHaveAttribute('dir', 'ltr');

    fireEvent.click(screen.getByRole('tab', { name: 'الطلبات' }));
    await waitFor(() => expect(screen.getAllByRole('link', { name: 'SO-FIX-7' })[0]).toHaveAttribute('href', '/orders/7'));
    fireEvent.click(screen.getByRole('tab', { name: 'الفواتير' }));
    await waitFor(() => expect(screen.getAllByRole('link', { name: 'INV-FIX-8' })[0]).toHaveAttribute('href', '/invoices/8'));
    fireEvent.click(screen.getByRole('tab', { name: 'المدفوعات' }));
    await waitFor(() => expect(screen.getAllByRole('link', { name: 'COL-FIX-9' })[0]).toHaveAttribute('href', '/collections?customer_id=99&receipt=9'));
    fireEvent.click(screen.getByRole('tab', { name: 'كشف الحساب' }));
    await waitFor(() => expect(screen.getAllByRole('link', { name: 'INV-FIX-8' })[0]).toHaveAttribute('href', '/invoices/8'));
    expect(screen.getAllByText(ar.customers.documentTypes.opening_receivable)).not.toHaveLength(0);
    fireEvent.click(screen.getByRole('tab', { name: 'المرفقات' }));
    expect(await screen.findByText('account.pdf')).toBeVisible();
    await waitFor(() => expect(screen.getByRole('link', { name: 'تحميل' })).toHaveAttribute('href', '/api/v1/customers/99/attachments/10/content?disposition=attachment'));
  });

  it('posts an opening balance and refreshes the customer account', async () => {
    let posted: Record<string, unknown> | undefined;
    server.use(
      http.get('/api/v1/customers/99', () => HttpResponse.json({ data: { id: 99, name: 'Fixture customer', phone: '01012345678', is_active: true, status: 'active', governorate: 'Cairo', notes: null, balance: { balance: '25.00' } } })),
      http.post('/api/v1/customers/99/opening-balance', async ({ request }) => {
        posted = await request.json() as Record<string, unknown>;
        return HttpResponse.json({ data: { id: 117, document_type: 'opening_receivable' } }, { status: 201 });
      }),
    );
    renderDetail();
    const user = userEvent.setup();
    await screen.findByRole('heading', { name: 'Fixture customer' });
    await user.click(screen.getByRole('button', { name: ar.customers.openingBalance }));
    const dialog = screen.getByRole('dialog', { name: ar.customers.openingBalance });
    await user.selectOptions(within(dialog).getByLabelText(ar.customers.openingBalanceDirection), 'credit');
    const amountInput = dialog.querySelector<HTMLInputElement>('input[name="amount_egp"]');
    expect(amountInput).not.toBeNull();
    await user.type(amountInput as HTMLInputElement, '1250.50');
    const issueDate = dialog.querySelector<HTMLInputElement>('input[name="issue_date"]');
    expect(issueDate).not.toBeNull();
    fireEvent.change(issueDate as HTMLInputElement, { target: { value: '2026-11-10' } });
    await user.type(within(dialog).getByLabelText(ar.customers.notes), 'Opening credit');
    await user.click(within(dialog).getByRole('button', { name: ar.common.save }));

    await waitFor(() => expect(posted).toMatchObject({ direction: 'credit', amount_egp: '1250.50', issue_date: '2026-11-10', notes: 'Opening credit' }));
    expect(await screen.findByRole('status')).toHaveTextContent(ar.customers.openingBalanceSaved);
  });

});
