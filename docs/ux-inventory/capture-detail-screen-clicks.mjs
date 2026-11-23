import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '../../frontend/node_modules/@playwright/test/index.mjs';
import { createServer } from '../../frontend/node_modules/vite/dist/node/index.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const frontend = path.join(root, 'frontend');
const output = path.join(root, 'docs/ux-inventory/screenshots/system-mock/react/visual-round7');
const reportPath = path.join(root, 'docs/ux-inventory/DETAIL_SCREEN_CLICK_REVIEW.json');
const browserPath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
const browser = await chromium.launch({ headless: true, ...(browserPath ? { executablePath: browserPath, args: ['--headless=new'] } : {}) });
const server = await createServer({
  configFile: path.join(frontend, 'vite.config.ts'),
  root: frontend,
  mode: 'test',
  define: { 'import.meta.env.VITE_MOCK_API': JSON.stringify('true') },
  server: { host: '127.0.0.1', port: 5189, strictPort: true, proxy: { '/api/v1': { target: 'http://127.0.0.1:1', changeOrigin: true } } },
});

const results = [];
const viewports = [
  { name: '1280', width: 1280, height: 900 },
  { name: '768', width: 768, height: 1024 },
  { name: '390', width: 390, height: 844 },
];

async function clickNavigationLink(page, href, label, viewportName) {
  const desktopTrigger = page.locator('.global-search-trigger');
  if (await desktopTrigger.isVisible().catch(() => false)) await desktopTrigger.click();
  else await page.locator('.mobile-bottom-nav button').first().click();
  const dialog = page.locator('[role="dialog"]').last();
  const input = dialog.locator('input[type="search"]');
  await input.fill(label);
  const link = dialog.locator(`.global-search-results a[href="${href}"]`).first();
  await link.waitFor({ state: 'visible', timeout: 5000 });
  await link.click({ timeout: 5000 });
  await page.waitForFunction((expected) => location.pathname === expected, href, { timeout: 5000 });
}

try {
  await server.listen();
  const origin = server.resolvedUrls?.local?.[0]?.replace(/\/$/, '');
  if (!origin) throw new Error('Vite test server did not expose a local URL.');
  await mkdir(output, { recursive: true });

  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport, serviceWorkers: 'allow' });
    const page = await context.newPage();
    await page.goto(`${origin}/login`, { waitUntil: 'networkidle' });
    await page.locator('#login-username').fill('owner-demo');
    await page.locator('#login-password').fill('demo');
    await page.locator('button[type="submit"]').click();
    await page.locator('.app-shell').waitFor({ timeout: 10000 });

    await clickNavigationLink(page, '/customers', 'العملاء', viewport.name);
    await page.getByRole('heading', { name: 'العملاء', exact: true }).waitFor({ timeout: 7000 }).catch(() => undefined);
    await page.waitForTimeout(750);
    await page.screenshot({ path: path.join(output, `customers-list-${viewport.name}.png`), fullPage: true });
    const customerLink = page.getByRole('button', { name: /شركة النور لاستيراد السيارات/ }).first();
    const customerFound = await customerLink.isVisible().catch(() => false);
    let customerPath = await page.evaluate(() => location.pathname);
    if (customerFound) {
      await customerLink.click();
      await page.waitForFunction(() => /^\/customers\/\d+/.test(location.pathname), undefined, { timeout: 5000 }).catch(() => undefined);
      customerPath = await page.evaluate(() => `${location.pathname}${location.search}`);
      if (/^\/customers\/\d+/.test(customerPath)) {
        await page.locator('main').first().screenshot({ path: path.join(output, `customer-detail-${viewport.name}.png`) });
      }
    }
    results.push({ screenId: 'SCR-030', viewport: viewport.name, clickTarget: 'شركة النور', targetVisible: customerFound, actualPath: customerPath, clicked: customerFound && /^\/customers\/\d+/.test(customerPath), screenshot: /^\/customers\/\d+/.test(customerPath) ? `docs/ux-inventory/screenshots/system-mock/react/visual-round7/customer-detail-${viewport.name}.png` : null, listScreenshot: `docs/ux-inventory/screenshots/system-mock/react/visual-round7/customers-list-${viewport.name}.png`, observedTitle: await page.locator('main h1').first().textContent().catch(() => ''), listText: (await page.locator('main').innerText().catch(() => '')).slice(0, 500), note: 'Isolated Vite/MSW; clicked an existing customer row only if the record appeared; no form submitted.' });

    await clickNavigationLink(page, '/invoices', 'فواتير البيع', viewport.name);
    await page.getByRole('heading', { name: /فواتير البيع|الفواتير/, exact: false }).waitFor({ timeout: 7000 }).catch(() => undefined);
    await page.waitForTimeout(750);
    await page.screenshot({ path: path.join(output, `invoices-list-${viewport.name}.png`), fullPage: true });
    const invoiceLink = page.getByRole('link', { name: /تفاصيل الفاتورة INV-2026-1041/ }).first();
    const invoiceFound = await invoiceLink.isVisible().catch(() => false);
    let invoicePath = await page.evaluate(() => location.pathname);
    if (invoiceFound) {
      await invoiceLink.click();
      await page.waitForFunction(() => /^\/invoices\/\d+(?:\/|$)/.test(location.pathname), undefined, { timeout: 5000 }).catch(() => undefined);
      invoicePath = await page.evaluate(() => `${location.pathname}${location.search}`);
      if (/^\/invoices\/\d+(?:\/|$)/.test(invoicePath)) {
        await page.locator('main').first().screenshot({ path: path.join(output, `invoice-detail-${viewport.name}.png`) });
      }
    }
    results.push({ screenId: 'SCR-031', viewport: viewport.name, clickTarget: 'INV-2026-1041', targetVisible: invoiceFound, actualPath: invoicePath, clicked: invoiceFound && /^\/invoices\/\d+(?:\/|$)/.test(invoicePath), screenshot: /^\/invoices\/\d+(?:\/|$)/.test(invoicePath) ? `docs/ux-inventory/screenshots/system-mock/react/visual-round7/invoice-detail-${viewport.name}.png` : null, listScreenshot: `docs/ux-inventory/screenshots/system-mock/react/visual-round7/invoices-list-${viewport.name}.png`, observedTitle: await page.locator('main h1').first().textContent().catch(() => ''), listText: (await page.locator('main').innerText().catch(() => '')).slice(0, 500), note: 'Isolated Vite/MSW; clicked an existing invoice row only if the record appeared; no print or write action triggered.' });
    await context.close();
  }

  const report = { environment: 'isolated Vite test mode; MSW enabled; synthetic owner-demo session; read-only list-row navigation', results, summary: { attempts: results.length, clickedAndCaptured: results.filter((row) => row.clicked && row.screenshot).length, failedOrUnavailable: results.filter((row) => !row.clicked || !row.screenshot).length } };
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(report.summary, null, 2));
} finally {
  await browser.close();
  await server.close();
}
