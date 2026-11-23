import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '../../frontend/node_modules/@playwright/test/index.mjs';
import { createServer } from '../../frontend/node_modules/vite/dist/node/index.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const frontend = path.join(root, 'frontend');
const shots = path.join(root, 'docs/ux-inventory/screenshots/system-mock/react/login');
const stateShots = path.join(root, 'docs/ux-inventory/screenshots/system-mock/react/states');
const reportPath = path.join(root, 'docs/ux-inventory/INTERACTION_REVIEW.json');
const results = [];
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
const browser = await chromium.launch({
  headless: true,
  ...(executablePath ? { executablePath, args: ['--headless=new'] } : {}),
});
const server = await createServer({
  configFile: path.join(frontend, 'vite.config.ts'),
  root: frontend,
  mode: 'test',
  define: { 'import.meta.env.VITE_MOCK_API': JSON.stringify('true') },
  server: {
    host: '127.0.0.1',
    port: 5188,
    strictPort: true,
    proxy: { '/api/v1': { target: 'http://127.0.0.1:1', changeOrigin: true } },
  },
});

async function record(label, page, expectedPath = null) {
  const actualPath = await page.evaluate(() => `${location.pathname}${location.search}`);
  const heading = (await page.locator('main h1, .main-content h1').first().textContent().catch(() => ''))?.trim() ?? '';
  results.push({ label, actualPath, heading, pass: expectedPath ? actualPath === expectedPath : true });
}

try {
  await server.listen();
  const origin = server.resolvedUrls?.local?.[0]?.replace(/\/$/, '');
  if (!origin) throw new Error('Vite test server did not expose a local URL.');
  await mkdir(stateShots, { recursive: true });

  for (const viewport of [
    { name: '1280', width: 1280, height: 900 },
    { name: '768', width: 768, height: 1024 },
    { name: '390', width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({ viewport, serviceWorkers: 'allow' });
    const page = await context.newPage();
    page.on('pageerror', (error) => results.push({ label: `pageerror-${viewport.name}`, error: error.message, pass: false }));
    await page.goto(`${origin}/login`, { waitUntil: 'networkidle' });
    await page.locator('#login-username').waitFor();
    await page.screenshot({ path: path.join(shots, `login-${viewport.name}.png`) });

    if (viewport.name === '1280') {
      await page.locator('button[type="submit"]').click();
      const nativeValidation = await page.locator('#login-username, #login-password').evaluateAll((nodes) => nodes.map((node) => ({ valid: node.checkValidity(), message: node.validationMessage })));
      results.push({ label: 'login-empty-submit-validation', actual: nativeValidation, pass: nativeValidation.length === 2 && nativeValidation.every((field) => !field.valid && field.message.length > 0) });
    }

    await page.locator('#login-username').fill('owner-demo');
    await page.locator('#login-password').fill('demo');
    await page.locator('button[type="submit"]').click();
    await page.locator('.app-shell').waitFor({ timeout: 10000 });
    await record(`login-mock-${viewport.name}`, page, '/dashboard');

    if (viewport.name === '1280') {
      const links = await page.locator('.sidebar-nav a[href]').evaluateAll((nodes) => nodes.map((node) => ({ href: node.getAttribute('href'), label: node.textContent?.trim() ?? '' })));
      for (const link of links) {
        const locator = page.locator(`.sidebar-nav a[href="${link.href}"]`).first();
        if (!(await locator.count())) continue;
        const groupOpen = await locator.evaluate((node) => {
          const parent = node.closest('details');
          return parent ? parent.open : true;
        });
        if (!groupOpen) await locator.locator('xpath=ancestor::details[1]//summary').click();
        try {
          await locator.click({ timeout: 3500 });
        } catch (error) {
          const message = String(error).split('\n')[0];
          await page.keyboard.press('Escape');
          try {
            await locator.click({ timeout: 2500 });
            results.push({ label: `sidebar-click:${link.label}`, firstAttempt: message, recovery: 'Escape dismissed an obstructing layer; retry navigated.', actualPath: await page.evaluate(() => location.pathname), pass: await page.evaluate((href) => location.pathname === href, link.href) });
          } catch (retryError) {
            results.push({ label: `sidebar-click:${link.label}`, firstAttempt: message, retry: String(retryError).split('\n')[0], actualPath: await page.evaluate(() => location.pathname), pass: false });
          }
          continue;
        }
        await page.waitForFunction((href) => location.pathname === href, link.href, { timeout: 5000 }).catch(() => undefined);
        await record(`sidebar-click:${link.label}`, page, link.href);
      }

      await page.getByRole('button', { name: /بحث سريع|بحث شامل/ }).first().click().catch(() => undefined);
      const searchDialog = page.locator('[role="dialog"], .global-search-dialog, input[aria-label*="بحث"]').first();
      const searchOpened = await searchDialog.isVisible().catch(() => false);
      results.push({ label: 'global-search-open', actual: { visibleSearchSurface: searchOpened }, pass: searchOpened });
      if (searchOpened) {
        await page.screenshot({ path: path.join(stateShots, 'global-search-1280.png') });
        await page.keyboard.press('Escape');
        const closed = await searchDialog.isVisible().catch(() => false);
        results.push({ label: 'global-search-escape-close', actual: { visibleSearchSurface: closed }, pass: !closed });
      }

      const notification = page.locator('.notification-trigger');
      if (await notification.count()) {
        await notification.click();
        const open = await notification.getAttribute('aria-expanded');
        const visible = await page.locator('.notification-panel').isVisible();
        await page.screenshot({ path: path.join(stateShots, 'notifications-1280.png') });
        results.push({ label: 'notifications-open', actual: { expanded: open, visible }, pass: open === 'true' && visible });
        await notification.click();
        const closed = await notification.getAttribute('aria-expanded');
        results.push({ label: 'notifications-close', actual: { expanded: closed }, pass: closed === 'false' });
      }

      const theme = page.locator('.theme-control input');
      if (await theme.count()) {
        const before = await page.locator('html').getAttribute('data-theme') ?? 'dark (default)';
        await theme.click();
        const changed = await page.locator('html').getAttribute('data-theme');
        await theme.click();
        const restoredAttribute = await page.locator('html').getAttribute('data-theme');
        const restored = restoredAttribute ?? 'dark (default)';
        results.push({ label: 'theme-toggle-round-trip', actual: { before, changed, restored }, pass: changed === 'light' && ['dark', 'dark (default)'].includes(restored) });
      }

      const desktopQuickActions = page.locator('.quick-actions-desktop');
      if (await desktopQuickActions.count()) await desktopQuickActions.locator('summary').click();
      const createOrder = desktopQuickActions.locator('a[href="/orders/new"]');
      if (await createOrder.count()) {
        await createOrder.click({ timeout: 4000 }).catch(() => undefined);
        await page.waitForFunction(() => location.pathname === '/orders/new', undefined, { timeout: 3000 }).catch(() => undefined);
      }
      const submitButtons = page.locator('main button[type="submit"], .main-content button[type="submit"]');
      const submitCount = await submitButtons.count();
      if (submitCount && await page.evaluate(() => location.pathname === '/orders/new')) {
        await page.screenshot({ path: path.join(stateShots, 'order-create-empty-1280.png') });
        await submitButtons.last().click({ timeout: 3000 });
        const validity = await page.locator('form').last().evaluate((form) => ({ valid: form.checkValidity(), fields: [...form.querySelectorAll('input,select,textarea')].map((field) => ({ required: field.required, valid: field.checkValidity(), message: field.validationMessage })) }));
        const invalidFields = validity.fields.filter((field) => field.required && !field.valid).length;
        results.push({ label: 'order-create-empty-submit-validation-via-clicks', actual: { path: await page.evaluate(() => location.pathname), submitCount, ariaInvalidFields: await page.locator('[aria-invalid="true"]').count(), ...validity }, pass: invalidFields > 0 && !validity.valid });
      } else {
        results.push({ label: 'order-create-empty-submit-validation-via-clicks', actual: { path: await page.evaluate(() => location.pathname), submitCount, createLinkFound: (await createOrder.count()) > 0 }, pass: false, note: 'The quick action did not open the form.' });
      }
    }

    if (viewport.name === '390') {
      const mobileSearch = page.locator('.mobile-bottom-nav button[aria-label]').first();
      await mobileSearch.click();
      const mobileSearchDialog = page.locator('[role="dialog"]').first();
      const mobileSearchOpen = await mobileSearchDialog.isVisible().catch(() => false);
      if (mobileSearchOpen) await page.screenshot({ path: path.join(stateShots, 'global-search-390.png') });
      results.push({ label: 'mobile-search-open', actual: { visible: mobileSearchOpen }, pass: mobileSearchOpen });
      await page.keyboard.press('Escape');
      const menu = page.locator('.mobile-bottom-nav button[aria-expanded]');
      await menu.click();
      const expanded = await menu.getAttribute('aria-expanded');
      const dashboardLink = page.locator('.sidebar-nav a[href="/dashboard"]').first();
      const visible = await dashboardLink.isVisible();
      await page.screenshot({ path: path.join(stateShots, 'mobile-menu-390.png') });
      results.push({ label: 'mobile-menu-open', actual: { expanded, dashboardLinkVisible: visible }, pass: expanded === 'true' && visible });
      await dashboardLink.click();
      await page.waitForFunction(() => location.pathname === '/dashboard');
      results.push({ label: 'mobile-menu-dashboard-click', actualPath: await page.evaluate(() => location.pathname), pass: true });
      const mobileQuickActions = page.locator('.quick-actions-mobile');
      await mobileQuickActions.locator('summary').click();
      const createFromDock = mobileQuickActions.locator('a[href="/orders/new"]');
      await createFromDock.click({ timeout: 4000 }).catch(() => undefined);
      const mobileCreatePath = await page.evaluate(() => location.pathname);
      results.push({ label: 'mobile-quick-action-create-order', actualPath: mobileCreatePath, pass: mobileCreatePath === '/orders/new' });
    }
    await context.close();
  }

  const passed = results.filter((row) => row.pass).length;
  const summary = { origin: 'isolated Vite test mode; MSW enabled; proxy fallback set to closed port 1', tested: results.length, passed, failed: results.length - passed, results };
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(summary, null, 2));
} finally {
  const passed = results.filter((row) => row.pass).length;
  const summary = { origin: 'isolated Vite test mode; MSW enabled; proxy fallback set to closed port 1', tested: results.length, passed, failed: results.length - passed, results };
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await browser.close();
  await server.close();
}
