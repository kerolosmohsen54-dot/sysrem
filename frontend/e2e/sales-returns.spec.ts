import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { ar } from '../src/shared/i18n/ar';

type Fixture = {
  customer_id: number;
  customer_name: string;
  product_id: number;
  product_sku: string;
  warehouse_id: number;
  source_invoice_id: number;
  source_invoice_line_id: number;
};

const fixture = JSON.parse(process.env.SALES_E2E_FIXTURE ?? '{}') as Fixture;
const screenshotsDirectory = path.resolve(process.cwd(), '../docs/phase-2/screenshots');
const username = 'sales-workflow-e2e-owner';
const password = 'Sales-workflow-e2e-2026!';

test('linked and free returns persist, enforce remaining sold quantity, and print from database records', async ({ page }) => {
  test.setTimeout(120_000);
  expect(fixture.source_invoice_id).toBeGreaterThan(0);
  expect(fixture.source_invoice_line_id).toBeGreaterThan(0);
  mkdirSync(screenshotsDirectory, { recursive: true });

  await page.goto('/login');
  await page.getByLabel(ar.auth.username).selectOption(username);
  await page.getByLabel(ar.auth.password).fill(password);
  await page.getByRole('button', { name: ar.auth.submit }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20000 });
  await expect(page.getByRole('button', { name: ar.auth.logout }).first()).toBeVisible({ timeout: 20000 });
  await expect(page.locator('main h1').first()).toBeVisible({ timeout: 20000 });

  await page.goto('/returns/new');
  await expect(page.getByRole('heading', { name: ar.sales.returnCreateTitle })).toBeVisible({ timeout: 30000 });
  await page.getByLabel(ar.sales.returnSelectInvoice).selectOption(String(fixture.source_invoice_id));
  await expect(page.getByText(fixture.customer_name, { exact: true })).toBeVisible();
  await page.getByLabel(ar.sales.returnSelectWarehouse).selectOption(String(fixture.warehouse_id));
  const linkedLine = page.locator('section[aria-labelledby="linked-return-lines-heading"] select').first();
  await linkedLine.selectOption(String(fixture.source_invoice_line_id));
  const quantity = page.locator('input[name="quantity"]');

  await quantity.fill('3');
  await page.getByRole('button', { name: ar.sales.previewWaiting }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('button', { name: ar.sales.submitReturn })).toBeDisabled();
  await page.screenshot({ path: path.join(screenshotsDirectory, 'return-linked-over-quantity-blocked.png'), fullPage: true });

  await quantity.fill('2');
  const previewResponse = page.waitForResponse((response) =>
    response.request().method() === 'POST' && response.url().endsWith('/api/v1/returns/preview'),
  );
  await page.getByRole('button', { name: ar.sales.previewWaiting }).click();
  expect((await previewResponse).status()).toBe(200);
  await expect(page.getByRole('button', { name: ar.sales.submitReturn })).toBeEnabled();
  await page.screenshot({ path: path.join(screenshotsDirectory, 'return-linked-form-preview.png'), fullPage: true });

  const linkedCreation = page.waitForResponse((response) =>
    response.request().method() === 'POST' && response.url().endsWith('/api/v1/returns'),
  );
  await page.getByRole('button', { name: ar.sales.submitReturn }).click();
  const linkedResponse = await linkedCreation;
  expect(linkedResponse.status()).toBe(201);
  const linkedPayload = await linkedResponse.json();
  const linkedReturnId = Number(linkedPayload.data.document.id);
  expect(linkedPayload.data.document.document_number).toMatch(/^RET-/);
  expect(linkedPayload.data.document.original_document_id).toBe(fixture.source_invoice_id);

  const csrf = await page.evaluate(() => decodeURIComponent(document.cookie.split('; ').find(part => part.startsWith('XSRF-TOKEN='))?.slice('XSRF-TOKEN='.length) ?? ''));
  const reauthentication = await page.request.post('/api/v1/auth/reauth', {
    headers: { 'X-CSRF-Token': csrf, Accept: 'application/json' },
    data: { password },
  });
  expect(reauthentication.ok()).toBeTruthy();
  const invoiceResponse = await page.request.get(`/api/v1/invoices/${fixture.source_invoice_id}`);
  expect(invoiceResponse.status()).toBe(200);
  const invoiceAfterReturn = await invoiceResponse.json();
  const returnedSourceLine = invoiceAfterReturn.data.lines.find(
    (line: { id: number }) => line.id === fixture.source_invoice_line_id,
  );
  expect(Number(returnedSourceLine.returned_quantity)).toBe(2);
  expect(Number(returnedSourceLine.remaining_quantity)).toBe(0);
  await expect(page).toHaveURL(new RegExp(`/returns/${linkedReturnId}/print$`));
  await expect(page.locator('.return-print-paper')).toContainText(linkedPayload.data.document.document_number);
  await page.evaluate(() => { window.print = () => undefined; });
  const linkedPrint = page.waitForResponse((response) =>
    response.request().method() === 'POST' && response.url().endsWith(`/api/v1/returns/${linkedReturnId}/printed`),
  );
  await page.getByRole('button', { name: ar.sales.printInvoice }).click();
  expect((await (await linkedPrint).json()).data.document.print_count).toBeGreaterThan(0);
  await page.screenshot({ path: path.join(screenshotsDirectory, 'return-linked-print.png'), fullPage: true });

  await page.goto('/returns/new');
  await expect(page.getByRole('heading', { name: ar.sales.returnCreateTitle })).toBeVisible({ timeout: 30000 });
  await page.getByRole('button', { name: ar.sales.freeReturn }).click();
  await page.getByLabel(ar.common.customer).selectOption(String(fixture.customer_id));
  await page.getByLabel(ar.sales.returnSelectWarehouse).selectOption(String(fixture.warehouse_id));
  await page.getByLabel(ar.common.product).selectOption(String(fixture.product_id));
  await page.locator('input[name="quantity"]').fill('1');
  await page.locator('input[name="unit_price_egp"]').fill('25.00');
  await page.locator('input[name="return_reason"]').fill('Acceptance free return reason');
  await page.screenshot({ path: path.join(screenshotsDirectory, 'return-free-form.png'), fullPage: true });

  const freePreview = page.waitForResponse((response) =>
    response.request().method() === 'POST' && response.url().endsWith('/api/v1/returns/preview'),
  );
  await page.getByRole('button', { name: ar.sales.previewWaiting }).click();
  expect((await freePreview).status()).toBe(200);
  const freeCreation = page.waitForResponse((response) =>
    response.request().method() === 'POST' && response.url().endsWith('/api/v1/returns'),
  );
  await page.getByRole('button', { name: ar.sales.submitReturn }).click();
  const freeResponse = await freeCreation;
  expect(freeResponse.status()).toBe(201);
  const freePayload = await freeResponse.json();
  const freeReturnId = Number(freePayload.data.document.id);
  expect(freePayload.data.document.original_document_id).toBeNull();
  expect(freePayload.data.document.return_reason).toBe('Acceptance free return reason');

  const persistedFreeReturn = await page.evaluate(async (id: number) => {
    const response = await fetch(`/api/v1/returns/${id}`);
    return response.json();
  }, freeReturnId);
  expect(persistedFreeReturn.data.document.return_reason).toBe('Acceptance free return reason');
  expect(persistedFreeReturn.data.document.return_processing_type).toBe('free');
  await expect(page).toHaveURL(new RegExp(`/returns/${freeReturnId}/print$`));
  await expect(page.locator('.return-print-paper')).toContainText('Acceptance free return reason');
  await page.screenshot({ path: path.join(screenshotsDirectory, 'return-free-print.png'), fullPage: true });
});
