import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app/App';
import { GovernoratesPage } from '../../src/features/customers/GovernoratesPage';
import { AppProviders, queryClient } from '../../src/app/providers';
import { sessionStore } from '../../src/shared/auth/sessionStore';
import { ar } from '../../src/shared/i18n/ar';
import { server } from '../server';

function owner() {
  queryClient.clear();
  sessionStore.setUser({ id: 1, username: 'owner', name: 'Owner', role: 'owner', permissions: ['*', 'governorates.view', 'governorates.manage'] });
  server.use(http.get('/api/v1/auth/me', () => HttpResponse.json({ id: 1, username: 'owner', name: 'Owner', role: 'owner', permissions: ['*', 'governorates.view', 'governorates.manage'] })));
}

function renderPage() { return render(<MemoryRouter initialEntries={['/admin/governorates']}><AppProviders><App /></AppProviders></MemoryRouter>); }

describe('governorates live integration', () => {
  it('loads the catalog and creates a governorate through the API', async () => {
    owner();
    let rows = [{ id: 2, name: 'Cairo', sort_order: 1, is_active: true, customers_count: 3 }];
    server.use(
      http.get('/api/v1/reference/governorates', () => HttpResponse.json({ data: rows, meta: { current_page: 1, per_page: 100, total: rows.length, last_page: 1 } })),
      http.post('/api/v1/reference/governorates', async ({ request }) => {
        const body = await request.json() as { name: string };
        expect(body.name).toBe('Giza');
        rows = [...rows, { id: 3, name: body.name, sort_order: 2, is_active: true, customers_count: 0 }];
        return HttpResponse.json({ data: rows[1] }, { status: 201 });
      }),
    );
    renderPage();
    expect((await screen.findAllByText('Cairo')).length).toBeGreaterThan(0);
    const user = userEvent.setup();
    fireEvent.change(screen.getByLabelText('اسم محافظة جديدة'), { target: { value: 'Giza' } });
    await user.click(screen.getByRole('button', { name: 'إضافة' }));
    expect((await screen.findAllByText('Giza')).length).toBeGreaterThan(0);
  });

  it('renames the province, moves delete to trash, and hides it from the active list', async () => {
    owner();
    let rows = [{ id: 4, name: 'Cairo edit fixture', sort_order: 1, is_active: true, customers_count: 2 }];
    server.use(
      http.get('/api/v1/reference/governorates', () => HttpResponse.json({ data: rows.filter((row) => row.is_active), meta: { current_page: 1, per_page: 100, total: rows.filter((row) => row.is_active).length, last_page: 1 } })),
      http.patch('/api/v1/reference/governorates/4', async ({ request }) => {
        const input = await request.json() as { name?: string; is_active?: boolean };
        rows = rows.map((row) => row.id === 4 ? { ...row, ...input } : row);
        return HttpResponse.json({ data: rows[0] });
      }),
      http.delete('/api/v1/reference/governorates/4', () => {
        rows = rows.map((row) => ({ ...row, is_active: false }));
        return HttpResponse.json({ data: rows[0] });
      }),
    );
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderPage();
    const user = userEvent.setup();
    expect((await screen.findAllByText('Cairo edit fixture')).length).toBeGreaterThan(0);
    await user.click(screen.getAllByRole('button', { name: 'تعديل Cairo edit fixture' })[0]);
    const name = screen.getAllByRole('textbox', { name: /Cairo edit fixture/ })[0];
    await user.clear(name);
    await user.type(name, 'القاهرة المعدلة');
    await user.click(screen.getAllByRole('button', { name: ar.common.save })[0]);
    await screen.findAllByText('القاهرة المعدلة');
    await user.click(screen.getAllByRole('button', { name: /\u062D\u0630\u0641/ })[0]);
    await waitFor(() => expect(screen.queryAllByText('القاهرة المعدلة')).toHaveLength(0));
    expect(window.confirm).toHaveBeenCalledWith('نقل المحافظة «القاهرة المعدلة» إلى سلة المحذوفات؟');
    vi.restoreAllMocks();
  });

  it('shows a no-permission state for a 403 response', async () => {
    owner();
    server.use(http.get('/api/v1/reference/governorates', () => HttpResponse.json({ error: { code: 'FORBIDDEN', details: {} } }, { status: 403 })));
    render(<AppProviders><GovernoratesPage /></AppProviders>);
    expect((await screen.findAllByText(ar.common.permissionDenied, {}, { timeout: 5000 })).length).toBeGreaterThan(0);
  });

  it('shows validation details returned by the API', async () => {
    owner();
    server.use(
      http.get('/api/v1/reference/governorates', () => HttpResponse.json({ data: [], meta: { current_page: 1, per_page: 100, total: 0, last_page: 1 } })),
      http.post('/api/v1/reference/governorates', () => HttpResponse.json({ error: { code: 'VALIDATION_FAILED', details: { name: ['Name already exists'] } } }, { status: 422 })),
    );
    renderPage();
    await screen.findByRole('heading', { name: 'المحافظات' });
    const user = userEvent.setup();
    fireEvent.change(screen.getByLabelText('اسم محافظة جديدة'), { target: { value: 'Cairo' } });
    await user.click(screen.getByRole('button', { name: 'إضافة' }));
    expect((await screen.findAllByRole('alert')).some((alert) => /[\u0600-\u06FF]/u.test(alert.textContent ?? ''))).toBe(true);
  });
});
