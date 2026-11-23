/* global localStorage, CUSTOMER_LOOKUP, INV_CATALOG, DB, MIN_STOCK, MOVES, CONTS, COLS, RECENT, SEQ */

import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, '..');
const referencePath = path.join(frontendRoot, 'reference', 'precision-slate-erp-v43__3_ (1).html');
const fixturePath = path.join(frontendRoot, 'reference', 'reference-fixture.json');
const populated = process.env.REFERENCE_BASELINE_MODE === 'populated';
const referenceFixture = populated ? JSON.parse(await readFile(fixturePath, 'utf8')) : null;
const outputRoot = path.join(
  frontendRoot,
  'reference-shots',
  populated ? 'baseline-populated' : 'baseline',
);
const referenceDemoPassword = process.env.REFERENCE_DEMO_PASSWORD;
if (populated && !referenceDemoPassword) {
  throw new Error('Set REFERENCE_DEMO_PASSWORD for the local reference demo login.');
}
const viewports = [
  { name: '1440', width: 1440, height: 900 },
  { name: '768', width: 768, height: 1024 },
  { name: '390', width: 390, height: 844 },
];
const screens = [
  ['dashboard', 'لوحة التحكم'],
  ['customers', 'العملاء'],
  ['orders', 'الطلبات'],
  ['order-create', 'إنشاء طلب مبيعات جديد'],
  ['order-detail', 'طلب مؤكد ومعتمد'],
  ['invoices', 'الفواتير'],
  ['invoice-create', 'إنشاء فاتورة مبيعات جديدة'],
  ['invoice-print', 'معاينة الطباعة'],
  ['collections', 'لوحة التحصيل'],
  ['deliveries', 'أذونات صرف المواد والتسليم'],
  ['delivery-create', 'إنشاء إذن صرف وتوصيل جديد'],
  ['returns', 'مرتجعات المبيعات'],
  ['return-create', 'إنشاء مرتجع مبيعات جديد'],
  ['products', 'المنتجات والأصناف'],
  ['inventory-summary', 'ملخص المخزون'],
  ['movements', 'حركات المخزون'],
  ['adjustments', 'تسويات المخزون'],
  ['finance', 'المالية'],
  ['containers', 'متابعة الحاويات'],
  ['container-receive', 'استلام حاوية'],
  ['landed-cost', 'التكلفة الفعلية'],
  ['reports', 'مركز التقارير والذكاء التجاري'],
  ['reports-sales', 'تقرير المبيعات'],
  ['reports-profit', 'تقرير الأرباح والخسائر'],
  ['users', 'المستخدم والصلاحيات'],
  ['warehouses', 'المخازن'],
  ['reports-inventory', 'تقرير المخزون'],
  ['reports-financial', 'التقارير المالية'],
  ['settings', 'الإعدادات العامة'],
];
const stateCaptures = [
  { screen: 'customers', name: 'customer-modal', modal: 'modal-add-customer' },
  {
    screen: 'customers',
    name: 'customer-financial-tab',
    tab: 'البيانات المالية',
    tabRoot: '#cust-modal-tabs',
  },
  {
    screen: 'customers',
    name: 'customer-attachments-tab',
    tab: 'المرفقات',
    tabRoot: '#cust-modal-tabs',
  },
  { screen: 'collections', name: 'collection-modal', modal: 'modal-payment' },
  { screen: 'finance', name: 'expense-modal', modal: 'modal-expense' },
  { screen: 'products', name: 'product-modal', modal: 'modal-add-product' },
  {
    screen: 'users',
    name: 'security-tab',
    tab: 'إعدادات الأمان',
    tabRoot: '#users-tabs',
  },
  {
    screen: 'settings',
    name: 'billing-tab',
    tab: 'الفوترة والترقيم',
    tabRoot: '#settings-tabs',
  },
  { screen: 'order-create', name: 'order-filled-form', fill: true },
  { screen: 'invoice-create', name: 'invoice-filled-form', fill: true },
  { screen: 'delivery-create', name: 'delivery-filled-form', fill: true },
  { screen: 'return-create', name: 'return-filled-form', fill: true },
  { screen: 'adjustments', name: 'adjustment-filled-form', fill: true },
  { screen: 'dashboard', name: 'global-search', search: true },
];

const browserOptions = { headless: true };
if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) {
  browserOptions.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  browserOptions.args = ['--headless=new'];
}

const browser = await chromium.launch(browserOptions);
const manifest = {
  reference: path.relative(frontendRoot, referencePath),
  mode: populated ? 'reference-demo-login' : 'static-layout',
  demoData: populated
    ? `Seeded with ${path.relative(frontendRoot, fixturePath)} before reference scripts execute.`
    : undefined,
  capturedAt: new Date().toISOString(),
  viewports,
  screens: [],
  states: [],
  loginShots: [],
};

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport,
      javaScriptEnabled: populated,
    });
    if (populated) {
      await context.addInitScript((entries) => {
        for (const [key, value] of Object.entries(entries)) {
          localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
        }
      }, referenceFixture.localStorage);
    }
    const page = await context.newPage();
    await page.route(/^https?:\/\//, (route) => route.abort());
    await page.goto(pathToFileURL(referencePath).href, {
      waitUntil: 'load',
    });
    if (populated) {
      const loginFile = path.join(outputRoot, 'states', `login-${viewport.name}.png`);
      await mkdir(path.dirname(loginFile), { recursive: true });
      await page.screenshot({ path: loginFile });
      manifest.loginShots.push({
        viewport: viewport.name,
        file: path.relative(frontendRoot, loginFile),
      });
      await page.locator('#login-pass').fill(referenceDemoPassword);
      await page.locator('#login-screen .login-btn').click();
      await page.waitForFunction(() => !document.body.classList.contains('logged-out'), undefined, {
        timeout: 10000,
      });
      await page.evaluate(
        ({ data, finance }) => {
          const replace = (target, source) => {
            Object.keys(target).forEach((key) => delete target[key]);
            Object.assign(target, source);
          };
          window.__restoreCaptureFixture = () => {
            replace(CUSTOMER_LOOKUP, data.cust);
            replace(INV_CATALOG, data.prod);
            replace(DB.invoices, data.inv);
            replace(DB.cashiers, data.cash);
            replace(MIN_STOCK, data.min);
            MOVES.splice(0, MOVES.length, ...data.moves);
            CONTS.splice(0, CONTS.length, ...data.conts);
            COLS.splice(0, COLS.length, ...data.cols);
            RECENT.splice(0, RECENT.length, ...data.recent);
            Object.assign(SEQ, data.seq);
            window.__FIN = finance;
            localStorage.setItem('ps-erp-v4', JSON.stringify(data));
            localStorage.setItem('ps-fin2', JSON.stringify(finance));
          };
          window.__restoreCaptureFixture();
        },
        {
          data: referenceFixture.localStorage['ps-erp-v4'],
          finance: referenceFixture.localStorage['ps-fin2'],
        },
      );
      await page.waitForTimeout(500);
      await page.evaluate(() => {
        document.getElementById('toast-area')?.style.setProperty('display', 'none', 'important');
      });
    } else {
      await page.evaluate(() => {
        document.body.classList.remove('logged-out');
        document.getElementById('login-screen')?.style.setProperty('display', 'none', 'important');
        document.getElementById('toast-area')?.style.setProperty('display', 'none', 'important');
      });
    }

    for (const [id, title] of screens) {
      const sectionFound = await page.evaluate((screenId) => {
        const section = document.getElementById(`sec-${screenId}`);
        if (!section) return false;
        document.querySelectorAll('.section-content').forEach((item) => {
          item.classList.toggle('active', item === section);
        });
        if (typeof window.refresh === 'function') window.refresh();
        if (typeof window.__restoreCaptureFixture === 'function') {
          window.__restoreCaptureFixture();
          if (screenId === 'customers' && typeof window.renderCustomers === 'function') {
            window.renderCustomers();
          }
        }
        return true;
      }, id);
      if (populated) await page.waitForTimeout(100);

      const filename = `${id}-${viewport.name}.png`;
      const filePath = path.join(outputRoot, 'screens', filename);
      if (sectionFound) {
        await mkdir(path.dirname(filePath), { recursive: true });
        await page.screenshot({ path: filePath });
      }
      manifest.screens.push({
        id,
        title,
        viewport: viewport.name,
        file: sectionFound ? path.relative(frontendRoot, filePath) : null,
        sectionFound,
      });
    }

    for (const state of stateCaptures) {
      const result = await page.evaluate((capture) => {
        const section = document.getElementById(`sec-${capture.screen}`);
        if (!section) return 'screen-missing';
        document.querySelectorAll('.section-content').forEach((item) => {
          item.classList.toggle('active', item === section);
        });
        if (typeof window.refresh === 'function') window.refresh();
        if (capture.search) {
          const dropdown = document.getElementById('search-dropdown');
          const wrapper = document.getElementById('search-wrap');
          if (!dropdown || !wrapper) return 'search-missing';
          dropdown.classList.add('open');
          wrapper.classList.add('active');
        }
        if (capture.modal) {
          const modal = document.getElementById(capture.modal);
          if (!modal) return 'modal-missing';
          modal.classList.add('open');
        }
        if (capture.tab) {
          const tabRoot = capture.tabRoot ? document.querySelector(capture.tabRoot) : section;
          const tab = [...(tabRoot?.querySelectorAll('.tab-item') ?? [])].find((item) =>
            item.textContent.includes(capture.tab),
          );
          if (!tab) return 'tab-missing';
          tabRoot.querySelectorAll('.tab-item').forEach((item) => {
            item.classList.toggle('active', item === tab);
          });
          const panelId =
            capture.tab === 'البيانات المالية'
              ? 'cust-modal-tab-financial'
              : capture.tab === 'المرفقات'
                ? 'cust-modal-tab-attachments'
                : capture.tab === 'إعدادات الأمان'
                  ? 'security-tab'
                  : capture.tab === 'الفوترة والترقيم'
                    ? 'settings-tab-billing'
                    : null;
          if (!panelId) return 'panel-unmapped';
          const panel = document.getElementById(panelId);
          if (!panel) return 'panel-missing';
          panel.classList.add('active');
          const panelSelector = panel.classList.contains('modal-tab-content')
            ? '.modal-tab-content'
            : '.tab-content';
          section.querySelectorAll(panelSelector).forEach((item) => {
            item.classList.toggle('active', item === panel);
          });
        }
        if (capture.fill) {
          const fields = [
            ...section.querySelectorAll(
              'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), textarea',
            ),
          ].filter((field) => !field.disabled);
          fields.forEach((field, index) => {
            if (!field.value) {
              field.value =
                field.type === 'date'
                  ? '2026-10-01'
                  : index === 0
                    ? 'مثال توضيحي'
                    : 'ملاحظة توضيحية';
            }
          });
          if (fields.length === 0) {
            const select = section.querySelector('select:not(:disabled)');
            if (!select) return 'no-editable-fields';
            const optionIndex = [...select.options].findIndex(
              (option) => option.value && !option.disabled,
            );
            if (optionIndex >= 0) select.selectedIndex = optionIndex;
          }
        }
        return 'captured';
      }, state);

      const filename = `${state.screen}-${state.name}-${viewport.name}.png`;
      const filePath = path.join(outputRoot, 'states', filename);
      if (result === 'captured') {
        await mkdir(path.dirname(filePath), { recursive: true });
        await page.screenshot({ path: filePath });
      }
      manifest.states.push({
        ...state,
        viewport: viewport.name,
        file: result === 'captured' ? path.relative(frontendRoot, filePath) : null,
        result,
      });
    }
    await context.close();
  }

  await writeFile(path.join(outputRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
} finally {
  await browser.close();
}

const missingScreens = manifest.screens.filter((screen) => !screen.sectionFound);
const missingStates = manifest.states.filter((state) => state.result !== 'captured');
const expectedMissingScreens = new Set([
  'adjustments',
  'container-receive',
  'landed-cost',
  'settings',
]);
const expectedMissingStates = new Set([
  'settings:billing-tab',
  'adjustments:adjustment-filled-form',
]);
const capturedFiles = [...manifest.screens, ...manifest.states, ...manifest.loginShots]
  .map((entry) => entry.file)
  .filter((file) => typeof file === 'string');
const fileChecks = await Promise.all(
  capturedFiles.map(async (file) => {
    try {
      return { file, size: (await stat(path.join(frontendRoot, file))).size };
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return { file, size: null };
      }
      throw error;
    }
  }),
);
const missingFiles = fileChecks.filter((file) => file.size === null);
const emptyFiles = fileChecks.filter((file) => file.size === 0);
console.log(
  `Requested ${manifest.screens.length} screen images and ${manifest.states.length} key-state images; captured ${manifest.screens.length - missingScreens.length} screens and ${manifest.states.length - missingStates.length} states.`,
);
console.log(
  `Manifest check: found ${fileChecks.length - missingFiles.length - emptyFiles.length} files, missing ${missingFiles.length} files and ${missingScreens.length} runtime screens, empty ${emptyFiles.length} files; unavailable key states ${missingStates.length}.`,
);
const unexpectedMissingScreens = missingScreens.filter(
  (screen) => !expectedMissingScreens.has(screen.id),
);
const unexpectedMissingStates = missingStates.filter(
  (state) => !expectedMissingStates.has(`${state.screen}:${state.name}`),
);
for (const screen of missingScreens) screen.status = 'NO BASELINE';
for (const state of missingStates) state.status = 'NO BASELINE';
await writeFile(path.join(outputRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
if (
  unexpectedMissingScreens.length ||
  unexpectedMissingStates.length ||
  missingFiles.length ||
  emptyFiles.length
) {
  console.error(
    JSON.stringify(
      { unexpectedMissingScreens, unexpectedMissingStates, missingFiles, emptyFiles },
      null,
      2,
    ),
  );
  process.exitCode = 1;
}
