import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { ar } from '../src/shared/i18n/ar';

type Fixture = { date: string; accounts: { cash: number; equity: number; revenue: number; expense: number }; treasury_id: number; username: string };
const fixture = JSON.parse(process.env.ACCOUNTING_E2E_FIXTURE ?? '{}') as Fixture;
const screenshotsDirectory = path.resolve(process.cwd(), '../docs/phase-3/screenshots');
const password = 'Sales-workflow-e2e-2026!';

test('real accounting flows post once, reverse by a new entry, reconcile reports and persist adjustment audit', async ({ page }) => {
  test.setTimeout(180_000);
  expect(fixture.accounts.cash).toBeGreaterThan(0);
  expect(fixture.treasury_id).toBeGreaterThan(0);
  mkdirSync(screenshotsDirectory, { recursive: true });

  await page.goto('/login');
  await page.getByLabel(ar.auth.username).selectOption(fixture.username);
  await page.getByLabel(ar.auth.password).fill(password);
  await page.getByRole('button', { name: ar.auth.submit }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 });
  await expect(page.getByRole('button', { name: ar.auth.logout }).first()).toBeVisible({ timeout: 20_000 });

  const accountsResponsePromise = page.waitForResponse((response) =>
    response.request().method() === 'GET' && response.url().endsWith('/api/v1/accounting/accounts'),
    { timeout: 30_000 },
  );
  await page.goto('/finance/chart-of-accounts');
  const accountsResponse = await accountsResponsePromise;
  console.log(`accounting accounts API status: ${accountsResponse.status()}`);
  await expect(page.getByRole('heading', { name: ar.finance.chartOfAccounts })).toBeVisible({ timeout: 30_000 });
  expect(await page.getByText(/AE-[A-F0-9]{8}-cash/).count()).toBeGreaterThan(0);
  const uiAccountCode = `AE-UI-${Date.now()}`;
  await page.getByRole('button', { name: 'حساب جديد' }).click();
  await page.getByLabel('كود الحساب').fill(uiAccountCode);
  const createdAccountName = `Acceptance created chart account ${uiAccountCode}`;
  const updatedAccountName = `Acceptance updated chart account ${uiAccountCode}`;
  await page.getByLabel('اسم الحساب').fill(createdAccountName);
  const accountCreatePromise = page.waitForResponse((response) => response.request().method() === 'POST' && response.status() !== 428 && response.url().endsWith('/api/v1/accounting/accounts'));
  await page.getByRole('button', { name: 'حفظ الحساب' }).click();
  await completeStepUp(page);
  const accountCreate = await (await accountCreatePromise).json();
  expect(accountCreate.data.code).toBe(uiAccountCode);
  await expect(page.getByText(createdAccountName)).toBeVisible();
  await page.getByRole('button', { name: `تعديل ${uiAccountCode}` }).click();
  await page.getByLabel('اسم الحساب').fill(updatedAccountName);
  const accountUpdatePromise = page.waitForResponse((response) => response.request().method() === 'PUT' && response.status() !== 428 && response.url().endsWith(`/api/v1/accounting/accounts/${accountCreate.data.id}`));
  await page.getByRole('button', { name: 'حفظ الحساب' }).click();
  await completeStepUp(page);
  expect((await (await accountUpdatePromise).json()).data.name).toBe(updatedAccountName);
  await expect(page.getByText(updatedAccountName)).toBeVisible();
  await page.screenshot({ path: path.join(screenshotsDirectory, 'account-chart.png'), fullPage: true });

  const opening = await createJournal(page, {
    title: 'Opening entry fixture', date: fixture.date,
    lines: [
      { accountId: fixture.accounts.cash, debit: '200.00', credit: '', treasuryId: fixture.treasury_id },
      { accountId: fixture.accounts.equity, debit: '', credit: '200.00' },
    ],
  });
  await postJournal(page, opening.id);
  expect(opening.data.status).toBe('draft');
  await expect(page.getByText('مرحّل').first()).toBeVisible();
  await page.screenshot({ path: path.join(screenshotsDirectory, 'journal-opening-posted.png'), fullPage: true });

  const sale = await createJournal(page, {
    title: 'Revenue entry fixture', date: fixture.date,
    lines: [
      { accountId: fixture.accounts.cash, debit: '25.00', credit: '', treasuryId: fixture.treasury_id },
      { accountId: fixture.accounts.revenue, debit: '', credit: '25.00' },
    ],
  });
  await postJournal(page, sale.id);
  await page.screenshot({ path: path.join(screenshotsDirectory, 'journal-revenue-posted.png'), fullPage: true });

  await page.goto('/finance/ledger');
  await expect(page.locator('h1').first()).toBeVisible();
  await page.locator('.filter-bar select').first().selectOption(String(fixture.accounts.cash));
  await page.getByLabel('من تاريخ').fill(fixture.date);
  await page.getByLabel('إلى تاريخ').fill(fixture.date);
  await expect(page.getByText('225.0000 ج.م').first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('link', { name: new RegExp(opening.data.entry_number) })).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(sale.data.entry_number) })).toBeVisible();
  await page.screenshot({ path: path.join(screenshotsDirectory, 'ledger-period.png'), fullPage: true });

  await page.goto('/finance/trial-balance');
  await page.getByLabel('من تاريخ').fill(fixture.date);
  await page.getByLabel('إلى تاريخ').fill(fixture.date);
  await expect(page.getByText('225.0000 ج.م').first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('غير متوازن')).toHaveCount(0);
  await page.screenshot({ path: path.join(screenshotsDirectory, 'trial-balance.png'), fullPage: true });

  await page.goto('/reports/financial');
  await page.getByLabel('من تاريخ').last().fill(fixture.date);
  await page.getByLabel('إلى تاريخ').last().fill(fixture.date);
  await expect(page.getByRole('tab', { name: 'قائمة الدخل' })).toBeVisible();
  await expect(page.getByText('25.0000 ج.م').first()).toBeVisible({ timeout: 20_000 });
  await page.getByRole('tab', { name: 'المركز المالي' }).click();
  await expect(page.getByText('225.0000 ج.م').first()).toBeVisible();
  await page.screenshot({ path: path.join(screenshotsDirectory, 'financial-statements.png'), fullPage: true });
  await page.getByRole('tab', { name: 'التدفقات النقدية' }).click();
  await expect(page.getByText('225.0000 ج.م').first()).toBeVisible();
  await page.screenshot({ path: path.join(screenshotsDirectory, 'cash-flow-statement.png'), fullPage: true });

  await page.goto(`/finance/journals/${sale.id}`);
  await page.getByRole('button', { name: 'عكس بقيد جديد' }).click();
  const reversalDialog = page.getByRole('dialog', { name: 'عكس القيد' });
  await reversalDialog.getByLabel('تاريخ العكس').fill(fixture.date);
  await reversalDialog.getByLabel('سبب العكس').fill('Acceptance reversal reason');
  const reversalResponse = page.waitForResponse((response) => response.request().method() === 'POST' && response.status() !== 428 && response.url().endsWith(`/api/v1/accounting/journals/${sale.id}/reverse`));
  await reversalDialog.getByRole('button', { name: 'تأكيد العكس' }).click();
  await completeStepUp(page);
  const reversal = await (await reversalResponse).json();
  expect(reversal.data.status).toBe('posted');
  expect(reversal.data.reversal_of_entry_id).toBe(sale.id);
  expect(reversal.data.lines.map((line: { debit_amount: string; credit_amount: string }) => [line.debit_amount, line.credit_amount])).toEqual([['0.0000', '25.0000'], ['25.0000', '0.0000']]);
  await page.screenshot({ path: path.join(screenshotsDirectory, 'journal-reversal-posted.png'), fullPage: true });

  await page.goto('/finance/adjustments');
  await completeStepUp(page);
  await page.getByLabel('رقم المرجع').fill('ACCEPTANCE-ADJ-1');
  await page.getByLabel('نوع التسوية').selectOption('expense');
  await page.getByLabel('التاريخ').last().fill(fixture.date);
  await page.getByLabel('المبلغ').fill('10.00');
  await page.getByLabel('الحساب المدين').selectOption(String(fixture.accounts.expense));
  await page.getByLabel('خزينة الجانب الدائن').selectOption(String(fixture.treasury_id));
  await page.getByLabel('الحساب الدائن').selectOption(String(fixture.accounts.cash));
  await page.getByLabel('سبب التسوية').fill('Acceptance expense adjustment');
  const adjustmentResponse = page.waitForResponse((response) => response.request().method() === 'POST' && response.status() !== 428 && response.url().endsWith('/api/v1/accounting/adjustments'));
  await page.getByRole('button', { name: 'تسجيل التسوية' }).click();
  await completeStepUp(page);
  const adjustment = await (await adjustmentResponse).json();
  expect(adjustment.data.journal_entry.status).toBe('posted');
  expect(adjustment.data.reason).toBe('Acceptance expense adjustment');
  await expect(page.getByRole('dialog', { name: 'أثر التسوية وسجلها' })).toContainText('financial_adjustment.posted');
  await expect(page.getByRole('dialog', { name: 'أثر التسوية وسجلها' })).toContainText(adjustment.data.journal_entry.entry_number);
  await page.screenshot({ path: path.join(screenshotsDirectory, 'adjustment-audit.png'), fullPage: true });

  const observed = await page.evaluate(async ({ cashId, treasuryId, from, to, saleId, adjustmentId }) => {
    const [ledgerResponse, trialResponse, statementsResponse, treasuryResponse, saleResponse, adjustmentResponse] = await Promise.all([
      fetch(`/api/v1/accounting/ledger?account_id=${cashId}&from_date=${from}&to_date=${to}`),
      fetch(`/api/v1/accounting/trial-balance?from_date=${from}&to_date=${to}`),
      fetch(`/api/v1/accounting/statements?from_date=${from}&to_date=${to}`),
      fetch(`/api/v1/treasury/accounts/${treasuryId}/balance`),
      fetch(`/api/v1/accounting/journals/${saleId}`),
      fetch(`/api/v1/accounting/adjustments/${adjustmentId}`),
    ]);
    return Promise.all([ledgerResponse.json(), trialResponse.json(), statementsResponse.json(), treasuryResponse.json(), saleResponse.json(), adjustmentResponse.json()]);
  }, { cashId: fixture.accounts.cash, treasuryId: fixture.treasury_id, from: fixture.date, to: fixture.date, saleId: sale.id, adjustmentId: adjustment.data.id });
  const [ledger, trial, statements, treasury, saleDetail, adjustmentDetail] = observed;
  expect(ledger.data.closing_balance).toBe('190.0000');
  expect(trial.data.totals.is_balanced).toBe(true);
  expect(statements.data.income_statement.net_income).toBe(sumMoney([
    statements.data.income_statement.total_revenue,
    negateMoney(statements.data.income_statement.total_expenses),
  ]));
  const trialAssets = trial.data.accounts
    .filter((account: { account_type: string }) => account.account_type === 'asset')
    .flatMap((account: { closing_debit: string; closing_credit: string }) => [account.closing_debit, negateMoney(account.closing_credit)]);
  expect(statements.data.balance_sheet.total_assets).toBe(sumMoney(trialAssets));
  expect(statements.data.balance_sheet.is_balanced).toBe(true);
  expect(statements.data.cash_flow.closing_balance).toBe(sumMoney(
    statements.data.cash_flow.accounts.map((account: { closing_balance: string }) => account.closing_balance),
  ));
  expect(treasury.data.balance_egp).toBe('190.00');
  expect(saleDetail.data.status).toBe('reversed');
  expect(saleDetail.data.reversal_entry_id).toBe(reversal.data.id);
  expect(adjustmentDetail.data.audit).toHaveLength(1);

  await page.goto('/finance/auto-posting-mappings');
  await expect(page.getByRole('heading', { name: 'ربط الحسابات التلقائي' })).toBeVisible({ timeout: 30_000 });
  const cashMapping = page.getByLabel('حساب الخزائن والبنوك');
  const cashMappingSaveButton = page.locator('.form-grid').filter({ has: cashMapping }).locator('.form-actions button');
  const originalCashAccountId = Number(await cashMapping.inputValue());
  const saveCashMapping = async (accountId: number) => {
    await cashMapping.selectOption(String(accountId));
    const responsePromise = page.waitForResponse((response) =>
      response.request().method() === 'PUT'
        && response.status() !== 428
        && response.url().endsWith('/api/v1/accounting/auto-posting-mappings/cash'),
    );
    await expect(cashMappingSaveButton).toHaveCount(1, { timeout: 5_000 });
    await expect(cashMappingSaveButton).toBeEnabled({ timeout: 5_000 });
    await cashMappingSaveButton.click({ timeout: 5_000 });
    await completeStepUp(page);
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    return response.json();
  };
  const changedMapping = await saveCashMapping(Number(accountCreate.data.id));
  expect(changedMapping.data.account_id).toBe(Number(accountCreate.data.id));
  await page.screenshot({ path: path.join(screenshotsDirectory, 'automatic-account-mappings.png'), fullPage: true });
  const restoredMapping = await saveCashMapping(originalCashAccountId);
  expect(restoredMapping.data.account_id).toBe(originalCashAccountId);
  console.log(`ACCOUNTING_E2E_RESULT=${JSON.stringify({ opening: opening.id, sale: sale.id, reversal: reversal.data.id, adjustment: adjustment.data.id, treasury: fixture.treasury_id, closing: ledger.data.closing_balance })}`);
});

async function createJournal(page: Page, input: { title: string; date: string; lines: { accountId: number; debit: string; credit: string; treasuryId?: number }[] }) {
  await page.goto('/finance/journals');
  await page.getByRole('button', { name: 'قيد جديد' }).click();
  const dialog = page.getByRole('dialog', { name: 'قيد يومية جديد' });
  await completeStepUp(page);
  await dialog.getByLabel('التاريخ').fill(input.date);
  await dialog.getByRole('textbox', { name: 'بيان القيد' }).fill(input.title);
  for (const [index, line] of input.lines.entries()) {
    await dialog.getByLabel(`حساب السطر ${index + 1}`).selectOption(String(line.accountId));
    if (line.debit) await dialog.getByLabel(`مدين السطر ${index + 1}`).fill(line.debit);
    if (line.credit) await dialog.getByLabel(`دائن السطر ${index + 1}`).fill(line.credit);
    if (line.treasuryId) await dialog.getByLabel(`خزينة السطر ${index + 1}`).selectOption(String(line.treasuryId));
  }
  await expect(dialog.getByRole('button', { name: 'حفظ كمسودة' })).toBeEnabled();
  await page.screenshot({ path: path.join(screenshotsDirectory, `journal-form-${input.title.startsWith('Opening') ? 'opening' : 'revenue'}.png`), fullPage: true });
  const responsePromise = page.waitForResponse((response) => response.request().method() === 'POST' && response.status() !== 428 && response.url().endsWith('/api/v1/accounting/journals'));
  await dialog.getByRole('button', { name: 'حفظ كمسودة' }).click();
  await completeStepUp(page);
  const response = await responsePromise;
  expect(response.status()).toBe(201);
  const payload = await response.json();
  expect(payload.data).toMatchObject({ status: 'draft', description: input.title, is_balanced: true });
  await expect(page).toHaveURL(new RegExp(`/finance/journals/${payload.data.id}$`));
  return { id: Number(payload.data.id), data: payload.data };
}

async function postJournal(page: Page, id: number) {
  const responsePromise = page.waitForResponse((response) => response.request().method() === 'POST' && response.status() !== 428 && response.url().endsWith(`/api/v1/accounting/journals/${id}/post`));
  await page.getByRole('button', { name: 'ترحيل القيد' }).click();
  await completeStepUp(page);
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  const payload = await response.json();
  expect(payload.data.status).toBe('posted');
}

async function completeStepUp(page: Page) {
  const passwordField = page.locator('#step-up-password');
  if (await passwordField.waitFor({ state: 'visible', timeout: 3_000 }).then(() => true).catch(() => false)) {
    await passwordField.fill(password);
    const reauthentication = page.waitForResponse((response) =>
      response.request().method() === 'POST' && response.url().endsWith('/api/v1/auth/reauth'),
    );
    await page.locator('.modal-backdrop').filter({ has: passwordField }).getByRole('button', { name: 'تأكيد ومتابعة' }).click();
    const response = await reauthentication;
    if (!response.ok()) {
      const body = await response.json().catch(() => ({}));
      throw new Error(`Step-up authentication failed (${response.status()}): ${body.message ?? 'no message'}`);
    }
    await expect(passwordField).toBeHidden({ timeout: 15_000 });
  }
}

function moneyUnits(value: string): bigint {
  const negative = value.startsWith('-');
  const unsigned = negative ? value.slice(1) : value;
  const [whole, fraction = ''] = unsigned.split('.');
  const units = BigInt(whole) * 10_000n + BigInt(fraction.padEnd(4, '0').slice(0, 4));
  return negative ? -units : units;
}

function formatMoneyUnits(units: bigint): string {
  const negative = units < 0n;
  const absolute = negative ? -units : units;
  return `${negative ? '-' : ''}${absolute / 10_000n}.${(absolute % 10_000n).toString().padStart(4, '0')}`;
}

function sumMoney(values: string[]): string {
  return formatMoneyUnits(values.reduce((sum, value) => sum + moneyUnits(value), 0n));
}

function negateMoney(value: string): string {
  return formatMoneyUnits(-moneyUnits(value));
}
