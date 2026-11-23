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

function owner() { queryClient.clear(); const user = { id: 1, username: 'owner', name: 'Owner', role: 'owner', permissions: ['*', 'warehouse_returns.view', 'warehouse_returns.manage', 'damaged_stock.approve'] }; sessionStore.setUser(user); server.use(http.get('/api/v1/auth/me', () => HttpResponse.json(user)), http.get('/api/v1/warehouse-returns/candidates', () => HttpResponse.json({ data: [], meta: page }))); }
function renderAt(path: string) { return render(<MemoryRouter initialEntries={[path]}><AppProviders><App /></AppProviders></MemoryRouter>); }
const page = { current_page: 1, per_page: 20, total: 0, last_page: 1 };
const productPage = { data: [{ id: 7, sku: 'P7', name: 'Widget', category_id: null, unit_code: 'pcs', minimum_stock: null, is_active: true }], meta: { ...page, per_page: 100, total: 1 } };
const warehousePage = { data: [{ id: 4, code: 'W4', name: 'Main', location_type: 'main' as const, parent_location_id: null, is_active: true, notes: null }], meta: { ...page, per_page: 100, total: 1 } };

describe('warehouse returns live integration', () => {
  it('posts a source-linked return with the selected quantity and destination', async () => {
    owner();
    let posted = false;
    server.use(
      http.get('/api/v1/warehouse-returns', () => HttpResponse.json({ data: [], meta: page })),
      http.get('/api/v1/warehouse-returns/candidates', () => HttpResponse.json({ data: posted ? [] : [{ id: 31, product_id: 7, sku: 'P7', product_name: 'Widget', source_warehouse_id: 4, source_warehouse_name: 'Main', current_warehouse_id: null, current_warehouse_name: null, movement_type: 'sale', movement_date: '2026-10-13', movement_number: 'IM-31', source_reference: 'INV-31', issued_quantity: 5, returned_quantity: 1, available_quantity: 4 }], meta: page })),
      http.get('/api/v1/products', () => HttpResponse.json(productPage)),
      http.get('/api/v1/warehouses', () => HttpResponse.json(warehousePage)),
      http.post('/api/v1/warehouse-returns/from-movement', async ({ request }) => {
        const body = await request.json();
        expect(body).toMatchObject({ source_movement_line_id: 31, warehouse_id: 4, quantity: 2, return_condition: 'good' });
        posted = true;
        return HttpResponse.json({ data: { return: { id: 32, status: 'approved' } } }, { status: 201 });
      }),
    );
    renderAt('/warehouse-returns');
    const user = userEvent.setup();
    fireEvent.change((await screen.findAllByRole('spinbutton', { name: 'كمية مرتجع P7' }))[0], { target: { value: '2' } });
    await user.click(screen.getAllByRole('button', { name: 'اعتماد المرتجع' })[0]);
    expect((await screen.findAllByText(ar.common.actionSaved)).length).toBeGreaterThan(0);
  });
  it('loads the list and submits a draft with decimal strings', async () => {
    owner(); let returns: unknown[] = [];
    server.use(
      http.get('/api/v1/warehouse-returns', () => HttpResponse.json({ data: returns, meta: page })),
      http.get('/api/v1/products', () => HttpResponse.json(productPage)), http.get('/api/v1/warehouses', () => HttpResponse.json(warehousePage)),
      http.post('/api/v1/warehouse-returns', async ({ request }) => { const body = await request.json() as { warehouse_id: number; lines: { product_id: number; quantity: number; unit_cost_egp: string }[]; idempotency_key: string }; expect(body.warehouse_id).toBe(4); expect(body.lines[0].unit_cost_egp).toBe('12.50'); expect(body.idempotency_key).toBeTruthy(); const row = { id: 10, warehouse_id: 4, return_date: '2026-10-13', status: 'draft', reason: 'damage' }; returns = [row]; return HttpResponse.json({ data: { return: row } }, { status: 201 }); }),
    );
    renderAt('/warehouse-returns'); await screen.findByRole('heading', { name: 'مرتجعات المخازن' }); const user = userEvent.setup();
    await user.selectOptions(document.querySelector('form select[name="warehouse_id"]') as HTMLSelectElement, '4'); await user.selectOptions(document.querySelector('form .invoice-line-editor select') as HTMLSelectElement, '7');
    fireEvent.change(document.querySelector('input[name="return_date"]') as HTMLInputElement, { target: { value: '2026-10-13' } });
    fireEvent.change(document.querySelector('input[name^="quantity_"]') as HTMLInputElement, { target: { value: '2' } }); fireEvent.change(document.querySelector('input[name^="unit_cost_egp_"]') as HTMLInputElement, { target: { value: '12.50' } }); fireEvent.change(document.querySelector('input[name="reason"]') as HTMLInputElement, { target: { value: 'damage' } });
    await user.click(screen.getByRole('button', { name: ar.common.save })); expect((await screen.findAllByText('RET-10')).length).toBeGreaterThan(0);
  });
  it('shows a 403 permission state', async () => { owner(); server.use(http.get('/api/v1/warehouse-returns', () => HttpResponse.json({ error: { code: 'FORBIDDEN', details: {} } }, { status: 403 })), http.get('/api/v1/products', () => HttpResponse.json(productPage)), http.get('/api/v1/warehouses', () => HttpResponse.json(warehousePage))); renderAt('/warehouse-returns'); expect((await screen.findAllByText(ar.common.permissionDenied)).length).toBeGreaterThan(0); });
  it('shows validation details from error.details', async () => { owner(); server.use(http.get('/api/v1/warehouse-returns', () => HttpResponse.json({ data: [], meta: page })), http.get('/api/v1/products', () => HttpResponse.json(productPage)), http.get('/api/v1/warehouses', () => HttpResponse.json(warehousePage)), http.post('/api/v1/warehouse-returns', () => HttpResponse.json({ error: { code: 'VALIDATION_FAILED', details: { lines: ['Invalid'] } } }, { status: 422 }))); renderAt('/warehouse-returns'); await screen.findByRole('heading', { name: 'مرتجعات المخازن' }); const user = userEvent.setup(); await user.selectOptions(document.querySelector('form select[name="warehouse_id"]') as HTMLSelectElement, '4'); await user.selectOptions(document.querySelector('form .invoice-line-editor select') as HTMLSelectElement, '7'); fireEvent.change(document.querySelector('input[name="return_date"]') as HTMLInputElement, { target: { value: '2026-10-13' } }); fireEvent.change(document.querySelector('input[name^="quantity_"]') as HTMLInputElement, { target: { value: '1' } }); fireEvent.change(document.querySelector('input[name^="unit_cost_egp_"]') as HTMLInputElement, { target: { value: '2.00' } }); fireEvent.change(document.querySelector('input[name="reason"]') as HTMLInputElement, { target: { value: 'damage' } }); await user.click(screen.getByRole('button', { name: ar.common.save })); expect((await screen.findAllByRole('alert')).some((alert) => /[\u0600-\u06FF]/u.test(alert.textContent ?? ''))).toBe(true); });
});

describe('approved damaged stock live integration', () => {
  it('lists and registers an approved damaged stock record', async () => { owner(); server.use(http.get('/api/v1/approved-damaged-stock', () => HttpResponse.json({ data: [], meta: page })), http.get('/api/v1/products', () => HttpResponse.json(productPage)), http.get('/api/v1/warehouses', () => HttpResponse.json(warehousePage)), http.post('/api/v1/approved-damaged-stock', async ({ request }) => { const body = await request.json() as { product_id: number; warehouse_id: number; quantity: number; cost_egp: string }; expect(body).toMatchObject({ product_id: 7, warehouse_id: 4, quantity: 3, cost_egp: '6.20' }); return HttpResponse.json({ data: { item: { id: 21, ...body, status: 'approved', approved_at: '2026-10-13T12:00:00Z' } } }, { status: 201 }); })); renderAt('/inventory/damaged'); await screen.findByRole('heading', { name: 'المخزون التالف المعتمد' }); const user = userEvent.setup(); await user.selectOptions(screen.getAllByRole('combobox')[0], '7'); await user.selectOptions(screen.getAllByRole('combobox')[1], '4'); fireEvent.change(document.querySelector('input[name="quantity"]') as HTMLInputElement, { target: { value: '3' } }); fireEvent.change(document.querySelector('input[name="cost_egp"]') as HTMLInputElement, { target: { value: '6.20' } }); await user.click(screen.getByRole('button', { name: 'تسجيل الاعتماد' })); expect((await screen.findAllByText(ar.common.actionSaved)).length).toBeGreaterThan(0); });
  it('shows a 403 permission state', async () => { owner(); server.use(http.get('/api/v1/approved-damaged-stock', () => HttpResponse.json({ error: { code: 'FORBIDDEN', details: {} } }, { status: 403 })), http.get('/api/v1/products', () => HttpResponse.json(productPage)), http.get('/api/v1/warehouses', () => HttpResponse.json(warehousePage))); renderAt('/inventory/damaged'); expect((await screen.findAllByText(ar.common.permissionDenied)).length).toBeGreaterThan(0); });
  it('shows validation details from error.details', async () => { owner(); server.use(http.get('/api/v1/approved-damaged-stock', () => HttpResponse.json({ data: [], meta: page })), http.get('/api/v1/products', () => HttpResponse.json(productPage)), http.get('/api/v1/warehouses', () => HttpResponse.json(warehousePage)), http.post('/api/v1/approved-damaged-stock', () => HttpResponse.json({ error: { code: 'VALIDATION_FAILED', details: { cost_egp: ['Invalid'] } } }, { status: 422 }))); renderAt('/inventory/damaged'); await screen.findByRole('heading', { name: 'المخزون التالف المعتمد' }); const user = userEvent.setup(); await user.selectOptions(screen.getAllByRole('combobox')[0], '7'); await user.selectOptions(screen.getAllByRole('combobox')[1], '4'); fireEvent.change(document.querySelector('input[name="quantity"]') as HTMLInputElement, { target: { value: '3' } }); fireEvent.change(document.querySelector('input[name="cost_egp"]') as HTMLInputElement, { target: { value: '6.20' } }); await user.click(screen.getByRole('button', { name: 'تسجيل الاعتماد' })); expect((await screen.findAllByRole('alert')).some((alert) => /[\u0600-\u06FF]/u.test(alert.textContent ?? ''))).toBe(true); });
});
