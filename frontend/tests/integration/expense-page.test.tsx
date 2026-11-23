import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { ExpensePage } from '../../src/features/finance/ExpensePage';
import { AuthProvider } from '../../src/shared/auth/AuthProvider';
import { sessionStore } from '../../src/shared/auth/sessionStore';
import { ar } from '../../src/shared/i18n/ar';
import { server } from '../server';

function page<T>(data: T[]) {
  return { data, meta: { current_page: 1, per_page: 100, total: data.length, last_page: 1 } };
}

describe('expense screen', () => {
  it('uses the boolean query format accepted by the expense-category API', async () => {
    const user = { id: 1, username: 'owner-demo', name: 'Owner', role: 'owner', permissions: ['*'] };
    sessionStore.setUser(user);
    let activeFilter: string | null = null;
    server.use(
      http.get('/api/v1/auth/me', () => HttpResponse.json(user)),
      http.get('/api/v1/expenses', () => HttpResponse.json(page([]))),
      http.get('/api/v1/treasury/accounts', () => HttpResponse.json(page([
        { id: 1, code: 'CASH', name: 'Cash', account_type: 'cash', notes: null, is_active: true },
      ]))),
      http.get('/api/v1/expense-categories', ({ request }) => {
        activeFilter = new URL(request.url).searchParams.get('is_active');
        if (activeFilter !== '1') {
          return HttpResponse.json({ error: { code: 'VALIDATION_FAILED' } }, { status: 422 });
        }
        return HttpResponse.json(page([{ id: 7, name: 'Test category', is_active: true }]));
      }),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <AuthProvider>
          <ExpensePage />
        </AuthProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('heading', { name: ar.finance.expenses })).toBeVisible();
    expect(screen.getByRole('heading', { name: ar.finance.recordExpense })).toBeVisible();
    expect(screen.getByRole('option', { name: 'Test category' })).toBeInTheDocument();
    expect(activeFilter).toBe('1');
  });
});