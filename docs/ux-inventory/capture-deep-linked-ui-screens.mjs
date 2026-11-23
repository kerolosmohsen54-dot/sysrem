import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '../../frontend/node_modules/@playwright/test/index.mjs';
import { createServer } from '../../frontend/node_modules/vite/dist/node/index.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const frontend = path.join(root, 'frontend');
const out = path.join(root, 'docs/ux-inventory/screenshots/system-mock/react/visual-round5');
const viewports = [
  { name: '1280', width: 1280, height: 900 },
  { name: '768', width: 768, height: 1024 },
  { name: '390', width: 390, height: 844 },
];
const installedChrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser = await chromium.launch({ headless: true, ...(existsSync(installedChrome) ? { executablePath: installedChrome, args: ['--headless=new'] } : {}) });
const server = await createServer({
  configFile: path.join(frontend, 'vite.config.ts'), root: frontend, mode: 'test',
  define: { 'import.meta.env.VITE_MOCK_API': JSON.stringify('true') },
  server: { host: '127.0.0.1', port: 5194, strictPort: true, proxy: { '/api/v1': { target: 'http://127.0.0.1:1', changeOrigin: true } } },
});
const results = [];
async function clickRoute(page, href) {
  const search = page.locator('.global-search-trigger').first();
  const mobileSearch = page.locator('.mobile-bottom-nav button.mobile-dock-action').filter({ has: page.locator('svg') }).first();
  const trigger = await search.isVisible().catch(() => false) ? search : mobileSearch;
  if (!(await trigger.isVisible().catch(() => false))) return false;
  await trigger.click();
  await page.locator('[role="dialog"]').first().waitFor({ state: 'visible', timeout: 3000 });
  const link = page.locator(`.global-search-results a[href="${href}"]`).first();
  const found = await link.count();
  if (!found) { await page.keyboard.press('Escape'); return false; }
  await link.click();
  await page.waitForFunction(target => location.pathname === target, href, { timeout: 5000 });
  await page.waitForTimeout(750);
  return true;
}

try {
  await server.listen();
  const origin = server.resolvedUrls?.local?.[0]?.replace(/\/$/, '');
  if (!origin) throw new Error('Isolated Vite test server did not start.');
  await mkdir(out, { recursive: true });
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    const page = await context.newPage();
    await page.goto(`${origin}/login`, { waitUntil: 'networkidle' });
    await page.locator('#login-username').fill('owner-demo');
    await page.locator('#login-password').fill('demo');
    await page.locator('button[type="submit"]').click();
    await page.locator('.app-shell').waitFor({ timeout: 10000 });

    const productsClicked = await clickRoute(page, '/products');
    const productsPath = await page.evaluate(() => location.pathname);
    const productHeading = (await page.locator('.main-content h1').first().textContent().catch(() => ''))?.trim() ?? '';
    const costLink = page.locator('.main-content a[href*="/cost-history"]:visible').first();
    const costLinkCount = await page.locator('.main-content a[href*="/cost-history"]:visible').count();
    const productsScreenshot = productsClicked
      ? `docs/ux-inventory/screenshots/system-mock/react/visual-round5/products-${viewport.name}.png`
      : null;
    if (productsScreenshot) await page.screenshot({ path: path.join(root, productsScreenshot) });
    const barcodeControls = await page.locator('.main-content button, .main-content a, .main-content [role="button"]')
      .evaluateAll(nodes => nodes.filter(node => /barcode|\u0628\u0627\u0631\u0643\u0648\u062f|\u0637\u0628\u0627\u0639\u0629/i.test(`${node.textContent || ''} ${node.getAttribute('aria-label') || ''} ${node.getAttribute('title') || ''}`))
        .map(node => ({ text: (node.textContent || '').trim(), ariaLabel: node.getAttribute('aria-label'), title: node.getAttribute('title'), href: node.getAttribute('href') })));
    let costClick = false;
    let costPath = await page.evaluate(() => location.pathname);
    let costHeading = '';
    let costScreenshot = null;
    if (costLinkCount) {
      await costLink.scrollIntoViewIfNeeded();
      await costLink.click();
      await page.waitForURL(/\/products\/[^/]+\/cost-history$/i, { timeout: 5000 });
      await page.waitForTimeout(400);
      costClick = true;
      costPath = await page.evaluate(() => location.pathname);
      costHeading = (await page.locator('.main-content h1').first().textContent().catch(() => ''))?.trim() ?? '';
      costScreenshot = `docs/ux-inventory/screenshots/system-mock/react/visual-round5/product-cost-history-${viewport.name}.png`;
      await page.screenshot({ path: path.join(root, costScreenshot) });
    }

    const containerRouteClicked = await clickRoute(page, '/containers');
    await page.waitForTimeout(4000); // dismiss any transient navigation toast before the normal-state capture
    let containerListScreenshot = null;
    if (containerRouteClicked) {
      containerListScreenshot = `docs/ux-inventory/screenshots/system-mock/react/visual-round5/container-tracking-candidate-${viewport.name}.png`;
      await page.screenshot({ path: path.join(root, containerListScreenshot) });
    }
    const containerLinks = page.locator('.main-content a[href^="/containers/"]:visible');
    const openCount = await containerLinks.count();
    let containerDetailClick = false;
    let containerPath = await page.evaluate(() => location.pathname);
    let containerHeading = (await page.locator('.main-content h1').first().textContent().catch(() => ''))?.trim() ?? '';
    let containerScreenshot = null;
    if (openCount) {
      await containerLinks.first().scrollIntoViewIfNeeded();
      await containerLinks.first().click();
      await page.waitForURL(/\/containers\/[^/]+$/i, { timeout: 5000 });
      await page.waitForTimeout(500);
      containerPath = await page.evaluate(() => location.pathname);
      containerHeading = (await page.locator('.main-content h1').first().textContent().catch(() => ''))?.trim() ?? '';
      containerDetailClick = containerPath !== '/containers';
      containerScreenshot = `docs/ux-inventory/screenshots/system-mock/react/visual-round5/container-detail-${viewport.name}.png`;
      await page.screenshot({ path: path.join(root, containerScreenshot) });
    }

    const returnsRouteClicked = await clickRoute(page, '/returns');
    await page.waitForTimeout(4000);
    const returnsScreenshot = returnsRouteClicked
      ? `docs/ux-inventory/screenshots/system-mock/react/visual-round5/sales-returns-candidate-${viewport.name}.png`
      : null;
    if (returnsScreenshot) await page.screenshot({ path: path.join(root, returnsScreenshot) });

    const financeRouteClicked = await clickRoute(page, '/finance');
    await page.waitForTimeout(1000);
    const financeScreenshot = financeRouteClicked
      ? `docs/ux-inventory/screenshots/system-mock/react/visual-round5/finance-overview-${viewport.name}.png`
      : null;
    if (financeScreenshot) await page.screenshot({ path: path.join(root, financeScreenshot) });
    const financeFullScreenshot = financeRouteClicked
      ? `docs/ux-inventory/screenshots/system-mock/react/visual-round5/finance-overview-full-${viewport.name}.png`
      : null;
    if (financeFullScreenshot) await page.screenshot({ path: path.join(root, financeFullScreenshot), fullPage: true });

    const containerFundsRouteClicked = await clickRoute(page, '/container-funds');
    let fundsSelectCount = 0;
    let fundsOptionCount = 0;
    let fundsSelected = false;
    let fundsScreenshot = null;
    if (containerFundsRouteClicked) {
      const fundsSelect = page.locator('.main-content select').first();
      fundsSelectCount = await page.locator('.main-content select').count();
      fundsOptionCount = await fundsSelect.locator('option').count();
      const optionValues = await fundsSelect.locator('option').evaluateAll(nodes => nodes.map(node => node.value).filter(Boolean));
      if (optionValues.length) {
        await fundsSelect.selectOption(optionValues[0]);
        await page.waitForTimeout(1000);
        fundsSelected = true;
      }
      fundsScreenshot = `docs/ux-inventory/screenshots/system-mock/react/visual-round5/container-funds-selected-${viewport.name}.png`;
      await page.screenshot({ path: path.join(root, fundsScreenshot), fullPage: true });
    }

    results.push({
      viewport: viewport.name,
      products: { routeClicked: productsClicked, path: productsPath, heading: productHeading, screenshot: productsScreenshot, costHistoryLinkCount: costLinkCount, barcodeControls },
      costHistory: { visibleLinkClicked: costClick, path: costPath, heading: costHeading, screenshot: costScreenshot },
      containerDetail: { containerRouteClicked, visibleOpenButtonCount: openCount, buttonClicked: containerDetailClick, path: containerPath, heading: containerHeading, screenshot: containerScreenshot, listScreenshot: containerListScreenshot },
      salesReturnsCandidate: { routeClicked: returnsRouteClicked, path: returnsRouteClicked ? '/returns' : await page.evaluate(() => location.pathname), screenshot: returnsScreenshot },
      financeOverview: { routeClicked: financeRouteClicked, path: financeRouteClicked ? '/finance' : null, screenshot: financeScreenshot, fullPageScreenshot: financeFullScreenshot },
      containerFundsSelected: { routeClicked: containerFundsRouteClicked, selectCount: fundsSelectCount, optionCount: fundsOptionCount, selected: fundsSelected, screenshot: fundsScreenshot },
    });
    await context.close();
  }
  await writeFile(path.join(root, 'docs/ux-inventory/DEEP_LINKED_UI_REVIEW.json'), `${JSON.stringify({ environment: 'isolated React Vite/MSW; synthetic demo; visible UI clicks only; no API/database writes', results }, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ viewports: results.length, costHistoryClicks: results.filter(item => item.costHistory.visibleLinkClicked).length, containerDetailClicks: results.filter(item => item.containerDetail.buttonClicked).length, output: 'docs/ux-inventory/DEEP_LINKED_UI_REVIEW.json' }, null, 2));
} finally {
  await server.close();
  await browser.close();
}






