import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { ReturnsPage } from '../../src/features/sales/ReturnsPage';
import { ar } from '../../src/shared/i18n/ar';
import { server } from '../server';

describe('returns list screen', () => {
  it('renders the server empty state and exposes return creation', async () => {
    server.use(http.get('/api/v1/returns', () => HttpResponse.json({ data: [], meta: { current_page: 1, per_page: 10, total: 0, last_page: 1 } })));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <MemoryRouter>
        <QueryClientProvider client={client}>
          <ReturnsPage />
        </QueryClientProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText(ar.common.noResults)).toBeVisible();
    expect(screen.getByRole('heading', { level: 1 })).toBeVisible();
    expect(screen.getByRole('button')).toBeVisible();
  });

  it('opens the invoice creation screen in return mode', async () => {
    server.use(http.get('/api/v1/returns', () => HttpResponse.json({ data: [], meta: { current_page: 1, per_page: 10, total: 0, last_page: 1 } })));
    const user = userEvent.setup();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <MemoryRouter initialEntries={['/returns']}>
        <QueryClientProvider client={client}>
          <Routes>
            <Route element={<ReturnsPage />} path="/returns" />
            <Route element={<p data-testid="return-form-route">Return form</p>} path="/returns/new" />
          </Routes>
        </QueryClientProvider>
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole('button'));
    expect(await screen.findByTestId('return-form-route')).toBeVisible();
  });
});
