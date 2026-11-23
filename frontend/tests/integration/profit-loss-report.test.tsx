import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ProfitLossReportPage } from '../../src/features/reports/ProfitLossReportPage';
import { server } from '../server';

describe('posted-journal P&L report', () => {
  it('shows income statement balances and period comparison from the accounting statements endpoint', async () => {
    let requests = 0;
    server.use(http.get('/api/v1/accounting/statements', () => {
      requests += 1;
      return HttpResponse.json({ data: {
        period: { from_date: '2026-10-01', to_date: '2026-10-30' },
        income_statement: {
          revenues: [{ id: 1, code: '4000', name: 'Sales', amount: '100.00' }],
          expenses: [{ id: 2, code: '5000', name: 'Cost of sales', amount: '25.00' }],
          total_revenue: '100.00', total_expenses: '25.00', net_income: '75.00',
        },
        balance_sheet: { assets: [], liabilities: [], equity: [], total_assets: '0.00', total_liabilities: '0.00', total_equity: '0.00', difference: '0.00', is_balanced: true },
        cash_flow: { accounts: [], opening_balance: '0.00', inflows: '0.00', outflows: '0.00', net_cash_flow: '0.00', closing_balance: '0.00' },
      } });
    }));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<MemoryRouter><QueryClientProvider client={client}><ProfitLossReportPage /></QueryClientProvider></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'تقرير الأرباح والخسائر P&L' })).toBeVisible();
    expect(await screen.findAllByText('100.00 ج.م')).not.toHaveLength(0);
    expect(await screen.findAllByText('25.00 ج.م')).not.toHaveLength(0);
    expect(await screen.findAllByText('75.00 ج.م')).not.toHaveLength(0);
    expect(requests).toBe(2);
  });
});
