import AxeBuilder from '@axe-core/playwright';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
const browserOptions = { headless: true };
if (executablePath) {
  browserOptions.executablePath = executablePath;
  browserOptions.args = ['--headless=new'];
}

const routes = [
  '/dashboard',
  '/customers',
  '/orders',
  '/orders/new',
  '/invoices',
  '/invoices/new',
  '/collections',
  '/returns',
  '/returns/new',
  '/deliveries',
  '/deliveries/new',
  '/products',
  '/categories',
  '/warehouses',
  '/inventory',
  '/inventory/movements',
  '/inventory/adjustments',
  '/inventory/opening-stock',
  '/inventory/transfers',
  '/containers',
  '/finance',
  '/finance/treasury',
  '/finance/transfers',
  '/finance/expenses',
  '/finance/currencies',
  '/finance/inbox',
  '/finance/withdrawals',
  '/finance/movements',
  '/partners',
  '/partner-payments',
  '/customers/101/liquidation',
  '/admin/governorates',
  '/admin/drivers',
  '/admin/trash',
  '/admin/install',
  '/warehouse-returns',
  '/inventory/damaged',
  '/inventory/minimum-stock',
  '/inventory/counts',
  '/reports',
  '/reports/sales',
  '/reports/invoice-profit',
  '/reports/stock',
  '/admin/users',
  '/admin/settings',
  '/admin/audit',
];
const browser = await chromium.launch(browserOptions);
const server = await createServer({
  mode: 'test',
  define: { 'import.meta.env.VITE_MOCK_API': JSON.stringify('true') },
  server: { host: '127.0.0.1', port: 5188, strictPort: false },
});
let violations = 0;

try {
  await server.listen();
  const origin = server.resolvedUrls?.local?.[0]?.replace(/\/$/, '');
  if (!origin) throw new Error('Could not determine the accessibility test server address.');

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${origin}/login`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'تسجيل الدخول' }).waitFor();
  const loginResults = await new AxeBuilder({ page }).analyze();
  violations += loginResults.violations.length;
  console.log(`/login: ${loginResults.violations.length} axe violations`);
  for (const violation of loginResults.violations) {
    console.log(`  ${violation.id}: ${violation.help}`);
    for (const node of violation.nodes) {
      console.log(`    ${node.target.join(', ')} — ${node.failureSummary?.replace(/\s+/g, ' ')}`);
    }
  }
  await page.getByLabel('اسم المستخدم').selectOption('owner-demo');
  await page.getByLabel('كلمة المرور').fill('demo');
  await page.getByRole('button', { name: 'تسجيل الدخول' }).click();
  await page.locator('.app-shell').waitFor();
  await page.locator('.main-content h1').first().waitFor();
  for (const target of routes) {
    const previousHeading = (await page.locator('.main-content h1').first().textContent())?.trim();
    const currentPath = await page.evaluate(() => window.location.pathname);
    if (currentPath !== target) {
      await page.evaluate((route) => {
        window.history.pushState({}, '', route);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }, target);
      await page.waitForFunction((previous) => {
        const heading = document.querySelector('.main-content h1')?.textContent?.trim();
        return heading && heading !== previous;
      }, previousHeading);
    }
    const results = await new AxeBuilder({ page }).analyze();
    violations += results.violations.length;
    console.log(`${target}: ${results.violations.length} axe violations`);
    for (const violation of results.violations) {
      console.log(
        `  ${violation.impact ?? 'unknown'} ${violation.id}: ${violation.help} (${violation.nodes.length} nodes)`,
      );
      for (const node of violation.nodes) {
        console.log(`    ${node.target.join(', ')} — ${node.failureSummary?.replace(/\s+/g, ' ')}`);
      }
    }
  }

  await page.keyboard.press('Control+k');
  await page.getByRole('dialog', { name: 'بحث سريع' }).waitFor();
  const searchResults = await new AxeBuilder({ page }).analyze();
  violations += searchResults.violations.length;
  console.log(`Global route search: ${searchResults.violations.length} axe violations`);
  for (const violation of searchResults.violations) {
    console.log(
      `  ${violation.impact ?? 'unknown'} ${violation.id}: ${violation.help} (${violation.nodes.length} nodes)`,
    );
    for (const node of violation.nodes) {
      console.log(`    ${node.target.join(', ')} — ${node.failureSummary?.replace(/\s+/g, ' ')}`);
    }
  }
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 390, height: 844 });
  const previousHeading = (await page.locator('.main-content h1').first().textContent())?.trim();
  await page.evaluate(() => {
    window.history.pushState({}, '', '/dashboard');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await page.waitForFunction((previous) => {
    const heading = document.querySelector('.main-content h1')?.textContent?.trim();
    return heading && heading !== previous;
  }, previousHeading);
  const mobileResults = await new AxeBuilder({ page }).analyze();
  violations += mobileResults.violations.length;
  console.log(`/dashboard (390px): ${mobileResults.violations.length} axe violations`);
  for (const violation of mobileResults.violations) {
    console.log(
      `  ${violation.impact ?? 'unknown'} ${violation.id}: ${violation.help} (${violation.nodes.length} nodes)`,
    );
    for (const node of violation.nodes) {
      console.log(`    ${node.target.join(', ')} — ${node.failureSummary?.replace(/\s+/g, ' ')}`);
    }
  }
  const mobileWidths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
  }));
  console.log(
    `/dashboard (390px): viewport ${mobileWidths.viewport}px, document ${mobileWidths.document}px`,
  );
  if (mobileWidths.document > mobileWidths.viewport) {
    console.error('Mobile dashboard has horizontal page overflow.');
    process.exitCode = 1;
  }
  await page.setViewportSize({ width: 768, height: 1024 });
  const tabletWidths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
  }));
  console.log(
    `/dashboard (768px): viewport ${tabletWidths.viewport}px, document ${tabletWidths.document}px`,
  );
  if (tabletWidths.document > tabletWidths.viewport) {
    console.error('Tablet dashboard has horizontal page overflow.');
    process.exitCode = 1;
  }
  await context.close();
} finally {
  await browser.close();
  await server.close();
}

console.log(`Accessibility scan complete: ${routes.length + 3} views; ${violations} violations.`);
if (violations > 0) process.exitCode = 1;
