import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { chromium } from '../../frontend/node_modules/playwright/index.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const html = path.join(root, 'frontend/reference/precision-slate-erp-v43__3_ (1).html');
const fixture = JSON.parse(await readFile(path.join(root, 'frontend/reference/reference-fixture.json'), 'utf8'));
const out = path.join(root, 'docs/ux-inventory/screenshots/reference/row-click-details');
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser = await chromium.launch({ headless: true, ...(existsSync(chrome) ? { executablePath: chrome, args: ['--headless=new'] } : {}) });
const result = { viewport: '1280', environment: 'isolated static reference + saved local fixture; opening and canceling dialogs only; no submit/save/delete/print' };
try {
  await mkdir(out, { recursive: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.addInitScript((entries) => { for (const [k, v] of Object.entries(entries)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); }, fixture.localStorage);
  const page = await context.newPage();
  page.on('dialog', async (d) => { if (d.type() === 'prompt' && d.message().includes('قسم العملاء')) await d.accept('1234'); else await d.dismiss(); });
  await page.route(/^https?:\/\//, (r) => r.abort());
  await page.goto(pathToFileURL(html).href, { waitUntil: 'load' });
  await page.locator('#login-user').selectOption({ index: 0 }); await page.locator('#login-pass').fill('1234'); await page.locator('#login-screen .login-btn').click();
  await page.waitForFunction(() => !document.body.classList.contains('logged-out'));
  const customersGroup = page.locator('.sidebar-nav .nav-group-btn').filter({ hasText: 'العملاء' }).first();
  if (!(await page.locator('#cust-sub').getAttribute('class') ?? '').includes('open')) await customersGroup.click();
  await page.locator('#cust-sub .nav-sub-item').filter({ hasText: 'كل العملاء' }).first().click();
  await page.waitForFunction(() => document.querySelector('#sec-customers')?.classList.contains('active'));
  await page.locator('#sec-customers tbody tr[onclick*="openCust"]').first().click();
  await page.waitForFunction(() => document.querySelector('#sec-cust-file')?.classList.contains('active'));
  await page.locator('#sec-cust-file button').filter({ hasText: 'تسجيل دفعة' }).first().click();
  await page.waitForFunction(() => document.querySelector('#modal-payment')?.classList.contains('open'));
  result.paymentModal = await page.locator('#modal-payment').evaluate((m) => ({
    title: m.querySelector('.modal-title')?.innerText.trim(),
    text: m.innerText.trim(),
    fields: [...m.querySelectorAll('input,select,textarea')].map((e) => ({ id: e.id, type: e.type, value: e.value, label: e.labels?.[0]?.innerText?.trim() ?? '', required: e.required, disabled: e.disabled })),
    buttons: [...m.querySelectorAll('button')].map((e) => ({ label: e.innerText.trim(), onclick: e.getAttribute('onclick') })),
  }));
  result.paymentModal.screenshot = 'docs/ux-inventory/screenshots/reference/row-click-details/payment-modal-1280.png';
  await page.screenshot({ path: path.join(root, result.paymentModal.screenshot), animations: 'disabled' });
  await page.locator('#modal-payment button').filter({ hasText: 'إلغاء' }).click();
  await page.waitForFunction(() => !document.querySelector('#modal-payment')?.classList.contains('open'));
  result.paymentModal.cancelClicked = true; result.paymentModal.closed = true;

  await page.locator('#sec-cust-file .tab-item').filter({ hasText: 'الفواتير' }).click();
  await page.locator('#sec-cust-file #cf-inv tbody tr[onclick*="invDetail"]').first().click();
  await page.waitForFunction(() => document.querySelector('#sec-inv-detail')?.classList.contains('active'));
  await page.locator('#sec-inv-detail button').filter({ hasText: 'تسجيل مرتجع' }).click();
  await page.waitForFunction(() => !!document.querySelector('#rt-ok'));
  result.returnModal = await page.locator('#rt-ok').evaluate((button) => {
    const m = button.closest('div[style*="position:fixed"]') ?? button.parentElement;
    if (!m) return null;
    return { title: m.querySelector('h3,.modal-title')?.innerText.trim() ?? '', text: m.innerText.trim(), fields: [...m.querySelectorAll('input,select,textarea')].map((e) => ({ id: e.id, type: e.type, value: e.value, label: e.labels?.[0]?.innerText?.trim() ?? '', required: e.required, disabled: e.disabled })), buttons: [...m.querySelectorAll('button')].map((e) => ({ label: e.innerText.trim(), id: e.id, onclick: e.getAttribute('onclick') })) };
  });
  result.returnModal.screenshot = 'docs/ux-inventory/screenshots/reference/row-click-details/return-modal-1280.png';
  await page.screenshot({ path: path.join(root, result.returnModal.screenshot), animations: 'disabled' });
  await page.locator('#rt-no').click();
  await page.waitForFunction(() => !document.querySelector('#rt-no'));
  result.returnModal.cancelClicked = true; result.returnModal.closed = true;
  await context.close();
  await writeFile(path.join(root, 'docs/ux-inventory/REFERENCE_DETAIL_MODAL_REVIEW.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(result, null, 2));
} finally { await browser.close(); }
