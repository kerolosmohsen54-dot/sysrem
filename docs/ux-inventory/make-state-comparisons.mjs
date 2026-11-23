import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { chromium } from '../../frontend/node_modules/@playwright/test/index.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const output = path.join(root, 'docs/ux-inventory/screenshots/system-mock/state-comparisons');
const cases = [];
for (const viewport of ['1280', '768', '390']) {
  cases.push({ name: `global-search-${viewport}`, state: 'البحث الشامل', viewport,
    reference: `docs/ux-inventory/screenshots/reference/states/interaction-global-search-invoice-create-${viewport}.png`,
    system: `docs/ux-inventory/screenshots/system-mock/react/states/interaction-global-search-invoice-create-${viewport}.png` });
  cases.push({ name: `notifications-${viewport}`, state: 'الإشعارات', viewport,
    reference: `docs/ux-inventory/screenshots/reference/states/interaction-notifications-invoice-create-${viewport}.png`,
    system: `docs/ux-inventory/screenshots/system-mock/react/states/interaction-notifications-invoice-create-${viewport}.png` });
}
const additionalRoutes = [
  { slug:'governorates', reference:'govs', screenId:'SCR-026', title:'المحافظات' },
  { slug:'opening-stock', reference:'stock-add', screenId:'SCR-027', title:'إضافة إلى المخزون' },
  { slug:'trash', reference:'trash', screenId:'SCR-029', title:'سلة المحذوفات' },
  { slug:'drivers', reference:'drivers', screenId:'SCR-032', title:'سائقو الشحن' },
  { slug:'audit', reference:'log', screenId:'SCR-033', title:'سجل العمليات' },
  { slug:'container-transfers', reference:'transfers', screenId:'SCR-050', title:'نقل الحاويات بين المواقع' },
  { slug:'warehouse-returns', reference:'wh-returns', screenId:'SCR-051', title:'مرتجعات المخازن' },
  { slug:'container-funds', reference:'cont-money', screenId:'SCR-052', title:'أموال الحاويات' },
  { slug:'customer-balances', reference:'f-custbal', screenId:'SCR-041', title:'أرصدة العملاء' },
  { slug:'minimum-stock', reference:'x-low', screenId:'SCR-061', title:'الحد الأدنى للمخزون' },
  { slug:'inventory-counts', reference:'x-count', screenId:'SCR-062', title:'الجرد الدوري' },
  { slug:'pwa-install', reference:'x-app', screenId:'SCR-067', title:'تثبيت التطبيق' },
];
for (const route of additionalRoutes) for (const viewport of ['1280','768','390']) {
  if (route.slug==='customer-balances' && viewport!=='1280') continue;
  cases.push({ name:`round3-${route.slug}-${viewport}`, state:route.title, viewport, screenId:route.screenId,
    reference:`docs/ux-inventory/screenshots/reference/screens/${route.reference}-${viewport}.png`,
    system:`docs/ux-inventory/screenshots/system-mock/react/visual-round3/${route.slug}-${viewport}.png` });
}
const candidateRoutes = [
  { slug: 'damaged-stock', reference: 'stock-ret', screenId: 'SCR-028', title: 'المخزون المرتجع' },
  { slug: 'finance-inbox', reference: 'f-receipts', screenId: 'SCR-035', title: 'الوارد المالي' },
  { slug: 'finance-withdrawals', reference: 'f-payments', screenId: 'SCR-037', title: 'المدفوعات' },
  { slug: 'financial-statements', reference: 'f-reports', screenId: 'SCR-048', title: 'القوائم المالية' },
  { slug: 'finance-movements', reference: 'move-detail', screenId: 'SCR-053', title: 'تفاصيل حركة مالية — مطابقة مسار غير مؤكدة' },
];
for (const route of candidateRoutes) {
  const reference = `docs/ux-inventory/screenshots/reference/screens/${route.reference}-1280.png`;
  const system = `docs/ux-inventory/screenshots/system-mock/react/visual-round4/${route.slug}-1280.png`;
  try { await readFile(path.join(root, system)); await readFile(path.join(root, reference)); }
  catch { continue; }
  cases.push({ name: `round4-${route.slug}-1280`, state: route.title, viewport: '1280', screenId: route.screenId, reference, system });
}
// Round 5: use click-activated reference renders for dynamic panels. The earlier
// initial-state captures for these panels are retained as history but are not
// used as current comparison evidence.
const activatedRoutes = [
  { slug: 'governorates', reference: 'governorates', screenId: 'SCR-026', system: 'governorates' },
  { slug: 'opening-stock', reference: 'opening-stock', screenId: 'SCR-027', system: 'opening-stock' },
  { slug: 'stock-returns', reference: 'stock-returns', screenId: 'SCR-028', system: 'warehouse-returns' },
  { slug: 'trash', reference: 'trash', screenId: 'SCR-029', system: 'trash' },
  { slug: 'drivers', reference: 'drivers', screenId: 'SCR-032', system: 'drivers' },
  { slug: 'audit', reference: 'audit', screenId: 'SCR-033', system: 'audit' },
  { slug: 'warehouse-returns', reference: 'warehouse-returns', screenId: 'SCR-051', system: 'warehouse-returns' },
  { slug: 'container-funds', reference: 'container-funds', screenId: 'SCR-052', system: 'container-funds' },
  { slug: 'minimum-stock', reference: 'minimum-stock', screenId: 'SCR-061', system: 'minimum-stock' },
  { slug: 'inventory-counts', reference: 'inventory-counts', screenId: 'SCR-062', system: 'inventory-counts' },
  { slug: 'container-tracking', reference: 'container-tracking', screenId: 'SCR-060', system: 'containers' },
  { slug: 'product-cost-history', reference: 'product-cost-history', screenId: 'SCR-064', system: 'products' },
  { slug: 'barcode-labels', reference: 'barcode-labels', screenId: 'SCR-063', system: 'products' },
];
for (const route of activatedRoutes) for (const viewport of ['1280', '768', '390']) {
  const reference = `docs/ux-inventory/screenshots/reference/activated/${route.reference}-${viewport}.png`;
  const systemCandidates = [
    route.slug === 'container-tracking' ? `docs/ux-inventory/screenshots/system-mock/react/visual-round5/container-tracking-candidate-${viewport}.png` : '',
    route.slug === 'product-cost-history' ? `docs/ux-inventory/screenshots/system-mock/react/visual-round5/product-cost-history-${viewport}.png` : '',
    route.slug === 'container-funds' ? `docs/ux-inventory/screenshots/system-mock/react/visual-round5/container-funds-selected-${viewport}.png` : '',
    route.slug === 'barcode-labels' ? `docs/ux-inventory/screenshots/system-mock/react/visual-round5/products-${viewport}.png` : '',
    `docs/ux-inventory/screenshots/system-mock/react/visual-round3/${route.system}-${viewport}.png`,
    `docs/ux-inventory/screenshots/system-mock/react/all-screens/${route.system}-${viewport}.png`,
  ];
  const system = systemCandidates.filter(Boolean).find(file => existsSync(path.join(root, file)));
  if (!system || !existsSync(path.join(root, reference))) continue;
  cases.push({ name: `round5-${route.slug}-${viewport}`, state: `${route.slug} (reference clicked)`, viewport, screenId: route.screenId, reference, system });
}
for (const viewport of ['1280', '768', '390']) {
  for (const [slug, screenId, refFile, appFile, state] of [
    ['stock-returns-candidate', 'SCR-028', `docs/ux-inventory/screenshots/reference/activated/stock-returns-${viewport}.png`, `docs/ux-inventory/screenshots/system-mock/react/visual-round5/sales-returns-candidate-${viewport}.png`, 'SCR-028 candidate route only; mapping unverified'],
    ['install-app', 'SCR-067', `docs/ux-inventory/screenshots/reference/activated/install-app-${viewport}.png`, `docs/ux-inventory/screenshots/system-mock/react/visual-round3/pwa-install-${viewport}.png`, 'install app; both route views'],
  ]) {
    try { await readFile(path.join(root, appFile)); await readFile(path.join(root, refFile)); }
    catch { continue; }
    cases.push({ name: `round5-${slug}-${viewport}`, state, viewport, screenId, reference: refFile, system: appFile });
  }
}
// Round 6: directly compare the newly click-activated reference data-tool and
// finance panels with actual clicked system placeholder/unavailable states.
for (const viewport of ['1280', '768', '390']) {
  for (const [slug, screenId, referenceSlug, appFile, state] of [
    ['expense-budget','SCR-056','expense-budget',`docs/ux-inventory/screenshots/system-mock/react/visual-round6/finance-overview-bottom-${viewport}.png`,'expense budget — system says unavailable'],
    ['recurring-expenses','SCR-057','recurring-expenses',`docs/ux-inventory/screenshots/system-mock/react/visual-round6/finance-overview-bottom-${viewport}.png`,'recurring expenses — system says unavailable'],
    ['monthly-comparison','SCR-058','monthly-comparison',`docs/ux-inventory/screenshots/system-mock/react/visual-round6/finance-overview-bottom-${viewport}.png`,'month comparison — system says unavailable'],
    ['cash-forecast','SCR-059','cash-forecast',`docs/ux-inventory/screenshots/system-mock/react/visual-round6/finance-overview-bottom-${viewport}.png`,'cash forecast — system says unavailable'],
    ['excel-import','SCR-065','excel-import',`docs/ux-inventory/screenshots/system-mock/react/visual-round6/locked-excel-import-${viewport}.png`,'Excel import — clicked system placeholder'],
    ['daily-summary','SCR-066','daily-summary',`docs/ux-inventory/screenshots/system-mock/react/visual-round6/locked-daily-summary-${viewport}.png`,'daily summary — clicked system placeholder'],
  ]) {
    const reference = `docs/ux-inventory/screenshots/reference/activated/${referenceSlug}-${viewport}.png`;
    try { await readFile(path.join(root, appFile)); await readFile(path.join(root, reference)); }
    catch { continue; }
    cases.push({ name: `round6-${slug}-${viewport}`, state, viewport, screenId, reference, system: appFile });
  }
}
await mkdir(output, { recursive: true });
const installedChrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || (existsSync(installedChrome) ? installedChrome : undefined);
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath, args: ['--headless=new'] } : {}) });
try {
  for (const item of cases) {
    const referenceBytes = await readFile(path.join(root, item.reference));
    const systemBytes = await readFile(path.join(root, item.system));
    const encoded = bytes => `data:image/png;base64,${bytes.toString('base64')}`;
    const width = Number(item.viewport);
    const height = item.viewport === '768' ? 1024 : item.viewport === '390' ? 844 : 900;
    const page = await browser.newPage({ viewport: { width: width * 2, height: height + 30 }, deviceScaleFactor: 1 });
    await page.setContent(`<html lang="ar" dir="rtl"><head><style>*{box-sizing:border-box}html,body{margin:0;background:#111;color:#fff;font:14px Arial,sans-serif}body{display:flex;width:${width * 2}px;height:${height + 30}px}.pane{width:${width}px;flex:none}.label{height:30px;padding:7px 12px;background:#292929}.shot{display:block;width:${width}px;height:${height}px;object-fit:fill}</style></head><body><div class="pane"><div class="label">مرجع v43 — ${item.state} — ${item.viewport}px</div><img class="shot" src="${encoded(referenceBytes)}"></div><div class="pane"><div class="label">النظام — ${item.state} — ${item.viewport}px</div><img class="shot" src="${encoded(systemBytes)}"></div></body></html>`);
    const image = page.locator('.shot').first();
    await image.waitFor({ state: 'visible' });
    const target=path.join(output, `${item.name}-side-by-side.png`);
    await page.screenshot({ path: target });
    await page.close();
  }
  console.log(JSON.stringify({ comparisons: cases.length, output: 'docs/ux-inventory/screenshots/system-mock/state-comparisons/' }, null, 2));
} finally { await browser.close(); }

