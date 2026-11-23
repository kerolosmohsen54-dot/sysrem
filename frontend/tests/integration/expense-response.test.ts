import { describe, expect, it } from 'vitest';
import { listExpenses } from '../../src/features/finance/api';
import { server } from '../server';
import { http, HttpResponse } from 'msw';

describe('expense response adapter', () => {
  it('maps backend amount and category fields to the expense screen model', async () => {
    server.use(http.get('/api/v1/expenses', () => HttpResponse.json({
      data: [{
        id: 1,
        expense_number: 'EXP-1',
        status: 'posted',
        expense_date: '2026-10-15',
        expense_category_id: 7,
        treasury_account_id: 1,
        amount: '1.0000',
        description: 'E2E-TEST Expense',
        reference: 'E2E-TEST-EXPENSE-1',
        treasury_account_name: 'Cash',
        category_name: 'Test category',
      }],
      meta: { current_page: 1, per_page: 10, total: 1, last_page: 1 },
    })));

    const page = await listExpenses({ page: 1, perPage: 10, search: '' });

    expect(page.data[0]).toMatchObject({
      amount_egp: '1.0000',
      expense_category_name: 'Test category',
      description: 'E2E-TEST Expense',
    });
  });
});