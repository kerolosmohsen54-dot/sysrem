import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '../../frontend/node_modules/@playwright/test/index.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const frontend = path.join(root, 'frontend');
const reference = path.join(frontend, 'reference/precision-slate-erp-v43__3_ (1).html');
const fixture = JSON.parse(await readFile(path.join(frontend, 'reference/reference-fixture.json'), 'utf8'));
const manifest = JSON.parse(await readFile(path.join(root, 'docs/ux-inventory/screenshots/reference/manifest.json'), 'utf8'));
const reportPath = path.join(root, 'docs/ux-inventory/REFERENCE_INTERACTION_REVIEW.json');
const referenceStateShots = path.join(root, 'docs/ux-inventory/screenshots/reference/states');
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
const referenceTestPassword = process.env.REFERENCE_DEMO_PASSWORD;
if (!referenceTestPassword) throw new Error('Set REFERENCE_DEMO_PASSWORD to the locally documented demo value.');
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath, args: ['--headless=new'] } : {}) });
const report = { environment: 'local reference HTML; isolated browser context; fixture localStorage only; external HTTP blocked', panels: [], actions: [], skipped: [] };

try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.addInitScript((entries) => {
    for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  }, fixture.localStorage);
  const page = await context.newPage();
  await page.route(/^https?:\/\//, (route) => route.abort());
  await page.goto(pathToFileURL(reference).href, { waitUntil: 'load' });
  await page.locator('#login-user').selectOption({ index: 0 });
  await page.locator('#login-pass').fill(referenceTestPassword);
  await page.locator('#login-screen .login-btn').click();
  await page.waitForFunction(() => !document.body.classList.contains('logged-out'));
  const screens = [...new Set(manifest.screens.map((entry) => entry.id))];

  for (const id of screens) {
    const navigation = await page.locator('.nav-item[onclick], .nav-sub-item[onclick]').evaluateAll((nodes, target) => {
      const match = nodes.find((node) => (node.getAttribute('onclick') ?? '').includes(`showSection('${target}')`));
      if (!match) return null;
      const all = [...document.querySelectorAll('.nav-item[onclick], .nav-sub-item[onclick]')];
      const parentGroup = match.closest('.nav-sub');
      const groupHeader = parentGroup?.previousElementSibling;
      return { index: all.indexOf(match), label: match.textContent?.trim() ?? '', hidden: getComputedStyle(match).display === 'none', groupHeaderIndex: groupHeader ? all.indexOf(groupHeader) : -1 };
    }, id);
    if (!navigation) {
      report.panels.push({ screen: id, result: 'NO_VISIBLE_NAV_CONTROL', active: await page.evaluate(() => document.querySelector('.section-content.active')?.id ?? null) });
      continue;
    }
    const nav = page.locator('.nav-item[onclick], .nav-sub-item[onclick]').nth(navigation.index);
    if (navigation.hidden) {
      if (navigation.groupHeaderIndex >= 0) {
        const header = page.locator('.nav-item[onclick], .nav-sub-item[onclick]').nth(navigation.groupHeaderIndex);
        await header.click({ timeout: 2000 }).catch(() => undefined);
      }
    }
    const before = await page.evaluate(() => document.querySelector('.section-content.active')?.id ?? null);
    try {
      await nav.click({ timeout: 2500 });
      await page.waitForFunction((expected) => document.querySelector('.section-content.active')?.id === `sec-${expected}`, id, { timeout: 2000 });
      report.panels.push({ screen: id, label: navigation.label, result: 'CLICK_NAVIGATED', before, active: await page.evaluate(() => document.querySelector('.section-content.active')?.id ?? null) });
    } catch (error) {
      report.panels.push({ screen: id, label: navigation.label, result: 'CLICK_DID_NOT_VERIFY', before, active: await page.evaluate(() => document.querySelector('.section-content.active')?.id ?? null), note: String(error).split('\n')[0] });
      continue;
    }

    const candidates = await page.locator(`#sec-${id} button[onclick], #sec-${id} a[onclick], #sec-${id} [role="button"][onclick]`).evaluateAll((nodes) => nodes.map((node, index) => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return { index, tag: node.tagName.toLowerCase(), text: node.textContent?.trim().replace(/\s+/g, ' ').slice(0, 100) ?? '', onclick: node.getAttribute('onclick') ?? '', displayed: style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0, disabled: node.disabled === true };
    }));
    for (const candidate of candidates) {
      const destructive = /save|submit|delete|remove|confirm|approve|post|payment|collect|receive|create|backup|restore|import|export|print|upload|send|logout|reset/i.test(candidate.onclick);
      const safe = /openModal|closeModal|showSection|toggleSub|filterRows|setTab|switchTab|changeTab|search|sort|toggle|selectTab/i.test(candidate.onclick);
      if (!candidate.displayed || candidate.disabled || destructive || !safe) {
        report.skipped.push({ screen: id, ...candidate, reason: !candidate.displayed ? 'not visible' : candidate.disabled ? 'disabled' : destructive ? 'could mutate local fixture or trigger an external side effect' : 'handler not verified safe for activation' });
        continue;
      }
      const control = page.locator(`#sec-${id} button[onclick], #sec-${id} a[onclick], #sec-${id} [role="button"][onclick]`).nth(candidate.index);
      const activeBefore = await page.evaluate(() => document.querySelector('.section-content.active')?.id ?? null);
      try {
        await control.click({ timeout: 1500 });
        await page.waitForTimeout(40);
        const state = await page.evaluate(() => ({ active: document.querySelector('.section-content.active')?.id ?? null, openModals: [...document.querySelectorAll('.modal')].filter((modal) => getComputedStyle(modal).display !== 'none' && modal.getBoundingClientRect().width > 0).map((modal) => modal.id) }));
        report.actions.push({ screen: id, ...candidate, result: 'CLICKED_IN_ISOLATED_REFERENCE', before: activeBefore, after: state });
        if (state.openModals.length) {
          await page.keyboard.press('Escape');
          await page.waitForTimeout(30);
          const remaining = await page.locator('.modal').evaluateAll((nodes) => nodes.filter((modal) => getComputedStyle(modal).display !== 'none' && modal.getBoundingClientRect().width > 0).map((modal) => modal.id));
          report.actions.push({ screen: id, element: candidate.text, action: 'Escape dismissal', result: remaining.length ? 'NOT_DISMISSED' : 'DISMISSED' });
        }
      } catch (error) {
        report.actions.push({ screen: id, ...candidate, result: 'CLICK_FAILED', note: String(error).split('\n')[0] });
      }
    }
  }

  await context.close();
  const stateContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await stateContext.addInitScript((entries) => {
    for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  }, fixture.localStorage);
  const statePage = await stateContext.newPage();
  await statePage.route(/^https?:\/\//, (route) => route.abort());
  await statePage.goto(pathToFileURL(reference).href, { waitUntil: 'load' });
  await statePage.locator('#login-user').selectOption({ index: 0 });
  await statePage.locator('#login-pass').fill(referenceTestPassword);
  await statePage.locator('#login-screen .login-btn').click();
  await statePage.waitForFunction(() => !document.body.classList.contains('logged-out'));
  const search = statePage.locator('#search-wrap');
  await search.click();
  const searchOpen = await statePage.locator('#search-dropdown').evaluate((node) => node.classList.contains('open'));
  report.actions.push({ screen: 'global shell', element: 'global search', result: searchOpen ? 'CLICK_OPENED' : 'CLICK_DID_NOT_OPEN' });
  if (searchOpen) {
    await statePage.screenshot({ path: path.join(referenceStateShots, 'interaction-global-search-1280.png') });
    await statePage.keyboard.press('Escape');
    const searchClosed = await statePage.locator('#search-dropdown').evaluate((node) => !node.classList.contains('open'));
    report.actions.push({ screen: 'global shell', element: 'global search', action: 'Escape dismissal', result: searchClosed ? 'DISMISSED' : 'NOT_DISMISSED' });
  }
  const notificationsButton = statePage.locator('.topbar-actions button[onclick*="toggleNotif"]');
  await notificationsButton.click();
  const notificationsOpen = await statePage.locator('#notif-panel').evaluate((node) => getComputedStyle(node).display !== 'none');
  report.actions.push({ screen: 'global shell', element: 'notifications', result: notificationsOpen ? 'CLICK_OPENED' : 'CLICK_DID_NOT_OPEN' });
  if (notificationsOpen) {
    await statePage.screenshot({ path: path.join(referenceStateShots, 'interaction-notifications-1280.png') });
    await notificationsButton.click();
  }
  await stateContext.close();

  report.panelSummary = { discovered: screens.length, clickedAndActivated: report.panels.filter((row) => row.result === 'CLICK_NAVIGATED').length, noNavigationControl: report.panels.filter((row) => row.result === 'NO_VISIBLE_NAV_CONTROL').length, clickUnverified: report.panels.filter((row) => row.result === 'CLICK_DID_NOT_VERIFY').length };
  report.actionSummary = { clicked: report.actions.filter((row) => row.result === 'CLICKED_IN_ISOLATED_REFERENCE').length, escapeChecks: report.actions.filter((row) => row.action === 'Escape dismissal').length, skipped: report.skipped.length };
  await context.close();
} finally {
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await browser.close();
}

console.log(JSON.stringify({ panelSummary: report.panelSummary, actionSummary: report.actionSummary, reportPath: 'docs/ux-inventory/REFERENCE_INTERACTION_REVIEW.json' }, null, 2));
