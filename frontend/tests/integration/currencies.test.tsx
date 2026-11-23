import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/app/App';
import { AppProviders, queryClient } from '../../src/app/providers';
import { sessionStore } from '../../src/shared/auth/sessionStore';
import { ar } from '../../src/shared/i18n/ar';
import { server } from '../server';

const owner = { id: 1, username: 'owner', name: 'Owner', role: 'owner', permissions: ['*', 'currencies.view', 'currencies.manage'] };
const readOnly = { id: 2, username: 'reader', name: 'Reader', role: 'read_only', permissions: ['currencies.view'] };
const emptyPage = { data: [], meta: { current_page: 1, last_page: 1, per_page: 100, total: 0 } };

function prepare(user = owner) {
  queryClient.clear();
  sessionStore.setUser(user);
  server.use(http.get('/api/v1/auth/me', () => HttpResponse.json(user)));
}

function renderCurrencies() {
  return render(<MemoryRouter initialEntries={['/finance/currencies']}><AppProviders><App /></AppProviders></MemoryRouter>);
}

describe('currency reference catalog', () => {
  it('creates a currency through HTTP and shows it after the list reloads', async () => {
    prepare();
    let records: Array<{ id: number; code: string; name: string; symbol: string | null; decimal_places: number; is_active: boolean }> = [];
    server.use(
      http.get('/api/v1/currencies', () => HttpResponse.json({ ...emptyPage, data: records, meta: { ...emptyPage.meta, total: records.length } })),
      http.post('/api/v1/currencies', async ({ request }) => {
        const input = await request.json() as Omit<(typeof records)[number], 'id' | 'is_active'>;
        const saved = { ...input, id: 1, is_active: true };
        records = [...records, saved];
        return HttpResponse.json({ data: saved }, { status: 201 });
      }),
    );
    renderCurrencies();
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/رمز العملة/), 'USD');
    await user.type(screen.getByLabelText(new RegExp(ar.common.name)), 'US dollar');
    await user.type(screen.getByLabelText('الرمز'), '$');
    await user.clear(screen.getByLabelText(/المنازل العشرية/));
    await user.type(screen.getByLabelText(/المنازل العشرية/), '2');
    await user.click(screen.getByRole('button', { name: ar.common.save }));
    expect((await screen.findAllByText('USD')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('US dollar').length).toBeGreaterThan(0);
    expect(screen.getAllByText('$').length).toBeGreaterThan(0);
    expect(records[0]).toMatchObject({ code: 'USD', decimal_places: 2, is_active: true });
  });

  it('shows references to a read-only user without write controls', async () => {
    prepare(readOnly);
    server.use(http.get('/api/v1/currencies', () => HttpResponse.json({ ...emptyPage, data: [{ id: 3, code: 'EUR', name: 'Euro', symbol: 'EUR', decimal_places: 2, is_active: true }], meta: { ...emptyPage.meta, total: 1 } })));
    renderCurrencies();
    expect((await screen.findAllByText('EUR')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Euro').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: ar.common.save })).not.toBeInTheDocument();
  });
});
