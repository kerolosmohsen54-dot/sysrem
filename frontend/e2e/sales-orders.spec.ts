import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { ar } from '../src/shared/i18n/ar';

type Fixture = {
  customer_id: number;
  product_id: number;
  warehouse_id: number;
  on_hand_before_order: number;
};

const fixture = JSON.parse(process.env.SALES_E2E_FIXTURE ?? '{}') as Fixture;
const screenshotsDirectory = path.resolve(process.cwd(), '../docs/phase-2/screenshots');
const username = 'sales-workflow-e2e-owner';
const password = 'Sales-workflow-e2e-2026!';

test('real order creation reserves, cancellation releases, and replacement invoice consumes the same quantity', async ({ page }) => {
  test.setTimeout(240_000);
  expect(fixture.customer_id).toBeGreaterThan(0);
  expect(fixture.product_id).toBeGreaterThan(0);
  expect(fixture.warehouse_id).toBeGreaterThan(0);
  mkdirSync(screenshotsDirectory, { recursive: true });

  await page.goto('/login');
  await page.getByLabel(ar.auth.username).selectOption(username);
  await page.getByLabel(ar.auth.password).fill(password);
  await page.getByRole('button', { name: ar.auth.submit }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20000 });
  await expect(page.getByRole('button', { name: ar.auth.logout }).first()).toBeVisible({ timeout: 20000 });
  await expect(page.locator('main h1').first()).toBeVisible({ timeout: 20000 });
  await page.goto('/orders');
  await expect(page.getByRole('heading', { name: ar.nav.orders })).toBeVisible({ timeout: 20000 });
  await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 60000 });

  const createOrder = async (quantity: number) => {
    if (page.url().endsWith('/orders')) {
      await page.getByRole('button', { name: ar.orders.createOrder }).click();
    } else {
      await page.goto('/orders/new');
    }
    await expect(page.locator('main h1').first()).toBeVisible({ timeout: 15000 });
    await page.getByLabel(ar.common.customer).selectOption(String(fixture.customer_id));
    await page.getByLabel(ar.common.warehouse).selectOption(String(fixture.warehouse_id));
    await page.getByLabel(ar.common.product).selectOption(String(fixture.product_id));
    await page.getByLabel(ar.common.quantity).fill(String(quantity));
    await page.getByLabel(ar.orders.unitPrice).fill('25.00');
    const responsePromise = page.waitForResponse((response) =>
      response.request().method() === 'POST' && response.url().endsWith('/api/v1/orders'),
    );
    await page.getByRole('button', { name: ar.orders.saveDraft }).click();
    const response = await responsePromise;
    expect(response.status()).toBe(201);
    const payload = await response.json();
    expect(payload.data).toMatchObject({
      customer_id: fixture.customer_id,
      warehouse_id: fixture.warehouse_id,
      currency_code: 'EGP',
      payment_method: 'cash',
      lines: [{ product_id: fixture.product_id, quantity }],
    });
    await expect(page).toHaveURL(new RegExp(`/orders/${payload.data.id}$`));
    await expect(page.locator('.order-detail-page h1')).toContainText(payload.data.order_number);
    return payload.data as { id: number; order_number: string };
  };

  const cancelledOrder = await createOrder(2);
  const cancelledOrderId = cancelledOrder.id;
  await page.getByRole('link', { name: ar.common.back }).click();
  await expect(page.getByRole('heading', { name: ar.nav.orders })).toBeVisible({ timeout: 20000 });
  await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 60000 });
  const orderSearch = page.getByRole('searchbox', { name: ar.common.search });
  const statusFilters = page.locator('.order-status-filters button');
  await expect(statusFilters).toHaveCount(5);
  await orderSearch.fill(cancelledOrder.order_number);
  await expect(statusFilters.nth(1)).toBeVisible();
  await statusFilters.nth(1).click();
  await expect(page.getByRole('link', { name: cancelledOrder.order_number })).toBeVisible({ timeout: 60000 });
  await page.locator('.orders-toolbar select').last().selectOption('total');
  await page.getByRole('button', { name: 'تغيير اتجاه الترتيب' }).click();
  await page.screenshot({ path: path.join(screenshotsDirectory, 'orders-filtered-list.png'), fullPage: true });
  await page.getByRole('link', { name: cancelledOrder.order_number }).click();
  const firstConfirm = page.waitForResponse((response) =>
    response.request().method() === 'POST' && response.url().endsWith(`/api/v1/orders/${cancelledOrderId}/confirm`),
  );
  await page.getByRole('button', { name: ar.orders.confirmOrder }).click();
  const firstConfirmation = await (await firstConfirm).json();
  expect(firstConfirmation.data.reservations[0].status).toBe('reserved');
  const held = await readInventoryBalance(page, fixture.product_id, fixture.warehouse_id);
  expect(Number(held.quantity_reserved)).toBe(2);
  await page.screenshot({ path: path.join(screenshotsDirectory, 'order-reservation-held.png'), fullPage: true });

  await page.getByLabel(ar.orders.cancelOrderReason).fill('Acceptance fixture cancellation');
  const cancelPromise = page.waitForResponse((response) =>
    response.request().method() === 'POST' && response.url().endsWith(`/api/v1/orders/${cancelledOrderId}/cancel`),
  );
  await page.getByRole('button', { name: ar.orders.cancelOrder }).click();
  expect((await (await cancelPromise).json()).data.status).toBe('cancelled');
  const releasedDetail = await readOrder(page, cancelledOrderId);
  expect(releasedDetail.data.reservations[0].status).toBe('released');
  const releasedBalance = await readInventoryBalance(page, fixture.product_id, fixture.warehouse_id);
  expect(Number(releasedBalance.quantity_reserved)).toBe(0);
  await page.screenshot({ path: path.join(screenshotsDirectory, 'order-reservation-released.png'), fullPage: true });

  await page.getByRole('link', { name: ar.common.back }).click();
  await expect(page.getByRole('heading', { name: ar.nav.orders })).toBeVisible({ timeout: 20000 });
  const invoicedOrder = await createOrder(2);
  const invoicedOrderId = invoicedOrder.id;
  const secondConfirm = page.waitForResponse((response) =>
    response.request().method() === 'POST' && response.url().endsWith(`/api/v1/orders/${invoicedOrderId}/confirm`),
  );
  await page.getByRole('button', { name: ar.orders.confirmOrder }).click();
  expect((await (await secondConfirm).json()).data.reservations[0].status).toBe('reserved');
  const invoicePromise = page.waitForResponse((response) =>
    response.request().method() === 'POST' && response.url().endsWith(`/api/v1/orders/${invoicedOrderId}/invoice`),
  );
  await page.getByRole('button', { name: ar.orders.invoiceOrder }).click();
  const invoiceResponse = await invoicePromise;
  expect(invoiceResponse.status()).toBe(200);
  const invoiceResult = await invoiceResponse.json();
  expect(invoiceResult.invoice.status).toBe('issued');
  const invoicedDetail = await readOrder(page, invoicedOrderId);
  expect(invoicedDetail.data.status).toBe('fulfilled');
  expect(invoicedDetail.data.reservations[0].status).toBe('consumed');
  const finalBalance = await readInventoryBalance(page, fixture.product_id, fixture.warehouse_id);
  expect(Number(finalBalance.quantity_on_hand)).toBe(fixture.on_hand_before_order - 2);
  expect(Number(finalBalance.quantity_reserved)).toBe(0);
  await page.goBack();
  await expect(page.locator('.order-detail-page h1')).toContainText(invoicedDetail.data.order_number);
  await page.screenshot({ path: path.join(screenshotsDirectory, 'order-invoiced-and-consumed.png'), fullPage: true });

  await page.getByRole('link', { name: /طباعة الطلب/ }).click();
  await expect(page.locator('.order-print-sheet').getByText(invoiceResult.data?.sales_order?.order_number ?? invoicedDetail.data.order_number, { exact: true })).toBeVisible();
  await page.evaluate(() => { window.print = () => undefined; });
  const printPromise = page.waitForResponse((response) =>
    response.request().method() === 'POST' && response.url().endsWith(`/api/v1/orders/${invoicedOrderId}/printed`),
  );
  await page.getByRole('button', { name: /طباعة الطلب/ }).click();
  expect((await (await printPromise).json()).data.print_count).toBeGreaterThan(0);
  await page.screenshot({ path: path.join(screenshotsDirectory, 'order-print-preview.png'), fullPage: true });

  await page.getByRole('link', { name: ar.common.back }).click();
  await page.getByRole('link', { name: ar.common.back }).click();
  await expect(page.getByRole('heading', { name: ar.nav.orders })).toBeVisible({ timeout: 20000 });
  await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 60000 });
  await page.getByRole('searchbox', { name: ar.common.search }).fill(invoicedOrder.order_number);
  await page.getByRole('button', { name: ar.orders.orderStatuses.fulfilled }).click();
  const fulfilledRow = page.getByRole('row').filter({ hasText: invoicedOrder.order_number });
  const deliveryLink = fulfilledRow.locator(`a[href="/deliveries/new?orderId=${invoicedOrderId}"]`);
  await expect(deliveryLink).toHaveAttribute('href', `/deliveries/new?orderId=${invoicedOrderId}`, { timeout: 60000 });
  await deliveryLink.click();
  await expect(page).toHaveURL(new RegExp(`/deliveries/new\\?orderId=${invoicedOrderId}$`));
  await expect(page.getByRole('heading', { name: ar.orders.newDelivery })).toBeVisible({ timeout: 30_000 });
});

async function readOrder(page: import('@playwright/test').Page, orderId: number) {
  return page.evaluate(async (id) => {
    const response = await fetch(`/api/v1/orders/${id}`);
    return response.json();
  }, orderId);
}

async function readInventoryBalance(page: import('@playwright/test').Page, productId: number, warehouseId: number) {
  return page.evaluate(async ({ productId: id, warehouseId: locationId }) => {
    const response = await fetch(`/api/v1/inventory/balances?product_id=${id}&per_page=100`);
    const payload = await response.json();
    return payload.data.find((row: { product_id: number; warehouse_id: number }) =>
      row.product_id === id && row.warehouse_id === locationId,
    );
  }, { productId, warehouseId });
}
