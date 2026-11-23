import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/app/App';
import { AppProviders, queryClient } from '../../src/app/providers';
import { sessionStore } from '../../src/shared/auth/sessionStore';
import { ar } from '../../src/shared/i18n/ar';
import { server } from '../server';

function owner() {
  queryClient.clear();
  const user = { id: 1, username: 'owner', name: 'Owner', role: 'owner', permissions: ['*', 'shipping_drivers.view', 'shipping_drivers.manage', 'trash.view', 'trash.restore'] };
  sessionStore.setUser(user);
  server.use(http.get('/api/v1/auth/me', () => HttpResponse.json(user)));
}
function renderAt(path: string) { return render(<MemoryRouter initialEntries={[path]}><AppProviders><App /></AppProviders></MemoryRouter>); }

describe('shipping drivers live integration', () => {
  it('loads and creates a driver through the API', async () => {
    owner();
    let rows: { id: number; name: string; shipping_company: string | null; is_active: boolean }[] = [];
    server.use(
      http.get('/api/v1/drivers', () => HttpResponse.json({ data: rows, meta: { current_page: 1, per_page: 50, total: rows.length, last_page: 1 } })),
      http.post('/api/v1/drivers', async ({ request }) => { const body = await request.json() as { name: string; shipping_company: string | null }; expect(body).toEqual({ name: 'Amin', shipping_company: 'Fast Ship' }); const created = { id: 3, ...body, is_active: true }; rows = [created]; return HttpResponse.json({ data: created }, { status: 201 }); }),
    );
    renderAt('/admin/drivers');
    await screen.findByRole('heading', { name: 'سائقو شركة الشحن' }, { timeout: 10_000 });
    const user = userEvent.setup();
    fireEvent.change(screen.getByLabelText(ar.common.name), { target: { value: 'Amin' } });
    fireEvent.change(screen.getByLabelText('شركة الشحن'), { target: { value: 'Fast Ship' } });
    await user.click(screen.getByRole('button', { name: ar.common.add }));
    expect((await screen.findAllByText('Amin')).length).toBeGreaterThan(0);
  });
  it('renders a clear 403 state', async () => {
    owner(); server.use(http.get('/api/v1/drivers', () => HttpResponse.json({ error: { code: 'FORBIDDEN', details: {} } }, { status: 403 })));
    renderAt('/admin/drivers');
    expect((await screen.findAllByText(ar.common.permissionDenied)).length).toBeGreaterThan(0);
  });
  it('renders driver validation details', async () => {
    owner(); server.use(http.get('/api/v1/drivers', () => HttpResponse.json({ data: [], meta: { current_page: 1, per_page: 50, total: 0, last_page: 1 } })), http.post('/api/v1/drivers', () => HttpResponse.json({ error: { code: 'VALIDATION_FAILED', details: { name: ['Already exists'] } } }, { status: 422 })));
    renderAt('/admin/drivers'); await screen.findByRole('heading', { name: 'سائقو شركة الشحن' });
    const user = userEvent.setup(); fireEvent.change(screen.getByLabelText(ar.common.name), { target: { value: 'Amin' } });
    await user.click(screen.getByRole('button', { name: ar.common.add }));
    expect((await screen.findAllByRole('alert')).some((alert) => /[\u0600-\u06FF]/u.test(alert.textContent ?? ''))).toBe(true);
  });
});

describe('recycle bin restore integration', () => {
  it('loads archived records and restores one through the API', async () => {
    owner(); let restored = false;
    server.use(
      http.get('/api/v1/admin/trash', () => HttpResponse.json({ data: restored ? [] : [{ id: 5, entity_type: 'customer', entity_id: 8, label: 'Archived Customer', deleted_at: '2026-10-13T12:00:00Z', snapshot: {} }], meta: { current_page: 1, per_page: 50, total: restored ? 0 : 1, last_page: 1 } })),
      http.post('/api/v1/admin/trash/5/restore', () => { restored = true; return HttpResponse.json({ data: { id: 5, entity_type: 'customer', entity_id: 8, status: 'restored' } }); }),
    );
    renderAt('/admin/trash'); expect((await screen.findAllByText('Archived Customer')).length).toBeGreaterThan(0);
    await userEvent.setup().click((await screen.findAllByRole('button', { name: 'استعادة' }))[0]);
    expect((await screen.findAllByText(ar.common.noResults)).length).toBeGreaterThan(0);
  });
  it('shows a clear 403 state', async () => {
    owner(); server.use(http.get('/api/v1/admin/trash', () => HttpResponse.json({ error: { code: 'FORBIDDEN', details: {} } }, { status: 403 })));
    renderAt('/admin/trash'); expect((await screen.findAllByText(ar.common.permissionDenied)).length).toBeGreaterThan(0);
  });
  it('shows an API conflict when restore is rejected', async () => {
    owner(); server.use(http.get('/api/v1/admin/trash', () => HttpResponse.json({ data: [{ id: 5, entity_type: 'customer', entity_id: 8, label: 'Archived Customer', deleted_at: '2026-10-13T12:00:00Z', snapshot: {} }], meta: { current_page: 1, per_page: 50, total: 1, last_page: 1 } })), http.post('/api/v1/admin/trash/5/restore', () => HttpResponse.json({ error: { code: 'HTTP_ERROR', details: {} } }, { status: 409 })));
    renderAt('/admin/trash'); await screen.findAllByText('Archived Customer'); await userEvent.setup().click((await screen.findAllByRole('button', { name: 'استعادة' }))[0]);
    expect((await screen.findAllByText(ar.common.conflict)).length).toBeGreaterThan(0);
  });
});
