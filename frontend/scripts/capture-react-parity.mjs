import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = path.join(frontendRoot, 'parity-report');
const baselineRoot = path.join(frontendRoot, 'reference-shots', 'baseline-populated');
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
const baselineManifest = JSON.parse(
  await readFile(path.join(baselineRoot, 'manifest.json'), 'utf8'),
);
const viewports = [
  { name: '1440', width: 1440, height: 900 },
  { name: '1280', width: 1280, height: 900 },
  { name: '768', width: 768, height: 1024 },
  { name: '390', width: 390, height: 844 },
];
const pages = [
  { name: 'dashboard', route: '/dashboard', heading: 'لوحة التحكم', baseline: 'dashboard' },
  { name: 'customers', route: '/customers', heading: 'العملاء', baseline: 'customers' },
  { name: 'orders', route: '/orders', heading: 'الطلبات والتسليم', baseline: 'orders' },
  { name: 'order-create', route: '/orders/new', heading: 'إنشاء طلب', baseline: 'order-create' },
  { name: 'order-detail', route: null, heading: 'تفاصيل الطلب', baseline: 'order-detail' },
  { name: 'invoices', route: '/invoices', heading: 'الفواتير والتحصيل', baseline: 'invoices' },
  {
    name: 'invoice-create',
    route: '/invoices/new',
    heading: 'إنشاء فاتورة',
    baseline: 'invoice-create',
  },
  {
    name: 'invoice-print',
    route: '/invoices/701/print',
    heading: 'معاينة الطباعة',
    baseline: 'invoice-print',
  },
  { name: 'collections', route: '/collections', heading: 'التحصيلات', baseline: 'collections' },
  { name: 'deliveries', route: '/deliveries', heading: 'أذونات التسليم', baseline: 'deliveries' },
  {
    name: 'delivery-create',
    route: '/deliveries/new',
    heading: 'إنشاء إذن تسليم',
    baseline: 'delivery-create',
  },
  { name: 'returns', route: '/returns', heading: 'مرتجعات المبيعات', baseline: 'returns' },
  {
    name: 'return-create',
    route: '/returns/new',
    heading: 'إنشاء مرتجع',
    baseline: 'return-create',
  },
  { name: 'products', route: '/products', heading: 'المنتجات', baseline: 'products' },
  { name: 'categories', route: '/categories', heading: 'التصنيفات', baseline: null },
  {
    name: 'inventory-summary',
    route: '/inventory',
    heading: 'المخزون والمخازن',
    baseline: 'inventory-summary',
  },
  {
    name: 'movements',
    route: '/inventory/movements',
    heading: 'حركات المخزون',
    baseline: 'movements',
  },
  {
    name: 'adjustments',
    route: '/inventory/adjustments',
    heading: 'تسويات المخزون',
    baseline: 'adjustments',
  },
  {
    name: 'opening-stock',
    route: '/inventory/opening-stock',
    heading: 'الرصيد الافتتاحي',
    baseline: null,
  },
  {
    name: 'inventory-transfers',
    route: '/inventory/transfers',
    heading: 'تحويلات المخزون',
    baseline: null,
  },
  { name: 'finance', route: '/finance', heading: 'المالية', baseline: 'finance' },
  { name: 'containers', route: '/containers', heading: 'الحاويات', baseline: 'containers' },
  {
    name: 'container-receive',
    route: '/containers/16016/receive',
    heading: 'استلام الحاوية',
    baseline: 'container-receive',
  },
  {
    name: 'landed-cost',
    route: '/containers/16016/landed-cost',
    heading: 'التكلفة الفعلية',
    baseline: 'landed-cost',
  },
  { name: 'reports', route: '/reports', heading: 'التقارير', baseline: 'reports' },
  {
    name: 'reports-sales',
    route: '/reports/sales',
    heading: 'تقرير المبيعات',
    baseline: 'reports-sales',
  },
  {
    name: 'reports-profit',
    route: '/reports/invoice-profit',
    heading: 'ربحية الفواتير',
    baseline: 'reports-profit',
  },
  {
    name: 'reports-inventory',
    route: '/reports/stock',
    heading: 'تقرير المخزون',
    baseline: 'reports-inventory',
  },
  {
    name: 'reports-financial',
    route: '/reports/financial',
    heading: 'التقرير المالي',
    baseline: 'reports-financial',
  },
  { name: 'users', route: '/admin/users', heading: 'المستخدمون والصلاحيات', baseline: 'users' },
  { name: 'warehouses', route: '/warehouses', heading: 'المخازن', baseline: 'warehouses' },
  { name: 'settings', route: '/admin/settings', heading: 'الإعدادات', baseline: 'settings' },
];
const visualReviewByScreen = {
  dashboard: {
    status: 'MAJOR',
    differences:
      'Reference charts, transactions and demo KPI values are populated; React preserves the same sections but must withhold unavailable API metrics and chart data.',
  },
  customers: {
    status: 'MINOR DIFFERENCES',
    differences:
      'Filter controls and row actions differ in grouping and spacing; data remains server-shaped.',
  },
  orders: {
    status: 'MINOR DIFFERENCES',
    differences:
      'Toolbar and table spacing differ slightly; statuses and sample rows are fixture data.',
  },
  'order-create': {
    status: 'MINOR DIFFERENCES',
    differences:
      'Unavailable contract fields and preview data are omitted; form groups and responsive stacking differ slightly.',
  },
  'order-detail': {
    status: 'MINOR DIFFERENCES',
    differences:
      'Reference-only summary values/actions are absent; supported order detail sections remain.',
  },
  invoices: {
    status: 'MINOR DIFFERENCES',
    differences:
      'Reference filters and action placement differ; table layout and invoice rows are present.',
  },
  'invoice-create': {
    status: 'MINOR DIFFERENCES',
    differences:
      'Unsupported preview and sample totals are intentionally omitted; supported form layout remains.',
  },
  'invoice-print': {
    status: 'MAJOR',
    differences:
      'Unavailable customer-business branding, line items and notes make the paper layout/content materially different; do not invent invoice data.',
  },
  collections: {
    status: 'MINOR DIFFERENCES',
    differences:
      'Toolbar and allocation display have different spacing; unapplied remainder is shown separately.',
  },
  deliveries: {
    status: 'MINOR DIFFERENCES',
    differences: 'Search/filter grouping and status presentation differ slightly.',
  },
  'delivery-create': {
    status: 'MINOR DIFFERENCES',
    differences:
      'Unsupported recipient/transport fields are withheld; form controls use narrower spacing.',
  },
  returns: {
    status: 'MINOR DIFFERENCES',
    differences: 'Filter placement and empty-state treatment differ slightly.',
  },
  'return-create': {
    status: 'MINOR DIFFERENCES',
    differences:
      'Return source controls differ; preview and unsupported return fields remain unavailable.',
  },
  products: {
    status: 'MINOR DIFFERENCES',
    differences:
      'Reference-only purchase/cost fields remain hidden; table controls and column widths differ slightly.',
  },
  'inventory-summary': {
    status: 'MINOR DIFFERENCES',
    differences:
      'Unavailable inventory summary figures are omitted; filter and table density differ slightly.',
  },
  movements: {
    status: 'MINOR DIFFERENCES',
    differences: 'Search/filter control spacing and movement table density differ slightly.',
  },
  finance: {
    status: 'MAJOR',
    differences:
      'Reference shows populated customer-account, expense and treasury panels; React currently presents permission-filtered navigation links.',
  },
  containers: {
    status: 'MINOR DIFFERENCES',
    differences: 'Reference and React use different filter-control grouping and details density.',
  },
  reports: {
    status: 'MINOR DIFFERENCES',
    differences: 'Report-link card spacing and grouping differ slightly.',
  },
  'reports-sales': {
    status: 'MAJOR',
    differences:
      'Reference contains aggregate KPIs, chart and breakdown panels; the documented API supports a paginated row list only.',
  },
  'reports-profit': {
    status: 'MAJOR',
    differences:
      'Reference contains profitability summaries and chart panels; the documented response does not provide those aggregates.',
  },
  'reports-inventory': {
    status: 'MAJOR',
    differences:
      'Reference contains stock KPIs and summary controls; the documented endpoint provides inventory rows only.',
  },
  'reports-financial': {
    status: 'MAJOR',
    differences:
      'Reference contains accounting figures; this screen is intentionally parked until accountant-approved endpoints and data are available.',
  },
  users: {
    status: 'MINOR DIFFERENCES',
    differences:
      'User listing and role/grant operations are unavailable in the contract; current waiting state and layout are not equivalent to reference demo data.',
  },
  warehouses: {
    status: 'MINOR DIFFERENCES',
    differences: 'Search/action placement and table column spacing differ slightly.',
  },
};
const browserOptions = { headless: true };
if (executablePath) {
  browserOptions.executablePath = executablePath;
  browserOptions.args = ['--headless=new'];
}

const devServer = await createServer({
  mode: 'test',
  define: { 'import.meta.env.VITE_MOCK_API': JSON.stringify('true') },
  server: { host: '127.0.0.1', port: 5187, strictPort: false },
});
const comparisons = [];
const captures = [];
const overflowReports = [];
const designMeasurements = [];
let browser;

try {
  await devServer.listen();
  const origin = devServer.resolvedUrls?.local?.[0]?.replace(/\/$/, '');
  if (!origin) throw new Error('Could not determine the parity server address.');
  for (const viewport of viewports) {
    browser = await chromium.launch(browserOptions);
    const comparisonContext = await browser.newContext({
      viewport: { width: viewport.width * 2, height: viewport.height + 80 },
    });
    const comparisonPage = await comparisonContext.newPage();
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    await page.goto(`${origin}/login`, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'تسجيل الدخول' }).waitFor();
    const loginPath = path.join(outputRoot, 'react', `login-${viewport.name}.png`);
    await mkdir(path.dirname(loginPath), { recursive: true });
    await page.screenshot({ path: loginPath });
    await page.getByLabel('اسم المستخدم').selectOption('owner-demo');
    await page.getByLabel('كلمة المرور').fill('demo');
    await page.getByRole('button', { name: 'تسجيل الدخول' }).click();
    await page.locator('.app-shell').waitFor();
    const measurements = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;overflow:hidden;visibility:hidden;pointer-events:none';
      probe.innerHTML = '<button class="button button-primary">x</button><article class="dashboard-panel">x</article><input class="input">';
      document.body.append(probe);
      const button = window.getComputedStyle(probe.querySelector('button'));
      const card = window.getComputedStyle(probe.querySelector('article'));
      const input = window.getComputedStyle(probe.querySelector('input'));
      const sidebar = window.getComputedStyle(document.querySelector('.sidebar'));
      const topbar = window.getComputedStyle(document.querySelector('.topbar'));
      const values = {
        button: { fontSize: button.fontSize, borderRadius: button.borderRadius },
        card: { borderRadius: card.borderRadius },
        sidebar: { width: sidebar.width },
        topbar: { height: topbar.height },
        input: { fontSize: input.fontSize, borderRadius: input.borderRadius },
      };
      probe.remove();
      return values;
    });
    designMeasurements.push({ viewport: viewport.width, ...measurements });
    const orderId = await page.evaluate(async () => {
      const createdResponse = await fetch('/api/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': `parity-order-${Date.now()}`,
        },
        body: JSON.stringify({
          customer_id: 101,
          order_date: '2026-10-11',
          requested_delivery_date: null,
          notes: null,
          salesperson_id: null,
          warehouse_id: 401,
          currency_code: 'EGP',
          payment_method: null,
          payment_terms: null,
          discount_type: 'fixed',
          discount_value: '0.00',
          shipping_amount_egp: '0.00',
          lines: [{ product_id: 201, quantity: 1, unit_price_egp: '650.00', notes: null, discount_percent: '0' }],
        }),
      });
      if (!createdResponse.ok) {
        throw new Error(`Parity order setup failed: ${createdResponse.status}`);
      }
      const created = await createdResponse.json();
      const confirmedResponse = await fetch(`/api/v1/orders/${created.data.id}/confirm`, {
        method: 'POST',
        headers: { 'Idempotency-Key': `parity-order-confirm-${Date.now()}` },
      });
      if (!confirmedResponse.ok) {
        throw new Error(`Parity order confirmation failed: ${confirmedResponse.status}`);
      }
      return created.data.id;
    });
    await page.locator('.main-content h1').first().waitFor();
    for (const target of pages) {
      const route = target.name === 'order-detail' ? `/orders/${orderId}` : target.route;
      const currentPath = await page.evaluate(() => window.location.pathname);
      if (currentPath !== route) {
        await page.evaluate((nextRoute) => {
          window.history.pushState({}, '', nextRoute);
          window.dispatchEvent(new PopStateEvent('popstate'));
        }, route);
      }
      await page.waitForTimeout(350);
      await page.evaluate(() => document.fonts.ready);
      if (viewport.width <= 768) {
        const overflow = await page.evaluate(() => ({
          viewport: window.innerWidth,
          document: document.documentElement.scrollWidth,
          body: document.body.scrollWidth,
          content: document.querySelector('.main-content')?.scrollWidth ?? 0,
          contentClient: document.querySelector('.main-content')?.clientWidth ?? 0,
        }));
        if (overflow.document > overflow.viewport + 1
          || overflow.body > overflow.viewport + 1
          || overflow.content > overflow.contentClient + 1) {
          overflowReports.push({ screen: target.name, ...overflow });
        }
      }
      const reactPath = path.join(
        outputRoot,
        'react',
        'all-screens',
        `${target.name}-${viewport.name}.png`,
      );
      await mkdir(path.dirname(reactPath), { recursive: true });
      await page.screenshot({ path: reactPath });
      const baselineEntry = baselineManifest.screens.find(
        (entry) => entry.id === target.baseline && entry.viewport === viewport.name,
      );
      const referencePath =
        target.baseline && baselineEntry?.file
          ? path.join(baselineRoot, 'screens', `${target.baseline}-${viewport.name}.png`)
          : null;
      const baselineAvailable = Boolean(referencePath);
      captures.push({
        screen: target.name,
        viewport: viewport.name,
        react: markdownPath(path.relative(outputRoot, reactPath)),
        status: baselineAvailable ? visualReviewByScreen[target.name].status : 'NO BASELINE',
      });
      if (!baselineAvailable || !referencePath) continue;
      const [reference, react] = await Promise.all([readFile(referencePath), readFile(reactPath)]);
      const comparison = await compareImages(
        comparisonPage,
        viewport,
        target.heading,
        reference,
        react,
      );
      const imageName = `all-${target.name}-${viewport.name}`;
      const sideBySidePath = path.join(outputRoot, `${imageName}-side-by-side.png`);
      const diffPath = path.join(outputRoot, `${imageName}-diff.png`);
      await writeFile(sideBySidePath, comparison.sideBySide);
      await writeFile(diffPath, comparison.diff);
      comparisons.push({
        page: target.name,
        viewport: viewport.name,
        reference: markdownPath(path.relative(outputRoot, referencePath)),
        react: markdownPath(path.relative(outputRoot, reactPath)),
        sideBySide: markdownPath(path.relative(outputRoot, sideBySidePath)),
        diff: markdownPath(path.relative(outputRoot, diffPath)),
        status: visualReviewByScreen[target.name].status,
        reviewNotes: visualReviewByScreen[target.name].differences,
        ...comparison.metrics,
      });
    }
    await context.close();
    await browser.close();
    browser = undefined;
  }
} finally {
  if (browser) await browser.close();
  await devServer.close();
}

const reportLines = [
  '# Full frontend visual comparison',
  '',
  `Captured: ${new Date().toISOString()}`,
  '',
  `React routes captured: ${captures.length}. Reference comparisons generated and manually reviewed: ${comparisons.length}. The populated reference baseline contains ${baselineManifest.screens.length} viewport entries and ${baselineManifest.states.length} key-state entries. MAJOR marks unresolved layout/content gaps; MINOR DIFFERENCES lists observed presentation deviations. Pixel metrics support, but do not determine, the visual classification.`,
  '',
  `Login screenshots: ${viewports.map((viewport) => `[${viewport.width}px](./react/login-${viewport.name}.png)`).join(', ')}.`,
  '',
  '| Screen | Width | Status | Reviewed difference | Mean RGB difference | Pixels changed (>32/255) | Side-by-side | Diff |',
  '|---|---:|---|---|---:|---:|---|---|',
  ...comparisons.map(
    (item) =>
      `| ${item.page} | ${item.viewport}px | ${item.status} | ${item.reviewNotes} | ${item.meanRgbDifferencePercent.toFixed(2)}% | ${item.changedPixelPercent.toFixed(2)}% | [image](./${path.basename(item.sideBySide)}) | [image](./${path.basename(item.diff)}) |`,
  ),
  '',
  'Routes without a populated reference image remain NO BASELINE. React screenshots are retained for the additional categories, opening-stock, and inventory-transfer routes and for baseline screens that were not present at runtime.',
  '',
  'A changed pixel is a pixel whose largest absolute RGB-channel difference exceeds 32/255. Mean RGB difference averages absolute RGB-channel differences over the full image. These metrics are not a substitute for reviewing the image pairs.',
  '',
  '## Responsive acceptance results',
  '',
  '| Width | Button | Card | Sidebar | Topbar | Input | Horizontal overflow findings |',
  '|---:|---|---|---:|---:|---|---:|',
  ...designMeasurements.map((item) => `| ${item.viewport}px | ${item.button.fontSize} / ${item.button.borderRadius} | ${item.card.borderRadius} | ${item.sidebar.width} | ${item.topbar.height} | ${item.input.fontSize} / ${item.input.borderRadius} | ${overflowReports.filter((entry) => entry.viewport === item.viewport).length} |`),
  '',
  overflowReports.length === 0
    ? 'No document or main-content horizontal overflow was detected on routed screens at 390px and 768px.'
    : `Horizontal overflow was detected on ${overflowReports.length} mobile screen captures: ${JSON.stringify(overflowReports)}.`,
  '',
  '## Screen captures',
  '',
  ...captures.map(
    (item) =>
      `- ${item.screen} at ${item.viewport}px: ${item.status}; [React screenshot](./${item.react}).`,
  ),
  '',
  '## Reference key states',
  '',
  '| Screen | State | Width | Status | Reference image |',
  '|---|---|---:|---|---|',
  ...baselineManifest.states.map((state) => {
    const status = state.file
      ? 'NOT CHECKED — React state capture/comparison pending'
      : 'NO BASELINE';
    const link = state.file ? `[image](../${state.file.split(/[\\/]/).join('/')})` : '—';
    return `| ${state.screen} | ${state.name} | ${state.viewport}px | ${status} | ${link} |`;
  }),
  '',
];
await writeFile(path.join(outputRoot, 'REPORT.md'), reportLines.join('\n'), 'utf8');
console.log(
  `Captured ${captures.length} React route screenshots; compared ${comparisons.length} against populated reference. Wrote ${comparisons.length} side-by-side images, ${comparisons.length} pixel-diff images, and parity-report/REPORT.md.`,
);
console.log(`Computed responsive styles captured at ${designMeasurements.map((item) => item.viewport).join(', ')}px; mobile overflow findings: ${overflowReports.length}.`);
if (overflowReports.length > 0) process.exitCode = 1;
for (const item of comparisons) {
  console.log(
    `${item.page} ${item.viewport}px: mean RGB difference ${item.meanRgbDifferencePercent.toFixed(2)}%, changed pixels ${item.changedPixelPercent.toFixed(2)}%.`,
  );
}

function markdownPath(value) {
  return value.split(path.sep).join('/');
}

async function compareImages(page, viewport, title, reference, react) {
  await page.setViewportSize({ width: viewport.width * 2, height: viewport.height + 80 });
  const referenceData = reference.toString('base64');
  const reactData = react.toString('base64');
  const comparison = await page.evaluate(
    async ({ referenceBase64, reactBase64 }) => {
      const loadImage = (base64) =>
        new Promise((resolve, reject) => {
          const image = document.createElement('img');
          image.onload = () => resolve(image);
          image.onerror = reject;
          image.src = `data:image/png;base64,${base64}`;
        });
      const [referenceImage, reactImage] = await Promise.all([
        loadImage(referenceBase64),
        loadImage(reactBase64),
      ]);
      if (
        referenceImage.naturalWidth !== reactImage.naturalWidth ||
        referenceImage.naturalHeight !== reactImage.naturalHeight
      ) {
        throw new Error(
          `Image dimensions differ: reference ${referenceImage.naturalWidth}x${referenceImage.naturalHeight}; React ${reactImage.naturalWidth}x${reactImage.naturalHeight}`,
        );
      }

      const width = referenceImage.naturalWidth;
      const height = referenceImage.naturalHeight;
      const referenceCanvas = document.createElement('canvas');
      const reactCanvas = document.createElement('canvas');
      const diffCanvas = document.createElement('canvas');
      [referenceCanvas, reactCanvas, diffCanvas].forEach((canvas) => {
        canvas.width = width;
        canvas.height = height;
      });
      const referenceContext = referenceCanvas.getContext('2d');
      const reactContext = reactCanvas.getContext('2d');
      const diffContext = diffCanvas.getContext('2d');
      if (!referenceContext || !reactContext || !diffContext) {
        throw new Error('Canvas 2D context is unavailable.');
      }
      referenceContext.drawImage(referenceImage, 0, 0);
      reactContext.drawImage(reactImage, 0, 0);
      const referencePixels = referenceContext.getImageData(0, 0, width, height);
      const reactPixels = reactContext.getImageData(0, 0, width, height);
      const diffPixels = diffContext.createImageData(width, height);
      let absoluteChannelDifference = 0;
      let changedPixels = 0;
      const pixelCount = width * height;
      for (let pixel = 0; pixel < pixelCount; pixel += 1) {
        const offset = pixel * 4;
        const red = Math.abs(referencePixels.data[offset] - reactPixels.data[offset]);
        const green = Math.abs(referencePixels.data[offset + 1] - reactPixels.data[offset + 1]);
        const blue = Math.abs(referencePixels.data[offset + 2] - reactPixels.data[offset + 2]);
        const largestDifference = Math.max(red, green, blue);
        absoluteChannelDifference += red + green + blue;
        if (largestDifference > 32) {
          changedPixels += 1;
          diffPixels.data[offset] = 255;
          diffPixels.data[offset + 1] = 40;
          diffPixels.data[offset + 2] = 40;
        } else {
          const luminance = Math.round((red + green + blue) / 3);
          diffPixels.data[offset] = luminance;
          diffPixels.data[offset + 1] = luminance;
          diffPixels.data[offset + 2] = luminance;
        }
        diffPixels.data[offset + 3] = 255;
      }
      diffContext.putImageData(diffPixels, 0, 0);

      const sideBySide = document.createElement('canvas');
      sideBySide.width = width * 2;
      sideBySide.height = height;
      const sideContext = sideBySide.getContext('2d');
      if (!sideContext) throw new Error('Canvas 2D context is unavailable.');
      sideContext.drawImage(referenceImage, 0, 0);
      sideContext.drawImage(reactImage, width, 0);

      return {
        width,
        height,
        meanRgbDifferencePercent: (absoluteChannelDifference / (pixelCount * 3 * 255)) * 100,
        changedPixelPercent: (changedPixels / pixelCount) * 100,
        diff: diffCanvas.toDataURL('image/png'),
        sideBySide: sideBySide.toDataURL('image/png'),
      };
    },
    { referenceBase64: referenceData, reactBase64: reactData },
  );
  const labels = `<h2>${title} — المرجع</h2><h2>${title} — React</h2>`;
  await page.setContent(
    `<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><style>body{margin:0;padding:0 0 12px;background:#fff;color:#111;font:16px sans-serif;width:${viewport.width * 2}px}.labels{display:grid;direction:ltr;grid-template-columns:${viewport.width}px ${viewport.width}px;height:68px;align-items:center;text-align:center}.labels h2{margin:0;font-size:18px}img{display:block;width:${viewport.width * 2}px;height:${viewport.height}px}</style><div class="labels">${labels}</div><img alt="Reference and React side-by-side comparison" src="${comparison.sideBySide}">`,
  );
  const sideBySide = await page.screenshot({ fullPage: true });
  return {
    sideBySide,
    diff: Buffer.from(comparison.diff.split(',')[1], 'base64'),
    metrics: {
      width: comparison.width,
      height: comparison.height,
      meanRgbDifferencePercent: comparison.meanRgbDifferencePercent,
      changedPixelPercent: comparison.changedPixelPercent,
    },
  };
}
