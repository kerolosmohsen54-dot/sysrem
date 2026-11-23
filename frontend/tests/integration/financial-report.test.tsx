import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { FinancialReportPage } from '../../src/features/reports/FinancialReportPage';
import { ar } from '../../src/shared/i18n/ar';
import { server } from '../server';

describe('financial statements report', () => {
  it('reads period statements from posted accounting entries', async () => {
    let requested = false;
    server.use(http.get('/api/v1/accounting/statements', () => {
      requested = true;
      return HttpResponse.json({ data: {
        period: { from_date: '2026-10-01', to_date: '2026-10-14' },
        income_statement: { revenues: [], expenses: [], total_revenue: '25.50', total_expenses: '5.00', net_income: '20.50' },
        balance_sheet: { assets: [], liabilities: [], equity: [], total_assets: '7.00', total_liabilities: '0.00', total_equity: '7.00', difference: '0.00', is_balanced: true },
        cash_flow: { accounts: [], opening_balance: '7.00', inflows: '0.00', outflows: '0.00', net_cash_flow: '0.00', closing_balance: '7.00' },
      } });
    }));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<MemoryRouter><QueryClientProvider client={client}><FinancialReportPage /></QueryClientProvider></MemoryRouter>);

    expect(await screen.findByRole('heading', { level: 1, name: ar.finance.financialReport })).toBeVisible();
    expect(requested).toBe(true);
    expect(await screen.findByText('25.50 ج.م')).toBeVisible();
    expect(await screen.findByText('20.50 ج.م')).toBeVisible();
    expect(await screen.findByRole('tab', { name: 'قائمة الدخل' })).toBeVisible();
    const cashFlowTab = await screen.findByRole('tab', { name: 'التدفقات النقدية' });
    expect(cashFlowTab).toBeVisible();
    fireEvent.click(cashFlowTab);
    expect(cashFlowTab).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByText('الرصيد الافتتاحي')).toBeVisible();
  });
});
