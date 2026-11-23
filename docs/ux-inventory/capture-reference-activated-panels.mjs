import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from '../../frontend/node_modules/@playwright/test/index.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const html = path.join(root, 'frontend/reference/precision-slate-erp-v43__3_ (1).html');
const fixture = JSON.parse(await readFile(path.join(root, 'frontend/reference/reference-fixture.json'), 'utf8'));
const out = path.join(root, 'docs/ux-inventory/screenshots/reference/activated');
const panelIds = [
  ['governorates', 'govs'], ['opening-stock', 'stock-add'], ['stock-returns', 'stock-ret'],
  ['trash', 'trash'], ['drivers', 'drivers'], ['audit', 'log'],
  ['finance-inbox', 'f-receipts'], ['finance-other-income', 'f-otherinc'],
  ['finance-payments', 'f-payments'], ['finance-expenses', 'f-expenses'],
  ['finance-transfers', 'f-transfers'], ['finance-treasury', 'f-treasury'],
  ['finance-supplier-balances', 'f-supbal'], ['finance-returns', 'f-finret'],
  ['finance-chart-of-accounts', 'f-coa'], ['finance-journal', 'f-journal'],
  ['finance-ledger', 'f-ledger'], ['finance-trial-balance', 'f-trial'],
  ['finance-statements', 'f-reports'], ['warehouse-returns', 'wh-returns'],
  ['container-funds', 'cont-money'], ['container-transfers', 'transfers'],
  ['minimum-stock', 'x-low'], ['inventory-counts', 'x-count'],
  ['container-tracking', 'x-track'], ['product-cost-history', 'x-price'],
  ['barcode-labels', 'x-bar'], ['expense-budget', 'x-budget'],
  ['recurring-expenses', 'x-recur'], ['monthly-comparison', 'x-compare'],
  ['cash-forecast', 'x-cash'], ['excel-import', 'x-import'],
  ['daily-summary', 'x-daily'], ['install-app', 'x-app'], ['user-notes', 'x-priv'],
];
const viewports = [{ name: '1280', width: 1280, height: 900 }, { name: '768', width: 768, height: 1024 }, { name: '390', width: 390, height: 844 }];
const installedChrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || (existsSync(installedChrome) ? installedChrome : undefined);
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath, args: ['--headless=new'] } : {}) });
const results = [];

async function openPanel(page, id) {
  if (page.viewportSize().width < 900) {
    const menu = page.locator('#x-menu-btn');
    const sidebar = page.locator('.sidebar');
    if (await menu.isVisible().catch(() => false) && !(await sidebar.getAttribute('class')).includes('open')) await menu.click();
  }
  const direct = page.locator(`.sidebar-nav [onclick*="showSection('${id}')"], .sidebar-nav [onclick*="xGo('${id}')"], .sidebar-nav [onclick*="xGo2('${id}')"]`).first();
  if (await direct.count() && !(await direct.isVisible().catch(() => false))) {
    const parent = direct.locator('xpath=ancestor::div[contains(@class,"nav-group")][1]');
    const opener = parent.locator('.nav-group-btn').first();
    if (await opener.count() && await opener.isVisible().catch(() => false)) await opener.click({ timeout: 2500 }).catch(() => {});
    const sub = direct.locator('xpath=ancestor::*[contains(@class,"nav-sub")][1]');
    if (await sub.count() && !(await sub.getAttribute('class')).includes('open')) {
      const groupButton = sub.locator('xpath=preceding-sibling::*[1]').first();
      if (await groupButton.count() && await groupButton.isVisible().catch(() => false)) await groupButton.click({ timeout: 2500 }).catch(() => {});
    }
  }
  if (await direct.count() && await direct.isVisible().catch(() => false)) {
    await direct.scrollIntoViewIfNeeded();
    await direct.click({ timeout: 2500 });
  } else {
    const target = page.locator(`#sec-${id}`);
    if (await target.count()) return { ok: false, reason: 'No visible navigation control for this panel in the reference.' };
    return { ok: false, reason: 'Target panel was not present in the initialized reference DOM.' };
  }
  await page.waitForFunction(panelId => document.querySelector(`#sec-${panelId}`)?.classList.contains('active'), id, { timeout: 2500 });
  await page.waitForTimeout(180);
  return { ok: true, reason: 'Clicked visible reference navigation control; target panel became active.' };
}

try {
  await mkdir(out, { recursive: true });
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    await context.addInitScript(entries => {
      for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    }, fixture.localStorage);
    const page = await context.newPage();
    await page.route(/^https?:\/\//, route => route.abort());
    await page.goto(pathToFileURL(html).href, { waitUntil: 'load' });
    await page.locator('#login-user').selectOption({ index: 0 });
    await page.locator('#login-pass').fill('1234');
    await page.locator('#login-screen .login-btn').click();
    await page.waitForFunction(() => !document.body.classList.contains('logged-out'));
    // Let transient login and fixture notifications disappear before taking comparison evidence.
    await page.waitForTimeout(5000);
    for (const [slug, id] of panelIds) {
      let navigation = { ok: false, reason: '' };
      try {
        if (id.startsWith('f-')) {
          const finance = page.locator('.sidebar-nav .nav-group-btn[onclick*="fin-sub"]').first();
          if (await finance.count()) {
            const outer = page.locator('#fin-sub');
            if (!(await outer.getAttribute('class') ?? '').includes('open')) await finance.click({ timeout: 2500 });
            const nav = page.locator(`#fin-sub [data-sec="${id}"], #fin-sub [onclick*="showSection('${id}')"]`).first();
            if (await nav.count()) {
              const group = nav.locator('xpath=ancestor::div[contains(@class,"fs-g")][1]');
              const body = group.locator('.fs-b');
              if (await body.count() && !(await body.getAttribute('class')).includes('open')) await group.locator('.fs-h').click({ timeout: 2500 });
              await nav.scrollIntoViewIfNeeded();
              await nav.click({ timeout: 2500 });
              await page.waitForFunction(panelId => document.querySelector(`#sec-${panelId}`)?.classList.contains('active'), id, { timeout: 2500 });
              await page.waitForTimeout(180);
              navigation = { ok: true, reason: 'Clicked finance group and visible nested finance panel control; target panel became active.' };
            } else navigation = { ok: false, reason: `No nested navigation control for the panel; finance=${await finance.count()}, outer=${await outer.getAttribute('class')}, financeItems=${await page.locator('#fin-sub .fs-it').count()}.` };
          }
        } else if (id === 'x-low' || id === 'x-count' || id === 'x-track' || id === 'x-price' || id === 'x-bar') {
          const group = page.locator('.sidebar-nav .nav-group-btn').filter({ hasText: 'مخزون وحاويات متقدم' }).first();
          if (await group.count()) await group.click({ timeout: 2500 }).catch(() => {});
          navigation = await openPanel(page, id);
        } else if (id === 'transfers') {
          const group = page.locator('.sidebar-nav .nav-group-btn').filter({ hasText: 'الحاويات' }).first();
          if (await group.count()) await group.click({ timeout: 2500 }).catch(() => {});
          navigation = await openPanel(page, id);
        } else if (id === 'wh-returns') {
          const group = page.locator('.sidebar-nav .nav-group-btn').filter({ hasText: 'مرتجع المخازن' }).first();
          if (await group.count()) await group.click({ timeout: 2500 }).catch(() => {});
          navigation = await openPanel(page, id);
        } else if (id === 'cont-money') {
          const group = page.locator('.sidebar-nav .nav-group-btn').filter({ hasText: 'الحاويات' }).first();
          if (await group.count()) await group.click({ timeout: 2500 }).catch(() => {});
          navigation = await openPanel(page, id);
        } else {
          navigation = await openPanel(page, id);
        }
      } catch (error) {
        navigation = { ok: false, reason: String(error).split('\n')[0] };
        navigation.activePanelAfter = await page.locator('.section-content.active').first().getAttribute('id').catch(() => null);
        navigation.targetPanelPresent = (await page.locator(`#sec-${id}`).count()) > 0;
      }
      // Mobile navigation is required to reach a panel, but it is a transient
      // overlay. Close it with the visible menu button before capturing the
      // panel so the screenshot represents the page state, not the open drawer.
      if (navigation.ok && viewport.width < 900) {
        const sidebar = page.locator('.sidebar');
        const menu = page.locator('#x-menu-btn');
        if ((await sidebar.getAttribute('class') ?? '').includes('open') && await menu.isVisible().catch(() => false)) {
          await menu.click();
          await page.waitForTimeout(120);
        }
      }
      const screenshot = navigation.ok ? `docs/ux-inventory/screenshots/reference/activated/${slug}-${viewport.name}.png` : null;
      if (screenshot) await page.screenshot({ path: path.join(root, screenshot) });
      results.push({ viewport: viewport.name, slug, panelId: id, navigation, screenshot, status: screenshot ? 'CLICK_ACTIVATED_CAPTURED' : 'NOT_VERIFIED_CLICK_BLOCKED' });
    }
    await context.close();
  }
  await writeFile(path.join(root, 'docs/ux-inventory/REFERENCE_ACTIVATED_PANEL_REVIEW.json'), `${JSON.stringify({ environment: 'local reference HTML; isolated fixture; external HTTP blocked; only navigation/control clicks; no data-changing form actions', results }, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ attempts: results.length, capturedAfterClick: results.filter(item => item.screenshot).length, notVerified: results.filter(item => !item.screenshot).length }, null, 2));
} finally {
  await browser.close();
}
