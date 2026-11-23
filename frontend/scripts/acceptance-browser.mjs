import { chromium } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { URL } from 'node:url';

const root = path.resolve(import.meta.dirname, '../..');
const evidence = path.join(root, 'docs', 'evidence');
await mkdir(evidence, { recursive: true });

const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const requests = [];
const browserErrors = [];
page.on('pageerror', error => browserErrors.push(error.message));
page.on('console', message => { if (message.type() === 'error') browserErrors.push(message.text()); });
page.on('response', response => {
  if (response.url().includes('/api/v1/')) {
    requests.push({ method: response.request().method(), path: new URL(response.url()).pathname, status: response.status() });
  }
});

try {
  await page.goto('http://127.0.0.1:5173/login', { waitUntil: 'domcontentloaded' });
  await page.locator('input').first().waitFor({ timeout: 20000 }).catch(() => {});
  const user = process.argv[2];
  const route = process.argv[3];
  if (user === 'manual_owner' || user === 'manual_readonly') {
    const credentials = JSON.parse(await readFile(path.join(os.tmpdir(), 'test-accounts.local.txt'), 'utf8'));
    await page.locator('input[name="username"]').fill(user);
    await page.locator('input[name="password"]').fill(credentials[user]);
    await page.getByRole('button', { name: 'دخول' }).click();
    await page.waitForURL(url => !url.pathname.endsWith('/login'), { timeout: 20000 }).catch(() => {});
    const routes = route === 'operational' ? [
      '/admin/governorates', '/admin/drivers', '/admin/trash', '/warehouse-returns', '/inventory/damaged',
      '/container-transfers', '/container-funds', '/inventory/minimum-stock', '/inventory/counts',
      '/partners', '/partner-payments', '/customers/2/liquidation', '/finance/inbox',
      '/finance/withdrawals', '/finance/movements',
    ] : [route || '/dashboard'];
    const results = [];
    for (const currentRoute of routes) {
      if (page.url() !== `http://127.0.0.1:5173${currentRoute}`) {
        await page.goto(`http://127.0.0.1:5173${currentRoute}`, { waitUntil: 'domcontentloaded' });
      }
      await page.waitForFunction(() => {
        const main = document.querySelector('main');
        return main !== null && !main.textContent?.includes('جارٍ التحقق من الجلسة');
      }, undefined, { timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(1300);
      if (await page.getByRole('button', { name: 'تأكيد ومتابعة' }).isVisible().catch(() => false)) {
        await page.locator('input[type="password"]').last().fill(credentials[user]);
        await page.getByRole('button', { name: 'تأكيد ومتابعة' }).click();
        await page.waitForTimeout(3000);
      }
      const label = currentRoute.replaceAll('/', '-').replaceAll(':', '-');
      const screenshot = `acceptance-${user}${label}.png`;
      await page.screenshot({ path: path.join(evidence, screenshot), fullPage: true });
      const scoped = requests.filter(item => !results.some(previous => previous.requests.includes(item)));
      results.push({ route: currentRoute, url: page.url(), text: (await page.locator('main').innerText().catch(() => page.locator('body').innerText())).slice(0, 2000), tail: (await page.locator('body').innerText()).slice(-700), buttons: await page.locator('main button').allTextContents().catch(() => []), inputs: await page.locator('main input').evaluateAll(nodes => nodes.map(node => ({ name: node.name, type: node.type, placeholder: node.placeholder }))), requests: scoped, errors: browserErrors.slice(), screenshot });
    }
    await writeFile(path.join(evidence, `acceptance-${user}-${route === 'operational' ? 'operational' : 'core'}-pages.json`), JSON.stringify(results, null, 2));
    console.log(JSON.stringify(route === 'operational' ? results.map(item => ({ route: item.route, text: item.text.slice(0, 650), requests: item.requests, screenshot: item.screenshot })) : results, null, 2));
    process.exitCode = 0;
  } else {
  const inputs = await page.locator('input').evaluateAll(nodes => nodes.map(node => ({
    name: node.name, type: node.type, placeholder: node.placeholder,
  })));
  console.log(JSON.stringify({ url: page.url(), inputs, buttons: await page.getByRole('button').allTextContents(), text: (await page.locator('body').innerText()).slice(0, 1200), requests }, null, 2));
  await page.screenshot({ path: path.join(evidence, 'acceptance-login-form.png'), fullPage: true });
  }
} finally {
  await browser.close();
}
