import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AuthProvider } from '../../src/shared/auth/AuthProvider';
import type { SessionUser } from '../../src/shared/api/types';
import { ar } from '../../src/shared/i18n/ar';
import { InventoryBalancesPage, WarehousesPage } from '../../src/features/inventory/CatalogPages';
import { WarehousePicker } from '../../src/features/inventory/WarehousePicker';
import { InventoryAdjustmentPage } from '../../src/features/inventory/StockPages';
import {
  createProduct,
  createWarehouse,
  listResource,
  postStockAction,
  type InventoryBalance,
  type Warehouse,
} from '../../src/features/inventory/api';
import { server } from '../server';

const owner: SessionUser = {
  id: 1,
  username: 'owner-fixture',
  name: 'Owner fixture',
  role: 'owner',
  permissions: ['*'],
};

function renderAs(user: SessionUser, child: ReactNode) {
  server.use(http.get('/api/v1/auth/me', () => HttpResponse.json(user)));
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  });
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{child}</AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('catalog and inventory', () => {
  it('creates more than 25 warehouses and uses the server pagination envelope', async () => {
    const input = (index: number) => ({
      code: `WH-TEST-${index}`,
      name: `Test warehouse ${index}`,
      location_type: 'other' as Warehouse['location_type'],
      parent_location_id: null,
      is_active: true,
      notes: null,
    });
    await Promise.all(Array.from({ length: 25 }, (_, index) => createWarehouse(input(index))));

    const thirdPage = await listResource<Warehouse>('/warehouses', {
      page: 3,
      perPage: 10,
      search: 'Test warehouse',
    });

    expect(thirdPage.meta.total).toBe(25);
    expect(thirdPage.meta.last_page).toBe(3);
    expect(thirdPage.data).toHaveLength(5);

    const user = userEvent.setup();
    const { unmount } = renderAs(owner, <WarehousesPage />);
    expect(await screen.findAllByText('Test warehouse 0')).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: ar.common.next }));
    expect(await screen.findAllByText('Test warehouse 10')).toHaveLength(2);
    unmount();

    renderAs(
      owner,
      <WarehousePicker id="warehouse-test-picker" name="warehouse_id" label="Warehouse" />,
    );
    const warehouseSearch = await screen.findByRole('searchbox', {
      name: 'Warehouse — بحث',
    });
    await user.type(warehouseSearch, 'Test warehouse 24');
    expect(
      await screen.findByRole('option', { name: 'Test warehouse 24 — WH-TEST-24' }),
    ).toBeInTheDocument();
  }, 15000);

  it('keeps warehouse stock nonnegative when receiving and transferring', async () => {
    const product = await createProduct({
      sku: 'INV-TEST-1',
      barcode: null,
      name: 'Inventory test product',
      category_id: null,
      unit_code: 'piece',
      company_price: '5.00',
      default_location_id: null,
      minimum_stock: null,
      description: null,
      is_active: true,
    });
    const warehouses = await listResource<Warehouse>('/warehouses', {
      page: 1,
      perPage: 100,
      search: '',
    });
    const source = warehouses.data.find((warehouse) => warehouse.id === 401);
    const destination = warehouses.data.find((warehouse) => warehouse.id === 402);
    expect(source).toBeDefined();
    expect(destination).toBeDefined();

    await postStockAction(
      {
        action: 'opening-stock',
        product_id: product.id,
        warehouse_id: source!.id,
        quantity: 10,
        unit_cost_egp: '5.00',
        movement_date: '2026-10-11',
        reason: 'Fixture opening stock',
      },
      'inventory-opening-test',
    );
    await postStockAction(
      {
        action: 'transfer',
        product_id: product.id,
        source_warehouse_id: source!.id,
        destination_warehouse_id: destination!.id,
        quantity: 4,
        movement_date: '2026-10-11',
        reason: 'Fixture transfer',
      },
      'inventory-transfer-test',
    );

    const sourceBalance = await listResource<InventoryBalance>(
      '/inventory/balances',
      { page: 1, perPage: 10, search: '' },
      { product_id: String(product.id), warehouse_id: String(source!.id) },
    );
    const destinationBalance = await listResource<InventoryBalance>(
      '/inventory/balances',
      { page: 1, perPage: 10, search: '' },
      { product_id: String(product.id), warehouse_id: String(destination!.id) },
    );
    expect(sourceBalance.data[0]?.quantity_on_hand).toBe('6');
    expect(destinationBalance.data[0]?.quantity_on_hand).toBe('4');

    await expect(
      postStockAction(
        {
          action: 'transfer',
          product_id: product.id,
          source_warehouse_id: source!.id,
          destination_warehouse_id: destination!.id,
          quantity: 7,
          movement_date: '2026-10-11',
          reason: 'Must not make source negative',
        },
        'inventory-transfer-too-large',
      ),
    ).rejects.toMatchObject({ status: 409 });
    const unchanged = await listResource<InventoryBalance>(
      '/inventory/balances',
      { page: 1, perPage: 10, search: '' },
      { product_id: String(product.id), warehouse_id: String(source!.id) },
    );
    expect(unchanged.data[0]?.quantity_on_hand).toBe('6');
  });

  it('shows cost columns only to users with costs.view', async () => {
    const balances: InventoryBalance[] = [
      {
        product_id: 901,
        product_name: 'Cost visibility fixture',
        sku: 'COST-TEST',
        warehouse_id: 401,
        warehouse_name: 'Main',
        quantity_on_hand: '2',
        minimum_stock: null,
        average_unit_cost_egp: '12.34',
      },
    ];
    server.use(
      http.get('/api/v1/inventory/balances', () =>
        HttpResponse.json({
          data: balances,
          meta: { current_page: 1, per_page: 10, total: 1, last_page: 1 },
        }),
      ),
    );
    const driver: SessionUser = {
      id: 3,
      username: 'driver-fixture',
      name: 'Driver fixture',
      role: 'driver',
      permissions: ['inventory.view'],
    };

    const { unmount } = renderAs(driver, <InventoryBalancesPage />);
    expect(await screen.findAllByText('Cost visibility fixture')).toHaveLength(2);
    expect(screen.queryByText(ar.common.unitCost)).not.toBeInTheDocument();
    expect(screen.queryByText('12.34')).not.toBeInTheDocument();
    unmount();

    renderAs(owner, <InventoryBalancesPage />);
    expect(await screen.findAllByText(ar.common.unitCost)).toHaveLength(2);
    expect(await screen.findAllByText('12.34')).toHaveLength(2);
  });

  it('denies inventory changes to a user without inventory.manage', async () => {
    const driver: SessionUser = {
      id: 3,
      username: 'driver-fixture',
      name: 'Driver fixture',
      role: 'driver',
      permissions: ['inventory.view'],
    };
    renderAs(driver, <InventoryAdjustmentPage />);

    expect(await screen.findByText(ar.common.permissionDenied)).toBeVisible();
    expect(screen.queryByRole('button', { name: ar.common.confirm })).not.toBeInTheDocument();
  });

  it('shows paginated, searchable adjustment history from stock movements', async () => {
    const product = await createProduct({
      sku: 'ADJ-HISTORY-1',
      barcode: null,
      name: 'Adjustment history product',
      category_id: null,
      unit_code: 'piece',
      company_price: null,
      default_location_id: null,
      minimum_stock: null,
      description: null,
      is_active: true,
    });
    await postStockAction(
      {
        action: 'adjustment',
        product_id: product.id,
        warehouse_id: 401,
        quantity: 3,
        movement_date: '2026-10-11',
        reason: 'Adjustment history fixture',
      },
      'inventory-adjustment-history-test',
    );

    renderAs(owner, <InventoryAdjustmentPage />);

    expect(
      await screen.findByRole('heading', { name: ar.inventory.adjustmentHistory }),
    ).toBeVisible();
    expect(await screen.findAllByText('Adjustment history product')).not.toHaveLength(0);
  });
});
