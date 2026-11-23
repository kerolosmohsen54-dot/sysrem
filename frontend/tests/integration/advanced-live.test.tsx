import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/app/App';
import { AppProviders, queryClient } from '../../src/app/providers';
import { sessionStore } from '../../src/shared/auth/sessionStore';
import { ar } from '../../src/shared/i18n/ar';
import { displayStatus } from '../../src/shared/utils/labels';
import { server } from '../server';

const owner = {
  id: 1,
  username: 'owner',
  name: 'Owner',
  role: 'owner',
  permissions: ['*', 'inventory_counts.view', 'inventory_counts.manage', 'inventory_counts.approve'],
};
const products = {
  data: [{ id: 7, sku: 'P7', name: 'Widget', category_id: null, unit_code: 'pcs', minimum_stock: 2, is_active: true }],
  meta: { current_page: 1, per_page: 100, total: 1, last_page: 1 },
};
const warehouses = {
  data: [
    { id: 4, code: 'W4', name: 'Main', location_type: 'main', parent_location_id: null, is_active: true, notes: null },
  ],
  meta: { current_page: 1, per_page: 100, total: 1, last_page: 1 },
};
const minimumRow = {
  id: 1,
  product_id: 7,
  sku: 'P7',
  product_name: 'Widget',
  warehouse_id: 4,
  warehouse_name: 'Main',
  warehouse_code: 'W4',
  minimum_quantity: 2,
  available_quantity: 1,
  quantity_on_hand: 1,
  is_below_minimum: true,
};

function prepare() {
  queryClient.clear();
  sessionStore.setUser(owner);
  server.use(http.get('/api/v1/auth/me', () => HttpResponse.json(owner)));
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppProviders><App /></AppProviders>
    </MemoryRouter>,
  );
}

function page(data: unknown[]) {
  return { data, meta: { current_page: 1, per_page: 50, total: data.length, last_page: 1 } };
}

describe('container ledger pages', () => {
  it('loads container transfers and its reference data from the API', async () => {
    prepare();
    let transferListRequested = false;
    server.use(
      http.get('/api/v1/container-transfers', () => {
        transferListRequested = true;
        return HttpResponse.json(page([]));
      }),
      http.get('/api/v1/products', () => HttpResponse.json(products)),
      http.get('/api/v1/warehouses', () => HttpResponse.json(warehouses)),
      http.get('/api/v1/containers', () => HttpResponse.json(page([]))),
    );

    renderAt('/container-transfers');

    expect(await screen.findByRole('heading', { name: 'نقل مخزون مرتبط بالحاويات' })).toBeVisible();
    expect(await screen.findByText(ar.common.noResults)).toBeVisible();
    expect(transferListRequested).toBe(true);
  });

  it('loads the container funds screen and its container picker from the API', async () => {
    prepare();
    let containersRequested = false;
    server.use(http.get('/api/v1/containers', () => {
      containersRequested = true;
      return HttpResponse.json(page([]));
    }));

    renderAt('/container-funds');

    expect(await screen.findByRole('heading', { name: 'أموال الحاويات' })).toBeVisible();
    expect(containersRequested).toBe(true);
  });
});

describe('minimum stock live integration', () => {
  it('lists real thresholds and updates a product threshold through its catalog API', async () => {
    prepare();
    let updatedProduct: unknown;
    server.use(
      http.get('/api/v1/inventory/minimum-stock', () => HttpResponse.json(page([minimumRow]))),
      http.get('/api/v1/products', () => HttpResponse.json(products)),
      http.get('/api/v1/warehouses', () => HttpResponse.json(warehouses)),
      http.patch('/api/v1/products/7', async ({ request }) => {
        updatedProduct = await request.json();
        return HttpResponse.json({ data: { ...products.data[0], minimum_stock: 5 } });
      }),
    );

    renderAt('/inventory/minimum-stock');
    expect(await screen.findByRole('heading', { name: ar.nav.minimumStock })).toBeVisible();
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText(ar.inventory.filterByWarehouse), '4');
    await user.selectOptions(screen.getByLabelText(ar.inventory.filterByProduct), '7');
    const input = screen.getAllByLabelText(`${ar.common.minStock} Widget`)[0];
    await user.clear(input);
    await user.type(input, '5');
    await user.click(input.closest('form')!.querySelector('button')!);

    expect(await screen.findAllByText(ar.common.actionSaved)).not.toHaveLength(0);
    expect(updatedProduct).toEqual({ minimum_stock: 5 });
  });

  it('shows field errors returned by the catalog API', async () => {
    prepare();
    server.use(
      http.get('/api/v1/inventory/minimum-stock', () => HttpResponse.json(page([minimumRow]))),
      http.get('/api/v1/products', () => HttpResponse.json(products)),
      http.get('/api/v1/warehouses', () => HttpResponse.json(warehouses)),
      http.patch('/api/v1/products/7', () => HttpResponse.json({
        error: { code: 'VALIDATION_FAILED', message: 'Invalid minimum', details: { minimum_stock: ['Invalid'] } },
      }, { status: 422 })),
    );

    renderAt('/inventory/minimum-stock');
    await screen.findByRole('heading', { name: ar.nav.minimumStock });
    const user = userEvent.setup();
    const input = (await screen.findAllByLabelText(`${ar.common.minStock} Widget`))[0];
    await user.clear(input);
    await user.type(input, '5');
    await user.click(input.closest('form')!.querySelector('button')!);
    expect(await screen.findAllByRole('alert')).not.toHaveLength(0);
  });
});

describe('periodic inventory count live integration', () => {
  it('creates and approves a physical count through the API', async () => {
    prepare();
    let status = 'draft';
    let countExists = false;
    server.use(
      http.get('/api/v1/inventory/counts', () => HttpResponse.json(page(countExists ? [{
        id: 6, count_number: 'CNT-6', warehouse_id: 4, warehouse_name: 'Main', count_date: '2026-10-13', status, reason: 'cycle',
      }] : []))),
      http.get('/api/v1/products', () => HttpResponse.json(products)),
      http.get('/api/v1/warehouses', () => HttpResponse.json(warehouses)),
      http.get('/api/v1/inventory/balances', () => HttpResponse.json(page([
        { id: 1, product_id: 7, warehouse_id: 4, quantity_on_hand: 2 },
      ]))),
      http.post('/api/v1/inventory/counts', async ({ request }) => {
        expect(await request.json()).toMatchObject({
          warehouse_id: 4,
          reason: 'cycle',
          lines: [{ product_id: 7, counted_quantity: 3, difference_reason: 'other' }],
        });
        countExists = true;
        return HttpResponse.json({ data: { count: {
          id: 6, count_number: 'CNT-6', warehouse_id: 4, count_date: '2026-10-13', status: 'draft', reason: 'cycle',
        }, lines: [] } }, { status: 201 });
      }),
      http.post('/api/v1/inventory/counts/6/approve', () => {
        status = 'approved';
        return HttpResponse.json({ data: { count: {
          id: 6, count_number: 'CNT-6', warehouse_id: 4, count_date: '2026-10-13', status, reason: 'cycle',
        }, lines: [] } });
      }),
    );

    renderAt('/inventory/counts');
    expect(await screen.findByRole('heading', { name: ar.nav.periodicCount })).toBeVisible();
    const user = userEvent.setup();
    const selects = screen.getAllByRole('combobox');
    await user.selectOptions(selects[2], '4');
    await user.selectOptions(selects[3], '7');
    await user.type(screen.getByLabelText(ar.inventory.countActualQuantity), '3');
    await user.selectOptions(selects[4], 'other');
    await user.type(screen.getAllByLabelText(ar.common.reason)[1], 'cycle');
    await user.click(screen.getByRole('button', { name: ar.common.save }));
    expect(await screen.findAllByText(ar.common.actionSaved)).not.toHaveLength(0);

    const countRow = screen.getAllByRole('row').find((row) => row.textContent?.includes('CNT-6'));
    expect(countRow).toBeDefined();
    await user.click(within(countRow!).getByRole('button', { name: 'اعتماد' }));
    await waitFor(() => expect(countRow).toHaveTextContent(displayStatus('approved')));
  });

  it('shows validation details when the count cannot be created', async () => {
    prepare();
    server.use(
      http.get('/api/v1/inventory/counts', () => HttpResponse.json(page([]))),
      http.get('/api/v1/products', () => HttpResponse.json(products)),
      http.get('/api/v1/warehouses', () => HttpResponse.json(warehouses)),
      http.get('/api/v1/inventory/balances', () => HttpResponse.json(page([]))),
      http.post('/api/v1/inventory/counts', () => HttpResponse.json({
        error: { code: 'VALIDATION_FAILED', message: 'Invalid count', details: { warehouse_id: ['Required'] } },
      }, { status: 422 })),
    );

    renderAt('/inventory/counts');
    await screen.findByRole('heading', { name: ar.nav.periodicCount });
    const user = userEvent.setup();
    const selects = screen.getAllByRole('combobox');
    await user.selectOptions(selects[2], '4');
    await user.selectOptions(selects[3], '7');
    await user.type(screen.getByLabelText(ar.inventory.countActualQuantity), '3');
    await user.selectOptions(selects[4], 'other');
    await user.type(screen.getAllByLabelText(ar.common.reason)[1], 'cycle');
    await user.click(screen.getByRole('button', { name: ar.common.save }));
    expect(await screen.findAllByRole('alert')).not.toHaveLength(0);
  });
});
