import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from '../../frontend/node_modules/@playwright/test/index.mjs';
import { createServer } from '../../frontend/node_modules/vite/dist/node/index.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const frontend = path.join(root, 'frontend');
const referencePath = path.join(frontend, 'reference/precision-slate-erp-v43__3_ (1).html');
const fixture = JSON.parse(await readFile(path.join(frontend, 'reference/reference-fixture.json'), 'utf8'));
const shots = path.join(root, 'docs/ux-inventory/screenshots');
const report = [];
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE, args: ['--headless=new'] } : {}) });
const server = await createServer({ configFile: path.join(frontend, 'vite.config.ts'), root: frontend, mode: 'test', define: { 'import.meta.env.VITE_MOCK_API': JSON.stringify('true') }, server: { host: '127.0.0.1', port: 5191, strictPort: true, proxy: { '/api/v1': { target: 'http://127.0.0.1:1', changeOrigin: true } } } });
const viewports = [{ name: '768', width: 768, height: 1024 }, { name: '390', width: 390, height: 844 }];

try {
  await server.listen();
  const origin = server.resolvedUrls?.local?.[0]?.replace(/\/$/, '');
  if (!origin) throw new Error('Isolated Vite test server did not start.');
  await mkdir(path.join(shots, 'reference/states'), { recursive: true });
  await mkdir(path.join(shots, 'system-mock/react/states'), { recursive: true });
  for (const viewport of viewports) {
    const targetScreen = 'invoice-create';
    const row = { viewport: viewport.name, route: targetScreen === 'dashboard' ? 'reference sec-dashboard / React /dashboard' : 'reference sec-invoice-create / React /invoices/new', reference: {}, system: {} };
    const refContext = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    await refContext.addInitScript(entries => { for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value)); }, fixture.localStorage);
    const ref = await refContext.newPage();
    await ref.route(/^https?:\/\//, route => route.abort());
    await ref.goto(pathToFileURL(referencePath).href, { waitUntil: 'load' });
    await ref.locator('#login-user').selectOption({ index: 0 });
    await ref.locator('#login-pass').fill('1234'); // isolated prototype-only demo login
    await ref.locator('#login-screen .login-btn').click();
    await ref.waitForFunction(() => !document.body.classList.contains('logged-out'));
    const refAlreadyOnTarget = await ref.locator('#sec-invoice-create.active').count() > 0;
    const refIndex = refAlreadyOnTarget ? -1 : await ref.locator('.nav-item[onclick], .nav-sub-item[onclick]').evaluateAll(nodes => nodes.findIndex(node => (node.getAttribute('onclick') ?? '').includes("showSection('invoice-create')")));
    if (!refAlreadyOnTarget && refIndex >= 0) {
      const refNav = ref.locator('.nav-item[onclick], .nav-sub-item[onclick]').nth(refIndex);
      const visible = await refNav.isVisible();
      if (!visible) {
        const groupIndex = await ref.locator('.nav-item[onclick], .nav-sub-item[onclick]').evaluateAll((nodes, idx) => {
          const node = nodes[idx]; const group = node?.closest('.nav-sub'); const header = group?.previousElementSibling;
          return header ? nodes.indexOf(header) : -1;
        }, refIndex);
        if (groupIndex >= 0) await ref.locator('.nav-item[onclick], .nav-sub-item[onclick]').nth(groupIndex).click();
      }
      try {
        await refNav.scrollIntoViewIfNeeded();
        await refNav.click({ timeout: 3000 });
        await ref.waitForFunction(() => document.querySelector('.section-content.active')?.id === 'sec-invoice-create');
        row.reference.navigation = 'invoice-create activated by visible navigation click';
      } catch (error) { row.reference.navigation = `NOT_VERIFIED: reference target control was outside the viewport (${String(error).split('\n')[0]})`; }
    } else row.reference.navigation = refAlreadyOnTarget ? 'invoice-create was already the active reference panel after local prototype login' : 'NOT_VERIFIED: no reference navigation control';

    const refSearch = ref.locator('#search-wrap');
    row.reference.searchVisible = await refSearch.isVisible().catch(() => false);
    if (row.reference.searchVisible) {
      await refSearch.click();
      row.reference.searchOpened = await ref.locator('#search-dropdown').evaluate(el => el.classList.contains('open'));
      if (row.reference.searchOpened) {
        row.reference.searchScreenshot = `docs/ux-inventory/screenshots/reference/states/interaction-global-search-invoice-create-${viewport.name}.png`;
        await ref.screenshot({ path: path.join(root, row.reference.searchScreenshot) });
        await ref.keyboard.press('Escape');
        row.reference.searchClosedAfterEscape = !(await ref.locator('#search-dropdown').evaluate(el => el.classList.contains('open')));
        if (!row.reference.searchClosedAfterEscape) await refSearch.click();
      }
    }
    const refNotif = ref.locator('.topbar-actions button[onclick*="toggleNotif"]');
    row.reference.notificationsVisible = await refNotif.isVisible().catch(() => false);
    if (row.reference.notificationsVisible) {
      await refNotif.click();
      row.reference.notificationsOpened = await ref.locator('#notif-panel').evaluate(el => el.classList.contains('open'));
      if (row.reference.notificationsOpened) {
        row.reference.notificationsScreenshot = `docs/ux-inventory/screenshots/reference/states/interaction-notifications-invoice-create-${viewport.name}.png`;
        await ref.screenshot({ path: path.join(root, row.reference.notificationsScreenshot) });
      }
    }
    await refContext.close();

    const appContext = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, serviceWorkers: 'allow' });
    const app = await appContext.newPage();
    await app.goto(`${origin}/login`, { waitUntil: 'networkidle' });
    await app.locator('#login-username').fill('owner-demo');
    await app.locator('#login-password').fill('demo');
    await app.locator('button[type="submit"]').click();
    await app.locator('.app-shell').waitFor({ timeout: 10000 });
    const mobileQuickActions = app.locator('.quick-actions-mobile');
    const desktopQuickActions = app.locator('.quick-actions-desktop');
    const quickActions = viewport.width < 900 ? mobileQuickActions : desktopQuickActions;
    const quickSummary = quickActions.locator('summary');
    if (await quickSummary.isVisible().catch(() => false)) {
      await quickSummary.click();
      const invoiceQuickLink = quickActions.locator('a[href="/invoices/new"]');
      if (await invoiceQuickLink.count()) {
        await invoiceQuickLink.click();
        await app.waitForFunction(() => location.pathname === '/invoices/new');
        row.system.navigation = 'invoice-create activated by visible quick-action click';
      } else row.system.navigation = 'NOT_VERIFIED: create invoice quick-action link not present';
    } else {
      const appInvoiceNav = app.locator('.sidebar-nav a[href="/invoices/new"]');
      if (await appInvoiceNav.count()) {
        const group = appInvoiceNav.locator('xpath=ancestor::details[1]');
        if (await group.count() && !(await group.evaluate(node => node.open))) {
          const summary = group.locator('summary');
          if (await summary.isVisible()) await summary.click();
        }
        await appInvoiceNav.scrollIntoViewIfNeeded();
        await appInvoiceNav.click({ timeout: 3000 });
        await app.waitForFunction(() => location.pathname === '/invoices/new');
        row.system.navigation = 'invoice-create activated by visible sidebar click';
      } else row.system.navigation = 'NOT_VERIFIED: route link not present';
    }
    row.system.actualPath = await app.evaluate(() => location.pathname);
    try {
      await app.waitForFunction(() => document.querySelector('main h1')?.textContent?.includes('إنشاء فاتورة'), undefined, { timeout: 8000 });
      row.system.targetScreenRendered = true;
    } catch {
      row.system.targetScreenRendered = false;
    }
    row.system.heading = (await app.locator('main h1, .main-content h1').first().textContent().catch(() => ''))?.trim() ?? '';
    row.reference.activePanel = await ref.locator('.section-content.active').getAttribute('id').catch(() => null);
    let appSearch = app.locator('.global-search-trigger');
    if (!(await appSearch.isVisible().catch(() => false))) {
      appSearch = app.locator('.mobile-bottom-nav button').first();
      row.system.searchControl = 'mobile bottom navigation';
    } else row.system.searchControl = 'desktop top bar';
    row.system.searchVisible = await appSearch.isVisible().catch(() => false);
    if (!row.system.searchVisible) {
      row.system.searchUnavailableScreenshot = `docs/ux-inventory/screenshots/system-mock/react/states/global-search-unavailable-${viewport.name}.png`;
      await app.screenshot({ path: path.join(root, row.system.searchUnavailableScreenshot) });
    }
    if (row.system.searchVisible) {
      await appSearch.click();
      const dialog = app.locator('[role="dialog"]').first();
      row.system.searchOpened = await dialog.isVisible().catch(() => false);
      if (row.system.searchOpened) {
        row.system.searchScreenshot = `docs/ux-inventory/screenshots/system-mock/react/states/interaction-global-search-invoice-create-${viewport.name}.png`;
        await app.screenshot({ path: path.join(root, row.system.searchScreenshot) });
        await app.keyboard.press('Escape');
        row.system.searchClosedAfterEscape = !(await app.locator('[role="dialog"]').first().isVisible().catch(() => false));
      }
    }
    const appNotif = app.locator('.notification-trigger');
    row.system.notificationsVisible = await appNotif.isVisible().catch(() => false);
    if (row.system.notificationsVisible) {
      await appNotif.click();
      row.system.notificationsOpened = await app.locator('.notification-panel').isVisible().catch(() => false);
      if (row.system.notificationsOpened) {
        row.system.notificationsScreenshot = `docs/ux-inventory/screenshots/system-mock/react/states/interaction-notifications-invoice-create-${viewport.name}.png`;
        await app.screenshot({ path: path.join(root, row.system.notificationsScreenshot) });
      }
    }
    await appContext.close();
    report.push(row);
  }
  await writeFile(path.join(root, 'docs/ux-inventory/RESPONSIVE_STATE_REVIEW.json'), `${JSON.stringify({ environment: 'isolated reference file:// demo fixture and React Vite/MSW; no database/API writes', results: report }, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(report, null, 2));
} finally {
  await server.close();
  await browser.close();
}
