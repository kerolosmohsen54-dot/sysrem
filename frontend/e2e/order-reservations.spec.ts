import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

type Fixture = {
  cancel_order_id: number;
  invoice_order_id: number;
  product_id: number;
  warehouse_id: number;
  initial_quantity_on_hand: number;
};

const fixture = JSON.parse(process.env.RESERVATION_E2E_FIXTURE ?? '{}') as Fixture;
const username = 'reservation-e2e-owner';
const password = 'Reservation-e2e-password-2026!';
const screenshotsDirectory = path.resolve(process.cwd(), '../docs/phase-1/screenshots');

test('confirm reserves stock, cancel releases it, and invoicing consumes it', async ({ page }) => {
  expect(fixture.cancel_order_id).toBeGreaterThan(0);
  expect(fixture.invoice_order_id).toBeGreaterThan(0);
  mkdirSync(screenshotsDirectory, { recursive: true });

  await page.goto('/login');
  await page.getByLabel('اسم المستخدم').selectOption(username);
  await page.getByLabel('كلمة المرور').fill(password);
  await page.getByRole('button', { name: 'تسجيل الدخول' }).click();
  await expect(page).not.toHaveURL(/\/login/);

  await page.goto(`/orders/${fixture.cancel_order_id}`);
  await expect(page.getByRole('heading', { name: /تفاصيل الطلب/ })).toBeVisible({ timeout: 15_000 });
  const cancelConfirmResponse = page.waitForResponse((response) =>
    response.request().method() === 'POST'
    && response.url().endsWith(`/api/v1/orders/${fixture.cancel_order_id}/confirm`));
  await page.getByRole('button', { name: 'تأكيد الطلب' }).click();
  const confirmed = await (await cancelConfirmResponse).json();
  expect(confirmed.data.reservations[0].status).toBe('reserved');
  await page.getByRole('button', { name: 'الحجوزات' }).click();
  await expect(page.getByRole('table').getByText('محجوز')).toBeVisible();
  await expect(page.getByRole('table').getByText('صنف اختبار الحجز', { exact: false })).toBeVisible();
  const reservedBalance = await page.evaluate(async (productId: number) => {
    const response = await fetch(`/api/v1/inventory/balances?product_id=${productId}&per_page=100`);
    return response.json();
  }, fixture.product_id);
  expect(Number(reservedBalance.data[0].quantity_reserved)).toBe(2);
  await page.screenshot({ path: path.join(screenshotsDirectory, 'order-reservation-confirmed.png'), fullPage: true });

  await page.getByRole('button', { name: 'بيانات الطلب' }).click();
  await page.getByLabel('سبب الإلغاء').fill('اختبار تحرير حجز المخزون');
  const cancelResponse = page.waitForResponse((response) =>
    response.request().method() === 'POST'
    && response.url().endsWith(`/api/v1/orders/${fixture.cancel_order_id}/cancel`));
  await page.getByRole('button', { name: 'إلغاء الطلب' }).click();
  expect((await (await cancelResponse).json()).data.status).toBe('cancelled');
  const releasedDetail = await page.evaluate(async (orderId: number) => {
    const response = await fetch(`/api/v1/orders/${orderId}`);
    return response.json();
  }, fixture.cancel_order_id);
  expect(releasedDetail.data.reservations[0].status).toBe('released');
  const releasedBalance = await page.evaluate(async (productId: number) => {
    const response = await fetch(`/api/v1/inventory/balances?product_id=${productId}&per_page=100`);
    return response.json();
  }, fixture.product_id);
  expect(Number(releasedBalance.data[0].quantity_reserved)).toBe(0);
  await page.getByRole('button', { name: 'الحجوزات' }).click();
  await expect(page.getByRole('table').getByText('محرر')).toBeVisible();
  await page.screenshot({ path: path.join(screenshotsDirectory, 'order-reservation-released.png'), fullPage: true });

  await page.goto(`/orders/${fixture.invoice_order_id}`);
  await expect(page.getByRole('heading', { name: /تفاصيل الطلب/ })).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'تأكيد الطلب' }).click();
  await expect(page.getByText('مؤكد', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'الحجوزات' }).click();
  await expect(page.getByRole('table').getByText('محجوز')).toBeVisible();
  await page.getByRole('button', { name: 'بيانات الطلب' }).click();
  await page.getByRole('combobox').selectOption(String(fixture.warehouse_id));
  const invoiceResponse = page.waitForResponse((response) =>
    response.request().method() === 'POST'
    && response.url().endsWith(`/api/v1/orders/${fixture.invoice_order_id}/invoice`));
  await page.getByRole('button', { name: 'إصدار فاتورة للطلب بالكامل' }).click();
  const invoiced = await (await invoiceResponse).json();
  expect(invoiced.invoice.status).toBe('issued');
  const consumedDetail = await page.evaluate(async (orderId: number) => {
    const response = await fetch(`/api/v1/orders/${orderId}`);
    return response.json();
  }, fixture.invoice_order_id);
  expect(consumedDetail.data.status).toBe('fulfilled');
  expect(consumedDetail.data.reservations[0].status).toBe('consumed');
  const consumedBalance = await page.evaluate(async (productId: number) => {
    const response = await fetch(`/api/v1/inventory/balances?product_id=${productId}&per_page=100`);
    return response.json();
  }, fixture.product_id);
  expect(Number(consumedBalance.data[0].quantity_on_hand)).toBe(fixture.initial_quantity_on_hand - 3);
  expect(Number(consumedBalance.data[0].quantity_reserved)).toBe(0);
  await page.screenshot({ path: path.join(screenshotsDirectory, 'order-invoice-consumed-reservation.png'), fullPage: true });
});
