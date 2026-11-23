import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdir, readFile } from 'node:fs/promises';
import { chromium } from '../../frontend/node_modules/@playwright/test/index.mjs';
import { createServer } from '../../frontend/node_modules/vite/dist/node/index.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const frontend = path.join(root, 'frontend');
const referencePath = path.join(frontend, 'reference/precision-slate-erp-v43__3_ (1).html');
const fixture = JSON.parse(await readFile(path.join(frontend, 'reference/reference-fixture.json'), 'utf8'));
const out = path.join(root, 'docs/ux-inventory/screenshots');
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
// The reference HTML contains a prototype-only demo administrator login path.
// This credential is used only in an isolated file:// browser context, never sent over the network.
const referencePassword = '1234';

const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath, args: ['--headless=new'] } : {}) });
const server = await createServer({
  configFile: path.join(frontend, 'vite.config.ts'),
  root: frontend,
  mode: 'test',
  define: { 'import.meta.env.VITE_MOCK_API': JSON.stringify('true') },
  server: { host: '127.0.0.1', port: 5190, strictPort: true, proxy: { '/api/v1': { target: 'http://127.0.0.1:1', changeOrigin: true } } },
});

try {
  await server.listen();
  const origin = server.resolvedUrls?.local?.[0]?.replace(/\/$/, '');
  if (!origin) throw new Error('Isolated Vite test server did not start.');
  await mkdir(path.join(out, 'reference/states'), { recursive: true });
  await mkdir(path.join(out, 'system-mock/react/states'), { recursive: true });

  const refContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await refContext.addInitScript((entries) => {
    for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  }, fixture.localStorage);
  const ref = await refContext.newPage();
  await ref.route(/^https?:\/\//, route => route.abort());
  await ref.goto(pathToFileURL(referencePath).href, { waitUntil: 'load' });
  await ref.locator('#login-user').selectOption({ index: 0 });
  await ref.locator('#login-pass').fill(referencePassword);
  await ref.locator('#login-screen .login-btn').click();
  await ref.waitForFunction(() => !document.body.classList.contains('logged-out'));
  const refAnchorIndex = await ref.locator('.nav-item[onclick], .nav-sub-item[onclick]').evaluateAll(nodes => nodes.findIndex(node => (node.getAttribute('onclick') ?? '').includes("showSection('invoice-create')")));
  if (refAnchorIndex < 0) throw new Error('Reference invoice-create navigation control not found.');
  await ref.locator('.nav-item[onclick], .nav-sub-item[onclick]').nth(refAnchorIndex).click();
  await ref.waitForFunction(() => document.querySelector('.section-content.active')?.id === 'sec-invoice-create');
  await ref.locator('#search-wrap').click();
  await ref.locator('#search-dropdown.open').waitFor();
  await ref.screenshot({ path: path.join(out, 'reference/states/interaction-global-search-invoice-create-1280.png') });
  await ref.keyboard.press('Escape');
  const refNotif = ref.locator('.topbar-actions button[onclick*="toggleNotif"]');
  await refNotif.click();
  await ref.locator('#notif-panel').waitFor({ state: 'visible' });
  await ref.screenshot({ path: path.join(out, 'reference/states/interaction-notifications-invoice-create-1280.png') });
  await refContext.close();

  const appContext = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'allow' });
  const app = await appContext.newPage();
  await app.goto(`${origin}/login`, { waitUntil: 'networkidle' });
  await app.locator('#login-username').fill('owner-demo');
  await app.locator('#login-password').fill('demo');
  await app.locator('button[type="submit"]').click();
  await app.locator('.app-shell').waitFor({ timeout: 10000 });
  const appInvoiceNav = app.locator('.sidebar-nav a[href="/invoices/new"]');
  const group = appInvoiceNav.locator('xpath=ancestor::details[1]');
  if (await group.count() && !(await group.evaluate(node => node.open))) await group.locator('summary').click();
  await appInvoiceNav.click();
  await app.waitForFunction(() => location.pathname === '/invoices/new');
  await app.locator('.global-search-trigger').click();
  await app.locator('.global-search-dialog, [role="dialog"]').first().waitFor({ state: 'visible' });
  await app.screenshot({ path: path.join(out, 'system-mock/react/states/interaction-global-search-invoice-create-1280.png') });
  await app.keyboard.press('Escape');
  const appNotif = app.locator('.notification-trigger');
  await appNotif.click();
  await app.locator('.notification-panel').waitFor({ state: 'visible' });
  await app.screenshot({ path: path.join(out, 'system-mock/react/states/interaction-notifications-invoice-create-1280.png') });
  await appContext.close();
  console.log(JSON.stringify({ viewport: '1280x900', route: '/invoices/new and reference sec-invoice-create', clickEvidence: ['reference sidebar showSection invoice-create', 'React sidebar href /invoices/new'], screenshots: [
    'docs/ux-inventory/screenshots/reference/states/interaction-global-search-invoice-create-1280.png',
    'docs/ux-inventory/screenshots/system-mock/react/states/interaction-global-search-invoice-create-1280.png',
    'docs/ux-inventory/screenshots/reference/states/interaction-notifications-invoice-create-1280.png',
    'docs/ux-inventory/screenshots/system-mock/react/states/interaction-notifications-invoice-create-1280.png'
  ] }, null, 2));
} finally {
  await server.close();
  await browser.close();
}
