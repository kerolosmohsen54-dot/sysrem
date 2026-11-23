import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { ar } from '../src/shared/i18n/ar';

type Fixture = {
  partner_id: number; partner_name: string; container_partner_id: number; container_id: number; treasury_id: number; category_id: number; category_name: string; customer_id: number; source_invoice_id: number;
  source_invoice_number: string; username: string; today: string; next_month: string;
};
const fixture = JSON.parse(process.env.FINANCE_E2E_FIXTURE ?? '{}') as Fixture;
const password = 'Sales-workflow-e2e-2026!';
const screenshots = path.resolve(process.cwd(), '../docs/phase-4/screenshots');

test('company partner profit-only view fits a 390px mobile screen without horizontal scrolling', async ({ page }) => {
  expect(fixture.username).toBeTruthy();
  await signIn(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/partners');
  const stepUpPassword = page.locator('#step-up-password');
  if (await stepUpPassword.waitFor({ state: 'visible', timeout: 10_000 }).then(() => true).catch(() => false)) {
    await stepUpPassword.fill(password);
    const reauthResponse = page.waitForResponse((response) => response.request().method() === 'POST' && response.url().endsWith('/api/v1/auth/reauth'));
    await page.getByRole('dialog').getByRole('button', { name: ar.auth.reauthenticate }).click();
    expect((await reauthResponse).ok()).toBe(true);
    await expect(stepUpPassword).toBeHidden();
  }
  await expect(page.getByRole('heading', { name: ar.nav.partners })).toBeVisible();
  await page.getByRole('button', { name: '\u0627\u0644\u0623\u0631\u0628\u0627\u062d \u0641\u0642\u0637' }).click();
  await expect(page.getByRole('heading', { name: '\u0623\u0631\u0628\u0627\u062d \u0627\u0644\u0634\u0631\u0643\u0627\u0621 \u0641\u0642\u0637' })).toBeVisible();
  await expect(page.locator('.company-partners-profit-table + .table-cards')).toBeVisible();
  await expect(page.locator('.company-partners-profit-table')).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('finance planning, recurring scheduling, comparisons, collections and responsive hierarchy persist through Laravel and MariaDB', async ({ page }) => {
  test.setTimeout(240_000);
  expect(fixture.partner_id).toBeGreaterThan(0);
  expect(fixture.treasury_id).toBeGreaterThan(0);
  expect(fixture.source_invoice_id).toBeGreaterThan(0);
  mkdirSync(screenshots, { recursive: true });

  await signIn(page);
  await page.goto('/finance');
  await expect(page.getByRole('heading', { name: ar.nav.finance, exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.finance-data-notice')).toBeHidden({ timeout: 30_000 });
  const hierarchy = page.locator('.finance-sections > .finance-section').first();
  await expect(hierarchy.getByRole('link').first()).toHaveAttribute('href', '/reports/customer-balances');
  await expect(hierarchy.getByRole('link').nth(1)).toHaveAttribute('href', '/finance/treasury');
  await expect(hierarchy.getByRole('link', { name: ar.finance.chartOfAccounts })).toHaveAttribute('href', '/finance/chart-of-accounts');
  await hierarchy.scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(screenshots, 'finance-hierarchy-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await hierarchy.getByRole('heading', { level: 2 }).scrollIntoViewIfNeeded();
  await expect(hierarchy).toBeVisible();
  await page.screenshot({ path: path.join(screenshots, 'finance-hierarchy-mobile.png'), fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });

  const forecastMonth = `${addDays(fixture.today, 90).slice(0, 7)}-01`;
  const forecastStart = addDays(forecastMonth, 1);
  const expectedDate = addDays(forecastStart, 4);
  await page.goto('/finance/pending-funds');
  await expect(page.getByRole('heading', { name: 'الأموال المنتظرة' })).toBeVisible();
  await completeStepUp(page);
  await page.getByLabel('الشريك').selectOption(String(fixture.partner_id));
  await page.getByLabel('مصدر المبلغ').fill('تحويل شريك لاختبار التوقع');
  await page.getByLabel('مرجع المصدر').fill('FINANCE-E2E-PENDING');
  await page.getByLabel('التفاصيل').fill('دفعة متوقعة مرتبطة بمصدر وتاريخ استحقاق');
  await page.getByLabel('تاريخ الاستحقاق').fill(expectedDate);
  await page.getByLabel('المبلغ المتوقع').fill('120.00');
  const pendingResponse = page.waitForResponse((response) => response.request().method() === 'POST' && response.url().endsWith('/api/v1/pending-funds'));
  await page.getByRole('button', { name: 'حفظ المبلغ المنتظر' }).click();
  await completeStepUp(page);
  const pending = await (await pendingResponse).json();
  expect(pending.data).toMatchObject({ source_label: 'تحويل شريك لاختبار التوقع', amount: '120.00', remaining_amount: '120.00', status: 'pending' });
  const pendingRow = page.getByRole('row').filter({ hasText: fixture.partner_name });
  await expect(pendingRow).toBeVisible();
  await pendingRow.getByRole('button', { name: 'استلام فعلي' }).click();
  await page.getByLabel('المبلغ المستلم').fill('20.00');
  await page.getByLabel('الخزينة الفعلية').selectOption(String(fixture.treasury_id));
  const receiveResponse = page.waitForResponse((response) => response.request().method() === 'POST' && response.url().endsWith(`/api/v1/pending-funds/${pending.data.id}/receive`));
  await page.getByRole('button', { name: 'تسجيل الاستلام الفعلي' }).click();
  await completeStepUp(page);
  const received = await (await receiveResponse).json();
  expect(received.data).toMatchObject({ received_amount: '20.00', remaining_amount: '100.00', status: 'partially_received' });
  await page.screenshot({ path: path.join(screenshots, 'pending-funds-received.png'), fullPage: true });

  await page.goto('/finance/partner-installments');
  await expect(page.getByRole('heading', { name: 'شركاء الحاوية' })).toBeVisible();
  await completeStepUp(page);
  const planReference = `FINANCE-E2E-PLAN-${fixture.container_partner_id}`;
  await page.getByLabel('شريك الحاوية').selectOption(String(fixture.container_partner_id));
  await page.locator('select[name="container_id"]').selectOption(String(fixture.container_id));
  await page.getByLabel('مرجع المساهمة').fill(planReference);
  await page.getByLabel('إجمالي مساهمة الشريك').fill('90.00');
  await page.getByLabel('قيمة القسط الشهري').fill('30.00');
  await page.getByLabel('تاريخ أول قسط').fill(fixture.today);
  const planResponse = page.waitForResponse((response) => response.request().method() === 'POST' && response.url().endsWith('/api/v1/partner-installment-plans'));
  await page.getByRole('button', { name: 'حفظ إجمالي المساهمة' }).click();
  await completeStepUp(page);
  const plan = await (await planResponse).json();
  expect(plan.data.contribution_mode).toBe('scheduled');
  expect(plan.data.installments).toHaveLength(3);
  expect(plan.data.installment_amount).toBe('30.00');
  const planRow = page.getByRole('row').filter({ hasText: planReference });
  await planRow.getByLabel(/مبلغ دفعة/).fill('10.00');
  await planRow.getByLabel('تاريخ الدفعة').fill(fixture.today);
  await planRow.getByLabel('حساب الخزينة').selectOption(String(fixture.treasury_id));
  const paymentResponse = page.waitForResponse((response) => response.request().method() === 'POST' && response.url().endsWith(`/api/v1/partner-installment-plans/${plan.data.id}/payments`));
  await planRow.getByRole('button', { name: 'استلام دفعة' }).click();
  await completeStepUp(page);
  const paidPlan = await (await paymentResponse).json();
  expect(paidPlan.data.paid_amount).toBe('10.00');
  expect(paidPlan.data.installments[0].paid_amount).toBe('10.00');
  expect(paidPlan.data.payments).toHaveLength(1);
  await page.screenshot({ path: path.join(screenshots, 'container-partner-payments.png'), fullPage: true });

  await page.goto('/finance/expense-budgets');
  await expect(page.getByRole('heading', { name: 'ميزانية المصروفات' })).toBeVisible();
  const budgetListResponse = page.waitForResponse((response) => response.request().method() === 'GET' && response.url().includes(`/api/v1/expense-budgets?period=${forecastMonth.slice(0, 7)}`));
  await page.getByLabel('الفترة الشهرية').fill(forecastMonth.slice(0, 7));
  const budgetList = await (await budgetListResponse).json();
  expect(budgetList.data).toContainEqual(expect.objectContaining({ expense_category_id: fixture.category_id, category_name: fixture.category_name }));
  const budgetRow = page.getByRole('row').filter({ has: page.getByRole('rowheader', { name: fixture.category_name, exact: true }) });
  await expect(budgetRow).toBeVisible({ timeout: 15_000 });
  await budgetRow.getByLabel(/ميزانية/).fill('200.00');
  await budgetRow.getByLabel(/ملاحظات/).fill('حد شهري لاختبار التوقع');
  const budgetSaveResponse = page.waitForResponse((response) => response.request().method() === 'POST' && response.url().endsWith('/api/v1/expense-budgets'));
  await budgetRow.getByRole('button', { name: 'حفظ' }).click();
  await completeStepUp(page);
  const budget = await (await budgetSaveResponse).json();
  expect(budget.data.expense_category_id).toBe(fixture.category_id);
  await page.screenshot({ path: path.join(screenshots, 'expense-budgets.png'), fullPage: true });

  await page.goto('/finance/recurring-expenses');
  await expect(page.getByRole('heading', { name: 'المصروفات المتكررة' })).toBeVisible();
  await completeStepUp(page);
  await page.getByLabel('اسم القالب').fill('Finance acceptance monthly expense');
  await page.getByLabel('التصنيف').selectOption(String(fixture.category_id));
  await page.getByLabel('المبلغ الشهري').fill('15.00');
  await page.getByLabel('يوم الاستحقاق من الشهر').fill('2');
  await page.getByLabel('تاريخ بدء التكرار').fill(forecastStart);
  const recurringResponse = page.waitForResponse((response) => response.request().method() === 'POST' && response.url().endsWith('/api/v1/recurring-expenses'));
  await page.getByRole('button', { name: 'إضافة القالب' }).click();
  await completeStepUp(page);
  const recurring = await (await recurringResponse).json();
  expect(recurring.data).toMatchObject({ name: 'Finance acceptance monthly expense', status: 'active', amount: '15.0000' });
  const backend = path.resolve(process.cwd(), '../backend');
  const php = process.env.PHP83_BIN || 'php';
  const commandEnv = { ...process.env, DB_CONNECTION: 'mysql_test', DB_TEST_DATABASE: 'erp_acceptance_tests', DB_DATABASE: 'erp_acceptance_tests' };
  const runScheduler = () => execFileSync(php, ['artisan', 'finance:recurring-expenses:materialize', `--through=${forecastStart}`], { cwd: backend, env: commandEnv, encoding: 'utf8' });
  const firstRun = runScheduler();
  const secondRun = runScheduler();
  expect(firstRun).toMatch(/Created [1-9][0-9]* recurring expense occurrence/);
  expect(secondRun).toContain('Created 0 recurring expense occurrence');
  const recurringList = await page.evaluate(async () => fetch('/api/v1/recurring-expenses').then((response) => response.json()));
  const createdTemplate = recurringList.data.find((row: { id: number }) => row.id === recurring.data.id);
  expect(createdTemplate.occurrences).toHaveLength(1);
  expect(createdTemplate.occurrences[0].period_start).toBe(forecastMonth);
  await page.screenshot({ path: path.join(screenshots, 'recurring-expense-once-per-cycle.png'), fullPage: true });

  await page.goto('/finance/cash-forecast');
  await page.getByLabel('بداية الفترة').fill(forecastStart);
  const forecastResponse = await page.waitForResponse((response) => response.request().method() === 'GET' && response.url().includes('/api/v1/finance-reports/cash-forecast') && response.url().includes(`from_date=${forecastStart}`));
  const forecast = await forecastResponse.json();
  const forecastWeek = forecast.data.weeks[0];
  expect(Number(forecastWeek.pending_funds)).toBeGreaterThanOrEqual(100);
  expect(forecastWeek.sources.pending_funds).toContainEqual(expect.objectContaining({ id: pending.data.id, amount: '100.00' }));
  expect(Number(forecastWeek.partner_installments)).toBe(0);
  expect(forecastWeek.sources.partner_installments).not.toContainEqual(expect.objectContaining({ plan_id: plan.data.id }));
  expect(Number(forecastWeek.recurring_expenses)).toBeGreaterThanOrEqual(15);
  expect(forecastWeek.sources.recurring_expenses).toContainEqual(expect.objectContaining({ id: createdTemplate.occurrences[0].id, amount: '15.0000' }));
  expect(Number(forecast.data.weeks[0].budgeted_expenses)).toBeGreaterThan(0);
  expect(forecast.data.weeks[0].projected_closing_balance).toBeTruthy();
  await expect(page.getByRole('cell', { name: 'أموال منتظرة', exact: true })).toBeVisible();
  await page.screenshot({ path: path.join(screenshots, 'cash-forecast-weeks.png'), fullPage: true });

  await page.goto('/finance/monthly-comparison');
  await page.getByLabel('الشهر الأول').fill('2040-01');
  const zeroComparisonResponse = page.waitForResponse((response) => response.request().method() === 'GET' && response.url().includes('/api/v1/finance-reports/monthly-comparison?month_a=2040-01&month_b=2040-02'));
  await page.getByLabel('الشهر الثاني / الأساس').fill('2040-02');
  const comparison = await (await zeroComparisonResponse).json();
  await expect(page.getByText('لا توجد قيمة أساس للمقارنة').first()).toBeVisible({ timeout: 15_000 });
  expect(comparison.data.metrics.sales).toEqual({ month_a: '0.00', month_b: '0.00', difference: '0.00', change_percent: null });
  expect(comparison.data.metrics.profit.change_percent).toBeNull();
  await page.screenshot({ path: path.join(screenshots, 'monthly-comparison-zero-period.png'), fullPage: true });

  await page.goto('/collections');
  await expect(page.getByRole('heading', { name: ar.nav.collections })).toBeVisible();
  await completeStepUp(page);
  await expect(page.getByRole('region', { name: 'مؤشرات التحصيل' })).toBeVisible();
  await expect(page.getByRole('heading', { name: ar.nav.invoices, exact: true })).toBeVisible();
  await page.getByRole('button', { name: ar.sales.recordCollection }).click();
  await page.getByLabel(ar.common.customer).selectOption(String(fixture.customer_id));
  await page.getByLabel(ar.sales.treasuryAccount).selectOption(String(fixture.treasury_id));
  await page.getByLabel(ar.sales.receiptAmount).fill('40.00');
  await page.getByLabel(ar.sales.collectionInvoice).selectOption(String(fixture.source_invoice_id));
  await page.getByLabel(ar.sales.allocatedAmount).fill('30.00');
  const collectionResponse = page.waitForResponse((response) => response.request().method() === 'POST' && response.url().endsWith('/api/v1/collections'));
  await page.getByRole('dialog').getByRole('button', { name: ar.sales.recordCollection }).click();
  await completeStepUp(page);
  const collection = await (await collectionResponse).json();
  expect(collection.data.receipt.unapplied_amount).toBe('10.0000');
  const collectionRow = page.getByRole('row').filter({ hasText: collection.data.receipt.receipt_number });
  await expect(collectionRow.getByRole('button', { name: 'إدارة التخصيص' })).toBeVisible();
  await collectionRow.getByRole('button', { name: 'إدارة التخصيص' }).click();
  const allocationDialog = page.getByRole('dialog', { name: 'تخصيص الدفعة وعكس التخصيص' });
  const openInvoiceOption = allocationDialog.getByLabel('فاتورة العميل').locator('option').nth(1);
  const openInvoiceId = await openInvoiceOption.getAttribute('value');
  expect(openInvoiceId).toBeTruthy();
  await allocationDialog.getByLabel('فاتورة العميل').selectOption(openInvoiceId!);
  await allocationDialog.getByLabel(ar.sales.allocatedAmount).fill('10.00');
  const allocateResponse = page.waitForResponse((response) => response.request().method() === 'POST' && response.url().endsWith(`/api/v1/collections/${collection.data.receipt.id}/allocations`));
  await allocationDialog.getByRole('button', { name: 'تخصيص للفاتورة المحددة' }).click();
  await completeStepUp(page);
  expect((await allocateResponse).ok()).toBe(true);
  const firstAllocation = allocationDialog.locator('.collection-allocation-row').first();
  await firstAllocation.getByLabel('مبلغ التخصيص المراد عكسه').fill('5.00');
  await firstAllocation.getByLabel('سبب عكس التخصيص').fill('تصحيح توزيع التحصيل');
  const reverseResponse = page.waitForResponse((response) => response.request().method() === 'POST' && response.url().includes(`/api/v1/collections/${collection.data.receipt.id}/allocations/`) && response.url().endsWith('/reverse'));
  await firstAllocation.getByRole('button', { name: 'عكس التخصيص' }).click();
  await completeStepUp(page);
  expect((await reverseResponse).ok()).toBe(true);
  const detail = await page.evaluate(async (receiptId) => fetch(`/api/v1/collections/${receiptId}`).then((response) => response.json()), collection.data.receipt.id);
  expect(detail.data.allocations.reduce((sum: number, row: { active_egp: string }) => sum + Number(row.active_egp), 0)).toBe(35);
  await page.screenshot({ path: path.join(screenshots, 'collections-allocation-reversal.png'), fullPage: true });
});

async function signIn(page: Page) {
  await page.goto('/login');
  await page.getByLabel(ar.auth.username).selectOption(fixture.username);
  await page.getByLabel(ar.auth.password).fill(password);
  const loginResponse = page.waitForResponse((response) => response.request().method() === 'POST' && response.url().endsWith('/api/v1/auth/login'));
  await page.getByRole('button', { name: ar.auth.submit }).click();
  const response = await loginResponse;
  expect(response.ok()).toBe(true);
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
  await expect(page.getByRole('button', { name: ar.auth.logout }).first()).toBeVisible({ timeout: 20_000 });
}

async function completeStepUp(page: Page) {
  const passwordField = page.locator('#step-up-password');
  if (await passwordField.waitFor({ state: 'visible', timeout: 1_000 }).then(() => true).catch(() => false)) {
    await passwordField.fill(password);
    const response = page.waitForResponse((item) => item.request().method() === 'POST' && item.url().endsWith('/api/v1/auth/reauth'));
    await page.locator('.modal-backdrop').filter({ has: passwordField }).getByRole('button', { name: 'تأكيد ومتابعة' }).click();
    expect((await response).ok()).toBe(true);
    await expect(passwordField).toBeHidden({ timeout: 10_000 });
  }
}

function addDays(date: string, amount: number): string {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + amount);
  return value.toISOString().slice(0, 10);
}
