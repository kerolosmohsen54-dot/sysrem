import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { ar } from '../src/shared/i18n/ar';

type Fixture = { product_id: number; warehouse_id: number; product_sku: string; warehouse_code: string; opening_movement_id: number; invoice_id: number; on_hand_after_sale: number };
const fixture = JSON.parse(process.env.INVENTORY_E2E_FIXTURE ?? '{}') as Fixture;
const screenshots = path.resolve(process.cwd(), '../docs/phase-6/screenshots');

test('sale, return, count, alert and movement details reconcile with persisted stock', async ({ page }) => {
  test.setTimeout(240_000);
  expect(fixture.product_id).toBeGreaterThan(0);
  mkdirSync(screenshots, { recursive: true });
  await page.goto('/login');
  await page.getByLabel(ar.auth.username).selectOption('sales-workflow-e2e-owner');
  await page.getByLabel(ar.auth.password).fill('Sales-workflow-e2e-2026!');
  await page.getByRole('button', { name: ar.auth.submit }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 });
  const csrf = await page.evaluate(() => decodeURIComponent(document.cookie.split('; ').find(part => part.startsWith('XSRF-TOKEN='))?.slice('XSRF-TOKEN='.length) ?? ''));
  const headers = { 'X-CSRF-Token': csrf, Accept: 'application/json' };
  expect((await page.request.post('/api/v1/auth/reauth', { headers, data: { password: 'Sales-workflow-e2e-2026!' } })).ok()).toBeTruthy();
  const summary = async () => (await (await page.request.get(`/api/v1/inventory/summary?product_id=${fixture.product_id}&warehouse_id=${fixture.warehouse_id}`)).json()).data;
  expect(Number((await summary()).quantity_on_hand)).toBe(10);
  const duplicateOpening = await page.request.post('/api/v1/inventory/opening-stock', { headers, data: { product_id: fixture.product_id, warehouse_id: fixture.warehouse_id, quantity: 1, unit_cost_egp: '10.00', movement_date: new Date().toISOString().slice(0, 10), reason: 'Duplicate opening' } });
  expect(duplicateOpening.status()).toBe(422);
  const beforeMovements = await (await page.request.get(`/api/v1/inventory/movements?product_id=${fixture.product_id}&warehouse_id=${fixture.warehouse_id}`)).json();
  expect(beforeMovements.data.map((line: { movement_type: string }) => line.movement_type)).toEqual(expect.arrayContaining(['opening', 'sale']));

  const created = await page.request.post('/api/v1/warehouse-returns', { headers, data: {
    warehouse_id: fixture.warehouse_id, return_date: new Date().toISOString().slice(0, 10),
    reason: 'مرتجع اختبار المخزون', idempotency_key: `inventory-e2e-return-${Date.now()}`,
    lines: [{ product_id: fixture.product_id, quantity: 2, unit_cost_egp: '10.00' }],
  } });
  expect(created.status(), await created.text()).toBe(201);
  const returnId = (await created.json()).data.return.id as number;
  await page.goto('/warehouse-returns');
  await expect(page.getByRole('heading', { name: 'مرتجعات المخازن', exact: true })).toBeVisible({ timeout: 30_000 });
  const approveReturn = page.waitForResponse(response => response.request().method() === 'POST' && response.url().endsWith(`/api/v1/warehouse-returns/${returnId}/approve`));
  const returnRow = page.getByRole('row').filter({ has: page.locator(`a[href="/warehouse-returns/${returnId}"]`) });
  await expect(returnRow).toBeVisible();
  await returnRow.getByRole('button', { name: ar.common.confirm }).click();
  expect((await approveReturn).status()).toBe(200);
  expect(Number((await summary()).quantity_on_hand)).toBe(12);
  await page.screenshot({ path: path.join(screenshots, 'warehouse-returns-desktop.png'), fullPage: true });

  const count = await page.request.post('/api/v1/inventory/counts', { headers, data: {
    warehouse_id: fixture.warehouse_id, count_date: new Date().toISOString().slice(0, 10),
    reason: 'جرد اختبار المخزون', idempotency_key: `inventory-e2e-count-${Date.now()}`,
    lines: [{ product_id: fixture.product_id, counted_quantity: 11 }],
  } });
  expect(count.status(), await count.text()).toBe(201);
  const countId = (await count.json()).data.count.id as number;
  const approval = await page.request.post(`/api/v1/inventory/counts/${countId}/approve`, { headers });
  expect(approval.status(), await approval.text()).toBe(200);
  expect(Number((await summary()).quantity_on_hand)).toBe(11);
  await page.goto('/inventory/counts');
  await expect(page.getByRole('heading', { name: 'الجرد الدوري' })).toBeVisible({ timeout: 30_000 });
  await page.screenshot({ path: path.join(screenshots, 'inventory-counts-desktop.png'), fullPage: true });
  await page.getByRole('link', { name: /CNT-/ }).first().click();
  await expect(page.getByRole('heading', { name: 'تفاصيل الجرد الدوري' })).toBeVisible();
  await expect(page.getByText('11').first()).toBeVisible();
  await page.screenshot({ path: path.join(screenshots, 'inventory-count-detail-desktop.png'), fullPage: true });

  const minimum = await page.request.put('/api/v1/inventory/minimum-stock', { headers, data: { product_id: fixture.product_id, warehouse_id: fixture.warehouse_id, minimum_quantity: 12 } });
  expect(minimum.status(), await minimum.text()).toBe(200);
  const alerts = await (await page.request.get(`/api/v1/inventory/minimum-stock?product_id=${fixture.product_id}&warehouse_id=${fixture.warehouse_id}&below_only=1`)).json();
  expect(alerts.data[0]).toMatchObject({ product_id: fixture.product_id, is_below_minimum: true });
  expect(Number((await summary()).below_minimum_count)).toBe(1);
  await page.goto('/inventory/minimum-stock');
  await expect(page.getByRole('heading', { name: 'الحد الأدنى للمخزون' })).toBeVisible({ timeout: 30_000 });
  await page.screenshot({ path: path.join(screenshots, 'minimum-stock-desktop.png'), fullPage: true });

  const movements = await (await page.request.get(`/api/v1/inventory/movements?product_id=${fixture.product_id}&warehouse_id=${fixture.warehouse_id}&per_page=50`)).json();
  const types = movements.data.map((line: { movement_type: string }) => line.movement_type);
  expect(types).toEqual(expect.arrayContaining(['opening', 'sale', 'return', 'count']));
  const signed = movements.data.reduce((sum: number, line: { movement_type: string; quantity: string; to_location_id: number | null }) => sum + (line.to_location_id === fixture.warehouse_id ? 1 : -1) * Number(line.quantity), 0);
  expect(signed).toBe(11);
  await page.goto(`/inventory/movements?search=${fixture.product_sku}`);
  await expect(page.getByRole('heading', { name: ar.nav.inventoryMovements })).toBeVisible({ timeout: 30_000 });
  await page.screenshot({ path: path.join(screenshots, 'inventory-movements-desktop.png'), fullPage: true });
  await page.locator('table').getByRole('link').first().click();
  await expect(page.getByRole('heading', { name: 'تفاصيل حركة المخزون' })).toBeVisible();
  await expect(page.getByText(fixture.product_sku)).toBeVisible();
  await page.screenshot({ path: path.join(screenshots, 'inventory-movement-detail-desktop.png'), fullPage: true });
  await page.getByRole('link', { name: 'رجوع لحركة المخزون' }).click();
  await expect(page.getByRole('searchbox').first()).toHaveValue(fixture.product_sku);

  await page.goto('/inventory');
  await expect(page.getByRole('heading', { name: ar.nav.inventory })).toBeVisible({ timeout: 30_000 });
  await page.screenshot({ path: path.join(screenshots, 'inventory-summary-desktop.png'), fullPage: true });
  await page.goto('/products');
  await page.screenshot({ path: path.join(screenshots, 'products-desktop.png'), fullPage: true });
  await page.locator('main').getByRole('searchbox').first().fill(fixture.product_sku);
  const productRow = page.getByRole('row').filter({ hasText: fixture.product_sku });
  await expect(productRow).toBeVisible({ timeout: 30_000 });
  const costHistoryLink = productRow.getByRole('link', { name: ar.inventory.productCostHistory });
  await expect(costHistoryLink).toHaveAttribute('href', `/products/${fixture.product_id}/cost-history`);
  await costHistoryLink.click();
  await expect(page).toHaveURL(new RegExp(`/products/${fixture.product_id}/cost-history$`), { timeout: 30_000 });
  await expect(page.getByRole('heading', { name: ar.inventory.productCostHistory })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('table tbody tr').first()).toBeVisible();
  await page.screenshot({ path: path.join(screenshots, 'product-cost-history-desktop.png'), fullPage: true });
  await page.goto('/inventory/opening-stock');
  await expect(page.getByRole('heading', { name: ar.nav.openingStock })).toBeVisible();
  await page.screenshot({ path: path.join(screenshots, 'opening-stock-desktop.png'), fullPage: true });
  await page.goto('/warehouses');
  await page.screenshot({ path: path.join(screenshots, 'warehouses-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/products');
  await expect(page.locator('.inventory-products-table + .table-cards .data-card').first()).toBeVisible({ timeout: 30_000 });
  await page.screenshot({ path: path.join(screenshots, 'products-mobile.png'), fullPage: true });
  await page.goto('/warehouses');
  await expect(page.locator('.inventory-warehouses-table + .table-cards .data-card').first()).toBeVisible({ timeout: 30_000 });
  await page.screenshot({ path: path.join(screenshots, 'warehouses-mobile.png'), fullPage: true });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/inventory/damaged');
  await expect(page.getByRole('heading', { name: 'المخزون التالف المعتمد' })).toBeVisible({ timeout: 30_000 });
  await page.getByLabel(`${ar.common.search} ${ar.nav.products}`).fill(fixture.product_sku);
  await expect(page.locator(`select[name="product_id"] option[value="${fixture.product_id}"]`)).toHaveCount(1);
  await page.getByLabel(ar.inventory.selectProduct).selectOption(String(fixture.product_id));
  await page.getByLabel(`${ar.common.search} ${ar.nav.warehouses}`).fill(fixture.warehouse_code);
  await expect(page.locator(`select[name="warehouse_id"] option[value="${fixture.warehouse_id}"]`)).toHaveCount(1);
  await page.getByLabel(ar.inventory.selectWarehouse).selectOption(String(fixture.warehouse_id));
  await expect(page.locator('select[name="product_id"]')).toHaveValue(String(fixture.product_id));
  await page.getByLabel('الكمية').fill('1');
  await page.getByLabel('التكلفة').fill('10.00');
  const damageResponsePromise = page.waitForResponse((response) =>
    response.request().method() === 'POST' && response.url().endsWith('/api/v1/approved-damaged-stock'),
  );
  await page.getByRole('button', { name: 'تسجيل الاعتماد' }).click();
  const damageResponse = await damageResponsePromise;
  expect(damageResponse.status()).toBe(201);
  const damaged = (await damageResponse.json()).data.item as { id: number };
  expect(damaged.id).toBeGreaterThan(0);
  expect(Number((await summary()).quantity_on_hand)).toBe(10);
  const damagedMovement = await page.request.get(`/api/v1/inventory/movements?product_id=${fixture.product_id}&warehouse_id=${fixture.warehouse_id}&per_page=50`);
  expect((await damagedMovement.json()).data.map((line: { movement_type: string }) => line.movement_type)).toContain('damage');
  await expect(page.getByRole('row').filter({ hasText: String(fixture.product_id) }).last()).toBeVisible();
  await page.screenshot({ path: path.join(screenshots, 'approved-damaged-stock-posted.png'), fullPage: true });
});
