import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { CashForecastPage, MonthlyComparisonPage, PartnerInstallmentsPage, PendingFundsPage } from '../../src/features/finance/FinancialPlanningPages';
import { AuthProvider } from '../../src/shared/auth/AuthProvider';
import { sessionStore } from '../../src/shared/auth/sessionStore';
import { server } from '../server';

function renderPage(node: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<MemoryRouter><QueryClientProvider client={client}>{node}</QueryClientProvider></MemoryRouter>);
}

describe('financial planning reports', () => {
  it('renders zero month comparisons without a percentage baseline', async () => {
    server.use(http.get('/api/v1/finance-reports/monthly-comparison', () => HttpResponse.json({ data: {
      month_a: '2040-01', month_b: '2040-02', periods: { a: { from_date: '2040-01-01', to_date: '2040-01-31' }, b: { from_date: '2040-02-01', to_date: '2040-02-29' } },
      metrics: {
        sales: { month_a: '0.00', month_b: '0.00', difference: '0.00', change_percent: null },
        expenses: { month_a: '0.00', month_b: '0.00', difference: '0.00', change_percent: null },
        profit: { month_a: '0.00', month_b: '0.00', difference: '0.00', change_percent: null },
      },
    } })));
    renderPage(<MonthlyComparisonPage />);
    expect(await screen.findAllByText('لا توجد قيمة أساس للمقارنة')).toHaveLength(3);
    expect(screen.getByText((_, element) => element?.tagName === 'BDI' && element.textContent?.includes('2040-01-01') === true)).toBeInTheDocument();
  });

  it('shows expected fund source and partner installments beside weekly forecast totals', async () => {
    server.use(http.get('/api/v1/finance-reports/cash-forecast', () => HttpResponse.json({ data: {
      as_of: '2026-10-30', actual_opening_balance: '1000.00', projected_closing_balance: '1125.00', weeks: [{
        index: 1, from_date: '2026-10-30', to_date: '2026-11-05', actual_inflows: '20.00', actual_outflows: '0.00',
        pending_funds: '100.00', partner_installments: '30.00', recurring_expenses: '15.00', budgeted_expenses: '10.00',
        net_flow: '125.00', projected_closing_balance: '1125.00',
        sources: {
          pending_funds: [{ type: 'pending_fund', id: 2, source: 'تحويل شريك', due_date: '2026-11-01', amount: '100.00' }],
          partner_installments: [{ type: 'partner_installment', id: 4, plan_id: 3, due_date: '2026-11-02', amount: '30.00' }],
          recurring_expenses: [{ type: 'recurring_expense', id: 5, due_date: '2026-11-03', amount: '15.00' }],
        },
      }],
    } })));
    renderPage(<CashForecastPage />);
    expect(await screen.findByText(/تحويل شريك/)).toBeInTheDocument();
    expect(screen.getByText(/خطة 3/)).toBeInTheDocument();
    expect(screen.getByText('الأموال المنتظرة')).toBeInTheDocument();
  });
});

describe('container partner contribution workflow', () => {
  it('creates a container partner, saves its contribution plan, and links both records', async () => {
    const user = { id: 1, username: 'owner', name: 'Owner', role: 'owner', permissions: ['*'] };
    sessionStore.setUser(user);
    let containerPartners: { id: number; name: string; phone: string | null; status: 'active' }[] = [];
    let plans: Record<string, unknown>[] = [];
    let partnerPayload: unknown;
    let planPayload: unknown;
    const paymentPayloads: unknown[] = [];
    const paymentKeys: string[] = [];
    let paymentAttempts = 0;
    server.use(
      http.get('/api/v1/auth/me', () => HttpResponse.json(user)),
      http.get('/api/v1/partner-installment-plans', () => HttpResponse.json({ data: plans, meta: { current_page: 1, per_page: 20, total: plans.length, last_page: 1 } })),
      http.get('/api/v1/finance-planning-options', () => HttpResponse.json({ data: { partners: [], treasury: [{ id: 7, code: 'CASH', name: 'Cash', account_type: 'cash', is_active: true }], categories: [] } })),
      http.get('/api/v1/container-partners', () => HttpResponse.json({ data: containerPartners })),
      http.post('/api/v1/container-partners', async ({ request }) => {
        partnerPayload = await request.json();
        containerPartners = [{ id: 9, name: 'Investor A', phone: '+201000000000', status: 'active' }];
        return HttpResponse.json({ data: containerPartners[0] }, { status: 201 });
      }),
      http.get('/api/v1/containers', () => HttpResponse.json({ data: [{ id: 11, container_name: 'Container A', container_number: 'C-11' }], meta: { current_page: 1, per_page: 100, total: 1, last_page: 1 } })),
      http.post('/api/v1/partner-installment-plans', async ({ request }) => {
        planPayload = await request.json();
        const created = {
          id: 31, partner_id: null, partner_name: 'Investor A', container_partner_id: 9, container_partner_name: 'Investor A',
          container_id: 11, container_number: 'C-11', reference: 'INVEST-31', total_amount: '1000.00', installment_amount: '250.00',
          contribution_mode: 'scheduled', first_due_date: '2026-10-31', status: 'active', paid_amount: '0.00', remaining_amount: '1000.00', overdue_amount: '0.00',
          next_installment: { id: 41, due_date: '2026-10-31', amount: '250.00' }, installments: [{ id: 41, sequence_number: 1, due_date: '2026-10-31', amount: '250.00', paid_amount: '0.00', remaining_amount: '250.00', status: 'overdue' }], payments: [],
        };
        plans = [created];
        return HttpResponse.json({ data: created }, { status: 201 });
      }),
      http.post('/api/v1/partner-installment-plans/31/payments', async ({ request }) => {
        paymentPayloads.push(await request.json());
        paymentKeys.push(request.headers.get('Idempotency-Key') ?? '');
        paymentAttempts++;
        if (paymentAttempts === 1) return HttpResponse.json({ error: { code: 'TEMPORARY_FAILURE', message: 'Temporary network error' } }, { status: 503 });
        const plan = plans[0];
        plan.paid_amount = '100.00'; plan.remaining_amount = '900.00';
        plan.payments = [{ id: 51, amount: '100.00', payment_date: '2026-10-31', treasury_account_id: 7, treasury_entry_id: 61, notes: null }];
        return HttpResponse.json({ data: plan });
      }),
    );

    const userActions = userEvent.setup();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<MemoryRouter><QueryClientProvider client={client}><AuthProvider><PartnerInstallmentsPage /></AuthProvider></QueryClientProvider></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'شركاء الحاوية' })).toBeInTheDocument();
    await screen.findByRole('option', { name: 'Container A' });
    await userActions.type(document.querySelector('input[name="container_partner_name"]') as HTMLInputElement, 'Investor A');
    await userActions.type(document.querySelector('input[name="container_partner_phone"]') as HTMLInputElement, '+201000000000');
    await userActions.click(screen.getByRole('button', { name: 'تسجيل شريك الحاوية' }));
    await screen.findByRole('option', { name: 'Investor A' });

    await userActions.selectOptions(document.querySelector('select[name="container_partner_id"]') as HTMLSelectElement, '9');
    await userActions.selectOptions(document.querySelector('select[name="container_id"]') as HTMLSelectElement, '11');
    await userActions.type(document.querySelector('input[name="reference"]') as HTMLInputElement, 'INVEST-31');
    await userActions.type(document.querySelector('input[name="total_amount"]') as HTMLInputElement, '1000.00');
    await userActions.type(document.querySelector('input[name="installment_amount"]') as HTMLInputElement, '250.00');
    fireEvent.change(document.querySelector('input[name="first_due_date"]') as HTMLInputElement, { target: { value: '2026-10-31' } });
    await userActions.click(screen.getByRole('button', { name: 'حفظ إجمالي المساهمة' }));

    await screen.findByText(/تم تسجيل مساهمة Investor A/);
    expect(partnerPayload).toEqual({ name: 'Investor A', phone: '+201000000000' });
    expect(planPayload).toEqual({ container_partner_id: 9, container_id: 11, reference: 'INVEST-31', total_amount: '1000.00', contribution_mode: 'scheduled', installment_amount: '250.00', first_due_date: '2026-10-31' });
    const contributionRow = await screen.findByRole('row', { name: /INVEST-31/ });
    const paymentAmount = within(contributionRow).getByLabelText('مبلغ دفعة Investor A') as HTMLInputElement;
    fireEvent.change(paymentAmount, { target: { value: '100.00' } });
    expect(paymentAmount).toHaveValue('100.00');
    fireEvent.change(within(contributionRow).getByLabelText('تاريخ الدفعة'), { target: { value: '2026-10-31' } });
    await userActions.selectOptions(within(contributionRow).getByLabelText('حساب الخزينة'), '7');
    const paymentForm = within(contributionRow).getByRole('button', { name: 'استلام دفعة' }).closest('form');
    expect(paymentForm?.checkValidity()).toBe(true);
    fireEvent.submit(paymentForm as HTMLFormElement);
    expect(await screen.findByRole('alert')).toBeVisible();
    fireEvent.submit(paymentForm as HTMLFormElement);
    await screen.findByText(/تم تسجيل الدفع/);
    expect(paymentPayloads[1]).toMatchObject({ amount: '100.00', payment_date: '2026-10-31', treasury_account_id: 7 });
    expect(paymentPayloads[0]).toEqual(paymentPayloads[1]);
    expect(paymentKeys[0]).toBe(paymentKeys[1]);
    const paidRow = await screen.findByRole('row', { name: /INVEST-31/ });
    await userActions.click(within(paidRow).getByRole('button', { name: 'سجل الدفعات' }));
    expect(await within(paidRow).findAllByText(/100\.00/)).not.toHaveLength(0);
  });

  it('retries a pending-fund receipt with the same idempotency key after a temporary failure', async () => {
    const user = { id: 1, username: 'owner', name: 'Owner', role: 'owner', permissions: ['*'] };
    sessionStore.setUser(user);
    const keys: string[] = [];
    const payloads: unknown[] = [];
    let attempts = 0;
    server.use(
      http.get('/api/v1/auth/me', () => HttpResponse.json(user)),
      http.get('/api/v1/pending-funds', () => HttpResponse.json({ data: [{
        id: 7, partner_id: 3, partner_name: 'Investor A', source_label: 'Partner transfer', source_reference: 'WIRE-7', description: 'Expected transfer',
        due_date: '2026-10-31', amount: '100.00', received_amount: '0.00', remaining_amount: '100.00', status: 'pending',
      }] })),
      http.get('/api/v1/finance-planning-options', () => HttpResponse.json({ data: { partners: [], treasury: [{ id: 7, code: 'CASH', name: 'Cash', account_type: 'cash', is_active: true }], categories: [] } })),
      http.post('/api/v1/pending-funds/7/receive', async ({ request }) => {
        payloads.push(await request.json());
        keys.push(request.headers.get('Idempotency-Key') ?? '');
        attempts++;
        if (attempts === 1) return HttpResponse.json({ error: { code: 'TEMPORARY_FAILURE', message: 'Temporary network error' } }, { status: 503 });
        return HttpResponse.json({ data: {
          id: 7, partner_id: 3, partner_name: 'Investor A', source_label: 'Partner transfer', source_reference: 'WIRE-7', description: 'Expected transfer',
          due_date: '2026-10-31', amount: '100.00', received_amount: '40.00', remaining_amount: '60.00', status: 'partially_received',
        } });
      }),
    );

    const userActions = userEvent.setup();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<MemoryRouter><QueryClientProvider client={client}><AuthProvider><PendingFundsPage /></AuthProvider></QueryClientProvider></MemoryRouter>);
    await screen.findByRole('heading', { name: 'الأموال المنتظرة' });
    await userActions.click(await screen.findByRole('button', { name: 'استلام فعلي' }));
    await userActions.selectOptions(screen.getByRole('combobox', { name: 'الخزينة الفعلية' }), '7');
    fireEvent.submit(screen.getByRole('button', { name: 'تسجيل الاستلام الفعلي' }).closest('form') as HTMLFormElement);
    expect(await screen.findByRole('alert')).toBeVisible();
    fireEvent.submit(screen.getByRole('button', { name: 'تسجيل الاستلام الفعلي' }).closest('form') as HTMLFormElement);
    await waitFor(() => expect(attempts).toBe(2));
    expect(payloads[0]).toEqual(payloads[1]);
    expect(keys[0]).toBe(keys[1]);
  });
});
