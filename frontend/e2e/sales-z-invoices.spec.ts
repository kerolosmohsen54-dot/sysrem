import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { ar } from '../src/shared/i18n/ar';

type Fixture = {
  customer_id: number;
  product_id: number;
  product_sku: string;
  warehouse_id: number;
};

const fixture = JSON.parse(process.env.SALES_E2E_FIXTURE ?? '{}') as Fixture;
const screenshotsDirectory = path.resolve(process.cwd(), '../docs/phase-2/screenshots');
const username = 'sales-workflow-e2e-owner';
const password = 'Sales-workflow-e2e-2026!';

test('invoice create, list filters, revision, and print persist through the live API', async ({ page }) => {
  test.setTimeout(240_000);
  expect(fixture.product_sku).toBeTruthy();
  mkdirSync(screenshotsDirectory, { recursive: true });

  await page.goto('/login');
  await page.getByLabel(ar.auth.username).selectOption(username);
  await page.getByLabel(ar.auth.password).fill(password);
  await page.getByRole('button', { name: ar.auth.submit }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20000 });
  await expect(page.getByRole('button', { name: ar.auth.logout }).first()).toBeVisible({ timeout: 20000 });
  await expect(page.locator('main h1').first()).toBeVisible({ timeout: 20000 });

  await page.goto('/invoices/new');
  const stepUpDialog = page.getByRole('dialog', { name: ar.auth.stepUpTitle });
  const invoiceHeading = page.getByRole('heading', { name: ar.sales.invoiceCreateTitle });
  const retryRequest = page.getByRole('button', { name: 'إعادة المحاولة' });
  await expect.poll(async () =>
    (await stepUpDialog.isVisible().catch(() => false)) ||
    (await invoiceHeading.isVisible().catch(() => false)) ||
    (await retryRequest.isVisible().catch(() => false)),
    { timeout: 30_000 },
  ).toBe(true);
  if (await stepUpDialog.isVisible().catch(() => false)) {
    await stepUpDialog.getByLabel(ar.auth.password).fill(password);
    const reauthentication = page.waitForResponse((response) =>
      response.request().method() === 'POST' && response.url().endsWith('/api/v1/auth/reauth'),
    );
    await stepUpDialog.getByRole('button', { name: ar.auth.reauthenticate }).click();
    expect((await reauthentication).ok()).toBeTruthy();
    await expect(stepUpDialog).toBeHidden();
  }
  if (!await invoiceHeading.isVisible().catch(() => false)) {
    if (await retryRequest.isVisible().catch(() => false)) await retryRequest.click();
    else await page.reload();
  }
  await expect(invoiceHeading).toBeVisible({ timeout: 30_000 });
  const customerPriceResponse = page.waitForResponse((response) =>
    response.request().method() === 'GET' && response.url().endsWith(`/api/v1/customers/${fixture.customer_id}/last-prices`),
    { timeout: 30_000 },
  );
  await page.locator(`select[aria-label="${ar.common.customer}"]`).selectOption(String(fixture.customer_id));
  const customerPrices = await customerPriceResponse;
  expect([200, 428]).toContain(customerPrices.status());
  await completeStepUpIfPrompted(page, 5_000);
  await page.locator('.invoice-issuer-options button').first().click({ timeout: 15_000 });
  await completeStepUpIfPrompted(page, 5_000);
  await page.getByLabel(ar.common.product).selectOption(String(fixture.product_id));
  const lineOptions = page.locator('.invoice-line-list fieldset details').first();
  await lineOptions.locator('summary').click();
  await lineOptions.locator('select').selectOption(String(fixture.warehouse_id));
  await page.locator('#invoice-quantity-0').fill('1');
  const fixedCompanyPrice = page.locator('input[readonly][id^="invoice-company-price-"]');
  const editableSalePrice = page.locator('input[id^="invoice-sale-price-"]');
  await expect(fixedCompanyPrice).toHaveValue(/\d/);
  await expect(editableSalePrice).toHaveValue(/\d/);
  await expect(page.getByText(/رصيد المخزون:\s*\d+/)).toBeVisible();
  await expect(page.getByText('سعر الشركة للوحدة')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(fixedCompanyPrice).toBeVisible();
  await expect(editableSalePrice).toBeVisible();
  await expect(page.getByLabel('سعر البيع للوحدة 1')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByLabel('سعر البيع للوحدة 1').fill('25.00');
  await page.locator('.invoice-form-card textarea').first().fill('Acceptance invoice draft');
  await expect(page.locator('.invoice-price-surplus strong')).toContainText('15.00');
  await expect(page.locator('.invoice-line-total')).toContainText('25.00');
  await expect.poll(() => page.evaluate(() => Object.keys(localStorage).some((key) => key.startsWith('precision-slate:invoice-compose:')))).toBe(true);
  await page.reload();
  await expect(invoiceHeading).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(`select[aria-label="${ar.common.customer}"]`)).toHaveValue(String(fixture.customer_id));
  await expect(page.getByLabel(ar.common.product)).toHaveValue(String(fixture.product_id));
  await expect(page.locator('#invoice-quantity-0')).toHaveValue('1');
  await expect(page.getByLabel('سعر البيع للوحدة 1')).toHaveValue('25.00');
  await expect(page.locator('.invoice-form-card textarea').first()).toHaveValue('Acceptance invoice draft');
  await page.goto('/dashboard');
  await page.goto('/invoices/new');
  await expect(invoiceHeading).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(`select[aria-label="${ar.common.customer}"]`)).toHaveValue(String(fixture.customer_id));
  await expect(page.locator('#invoice-quantity-0')).toHaveValue('1');
  await completeStepUpIfPrompted(page, 5_000);
  await page.screenshot({ path: path.join(screenshotsDirectory, 'invoice-create-form.png'), animations: 'disabled', fullPage: false, timeout: 60_000 });

  const draftPromise = page.waitForResponse((response) =>
    response.request().method() === 'POST' && response.url().endsWith('/api/v1/invoices'),
  );
  await page.locator('#invoice-create-form').getByRole('button', { name: ar.sales.saveDraft }).click({ timeout: 15_000 });
  const draftResponse = await draftPromise;
  expect(draftResponse.status()).toBe(201);
  const draftPayload = await draftResponse.json();
  const draft = draftPayload.data.document;
  const draftId = Number(draft.id);
  expect(draft).toMatchObject({
    status: 'draft',
    customer_id: fixture.customer_id,
    issuer_type: 'company',
    payment_terms: 'deferred',
    notes: 'Acceptance invoice draft',
  });
  expect(Number(draft.total_amount)).toBe(25);
  expect(draftPayload.data.lines[0]).toMatchObject({ product_id: fixture.product_id, location_id: fixture.warehouse_id, quantity: 1 });

  await page.goto(`/invoices/${draftId}`);
  await expect(page.getByRole('heading', { name: new RegExp(ar.sales.invoiceDetails) })).toBeVisible({ timeout: 30000 });
  await expect(page.getByText(ar.sales.statusDraft)).toBeVisible({ timeout: 30000 });
  await page.screenshot({ path: path.join(screenshotsDirectory, 'invoice-draft-details.png'), fullPage: true });

  const issuePromise = page.waitForResponse((response) =>
    response.request().method() === 'POST' && response.url().endsWith(`/api/v1/invoices/${draftId}/issue`),
  );
  await page.getByRole('button', { name: 'إصدار الفاتورة' }).click();
  const issueResponse = await issuePromise;
  expect(issueResponse.status()).toBe(200);
  expect((await issueResponse.json()).data.document.status).toBe('posted');
  await expect(page.getByText(ar.sales.statusIssued)).toBeVisible({ timeout: 30000 });

  await page.getByRole('link', { name: ar.sales.reviseInvoice }).click();
  await expect(page.getByRole('heading', { name: new RegExp(ar.sales.reviseInvoiceTitle) })).toBeVisible({ timeout: 30000 });
  const textareas = page.locator('.invoice-form-grid textarea');
  await textareas.nth(0).fill('Acceptance invoice revision');
  await textareas.nth(1).fill('Acceptance test price and notes correction');
  await page.screenshot({ path: path.join(screenshotsDirectory, 'invoice-revision-form.png'), fullPage: true });
  const revisionPromise = page.waitForResponse((response) =>
    response.request().method() === 'PUT' && response.url().endsWith(`/api/v1/invoices/${draftId}`),
  );
  await page.locator('.invoice-form-summary button[type="submit"]').click();
  const revisionResponse = await revisionPromise;
  expect([200, 201]).toContain(revisionResponse.status());
  const revisionPayload = await revisionResponse.json();
  const revisedId = Number(revisionPayload.data.document.id);
  const revisedNumber = String(revisionPayload.data.document.document_number);
  expect(revisedId).toBeGreaterThan(0);
  const persistedRevision = await page.evaluate(async (id: number) => {
    const response = await fetch(`/api/v1/invoices/${id}`);
    return response.json();
  }, revisedId);
  expect(persistedRevision.data.document.notes).toBe('Acceptance invoice revision');

  await page.goto('/invoices');
  await expect(page.locator('main h1')).toContainText(ar.nav.invoices, { timeout: 30000 });
  const invoiceSearch = page.locator('.invoice-filter-bar input[type="search"]');
  await expect(invoiceSearch).toBeVisible({ timeout: 30000 });
  await invoiceSearch.fill(revisedNumber);
  await page.locator('#invoice-customer-filter').selectOption(String(fixture.customer_id));
  await page.locator('#invoice-sort-filter').selectOption('total_amount');
  await page.getByRole('button', { name: 'تغيير اتجاه الترتيب' }).click();
  const revisedInvoiceLink = page.getByRole('link', { name: `تفاصيل الفاتورة ${revisedNumber}` });
  await expect(revisedInvoiceLink).toBeVisible({ timeout: 30000 });
  await page.screenshot({ path: path.join(screenshotsDirectory, 'invoice-list-filtered.png'), fullPage: true });
  await revisedInvoiceLink.click();
  await expect(page).toHaveURL(new RegExp(`/invoices/${revisedId}$`));
  await expect(page.getByLabel('بيانات الفاتورة').getByText('Acceptance invoice revision')).toBeVisible();
  await page.screenshot({ path: path.join(screenshotsDirectory, 'invoice-revised-details.png'), fullPage: true });

  const pdfDownloadWait = page.waitForEvent('download', { timeout: 30_000 });
  await page.getByRole('link', { name: 'تنزيل PDF' }).click();
  const pdfDownload = await pdfDownloadWait;
  expect(pdfDownload.suggestedFilename()).toBe(`${revisedNumber}.pdf`);
  await expect(page).toHaveURL(new RegExp(`/invoices/${revisedId}/pdf$`));
  await expect(page.getByRole('heading', { name: 'تنزيل ملف PDF' })).toBeVisible();
  await expect(page.getByRole('button', { name: ar.sales.printInvoice })).not.toBeVisible();

  await page.getByRole('link', { name: 'تفاصيل الفاتورة' }).click();
  await page.getByRole('link', { name: 'معاينة الطباعة' }).click();
  await expect(page.locator('.invoice-print-paper')).toContainText(revisedNumber);
  await expect(page.locator('.invoice-print-paper')).toContainText(persistedRevision.data.lines[0].description_snapshot);
  await page.evaluate(() => { window.print = () => undefined; });
  const printPromise = page.waitForResponse((response) =>
    response.request().method() === 'POST' && response.url().endsWith(`/api/v1/invoices/${revisedId}/printed`),
  );
  await page.getByRole('button', { name: ar.sales.printInvoice }).click();
  expect((await printPromise).status()).toBe(200);
  const persistedPrint = await page.evaluate(async (id: number) => {
    const response = await fetch(`/api/v1/invoices/${id}`);
    return response.json();
  }, revisedId);
  expect(persistedPrint.data.document.printed_at).toBeTruthy();
  expect(persistedPrint.data.document.print_count).toBeGreaterThan(0);
  await page.screenshot({ path: path.join(screenshotsDirectory, 'invoice-print-preview.png'), fullPage: true });
});

async function completeStepUpIfPrompted(page: import('@playwright/test').Page, timeout = 3_000) {
  const dialog = page.getByRole('dialog', { name: ar.auth.stepUpTitle });
  const shown = await dialog.waitFor({ state: 'visible', timeout }).then(() => true).catch(() => false);
  if (!shown) return;
  await dialog.getByLabel(ar.auth.password).fill(password);
  const reauthentication = page.waitForResponse((response) =>
    response.request().method() === 'POST' && response.url().endsWith('/api/v1/auth/reauth'),
  );
  await dialog.getByRole('button', { name: ar.auth.reauthenticate }).click();
  expect((await reauthentication).ok()).toBeTruthy();
  await expect(dialog).toBeHidden();
}
