import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../server';
import {
  createCategory,
  createWarehouse,
  listResource,
  listAllResources,
  postStockAction,
  type InventoryBalance,
  type InventoryMovement,
  type Product,
} from '../../src/features/inventory/api';

const query = { page: 1, perPage: 20, search: '' };

describe('catalog and inventory API mocks', () => {
  it('serves the same seeded product records with decimal-safe stock strings', async () => {
    const page = await listResource<Product>('/products', query);

    expect(page.data).toHaveLength(3);
    expect(page.data.map((product) => product.sku)).toEqual([
      'TOY-OF-001',
      'BAT-70-002',
      'OIL-530-003',
    ]);
    expect(page.data.every((product) => typeof product.quantity_on_hand === 'string')).toBe(true);
  });

  it('applies API search and sorting parameters to catalog lists', async () => {
    const page = await listResource<Product>('/products', {
      ...query,
      sortBy: 'name',
      sortDirection: 'desc',
    });
    const filtered = await listResource<Product>('/products', { ...query, search: 'فلتر' });

    expect(page.data.map((product) => product.sku)).toEqual([
      'TOY-OF-001',
      'OIL-530-003',
      'BAT-70-002',
    ]);
    expect(filtered.data).toHaveLength(1);
    expect(filtered.data[0].name).toBe('فلتر زيت تويوتا');
  });

  it('loads all pages when a selector needs catalog records beyond the first page', async () => {
    server.use(http.get('/api/v1/warehouses', ({ request }) => {
      const pageNumber = Number(new URL(request.url).searchParams.get('page'));
      return HttpResponse.json({
        data: [{ id: pageNumber, name: `Warehouse ${pageNumber}` }],
        meta: { current_page: pageNumber, per_page: 1, total: 2, last_page: 2 },
      });
    }));

    const page = await listAllResources<{ id: number; name: string }>('/warehouses', {
      page: 1,
      perPage: 1,
      search: '',
    });

    expect(page.data.map((warehouse) => warehouse.id)).toEqual([1, 2]);
    expect(page.meta.last_page).toBe(2);
  });

  it('applies supported movement filters to the ledger list', async () => {
    const page = await listResource<InventoryMovement>('/inventory/movements', query, {
      movement_type: 'sale',
      from_date: '2026-10-09',
      to_date: '2026-10-11',
    });

    expect(page.data).toHaveLength(1);
    expect(page.data[0].movement_type).toBe('sale');
    expect(page.data[0].movement_date).toBe('2026-10-10');
  });

  it('creates a category and exposes it through API pagination', async () => {
    const created = await createCategory({
      name: 'مستلزمات كهربائية',
      code: 'CAT-NEW',
      parent_category_id: null,
      is_active: true,
    });
    const page = await listResource('/categories', query, { search: created.name });

    expect(page.data).toContainEqual(
      expect.objectContaining({ id: created.id, name: created.name }),
    );
  });

  it('uses a stable idempotency key for a replayed stock post', async () => {
    await createWarehouse({
      code: 'WH-TEST',
      name: 'مخزن اختبار',
      location_type: 'sub',
      parent_location_id: null,
      is_active: true,
      notes: null,
    });
    const input = {
      action: 'opening-stock' as const,
      product_id: 201,
      warehouse_id: 600,
      quantity: 5,
      unit_cost_egp: '123.45',
      movement_date: '2026-10-11',
      reason: 'رصيد افتتاحي للاختبار',
    };
    await postStockAction(input, 'inventory-opening-replay-key');
    await postStockAction(input, 'inventory-opening-replay-key');

    const page = await listResource<InventoryMovement>('/inventory/movements', query, {
      warehouse_id: '600',
    });
    expect(page.data).toHaveLength(1);
    expect(page.data[0].quantity).toBe('5');
  });

  it('updates transfer balances using the mock server response, not UI arithmetic', async () => {
    await postStockAction(
      {
        action: 'transfer',
        product_id: 201,
        source_warehouse_id: 401,
        destination_warehouse_id: 402,
        quantity: 2,
        movement_date: '2026-10-11',
        reason: 'نقل بين المخازن',
      },
      'inventory-transfer-test-key',
    );
    const page = await listResource<InventoryBalance>('/inventory/balances', query, {
      product_id: '201',
    });

    expect(page.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ warehouse_id: 401, quantity_on_hand: '46' }),
        expect.objectContaining({ warehouse_id: 402, quantity_on_hand: '2' }),
      ]),
    );
  });

  it('rejects a stock adjustment that would make the balance negative', async () => {
    await expect(
      postStockAction(
        {
          action: 'adjustment',
          product_id: 201,
          warehouse_id: 401,
          quantity: -999,
          movement_date: '2026-10-11',
          reason: 'اختبار منع الرصيد السالب',
        },
        'inventory-negative-adjustment-test',
      ),
    ).rejects.toMatchObject({ code: 'HTTP_ERROR', status: 409 });
  });
});
