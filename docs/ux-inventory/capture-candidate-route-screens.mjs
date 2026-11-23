import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '../../frontend/node_modules/@playwright/test/index.mjs';
import { createServer } from '../../frontend/node_modules/vite/dist/node/index.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const frontend = path.join(root, 'frontend');
const out = path.join(root, 'docs/ux-inventory/screenshots/system-mock/react/visual-round4');
const routes = [
  { slug: 'damaged-stock', href: '/inventory/damaged', reference: 'stock-ret', screenId: 'SCR-028', label: 'damaged and returned stock' },
  { slug: 'customer-detail', href: '/customers/101', reference: 'cust-file', screenId: 'SCR-030', label: 'customer file', via: '/customers', fallback: 'a[href^="/customers/"]' },
  { slug: 'invoice-detail', href: '/invoices/701', reference: 'inv-detail', screenId: 'SCR-031', label: 'invoice detail', via: '/invoices', fallback: 'a[href^="/invoices/"]:not([href$="/new"]):not([href$="/print"]):not([href$="/edit"])' },
  { slug: 'finance-inbox', href: '/finance/inbox', reference: 'f-receipts', screenId: 'SCR-035', label: 'finance receipts' },
  { slug: 'finance-withdrawals', href: '/finance/withdrawals', reference: 'f-payments', screenId: 'SCR-037', label: 'finance payments' },
  { slug: 'finance-expenses', href: '/finance/expenses', reference: 'f-expenses', screenId: 'SCR-038', label: 'finance expenses' },
  { slug: 'finance-transfers', href: '/finance/transfers', reference: 'f-transfers', screenId: 'SCR-039', label: 'finance transfers' },
  { slug: 'finance-treasury', href: '/finance/treasury', reference: 'f-treasury', screenId: 'SCR-040', label: 'treasury accounts' },
  { slug: 'chart-of-accounts', href: '/finance/chart-of-accounts', reference: 'f-coa', screenId: 'SCR-044', label: 'chart of accounts' },
  { slug: 'financial-statements', href: '/reports/financial', reference: 'f-reports', screenId: 'SCR-048', label: 'financial statements' },
  { slug: 'customer-statement', href: '/customers/101/statement', reference: 'f-stmt', screenId: 'SCR-049', label: 'customer statement', via: '/customers/101', fallback: 'a[href="/customers/101/statement"]' },
  { slug: 'finance-movements', href: '/finance/movements', reference: 'move-detail', screenId: 'SCR-053', label: 'finance movement detail candidate' },
  { slug: 'container-detail', href: '/containers/16016', reference: 'x-track', screenId: 'SCR-060', label: 'container tracking candidate', via: '/containers', fallback: 'a[href="/containers/16016"]' },
  { slug: 'product-cost-history', href: '/products/201/cost-history', reference: 'x-price', screenId: 'SCR-064', label: 'product purchase cost history', via: '/products', fallback: 'a[href="/products/201/cost-history"]' },
];
const viewports = [{ name: '1280', width: 1280, height: 900 }, { name: '768', width: 768, height: 1024 }, { name: '390', width: 390, height: 844 }];
const results = [];
const installedChrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || (existsSync(installedChrome) ? installedChrome : undefined);
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath, args: ['--headless=new'] } : {}) });
const server = await createServer({ configFile: path.join(frontend, 'vite.config.ts'), root: frontend, mode: 'test', define: { 'import.meta.env.VITE_MOCK_API': JSON.stringify('true') }, server: { host: '127.0.0.1', port: 5193, strictPort: true, proxy: { '/api/v1': { target: 'http://127.0.0.1:1', changeOrigin: true } } } });

async function clickPath(page, href) {
  const sidebar = page.locator(`.sidebar-nav a[href="${href}"]`).first();
  const other = page.locator(`a[href="${href}"]`).first();
  const link = await sidebar.count() ? sidebar : other;
  if (!(await link.count())) return false;
  if (page.viewportSize().width < 900) {
    const menu = page.locator('.mobile-menu-toggle');
    if (await menu.isVisible().catch(() => false) && await menu.getAttribute('aria-expanded') !== 'true') await menu.click();
  }
  const group = link.locator('xpath=ancestor::details[1]');
  if (await group.count() && !(await group.evaluate(node => node.open))) {
    const summary = group.locator('summary');
    await summary.scrollIntoViewIfNeeded();
    await summary.click({ timeout: 1500 });
  }
  await link.scrollIntoViewIfNeeded();
  await link.click({ timeout: 2500 });
  await page.waitForFunction(pathname => location.pathname === pathname, href, { timeout: 3000 });
  return true;
}

try {
  await server.listen();
  const origin = server.resolvedUrls?.local?.[0]?.replace(/\/$/, '');
  if (!origin) throw new Error('Isolated Vite test server did not start.');
  await mkdir(out, { recursive: true });
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, serviceWorkers: 'allow' });
    const page = await context.newPage();
    await page.goto(`${origin}/login`, { waitUntil: 'networkidle' });
    await page.locator('#login-username').fill('owner-demo');
    await page.locator('#login-password').fill('demo');
    await page.locator('button[type="submit"]').click();
    await page.locator('.app-shell').waitFor({ timeout: 10000 });
    for (const route of routes) {
      let navigationMethod = 'no visible in-app link found';
      let clickEvidence = false;
      try {
        clickEvidence = await clickPath(page, route.href);
        if (clickEvidence) navigationMethod = 'visible in-app anchor clicked; URL path verified';
      } catch (error) {
        navigationMethod = `visible route link click did not verify: ${String(error).split('\n')[0]}`;
      }
      if (!clickEvidence && route.via) {
        try {
          const openedBase = await clickPath(page, route.via);
          if (openedBase) {
            const target = page.locator(route.fallback).first();
            if (await target.count()) {
              await target.scrollIntoViewIfNeeded();
              await target.click({ timeout: 2500 });
              await page.waitForFunction(pathname => location.pathname === pathname, route.href, { timeout: 3000 });
              clickEvidence = true;
              navigationMethod = `clicked visible link on ${route.via}; URL path verified`;
            }
          }
        } catch (error) {
          navigationMethod = `in-app route path attempt did not verify: ${String(error).split('\n')[0]}`;
        }
      }
      if (clickEvidence) await page.waitForTimeout(500);
      const actualPath = await page.evaluate(() => location.pathname);
      const heading = clickEvidence ? (await page.locator('.main-content h1').first().textContent().catch(() => ''))?.trim() ?? '' : '';
      const screenshot = clickEvidence && actualPath === route.href ? `docs/ux-inventory/screenshots/system-mock/react/visual-round4/${route.slug}-${viewport.name}.png` : null;
      if (screenshot) await page.screenshot({ path: path.join(root, screenshot) });
      results.push({ viewport: viewport.name, ...route, navigationMethod, clickEvidence, actualPath, heading, screenshot, result: screenshot ? 'ROUTE_RENDER_CAPTURED_AFTER_CLICK' : 'NOT_VERIFIED_NO_CLICK_PATH' });
    }
    await context.close();
  }
  await writeFile(path.join(root, 'docs/ux-inventory/CANDIDATE_ROUTE_SCREEN_REVIEW.json'), `${JSON.stringify({ environment: 'React Vite/MSW; synthetic owner demo; no API/database writes; proxy fallback closed at 127.0.0.1:1', results }, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ captureAttempts: results.length, routeRenderedAfterClick: results.filter(item => item.result === 'ROUTE_RENDER_CAPTURED_AFTER_CLICK').length, clickedNavigation: results.filter(item => item.clickEvidence).length, notVerified: results.filter(item => item.result !== 'ROUTE_RENDER_CAPTURED_AFTER_CLICK').map(item => `${item.slug}@${item.viewport}`) }, null, 2));
} finally {
  await server.close();
  await browser.close();
}
