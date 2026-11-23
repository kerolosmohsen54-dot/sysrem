import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { ar } from '../src/shared/i18n/ar';

const viewports = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 900 },
] as const;

test('daily workflows fit from phone through desktop widths', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: viewports[0].width, height: viewports[0].height });
  await page.goto('/login');
  await page.getByLabel(ar.auth.username).selectOption('sales-workflow-e2e-owner');
  await page.getByLabel(ar.auth.password).fill('Sales-workflow-e2e-2026!');
  const loginResponse = page.waitForResponse((response) =>
    response.request().method() === 'POST' && response.url().endsWith('/api/v1/auth/login'),
  );
  await page.getByRole('button', { name: ar.auth.submit }).click();
  expect((await loginResponse).status()).toBe(200);
  await expect(page).not.toHaveURL(/\/login/);
  await expect(page.getByRole('button', { name: ar.auth.logout }).first()).toBeVisible({ timeout: 20_000 });

  const routes = ['/dashboard', '/orders', '/invoices/new', '/customers', '/containers', '/finance', '/inventory', '/reports'];
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    for (const route of routes) {
      const dashboardResponsePromise = route === '/dashboard'
        ? page.waitForResponse((response) =>
          response.request().method() === 'GET' && response.url().includes('/api/v1/reports/dashboard'),
        )
        : null;
      await page.goto(route);
      await expect(page.locator('main h1').first(), `${route} at ${viewport.width}px`).toBeVisible({ timeout: 30_000 });
      if (dashboardResponsePromise) {
        const response = await dashboardResponsePromise;
        expect(response.status()).toBe(200);
        expect((await response.json()).data).toBeTruthy();
        await expect(page.locator('.dashboard-metrics')).toBeVisible({ timeout: 30_000 });
        await expect(page.locator('.page-state[role="status"]')).toHaveCount(0);
      }
      const widths = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        document: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
        content: document.querySelector('main')?.scrollWidth ?? 0,
        contentViewport: document.querySelector('main')?.clientWidth ?? 0,
      }));
      expect(widths.document, `${route} document overflow at ${viewport.width}px: ${JSON.stringify(widths)}`).toBeLessThanOrEqual(widths.viewport);
      expect(widths.body, `${route} body overflow at ${viewport.width}px: ${JSON.stringify(widths)}`).toBeLessThanOrEqual(widths.viewport);
      expect(widths.content, `${route} main overflow at ${viewport.width}px: ${JSON.stringify(widths)}`).toBeLessThanOrEqual(widths.contentViewport);

      if (route === '/dashboard') {
        const directory = path.resolve(process.cwd(), 'test-results/mobile-layout');
        fs.mkdirSync(directory, { recursive: true });
        await page.screenshot({ path: path.join(directory, `${viewport.name}-dashboard.png`), fullPage: true });
      }
    }

    if (viewport.width <= 768) {
      const menu = page.getByRole('button', { name: ar.app.openMenu });
      await expect(menu).toBeVisible();
      await menu.click();
      const sidebar = page.locator('aside.sidebar.sidebar-open');
      await expect(sidebar).toBeVisible();
      expect(await sidebar.getByRole('link').count()).toBeGreaterThan(5);
      await sidebar.getByRole('link', { name: ar.nav.orders }).click();
      await expect(page).toHaveURL(/\/orders$/);
      await expect(page.locator('aside.sidebar.sidebar-open')).toHaveCount(0);
    } else {
      await expect(page.locator('aside.sidebar')).toBeVisible();
    }
  }
});
