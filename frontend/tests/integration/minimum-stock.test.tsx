import { fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { MinimumStockPage } from '../../src/features/inventory/AdvancedInventoryPages';
import { ar } from '../../src/shared/i18n/ar';
import { AuthProvider } from '../../src/shared/auth/AuthProvider';
import { server } from '../server';

const meta = { current_page: 1, last_page: 1, per_page: 20, total: 1 };
const product = { id: 7, sku: 'P7', name: 'Widget', category_id: null, unit_code: 'pcs', minimum_stock: '4', is_active: true };
const warehouse = { id: 4, code: 'W4', name: 'Main', location_type: 'main', parent_location_id: null, is_active: true, notes: null };
const productThreshold = { id: -7, threshold_scope: 'product', product_id: 7, sku: 'P7', product_name: 'Widget', warehouse_id: null, warehouse_code: null, warehouse_name: null, minimum_quantity: 4, quantity_on_hand: 3, available_quantity: 3, is_below_minimum: true, updated_at: '2026-11-11T00:00:00Z' };
const warehouseThreshold = { id: 51, threshold_scope: 'warehouse', product_id: 7, sku: 'P7', product_name: 'Widget', warehouse_id: 4, warehouse_code: 'W4', warehouse_name: 'Main', minimum_quantity: 5, quantity_on_hand: 3, available_quantity: 3, is_below_minimum: true, updated_at: '2026-11-11T00:00:00Z' };

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <AuthProvider><MinimumStockPage /></AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('minimum stock thresholds', () => {
  it('loads and updates a per-warehouse threshold through the inventory API', async () => {
    const owner = { id: 1, username: 'owner', name: 'Owner', role: 'owner', permissions: ['*'] };
    server.use(
      http.get('/api/v1/auth/me', () => HttpResponse.json(owner)),
      http.get('/api/v1/products', () => HttpResponse.json({ data: [product], meta })),
      http.get('/api/v1/warehouses', () => HttpResponse.json({ data: [warehouse], meta })),
      http.get('/api/v1/inventory/minimum-stock', ({ request }) => {
        const search = new URL(request.url).searchParams;
        const isWarehouseScope = search.get('scope') === 'warehouse';
        const isAlertQuery = search.get('below_only') === '1';
        const row = isWarehouseScope ? warehouseThreshold : productThreshold;
        return HttpResponse.json({ data: isAlertQuery && !row.is_below_minimum ? [] : [row], meta: { ...meta, total: isAlertQuery && !row.is_below_minimum ? 0 : 1 } });
      }),
      http.put('/api/v1/inventory/minimum-stock', async ({ request }) => {
        const body = await request.json();
        expect(body).toEqual({ product_id: 7, warehouse_id: 4, minimum_quantity: 9 });
        return HttpResponse.json({ data: { ...warehouseThreshold, minimum_quantity: 9 } });
      }),
    );

    renderPage();
    const input = (await screen.findAllByRole('spinbutton', { name: `${ar.common.minStock} Widget Main` }))[0];
    fireEvent.change(input, { target: { value: '9' } });
    const rowForm = input.closest('form');
    expect(rowForm).not.toBeNull();
    await userEvent.setup().click(within(rowForm as HTMLFormElement).getByRole('button', { name: ar.common.save }));

    expect(await screen.findByText(ar.common.actionSaved)).toBeVisible();
    expect(await screen.findAllByText('Main')).not.toHaveLength(0);
  });
});
