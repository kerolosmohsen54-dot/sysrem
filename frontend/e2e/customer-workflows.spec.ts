import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { ar } from '../src/shared/i18n/ar';

type Fixture = { customer_id: number; customer_name: string; order_id: number; invoice_id: number; payment_id: number; governorate_id: number; governorate_name: string };
const fixture = JSON.parse(process.env.CUSTOMER_E2E_FIXTURE ?? '{}') as Fixture;
const screenshots = path.resolve(process.cwd(), '../docs/phase-5/screenshots');
const username = 'sales-workflow-e2e-owner';
const password = 'Sales-workflow-e2e-2026!';

async function signIn(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByLabel(ar.auth.username).selectOption(username);
  await page.getByLabel(ar.auth.password).fill(password);
  await page.getByRole('button', { name: ar.auth.submit }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 });
}

async function completeStepUp(page: import('@playwright/test').Page) {
  const dialog = page.getByRole('dialog', { name: ar.auth.stepUpTitle });
  await expect.poll(async () =>
    (await dialog.isVisible().catch(() => false)) || (await page.locator('.customer-profile-page h1').isVisible().catch(() => false)),
    { timeout: 20_000 },
  ).toBe(true);
  if (!await dialog.isVisible().catch(() => false)) return;
  await dialog.getByLabel(ar.auth.password).fill(password);
  const response = page.waitForResponse((item) => item.request().method() === 'POST' && item.url().endsWith('/api/v1/auth/reauth'));
  await dialog.getByRole('button', { name: ar.auth.reauthenticate }).click();
  expect((await response).ok()).toBeTruthy();
  await expect(dialog).toBeHidden();
}

test('customer records, protected attachments, and governorate maintenance use persisted API data', async ({ page }) => {
  test.setTimeout(240_000);
  expect(fixture.customer_id).toBeGreaterThan(0);
  mkdirSync(screenshots, { recursive: true });
  await signIn(page);

  await page.goto(`/customers/${fixture.customer_id}`);
  await completeStepUp(page);
  await expect(page.getByRole('heading', { name: fixture.customer_name })).toBeVisible({ timeout: 30_000 });
  await page.screenshot({ path: path.join(screenshots, 'customer-profile-overview.png'), fullPage: true });

  await page.getByRole('tab', { name: 'الطلبات' }).click();
  await expect(page.getByRole('link', { name: new RegExp(`SO-`) }).first()).toBeVisible({ timeout: 30_000 });
  const orderLink = page.locator(`a[href="/orders/${fixture.order_id}"]`);
  await expect(orderLink.first()).toBeVisible();
  await page.screenshot({ path: path.join(screenshots, 'customer-profile-orders.png'), fullPage: true });

  await page.getByRole('tab', { name: 'الفواتير' }).click();
  await expect(page.getByRole('link', { name: /^INV-/ }).first()).toBeVisible({ timeout: 30_000 });
  const customerInvoiceLink = page.getByRole('link', { name: /^INV-/ }).first();
  const customerInvoiceHref = await customerInvoiceLink.getAttribute('href');
  expect(customerInvoiceHref).toMatch(/^\/invoices\/\d+$/);
  const customerInvoice = await page.request.get(new URL(`/api/v1/invoices/${customerInvoiceHref!.split('/').at(-1)}`, page.url()).toString());
  expect(customerInvoice.ok()).toBeTruthy();
  expect((await customerInvoice.json()).data.document.customer_id).toBe(fixture.customer_id);
  await page.screenshot({ path: path.join(screenshots, 'customer-profile-invoices.png'), fullPage: true });

  await page.getByRole('tab', { name: 'المدفوعات' }).click();
  const paymentLink = page.locator(`a[href*="receipt=${fixture.payment_id}"]`);
  await expect(paymentLink.first()).toBeVisible({ timeout: 30_000 });
  await page.screenshot({ path: path.join(screenshots, 'customer-profile-payments.png'), fullPage: true });

  await page.getByRole('tab', { name: 'كشف الحساب' }).click();
  await expect(page.getByText('كشف الحساب الكامل')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('table').getByText(/INV-/).first()).toBeVisible({ timeout: 30_000 });
  await page.screenshot({ path: path.join(screenshots, 'customer-profile-statement.png'), fullPage: true });

  await page.getByRole('tab', { name: 'المرفقات' }).click();
  const uploadInput = page.locator('input[type="file"]');
  const pdfContent = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF');
  const uploadResponse = page.waitForResponse((response) => response.request().method() === 'POST' && response.url().endsWith(`/api/v1/customers/${fixture.customer_id}/attachments`));
  await uploadInput.setInputFiles({ name: 'customer-account.pdf', mimeType: 'application/pdf', buffer: pdfContent });
  const uploaded = await uploadResponse;
  expect(uploaded.status()).toBe(201);
  const attachment = (await uploaded.json()).data as { id: number; content_url: string; original_name: string };
  expect(attachment.original_name).toBe('customer-account.pdf');
  await expect(page.getByText('customer-account.pdf')).toBeVisible({ timeout: 30_000 });
  const pdfResponse = await page.request.get(new URL(attachment.content_url, page.url()).toString());
  expect(pdfResponse.status()).toBe(200);
  expect(pdfResponse.headers()['content-type']).toContain('application/pdf');
  expect((await pdfResponse.body()).subarray(0, 5).toString()).toBe('%PDF-');
  const [pdfPreview] = await Promise.all([
    page.waitForEvent('popup'),
    page.getByRole('link', { name: 'عرض', exact: true }).click(),
  ]);
  await expect.poll(() => pdfPreview.url()).toContain('/content?disposition=inline');
  await pdfPreview.close();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('link', { name: 'تحميل' }).click();
  expect((await downloadPromise).suggestedFilename()).toBe('customer-account.pdf');
  await page.screenshot({ path: path.join(screenshots, 'customer-profile-attachments.png'), fullPage: true });

  const executableResponse = page.waitForResponse((response) => response.request().method() === 'POST' && response.url().endsWith(`/api/v1/customers/${fixture.customer_id}/attachments`));
  await uploadInput.setInputFiles({ name: 'program.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('MZ\x90\x00not a document') });
  expect((await executableResponse).status()).toBe(422);
  const oversizedResponse = page.waitForResponse((response) => response.request().method() === 'POST' && response.url().endsWith(`/api/v1/customers/${fixture.customer_id}/attachments`));
  await uploadInput.setInputFiles({ name: 'oversized.pdf', mimeType: 'application/pdf', buffer: Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(10 * 1024 * 1024 + 1)]) });
  const oversizedResult = await oversizedResponse;
  expect(oversizedResult.status(), `${oversizedResult.url()} ${JSON.stringify(oversizedResult.headers())} ${(await oversizedResult.text()).slice(0, 500)}`).toBe(422);

  await page.goto('/admin/governorates');
  await expect(page.getByRole('heading', { name: 'المحافظات' })).toBeVisible({ timeout: 30_000 });
  const newName = `محافظة اختبار ${Date.now()}`;
  await page.getByLabel('اسم محافظة جديدة').fill(newName);
  const createResponse = page.waitForResponse((response) => response.request().method() === 'POST' && response.url().endsWith('/api/v1/reference/governorates'));
  await page.locator('#governorate-create-form').getByRole('button', { name: 'إضافة' }).click();
  const created = await createResponse;
  expect(created.status()).toBe(201);
  const governorate = (await created.json()).data as { id: number; name: string };
  const editedName = `${newName} معدلة`;
  await page.getByRole('button', { name: `تعديل ${newName}` }).click();
  await page.getByLabel(`اسم المحافظة ${newName}`).first().fill(editedName);
  const updateResponse = page.waitForResponse((response) => response.request().method() === 'PATCH' && response.url().endsWith(`/api/v1/reference/governorates/${governorate.id}`));
  await page.getByRole('button', { name: 'حفظ' }).first().click();
  expect((await updateResponse).status()).toBe(200);
  await expect(page.getByText(editedName).first()).toBeVisible();
  const persisted = await page.request.get(new URL(`/api/v1/reference/governorates?search=${encodeURIComponent(editedName)}`, page.url()).toString());
  expect(persisted.ok()).toBeTruthy();
  expect((await persisted.json()).data[0]).toMatchObject({ id: governorate.id, name: editedName, customers_count: 0 });
  await page.screenshot({ path: path.join(screenshots, 'governorates-desktop.png'), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/customers');
  await expect(page.locator('.customer-list-table table')).toBeVisible();
  await page.screenshot({ path: path.join(screenshots, 'customers-mobile.png'), fullPage: true });
  await page.goto('/admin/governorates');
  await expect(page.getByRole('heading', { name: 'المحافظات', exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.governorates-table table')).toBeVisible({ timeout: 30_000 });
  await page.screenshot({ path: path.join(screenshots, 'governorates-mobile.png'), fullPage: true });
});
